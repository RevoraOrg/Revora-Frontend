import { render, screen } from '@testing-library/react';
import { ProgressBar, ProgressBarProps } from './ProgressBar';

/**
 * Focused behaviour coverage for ProgressBar / ProgressBarProps.
 *
 * The component is presentation-only but has three behaviours worth pinning:
 *  - the determinate value is clamped to [0, 100] and reflected in aria-valuenow;
 *  - omitting `value` switches to an indeterminate track (no aria-valuenow);
 *  - the optional visible label is hidden while indeterminate.
 */
describe('ProgressBar', () => {
  const renderBar = (props: ProgressBarProps = {}) => render(<ProgressBar {...props} />);

  it('exposes the accessible progressbar role with default name and range', () => {
    renderBar({ value: 50 });

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Loading progress');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders a determinate fill at the given percentage', () => {
    const { container } = renderBar({ value: 42 });

    const fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill).toBeInTheDocument();
    expect(fill).toHaveStyle({ width: '42%' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    expect(container.querySelector('.progress-bar-indeterminate')).not.toBeInTheDocument();
  });

  it('clamps values below 0 to 0', () => {
    const { container } = renderBar({ value: -10 });

    const fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill).toHaveStyle({ width: '0%' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('clamps values above 100 to 100', () => {
    const { container } = renderBar({ value: 150 });

    const fill = container.querySelector('.progress-bar-fill') as HTMLElement;
    expect(fill).toHaveStyle({ width: '100%' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('accepts the exact boundary values 0 and 100', () => {
    const { container, unmount } = renderBar({ value: 0 });
    expect((container.querySelector('.progress-bar-fill') as HTMLElement)).toHaveStyle({ width: '0%' });
    unmount();

    const second = renderBar({ value: 100 });
    expect((second.container.querySelector('.progress-bar-fill') as HTMLElement)).toHaveStyle({ width: '100%' });
  });

  it('switches to indeterminate and omits aria-valuenow when value is omitted', () => {
    const { container } = renderBar();

    expect(container.querySelector('.progress-bar-indeterminate')).toBeInTheDocument();
    expect(container.querySelector('.progress-bar-fill')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('uses a custom accessible label', () => {
    renderBar({ value: 10, label: 'Upload progress' });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Upload progress');
  });

  it('hides the visible label text by default', () => {
    const { container } = renderBar({ value: 25, label: 'Upload progress' });

    expect(container.querySelector('.progress-bar-label-text')).not.toBeInTheDocument();
  });

  it('shows the label text, an aria-hidden rounded percentage and the label when requested', () => {
    const { container } = renderBar({ value: 42.6, label: 'Upload progress', showLabelText: true });

    const labelText = container.querySelector('.progress-bar-label-text') as HTMLElement;
    expect(labelText).toBeInTheDocument();
    expect(labelText).toHaveTextContent('Upload progress');
    expect(labelText).toHaveTextContent('43%');
    expect(screen.getByText('43%')).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not show the label text while indeterminate even when showLabelText is set', () => {
    const { container } = renderBar({ label: 'Upload progress', showLabelText: true });

    expect(container.querySelector('.progress-bar-label-text')).not.toBeInTheDocument();
  });

  it('applies a custom className to the wrapper', () => {
    const { container } = renderBar({ value: 30, className: 'my-progress' });

    expect(container.querySelector('.progress-bar-wrapper.my-progress')).toBeInTheDocument();
  });

  it('sets a displayName for debugging', () => {
    expect(ProgressBar.displayName).toBe('ProgressBar');
  });
});
