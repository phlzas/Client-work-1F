use crate::attendance_service::AttendanceService;
use crate::database::{Database, DatabaseResult};
use chrono::{DateTime, Datelike, Local, NaiveDate, Utc};
use csv::Writer;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceExportRecord {
    pub student_id: String,
    pub student_name: String,
    pub group_name: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSummaryExportRecord {
    pub student_id: String,
    pub student_name: String,
    pub group_name: String,
    pub payment_plan: String,
    pub plan_amount: i32,
    pub paid_amount: i32,
    pub payment_status: String,
    pub next_due_date: Option<String>,
    pub enrollment_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentHistoryExportRecord {
    pub student_id: String,
    pub student_name: String,
    pub group_name: String,
    pub payment_amount: i32,
    pub payment_date: String,
    pub payment_method: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverdueStudentExportRecord {
    pub student_id: String,
    pub student_name: String,
    pub group_name: String,
    pub payment_plan: String,
    pub plan_amount: i32,
    pub paid_amount: i32,
    pub amount_due: i32,
    pub next_due_date: Option<String>,
    pub days_overdue: i32,
    pub enrollment_date: String,
}

pub struct ExportService;

impl ExportService {
    /// Export attendance records to CSV file
    pub fn export_attendance_csv(
        db: &Database,
        file_path: &str,
        start_date: Option<&str>,
        end_date: Option<&str>,
        group_name: Option<&str>,
    ) -> DatabaseResult<()> {
        // Validate file path
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(crate::database::DatabaseError::Migration(format!(
                    "Directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Create CSV writer
        let file = File::create(file_path).map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to create file: {}", e))
        })?;
        let mut writer = Writer::from_writer(file);

        // Write CSV headers in Arabic
        writer
            .write_record(&[
                "رقم الطالب",
                "اسم الطالب",
                "المجموعة",
                "التاريخ",
                "وقت التسجيل",
            ])
            .map_err(|e| {
                crate::database::DatabaseError::Migration(format!(
                    "Failed to write CSV headers: {}",
                    e
                ))
            })?;

        // Build query with filters
        let mut query = "SELECT a.student_id, s.name, s.group_name, a.date, a.created_at 
                        FROM attendance a 
                        JOIN students s ON a.student_id = s.id"
            .to_string();
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        if let Some(start) = start_date {
            AttendanceService::validate_date_format(start)?;
            conditions.push("a.date >= ?".to_string());
            params_vec.push(start.to_string());
        }

        if let Some(end) = end_date {
            AttendanceService::validate_date_format(end)?;
            conditions.push("a.date <= ?".to_string());
            params_vec.push(end.to_string());
        }

        if let Some(group) = group_name {
            conditions.push("s.group_name = ?".to_string());
            params_vec.push(group.to_string());
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        query.push_str(" ORDER BY a.date DESC, s.name ASC");

        // Execute query and write records
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
                Ok(AttendanceExportRecord {
                    student_id: row.get(0)?,
                    student_name: row.get(1)?,
                    group_name: row.get(2)?,
                    date: row.get(3)?,
                    created_at: row
                        .get::<_, DateTime<Utc>>(4)?
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string(),
                })
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        for record_result in attendance_iter {
            let record = record_result.map_err(|e| crate::database::DatabaseError::Sqlite(e))?;
            writer
                .write_record(&[
                    &record.student_id,
                    &record.student_name,
                    &record.group_name,
                    &record.date,
                    &record.created_at,
                ])
                .map_err(|e| {
                    crate::database::DatabaseError::Migration(format!(
                        "Failed to write CSV record: {}",
                        e
                    ))
                })?;
        }

        writer.flush().map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to flush CSV writer: {}", e))
        })?;

        log::info!("Exported attendance records to: {}", file_path);
        Ok(())
    }

    /// Export payment summary to CSV file
    pub fn export_payment_summary_csv(
        db: &Database,
        file_path: &str,
        group_name: Option<&str>,
    ) -> DatabaseResult<()> {
        // Validate file path
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(crate::database::DatabaseError::Migration(format!(
                    "Directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Create CSV writer
        let file = File::create(file_path).map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to create file: {}", e))
        })?;
        let mut writer = Writer::from_writer(file);

        // Write CSV headers in Arabic
        writer
            .write_record(&[
                "رقم الطالب",
                "اسم الطالب",
                "المجموعة",
                "خطة الدفع",
                "مبلغ الخطة",
                "المبلغ المدفوع",
                "حالة الدفع",
                "تاريخ الاستحقاق التالي",
                "تاريخ التسجيل",
            ])
            .map_err(|e| {
                crate::database::DatabaseError::Migration(format!(
                    "Failed to write CSV headers: {}",
                    e
                ))
            })?;

        // Build query with group filter
        let mut query = "SELECT id, name, group_name, payment_plan, plan_amount, paid_amount, 
                               payment_status, next_due_date, enrollment_date 
                        FROM students WHERE deleted_at IS NULL"
            .to_string();
        let mut params_vec = Vec::new();

        if let Some(group) = group_name {
            query.push_str(" AND group_name = ?");
            params_vec.push(group.to_string());
        }

        query.push_str(" ORDER BY group_name ASC, name ASC");

        // Execute query and write records
        let mut stmt = db
            .connection()
            .prepare(&query)
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let students_iter = stmt
            .query_map(&params_refs[..], |row| {
                Ok(PaymentSummaryExportRecord {
                    student_id: row.get(0)?,
                    student_name: row.get(1)?,
                    group_name: row.get(2)?,
                    payment_plan: row.get(3)?,
                    plan_amount: row.get(4)?,
                    paid_amount: row.get(5)?,
                    payment_status: row.get(6)?,
                    next_due_date: row.get(7)?,
                    enrollment_date: row.get(8)?,
                })
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        for record_result in students_iter {
            let record = record_result.map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

            // Translate payment plan to Arabic
            let payment_plan_ar = match record.payment_plan.as_str() {
                "one-time" => "دفعة واحدة",
                "monthly" => "شهري",
                "installment" => "أقساط",
                _ => &record.payment_plan,
            };

            // Translate payment status to Arabic
            let payment_status_ar = match record.payment_status.as_str() {
                "paid" => "مدفوع",
                "pending" => "معلق",
                "overdue" => "متأخر",
                "due_soon" => "مستحق قريباً",
                _ => &record.payment_status,
            };

            writer
                .write_record(&[
                    &record.student_id,
                    &record.student_name,
                    &record.group_name,
                    payment_plan_ar,
                    &record.plan_amount.to_string(),
                    &record.paid_amount.to_string(),
                    payment_status_ar,
                    &record.next_due_date.unwrap_or_default(),
                    &record.enrollment_date,
                ])
                .map_err(|e| {
                    crate::database::DatabaseError::Migration(format!(
                        "Failed to write CSV record: {}",
                        e
                    ))
                })?;
        }

        writer.flush().map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to flush CSV writer: {}", e))
        })?;

        log::info!("Exported payment summary to: {}", file_path);
        Ok(())
    }

    /// Export payment transaction history to CSV file
    pub fn export_payment_history_csv(
        db: &Database,
        file_path: &str,
        student_id: Option<&str>,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> DatabaseResult<()> {
        // Validate file path
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(crate::database::DatabaseError::Migration(format!(
                    "Directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Create CSV writer
        let file = File::create(file_path).map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to create file: {}", e))
        })?;
        let mut writer = Writer::from_writer(file);

        // Write CSV headers in Arabic
        writer
            .write_record(&[
                "رقم الطالب",
                "اسم الطالب",
                "المجموعة",
                "مبلغ الدفع",
                "تاريخ الدفع",
                "طريقة الدفع",
                "ملاحظات",
                "وقت التسجيل",
            ])
            .map_err(|e| {
                crate::database::DatabaseError::Migration(format!(
                    "Failed to write CSV headers: {}",
                    e
                ))
            })?;

        // Build query with filters
        let mut query = "SELECT pt.student_id, s.name, s.group_name, pt.amount, pt.payment_date, 
                               pt.payment_method, pt.notes, pt.created_at
                        FROM payment_transactions pt 
                        JOIN students s ON pt.student_id = s.id"
            .to_string();
        let mut conditions = Vec::new();
        let mut params_vec = Vec::new();

        if let Some(student) = student_id {
            conditions.push("pt.student_id = ?".to_string());
            params_vec.push(student.to_string());
        }

        if let Some(start) = start_date {
            AttendanceService::validate_date_format(start)?;
            conditions.push("pt.payment_date >= ?".to_string());
            params_vec.push(start.to_string());
        }

        if let Some(end) = end_date {
            AttendanceService::validate_date_format(end)?;
            conditions.push("pt.payment_date <= ?".to_string());
            params_vec.push(end.to_string());
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        query.push_str(" ORDER BY pt.payment_date DESC, s.name ASC");

        // Execute query and write records
        let mut stmt = db
            .connection()
            .prepare(&query)
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let payment_iter = stmt
            .query_map(&params_refs[..], |row| {
                Ok(PaymentHistoryExportRecord {
                    student_id: row.get(0)?,
                    student_name: row.get(1)?,
                    group_name: row.get(2)?,
                    payment_amount: row.get(3)?,
                    payment_date: row.get(4)?,
                    payment_method: row.get(5)?,
                    notes: row.get(6)?,
                    created_at: row
                        .get::<_, DateTime<Utc>>(7)?
                        .format("%Y-%m-%d %H:%M:%S")
                        .to_string(),
                })
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        for record_result in payment_iter {
            let record = record_result.map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

            // Translate payment method to Arabic
            let payment_method_ar = match record.payment_method.as_str() {
                "cash" => "نقدي",
                "bank_transfer" => "تحويل بنكي",
                "check" => "شيك",
                _ => &record.payment_method,
            };

            writer
                .write_record(&[
                    &record.student_id,
                    &record.student_name,
                    &record.group_name,
                    &record.payment_amount.to_string(),
                    &record.payment_date,
                    payment_method_ar,
                    &record.notes.unwrap_or_default(),
                    &record.created_at,
                ])
                .map_err(|e| {
                    crate::database::DatabaseError::Migration(format!(
                        "Failed to write CSV record: {}",
                        e
                    ))
                })?;
        }

        writer.flush().map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to flush CSV writer: {}", e))
        })?;

        log::info!("Exported payment history to: {}", file_path);
        Ok(())
    }

    /// Export overdue students report to CSV file
    pub fn export_overdue_students_csv(
        db: &Database,
        file_path: &str,
        group_name: Option<&str>,
    ) -> DatabaseResult<()> {
        // Validate file path
        let path = Path::new(file_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(crate::database::DatabaseError::Migration(format!(
                    "Directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Create CSV writer
        let file = File::create(file_path).map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to create file: {}", e))
        })?;
        let mut writer = Writer::from_writer(file);

        // Write CSV headers in Arabic
        writer
            .write_record(&[
                "رقم الطالب",
                "اسم الطالب",
                "المجموعة",
                "خطة الدفع",
                "مبلغ الخطة",
                "المبلغ المدفوع",
                "المبلغ المستحق",
                "تاريخ الاستحقاق التالي",
                "أيام التأخير",
                "تاريخ التسجيل",
            ])
            .map_err(|e| {
                crate::database::DatabaseError::Migration(format!(
                    "Failed to write CSV headers: {}",
                    e
                ))
            })?;

        // Build query to get overdue students
        let mut query = "SELECT id, name, group_name, payment_plan, plan_amount, paid_amount, 
                               payment_status, next_due_date, enrollment_date 
                        FROM students 
                        WHERE payment_status = 'overdue'"
            .to_string();
        let mut params_vec = Vec::new();

        if let Some(group) = group_name {
            query.push_str(" AND group_name = ?");
            params_vec.push(group.to_string());
        }

        query.push_str(" ORDER BY next_due_date ASC, name ASC");

        // Execute query and write records
        let mut stmt = db
            .connection()
            .prepare(&query)
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec
            .iter()
            .map(|p| p as &dyn rusqlite::ToSql)
            .collect();

        let students_iter = stmt
            .query_map(&params_refs[..], |row| {
                let next_due_date: Option<String> = row.get(7)?;
                let enrollment_date: String = row.get(8)?;

                // Calculate days overdue
                let days_overdue = if let Some(due_date) = &next_due_date {
                    Self::calculate_days_overdue(due_date).unwrap_or(0)
                } else {
                    0
                };

                // Calculate amount due based on payment plan
                let payment_plan: String = row.get(3)?;
                let plan_amount: i32 = row.get(4)?;
                let paid_amount: i32 = row.get(5)?;

                let amount_due = match payment_plan.as_str() {
                    "one-time" => plan_amount - paid_amount,
                    "monthly" => {
                        // For monthly plans, calculate based on months since enrollment
                        let months_since_enrollment =
                            Self::calculate_months_since_enrollment(&enrollment_date).unwrap_or(1);
                        (months_since_enrollment * plan_amount) - paid_amount
                    }
                    "installment" => {
                        // For installment plans, calculate based on installments due
                        plan_amount - paid_amount
                    }
                    _ => plan_amount - paid_amount,
                };

                Ok(OverdueStudentExportRecord {
                    student_id: row.get(0)?,
                    student_name: row.get(1)?,
                    group_name: row.get(2)?,
                    payment_plan,
                    plan_amount,
                    paid_amount,
                    amount_due: amount_due.max(0),
                    next_due_date,
                    days_overdue,
                    enrollment_date,
                })
            })
            .map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

        for record_result in students_iter {
            let record = record_result.map_err(|e| crate::database::DatabaseError::Sqlite(e))?;

            // Translate payment plan to Arabic
            let payment_plan_ar = match record.payment_plan.as_str() {
                "one-time" => "دفعة واحدة",
                "monthly" => "شهري",
                "installment" => "أقساط",
                _ => &record.payment_plan,
            };

            writer
                .write_record(&[
                    &record.student_id,
                    &record.student_name,
                    &record.group_name,
                    payment_plan_ar,
                    &record.plan_amount.to_string(),
                    &record.paid_amount.to_string(),
                    &record.amount_due.to_string(),
                    &record.next_due_date.unwrap_or_default(),
                    &record.days_overdue.to_string(),
                    &record.enrollment_date,
                ])
                .map_err(|e| {
                    crate::database::DatabaseError::Migration(format!(
                        "Failed to write CSV record: {}",
                        e
                    ))
                })?;
        }

        writer.flush().map_err(|e| {
            crate::database::DatabaseError::Migration(format!("Failed to flush CSV writer: {}", e))
        })?;

        log::info!("Exported overdue students report to: {}", file_path);
        Ok(())
    }

    /// Calculate days overdue from a due date
    fn calculate_days_overdue(due_date: &str) -> DatabaseResult<i32> {
        let due = NaiveDate::parse_from_str(due_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid due date format: {}",
                due_date
            ))
        })?;

        let today = Local::now().date_naive();
        let duration = today.signed_duration_since(due);
        Ok(duration.num_days().max(0) as i32)
    }

    /// Calculate months since enrollment
    fn calculate_months_since_enrollment(enrollment_date: &str) -> DatabaseResult<i32> {
        let enrollment = NaiveDate::parse_from_str(enrollment_date, "%Y-%m-%d").map_err(|_| {
            crate::database::DatabaseError::Migration(format!(
                "Invalid enrollment date format: {}",
                enrollment_date
            ))
        })?;

        let today = Local::now().date_naive();
        let years_diff = today.year() - enrollment.year();
        let months_diff = today.month() as i32 - enrollment.month() as i32;
        Ok((years_diff * 12 + months_diff).max(1))
    }

    /// Validate that the file path is writable
    pub fn validate_export_path(file_path: &str) -> DatabaseResult<()> {
        let path = Path::new(file_path);

        // Check if parent directory exists
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err(crate::database::DatabaseError::Migration(format!(
                    "Directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        // Check if we can create/write to the file
        match File::create(file_path) {
            Ok(_) => {
                // Remove the test file
                let _ = std::fs::remove_file(file_path);
                Ok(())
            }
            Err(e) => Err(crate::database::DatabaseError::Migration(format!(
                "Cannot write to file {}: {}",
                file_path, e
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::attendance_service::AttendanceService;
    use crate::database::Database;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db =
            Database::new(temp_dir.path().to_path_buf()).expect("Failed to create test database");
        (db, temp_dir)
    }

    fn create_test_student(db: &Database, _id: &str, name: &str, group: &str) {
        // Insert student directly for testing
        let _ = db.connection().execute(
            "INSERT INTO students (id, name, group_name, payment_plan, plan_amount, paid_amount, enrollment_date) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![_id, name, group, "one-time", 6000, 0, "2024-01-01"],
        );
    }

    #[test]
    fn test_export_attendance_csv() {
        let (db, temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student 1", "Group A");
        create_test_student(&db, "student2", "Test Student 2", "Group B");

        // Mark some attendance
        let _ = AttendanceService::mark_attendance(&db, "student1", "2024-01-15");
        let _ = AttendanceService::mark_attendance(&db, "student2", "2024-01-16");

        // Export to CSV
        let export_path = temp_dir.path().join("attendance_export.csv");
        let result = ExportService::export_attendance_csv(
            &db,
            export_path.to_str().unwrap(),
            None,
            None,
            None,
        );

        assert!(result.is_ok());
        assert!(export_path.exists());

        // Verify file content
        let content = fs::read_to_string(&export_path).unwrap();
        assert!(content.contains("رقم الطالب"));
        assert!(content.contains("Test Student 1"));
        assert!(content.contains("Test Student 2"));
    }

    #[test]
    fn test_export_payment_summary_csv() {
        let (db, temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student 1", "Group A");
        create_test_student(&db, "student2", "Test Student 2", "Group B");

        // Export to CSV
        let export_path = temp_dir.path().join("payment_summary_export.csv");
        let result =
            ExportService::export_payment_summary_csv(&db, export_path.to_str().unwrap(), None);

        assert!(result.is_ok());
        assert!(export_path.exists());

        // Verify file content
        let content = fs::read_to_string(&export_path).unwrap();
        assert!(content.contains("رقم الطالب"));
        assert!(content.contains("Test Student 1"));
        assert!(content.contains("دفعة واحدة")); // Arabic translation for "one-time"
    }

    #[test]
    fn test_export_with_group_filter() {
        let (db, temp_dir) = setup_test_db();
        create_test_student(&db, "student1", "Test Student 1", "Group A");
        create_test_student(&db, "student2", "Test Student 2", "Group B");

        // Export only Group A
        let export_path = temp_dir.path().join("group_a_export.csv");
        let result = ExportService::export_payment_summary_csv(
            &db,
            export_path.to_str().unwrap(),
            Some("Group A"),
        );

        assert!(result.is_ok());
        assert!(export_path.exists());

        // Verify file content contains only Group A
        let content = fs::read_to_string(&export_path).unwrap();
        assert!(content.contains("Test Student 1"));
        assert!(!content.contains("Test Student 2"));
    }

    #[test]
    fn test_validate_export_path() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let valid_path = temp_dir.path().join("test.csv");

        // Valid path should pass
        let result = ExportService::validate_export_path(valid_path.to_str().unwrap());
        assert!(result.is_ok());

        // Invalid path should fail
        let invalid_path = "/nonexistent/directory/test.csv";
        let result = ExportService::validate_export_path(invalid_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_days_overdue() {
        // Test with a past date
        let result = ExportService::calculate_days_overdue("2024-01-01");
        assert!(result.is_ok());
        assert!(result.unwrap() > 0);

        // Test with invalid date format
        let result = ExportService::calculate_days_overdue("invalid-date");
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_months_since_enrollment() {
        // Test with a past date
        let result = ExportService::calculate_months_since_enrollment("2024-01-01");
        assert!(result.is_ok());
        assert!(result.unwrap() >= 1);

        // Test with invalid date format
        let result = ExportService::calculate_months_since_enrollment("invalid-date");
        assert!(result.is_err());
    }
}
