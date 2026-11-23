import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders one rectangular placeholder by default without a wrapper', () => {
    const { container } = render(<Skeleton />);

    expect(container.children).toHaveLength(1);
    expect(container.firstElementChild?.tagName).toBe('SPAN');
    expect(container.firstElementChild).toHaveClass('skeleton', 'skeleton-rect');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('style');
  });

  it.each(['text', 'title', 'avatar', 'rect'] as const)(
    'renders the %s variant as a single hidden element when count is 1',
    (variant) => {
      const { container } = render(<Skeleton variant={variant} count={1} />);
      const placeholder = container.firstElementChild;

      expect(container.children).toHaveLength(1);
      expect(placeholder?.tagName).toBe('SPAN');
      expect(placeholder).toHaveClass('skeleton', `skeleton-${variant}`);
      expect(placeholder).not.toHaveClass('skeleton-text-short');
      expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('converts numeric width and height to pixels', () => {
    const { container } = render(<Skeleton width={120} height={24} />);

    expect(container.firstElementChild).toHaveStyle({ width: '120px', height: '24px' });
  });

  it('preserves string width and height units', () => {
    const { container } = render(<Skeleton width="75%" height="2rem" />);

    expect(container.firstElementChild).toHaveStyle({ width: '75%', height: '2rem' });
  });

  it('preserves zero dimensions', () => {
    const { container } = render(<Skeleton width={0} height={0} />);

    expect(container.firstElementChild).toHaveStyle({ width: '0px', height: '0px' });
  });

  it('wraps three text lines and shortens only the last line', () => {
    const { container } = render(<Skeleton variant="text" count={3} />);
    const wrapper = container.firstElementChild;

    expect(container.children).toHaveLength(1);
    expect(wrapper?.tagName).toBe('DIV');
    expect(wrapper?.children).toHaveLength(3);
    const lines = Array.from(wrapper!.children);
    lines.forEach((line) => {
      expect(line.tagName).toBe('SPAN');
      expect(line).toHaveClass('skeleton', 'skeleton-text');
      expect(line).toHaveAttribute('aria-hidden', 'true');
    });
    expect(lines[0]).not.toHaveClass('skeleton-text-short');
    expect(lines[1]).not.toHaveClass('skeleton-text-short');
    expect(lines[2]).toHaveClass('skeleton-text-short');
  });

  it.each(['title', 'avatar', 'rect'] as const)(
    'does not shorten repeated %s placeholders',
    (variant) => {
      const { container } = render(<Skeleton variant={variant} count={3} />);
      const placeholders = container.firstElementChild!.children;

      expect(placeholders).toHaveLength(3);
      Array.from(placeholders).forEach((placeholder) => {
        expect(placeholder).toHaveClass('skeleton', `skeleton-${variant}`);
        expect(placeholder).not.toHaveClass('skeleton-text-short');
        expect(placeholder).toHaveAttribute('aria-hidden', 'true');
      });
    },
  );

  it('applies dimensions and custom classes to every repeated placeholder', () => {
    const { container } = render(
      <Skeleton variant="text" count={3} width="80%" height={16} className="custom-placeholder" />,
    );
    const placeholders = container.firstElementChild!.children;

    expect(placeholders).toHaveLength(3);
    Array.from(placeholders).forEach((placeholder) => {
      expect(placeholder).toHaveClass('custom-placeholder');
      expect(placeholder).toHaveStyle({ width: '80%', height: '16px' });
    });
  });
});
