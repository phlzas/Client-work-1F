mod database;
mod student_service;
mod attendance_service;
#[cfg(test)]
mod database_integration_test;

use database::{Database, AppliedMigration, MigrationValidation, SchemaInfo, Migration, RollbackInfo};
use student_service::{StudentService, Student, StudentWithAttendance, CreateStudentRequest, UpdateStudentRequest, StudentStatistics, PaymentPlan, PaymentPlanConfig};
use attendance_service::{AttendanceService, AttendanceRecord, AttendanceStats, DailyAttendanceSummary, AttendanceHistoryFilter};
use std::sync::Mutex;
use tauri::{Manager, State};

// Global database instance
pub struct AppState {
    pub db: Mutex<Database>,
}

// Student-related IPC commands
#[tauri::command]
async fn get_all_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_all_students(&db).map_err(|e| format!("Failed to get students: {}", e))
}

#[tauri::command]
async fn get_all_students_with_attendance(state: State<'_, AppState>) -> Result<Vec<StudentWithAttendance>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_all_students_with_attendance(&db).map_err(|e| format!("Failed to get students with attendance: {}", e))
}

#[tauri::command]
async fn add_student(state: State<'_, AppState>, name: String, group_name: String, payment_plan: String, plan_amount: i32, installment_count: Option<i32>) -> Result<Student, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let payment_plan_enum = PaymentPlan::from_str(&payment_plan).map_err(|e| format!("Invalid payment plan: {}", e))?;
    let request = CreateStudentRequest {
        name,
        group_name,
        payment_plan: payment_plan_enum,
        plan_amount,
        installment_count,
    };
    StudentService::create_student(&db, request).map_err(|e| format!("Failed to create student: {}", e))
}

#[tauri::command]
async fn update_student(state: State<'_, AppState>, id: String, name: String, group_name: String, payment_plan: String, plan_amount: i32, installment_count: Option<i32>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let payment_plan_enum = PaymentPlan::from_str(&payment_plan).map_err(|e| format!("Invalid payment plan: {}", e))?;
    let request = UpdateStudentRequest {
        name,
        group_name,
        payment_plan: payment_plan_enum,
        plan_amount,
        installment_count,
    };
    StudentService::update_student(&db, &id, request).map_err(|e| format!("Failed to update student: {}", e))
}

#[tauri::command]
async fn delete_student(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::delete_student(&db, &id).map_err(|e| format!("Failed to delete student: {}", e))
}

#[tauri::command]
async fn get_student_by_id(state: State<'_, AppState>, id: String) -> Result<Option<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_by_id(&db, &id).map_err(|e| format!("Failed to get student: {}", e))
}

#[tauri::command]
async fn get_students_by_group(state: State<'_, AppState>, group_name: String) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_students_by_group(&db, &group_name).map_err(|e| format!("Failed to get students by group: {}", e))
}

#[tauri::command]
async fn get_students_by_payment_status(state: State<'_, AppState>, status: String) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_students_by_payment_status(&db, &status).map_err(|e| format!("Failed to get students by payment status: {}", e))
}

#[tauri::command]
async fn get_overdue_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_overdue_students(&db).map_err(|e| format!("Failed to get overdue students: {}", e))
}

#[tauri::command]
async fn get_due_soon_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_due_soon_students(&db).map_err(|e| format!("Failed to get due soon students: {}", e))
}

#[tauri::command]
async fn update_payment_statuses(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::update_payment_statuses(&db).map_err(|e| format!("Failed to update payment statuses: {}", e))
}

#[tauri::command]
async fn get_payment_plan_config(state: State<'_, AppState>) -> Result<PaymentPlanConfig, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_payment_plan_config(&db).map_err(|e| format!("Failed to get payment plan config: {}", e))
}

#[tauri::command]
async fn get_student_statistics(state: State<'_, AppState>) -> Result<StudentStatistics, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_statistics(&db).map_err(|e| format!("Failed to get student statistics: {}", e))
}

// Attendance-related IPC commands
#[tauri::command]
async fn mark_attendance(state: State<'_, AppState>, student_id: String, date: String) -> Result<AttendanceRecord, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::mark_attendance(&db, &student_id, &date).map_err(|e| format!("Failed to mark attendance: {}", e))
}

#[tauri::command]
async fn check_attendance_today(state: State<'_, AppState>, student_id: String) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::check_attendance_today(&db, &student_id).map_err(|e| format!("Failed to check attendance: {}", e))
}

#[tauri::command]
async fn check_attendance_on_date(state: State<'_, AppState>, student_id: String, date: String) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::check_attendance_on_date(&db, &student_id, &date).map_err(|e| format!("Failed to check attendance: {}", e))
}

