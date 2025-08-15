"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, CheckCircle, XCircle } from "lucide-react";
import { useAccessibility } from "@/components/accessibility-provider";
import { ariaLabels } from "@/lib/accessibility";

interface QRScannerProps {
  onScan: (studentId: string) => void;
  result: string;
}

export function QRScanner({ onScan, result }: QRScannerProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { announce } = useAccessibility();

  // Removed keyboard navigation provider usage to avoid forced focus/blue outline behavior

  useEffect(() => {
    // Do not auto-focus to avoid stealing focus/blue outline issues
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      announce(`جاري مسح رمز الطالب: ${input.trim()}`);
      onScan(input.trim());
      setInput("");
    }
  };

  const handleBlur = () => {
    // Do not forcibly refocus; allow users to interact with other UI (forms/modals)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle specific keys for QR scanner
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInput("");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" id="qr-scanner">
          <QrCode className="h-5 w-5" />
          مسح رمز QR للحضور
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="امسح رمز QR أو أدخل رقم الطالب..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 text-lg"
            autoComplete="off"
            aria-label="مسح رمز QR أو إدخال رقم الطالب"
            aria-describedby="qr-scanner-instructions qr-scanner-result"
          />
        </form>

        {result && (
          <Alert
            className={
              result.includes("غير موجود")
                ? "border-red-200 bg-red-50"
                : "border-green-200 bg-green-50"
            }
            role="status"
            aria-live="assertive"
            aria-atomic="true"
            id="qr-scanner-result"
          >
            {result.includes("غير موجود") ? (
              <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
            ) : (
              <CheckCircle
                className="h-4 w-4 text-green-600"
                aria-hidden="true"
              />
            )}
            <AlertDescription
              className={
                result.includes("غير موجود") ? "text-red-800" : "text-green-800"
              }
            >
              {result}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600" id="qr-scanner-instructions">
          <p>• امسح رمز QR الخاص بالطالب أو أدخل رقم الطالب يدوياً</p>
          <p>• اضغط Enter لتسجيل الحضور</p>
          <p>• اضغط Escape لمسح النص المدخل</p>
          <p>• سيتم عرض حالة الدفع بعد المسح</p>
        </div>
      </CardContent>
    </Card>
  );
}
