import { useCallback } from "react";
import { Student } from "@/types";
import { ApiService } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { normalizeStudentData } from "@/lib/data-transform";

interface StudentOperations {
  addStudent: (
    studentData: Omit<
      Student,
      "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => Promise<void>;
  updateStudent: (updatedStudent: Student) => Promise<void>;
  deleteStudent: (student: Student) => Promise<void>;
  handleStudentScan: (studentId: string) => Promise<void>;
}

export function useStudentOperations(
  onSuccess: () => void,
  onError: (error: string) => void
): StudentOperations {
  const addStudent = useCallback(
    async (
      studentData: Omit<
        Student,
        "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
      >
    ) => {
      try {
        const normalizedData = normalizeStudentData(studentData);

        await ApiService.addStudent(
          normalizedData.name,
          normalizedData.group_name,
          normalizedData.payment_plan,
          normalizedData.plan_amount || 0,
          normalizedData.installment_count,
          normalizedData.paid_amount || 0,
          normalizedData.enrollment_date
        );

        toast({
          title: "تم إضافة الطالب بنجاح",
          description: `تم إضافة ${normalizedData.name} إلى النظام`,
        });

        onSuccess();
      } catch (err) {
        const errorMessage = getErrorMessage(err, "add_student");
        onError(errorMessage);
        toast({
          title: "خطأ في إضافة الطالب",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [onSuccess, onError]
  );

  const updateStudent = useCallback(
    async (updatedStudent: Student) => {
      try {
        const normalizedData = normalizeStudentData(updatedStudent);

        await ApiService.updateStudent(
          updatedStudent.id,
          normalizedData.name,
          normalizedData.group_name,
          normalizedData.payment_plan,
          normalizedData.plan_amount || 0,
          normalizedData.installment_count,
          normalizedData.paid_amount || 0,
          normalizedData.enrollment_date
        );

        toast({
          title: "تم تحديث الطالب بنجاح",
          description: `تم تحديث بيانات ${normalizedData.name}`,
        });

        onSuccess();
      } catch (err) {
        const errorMessage = getErrorMessage(err, "update_student");
        onError(errorMessage);
        toast({
          title: "خطأ في تحديث الطالب",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [onSuccess, onError]
  );

  const deleteStudent = useCallback(
    async (student: Student) => {
      try {
        await ApiService.deleteStudent(student.id);

        toast({
          title: "تم حذف الطالب بنجاح",
          description: `تم حذف ${student.name} من النظام`,
        });

        onSuccess();
      } catch (err) {
        const errorMessage = getErrorMessage(err, "delete_student");
        onError(errorMessage);
        toast({
          title: "خطأ في حذف الطالب",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [onSuccess, onError]
  );

  const handleStudentScan = useCallback(
    async (studentId: string) => {
      try {
        // Check if student exists
        const student = await ApiService.getStudentById(studentId);

        if (!student) {
          toast({
            title: "طالب غير موجود",
            description: "لم يتم العثور على طالب بهذا المعرف",
            variant: "destructive",
          });
          return;
        }

        // Mark attendance for today
        const today = new Date().toISOString().split("T")[0];
        await ApiService.markAttendance(studentId, today);

        toast({
          title: "تم تسجيل الحضور بنجاح",
          description: `تم تسجيل حضور ${student.name} لليوم`,
        });

        onSuccess();
      } catch (err) {
        const errorMessage = getErrorMessage(err, "mark_attendance");
        onError(errorMessage);
        toast({
          title: "خطأ في تسجيل الحضور",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [onSuccess, onError]
  );

  return {
    addStudent,
    updateStudent,
    deleteStudent,
    handleStudentScan,
  };
}

// Centralized error message handling for student operations
function getErrorMessage(err: unknown, operation: string): string {
  if (err instanceof Error) {
    // Map common backend errors to Arabic messages
    const errorMappings: Record<string, string> = {
      "Group name is required": "المجموعة مطلوبة",
      "Student name is required": "اسم الطالب مطلوب",
      "Plan amount must be positive": "مبلغ الخطة يجب أن يكون أكبر من صفر",
      "Student with ID": "الطالب غير موجود",
      "Failed to execute": "فشل في تنفيذ العملية",
      "Attendance already marked": "تم تسجيل الحضور مسبقاً لهذا اليوم",
      "Student not found": "الطالب غير موجود",
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (err.message.includes(key)) {
        return value;
      }
    }

    // Return the original error message if no mapping found
    return `خطأ: ${err.message}`;
  }

  // Fallback for unknown error types
  const operationNames: Record<string, string> = {
    add_student: "إضافة الطالب",
    update_student: "تحديث الطالب",
    delete_student: "حذف الطالب",
    mark_attendance: "تسجيل الحضور",
  };

  return `فشل في ${operationNames[operation] || operation}`;
}

