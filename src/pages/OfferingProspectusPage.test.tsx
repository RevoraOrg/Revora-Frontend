import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { axe } from 'jest-axe';
import { OfferingProspectusPage } from './OfferingProspectusPage';
import { InvestorDiscovery } from '../components/InvestorDiscovery';
import { MOCK_OFFERINGS } from '../data/offerings';

function renderPage(path = '/offerings/1') {
  const router = createMemoryRouter([
    { path: '/offerings/:id', element: <OfferingProspectusPage /> },
    { path: '/investor/portal', element: <InvestorDiscovery /> },
  ], { initialEntries: [path] });
  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
}

describe('Investor offering prospectus', () => {
  it.each(MOCK_OFFERINGS)('renders the shared data for $name', (offering) => {
    renderPage(`/offerings/${offering.id}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(offering.name);
    expect(screen.getByText(offering.description)).toBeInTheDocument();
    expect(screen.getByText(offering.category)).toBeInTheDocument();
    const terms = screen.getByRole('region', { name: 'Financial terms' });
    expect(within(terms).getByText(`${offering.revenueShare}%`)).toBeInTheDocument();
    expect(within(terms).getByText(`${offering.termLength} months`)).toBeInTheDocument();
    expect(within(terms).getByText(`$${offering.minInvestment.toLocaleString('en-US')}`)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: `${offering.name} funding progress` })).toHaveAttribute('aria-valuenow', String(Math.round(offering.raised / offering.target * 100)));
    expect(screen.queryByRole('button', { name: /delete offering/i })).not.toBeInTheDocument();
  });

  it.each(['999', 'unknown', '01', '1e0'])('shows not found for an unknown id %s', (id) => {
    renderPage(`/offerings/${id}?q=Nexus&filters=active`);
    expect(screen.getByRole('heading', { name: 'Offering not found' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to results' })).toHaveAttribute('href', '/investor/portal?q=Nexus&filters=active');
  });

  it('renders lockup only for an offering with a schedule', () => {
    renderPage();
    expect(screen.getByTestId('lockup-status-card')).toBeInTheDocument();
    expect(screen.queryByTestId('preopen-banner')).not.toBeInTheDocument();
  });

  it('renders the pre-open countdown and demo reminder interaction', async () => {
    renderPage('/offerings/2');
    expect(screen.getByTestId('preopen-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('lockup-status-card')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /notify me/i }));
    expect(screen.getByTestId('preopen-banner')).toHaveTextContent(/reminder set|notify|notified/i);
  });

  it('shows closed status without a pre-open banner', () => {
    renderPage('/offerings/3');
    expect(screen.getByRole('heading', { name: 'Closed' })).toBeInTheDocument();
    expect(screen.queryByTestId('preopen-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lockup-status-card')).not.toBeInTheDocument();
  });

  it.each([
    [1, 'Funding open'], [2, 'Pre-open'], [3, 'Closed'],
  ])('opens contextual help for offering %s and restores trigger focus', async (id, title) => {
    renderPage(`/offerings/${id}`);
    const trigger = screen.getByRole('button', { name: 'Help with this offering' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveAccessibleName(title as string);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('provides an accessible breadcrumb and a default direct-entry return link', async () => {
    const { container } = renderPage();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('TechFlow AI');
    expect(screen.getByRole('link', { name: 'Back to results' })).toHaveAttribute('href', '/investor/portal');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('links each discovery card to its matching offering with real anchors', () => {
    renderPage('/investor/portal');
    for (const offering of MOCK_OFFERINGS) {
      expect(screen.getByRole('link', { name: `View prospectus for ${offering.name}` })).toHaveAttribute('href', `/offerings/${offering.id}`);
    }
  });

  it('preserves search and filter state through card navigation, browser Back, and back-to-results', async () => {
    const { router } = renderPage('/investor/portal');
    await userEvent.type(screen.getByRole('searchbox'), 'Quantum');
    await userEvent.click(screen.getByRole('button', { name: 'Filter results' }));
    const openCard = () => userEvent.click(screen.getByRole('link', { name: 'View prospectus for Quantum Ledger' }));
    await openCard();
    expect(router.state.location.pathname).toBe('/offerings/2');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quantum Ledger');
    expect(screen.getByRole('link', { name: 'Investor discovery' })).toHaveAttribute('href', '/investor/portal?q=Quantum&filters=active');
    await act(() => router.navigate(-1));
    expect(screen.getByRole('searchbox')).toHaveValue('Quantum');
    expect(screen.getByRole('button', { name: /filters active/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('offering-card-1')).not.toBeInTheDocument();
    await openCard();
    await userEvent.click(screen.getByRole('link', { name: 'Back to results' }));
    expect(screen.getByRole('searchbox')).toHaveValue('Quantum');
    expect(screen.getByRole('button', { name: /filters active/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
