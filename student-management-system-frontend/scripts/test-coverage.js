#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🧪 Running comprehensive test suite with coverage...\n");

try {
  // Run Jest with coverage
  console.log("📊 Running unit and integration tests...");
  execSync("npm run test -- --coverage --watchAll=false", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  // Check if coverage directory exists
  const coverageDir = path.join(process.cwd(), "coverage");
  if (fs.existsSync(coverageDir)) {
    console.log("\n✅ Test coverage report generated successfully!");
    console.log(
      `📁 Coverage report available at: ${coverageDir}/lcov-report/index.html`
    );

    // Read coverage summary if available
    const coverageSummaryPath = path.join(coverageDir, "coverage-summary.json");
    if (fs.existsSync(coverageSummaryPath)) {
      const coverageSummary = JSON.parse(
        fs.readFileSync(coverageSummaryPath, "utf8")
      );
      const total = coverageSummary.total;

      console.log("\n📈 Coverage Summary:");
      console.log(`   Lines: ${total.lines.pct}%`);
      console.log(`   Functions: ${total.functions.pct}%`);
      console.log(`   Branches: ${total.branches.pct}%`);
      console.log(`   Statements: ${total.statements.pct}%`);

      // Check if coverage meets thresholds
      const thresholds = {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      };

      let allThresholdsMet = true;
      Object.keys(thresholds).forEach((key) => {
        if (total[key].pct < thresholds[key]) {
          console.log(
            `⚠️  ${key} coverage (${total[key].pct}%) is below threshold (${thresholds[key]}%)`
          );
          allThresholdsMet = false;
        }
      });

      if (allThresholdsMet) {
        console.log("\n🎉 All coverage thresholds met!");
      } else {
        console.log(
          "\n⚠️  Some coverage thresholds not met. Consider adding more tests."
        );
      }
    }
  }

  console.log("\n🎯 Test recommendations:");
  console.log("   • Add more edge case tests for better branch coverage");
  console.log("   • Test error handling scenarios");
  console.log("   • Add integration tests for complex workflows");
  console.log("   • Test accessibility features thoroughly");
} catch (error) {
  console.error("❌ Test execution failed:", error.message);
  process.exit(1);
}
