# Keyboard Navigation Guide

## Overview

The Student Management System provides comprehensive keyboard navigation support to ensure accessibility for all users. This document outlines the keyboard shortcuts, navigation patterns, and accessibility features implemented throughout the application.

## Global Keyboard Navigation

### Skip Links

- **Skip to Main Content**: Available at the top of the page for screen reader users
- **Skip to Navigation**: Quick access to the sidebar navigation
- **Skip to QR Scanner**: Direct access to the QR scanning functionality

### Focus Management

- **Visual Focus Indicators**: Clear blue outline around focused elements
- **Focus Trapping**: Modal dialogs trap focus within their boundaries
- **Focus Restoration**: Focus returns to the triggering element when modals close

## Component-Specific Navigation

### QR Scanner

| Key      | Action                                      |
| -------- | ------------------------------------------- |
| `Tab`    | Navigate to QR scanner input (auto-focused) |
| `Enter`  | Submit scanned/entered student ID           |
| `Escape` | Clear input field                           |

**Features:**

- Input field maintains focus automatically
- Real-time feedback with screen reader announcements
- Error messages announced via `aria-live` regions

### Student Grid (Table)

| Key                | Action                                      |
| ------------------ | ------------------------------------------- |
| `Tab`              | Navigate between search, filters, and table |
| `↑/↓ Arrow Keys`   | Navigate between table rows                 |
| `Enter` or `Space` | Edit selected student                       |
| `Escape`           | Clear row selection                         |

**Features:**

- Visual row highlighting for selected items
- Proper table semantics with `role` attributes
- Column headers properly associated with data cells
- Search and filter controls accessible via keyboard

### Student Form (Modal)

| Key           | Action                                 |
| ------------- | -------------------------------------- |
| `Tab`         | Navigate between form fields           |
| `Shift + Tab` | Navigate backwards through form fields |
| `Enter`       | Submit form (when on submit button)    |
| `Escape`      | Close modal and return focus           |

**Features:**

- Focus trapped within modal
- First field (Name) receives initial focus
- Form validation errors announced to screen readers
- Required fields properly marked with `aria-required`

### Sidebar Navigation

| Key                | Action                      |
| ------------------ | --------------------------- |
| `Tab`              | Navigate between menu items |
| `↑/↓ Arrow Keys`   | Navigate between menu items |
| `Enter` or `Space` | Activate selected menu item |
| `Home`             | Jump to first menu item     |
| `End`              | Jump to last menu item      |

**Features:**

- Current page indicated with `aria-current="page"`
- Menu items have proper `role="menuitem"` attributes
- Badge counts announced to screen readers

## Accessibility Features

### Screen Reader Support

- **ARIA Labels**: All interactive elements have descriptive labels
- **ARIA Descriptions**: Complex controls have additional context
- **Live Regions**: Status updates announced automatically
- **Semantic HTML**: Proper heading structure and landmarks

### Visual Accessibility

- **High Contrast Support**: Enhanced focus indicators in high contrast mode
- **Reduced Motion**: Respects `prefers-reduced-motion` setting
- **Focus Indicators**: 2px blue outline with background highlight
- **Color Independence**: Information not conveyed by color alone

### Keyboard User Detection

- **Automatic Detection**: System detects keyboard vs. mouse usage
- **Enhanced Focus**: Additional visual cues for keyboard users
- **Context-Aware**: Different behaviors for keyboard and mouse users

## Implementation Details

### Custom Hooks

#### `useKeyboardNavigation`

Provides keyboard navigation functionality for components:

```typescript
const { containerRef } = useKeyboardNavigation({
  autoFocus: true,
  trapFocus: true,
  enableArrowKeys: true,
  onEnter: (event) => {
    /* handle enter */
  },
  onEscape: (event) => {
    /* handle escape */
  },
});
```

#### `useFocusIndicator`

Manages visual focus indicators:

```typescript
const { indicatorRef, showFocusIndicator, hideFocusIndicator } =
  useFocusIndicator();
```

### Provider Components

#### `KeyboardNavigationProvider`

Global provider that:

- Detects keyboard usage patterns
- Manages focus indicators
- Provides skip links
- Applies global keyboard styles

## Testing

### Automated Tests

- **Unit Tests**: Component-level keyboard interaction tests
- **Integration Tests**: Cross-component navigation flows
- **Accessibility Tests**: ARIA compliance and screen reader compatibility

### Manual Testing Checklist

#### Basic Navigation

- [ ] Tab through all interactive elements
- [ ] All elements receive visible focus
- [ ] Tab order is logical and intuitive
- [ ] No keyboard traps (except intentional modal traps)

#### Component-Specific Tests

- [ ] QR Scanner maintains focus and handles Enter/Escape
- [ ] Student Grid supports arrow navigation and selection
- [ ] Student Form traps focus and validates properly
- [ ] Sidebar navigation works with arrows and Enter

#### Screen Reader Tests

- [ ] All content announced properly
- [ ] Form errors read aloud
- [ ] Status updates announced
- [ ] Table structure navigable

## Browser Support

### Tested Browsers

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

### Screen Readers

- **NVDA**: Full compatibility
- **JAWS**: Full compatibility
- **VoiceOver**: Full compatibility
- **TalkBack**: Mobile support

## Troubleshooting

### Common Issues

#### Focus Not Visible

- Check if `keyboard-user` class is applied to body
- Verify focus indicator styles are loaded
- Ensure element is not hidden or disabled

#### Tab Order Problems

- Review HTML structure and tabindex values
- Check for CSS that might affect focus
- Verify no elements have `tabindex="-1"` unintentionally

#### Screen Reader Issues

- Validate ARIA attributes are correct
- Check for missing labels or descriptions
- Ensure live regions are properly configured

## Best Practices

### Development Guidelines

1. **Test Early**: Test keyboard navigation during development
2. **Use Semantic HTML**: Proper elements provide built-in accessibility
3. **Provide Labels**: All interactive elements need accessible names
4. **Manage Focus**: Explicitly handle focus for dynamic content
5. **Test with Users**: Include users with disabilities in testing

### Design Guidelines

1. **Visible Focus**: Ensure focus indicators are clearly visible
2. **Logical Order**: Tab order should match visual layout
3. **Consistent Patterns**: Use consistent navigation patterns
4. **Clear Instructions**: Provide keyboard shortcut documentation
