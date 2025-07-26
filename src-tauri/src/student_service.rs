use crate::database::{Database, DatabaseError, DatabaseResult};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub paid_amount: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentWithAttendance {
    pub id: String,
    pub name: String,
    pub group_name: String,
    pub paid_amount: i32,
    pub payment_status: String,
    pub attendance_log: Vec<AttendanceRecord>,
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
pub struct CreateStudentRequest {
    pub name: String,
    pub group_name: String,
    pub paid_amount: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateStudentRequest {
    pub name: String,
    pub group_name: String,
    pub paid_amount: i32,
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

    /// Validate student data
    fn validate_student_data(name: &str, group_name: &str, paid_amount: i32) -> Result<(), String> {
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

        if paid_amount < 0 {
            return Err("Paid amount cannot be negative".to_string());
        }

        if paid_amount > 1_000_000 {
            return Err("Paid amount cannot exceed 1,000,000".to_string());
        }

        Ok(())
    }

    /// Get payment threshold from settings
    fn get_payment_threshold(db: &Database) -> DatabaseResult<i32> {
        let threshold: Result<String, rusqlite::Error> = db.connection().query_row(
            "SELECT value FROM settings WHERE key = 'payment_threshold'",
            [],
            |row| row.get(0),
        );

        match threshold {
            Ok(value) => value.parse::<i32>().map_err(|_| {
                DatabaseError::Migration("Invalid payment threshold in settings".to_string())
            }),
            Err(_) => Ok(6000), // Default fallback
        }
    }

    /// Determine payment status based on amount and threshold
    fn get_payment_status(paid_amount: i32, threshold: i32) -> String {
        if paid_amount >= threshold {
            "Paid".to_string()
        } else {
            "Not Paid".to_string()
        }
    }

    /// Create a new student
    pub fn create_student(
        db: &Database,
        request: CreateStudentRequest,
    ) -> DatabaseResult<Student> {
        // Validate input data
        Self::validate_student_data(&request.name, &request.group_name, request.paid_amount)
            .map_err(|e| DatabaseError::Migration(e))?;

        // Generate unique student ID
        let student_id = Self::generate_student_id(db)?;

        // Insert student into database
        let now = Utc::now().to_rfc3339();
        db.connection().execute(
            "INSERT INTO students (id, name, group_name, paid_amount, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                student_id,
                request.name.trim(),
                request.group_name.trim(),
                request.paid_amount,
                now,
                now
            ],
        )?;

        // Return the created student
        Ok(Student {
            id: student_id,
            name: request.name.trim().to_string(),
            group_name: request.group_name.trim().to_string(),
            paid_amount: request.paid_amount,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Get all students
    pub fn get_all_students(db: &Database) -> DatabaseResult<Vec<Student>> {
        let mut stmt = db.connection().prepare(
            "SELECT id, name, group_name, paid_amount, created_at, updated_at 
             FROM students 
             ORDER BY created_at DESC",
        )?;

        let student_iter = stmt.query_map([], |row| {
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                paid_amount: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get all students with attendance data and payment status
    pub fn get_all_students_with_attendance(db: &Database) -> DatabaseResult<Vec<StudentWithAttendance>> {
        let students = Self::get_all_students(db)?;
        let payment_threshold = Self::get_payment_threshold(db)?;

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

            let payment_status = Self::get_payment_status(student.paid_amount, payment_threshold);

            students_with_attendance.push(StudentWithAttendance {
                id: student.id,
                name: student.name,
                group_name: student.group_name,
                paid_amount: student.paid_amount,
                payment_status,
                attendance_log,
                created_at: student.created_at,
                updated_at: student.updated_at,
            });
        }

        Ok(students_with_attendance)
    }

    /// Get a student by ID
    pub fn get_student_by_id(db: &Database, student_id: &str) -> DatabaseResult<Option<Student>> {
        let result = db.connection().query_row(
            "SELECT id, name, group_name, paid_amount, created_at, updated_at 
             FROM students 
             WHERE id = ?1",
            [student_id],
            |row| {
                Ok(Student {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    group_name: row.get(2)?,
                    paid_amount: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
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
        Self::validate_student_data(&request.name, &request.group_name, request.paid_amount)
            .map_err(|e| DatabaseError::Migration(e))?;

        // Check if student exists
        if Self::get_student_by_id(db, student_id)?.is_none() {
            return Err(DatabaseError::Migration(format!(
                "Student with ID {} not found",
                student_id
            )));
        }

        // Update student in database
        let now = Utc::now().to_rfc3339();
        let rows_affected = db.connection().execute(
            "UPDATE students 
             SET name = ?1, group_name = ?2, paid_amount = ?3, updated_at = ?4 
             WHERE id = ?5",
            params![
                request.name.trim(),
                request.group_name.trim(),
                request.paid_amount,
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
            "SELECT id, name, group_name, paid_amount, created_at, updated_at 
             FROM students 
             WHERE group_name = ?1 
             ORDER BY name",
        )?;

        let student_iter = stmt.query_map([group_name], |row| {
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                paid_amount: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get students with payment status below threshold
    pub fn get_students_with_low_payment(db: &Database) -> DatabaseResult<Vec<Student>> {
        let payment_threshold = Self::get_payment_threshold(db)?;

        let mut stmt = db.connection().prepare(
            "SELECT id, name, group_name, paid_amount, created_at, updated_at 
             FROM students 
             WHERE paid_amount < ?1 
             ORDER BY paid_amount ASC, name",
        )?;

        let student_iter = stmt.query_map([payment_threshold], |row| {
            Ok(Student {
                id: row.get(0)?,
                name: row.get(1)?,
                group_name: row.get(2)?,
                paid_amount: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;

        student_iter.collect::<Result<Vec<_>, _>>().map_err(DatabaseError::from)
    }

    /// Get student statistics
    pub fn get_student_statistics(db: &Database) -> DatabaseResult<StudentStatistics> {
        let payment_threshold = Self::get_payment_threshold(db)?;

        // Total students
        let total_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students",
            [],
            |row| row.get(0),
        )?;

        // Students with full payment
        let paid_students: i32 = db.connection().query_row(
            "SELECT COUNT(*) FROM students WHERE paid_amount >= ?1",
            [payment_threshold],
            |row| row.get(0),
        )?;

        // Students with low payment
        let unpaid_students = total_students - paid_students;

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

        // Average payment amount
        let avg_payment: f64 = db.connection().query_row(
            "SELECT AVG(CAST(paid_amount AS REAL)) FROM students",
            [],
            |row| row.get(0),
        ).unwrap_or(0.0);

        Ok(StudentStatistics {
            total_students,
            paid_students,
            unpaid_students,
            students_by_group,
            average_payment: avg_payment,
            payment_threshold,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStatistics {
    pub total_students: i32,
    pub paid_students: i32,
    pub unpaid_students: i32,
    pub students_by_group: HashMap<String, i32>,
    pub average_payment: f64,
    pub payment_threshold: i32,
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
            paid_amount: 5000,
        };
        StudentService::create_student(&db, request).unwrap();

        let id2 = StudentService::generate_student_id(&db).unwrap();
        assert_eq!(id2, "STU000002");
    }

    #[test]
    fn test_create_student() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "أحمد محمد".to_string(), // Arabic name
            group_name: "Group A".to_string(),
            paid_amount: 7000,
        };

        let student = StudentService::create_student(&db, request).unwrap();
        
        assert_eq!(student.name, "أحمد محمد");
        assert_eq!(student.group_name, "Group A");
        assert_eq!(student.paid_amount, 7000);
        assert!(student.id.starts_with("STU"));
    }

    #[test]
    fn test_create_student_validation() {
        let (db, _temp_dir) = create_test_db();

        // Test empty name
        let request = CreateStudentRequest {
            name: "".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        assert!(StudentService::create_student(&db, request).is_err());

        // Test negative payment
        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: -100,
        };
        assert!(StudentService::create_student(&db, request).is_err());

        // Test empty group name
        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "".to_string(),
            paid_amount: 5000,
        };
        assert!(StudentService::create_student(&db, request).is_err());
    }

    #[test]
    fn test_get_all_students() {
        let (db, _temp_dir) = create_test_db();

        // Initially empty
        let students = StudentService::get_all_students(&db).unwrap();
        assert_eq!(students.len(), 0);

        // Add some students
        let request1 = CreateStudentRequest {
            name: "Student 1".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        StudentService::create_student(&db, request1).unwrap();

        let request2 = CreateStudentRequest {
            name: "Student 2".to_string(),
            group_name: "Group B".to_string(),
            paid_amount: 7000,
        };
        StudentService::create_student(&db, request2).unwrap();

        let students = StudentService::get_all_students(&db).unwrap();
        assert_eq!(students.len(), 2);
    }

    #[test]
    fn test_get_student_by_id() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        let created_student = StudentService::create_student(&db, request).unwrap();

        // Test existing student
        let found_student = StudentService::get_student_by_id(&db, &created_student.id).unwrap();
        assert!(found_student.is_some());
        assert_eq!(found_student.unwrap().name, "Test Student");

        // Test non-existing student
        let not_found = StudentService::get_student_by_id(&db, "NONEXISTENT").unwrap();
        assert!(not_found.is_none());
    }

    #[test]
    fn test_update_student() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Original Name".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        let student = StudentService::create_student(&db, request).unwrap();

        let update_request = UpdateStudentRequest {
            name: "Updated Name".to_string(),
            group_name: "Group B".to_string(),
            paid_amount: 8000,
        };

        StudentService::update_student(&db, &student.id, update_request).unwrap();

        let updated_student = StudentService::get_student_by_id(&db, &student.id).unwrap().unwrap();
        assert_eq!(updated_student.name, "Updated Name");
        assert_eq!(updated_student.group_name, "Group B");
        assert_eq!(updated_student.paid_amount, 8000);
    }

    #[test]
    fn test_delete_student() {
        let (db, _temp_dir) = create_test_db();

        let request = CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        let student = StudentService::create_student(&db, request).unwrap();

        // Verify student exists
        assert!(StudentService::get_student_by_id(&db, &student.id).unwrap().is_some());

        // Delete student
        StudentService::delete_student(&db, &student.id).unwrap();

        // Verify student is deleted
        assert!(StudentService::get_student_by_id(&db, &student.id).unwrap().is_none());
    }

    #[test]
    fn test_get_students_by_group() {
        let (db, _temp_dir) = create_test_db();

        // Add students to different groups
        let request1 = CreateStudentRequest {
            name: "Student A1".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 5000,
        };
        StudentService::create_student(&db, request1).unwrap();

        let request2 = CreateStudentRequest {
            name: "Student A2".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 6000,
        };
        StudentService::create_student(&db, request2).unwrap();

        let request3 = CreateStudentRequest {
            name: "Student B1".to_string(),
            group_name: "Group B".to_string(),
            paid_amount: 7000,
        };
        StudentService::create_student(&db, request3).unwrap();

        let group_a_students = StudentService::get_students_by_group(&db, "Group A").unwrap();
        assert_eq!(group_a_students.len(), 2);

        let group_b_students = StudentService::get_students_by_group(&db, "Group B").unwrap();
        assert_eq!(group_b_students.len(), 1);
    }

    #[test]
    fn test_get_students_with_low_payment() {
        let (db, _temp_dir) = create_test_db();

        // Add students with different payment amounts
        let request1 = CreateStudentRequest {
            name: "Low Payment Student".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 3000, // Below threshold (6000)
        };
        StudentService::create_student(&db, request1).unwrap();

        let request2 = CreateStudentRequest {
            name: "Full Payment Student".to_string(),
            group_name: "Group A".to_string(),
            paid_amount: 8000, // Above threshold
        };
        StudentService::create_student(&db, request2).unwrap();

        let low_payment_students = StudentService::get_students_with_low_payment(&db).unwrap();
        assert_eq!(low_payment_students.len(), 1);
        assert_eq!(low_payment_students[0].name, "Low Payment Student");
    }

    #[test]
    fn test_get_student_statistics() {
        let (db, _temp_dir) = create_test_db();

        // Add test students
        let students_data = vec![
            ("Student 1", "Group A", 3000),
            ("Student 2", "Group A", 8000),
            ("Student 3", "Group B", 5000),
            ("Student 4", "Group B", 7000),
        ];

        for (name, group, amount) in students_data {
            let request = CreateStudentRequest {
                name: name.to_string(),
                group_name: group.to_string(),
                paid_amount: amount,
            };
            StudentService::create_student(&db, request).unwrap();
        }

        let stats = StudentService::get_student_statistics(&db).unwrap();
        
        assert_eq!(stats.total_students, 4);
        assert_eq!(stats.paid_students, 2); // Students with >= 6000
        assert_eq!(stats.unpaid_students, 2); // Students with < 6000
        assert_eq!(stats.students_by_group.get("Group A"), Some(&2));
        assert_eq!(stats.students_by_group.get("Group B"), Some(&2));
        assert_eq!(stats.payment_threshold, 6000);
    }
}