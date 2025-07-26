mod database;
mod student_service;
#[cfg(test)]
mod database_integration_test;

use database::{Database, AppliedMigration, MigrationValidation, SchemaInfo, Migration, RollbackInfo};
use student_service::{StudentService, Student, StudentWithAttendance, CreateStudentRequest, UpdateStudentRequest, StudentStatistics};
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
async fn add_student(state: State<'_, AppState>, name: String, group_name: String, paid_amount: i32) -> Result<Student, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let request = CreateStudentRequest {
        name,
        group_name,
        paid_amount,
    };
    StudentService::create_student(&db, request).map_err(|e| format!("Failed to create student: {}", e))
}

#[tauri::command]
async fn update_student(state: State<'_, AppState>, id: String, name: String, group_name: String, paid_amount: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    let request = UpdateStudentRequest {
        name,
        group_name,
        paid_amount,
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
async fn get_students_with_low_payment(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_students_with_low_payment(&db).map_err(|e| format!("Failed to get students with low payment: {}", e))
}

#[tauri::command]
async fn get_student_statistics(state: State<'_, AppState>) -> Result<StudentStatistics, String> {
    let db = state.db.lock().map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_statistics(&db).map_err(|e| format!("Failed to get student statistics: {}", e))
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
      get_students_with_low_payment,
      get_student_statistics,
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
