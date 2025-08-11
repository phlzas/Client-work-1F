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
    pub fn get_migrations(&self) -> Vec<Migration> {
        vec![
            Migration {
                version: 1,
                description: "Create students table".to_string(),
                sql: "CREATE TABLE students (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    group_name TEXT NOT NULL,
                    payment_plan TEXT NOT NULL DEFAULT 'one-time',
                    plan_amount INTEGER NOT NULL DEFAULT 6000,
                    installment_count INTEGER DEFAULT NULL,
                    paid_amount INTEGER NOT NULL DEFAULT 0,
                    enrollment_date TEXT NOT NULL,
                    next_due_date TEXT DEFAULT NULL,
                    payment_status TEXT NOT NULL DEFAULT 'pending',
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
                description: "Create payment_transactions table".to_string(),
                sql: "CREATE TABLE payment_transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    payment_date TEXT NOT NULL,
                    payment_method TEXT DEFAULT 'cash',
                    notes TEXT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 7,
                description: "Insert default settings".to_string(),
                sql: "INSERT OR IGNORE INTO settings (key, value) VALUES 
                    ('payment_threshold', '6000'),
                    ('default_groups', '[\"Group A\", \"Group B\", \"Group C\"]'),
                    ('enable_audit_log', 'true'),
                    ('language', 'ar'),
                    ('theme', 'light'),
                    ('enable_multi_user', 'false'),
                    ('backup_encryption', 'false'),
                    ('accessibility_mode', 'false'),
                    ('one_time_amount', '6000'),
                    ('monthly_amount', '850'),
                    ('installment_amount', '2850'),
                    ('installment_interval', '3'),
                    ('reminder_days', '7')".to_string(),
                applied_at: None,
            },
            Migration {
                version: 8,
                description: "Create groups table for dynamic group management".to_string(),
                sql: "CREATE TABLE groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 9,
                description: "Insert default groups".to_string(),
                sql: "INSERT OR IGNORE INTO groups (name) VALUES 
                    ('Group A'),
                    ('Group B'),
                    ('Group C')".to_string(),
                applied_at: None,
            },
            Migration {
                version: 10,
                description: "Create payment_settings table for configurable payment plans".to_string(),
                sql: "CREATE TABLE payment_settings (
                    id INTEGER PRIMARY KEY,
                    one_time_amount INTEGER NOT NULL DEFAULT 6000,
                    monthly_amount INTEGER NOT NULL DEFAULT 850,
                    installment_amount INTEGER NOT NULL DEFAULT 2850,
                    installment_interval_months INTEGER NOT NULL DEFAULT 3,
                    reminder_days INTEGER NOT NULL DEFAULT 7,
                    payment_threshold INTEGER NOT NULL DEFAULT 6000,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )".to_string(),
                applied_at: None,
            },
            Migration {
                version: 11,
                description: "Insert default payment settings".to_string(),
                sql: "INSERT OR IGNORE INTO payment_settings (id, one_time_amount, monthly_amount, installment_amount, installment_interval_months, reminder_days, payment_threshold) VALUES 
                    (1, 6000, 850, 2850, 3, 7, 6000)".to_string(),
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
    
    /// Create performance indexes optimized for expected query patterns
    fn create_indexes(&self) -> DatabaseResult<()> {
        let indexes = vec![
            // Students table indexes - optimized for common query patterns
            "CREATE INDEX IF NOT EXISTS idx_students_id ON students(id)",  // Primary key lookup optimization
            "CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_name)",  // Group filtering
            "CREATE INDEX IF NOT EXISTS idx_students_paid_amount ON students(paid_amount)",  // Payment status queries
            "CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)",  // Name searches
            "CREATE INDEX IF NOT EXISTS idx_students_group_paid ON students(group_name, paid_amount)",  // Combined filtering
            "CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at)",  // Date-based queries
            "CREATE INDEX IF NOT EXISTS idx_students_updated_at ON students(updated_at)",  // Recently modified queries
            "CREATE INDEX IF NOT EXISTS idx_students_payment_plan ON students(payment_plan)",  // Payment plan filtering
            "CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status)",  // Payment status filtering
            "CREATE INDEX IF NOT EXISTS idx_students_next_due_date ON students(next_due_date)",  // Due date queries
            "CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date)",  // Enrollment tracking
            
            // Attendance table indexes - optimized for attendance tracking
            "CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)",  // Student lookup
            "CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)",  // Date-based queries
            "CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date)",  // Duplicate prevention
            "CREATE INDEX IF NOT EXISTS idx_attendance_date_desc ON attendance(date DESC)",  // Recent attendance first
            "CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at)",  // Chronological queries
            
            // Payment transactions table indexes - optimized for payment tracking
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_student_id ON payment_transactions(student_id)",  // Student payment history
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_date ON payment_transactions(payment_date)",  // Date-based queries
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_student_date ON payment_transactions(student_id, payment_date DESC)",  // Recent payments first
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_amount ON payment_transactions(amount)",  // Amount-based queries
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_method ON payment_transactions(payment_method)",  // Payment method filtering
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at)",  // Transaction chronology
            
            // Audit log indexes - optimized for change tracking and reporting
            "CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id)",  // Record history
            "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)",  // Time-based queries
            "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_desc ON audit_log(timestamp DESC)",  // Recent changes first
            "CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)",  // User activity tracking
            "CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type)",  // Action filtering
            "CREATE INDEX IF NOT EXISTS idx_audit_log_table_timestamp ON audit_log(table_name, timestamp DESC)",  // Table-specific history
            
            // Settings table index - optimized for configuration lookups
            "CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)",  // Key-based lookups (already unique)
            "CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at)",  // Recently changed settings
            
            // Users table indexes - optimized for authentication and role management
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",  // Login lookups (already unique)
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",  // Role-based queries
            "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)",  // Activity tracking
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",  // User registration tracking
            
            // Groups table indexes - optimized for group management
            "CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name)",  // Group name lookups (already unique)
            "CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at)",  // Creation date queries
            "CREATE INDEX IF NOT EXISTS idx_groups_updated_at ON groups(updated_at)",  // Recently modified groups
            
            // Payment settings table indexes - optimized for settings management
            "CREATE INDEX IF NOT EXISTS idx_payment_settings_updated_at ON payment_settings(updated_at)",  // Recently modified settings
            
            // Migrations table index - for migration management
            "CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version)",  // Version lookups
            "CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at)",  // Migration history
        ];
        
        for index_sql in &indexes {
            match self.connection.execute(index_sql, []) {
                Ok(_) => {
                    log::debug!("Created index: {}", index_sql);
                }
                Err(e) => {
                    log::error!("Failed to create index: {} - Error: {}", index_sql, e);
                    return Err(DatabaseError::Sqlite(e));
                }
            }
        }
        
        // Analyze tables to update statistics for query optimizer
        self.analyze_tables()?;
        
        log::info!("Successfully created {} database indexes with performance optimization", indexes.len());
        Ok(())
    }
    
    /// Analyze tables to update SQLite query optimizer statistics
    fn analyze_tables(&self) -> DatabaseResult<()> {
        let tables = vec![
            "students",
            "attendance", 
            "payment_transactions",
            "audit_log",
            "settings",
            "users",
            "groups",
            "payment_settings",
            "migrations"
        ];
        
        for table in tables {
            match self.connection.execute(&format!("ANALYZE {}", table), []) {
                Ok(_) => {
                    log::debug!("Analyzed table: {}", table);
                }
                Err(e) => {
                    log::warn!("Failed to analyze table {}: {}", table, e);
                    // Continue with other tables even if one fails
                }
            }
        }
        
        // Run global ANALYZE to update overall statistics
        self.connection.execute("ANALYZE", [])?;
        
        log::info!("Successfully analyzed all tables for query optimization");
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
    
    /// Get migration history
    pub fn get_migration_history(&self) -> DatabaseResult<Vec<AppliedMigration>> {
        let mut stmt = self.connection.prepare(
            "SELECT version, description, applied_at FROM migrations ORDER BY version"
        )?;
        
        let migration_iter = stmt.query_map([], |row| {
            Ok(AppliedMigration {
                version: row.get(0)?,
                description: row.get(1)?,
                applied_at: row.get(2)?,
            })
        })?;
        
        migration_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }
    
    /// Get pending migrations (not yet applied)
    pub fn get_pending_migrations(&self) -> DatabaseResult<Vec<Migration>> {
        let current_version = self.get_current_version()?;
        let all_migrations = self.get_migrations();
        
        let pending: Vec<Migration> = all_migrations
            .into_iter()
            .filter(|m| m.version > current_version)
            .collect();
        
        Ok(pending)
    }
    
    /// Validate migration integrity
    pub fn validate_migrations(&self) -> DatabaseResult<MigrationValidation> {
        let applied_migrations = self.get_migration_history()?;
        let all_migrations = self.get_migrations();
        
        let mut validation = MigrationValidation {
            is_valid: true,
            issues: Vec::new(),
            applied_count: applied_migrations.len(),
            total_count: all_migrations.len(),
        };
        
        // Check for gaps in migration versions
        for (i, applied) in applied_migrations.iter().enumerate() {
            let expected_version = i as i32 + 1;
            if applied.version != expected_version {
                validation.is_valid = false;
                validation.issues.push(format!(
                    "Migration version gap detected: expected {}, found {}",
                    expected_version, applied.version
                ));
            }
        }
        
        // Check if applied migrations match defined migrations
        for applied in &applied_migrations {
            if let Some(defined) = all_migrations.iter().find(|m| m.version == applied.version) {
                if defined.description != applied.description {
                    validation.is_valid = false;
                    validation.issues.push(format!(
                        "Migration {} description mismatch: applied='{}', defined='{}'",
                        applied.version, applied.description, defined.description
                    ));
                }
            } else {
                validation.is_valid = false;
                validation.issues.push(format!(
                    "Applied migration {} not found in defined migrations",
                    applied.version
                ));
            }
        }
        
        Ok(validation)
    }
    
    /// Check if a migration version is already applied
    fn is_migration_applied(&self, version: i32) -> DatabaseResult<bool> {
        let count: i32 = self.connection.query_row(
            "SELECT COUNT(*) FROM migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// Force apply a specific migration (use with caution)
    pub fn force_apply_migration(&self, version: i32) -> DatabaseResult<()> {
        if self.is_migration_applied(version)? {
            return Err(DatabaseError::Migration(format!(
                "Migration {} is already applied", version
            )));
        }

        let migrations = self.get_migrations();
        if let Some(migration) = migrations.iter().find(|m| m.version == version) {
            self.apply_migration(migration)?;
            log::warn!("Force applied migration {}: {}", version, migration.description);
        } else {
            return Err(DatabaseError::Migration(format!(
                "Migration {} not found", version
            )));
        }
        
        Ok(())
    }
    
    /// Mark a migration as applied without executing it (use with extreme caution)
    pub fn mark_migration_applied(&self, version: i32, description: String) -> DatabaseResult<()> {
        // Check if already applied
        if self.is_migration_applied(version)? {
            return Err(DatabaseError::Migration(format!(
                "Migration {} is already marked as applied", version
            )));
        }
        
        self.connection.execute(
            "INSERT INTO migrations (version, description) VALUES (?1, ?2)",
            params![version, description],
        )?;
        
        log::warn!("Marked migration {} as applied without execution: {}", version, description);
        Ok(())
    }
    
    /// Get database schema version info
    pub fn get_schema_info(&self) -> DatabaseResult<SchemaInfo> {
        let current_version = self.get_current_version()?;
        let all_migrations = self.get_migrations();
        let latest_version = all_migrations.iter().map(|m| m.version).max().unwrap_or(0);
        let pending_count = all_migrations.iter().filter(|m| m.version > current_version).count();
        
        Ok(SchemaInfo {
            current_version,
            latest_version,
            pending_migrations: pending_count,
            is_up_to_date: current_version == latest_version,
        })
    }
    
    /// Get rollback information for a migration (SQLite doesn't support true rollbacks)
    pub fn get_rollback_info(&self, target_version: i32) -> DatabaseResult<RollbackInfo> {
        let current_version = self.get_current_version()?;
        
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

    /// Get information about database indexes for performance monitoring
    pub fn get_index_info(&self) -> DatabaseResult<Vec<IndexInfo>> {
        let mut stmt = self.connection.prepare(
            "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY tbl_name, name"
        )?;
        
        let index_iter = stmt.query_map([], |row| {
            Ok(IndexInfo {
                name: row.get(0)?,
                table_name: row.get(1)?,
                sql: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            })
        })?;
        
        index_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }
    
    /// Check if indexes are being used effectively by running EXPLAIN QUERY PLAN on common queries
    pub fn analyze_query_performance(&self) -> DatabaseResult<Vec<QueryAnalysis>> {
        let test_queries = vec![
            ("Student lookup by ID", "SELECT * FROM students WHERE id = 'test_id'"),
            ("Students by group", "SELECT * FROM students WHERE group_name = 'Group A'"),
            ("Students with low payment", "SELECT * FROM students WHERE paid_amount < 6000"),
            ("Students by group and payment", "SELECT * FROM students WHERE group_name = 'Group A' AND paid_amount < 6000"),
            ("Attendance by student", "SELECT * FROM attendance WHERE student_id = 'test_id'"),
            ("Attendance by date", "SELECT * FROM attendance WHERE date = '2024-01-01'"),
            ("Recent attendance", "SELECT * FROM attendance ORDER BY date DESC LIMIT 10"),
            ("Audit log by table", "SELECT * FROM audit_log WHERE table_name = 'students'"),
            ("Recent audit entries", "SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10"),
            ("Settings lookup", "SELECT * FROM settings WHERE key = 'payment_threshold'"),
        ];
        
        let mut analyses = Vec::new();
        
        for (description, query) in test_queries {
            let explain_query = format!("EXPLAIN QUERY PLAN {}", query);
            
            let mut stmt = match self.connection.prepare(&explain_query) {
                Ok(stmt) => stmt,
                Err(e) => {
                    log::warn!("Failed to prepare query analysis for '{}': {}", description, e);
                    continue;
                }
            };
            
            let plan_iter = stmt.query_map([], |row| {
                Ok(format!("{} | {} | {} | {}", 
                    row.get::<_, i32>(0)?,  // selectid
                    row.get::<_, i32>(1)?,  // order
                    row.get::<_, i32>(2)?,  // from
                    row.get::<_, String>(3)?  // detail
                ))
            });
            
            let mut execution_plan = Vec::new();
            if let Ok(iter) = plan_iter {
                for plan_row in iter {
                    if let Ok(plan_detail) = plan_row {
                        execution_plan.push(plan_detail);
                    }
                }
            }
            
            let uses_index = execution_plan.iter().any(|plan| 
                plan.contains("USING INDEX") || plan.contains("USING COVERING INDEX")
            );
            
            analyses.push(QueryAnalysis {
                description: description.to_string(),
                query: query.to_string(),
                execution_plan,
                uses_index,
            });
        }
        
        Ok(analyses)
    }
    
    /// Optimize database by running VACUUM and updating statistics
    pub fn optimize_database(&self) -> DatabaseResult<()> {
        log::info!("Starting database optimization...");
        
        // Update query optimizer statistics
        self.analyze_tables()?;
        
        // Vacuum to reclaim space and optimize storage
        self.vacuum()?;
        
        // Re-analyze after vacuum
        self.connection.execute("ANALYZE", [])?;
        
        log::info!("Database optimization completed successfully");
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
pub struct IndexInfo {
    pub name: String,
    pub table_name: String,
    pub sql: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryAnalysis {
    pub description: String,
    pub query: String,
    pub execution_plan: Vec<String>,
    pub uses_index: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RollbackInfo {
    pub current_version: i32,
    pub target_version: i32,
    pub migrations_to_rollback: Vec<i32>,
    pub warning: String,
    pub instructions: Vec<String>,
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
    
    #[test]
    fn test_migration_history() {
        let (db, _temp_dir) = create_test_db();
        let history = db.get_migration_history().unwrap();
        
        // Should have all 7 migrations applied
        assert_eq!(history.len(), 7);
        
        // Check that versions are sequential
        for (i, migration) in history.iter().enumerate() {
            assert_eq!(migration.version, i as i32 + 1);
        }
    }
    
    #[test]
    fn test_pending_migrations() {
        let (db, _temp_dir) = create_test_db();
        let pending = db.get_pending_migrations().unwrap();
        
        // All migrations should be applied, so no pending ones
        assert_eq!(pending.len(), 0);
    }
    
    #[test]
    fn test_migration_validation() {
        let (db, _temp_dir) = create_test_db();
        let validation = db.validate_migrations().unwrap();
        
        assert!(validation.is_valid);
        assert_eq!(validation.issues.len(), 0);
        assert_eq!(validation.applied_count, 7);
        assert_eq!(validation.total_count, 7);
    }
    
    #[test]
    fn test_schema_info() {
        let (db, _temp_dir) = create_test_db();
        let schema_info = db.get_schema_info().unwrap();
        
        assert_eq!(schema_info.current_version, 7);
        assert_eq!(schema_info.latest_version, 7);
        assert_eq!(schema_info.pending_migrations, 0);
        assert!(schema_info.is_up_to_date);
    }
    
    #[test]
    fn test_get_all_migrations() {
        let (db, _temp_dir) = create_test_db();
        let all_migrations = db.get_migrations();
        
        assert_eq!(all_migrations.len(), 7);
        
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
        assert_eq!(rollback_info.current_version, 7);
        assert_eq!(rollback_info.target_version, 3);
        assert_eq!(rollback_info.migrations_to_rollback, vec![4, 5, 6, 7]);
        assert!(rollback_info.warning.contains("SQLite does not support"));
        assert!(!rollback_info.instructions.is_empty());
        
        // Test invalid rollback (target >= current)
        let result = db.get_rollback_info(7);
        assert!(result.is_err());
        
        let result = db.get_rollback_info(8);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_current_version() {
        let (db, _temp_dir) = create_test_db();
        let version = db.get_current_version().unwrap();
        
        // Should be at the latest version (7)
        assert_eq!(version, 7);
    }
    
    #[test]
    fn test_indexes_created() {
        let (db, _temp_dir) = create_test_db();
        let indexes = db.get_index_info().unwrap();
        
        // Should have created multiple indexes
        assert!(indexes.len() >= 20, "Expected at least 20 indexes, found {}", indexes.len());
        
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
        let analyses = db.analyze_query_performance().unwrap();
        
        // Should have analyzed multiple queries
        assert!(analyses.len() >= 8, "Expected at least 8 query analyses, found {}", analyses.len());
        
        // Check that some queries are using indexes
        let using_indexes = analyses.iter().filter(|a| a.uses_index).count();
        assert!(using_indexes > 0, "Expected some queries to use indexes");
        
        // Verify specific query optimizations
        let student_id_query = analyses.iter().find(|a| a.description == "Student lookup by ID");
        assert!(student_id_query.is_some(), "Student ID lookup query should be analyzed");
        
        let group_query = analyses.iter().find(|a| a.description == "Students by group");
        assert!(group_query.is_some(), "Students by group query should be analyzed");
    }
    
    #[test]
    fn test_database_optimization() {
        let (db, _temp_dir) = create_test_db();
        
        // Should complete without errors
        let result = db.optimize_database();
        assert!(result.is_ok(), "Database optimization should succeed: {:?}", result);
    }
    
    #[test]
    fn test_analyze_tables() {
        let (db, _temp_dir) = create_test_db();
        
        // Should complete without errors
        let result = db.analyze_tables();
        assert!(result.is_ok(), "Table analysis should succeed: {:?}", result);
    }
}