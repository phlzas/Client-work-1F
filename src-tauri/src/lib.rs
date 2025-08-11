pub mod attendance_service;
pub mod audit_service;
pub mod backup_service;
pub mod database;
pub mod export_service;
pub mod groups_service;
pub mod payment_service;
pub mod payment_settings_service;
pub mod qr_service;
pub mod scanner_lock;
pub mod settings_service;
pub mod student_service;

// Re-export commonly used types and services
pub use attendance_service::{
    AttendanceHistoryFilter, AttendanceRecord, AttendanceService, AttendanceStats,
    DailyAttendanceSummary,
};
pub use audit_service::{AuditLogEntry, AuditLogFilter, AuditService, AuditStatistics};
pub use backup_service::{BackupMetadata, BackupService, BackupValidationResult, RestoreResult};
pub use database::{
    AppliedMigration, Database, DatabaseError, DatabaseResult, Migration, MigrationValidation,
    RollbackInfo, SchemaInfo,
};
pub use export_service::ExportService;
pub use groups_service::{
    CreateGroupRequest, Group, GroupStatistics, GroupWithStudentCount, GroupsService,
    UpdateGroupRequest,
};
pub use payment_service::{
    PaymentHistoryFilter, PaymentMethod, PaymentService, PaymentStatistics, PaymentSummary,
    PaymentTransaction, RecordPaymentRequest,
};
pub use payment_settings_service::{
    PaymentConfig, PaymentSettings, PaymentSettingsHistoryEntry, PaymentSettingsService,
    UpdatePaymentSettingsRequest,
};
pub use qr_service::{QRCodeBatch, QRCodeData, QRCodeStatistics, QRService};
pub use settings_service::{
    AppSettings, PaymentPlanConfig as SettingsPaymentPlanConfig, SettingRecord, SettingsService,
};
pub use student_service::{
    CreateStudentRequest, PaymentPlan, PaymentPlanConfig, Student, StudentService,
    StudentStatistics, StudentWithAttendance, UpdateStudentRequest,
};

// Internal imports
use std::sync::Mutex;
use tauri::{Manager, State};

// Global database instance
pub struct AppState {
    pub db: Mutex<Database>,
}

// Student-related IPC commands
#[tauri::command]
async fn get_all_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_all_students(&db).map_err(|e| format!("Failed to get students: {}", e))
}

#[tauri::command]
async fn get_all_students_with_attendance(
    state: State<'_, AppState>,
) -> Result<Vec<StudentWithAttendance>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_all_students_with_attendance(&db)
        .map_err(|e| format!("Failed to get students with attendance: {}", e))
}

#[tauri::command]
async fn add_student(
    state: State<'_, AppState>,
    name: String,
    #[allow(non_snake_case)] groupName: String,
    #[allow(non_snake_case)] paymentPlan: String,
    #[allow(non_snake_case)] planAmount: i32,
    #[allow(non_snake_case)] installmentCount: Option<i32>,
    #[allow(non_snake_case)] paidAmount: Option<i32>,
    #[allow(non_snake_case)] enrollmentDate: Option<String>,
) -> Result<Student, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    let payment_plan_enum =
        PaymentPlan::from_str(&paymentPlan).map_err(|e| format!("Invalid payment plan: {}", e))?;
    let request = CreateStudentRequest {
        name,
        group_name: groupName,
        payment_plan: payment_plan_enum,
        plan_amount: planAmount,
        installment_count: installmentCount,
        paid_amount: paidAmount,
        enrollment_date: enrollmentDate,
    };
    StudentService::create_student(&db, request)
        .map_err(|e| format!("Failed to create student: {}", e))
}

