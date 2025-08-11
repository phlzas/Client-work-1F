"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentPlanSummaryProps {
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount: number;
  paidAmount: number;
}

export function PaymentPlanSummary({
  paymentPlan,
  planAmount,
  installmentCount,
  paidAmount,
}: PaymentPlanSummaryProps) {
  const calculateTotalAmount = () => {
    return paymentPlan === "installment"
      ? planAmount * installmentCount
      : planAmount;
  };

  const calculateRemaining = () => {
    return calculateTotalAmount() - paidAmount;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ج.م`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">ملخص خطة الدفع</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {paymentPlan === "one-time" && (
          <p>دفعة واحدة: {formatCurrency(planAmount)}</p>
        )}

        {paymentPlan === "monthly" && (
          <p>دفع شهري: {formatCurrency(planAmount)} كل شهر</p>
        )}

        {paymentPlan === "installment" && (
          <>
            <p>عدد الأقساط: {installmentCount}</p>
            <p>مبلغ القسط: {formatCurrency(planAmount)}</p>
            <p>إجمالي المبلغ: {formatCurrency(calculateTotalAmount())}</p>
          </>
        )}

        <div className="border-t pt-2 mt-2">
          <p>المبلغ المدفوع: {formatCurrency(paidAmount)}</p>
          <p
            className={`font-medium ${
              calculateRemaining() > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            المتبقي: {formatCurrency(calculateRemaining())}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
