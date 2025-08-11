# Frontend Testing Documentation

This directory contains comprehensive unit and integration tests for the Student Management System frontend.

## Test Structure

```
tests/
├── components/           # Component unit tests
│   ├── qr-scanner.test.tsx
│   ├── student-grid.test.tsx
│   └── student-form.test.tsx
├── hooks/               # Custom hook tests
│   ├── useGroups.test.ts
│   └── useKeyboardNavigation.test.ts
├── integration/         # Integration tests
│   ├── student-management.test.tsx
│   └── student-workflow.test.tsx
├── utils/              # Utility function tests
│   ├── data-transform.test.ts
│   └── accessibility.test.ts
├── accessibility.test.tsx    # Accessibility compliance tests
├── keyboard-navigation.test.tsx  # Keyboard navigation tests
├── setup.ts            # Test setup and utilities
├── test-runner.js      # Comprehensive test runner
└── README.md          # This file
```

## Test Categories

### 1. Component Tests (`tests/components/`)

- **QR Scanner**: Input handling, keyboard events, result display
- **Student Grid**: Data display, filtering, sorting, keyboard navigation
- **Student Form**: Form validation, submission, accessibility

### 2. Hook Tests (`tests/hooks/`)

- **useGroups**: Data fetching, error handling, loading states
- **useKeyboardNavigation**: Focus management, keyboard event handling

### 3. Integration Tests (`tests/integration/`)

- **Student Workflow**: End-to-end user workflows
- **Component Interactions**: How components work together

### 4. Utility Tests (`tests/utils/`)

- **Data Transform**: Data formatting, validation, transformation
- **Accessibility**: ARIA labels, focus management utilities

### 5. Accessibility Tests

- **ARIA Compliance**: Screen reader support, semantic markup
- **Keyboard Navigation**: Tab order, focus trapping, keyboard shortcuts
- **High Contrast**: Visual accessibility features

## Running Tests

### Individual Test Suites

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:components     # Component tests only
npm run test:hooks         # Hook tests only
npm run test:integration   # Integration tests only
npm run test:utils         # Utility tests only
npm run test:accessibility # Accessibility tests only

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Comprehensive Test Runner

```bash
# Run all test suites with summary
npm run test:all

# Run all tests with coverage
npm run test:all:coverage
```

## Test Utilities

### Global Test Utilities (`tests/setup.ts`)

- `testUtils.createMockStudent()` - Create mock student data
- `testUtils.createMockSettings()` - Create mock app settings
- `testUtils.waitForLoadingToFinish()` - Wait for async operations

### Custom Matchers

- `toBeAccessible()` - Check if element has proper accessibility attributes

## Mocking Strategy

### Tauri API

```javascript
jest.mock("@tauri-apps/api/tauri", () => ({
  invoke: jest.fn(),
}));
```

### Next.js Router

```javascript
jest.mock("next/router", () => ({
  useRouter: () => ({ push: jest.fn(), ... }),
}));
```

### Custom Hooks

```javascript
jest.mock("@/hooks/useGroups", () => ({
  useGroups: () => ({ groups: [], loading: false, error: null }),
}));
```

## Coverage Thresholds

The project maintains the following coverage thresholds:

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

## Accessibility Testing

### Automated Testing

- Uses `jest-axe` for automated accessibility testing
- Tests ARIA attributes, semantic markup, and color contrast
- Validates keyboard navigation and focus management

### Manual Testing Checklist

- [ ] Screen reader compatibility (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation
- [ ] High contrast mode
- [ ] RTL (Right-to-Left) text support
- [ ] Focus indicators visibility

## Best Practices

### Test Organization

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Keep tests isolated

### Accessibility Testing

1. **Test with Real Users**: Include users with disabilities in testing
2. **Automated + Manual**: Combine automated tools with manual testing
3. **Multiple Screen Readers**: Test with different assistive technologies
4. **Keyboard Navigation**: Ensure all functionality is keyboard accessible

### Performance Considerations

1. **Cleanup**: Always clean up after tests
2. **Efficient Mocking**: Mock only what's necessary
3. **Parallel Execution**: Tests should be independent and parallelizable

## Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor()` for async assertions
2. **DOM Cleanup**: Ensure proper cleanup between tests
3. **Mock Persistence**: Clear mocks between tests
4. **Focus Management**: Reset focus state between tests

### Debugging Commands

```bash
# Run specific test file
npm test -- qr-scanner.test.tsx

# Run tests with verbose output
npm test -- --verbose

# Run tests in debug mode
npm test -- --detectOpenHandles --forceExit
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Include both positive and negative test cases
3. Test accessibility features
4. Add integration tests for complex workflows
5. Update this documentation if needed

## Resources

- [Testing Library Documentation](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [jest-axe Documentation](https://github.com/nickcolley/jest-axe)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
