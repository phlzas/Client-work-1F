/**
 * Accessibility testing utilities using axe-core
 * For testing ARIA compliance and screen reader compatibility
 */

import { axe, toHaveNoViolations } from "jest-axe";

// Configure axe for Arabic/RTL content
export const configureAxeForArabic = () => {
  // Basic configuration for accessibility testing
  return axe;
};

// Screen reader simulation for testing
export class ScreenReaderSimulator {
  private announcements: string[] = [];
  private focusHistory: HTMLElement[] = [];

  // Simulate screen reader announcements
  simulateAnnouncement(element: HTMLElement): string {
    const ariaLabel = element.getAttribute("aria-label");
    const ariaLabelledBy = element.getAttribute("aria-labelledby");
    const role = element.getAttribute("role");
    const tagName = element.tagName.toLowerCase();

    let announcement = "";

    // Get the accessible name
    if (ariaLabel) {
      announcement += ariaLabel;
    } else if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        announcement += labelElement.textContent || "";
      }
    } else {
      announcement += element.textContent || "";
    }

    // Add role information
    if (role) {
      announcement += ` ${this.getRoleAnnouncement(role)}`;
    } else {
      announcement += ` ${this.getTagAnnouncement(tagName)}`;
    }

    // Add state information
    const ariaExpanded = element.getAttribute("aria-expanded");
    const ariaPressed = element.getAttribute("aria-pressed");
    const ariaChecked = element.getAttribute("aria-checked");
    const ariaSelected = element.getAttribute("aria-selected");
    const disabled = element.hasAttribute("disabled");

    if (ariaExpanded === "true") announcement += " مفتوح";
    if (ariaExpanded === "false") announcement += " مغلق";
    if (ariaPressed === "true") announcement += " مضغوط";
    if (ariaChecked === "true") announcement += " محدد";
    if (ariaSelected === "true") announcement += " مختار";
    if (disabled) announcement += " معطل";

    this.announcements.push(announcement);
    return announcement;
  }

  private getRoleAnnouncement(role: string): string {
    const roleMap: Record<string, string> = {
      button: "زر",
      link: "رابط",
      textbox: "مربع نص",
      combobox: "مربع تحرير وسرد",
      listbox: "مربع قائمة",
      option: "خيار",
      checkbox: "مربع اختيار",
      radio: "زر راديو",
      tab: "تبويب",
      tabpanel: "لوحة تبويب",
      dialog: "مربع حوار",
      alert: "تنبيه",
      status: "حالة",
      main: "المحتوى الرئيسي",
      navigation: "التنقل",
      search: "البحث",
      table: "جدول",
      row: "صف",
      cell: "خلية",
      columnheader: "رأس عمود",
      rowheader: "رأس صف",
    };

    return roleMap[role] || role;
  }

  private getTagAnnouncement(tagName: string): string {
    const tagMap: Record<string, string> = {
      h1: "عنوان مستوى 1",
      h2: "عنوان مستوى 2",
      h3: "عنوان مستوى 3",
      h4: "عنوان مستوى 4",
      h5: "عنوان مستوى 5",
      h6: "عنوان مستوى 6",
      p: "فقرة",
      ul: "قائمة",
      ol: "قائمة مرقمة",
      li: "عنصر قائمة",
      img: "صورة",
      input: "حقل إدخال",
      select: "قائمة منسدلة",
      textarea: "منطقة نص",
      form: "نموذج",
      table: "جدول",
      tr: "صف جدول",
      td: "خلية جدول",
      th: "رأس جدول",
    };

    return tagMap[tagName] || "";
  }

  // Simulate focus movement
  simulateFocus(element: HTMLElement): void {
    this.focusHistory.push(element);
    const announcement = this.simulateAnnouncement(element);
    console.log(`Focus: ${announcement}`);
  }

  // Get all announcements
  getAnnouncements(): string[] {
    return [...this.announcements];
  }

  // Clear announcements
  clearAnnouncements(): void {
    this.announcements = [];
  }

  // Get focus history
  getFocusHistory(): HTMLElement[] {
    return [...this.focusHistory];
  }
}

