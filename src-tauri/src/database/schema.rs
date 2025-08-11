use crate::database::{Database, DatabaseResult, Migration};
use rusqlite::params;

pub struct SchemaManager;

impl SchemaManager {
    /// Define all database migrations
    pub fn get_migrations() -> Vec<Migration> {
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

    /// Create the migrations tracking table
    pub fn create_migrations_table(db: &Database) -> DatabaseResult<()> {
        db.connection().execute(
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
    pub fn get_current_version(db: &Database) -> DatabaseResult<i32> {
        let version: Result<Option<i32>, rusqlite::Error> =
            db.connection()
                .query_row("SELECT MAX(version) FROM migrations", [], |row| row.get(0));

        match version {
            Ok(Some(v)) => Ok(v),
            Ok(None) => Ok(0), // No migrations applied yet
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(0),
            Err(e) => Err(crate::database::DatabaseError::Sqlite(e)),
        }
    }

    /// Check if a migration version is already applied
    pub fn is_migration_applied(db: &Database, version: i32) -> DatabaseResult<bool> {
        let count: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

