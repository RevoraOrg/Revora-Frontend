import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PermissionMatrixDiffModal } from './PermissionMatrixDiffModal';
import type { PermissionDiff } from './PermissionMatrix.types';

describe('PermissionMatrixDiffModal', () => {
    const mockDiffs: PermissionDiff[] = [
        {
            roleId: 'r1',
            roleName: 'Admin',
            issuerId: 'i1',
            issuerName: 'System',
            from: 'inherit',
            to: 'allow',
        },
    ];

    const defaultProps = {
        isOpen: true,
        diffs: mockDiffs,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it('returns null and does not render when isOpen is false (failure/empty-result path)', () => {
        const { container } = render(<PermissionMatrixDiffModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the modal with diffs when isOpen is true (success path)', () => {
        render(<PermissionMatrixDiffModal {...defaultProps} />);
        
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Review permission changes')).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('renders a no-changes message when diffs is empty (boundary input)', () => {
        render(<PermissionMatrixDiffModal {...defaultProps} diffs={[]} />);
        
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        expect(screen.getByText('No permission changes to save.')).toBeInTheDocument();
        
        // Confirm button should be disabled when no diffs
        const confirmButton = screen.getByTestId('pm-diff-confirm');
        expect(confirmButton).toBeDisabled();
    });
    
    it('calls onCancel when cancel button is clicked', () => {
        const onCancel = vi.fn();
        render(<PermissionMatrixDiffModal {...defaultProps} onCancel={onCancel} />);
        
        fireEvent.click(screen.getByTestId('pm-diff-cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when save button is clicked', () => {
        const onConfirm = vi.fn();
        render(<PermissionMatrixDiffModal {...defaultProps} onConfirm={onConfirm} />);
        
        fireEvent.click(screen.getByTestId('pm-diff-confirm'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    
    it('disables save button when isSaving is true', () => {
        render(<PermissionMatrixDiffModal {...defaultProps} isSaving={true} />);
        
        const confirmButton = screen.getByTestId('pm-diff-confirm');
        expect(confirmButton).toBeDisabled();
        expect(screen.getByText('Saving…')).toBeInTheDocument();
    });
});
