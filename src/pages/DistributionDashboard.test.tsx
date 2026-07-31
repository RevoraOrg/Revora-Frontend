import React, { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DistributionDashboard } from './DistributionDashboard';

expect.extend(toHaveNoViolations);

describe('DistributionDashboard', () => {
  const renderWithRouter = (initialEntries = ['/distribution-dashboard']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/distribution-dashboard" element={<DistributionDashboard />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders distribution dashboard header and description', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: /distribution dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Monitor and audit on-chain RevenueShare payout cycles/i)).toBeInTheDocument();
  });

  it('renders report monthly revenue link', () => {
    renderWithRouter();

    const link = screen.getByText('+ Report Monthly Revenue');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/startup/report-revenue');
  });

  it('renders the governance proposal detail experience', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /increase developer grant fund/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /quorum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /for/i })).toBeInTheDocument();
  });

  it('renders recent uploads queue section', () => {
    renderWithRouter();

    expect(screen.getByText('Batch Upload Queue')).toBeInTheDocument();
    expect(screen.getByTestId('upload-queue')).toBeInTheDocument();
  });

  describe('error rate sparkline tiles', () => {
    it('renders error rate section heading', () => {
      renderWithRouter();

      expect(screen.getByRole('heading', { level: 2, name: /Payout Error Rates/i })).toBeInTheDocument();
    });

    it('renders error rate section container', () => {
      renderWithRouter();

      expect(screen.getByTestId('error-rate-section')).toBeInTheDocument();
    });

    it('renders View all failed link', () => {
      renderWithRouter();

      const link = screen.getByTestId('error-rate-view-all');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/startup/distributions?status=failed');
    });

    it('renders By Issuer and By Region subgroups', () => {
      renderWithRouter();

      expect(screen.getByTestId('error-rate-by-issuer')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-by-region')).toBeInTheDocument();
    });

    it('renders By Issuer heading', () => {
      renderWithRouter();

      expect(screen.getByText('By Issuer')).toBeInTheDocument();
    });

    it('renders By Region heading', () => {
      renderWithRouter();

      const regionSection = screen.getByTestId('error-rate-by-region');
      expect(within(regionSection).getByText('By Region')).toBeInTheDocument();
    });

    it('renders issuer error rate tiles with correct values', () => {
      renderWithRouter();

      expect(screen.getByTestId('error-rate-tile-issuer-acme')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-issuer-nexus')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-issuer-aero')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-issuer-stellar')).toBeInTheDocument();
    });

    it('renders region error rate tiles with correct values', () => {
      renderWithRouter();

      expect(screen.getByTestId('error-rate-tile-region-na')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-region-eu')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-region-apac')).toBeInTheDocument();
      expect(screen.getByTestId('error-rate-tile-region-latam')).toBeInTheDocument();
    });

    it('renders 4 issuer tiles and 4 region tiles', () => {
      renderWithRouter();

      const issuerList = screen.getByRole('list', { name: /Error rates by issuer/i });
      expect(issuerList.children).toHaveLength(4);

      const regionList = screen.getByRole('list', { name: /Error rates by region/i });
      expect(regionList.children).toHaveLength(4);
    });

    it('renders issuer tile with link to filtered detail page', () => {
      renderWithRouter();

      const tileLink = screen.getByTestId('error-rate-tile-issuer-acme').closest('a');
      expect(tileLink).toHaveAttribute(
        'href',
        '/startup/distributions?issuer=Nexus%20Cloud%20Series%20A&status=failed'
      );
    });

    it('renders region tile with link to filtered detail page', () => {
      renderWithRouter();

      const tileLink = screen.getByTestId('error-rate-tile-region-na').closest('a');
      expect(tileLink).toHaveAttribute(
        'href',
        '/startup/distributions?region=North%20America&status=failed'
      );
    });

    it('displays issuer filter value in tile footer', () => {
      renderWithRouter();

      expect(screen.getByText('Issuer: Nexus Cloud Series A')).toBeInTheDocument();
      expect(screen.getByText('Issuer: Quantum Labs')).toBeInTheDocument();
    });

    it('displays region filter value in tile footer', () => {
      renderWithRouter();

      expect(screen.getByText('Region: North America')).toBeInTheDocument();
      expect(screen.getByText('Region: Asia Pacific')).toBeInTheDocument();
    });

    it('renders sparkline SVGs with trend labels', () => {
      renderWithRouter();

      const decreasingSparklines = screen.getAllByRole('img', { name: /decreasing/i });
      const increasingSparklines = screen.getAllByRole('img', { name: /increasing/i });

      expect(decreasingSparklines.length).toBeGreaterThanOrEqual(1);
      expect(increasingSparklines.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders GovernanceResults section', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /Results Breakdown/i })).toBeInTheDocument();
    expect(screen.getByText(/63\.5% turnout/i)).toBeInTheDocument();
  });

  describe('governance empty states', () => {
    it('renders all three governance empty states when govEmpty=all', () => {
      renderWithRouter(['/distribution-dashboard?govEmpty=all']);

      expect(screen.getByRole('heading', { name: /No active proposals/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /No votes cast yet/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /No delegates yet/i })).toBeInTheDocument();
    });

    it('renders Create Proposal CTA linking to the proposal creation flow', () => {
      renderWithRouter(['/distribution-dashboard?govEmpty=proposals']);

      const cta = screen.getByTestId('gov-empty-create-proposal');
      expect(cta.closest('a')).toHaveAttribute(
        'href',
        '/startup/governance/proposals/create',
      );
    });

    it('renders Back to Discovery link from governance empty states', () => {
      renderWithRouter(['/distribution-dashboard?govEmpty=all']);

      const backLinks = screen.getAllByText('Back to Discovery');
      expect(backLinks.length).toBeGreaterThanOrEqual(1);
      expect(backLinks[0].closest('a')).toHaveAttribute('href', '/investor/portal');
    });

    it('keeps proposal detail and results when govEmpty is unset', () => {
      renderWithRouter();

      expect(screen.queryByRole('heading', { name: /No active proposals/i })).toBeNull();
      expect(screen.getByRole('heading', { name: /Increase Developer Grant Fund/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Results Breakdown/i })).toBeInTheDocument();
    });

    it('renders monochrome empty-state illustrations in print mode', () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = ((query: string) =>
        ({
          matches: query === 'print',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        })) as unknown as typeof window.matchMedia;

      renderWithRouter(['/distribution-dashboard?govEmpty=all']);

      window.matchMedia = originalMatchMedia;

      const svgs = document.querySelectorAll('.empty-state-icon-wrap svg');
      expect(svgs.length).toBeGreaterThanOrEqual(3);
      svgs.forEach((svg) => {
        expect(svg.innerHTML).toContain('stroke="#000000"');
      });
    });

    it('passes axe accessibility checks with governance empty states', async () => {
      const { container } = renderWithRouter(['/distribution-dashboard?govEmpty=all']);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  it('passes axe accessibility checks with 0 violations', async () => {
    const { container } = renderWithRouter();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
