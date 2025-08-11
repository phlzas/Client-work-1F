import React from "react";
import type { Student } from "@/types";

// Type definitions for mock components
export interface MockQRScannerProps {
  onScan: (id: string) => void;
  result: string;
}

export interface MockStudentGridProps {
  students: Student[];
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onAddStudent: () => void;
}

export interface MockStudentFormProps {
  isOpen: boolean;
  student: Student | null;
  onSubmit: (data: StudentFormData) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface StudentFormData {
  name: string;
  group_name: string;
  payment_plan: "one-time" | "monthly" | "installment";
}

// Mock QR Scanner Component
export const MockQRScanner: React.FC<MockQRScannerProps> = ({
  onScan,
  result,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      onScan(target.value);
      target.value = "";
    }
  };

  const isError = result.includes("خطأ");

  return (
    <div data-testid="qr-scanner">
      <input
        type="text"
        placeholder="مسح رمز QR أو إدخال رقم الطالب"
        aria-label="مسح رمز QR أو إدخال رقم الطالب"
        onKeyDown={handleKeyDown}
      />
      {result && (
        <div
          role={isError ? "alert" : "status"}
          className={isError ? "border-red-200 bg-red-50" : ""}
        >
          {result}
        </div>
      )}
    </div>
  );
};

// Mock Student Grid Component
export const MockStudentGrid: React.FC<MockStudentGridProps> = ({
  students,
  onEditStudent,
  onDeleteStudent,
  onAddStudent,
}) => (
  <div data-testid="student-grid">
    <div>
      <h2>قائمة الطلاب</h2>
      <button onClick={onAddStudent}>إضافة طالب جديد</button>
      <input type="search" placeholder="البحث..." role="searchbox" />
      <select defaultValue="جميع الحالات">
        <option value="all">جميع الحالات</option>
        <option value="paid">مدفوع</option>
        <option value="pending">في الانتظار</option>
        <option value="overdue">متأخر</option>
      </select>
      <select defaultValue="جميع المجموعات">
        <option value="all">جميع المجموعات</option>
        <option value="المجموعة الأولى">المجموعة الأولى</option>
        <option value="المجموعة الثانية">المجموعة الثانية</option>
      </select>
    </div>
    <table role="table">
      <thead>
        <tr role="row">
          <th>الاسم</th>
          <th>المجموعة</th>
          <th>حالة الدفع</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id} role="row">
            <td>{student.name}</td>
            <td>{student.group_name}</td>
            <td>{student.payment_status}</td>
            <td>
              <button onClick={() => onEditStudent(student)}>تعديل</button>
              <button onClick={() => onDeleteStudent(student)}>حذف</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Mock Student Form Component
export const MockStudentForm: React.FC<MockStudentFormProps> = ({
  isOpen,
  student,
  onSubmit,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div data-testid="student-form" role="dialog">
      <h2>{student ? "تعديل الطالب" : "إضافة طالب جديد"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          onSubmit({
            name: formData.get("name") as string,
            group_name: formData.get("group_name") as string,
            payment_plan: formData.get("payment_plan") as
              | "one-time"
              | "monthly"
              | "installment",
          });
        }}
      >
        <label>
          اسم الطالب *
          <input
            name="name"
            type="text"
            defaultValue={student?.name || ""}
            required
          />
        </label>
        <label>
          المجموعة
          <select name="group_name" defaultValue={student?.group_name || ""}>
            <option value="">اختر المجموعة</option>
            <option value="المجموعة الأولى">المجموعة الأولى</option>
            <option value="المجموعة الثانية">المجموعة الثانية</option>
          </select>
        </label>
        <label>
          خطة الدفع
          <select
            name="payment_plan"
            defaultValue={student?.payment_plan || ""}
          >
            <option value="">اختر خطة الدفع</option>
            <option value="one-time">دفعة واحدة</option>
            <option value="monthly">شهري</option>
            <option value="installment">أقساط</option>
          </select>
        </label>
        <div>
          <button type="submit">{student ? "حفظ" : "إضافة الطالب"}</button>
          <button type="button" onClick={onCancel || onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};
