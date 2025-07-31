# Student Management System - Frontend Integration

This document explains how the modern Next.js frontend has been integrated with the Tauri Rust backend.

## Architecture Overview

### Frontend (Next.js)

- **Location**: `student-management-system-frontend/`
- **Technology**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Features**:
  - Arabic RTL support
  - Modern responsive design
  - Excel-like data grid functionality
  - QR code scanning interface
  - Dashboard with statistics
  - Export functionality

### Backend (Tauri + Rust)

- **Location**: `src-tauri/`
- **Technology**: Tauri 2.0 with Rust, SQLite database
- **Features**:
  - Complete CRUD operations for students
  - Attendance tracking with QR code support
  - Payment management and tracking
  - Settings and configuration management
  - Audit logging
  - Database migrations

## Integration Components

### 1. API Service Layer (`lib/api.ts`)

- Type-safe wrapper around Tauri IPC commands
- Handles all communication between frontend and backend
- Includes error handling and data transformation
- Provides CSV export functionality

### 2. Data Transformation (`lib/data-transform.ts`)

- Converts between backend format (snake_case) and frontend format (camelCase)
- Provides validation helpers
- Includes formatting utilities for dates, currency, and status text
- Maintains backward compatibility with existing UI components

### 3. Type Definitions (`types/index.ts`)

- Updated to match backend data structures exactly
- Includes both snake_case (backend) and camelCase (frontend) properties
- Provides type safety across the entire application

### 4. Configuration Updates

- **Tauri Config**: Updated to use Next.js frontend instead of Vite
- **Next.js Config**: Configured for static export to work with Tauri
- **Package.json**: Added Tauri API dependencies

## Key Features Implemented

### Student Management

- ✅ Add, edit, delete students
- ✅ Excel-like data grid with sorting and filtering
- ✅ Payment plan management (one-time, monthly, installment)
- ✅ Payment status tracking with visual indicators
- ✅ Real-time data updates

### Attendance System

- ✅ QR code scanning for attendance
- ✅ Duplicate attendance prevention
- ✅ Attendance history and statistics
- ✅ Daily attendance summaries

### Payment Management

- ✅ Payment recording and tracking
- ✅ Payment history with filtering
- ✅ Automatic payment status calculation
- ✅ Payment reminders and notifications

### Data Export

- ✅ CSV export for students, attendance, and payments
- ✅ Filtered export options
- ✅ Date range selections

### Settings & Configuration

- ✅ Application settings management
- ✅ Payment plan configuration
- ✅ Theme and language settings
- ✅ Arabic RTL support

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Rust and Cargo
- Tauri CLI

### Quick Start

1. Run the setup script:

   ```bash
   # On Windows
   setup-integration.bat

   # On Linux/Mac
   chmod +x setup-integration.sh
   ./setup-integration.sh
   ```

### Manual Setup

1. Install frontend dependencies:

   ```bash
   cd student-management-system-frontend
   npm install
   ```

2. Build the frontend:

   ```bash
   npm run build
   ```

3. Run the Tauri application:
   ```bash
   cd ../src-tauri
   cargo tauri dev
   ```

## Development Workflow

### Frontend Development

```bash
cd student-management-system-frontend
npm run dev  # Runs Next.js dev server on port 3000
```

### Backend Development

```bash
cd src-tauri
cargo tauri dev  # Runs Tauri with hot reload
```

### Full Application

```bash
cd src-tauri
cargo tauri dev  # Automatically builds frontend and runs Tauri
```

## Data Flow

1. **User Interaction**: User interacts with Next.js UI components
2. **API Call**: Component calls ApiService method
3. **IPC Communication**: ApiService invokes Tauri command
4. **Backend Processing**: Rust backend processes request and updates SQLite database
5. **Response**: Data flows back through the same chain
6. **UI Update**: React components re-render with new data

## File Structure

```
├── student-management-system-frontend/    # Next.js Frontend
│   ├── app/                              # Next.js App Router
│   ├── components/                       # React Components
│   ├── lib/                             # Utilities and API
│   │   ├── api.ts                       # Tauri API wrapper
│   │   ├── data-transform.ts            # Data transformation utilities
│   │   └── utils.ts                     # General utilities
│   ├── types/                           # TypeScript type definitions
│   └── package.json                     # Frontend dependencies
├── src-tauri/                           # Tauri Backend
│   ├── src/                            # Rust source code
│   │   ├── main.rs                     # Application entry point
│   │   ├── lib.rs                      # IPC command handlers
│   │   ├── student_service.rs          # Student management
│   │   ├── attendance_service.rs       # Attendance tracking
│   │   ├── payment_service.rs          # Payment management
│   │   └── database.rs                 # Database operations
│   ├── tauri.conf.json                 # Tauri configuration
│   └── Cargo.toml                      # Rust dependencies
└── setup-integration.*                 # Setup scripts
```

## API Methods Available

### Students

- `getAllStudents()` - Get all students with attendance data
- `getStudentById(id)` - Get specific student
- `addStudent(...)` - Add new student
- `updateStudent(...)` - Update existing student
- `deleteStudent(id)` - Delete student

### Attendance

- `markAttendance(studentId, date?)` - Mark student attendance
- `checkAttendanceToday(studentId)` - Check if already marked today
- `getAttendanceHistory(...)` - Get attendance records with filtering

### Payments

- `recordPayment(...)` - Record a payment
- `getPaymentHistory(...)` - Get payment records with filtering
- `getPaymentSummary()` - Get payment statistics

### Settings

- `getSettings()` - Get application settings
- `updateSettings(settings)` - Update settings
- `getSetting(key)` - Get specific setting

## Troubleshooting

### Common Issues

1. **Frontend not loading**: Ensure Next.js build completed successfully
2. **API calls failing**: Check that Tauri backend is running
3. **Type errors**: Verify types match between frontend and backend
4. **Database errors**: Check SQLite database permissions and migrations

### Debug Mode

Run with debug logging:

```bash
RUST_LOG=debug cargo tauri dev
```

## Next Steps

1. **Testing**: Add comprehensive tests for both frontend and backend
2. **Performance**: Optimize data loading and caching
3. **Features**: Add more advanced reporting and analytics
4. **Deployment**: Set up production build and distribution

## Contributing

When making changes:

1. Update types in both frontend and backend if data structures change
2. Test API integration thoroughly
3. Ensure Arabic RTL support is maintained
4. Follow existing code patterns and conventions