#[tauri::command]
async fn update_student(
    state: State<'_, AppState>,
    id: String,
    name: String,
    #[allow(non_snake_case)] groupName: String,
    #[allow(non_snake_case)] paymentPlan: String,
    #[allow(non_snake_case)] planAmount: i32,
    #[allow(non_snake_case)] installmentCount: Option<i32>,
    #[allow(non_snake_case)] paidAmount: Option<i32>,
    #[allow(non_snake_case)] enrollmentDate: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    let payment_plan_enum =
        PaymentPlan::from_str(&paymentPlan).map_err(|e| format!("Invalid payment plan: {}", e))?;
    let request = UpdateStudentRequest {
        name,
        group_name: groupName,
        payment_plan: payment_plan_enum,
        plan_amount: planAmount,
        installment_count: installmentCount,
        enrollment_date: enrollmentDate,
        paid_amount: paidAmount,
    };
    StudentService::update_student(&db, &id, request)
        .map_err(|e| format!("Failed to update student: {}", e))
}

#[tauri::command]
async fn delete_student(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::delete_student(&db, &id).map_err(|e| format!("Failed to delete student: {}", e))
}

#[tauri::command]
async fn get_student_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_by_id(&db, &id).map_err(|e| format!("Failed to get student: {}", e))
}

#[tauri::command]
async fn get_students_by_group(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] groupName: String,
) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_students_by_group(&db, &groupName)
        .map_err(|e| format!("Failed to get students by group: {}", e))
}

#[tauri::command]
async fn get_students_by_payment_status(
    state: State<'_, AppState>,
    status: String,
) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_students_by_payment_status(&db, &status)
        .map_err(|e| format!("Failed to get students by payment status: {}", e))
}

#[tauri::command]
async fn get_overdue_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_overdue_students(&db)
        .map_err(|e| format!("Failed to get overdue students: {}", e))
}

#[tauri::command]
async fn get_due_soon_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_due_soon_students(&db)
        .map_err(|e| format!("Failed to get due soon students: {}", e))
}

#[tauri::command]
async fn update_payment_statuses(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::update_payment_statuses(&db)
        .map_err(|e| format!("Failed to update payment statuses: {}", e))
}

#[tauri::command]
async fn get_payment_plan_config(state: State<'_, AppState>) -> Result<PaymentPlanConfig, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_payment_plan_config(&db)
        .map_err(|e| format!("Failed to get payment plan config: {}", e))
}

#[tauri::command]
async fn get_student_statistics(state: State<'_, AppState>) -> Result<StudentStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_statistics(&db)
        .map_err(|e| format!("Failed to get student statistics: {}", e))
}

// Attendance-related IPC commands
#[tauri::command]
async fn mark_attendance(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: String,
    date: String,
) -> Result<AttendanceRecord, String> {
    let mut db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::mark_attendance(&mut *db, &studentId, &date)
        .map_err(|e| format!("Failed to mark attendance: {}", e))
}

#[tauri::command]
async fn check_attendance_today(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: String,
) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::check_attendance_today(&db, &studentId)
        .map_err(|e| format!("Failed to check attendance: {}", e))
}

#[tauri::command]
async fn check_attendance_on_date(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: String,
    date: String,
) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::check_attendance_on_date(&db, &studentId, &date)
        .map_err(|e| format!("Failed to check attendance: {}", e))
}

#[tauri::command]
async fn get_attendance_history(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: Option<String>,
    #[allow(non_snake_case)] startDate: Option<String>,
    #[allow(non_snake_case)] endDate: Option<String>,
    #[allow(non_snake_case)] groupName: Option<String>,
) -> Result<Vec<AttendanceRecord>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let filter =
        if studentId.is_some() || startDate.is_some() || endDate.is_some() || groupName.is_some() {
            Some(AttendanceHistoryFilter {
                student_id: studentId,
                start_date: startDate,
                end_date: endDate,
                group_name: groupName,
            })
        } else {
            None
        };

    AttendanceService::get_attendance_history(&db, filter)
        .map_err(|e| format!("Failed to get attendance history: {}", e))
}

#[tauri::command]
async fn get_student_attendance_history(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: String,
) -> Result<Vec<AttendanceRecord>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_student_attendance_history(&db, &studentId)
        .map_err(|e| format!("Failed to get student attendance history: {}", e))
}

#[tauri::command]
async fn get_student_attendance_stats(
    state: State<'_, AppState>,
    student_id: String,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<AttendanceStats, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_student_attendance_stats(
        &db,
        &student_id,
        start_date.as_deref(),
        end_date.as_deref(),
    )
    .map_err(|e| format!("Failed to get attendance stats: {}", e))
}

