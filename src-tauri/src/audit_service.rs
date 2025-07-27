use crate::database::Database;
use rusqlite::{params, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub id: i32,
    pub action_type: String,
    pub table_name: String,
    pub record_id: String,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub user_id: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLogFilter {
    pub table_name: Option<String>,
    pub record_id: Option<String>,
    pub action_type: Option<String>,
    pub user_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditStatistics {
    pub total_entries: i32,
    pub entries_by_action: HashMap<String, i32>,
    pub entries_by_table: HashMap<String, i32>,
    pub recent_activity_count: i32, // Last 24 hours
}

pub struct AuditService;

impl AuditService {
    /// Log an audit entry for data modifications
    pub fn log_action(
        db: &Database,
        action_type: &str,
        table_name: &str,
        record_id: &str,
        old_values: Option<&str>,
        new_values: Option<&str>,
        user_id: Option<&str>,
    ) -> SqliteResult<AuditLogEntry> {
        let mut stmt = db.connection().prepare(
            "INSERT INTO audit_log (action_type, table_name, record_id, old_values, new_values, user_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             RETURNING id, action_type, table_name, record_id, old_values, new_values, user_id, timestamp"
        )?;

        let entry = stmt.query_row(
            params![action_type, table_name, record_id, old_values, new_values, user_id],
            |row| {
                Ok(AuditLogEntry {
                    id: row.get(0)?,
                    action_type: row.get(1)?,
                    table_name: row.get(2)?,
                    record_id: row.get(3)?,
                    old_values: row.get(4)?,
                    new_values: row.get(5)?,
                    user_id: row.get(6)?,
                    timestamp: row.get(7)?,
                })
            }
        )?;

        Ok(entry)
    }

    /// Get audit log entries with optional filtering
    pub fn get_audit_log(db: &Database, filter: Option<AuditLogFilter>) -> SqliteResult<Vec<AuditLogEntry>> {
        let mut query = "SELECT id, action_type, table_name, record_id, old_values, new_values, user_id, timestamp FROM audit_log".to_string();
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(filter) = filter {
            if let Some(table_name) = filter.table_name {
                conditions.push("table_name = ?".to_string());
                params.push(Box::new(table_name));
            }

            if let Some(record_id) = filter.record_id {
                conditions.push("record_id = ?".to_string());
                params.push(Box::new(record_id));
            }

            if let Some(action_type) = filter.action_type {
                conditions.push("action_type = ?".to_string());
                params.push(Box::new(action_type));
            }

            if let Some(user_id) = filter.user_id {
                conditions.push("user_id = ?".to_string());
                params.push(Box::new(user_id));
            }

            if let Some(start_date) = filter.start_date {
                conditions.push("timestamp >= ?".to_string());
                params.push(Box::new(start_date));
            }

            if let Some(end_date) = filter.end_date {
                conditions.push("timestamp <= ?".to_string());
                params.push(Box::new(end_date));
            }
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        query.push_str(" ORDER BY timestamp DESC");

        let mut stmt = db.connection().prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let entries = stmt.query_map(&param_refs[..], |row| {
            Ok(AuditLogEntry {
                id: row.get(0)?,
                action_type: row.get(1)?,
                table_name: row.get(2)?,
                record_id: row.get(3)?,
                old_values: row.get(4)?,
                new_values: row.get(5)?,
                user_id: row.get(6)?,
                timestamp: row.get(7)?,
            })
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }

        Ok(result)
    }

    /// Get audit history for a specific record
    pub fn get_record_history(db: &Database, table_name: &str, record_id: &str) -> SqliteResult<Vec<AuditLogEntry>> {
        let filter = AuditLogFilter {
            table_name: Some(table_name.to_string()),
            record_id: Some(record_id.to_string()),
            action_type: None,
            user_id: None,
            start_date: None,
            end_date: None,
        };

        Self::get_audit_log(db, Some(filter))
    }

    /// Get recent audit activity (last 24 hours)
    pub fn get_recent_activity(db: &Database) -> SqliteResult<Vec<AuditLogEntry>> {
        let mut stmt = db.connection().prepare(
            "SELECT id, action_type, table_name, record_id, old_values, new_values, user_id, timestamp 
             FROM audit_log 
             WHERE timestamp >= datetime('now', '-1 day')
             ORDER BY timestamp DESC"
        )?;

        let entries = stmt.query_map([], |row| {
            Ok(AuditLogEntry {
                id: row.get(0)?,
                action_type: row.get(1)?,
                table_name: row.get(2)?,
                record_id: row.get(3)?,
                old_values: row.get(4)?,
                new_values: row.get(5)?,
                user_id: row.get(6)?,
                timestamp: row.get(7)?,
            })
        })?;

        let mut result = Vec::new();
        for entry in entries {
            result.push(entry?);
        }

        Ok(result)
    }

    /// Get audit statistics
    pub fn get_audit_statistics(db: &Database) -> SqliteResult<AuditStatistics> {
        // Get total entries count
        let total_entries: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM audit_log",
            [],
            |row| row.get(0)
        )?;

        // Get entries by action type
        let mut entries_by_action = HashMap::new();
        let mut stmt = db.connection().prepare(
            "SELECT action_type, COUNT(*) FROM audit_log GROUP BY action_type"
        )?;
        let action_rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?;
        for row in action_rows {
            let (action_type, count) = row?;
            entries_by_action.insert(action_type, count);
        }

        // Get entries by table
        let mut entries_by_table = HashMap::new();
        let mut stmt = db.connection().prepare(
            "SELECT table_name, COUNT(*) FROM audit_log GROUP BY table_name"
        )?;
        let table_rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?;
        for row in table_rows {
            let (table_name, count) = row?;
            entries_by_table.insert(table_name, count);
        }

        // Get recent activity count (last 24 hours)
        let recent_activity_count: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM audit_log WHERE timestamp >= datetime('now', '-1 day')",
            [],
            |row| row.get(0)
        )?;

        Ok(AuditStatistics {
            total_entries,
            entries_by_action,
            entries_by_table,
            recent_activity_count,
        })
    }

    /// Delete old audit entries (for maintenance)
    pub fn cleanup_old_entries(db: &Database, days_to_keep: i32) -> SqliteResult<i32> {
        let mut stmt = db.connection().prepare(
            "DELETE FROM audit_log WHERE timestamp < datetime('now', '-' || ? || ' days')"
        )?;
        
        let deleted_count = stmt.execute(params![days_to_keep])?;
        Ok(deleted_count as i32)
    }

    /// Helper function to serialize data for audit logging
    pub fn serialize_data<T: Serialize>(data: &T) -> Result<String, serde_json::Error> {
        serde_json::to_string(data)
    }

    /// Helper function to create audit log for CREATE operations
    pub fn log_create(
        db: &Database,
        table_name: &str,
        record_id: &str,
        new_data: &str,
        user_id: Option<&str>,
    ) -> SqliteResult<AuditLogEntry> {
        Self::log_action(db, "CREATE", table_name, record_id, None, Some(new_data), user_id)
    }

    /// Helper function to create audit log for UPDATE operations
    pub fn log_update(
        db: &Database,
        table_name: &str,
        record_id: &str,
        old_data: &str,
        new_data: &str,
        user_id: Option<&str>,
    ) -> SqliteResult<AuditLogEntry> {
        Self::log_action(db, "UPDATE", table_name, record_id, Some(old_data), Some(new_data), user_id)
    }

    /// Helper function to create audit log for DELETE operations
    pub fn log_delete(
        db: &Database,
        table_name: &str,
        record_id: &str,
        old_data: &str,
        user_id: Option<&str>,
    ) -> SqliteResult<AuditLogEntry> {
        Self::log_action(db, "DELETE", table_name, record_id, Some(old_data), None, user_id)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db = Database::new(temp_dir.path().to_path_buf()).expect("Failed to create database");
        (db, temp_dir)
    }

    #[test]
    fn test_log_action() {
        let (db, _temp_dir) = setup_test_db();

        let entry = AuditService::log_action(
            &db,
            "CREATE",
            "students",
            "student_001",
            None,
            Some(r#"{"name": "John Doe", "group": "A"}"#),
            Some("admin"),
        ).expect("Failed to log action");

        assert_eq!(entry.action_type, "CREATE");
        assert_eq!(entry.table_name, "students");
        assert_eq!(entry.record_id, "student_001");
        assert!(entry.old_values.is_none());
        assert!(entry.new_values.is_some());
        assert_eq!(entry.user_id, Some("admin".to_string()));
    }

    #[test]
    fn test_get_audit_log_no_filter() {
        let (db, _temp_dir) = setup_test_db();

        // Add some test entries
        AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", "student_001", r#"{"name": "John"}"#, r#"{"name": "Jane"}"#, Some("admin")).unwrap();
        AuditService::log_delete(&db, "students", "student_001", r#"{"name": "Jane"}"#, Some("admin")).unwrap();

        let entries = AuditService::get_audit_log(&db, None).expect("Failed to get audit log");
        assert_eq!(entries.len(), 3);

        // Check that all action types are present
        let action_types: Vec<&str> = entries.iter().map(|e| e.action_type.as_str()).collect();
        assert!(action_types.contains(&"CREATE"));
        assert!(action_types.contains(&"UPDATE"));
        assert!(action_types.contains(&"DELETE"));
    }

    #[test]
    fn test_get_audit_log_with_filter() {
        let (db, _temp_dir) = setup_test_db();

        // Add test entries for different tables
        AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_create(&db, "attendance", "att_001", r#"{"student_id": "student_001"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", "student_001", r#"{"name": "John"}"#, r#"{"name": "Jane"}"#, Some("user")).unwrap();

        // Filter by table name
        let filter = AuditLogFilter {
            table_name: Some("students".to_string()),
            record_id: None,
            action_type: None,
            user_id: None,
            start_date: None,
            end_date: None,
        };

        let entries = AuditService::get_audit_log(&db, Some(filter)).expect("Failed to get filtered audit log");
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().all(|e| e.table_name == "students"));

        // Filter by action type
        let filter = AuditLogFilter {
            table_name: None,
            record_id: None,
            action_type: Some("CREATE".to_string()),
            user_id: None,
            start_date: None,
            end_date: None,
        };

        let entries = AuditService::get_audit_log(&db, Some(filter)).expect("Failed to get filtered audit log");
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().all(|e| e.action_type == "CREATE"));

        // Filter by user
        let filter = AuditLogFilter {
            table_name: None,
            record_id: None,
            action_type: None,
            user_id: Some("admin".to_string()),
            start_date: None,
            end_date: None,
        };

        let entries = AuditService::get_audit_log(&db, Some(filter)).expect("Failed to get filtered audit log");
        assert_eq!(entries.len(), 2);
        assert!(entries.iter().all(|e| e.user_id == Some("admin".to_string())));
    }

    #[test]
    fn test_get_record_history() {
        let (db, _temp_dir) = setup_test_db();

        let record_id = "student_001";
        
        // Add history for a specific record
        AuditService::log_create(&db, "students", record_id, r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", record_id, r#"{"name": "John"}"#, r#"{"name": "Jane"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", record_id, r#"{"name": "Jane"}"#, r#"{"name": "Bob"}"#, Some("user")).unwrap();

        // Add entry for different record
        AuditService::log_create(&db, "students", "student_002", r#"{"name": "Alice"}"#, Some("admin")).unwrap();

        let history = AuditService::get_record_history(&db, "students", record_id).expect("Failed to get record history");
        assert_eq!(history.len(), 3);
        assert!(history.iter().all(|e| e.record_id == record_id));
        assert!(history.iter().all(|e| e.table_name == "students"));

        // Check that all expected action types are present
        let action_types: Vec<&str> = history.iter().map(|e| e.action_type.as_str()).collect();
        assert!(action_types.contains(&"CREATE"));
        assert_eq!(action_types.iter().filter(|&&t| t == "UPDATE").count(), 2);
    }

    #[test]
    fn test_get_recent_activity() {
        let (db, _temp_dir) = setup_test_db();

        // Add some entries (they will have current timestamp)
        AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", "student_001", r#"{"name": "John"}"#, r#"{"name": "Jane"}"#, Some("admin")).unwrap();

        let recent = AuditService::get_recent_activity(&db).expect("Failed to get recent activity");
        assert_eq!(recent.len(), 2);
    }

    #[test]
    fn test_get_audit_statistics() {
        let (db, _temp_dir) = setup_test_db();

        // Add test data
        AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_create(&db, "students", "student_002", r#"{"name": "Jane"}"#, Some("admin")).unwrap();
        AuditService::log_update(&db, "students", "student_001", r#"{"name": "John"}"#, r#"{"name": "Johnny"}"#, Some("user")).unwrap();
        AuditService::log_create(&db, "attendance", "att_001", r#"{"student_id": "student_001"}"#, Some("admin")).unwrap();

        let stats = AuditService::get_audit_statistics(&db).expect("Failed to get audit statistics");
        
        assert_eq!(stats.total_entries, 4);
        assert_eq!(stats.entries_by_action.get("CREATE"), Some(&3));
        assert_eq!(stats.entries_by_action.get("UPDATE"), Some(&1));
        assert_eq!(stats.entries_by_table.get("students"), Some(&3));
        assert_eq!(stats.entries_by_table.get("attendance"), Some(&1));
        assert_eq!(stats.recent_activity_count, 4); // All entries are recent
    }

    #[test]
    fn test_cleanup_old_entries() {
        let (db, _temp_dir) = setup_test_db();

        // Add some entries
        AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin")).unwrap();
        AuditService::log_create(&db, "students", "student_002", r#"{"name": "Jane"}"#, Some("admin")).unwrap();

        // Since we can't easily create old entries in tests, we'll test the function runs without error
        let deleted_count = AuditService::cleanup_old_entries(&db, 30).expect("Failed to cleanup old entries");
        // Should be 0 since all entries are recent
        assert_eq!(deleted_count, 0);
    }

    #[test]
    fn test_serialize_data() {
        #[derive(Serialize)]
        struct TestData {
            name: String,
            age: i32,
        }

        let data = TestData {
            name: "John".to_string(),
            age: 25,
        };

        let serialized = AuditService::serialize_data(&data).expect("Failed to serialize data");
        assert!(serialized.contains("John"));
        assert!(serialized.contains("25"));
    }

    #[test]
    fn test_helper_functions() {
        let (db, _temp_dir) = setup_test_db();

        // Test log_create
        let entry = AuditService::log_create(&db, "students", "student_001", r#"{"name": "John"}"#, Some("admin"))
            .expect("Failed to log create");
        assert_eq!(entry.action_type, "CREATE");
        assert!(entry.old_values.is_none());
        assert!(entry.new_values.is_some());

        // Test log_update
        let entry = AuditService::log_update(&db, "students", "student_001", r#"{"name": "John"}"#, r#"{"name": "Jane"}"#, Some("admin"))
            .expect("Failed to log update");
        assert_eq!(entry.action_type, "UPDATE");
        assert!(entry.old_values.is_some());
        assert!(entry.new_values.is_some());

        // Test log_delete
        let entry = AuditService::log_delete(&db, "students", "student_001", r#"{"name": "Jane"}"#, Some("admin"))
            .expect("Failed to log delete");
        assert_eq!(entry.action_type, "DELETE");
        assert!(entry.old_values.is_some());
        assert!(entry.new_values.is_none());
    }
}