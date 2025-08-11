"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useAccessibility } from "@/components/accessibility-provider";
import { ariaLabels } from "@/lib/accessibility";

// Constants for timing controls
const SCAN_DEBOUNCE_MS = 1000; // Minimum time between scans
const AUTO_CLEAR_MS = 5000; // Auto-clear timeout for messages
const FOCUS_CHECK_MS = 100; // Focus check interval

interface QRScannerProps {
  onScan: (studentId: string) => Promise<void>;
  result?: string;
  error?: string;
}

export function QRScanner({ onScan, result, error }: QRScannerProps) {
  // State management
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const cleanupTimeoutRef = useRef<number>(0);
  const focusIntervalRef = useRef<number>(0);

  // Accessibility
  const { announce } = useAccessibility();

  // Handle scanning
  const handleScan = async (value: string) => {
    const now = Date.now();
    const trimmedValue = value.trim();

    if (!trimmedValue) return;

    // Debounce checks
    if (isProcessing) {
      announce(ariaLabels.scanInProgress);
      return;
    }

    if (now - lastScanTime < SCAN_DEBOUNCE_MS) {
      announce(ariaLabels.scanTooQuick);
      return;
    }

    try {
      setIsProcessing(true);
      setLastScanTime(now);
      announce(ariaLabels.scanningQRCode);

      await onScan(trimmedValue);
      setInput("");

      // Schedule cleanup
      if (cleanupTimeoutRef.current) {
        window.clearTimeout(cleanupTimeoutRef.current);
      }

      cleanupTimeoutRef.current = window.setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, AUTO_CLEAR_MS);
    } catch (err) {
      console.error("QR Scan error:", err);
      announce(ariaLabels.scanError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Focus management
  useEffect(() => {
    const maintainFocus = () => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    };

    maintainFocus(); // Initial focus
    focusIntervalRef.current = window.setInterval(
      maintainFocus,
      FOCUS_CHECK_MS
    );

    return () => {
      if (focusIntervalRef.current) {
        window.clearInterval(focusIntervalRef.current);
      }
      if (cleanupTimeoutRef.current) {
        window.clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, []);

  // Event handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(input);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
    }
  };

  const handleBlur = () => {
    // Immediately refocus on blur
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" aria-hidden="true" />
          {ariaLabels.qrScanner}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder={ariaLabels.scanQRCodePlaceholder}
              disabled={isProcessing}
              className="pr-10 text-lg"
              autoComplete="off"
              aria-label={ariaLabels.qrCodeInput}
            />
            {isProcessing && (
              <Loader2
                className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
        </form>

        {(result || error) && (
          <Alert
            variant={error ? "destructive" : "default"}
            role="status"
            aria-live="assertive"
          >
            <AlertDescription className="flex items-center gap-2">
              {error ? (
                <>
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  {error}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  {result}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
