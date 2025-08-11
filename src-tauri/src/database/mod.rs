pub mod migration;
pub mod performance;
pub mod schema;

pub use migration::MigrationManager;
pub use performance::PerformanceManager;
pub use schema::SchemaManager;

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Migration error: {0}")]
    Migration(String),
    #[error("Connection error: {0}")]
    Connection(String),
}

pub type DatabaseResult<T> = Result<T, DatabaseError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Migration {
    pub version: i32,
    pub description: String,
    pub sql: String,
    pub applied_at: Option<DateTime<Utc>>,
}

pub struct Database {
    connection: Connection,
    db_path: PathBuf,
}

impl Database {
    /// Create a new database instance and initialize it
    pub fn new(app_data_dir: PathBuf) -> DatabaseResult<Self> {
        // Ensure the app data directory exists
        fs::create_dir_all(&app_data_dir)?;

        let db_path = app_data_dir.join("student_management.db");
        let connection = Connection::open(&db_path)?;

        // Enable foreign key constraints
        connection.execute("PRAGMA foreign_keys = ON", [])?;

        let mut db = Database {
            connection,
            db_path,
        };

        // Initialize the database schema
        db.initialize_schema()?;

        Ok(db)
    }

    /// Initialize the database schema with all required tables
    fn initialize_schema(&mut self) -> DatabaseResult<()> {
        // Create migrations table first
        SchemaManager::create_migrations_table(self)?;

        // Get current database version
        let current_version = SchemaManager::get_current_version(self)?;

        // Apply all migrations
        let migrations = SchemaManager::get_migrations();
        for migration in migrations {
            if migration.version > current_version {
                MigrationManager::apply_migration(self, &migration)?;
            }
        }

        // Create indexes for performance optimization
        PerformanceManager::create_indexes(self)?;

        Ok(())
    }

    /// Get a reference to the database connection
    pub fn connection(&self) -> &Connection {
        &self.connection
    }

    /// Get a mutable reference to the database connection
    pub fn connection_mut(&mut self) -> &mut Connection {
        &mut self.connection
    }

    /// Get the database file path
    pub fn db_path(&self) -> &PathBuf {
        &self.db_path
    }

    /// Check if the database is healthy
    pub fn health_check(&self) -> DatabaseResult<bool> {
        // Simple query to check if database is accessible
        let result: Result<i32, rusqlite::Error> = self.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
            [],
            |row| row.get(0),
        );

