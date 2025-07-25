import { useState } from "react";
import QRScanner from "./QRScanner";
import StudentGrid from "./StudentGrid";
import StudentForm from "./StudentForm";
import ExportManager from "./ExportManager";
import Settings from "./Settings";
import QRGenerator from "./QRGenerator";
import { Student, AppSettings } from "../types";
import "../styles/App.css";

function App() {
  // State management (placeholder data)
  const [students] = useState<Student[]>([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings] = useState<AppSettings>({
    paymentThreshold: 6000,
    defaultGroups: ["Group A", "Group B", "Group C"],
    enableAuditLog: true,
    language: "en",
    theme: "light",
    enableMultiUser: false,
    backupEncryption: false,
    accessibilityMode: false,
  });

  // Placeholder event handlers
  const handleScan = (studentId: string) => {
    console.log("Scanned student ID:", studentId);
  };

  const handleStudentUpdate = (student: Student) => {
    console.log("Update student:", student);
  };

  const handleStudentDelete = (studentId: string) => {
    console.log("Delete student:", studentId);
  };

  const handleStudentSubmit = (studentData: Partial<Student>) => {
    console.log("Submit student:", studentData);
    setShowStudentForm(false);
  };

  const handleSettingsUpdate = (newSettings: AppSettings) => {
    console.log("Update settings:", newSettings);
  };

  const handleExportAttendance = () => {
    console.log("Export attendance");
  };

  const handleExportPayments = () => {
    console.log("Export payments");
  };

  const handleExportQRCodes = () => {
    console.log("Export QR codes");
  };

  const handleExportQR = (studentId: string) => {
    console.log("Export QR for student:", studentId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Student Management System</h1>
        <p>
          Excel-like student data management with QR code attendance tracking
        </p>
        <div className="header-actions">
          <button onClick={() => setShowStudentForm(true)}>Add Student</button>
          <button onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>

      <main className="app-main">
        <div className="status-message">
          <h2>✅ Task 1 Complete: Project Structure Initialized</h2>
          <p>Tauri project with React frontend successfully created!</p>
          <ul
            style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}
          >
            <li>✅ Tauri 2.x with React 19 and TypeScript configured</li>
            <li>✅ React Data Grid dependency installed</li>
            <li>✅ Project directory structure created</li>
            <li>✅ Component placeholders created for future tasks</li>
            <li>✅ Service layer and utilities set up</li>
            <li>✅ RTL support prepared in CSS</li>
          </ul>
        </div>

        <QRScanner onScan={handleScan} />

        <StudentGrid
          students={students}
          onStudentUpdate={handleStudentUpdate}
          onStudentDelete={handleStudentDelete}
        />

        <ExportManager
          onExportAttendance={handleExportAttendance}
          onExportPayments={handleExportPayments}
          onExportQRCodes={handleExportQRCodes}
        />

        {students.length > 0 && (
          <QRGenerator
            studentId={students[0].id}
            studentName={students[0].name}
            onExportQR={handleExportQR}
          />
        )}
      </main>

      <StudentForm
        isOpen={showStudentForm}
        onSubmit={handleStudentSubmit}
        onCancel={() => setShowStudentForm(false)}
      />

      <Settings
        settings={settings}
        onSettingsUpdate={handleSettingsUpdate}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
