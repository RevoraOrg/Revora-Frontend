import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { OfferingDetail } from './OfferingDetail';

describe('OfferingDetail settings tabs', () => {
  const renderComponent = (hash = '#general') => {
    window.history.pushState({}, '', hash);

    return render(
      <MemoryRouter initialEntries={['/offerings/1']}>
        <Routes>
          <Route path="/offerings/:id" element={<OfferingDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the issuer admin settings tabs with the general tab selected by default', () => {
    renderComponent('#general');

    const generalTab = screen.getByRole('tab', { name: /general/i });
    expect(generalTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Offering Name/i)).toBeInTheDocument();
  });

  it('switches tabs and reacts to URL hash navigation', () => {
    renderComponent('#general');

    const distributionsTab = screen.getByRole('tab', { name: /distributions/i });
    fireEvent.click(distributionsTab);

    expect(distributionsTab).toHaveAttribute('aria-selected', 'true');
    expect(window.location.hash).toBe('#distributions');

    window.location.hash = '#documents';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(screen.getByRole('tab', { name: /documents/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the lockup status card inside the distributions tab', () => {
    renderComponent('#general');

    fireEvent.click(screen.getByRole('tab', { name: /distributions/i }));

    expect(screen.getByTestId('lockup-status-card')).toBeInTheDocument();
    expect(screen.getByTestId('lockup-status-label')).toHaveTextContent(/cliff/i);
  });

  it('requires the exact DELETE phrase before the destructive action can run', () => {
    renderComponent('#danger');

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const input = screen.getByLabelText(/type delete to confirm/i);
    const deleteButton = screen.getByRole('button', { name: /delete offering/i });

    expect(deleteButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'DELETE' } });
    expect(deleteButton).not.toBeDisabled();

    fireEvent.click(deleteButton);
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('renders the governance voting UI inside the governance tab', () => {
    renderComponent('#general');

    const governanceTab = screen.getByRole('tab', { name: /governance/i });
    fireEvent.click(governanceTab);

    expect(governanceTab).toHaveAttribute('aria-selected', 'true');
    expect(window.location.hash).toBe('#governance');
    expect(screen.getByTestId('governance-voting')).toBeInTheDocument();
    expect(screen.getByTestId('vote-tally-bar')).toBeInTheDocument();
    expect(screen.getByTestId('vote-radiogroup')).toBeInTheDocument();
  });
});
