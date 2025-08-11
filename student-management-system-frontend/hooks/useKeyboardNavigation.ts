import { useEffect, useRef, useCallback } from "react";

export interface KeyboardNavigationOptions {
  // Focus management
  autoFocus?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;

  // Navigation keys
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEnterKey?: boolean;
  enableEscapeKey?: boolean;

  // Callbacks
  onEnter?: (event: KeyboardEvent) => void;
  onEscape?: (event: KeyboardEvent) => void;
  onArrowUp?: (event: KeyboardEvent) => void;
  onArrowDown?: (event: KeyboardEvent) => void;
  onArrowLeft?: (event: KeyboardEvent) => void;
  onArrowRight?: (event: KeyboardEvent) => void;
  onTab?: (event: KeyboardEvent) => void;

  // Element selectors
  focusableSelector?: string;
  containerSelector?: string;
}

const DEFAULT_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="menuitem"], [role="tab"]';

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    autoFocus = false,
    trapFocus = false,
    restoreFocus = false,
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableEnterKey = true,
    enableEscapeKey = true,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
  } = options;

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const elements = containerRef.current.querySelectorAll(focusableSelector);
    return Array.from(elements).filter((element) => {
      const htmlElement = element as HTMLElement;
      return (
        !htmlElement.hasAttribute("disabled") &&
        !htmlElement.getAttribute("aria-disabled") &&
        htmlElement.offsetParent !== null // Element is visible
      );
    }) as HTMLElement[];
  }, [focusableSelector]);

  // Focus the first focusable element
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  // Focus the last focusable element
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
    }
  }, [getFocusableElements]);

  // Focus the next element in the sequence
  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );

    if (currentIndex === -1) {
      focusFirst();
    } else if (currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    } else if (trapFocus) {
      focusFirst(); // Wrap to first element
    }
  }, [getFocusableElements, focusFirst, trapFocus]);

  // Focus the previous element in the sequence
  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(
      document.activeElement as HTMLElement
    );

    if (currentIndex === -1) {
      focusLast();
    } else if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    } else if (trapFocus) {
      focusLast(); // Wrap to last element
    }
  }, [getFocusableElements, focusLast, trapFocus]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, shiftKey, ctrlKey, altKey, metaKey } = event;

      // Don't handle if modifier keys are pressed (except Shift for Tab)
      if ((ctrlKey || altKey || metaKey) && key !== "Tab") {
        return;
      }

      switch (key) {
        case "Enter":
          if (enableEnterKey && onEnter) {
            event.preventDefault();
            onEnter(event);
          }
          break;

        case "Escape":
          if (enableEscapeKey && onEscape) {
            event.preventDefault();
            onEscape(event);
          }
          break;

        case "Tab":
          if (enableTabNavigation) {
            if (trapFocus) {
              event.preventDefault();
              if (shiftKey) {
                focusPrevious();
              } else {
                focusNext();
              }
            }
            if (onTab) {
              onTab(event);
            }
          }
          break;

        case "ArrowUp":
          if (enableArrowKeys) {
            event.preventDefault();
            if (onArrowUp) {
              onArrowUp(event);
            } else {
              focusPrevious();
            }
          }
          break;

        case "ArrowDown":
          if (enableArrowKeys) {
            event.preventDefault();
            if (onArrowDown) {
              onArrowDown(event);
            } else {
              focusNext();
            }
          }
          break;

        case "ArrowLeft":
          if (enableArrowKeys && onArrowLeft) {
            event.preventDefault();
            onArrowLeft(event);
          }
          break;

        case "ArrowRight":
          if (enableArrowKeys && onArrowRight) {
            event.preventDefault();
            onArrowRight(event);
          }
          break;
      }
    },
    [
      enableEnterKey,
      enableEscapeKey,
      enableTabNavigation,
      enableArrowKeys,
      trapFocus,
      onEnter,
      onEscape,
      onTab,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      focusNext,
      focusPrevious,
    ]
  );

  // Set up keyboard event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Store previous focus for restoration
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Auto-focus first element if requested
    if (autoFocus) {
      focusFirst();
    }

    // Add event listener
    container.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener("keydown", handleKeyDown);

      // Restore previous focus if requested
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [handleKeyDown, autoFocus, restoreFocus, focusFirst]);

  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getFocusableElements,
  };
}

// Hook for managing focus indicators
export function useFocusIndicator() {
  const indicatorRef = useRef<HTMLElement>(null);

  const showFocusIndicator = useCallback((element: HTMLElement) => {
    if (!indicatorRef.current) return;

    const rect = element.getBoundingClientRect();
    const indicator = indicatorRef.current;

    indicator.style.display = "block";
    indicator.style.left = `${rect.left - 2}px`;
    indicator.style.top = `${rect.top - 2}px`;
    indicator.style.width = `${rect.width + 4}px`;
    indicator.style.height = `${rect.height + 4}px`;
  }, []);

  const hideFocusIndicator = useCallback(() => {
    if (indicatorRef.current) {
      indicatorRef.current.style.display = "none";
    }
  }, []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (
        target &&
        target.matches(
          'button, input, select, textarea, [tabindex], [role="button"]'
        )
      ) {
        showFocusIndicator(target);
      }
    };

    const handleFocusOut = () => {
      hideFocusIndicator();
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [showFocusIndicator, hideFocusIndicator]);

  return {
    indicatorRef,
    showFocusIndicator,
    hideFocusIndicator,
  };
}

// Hook for skip links
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLElement>(null);

  const addSkipLink = useCallback((target: string, label: string) => {
    if (!skipLinksRef.current) return;

    const link = document.createElement("a");
    link.href = `#${target}`;
    link.textContent = label;
    link.className = "skip-link";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetElement = document.getElementById(target);
      if (targetElement) {
        targetElement.focus();
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });

    skipLinksRef.current.appendChild(link);
  }, []);

  return {
    skipLinksRef,
    addSkipLink,
  };
}
