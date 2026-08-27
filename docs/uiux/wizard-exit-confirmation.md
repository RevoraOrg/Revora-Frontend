# Wizard Exit Confirmation Modal

## Overview
A confirmation modal appears when users try to navigate away with unsaved changes.

## Usage
Use in wizard steps. Props: isOpen, onSaveAndExit, onDiscard, onStay.

## Accessibility
- WCAG 2.1 AA
- Focus trap with Tab/Shift+Tab
- Escape triggers Stay (safest action)
- aria-modal, aria-labelledby, aria-describedby

## Responsive
Single column on mobile, bottom sheet style.