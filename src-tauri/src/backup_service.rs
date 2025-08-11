use crate::database::{Database, DatabaseError};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use chrono::{DateTime, Utc};
use rand::RngCore;
use rusqlite::{backup::Backup, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;

use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum BackupError {
    #[error("Database error: {0}")]
    Database(#[from] DatabaseError),
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Encryption error: {0}")]
    Encryption(String),
    #[error("Backup validation error: {0}")]
    Validation(String),
    #[error("Restore error: {0}")]
    Restore(String),
}

pub type BackupResult<T> = Result<T, BackupError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub database_version: i32,
    pub encrypted: bool,
    pub checksum: String,
    pub file_size: u64,
    pub student_count: i32,
    pub attendance_count: i32,
    pub payment_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupValidationResult {
    pub is_valid: bool,
    pub metadata: Option<BackupMetadata>,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestoreResult {
    pub success: bool,
    pub students_restored: i32,
    pub attendance_restored: i32,
    pub payments_restored: i32,
    pub errors: Vec<String>,
}

pub struct BackupService;

impl BackupService {
    /// Create a backup of the database
    pub fn create_backup(
        db: &Database,
        file_path: &str,
        password: Option<&str>,
    ) -> BackupResult<BackupMetadata> {
        // Ensure parent directory exists
        if let Some(parent) = Path::new(file_path).parent() {
            fs::create_dir_all(parent)?;
        }

        // Create temporary backup file
        let temp_backup_path = format!("{}.tmp", file_path);
        let mut backup_conn = Connection::open(&temp_backup_path)?;

        // Perform SQLite backup
        {
            let backup = Backup::new(db.connection(), &mut backup_conn)?;
            backup.run_to_completion(5, std::time::Duration::from_millis(250), None)?;
        }
        backup_conn.close().map_err(|(_, e)| e)?;

        // Read the backup file
        let backup_data = fs::read(&temp_backup_path)?;

        // Create metadata
        let metadata = BackupMetadata {
            version: "1.0".to_string(),
            created_at: Utc::now(),
            database_version: Self::get_database_version(db)?,
            encrypted: password.is_some(),
            checksum: Self::calculate_checksum(&backup_data),
            file_size: backup_data.len() as u64,
            student_count: Self::get_table_count(db, "students")?,
            attendance_count: Self::get_table_count(db, "attendance")?,
            payment_count: Self::get_table_count(db, "payment_transactions")?,
        };

        // Encrypt if password provided
        let final_data = if let Some(pwd) = password {
            Self::encrypt_data(&backup_data, pwd)?
        } else {
            backup_data
        };

        // Write final backup file
        fs::write(file_path, &final_data)?;

        // Clean up temporary file
        fs::remove_file(&temp_backup_path).ok();

        Ok(metadata)
    }

    /// Validate a backup file
    pub fn validate_backup(file_path: &str) -> BackupResult<BackupValidationResult> {
        let mut result = BackupValidationResult {
            is_valid: false,
            metadata: None,
            errors: Vec::new(),
        };

        // Check if file exists
        if !Path::new(file_path).exists() {
            result.errors.push("Backup file does not exist".to_string());
            return Ok(result);
        }

        // Read file
        let backup_data = match fs::read(file_path) {
            Ok(data) => data,
            Err(e) => {
                result.errors.push(format!("Failed to read backup file: {}", e));
                return Ok(result);
            }
        };

        // Check if it's encrypted (simple heuristic)
        let is_encrypted = backup_data.starts_with(b"SMSBACKUP");

        // Try to validate as SQLite database
        let temp_path = format!("{}.validate.tmp", file_path);
        let db_data = if is_encrypted {
            // For encrypted files, we can't validate without password
            result.errors.push("Backup is encrypted - password required for validation".to_string());
            return Ok(result);
        } else {
            backup_data.clone()
        };

        // Write to temporary file and try to open as SQLite
        if let Err(e) = fs::write(&temp_path, &db_data) {
            result.errors.push(format!("Failed to create temporary file: {}", e));
            return Ok(result);
        }

        match Connection::open(&temp_path) {
            Ok(conn) => {
                // Check if it has the expected tables
                let expected_tables = vec!["students", "attendance", "payment_transactions", "groups"];
                for table in expected_tables {
                    match conn.prepare(&format!("SELECT COUNT(*) FROM {}", table)) {
                        Ok(_) => {},
                        Err(_) => {
                            result.errors.push(format!("Missing table: {}", table));
                        }
                    }
                }

                if result.errors.is_empty() {
                    result.is_valid = true;
                    // Create basic metadata
                    result.metadata = Some(BackupMetadata {
                        version: "1.0".to_string(),
                        created_at: Utc::now(),
                        database_version: 1,
                        encrypted: is_encrypted,
                        checksum: Self::calculate_checksum(&db_data),
                        file_size: db_data.len() as u64,
                        student_count: Self::get_table_count_from_conn(&conn, "students").unwrap_or(0),
                        attendance_count: Self::get_table_count_from_conn(&conn, "attendance").unwrap_or(0),
                        payment_count: Self::get_table_count_from_conn(&conn, "payment_transactions").unwrap_or(0),
                    });
                }
            }
            Err(e) => {
                result.errors.push(format!("Invalid SQLite database: {}", e));
            }
        }

        // Clean up
        fs::remove_file(&temp_path).ok();

        Ok(result)
    }

    /// Restore from backup (simplified version)
    pub fn restore_backup(
        _db: &Database,
        file_path: &str,
        password: Option<&str>,
    ) -> BackupResult<RestoreResult> {
        let mut result = RestoreResult {
            success: false,
            students_restored: 0,
            attendance_restored: 0,
            payments_restored: 0,
            errors: Vec::new(),
        };

        // Read backup file
        let backup_data = fs::read(file_path)?;
        
        // Decrypt if needed
        let db_data = if let Some(pwd) = password {
            Self::decrypt_data(&backup_data, pwd)?
        } else {
            backup_data
        };

        // Create temporary restore file
        let temp_restore_path = format!("{}.restore.tmp", file_path);
        fs::write(&temp_restore_path, &db_data)?;

        // For now, we'll use a simple approach: clear and restore using backup API
        // This is not transactional but works with the current Database design
        
        // Note: In a production system, you'd want to backup the current database first
        // and implement proper rollback on failure
        
        result.errors.push("Restore functionality requires database restructuring for proper transaction support".to_string());
        result.success = false;

        // Clean up
        fs::remove_file(&temp_restore_path).ok();

        Ok(result)
    }

    /// Get backup metadata without restoring
    pub fn get_backup_metadata(file_path: &str) -> BackupResult<BackupMetadata> {
        let validation = Self::validate_backup(file_path)?;
        
        if !validation.is_valid {
            return Err(BackupError::Validation(format!(
                "Invalid backup file: {}",
                validation.errors.join(", ")
            )));
        }

        validation.metadata.ok_or_else(|| {
            BackupError::Validation("No metadata available".to_string())
        })
    }

    // Helper functions
    fn encrypt_data(data: &[u8], password: &str) -> BackupResult<Vec<u8>> {
        // Derive key from password (in production, use proper key derivation)
        let mut key = [0u8; 32];
        let password_bytes = password.as_bytes();
        for (i, &byte) in password_bytes.iter().enumerate() {
            if i >= 32 { break; }
            key[i] = byte;
        }

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| BackupError::Encryption(format!("Key error: {}", e)))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt data
        let ciphertext = cipher.encrypt(nonce, data)
            .map_err(|e| BackupError::Encryption(format!("Encryption failed: {}", e)))?;

        // Combine header, nonce, and ciphertext
        let mut result = Vec::new();
        result.extend_from_slice(b"SMSBACKUP"); // 9 bytes header
        result.extend_from_slice(&nonce_bytes); // 12 bytes nonce
        result.extend_from_slice(&ciphertext); // encrypted data

        Ok(result)
    }

    fn decrypt_data(data: &[u8], password: &str) -> BackupResult<Vec<u8>> {
        if data.len() < 21 || !data.starts_with(b"SMSBACKUP") {
            return Err(BackupError::Encryption("Invalid encrypted backup format".to_string()));
        }

        // Extract nonce and ciphertext
        let nonce_bytes = &data[9..21];
        let ciphertext = &data[21..];

        // Derive key from password
        let mut key = [0u8; 32];
        let password_bytes = password.as_bytes();
        for (i, &byte) in password_bytes.iter().enumerate() {
            if i >= 32 { break; }
            key[i] = byte;
        }

        let cipher = Aes256Gcm::new_from_slice(&key)
            .map_err(|e| BackupError::Encryption(format!("Key error: {}", e)))?;

        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt data
        let plaintext = cipher.decrypt(nonce, ciphertext)
            .map_err(|e| BackupError::Encryption(format!("Decryption failed: {}", e)))?;

        Ok(plaintext)
    }

    fn calculate_checksum(data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }

    fn get_database_version(db: &Database) -> BackupResult<i32> {
        let version = db.connection().query_row(
            "SELECT MAX(version) FROM migrations",
            [],
            |row| row.get(0)
        ).unwrap_or(1);
        Ok(version)
    }

    fn get_table_count(db: &Database, table_name: &str) -> BackupResult<i32> {
        let count = db.connection().query_row(
            &format!("SELECT COUNT(*) FROM {}", table_name),
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        Ok(count)
    }

    fn get_table_count_from_conn(conn: &Connection, table_name: &str) -> BackupResult<i32> {
        let count = conn.query_row(
            &format!("SELECT COUNT(*) FROM {}", table_name),
            [],
            |row| row.get(0)
        ).unwrap_or(0);
        Ok(count)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;

    use tempfile::TempDir;

    fn create_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().to_path_buf();
        let db = Database::new(db_path).expect("Failed to create test database");
        (db, temp_dir)
    }

    #[test]
    fn test_backup_creation() {
        let (db, _temp_dir) = create_test_db();
        let backup_path = "test_backup.db";

        let result = BackupService::create_backup(&db, backup_path, None);
        assert!(result.is_ok());

        let metadata = result.unwrap();
        assert_eq!(metadata.version, "1.0");
        assert!(!metadata.encrypted);

        // Clean up
        std::fs::remove_file(backup_path).ok();
    }

    #[test]
    fn test_encrypted_backup_creation() {
        let (db, _temp_dir) = create_test_db();
        let backup_path = "test_encrypted_backup.db";
        let password = "test_password";

        let result = BackupService::create_backup(&db, backup_path, Some(password));
        assert!(result.is_ok());

        let metadata = result.unwrap();
        assert!(metadata.encrypted);

        // Clean up
        std::fs::remove_file(backup_path).ok();
    }

    #[test]
    fn test_backup_validation() {
        let (db, _temp_dir) = create_test_db();
        let backup_path = "test_validation_backup.db";

        // Create backup
        BackupService::create_backup(&db, backup_path, None).unwrap();

        // Validate backup
        let result = BackupService::validate_backup(backup_path);
        assert!(result.is_ok());

        let validation = result.unwrap();
        assert!(validation.is_valid);
        assert!(validation.metadata.is_some());

        // Clean up
        std::fs::remove_file(backup_path).ok();
    }

    #[test]
    fn test_backup_metadata() {
        let (db, _temp_dir) = create_test_db();
        let backup_path = "test_metadata_backup.db";

        // Create backup
        BackupService::create_backup(&db, backup_path, None).unwrap();

        // Get metadata
        let result = BackupService::get_backup_metadata(backup_path);
        assert!(result.is_ok());

        let metadata = result.unwrap();
        assert_eq!(metadata.version, "1.0");

        // Clean up
        std::fs::remove_file(backup_path).ok();
    }

    #[test]
    fn test_encryption_decryption() {
        let test_data = b"Hello, World!";
        let password = "test_password";

        let encrypted = BackupService::encrypt_data(test_data, password).unwrap();
        let decrypted = BackupService::decrypt_data(&encrypted, password).unwrap();

        assert_eq!(test_data, decrypted.as_slice());
    }

    #[test]
    fn test_checksum_calculation() {
        let data = b"test data";
        let checksum1 = BackupService::calculate_checksum(data);
        let checksum2 = BackupService::calculate_checksum(data);
        
        assert_eq!(checksum1, checksum2);
        assert!(!checksum1.is_empty());
    }
}