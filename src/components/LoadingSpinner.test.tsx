import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders a visible loader with the default accessibility semantics', () => {
        render(<LoadingSpinner />);

        const spinner = screen.getByRole('img', { name: 'Loading' });

        expect(spinner).toHaveClass('animate-spin-loader');
        expect(spinner).toHaveAttribute('role', 'img');
        expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('accepts LoadingSpinnerProps for label, size, and custom className forwarding', () => {
        render(
            <LoadingSpinner
                data-testid="spinner"
                label="Saving changes"
                size={24}
                className="custom-spinner"
            />,
        );

        const spinner = screen.getByTestId('spinner');

        expect(spinner).toHaveClass('animate-spin-loader', 'custom-spinner');
        expect(spinner).toHaveAttribute('aria-label', 'Saving changes');
        expect(spinner).toHaveAttribute('width', '24');
        expect(spinner).toHaveAttribute('height', '24');
    });

    it('hides the spinner from assistive technology when aria-hidden is true', () => {
        render(<LoadingSpinner aria-hidden label="Loading" />);

        const spinner = document.querySelector('.animate-spin-loader');

        expect(spinner).toHaveAttribute('aria-hidden', 'true');
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    it('keeps the spinner visible for non-true aria-hidden values', () => {
        render(<LoadingSpinner aria-hidden="false" label="Processing" />);

        expect(screen.getByRole('img', { name: 'Processing' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Processing' })).not.toHaveAttribute('aria-hidden');
    });

    it('provides deterministic visible and hidden transitions when aria-hidden toggles', () => {
        const { rerender } = render(<LoadingSpinner aria-hidden={false} label="Loading data" />);

        expect(screen.getByRole('img', { name: 'Loading data' })).toBeInTheDocument();

        rerender(<LoadingSpinner aria-hidden label="Loading data" />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
        expect(document.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

        rerender(<LoadingSpinner aria-hidden={false} label="Loading data" />);

        expect(screen.getByRole('img', { name: 'Loading data' })).toBeInTheDocument();
    });
});
