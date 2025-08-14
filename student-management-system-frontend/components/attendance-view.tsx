"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import type { Student, AttendanceRecord } from "@/types";
import { ApiService } from "@/lib/api";

interface AttendanceViewProps {
  students: Student[];
}

export function AttendanceView({ students }: AttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<
    Record<
      string,
      {
        totalAttendance: number;
        attendanceRate: number;
        lastAttendance: string | null;
      }
    >
  >({});

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ApiService.getDailyAttendanceSummary(
          selectedDate,
          selectedGroup === "all" ? undefined : selectedGroup
        );
        setPresentIds(data.present_student_ids || []);

        // Load attendance statistics for each student
        const stats: Record<
          string,
          {
            totalAttendance: number;
            attendanceRate: number;
            lastAttendance: string | null;
          }
        > = {};

        for (const student of students) {
          try {
            const studentStats = await ApiService.getStudentAttendanceStats(
              student.id
            );
            stats[student.id] = {
              totalAttendance: studentStats.total_days || 0,
              attendanceRate: studentStats.attendance_rate || 0,
              lastAttendance: studentStats.last_attendance_date || null,
            };
          } catch (e) {
            stats[student.id] = {
              totalAttendance: 0,
              attendanceRate: 0,
              lastAttendance: null,
            };
          }
        }
        setAttendanceStats(stats);
      } catch (e) {
        setPresentIds([]);
        setAttendanceStats({});
      }
    };
    load();
  }, [selectedDate, selectedGroup, students]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup =
      selectedGroup === "all" ||
      (student.group_name || student.group) === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  const uniqueGroups = Array.from(
    new Set(students.map((s) => s.group_name || s.group || "").filter(Boolean))
  );

  const presentToday = filteredStudents.filter((s) =>
    presentIds.includes(s.id)
  ).length;
  const absentToday = filteredStudents.length - presentToday;
  const attendanceRate =
    filteredStudents.length > 0
      ? (presentToday / filteredStudents.length) * 100
      : 0;

  const markAttendance = (studentId: string, present: boolean) => {
    // In real app, this would call the backend
    console.log(
      `Marking ${studentId} as ${
        present ? "present" : "absent"
      } for ${selectedDate}`
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("ar-EG");
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStudents.length}</div>
            <p className="text-xs text-muted-foreground">في المجموعة المحددة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحضور اليوم</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {presentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              من {filteredStudents.length} طالب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الغياب اليوم</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentToday}</div>
            <p className="text-xs text-muted-foreground">
              من {filteredStudents.length} طالب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الحضور</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {attendanceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">نسبة الحضور اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>فلاتر الحضور</CardTitle>
          <CardDescription>
            اختر التاريخ والمجموعة لعرض سجل الحضور
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">المجموعة</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المجموعة" />
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="البحث بالاسم أو الرقم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            سجل الحضور - {new Date(selectedDate).toLocaleDateString("ar-EG")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الطالب</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المجموعة</TableHead>
                  <TableHead className="text-right">الحضور اليوم</TableHead>
                  <TableHead className="text-right">إجمالي الحضور</TableHead>
                  <TableHead className="text-right">معدل الحضور</TableHead>
                  <TableHead className="text-right">آخر حضور</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const stats = attendanceStats[student.id] || {
                    totalAttendance: 0,
                    attendanceRate: 0,
                    lastAttendance: null,
                  };
                  const isPresentToday = presentIds.includes(student.id);

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.id}
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        {student.group_name || student.group}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            isPresentToday
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {isPresentToday ? "حاضر" : "غائب"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {stats.totalAttendance > 0
                          ? stats.totalAttendance
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {stats.attendanceRate > 0
                          ? `${stats.attendanceRate.toFixed(1)}%`
                          : "—"}
                      </TableCell>
                      <TableCell>{formatDate(stats.lastAttendance)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={isPresentToday ? "default" : "outline"}
                            onClick={() => markAttendance(student.id, true)}
                            className="h-8 px-2"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              !isPresentToday ? "destructive" : "outline"
                            }
                            onClick={() => markAttendance(student.id, false)}
                            className="h-8 px-2"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4" />
              <p>لا توجد نتائج مطابقة للبحث</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
