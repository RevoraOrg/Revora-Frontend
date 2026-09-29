import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { DelegateProfileCard, DelegateData } from './DelegateProfileCard';

const delegate: DelegateData = {
  id: 'del-1',
  name: 'Alice Voter',
  address: 'addr_test1qxyz123',
  participationRate: 92,
  voteAlignment: 87,
  totalDelegated: 1500000,
};

describe('DelegateProfileCard', () => {
  it('renders delegate information correctly', () => {
    render(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );

    expect(screen.getByTestId('delegate-card-del-1')).toBeInTheDocument();
    expect(screen.getByText('Alice Voter')).toBeInTheDocument();
    expect(screen.getByText('addr_test1qxyz123')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('1,500,000 VP')).toBeInTheDocument();
  });

  it('shows the delegate action and calls onDelegateClick', async () => {
    const user = userEvent.setup();
    const onDelegateClick = vi.fn();
    const onRevokeClick = vi.fn();

    render(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={false}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Delegate to Alice Voter',
    });

    expect(button).toHaveTextContent('Delegate Power');

    await user.click(button);

    expect(onDelegateClick).toHaveBeenCalledTimes(1);
    expect(onRevokeClick).not.toHaveBeenCalled();
  });

  it('shows the revoke action and calls onRevokeClick', async () => {
    const user = userEvent.setup();
    const onDelegateClick = vi.fn();
    const onRevokeClick = vi.fn();

    render(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={true}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'Revoke delegation from Alice Voter',
    });

    expect(button).toHaveTextContent('Revoke Delegation');

    await user.click(button);

    expect(onRevokeClick).toHaveBeenCalledTimes(1);
    expect(onDelegateClick).not.toHaveBeenCalled();
  });

  it('updates the action when the delegation state changes', () => {
    const onDelegateClick = vi.fn();
    const onRevokeClick = vi.fn();

    const { rerender } = render(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={false}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Delegate to Alice Voter',
      }),
    ).toHaveTextContent('Delegate Power');

    rerender(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={true}
        onDelegateClick={onDelegateClick}
        onRevokeClick={onRevokeClick}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Revoke delegation from Alice Voter',
      }),
    ).toHaveTextContent('Revoke Delegation');

    expect(
      screen.queryByRole('button', {
        name: 'Delegate to Alice Voter',
      }),
    ).not.toBeInTheDocument();
  });

  it('renders zero and boundary percentage values correctly', () => {
    const boundaryDelegate: DelegateData = {
      id: 'del-boundary',
      name: 'Boundary Delegate',
      address: 'addr_boundary',
      participationRate: 0,
      voteAlignment: 100,
      totalDelegated: 0,
    };

    render(
      <DelegateProfileCard
        delegate={boundaryDelegate}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('0 VP')).toBeInTheDocument();
  });

  it('renders unusual numeric and empty string values without crashing', () => {
    const unusualDelegate: DelegateData = {
      id: 'del-unusual',
      name: '',
      address: '',
      participationRate: -10,
      voteAlignment: 150,
      totalDelegated: 999999999999,
    };

    render(
      <DelegateProfileCard
        delegate={unusualDelegate}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('delegate-card-del-unusual'),
    ).toBeInTheDocument();
    expect(screen.getByText('-10%')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
    expect(screen.getByText('999,999,999,999 VP')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <DelegateProfileCard
        delegate={delegate}
        isDelegated={false}
        onDelegateClick={vi.fn()}
        onRevokeClick={vi.fn()}
      />,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});