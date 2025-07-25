import React from "react";

interface ExportManagerProps {
  onExportAttendance: () => void;
  onExportPayments: () => void;
  onExportQRCodes: () => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({
  onExportAttendance,
  onExportPayments,
  onExportQRCodes,
}) => {
  return (
    <div className="export-manager">
      <h3>Export Manager</h3>
      <p>
        Export functionality component placeholder - to be implemented in task
        5.2
      </p>
      <div
        style={{ padding: "20px", border: "1px dashed #ccc", margin: "10px" }}
      >
        <p>Export options:</p>
        <button onClick={onExportAttendance} style={{ margin: "5px" }}>
          Export Attendance CSV
        </button>
        <button onClick={onExportPayments} style={{ margin: "5px" }}>
          Export Payment Summary CSV
        </button>
        <button onClick={onExportQRCodes} style={{ margin: "5px" }}>
          Export QR Codes PDF
        </button>
      </div>
    </div>
  );
};

export default ExportManager;
