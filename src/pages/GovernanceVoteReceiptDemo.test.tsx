import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { GovernanceVoteReceiptDemo } from './GovernanceVoteReceiptDemo';

describe('GovernanceVoteReceiptDemo', () => {
  const renderDemo = () =>
    render(
      <MemoryRouter>
        <GovernanceVoteReceiptDemo />
      </MemoryRouter>,
    );

  it('renders breadcrumb navigation, heading, scenario controls, and vote choice controls', () => {
    renderDemo();

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toBeInTheDocument();

    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toHaveAttribute('href', '/');

    expect(
      screen.getByRole('heading', { name: /governance vote receipt/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/proof-of-vote dialog with on-chain link/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('group', { name: /transaction status scenario/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmed/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /pending/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /confirming/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /failed tx/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    expect(
      screen.getByRole('group', { name: /vote choice/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^for$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^against$/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /^abstain$/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('opens and closes the vote receipt dialog with explorer link and proposal details', () => {
    renderDemo();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /open vote receipt dialog/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(/increase protocol treasury allocation by 15%/i),
    ).toBeInTheDocument();

    const explorerLink = screen.getByRole('link', { name: /explorer|view on/i });
    expect(explorerLink).toHaveAttribute(
      'href',
      'https://stellar.expert/explorer/public/tx/0xdeadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234',
    );

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches scenario and vote choice and handles retry from failed state', () => {
    renderDemo();

    fireEvent.click(screen.getByRole('button', { name: /^against$/i }));
    expect(screen.getByRole('button', { name: /^against$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /failed tx/i }));
    expect(screen.getByRole('button', { name: /failed tx/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(
      screen.getByRole('button', { name: /open vote receipt dialog/i }),
    );

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    expect(
      screen.getByText(/retry triggered — switching to confirming state/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirming/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Switching scenario clears the retry banner
    fireEvent.click(screen.getByRole('button', { name: /pending/i }));
    expect(
      screen.queryByText(/retry triggered — switching to confirming state/i),
    ).not.toBeInTheDocument();
  });
});
