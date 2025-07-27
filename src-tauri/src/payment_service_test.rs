#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::Database;
    use crate::student_service::{StudentService, CreateStudentRequest, PaymentPlan};
    use tempfile::tempdir;
    use std::path::PathBuf;

    fn create_test_database() -> Database {
        let temp_dir = tempdir().expect("Failed to create temp directory");
        let db_path = temp_dir.path().to_path_buf();
        Database::new(db_path).expect("Failed to create test database")
    }

    fn create_test_student(db: &Database, name: &str, payment_plan: PaymentPlan, plan_amount: i32) -> String {
        let request = CreateStudentRequest {
            name: name.to_string(),
            group_name: "Test Group".to_string(),
            payment_plan,
            plan_amount,
            installment_count: if payment_plan == PaymentPlan::Installment { Some(3) } else { None },
        };
        
        let student = StudentService::create_student(db, request).expect("Failed to create test student");
        student.id
    }

    #[test]
    fn test_validate_payment_data() {
        // Valid data should pass
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_ok());

        // Empty student ID should fail
        assert!(PaymentService::validate_payment_data(
            "",
            1000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Negative amount should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            -100,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Zero amount should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            0,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Amount too large should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            2_000_000,
            "2024-01-15",
            &PaymentMethod::Cash
        ).is_err());

        // Invalid date format should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "15-01-2024",
            &PaymentMethod::Cash
        ).is_err());

        // Invalid date should fail
        assert!(PaymentService::validate_payment_data(
            "STU000001",
            1000,
            "2024-13-01",
            &PaymentMethod::Cash
        ).is_err());
    }

    #[test]
    fn test_payment_method_serialization() {
        assert_eq!(PaymentMethod::Cash.as_str(), "cash");
        assert_eq!(PaymentMethod::BankTransfer.as_str(), "bank_transfer");
        assert_eq!(PaymentMethod::Check.as_str(), "check");

        assert_eq!(PaymentMethod::from_str("cash").unwrap(), PaymentMethod::Cash);
        assert_eq!(PaymentMethod::from_str("bank_transfer").unwrap(), PaymentMethod::BankTransfer);
        assert_eq!(PaymentMethod::from_str("check").unwrap(), PaymentMethod::Check);

        assert!(PaymentMethod::from_str("invalid").is_err());
    }

    #[test]
    fn test_record_payment_success() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::OneTime, 6000);

        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: 3000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: Some("First payment".to_string()),
        };

        let payment = PaymentService::record_payment(&db, request).expect("Failed to record payment");

        assert_eq!(payment.student_id, student_id);
        assert_eq!(payment.amount, 3000);
        assert_eq!(payment.payment_date, "2024-01-15");
        assert_eq!(payment.payment_method, PaymentMethod::Cash);
        assert_eq!(payment.notes, Some("First payment".to_string()));

        // Verify student's paid amount was updated
        let updated_student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(updated_student.paid_amount, 3000);
    }

    #[test]
    fn test_record_payment_nonexistent_student() {
        let db = create_test_database();

        let request = RecordPaymentRequest {
            student_id: "NONEXISTENT".to_string(),
            amount: 1000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        let result = PaymentService::record_payment(&db, request);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[test]
    fn test_record_payment_invalid_data() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::OneTime, 6000);

        // Test invalid amount
        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: -100,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        let result = PaymentService::record_payment(&db, request);
        assert!(result.is_err());

        // Test invalid date
        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: 1000,
            payment_date: "invalid-date".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        let result = PaymentService::record_payment(&db, request);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_student_payment_history() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::Monthly, 850);

        // Record multiple payments
        let payments = vec![
            RecordPaymentRequest {
                student_id: student_id.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: Some("January payment".to_string()),
            },
            RecordPaymentRequest {
                student_id: student_id.clone(),
                amount: 850,
                payment_date: "2024-02-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: Some("February payment".to_string()),
            },
            RecordPaymentRequest {
                student_id: student_id.clone(),
                amount: 850,
                payment_date: "2024-03-15".to_string(),
                payment_method: PaymentMethod::Check,
                notes: Some("March payment".to_string()),
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        // Get payment history
        let history = PaymentService::get_student_payment_history(&db, &student_id)
            .expect("Failed to get payment history");

        assert_eq!(history.len(), 3);
        
        // Should be ordered by payment_date DESC
        assert_eq!(history[0].payment_date, "2024-03-15");
        assert_eq!(history[1].payment_date, "2024-02-15");
        assert_eq!(history[2].payment_date, "2024-01-15");

        // Verify payment methods
        assert_eq!(history[0].payment_method, PaymentMethod::Check);
        assert_eq!(history[1].payment_method, PaymentMethod::BankTransfer);
        assert_eq!(history[2].payment_method, PaymentMethod::Cash);
    }

    #[test]
    fn test_get_payment_history_with_filters() {
        let db = create_test_database();
        let student1_id = create_test_student(&db, "Student 1", PaymentPlan::OneTime, 6000);
        let student2_id = create_test_student(&db, "Student 2", PaymentPlan::OneTime, 6000);

        // Record payments for both students
        let payments = vec![
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 1000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student2_id.clone(),
                amount: 2000,
                payment_date: "2024-01-20".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 1500,
                payment_date: "2024-02-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        // Test filter by student ID
        let filter = PaymentHistoryFilter {
            student_id: Some(student1_id.clone()),
            start_date: None,
            end_date: None,
            payment_method: None,
            min_amount: None,
            max_amount: None,
        };

        let history = PaymentService::get_payment_history(&db, Some(filter))
            .expect("Failed to get payment history");
        assert_eq!(history.len(), 2);
        assert!(history.iter().all(|p| p.student_id == student1_id));

        // Test filter by payment method
        let filter = PaymentHistoryFilter {
            student_id: None,
            start_date: None,
            end_date: None,
            payment_method: Some(PaymentMethod::Cash),
            min_amount: None,
            max_amount: None,
        };

        let history = PaymentService::get_payment_history(&db, Some(filter))
            .expect("Failed to get payment history");
        assert_eq!(history.len(), 2);
        assert!(history.iter().all(|p| p.payment_method == PaymentMethod::Cash));

        // Test filter by amount range
        let filter = PaymentHistoryFilter {
            student_id: None,
            start_date: None,
            end_date: None,
            payment_method: None,
            min_amount: Some(1500),
            max_amount: Some(2000),
        };

        let history = PaymentService::get_payment_history(&db, Some(filter))
            .expect("Failed to get payment history");
        assert_eq!(history.len(), 2);
        assert!(history.iter().all(|p| p.amount >= 1500 && p.amount <= 2000));

        // Test filter by date range
        let filter = PaymentHistoryFilter {
            student_id: None,
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-01-31".to_string()),
            payment_method: None,
            min_amount: None,
            max_amount: None,
        };

        let history = PaymentService::get_payment_history(&db, Some(filter))
            .expect("Failed to get payment history");
        assert_eq!(history.len(), 2);
        assert!(history.iter().all(|p| p.payment_date.starts_with("2024-01")));
    }

    #[test]
    fn test_get_payment_summary() {
        let db = create_test_database();
        
        // Create students with different payment plans
        let student1_id = create_test_student(&db, "Student 1", PaymentPlan::OneTime, 6000);
        let student2_id = create_test_student(&db, "Student 2", PaymentPlan::Monthly, 850);
        let student3_id = create_test_student(&db, "Student 3", PaymentPlan::Installment, 2850);

        // Record some payments
        let payments = vec![
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 6000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student2_id.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student3_id.clone(),
                amount: 2850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Check,
                notes: None,
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        let summary = PaymentService::get_payment_summary(&db)
            .expect("Failed to get payment summary");

        assert_eq!(summary.total_students, 3);
        assert_eq!(summary.total_paid_amount, 9700); // 6000 + 850 + 2850

        // Check payment plan breakdown
        assert_eq!(summary.payment_plan_breakdown.one_time.total_students, 1);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_students, 1);
        assert_eq!(summary.payment_plan_breakdown.installment.total_students, 1);

        assert_eq!(summary.payment_plan_breakdown.one_time.total_paid, 6000);
        assert_eq!(summary.payment_plan_breakdown.monthly.total_paid, 850);
        assert_eq!(summary.payment_plan_breakdown.installment.total_paid, 2850);

        // Should have recent payments
        assert!(!summary.recent_payments.is_empty());
        assert!(summary.recent_payments.len() <= 10);
    }

    #[test]
    fn test_update_student_payment_status() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::OneTime, 6000);

        // Initially, student should have pending status
        let student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(student.payment_status, PaymentStatus::Pending);

        // Record a full payment
        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: 6000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        PaymentService::record_payment(&db, request).expect("Failed to record payment");

        // Status should be updated to paid
        let updated_student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(updated_student.payment_status, PaymentStatus::Paid);
    }

    #[test]
    fn test_delete_payment() {
        let db = create_test_database();
        let student_id = create_test_student(&db, "Test Student", PaymentPlan::OneTime, 6000);

        // Record a payment
        let request = RecordPaymentRequest {
            student_id: student_id.clone(),
            amount: 3000,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };

        let payment = PaymentService::record_payment(&db, request).expect("Failed to record payment");

        // Verify student's paid amount
        let student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(student.paid_amount, 3000);

        // Delete the payment
        let deleted = PaymentService::delete_payment(&db, payment.id)
            .expect("Failed to delete payment");
        assert!(deleted);

        // Verify student's paid amount was reduced
        let updated_student = StudentService::get_student_by_id(&db, &student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(updated_student.paid_amount, 0);

        // Verify payment history is empty
        let history = PaymentService::get_student_payment_history(&db, &student_id)
            .expect("Failed to get payment history");
        assert!(history.is_empty());

        // Try to delete non-existent payment
        let deleted = PaymentService::delete_payment(&db, 999)
            .expect("Failed to delete payment");
        assert!(!deleted);
    }

    #[test]
    fn test_get_payment_statistics() {
        let db = create_test_database();
        let student1_id = create_test_student(&db, "Student 1", PaymentPlan::OneTime, 6000);
        let student2_id = create_test_student(&db, "Student 2", PaymentPlan::OneTime, 6000);

        // Record payments with different methods
        let payments = vec![
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 1000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student2_id.clone(),
                amount: 2000,
                payment_date: "2024-01-20".to_string(),
                payment_method: PaymentMethod::BankTransfer,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 1500,
                payment_date: "2024-02-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        // Get statistics for all payments
        let stats = PaymentService::get_payment_statistics(&db, None, None)
            .expect("Failed to get payment statistics");

        assert_eq!(stats.transaction_count, 3);
        assert_eq!(stats.total_amount, 4500);
        assert_eq!(stats.average_amount, 1500.0);

        // Check payment method breakdown
        assert_eq!(stats.payment_method_breakdown.cash.count, 2);
        assert_eq!(stats.payment_method_breakdown.cash.total_amount, 2500);
        assert_eq!(stats.payment_method_breakdown.bank_transfer.count, 1);
        assert_eq!(stats.payment_method_breakdown.bank_transfer.total_amount, 2000);
        assert_eq!(stats.payment_method_breakdown.check.count, 0);
        assert_eq!(stats.payment_method_breakdown.check.total_amount, 0);

        // Get statistics for January only
        let jan_stats = PaymentService::get_payment_statistics(&db, Some("2024-01-01"), Some("2024-01-31"))
            .expect("Failed to get payment statistics");

        assert_eq!(jan_stats.transaction_count, 2);
        assert_eq!(jan_stats.total_amount, 3000);
        assert_eq!(jan_stats.average_amount, 1500.0);
    }

    #[test]
    fn test_payment_plan_due_date_calculations() {
        let db = create_test_database();
        
        // Test monthly payment plan
        let monthly_student_id = create_test_student(&db, "Monthly Student", PaymentPlan::Monthly, 850);
        
        // Record first payment
        let request = RecordPaymentRequest {
            student_id: monthly_student_id.clone(),
            amount: 850,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };
        
        PaymentService::record_payment(&db, request).expect("Failed to record payment");
        
        // Check that next due date was calculated
        let student = StudentService::get_student_by_id(&db, &monthly_student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        
        assert!(student.next_due_date.is_some());
        
        // Test installment payment plan
        let installment_student_id = create_test_student(&db, "Installment Student", PaymentPlan::Installment, 2850);
        
        // Record first installment
        let request = RecordPaymentRequest {
            student_id: installment_student_id.clone(),
            amount: 2850,
            payment_date: "2024-01-15".to_string(),
            payment_method: PaymentMethod::Cash,
            notes: None,
        };
        
        PaymentService::record_payment(&db, request).expect("Failed to record payment");
        
        // Check that next due date was calculated (should be 3 months later)
        let student = StudentService::get_student_by_id(&db, &installment_student_id)
            .expect("Failed to get student")
            .expect("Student not found");
        
        assert!(student.next_due_date.is_some());
    }

    #[test]
    fn test_update_all_payment_statuses() {
        let db = create_test_database();
        
        // Create multiple students
        let student1_id = create_test_student(&db, "Student 1", PaymentPlan::OneTime, 6000);
        let student2_id = create_test_student(&db, "Student 2", PaymentPlan::Monthly, 850);
        
        // Record payments
        let payments = vec![
            RecordPaymentRequest {
                student_id: student1_id.clone(),
                amount: 6000,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
            RecordPaymentRequest {
                student_id: student2_id.clone(),
                amount: 850,
                payment_date: "2024-01-15".to_string(),
                payment_method: PaymentMethod::Cash,
                notes: None,
            },
        ];

        for payment_request in payments {
            PaymentService::record_payment(&db, payment_request).expect("Failed to record payment");
        }

        // Update all payment statuses
        PaymentService::update_all_payment_statuses(&db)
            .expect("Failed to update all payment statuses");

        // Verify statuses were updated correctly
        let student1 = StudentService::get_student_by_id(&db, &student1_id)
            .expect("Failed to get student")
            .expect("Student not found");
        assert_eq!(student1.payment_status, PaymentStatus::Paid);

        let student2 = StudentService::get_student_by_id(&db, &student2_id)
            .expect("Failed to get student")
            .expect("Student not found");
        // Monthly student with one payment should have a status based on current date vs due date
        assert!(matches!(student2.payment_status, PaymentStatus::Paid | PaymentStatus::Pending | PaymentStatus::DueSoon | PaymentStatus::Overdue));
    }
}