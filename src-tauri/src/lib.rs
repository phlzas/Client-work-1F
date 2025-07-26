mod database;
#[cfg(test)]
mod database_integration_test;

use database::Database;
use std::sync::Mutex;
use tauri::Manager;

// Global database instance
pub struct AppState {
    pub db: Mutex<Database>,
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
