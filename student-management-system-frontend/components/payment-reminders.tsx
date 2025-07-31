"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Clock, DollarSign } from "lucide-react";
import type { Student } from "@/types";

interface PaymentRemindersProps {
  students: Student[];
}

export function PaymentReminders({ students }: PaymentRemindersProps) {
  const overdueStudents = students.filter((s) => s.paymentStatus === "overdue");
  const dueSoonStudents = students.filter(
    (s) => s.paymentStatus === "due_soon"
  );

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

  const calculateOverdueAmount = (student: Student) => {
    const plan = student.payment_plan || student.paymentPlan || "one-time";
    const planAmount = student.plan_amount || student.planAmount || 0;
    const paidAmount = student.paid_amount || student.paidAmount || 0;
    const installmentCount =
      student.installment_count || student.installmentCount || 3;

    if (plan === "installment") {
      return planAmount * installmentCount - paidAmount;
    }
    return planAmount - paidAmount;
  };

  return (
    <div className="space-y-6">
      {/* Overdue Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            المدفوعات المتأخرة ({overdueStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueStudents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-right">المجموعة</TableHead>
                    <TableHead className="text-right">خطة الدفع</TableHead>
                    <TableHead className="text-right">المبلغ المتأخر</TableHead>
                    <TableHead className="text-right">
                      تاريخ الاستحقاق
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueStudents.map((student) => (
                    <TableRow key={student.id} className="bg-red-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            {student.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.group_name || student.group || ""}
                      </TableCell>
                      <TableCell>
                        {getPaymentPlanText(
                          student.payment_plan ||
                            student.paymentPlan ||
                            "one-time"
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        {calculateOverdueAmount(student).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell>
                        {student.next_due_date || student.nextDueDate
                          ? new Date(
                              student.next_due_date || student.nextDueDate!
                            ).toLocaleDateString("ar-EG")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>لا توجد مدفوعات متأخرة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Due Soon Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <Clock className="h-5 w-5" />
            مدفوعات مستحقة قريباً ({dueSoonStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dueSoonStudents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الطالب</TableHead>
                    <TableHead className="text-right">المجموعة</TableHead>
                    <TableHead className="text-right">خطة الدفع</TableHead>
                    <TableHead className="text-right">المبلغ المطلوب</TableHead>
                    <TableHead className="text-right">
                      تاريخ الاستحقاق
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueSoonStudents.map((student) => (
                    <TableRow key={student.id} className="bg-yellow-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            {student.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.group_name || student.group || ""}
                      </TableCell>
                      <TableCell>
                        {getPaymentPlanText(
                          student.payment_plan ||
                            student.paymentPlan ||
                            "one-time"
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-yellow-600">
                        {(
                          student.plan_amount ||
                          student.planAmount ||
                          0
                        ).toLocaleString()}{" "}
                        ج.م
                      </TableCell>
                      <TableCell>
                        {student.next_due_date || student.nextDueDate
                          ? new Date(
                              student.next_due_date || student.nextDueDate!
                            ).toLocaleDateString("ar-EG")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>لا توجد مدفوعات مستحقة قريباً</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>ملخص المدفوعات حسب الخطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["one-time", "monthly", "installment"].map((plan) => {
              const planStudents = students.filter(
                (s) => s.paymentPlan === plan
              );
              const paidCount = planStudents.filter(
                (s) => s.paymentStatus === "paid"
              ).length;
              const overdueCount = planStudents.filter(
                (s) => s.paymentStatus === "overdue"
              ).length;
              const dueSoonCount = planStudents.filter(
                (s) => s.paymentStatus === "due_soon"
              ).length;

              return (
                <div key={plan} className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-3">
                    {getPaymentPlanText(plan)}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>إجمالي الطلاب:</span>
                      <span className="font-medium">{planStudents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مدفوع:</span>
                      <Badge className="bg-green-100 text-green-800">
                        {paidCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>متأخر:</span>
                      <Badge className="bg-red-100 text-red-800">
                        {overdueCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>مستحق قريباً:</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {dueSoonCount}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
