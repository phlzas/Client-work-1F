#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const withCoverage = args.includes("--coverage");

console.log("🚀 Running comprehensive frontend test suite...\n");

const testSuites = [
  {
    name: "Unit Tests (Components)",
    command: "jest --testPathPattern=tests/components",
    description: "Testing React components in isolation",
  },
  {
    name: "Unit Tests (Hooks)",
    command: "jest --testPathPattern=tests/hooks",
    description: "Testing custom React hooks",
  },
  {
    name: "Integration Tests",
    command: "jest --testPathPattern=tests/integration",
    description: "Testing component interactions and workflows",
  },
  {
    name: "Utility Tests",
    command: "jest --testPathPattern=tests/utils",
    description: "Testing utility functions and helpers",
  },
  {
    name: "Accessibility Tests",
    command: "jest --testPathPattern=accessibility.test.tsx",
    description: "Testing accessibility compliance",
  },
  {
    name: "Keyboard Navigation Tests",
    command: "jest --testPathPattern=keyboard-navigation.test.tsx",
    description: "Testing keyboard navigation functionality",
  },
];

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of testSuites) {
  console.log(`\n📋 ${suite.name}`);
  console.log(`   ${suite.description}`);
  console.log("   " + "─".repeat(50));

  try {
    const command = withCoverage
      ? `${suite.command} --coverage --watchAll=false`
      : `${suite.command} --watchAll=false`;

    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log(`   ✅ ${suite.name} passed`);
    results.push({ name: suite.name, status: "passed" });
    totalPassed++;
  } catch (error) {
    console.log(`   ❌ ${suite.name} failed`);
    results.push({ name: suite.name, status: "failed", error: error.message });
    totalFailed++;
  }
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUITE SUMMARY");
console.log("=".repeat(60));

results.forEach((result) => {
  const icon = result.status === "passed" ? "✅" : "❌";
  console.log(`${icon} ${result.name}: ${result.status.toUpperCase()}`);
});

console.log("\n📈 OVERALL RESULTS:");
console.log(`   Total Suites: ${testSuites.length}`);
console.log(`   Passed: ${totalPassed}`);
console.log(`   Failed: ${totalFailed}`);
console.log(
  `   Success Rate: ${Math.round((totalPassed / testSuites.length) * 100)}%`
);

if (withCoverage) {
  console.log("\n📊 Coverage reports generated in ./coverage directory");
}

console.log("\n🎯 NEXT STEPS:");
if (totalFailed > 0) {
  console.log("   • Fix failing tests before deployment");
  console.log("   • Review error messages above");
  console.log("   • Run individual test suites for debugging");
} else {
  console.log("   • All tests passing! ✨");
  console.log("   • Ready for deployment");
  console.log("   • Consider adding more edge case tests");
}

console.log("\n🔧 USEFUL COMMANDS:");
console.log("   npm run test:watch          # Run tests in watch mode");
console.log("   npm run test:coverage       # Run with coverage report");
console.log("   npm run test:components     # Run only component tests");
console.log("   npm run test:integration    # Run only integration tests");
console.log("   npm run test:accessibility  # Run accessibility tests");

// Exit with error code if any tests failed
if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("\n🎉 All tests completed successfully!");
  process.exit(0);
}
