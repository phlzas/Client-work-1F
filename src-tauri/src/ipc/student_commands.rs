use crate::{
    database::Database,
    student_service::{
        CreateStudentRequest, PaymentPlan, Student, StudentService, StudentStatistics,
        StudentWithAttendance, UpdateStudentRequest,
    },
};
use std::str::FromStr;
use std::sync::Mutex;
use tauri::State;

use super::AppState;

#[tauri::command]
pub async fn get_all_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_all_students(&db).map_err(|e| format!("Failed to get students: {}", e))
}

#[tauri::command]
pub async fn get_all_students_with_attendance(
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
pub async fn add_student(
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
pub async fn update_student(
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
        paid_amount: paidAmount,
        enrollment_date: enrollmentDate,
    };
    StudentService::update_student(&db, &id, request)
        .map_err(|e| format!("Failed to update student: {}", e))
}

#[tauri::command]
pub async fn delete_student(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::delete_student(&db, &id).map_err(|e| format!("Failed to delete student: {}", e))
}

#[tauri::command]
pub async fn get_student_by_id(
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
pub async fn get_students_by_group(
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
pub async fn get_students_by_payment_status(
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
pub async fn get_overdue_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_overdue_students(&db)
        .map_err(|e| format!("Failed to get overdue students: {}", e))
}

#[tauri::command]
pub async fn get_due_soon_students(state: State<'_, AppState>) -> Result<Vec<Student>, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_due_soon_students(&db)
        .map_err(|e| format!("Failed to get due soon students: {}", e))
}

#[tauri::command]
pub async fn update_payment_statuses(state: State<'_, AppState>) -> Result<(), String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::update_payment_statuses(&db)
        .map_err(|e| format!("Failed to update payment statuses: {}", e))
}

#[tauri::command]
pub async fn get_payment_plan_config(
    state: State<'_, AppState>,
) -> Result<crate::student_service::PaymentPlanConfig, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_payment_plan_config(&db)
        .map_err(|e| format!("Failed to get payment plan config: {}", e))
}

#[tauri::command]
pub async fn get_student_statistics(
    state: State<'_, AppState>,
) -> Result<StudentStatistics, String> {
    let db = state
        .db
        .lock()
        .map_err(|e| format!("Failed to lock database: {}", e))?;
    StudentService::get_student_statistics(&db)
        .map_err(|e| format!("Failed to get student statistics: {}", e))
}

