import { useState, useEffect, useCallback } from "react";
import { Student, AppSettings } from "@/types";
import { ApiService } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface AppState {
  students: Student[];
  settings: AppSettings;
  activeView: string;
  isStudentFormOpen: boolean;
  editingStudent: Student | null;
  scanResult: string;
  error: string | null;
  isLoading: boolean;
}

interface AppActions {
  setActiveView: (view: string) => void;
  openStudentForm: (student?: Student) => void;
  closeStudentForm: () => void;
  setScanResult: (result: string) => void;
  clearError: () => void;
  refreshStudents: () => Promise<void>;
  loadInitialData: () => Promise<void>;
}

export function useAppState(): [AppState, AppActions] {
  const [state, setState] = useState<AppState>({
    students: [],
    settings: {
      payment_threshold: 6000,
      default_groups: [
        "المجموعة الأولى",
        "المجموعة الثانية",
        "المجموعة الثالثة",
      ],
      enable_audit_log: true,
      language: "ar",
      theme: "light",
      enable_multi_user: false,
      backup_encryption: false,
      accessibility_mode: false,
      reminder_days: 7,
    },
    activeView: "dashboard",
    isStudentFormOpen: false,
    editingStudent: null,
    scanResult: "",
    error: null,
    isLoading: false,
  });

  const loadInitialData = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Initialize default data first
      await Promise.all([
        ApiService.ensureDefaultGroupsExist(),
        ApiService.ensurePaymentSettingsExist(),
      ]);

      // Load students and settings
      const [students, settings] = await Promise.all([
        ApiService.getAllStudents(),
        ApiService.getSettings(),
      ]);

      setState((prev) => ({
        ...prev,
        students,
        settings,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = getErrorMessage(err, "load_data");
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      toast({
        title: "خطأ في تحميل البيانات",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, []);

  const refreshStudents = useCallback(async () => {
    try {
      const students = await ApiService.getAllStudents();
      setState((prev) => ({ ...prev, students }));
    } catch (err) {
      const errorMessage = getErrorMessage(err, "refresh_students");
      setState((prev) => ({ ...prev, error: errorMessage }));
      toast({
        title: "خطأ في تحديث قائمة الطلاب",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, []);

  const setActiveView = useCallback((view: string) => {
    setState((prev) => ({ ...prev, activeView: view }));
  }, []);

  const openStudentForm = useCallback((student?: Student) => {
    setState((prev) => ({
      ...prev,
      isStudentFormOpen: true,
      editingStudent: student || null,
    }));
  }, []);

  const closeStudentForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isStudentFormOpen: false,
      editingStudent: null,
    }));
  }, []);

  const setScanResult = useCallback((result: string) => {
    setState((prev) => ({ ...prev, scanResult: result }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const actions: AppActions = {
    setActiveView,
    openStudentForm,
    closeStudentForm,
    setScanResult,
    clearError,
    refreshStudents,
    loadInitialData,
  };

  return [state, actions];
}

// Centralized error message handling
function getErrorMessage(err: unknown, operation: string): string {
  if (err instanceof Error) {
    // Map common backend errors to Arabic messages
    const errorMappings: Record<string, string> = {
      "Group name is required": "المجموعة مطلوبة",
      "Student name is required": "اسم الطالب مطلوب",
      "Plan amount must be positive": "مبلغ الخطة يجب أن يكون أكبر من صفر",
      "Student with ID": "الطالب غير موجود",
      "Failed to execute": "فشل في تنفيذ العملية",
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (err.message.includes(key)) {
        return value;
      }
    }

    // Return the original error message if no mapping found
    return `خطأ: ${err.message}`;
  }

  // Fallback for unknown error types
  const operationNames: Record<string, string> = {
    add_student: "إضافة الطالب",
    update_student: "تحديث الطالب",
    delete_student: "حذف الطالب",
    load_data: "تحميل البيانات",
    refresh_students: "تحديث قائمة الطلاب",
  };

  return `فشل في ${operationNames[operation] || operation}`;
}
