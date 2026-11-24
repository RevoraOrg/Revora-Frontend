import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DelegateProfileCard, DelegateData } from './DelegateProfileCard';

const mockDelegate: DelegateData = {
  id: 'del-1',
  name: 'Alice Voter',
  address: '0x1234...5678',
  participationRate: 98,
  voteAlignment: 92,
  totalDelegated: 1250000,
};

describe('DelegateProfileCard', () => {
  it('renders delegate identity, metrics, and formatted totalDelegated', () => {
    render(
      <DelegateProfileCard
        delegate={mockDelegate}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('delegate-card-del-1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alice Voter' })).toBeInTheDocument();
    expect(screen.getByText('0x1234...5678')).toBeInTheDocument();

    expect(screen.getByText('Participation Rate')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();

    expect(screen.getByText('Vote Alignment')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();

    expect(screen.getByText('Total Delegated')).toBeInTheDocument();
    expect(
      screen.getByText(`${mockDelegate.totalDelegated.toLocaleString()} VP`)
    ).toBeInTheDocument();
  });

  it('renders the delegate button with accessible name and fires onDelegateClick when not delegated', async () => {
    const onDelegateClick = vi.fn();
    const onRevokeClick = vi.fn();

    render(
      <DelegateProfileCard
        delegate={mockDelegate}
        isDelegated={false}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />
    );

    const delegateButton = screen.getByRole('button', {
      name: 'Delegate to Alice Voter',
    });
    expect(delegateButton).toBeInTheDocument();
    expect(delegateButton).toHaveTextContent('Delegate Power');
    expect(
      screen.queryByRole('button', { name: 'Revoke delegation from Alice Voter' })
    ).not.toBeInTheDocument();

    await userEvent.click(delegateButton);

    expect(onDelegateClick).toHaveBeenCalledTimes(1);
    expect(onRevokeClick).not.toHaveBeenCalled();
  });

  it('renders the revoke button with accessible name and fires onRevokeClick when delegated', async () => {
    const onDelegateClick = vi.fn();
    const onRevokeClick = vi.fn();

    render(
      <DelegateProfileCard
        delegate={mockDelegate}
        isDelegated={true}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />
    );

    const revokeButton = screen.getByRole('button', {
      name: 'Revoke delegation from Alice Voter',
    });
    expect(revokeButton).toBeInTheDocument();
    expect(revokeButton).toHaveTextContent('Revoke Delegation');
    expect(
      screen.queryByRole('button', { name: 'Delegate to Alice Voter' })
    ).not.toBeInTheDocument();

    await userEvent.click(revokeButton);

    expect(onRevokeClick).toHaveBeenCalledTimes(1);
    expect(onDelegateClick).not.toHaveBeenCalled();
  });
});
