"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Search } from "lucide-react";
import type { Student } from "@/types";

interface StudentGridProps {
  students: Student[];
  onEditStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onAddStudent: () => void;
}

export function StudentGrid({
  students,
  onEditStudent,
  onUpdateStudent,
  onAddStudent,
}: StudentGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup =
        groupFilter === "all" || getStudentGroup(student) === groupFilter;
      const matchesStatus =
        statusFilter === "all" ||
        getStudentPaymentStatus(student) === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [students, searchTerm, groupFilter, statusFilter]);

  const uniqueGroups = Array.from(
    new Set(students.map((s) => getStudentGroup(s)))
  );

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return "مدفوع";
      case "pending":
        return "في الانتظار";
      case "overdue":
        return "متأخر";
      case "due_soon":
        return "مستحق قريباً";
      default:
        return status;
    }
  };

  const getStudentGroup = (student: Student) => {
    return student.group_name || student.group || "";
  };

  const getStudentPaymentPlan = (student: Student) => {
    return student.payment_plan || student.paymentPlan || "one-time";
  };

  const getStudentPlanAmount = (student: Student) => {
    return student.plan_amount || student.planAmount || 0;
  };

  const getStudentPaidAmount = (student: Student) => {
    return student.paid_amount || student.paidAmount || 0;
  };

  const getStudentPaymentStatus = (student: Student) => {
    return student.payment_status || student.paymentStatus || "pending";
  };

  const getStudentNextDueDate = (student: Student) => {
    return student.next_due_date || student.nextDueDate;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "due_soon":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentPlanText = (plan: string) => {
    switch (plan) {
      case "one-time":
        return "دفعة واحدة";
      case "monthly":
        return "شهري";
      case "installment":
        return "أقساط";
      default:
        return plan;
    }
  };

  const getRowClassName = (status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-50 hover:bg-red-100";
      case "due_soon":
        return "bg-yellow-50 hover:bg-yellow-100";
      default:
        return "hover:bg-gray-50";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>قائمة الطلاب</CardTitle>
          <Button onClick={onAddStudent}>إضافة طالب جديد</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="البحث بالاسم أو رقم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="تصفية بالمجموعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المجموعات</SelectItem>
              {uniqueGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="تصفية بحالة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="paid">مدفوع</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="overdue">متأخر</SelectItem>
              <SelectItem value="due_soon">مستحق قريباً</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الطالب</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المجموعة</TableHead>
                <TableHead className="text-right">خطة الدفع</TableHead>
                <TableHead className="text-right">المبلغ المدفوع</TableHead>
                <TableHead className="text-right">حالة الدفع</TableHead>
                <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.id}
                  className={getRowClassName(getStudentPaymentStatus(student))}
                >
                  <TableCell className="font-medium">{student.id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{getStudentGroup(student)}</TableCell>
                  <TableCell>
                    {getPaymentPlanText(getStudentPaymentPlan(student))}
                  </TableCell>
                  <TableCell>
                    {getStudentPaidAmount(student).toLocaleString()} /{" "}
                    {getStudentPlanAmount(student).toLocaleString()} ج.م
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getPaymentStatusColor(
                        getStudentPaymentStatus(student)
                      )}
                    >
                      {getPaymentStatusText(getStudentPaymentStatus(student))}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStudentNextDueDate(student)
                      ? new Date(
                          getStudentNextDueDate(student)!
                        ).toLocaleDateString("ar-EG")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditStudent(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
