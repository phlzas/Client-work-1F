# نظام إدارة الطلاب - Student Management System

An offline-first desktop application for educational institutions, specifically designed for Egyptian educational contexts. The system provides comprehensive student data management with QR code-based attendance tracking and flexible payment plan support.

## ✨ Features

### 📊 Student Management

- **Modern Interface**: Clean, responsive UI with sidebar navigation and dashboard
- **Student Grid**: Table-based view with filtering, searching, and sorting capabilities
- **Student Forms**: Modal forms for adding/editing student information with validation
- **Dynamic Groups**: Configurable student groups with management interface
- **Payment Plans**: Support for one-time, monthly, and installment payment plans

### 📱 QR Code System

- **QR Code Generation**: Automatic QR code generation for each student
- **QR Scanner**: Persistent input field for quick attendance logging
- **PDF Export**: Batch export of QR codes to PDF for printing
- **QR Code Display**: Individual QR code viewing with student information

### 💰 Payment Management

- **Payment Tracking**: Visual status indicators (paid, pending, overdue, due soon)
- **Payment Plans**: Configurable payment amounts and intervals
- **Payment History**: Transaction tracking and history display
- **Payment Reminders**: Automated status calculations based on due dates

### 🎯 Attendance System

- **QR-based Attendance**: Quick attendance marking via QR code scanning
- **Attendance History**: Comprehensive attendance tracking and reporting
- **Daily Summaries**: Attendance statistics and summaries by date/group

### 🌐 Arabic/RTL Support

- **Full RTL Layout**: Complete right-to-left interface support
- **Arabic Text**: Native Arabic text input and display
- **Localized Interface**: Arabic labels and messages throughout the application

### 📈 Reporting & Export

- **Data Export**: CSV export for students, attendance, and payment data
- **QR Code Management**: Batch QR code generation and export
- **Statistics Dashboard**: Overview of student counts, payment status, and attendance

### ⚙️ Configuration

- **Settings Management**: Configurable payment amounts, reminder days, and thresholds
- **Group Management**: Dynamic creation and management of student groups
- **System Settings**: Theme, language, and accessibility options

## Technology Stack

### Frontend Stack

- **React 19** with TypeScript for modern UI components
- **Next.js App Router** for routing and page management
- **Tailwind CSS** with RTL support for styling
- **Shadcn/ui** for consistent UI components
- **React Hook Form** for form management and validation
- **Lucide React** for icons

### Backend Stack

- **Rust** for backend services and business logic
- **Tauri 2.0** for desktop application packaging and IPC
- **SQLite 3** with rusqlite for local data storage
- **Chrono** for date/time handling with timezone support
- **Serde** for JSON serialization between frontend and backend
- **QR Code** library for QR code generation
- **PDF generation** for printable QR codes

### AI Integration

- **MCP Server**: SerpAPI integration for web search capabilities
- **Model Context Protocol**: Enables AI assistants to perform web searches
- **Search Engines**: Support for Google, Bing, Yahoo, DuckDuckGo, and more

## Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **Rust** (latest stable version)
- **Tauri CLI** (installed via npm)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd student-management-system
```

2. Install frontend dependencies:

```bash
npm install
```

3. Install Tauri CLI globally (if not already installed):

```bash
npm install -g @tauri-apps/cli
```

## Development

### Start Development Server

```bash
npm run tauri dev
```

This will start both the Vite development server and the Tauri application.

### Other Available Scripts

```bash
# Build TypeScript and create production bundle
npm run build

# Run ESLint for code quality
npm run lint

# Preview production build
npm run preview

