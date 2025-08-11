import { useState, useCallback } from "react";
import { ApiService, qrCodeApi } from "@/lib/api";
import type { Student } from "@/types";

interface TestResults {
  studentFound: boolean;
  qrCodeGenerated: boolean;
  scanningWorking: boolean;
  message: string;
}

interface StudentLookupResult {
  student: Student | null;
  success: boolean;
}

export function useQRCodeTesting() {
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isTestingScanning, setIsTestingScanning] = useState(false);

  const testStudentExists = useCallback(
    async (studentId: string): Promise<StudentLookupResult> => {
      try {
        const student = await ApiService.getStudentById(studentId);
        return { student, success: !!student };
      } catch (error) {
        console.error("Student lookup failed:", error);
        return { student: null, success: false };
      }
    },
    []
  );

  const testQRCodeGeneration = useCallback(
    async (studentId: string): Promise<boolean> => {
      try {
        await qrCodeApi.generateQRCodeForStudent(studentId);
        return true;
      } catch (error) {
        console.error("QR code generation failed:", error);
        return false;
      }
    },
    []
  );

  const testQRCodeValidation = useCallback(
    async (studentId: string): Promise<boolean> => {
      try {
        return await qrCodeApi.validateQRCode(studentId);
      } catch (error) {
        console.error("QR code validation failed:", error);
        return false;
      }
    },
    []
  );

  const generateTestMessage = useCallback(
    (
      studentFound: boolean,
      qrCodeGenerated: boolean,
      scanningWorking: boolean,
      student: Student | null,
      studentId: string
    ): string => {
      if (!studentFound) {
        return `الطالب برقم ${studentId} غير موجود في النظام`;
      }
      if (!qrCodeGenerated) {
        return `تم العثور على الطالب ولكن فشل في إنشاء رمز الاستجابة السريعة`;
      }
      if (!scanningWorking) {
        return `تم إنشاء الرمز ولكن فشل في التحقق من صحته`;
      }
      return `جميع الاختبارات نجحت! الطالب: ${student?.name}`;
    },
    []
  );

  const runQRCodeTest = useCallback(
    async (studentId: string) => {
      try {
        setIsTestingScanning(true);

        // Test 1: Check if student exists
        const { student, success: studentFound } = await testStudentExists(
          studentId
        );

        // Test 2: Try to generate QR code
        const qrCodeGenerated = await testQRCodeGeneration(studentId);

        // Test 3: Validate QR code
        const scanningWorking = await testQRCodeValidation(studentId);

        const message = generateTestMessage(
          studentFound,
          qrCodeGenerated,
          scanningWorking,
          student,
          studentId
        );

        const results: TestResults = {
          studentFound,
          qrCodeGenerated,
          scanningWorking,
          message,
        };

        setTestResults(results);
        return results;
      } catch (error) {
        console.error("Student lookup test failed:", error);
        const errorResults: TestResults = {
          studentFound: false,
          qrCodeGenerated: false,
          scanningWorking: false,
          message: `خطأ في الاختبار: ${
            error instanceof Error ? error.message : "خطأ غير معروف"
          }`,
        };
        setTestResults(errorResults);
        return errorResults;
      } finally {
        setIsTestingScanning(false);
      }
    },
    [
      testStudentExists,
      testQRCodeGeneration,
      testQRCodeValidation,
      generateTestMessage,
    ]
  );

  const clearTestResults = useCallback(() => {
    setTestResults(null);
  }, []);

  return {
    testResults,
    isTestingScanning,
    runQRCodeTest,
    clearTestResults,
  };
}
