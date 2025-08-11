import { ariaLabels, FocusManager } from "@/lib/accessibility";

describe("Accessibility Utilities", () => {
  describe("ariaLabels", () => {
    it("provides correct Arabic ARIA labels", () => {
      expect(ariaLabels.searchResults(5)).toBe("تم العثور على 5 نتائج");
      expect(ariaLabels.searchResults(0)).toBe("لم يتم العثور على نتائج");
      expect(ariaLabels.searchResults(1)).toBe("تم العثور على نتيجة واحدة");
    });

    it("has required accessibility labels", () => {
      expect(ariaLabels.noResults).toBeDefined();
      expect(ariaLabels.loading).toBeDefined();
      expect(ariaLabels.error).toBeDefined();
    });
  });

  describe("FocusManager", () => {
    let focusManager: FocusManager;
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      focusManager = new FocusManager(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it("initializes with container element", () => {
      expect(focusManager).toBeDefined();
    });

    it("finds focusable elements", () => {
      const input = document.createElement("input");
      const button = document.createElement("button");
      container.appendChild(input);
      container.appendChild(button);

      const focusableElements = focusManager.getFocusableElements();
      expect(focusableElements).toHaveLength(2);
      expect(focusableElements[0]).toBe(input);
      expect(focusableElements[1]).toBe(button);
    });

    it("focuses first element", () => {
      const input = document.createElement("input");
      container.appendChild(input);

      focusManager.focusFirst();
      expect(document.activeElement).toBe(input);
    });

    it("focuses last element", () => {
      const input1 = document.createElement("input");
      const input2 = document.createElement("input");
      container.appendChild(input1);
      container.appendChild(input2);

      focusManager.focusLast();
      expect(document.activeElement).toBe(input2);
    });

    it("traps focus within container", () => {
      const input1 = document.createElement("input");
      const input2 = document.createElement("input");
      container.appendChild(input1);
      container.appendChild(input2);

      // Focus last element and try to tab forward
      input2.focus();
      const event = new KeyboardEvent("keydown", { key: "Tab" });
      focusManager.trapFocus(event);

      expect(document.activeElement).toBe(input1);
    });

    it("handles reverse tab navigation", () => {
      const input1 = document.createElement("input");
      const input2 = document.createElement("input");
      container.appendChild(input1);
      container.appendChild(input2);

      // Focus first element and try to shift+tab backward
      input1.focus();
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
      });
      focusManager.trapFocus(event);

      expect(document.activeElement).toBe(input2);
    });

    it("restores focus to previous element", () => {
      const externalButton = document.createElement("button");
      document.body.appendChild(externalButton);
      externalButton.focus();

      const input = document.createElement("input");
      container.appendChild(input);

      focusManager.saveFocus();
      input.focus();
      focusManager.restoreFocus();

      expect(document.activeElement).toBe(externalButton);

      document.body.removeChild(externalButton);
    });

    it("handles empty container gracefully", () => {
      expect(() => {
        focusManager.focusFirst();
        focusManager.focusLast();
      }).not.toThrow();
    });

    it("ignores disabled elements", () => {
      const input = document.createElement("input");
      const disabledButton = document.createElement("button");
      disabledButton.disabled = true;

      container.appendChild(input);
      container.appendChild(disabledButton);

      const focusableElements = focusManager.getFocusableElements();
      expect(focusableElements).toHaveLength(1);
      expect(focusableElements[0]).toBe(input);
    });

    it("ignores hidden elements", () => {
      const input = document.createElement("input");
      const hiddenButton = document.createElement("button");
      hiddenButton.style.display = "none";

      container.appendChild(input);
      container.appendChild(hiddenButton);

      const focusableElements = focusManager.getFocusableElements();
      expect(focusableElements).toHaveLength(1);
      expect(focusableElements[0]).toBe(input);
    });
  });
});
