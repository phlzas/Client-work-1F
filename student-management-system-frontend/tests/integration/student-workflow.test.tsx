import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Mock Tauri API
const mockInvoke = jest.fn();
jest.mock("@tauri-apps/api/tauri", () => ({
  invoke: mockInvoke,
}));

// Mock components for integration testing
const MockStudentApp = () => {
  const [students, setStudents] = React.useState([
    {
      id: "STU001",
      name: "أحمد محمد",
      group_name: "المجموعة الأولى",
      payment_status: "paid",
    },
  ]);
  const [scanResult, setScanResult] = React.useState("");

  const handleScan = async (studentId: string) => {
    try {
      const result = await mockInvoke("record_attendance", {
        student_id: studentId,
      });
      setScanResult(result.message || "تم تسجيل الحضور");
    } catch (error) {
      setScanResult("خطأ في التسجيل");
    }
  };

  return (
    <div data-testid="student-app">
      <div data-testid="qr-scanner">
        <input
          type="text"
          placeholder="مسح رمز QR"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleScan((e.target as HTMLInputElement).value);
            }
          }}
        />
        {scanResult && <div data-testid="scan-result">{scanResult}</div>}
      </div>

      <div data-testid="student-list">
        {students.map((student) => (
          <div key={student.id} data-testid={`student-${student.id}`}>
            {student.name} - {student.payment_status}
          </div>
        ))}
      </div>
    </div>
  );
};

describe("Student Management Workflow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the main application components", () => {
    render(<MockStudentApp />);

    expect(screen.getByTestId("student-app")).toBeInTheDocument();
    expect(screen.getByTestId("qr-scanner")).toBeInTheDocument();
    expect(screen.getByTestId("student-list")).toBeInTheDocument();
  });

  it("displays student data correctly", () => {
    render(<MockStudentApp />);

    expect(screen.getByTestId("student-STU001")).toBeInTheDocument();
    expect(screen.getByText("أحمد محمد - paid")).toBeInTheDocument();
  });

  it("handles QR scanning workflow", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue({ message: "تم تسجيل الحضور بنجاح" });

    render(<MockStudentApp />);

    const input = screen.getByPlaceholderText("مسح رمز QR");
    await user.type(input, "STU001");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("scan-result")).toHaveTextContent(
        "تم تسجيل الحضور بنجاح"
      );
    });

    expect(mockInvoke).toHaveBeenCalledWith("record_attendance", {
      student_id: "STU001",
    });
  });

  it("handles scan errors gracefully", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValue(new Error("Student not found"));

    render(<MockStudentApp />);

    const input = screen.getByPlaceholderText("مسح رمز QR");
    await user.type(input, "INVALID");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByTestId("scan-result")).toHaveTextContent(
        "خطأ في التسجيل"
      );
    });
  });
});
