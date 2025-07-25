// Date formatting utilities
export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getTodayString = (): string => {
  return new Date().toISOString().split("T")[0];
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = "EGP"
): string => {
  return `${amount.toLocaleString()} ${currency}`;
};

// Payment status utilities
export const getPaymentStatus = (
  paidAmount: number,
  threshold: number = 6000
): "Paid" | "Not Paid" => {
  return paidAmount >= threshold ? "Paid" : "Not Paid";
};

// Text direction utilities for RTL support
export const getTextDirection = (text: string): "ltr" | "rtl" => {
  // Simple Arabic character detection
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F]/;
  return arabicRegex.test(text) ? "rtl" : "ltr";
};

// Student ID generation utility
export const generateStudentId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `STU-${timestamp}-${random}`.toUpperCase();
};

// Validation utilities
export const validateStudentName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateGroup = (group: string): boolean => {
  return group.trim().length >= 1 && group.trim().length <= 50;
};

export const validatePaidAmount = (amount: number): boolean => {
  return amount >= 0 && amount <= 999999;
};
