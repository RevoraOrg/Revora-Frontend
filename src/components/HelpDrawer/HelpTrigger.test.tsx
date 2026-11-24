import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { HelpTrigger } from './HelpTrigger';

describe('HelpTrigger', () => {
  it('renders a button with default aria-label and dialog popup attribute', () => {
    render(<HelpTrigger />);
    const button = screen.getByRole('button', { name: 'Open contextual help' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveClass('hd-trigger');
  });

  it('uses a custom aria-label when label prop is provided', () => {
    render(<HelpTrigger label="Open KYC help" />);
    const button = screen.getByRole('button', { name: 'Open KYC help' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Open KYC help');
  });

  it('forwards ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<HelpTrigger ref={ref} />);

    const button = screen.getByRole('button', { name: 'Open contextual help' });
    expect(ref.current).toBe(button);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);

    ref.current?.focus();
    expect(button).toHaveFocus();
  });

  it('forwards callback refs to the underlying button element', () => {
    const refCallback = vi.fn();
    render(<HelpTrigger ref={refCallback} />);

    const button = screen.getByRole('button', { name: 'Open contextual help' });
    expect(refCallback).toHaveBeenCalledWith(button);
  });

  it('fires onClick and merges custom className while keeping hd-trigger', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <HelpTrigger
        onClick={onClick}
        className="custom-trigger"
        data-testid="help-trigger"
      />,
    );

    const button = screen.getByTestId('help-trigger');
    expect(button).toHaveClass('hd-trigger');
    expect(button).toHaveClass('custom-trigger');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards additional button attributes such as disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<HelpTrigger onClick={onClick} disabled />);
    const button = screen.getByRole('button', { name: 'Open contextual help' });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has no accessibility violations (jest-axe)', async () => {
    const { container } = render(<HelpTrigger />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