#[tauri::command]
async fn get_attendance_history(state: State<'_, AppState>, student_id: Option<String>, start_date: Option<String>, end_date: Option<String>, group_name: Option<String>) -> Result<Vec<AttendanceRecord>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    
    let filter = if student_id.is_some() || start_date.is_some() || end_date.is_some() || group_name.is_some() {
        Some(AttendanceHistoryFilter {
            student_id,
            start_date,
            end_date,
            group_name,
        })
    } else {
        None
    };
    
    AttendanceService::get_attendance_history(&db, filter).map_err(|e| format!("Failed to get attendance history: {}", e))
}

#[tauri::command]
async fn get_student_attendance_history(state: State<'_, AppState>, student_id: String) -> Result<Vec<AttendanceRecord>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_student_attendance_history(&db, &student_id).map_err(|e| format!("Failed to get student attendance history: {}", e))
}

#[tauri::command]
async fn get_student_attendance_stats(state: State<'_, AppState>, student_id: String, start_date: Option<String>, end_date: Option<String>) -> Result<AttendanceStats, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_student_attendance_stats(&db, &student_id, start_date.as_deref(), end_date.as_deref()).map_err(|e| format!("Failed to get attendance stats: {}", e))
}

#[tauri::command]
async fn get_daily_attendance_summary(state: State<'_, AppState>, date: String, group_name: Option<String>) -> Result<DailyAttendanceSummary, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_daily_attendance_summary(&db, &date, group_name.as_deref()).map_err(|e| format!("Failed to get daily attendance summary: {}", e))
}

#[tauri::command]
async fn get_attendance_summary_range(state: State<'_, AppState>, start_date: String, end_date: String, group_name: Option<String>) -> Result<Vec<DailyAttendanceSummary>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::get_attendance_summary_range(&db, &start_date, &end_date, group_name.as_deref()).map_err(|e| format!("Failed to get attendance summary range: {}", e))
}

#[tauri::command]
async fn delete_attendance(state: State<'_, AppState>, student_id: String, date: String) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::delete_attendance(&db, &student_id, &date).map_err(|e| format!("Failed to delete attendance: {}", e))
}

#[tauri::command]
async fn get_current_date() -> Result<String, String> {
    Ok(AttendanceService::get_current_date())
}

#[tauri::command]
async fn format_date(date_str: String) -> Result<String, String> {
    AttendanceService::format_date(&date_str).map_err(|e| format!("Failed to format date: {}", e))
}

// Migration-related IPC commands
#[tauri::command]
async fn get_migration_history(state: State<'_, AppState>) -> Result<Vec<AppliedMigration>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_migration_history().map_err(|e| format!("Failed to get migration history: {}", e))
}

#[tauri::command]
async fn get_schema_info(state: State<'_, AppState>) -> Result<SchemaInfo, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_schema_info().map_err(|e| format!("Failed to get schema info: {}", e))
}

#[tauri::command]
async fn validate_migrations(state: State<'_, AppState>) -> Result<MigrationValidation, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.validate_migrations().map_err(|e| format!("Failed to validate migrations: {}", e))
}

#[tauri::command]
async fn force_apply_migration(state: State<'_, AppState>, version: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.force_apply_migration(version).map_err(|e| format!("Failed to force apply migration: {}", e))
}

#[tauri::command]
async fn mark_migration_applied(state: State<'_, AppState>, version: i32, description: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.mark_migration_applied(version, description).map_err(|e| format!("Failed to mark migration as applied: {}", e))
}

#[tauri::command]
async fn get_pending_migrations(state: State<'_, AppState>) -> Result<Vec<Migration>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_pending_migrations().map_err(|e| format!("Failed to get pending migrations: {}", e))
}

#[tauri::command]
async fn get_all_migrations(state: State<'_, AppState>) -> Result<Vec<Migration>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    Ok(db.get_migrations())
}

#[tauri::command]
async fn check_migration_integrity(state: State<'_, AppState>) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let validation = db.validate_migrations().map_err(|e| format!("Failed to validate migrations: {}", e))?;
    Ok(validation.is_valid)
}

#[tauri::command]
async fn get_rollback_info(state: State<'_, AppState>, target_version: i32) -> Result<RollbackInfo, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    db.get_rollback_info(target_version).map_err(|e| format!("Failed to get rollback info: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      // Initialize database
      let app_data_dir = app.path().app_data_dir()
        .expect("Failed to get app data directory");
      
      let database = Database::new(app_data_dir)
        .expect("Failed to initialize database");
      
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
      // Migration commands
      get_migration_history,
      get_schema_info,
      validate_migrations,
      force_apply_migration,
      mark_migration_applied,
      get_pending_migrations,
      get_all_migrations,
      check_migration_integrity,
      get_rollback_info
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