#[tauri::command]
async fn get_daily_attendance_summary(
    state: State<'_, AppState>,
    date: String,
    group_name: Option<String>,
) -> Result<DailyAttendanceSummary, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_daily_attendance_summary(&db, &date, group_name.as_deref())
        .map_err(|e| format!("Failed to get daily attendance summary: {}", e))
}

#[tauri::command]
async fn get_attendance_summary_range(
    state: State<'_, AppState>,
    start_date: String,
    end_date: String,
    group_name: Option<String>,
) -> Result<Vec<DailyAttendanceSummary>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_attendance_summary_range(
        &db,
        &start_date,
        &end_date,
        group_name.as_deref(),
    )
    .map_err(|e| format!("Failed to get attendance summary range: {}", e))
}

#[tauri::command]
async fn delete_attendance(
    state: State<'_, AppState>,
    student_id: String,
    date: String,
) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::delete_attendance(&db, &student_id, &date)
        .map_err(|e| format!("Failed to delete attendance: {}", e))
}

#[tauri::command]
async fn get_current_date() -> Result<String, String> {
    Ok(AttendanceService::get_current_date())
}

#[tauri::command]
async fn format_date(date_str: String) -> Result<String, String> {
    AttendanceService::format_date(&date_str).map_err(|e| format!("Failed to format date: {}", e))
}

// Payment-related IPC commands
#[tauri::command]
async fn record_payment(
    state: State<'_, AppState>,
    student_id: String,
    amount: i32,
    payment_date: String,
    payment_method: String,
    notes: Option<String>,
) -> Result<PaymentTransaction, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    let payment_method_enum = PaymentMethod::from_str(&payment_method)
        .map_err(|e| format!("Invalid payment method: {}", e))?;
    let request = RecordPaymentRequest {
        student_id,
        amount,
        payment_date,
        payment_method: payment_method_enum,
        notes,
    };
    PaymentService::record_payment(&db, request)
        .map_err(|e| format!("Failed to record payment: {}", e))
}

#[tauri::command]
async fn get_payment_history(
    state: State<'_, AppState>,
    student_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    payment_method: Option<String>,
    min_amount: Option<i32>,
    max_amount: Option<i32>,
) -> Result<Vec<PaymentTransaction>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let payment_method_enum = if let Some(method) = payment_method {
        Some(
            PaymentMethod::from_str(&method)
                .map_err(|e| format!("Invalid payment method: {}", e))?,
        )
    } else {
        None
    };

    let filter = if student_id.is_some()
        || start_date.is_some()
        || end_date.is_some()
        || payment_method_enum.is_some()
        || min_amount.is_some()
        || max_amount.is_some()
    {
        Some(PaymentHistoryFilter {
            student_id,
            start_date,
            end_date,
            payment_method: payment_method_enum,
            min_amount,
            max_amount,
        })
    } else {
        None
    };

    PaymentService::get_payment_history(&db, filter)
        .map_err(|e| format!("Failed to get payment history: {}", e))
}

#[tauri::command]
async fn get_student_payment_history(
    state: State<'_, AppState>,
    student_id: String,
) -> Result<Vec<PaymentTransaction>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::get_student_payment_history(&db, &student_id)
        .map_err(|e| format!("Failed to get student payment history: {}", e))
}

#[tauri::command]
async fn get_payment_summary(state: State<'_, AppState>) -> Result<PaymentSummary, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::get_payment_summary(&db)
        .map_err(|e| format!("Failed to get payment summary: {}", e))
}

#[tauri::command]
async fn update_student_payment_status(
    state: State<'_, AppState>,
    student_id: String,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::update_student_payment_status(&db, &student_id)
        .map_err(|e| format!("Failed to update student payment status: {}", e))
}

#[tauri::command]
async fn update_all_payment_statuses(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::update_all_payment_statuses(&db)
        .map(|_| ())
        .map_err(|e| format!("Failed to update all payment statuses: {}", e))
}