        match result {
            Ok(count) => {
                log::info!("Database health check passed. Found {} tables", count);
                Ok(count >= 5) // We expect at least 5 tables (students, attendance, settings, audit_log, users)
            }
            Err(e) => {
                log::error!("Database health check failed: {}", e);
                Err(DatabaseError::Sqlite(e))
            }
        }
    }

    /// Get database statistics
    pub fn get_stats(&self) -> DatabaseResult<DatabaseStats> {
        let students_count: i32 =
            self.connection
                .query_row("SELECT COUNT(*) FROM students", [], |row| row.get(0))?;

        let attendance_count: i32 =
            self.connection
                .query_row("SELECT COUNT(*) FROM attendance", [], |row| row.get(0))?;

        let audit_log_count: i32 =
            self.connection
                .query_row("SELECT COUNT(*) FROM audit_log", [], |row| row.get(0))?;

        let db_size = fs::metadata(&self.db_path)?.len();

        Ok(DatabaseStats {
            students_count,
            attendance_count,
            audit_log_count,
            database_size_bytes: db_size,
        })
    }

    /// Vacuum the database to optimize storage
    pub fn vacuum(&self) -> DatabaseResult<()> {
        self.connection.execute("VACUUM", [])?;
        log::info!("Database vacuum completed");
        Ok(())
    }

    /// Create a backup of the database
    pub fn backup_to_file(&self, backup_path: &PathBuf) -> DatabaseResult<()> {
        // Ensure backup directory exists
        if let Some(parent) = backup_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Use SQLite backup API
        let mut backup_conn = Connection::open(backup_path)?;
        let backup = rusqlite::backup::Backup::new(&self.connection, &mut backup_conn)?;
        backup.run_to_completion(5, std::time::Duration::from_millis(250), None)?;

        log::info!("Database backup created at: {:?}", backup_path);
        Ok(())
    }

    /// Get database schema version info
    pub fn get_schema_info(&self) -> DatabaseResult<SchemaInfo> {
        let current_version = SchemaManager::get_current_version(self)?;
        let all_migrations = SchemaManager::get_migrations();
        let latest_version = all_migrations.iter().map(|m| m.version).max().unwrap_or(0);
        let pending_count = all_migrations
            .iter()
            .filter(|m| m.version > current_version)
            .count();

        Ok(SchemaInfo {
            current_version,
            latest_version,
            pending_migrations: pending_count,
            is_up_to_date: current_version == latest_version,
        })
    }

    /// Get rollback information for a migration (SQLite doesn't support true rollbacks)
    pub fn get_rollback_info(&self, target_version: i32) -> DatabaseResult<RollbackInfo> {
        let current_version = SchemaManager::get_current_version(self)?;

        if target_version >= current_version {
            return Err(DatabaseError::Migration(format!(
                "Cannot rollback to version {} - current version is {}",
                target_version, current_version
            )));
        }

        let migrations_to_rollback: Vec<i32> = ((target_version + 1)..=current_version).collect();

        let rollback_info = RollbackInfo {
            current_version,
            target_version,
            migrations_to_rollback: migrations_to_rollback.clone(),
            warning: "SQLite does not support automatic migration rollbacks. Manual intervention required.".to_string(),
            instructions: vec![
                "1. Create a backup of your current database".to_string(),
                "2. Manually reverse the changes made by each migration".to_string(),
                format!("3. Migrations to reverse (in order): {:?}", migrations_to_rollback),
                "4. Update the migrations table to reflect the new version".to_string(),
                "5. Verify data integrity after manual rollback".to_string(),
            ],
        };

        Ok(rollback_info)
    }

    /// Optimize database by running VACUUM and updating statistics
    pub fn optimize_database(&self) -> DatabaseResult<()> {
        log::info!("Starting database optimization...");

        // Update query optimizer statistics
        PerformanceManager::analyze_tables(self)?;

        // Vacuum to reclaim space and optimize storage
        self.vacuum()?;

        // Re-analyze after vacuum
        self.connection.execute("ANALYZE", [])?;

        log::info!("Database optimization completed successfully");
        Ok(())
    }

    // Migration-related methods
    pub fn get_migration_history(&self) -> DatabaseResult<Vec<AppliedMigration>> {
        MigrationManager::get_migration_history(self)
    }

    pub fn validate_migrations(&self) -> DatabaseResult<MigrationValidation> {
        MigrationManager::validate_migrations(self)
    }

    pub fn force_apply_migration(&self, version: i32) -> DatabaseResult<()> {
        MigrationManager::force_apply_migration(self, version)
    }

    pub fn mark_migration_applied(&self, version: i32, description: String) -> DatabaseResult<()> {
        MigrationManager::mark_migration_applied(self, version, description)
    }

    pub fn get_pending_migrations(&self) -> DatabaseResult<Vec<Migration>> {
        MigrationManager::get_pending_migrations(self)
    }

    pub fn get_migrations(&self) -> Vec<Migration> {
        SchemaManager::get_migrations()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub students_count: i32,
    pub attendance_count: i32,
    pub audit_log_count: i32,
    pub database_size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppliedMigration {
    pub version: i32,
    pub description: String,
    pub applied_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MigrationValidation {
    pub is_valid: bool,
    pub issues: Vec<String>,
    pub applied_count: usize,
    pub total_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SchemaInfo {
    pub current_version: i32,
    pub latest_version: i32,
    pub pending_migrations: usize,
    pub is_up_to_date: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RollbackInfo {
    pub current_version: i32,
    pub target_version: i32,
    pub migrations_to_rollback: Vec<i32>,
    pub warning: String,
    pub instructions: Vec<String>,
}

// Re-export types from performance module
pub use performance::{IndexInfo, QueryAnalysis};

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        (db, temp_dir)
    }

    #[test]
    fn test_database_creation() {
        let (db, _temp_dir) = create_test_db();
        assert!(db.health_check().unwrap());
    }

    #[test]
    fn test_migrations_applied() {
        let (db, _temp_dir) = create_test_db();

        // Check that all expected tables exist
        let table_count: i32 = db.connection.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('students', 'attendance', 'settings', 'audit_log', 'users', 'migrations')",
            [],
            |row| row.get(0),
        ).unwrap();

        assert_eq!(table_count, 6); // 5 main tables + migrations table
    }

    #[test]
    fn test_default_settings_inserted() {
        let (db, _temp_dir) = create_test_db();

        let settings_count: i32 = db
            .connection
            .query_row("SELECT COUNT(*) FROM settings", [], |row| row.get(0))
            .unwrap();

        assert!(settings_count >= 8); // At least 8 default settings
    }

    #[test]
    fn test_foreign_key_constraints() {
        let (db, _temp_dir) = create_test_db();

        // Check that foreign keys are enabled
        let fk_enabled: i32 = db
            .connection
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .unwrap();

        assert_eq!(fk_enabled, 1);
    }

    #[test]
    fn test_database_stats() {
        let (db, _temp_dir) = create_test_db();
        let stats = db.get_stats().unwrap();

        assert_eq!(stats.students_count, 0);
        assert_eq!(stats.attendance_count, 0);
        assert_eq!(stats.audit_log_count, 0);
        assert!(stats.database_size_bytes > 0);
    }

    #[test]
    fn test_migration_history() {
        let (db, _temp_dir) = create_test_db();
        let history = MigrationManager::get_migration_history(&db).unwrap();

        // Should have all 11 migrations applied
        assert_eq!(history.len(), 11);

        // Check that versions are sequential
        for (i, migration) in history.iter().enumerate() {
            assert_eq!(migration.version, i as i32 + 1);
        }
    }

    #[test]
    fn test_pending_migrations() {
        let (db, _temp_dir) = create_test_db();
        let pending = MigrationManager::get_pending_migrations(&db).unwrap();

        // All migrations should be applied, so no pending ones
        assert_eq!(pending.len(), 0);
    }

    #[test]
    fn test_migration_validation() {
        let (db, _temp_dir) = create_test_db();
        let validation = MigrationManager::validate_migrations(&db).unwrap();

        assert!(validation.is_valid);
        assert_eq!(validation.issues.len(), 0);
        assert_eq!(validation.applied_count, 11);
        assert_eq!(validation.total_count, 11);
    }

    #[test]
    fn test_schema_info() {
        let (db, _temp_dir) = create_test_db();
        let schema_info = db.get_schema_info().unwrap();

        assert_eq!(schema_info.current_version, 11);
        assert_eq!(schema_info.latest_version, 11);
        assert_eq!(schema_info.pending_migrations, 0);
        assert!(schema_info.is_up_to_date);
    }

    #[test]
    fn test_get_all_migrations() {
        let (db, _temp_dir) = create_test_db();
        let all_migrations = SchemaManager::get_migrations();

        assert_eq!(all_migrations.len(), 11);

        // Check that versions are sequential starting from 1
        for (i, migration) in all_migrations.iter().enumerate() {
            assert_eq!(migration.version, i as i32 + 1);
            assert!(!migration.description.is_empty());
            assert!(!migration.sql.is_empty());
        }
    }

    #[test]
    fn test_rollback_info() {
        let (db, _temp_dir) = create_test_db();

        // Test valid rollback info
        let rollback_info = db.get_rollback_info(3).unwrap();
        assert_eq!(rollback_info.current_version, 11);
        assert_eq!(rollback_info.target_version, 3);
        assert_eq!(
            rollback_info.migrations_to_rollback,
            vec![4, 5, 6, 7, 8, 9, 10, 11]
        );
        assert!(rollback_info.warning.contains("SQLite does not support"));
        assert!(!rollback_info.instructions.is_empty());

        // Test invalid rollback (target >= current)
        let result = db.get_rollback_info(11);
        assert!(result.is_err());

        let result = db.get_rollback_info(12);
        assert!(result.is_err());
    }

    #[test]
    fn test_current_version() {
        let (db, _temp_dir) = create_test_db();
        let version = SchemaManager::get_current_version(&db).unwrap();

        // Should be at the latest version (11)
        assert_eq!(version, 11);
    }

    #[test]
    fn test_indexes_created() {
        let (db, _temp_dir) = create_test_db();
        let indexes = PerformanceManager::get_index_info(&db).unwrap();

        // Should have created multiple indexes
        assert!(
            indexes.len() >= 20,
            "Expected at least 20 indexes, found {}",
            indexes.len()
        );

        // Check for specific critical indexes
        let index_names: Vec<&String> = indexes.iter().map(|idx| &idx.name).collect();

        // Students table indexes
        assert!(index_names.contains(&&"idx_students_id".to_string()));
        assert!(index_names.contains(&&"idx_students_group".to_string()));
        assert!(index_names.contains(&&"idx_students_paid_amount".to_string()));
        assert!(index_names.contains(&&"idx_students_group_paid".to_string()));

        // Attendance table indexes
        assert!(index_names.contains(&&"idx_attendance_student_id".to_string()));
        assert!(index_names.contains(&&"idx_attendance_date".to_string()));
        assert!(index_names.contains(&&"idx_attendance_student_date".to_string()));

        // Audit log indexes
        assert!(index_names.contains(&&"idx_audit_log_table_record".to_string()));
        assert!(index_names.contains(&&"idx_audit_log_timestamp".to_string()));
    }

    #[test]
    fn test_query_performance_analysis() {
        let (db, _temp_dir) = create_test_db();
        let analyses = PerformanceManager::analyze_query_performance(&db).unwrap();

        // Should have analyzed multiple queries
        assert!(
            analyses.len() >= 8,
            "Expected at least 8 query analyses, found {}",
            analyses.len()
        );

        // Check that some queries are using indexes
        let using_indexes = analyses.iter().filter(|a| a.uses_index).count();
        assert!(using_indexes > 0, "Expected some queries to use indexes");

        // Verify specific query optimizations
        let student_id_query = analyses
            .iter()
            .find(|a| a.description == "Student lookup by ID");
        assert!(
            student_id_query.is_some(),
            "Student ID lookup query should be analyzed"
        );

        let group_query = analyses
            .iter()
            .find(|a| a.description == "Students by group");
        assert!(
            group_query.is_some(),
            "Students by group query should be analyzed"
        );
    }

    #[test]
    fn test_database_optimization() {
        let (db, _temp_dir) = create_test_db();

        // Should complete without errors
        let result = db.optimize_database();
        assert!(
            result.is_ok(),
            "Database optimization should succeed: {:?}",
            result
        );
    }

    #[test]
    fn test_analyze_tables() {
        let (db, _temp_dir) = create_test_db();

        // Should complete without errors
        let result = PerformanceManager::analyze_tables(&db);
        assert!(
            result.is_ok(),
            "Table analysis should succeed: {:?}",
            result
        );
    }
}

