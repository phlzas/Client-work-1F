use crate::{
    attendance_service::{
        AttendanceHistoryFilter, AttendanceRecord, AttendanceService, AttendanceStats,
        DailyAttendanceSummary,
    },
    database::Database,
};
use std::sync::Mutex;
use tauri::State;

use super::AppState;

#[tauri::command]
pub async fn mark_attendance(
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
pub async fn check_attendance_today(
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
pub async fn check_attendance_on_date(
    state: State<'_, AppState>,
    #[allow(non_snake_case)] studentId: String,
    date: String,
) -> Result<bool, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    AttendanceService::check_attendance_on_date(&db, &studentId, &date)
        .map_err(|e| format!("Failed to check attendance on date: {}", e))
}

#[tauri::command]
pub async fn get_attendance_history(
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
pub async fn get_student_attendance_history(
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
pub async fn get_student_attendance_stats(
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
pub async fn get_daily_attendance_summary(
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
pub async fn get_attendance_summary_range(
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
pub async fn delete_attendance(
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
pub async fn get_current_date() -> Result<String, String> {
    Ok(AttendanceService::get_current_date())
}

#[tauri::command]
pub async fn format_date(date_str: String) -> Result<String, String> {
    AttendanceService::format_date(&date_str).map_err(|e| format!("Failed to format date: {}", e))
}

