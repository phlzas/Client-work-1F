"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  QrCode,
  Users,
  Search,
  FileText,
  Printer,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import QRCodeDisplay from "./qr-code-display";
import { QRCodeBatch as QRCodeBatchComponent } from "./qr-code-batch";
import { ApiService, qrCodeApi } from "@/lib/api";
import type { Student } from "@/types";
import { useQRCodeTesting } from "@/hooks/useQRCodeTesting";
import { validateStudentId } from "@/utils/validation";

// QR Code Scanning Test Component
const QRCodeScanningTest = React.memo(function QRCodeScanningTest() {
  const [testStudentId, setTestStudentId] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    loadAllStudents();
  }, []);

  const loadAllStudents = async () => {
    try {
      setLoadingStudents(true);
      const students = await ApiService.getAllStudents();
      setAllStudents(students);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const simulateQRScan = async (studentId: string) => {
    if (!studentId?.trim()) {
      setScanResult("رقم الطالب غير صحيح");
      return;
    }

    try {
      setIsScanning(true);

      // Check if student exists
      const student = await ApiService.getStudentById(studentId.trim());
      if (!student) {
        setScanResult("رقم الطالب غير موجود");
        return;
      }

      // Check if already marked attendance today
      const alreadyMarked = await ApiService.checkAttendanceToday(
        studentId.trim()
      );
      if (alreadyMarked) {
        setScanResult(`${student.name} - تم تسجيل الحضور مسبقاً اليوم`);
        return;
      }

      // Mark attendance
      await ApiService.markAttendance(studentId.trim());
      const paymentStatus =
        student.payment_status || student.paymentStatus || "pending";
      const statusText =
        paymentStatus === "paid"
          ? "مدفوع"
          : paymentStatus === "overdue"
          ? "متأخر"
          : paymentStatus === "due_soon"
          ? "مستحق قريباً"
          : "معلق";

      setScanResult(
        `تم تسجيل حضور ${student.name} - حالة الدفع: ${statusText}`
      );
    } catch (err) {
      console.error("Failed to scan student:", err);
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setScanResult(`خطأ في تسجيل الحضور: ${errorMessage}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      simulateQRScan(testStudentId);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            اختبار مسح رموز الاستجابة السريعة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="testStudentId">الرقم التعريفي للطالب</Label>
              <Input
                id="testStudentId"
                type="text"
                placeholder="أدخل الرقم التعريفي للطالب لمحاكاة المسح..."
                value={testStudentId}
                onChange={(e) => setTestStudentId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => simulateQRScan(testStudentId)}
                disabled={!testStudentId.trim() || isScanning}
                className="flex items-center gap-2"
              >
                {isScanning ? (
                  <>
                    <TestTube className="h-4 w-4 animate-pulse" />
                    جاري المسح...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" />
                    محاكاة المسح
                  </>
                )}
              </Button>
            </div>
          </div>

          {scanResult && (
            <Alert
              className={
                scanResult.includes("غير موجود") || scanResult.includes("خطأ")
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }
            >
              {scanResult.includes("غير موجود") ||
              scanResult.includes("خطأ") ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription
                className={
                  scanResult.includes("غير موجود") || scanResult.includes("خطأ")
                    ? "text-red-800"
                    : "text-green-800"
                }
              >
                {scanResult}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Students for Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            الطلاب المتاحون للاختبار
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="flex items-center justify-center p-4">
              <TestTube className="h-5 w-5 animate-spin text-blue-600 mr-2" />
              <span>جاري تحميل الطلاب...</span>
            </div>
          ) : allStudents.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              لا توجد طلاب في النظام للاختبار
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allStudents.slice(0, 12).map((student) => (
                <div
                  key={student.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setTestStudentId(student.id);
                    simulateQRScan(student.id);
                  }}
                >
                  <div className="font-medium text-sm">{student.name}</div>
                  <div className="text-xs text-gray-500">ID: {student.id}</div>
                  <div className="text-xs text-gray-500">
                    المجموعة:{" "}
                    {student.group_name || student.group || "غير محدد"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {allStudents.length > 12 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              عرض أول 12 طالب من إجمالي {allStudents.length} طالب
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تعليمات الاختبار
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-2 text-sm">
            <p>
              • أدخل رقم الطالب في الحقل أعلاه أو انقر على أحد الطلاب المتاحين
            </p>
            <p>• سيتم محاكاة عملية مسح رمز الاستجابة السريعة وتسجيل الحضور</p>
            <p>• ستظهر حالة الدفع للطالب بعد تسجيل الحضور بنجاح</p>
            <p>• إذا كان الطالب قد سجل حضوره اليوم، ستظهر رسالة تنبيه</p>
            <p>
              • يمكن استخدام هذا الاختبار للتأكد من عمل نظام المسح بشكل صحيح
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

interface QRCodeManagerProps {
  onClose?: () => void;
}

export function QRCodeManager({ onClose }: QRCodeManagerProps) {
  const [activeTab, setActiveTab] = useState("individual");
  const [searchStudentId, setSearchStudentId] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Use custom hook for QR code testing logic
  const { testResults, isTestingScanning, runQRCodeTest, clearTestResults } =
    useQRCodeTesting();

  const handleSearchStudent = async () => {
    // Clear previous validation errors
    setValidationError(null);

    // Validate student ID
    const validation = validateStudentId(searchStudentId);
    if (!validation.isValid) {
      setValidationError(validation.error || "رقم الطالب غير صحيح");
      setShowQRCode(false);
      clearTestResults();
      return;
    }

    setShowQRCode(true);
    // Test the student lookup integration using the custom hook
    await runQRCodeTest(validation.sanitized);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchStudent();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              إدارة رموز الاستجابة السريعة
            </h1>
            <p className="text-gray-600 mt-1">
              إنشاء وإدارة وتصدير رموز الاستجابة السريعة للطلاب
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            رمز فردي
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            اختبار المسح
          </TabsTrigger>
        </TabsList>

        {/* Individual QR Code Tab */}
        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                البحث عن طالب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="studentId">الرقم التعريفي للطالب</Label>
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="أدخل الرقم التعريفي للطالب..."
                    value={searchStudentId}
                    onChange={(e) => setSearchStudentId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={handleSearchStudent}
                    disabled={!searchStudentId.trim() || isTestingScanning}
                    className="flex items-center gap-2"
                  >
                    {isTestingScanning ? (
                      <>
                        <TestTube className="h-4 w-4 animate-pulse" />
                        اختبار...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        بحث واختبار
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Test Results */}
              {testResults && (
                <Alert
                  className={
                    testResults.scanningWorking
                      ? "border-green-200 bg-green-50"
                      : testResults.studentFound
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  {testResults.scanningWorking ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : testResults.studentFound ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription
                    className={
                      testResults.scanningWorking
                        ? "text-green-800"
                        : testResults.studentFound
                        ? "text-yellow-800"
                        : "text-red-800"
                    }
                  >
                    <div className="space-y-2">
                      <p className="font-medium">{testResults.message}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          {testResults.studentFound ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>
                            البحث عن الطالب:{" "}
                            {testResults.studentFound ? "نجح" : "فشل"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {testResults.qrCodeGenerated ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>
                            إنشاء رمز الاستجابة السريعة:{" "}
                            {testResults.qrCodeGenerated ? "نجح" : "فشل"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {testResults.scanningWorking ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          <span>
                            التحقق من الرمز:{" "}
                            {testResults.scanningWorking ? "نجح" : "فشل"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {showQRCode &&
                searchStudentId.trim() &&
                testResults?.qrCodeGenerated && (
                  <div className="mt-6 flex justify-center">
                    <QRCodeDisplay
                      studentId={searchStudentId.trim()}
                      size={250}
                      showStudentInfo={true}
                      showActions={true}
                    />
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                إجراءات سريعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">رمز واحد</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    إنشاء وتصدير رمز الاستجابة السريعة لطالب واحد
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <QrCode className="h-4 w-4" />
                    <span>ابحث عن طالب أعلاه</span>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    رموز متعددة
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    إنشاء وتصدير رموز الاستجابة السريعة لمجموعات كاملة
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("batch")}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    انتقل للرموز الجماعية
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR Code Scanning Test Tab */}
        <TabsContent value="testing" className="space-y-6">
          <QRCodeScanningTest />
        </TabsContent>

        {/* Batch QR Codes Tab */}
        <TabsContent value="batch">
          <QRCodeBatchComponent />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            كيفية الاستخدام
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">الرموز الفردية:</h4>
              <ul className="text-sm space-y-1">
                <li>• أدخل الرقم التعريفي للطالب</li>
                <li>• اضغط على "بحث" لإنشاء الرمز</li>
                <li>• استخدم "تصدير PDF" لحفظ الرمز</li>
              </ul>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QRCodeManager;
