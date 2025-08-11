use crate::{
    audit_service::AuditService,
    database::{Database, DatabaseError, DatabaseResult},
    scanner_lock::ScannerLock,
};
use chrono::{DateTime, Local, NaiveDate, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: i32,
    pub student_id: String,
    pub date: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceStats {
    pub total_days: i32,
    pub present_days: i32,
    pub attendance_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyAttendanceSummary {
    pub date: String,
    pub total_students: i32,
    pub present_students: i32,
    pub attendance_rate: f64,
    pub present_student_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceHistoryFilter {
    pub student_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub group_name: Option<String>,
}

pub struct AttendanceService;

impl AttendanceService {
    /// Mark attendance for a student on a specific date
    /// Prevents duplicate entries for the same student on the same date
    /// Uses a transaction and scanner lock to ensure data consistency
    pub fn mark_attendance(
        db: &mut Database,
        student_id: &str,
        date: &str,
    ) -> Result<AttendanceRecord, DatabaseError> {
        // Validate date format
        if let Err(e) = Self::validate_date_format(date) {
            return Err(e);
        }

        // Check if student exists before acquiring lock
        let student_exists: bool = db
            .connection()
            .query_row(
                "SELECT COUNT(*) > 0 FROM students WHERE id = ?1",
                params![student_id],
                |row| row.get(0),
            )
            .map_err(|e| DatabaseError::Sqlite(e))?;

        if !student_exists {
            AuditService::log_action(
                db,
                "INVALID_STUDENT_ID",
                "attendance",
                student_id,
                None,
                Some(&format!(
                    "{{\"date\": \"{}\", \"error\": \"student_not_found\"}}",
                    date
                )),
                None,
            )?;
            return Err(DatabaseError::Migration(format!(
                "Student with ID '{}' does not exist",
                student_id
            )));
        }

        // Check for existing attendance before acquiring lock
        let exists: bool = db
            .connection()
            .query_row(
                "SELECT COUNT(*) > 0 FROM attendance WHERE student_id = ? AND date = ?",
                params![student_id, date],
                |row| row.get(0),
            )
            .map_err(|e| DatabaseError::Sqlite(e))?;

        if exists {
            AuditService::log_action(
                db,
                "DUPLICATE_ATTENDANCE_ATTEMPT",
                "attendance",
                student_id,
                None,
                Some(&format!(
                    "{{\"date\": \"{}\", \"error\": \"duplicate\"}}",
                    date
                )),
                None,
            )?;
            return Err(DatabaseError::Migration(
                "Attendance already marked for this date".to_string(),
            ));
        }

        // Try to acquire scanner lock
        if ScannerLock::acquire_with_timeout(std::time::Duration::from_secs(5))
            .map_err(|e| DatabaseError::Connection(e))?
        {
            // Start transaction once we have the lock
            let tx = db.connection_mut().transaction()?;

            // Insert attendance record within transaction
            tx.execute(
                "INSERT INTO attendance (student_id, date, created_at) VALUES (?1, ?2, ?3)",
                params![student_id, date, Utc::now()],
            )
            .map_err(|e| {
                ScannerLock::record_error().ok();
                DatabaseError::Sqlite(e)
            })?;

            // Get the inserted record
            let record = tx.query_row(
                "SELECT id, student_id, date, created_at FROM attendance WHERE student_id = ?1 AND date = ?2",
                params![student_id, date],
                |row| Ok(AttendanceRecord {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    date: row.get(2)?,
                    created_at: row.get(3)?,
                }),
            )
            .map_err(|e| {
                ScannerLock::record_error().ok();
                DatabaseError::Sqlite(e)
            })?;

            // Commit transaction and release lock
            tx.commit()?;
            ScannerLock::release().ok();

            // Log successful attendance after transaction is committed
            AuditService::log_action(
                db,
                "MARK_ATTENDANCE",
                "attendance",
                &record.id.to_string(),
                None,
                Some(&format!(
                    "{{\"student_id\": \"{}\", \"date\": \"{}\"}}",
                    student_id, date
                )),
                None,
            )?;

            Ok(record)
        } else {
            Err(DatabaseError::Connection(
                "Failed to acquire scanner lock".to_string(),
            ))
        }
    }

    /// Validate date format (YYYY-MM-DD)
    pub fn validate_date_format(date: &str) -> Result<(), DatabaseError> {
        if let Err(_) = NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            return Err(DatabaseError::Migration(
                "Invalid date format. Use YYYY-MM-DD".to_string(),
            ));
        }
        Ok(())
    }
    /// Check if attendance is already recorded for a student today
    pub fn check_attendance_today(db: &Database, student_id: &str) -> DatabaseResult<bool> {
        let today = Self::get_current_date();
        Self::check_attendance_on_date(db, student_id, &today)
    }

    /// Check if attendance is recorded for a student on a specific date
    pub fn check_attendance_on_date(
        db: &Database,
        student_id: &str,
        date: &str,
    ) -> DatabaseResult<bool> {
        // Validate date format
        Self::validate_date_format(date)?;

        let count: i32 = db
            .connection()
            .query_row(
                "SELECT COUNT(*) FROM attendance WHERE student_id = ?1 AND date = ?2",
                params![student_id, date],
                |row| row.get(0),
            )
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        Ok(count > 0)
    }

    /// Get attendance history with optional filtering
    pub fn get_attendance_history(
        db: &Database,
        filter: Option<AttendanceHistoryFilter>,
    ) -> DatabaseResult<Vec<AttendanceRecord>> {
        let mut query = "SELECT id, student_id, date, created_at FROM attendance".to_string();
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        if let Some(filter) = filter {
            if let Some(student_id) = filter.student_id {
                conditions.push("student_id = ?".to_string());
                params_vec.push(student_id);
            }

            if let Some(start_date) = filter.start_date {
                Self::validate_date_format(&start_date)?;
                conditions.push("date >= ?".to_string());
                params_vec.push(start_date);
            }

            if let Some(end_date) = filter.end_date {
                Self::validate_date_format(&end_date)?;
                conditions.push("date <= ?".to_string());
                params_vec.push(end_date);
            }

            if let Some(group_name) = filter.group_name {
                conditions.push(
                    "student_id IN (SELECT id FROM students WHERE group_name = ?)".to_string(),
                );
                params_vec.push(group_name);
            }
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        query.push_str(" ORDER BY date DESC, created_at DESC");

        let mut stmt = db
            .connection()
            .prepare(&query)
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let attendance_iter = stmt
            .query_map(&params_refs[..], |row| {
                Ok(AttendanceRecord {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    date: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        attendance_iter
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))
    }

    /// Get attendance history for a specific student
    pub fn get_student_attendance_history(
        db: &Database,
        student_id: &str,
    ) -> DatabaseResult<Vec<AttendanceRecord>> {
        let filter = AttendanceHistoryFilter {
            student_id: Some(student_id.to_string()),
            start_date: None,
            end_date: None,
            group_name: None,
        };

        Self::get_attendance_history(db, Some(filter))
    }

    /// Get attendance statistics for a student
    pub fn get_student_attendance_stats(
        db: &Database,
        student_id: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> DatabaseResult<AttendanceStats> {
        let mut date_conditions = Vec::new();
        let mut params_vec = vec![student_id.to_string()];

        if let Some(start) = start_date {
            Self::validate_date_format(start)?;
            date_conditions.push("date >= ?");
            params_vec.push(start.to_string());
        }

        if let Some(end) = end_date {
            Self::validate_date_format(end)?;
            date_conditions.push("date <= ?");
            params_vec.push(end.to_string());
        }

        let date_filter = if date_conditions.is_empty() {
            String::new()
        } else {
            format!(" AND {}", date_conditions.join(" AND "))
        };

        // Get present days count
        let present_query = format!(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ?1{}",
            date_filter
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let present_days: i32 = db
            .connection()
            .query_row(&present_query, &params_refs[..], |row| row.get(0))
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        // Calculate total possible days (from enrollment date to end date or today)
        let enrollment_date: String = db
            .connection()
            .query_row(
                "SELECT enrollment_date FROM students WHERE id = ?1",
                params![student_id],
                |row| row.get(0),
            )
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let current_date = Self::get_current_date();
        let start_calc_date = if let Some(start) = start_date {
            if start > enrollment_date.as_str() {
                start
            } else {
                enrollment_date.as_str()
            }
        } else {
            enrollment_date.as_str()
        };

        let end_calc_date = end_date.unwrap_or(&current_date);

        let total_days = Self::calculate_days_between(start_calc_date, end_calc_date)?;
        let attendance_rate = if total_days > 0 {
            (present_days as f64 / total_days as f64) * 100.0
        } else {
            0.0
        };

        Ok(AttendanceStats {
            total_days,
            present_days,
            attendance_rate,
        })
    }

    /// Get daily attendance summary for a specific date
    pub fn get_daily_attendance_summary(
        db: &Database,
        date: &str,
        group_name: Option<&str>,
    ) -> DatabaseResult<DailyAttendanceSummary> {
        Self::validate_date_format(date)?;

        let mut group_filter = String::new();
        let mut params_vec = vec![date.to_string()];

        if let Some(group) = group_name {
            group_filter = " AND s.group_name = ?".to_string();
            params_vec.push(group.to_string());
        }

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        // Get total students count
        let total_query = format!("SELECT COUNT(*) FROM students s WHERE 1=1{}", group_filter);

        let total_students: i32 = if group_name.is_some() {
            db.connection()
                .query_row(&total_query, &params_refs[1..], |row| row.get(0))
                .map_err(|e| crate::database::DatabaseError::Sqlite(e))?
        } else {
            db.connection()
                .query_row("SELECT COUNT(*) FROM students", [], |row| row.get(0))
                .map_err(|e| crate::database::DatabaseError::Sqlite(e))?
        };

        // Get present students
        let present_query = format!(
            "SELECT COUNT(*), GROUP_CONCAT(a.student_id) 
             FROM attendance a 
             JOIN students s ON a.student_id = s.id 
             WHERE a.date = ?1{}",
            group_filter
        );

        let (present_students, present_ids_str): (i32, Option<String>) = db
            .connection()
            .query_row(&present_query, &params_refs[..], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let present_student_ids: Vec<String> = present_ids_str
            .unwrap_or_default()
            .split(',')
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();

        let attendance_rate = if total_students > 0 {
            (present_students as f64 / total_students as f64) * 100.0
        } else {
            0.0
        };

        Ok(DailyAttendanceSummary {
            date: date.to_string(),
            total_students,
            present_students,
            attendance_rate,
            present_student_ids,
        })
    }

    /// Get attendance summary for a date range
    pub fn get_attendance_summary_range(
        db: &Database,
        start_date: &str,
        end_date: &str,
        group_name: Option<&str>,
    ) -> DatabaseResult<Vec<DailyAttendanceSummary>> {
        Self::validate_date_format(start_date)?;
        Self::validate_date_format(end_date)?;

        let dates = Self::get_date_range(start_date, end_date)?;
        let mut summaries = Vec::new();

        for date in dates {
            let summary = Self::get_daily_attendance_summary(db, &date, group_name)?;
            summaries.push(summary);
        }

        Ok(summaries)
    }

    /// Delete attendance record (for corrections)
    pub fn delete_attendance(db: &Database, student_id: &str, date: &str) -> DatabaseResult<bool> {
        Self::validate_date_format(date)?;

        // Get the attendance record before deleting for audit log
        let attendance_record = db.connection().query_row(
            "SELECT id, student_id, date, created_at FROM attendance WHERE student_id = ?1 AND date = ?2",
            params![student_id, date],
            |row| {
                Ok(AttendanceRecord {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    date: row.get(2)?,
                    created_at: row.get(3)?,
                })
            }
        ).ok();

        let rows_affected = db
            .connection()
            .execute(
                "DELETE FROM attendance WHERE student_id = ?1 AND date = ?2",
                params![student_id, date],
            )
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        if rows_affected > 0 {
            // Log audit entry for attendance deletion
            if let Some(record) = attendance_record {
                if let Ok(serialized_data) = AuditService::serialize_data(&record) {
                    let _ = AuditService::log_delete(
                        db,
                        "attendance",
                        &record.id.to_string(),
                        &serialized_data,
                        None,
                    );
                }
            }

            log::info!(
                "Deleted attendance record for student '{}' on date '{}'",
                student_id,
                date
            );
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Get current date in YYYY-MM-DD format
    pub fn get_current_date() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    /// Validate date format (YYYY-MM-DD)
    pub fn validate_and_format_date(date: &str) -> Result<String, DatabaseError> {
        match NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            Ok(_) => Ok(date.to_string()),
            Err(_) => Err(DatabaseError::Migration(format!(
                "Invalid date format '{}'. Expected format: YYYY-MM-DD",
                date
            ))),
        }
    }

    /// Format date from various formats to YYYY-MM-DD
    pub fn format_date(date_str: &str) -> DatabaseResult<String> {
        // Try different date formats
        let formats: [&str; 5] = [
            "%Y-%m-%d", // 2024-01-15
            "%d/%m/%Y", // 15/01/2024
            "%m/%d/%Y", // 01/15/2024
            "%d-%m-%Y", // 15-01-2024
            "%Y/%m/%d", // 2024/01/15
        ];

        for format in &formats {
            if let Ok(date) = NaiveDate::parse_from_str(date_str, format) {
                return Ok(date.format("%Y-%m-%d").to_string());
            }
        }

        Err(crate::database::DatabaseError::Migration(
            format!("Unable to parse date '{}'. Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, YYYY/MM/DD", date_str)
        ))
    }

    /// Calculate number of days between two dates
    fn calculate_days_between(start_date: &str, end_date: &str) -> DatabaseResult<i32> {
        let start = NaiveDate::parse_from_str(start_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid start date format: {}",
                start_date
            ))
        })?;

        let end = NaiveDate::parse_from_str(end_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid end date format: {}",
                end_date
            ))
        })?;

        let duration = end.signed_duration_since(start);
        Ok(duration.num_days() as i32 + 1) // +1 to include both start and end dates
    }

    /// Generate a list of dates between start and end date (inclusive)
    fn get_date_range(start_date: &str, end_date: &str) -> DatabaseResult<Vec<String>> {
        let start = NaiveDate::parse_from_str(start_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid start date format: {}",
                start_date
            ))
        })?;

        let end = NaiveDate::parse_from_str(end_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid end date format: {}",
                end_date
            ))
        })?;

        let mut dates = Vec::new();
        let mut current = start;

        while current <= end {
            dates.push(current.format("%Y-%m-%d").to_string());
            current = current.succ_opt().ok_or_else(|| {
                crate::database::DatabaseError::Migration("Date overflow".to_string())
            })?;
        }

        Ok(dates)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db =
            Database::new(temp_dir.path().to_path_buf()).expect("Failed to create test database");
        (db, temp_dir)
    }

    fn create_test_student(db: &Database, id: &str, name: &str, group: &str) {
        db.connection().execute(
            "INSERT INTO students (id, name, group_name, enrollment_date) VALUES (?1, ?2, ?3, ?4)",
            params![id, name, group, "2024-01-01"],
        ).expect("Failed to create test student");
    }

    #[test]
    fn test_mark_attendance_success() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");

        let result = AttendanceService::mark_attendance(&db, "student1", "2024-01-15");
        assert!(result.is_ok());

        let record = result.unwrap();
        assert_eq!(record.student_id, "student1");
        assert_eq!(record.date, "2024-01-15");
    }

    #[test]
    fn test_mark_attendance_duplicate_prevention() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");

        // First attendance should succeed
        let result1 = AttendanceService::mark_attendance(&db, "student1", "2024-01-15");
        assert!(result1.is_ok());

        // Second attendance on same date should fail
        let result2 = AttendanceService::mark_attendance(&db, "student1", "2024-01-15");
        assert!(result2.is_err());
        assert!(result2
            .unwrap_err()
            .to_string()
            .contains("already recorded"));
    }

    #[test]
    fn test_mark_attendance_nonexistent_student() {
        let (db, _temp_dir) = setup_test_db();

        let result = AttendanceService::mark_attendance(&db, "nonexistent", "2024-01-15");
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("does not exist"));
    }

    #[test]
    fn test_check_attendance_today() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");

        let today = AttendanceService::get_current_date();

        // Initially no attendance
        let result = AttendanceService::check_attendance_today(&db, "student1");
        assert!(result.is_ok());
        assert!(!result.unwrap());

        // Mark attendance for today
        AttendanceService::mark_attendance(&db, "student1", &today).unwrap();

        // Now should return true
        let result = AttendanceService::check_attendance_today(&db, "student1");
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_get_attendance_history() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");
        create_test_student(&db, "student2", "Test Student 2", "Group B");

        // Mark attendance for different dates
        AttendanceService::mark_attendance(&db, "student1", "2024-01-15").unwrap();
        AttendanceService::mark_attendance(&db, "student1", "2024-01-16").unwrap();
        AttendanceService::mark_attendance(&db, "student2", "2024-01-15").unwrap();

        // Get all attendance
        let all_attendance = AttendanceService::get_attendance_history(&db, None).unwrap();
        assert_eq!(all_attendance.len(), 3);

        // Get attendance for specific student
        let filter = AttendanceHistoryFilter {
            student_id: Some("student1".to_string()),
            start_date: None,
            end_date: None,
            group_name: None,
        };
        let student_attendance =
            AttendanceService::get_attendance_history(&db, Some(filter)).unwrap();
        assert_eq!(student_attendance.len(), 2);
        assert!(student_attendance
            .iter()
            .all(|a| a.student_id == "student1"));
    }

    #[test]
    fn test_get_student_attendance_stats() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");

        // Mark attendance for some days
        AttendanceService::mark_attendance(&db, "student1", "2024-01-15").unwrap();
        AttendanceService::mark_attendance(&db, "student1", "2024-01-16").unwrap();

        let stats = AttendanceService::get_student_attendance_stats(
            &db,
            "student1",
            Some("2024-01-15"),
            Some("2024-01-20"),
        )
        .unwrap();

        assert_eq!(stats.present_days, 2);
        assert_eq!(stats.total_days, 6); // 15, 16, 17, 18, 19, 20
        assert!((stats.attendance_rate - 33.33).abs() < 0.1);
    }

    #[test]
    fn test_date_validation() {
        // Valid dates
        assert!(AttendanceService::validate_date_format("2024-01-15").is_ok());
        assert!(AttendanceService::validate_date_format("2024-12-31").is_ok());

        // Invalid dates
        assert!(AttendanceService::validate_date_format("2024-13-01").is_err());
        assert!(AttendanceService::validate_date_format("2024/01/15").is_err());
        assert!(AttendanceService::validate_date_format("15-01-2024").is_err());
        assert!(AttendanceService::validate_date_format("invalid").is_err());
    }

    #[test]
    fn test_date_formatting() {
        // Test various input formats
        assert_eq!(
            AttendanceService::format_date("2024-01-15").unwrap(),
            "2024-01-15"
        );
        assert_eq!(
            AttendanceService::format_date("15/01/2024").unwrap(),
            "2024-01-15"
        );
        assert_eq!(
            AttendanceService::format_date("01/15/2024").unwrap(),
            "2024-01-15"
        );
        assert_eq!(
            AttendanceService::format_date("15-01-2024").unwrap(),
            "2024-01-15"
        );
        assert_eq!(
            AttendanceService::format_date("2024/01/15").unwrap(),
            "2024-01-15"
        );

        // Invalid format should fail
        assert!(AttendanceService::format_date("invalid-date").is_err());
    }

    #[test]
    fn test_daily_attendance_summary() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student 1", "Group A");
        create_test_student(&db, "student2", "Test Student 2", "Group A");
        create_test_student(&db, "student3", "Test Student 3", "Group B");

        // Mark attendance for some students
        AttendanceService::mark_attendance(&db, "student1", "2024-01-15").unwrap();
        AttendanceService::mark_attendance(&db, "student2", "2024-01-15").unwrap();

        let summary =
            AttendanceService::get_daily_attendance_summary(&db, "2024-01-15", None).unwrap();
        assert_eq!(summary.total_students, 3);
        assert_eq!(summary.present_students, 2);
        assert!((summary.attendance_rate - 66.67).abs() < 0.1);
        assert_eq!(summary.present_student_ids.len(), 2);

        // Test group filtering
        let group_summary =
            AttendanceService::get_daily_attendance_summary(&db, "2024-01-15", Some("Group A"))
                .unwrap();
        assert_eq!(group_summary.total_students, 2);
        assert_eq!(group_summary.present_students, 2);
        assert_eq!(group_summary.attendance_rate, 100.0);
    }

    #[test]
    fn test_delete_attendance() {
        let (db, _temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student", "Group A");

        // Mark attendance
        AttendanceService::mark_attendance(&db, "student1", "2024-01-15").unwrap();

        // Verify attendance exists
        assert!(
            AttendanceService::check_attendance_on_date(&db, "student1", "2024-01-15").unwrap()
        );

        // Delete attendance
        let deleted = AttendanceService::delete_attendance(&db, "student1", "2024-01-15").unwrap();
        assert!(deleted);

        // Verify attendance is gone
        assert!(
            !AttendanceService::check_attendance_on_date(&db, "student1", "2024-01-15").unwrap()
        );

        // Try to delete non-existent attendance
        let not_deleted =
            AttendanceService::delete_attendance(&db, "student1", "2024-01-15").unwrap();
        assert!(!not_deleted);
    }
}
