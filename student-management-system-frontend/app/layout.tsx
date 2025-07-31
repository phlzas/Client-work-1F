import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة الطلاب - Student Management System",
  description: "Student Management System with QR Code Attendance Tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <style>{`
html {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
