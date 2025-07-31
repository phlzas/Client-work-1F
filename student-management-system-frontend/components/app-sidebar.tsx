"use client";

import {
  Calendar,
  Home,
  Users,
  DollarSign,
  FileText,
  Settings,
  QrCode,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";
import type { Student } from "@/types";
import { useSidebar } from "@/components/ui/sidebar";
import { transformStudentsForUI } from "@/lib/data-transform";

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  students: Student[];
}

export function AppSidebar({
  activeView,
  onViewChange,
  students,
}: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();

  // Transform students and calculate statistics with memoization
  const {
    transformedStudents,
    totalStudents,
    overdueStudents,
    dueSoonStudents,
    paidStudents,
  } = useMemo(() => {
    const transformed = transformStudentsForUI(students);
    return {
      transformedStudents: transformed,
      totalStudents: transformed.length,
      overdueStudents: transformed.filter((s) => s.paymentStatus === "overdue")
        .length,
      dueSoonStudents: transformed.filter((s) => s.paymentStatus === "due_soon")
        .length,
      paidStudents: transformed.filter((s) => s.paymentStatus === "paid")
        .length,
    };
  }, [students]);

  const mainNavItems = [
    {
      title: "لوحة التحكم",
      url: "dashboard",
      icon: Home,
      badge: null,
    },
    {
      title: "إدارة الطلاب",
      url: "students",
      icon: Users,
      badge: totalStudents > 0 ? totalStudents.toString() : null,
    },
    {
      title: "تسجيل الحضور",
      url: "attendance",
      icon: Calendar,
      badge: null,
    },
  ];

  const paymentNavItems = [
    {
      title: "المدفوعات",
      url: "payments",
      icon: DollarSign,
      badge: null,
    },
    {
      title: "متأخرة",
      url: "payments",
      icon: AlertTriangle,
      badge: overdueStudents > 0 ? overdueStudents.toString() : null,
      badgeVariant: "destructive" as const,
      isSubItem: true,
    },
    {
      title: "مستحقة قريباً",
      url: "payments",
      icon: Clock,
      badge: dueSoonStudents > 0 ? dueSoonStudents.toString() : null,
      badgeVariant: "secondary" as const,
      isSubItem: true,
    },
  ];

  const reportsNavItems = [
    {
      title: "التقارير والتصدير",
      url: "reports",
      icon: FileText,
      badge: null,
    },
    {
      title: "الإعدادات",
      url: "settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-l border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between py-2 px-0">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/80 transition-colors group-data-[collapsible=icon]:cursor-pointer group-data-[collapsible=icon]:ring-2 group-data-[collapsible=icon]:ring-sidebar-ring group-data-[collapsible=icon]:shadow-md"
              title={state === "collapsed" ? "فتح الشريط الجانبي" : undefined}
            >
              <QrCode className="size-4 group-data-[collapsible=icon]:animate-pulse" />
            </button>
            <div className="grid flex-1 text-right text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">نظام إدارة الطلاب</span>
              <span className="truncate text-xs">الإصدار 1.0</span>
            </div>
          </div>
          <SidebarTrigger className="h-6 w-6 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>التنقل الرئيسي</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.url)}
                    isActive={activeView === item.url}
                    className="w-full justify-start"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="mr-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Payment Management */}
        <SidebarGroup>
          <SidebarGroupLabel>إدارة المدفوعات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {paymentNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.url)}
                    isActive={activeView === item.url}
                    className={`w-full justify-start ${
                      item.isSubItem ? "pr-8 text-sm" : ""
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge
                        variant={item.badgeVariant || "secondary"}
                        className="mr-auto"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports & Settings */}
        <SidebarGroup>
          <SidebarGroupLabel>التقارير والإعدادات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.url)}
                    isActive={activeView === item.url}
                    className="w-full justify-start"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="mr-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats Card */}
        <SidebarGroup>
          <SidebarGroupLabel>إحصائيات سريعة</SidebarGroupLabel>
          <SidebarGroupContent>
            <Card className="mx-2">
              <CardContent className="p-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إجمالي الطلاب</span>
                    <Badge variant="outline">{totalStudents}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">مدفوع</span>
                    <Badge className="bg-green-100 text-green-800">
                      {paidStudents}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">متأخر</span>
                    <Badge className="bg-red-100 text-red-800">
                      {overdueStudents}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">مستحق قريباً</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {dueSoonStudents}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <div className="p-4 text-center text-xs text-muted-foreground">
          <p>© 2024 نظام إدارة الطلاب</p>
          <p>جميع الحقوق محفوظة</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
