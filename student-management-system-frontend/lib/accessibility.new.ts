/**
 * Accessibility utilities for the Student Management System
 * Provides ARIA support, screen reader compatibility, and high contrast mode
 */

import { useEffect, useState } from "react";

// ------------------------------------
// Core ARIA Utilities
// ------------------------------------

// Counter for generating unique ARIA IDs
let ariaIdCounter = 0;

// Generate unique ARIA IDs
export function generateAriaId(prefix: string = "aria"): string {
  return `${prefix}-${++ariaIdCounter}`;
}

// ------------------------------------
// ARIA Labels and Constants
// ------------------------------------

// Unified aria labels for the entire application
export const ariaLabels = {
  // Navigation
  mainNavigation: "القائمة الرئيسية",
  breadcrumb: "شريط التنقل",
  pagination: "التنقل بين الصفحات",
  required: "حقل مطلوب",
  optional: "حقل اختياري",
  invalid: "إدخال غير صالح",
  valid: "إدخال صالح",

  // Dynamic labels
  edit: (name: string) => `تعديل ${name}`,
  delete: (name: string) => `حذف ${name}`,
  add: (type: string) => `إضافة ${type}`,
  view: (name: string) => `عرض ${name}`,
  status: (state: string) => `الحالة: ${state}`,

  // QR Scanner specific labels
  qrScanner: "مسح رمز QR للحضور",
  qrCodeInput: "مسح رمز QR أو إدخال رقم الطالب",
  scanQRCodePlaceholder: "امسح رمز QR أو أدخل رقم الطالب...",
  scanInProgress: "جاري مسح الرمز، برجاء الانتظار",
  scanTooQuick: "برجاء الانتظار قبل المسح مرة أخرى",
  scanningQRCode: "جاري مسح رمز الطالب",
  scanError: "حدث خطأ أثناء المسح",

  // Student management labels
  studentId: "رقم الطالب",
  studentName: "اسم الطالب",
  studentGroup: "المجموعة",
  paymentStatus: "حالة الدفع",
  attendanceLog: "سجل الحضور",
  searchStudents: "البحث عن طلاب",
  filterBy: (filter: string) => `تصفية حسب ${filter}`,

  // Form controls
  submit: "تأكيد",
  cancel: "إلغاء",
  clear: "مسح",
  search: "بحث",
  filter: "تصفية",
  sort: "ترتيب",
  close: "إغلاق",
  back: "رجوع",
  next: "التالي",
  previous: "السابق",

  // Navigation
  goToPage: (page: string) => `الذهاب إلى ${page}`,
  currentPage: "الصفحة الحالية",
  firstPage: "الصفحة الأولى",
  lastPage: "الصفحة الأخيرة",

  // Error messages
  errorOccurred: "حدث خطأ",
  tryAgain: "حاول مرة أخرى",
  invalidInput: "إدخال غير صالح",
  requiredField: "هذا الحقل مطلوب",

  // Success messages
  success: "تمت العملية بنجاح",
  saved: "تم الحفظ",
  updated: "تم التحديث",
  deleted: "تم الحذف",

  // Loading states
  loading: "جاري التحميل",
  processing: "جاري المعالجة",
  saving: "جاري الحفظ",
  deleting: "جاري الحذف",

  // Data states
  noData: "لا توجد بيانات",
  noResults: "لا توجد نتائج",
  empty: "فارغ",
} as const;

// ARIA roles constants
export const ARIA_ROLES = {
  BUTTON: "button",
  DIALOG: "dialog",
  ALERTDIALOG: "alertdialog",
  GRID: "grid",
  ROW: "row",
  COLUMNHEADER: "columnheader",
  GRIDCELL: "gridcell",
  NAVIGATION: "navigation",
  MAIN: "main",
  BANNER: "banner",
  CONTENTINFO: "contentinfo",
  COMPLEMENTARY: "complementary",
  FORM: "form",
  SEARCH: "search",
  TABLIST: "tablist",
  TAB: "tab",
  TABPANEL: "tabpanel",
} as const;

export const ARIA_SORT = {
  ASCENDING: "ascending",
  DESCENDING: "descending",
  NONE: "none",
} as const;

// ------------------------------------
// Components and Hooks
// ------------------------------------