#[tauri::command]
async fn delete_payment(state: State<'_, AppState>, payment_id: i32) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::delete_payment(&db, payment_id)
        .map_err(|e| format!("Failed to delete payment: {}", e))
}

#[tauri::command]
async fn get_payment_statistics(
    state: State<'_, AppState>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<PaymentStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentService::get_payment_statistics(&db, start_date.as_deref(), end_date.as_deref())
        .map_err(|e| format!("Failed to get payment statistics: {}", e))
}

// Settings-related IPC commands
#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::get_settings(&db).map_err(|e| format!("Failed to get settings: {}", e))
}

#[tauri::command]
async fn update_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::update_settings(&db, settings)
        .map_err(|e| format!("Failed to update settings: {}", e))
}

#[tauri::command]
async fn get_payment_plan_config_settings(
    state: State<'_, AppState>,
) -> Result<SettingsPaymentPlanConfig, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::get_payment_plan_config(&db)
        .map_err(|e| format!("Failed to get payment plan config: {}", e))
}

#[tauri::command]
async fn update_payment_plan_config_settings(
    state: State<'_, AppState>,
    config: SettingsPaymentPlanConfig,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::update_payment_plan_config(&db, config)
        .map_err(|e| format!("Failed to update payment plan config: {}", e))
}

#[tauri::command]
async fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::get_setting(&db, &key).map_err(|e| format!("Failed to get setting: {}", e))
}

#[tauri::command]
async fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::set_setting(&db, &key, &value)
        .map_err(|e| format!("Failed to set setting: {}", e))
}

#[tauri::command]
async fn get_all_settings(state: State<'_, AppState>) -> Result<Vec<SettingRecord>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::get_all_settings(&db).map_err(|e| format!("Failed to get all settings: {}", e))
}

#[tauri::command]
async fn delete_setting(state: State<'_, AppState>, key: String) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::delete_setting(&db, &key)
        .map_err(|e| format!("Failed to delete setting: {}", e))
}

#[tauri::command]
async fn reset_settings_to_defaults(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::reset_to_defaults(&db)
        .map_err(|e| format!("Failed to reset settings to defaults: {}", e))
}

#[tauri::command]
async fn validate_settings(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    SettingsService::validate_settings(&db)
        .map_err(|e| format!("Failed to validate settings: {}", e))
}

// Audit-related IPC commands
#[tauri::command]
async fn get_audit_log(
    state: State<'_, AppState>,
    table_name: Option<String>,
    record_id: Option<String>,
    action_type: Option<String>,
    user_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<AuditLogEntry>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    let filter = if table_name.is_some()
        || record_id.is_some()
        || action_type.is_some()
        || user_id.is_some()
        || start_date.is_some()
        || end_date.is_some()
    {
        Some(AuditLogFilter {
            table_name,
            record_id,
            action_type,
            user_id,
            start_date,
            end_date,
        })
    } else {
        None
    };

    AuditService::get_audit_log(&db, filter).map_err(|e| format!("Failed to get audit log: {}", e))
}

#[tauri::command]
async fn get_record_history(
    state: State<'_, AppState>,
    table_name: String,
    record_id: String,
) -> Result<Vec<AuditLogEntry>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AuditService::get_record_history(&db, &table_name, &record_id)
        .map_err(|e| format!("Failed to get record history: {}", e))
}

#[tauri::command]
async fn get_recent_audit_activity(
    state: State<'_, AppState>,
) -> Result<Vec<AuditLogEntry>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AuditService::get_recent_activity(&db)
        .map_err(|e| format!("Failed to get recent audit activity: {}", e))
}

#[tauri::command]
async fn get_audit_statistics(state: State<'_, AppState>) -> Result<AuditStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AuditService::get_audit_statistics(&db)
        .map_err(|e| format!("Failed to get audit statistics: {}", e))
}

#[tauri::command]
async fn cleanup_old_audit_entries(
    state: State<'_, AppState>,
    days_to_keep: i32,
) -> Result<i32, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AuditService::cleanup_old_entries(&db, days_to_keep)
        .map_err(|e| format!("Failed to cleanup old audit entries: {}", e))
}

