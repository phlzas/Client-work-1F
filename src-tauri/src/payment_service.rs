use crate::database::{Database, DatabaseError, DatabaseResult};
use crate::audit_service::AuditService;
use crate::student_service::{StudentService, PaymentPlan, PaymentStatus};
use chrono::{Utc, NaiveDate};
use rusqlite::params;
use serde::{Deserialize, Serialize};

// Business logic constants - consider making these configurable
const MAX_PAYMENT_AMOUNT: i32 = 1_000_000; // Maximum allowed payment amount in cents/smallest currency unit
const DEFAULT_RECENT_PAYMENTS_LIMIT: usize = 10; // Number of recent payments to show in summary
const DAYS_PER_MONTH: f64 = 30.44; // Average days per month for monthly payment calculations
const DEFAULT_INSTALLMENT_COUNT: i32 = 3; // Default number of installments when not specified

// Custom error types for better error handling
#[derive(Debug)]
pub enum PaymentError {
    ValidationError(String),
    DatabaseError(DatabaseError),
    StudentNotFound(String),
}

impl From<DatabaseError> for PaymentError {
    fn from(err: DatabaseError) -> Self {
        PaymentError::DatabaseError(err)
    }
}

impl From<rusqlite::Error> for PaymentError {
    fn from(err: rusqlite::Error) -> Self {
        PaymentError::DatabaseError(DatabaseError::Sqlite(err))
    }
}

impl std::fmt::Display for PaymentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PaymentError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            PaymentError::DatabaseError(err) => write!(f, "Database error: {}", err),
            PaymentError::StudentNotFound(id) => write!(f, "Student not found: {}", id),
        }
    }
}

impl std::error::Error for PaymentError {}

