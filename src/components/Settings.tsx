import React from "react";
import { AppSettings } from "../types";

interface SettingsProps {
  settings: AppSettings;
  onSettingsUpdate: (settings: AppSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  settings: _settings,
  onSettingsUpdate: _onSettingsUpdate,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal">
      <div className="settings">
        <h3>Application Settings</h3>
        <p>Settings component placeholder - to be implemented in task 3.3</p>
        <div
          style={{ padding: "20px", border: "1px dashed #ccc", margin: "10px" }}
        >
          <p>Settings to implement:</p>
          <ul style={{ textAlign: "left" }}>
            <li>Payment threshold configuration (default: 6000 EGP)</li>
            <li>Default group labels</li>
            <li>Language selection (English/Arabic)</li>
            <li>Theme selection (Light/Dark)</li>
            <li>Backup and restore options</li>
          </ul>
          <button onClick={onClose} style={{ margin: "5px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