// Groups-related IPC commands
#[tauri::command]
async fn get_all_groups(state: State<'_, AppState>) -> Result<Vec<Group>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_all_groups(&db).map_err(|e| format!("Failed to get all groups: {}", e))
}

#[tauri::command]
async fn get_all_groups_with_counts(
    state: State<'_, AppState>,
) -> Result<Vec<GroupWithStudentCount>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_all_groups_with_counts(&db)
        .map_err(|e| format!("Failed to get groups with counts: {}", e))
}

#[tauri::command]
async fn get_group_by_id(state: State<'_, AppState>, id: i32) -> Result<Option<Group>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_group_by_id(&db, id).map_err(|e| format!("Failed to get group by ID: {}", e))
}

#[tauri::command]
async fn get_group_by_name(
    state: State<'_, AppState>,
    name: String,
) -> Result<Option<Group>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_group_by_name(&db, &name)
        .map_err(|e| format!("Failed to get group by name: {}", e))
}

#[tauri::command]
async fn add_group(state: State<'_, AppState>, name: String) -> Result<Group, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate group name
    GroupsService::validate_group_name(&name).map_err(|e| format!("Invalid group name: {}", e))?;

    let request = CreateGroupRequest { name };
    GroupsService::create_group(&db, request).map_err(|e| format!("Failed to create group: {}", e))
}

#[tauri::command]
async fn update_group(state: State<'_, AppState>, id: i32, name: String) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;

    // Validate group name
    GroupsService::validate_group_name(&name).map_err(|e| format!("Invalid group name: {}", e))?;

    let request = UpdateGroupRequest { name };
    GroupsService::update_group(&db, id, request)
        .map_err(|e| format!("Failed to update group: {}", e))
}

#[tauri::command]
async fn delete_group(state: State<'_, AppState>, id: i32) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::delete_group(&db, id).map_err(|e| format!("Failed to delete group: {}", e))
}

#[tauri::command]
async fn force_delete_group_with_reassignment(
    state: State<'_, AppState>,
    id: i32,
    default_group_name: String,
) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::force_delete_group_with_reassignment(&db, id, &default_group_name)
        .map_err(|e| format!("Failed to force delete group: {}", e))
}

#[tauri::command]
async fn get_students_count_by_group_id(
    state: State<'_, AppState>,
    group_id: i32,
) -> Result<i32, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_students_count_by_group_id(&db, group_id)
        .map_err(|e| format!("Failed to get students count: {}", e))
}

#[tauri::command]
async fn get_students_count_by_group_name(
    state: State<'_, AppState>,
    group_name: String,
) -> Result<i32, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_students_count_by_group_name(&db, &group_name)
        .map_err(|e| format!("Failed to get students count: {}", e))
}

#[tauri::command]
async fn ensure_default_groups_exist(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::ensure_default_groups_exist(&db)
        .map_err(|e| format!("Failed to ensure default groups exist: {}", e))
}

#[tauri::command]
async fn get_group_statistics(state: State<'_, AppState>) -> Result<GroupStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    GroupsService::get_group_statistics(&db)
        .map_err(|e| format!("Failed to get group statistics: {}", e))
}

#[tauri::command]
async fn validate_group_name(name: String) -> Result<(), String> {
    GroupsService::validate_group_name(&name)
}

// Payment Settings-related IPC commands
#[tauri::command]
async fn get_payment_settings(state: State<'_, AppState>) -> Result<PaymentSettings, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::get_payment_settings(&db)
        .map_err(|e| format!("Failed to get payment settings: {}", e))
}

#[tauri::command]
async fn update_payment_settings(
    state: State<'_, AppState>,
    settings: UpdatePaymentSettingsRequest,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::update_payment_settings(&db, settings)
        .map_err(|e| format!("Failed to update payment settings: {}", e))
}

#[tauri::command]
async fn reset_payment_settings_to_defaults(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::reset_to_defaults(&db)
        .map_err(|e| format!("Failed to reset payment settings: {}", e))
}

#[tauri::command]
async fn get_payment_config(state: State<'_, AppState>) -> Result<PaymentConfig, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::get_payment_config(&db)
        .map_err(|e| format!("Failed to get payment config: {}", e))
}

