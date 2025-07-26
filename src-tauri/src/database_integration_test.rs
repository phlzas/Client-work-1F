#[cfg(test)]
mod integration_tests {
    use crate::{Database, AppState};
    use tempfile::TempDir;

    #[test]
    fn test_database_integration_with_app_state() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        
        // Test that we can create the app state structure
        let app_state = AppState {
            db: std::sync::Mutex::new(db),
        };
        
        // Test that we can access the database through the mutex
        let db_guard = app_state.db.lock().unwrap();
        assert!(db_guard.health_check().unwrap());
        
        // Test that we can get stats
        let stats = db_guard.get_stats().unwrap();
        assert_eq!(stats.students_count, 0);
        assert_eq!(stats.attendance_count, 0);
        assert_eq!(stats.audit_log_count, 0);
        assert!(stats.database_size_bytes > 0);
    }
    
    #[test]
    fn test_database_backup_functionality() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        
        // Create a backup
        let backup_path = temp_dir.path().join("backup.db");
        db.backup_to_file(&backup_path).unwrap();
        
        // Verify backup file exists and has content
        assert!(backup_path.exists());
        let backup_size = std::fs::metadata(&backup_path).unwrap().len();
        assert!(backup_size > 0);
        
        // Verify backup can be opened as a valid database
        let backup_db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        assert!(backup_db.health_check().unwrap());
    }
    
    #[test]
    fn test_database_vacuum() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        
        // Test vacuum operation
        db.vacuum().unwrap();
        
        // Database should still be healthy after vacuum
        assert!(db.health_check().unwrap());
    }
    
    #[test]
    fn test_all_required_tables_exist() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        
        let required_tables = vec![
            "students",
            "attendance", 
            "settings",
            "audit_log",
            "users",
            "migrations"
        ];
        
        for table in required_tables {
            let count: Result<i32, rusqlite::Error> = db.connection().query_row(
                &format!("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'", table),
                [],
                |row| row.get(0),
            );
            
            assert_eq!(count.unwrap(), 1, "Table '{}' should exist", table);
        }
    }
    
    #[test]
    fn test_default_settings_values() {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        
        // Check specific default settings
        let payment_threshold: String = db.connection().query_row(
            "SELECT value FROM settings WHERE key = 'payment_threshold'",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert_eq!(payment_threshold, "6000");
        
        let language: String = db.connection().query_row(
            "SELECT value FROM settings WHERE key = 'language'",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert_eq!(language, "ar");
    }
}