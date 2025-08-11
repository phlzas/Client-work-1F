import { useState, useCallback } from "react";

export interface StatusState {
  message: string;
  type: "success" | "error" | "info";
  isVisible: boolean;
}

export function useStatusManager() {
  const [status, setStatus] = useState<StatusState>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showStatus = useCallback(
    (message: string, type: StatusState["type"] = "info", duration = 3000) => {
      setStatus({
        message,
        type,
        isVisible: true,
      });

      if (duration > 0) {
        setTimeout(() => {
          setStatus((prev) => ({ ...prev, isVisible: false }));
        }, duration);
      }
    },
    []
  );

  const hideStatus = useCallback(() => {
    setStatus((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showSuccess = useCallback(
    (message: string, duration = 3000) => {
      showStatus(message, "success", duration);
    },
    [showStatus]
  );

  const showError = useCallback(
    (message: string, duration = 3000) => {
      showStatus(message, "error", duration);
    },
    [showStatus]
  );

  return {
    status,
    showStatus,
    hideStatus,
    showSuccess,
    showError,
  };
}
