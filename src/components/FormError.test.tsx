import { render, screen } from '@testing-library/react';
import { FormError } from './FormError';
import { describe, it, expect } from 'vitest';

describe('FormError Component', () => {
  it('renders the error message when provided', () => {
    const message = 'Test error message';
    render(<FormError message={message} />);
    
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(message);
    expect(errorElement).toHaveAttribute('aria-live', 'assertive');
  });

  it('does not render when message is null', () => {
    const { container } = render(<FormError message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('applies custom id and className', () => {
    render(<FormError message="Error" id="custom-id" className="custom-class" />);
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('id', 'custom-id');
    expect(errorElement).toHaveClass('custom-class');
  });

  it('is accessible according to role and aria attributes', () => {
    render(<FormError message="Accessible error" />);
    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('aria-atomic', 'true');
  });
});
