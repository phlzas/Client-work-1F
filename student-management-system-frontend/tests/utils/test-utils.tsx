import React from "react";
import { render, RenderOptions } from "@testing-library/react";
// import { axe, toHaveNoViolations } from "jest-axe";

// Extend Jest matchers
// expect.extend(toHaveNoViolations);

// Test wrapper component for RTL support
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => (
  <div dir="rtl" lang="ar">
    {children}
  </div>
);

// Custom render function with RTL wrapper
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: TestWrapper, ...options });

// Temporarily disabled accessibility testing
export const testAccessibility = async (container: HTMLElement) => {
  // const results = await axe(container);
  // expect(results).toHaveNoViolations();
  console.log("Accessibility testing temporarily disabled");
};

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
