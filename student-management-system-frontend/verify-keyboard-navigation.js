#!/usr/bin/env node

/**
 * Keyboard Navigation Verification Script
 *
 * This script performs static analysis to verify that keyboard navigation
 * features have been properly implemented across the application.
 */

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return null;
  }
}

function checkKeyboardNavigationImplementation() {
  log("\n🔍 Verifying Keyboard Navigation Implementation\n", "bold");

  const checks = [];

  // Check 1: Keyboard Navigation Hook
  const hookPath = "hooks/useKeyboardNavigation.ts";
  const hookExists = checkFileExists(hookPath);
  checks.push({
    name: "Keyboard Navigation Hook",
    passed: hookExists,
    details: hookExists
      ? "useKeyboardNavigation hook found"
      : "Hook file missing",
  });

  if (hookExists) {
    const hookContent = readFileContent(hookPath);
    const hasArrowKeys =
      hookContent.includes("onArrowUp") && hookContent.includes("onArrowDown");
    const hasEnterEscape =
      hookContent.includes("onEnter") && hookContent.includes("onEscape");
    const hasFocusManagement =
      hookContent.includes("focusFirst") && hookContent.includes("focusLast");

    checks.push({
      name: "Arrow Key Support",
      passed: hasArrowKeys,
      details: hasArrowKeys
        ? "Arrow key handlers implemented"
        : "Missing arrow key support",
    });

    checks.push({
      name: "Enter/Escape Support",
      passed: hasEnterEscape,
      details: hasEnterEscape
        ? "Enter/Escape handlers implemented"
        : "Missing Enter/Escape support",
    });

    checks.push({
      name: "Focus Management",
      passed: hasFocusManagement,
      details: hasFocusManagement
        ? "Focus management functions implemented"
        : "Missing focus management",
    });
  }

  // Check 2: Keyboard Navigation Provider
  const providerPath = "components/keyboard-navigation-provider.tsx";
  const providerExists = checkFileExists(providerPath);
  checks.push({
    name: "Keyboard Navigation Provider",
    passed: providerExists,
    details: providerExists
      ? "Provider component found"
      : "Provider component missing",
  });

  if (providerExists) {
    const providerContent = readFileContent(providerPath);
    const hasSkipLinks = providerContent.includes("skip-links");
    const hasFocusIndicator = providerContent.includes("focus-indicator");
    const hasKeyboardDetection = providerContent.includes("keyboard-user");

    checks.push({
      name: "Skip Links",
      passed: hasSkipLinks,
      details: hasSkipLinks ? "Skip links implemented" : "Missing skip links",
    });

    checks.push({
      name: "Focus Indicators",
      passed: hasFocusIndicator,
      details: hasFocusIndicator
        ? "Focus indicators implemented"
        : "Missing focus indicators",
    });

    checks.push({
      name: "Keyboard User Detection",
      passed: hasKeyboardDetection,
      details: hasKeyboardDetection
        ? "Keyboard detection implemented"
        : "Missing keyboard detection",
    });
  }

  // Check 3: Component Integration
  const componentsToCheck = [
    { name: "QR Scanner", path: "components/qr-scanner.tsx" },
    { name: "Student Grid", path: "components/student-grid.tsx" },
    { name: "Student Form", path: "components/student-form.tsx" },
    { name: "App Sidebar", path: "components/app-sidebar.tsx" },
  ];

  componentsToCheck.forEach((component) => {
    const componentExists = checkFileExists(component.path);
    if (componentExists) {
      const content = readFileContent(component.path);
      const hasKeyboardHook = content.includes("useKeyboardNavigation");
      const hasAriaLabels = content.includes("aria-label");
      const hasRoles = content.includes("role=");

      checks.push({
        name: `${component.name} - Keyboard Hook`,
        passed: hasKeyboardHook,
        details: hasKeyboardHook
          ? "Uses keyboard navigation hook"
          : "Missing keyboard navigation integration",
      });

      checks.push({
        name: `${component.name} - ARIA Labels`,
        passed: hasAriaLabels,
        details: hasAriaLabels ? "Has ARIA labels" : "Missing ARIA labels",
      });

      checks.push({
        name: `${component.name} - Semantic Roles`,
        passed: hasRoles,
        details: hasRoles ? "Has semantic roles" : "Missing semantic roles",
      });
    } else {
      checks.push({
        name: `${component.name} - File Exists`,
        passed: false,
        details: "Component file not found",
      });
    }
  });

  // Check 4: Main App Integration
  const appPath = "app/page.tsx";
  const appExists = checkFileExists(appPath);
  if (appExists) {
    const appContent = readFileContent(appPath);
    const hasProvider = appContent.includes("KeyboardNavigationProvider");
    const hasMainContent = appContent.includes('id="main-content"');

    checks.push({
      name: "App Provider Integration",
      passed: hasProvider,
      details: hasProvider
        ? "KeyboardNavigationProvider integrated"
        : "Missing provider integration",
    });

    checks.push({
      name: "Main Content Landmark",
      passed: hasMainContent,
      details: hasMainContent
        ? "Main content landmark present"
        : "Missing main content landmark",
    });
  }

  // Check 5: Documentation
  const docPath = "KEYBOARD_NAVIGATION.md";
  const docExists = checkFileExists(docPath);
  checks.push({
    name: "Documentation",
    passed: docExists,
    details: docExists
      ? "Keyboard navigation documentation found"
      : "Missing documentation",
  });

  // Check 6: Test Files
  const testPath = "tests/keyboard-navigation.test.tsx";
  const testExists = checkFileExists(testPath);
  checks.push({
    name: "Test Coverage",
    passed: testExists,
    details: testExists
      ? "Keyboard navigation tests found"
      : "Missing test coverage",
  });

  // Display Results
  log("\n📊 Results:\n", "bold");

  let passed = 0;
  let total = checks.length;

  checks.forEach((check) => {
    const status = check.passed ? "✅" : "❌";
    const color = check.passed ? "green" : "red";
    log(`${status} ${check.name}`, color);
    log(`   ${check.details}`, "blue");

    if (check.passed) passed++;
  });

  log(
    `\n📈 Summary: ${passed}/${total} checks passed`,
    passed === total ? "green" : "yellow"
  );

  if (passed === total) {
    log(
      "\n🎉 All keyboard navigation features are properly implemented!",
      "green"
    );
  } else {
    log("\n⚠️  Some keyboard navigation features need attention.", "yellow");
  }

  // Recommendations
  log("\n💡 Recommendations:\n", "bold");

  const failedChecks = checks.filter((check) => !check.passed);
  if (failedChecks.length === 0) {
    log("• Consider adding more comprehensive test coverage", "blue");
    log("• Test with actual screen readers (NVDA, JAWS, VoiceOver)", "blue");
    log("• Validate with keyboard-only users", "blue");
  } else {
    failedChecks.forEach((check) => {
      log(`• Fix: ${check.name} - ${check.details}`, "yellow");
    });
  }

  log("\n🔗 Next Steps:\n", "bold");
  log("1. Run manual keyboard navigation tests", "blue");
  log("2. Test with screen readers", "blue");
  log("3. Validate ARIA compliance with axe-core", "blue");
  log("4. Get feedback from users with disabilities", "blue");

  return passed === total;
}

// Run the verification
const success = checkKeyboardNavigationImplementation();
process.exit(success ? 0 : 1);
