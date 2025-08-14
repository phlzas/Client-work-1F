"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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
import { Edit, Search, Trash2 } from "lucide-react";
import type { Student } from "@/types";
import {
  transformStudentsForUI,
  getPaymentStatusText,
  getPaymentStatusColor,
  getPaymentPlanText,
  formatCurrency,
} from "@/lib/data-transform";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useAccessibility } from "@/components/accessibility-provider";
import { ariaLabels } from "@/lib/accessibility";

interface StudentGridProps {
  students: Student[];
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onAddStudent: () => void;
}

export function StudentGrid({
  students,
  onEditStudent,
  onDeleteStudent,
  onAddStudent,
}: StudentGridProps) {
  // Transform students data for consistent UI access
  const transformedStudents = useMemo(() => {
    if (!Array.isArray(students)) {
      console.warn("StudentGrid: students prop is not an array:", students);
      return [];
    }
    return transformStudentsForUI(students);
  }, [students]);

  const getRowClassName = useCallback((status: string) => {
    switch (status) {
      case "overdue":
        return "bg-red-50 hover:bg-red-100";
      case "due_soon":
        return "bg-yellow-50 hover:bg-yellow-100";
      default:
        return "hover:bg-gray-50";
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLTableElement>(null);
  const { announce } = useAccessibility();

  // Keyboard navigation for table
  const { containerRef } = useKeyboardNavigation({
    enableArrowKeys: true,
    enableEnterKey: true,
    enableEscapeKey: true,
    onArrowUp: () => {
      setSelectedRowIndex((prev) => {
        const newIndex = Math.max(0, prev - 1);
        if (newIndex !== prev && filteredStudents[newIndex]) {
          announce(`الصف ${newIndex + 1}: ${filteredStudents[newIndex].name}`);
        }
        return newIndex;
      });
    },
    onArrowDown: () => {
      setSelectedRowIndex((prev) => {
        const newIndex = Math.min(filteredStudents.length - 1, prev + 1);
        if (newIndex !== prev && filteredStudents[newIndex]) {
          announce(`الصف ${newIndex + 1}: ${filteredStudents[newIndex].name}`);
        }
        return newIndex;
      });
    },
    onEnter: () => {
      if (selectedRowIndex >= 0 && selectedRowIndex < filteredStudents.length) {
        onEditStudent(filteredStudents[selectedRowIndex]);
      }
    },
    onEscape: () => {
      setSelectedRowIndex(-1);
    },
  });

  // Debounced search to improve performance
  const debouncedSearchTerm = useMemo(() => {
    return searchTerm; // Simple implementation - could be enhanced with actual debouncing
  }, [searchTerm]);

  const filteredStudents = useMemo(() => {
    return transformedStudents.filter((student) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        student.name
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesGroup =
        groupFilter === "all" || student.group === groupFilter;
      const matchesStatus =
        statusFilter === "all" || student.paymentStatus === statusFilter;

      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [transformedStudents, debouncedSearchTerm, groupFilter, statusFilter]);

  const uniqueGroups = useMemo(
    () =>
      Array.from(
        new Set(
          transformedStudents
            .map((s) => s.group)
            .filter((group): group is string => Boolean(group))
        )
      ),
    [transformedStudents]
  );

  return (
    <Card ref={containerRef as React.RefObject<HTMLDivElement>}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle id="student-grid">قائمة الطلاب</CardTitle>
          <Button onClick={onAddStudent} aria-label="إضافة طالب جديد">
            إضافة طالب جديد
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4" role="search">
          <div className="relative flex-1">
            <Search
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
              aria-hidden="true"
            />
            <Input
              placeholder="البحث بالاسم أو رقم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              aria-label="البحث في قائمة الطلاب"
              role="searchbox"
            />
          </div>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger
              className="w-full sm:w-48"
              aria-label="تصفية بالمجموعة"
            >
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
            <SelectTrigger
              className="w-full sm:w-48"
              aria-label="تصفية بحالة الدفع"
            >
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
          <Table ref={tableRef} role="table" aria-label="جدول الطلاب">
            <TableHeader>
              <TableRow role="row">
                <TableHead className="text-right" role="columnheader">
                  رقم الطالب
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  الاسم
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  المجموعة
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  خطة الدفع
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  المبلغ المدفوع
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  حالة الدفع
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  تاريخ الاستحقاق
                </TableHead>
                <TableHead className="text-right" role="columnheader">
                  الإجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, index) => (
                <TableRow
                  key={student.id}
                  className={`${getRowClassName(student.paymentStatus!)} ${
                    selectedRowIndex === index
                      ? "ring-2 ring-blue-500 bg-blue-50"
                      : ""
                  }`}
                  role="row"
                  tabIndex={0}
                  aria-selected={selectedRowIndex === index}
                  onFocus={() => setSelectedRowIndex(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEditStudent(student);
                    }
                  }}
                >
                  <TableCell className="font-medium" role="cell">
                    {student.id}
                  </TableCell>
                  <TableCell role="cell">{student.name}</TableCell>
                  <TableCell role="cell">{student.group}</TableCell>
                  <TableCell role="cell">
                    {getPaymentPlanText(student.paymentPlan!)}
                  </TableCell>
                  <TableCell role="cell">
                    {formatCurrency(student.paidAmount!)} /{" "}
                    {formatCurrency(student.planAmount!)}
                  </TableCell>
                  <TableCell role="cell">
                    <Badge
                      className={getPaymentStatusColor(student.paymentStatus!)}
                    >
                      {getPaymentStatusText(student.paymentStatus!)}
                    </Badge>
                  </TableCell>
                  <TableCell role="cell">
                    {student.nextDueDate
                      ? new Date(student.nextDueDate).toLocaleDateString(
                          "ar-EG"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell role="cell">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditStudent(student)}
                        aria-label={`تعديل بيانات الطالب ${student.name}`}
                      >
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteStudent(student)}
                        aria-label={`حذف الطالب ${student.name}`}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredStudents.length === 0 && (
          <div
            className="text-center py-8 text-gray-500"
            role="status"
            aria-live="polite"
            aria-label={ariaLabels.noResults}
          >
            <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
        )}

        {/* Results summary for screen readers */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaLabels.searchResults(filteredStudents.length)}
        </div>

        {/* Keyboard navigation instructions */}
        <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
          <p>• استخدم الأسهم للتنقل بين الصفوف</p>
          <p>• اضغط Enter أو Space لتعديل الطالب المحدد</p>
          <p>• اضغط Escape لإلغاء التحديد</p>
        </div>
      </CardContent>
    </Card>
  );
}
