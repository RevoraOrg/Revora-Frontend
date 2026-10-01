import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DelegateSearch } from './DelegateSearch';

describe('DelegateSearch', () => {
  it('renders an empty state and filters results by delegate name', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);

    const input = screen.getByLabelText(/search delegates/i);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await userEvent.type(input, 'Alice');

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Alice Voter/i })).toBeInTheDocument();
    expect(screen.queryByText('Bob Stake')).not.toBeInTheDocument();
  });

  it('matches delegate addresses and shows a deterministic empty result state for invalid queries', async () => {
    render(<DelegateSearch onSelectDelegate={vi.fn()} />);

    const input = screen.getByLabelText(/search delegates/i);
    await userEvent.type(input, '0xABCD');

    expect(screen.getByRole('option', { name: /Charlie Node/i })).toBeInTheDocument();
    expect(screen.getByText('0xABCD...EF01')).toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'no-match-query');

    expect(screen.getByText('No delegates found')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('calls onSelectDelegate and clears the query after a click selection', async () => {
    const onSelectDelegate = vi.fn();
    render(<DelegateSearch onSelectDelegate={onSelectDelegate} />);

    const input = screen.getByLabelText(/search delegates/i);
    await userEvent.type(input, 'Bob');

    const option = screen.getByRole('option', { name: /Bob Stake/i });
    await userEvent.click(option);

    expect(onSelectDelegate).toHaveBeenCalledTimes(1);
    expect(onSelectDelegate).toHaveBeenCalledWith('del-2');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard selection via Enter and Space', () => {
    const onSelectDelegate = vi.fn();
    render(<DelegateSearch onSelectDelegate={onSelectDelegate} />);

    const input = screen.getByLabelText(/search delegates/i);
    fireEvent.change(input, { target: { value: 'Charlie' } });

    const option = screen.getByRole('option', { name: /Charlie Node/i });
    fireEvent.keyDown(option, { key: 'Enter' });

    expect(onSelectDelegate).toHaveBeenCalledTimes(1);
    expect(onSelectDelegate).toHaveBeenCalledWith('del-3');
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'Alice' } });
    const aliceOption = screen.getByRole('option', { name: /Alice Voter/i });
    fireEvent.keyDown(aliceOption, { key: ' ' });

    expect(onSelectDelegate).toHaveBeenCalledTimes(2);
    expect(onSelectDelegate).toHaveBeenLastCalledWith('del-1');
    expect(input).toHaveValue('');
  });
});