pub type PaymentResult<T> = Result<T, PaymentError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchUpdateResult {
    pub successful_updates: i32,
    pub failed_updates: Vec<(String, String)>, // (student_id, error_message)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentTransaction {
    pub id: i32,
    pub student_id: String,
    pub amount: i32,
    pub payment_date: String,
    pub payment_method: PaymentMethod,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PaymentMethod {
    #[serde(rename = "cash")]
    Cash,
    #[serde(rename = "bank_transfer")]
    BankTransfer,
    #[serde(rename = "check")]
    Check,
}

impl PaymentMethod {
    pub fn as_str(&self) -> &'static str {
        match self {
            PaymentMethod::Cash => "cash",
            PaymentMethod::BankTransfer => "bank_transfer",
            PaymentMethod::Check => "check",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "cash" => Ok(PaymentMethod::Cash),
            "bank_transfer" => Ok(PaymentMethod::BankTransfer),
            "check" => Ok(PaymentMethod::Check),
            _ => Err(format!("Invalid payment method: {}", s)),
        }
    }

    pub fn validate_str(s: &str) -> bool {
        matches!(s, "cash" | "bank_transfer" | "check")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordPaymentRequest {
    pub student_id: String,
    pub amount: i32,
    pub payment_date: String,
    pub payment_method: PaymentMethod,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentSummary {
    pub total_students: i32,
    pub total_paid_amount: i64,
    pub total_expected_amount: i64,
    pub students_paid: i32,
    pub students_pending: i32,
    pub students_overdue: i32,
    pub students_due_soon: i32,
    pub payment_plan_breakdown: PaymentPlanBreakdown,
    pub recent_payments: Vec<PaymentTransaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPlanBreakdown {
    pub one_time: PaymentPlanStats,
    pub monthly: PaymentPlanStats,
    pub installment: PaymentPlanStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentPlanStats {
    pub total_students: i32,
    pub total_paid: i64,
    pub total_expected: i64,
    pub students_paid: i32,
    pub students_pending: i32,
    pub students_overdue: i32,
    pub students_due_soon: i32,
}

impl Default for PaymentPlanStats {
    fn default() -> Self {
        Self {
            total_students: 0,
            total_paid: 0,
            total_expected: 0,
            students_paid: 0,
            students_pending: 0,
            students_overdue: 0,
            students_due_soon: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentHistoryFilter {
    pub student_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub payment_method: Option<PaymentMethod>,
    pub min_amount: Option<i32>,
    pub max_amount: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentHistoryRequest {
    pub filter: Option<PaymentHistoryFilter>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedPaymentHistory {
    pub payments: Vec<PaymentTransaction>,
    pub total_count: i32,
    pub has_more: bool,
}

pub struct PaymentService;

impl PaymentService {
    /// Create database indexes for better performance
    pub fn create_indexes(db: &Database) -> DatabaseResult<()> {
        let indexes = [
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_student_date ON payment_transactions(student_id, payment_date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(payment_date DESC)",
            "CREATE INDEX IF NOT EXISTS idx_payment_transactions_method ON payment_transactions(payment_method)",
            "CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status)",
            "CREATE INDEX IF NOT EXISTS idx_students_payment_plan ON students(payment_plan)",
        ];

        for index_sql in &indexes {
            db.connection().execute(index_sql, [])?;
        }

        Ok(())
    }
    /// Build payment query with filters
    fn build_payment_query(
        filter: &Option<PaymentHistoryFilter>,
    ) -> (String, String, Vec<Box<dyn rusqlite::ToSql>>) {
        let mut query = "SELECT id, student_id, amount, payment_date, payment_method, notes, created_at FROM payment_transactions".to_string();
        let mut count_query = "SELECT COUNT(*) FROM payment_transactions".to_string();
        let mut conditions = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(f) = filter {
            if let Some(student_id) = &f.student_id {
                conditions.push("student_id = ?".to_string());
                params.push(Box::new(student_id.clone()));
            }

            if let Some(start_date) = &f.start_date {
                conditions.push("payment_date >= ?".to_string());
                params.push(Box::new(start_date.clone()));
            }

            if let Some(end_date) = &f.end_date {
                conditions.push("payment_date <= ?".to_string());
                params.push(Box::new(end_date.clone()));
            }

            if let Some(payment_method) = &f.payment_method {
                conditions.push("payment_method = ?".to_string());
                params.push(Box::new(payment_method.as_str().to_string()));
            }

            if let Some(min_amount) = f.min_amount {
                conditions.push("amount >= ?".to_string());
                params.push(Box::new(min_amount));
            }

            if let Some(max_amount) = f.max_amount {
                conditions.push("amount <= ?".to_string());
                params.push(Box::new(max_amount));
            }
        }

        if !conditions.is_empty() {
            let where_clause = format!(" WHERE {}", conditions.join(" AND "));
            query.push_str(&where_clause);
            count_query.push_str(&where_clause);
        }

        (query, count_query, params)
    }

    /// Calculate expected amount based on payment plan
    /// 
    /// # Arguments
    /// * `payment_plan` - The type of payment plan (OneTime, Monthly, Installment)
    /// * `plan_amount` - Base amount for the plan
    /// * `enrollment_date` - Student enrollment date in YYYY-MM-DD format
    /// * `installment_count` - Number of installments (used for Installment plan)
    /// 
    /// # Returns
    /// Expected total amount the student should have paid by now
    fn calculate_expected_amount(
        payment_plan: &PaymentPlan,
        plan_amount: i32,
        enrollment_date: &str,
        installment_count: Option<i32>,
    ) -> Result<i64, DatabaseError> {
        match payment_plan {
            PaymentPlan::OneTime => Ok(plan_amount as i64),
            PaymentPlan::Monthly => {
                let enrollment = NaiveDate::parse_from_str(enrollment_date, "%Y-%m-%d")
                    .map_err(|_| DatabaseError::Migration("Invalid enrollment date".to_string()))?;
                let today = Utc::now().date_naive();
                let days_enrolled = (today - enrollment).num_days() as f64;
                let months_enrolled = ((days_enrolled / DAYS_PER_MONTH) as i32) + 1;
                Ok((plan_amount as i64) * (months_enrolled.max(1) as i64))
            }
            PaymentPlan::Installment => {
                Ok((plan_amount as i64) * (installment_count.unwrap_or(DEFAULT_INSTALLMENT_COUNT) as i64))
            }
        }
    }

    /// Parse payment transaction from database row
    fn parse_payment_transaction(row: &rusqlite::Row) -> Result<PaymentTransaction, rusqlite::Error> {
        let payment_method_str: String = row.get(4)?;
        Ok(PaymentTransaction {
            id: row.get(0)?,
            student_id: row.get(1)?,
            amount: row.get(2)?,
            payment_date: row.get(3)?,
            payment_method: PaymentMethod::from_str(&payment_method_str)
                .map_err(|_| rusqlite::Error::InvalidColumnType(4, "payment_method".to_string(), rusqlite::types::Type::Text))?,
            notes: row.get(5)?,
            created_at: row.get(6)?,
        })
    }

    /// Validate payment data
    fn validate_payment_data(
        student_id: &str,
        amount: i32,
        payment_date: &str,
        payment_method: &PaymentMethod,
    ) -> PaymentResult<()> {
        if student_id.trim().is_empty() {
            return Err(PaymentError::ValidationError("Student ID cannot be empty".to_string()));
        }

        if amount <= 0 {
            return Err(PaymentError::ValidationError("Payment amount must be positive".to_string()));
        }

        if amount > MAX_PAYMENT_AMOUNT {
            return Err(PaymentError::ValidationError(
                format!("Payment amount cannot exceed {}", MAX_PAYMENT_AMOUNT)
            ));
        }

        // Validate date format
        if NaiveDate::parse_from_str(payment_date, "%Y-%m-%d").is_err() {
            return Err(PaymentError::ValidationError(
                "Invalid payment date format. Use YYYY-MM-DD".to_string()
            ));
        }

        // Validate payment method
        match payment_method {
            PaymentMethod::Cash | PaymentMethod::BankTransfer | PaymentMethod::Check => {}
        }

        Ok(())
    }

    /// Helper function to update payment plan statistics
    fn update_payment_plan_stats(
        stats: &mut PaymentPlanStats,
        student: &crate::student_service::Student,
        expected_amount: i64,
    ) {
        stats.total_students += 1;
        stats.total_paid += student.paid_amount as i64;
        stats.total_expected += expected_amount;
        
        match student.payment_status {
            PaymentStatus::Paid => stats.students_paid += 1,
            PaymentStatus::Pending => stats.students_pending += 1,
            PaymentStatus::Overdue => stats.students_overdue += 1,
            PaymentStatus::DueSoon => stats.students_due_soon += 1,
        }
    }

    /// Record a new payment transaction
    pub fn record_payment(
        db: &Database,
        request: RecordPaymentRequest,
    ) -> PaymentResult<PaymentTransaction> {
        // Validate input data
        Self::validate_payment_data(
            &request.student_id,
            request.amount,
            &request.payment_date,
            &request.payment_method,
        )?;

        // Check if student exists
        let student = StudentService::get_student_by_id(db, &request.student_id)
            .map_err(PaymentError::DatabaseError)?
            .ok_or_else(|| PaymentError::StudentNotFound(request.student_id.clone()))?;

        // Start transaction
        let tx = db.connection().unchecked_transaction()?;

        // Insert payment transaction
        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT INTO payment_transactions (student_id, amount, payment_date, payment_method, notes, created_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                request.student_id,
                request.amount,
                request.payment_date,
                request.payment_method.as_str(),
                request.notes,
                now
            ],
        )?;

        // Get the inserted payment ID
        let payment_id = tx.last_insert_rowid() as i32;

        // Update student's paid amount
        let new_paid_amount = student.paid_amount + request.amount;
        tx.execute(
            "UPDATE students SET paid_amount = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_paid_amount, now, request.student_id],
        )?;

        // Commit transaction
        tx.commit()?;

        // Recalculate payment status and due dates for the student
        Self::update_student_payment_status(db, &request.student_id)?;

        // Create the payment transaction object to return
        let payment_transaction = PaymentTransaction {
            id: payment_id,
            student_id: request.student_id.clone(),
            amount: request.amount,
            payment_date: request.payment_date,
            payment_method: request.payment_method,
            notes: request.notes,
            created_at: now,
        };

        // Log audit entry for payment creation
        if let Ok(serialized_data) = AuditService::serialize_data(&payment_transaction) {
            let _ = AuditService::log_create(db, "payment_transactions", &payment_id.to_string(), &serialized_data, None);
        }

        Ok(payment_transaction)
    }

    /// Get payment history with pagination support
    pub fn get_payment_history_paginated(
        db: &Database,
        request: PaymentHistoryRequest,
    ) -> DatabaseResult<PaginatedPaymentHistory> {
        let (mut query, count_query, params) = Self::build_payment_query(&request.filter);

        // Get total count
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        let total_count: i32 = db.connection().query_row(&count_query, &param_refs[..], |row| row.get(0))?;

        // Add ordering and pagination
        query.push_str(" ORDER BY payment_date DESC, created_at DESC");
        
        if let Some(limit) = request.limit {
            query.push_str(&format!(" LIMIT {}", limit));
            if let Some(offset) = request.offset {
                query.push_str(&format!(" OFFSET {}", offset));
            }
        }

        let mut stmt = db.connection().prepare(&query)?;
        let payment_iter = stmt.query_map(&param_refs[..], Self::parse_payment_transaction)?;

        let payments: Vec<PaymentTransaction> = payment_iter.collect::<Result<Vec<_>, _>>()?;
        let returned_count = payments.len() as i32;
        let has_more = request.offset.unwrap_or(0) + returned_count < total_count;

        Ok(PaginatedPaymentHistory {
            payments,
            total_count,
            has_more,
        })
    }

    /// Get payment history with optional filtering (legacy method for backward compatibility)
    pub fn get_payment_history(
        db: &Database,
        filter: Option<PaymentHistoryFilter>,
    ) -> DatabaseResult<Vec<PaymentTransaction>> {
        let (mut query, _, params) = Self::build_payment_query(&filter);

        query.push_str(" ORDER BY payment_date DESC, created_at DESC");

        let mut stmt = db.connection().prepare(&query)?;
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let payment_iter = stmt.query_map(&param_refs[..], Self::parse_payment_transaction)?;

        payment_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get payment history for a specific student
    pub fn get_student_payment_history(
        db: &Database,
        student_id: &str,
    ) -> DatabaseResult<Vec<PaymentTransaction>> {
        let filter = PaymentHistoryFilter {
            student_id: Some(student_id.to_string()),
            start_date: None,
            end_date: None,
            payment_method: None,
            min_amount: None,
            max_amount: None,
        };

        Self::get_payment_history(db, Some(filter))
    }

    /// Get comprehensive payment summary using optimized calculations
    pub fn get_payment_summary(db: &Database) -> DatabaseResult<PaymentSummary> {
        let overall_stats = Self::get_overall_payment_stats(db)?;
        let plan_breakdown = Self::get_payment_plan_breakdown(db)?;
        let recent_payments = Self::get_recent_payments(db)?;

        Ok(PaymentSummary {
            total_students: overall_stats.0,
            total_paid_amount: overall_stats.1,
            total_expected_amount: overall_stats.2,
            students_paid: overall_stats.3,
            students_pending: overall_stats.4,
            students_overdue: overall_stats.5,
            students_due_soon: overall_stats.6,
            payment_plan_breakdown: plan_breakdown,
            recent_payments,
        })
    }

    /// Get overall payment statistics
    fn get_overall_payment_stats(db: &Database) -> DatabaseResult<(i32, i64, i64, i32, i32, i32, i32)> {
        let students = StudentService::get_all_students(db)?;
        let mut total_expected = 0i64;
        let mut total_paid = 0i64;
        let mut students_paid = 0;
        let mut students_pending = 0;
        let mut students_overdue = 0;
        let mut students_due_soon = 0;

        for student in &students {
            let expected = Self::calculate_expected_amount(
                &student.payment_plan,
                student.plan_amount,
                &student.enrollment_date,
                student.installment_count,
            )?;
            total_expected += expected;
            total_paid += student.paid_amount as i64;

            match student.payment_status {
                PaymentStatus::Paid => students_paid += 1,
                PaymentStatus::Pending => students_pending += 1,
                PaymentStatus::Overdue => students_overdue += 1,
                PaymentStatus::DueSoon => students_due_soon += 1,
            }
        }

        Ok((
            students.len() as i32,
            total_paid,
            total_expected,
            students_paid,
            students_pending,
            students_overdue,
            students_due_soon,
        ))
    }

    /// Get payment plan breakdown statistics
    fn get_payment_plan_breakdown(db: &Database) -> DatabaseResult<PaymentPlanBreakdown> {
        let students = StudentService::get_all_students(db)?;
        let mut one_time_stats = PaymentPlanStats::default();
        let mut monthly_stats = PaymentPlanStats::default();
        let mut installment_stats = PaymentPlanStats::default();

        for student in &students {
            let expected = Self::calculate_expected_amount(
                &student.payment_plan,
                student.plan_amount,
                &student.enrollment_date,
                student.installment_count,
            )?;

            let stats = match student.payment_plan {
                PaymentPlan::OneTime => &mut one_time_stats,
                PaymentPlan::Monthly => &mut monthly_stats,
                PaymentPlan::Installment => &mut installment_stats,
            };

            Self::update_payment_plan_stats(stats, student, expected);
        }

        Ok(PaymentPlanBreakdown {
            one_time: one_time_stats,
            monthly: monthly_stats,
            installment: installment_stats,
        })
    }

    /// Get recent payments
    fn get_recent_payments(db: &Database) -> DatabaseResult<Vec<PaymentTransaction>> {
        Ok(Self::get_payment_history(db, None)?
            .into_iter()
            .take(DEFAULT_RECENT_PAYMENTS_LIMIT)
            .collect())
    }

    /// Update payment status and due dates for a specific student
    pub fn update_student_payment_status(
        db: &Database,
        student_id: &str,
    ) -> DatabaseResult<()> {
        let student = StudentService::get_student_by_id(db, student_id)?
            .ok_or_else(|| DatabaseError::Migration(format!("Student with ID {} not found", student_id)))?;

        let config = StudentService::get_payment_plan_config(db)?;

        // Get the most recent payment date for due date calculation
        let last_payment_date = Self::get_last_payment_date(db, student_id)?;

        // Calculate new due date
        let next_due_date = StudentService::calculate_next_due_date(
            &student.payment_plan,
            &student.enrollment_date,
            last_payment_date.as_deref(),
            config.installment_interval,
        )?;

        // Calculate new payment status
        let payment_status = StudentService::calculate_payment_status(
            &student.payment_plan,
            student.plan_amount,
            student.paid_amount,
            student.installment_count,
            next_due_date.as_deref(),
            &student.enrollment_date,
            config.reminder_days,
        )?;

        // Update student record
        let now = Utc::now().to_rfc3339();
        db.connection().execute(
            "UPDATE students SET next_due_date = ?1, payment_status = ?2, updated_at = ?3 WHERE id = ?4",
            params![next_due_date, payment_status.as_str(), now, student_id],
        )?;

        Ok(())
    }

    /// Get the most recent payment date for a student
    fn get_last_payment_date(
        db: &Database,
        student_id: &str,
    ) -> DatabaseResult<Option<String>> {
        let result = db.connection().query_row(
            "SELECT payment_date FROM payment_transactions WHERE student_id = ?1 ORDER BY payment_date DESC LIMIT 1",
            [student_id],
            |row| row.get::<_, String>(0),
        );

        match result {
            Ok(date) => Ok(Some(date)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(DatabaseError::Sqlite(e)),
        }
    }

    /// Update payment statuses for all students (batch operation)
    pub fn update_all_payment_statuses(db: &Database) -> DatabaseResult<BatchUpdateResult> {
        let students = StudentService::get_all_students(db)?;
        
        let mut successful_updates = 0;
        let mut failed_updates = Vec::new();
        
        for student in students {
            match Self::update_student_payment_status(db, &student.id) {
                Ok(_) => successful_updates += 1,
                Err(e) => {
                    log::warn!("Failed to update payment status for student {}: {}", student.id, e);
                    failed_updates.push((student.id, e.to_string()));
                }
            }
        }

        Ok(BatchUpdateResult {
            successful_updates,
            failed_updates,
        })
    }

    /// Update payment statuses for all students using batch SQL operations (optimized)
    pub fn update_all_payment_statuses_batch(db: &Database) -> DatabaseResult<BatchUpdateResult> {
        let config = StudentService::get_payment_plan_config(db)?;
        
        let update_query = r#"
            UPDATE students 
            SET payment_status = CASE 
                WHEN paid_amount >= (
                    CASE payment_plan
                        WHEN 'one-time' THEN plan_amount
                        WHEN 'installment' THEN plan_amount * COALESCE(installment_count, ?)
                        ELSE plan_amount
                    END
                ) THEN 'paid'
                WHEN next_due_date < date('now') THEN 'overdue'
                WHEN next_due_date <= date('now', '+' || ? || ' days') THEN 'due_soon'
                ELSE 'pending'
            END,
            updated_at = ?
            WHERE payment_status != CASE 
                WHEN paid_amount >= (
                    CASE payment_plan
                        WHEN 'one-time' THEN plan_amount
                        WHEN 'installment' THEN plan_amount * COALESCE(installment_count, ?)
                        ELSE plan_amount
                    END
                ) THEN 'paid'
                WHEN next_due_date < date('now') THEN 'overdue'
                WHEN next_due_date <= date('now', '+' || ? || ' days') THEN 'due_soon'
                ELSE 'pending'
            END
        "#;
        
        let now = Utc::now().to_rfc3339();
        let rows_affected = db.connection().execute(
            update_query, 
            params![
                DEFAULT_INSTALLMENT_COUNT, 
                config.reminder_days, 
                now,
                DEFAULT_INSTALLMENT_COUNT,
                config.reminder_days
            ]
        )?;
        
        Ok(BatchUpdateResult {
            successful_updates: rows_affected as i32,
            failed_updates: Vec::new(),
        })
    }

    /// Delete a payment transaction (with proper rollback of student paid amount)
    pub fn delete_payment(
        db: &Database,
        payment_id: i32,
    ) -> DatabaseResult<bool> {
        // Get the full payment transaction first for audit log
        let payment_record = db.connection().query_row(
            "SELECT id, student_id, amount, payment_date, payment_method, notes, created_at FROM payment_transactions WHERE id = ?1",
            [payment_id],
            |row| {
                let payment_method_str: String = row.get(4)?;
                let payment_method = PaymentMethod::from_str(&payment_method_str)
                    .map_err(|_e| rusqlite::Error::InvalidColumnType(4, "payment_method".to_string(), rusqlite::types::Type::Text))?;
                
                Ok(PaymentTransaction {
                    id: row.get(0)?,
                    student_id: row.get(1)?,
                    amount: row.get(2)?,
                    payment_date: row.get(3)?,
                    payment_method,
                    notes: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        );

        let payment_transaction = match payment_record {
            Ok(transaction) => Some(transaction),
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
            Err(e) => return Err(DatabaseError::Sqlite(e)),
        };

        let (student_id, amount) = if let Some(ref transaction) = payment_transaction {
            (transaction.student_id.clone(), transaction.amount)
        } else {
            return Ok(false);
        };

        // Start transaction
        let tx = db.connection().unchecked_transaction()?;

        // Delete the payment transaction
        let rows_affected = tx.execute(
            "DELETE FROM payment_transactions WHERE id = ?1",
            [payment_id],
        )?;

        if rows_affected == 0 {
            return Ok(false);
        }

        // Update student's paid amount (subtract the deleted payment)
        let student = StudentService::get_student_by_id(db, &student_id)?
            .ok_or_else(|| DatabaseError::Migration(format!("Student with ID {} not found", student_id)))?;

        let new_paid_amount = (student.paid_amount - amount).max(0);
        let now = Utc::now().to_rfc3339();
        
        tx.execute(
            "UPDATE students SET paid_amount = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_paid_amount, now, student_id],
        )?;

        // Commit transaction
        tx.commit()?;

        // Log audit entry for payment deletion
        if let Some(transaction) = payment_transaction {
            if let Ok(serialized_data) = AuditService::serialize_data(&transaction) {
                let _ = AuditService::log_delete(db, "payment_transactions", &payment_id.to_string(), &serialized_data, None);
            }
        }

        // Recalculate payment status for the student
        Self::update_student_payment_status(db, &student_id)?;

        Ok(true)
    }



    /// Get payment summary for a specific student
    pub fn get_student_payment_summary(
        db: &Database,
        student_id: &str,
    ) -> DatabaseResult<StudentPaymentSummary> {
        let student = StudentService::get_student_by_id(db, student_id)?
            .ok_or_else(|| DatabaseError::Migration(format!("Student with ID {} not found", student_id)))?;

        // Get payment history for this student
        let payments = Self::get_student_payment_history(db, student_id)?;
        
        // Calculate expected amount using centralized method
        let expected_amount = Self::calculate_expected_amount(
            &student.payment_plan,
            student.plan_amount,
            &student.enrollment_date,
            student.installment_count,
        )?;

        let remaining_amount = (expected_amount - student.paid_amount as i64).max(0);
        let payment_percentage = if expected_amount > 0 {
            ((student.paid_amount as i64 * 100) / expected_amount) as f64
        } else {
            100.0
        };

        Ok(StudentPaymentSummary {
            student_id: student.id,
            student_name: student.name,
            payment_plan: student.payment_plan,
            plan_amount: student.plan_amount,
            paid_amount: student.paid_amount,
            expected_amount,
            remaining_amount,
            payment_percentage,
            payment_status: student.payment_status,
            next_due_date: student.next_due_date,
            total_transactions: payments.len() as i32,
            last_payment_date: payments.first().map(|p| p.payment_date.clone()),
            recent_payments: payments.into_iter().take(5).collect(),
        })
    }

    /// Get overdue payments report
    pub fn get_overdue_payments_report(db: &Database) -> DatabaseResult<Vec<OverduePaymentInfo>> {
        let query = r#"
            SELECT 
                id, name, payment_plan, plan_amount, paid_amount, 
                next_due_date, enrollment_date, installment_count
            FROM students 
            WHERE payment_status = 'overdue'
            ORDER BY next_due_date ASC
        "#;

        let mut stmt = db.connection().prepare(query)?;
        let overdue_iter = stmt.query_map([], |row| {
            let payment_plan_str: String = row.get(2)?;
            let payment_plan = match payment_plan_str.as_str() {
                "one_time" => PaymentPlan::OneTime,
                "monthly" => PaymentPlan::Monthly,
                "installment" => PaymentPlan::Installment,
                _ => PaymentPlan::OneTime,
            };

            let plan_amount: i32 = row.get(3)?;
            let paid_amount: i32 = row.get(4)?;
            let next_due_date: Option<String> = row.get(5)?;
            let enrollment_date: String = row.get(6)?;
            let installment_count: Option<i32> = row.get(7)?;

            // Calculate expected amount using centralized method
            let expected_amount = Self::calculate_expected_amount(
                &payment_plan,
                plan_amount,
                &enrollment_date,
                installment_count,
            ).unwrap_or(plan_amount as i64);

            let overdue_amount = (expected_amount - paid_amount as i64).max(0);
            
            // Calculate days overdue
            let days_overdue = if let Some(due_date) = &next_due_date {
                if let Ok(due) = NaiveDate::parse_from_str(due_date, "%Y-%m-%d") {
                    (Utc::now().date_naive() - due).num_days().max(0)
                } else {
                    0
                }
            } else {
                0
            };

            Ok(OverduePaymentInfo {
                student_id: row.get(0)?,
                student_name: row.get(1)?,
                payment_plan,
                expected_amount,
                paid_amount: paid_amount as i64,
                overdue_amount,
                next_due_date,
                days_overdue,
            })
        })?;

        overdue_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get payment statistics for a specific date range
    pub fn get_payment_statistics(
        db: &Database,
        start_date: Option<&str>,
        end_date: Option<&str>,
    ) -> DatabaseResult<PaymentStatistics> {
        let mut query = "SELECT COUNT(*) as transaction_count, SUM(amount) as total_amount, AVG(amount) as average_amount FROM payment_transactions".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        if let Some(start) = start_date {
            conditions.push("payment_date >= ?".to_string());
            params.push(Box::new(start.to_string()));
        }

        if let Some(end) = end_date {
            conditions.push("payment_date <= ?".to_string());
            params.push(Box::new(end.to_string()));
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        
        let (transaction_count, total_amount, average_amount) = db.connection().query_row(
            &query,
            &param_refs[..],
            |row| {
                Ok((
                    row.get::<_, i32>(0)?,
                    row.get::<_, Option<i64>>(1)?.unwrap_or(0),
                    row.get::<_, Option<f64>>(2)?.unwrap_or(0.0),
                ))
            },
        )?;

        // Get payment method breakdown
        let mut method_query = "SELECT payment_method, COUNT(*) as count, SUM(amount) as total FROM payment_transactions".to_string();
        if !conditions.is_empty() {
            method_query.push_str(" WHERE ");
            method_query.push_str(&conditions.join(" AND "));
        }
        method_query.push_str(" GROUP BY payment_method");

        let mut stmt = db.connection().prepare(&method_query)?;
        let method_iter = stmt.query_map(&param_refs[..], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i32>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;

        let mut cash_count = 0;
        let mut cash_total = 0i64;
        let mut bank_transfer_count = 0;
        let mut bank_transfer_total = 0i64;
        let mut check_count = 0;
        let mut check_total = 0i64;

        for method_result in method_iter {
            let (method, count, total) = method_result.map_err(DatabaseError::from)?;
            match method.as_str() {
                "cash" => {
                    cash_count = count;
                    cash_total = total;
                }
                "bank_transfer" => {
                    bank_transfer_count = count;
                    bank_transfer_total = total;
                }
                "check" => {
                    check_count = count;
                    check_total = total;
                }
                _ => {}
            }
        }

        Ok(PaymentStatistics {
            transaction_count,
            total_amount,
            average_amount,
            payment_method_breakdown: PaymentMethodBreakdown {
                cash: PaymentMethodStats {
                    count: cash_count,
                    total_amount: cash_total,
                },
                bank_transfer: PaymentMethodStats {
                    count: bank_transfer_count,
                    total_amount: bank_transfer_total,
                },
                check: PaymentMethodStats {
                    count: check_count,
                    total_amount: check_total,
                },
            },
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentStatistics {
    pub transaction_count: i32,
    pub total_amount: i64,
    pub average_amount: f64,
    pub payment_method_breakdown: PaymentMethodBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethodBreakdown {
    pub cash: PaymentMethodStats,
    pub bank_transfer: PaymentMethodStats,
    pub check: PaymentMethodStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethodStats {
    pub count: i32,
    pub total_amount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentPaymentSummary {
    pub student_id: String,
    pub student_name: String,
    pub payment_plan: PaymentPlan,
    pub plan_amount: i32,
    pub paid_amount: i32,
    pub expected_amount: i64,
    pub remaining_amount: i64,
    pub payment_percentage: f64,
    pub payment_status: PaymentStatus,
    pub next_due_date: Option<String>,
    pub total_transactions: i32,
    pub last_payment_date: Option<String>,
    pub recent_payments: Vec<PaymentTransaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverduePaymentInfo {
    pub student_id: String,
    pub student_name: String,
    pub payment_plan: PaymentPlan,
    pub expected_amount: i64,
    pub paid_amount: i64,
    pub overdue_amount: i64,
    pub next_due_date: Option<String>,
    pub days_overdue: i64,
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use crate::student_service::{StudentService, CreateStudentRequest, PaymentPlan};
    use tempfile::tempdir;
    fn create_test_database() -> Database {
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let db_path = temp_dir.path().to_path_buf();
        Database::new(db_path).expect("Failed to create test database")
    }

    fn create_test_student(db: &Database, name: &str, payment_plan: PaymentPlan, plan_amount: i32) -> String {
        let installment_count = if payment_plan == PaymentPlan::Installment { Some(3) } else { None };
        let request = CreateStudentRequest {
            name: name.to_string(),
            group_name: "Test Group".to_string(),
            payment_plan,
            plan_amount,
            installment_count,
        };
        
        let student = StudentService::create_student(db, request).expect("Failed to create test student");
        student.id
    }

    #[test]
    fn test_validate_payment_data() {
        // Valid data should pass
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_ok());

        // Empty student ID should fail
        assert!(PaymentService::validate_payment_data(
            "",
            1000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Negative amount should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            -100,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Zero amount should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            0,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Amount too large should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            2_000_000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Invalid date format should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "15-01-2024",
            &PaymentMethod::Cash
        ).is_err());

        // Invalid date should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "2024-13-01",
            &PaymentMethod::Cash
        ).is_err());
    }

    #[test]
    fn test_payment_method_serialization() {
        assert_eq!(PaymentMethod::Cash.as_str(), "cash");
        assert_eq!(PaymentMethod::BankTransfer.as_str(), "bank_transfer");
        assert_eq!(PaymentMethod::Check.as_str(), "check");

        assert_eq!(PaymentMethod::from_str("cash").unwrap(), PaymentMethod::Cash);
        assert_eq!(PaymentMethod::from_str("bank_transfer").unwrap(), PaymentMethod::BankTransfer);
        assert_eq!(PaymentMethod::from_str("check").unwrap(), PaymentMethod::Check);

        assert!(PaymentMethod::from_str("invalid").is_err());
    }

    #[test]
    fn test_record_payment_success() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::OneTime, 6000);

        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: 3000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: Some("First payment".to_string()),
        };

        let payment = PaymentService::record_payment(&db, request).expect("Failed to record payment");

        assert_eq!(payment.student_id, student_id);
        assert_eq!(payment.amount, 3000);
        assert_eq!(payment.payment_date, "2024-01-15");
        assert_eq!(payment.payment_method, PaymentMethod::Cash);
        assert_eq!(payment.notes, Some("First payment".to_string()));

        // Verify student's paid amount was updated
        let updated_student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(updated_student.paid_amount, 3000);
    }

    #[test]
    fn test_record_payment_nonexistent_student() {
        let db = create_test_database();

        let request = RecordPaymentRequest {
            student_id: "NONEXISTENT".to_string(),
            amount: 1000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        let result = PaymentService::record_payment(&db, request);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn test_get_student_payment_history() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::Monthly, 850);

        // Record multiple payments
        let payments = vec![
            RecordPaymentRequest {
                student_id: student_id.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: Some("January payment".to_string()),
            },
            RecordPaymentRequest {
                student_id: student_id.clone(),
                amount: 850,
                payment_date: "2024-02-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: Some("February payment".to_string()),
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        // Get payment history
        let history = PaymentService::get_student_payment_history(&db, &student_id)
            .expect("Failed to get payment history");

        assert_eq!(history.len(), 2);
        
        // Should be ordered by payment_date DESC
        assert_eq!(history[0].payment_date, "2024-02-15");
        assert_eq!(history[1].payment_date, "2024-01-15");
    }

    #[test]
    fn test_get_payment_summary() {
        let db = create_test_database();
        
        // Create students with different payment plans
        let student1_id = create_test_student(&db, "Student 1", PaymentPlan::OneTime, 6000);
        let student2_id = create_test_student(&db, "Student 2", PaymentPlan::Monthly, 850);

        // Record some payments
        let payments = vec![
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 6000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student2_id.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: None,
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        let summary = PaymentService::get_payment_summary(&db)
            .expect("Failed to get payment summary");

        assert_eq!(summary.total_students, 2);
        assert_eq!(summary.total_paid_amount, 6850);

        // Check payment plan breakdown
        assert_eq!(summary.payment_plan_breakdown.one_time.total_students, 1);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_students, 1);

        assert_eq!(summary.payment_plan_breakdown.one_time.total_paid, 6000);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_paid, 850);
    }

    #[test]
    fn test_payment_service_integration() {
        let db = create_test_database();
        
        // Create students with different payment plans
        let one_time_student = create_test_student(&db, "One Time Student", PaymentPlan::OneTime, 6000);
        let monthly_student = create_test_student(&db, "Monthly Student", PaymentPlan::Monthly, 850);
        let installment_student = create_test_student(&db, "Installment Student", PaymentPlan::Installment, 2850);

        // Record payments for each student
        let payments = vec![
            // One-time student - full payment
            RecordPaymentRequest {
                student_id: one_time_student.clone(),
                amount: 6000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: Some("Full payment".to_string()),
            },
            // Monthly student - first month
            RecordPaymentRequest {
                student_id: monthly_student.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: Some("January payment".to_string()),
            },
            // Monthly student - second month
            RecordPaymentRequest {
                student_id: monthly_student.clone(),
                amount: 850,
                payment_date: "2024-02-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: Some("February payment".to_string()),
            },
            // Installment student - first installment
            RecordPaymentRequest {
                student_id: installment_student.clone(),
                amount: 2850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Check,
                notes: Some("First installment".to_string()),
            },
        ];

        // Record all payments
        for payment_request in payments {
            let payment = PaymentService::record_payment(&db, payment_request)
                .expect("Failed to record payment");
            assert!(payment.id > 0);
        }

        // Test payment history retrieval
        let all_payments = PaymentService::get_payment_history(&db, None)
            .expect("Failed to get payment history");
        assert_eq!(all_payments.len(), 4);

        // Test student-specific payment history
        let monthly_payments = PaymentService::get_student_payment_history(&db, &monthly_student)
            .expect("Failed to get student payment history");
        assert_eq!(monthly_payments.len(), 2);
        assert_eq!(monthly_payments[0].payment_date, "2024-02-15"); // Most recent first
        assert_eq!(monthly_payments[1].payment_date, "2024-01-15");

        // Test payment summary
        let summary = PaymentService::get_payment_summary(&db)
            .expect("Failed to get payment summary");
        
        assert_eq!(summary.total_students, 3);
        assert_eq!(summary.total_paid_amount, 10550); // 6000 + 850 + 850 + 2850
        
        // Verify payment plan breakdown
        assert_eq!(summary.payment_plan_breakdown.one_time.total_students, 1);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_students, 1);
        assert_eq!(summary.payment_plan_breakdown.installment.total_students, 1);
        
        assert_eq!(summary.payment_plan_breakdown.one_time.total_paid, 6000);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_paid, 1700);
        assert_eq!(summary.payment_plan_breakdown.installment.total_paid, 2850);

        // Test payment statistics
        let stats = PaymentService::get_payment_statistics(&db, None, None)
            .expect("Failed to get payment statistics");
        
        assert_eq!(stats.transaction_count, 4);
        assert_eq!(stats.total_amount, 10550);
        assert_eq!(stats.average_amount, 2637.5);
        
        // Verify payment method breakdown
        assert_eq!(stats.payment_method_breakdown.cash.count, 1);
        assert_eq!(stats.payment_method_breakdown.cash.total_amount, 6000);
        assert_eq!(stats.payment_method_breakdown.bank_transfer.count, 2);
        assert_eq!(stats.payment_method_breakdown.bank_transfer.total_amount, 1700);
        assert_eq!(stats.payment_method_breakdown.check.count, 1);
        assert_eq!(stats.payment_method_breakdown.check.total_amount, 2850);

        // Test payment status updates
        PaymentService::update_all_payment_statuses(&db)
            .expect("Failed to update payment statuses");

        // Verify student payment statuses were updated correctly
        let one_time_student_updated = StudentService::get_student_by_id(&db, &one_time_student)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(one_time_student_updated.payment_status, PaymentStatus::Paid);
        assert_eq!(one_time_student_updated.paid_amount, 6000);

        let monthly_student_updated = StudentService::get_student_by_id(&db, &monthly_student)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(monthly_student_updated.paid_amount, 1700);

        let installment_student_updated = StudentService::get_student_by_id(&db, &installment_student)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(installment_student_updated.paid_amount, 2850);

        // Test payment filtering
        let cash_payments = PaymentService::get_payment_history(&db, Some(PaymentHistoryFilter {
            student_id: None,
            start_date: None,
            end_date: None,
            payment_method: Some(PaymentMethod::Cash),
            min_amount: None,
            max_amount: None,
        })).expect("Failed to get filtered payments");
        assert_eq!(cash_payments.len(), 1);
        assert_eq!(cash_payments[0].amount, 6000);

        // Test date range filtering
        let january_payments = PaymentService::get_payment_history(&db, Some(PaymentHistoryFilter {
            student_id: None,
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-01-31".to_string()),
            payment_method: None,
            min_amount: None,
            max_amount: None,
        })).expect("Failed to get filtered payments");
        assert_eq!(january_payments.len(), 3); // All except February payment

        // Test amount range filtering
        let large_payments = PaymentService::get_payment_history(&db, Some(PaymentHistoryFilter {
            student_id: None,
            start_date: None,
            end_date: None,
            payment_method: None,
            min_amount: Some(2000),
            max_amount: None,
        })).expect("Failed to get filtered payments");
        assert_eq!(large_payments.len(), 2); // 6000 and 2850 payments

        println!("Payment service integration test completed successfully!");
    }
}