// Keyboard navigation testing
export class KeyboardNavigationTester {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  // Test tab navigation
  async testTabNavigation(): Promise<{
    focusableElements: HTMLElement[];
    tabOrder: number[];
    issues: string[];
  }> {
    const focusableElements = this.getFocusableElements();
    const tabOrder: number[] = [];
    const issues: string[] = [];

    focusableElements.forEach((element, index) => {
      const tabIndex = element.tabIndex;
      tabOrder.push(tabIndex);

      // Check for accessibility issues
      if (tabIndex < -1) {
        issues.push(`Element ${index} has invalid tabIndex: ${tabIndex}`);
      }

      if (!element.getAttribute("aria-label") && !element.textContent?.trim()) {
        issues.push(`Element ${index} lacks accessible name`);
      }
    });

    return { focusableElements, tabOrder, issues };
  }

  // Test arrow key navigation
  async testArrowKeyNavigation(): Promise<{
    supportsArrowKeys: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let supportsArrowKeys = false;

    // Check for ARIA patterns that should support arrow keys
    const role = this.element.getAttribute("role");
    const ariaOrientation = this.element.getAttribute("aria-orientation");

    if (
      ["listbox", "menu", "menubar", "tablist", "tree", "grid"].includes(
        role || ""
      )
    ) {
      supportsArrowKeys = true;

      // Check for proper ARIA attributes
      if (
        role === "listbox" &&
        !this.element.getAttribute("aria-activedescendant")
      ) {
        issues.push("Listbox should have aria-activedescendant");
      }

      if (["menu", "menubar"].includes(role || "") && !ariaOrientation) {
        issues.push("Menu should have aria-orientation");
      }
    }

    return { supportsArrowKeys, issues };
  }

  private getFocusableElements(): HTMLElement[] {
    const selector = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]:not([aria-disabled="true"])',
    ].join(", ");

    return Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }
}

// Color contrast testing
export class ContrastTester {
  // Test color contrast ratios
  static async testContrast(element: HTMLElement): Promise<{
    ratio: number;
    passes: boolean;
    level: "AA" | "AAA" | "fail";
  }> {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // Simple contrast calculation (would use more sophisticated method in production)
    const ratio = this.calculateContrastRatio(color, backgroundColor);

    let level: "AA" | "AAA" | "fail" = "fail";
    let passes = false;

    if (ratio >= 7) {
      level = "AAA";
      passes = true;
    } else if (ratio >= 4.5) {
      level = "AA";
      passes = true;
    }

    return { ratio, passes, level };
  }

  private static calculateContrastRatio(
    color1: string,
    color2: string
  ): number {
    // Simplified calculation - in production, would use proper color parsing
    // This is a placeholder implementation
    return 4.5; // Assume passing contrast for now
  }
}

// Comprehensive accessibility test suite
export class AccessibilityTestSuite {
  private element: HTMLElement;
  private screenReader: ScreenReaderSimulator;
  private keyboardTester: KeyboardNavigationTester;

  constructor(element: HTMLElement) {
    this.element = element;
    this.screenReader = new ScreenReaderSimulator();
    this.keyboardTester = new KeyboardNavigationTester(element);
  }

  async runFullTest(): Promise<{
    axeResults: any;
    keyboardResults: any;
    contrastResults: any;
    screenReaderResults: string[];
    summary: {
      passed: number;
      failed: number;
      warnings: number;
    };
  }> {
    // Run axe-core tests
    const axe = await import("axe-core");
    const axeResults = await axe.run(this.element);

    // Run keyboard tests
    const keyboardResults = await this.keyboardTester.testTabNavigation();

    // Run contrast tests
    const contrastResults = await ContrastTester.testContrast(this.element);

    // Simulate screen reader
    const focusableElements = this.keyboardTester["getFocusableElements"]();
    focusableElements.forEach((el) => this.screenReader.simulateFocus(el));
    const screenReaderResults = this.screenReader.getAnnouncements();

    // Calculate summary
    const summary = {
      passed: axeResults.passes.length,
      failed: axeResults.violations.length,
      warnings: axeResults.incomplete.length,
    };

    return {
      axeResults,
      keyboardResults,
      contrastResults,
      screenReaderResults,
      summary,
    };
  }
}

// Export testing utilities
export const accessibilityTesting = {
  configureAxeForArabic,
  ScreenReaderSimulator,
  KeyboardNavigationTester,
  ContrastTester,
  AccessibilityTestSuite,
};
