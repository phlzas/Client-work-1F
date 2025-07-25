import React from "react";

interface QRScannerProps {
  onScan: (studentId: string) => void;
  disabled?: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScan: _onScan,
  disabled = false,
}) => {
  return (
    <div className="qr-scanner">
      <h3>QR Scanner</h3>
      <p>QR Scanner component placeholder - to be implemented in task 4.2</p>
      <input
        type="text"
        placeholder="Scan or enter student ID..."
        disabled={disabled}
        style={{ padding: "10px", width: "300px", margin: "10px" }}
      />
    </div>
  );
};

export default QRScanner;
