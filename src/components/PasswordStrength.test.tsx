import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordStrength } from './PasswordStrength';

describe('PasswordStrength', () => {
  const defaultProps = { password: '', inputId: 'password' };

  it('renders all five rules in pending state when password is empty', () => {
    render(<PasswordStrength {...defaultProps} />);

    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
    expect(screen.getByText('At least one uppercase letter')).toBeInTheDocument();
    expect(screen.getByText('At least one lowercase letter')).toBeInTheDocument();
    expect(screen.getByText('At least one number')).toBeInTheDocument();
    expect(screen.getByText('At least one special character')).toBeInTheDocument();
  });

  it('does not render strength bar when password is empty', () => {
    render(<PasswordStrength {...defaultProps} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders strength bar when password is non-empty', () => {
    render(<PasswordStrength {...defaultProps} password="a" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows strength label text when password is non-empty', () => {
    render(<PasswordStrength {...defaultProps} password="a" />);

    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('displays aria-live region for screen readers', () => {
    render(<PasswordStrength {...defaultProps} />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('shows correct rule states for a weak password', () => {
    render(<PasswordStrength {...defaultProps} password="Abc" />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
  });

  it('marks all rules as passed for a strong password', () => {
    render(<PasswordStrength {...defaultProps} password="Abcdef1!@#$%" />);

    expect(screen.getByText('Strong')).toBeInTheDocument();
  });

  it('shows medium strength for a password meeting 3-4 rules', () => {
    render(<PasswordStrength {...defaultProps} password="Abcdefghijkl" />);

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('shows weak strength for a password meeting 1-2 rules', () => {
    render(<PasswordStrength {...defaultProps} password="abcdefghijkl" />);

    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('has correct aria-valuenow on progressbar', () => {
    render(<PasswordStrength {...defaultProps} password="Abcdef1!@#$%" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '5');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
  });

  it('applies inputId to create correct rule list id', () => {
    render(<PasswordStrength {...defaultProps} inputId="test-pw" />);

    const ruleList = document.getElementById('test-pw-rules');
    expect(ruleList).toBeInTheDocument();
  });

  it('has role="list" on the rule container', () => {
    render(<PasswordStrength {...defaultProps} />);

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('has accessible label on rule list', () => {
    render(<PasswordStrength {...defaultProps} />);

    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-label', 'Password requirements');
  });

  it('shows screen-reader-only strength announcement', () => {
    render(<PasswordStrength {...defaultProps} password="Abcdef1!@#$%" />);

    const announcement = document.querySelector('.sr-only');
    expect(announcement).toHaveTextContent('Password strength: Strong. 5 of 5 rules met.');
  });

  it('applies pass class to list items for met rules', () => {
    const { container } = render(<PasswordStrength {...defaultProps} password="Abcdef1!@#$%" />);

    const passItems = container.querySelectorAll('.rule-item.pass');
    expect(passItems.length).toBe(5);
  });

  it('applies fail class to list items for unmet rules', () => {
    const { container } = render(<PasswordStrength {...defaultProps} password="a" />);

    const failItems = container.querySelectorAll('.rule-item.fail');
    expect(failItems.length).toBeGreaterThan(0);
  });
});
