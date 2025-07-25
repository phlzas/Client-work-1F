import React from "react";
import { Student } from "../types";

interface StudentFormProps {
  student?: Student;
  onSubmit: (studentData: Partial<Student>) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onSubmit: _onSubmit,
  onCancel,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="student-form-modal">
      <div className="student-form">
        <h3>{student ? "Edit Student" : "Add New Student"}</h3>
        <p>
          Student form component placeholder - to be implemented in task 4.4
        </p>
        <div
          style={{ padding: "20px", border: "1px dashed #ccc", margin: "10px" }}
        >
          <p>Features to implement:</p>
          <ul style={{ textAlign: "left" }}>
            <li>Form fields for Name, Group, and PaidAmount</li>
            <li>Form validation with real-time error messages</li>
            <li>Arabic text input support with RTL handling</li>
            <li>Auto-generation of unique student IDs</li>
          </ul>
          <button onClick={onCancel} style={{ margin: "5px" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentForm;
