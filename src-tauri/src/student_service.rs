use crate::database::{Database, DatabaseError, DatabaseResult};
use chrono::{Utc, NaiveDate, Datelike};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub payment_plan: PaymentPlan,
    pub plan_amount: i32,
    pub installment_count: Option<i32>,
    pub paid_amount: i32,
    pub enrollment_date: String,
    pub next_due_date: Option<String>,
    pub payment_status: PaymentStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PaymentPlan {
    #[serde(rename = "one-time")]
    OneTime,
    #[serde(rename = "monthly")]
    Monthly,
    #[serde(rename = "installment")]
    Installment,
}

impl PaymentPlan {
    pub fn as_str(&self) -> &'static str {
        match self {
            PaymentPlan::OneTime => "one-time",
            PaymentPlan::Monthly => "monthly",
            PaymentPlan::Installment => "installment",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "one-time" => Ok(PaymentPlan::OneTime),
            "monthly" => Ok(PaymentPlan::Monthly),
            "installment" => Ok(PaymentPlan::Installment),
            _ => Err(format!("Invalid payment plan: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PaymentStatus {
    #[serde(rename = "paid")]
    Paid,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "overdue")]
    Overdue,
    #[serde(rename = "due_soon")]
    DueSoon,
}

impl PaymentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            PaymentStatus::Paid => "paid",
            PaymentStatus::Pending => "pending",
            PaymentStatus::Overdue => "overdue",
            PaymentStatus::DueSoon => "due_soon",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "paid" => Ok(PaymentStatus::Paid),
            "pending" => Ok(PaymentStatus::Pending),
            "overdue" => Ok(PaymentStatus::Overdue),
            "due_soon" => Ok(PaymentStatus::DueSoon),
            _ => Err(format!("Invalid payment status: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentWithAttendance {
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub payment_plan: PaymentPlan,
    pub plan_amount: i32,
    pub installment_count: Option<i32>,
    pub paid_amount: i32,
    pub enrollment_date: String,
    pub next_due_date: Option<String>,
    pub payment_status: PaymentStatus,
    pub attendance_log: Vec<AttendanceRecord>,
    pub payment_history: Vec<PaymentTransaction>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: i32,
    pub student_id: String,
    pub date: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentTransaction {
    pub id: i32,
    pub student_id: String,
    pub amount: i32,
    pub payment_date: String,
    pub payment_method: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStudentRequest {
    pub name: String,
    pub group_name: String,
    pub payment_plan: PaymentPlan,
    pub plan_amount: i32,
    pub installment_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStudentRequest {
    pub name: String,
    pub group_name: String,
    pub payment_plan: PaymentPlan,
    pub plan_amount: i32,
    pub installment_count: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPlanConfig {
    pub one_time_amount: i32,
    pub monthly_amount: i32,
    pub installment_amount: i32,
    pub installment_interval: i32,
    pub reminder_days: i32,
}

pub struct StudentService;

impl StudentService {
    /// Generate a unique student ID
    pub fn generate_student_id(db: &Database) -> DatabaseResult<String> {
        // Get the current maximum ID number
        let max_id_result: Result<Option<i32>, rusqlite::Error> = db.connection().query_row(
            "SELECT MAX(CAST(SUBSTR(id, 4) AS INTEGER)) FROM students WHERE id LIKE 'STU%'",
            [],
            |row| row.get(0),
        );

        let next_number = match max_id_result {
            Ok(Some(max_num)) => max_num + 1,
            Ok(None) => 1, // First student
            Err(rusqlite::Error::QueryReturnedNoRows) => 1,
            Err(e) => return Err(DatabaseError::Sqlite(e)),
        };

        Ok(format!("STU{:06}", next_number)) // STU000001, STU000002, etc.
    }

    /// Get payment plan configuration from settings
    pub fn get_payment_plan_config(db: &Database) -> DatabaseResult<PaymentPlanConfig> {
        let mut config = PaymentPlanConfig {
            one_time_amount: 6000,
            monthly_amount: 850,
            installment_amount: 2850,
            installment_interval: 3,
            reminder_days: 7,
        };

        // Load settings from database
        let settings_query = "SELECT key, value FROM settings WHERE key IN ('one_time_amount', 'monthly_amount', 'installment_amount', 'installment_interval', 'reminder_days')";
        let mut stmt = db.connection().prepare(settings_query)?;
        let settings_iter = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;

        for setting_result in settings_iter {
            let (key, value) = setting_result.map_err(DatabaseError::from)?;
            match key.as_str() {
                "one_time_amount" => {
                    config.one_time_amount = value.parse().unwrap_or(6000);
                }
                "monthly_amount" => {
                    config.monthly_amount = value.parse().unwrap_or(850);
                }
                "installment_amount" => {
                    config.installment_amount = value.parse().unwrap_or(2850);
                }
                "installment_interval" => {
                    config.installment_interval = value.parse().unwrap_or(3);
                }
                "reminder_days" => {
                    config.reminder_days = value.parse().unwrap_or(7);
                }
                _ => {}
            }
        }

        Ok(config)
    }

    /// Validate student data
    fn validate_student_data(
        name: &str, 
        group_name: &str, 
        payment_plan: &PaymentPlan,
        plan_amount: i32,
        installment_count: Option<i32>
    ) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Student name cannot be empty".to_string());
        }

        if name.len() > 255 {
            return Err("Student name cannot exceed 255 characters".to_string());
        }

        if group_name.trim().is_empty() {
            return Err("Group name cannot be empty".to_string());
        }

        if group_name.len() > 100 {
            return Err("Group name cannot exceed 100 characters".to_string());
        }

        if plan_amount <= 0 {
            return Err("Plan amount must be positive".to_string());
        }

        if plan_amount > 1_000_000 {
            return Err("Plan amount cannot exceed 1,000,000".to_string());
        }

        // Validate installment count for installment plans
        if *payment_plan == PaymentPlan::Installment {
            match installment_count {
                Some(count) if count <= 0 => {
                    return Err("Installment count must be positive".to_string());
                }
                Some(count) if count > 12 => {
                    return Err("Installment count cannot exceed 12".to_string());
                }
                None => {
                    return Err("Installment count is required for installment plans".to_string());
                }
                _ => {}
            }
        }

        Ok(())
    }

    /// Calculate next due date based on payment plan and enrollment date
    pub fn calculate_next_due_date(
        payment_plan: &PaymentPlan,
        enrollment_date: &str,
        last_payment_date: Option<&str>,
        installment_interval: i32,
    ) -> DatabaseResult<Option<String>> {
        let enrollment = NaiveDate::parse_from_str(enrollment_date, "%Y-%m-%d")
            .map_err(|_| DatabaseError::Migration("Invalid enrollment date format".to_string()))?;

        let reference_date = if let Some(last_payment) = last_payment_date {
            NaiveDate::parse_from_str(last_payment, "%Y-%m-%d")
                .map_err(|_| DatabaseError::Migration("Invalid last payment date format".to_string()))?
        } else {
            enrollment
        };

        match payment_plan {
            PaymentPlan::OneTime => {
                // Due immediately upon enrollment
                Ok(Some(enrollment.format("%Y-%m-%d").to_string()))
            }
            PaymentPlan::Monthly => {
                // Due on the same day each month
                let mut next_due = reference_date;
                if last_payment_date.is_some() {
                    // Add one month
                    next_due = next_due
                        .with_month(next_due.month() % 12 + 1)
                        .unwrap_or_else(|| {
                            next_due.with_year(next_due.year() + 1)
                                .and_then(|d| d.with_month(1))
                                .unwrap_or(next_due)
                        });
                }
                Ok(Some(next_due.format("%Y-%m-%d").to_string()))
            }
            PaymentPlan::Installment => {
                // Due every N months (default 3)
                let mut next_due = reference_date;
                if last_payment_date.is_some() {
                    // Add installment interval months
                    let new_month = (next_due.month() - 1 + installment_interval as u32) % 12 + 1;
                    let year_increment = (next_due.month() - 1 + installment_interval as u32) / 12;
                    next_due = next_due
                        .with_year(next_due.year() + year_increment as i32)
                        .and_then(|d| d.with_month(new_month))
                        .unwrap_or(next_due);
                }
                Ok(Some(next_due.format("%Y-%m-%d").to_string()))
            }
        }
    }

    /// Calculate payment status based on plan type, amounts, and dates
    pub fn calculate_payment_status(
        payment_plan: &PaymentPlan,
        plan_amount: i32,
        paid_amount: i32,
        installment_count: Option<i32>,
        next_due_date: Option<&str>,
        enrollment_date: &str,
        reminder_days: i32,
    ) -> DatabaseResult<PaymentStatus> {
        let today = Utc::now().date_naive();
        
        match payment_plan {
            PaymentPlan::OneTime => {
                if paid_amount >= plan_amount {
                    Ok(PaymentStatus::Paid)
                } else {
                    let enrollment = NaiveDate::parse_from_str(enrollment_date, "%Y-%m-%d")
                        .map_err(|_| DatabaseError::Migration("Invalid enrollment date format".to_string()))?;
                    
                    let days_since_enrollment = (today - enrollment).num_days();
                    if days_since_enrollment > 30 {
                        Ok(PaymentStatus::Overdue)
                    } else {
                        Ok(PaymentStatus::Pending)
                    }
                }
            }
            PaymentPlan::Monthly => {
                if let Some(due_date_str) = next_due_date {
                    let due_date = NaiveDate::parse_from_str(due_date_str, "%Y-%m-%d")
                        .map_err(|_| DatabaseError::Migration("Invalid due date format".to_string()))?;
                    
                    let days_until_due = (due_date - today).num_days();
                    
                    if days_until_due < 0 {
                        Ok(PaymentStatus::Overdue)
                    } else if days_until_due <= reminder_days as i64 {
                        Ok(PaymentStatus::DueSoon)
                    } else {
                        Ok(PaymentStatus::Pending)
                    }
                } else {
                    Ok(PaymentStatus::Pending)
                }
            }
            PaymentPlan::Installment => {
                let total_expected = plan_amount * installment_count.unwrap_or(3);
                
                if paid_amount >= total_expected {
                    Ok(PaymentStatus::Paid)
                } else if let Some(due_date_str) = next_due_date {
                    let due_date = NaiveDate::parse_from_str(due_date_str, "%Y-%m-%d")
                        .map_err(|_| DatabaseError::Migration("Invalid due date format".to_string()))?;
                    
                    let days_until_due = (due_date - today).num_days();
                    
                    if days_until_due < 0 {
                        Ok(PaymentStatus::Overdue)
                    } else if days_until_due <= reminder_days as i64 {
                        Ok(PaymentStatus::DueSoon)
                    } else {
                        Ok(PaymentStatus::Pending)
                    }
                } else {
                    Ok(PaymentStatus::Pending)
                }
            }
        }
    }

    /// Create a new student
    pub fn create_student(
        db: &Database,
        request: CreateStudentRequest,
    ) -> DatabaseResult<Student> {
        // Validate input data
        Self::validate_student_data(
            &request.name, 
            &request.group_name, 
            &request.payment_plan,
            request.plan_amount,
            request.installment_count
        ).map_err(|e| DatabaseError::Migration(e))?;

        // Generate unique student ID
        let student_id = Self::generate_student_id(db)?;

        // Get payment plan configuration
        let config = Self::get_payment_plan_config(db)?;

        // Set enrollment date to today
        let enrollment_date = Utc::now().date_naive().format("%Y-%m-%d").to_string();

        // Calculate next due date
        let next_due_date = Self::calculate_next_due_date(
            &request.payment_plan,
            &enrollment_date,
            None,
            config.installment_interval,
        )?;

        // Calculate initial payment status
        let payment_status = Self::calculate_payment_status(
            &request.payment_plan,
            request.plan_amount,
            0, // Initial paid amount is 0
            request.installment_count,
            next_due_date.as_deref(),
            &enrollment_date,
            config.reminder_days,
        )?;

        // Insert student into database
        let now = Utc::now().to_rfc3339();
        db.connection().execute(
            "INSERT INTO students (id, name, group_name, payment_plan, plan_amount, installment_count, paid_amount, enrollment_date, next_due_date, payment_status, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                student_id,
                request.name.trim(),
                request.group_name.trim(),
                request.payment_plan.as_str(),
                request.plan_amount,
                request.installment_count,
                0, // Initial paid amount
                enrollment_date,
                next_due_date,
                payment_status.as_str(),
                now,
                now
            ],
        )?;

        // Return the created student
        Ok(Student {
            id: student_id,
            name: request.name.trim().to_string(),
            group_name: request.group_name.trim().to_string(),
            payment_plan: request.payment_plan,
            plan_amount: request.plan_amount,
            installment_count: request.installment_count,
            paid_amount: 0,
            enrollment_date,
            next_due_date,
            payment_status,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Get all students
    pub fn get_all_students(db: &Database) -> DatabaseResult<Vec<Student>> {
        let mut stmt = db.connection().prepare(
            "SELECT id, name, group_name, payment_plan, plan_amount, installment_count, paid_amount, enrollment_date, next_due_date, payment_status, created_at, updated_at 
             FROM students 
             ORDER BY created_at DESC",
        )?;

        let student_iter = stmt.query_map([], |row| {
            let payment_plan_str: String = row.get(3)?;
            let payment_status_str: String = row.get(9)?;
            
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                payment_plan: PaymentPlan::from_str(&payment_plan_str).unwrap_or(PaymentPlan::OneTime),
                plan_amount: row.get(4)?,
                installment_count: row.get(5)?,
                paid_amount: row.get(6)?,
                enrollment_date: row.get(7)?,
                next_due_date: row.get(8)?,
                payment_status: PaymentStatus::from_str(&payment_status_str).unwrap_or(PaymentStatus::Pending),
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get all students with attendance data and payment history
    pub fn get_all_students_with_attendance(db: &Database) -> DatabaseResult<Vec<StudentWithAttendance>> {
        let students = Self::get_all_students(db)?;

        let mut students_with_attendance = Vec::new();

        for student in students {
            // Get attendance records for this student
            let mut attendance_stmt = db.connection().prepare(
                "SELECT id, student_id, date, created_at 
                 FROM attendance 
                 WHERE student_id = ?1 
                 ORDER BY date DESC",
            )?;

            let attendance_iter = attendance_stmt.query_map([&student.id], |row| {
                Ok(AttendanceRecord {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    date: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?;

            let attendance_log: Result<Vec<_>, _> = attendance_iter.collect();
            let attendance_log = attendance_log.map_err(DatabaseError::from)?;

            // Get payment history for this student
            let mut payment_stmt = db.connection().prepare(
                "SELECT id, student_id, amount, payment_date, payment_method, notes, created_at 
                 FROM payment_transactions 
                 WHERE student_id = ?1 
                 ORDER BY payment_date DESC",
            )?;

            let payment_iter = payment_stmt.query_map([&student.id], |row| {
                Ok(PaymentTransaction {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    amount: row.get(2)?,
                    payment_date: row.get(3)?,
                    payment_method: row.get(4)?,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })?;

            let payment_history: Result<Vec<_>, _> = payment_iter.collect();
            let payment_history = payment_history.map_err(DatabaseError::from)?;

            students_with_attendance.push(StudentWithAttendance {
                id: student.id,
                name: student.name,
                group_name: student.group_name,
                payment_plan: student.payment_plan,
                plan_amount: student.plan_amount,
                installment_count: student.installment_count,
                paid_amount: student.paid_amount,
                enrollment_date: student.enrollment_date,
                next_due_date: student.next_due_date,
                payment_status: student.payment_status,
                attendance_log,
                payment_history,
                created_at: student.created_at,
                updated_at: student.updated_at,
            });
        }

        Ok(students_with_attendance)
    }

    /// Get a student by ID
    pub fn get_student_by_id(db: &Database, student_id: &str) -> DatabaseResult<Option<Student>> {
        let result = db.connection().query_row(
            "SELECT id, name, group_name, payment_plan, plan_amount, installment_count, paid_amount, enrollment_date, next_due_date, payment_status, created_at, updated_at 
             FROM students 
             WHERE id = ?1",
            [student_id],
            |row| {
                let payment_plan_str: String = row.get(3)?;
                let payment_status_str: String = row.get(9)?;
                
                Ok(Student {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    group_name: row.get(2)?,
                    payment_plan: PaymentPlan::from_str(&payment_plan_str).unwrap_or(PaymentPlan::OneTime),
                    plan_amount: row.get(4)?,
                    installment_count: row.get(5)?,
                    paid_amount: row.get(6)?,
                    enrollment_date: row.get(7)?,
                    next_due_date: row.get(8)?,
                    payment_status: PaymentStatus::from_str(&payment_status_str).unwrap_or(PaymentStatus::Pending),
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        );

        match result {
            Ok(student) => Ok(Some(student)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DatabaseError::Sqlite(e)),
        }
    }

    /// Update a student
    pub fn update_student(
        db: &Database,
        student_id: &str,
        request: UpdateStudentRequest,
    ) -> DatabaseResult<()> {
        // Validate input data
        Self::validate_student_data(
            &request.name, 
            &request.group_name, 
            &request.payment_plan,
            request.plan_amount,
            request.installment_count
        ).map_err(|e| DatabaseError::Migration(e))?;

        // Check if student exists and get current data
        let current_student = Self::get_student_by_id(db, student_id)?
            .ok_or_else(|| DatabaseError::Migration(format!("Student with ID {} not found", student_id)))?;

        // Get payment plan configuration
        let config = Self::get_payment_plan_config(db)?;

        // Recalculate next due date if payment plan changed
        let next_due_date = if current_student.payment_plan != request.payment_plan {
            Self::calculate_next_due_date(
                &request.payment_plan,
                &current_student.enrollment_date,
                None, // Reset due date calculation for plan changes
                config.installment_interval,
            )?
        } else {
            current_student.next_due_date
        };

        // Recalculate payment status
        let payment_status = Self::calculate_payment_status(
            &request.payment_plan,
            request.plan_amount,
            current_student.paid_amount,
            request.installment_count,
            next_due_date.as_deref(),
            &current_student.enrollment_date,
            config.reminder_days,
        )?;

        // Update student in database
        let now = Utc::now().to_rfc3339();
        let rows_affected = db.connection().execute(
            "UPDATE students 
             SET name = ?1, group_name = ?2, payment_plan = ?3, plan_amount = ?4, installment_count = ?5, next_due_date = ?6, payment_status = ?7, updated_at = ?8 
             WHERE id = ?9",
            params![
                request.name.trim(),
                request.group_name.trim(),
                request.payment_plan.as_str(),
                request.plan_amount,
                request.installment_count,
                next_due_date,
                payment_status.as_str(),
                now,
                student_id
            ],
        )?;

        if rows_affected == 0 {
            return Err(DatabaseError::Migration(format!(
                "Failed to update student with ID {}",
                student_id
            )));
        }

        Ok(())
    }

    /// Delete a student
    pub fn delete_student(db: &Database, student_id: &str) -> DatabaseResult<()> {
        // Check if student exists
        if Self::get_student_by_id(db, student_id)?.is_none() {
            return Err(DatabaseError::Migration(format!(
                "Student with ID {} not found",
                student_id
            )));
        }

        // Delete student (attendance records will be deleted automatically due to foreign key constraint)
        let rows_affected = db.connection().execute(
            "DELETE FROM students WHERE id = ?1",
            [student_id],
        )?;

        if rows_affected == 0 {
            return Err(DatabaseError::Migration(format!(
                "Failed to delete student with ID {}",
                student_id
            )));
        }

        Ok(())
    }

    /// Get students by group
    pub fn get_students_by_group(db: &Database, group_name: &str) -> DatabaseResult<Vec<Student>> {
        let mut stmt = db.connection().prepare(
            "SELECT id, name, group_name, payment_plan, plan_amount, installment_count, paid_amount, enrollment_date, next_due_date, payment_status, created_at, updated_at 
             FROM students 
             WHERE group_name = ?1 
             ORDER BY name",
        )?;

        let student_iter = stmt.query_map([group_name], |row| {
            let payment_plan_str: String = row.get(3)?;
            let payment_status_str: String = row.get(9)?;
            
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                payment_plan: PaymentPlan::from_str(&payment_plan_str).unwrap_or(PaymentPlan::OneTime),
                plan_amount: row.get(4)?,
                installment_count: row.get(5)?,
                paid_amount: row.get(6)?,
                enrollment_date: row.get(7)?,
                next_due_date: row.get(8)?,
                payment_status: PaymentStatus::from_str(&payment_status_str).unwrap_or(PaymentStatus::Pending),
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get students by payment status
    pub fn get_students_by_payment_status(db: &Database, status: &str) -> DatabaseResult<Vec<Student>> {
        let mut stmt = db.connection().prepare(
            "SELECT id, name, group_name, payment_plan, plan_amount, installment_count, paid_amount, enrollment_date, next_due_date, payment_status, created_at, updated_at 
             FROM students 
             WHERE payment_status = ?1 
             ORDER BY next_due_date ASC, name",
        )?;

        let student_iter = stmt.query_map([status], |row| {
            let payment_plan_str: String = row.get(3)?;
            let payment_status_str: String = row.get(9)?;
            
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                payment_plan: PaymentPlan::from_str(&payment_plan_str).unwrap_or(PaymentPlan::OneTime),
                plan_amount: row.get(4)?,
                installment_count: row.get(5)?,
                paid_amount: row.get(6)?,
                enrollment_date: row.get(7)?,
                next_due_date: row.get(8)?,
                payment_status: PaymentStatus::from_str(&payment_status_str).unwrap_or(PaymentStatus::Pending),
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get students with overdue payments
    pub fn get_overdue_students(db: &Database) -> DatabaseResult<Vec<Student>> {
        Self::get_students_by_payment_status(db, "overdue")
    }

    /// Get students with payments due soon
    pub fn get_due_soon_students(db: &Database) -> DatabaseResult<Vec<Student>> {
        Self::get_students_by_payment_status(db, "due_soon")
    }

    /// Update payment statuses for all students
    pub fn update_payment_statuses(db: &Database) -> DatabaseResult<()> {
        let students = Self::get_all_students(db)?;
        let config = Self::get_payment_plan_config(db)?;

        for student in students {
            let new_status = Self::calculate_payment_status(
                &student.payment_plan,
                student.plan_amount,
                student.paid_amount,
                student.installment_count,
                student.next_due_date.as_deref(),
                &student.enrollment_date,
                config.reminder_days,
            )?;

            if new_status != student.payment_status {
                db.connection().execute(
                    "UPDATE students SET payment_status = ?1, updated_at = ?2 WHERE id = ?3",
                    params![new_status.as_str(), Utc::now().to_rfc3339(), student.id],
                )?;
            }
        }

        Ok(())
    }

    /// Get student statistics
    pub fn get_student_statistics(db: &Database) -> DatabaseResult<StudentStatistics> {
        // Total students
        let total_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students",
            [],
            |row| row.get(0),
        )?;

        // Students by payment status
        let paid_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students WHERE payment_status = 'paid'",
            [],
            |row| row.get(0),
        )?;

        let overdue_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students WHERE payment_status = 'overdue'",
            [],
            |row| row.get(0),
        )?;

        let due_soon_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students WHERE payment_status = 'due_soon'",
            [],
            |row| row.get(0),
        )?;

        let pending_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students WHERE payment_status = 'pending'",
            [],
            |row| row.get(0),
        )?;

        // Students by group
        let mut group_stmt = db.connection().prepare(
            "SELECT group_name, COUNT(*) FROM students GROUP BY group_name ORDER BY group_name",
        )?;

        let group_iter = group_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?;

        let mut students_by_group = HashMap::new();
        for group_result in group_iter {
            let (group_name, count) = group_result.map_err(DatabaseError::from)?;
            students_by_group.insert(group_name, count);
        }

        // Students by payment plan
        let mut plan_stmt = db.connection().prepare(
            "SELECT payment_plan, COUNT(*) FROM students GROUP BY payment_plan ORDER BY payment_plan",
        )?;

        let plan_iter = plan_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })?;

        let mut students_by_plan = HashMap::new();
        for plan_result in plan_iter {
            let (plan_name, count) = plan_result.map_err(DatabaseError::from)?;
            students_by_plan.insert(plan_name, count);
        }

        // Average payment amount
        let avg_payment: f64 = db.connection().query_row(
            "SELECT AVG(CAST(paid_amount AS REAL)) FROM students",
            [],
            |row| row.get(0),
        ).unwrap_or(0.0);

        // Total revenue
        let total_revenue: i64 = db.connection().query_row(
            "SELECT SUM(CAST(paid_amount AS INTEGER)) FROM students",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        Ok(StudentStatistics {
            total_students,
            paid_students,
            overdue_students,
            due_soon_students,
            pending_students,
            students_by_group,
            students_by_plan,
            average_payment: avg_payment,
            total_revenue,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStatistics {
    pub total_students: i32,
    pub paid_students: i32,
    pub overdue_students: i32,
    pub due_soon_students: i32,
    pub pending_students: i32,
    pub students_by_group: HashMap<String, i32>,
    pub students_by_plan: HashMap<String, i32>,
    pub average_payment: f64,
    pub total_revenue: i64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::TempDir;

    fn create_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::new(temp_dir.path().to_path_buf()).unwrap();
        (db, temp_dir)
    }

    #[test]
    fn test_generate_student_id() {
        let (db, _temp_dir) = create_test_db();
        
        let id1 = StudentService::generate_student_id(&db).unwrap();
        assert_eq!(id1, "STU000001");

        // Create a student to increment the counter
        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };
        StudentService::create_student(&db, request).unwrap();

        let id2 = StudentService::generate_student_id(&db).unwrap();
        assert_eq!(id2, "STU000002");
    }

    #[test]
    fn test_create_student_one_time() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "أحمد محمد".to_string(), // Arabic name
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };

        let student = StudentService::create_student(&db, request).unwrap();
        
        assert_eq!(student.name, "أحمد محمد");
        assert_eq!(student.group_name, "Group A");
        assert_eq!(student.payment_plan, PaymentPlan::OneTime);
        assert_eq!(student.plan_amount, 6000);
        assert_eq!(student.paid_amount, 0);
        assert_eq!(student.payment_status, PaymentStatus::Pending);
        assert!(student.id.starts_with("STU"));
    }

    #[test]
    fn test_create_student_monthly() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::Monthly,
            plan_amount: 850,
            installment_count: None,
        };

        let student = StudentService::create_student(&db, request).unwrap();
        
        assert_eq!(student.payment_plan, PaymentPlan::Monthly);
        assert_eq!(student.plan_amount, 850);
        assert!(student.next_due_date.is_some());
    }

    #[test]
    fn test_create_student_installment() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::Installment,
            plan_amount: 2850,
            installment_count: Some(3),
        };

        let student = StudentService::create_student(&db, request).unwrap();
        
        assert_eq!(student.payment_plan, PaymentPlan::Installment);
        assert_eq!(student.plan_amount, 2850);
        assert_eq!(student.installment_count, Some(3));
        assert!(student.next_due_date.is_some());
    }

    #[test]
    fn test_create_student_validation() {
        let (db, _temp_dir) = create_test_db();

        // Test empty name
        let request = CreateStudentRequest {
            name: "".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };
        assert!(StudentService::create_student(&db, request).is_err());

        // Test negative plan amount
        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: -100,
            installment_count: None,
        };
        assert!(StudentService::create_student(&db, request).is_err());

        // Test installment plan without installment count
        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::Installment,
            plan_amount: 2850,
            installment_count: None,
        };
        assert!(StudentService::create_student(&db, request).is_err());
    }

    #[test]
    fn test_payment_plan_enum() {
        assert_eq!(PaymentPlan::OneTime.as_str(), "one-time");
        assert_eq!(PaymentPlan::Monthly.as_str(), "monthly");
        assert_eq!(PaymentPlan::Installment.as_str(), "installment");

        assert_eq!(PaymentPlan::from_str("one-time").unwrap(), PaymentPlan::OneTime);
        assert_eq!(PaymentPlan::from_str("monthly").unwrap(), PaymentPlan::Monthly);
        assert_eq!(PaymentPlan::from_str("installment").unwrap(), PaymentPlan::Installment);
        assert!(PaymentPlan::from_str("invalid").is_err());
    }

    #[test]
    fn test_payment_status_enum() {
        assert_eq!(PaymentStatus::Paid.as_str(), "paid");
        assert_eq!(PaymentStatus::Pending.as_str(), "pending");
        assert_eq!(PaymentStatus::Overdue.as_str(), "overdue");
        assert_eq!(PaymentStatus::DueSoon.as_str(), "due_soon");

        assert_eq!(PaymentStatus::from_str("paid").unwrap(), PaymentStatus::Paid);
        assert_eq!(PaymentStatus::from_str("pending").unwrap(), PaymentStatus::Pending);
        assert_eq!(PaymentStatus::from_str("overdue").unwrap(), PaymentStatus::Overdue);
        assert_eq!(PaymentStatus::from_str("due_soon").unwrap(), PaymentStatus::DueSoon);
        assert!(PaymentStatus::from_str("invalid").is_err());
    }

    #[test]
    fn test_calculate_next_due_date() {
        // Test one-time payment
        let due_date = StudentService::calculate_next_due_date(
            &PaymentPlan::OneTime,
            "2024-01-01",
            None,
            3,
        ).unwrap();
        assert_eq!(due_date, Some("2024-01-01".to_string()));

        // Test monthly payment
        let due_date = StudentService::calculate_next_due_date(
            &PaymentPlan::Monthly,
            "2024-01-01",
            None,
            3,
        ).unwrap();
        assert_eq!(due_date, Some("2024-01-01".to_string()));

        // Test installment payment
        let due_date = StudentService::calculate_next_due_date(
            &PaymentPlan::Installment,
            "2024-01-01",
            None,
            3,
        ).unwrap();
        assert_eq!(due_date, Some("2024-01-01".to_string()));
    }

    #[test]
    fn test_get_students_by_payment_status() {
        let (db, _temp_dir) = create_test_db();

        // Create students with different payment plans
        let request1 = CreateStudentRequest {
            name: "Student 1".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };
        let student1 = StudentService::create_student(&db, request1).unwrap();

        let request2 = CreateStudentRequest {
            name: "Student 2".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::Monthly,
            plan_amount: 850,
            installment_count: None,
        };
        let student2 = StudentService::create_student(&db, request2).unwrap();

        // Check what status each student has
        println!("Student 1 status: {:?}", student1.payment_status);
        println!("Student 2 status: {:?}", student2.payment_status);

        let pending_students = StudentService::get_students_by_payment_status(&db, "pending").unwrap();
        let due_soon_students = StudentService::get_students_by_payment_status(&db, "due_soon").unwrap();
        
        // At least one should be pending or due_soon
        assert!(pending_students.len() + due_soon_students.len() >= 2);
    }

    #[test]
    fn test_update_student() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Original Name".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };
        let student = StudentService::create_student(&db, request).unwrap();

        let update_request = UpdateStudentRequest {
            name: "Updated Name".to_string(),
            group_name: "Group B".to_string(),
            payment_plan: PaymentPlan::Monthly,
            plan_amount: 850,
            installment_count: None,
        };

        StudentService::update_student(&db, &student.id, update_request).unwrap();

        let updated_student = StudentService::get_student_by_id(&db, &student.id).unwrap().unwrap();
        assert_eq!(updated_student.name, "Updated Name");
        assert_eq!(updated_student.group_name, "Group B");
        assert_eq!(updated_student.payment_plan, PaymentPlan::Monthly);
        assert_eq!(updated_student.plan_amount, 850);
    }

    #[test]
    fn test_get_payment_plan_config() {
        let (db, _temp_dir) = create_test_db();

        let config = StudentService::get_payment_plan_config(&db).unwrap();
        
        assert_eq!(config.one_time_amount, 6000);
        assert_eq!(config.monthly_amount, 850);
        assert_eq!(config.installment_amount, 2850);
        assert_eq!(config.installment_interval, 3);
        assert_eq!(config.reminder_days, 7);
    }

    #[test]
    fn test_get_student_statistics() {
        let (db, _temp_dir) = create_test_db();

        // Add test students with different payment plans
        let request1 = CreateStudentRequest {
            name: "Student 1".to_string(),
            group_name: "Group A".to_string(),
            payment_plan: PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
        };
        StudentService::create_student(&db, request1).unwrap();

        let request2 = CreateStudentRequest {
            name: "Student 2".to_string(),
            group_name: "Group B".to_string(),
            payment_plan: PaymentPlan::Monthly,
            plan_amount: 850,
            installment_count: None,
        };
        StudentService::create_student(&db, request2).unwrap();

        let stats = StudentService::get_student_statistics(&db).unwrap();
        
        assert_eq!(stats.total_students, 2);
        assert_eq!(stats.students_by_group.get("Group A"), Some(&1));
        assert_eq!(stats.students_by_group.get("Group B"), Some(&1));
        assert_eq!(stats.students_by_plan.get("one-time"), Some(&1));
        assert_eq!(stats.students_by_plan.get("monthly"), Some(&1));
    }
}