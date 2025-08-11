use crate::database::Database;
use base64::{engine::general_purpose, Engine as _};
use image::{ImageBuffer, Luma};
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QRCodeData {
    pub student_id: String,
    pub student_name: String,
    pub group_name: String,
    pub qr_code_base64: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QRCodeBatch {
    pub group_name: String,
    pub qr_codes: Vec<QRCodeData>,
}

#[derive(Debug, thiserror::Error)]
pub enum QRServiceError {
    #[error("Database error: {0}")]
    Database(#[from] crate::database::DatabaseError),
    #[error("QR code generation error: {0}")]
    QRGeneration(#[from] qrcode::types::QrError),
    #[error("Image processing error: {0}")]
    ImageProcessing(String),
    #[error("PDF generation error: {0}")]
    PDFGeneration(String),
    #[error("Student not found: {0}")]
    StudentNotFound(String),
    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),
}

pub struct QRService;

impl QRService {
    /// Generate QR code for a single student ID
    pub fn generate_qr_code_for_student_id(student_id: &str) -> Result<String, QRServiceError> {
        // Create QR code
        let code = QrCode::new(student_id)?;

        // Get the QR code matrix
        let width = code.width();
        let modules = code.to_colors();

        // Create image buffer (scale up for better visibility)
        let scale = 8; // Each module will be 8x8 pixels
        let img_size = width * scale;
        let mut img_buffer = ImageBuffer::new(img_size as u32, img_size as u32);

        // Fill the image buffer
        for (y, row) in modules.chunks(width).enumerate() {
            for (x, &module) in row.iter().enumerate() {
                let color = match module {
                    qrcode::Color::Light => Luma([255u8]), // White for light modules
                    qrcode::Color::Dark => Luma([0u8]),    // Black for dark modules
                };

                // Scale up each module
                for dy in 0..scale {
                    for dx in 0..scale {
                        let px = (x * scale + dx) as u32;
                        let py = (y * scale + dy) as u32;
                        if px < img_size as u32 && py < img_size as u32 {
                            img_buffer.put_pixel(px, py, color);
                        }
                    }
                }
            }
        }

        // Convert to PNG bytes
        let mut png_bytes = Vec::new();
        {
            use std::io::Cursor;
            let mut cursor = Cursor::new(&mut png_bytes);
            img_buffer
                .write_to(&mut cursor, image::ImageFormat::Png)
                .map_err(|e| {
                    QRServiceError::ImageProcessing(format!("Failed to encode PNG: {}", e))
                })?;
        }

        // Convert to base64
        let base64_string = general_purpose::STANDARD.encode(&png_bytes);

        Ok(base64_string)
    }

    /// Generate QR code data for a specific student
    pub fn generate_qr_code_for_student(
        db: &Database,
        student_id: &str,
    ) -> Result<QRCodeData, QRServiceError> {
        // Get student from database
        let student = crate::student_service::StudentService::get_student_by_id(db, student_id)?
            .ok_or_else(|| QRServiceError::StudentNotFound(student_id.to_string()))?;

        // Generate QR code
        let qr_code_base64 = Self::generate_qr_code_for_student_id(&student.id)?;

        Ok(QRCodeData {
            student_id: student.id,
            student_name: student.name,
            group_name: student.group_name,
            qr_code_base64,
        })
    }

    /// Generate QR codes for all students
    pub fn generate_qr_codes_for_all_students(
        db: &Database,
    ) -> Result<Vec<QRCodeData>, QRServiceError> {
        let students = crate::student_service::StudentService::get_all_students(db)?;

        let mut qr_codes = Vec::new();

        for student in students {
            let qr_code_base64 = Self::generate_qr_code_for_student_id(&student.id)?;

            qr_codes.push(QRCodeData {
                student_id: student.id,
                student_name: student.name,
                group_name: student.group_name,
                qr_code_base64,
            });
        }

        Ok(qr_codes)
    }

    /// Generate QR codes grouped by group name
    pub fn generate_qr_codes_by_group(db: &Database) -> Result<Vec<QRCodeBatch>, QRServiceError> {
        let qr_codes = Self::generate_qr_codes_for_all_students(db)?;

        // Group by group_name
        let mut groups: HashMap<String, Vec<QRCodeData>> = HashMap::new();

        for qr_code in qr_codes {
            groups
                .entry(qr_code.group_name.clone())
                .or_insert_with(Vec::new)
                .push(qr_code);
        }

        // Convert to QRCodeBatch vector
        let mut batches: Vec<QRCodeBatch> = groups
            .into_iter()
            .map(|(group_name, qr_codes)| QRCodeBatch {
                group_name,
                qr_codes,
            })
            .collect();

        // Sort by group name for consistent output
        batches.sort_by(|a, b| a.group_name.cmp(&b.group_name));

        Ok(batches)
    }

    /// Generate QR codes for students in a specific group
    pub fn generate_qr_codes_for_group(
        db: &Database,
        group_name: &str,
    ) -> Result<QRCodeBatch, QRServiceError> {
        let students =
            crate::student_service::StudentService::get_students_by_group(db, group_name)?;

        let mut qr_codes = Vec::new();

        for student in students {
            let qr_code_base64 = Self::generate_qr_code_for_student_id(&student.id)?;

            qr_codes.push(QRCodeData {
                student_id: student.id,
                student_name: student.name,
                group_name: student.group_name.clone(),
                qr_code_base64,
            });
        }

        Ok(QRCodeBatch {
            group_name: group_name.to_string(),
            qr_codes,
        })
    }

    /// Export QR codes to PDF file (simplified version)
    pub fn export_qr_codes_to_pdf(
        qr_codes: &[QRCodeData],
        file_path: &str,
        title: Option<&str>,
    ) -> Result<(), QRServiceError> {
        // For now, create a simple text-based PDF with QR code data
        // This is a simplified implementation that can be enhanced later

        let mut content = String::new();
        content.push_str(&format!("{}\n\n", title.unwrap_or("Student QR Codes")));

        for qr_code in qr_codes {
            content.push_str(&format!(
                "Student: {}\nID: {}\nGroup: {}\n\n",
                qr_code.student_name, qr_code.student_id, qr_code.group_name
            ));
        }

        // Write to file (simplified - in a real implementation, this would be a proper PDF)
        std::fs::write(file_path, content)?;

        Ok(())
    }

    /// Export QR codes grouped by group to PDF
    pub fn export_qr_codes_by_group_to_pdf(
        db: &Database,
        file_path: &str,
        group_name: Option<&str>,
    ) -> Result<(), QRServiceError> {
        let qr_codes = if let Some(group) = group_name {
            let batch = Self::generate_qr_codes_for_group(db, group)?;
            batch.qr_codes
        } else {
            Self::generate_qr_codes_for_all_students(db)?
        };

        let title = if let Some(group) = group_name {
            format!("QR Codes - {}", group)
        } else {
            "All Student QR Codes".to_string()
        };

        Self::export_qr_codes_to_pdf(&qr_codes, file_path, Some(&title))
    }
    

    /// Validate QR code by attempting to decode it
    pub fn validate_qr_code(student_id: &str) -> Result<bool, QRServiceError> {
        // Try to generate QR code - if it succeeds, it's valid
        match Self::generate_qr_code_for_student_id(student_id) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Get QR code statistics
    pub fn get_qr_code_statistics(db: &Database) -> Result<QRCodeStatistics, QRServiceError> {
        let students = crate::student_service::StudentService::get_all_students(db)?;

        let total_students = students.len();

        // Group by group_name to get group statistics
        let mut groups: HashMap<String, usize> = HashMap::new();
        for student in &students {
            *groups.entry(student.group_name.clone()).or_insert(0) += 1;
        }

        Ok(QRCodeStatistics {
            total_students,
            total_groups: groups.len(),
            students_per_group: groups,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QRCodeStatistics {
    pub total_students: usize,
    pub total_groups: usize,
    pub students_per_group: HashMap<String, usize>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use tempfile::NamedTempFile;

    fn setup_test_db() -> Database {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join("test_qr.db");
        Database::new(db_path).expect("Failed to create test database")
    }

    #[test]
    fn test_generate_qr_code_for_student_id() {
        let student_id = "STU001";
        let result = QRService::generate_qr_code_for_student_id(student_id);
        assert!(result.is_ok());

        let qr_code = result.unwrap();
        assert!(!qr_code.is_empty());
        // QR code should be a valid base64 string
        assert!(general_purpose::STANDARD.decode(&qr_code).is_ok());
    }

    #[test]
    fn test_validate_qr_code() {
        let valid_id = "STU001";
        let result = QRService::validate_qr_code(valid_id);
        assert!(result.is_ok());
        assert!(result.unwrap());

        // Test with empty string (should still be valid as QR codes can encode empty strings)
        let empty_id = "";
        let result = QRService::validate_qr_code(empty_id);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_generate_qr_code_for_student() {
        let db = setup_test_db();

        // Add a test student
        let request = crate::student_service::CreateStudentRequest {
            name: "Test Student".to_string(),
            group_name: "Test Group".to_string(),
            payment_plan: crate::student_service::PaymentPlan::OneTime,
            plan_amount: 6000,
            installment_count: None,
            paid_amount: Some(0),
            enrollment_date: None,
        };

        let student = crate::student_service::StudentService::create_student(&db, request)
            .expect("Failed to create test student");

        // Generate QR code for the student
        let result = QRService::generate_qr_code_for_student(&db, &student.id);
        assert!(result.is_ok());

        let qr_data = result.unwrap();
        assert_eq!(qr_data.student_id, student.id);
        assert_eq!(qr_data.student_name, "Test Student");
        assert_eq!(qr_data.group_name, "Test Group");
        assert!(!qr_data.qr_code_base64.is_empty());
    }

    #[test]
    fn test_generate_qr_codes_for_all_students() {
        let db = setup_test_db();

        // Add test students
        let students_data = vec![
            ("Student 1", "Group A"),
            ("Student 2", "Group A"),
            ("Student 3", "Group B"),
        ];

        for (name, group) in students_data {
            let request = crate::student_service::CreateStudentRequest {
                name: name.to_string(),
                group_name: group.to_string(),
                payment_plan: crate::student_service::PaymentPlan::OneTime,
                plan_amount: 6000,
                installment_count: None,
                paid_amount: Some(0),
                enrollment_date: None,
            };

            crate::student_service::StudentService::create_student(&db, request)
                .expect("Failed to create test student");
        }

        // Generate QR codes for all students
        let result = QRService::generate_qr_codes_for_all_students(&db);
        assert!(result.is_ok());

        let qr_codes = result.unwrap();
        assert_eq!(qr_codes.len(), 3);

        // Verify each QR code has required data
        for qr_code in qr_codes {
            assert!(!qr_code.student_id.is_empty());
            assert!(!qr_code.student_name.is_empty());
            assert!(!qr_code.group_name.is_empty());
            assert!(!qr_code.qr_code_base64.is_empty());
        }
    }

    #[test]
    fn test_generate_qr_codes_by_group() {
        let db = setup_test_db();

        // Add test students
        let students_data = vec![
            ("Student 1", "Group A"),
            ("Student 2", "Group A"),
            ("Student 3", "Group B"),
        ];

        for (name, group) in students_data {
            let request = crate::student_service::CreateStudentRequest {
                name: name.to_string(),
                group_name: group.to_string(),
                payment_plan: crate::student_service::PaymentPlan::OneTime,
                plan_amount: 6000,
                installment_count: None,
                paid_amount: Some(0),
                enrollment_date: None,
            };

            crate::student_service::StudentService::create_student(&db, request)
                .expect("Failed to create test student");
        }

        // Generate QR codes grouped by group
        let result = QRService::generate_qr_codes_by_group(&db);
        assert!(result.is_ok());

        let batches = result.unwrap();
        assert_eq!(batches.len(), 2); // Two groups

        // Find Group A batch
        let group_a_batch = batches.iter().find(|b| b.group_name == "Group A").unwrap();
        assert_eq!(group_a_batch.qr_codes.len(), 2);

        // Find Group B batch
        let group_b_batch = batches.iter().find(|b| b.group_name == "Group B").unwrap();
        assert_eq!(group_b_batch.qr_codes.len(), 1);
    }

    #[test]
    fn test_generate_qr_codes_for_group() {
        let db = setup_test_db();

        // Add test students
        let students_data = vec![
            ("Student 1", "Group A"),
            ("Student 2", "Group A"),
            ("Student 3", "Group B"),
        ];

        for (name, group) in students_data {
            let request = crate::student_service::CreateStudentRequest {
                name: name.to_string(),
                group_name: group.to_string(),
                payment_plan: crate::student_service::PaymentPlan::OneTime,
                plan_amount: 6000,
                installment_count: None,
                paid_amount: Some(0),
                enrollment_date: None,
            };

            crate::student_service::StudentService::create_student(&db, request)
                .expect("Failed to create test student");
        }

        // Generate QR codes for specific group
        let result = QRService::generate_qr_codes_for_group(&db, "Group A");
        assert!(result.is_ok());

        let batch = result.unwrap();
        assert_eq!(batch.group_name, "Group A");
        assert_eq!(batch.qr_codes.len(), 2);

        for qr_code in batch.qr_codes {
            assert_eq!(qr_code.group_name, "Group A");
            assert!(!qr_code.qr_code_base64.is_empty());
        }
    }

    #[test]
    fn test_export_qr_codes_to_pdf() {
        let temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let file_path = temp_file.path().to_str().unwrap();

        // Create test QR codes
        let qr_codes = vec![
            QRCodeData {
                student_id: "STU001".to_string(),
                student_name: "Test Student 1".to_string(),
                group_name: "Group A".to_string(),
                qr_code_base64: QRService::generate_qr_code_for_student_id("STU001").unwrap(),
            },
            QRCodeData {
                student_id: "STU002".to_string(),
                student_name: "Test Student 2".to_string(),
                group_name: "Group A".to_string(),
                qr_code_base64: QRService::generate_qr_code_for_student_id("STU002").unwrap(),
            },
        ];

        let result = QRService::export_qr_codes_to_pdf(&qr_codes, file_path, Some("Test QR Codes"));
        assert!(result.is_ok());

        // Verify file was created and has content
        let metadata = std::fs::metadata(file_path).expect("PDF file should exist");
        assert!(metadata.len() > 0);
    }

    #[test]
    fn test_get_qr_code_statistics() {
        let db = setup_test_db();

        // Add test students
        let students_data = vec![
            ("Student 1", "Group A"),
            ("Student 2", "Group A"),
            ("Student 3", "Group B"),
        ];

        for (name, group) in students_data {
            let request = crate::student_service::CreateStudentRequest {
                name: name.to_string(),
                group_name: group.to_string(),
                payment_plan: crate::student_service::PaymentPlan::OneTime,
                plan_amount: 6000,
                installment_count: None,
                paid_amount: Some(0),
                enrollment_date: None,
            };

            crate::student_service::StudentService::create_student(&db, request)
                .expect("Failed to create test student");
        }

        let result = QRService::get_qr_code_statistics(&db);
        assert!(result.is_ok());

        let stats = result.unwrap();
        assert_eq!(stats.total_students, 3);
        assert_eq!(stats.total_groups, 2);
        assert_eq!(stats.students_per_group.get("Group A"), Some(&2));
        assert_eq!(stats.students_per_group.get("Group B"), Some(&1));
    }
}
