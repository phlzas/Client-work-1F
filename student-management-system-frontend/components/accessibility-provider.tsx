"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  AriaAnnouncer,
  useHighContrastMode,
  useScreenReaderDetection,
} from "@/lib/accessibility";

interface AccessibilityContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  isScreenReaderActive: boolean;
  announcer: AriaAnnouncer;
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps) {
  const { isHighContrast, toggleHighContrast } = useHighContrastMode();
  // Simple dark mode preference sync with high-contrast for now
  React.useEffect(() => {
    try {
      const theme =
        localStorage.getItem("theme") || (isHighContrast ? "dark" : "light");
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, [isHighContrast]);
  const isScreenReaderActive = useScreenReaderDetection();
  const [announcer] = useState(() => AriaAnnouncer.getInstance());

  // Initialize accessibility features
  useEffect(() => {
    // Load saved high contrast preference
    const savedHighContrast = localStorage.getItem("high-contrast-mode");
    if (savedHighContrast === "true") {
      document.documentElement.classList.add("high-contrast");
    }

    // Add accessibility classes to body
    document.body.classList.add("accessibility-enabled");

    if (isScreenReaderActive) {
      document.body.classList.add("screen-reader-active");
    }

    // Announce app ready for screen readers
    setTimeout(() => {
      announcer.announce("نظام إدارة الطلاب جاهز للاستخدام");
    }, 1000);

    return () => {
      document.body.classList.remove(
        "accessibility-enabled",
        "screen-reader-active"
      );
    };
  }, [isScreenReaderActive, announcer]);

  const announce = (
    message: string,
    priority: "polite" | "assertive" = "polite"
  ) => {
    announcer.announce(message, priority);
  };

  const value: AccessibilityContextType = {
    isHighContrast,
    toggleHighContrast,
    isScreenReaderActive,
    announcer,
    announce,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}
