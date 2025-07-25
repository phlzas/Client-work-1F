import React from "react";

interface QRGeneratorProps {
  studentId: string;
  studentName: string;
  onExportQR: (studentId: string) => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({
  studentId,
  studentName,
  onExportQR,
}) => {
  return (
    <div className="qr-generator">
      <h3>QR Code Generator</h3>
      <p>
        QR code generation component placeholder - to be implemented in task 6.2
      </p>
      <div
        style={{ padding: "20px", border: "1px dashed #ccc", margin: "10px" }}
      >
        <p>Student: {studentName}</p>
        <p>ID: {studentId}</p>
        <p>Features to implement:</p>
        <ul style={{ textAlign: "left" }}>
          <li>Generate QR code for student ID</li>
          <li>Display QR code visually</li>
          <li>Export individual QR codes</li>
          <li>Batch export for groups</li>
        </ul>
        <button onClick={() => onExportQR(studentId)} style={{ margin: "5px" }}>
          Export QR Code
        </button>
      </div>
    </div>
  );
};

export default QRGenerator;
