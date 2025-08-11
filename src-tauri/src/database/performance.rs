use crate::database::{Database, DatabaseResult};
use serde::{Deserialize, Serialize};

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

pub struct PerformanceManager;

impl PerformanceManager {
    /// Create performance indexes optimized for expected query patterns
    pub fn create_indexes(db: &Database) -> DatabaseResult<()> {
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
            match db.connection().execute(index_sql, []) {
                Ok(_) => {
                    log::debug!("Created index: {}", index_sql);
                }
                Err(e) => {
                    log::error!("Failed to create index: {} - Error: {}", index_sql, e);
                    return Err(crate::database::DatabaseError::Sqlite(e));
                }
            }
        }
        
        log::info!("Successfully created {} database indexes with performance optimization", indexes.len());
        Ok(())
    }
    
    /// Analyze tables to update SQLite query optimizer statistics
    pub fn analyze_tables(db: &Database) -> DatabaseResult<()> {
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
            match db.connection().execute(&format!("ANALYZE {}", table), []) {
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
        db.connection().execute("ANALYZE", [])?;
        
        log::info!("Successfully analyzed all tables for query optimization");
        Ok(())
    }

    /// Get information about database indexes for performance monitoring
    pub fn get_index_info(db: &Database) -> DatabaseResult<Vec<IndexInfo>> {
        let mut stmt = db.connection().prepare(
            "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY tbl_name, name"
        )?;
        
        let index_iter = stmt.query_map([], |row| {
            Ok(IndexInfo {
                name: row.get(0)?,
                table_name: row.get(1)?,
                sql: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            })
        })?;
        
        index_iter.collect::<Result<Vec<_>, _>>().map_err(crate::database::DatabaseError::from)
    }
    
    /// Check if indexes are being used effectively by running EXPLAIN QUERY PLAN on common queries
    pub fn analyze_query_performance(db: &Database) -> DatabaseResult<Vec<QueryAnalysis>> {
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
            
            let mut stmt = match db.connection().prepare(&explain_query) {
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
}