#[tauri::command]
async fn get_payment_settings_history(
    state: State<'_, AppState>,
) -> Result<Vec<PaymentSettingsHistoryEntry>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::get_settings_history(&db)
        .map_err(|e| format!("Failed to get payment settings history: {}", e))
}

#[tauri::command]
async fn ensure_payment_settings_exist(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::ensure_settings_exist(&db)
        .map_err(|e| format!("Failed to ensure payment settings exist: {}", e))
}

#[tauri::command]
async fn get_amount_for_plan(state: State<'_, AppState>, plan_type: String) -> Result<i32, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::get_amount_for_plan(&db, &plan_type)
        .map_err(|e| format!("Failed to get amount for plan: {}", e))
}

#[tauri::command]
async fn update_specific_payment_setting(
    state: State<'_, AppState>,
    setting_name: String,
    value: i32,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    PaymentSettingsService::update_specific_setting(&db, &setting_name, value)
        .map_err(|e| format!("Failed to update specific setting: {}", e))
}

#[tauri::command]
async fn validate_payment_settings_request(
    settings: UpdatePaymentSettingsRequest,
) -> Result<(), String> {
    PaymentSettingsService::validate_payment_settings(&settings)
        .map_err(|e| format!("Invalid payment settings: {}", e))
}

// Migration-related IPC commands
#[tauri::command]
async fn get_migration_history(
    state: State<'_, AppState>,
) -> Result<Vec<AppliedMigration>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_migration_history()
        .map_err(|e| format!("Failed to get migration history: {}", e))
}

#[tauri::command]
async fn get_schema_info(state: State<'_, AppState>) -> Result<SchemaInfo, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_schema_info()
        .map_err(|e| format!("Failed to get schema info: {}", e))
}

#[tauri::command]
async fn validate_migrations(state: State<'_, AppState>) -> Result<MigrationValidation, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.validate_migrations()
        .map_err(|e| format!("Failed to validate migrations: {}", e))
}

#[tauri::command]
async fn force_apply_migration(state: State<'_, AppState>, version: i32) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.force_apply_migration(version)
        .map_err(|e| format!("Failed to force apply migration: {}", e))
}

#[tauri::command]
async fn mark_migration_applied(
    state: State<'_, AppState>,
    version: i32,
    description: String,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.mark_migration_applied(version, description)
        .map_err(|e| format!("Failed to mark migration as applied: {}", e))
}

#[tauri::command]
async fn get_pending_migrations(state: State<'_, AppState>) -> Result<Vec<Migration>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_pending_migrations()
        .map_err(|e| format!("Failed to get pending migrations: {}", e))
}

#[tauri::command]
async fn get_all_migrations(state: State<'_, AppState>) -> Result<Vec<Migration>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    Ok(db.get_migrations())
}

#[tauri::command]
async fn check_migration_integrity(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    let validation = db
        .validate_migrations()
        .map_err(|e| format!("Failed to validate migrations: {}", e))?;
    Ok(validation.is_valid)
}

#[tauri::command]
async fn get_rollback_info(
    state: State<'_, AppState>,
    target_version: i32,
) -> Result<RollbackInfo, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_rollback_info(target_version)
        .map_err(|e| format!("Failed to get rollback info: {}", e))
}

// QR Code-related IPC commands
#[tauri::command]
async fn generate_qr_code_for_student_id(student_id: String) -> Result<String, String> {
    QRService::generate_qr_code_for_student_id(&student_id)
        .map_err(|e| format!("Failed to generate QR code: {}", e))
}

#[tauri::command]
async fn generate_qr_code_for_student(
    state: State<'_, AppState>,
    student_id: String,
) -> Result<QRCodeData, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::generate_qr_code_for_student(&db, &student_id)
        .map_err(|e| format!("Failed to generate QR code for student: {}", e))
}

#[tauri::command]
async fn generate_qr_codes_for_all_students(
    state: State<'_, AppState>,
) -> Result<Vec<QRCodeData>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::generate_qr_codes_for_all_students(&db)
        .map_err(|e| format!("Failed to generate QR codes for all students: {}", e))
}

