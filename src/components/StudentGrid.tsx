import React from "react";
import { Student } from "../types";

interface StudentGridProps {
  students: Student[];
  onStudentUpdate: (student: Student) => void;
  onStudentDelete: (studentId: string) => void;
}

const StudentGrid: React.FC<StudentGridProps> = ({
  students,
  onStudentUpdate: _onStudentUpdate,
  onStudentDelete: _onStudentDelete,
}) => {
  return (
    <div className="student-grid">
      <h3>Student Data Grid</h3>
      <p>
        Excel-like data grid component placeholder - to be implemented in task
        4.3
      </p>
      <p>Will use React Data Grid for Excel-like functionality</p>
      <div
        style={{ padding: "20px", border: "1px dashed #ccc", margin: "10px" }}
      >
        <p>Students count: {students.length}</p>
        <p>Features to implement:</p>
        <ul style={{ textAlign: "left" }}>
          <li>Inline editing</li>
          <li>Copy/paste operations</li>
          <li>Fill handle functionality</li>
          <li>Row highlighting for payment status</li>
          <li>Filtering by Group and PaymentStatus</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentGrid;
