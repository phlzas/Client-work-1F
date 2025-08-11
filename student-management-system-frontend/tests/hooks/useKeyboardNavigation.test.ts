import { renderHook, act } from "@testing-library/react";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

describe("useKeyboardNavigation Hook", () => {
  let mockElement: HTMLDivElement;

  beforeEach(() => {
    mockElement = document.createElement("div");
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  it("returns container ref and utility functions", () => {
    const { result } = renderHook(() => useKeyboardNavigation({}));

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBe(null);
    expect(result.current.focusFirst).toBeInstanceOf(Function);
    expect(result.current.focusLast).toBeInstanceOf(Function);
    expect(result.current.focusNext).toBeInstanceOf(Function);
    expect(result.current.focusPrevious).toBeInstanceOf(Function);
    expect(result.current.getFocusableElements).toBeInstanceOf(Function);
  });

  it("handles arrow key navigation", () => {
    const mockOnArrowUp = jest.fn();
    const mockOnArrowDown = jest.fn();
    const mockOnArrowLeft = jest.fn();
    const mockOnArrowRight = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableArrowKeys: true,
        onArrowUp: mockOnArrowUp,
        onArrowDown: mockOnArrowDown,
        onArrowLeft: mockOnArrowLeft,
        onArrowRight: mockOnArrowRight,
      })
    );

    // Set the ref to our mock element
    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Simulate arrow key events
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnArrowUp).toHaveBeenCalled();

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnArrowDown).toHaveBeenCalled();

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnArrowLeft).toHaveBeenCalled();

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnArrowRight).toHaveBeenCalled();
  });

  it("handles Enter key", () => {
    const mockOnEnter = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableEnterKey: true,
        onEnter: mockOnEnter,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnEnter).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  it("handles Escape key", () => {
    const mockOnEscape = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableEscapeKey: true,
        onEscape: mockOnEscape,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnEscape).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  it("handles Tab key for focus trapping", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        trapFocus: true,
        enableTabNavigation: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Add focusable elements
    const input1 = document.createElement("input");
    const input2 = document.createElement("input");
    mockElement.appendChild(input1);
    mockElement.appendChild(input2);

    // Focus the last element first
    act(() => {
      input2.focus();
    });

    // Simulate Tab key (should wrap to first element)
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      });
      mockElement.dispatchEvent(event);
    });

    // Should trap focus within the container by wrapping to first element
    expect(document.activeElement).toBe(input1);
  });

  it("auto-focuses first element when enabled", () => {
    const input = document.createElement("input");
    mockElement.appendChild(input);

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        autoFocus: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    expect(document.activeElement).toBe(input);
  });

  it("restores focus when enabled", () => {
    const originalActiveElement = document.createElement("button");
    document.body.appendChild(originalActiveElement);
    originalActiveElement.focus();

    const { result, unmount } = renderHook(() =>
      useKeyboardNavigation({
        restoreFocus: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    const input = document.createElement("input");
    mockElement.appendChild(input);
    input.focus();

    unmount();

    expect(document.activeElement).toBe(originalActiveElement);

    document.body.removeChild(originalActiveElement);
  });

  it("ignores disabled keys", () => {
    const mockOnEnter = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableEnterKey: false,
        onEnter: mockOnEnter,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnEnter).not.toHaveBeenCalled();
  });

  it("handles multiple key combinations", () => {
    const mockOnEnter = jest.fn();
    const mockOnEscape = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableEnterKey: true,
        enableEscapeKey: true,
        onEnter: mockOnEnter,
        onEscape: mockOnEscape,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    act(() => {
      const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
      mockElement.dispatchEvent(enterEvent);
    });

    act(() => {
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      mockElement.dispatchEvent(escapeEvent);
    });

    expect(mockOnEnter).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    expect(mockOnEscape).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(
      mockElement,
      "removeEventListener"
    );

    const { result, unmount } = renderHook(() =>
      useKeyboardNavigation({
        enableEnterKey: true,
        enableEscapeKey: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });
});
  it("handles arrow key navigation with default behavior", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableArrowKeys: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Add focusable elements
    const input1 = document.createElement("input");
    const input2 = document.createElement("input");
    mockElement.appendChild(input1);
    mockElement.appendChild(input2);

    // Focus first element
    act(() => {
      input1.focus();
    });

    // Arrow down should move to next element
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      mockElement.dispatchEvent(event);
    });

    expect(document.activeElement).toBe(input2);

    // Arrow up should move back to previous element
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
      mockElement.dispatchEvent(event);
    });

    expect(document.activeElement).toBe(input1);
  });

  it("handles modifier keys correctly", () => {
    const mockOnEnter = jest.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        enableEnterKey: true,
        onEnter: mockOnEnter,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Should ignore Enter with Ctrl modifier
    act(() => {
      const event = new KeyboardEvent("keydown", { 
        key: "Enter", 
        ctrlKey: true 
      });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnEnter).not.toHaveBeenCalled();

    // Should handle Enter without modifiers
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      mockElement.dispatchEvent(event);
    });

    expect(mockOnEnter).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  it("provides utility functions for manual focus management", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({})
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Add focusable elements
    const input1 = document.createElement("input");
    const input2 = document.createElement("input");
    const input3 = document.createElement("input");
    mockElement.appendChild(input1);
    mockElement.appendChild(input2);
    mockElement.appendChild(input3);

    // Test focusFirst
    act(() => {
      result.current.focusFirst();
    });
    expect(document.activeElement).toBe(input1);

    // Test focusLast
    act(() => {
      result.current.focusLast();
    });
    expect(document.activeElement).toBe(input3);

    // Test focusNext
    act(() => {
      input1.focus();
      result.current.focusNext();
    });
    expect(document.activeElement).toBe(input2);

    // Test focusPrevious
    act(() => {
      result.current.focusPrevious();
    });
    expect(document.activeElement).toBe(input1);

    // Test getFocusableElements
    const focusableElements = result.current.getFocusableElements();
    expect(focusableElements).toHaveLength(3);
    expect(focusableElements).toEqual([input1, input2, input3]);
  });

  it("handles empty container gracefully", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        autoFocus: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Should not throw when no focusable elements exist
    expect(() => {
      result.current.focusFirst();
      result.current.focusLast();
      result.current.focusNext();
      result.current.focusPrevious();
    }).not.toThrow();

    expect(result.current.getFocusableElements()).toHaveLength(0);
  });

  it("filters out disabled and hidden elements", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({})
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    // Add various elements
    const enabledInput = document.createElement("input");
    const disabledInput = document.createElement("input");
    disabledInput.disabled = true;
    
    const hiddenInput = document.createElement("input");
    hiddenInput.style.display = "none";
    
    const ariaDisabledInput = document.createElement("input");
    ariaDisabledInput.setAttribute("aria-disabled", "true");

    mockElement.appendChild(enabledInput);
    mockElement.appendChild(disabledInput);
    mockElement.appendChild(hiddenInput);
    mockElement.appendChild(ariaDisabledInput);

    const focusableElements = result.current.getFocusableElements();
    
    // Should only include the enabled, visible element
    expect(focusableElements).toHaveLength(1);
    expect(focusableElements[0]).toBe(enabledInput);
  });

  it("handles focus wrapping with trapFocus enabled", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        trapFocus: true,
        enableArrowKeys: true,
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    const input1 = document.createElement("input");
    const input2 = document.createElement("input");
    mockElement.appendChild(input1);
    mockElement.appendChild(input2);

    // Focus last element and try to go next (should wrap to first)
    act(() => {
      input2.focus();
      result.current.focusNext();
    });
    expect(document.activeElement).toBe(input1);

    // Focus first element and try to go previous (should wrap to last)
    act(() => {
      input1.focus();
      result.current.focusPrevious();
    });
    expect(document.activeElement).toBe(input2);
  });

  it("handles custom focusable selector", () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        focusableSelector: '[data-focusable="true"]',
      })
    );

    act(() => {
      result.current.containerRef.current = mockElement;
    });

    const regularInput = document.createElement("input");
    const customFocusable = document.createElement("div");
    customFocusable.setAttribute("data-focusable", "true");
    customFocusable.tabIndex = 0;

    mockElement.appendChild(regularInput);
    mockElement.appendChild(customFocusable);

    const focusableElements = result.current.getFocusableElements();
    
    // Should only include elements matching custom selector
    expect(focusableElements).toHaveLength(1);
    expect(focusableElements[0]).toBe(customFocusable);
  });
});