import { render, screen } from '@testing-library/react';

import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('renders a polite status region with the default label', () => {
    render(<PageLoader />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toContainElement(screen.getByRole('img', { name: 'Loading application...' }));
    expect(screen.getByText('Loading application...')).toBeInTheDocument();
  });

  it('appends a caller className to the overlay without dropping the base class', () => {
    const { container } = render(<PageLoader className="fixed inset-0 z-50" />);

    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay).toHaveClass('page-loader-overlay');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
  });

  it('forwards a custom label to both the spinner and the visible text', () => {
    const { container } = render(<PageLoader label="Loading dashboard..." />);

    expect(screen.getByRole('img', { name: 'Loading dashboard...' })).toBeInTheDocument();
    expect(container.querySelector('.page-loader-text')).toHaveTextContent('Loading dashboard...');
  });

  it('keeps the accessible spinner label when the visible text is hidden', () => {
    render(<PageLoader label="Fetching revenue" showText={false} />);

    expect(screen.queryByText('Fetching revenue')).not.toBeInTheDocument();
    // Screen readers must still announce progress even when no text is painted.
    expect(screen.getByRole('img', { name: 'Fetching revenue' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the overlay text by default (showText defaults to true)', () => {
    const { container } = render(<PageLoader label="Default text" />);

    expect(container.querySelector('.page-loader-text')).not.toBeNull();
  });

  it('pins the spinner geometry used for the full-page overlay', () => {
    const { container } = render(<PageLoader />);

    const spinner = container.querySelector('.animate-spin-loader');
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute('width', '40');
    expect(spinner).toHaveAttribute('height', '40');
  });

  it('keeps a boundary empty label renderable and deterministic', () => {
    const { container } = render(<PageLoader label="" />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');

    const text = container.querySelector('.page-loader-text');
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('');

    // The spinner element still renders; it simply has no accessible name.
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });

  it('renders markup-shaped labels as text rather than injecting HTML', () => {
    const { container } = render(<PageLoader label="<b>Bold</b> & <script>alert(1)</script>" />);

    expect(screen.getByText('<b>Bold</b> & <script>alert(1)</script>')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('exposes a stable displayName for devtools and snapshot review', () => {
    expect(PageLoader.displayName).toBe('PageLoader');
  });
});
