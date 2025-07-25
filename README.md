# Student Management System

An offline-first desktop application for educational institutions, specifically designed for Egyptian educational contexts. The system provides Excel-like student data management with QR code-based attendance tracking.

## Features

- **Excel-like Interface**: Familiar spreadsheet functionality using React Data Grid
- **QR Code Attendance**: Quick attendance logging via barcode/QR scanner input
- **Payment Tracking**: Visual highlighting of students with payments below 6000 EGP threshold
- **Arabic/RTL Support**: Full right-to-left text support for Arabic names and content
- **Data Export**: CSV export functionality for attendance records and payment summaries
- **Offline Operation**: Complete local functionality using SQLite database

## Technology Stack

### Frontend

- **React 18+** with TypeScript
- **React Data Grid** for Excel-like spreadsheet functionality
- **Vite** for fast development and bundling
- **CSS Modules** with RTL support

### Backend

- **Rust** for backend services and business logic
- **Tauri 2.0** for desktop application packaging and IPC
- **SQLite 3** for local data storage

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

## Project Structure

```
├── src/                          # React frontend source
│   ├── components/               # React components
│   ├── services/                # Frontend service layer
│   ├── types/                   # TypeScript interfaces
│   ├── utils/                   # Helper functions
│   └── styles/                  # CSS modules
├── src-tauri/                   # Rust backend source
│   ├── src/                     # Rust source files
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
└── public/                      # Static assets
```

## Key Dependencies

### Runtime Dependencies

- `@tauri-apps/api` - Tauri JavaScript API for IPC communication
- `@tauri-apps/plugin-shell` - Shell plugin for Tauri
- `react` & `react-dom` - React framework
- `react-data-grid` - Excel-like data grid component

### Development Dependencies

- `@tauri-apps/cli` - Tauri command line interface
- `typescript` - TypeScript compiler
- `vite` - Build tool and development server
- `eslint` - Code linting and quality

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

## Development Status

This project is currently in development. See `.kiro/specs/student-management-system/tasks.md` for detailed implementation progress.

## License

[Add your license information here]