#[tauri::command]
async fn generate_qr_codes_by_group(
    state: State<'_, AppState>,
) -> Result<Vec<QRCodeBatch>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::generate_qr_codes_by_group(&db)
        .map_err(|e| format!("Failed to generate QR codes by group: {}", e))
}

#[tauri::command]
async fn generate_qr_codes_for_group(
    state: State<'_, AppState>,
    group_name: String,
) -> Result<QRCodeBatch, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::generate_qr_codes_for_group(&db, &group_name)
        .map_err(|e| format!("Failed to generate QR codes for group: {}", e))
}

#[tauri::command]
async fn export_qr_codes_to_pdf(
    qr_codes: Vec<QRCodeData>,
    file_path: String,
    title: Option<String>,
) -> Result<(), String> {
    QRService::export_qr_codes_to_pdf(&qr_codes, &file_path, title.as_deref())
        .map_err(|e| format!("Failed to export QR codes to PDF: {}", e))
}

#[tauri::command]
async fn export_qr_codes_by_group_to_pdf(
    state: State<'_, AppState>,
    file_path: String,
    group_name: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::export_qr_codes_by_group_to_pdf(&db, &file_path, group_name.as_deref())
        .map_err(|e| format!("Failed to export QR codes by group to PDF: {}", e))
}

#[tauri::command]
async fn validate_qr_code(student_id: String) -> Result<bool, String> {
    QRService::validate_qr_code(&student_id)
        .map_err(|e| format!("Failed to validate QR code: {}", e))
}

#[tauri::command]
async fn get_qr_code_statistics(state: State<'_, AppState>) -> Result<QRCodeStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    QRService::get_qr_code_statistics(&db)
        .map_err(|e| format!("Failed to get QR code statistics: {}", e))
}

// Export-related IPC commands
#[tauri::command]
async fn export_attendance_csv(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] filePath: String,
    #[allow(non_snake_case)] startDate: Option<String>,
    #[allow(non_snake_case)] endDate: Option<String>,
    #[allow(non_snake_case)] groupName: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    ExportService::export_attendance_csv(
        &db,
        &filePath,
        startDate.as_deref(),
        endDate.as_deref(),
        groupName.as_deref(),
    )
    .map_err(|e| format!("Failed to export attendance CSV: {}", e))
}

#[tauri::command]
async fn export_payment_summary_csv(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] filePath: String,
    #[allow(non_snake_case)] groupName: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    ExportService::export_payment_summary_csv(&db, &filePath, groupName.as_deref())
        .map_err(|e| format!("Failed to export payment summary CSV: {}", e))
}

#[tauri::command]
async fn export_payment_history_csv(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] filePath: String,
    #[allow(non_snake_case)] studentId: Option<String>,
    #[allow(non_snake_case)] startDate: Option<String>,
    #[allow(non_snake_case)] endDate: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    ExportService::export_payment_history_csv(
        &db,
        &filePath,
        studentId.as_deref(),
        startDate.as_deref(),
        endDate.as_deref(),
    )
    .map_err(|e| format!("Failed to export payment history CSV: {}", e))
}

#[tauri::command]
async fn export_overdue_students_csv(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] filePath: String,
    #[allow(non_snake_case)] groupName: Option<String>,
) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    ExportService::export_overdue_students_csv(&db, &filePath, groupName.as_deref())
        .map_err(|e| format!("Failed to export overdue students CSV: {}", e))
}

#[tauri::command]
async fn validate_export_path(#[allow(non_snake_case)] filePath: String) -> Result<(), String> {
    ExportService::validate_export_path(&filePath)
        .map_err(|e| format!("Invalid export path: {}", e))
}

// Backup-related IPC commands
#[tauri::command]
async fn create_backup(
    state: State<'_, AppState>,
    file_path: String,
    password: Option<String>,
) -> Result<BackupMetadata, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    BackupService::create_backup(&db, &file_path, password.as_deref())
        .map_err(|e| format!("Failed to create backup: {}", e))
}

