use crate::database::{Database, DatabaseResult};
use crate::audit_service::AuditService;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSettings {
    pub id: i32,
    pub one_time_amount: i32,
    pub monthly_amount: i32,
    pub installment_amount: i32,
    pub installment_interval_months: i32,
    pub reminder_days: i32,
    pub payment_threshold: i32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePaymentSettingsRequest {
    pub one_time_amount: i32,
    pub monthly_amount: i32,
    pub installment_amount: i32,
    pub installment_interval_months: i32,
    pub reminder_days: i32,
    pub payment_threshold: i32,
}

pub struct PaymentSettingsService;

impl PaymentSettingsService {
    /// Get payment settings (there should only be one record with id=1)
    pub fn get_payment_settings(db: &Database) -> DatabaseResult<PaymentSettings> {
        let mut stmt = db.connection().prepare(
            "SELECT id, one_time_amount, monthly_amount, installment_amount, 
                    installment_interval_months, reminder_days, payment_threshold, updated_at 
             FROM payment_settings WHERE id = 1"
        )?;
        
        let mut settings_iter = stmt.query_map([], |row| {
            Ok(PaymentSettings {
                id: row.get(0)?,
                one_time_amount: row.get(1)?,
                monthly_amount: row.get(2)?,
                installment_amount: row.get(3)?,
                installment_interval_months: row.get(4)?,
                reminder_days: row.get(5)?,
                payment_threshold: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        
        match settings_iter.next() {
            Some(settings) => Ok(settings?),
            None => {
                // If no settings exist, create default settings
                Self::create_default_settings(db)
            }
        }
    }
    
    /// Create default payment settings
    fn create_default_settings(db: &Database) -> DatabaseResult<PaymentSettings> {
        let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        
        db.connection().execute(
            "INSERT INTO payment_settings (id, one_time_amount, monthly_amount, installment_amount, 
                                         installment_interval_months, reminder_days, payment_threshold, updated_at) 
             VALUES (1, 6000, 850, 2850, 3, 7, 6000, ?1)",
            params![now],
        )?;
        
        let settings = PaymentSettings {
            id: 1,
            one_time_amount: 6000,
            monthly_amount: 850,
            installment_amount: 2850,
            installment_interval_months: 3,
            reminder_days: 7,
            payment_threshold: 6000,
            updated_at: now.clone(),
        };
        
        // Create audit log entry
        let new_values = serde_json::json!({
            "id": 1,
            "one_time_amount": 6000,
            "monthly_amount": 850,
            "installment_amount": 2850,
            "installment_interval_months": 3,
            "reminder_days": 7,
            "payment_threshold": 6000,
            "updated_at": now
        });
        
        AuditService::log_action(
            db,
            "CREATE",
            "payment_settings",
            "1",
            None,
            Some(&new_values.to_string()),
            Some("Created default payment settings"),
        )?;
        
        Ok(settings)
    }
    
    /// Update payment settings
    pub fn update_payment_settings(db: &Database, request: UpdatePaymentSettingsRequest) -> DatabaseResult<()> {
        // Validate the settings
        Self::validate_payment_settings(&request)?;
        
        // Get existing settings for audit logging
        let existing_settings = Self::get_payment_settings(db)?;
        
        let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
        
        // Update the settings
        let rows_affected = db.connection().execute(
            "UPDATE payment_settings 
             SET one_time_amount = ?1, monthly_amount = ?2, installment_amount = ?3,
                 installment_interval_months = ?4, reminder_days = ?5, payment_threshold = ?6,
                 updated_at = ?7
             WHERE id = 1",
            params![
                request.one_time_amount,
                request.monthly_amount,
                request.installment_amount,
                request.installment_interval_months,
                request.reminder_days,
                request.payment_threshold,
                now
            ],
        )?;
        
        if rows_affected == 0 {
            return Err(crate::database::DatabaseError::Migration(
                "Payment settings not found".to_string()
            ));
        }
        
        // Create audit log entry
        let old_values = serde_json::json!({
            "id": existing_settings.id,
            "one_time_amount": existing_settings.one_time_amount,
            "monthly_amount": existing_settings.monthly_amount,
            "installment_amount": existing_settings.installment_amount,
            "installment_interval_months": existing_settings.installment_interval_months,
            "reminder_days": existing_settings.reminder_days,
            "payment_threshold": existing_settings.payment_threshold,
            "updated_at": existing_settings.updated_at
        });
        
        let new_values = serde_json::json!({
            "id": 1,
            "one_time_amount": request.one_time_amount,
            "monthly_amount": request.monthly_amount,
            "installment_amount": request.installment_amount,
            "installment_interval_months": request.installment_interval_months,
            "reminder_days": request.reminder_days,
            "payment_threshold": request.payment_threshold,
            "updated_at": now
        });
        
        AuditService::log_action(
            db,
            "UPDATE",
            "payment_settings",
            "1",
            Some(&old_values.to_string()),
            Some(&new_values.to_string()),
            Some("Updated payment settings"),
        )?;
        
        Ok(())
    }
    
    /// Validate payment settings
    pub fn validate_payment_settings(request: &UpdatePaymentSettingsRequest) -> DatabaseResult<()> {
        // Validate amounts are positive
        if request.one_time_amount <= 0 {
            return Err(crate::database::DatabaseError::Migration(
                "One-time amount must be greater than 0".to_string()
            ));
        }
        
        if request.monthly_amount <= 0 {
            return Err(crate::database::DatabaseError::Migration(
                "Monthly amount must be greater than 0".to_string()
            ));
        }
        
        if request.installment_amount <= 0 {
            return Err(crate::database::DatabaseError::Migration(
                "Installment amount must be greater than 0".to_string()
            ));
        }
        
        if request.payment_threshold <= 0 {
            return Err(crate::database::DatabaseError::Migration(
                "Payment threshold must be greater than 0".to_string()
            ));
        }
        
        // Validate intervals are reasonable
        if request.installment_interval_months < 1 || request.installment_interval_months > 12 {
            return Err(crate::database::DatabaseError::Migration(
                "Installment interval must be between 1 and 12 months".to_string()
            ));
        }
        
        if request.reminder_days < 0 || request.reminder_days > 365 {
            return Err(crate::database::DatabaseError::Migration(
                "Reminder days must be between 0 and 365".to_string()
            ));
        }
        
        // Validate amounts are reasonable (not too large)
        const MAX_AMOUNT: i32 = 1_000_000; // 1 million EGP max
        
        if request.one_time_amount > MAX_AMOUNT {
            return Err(crate::database::DatabaseError::Migration(
                format!("One-time amount cannot exceed {} EGP", MAX_AMOUNT)
            ));
        }
        
        if request.monthly_amount > MAX_AMOUNT {
            return Err(crate::database::DatabaseError::Migration(
                format!("Monthly amount cannot exceed {} EGP", MAX_AMOUNT)
            ));
        }
        
        if request.installment_amount > MAX_AMOUNT {
            return Err(crate::database::DatabaseError::Migration(
                format!("Installment amount cannot exceed {} EGP", MAX_AMOUNT)
            ));
        }
        
        if request.payment_threshold > MAX_AMOUNT {
            return Err(crate::database::DatabaseError::Migration(
                format!("Payment threshold cannot exceed {} EGP", MAX_AMOUNT)
            ));
        }
        
        Ok(())
    }
    
    /// Reset payment settings to defaults
    pub fn reset_to_defaults(db: &Database) -> DatabaseResult<()> {
        let default_request = UpdatePaymentSettingsRequest {
            one_time_amount: 6000,
            monthly_amount: 850,
            installment_amount: 2850,
            installment_interval_months: 3,
            reminder_days: 7,
            payment_threshold: 6000,
        };
        
        Self::update_payment_settings(db, default_request)
    }
    
    /// Get payment settings as a configuration object for other services
    pub fn get_payment_config(db: &Database) -> DatabaseResult<PaymentConfig> {
        let settings = Self::get_payment_settings(db)?;
        
        Ok(PaymentConfig {
            one_time_amount: settings.one_time_amount,
            monthly_amount: settings.monthly_amount,
            installment_amount: settings.installment_amount,
            installment_interval_months: settings.installment_interval_months,
            reminder_days: settings.reminder_days,
            payment_threshold: settings.payment_threshold,
        })
    }
    
    /// Check if payment settings exist
    pub fn settings_exist(db: &Database) -> DatabaseResult<bool> {
        let count: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM payment_settings WHERE id = 1",
            [],
            |row| row.get(0),
        )?;
        
        Ok(count > 0)
    }
    
    /// Get payment settings history (from audit log)
    pub fn get_settings_history(db: &Database) -> DatabaseResult<Vec<PaymentSettingsHistoryEntry>> {
        let mut stmt = db.connection().prepare(
            "SELECT action_type, old_values, new_values, timestamp 
             FROM audit_log 
             WHERE table_name = 'payment_settings' AND record_id = '1'
             ORDER BY timestamp DESC"
        )?;
        
        let history_iter = stmt.query_map([], |row| {
            let action_type: String = row.get(0)?;
            let old_values: Option<String> = row.get(1)?;
            let new_values: Option<String> = row.get(2)?;
            let timestamp: String = row.get(3)?;
            
            Ok(PaymentSettingsHistoryEntry {
                action_type,
                old_values,
                new_values,
                timestamp,
            })
        })?;
        
        let history: Result<Vec<PaymentSettingsHistoryEntry>, _> = history_iter.collect();
        history.map_err(Into::into)
    }
    
    /// Ensure payment settings exist (create defaults if not)
    pub fn ensure_settings_exist(db: &Database) -> DatabaseResult<()> {
        if !Self::settings_exist(db)? {
            Self::create_default_settings(db)?;
        }
        Ok(())
    }
    
    /// Get payment amount for a specific plan type
    pub fn get_amount_for_plan(db: &Database, plan_type: &str) -> DatabaseResult<i32> {
        let settings = Self::get_payment_settings(db)?;
        
        match plan_type {
            "one-time" => Ok(settings.one_time_amount),
            "monthly" => Ok(settings.monthly_amount),
            "installment" => Ok(settings.installment_amount),
            _ => Err(crate::database::DatabaseError::Migration(
                format!("Unknown payment plan type: {}", plan_type)
            )),
        }
    }
    
    /// Update a specific setting value
    pub fn update_specific_setting(db: &Database, setting_name: &str, value: i32) -> DatabaseResult<()> {
        let current_settings = Self::get_payment_settings(db)?;
        
        let updated_request = match setting_name {
            "one_time_amount" => UpdatePaymentSettingsRequest {
                one_time_amount: value,
                monthly_amount: current_settings.monthly_amount,
                installment_amount: current_settings.installment_amount,
                installment_interval_months: current_settings.installment_interval_months,
                reminder_days: current_settings.reminder_days,
                payment_threshold: current_settings.payment_threshold,
            },
            "monthly_amount" => UpdatePaymentSettingsRequest {
                one_time_amount: current_settings.one_time_amount,
                monthly_amount: value,
                installment_amount: current_settings.installment_amount,
                installment_interval_months: current_settings.installment_interval_months,
                reminder_days: current_settings.reminder_days,
                payment_threshold: current_settings.payment_threshold,
            },
            "installment_amount" => UpdatePaymentSettingsRequest {
                one_time_amount: current_settings.one_time_amount,
                monthly_amount: current_settings.monthly_amount,
                installment_amount: value,
                installment_interval_months: current_settings.installment_interval_months,
                reminder_days: current_settings.reminder_days,
                payment_threshold: current_settings.payment_threshold,
            },
            "installment_interval_months" => UpdatePaymentSettingsRequest {
                one_time_amount: current_settings.one_time_amount,
                monthly_amount: current_settings.monthly_amount,
                installment_amount: current_settings.installment_amount,
                installment_interval_months: value,
                reminder_days: current_settings.reminder_days,
                payment_threshold: current_settings.payment_threshold,
            },
            "reminder_days" => UpdatePaymentSettingsRequest {
                one_time_amount: current_settings.one_time_amount,
                monthly_amount: current_settings.monthly_amount,
                installment_amount: current_settings.installment_amount,
                installment_interval_months: current_settings.installment_interval_months,
                reminder_days: value,
                payment_threshold: current_settings.payment_threshold,
            },
            "payment_threshold" => UpdatePaymentSettingsRequest {
                one_time_amount: current_settings.one_time_amount,
                monthly_amount: current_settings.monthly_amount,
                installment_amount: current_settings.installment_amount,
                installment_interval_months: current_settings.installment_interval_months,
                reminder_days: current_settings.reminder_days,
                payment_threshold: value,
            },
            _ => return Err(crate::database::DatabaseError::Migration(
                format!("Unknown setting name: {}", setting_name)
            )),
        };
        
        Self::update_payment_settings(db, updated_request)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentConfig {
    pub one_time_amount: i32,
    pub monthly_amount: i32,
    pub installment_amount: i32,
    pub installment_interval_months: i32,
    pub reminder_days: i32,
    pub payment_threshold: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSettingsHistoryEntry {
    pub action_type: String,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub timestamp: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db = Database::new(temp_dir.path().to_path_buf()).expect("Failed to create test database");
        (db, temp_dir)
    }

    #[test]
    fn test_get_payment_settings() {
        let (db, _temp_dir) = setup_test_db();
        
        let settings = PaymentSettingsService::get_payment_settings(&db)
            .expect("Failed to get payment settings");
        
        // Should have default values
        assert_eq!(settings.one_time_amount, 6000);
        assert_eq!(settings.monthly_amount, 850);
        assert_eq!(settings.installment_amount, 2850);
        assert_eq!(settings.installment_interval_months, 3);
        assert_eq!(settings.reminder_days, 7);
        assert_eq!(settings.payment_threshold, 6000);
    }

    #[test]
    fn test_update_payment_settings() {
        let (db, _temp_dir) = setup_test_db();
        
        let update_request = UpdatePaymentSettingsRequest {
            one_time_amount: 7000,
            monthly_amount: 900,
            installment_amount: 3000,
            installment_interval_months: 4,
            reminder_days: 10,
            payment_threshold: 7000,
        };
        
        PaymentSettingsService::update_payment_settings(&db, update_request)
            .expect("Failed to update payment settings");
        
        let updated_settings = PaymentSettingsService::get_payment_settings(&db)
            .expect("Failed to get updated settings");
        
        assert_eq!(updated_settings.one_time_amount, 7000);
        assert_eq!(updated_settings.monthly_amount, 900);
        assert_eq!(updated_settings.installment_amount, 3000);
        assert_eq!(updated_settings.installment_interval_months, 4);
        assert_eq!(updated_settings.reminder_days, 10);
        assert_eq!(updated_settings.payment_threshold, 7000);
    }

    #[test]
    fn test_validate_payment_settings() {
        let valid_request = UpdatePaymentSettingsRequest {
            one_time_amount: 6000,
            monthly_amount: 850,
            installment_amount: 2850,
            installment_interval_months: 3,
            reminder_days: 7,
            payment_threshold: 6000,
        };
        
        assert!(PaymentSettingsService::validate_payment_settings(&valid_request).is_ok());
        
        let invalid_request = UpdatePaymentSettingsRequest {
            one_time_amount: -1000, // Invalid negative amount
            monthly_amount: 850,
            installment_amount: 2850,
            installment_interval_months: 3,
            reminder_days: 7,
            payment_threshold: 6000,
        };
        
        assert!(PaymentSettingsService::validate_payment_settings(&invalid_request).is_err());
    }

    #[test]
    fn test_get_amount_for_plan() {
        let (db, _temp_dir) = setup_test_db();
        
        let one_time_amount = PaymentSettingsService::get_amount_for_plan(&db, "one-time")
            .expect("Failed to get one-time amount");
        assert_eq!(one_time_amount, 6000);
        
        let monthly_amount = PaymentSettingsService::get_amount_for_plan(&db, "monthly")
            .expect("Failed to get monthly amount");
        assert_eq!(monthly_amount, 850);
        
        let installment_amount = PaymentSettingsService::get_amount_for_plan(&db, "installment")
            .expect("Failed to get installment amount");
        assert_eq!(installment_amount, 2850);
        
        // Test invalid plan type
        let result = PaymentSettingsService::get_amount_for_plan(&db, "invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_reset_to_defaults() {
        let (db, _temp_dir) = setup_test_db();
        
        // First update to non-default values
        let update_request = UpdatePaymentSettingsRequest {
            one_time_amount: 8000,
            monthly_amount: 1000,
            installment_amount: 3500,
            installment_interval_months: 6,
            reminder_days: 14,
            payment_threshold: 8000,
        };
        
        PaymentSettingsService::update_payment_settings(&db, update_request)
            .expect("Failed to update settings");
        
        // Reset to defaults
        PaymentSettingsService::reset_to_defaults(&db)
            .expect("Failed to reset to defaults");
        
        // Verify defaults are restored
        let settings = PaymentSettingsService::get_payment_settings(&db)
            .expect("Failed to get settings after reset");
        
        assert_eq!(settings.one_time_amount, 6000);
        assert_eq!(settings.monthly_amount, 850);
        assert_eq!(settings.installment_amount, 2850);
        assert_eq!(settings.installment_interval_months, 3);
        assert_eq!(settings.reminder_days, 7);
        assert_eq!(settings.payment_threshold, 6000);
    }
}