// ARIA live region announcer
export class AriaAnnouncer {
  private static instance: AriaAnnouncer;
  private liveRegion: HTMLElement | null = null;

  private constructor() {
    this.createLiveRegion();
  }

  static getInstance(): AriaAnnouncer {
    if (!AriaAnnouncer.instance) {
      AriaAnnouncer.instance = new AriaAnnouncer();
    }
    return AriaAnnouncer.instance;
  }

  private createLiveRegion() {
    if (typeof window === "undefined") return;

    this.liveRegion = document.createElement("div");
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");
    this.liveRegion.setAttribute("class", "sr-only");
    this.liveRegion.style.position = "absolute";
    this.liveRegion.style.left = "-10000px";
    this.liveRegion.style.width = "1px";
    this.liveRegion.style.height = "1px";
    this.liveRegion.style.overflow = "hidden";
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: "polite" | "assertive" = "polite") {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute("aria-live", priority);
    this.liveRegion.textContent = message;

    // Clear after announcement to allow repeated messages
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = "";
      }
    }, 1000);
  }
}

// High contrast mode detection and management
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Check for system high contrast preference
    const mediaQuery = window.matchMedia("(prefers-contrast: high)");
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleHighContrast = () => {
    const newValue = !isHighContrast;
    setIsHighContrast(newValue);

    // Apply high contrast class to document
    if (newValue) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }

    // Store preference
    localStorage.setItem("high-contrast-mode", newValue.toString());

    // Announce change
    AriaAnnouncer.getInstance().announce(
      newValue ? "تم تفعيل وضع التباين العالي" : "تم إلغاء وضع التباين العالي"
    );
  };

  return { isHighContrast, toggleHighContrast };
}

// Screen reader detection
export function useScreenReaderDetection() {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

  useEffect(() => {
    // Check for common screen reader indicators
    const checkScreenReader = () => {
      // Check for NVDA, JAWS, or other screen readers
      const hasScreenReader =
        navigator.userAgent.includes("NVDA") ||
        navigator.userAgent.includes("JAWS") ||
        window.speechSynthesis?.getVoices().length > 0 ||
        "speechSynthesis" in window;

      setIsScreenReaderActive(hasScreenReader);
    };

    checkScreenReader();

    // Listen for speech synthesis voices loaded (indicates screen reader)
    if ("speechSynthesis" in window) {
      speechSynthesis.addEventListener("voiceschanged", checkScreenReader);
      return () =>
        speechSynthesis.removeEventListener("voiceschanged", checkScreenReader);
    }
  }, []);

  return isScreenReaderActive;
}

// ------------------------------------
// Form Field Utilities
// ------------------------------------

/**
 * Create ARIA attributes for form fields
 */
export interface AriaFormFieldProps {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  errorMessage?: string;
}

export function createAriaFormField({
  id,
  label,
  description,
  required = false,
  invalid = false,
  errorMessage,
}: AriaFormFieldProps) {
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = errorMessage ? `${id}-error` : undefined;

  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

  return {
    field: {
      id,
      "aria-labelledby": labelId,
      "aria-describedby": describedBy || undefined,
      "aria-required": required ? "true" : undefined,
      "aria-invalid": invalid ? "true" : undefined,
    },
    label: {
      id: labelId,
      htmlFor: id,
    },
    description: descriptionId
      ? {
          id: descriptionId,
          "aria-hidden": "false",
        }
      : undefined,
    error: errorId
      ? {
          id: errorId,
          role: "alert",
          "aria-live": "polite",
        }
      : undefined,
  };
}

// ------------------------------------
// Focus Management
// ------------------------------------

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];

  static pushFocus(element: HTMLElement) {
    const currentFocus = document.activeElement as HTMLElement;
    if (currentFocus) {
      this.focusStack.push(currentFocus);
    }
    element.focus();
  }

  static popFocus() {
    const previousFocus = this.focusStack.pop();
    if (previousFocus) {
      previousFocus.focus();
    }
  }

  static trapFocus(container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);
    firstElement.focus();

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }
}

// ------------------------------------
// Semantic Elements
// ------------------------------------

