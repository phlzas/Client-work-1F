use rusqlite::{Connection, params};
use std::path::PathBuf;
use std::fs;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
        self.create_migrations_table()?;
        
        // Get current database version
        let current_version = self.get_current_version()?;
        
        // Apply all migrations
        let migrations = self.get_migrations();
        for migration in migrations {
            if migration.version > current_version {
                self.apply_migration(&migration)?;
            }
        }
        
        // Create indexes for performance optimization
        self.create_indexes()?;
        
        Ok(())
    }
    
    /// Create the migrations tracking table
    fn create_migrations_table(&self) -> DatabaseResult<()> {
        self.connection.execute(
            "CREATE TABLE IF NOT EXISTS migrations (
                version INTEGER PRIMARY KEY,
                description TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        Ok(())
    }
    
    /// Get the current database version
    fn get_current_version(&self) -> DatabaseResult<i32> {
        let version: Result<Option<i32>, rusqlite::Error> = self.connection.query_row(
            "SELECT MAX(version) FROM migrations",
            [],
            |row| row.get(0),
        );
        
        match version {
            Ok(Some(v)) => Ok(v),
            Ok(None) => Ok(0), // No migrations applied yet
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
            Err(e) => Err(DatabaseError::Sqlite(e)),
        }
    }
    
    /// Define all database migrations
    fn get_migrations(&self) -> Vec<Migration> {
        vec![
            Migration {
                version: 1,
                description: "Create students table".to_string(),
                sql: "CREATE TABLE students (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    group_name TEXT NOT NULL,
                    paid_amount INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 2,
                description: "Create attendance table".to_string(),
                sql: "CREATE TABLE attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
                    UNIQUE(student_id, date)
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 3,
                description: "Create settings table".to_string(),
                sql: "CREATE TABLE settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 4,
                description: "Create audit_log table".to_string(),
                sql: "CREATE TABLE audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    action_type TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    old_values TEXT,
                    new_values TEXT,
                    user_id TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 5,
                description: "Create users table for future multi-user support".to_string(),
                sql: "CREATE TABLE users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 6,
                description: "Insert default settings".to_string(),
                sql: "INSERT OR IGNORE INTO settings (key, value) VALUES 
                    ('payment_threshold', '6000'),
                    ('default_groups', '[\"Group A\", \"Group B\", \"Group C\"]'),
                    ('enable_audit_log', 'true'),
                    ('language', 'ar'),
                    ('theme', 'light'),
                    ('enable_multi_user', 'false'),
                    ('backup_encryption', 'false'),
                    ('accessibility_mode', 'false')".to_string(),
                applied_at: None,
            },
        ]
    }
    
    /// Apply a single migration
    fn apply_migration(&self, migration: &Migration) -> DatabaseResult<()> {
        log::info!("Applying migration {}: {}", migration.version, migration.description);
        
        // Start transaction
        let tx = self.connection.unchecked_transaction()?;
        
        // Execute the migration SQL
        tx.execute(&migration.sql, [])?;
        
        // Record the migration
        tx.execute(
            "INSERT INTO migrations (version, description) VALUES (?1, ?2)",
            params![migration.version, migration.description],
        )?;
        
        // Commit transaction
        tx.commit()?;
        
        log::info!("Successfully applied migration {}", migration.version);
        Ok(())
    }
    
    /// Create performance indexes
    fn create_indexes(&self) -> DatabaseResult<()> {
        let indexes = vec![
            // Students table indexes
            "CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_name)",
            "CREATE INDEX IF NOT EXISTS idx_students_paid_amount ON students(paid_amount)",
            "CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)",
            
            // Attendance table indexes
            "CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)",
            "CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)",
            "CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date)",
            
            // Audit log indexes
            "CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)",
            
            // Settings table index
            "CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)",
            
            // Users table indexes (for future use)
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        ];
        
        for index_sql in indexes {
            self.connection.execute(index_sql, [])?;
        }
        
        log::info!("Successfully created database indexes");
        Ok(())
    }
    
    /// Get a reference to the database connection
    pub fn connection(&self) -> &Connection {
        &self.connection
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
        let students_count: i32 = self.connection.query_row(
            "SELECT COUNT(*) FROM students",
            [],
            |row| row.get(0),
        )?;
        
        let attendance_count: i32 = self.connection.query_row(
            "SELECT COUNT(*) FROM attendance",
            [],
            |row| row.get(0),
        )?;
        
        let audit_log_count: i32 = self.connection.query_row(
            "SELECT COUNT(*) FROM audit_log",
            [],
            |row| row.get(0),
        )?;
        
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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub students_count: i32,
    pub attendance_count: i32,
    pub audit_log_count: i32,
    pub database_size_bytes: u64,
}

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
        
        let settings_count: i32 = db.connection.query_row(
            "SELECT COUNT(*) FROM settings",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert!(settings_count >= 8); // At least 8 default settings
    }
    
    #[test]
    fn test_foreign_key_constraints() {
        let (db, _temp_dir) = create_test_db();
        
        // Check that foreign keys are enabled
        let fk_enabled: i32 = db.connection.query_row(
            "PRAGMA foreign_keys",
            [],
            |row| row.get(0),
        ).unwrap();
        
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
}