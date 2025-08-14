import { invoke } from "@tauri-apps/api/core";
import type {
  BackupMetadata,
  BackupValidationResult,
  RestoreResult,
} from "@/types";

export class BackupService {
  /**
   * Create a backup to a default location
   */
  static async createBackup(
    password?: string
  ): Promise<BackupMetadata & { file_path?: string }> {
    // Generate default file path
    const timestamp = new Date().toISOString().split("T")[0];
    const filePath = `backup-${timestamp}.smsbackup`;

    // Create backup
    const result = await invoke<BackupMetadata>("create_backup", {
      filePath,
      password,
    });
    return { ...(result as BackupMetadata), file_path: filePath };
  }

  /**
   * Validate a backup file
   */
  static async validateBackup(
    filePath: string
  ): Promise<BackupValidationResult> {
    return await invoke<BackupValidationResult>("validate_backup", {
      filePath,
    });
  }

  /**
   * Restore from backup file
   */
  static async restoreBackup(
    filePath: string,
    password?: string
  ): Promise<RestoreResult> {
    // First validate the backup
    const validation = await this.validateBackup(filePath);
    if (!validation.is_valid) {
      throw new Error(
        `ملف النسخة الاحتياطية غير صالح: ${validation.errors.join(", ")}`
      );
    }

    // Restore backup
    return await invoke<RestoreResult>("restore_backup", {
      filePath,
      password,
    });
  }

  /**
   * Get backup metadata
   */
  static async getBackupMetadata(filePath: string): Promise<BackupMetadata> {
    return await invoke<BackupMetadata>("get_backup_metadata", {
      filePath,
    });
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 بايت";

    const k = 1024;
    const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Create a file input element for backup file selection
   */
  static createFileInput(accept: string = ".smsbackup"): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.style.display = "none";

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        document.body.removeChild(input);
        resolve(file || null);
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Read file as text for backup operations
   */
  static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error("فشل في قراءة الملف"));
      reader.readAsText(file);
    });
  }
}
