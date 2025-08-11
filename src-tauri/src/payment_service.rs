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
    pub fn validate_payment_data(
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


