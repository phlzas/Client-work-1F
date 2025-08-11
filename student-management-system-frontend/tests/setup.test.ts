/**
 * Basic setup test to verify Jest configuration
 */

describe("Test Setup", () => {
  it("should run basic tests", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have access to DOM APIs", () => {
    const element = document.createElement("div");
    element.textContent = "Test";
    expect(element.textContent).toBe("Test");
  });

  it("should have jest-dom matchers available", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    document.body.removeChild(element);
  });

  it("should handle Arabic text correctly", () => {
    const arabicText = "مرحبا بك في نظام إدارة الطلاب";
    expect(arabicText).toContain("نظام");
    expect(arabicText.length).toBeGreaterThan(0);
  });
});
