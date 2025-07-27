use crate::database::{Database, DatabaseResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub payment_threshold: i32,
    pub default_groups: Vec<String>,
    pub enable_audit_log: bool,
    pub language: String,
    pub theme: String,
    pub enable_multi_user: bool,
    pub backup_encryption: bool,
    pub accessibility_mode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPlanConfig {
    pub one_time_amount: i32,
    pub monthly_amount: i32,
    pub installment_amount: i32,
    pub installment_interval: i32, // months
    pub reminder_days: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingRecord {
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}

pub struct SettingsService;

impl SettingsService {
    /// Get all application settings
    pub fn get_settings(db: &Database) -> DatabaseResult<AppSettings> {
        let mut stmt = db.connection().prepare(
            "SELECT key, value FROM settings WHERE key IN (
                'payment_threshold', 'default_groups', 'enable_audit_log', 
                'language', 'theme', 'enable_multi_user', 'backup_encryption', 
                'accessibility_mode'
            )"
        )?;

        let setting_iter = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        let mut settings_map: HashMap<String, String> = HashMap::new();
        for setting in setting_iter {
            let (key, value) = setting?;
            settings_map.insert(key, value);
        }

        // Parse settings with defaults
        let payment_threshold = settings_map
            .get("payment_threshold")
            .and_then(|v| v.parse().ok())
            .unwrap_or(6000);

        let default_groups: Vec<String> = settings_map
            .get("default_groups")
            .and_then(|v| serde_json::from_str(v).ok())
            .unwrap_or_else(|| vec!["Group A".to_string(), "Group B".to_string(), "Group C".to_string()]);

        let enable_audit_log = settings_map
            .get("enable_audit_log")
            .map(|v| v == "true")
            .unwrap_or(true);

        let language = settings_map
            .get("language")
            .cloned()
            .unwrap_or_else(|| "ar".to_string());

        let theme = settings_map
            .get("theme")
            .cloned()
            .unwrap_or_else(|| "light".to_string());

        let enable_multi_user = settings_map
            .get("enable_multi_user")
            .map(|v| v == "true")
            .unwrap_or(false);

        let backup_encryption = settings_map
            .get("backup_encryption")
            .map(|v| v == "true")
            .unwrap_or(false);

        let accessibility_mode = settings_map
            .get("accessibility_mode")
            .map(|v| v == "true")
            .unwrap_or(false);

        Ok(AppSettings {
            payment_threshold,
            default_groups,
            enable_audit_log,
            language,
            theme,
            enable_multi_user,
            backup_encryption,
            accessibility_mode,
        })
    }

    /// Update application settings
    pub fn update_settings(db: &Database, settings: AppSettings) -> DatabaseResult<()> {
        let conn = db.connection();
        let tx = conn.unchecked_transaction()?;

        // Update each setting
        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["payment_threshold", settings.payment_threshold.to_string()],
        )?;

        let default_groups_json = serde_json::to_string(&settings.default_groups)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["default_groups", default_groups_json],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["enable_audit_log", if settings.enable_audit_log { "true" } else { "false" }],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["language", settings.language],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["theme", settings.theme],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["enable_multi_user", if settings.enable_multi_user { "true" } else { "false" }],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["backup_encryption", if settings.backup_encryption { "true" } else { "false" }],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["accessibility_mode", if settings.accessibility_mode { "true" } else { "false" }],
        )?;

        tx.commit()?;
        Ok(())
    }

    /// Get payment plan configuration
    pub fn get_payment_plan_config(db: &Database) -> DatabaseResult<PaymentPlanConfig> {
        let mut stmt = db.connection().prepare(
            "SELECT key, value FROM settings WHERE key IN (
                'one_time_amount', 'monthly_amount', 'installment_amount', 
                'installment_interval', 'reminder_days'
            )"
        )?;

        let setting_iter = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        let mut settings_map: HashMap<String, String> = HashMap::new();
        for setting in setting_iter {
            let (key, value) = setting?;
            settings_map.insert(key, value);
        }

        // Parse payment plan settings with defaults
        let one_time_amount = settings_map
            .get("one_time_amount")
            .and_then(|v| v.parse().ok())
            .unwrap_or(6000);

        let monthly_amount = settings_map
            .get("monthly_amount")
            .and_then(|v| v.parse().ok())
            .unwrap_or(850);

        let installment_amount = settings_map
            .get("installment_amount")
            .and_then(|v| v.parse().ok())
            .unwrap_or(2850);

        let installment_interval = settings_map
            .get("installment_interval")
            .and_then(|v| v.parse().ok())
            .unwrap_or(3);

        let reminder_days = settings_map
            .get("reminder_days")
            .and_then(|v| v.parse().ok())
            .unwrap_or(7);

        Ok(PaymentPlanConfig {
            one_time_amount,
            monthly_amount,
            installment_amount,
            installment_interval,
            reminder_days,
        })
    }

    /// Update payment plan configuration
    pub fn update_payment_plan_config(db: &Database, config: PaymentPlanConfig) -> DatabaseResult<()> {
        let conn = db.connection();
        let tx = conn.unchecked_transaction()?;

        // Update each payment plan setting
        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["one_time_amount", config.one_time_amount.to_string()],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["monthly_amount", config.monthly_amount.to_string()],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["installment_amount", config.installment_amount.to_string()],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["installment_interval", config.installment_interval.to_string()],
        )?;

        tx.execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params!["reminder_days", config.reminder_days.to_string()],
        )?;

        tx.commit()?;
        Ok(())
    }

    /// Get a specific setting by key
    pub fn get_setting(db: &Database, key: &str) -> DatabaseResult<Option<String>> {
        let result = db.connection().query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Set a specific setting by key
    pub fn set_setting(db: &Database, key: &str, value: &str) -> DatabaseResult<()> {
        db.connection().execute(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params![key, value],
        )?;
        Ok(())
    }

    /// Get all settings as raw key-value pairs
    pub fn get_all_settings(db: &Database) -> DatabaseResult<Vec<SettingRecord>> {
        let mut stmt = db.connection().prepare(
            "SELECT key, value, updated_at FROM settings ORDER BY key"
        )?;

        let setting_iter = stmt.query_map([], |row| {
            Ok(SettingRecord {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })?;

        setting_iter.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }

    /// Delete a setting by key
    pub fn delete_setting(db: &Database, key: &str) -> DatabaseResult<bool> {
        let rows_affected = db.connection().execute(
            "DELETE FROM settings WHERE key = ?1",
            params![key],
        )?;
        Ok(rows_affected > 0)
    }

    /// Reset settings to default values
    pub fn reset_to_defaults(db: &Database) -> DatabaseResult<()> {
        let conn = db.connection();
        let tx = conn.unchecked_transaction()?;

        // Clear existing settings
        tx.execute("DELETE FROM settings", [])?;

        // Insert default settings
        let default_settings = [
            ("payment_threshold", "6000"),
            ("default_groups", r#"["Group A", "Group B", "Group C"]"#),
            ("enable_audit_log", "true"),
            ("language", "ar"),
            ("theme", "light"),
            ("enable_multi_user", "false"),
            ("backup_encryption", "false"),
            ("accessibility_mode", "false"),
            ("one_time_amount", "6000"),
            ("monthly_amount", "850"),
            ("installment_amount", "2850"),
            ("installment_interval", "3"),
            ("reminder_days", "7"),
        ];

        for (key, value) in &default_settings {
            tx.execute(
                "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
                params![key, value],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    /// Check if settings table is properly initialized
    pub fn validate_settings(db: &Database) -> DatabaseResult<bool> {
        let count: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM settings",
            [],
            |row| row.get(0),
        )?;

        // We expect at least the default settings to be present
        Ok(count >= 13)
    }

    /// Get settings that have been modified recently
    pub fn get_recently_modified_settings(db: &Database, hours: i32) -> DatabaseResult<Vec<SettingRecord>> {
        let mut stmt = db.connection().prepare(
            "SELECT key, value, updated_at FROM settings 
             WHERE updated_at > datetime('now', '-' || ?1 || ' hours')
             ORDER BY updated_at DESC"
        )?;

        let setting_iter = stmt.query_map([hours], |row| {
            Ok(SettingRecord {
                key: row.get(0)?,
                value: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })?;

        setting_iter.collect::<Result<Vec<_>, _>>().map_err(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::tempdir;

    fn create_test_database() -> Database {
        let temp_dir = tempdir().expect("Failed to create temp directory");
        Database::new(temp_dir.path().to_path_buf()).expect("Failed to create test database")
    }

    #[test]
    fn test_get_default_settings() {
        let db = create_test_database();
        let settings = SettingsService::get_settings(&db).expect("Failed to get settings");

        assert_eq!(settings.payment_threshold, 6000);
        assert_eq!(settings.default_groups, vec!["Group A", "Group B", "Group C"]);
        assert_eq!(settings.enable_audit_log, true);
        assert_eq!(settings.language, "ar");
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.enable_multi_user, false);
        assert_eq!(settings.backup_encryption, false);
        assert_eq!(settings.accessibility_mode, false);
    }

    #[test]
    fn test_update_settings() {
        let db = create_test_database();
        
        let new_settings = AppSettings {
            payment_threshold: 7000,
            default_groups: vec!["Group X".to_string(), "Group Y".to_string()],
            enable_audit_log: false,
            language: "en".to_string(),
            theme: "dark".to_string(),
            enable_multi_user: true,
            backup_encryption: true,
            accessibility_mode: true,
        };

        SettingsService::update_settings(&db, new_settings.clone()).expect("Failed to update settings");
        let retrieved_settings = SettingsService::get_settings(&db).expect("Failed to get updated settings");

        assert_eq!(retrieved_settings.payment_threshold, new_settings.payment_threshold);
        assert_eq!(retrieved_settings.default_groups, new_settings.default_groups);
        assert_eq!(retrieved_settings.enable_audit_log, new_settings.enable_audit_log);
        assert_eq!(retrieved_settings.language, new_settings.language);
        assert_eq!(retrieved_settings.theme, new_settings.theme);
        assert_eq!(retrieved_settings.enable_multi_user, new_settings.enable_multi_user);
        assert_eq!(retrieved_settings.backup_encryption, new_settings.backup_encryption);
        assert_eq!(retrieved_settings.accessibility_mode, new_settings.accessibility_mode);
    }

    #[test]
    fn test_get_default_payment_plan_config() {
        let db = create_test_database();
        let config = SettingsService::get_payment_plan_config(&db).expect("Failed to get payment plan config");

        assert_eq!(config.one_time_amount, 6000);
        assert_eq!(config.monthly_amount, 850);
        assert_eq!(config.installment_amount, 2850);
        assert_eq!(config.installment_interval, 3);
        assert_eq!(config.reminder_days, 7);
    }

    #[test]
    fn test_update_payment_plan_config() {
        let db = create_test_database();
        
        let new_config = PaymentPlanConfig {
            one_time_amount: 8000,
            monthly_amount: 1000,
            installment_amount: 3000,
            installment_interval: 4,
            reminder_days: 10,
        };

        SettingsService::update_payment_plan_config(&db, new_config.clone()).expect("Failed to update payment plan config");
        let retrieved_config = SettingsService::get_payment_plan_config(&db).expect("Failed to get updated payment plan config");

        assert_eq!(retrieved_config.one_time_amount, new_config.one_time_amount);
        assert_eq!(retrieved_config.monthly_amount, new_config.monthly_amount);
        assert_eq!(retrieved_config.installment_amount, new_config.installment_amount);
        assert_eq!(retrieved_config.installment_interval, new_config.installment_interval);
        assert_eq!(retrieved_config.reminder_days, new_config.reminder_days);
    }

    #[test]
    fn test_get_set_individual_setting() {
        let db = create_test_database();

        // Test getting non-existent setting
        let result = SettingsService::get_setting(&db, "non_existent").expect("Failed to get setting");
        assert_eq!(result, None);

        // Test setting and getting a custom setting
        SettingsService::set_setting(&db, "custom_setting", "custom_value").expect("Failed to set setting");
        let result = SettingsService::get_setting(&db, "custom_setting").expect("Failed to get setting");
        assert_eq!(result, Some("custom_value".to_string()));

        // Test updating existing setting
        SettingsService::set_setting(&db, "custom_setting", "updated_value").expect("Failed to update setting");
        let result = SettingsService::get_setting(&db, "custom_setting").expect("Failed to get updated setting");
        assert_eq!(result, Some("updated_value".to_string()));
    }

    #[test]
    fn test_get_all_settings() {
        let db = create_test_database();
        let all_settings = SettingsService::get_all_settings(&db).expect("Failed to get all settings");

        // Should have at least the default settings
        assert!(all_settings.len() >= 13);

        // Check that we have some expected keys
        let keys: Vec<&str> = all_settings.iter().map(|s| s.key.as_str()).collect();
        assert!(keys.contains(&"payment_threshold"));
        assert!(keys.contains(&"language"));
        assert!(keys.contains(&"theme"));
    }

    #[test]
    fn test_delete_setting() {
        let db = create_test_database();

        // Add a custom setting
        SettingsService::set_setting(&db, "test_setting", "test_value").expect("Failed to set setting");
        
        // Verify it exists
        let result = SettingsService::get_setting(&db, "test_setting").expect("Failed to get setting");
        assert_eq!(result, Some("test_value".to_string()));

        // Delete it
        let deleted = SettingsService::delete_setting(&db, "test_setting").expect("Failed to delete setting");
        assert!(deleted);

        // Verify it's gone
        let result = SettingsService::get_setting(&db, "test_setting").expect("Failed to get setting");
        assert_eq!(result, None);

        // Try to delete non-existent setting
        let deleted = SettingsService::delete_setting(&db, "non_existent").expect("Failed to delete setting");
        assert!(!deleted);
    }

    #[test]
    fn test_reset_to_defaults() {
        let db = create_test_database();

        // Modify some settings
        let modified_settings = AppSettings {
            payment_threshold: 9999,
            default_groups: vec!["Modified Group".to_string()],
            enable_audit_log: false,
            language: "en".to_string(),
            theme: "dark".to_string(),
            enable_multi_user: true,
            backup_encryption: true,
            accessibility_mode: true,
        };
        SettingsService::update_settings(&db, modified_settings).expect("Failed to update settings");

        // Reset to defaults
        SettingsService::reset_to_defaults(&db).expect("Failed to reset to defaults");

        // Verify defaults are restored
        let settings = SettingsService::get_settings(&db).expect("Failed to get settings");
        assert_eq!(settings.payment_threshold, 6000);
        assert_eq!(settings.default_groups, vec!["Group A", "Group B", "Group C"]);
        assert_eq!(settings.enable_audit_log, true);
        assert_eq!(settings.language, "ar");
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.enable_multi_user, false);
        assert_eq!(settings.backup_encryption, false);
        assert_eq!(settings.accessibility_mode, false);
    }

    #[test]
    fn test_validate_settings() {
        let db = create_test_database();
        let is_valid = SettingsService::validate_settings(&db).expect("Failed to validate settings");
        assert!(is_valid);

        // Clear settings and test validation
        db.connection().execute("DELETE FROM settings", []).expect("Failed to clear settings");
        let is_valid = SettingsService::validate_settings(&db).expect("Failed to validate settings");
        assert!(!is_valid);
    }

    #[test]
    fn test_recently_modified_settings() {
        let db = create_test_database();

        // Get recently modified settings (should include defaults)
        let recent_settings = SettingsService::get_recently_modified_settings(&db, 1)
            .expect("Failed to get recently modified settings");
        
        // Should have the default settings that were just created
        assert!(recent_settings.len() >= 13);

        // Modify a setting
        SettingsService::set_setting(&db, "test_recent", "test_value").expect("Failed to set setting");
        
        let recent_settings = SettingsService::get_recently_modified_settings(&db, 1)
            .expect("Failed to get recently modified settings");
        
        // Should include our new setting
        assert!(recent_settings.iter().any(|s| s.key == "test_recent"));
    }
}