import { useState, useCallback } from "react";

interface ErrorState {
  message: string;
  type: "error" | "warning" | "info";
  timestamp: number;
}

export function useErrorHandler() {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = useCallback(
    (message: string, type: "error" | "warning" | "info" = "error") => {
      setError({
        message,
        type,
        timestamp: Date.now(),
      });
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback(
    (err: unknown, context: string) => {
      console.error(`${context}:`, err);

      let errorMessage = `حدث خطأ في ${context}`;

      if (err instanceof Error) {
        if (err.message.includes("Group name is required")) {
          errorMessage = "المجموعة مطلوبة";
        } else if (err.message.includes("Student name is required")) {
          errorMessage = "اسم الطالب مطلوب";
        } else if (err.message.includes("Plan amount must be positive")) {
          errorMessage = "مبلغ الخطة يجب أن يكون أكبر من صفر";
        } else {
          errorMessage = `${context}: ${err.message}`;
        }
      }

      showError(errorMessage);
    },
    [showError]
  );

  return {
    error,
    showError,
    clearError,
    handleApiError,
  };
}
