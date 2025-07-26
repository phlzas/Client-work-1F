mod database;
#[cfg(test)]
mod database_integration_test;

use database::{Database, AppliedMigration, MigrationValidation, SchemaInfo, Migration, RollbackInfo};
use std::sync::Mutex;
use tauri::{Manager, State};

// Global database instance
pub struct AppState {
    pub db: Mutex<Database>,
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
