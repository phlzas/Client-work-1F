/**
 * Validation utilities for student management system
 */

/**
 * Validates and sanitizes a student ID
 * @param studentId - The student ID to validate
 * @returns Object with isValid flag and sanitized value
 */
export function validateStudentId(studentId: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!studentId || typeof studentId !== "string") {
    return {
      isValid: false,
      sanitized: "",
      error: "رقم الطالب مطلوب",
    };
  }

  // Remove whitespace and convert to uppercase
  const sanitized = studentId.trim().toUpperCase();

  // Check if empty after trimming
  if (!sanitized) {
    return {
      isValid: false,
      sanitized: "",
      error: "رقم الطالب لا يمكن أن يكون فارغاً",
    };
  }

  // Check length (assuming student IDs should be between 3-20 characters)
  if (sanitized.length < 3 || sanitized.length > 20) {
    return {
      isValid: false,
      sanitized,
      error: "رقم الطالب يجب أن يكون بين 3 و 20 حرف",
    };
  }

  // Check for valid characters (alphanumeric only)
  const validPattern = /^[A-Z0-9]+$/;
  if (!validPattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: "رقم الطالب يجب أن يحتوي على أحرف وأرقام إنجليزية فقط",
    };
  }

  return {
    isValid: true,
    sanitized,
  };
}

/**
 * Debounce function to limit API calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
