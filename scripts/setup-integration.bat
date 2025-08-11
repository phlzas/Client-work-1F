@echo off
echo Setting up Student Management System Integration...

echo.
echo Installing Next.js frontend dependencies...
cd student-management-system-frontend
call npm install

echo.
echo Building Next.js frontend...
call npm run build

echo.
echo Going back to root directory...
cd ..

echo.
echo Running Tauri development server...
cd src-tauri
cargo tauri dev

pause@echo off
echo Setting up Student Management System Integration...

echo.
echo Installing Next.js frontend dependencies...
cd student-management-system-frontend
call npm install

echo.
echo Building Next.js frontend...
call npm run build

echo.
echo Going back to root directory...
cd ..

echo.
echo Running Tauri development server...
cd src-tauri
cargo tauri dev

pause