# Access Tauri CLI directly
npm run tauri
```

## 📁 Project Structure

```
├── student-management-system-frontend/  # Next.js frontend application
│   ├── app/                             # Next.js app router pages
│   ├── components/                      # React components
│   │   ├── ui/                         # Shadcn/ui base components
│   │   ├── app-sidebar.tsx             # Main navigation sidebar
│   │   ├── student-form.tsx            # Student add/edit modal
│   │   ├── student-grid.tsx            # Student data table
│   │   ├── qr-code-display.tsx         # QR code viewer component
│   │   ├── qr-code-manager.tsx         # QR code management interface
│   │   ├── settings.tsx                # Application settings
│   │   └── ...                         # Other components
│   ├── hooks/                          # Custom React hooks
│   │   ├── useGroups.ts                # Groups management hook
│   │   └── usePaymentSettings.ts       # Payment settings hook
│   ├── lib/                            # Utility libraries
│   │   ├── api.ts                      # Tauri IPC API service
│   │   └── data-transform.ts           # Data transformation utilities
│   ├── types/                          # TypeScript type definitions
│   └── utils/                          # Helper functions
├── src-tauri/                          # Rust backend source
│   ├── src/                            # Rust source files
│   │   ├── main.rs                     # Application entry point
│   │   ├── database.rs                 # SQLite database management
│   │   ├── student_service.rs          # Student CRUD operations
│   │   ├── attendance_service.rs       # Attendance tracking
│   │   ├── payment_service.rs          # Payment management
│   │   ├── settings_service.rs         # Configuration management
│   │   ├── audit_service.rs            # Change tracking
│   │   └── qr_service.rs               # QR code generation
│   ├── Cargo.toml                      # Rust dependencies
│   └── tauri.conf.json                 # Tauri configuration
└── public/                             # Static assets
```

## Key Dependencies

### Frontend Dependencies

- `@tauri-apps/api` - Tauri JavaScript API for IPC communication
- `@tauri-apps/plugin-shell` - Shell plugin for Tauri
- `react` & `react-dom` - React 19 framework
- `next` - Next.js framework for React applications
- `@radix-ui/*` - Headless UI components for accessibility
- `tailwindcss` - Utility-first CSS framework
- `lucide-react` - Icon library
- `class-variance-authority` - Utility for component variants

### Development Dependencies

- `@tauri-apps/cli` - Tauri command line interface
- `typescript` - TypeScript compiler
- `@types/*` - TypeScript type definitions
- `eslint` - Code linting and quality
- `@testing-library/*` - Testing utilities for React components
- `vitest` - Fast unit testing framework
- `jsdom` - DOM implementation for testing

### Backend Dependencies (Rust)

- `tauri` - Desktop application framework with features for bundled SQLite
- `rusqlite` - SQLite database interface with backup support
- `chrono` - Date and time library with serde support
- `serde` & `serde_json` - Serialization framework
- `thiserror` - Ergonomic error handling
- `qrcode` - QR code generation library
- `image` - Image processing and manipulation
- `uuid` - UUID generation for unique identifiers

## Building for Production

To create a production build:

```bash
npm run tauri build
```

This will create a distributable executable in the `src-tauri/target/release/bundle/` directory.

## Target Requirements

- **Bundle Size**: Under 10MB for final executable
- **Offline Operation**: No external API dependencies
- **Cross-platform**: Windows primary, Linux/macOS secondary
- **Arabic Support**: Full RTL text support
- **Accessibility**: ARIA compliance and keyboard navigation

## 🚀 Usage

### Main Interface

The application features a sidebar navigation with the following sections:

- **Dashboard** (لوحة التحكم): Overview statistics and QR scanner
- **Students** (إدارة الطلاب): Student management with table view
- **Attendance** (تسجيل الحضور): Attendance tracking and history
- **QR Codes** (رموز الاستجابة السريعة): QR code management
- **Payments** (المدفوعات): Payment tracking and reminders
- **Reports** (التقارير والتصدير): Data export functionality
- **Settings** (الإعدادات): System configuration

### Adding Students

1. Navigate to the Students section
2. Click "إضافة طالب جديد" (Add New Student)
3. Fill in the student information:
   - Name (اسم الطالب)
   - Group (المجموعة)
   - Payment Plan (خطة الدفع): One-time, Monthly, or Installment
   - Payment Amount (مبلغ الخطة)
   - Paid Amount (المبلغ المدفوع)
   - Enrollment Date (تاريخ التسجيل)

### QR Code Attendance

1. Use the QR scanner on the dashboard
2. Scan or enter a student ID
3. The system will automatically mark attendance and show payment status
4. Duplicate attendance for the same day is prevented

### Managing Groups and Settings

1. Go to Settings (الإعدادات)
2. Configure payment amounts for different plans
3. Manage student groups (add, edit, delete)
4. Set reminder days and payment thresholds

## 📊 Current Implementation Status

### ✅ Completed Features

- Student management with CRUD operations
- Dynamic group management system
- Configurable payment settings
- QR code generation and display
- Payment plan support (one-time, monthly, installment)
- Payment status tracking and calculations
- Arabic/RTL interface support
- Sidebar navigation with statistics
- Student form with validation
- Settings management interface

### 🚧 In Progress

- Export functionality (CSV/PDF)
- Backup and restore system
- Comprehensive attendance management
- Advanced reporting features

### 📋 Planned Features

- End-to-end testing suite
- Performance optimizations
- Accessibility enhancements
- Cross-platform packaging


See `MCP_SERPAPI_DOCUMENTATION.md` for detailed setup and usage instructions.

## License

[Add your license information here]
