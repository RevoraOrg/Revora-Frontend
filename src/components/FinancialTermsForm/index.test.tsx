import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinancialTermsForm } from './index';
import type { FinancialTermsFormProps } from './index';
import { FinancialTermsForm as OriginalComponent } from './FinancialTermsForm';
import '@testing-library/jest-dom';

describe('FinancialTermsForm/index', () => {
  it('exports FinancialTermsForm component', () => {
    expect(FinancialTermsForm).toBeDefined();
    expect(FinancialTermsForm).toBe(OriginalComponent);
    expect(typeof FinancialTermsForm).toBe('function');
  });

  it('renders correctly and handles state transitions for invalid inputs', async () => {
    const mockProps: FinancialTermsFormProps = {};
    const user = userEvent.setup();
    render(<FinancialTermsForm {...mockProps} />);
    
    // Validate success path (initial render)
    expect(screen.getByText('Financial terms')).toBeInTheDocument();
    
    // Trigger invalid input state transition (touch and leave empty)
    const input = screen.getByTestId('ftf-input-revenueShareRate');
    await user.click(input);
    await user.tab();
    
    // Validate error boundary behavior is observable
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.className).toContain('ftf__input--error');
  });
});
