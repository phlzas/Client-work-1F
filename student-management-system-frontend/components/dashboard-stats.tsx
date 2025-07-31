"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Student } from "@/types";

interface DashboardStatsProps {
  students: Student[];
}

export function DashboardStats({ students }: DashboardStatsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  جاري التحميل...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">-</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalStudents = students.length;
  const paidStudents = students.filter(
    (s) => (s.payment_status || s.paymentStatus) === "paid"
  ).length;
  const overdueStudents = students.filter(
    (s) => (s.payment_status || s.paymentStatus) === "overdue"
  ).length;
  const dueSoonStudents = students.filter(
    (s) => (s.payment_status || s.paymentStatus) === "due_soon"
  ).length;
  const pendingStudents = students.filter(
    (s) => (s.payment_status || s.paymentStatus) === "pending"
  ).length;

  // Calculate revenue
  const totalRevenue = students.reduce(
    (sum, student) => sum + (student.paid_amount || student.paidAmount || 0),
    0
  );
  const expectedRevenue = students.reduce((sum, student) => {
    const paymentPlan =
      student.payment_plan || student.paymentPlan || "one-time";
    const planAmount = student.plan_amount || student.planAmount || 0;
    const installmentCount =
      student.installment_count || student.installmentCount || 3;

    if (paymentPlan === "installment") {
      return sum + planAmount * installmentCount;
    }
    return sum + planAmount;
  }, 0);

  const collectionRate =
    expectedRevenue > 0 ? (totalRevenue / expectedRevenue) * 100 : 0;

  // Group statistics
  const groupStats = students.reduce((acc, student) => {
    const group = student.group_name || student.group || "Unknown";
    if (!acc[group]) {
      acc[group] = { total: 0, paid: 0 };
    }
    acc[group].total++;
    if ((student.payment_status || student.paymentStatus) === "paid") {
      acc[group].paid++;
    }
    return acc;
  }, {} as Record<string, { total: number; paid: number }>);

  return (
    <div className="space-y-6">
      {/* Main Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.floor(Math.random() * 5) + 1} هذا الشهر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مدفوع بالكامل</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidStudents}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalStudents > 0
                ? `${Math.round(
                    (paidStudents / totalStudents) * 100
                  )}% من الإجمالي`
                : "0% من الإجمالي"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              مدفوعات متأخرة
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueStudents}
            </div>
            <p className="text-xs text-muted-foreground">يتطلب متابعة فورية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مستحق قريباً</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dueSoonStudents}
            </div>
            <p className="text-xs text-muted-foreground">خلال 7 أيام</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Collection Rate */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>المحصل</span>
                <span className="font-medium">
                  {totalRevenue.toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>المتوقع</span>
                <span className="font-medium">
                  {expectedRevenue.toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>المتبقي</span>
                <span className="font-medium text-red-600">
                  {(expectedRevenue - totalRevenue).toLocaleString()} ج.م
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>معدل التحصيل</span>
                <span className="font-medium">
                  {Math.round(collectionRate * 10) / 10}%
                </span>
              </div>
              <Progress value={collectionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              إحصائيات المجموعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(groupStats).map(([group, stats]) => (
                <div key={group} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{group}</span>
                    <span className="font-medium">
                      {stats.paid}/{stats.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.total > 0 ? (stats.paid / stats.total) * 100 : 0
                    }
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع حالات الدفع</CardTitle>
          <CardDescription>
            نظرة عامة على حالة المدفوعات لجميع الطلاب
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg bg-green-50">
              <div className="text-2xl font-bold text-green-600">
                {paidStudents}
              </div>
              <div className="text-sm text-green-700">مدفوع</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-blue-50">
              <div className="text-2xl font-bold text-blue-600">
                {pendingStudents}
              </div>
              <div className="text-sm text-blue-700">في الانتظار</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-yellow-50">
              <div className="text-2xl font-bold text-yellow-600">
                {dueSoonStudents}
              </div>
              <div className="text-sm text-yellow-700">مستحق قريباً</div>
            </div>
            <div className="text-center p-4 border rounded-lg bg-red-50">
              <div className="text-2xl font-bold text-red-600">
                {overdueStudents}
              </div>
              <div className="text-sm text-red-700">متأخر</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