#[tauri::command]
async fn validate_backup(file_path: String) -> Result<BackupValidationResult, String> {
    BackupService::validate_backup(&file_path)
        .map_err(|e| format!("Failed to validate backup: {}", e))
}

#[tauri::command]
async fn restore_backup(
    state: State<'_, AppState>,
    file_path: String,
    password: Option<String>,
) -> Result<RestoreResult, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    BackupService::restore_backup(&db, &file_path, password.as_deref())
        .map_err(|e| format!("Failed to restore backup: {}", e))
}

#[tauri::command]
async fn get_backup_metadata(file_path: String) -> Result<BackupMetadata, String> {
    BackupService::get_backup_metadata(&file_path)
        .map_err(|e| format!("Failed to get backup metadata: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                // Temporarily disabled due to plugin configuration issues
                // app.handle().plugin(
                //     tauri_plugin_log::Builder::default()
                //         .level(log::LevelFilter::Info)
                //         .build(),
                // )?;
            }

            // Initialize database
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let database = Database::new(app_data_dir).expect("Failed to initialize database");

            // Perform health check
            if !database.health_check().unwrap_or(false) {
                panic!("Database health check failed");
            }

            log::info!("Database initialized successfully");

            // Store database in app state
            app.manage(AppState {
                db: Mutex::new(database),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Student commands
            get_all_students,
            get_all_students_with_attendance,
            add_student,
            update_student,
            delete_student,
            get_student_by_id,
            get_students_by_group,
            get_students_by_payment_status,
            get_overdue_students,
            get_due_soon_students,
            update_payment_statuses,
            get_payment_plan_config,
            get_student_statistics,
            // Attendance commands
            mark_attendance,
            check_attendance_today,
            check_attendance_on_date,
            get_attendance_history,
            get_student_attendance_history,
            get_student_attendance_stats,
            get_daily_attendance_summary,
            get_attendance_summary_range,
            delete_attendance,
            get_current_date,
            format_date,
            // Payment commands
            record_payment,
            get_payment_history,
            get_student_payment_history,
            get_payment_summary,
            update_student_payment_status,
            update_all_payment_statuses,
            delete_payment,
            get_payment_statistics,
            // Settings commands
            get_settings,
            update_settings,
            get_payment_plan_config_settings,
            update_payment_plan_config_settings,
            get_setting,
            set_setting,
            get_all_settings,
            delete_setting,
            reset_settings_to_defaults,
            validate_settings,
            // Audit commands
            get_audit_log,
            get_record_history,
            get_recent_audit_activity,
            get_audit_statistics,
            cleanup_old_audit_entries,
            // Groups commands
            get_all_groups,
            get_all_groups_with_counts,
            get_group_by_id,
            get_group_by_name,
            add_group,
            update_group,
            delete_group,
            force_delete_group_with_reassignment,
            get_students_count_by_group_id,
            get_students_count_by_group_name,
            ensure_default_groups_exist,
            get_group_statistics,
            validate_group_name,
            // Payment Settings commands
            get_payment_settings,
            update_payment_settings,
            reset_payment_settings_to_defaults,
            get_payment_config,
            get_payment_settings_history,
            ensure_payment_settings_exist,
            get_amount_for_plan,
            update_specific_payment_setting,
            validate_payment_settings_request,
            // Migration commands
            get_migration_history,
            get_schema_info,
            validate_migrations,
            force_apply_migration,
            mark_migration_applied,
            get_pending_migrations,
            get_all_migrations,
            check_migration_integrity,
            get_rollback_info,
            // QR Code commands
            generate_qr_code_for_student_id,
            generate_qr_code_for_student,
            generate_qr_codes_for_all_students,
            generate_qr_codes_by_group,
            generate_qr_codes_for_group,
            export_qr_codes_to_pdf,
            export_qr_codes_by_group_to_pdf,
            validate_qr_code,
            get_qr_code_statistics,
            // Export commands
            export_attendance_csv,
            export_payment_summary_csv,
            export_payment_history_csv,
            export_overdue_students_csv,
            validate_export_path,
            // Backup commands
            create_backup,
            validate_backup,
            restore_backup,
            get_backup_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