// Semantic HTML helpers
export const semanticElements = {
  // Create semantic landmarks
  main: (props: React.HTMLAttributes<HTMLElement>) => ({
    ...props,
    role: "main",
    "aria-label": "المحتوى الرئيسي",
  }),

  navigation: (props: React.HTMLAttributes<HTMLElement>) => ({
    ...props,
    role: "navigation",
    "aria-label": ariaLabels.mainNavigation,
  }),

  search: (props: React.HTMLAttributes<HTMLElement>) => ({
    ...props,
    role: "search",
    "aria-label": "البحث",
  }),

  // Form helpers
  fieldset: (legend: string) => ({
    role: "group",
    "aria-labelledby": `legend-${legend.replace(/\s+/g, "-")}`,
  }),

  // Status and alerts
  status: (props: React.HTMLAttributes<HTMLElement>) => ({
    ...props,
    role: "status",
    "aria-live": "polite",
  }),

  alert: (props: React.HTMLAttributes<HTMLElement>) => ({
    ...props,
    role: "alert",
    "aria-live": "assertive",
  }),
};

// ------------------------------------
// Keyboard Navigation
// ------------------------------------

// Keyboard navigation helpers
export const keyboardHelpers = {
  // Standard key codes
  keys: {
    ENTER: "Enter",
    SPACE: " ",
    ESCAPE: "Escape",
    ARROW_UP: "ArrowUp",
    ARROW_DOWN: "ArrowDown",
    ARROW_LEFT: "ArrowLeft",
    ARROW_RIGHT: "ArrowRight",
    TAB: "Tab",
    HOME: "Home",
    END: "End",
  },

  // Check if key is navigation key
  isNavigationKey: (key: string): boolean => {
    const navigationKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Tab",
    ];
    return navigationKeys.includes(key);
  },

  // Handle keyboard navigation for grids
  handleGridNavigation: (
    e: KeyboardEvent,
    rowCount: number,
    colCount: number
  ) => {
    const { key } = e;
    const target = e.target as HTMLElement;
    const currentRow = parseInt(target.getAttribute("aria-rowindex") || "0");
    const currentCol = parseInt(target.getAttribute("aria-colindex") || "0");

    let newRow = currentRow;
    let newCol = currentCol;

    switch (key) {
      case "ArrowUp":
        newRow = Math.max(1, currentRow - 1);
        break;
      case "ArrowDown":
        newRow = Math.min(rowCount, currentRow + 1);
        break;
      case "ArrowLeft":
        newCol = Math.max(1, currentCol - 1);
        break;
      case "ArrowRight":
        newCol = Math.min(colCount, currentCol + 1);
        break;
      case "Home":
        newCol = 1;
        break;
      case "End":
        newCol = colCount;
        break;
    }

    if (newRow !== currentRow || newCol !== currentCol) {
      e.preventDefault();
      const newCell = document.querySelector(
        `[aria-rowindex="${newRow}"][aria-colindex="${newCol}"]`
      ) as HTMLElement;
      newCell?.focus();
    }
  },
};

// ------------------------------------
// Color Contrast Utilities
// ------------------------------------

// Color contrast utilities for accessibility
export const colorHelpers = {
  // Calculate relative luminance
  getLuminance: (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const sRGB = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    // Calculate luminance
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  },

  // Calculate contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    const lum1 = colorHelpers.getLuminance(color1);
    const lum2 = colorHelpers.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsWCAG: (ratio: number, level: "AA" | "AAA" = "AA"): boolean => {
    return level === "AA" ? ratio >= 4.5 : ratio >= 7;
  },
};

// ------------------------------------
// Focus Control Hooks
// ------------------------------------

/**
 * Hook for managing focus trap in modals
 */
export function useFocusTrap(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const focusableElements = getFocusableElements(document.body);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener("keydown", handleTabKey);
    };
  }, [isActive]);
}

/**
 * Hook for announcing messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const [announcement, setAnnouncement] = useState("");

  const announce = (
    message: string,
    priority: "polite" | "assertive" = "polite"
  ) => {
    setAnnouncement(""); // Clear first to ensure re-announcement
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  };

  return { announcement, announce };
}

// ------------------------------------
// Focus Utilities
// ------------------------------------

/**
 * Utility to check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return focusableSelectors.some((selector) => element.matches(selector));
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Create skip link for keyboard navigation
 */
export function createSkipLink(targetId: string, text: string) {
  return {
    href: `#${targetId}`,
    className:
      "sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-2 focus:bg-primary focus:text-primary-foreground",
    children: text,
  };
}
