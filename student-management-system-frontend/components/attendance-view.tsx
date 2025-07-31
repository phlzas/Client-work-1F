"use client";

import { useState } from "react";
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
import type { Student } from "@/types";

interface AttendanceViewProps {
  students: Student[];
}

export function AttendanceView({ students }: AttendanceViewProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock attendance data - in real app this would come from database
  const mockAttendanceData = students.map((student) => ({
    ...student,
    attendanceToday: Math.random() > 0.3, // 70% attendance rate
    attendanceCount: Math.floor(Math.random() * 20) + 5,
    totalSessions: 25,
    lastAttendance: new Date(
      Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0],
  }));

  const filteredStudents = mockAttendanceData.filter((student) => {
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

  const presentToday = filteredStudents.filter((s) => s.attendanceToday).length;
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

  return (
    <div className="space-y-6">
      {/* Attendance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
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
              من أصل {filteredStudents.length} طالب
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
              {filteredStudents.length > 0
                ? ((absentToday / filteredStudents.length) * 100).toFixed(1)
                : 0}
              % غياب
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
            <p className="text-xs text-muted-foreground">لليوم الحالي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStudents.length}</div>
            <p className="text-xs text-muted-foreground">
              في المجموعات المحددة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            تسجيل الحضور
          </CardTitle>
          <CardDescription>
            اختر التاريخ والمجموعة لعرض وتسجيل الحضور
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.id}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{student.group}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          student.attendanceToday
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "bg-red-100 text-red-800 border-red-200"
                        }
                      >
                        {student.attendanceToday ? "حاضر" : "غائب"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {student.attendanceCount}/{student.totalSessions}
                    </TableCell>
                    <TableCell>
                      {(
                        (student.attendanceCount / student.totalSessions) *
                        100
                      ).toFixed(1)}
                      %
                    </TableCell>
                    <TableCell>
                      {new Date(student.lastAttendance).toLocaleDateString(
                        "ar-EG"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={
                            student.attendanceToday ? "default" : "outline"
                          }
                          onClick={() => markAttendance(student.id, true)}
                          className="h-8 px-2"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            !student.attendanceToday ? "destructive" : "outline"
                          }
                          onClick={() => markAttendance(student.id, false)}
                          className="h-8 px-2"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
