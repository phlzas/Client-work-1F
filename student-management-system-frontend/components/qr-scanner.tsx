"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, CheckCircle, XCircle } from "lucide-react"

interface QRScannerProps {
  onScan: (studentId: string) => void
  result: string
}

export function QRScanner({ onScan, result }: QRScannerProps) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Keep input focused at all times
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }

    focusInput()
    const interval = setInterval(focusInput, 100)

    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onScan(input.trim())
      setInput("")
    }
  }

  const handleBlur = () => {
    // Immediately refocus if input loses focus
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 10)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
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
            className="flex-1 text-lg"
            autoComplete="off"
            autoFocus
          />
        </form>

        {result && (
          <Alert className={result.includes("غير موجود") ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            {result.includes("غير موجود") ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={result.includes("غير موجود") ? "text-red-800" : "text-green-800"}>
              {result}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-600">
          <p>• امسح رمز QR الخاص بالطالب أو أدخل رقم الطالب يدوياً</p>
          <p>• اضغط Enter لتسجيل الحضور</p>
          <p>• سيتم عرض حالة الدفع بعد المسح</p>
        </div>
      </CardContent>
    </Card>
  )
}
