# Student Management System - Project Structure

## Overview

This is an offline-first desktop application built with Tauri 2.0 and Next.js, designed for educational institutions in Egyptian contexts. The system provides comprehensive student data management with QR code-based attendance tracking, flexible payment plans, and full Arabic/RTL support.

## Architecture

### Technology Stack

**Frontend:**
- Next.js 14+ with App Router
- React 19 with TypeScript
- Tailwind CSS with RTL support
- Shadcn/ui components
- React Hook Form for form management
- Lucide React for icons

**Backend:**
- Rust with Tauri 2.0 framework
- SQLite 3 with rusqlite (bundled, backup support)
- Chrono for date/time handling
- Serde for JSON serialization
- QR code generation libraries
- PDF generation for printable QR codes

**Development Tools:**
- Vite for fast development builds
- ESLint for code quality
- Vitest for testing
- TypeScript for type safety

## Directory Structure

```
├── student-management-system-frontend/     # Next.js frontend application
│   ├── app/                               # Next.js app router
│   │   ├── globals.css                    # Global styles with RTL support
│   │   ├── layout.tsx                     # Root layout component
│   │   └── page.tsx                       # Main dashboard page
│   ├── components/                        # React components
│   │   ├── ui/                           # Shadcn/ui base components
│   │   ├── app-sidebar.tsx               # Main navigation sidebar
│   │   ├── attendance-view.tsx           # Attendance management interface
│   │   ├── dashboard-stats.tsx           # Statistics dashboard
│   │   ├── export-manager.tsx            # Data export functionality
│   │   ├── group-management.tsx          # Dynamic group management
│   │   ├── payment-settings.tsx          # Payment configuration
│   │   ├── payment-reminders.tsx         # Payment status tracking
│   │   ├── qr-code-display.tsx           # QR code viewer
│   │   ├── qr-code-manager.tsx           # QR code management
│   │   ├── qr-scanner.tsx                # QR code input scanner
│   │   ├── settings.tsx                  # Application settings
│   │   ├── student-form.tsx              # Student add/edit modal
│   │   ├── student-grid.tsx              # Student data table
│   │   └── theme-provider.tsx            # Theme management
│   ├── hooks/                            # Custom React hooks
│   │   ├── useGroups.ts                  # Groups management hook
│   │   ├── usePaymentSettings.ts         # Payment settings hook
│   │   ├── useStudentForm.ts             # Student form logic
│   │   └── useErrorHandler.ts            # Error handling hook
│   ├── lib/                              # Utility libraries
│   │   ├── api.ts                        # Tauri IPC API service
│   │   ├── data-transform.ts             # Data transformation utilities
│   │   ├── qr-validation.ts              # QR code validation
│   │   └── utils.ts                      # General utilities
│   ├── types/                            # TypeScript definitions
│   │   └── index.ts                      # Shared type definitions
│   └── utils/                            # Helper functions
│       ├── studentDataTransform.ts       # Student data utilities
│       └── validation.ts                 # Form validation
├── src-tauri/                            # Rust backend source
│   ├── src/                              # Rust source files
│   │   ├── main.rs                       # Application entry point
│   │   ├── lib.rs                        # Library exports
│   │   ├── database.rs                   # SQLite connection management
│   │   ├── database_utils.rs             # Database utilities
│   │   ├── student_service.rs            # Student CRUD operations
│   │   ├── attendance_service.rs         # Attendance tracking
│   │   ├── payment_service.rs            # Payment management
│   │   ├── payment_settings_service.rs   # Payment configuration
│   │   ├── groups_service.rs             # Dynamic group management
│   │   ├── settings_service.rs           # Application settings
│   │   ├── audit_service.rs              # Change tracking
│   │   ├── backup_service.rs             # Database backup/restore
│   │   ├── export_service.rs             # Data export functionality
│   │   └── qr_service.rs                 # QR code generation
│   ├── tests/                            # Rust integration tests
│   │   ├── database_integration.rs       # Database testing
│   │   └── payment_service.rs            # Payment logic testing
│   ├── Cargo.toml                        # Rust dependencies
│   └── tauri.conf.json                   # Tauri configuration
├── .kiro/                                # Kiro AI configuration
│   ├── specs/                            # Feature specifications
│   │   └── student-management-system/    # Project specifications
│   ├── steering/                         # AI guidance documents
│   │   ├── tech.md                       # Technology guidelines
│   │   ├── structure.md                  # Project structure rules
│   │   ├── product.md                    # Product requirements
│   │   └── how to act.md                 # AI behavior guidelines
│   └── settings/                         # Kiro settings
├── custom-search-mcp/                    # MCP server for web search
│   ├── custom-search-mcp.js              # Search server implementation
│   └── package.json                      # MCP server dependencies
├── docs/                                 # Documentation
│   ├── API_DOCUMENTATION.md              # API reference
│   ├── INTEGRATION_README.md             # Integration guide
│   ├── MCP_SERPAPI_DOCUMENTATION.md      # MCP server docs
│   └── README.md                         # Main documentation
├── scripts/                              # Build and setup scripts
│   ├── setup-integration.bat             # Windows setup script
│   └── setup-integration.sh              # Unix setup script
├── package.json                          # Root package configuration
├── tsconfig.json                         # TypeScript configuration
├── vite.config.ts                        # Vite build configuration
└── vitest.config.ts                      # Test configuration
```

## Database Schema

### Core Tables

**students**
- `id` (TEXT PRIMARY KEY) - Unique student identifier
- `name` (TEXT NOT NULL) - Student name (Arabic support)
- `group_name` (TEXT NOT NULL) - Student group
- `payment_plan` (TEXT NOT NULL) - Payment plan type (one-time, monthly, installment)
- `plan_amount` (REAL NOT NULL) - Payment plan amount
- `paid_amount` (REAL DEFAULT 0) - Amount paid so far
- `installment_count` (INTEGER) - Number of installments (for installment plans)
- `enrollment_date` (TEXT NOT NULL) - Student enrollment date
- `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TEXT DEFAULT CURRENT_TIMESTAMP)

**attendance**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `student_id` (TEXT NOT NULL) - Foreign key to students
- `date` (TEXT NOT NULL) - Attendance date
- `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)

**groups**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT UNIQUE NOT NULL) - Group name
- `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TEXT DEFAULT CURRENT_TIMESTAMP)

**payment_settings**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `one_time_amount` (REAL NOT NULL) - Default one-time payment amount
- `monthly_amount` (REAL NOT NULL) - Default monthly payment amount
- `installment_amount` (REAL NOT NULL) - Default installment amount
- `installment_interval_months` (INTEGER NOT NULL) - Months between installments
- `reminder_days` (INTEGER NOT NULL) - Da