// Additional test setup for specific test utilities
import "@testing-library/jest-dom";

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is deprecated")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("componentWillReceiveProps") ||
        args[0].includes("componentWillUpdate"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  createMockStudent: (overrides = {}) => ({
    id: "STU001",
    name: "أحمد محمد",
    group_name: "المجموعة الأولى",
    payment_plan: "one-time" as const,
    plan_amount: 6000,
    paid_amount: 6000,
    enrollment_date: "2024-01-01",
    payment_status: "paid" as const,
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
    ...overrides,
  }),

  createMockSettings: (overrides = {}) => ({
    payment_threshold: 6000,
    default_groups: ["المجموعة الأولى"],
    enable_audit_log: true,
    language: "ar" as const,
    theme: "light" as const,
    enable_multi_user: false,
    backup_encryption: false,
    accessibility_mode: true,
    reminder_days: 7,
    ...overrides,
  }),

  waitForLoadingToFinish: () => {
    return new Promise((resolve) => setTimeout(resolve, 0));
  },
};

// Extend Jest matchers for better assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
    }
  }

  var testUtils: {
    createMockStudent: (overrides?: any) => any;
    createMockSettings: (overrides?: any) => any;
    waitForLoadingToFinish: () => Promise<void>;
  };
}

// Custom matcher for accessibility testing
expect.extend({
  toBeAccessible(received) {
    // Basic accessibility checks
    const hasAriaLabel = received.hasAttribute("aria-label");
    const hasAriaLabelledBy = received.hasAttribute("aria-labelledby");
    const hasRole = received.hasAttribute("role");
    const isAccessible = hasAriaLabel || hasAriaLabelledBy || hasRole;

    return {
      message: () =>
        `expected element to be accessible (have aria-label, aria-labelledby, or role)`,
      pass: isAccessible,
    };
  },
});
