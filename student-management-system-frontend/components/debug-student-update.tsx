"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiService } from "@/lib/api";

export function DebugStudentUpdate() {
  const [studentId, setStudentId] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testUpdate = async () => {
    if (!studentId.trim()) {
      setResult("Please enter a student ID");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      // First get the student to see current data
      const student = await ApiService.getStudentById(studentId);
      if (!student) {
        setResult("Student not found");
        return;
      }

      setResult(`Current student data: ${JSON.stringify(student, null, 2)}`);

      // Now update with new paid amount
      await ApiService.updateStudent(
        studentId,
        student.name,
        student.group_name || student.group || "",
        student.payment_plan || student.paymentPlan || "one-time",
        student.plan_amount || student.planAmount || 0,
        student.installment_count || student.installmentCount,
        paidAmount, // This is the key field we're testing
        student.enrollment_date
      );

      // Get updated student data
      const updatedStudent = await ApiService.getStudentById(studentId);
      setResult(
        (prev) =>
          prev +
          `\n\nUpdated student data: ${JSON.stringify(updatedStudent, null, 2)}`
      );
    } catch (error) {
      setResult(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Debug Student Update</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studentId">Student ID</Label>
          <Input
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter student ID to test"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paidAmount">New Paid Amount</Label>
          <Input
            id="paidAmount"
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
            placeholder="Enter new paid amount"
          />
        </div>

        <Button onClick={testUpdate} disabled={loading}>
          {loading ? "Testing..." : "Test Update"}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md">
            <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
