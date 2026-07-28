import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Sign In</Button>);

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('renders as primary variant by default', () => {
    const { container } = render(<Button>Submit</Button>);

    expect(container.querySelector('.btn-primary')).toBeInTheDocument();
  });

  it('renders as secondary variant when specified', () => {
    const { container } = render(<Button variant="secondary">Cancel</Button>);

    expect(container.querySelector('.btn-secondary')).toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    const { container } = render(<Button loading>Submit</Button>);

    expect(container.querySelector('.btn-spinner')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('adds btn-loading class when loading', () => {
    const { container } = render(<Button loading>Submit</Button>);

    expect(container.querySelector('.btn-loading')).toBeInTheDocument();
  });

  it('sets aria-busy when loading', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('does not set aria-busy when not loading', () => {
    render(<Button>Submit</Button>);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });

  it('shows check icon when success', () => {
    const { container } = render(<Button success>Done</Button>);

    expect(container.querySelector('.btn-check-icon')).toBeInTheDocument();
  });

  it('adds btn-success class when success', () => {
    const { container } = render(<Button success>Done</Button>);

    expect(container.querySelector('.btn-success')).toBeInTheDocument();
  });

  it('disables button when loading', () => {
    render(<Button loading>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when success', () => {
    render(<Button success>Done</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('adds btn-disabled class when disabled', () => {
    const { container } = render(<Button disabled>Submit</Button>);

    expect(container.querySelector('.btn-disabled')).toBeInTheDocument();
  });

  it('sets aria-disabled when disabled', () => {
    render(<Button disabled>Submit</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not set aria-disabled when loading', () => {
    render(<Button loading>Submit</Button>);

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-disabled');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click Me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button disabled onClick={handleClick}>Click Me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button loading onClick={handleClick}>Click Me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLButtonElement | null };

    render(<Button ref={ref}>Ref Test</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('passes through additional HTML attributes', () => {
    render(<Button data-testid="test-btn" type="submit">Submit</Button>);

    expect(screen.getByTestId('test-btn')).toHaveAttribute('type', 'submit');
  });
});
