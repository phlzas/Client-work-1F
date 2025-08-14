"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useFocusIndicator, useSkipLinks } from "@/hooks/useKeyboardNavigation";

interface KeyboardNavigationContextType {
  isKeyboardUser: boolean;
  showFocusIndicators: boolean;
  setShowFocusIndicators: (show: boolean) => void;
}

const KeyboardNavigationContext =
  createContext<KeyboardNavigationContextType | null>(null);

export function useKeyboardNavigationContext() {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error(
      "useKeyboardNavigationContext must be used within KeyboardNavigationProvider"
    );
  }
  return context;
}

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

export function KeyboardNavigationProvider({
  children,
}: KeyboardNavigationProviderProps) {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [showFocusIndicators, setShowFocusIndicators] = useState(true);
  const { indicatorRef } = useFocusIndicator();
  const { skipLinksRef, addSkipLink } = useSkipLinks();

  // Detect keyboard usage
  useEffect(() => {
    let keyboardUsed = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event as KeyboardEvent | undefined)?.key;
      if (!key || typeof key !== "string") return;
      if (key === "Tab" || key === "Enter" || key.startsWith("Arrow")) {
        if (!keyboardUsed) {
          keyboardUsed = true;
          setIsKeyboardUser(true);
          document.body.classList.add("keyboard-user");
        }
      }
    };

    const handleMouseDown = () => {
      if (keyboardUsed) {
        keyboardUsed = false;
        setIsKeyboardUser(false);
        document.body.classList.remove("keyboard-user");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  // Add skip links on mount
  useEffect(() => {
    addSkipLink("main-content", "تخطي إلى المحتوى الرئيسي");
    addSkipLink("navigation", "تخطي إلى التنقل");
    addSkipLink("qr-scanner", "تخطي إلى ماسح QR");
    addSkipLink("student-grid", "تخطي إلى جدول الطلاب");
  }, [addSkipLink]);

  return (
    <KeyboardNavigationContext.Provider
      value={{
        isKeyboardUser,
        showFocusIndicators,
        setShowFocusIndicators,
      }}
    >
      {/* Skip Links */}
      <div
        ref={skipLinksRef as React.RefObject<HTMLDivElement>}
        className="skip-links"
        style={{
          position: "absolute",
          top: "-40px",
          left: "6px",
          zIndex: 1000,
        }}
      />

      {/* Focus Indicator */}
      {showFocusIndicators && (
        <div
          ref={indicatorRef as React.RefObject<HTMLDivElement>}
          className="focus-indicator"
          style={{
            position: "fixed",
            border: "2px solid #0066cc",
            borderRadius: "4px",
            pointerEvents: "none",
            zIndex: 9999,
            display: "none",
            transition: "all 0.1s ease",
            backgroundColor: "rgba(0, 102, 204, 0.1)",
          }}
        />
      )}

      {children}

      {/* Global Styles */}
      <style jsx global>{`
        .skip-links a {
          position: absolute;
          left: -10000px;
          top: auto;
          width: 1px;
          height: 1px;
          overflow: hidden;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          z-index: 1001;
        }

        .skip-links a:focus {
          position: static;
          width: auto;
          height: auto;
          left: 6px;
          top: 6px;
        }

        .keyboard-user *:focus {
          outline: 2px solid #0066cc !important;
          outline-offset: 2px !important;
        }

        .keyboard-user button:focus,
        .keyboard-user input:focus,
        .keyboard-user select:focus,
        .keyboard-user textarea:focus,
        .keyboard-user [tabindex]:focus,
        .keyboard-user [role="button"]:focus {
          box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.3) !important;
        }

        /* Enhanced focus styles for better visibility */
        .keyboard-user .focus-visible {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
          box-shadow: 0 0 0 4px rgba(0, 102, 204, 0.2);
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .keyboard-user *:focus {
            outline: 3px solid currentColor !important;
            outline-offset: 2px !important;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .focus-indicator {
            transition: none !important;
          }
        }
      `}</style>
    </KeyboardNavigationContext.Provider>
  );
}
