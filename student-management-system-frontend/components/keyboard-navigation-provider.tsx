"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
// Keyboard navigation helpers disabled

interface KeyboardNavigationContextType {
  isKeyboardUser: boolean;
  showFocusIndicators: boolean;
  setShowFocusIndicators: (show: boolean) => void;
}

const KeyboardNavigationContext =
  createContext<KeyboardNavigationContextType | null>(null);

export function useKeyboardNavigationContext() {
  // Return minimal context to avoid crashes when not wrapped
  return {
    isKeyboardUser: false,
    showFocusIndicators: false,
    setShowFocusIndicators: () => {},
  } as KeyboardNavigationContextType;
}

interface KeyboardNavigationProviderProps {
  children: React.ReactNode;
}

export function KeyboardNavigationProvider({
  children,
}: KeyboardNavigationProviderProps) {
  const [isKeyboardUser, _setIsKeyboardUser] = useState(false);
  const [showFocusIndicators, setShowFocusIndicators] = useState(false);
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const skipLinksRef = React.useRef<HTMLDivElement>(null);
  const addSkipLink = () => {};

  // Detect keyboard usage
  useEffect(() => {
    let keyboardUsed = false;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = (event as KeyboardEvent | undefined)?.key;
      if (!key || typeof key !== "string") return;
      if (key === "Tab" || key === "Enter" || key.startsWith("Arrow")) {
        if (!keyboardUsed) {
          keyboardUsed = true;
          _setIsKeyboardUser(true);
          document.body.classList.add("keyboard-user");
        }
      }
    };

    const handleMouseDown = () => {
      if (keyboardUsed) {
        keyboardUsed = false;
        _setIsKeyboardUser(false);
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
    // Skip links disabled
  }, []);

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
      {/* Focus indicator disabled */}

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

        /* Global focus outlines disabled */

        /* All keyboard-user specific focus styles removed */
      `}</style>
    </KeyboardNavigationContext.Provider>
  );
}
