import { useEffect, useState, type MouseEvent } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  type RouteObject,
  RouterProvider,
  useNavigate,
} from "react-router-dom";
import { Search } from "lucide-react";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { I18N_LOCALES } from "./i18n/locales";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import type { CommandItem } from "./components/CommandPalette/commandPaletteData";
import { KeyboardShortcutsOverlay } from "./components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay";
import { useCommandPalette } from "./hooks/useCommandPalette";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { formatKeyLabels } from "./utils/keyLabels";
import { ForgotPassword } from "./pages/ForgotPassword";
import { TwoFactorRecoveryPage } from "./pages/TwoFactorRecoveryPage";
import TwoFactorBackupCodesPage from "./pages/TwoFactorBackupCodesPage";
import { SecuritySettingsPage } from "./pages/SecuritySettingsPage";
import { DesignTokensPage } from "./pages/DesignTokens/DesignTokensPage";
import { InvestorDiscovery } from "./components/InvestorDiscovery"; // Import here
import { InvestorPortfolioSummary } from "./pages/InvestorPortfolioSummary";
import { RevenueReportForm } from "./components/RevenueReportForm";
import { LedgerDemoPage } from "./pages/LedgerDemoPage";
import { OfferingRegistrationDemo } from "./pages/OfferingRegistrationDemo";
import NotificationBell from "./components/Notifications/NotificationBell";
import { NotificationProvider } from "./components/Notifications/NotificationProvider";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import { OfferingWizardSummary } from "./pages/OfferingWizardSummary";
import { ScheduledExportsPage } from "./pages/ScheduledExportsPage";
import { StartupDashboard } from "./pages/StartupDashboard";
import { KycWizardPage } from "./pages/KycWizardPage";
import { GovernanceProposalCreatePage } from "./pages/GovernanceProposalCreatePage";
import { GovernanceProposalsPage } from "./pages/GovernanceProposalsPage";
import { GovernanceProposalDetailPage } from "./pages/GovernanceProposalDetailPage";
import { GovernanceDelegationPage } from "./pages/GovernanceDelegationPage";
import { GovernanceProposalsProvider } from "./context/GovernanceProposalsContext";
import { AdminAlertsInbox } from "./pages/AdminAlertsInbox";
import { PayoutSchedule } from "./pages/PayoutSchedule";
import { GovernanceVoteReceiptDemo } from "./pages/GovernanceVoteReceiptDemo";
import { SettingsPage } from "./pages/SettingsPage";
import { useContractRead } from "./hooks/useContractRead";
import { getContractSummary } from "./lib/soroban/revoraContract";
import {
  CONTRACT_ID,
  buildContractExplorerUrl,
  buildStellarLabUrl,
} from "./constants/stellar";

const LIVE_URL = "https://revora-frontend-omega.vercel.app";
const REPO_URL = "https://github.com/RevoraOrg/Revora-Frontend";
const STELLAR_LAB_URL = buildStellarLabUrl();
const STELLAR_EXPERT_URL = buildContractExplorerUrl();

function SiteFooter() {
  const { data: contractSummary, isLoading, isError, error, retry } = useContractRead(
    getContractSummary,
    { key: 'contract-summary', retryCount: 2, retryDelay: 1000 },
  );

  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <strong>On-chain (Stellar testnet)</strong>
        <span className="text-muted">
          Revora revenue-deposit contract, deployed on the Stellar <em>testnet</em> (no real funds):
        </span>
      </div>
      <code className="site-footer__contract">{CONTRACT_ID}</code>
      
      {/* On-chain status panel */}
      <div className="site-footer__status">
        {isLoading && (
          <div className="site-footer__status-loading">
            <span className="text-muted">Loading contract data...</span>
          </div>
        )}
        {isError && (
          <div className="site-footer__status-error">
            <span>
              Failed to load contract data: {error}
            </span>
            <button
              type="button"
              onClick={retry}
              className="link-styled site-footer__retry"
            >
              Retry
            </button>
          </div>
        )}
        {contractSummary && !isLoading && (
          <div className="site-footer__status-success">
            <span className="text-muted">
              {contractSummary.periodCount} period{contractSummary.periodCount !== 1 ? 's' : ''} registered, 
              {contractSummary.authorizedOfferingsCount} authorized offering{contractSummary.authorizedOfferingsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      <div className="site-footer__row">
        <a href={STELLAR_EXPERT_URL} className="link-styled" target="_blank" rel="noopener noreferrer">Stellar Expert</a>
        <a href={STELLAR_LAB_URL} className="link-styled" target="_blank" rel="noopener noreferrer">Stellar Lab</a>
        <a href={REPO_URL} className="link-styled" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
        <a href={LIVE_URL} className="link-styled" target="_blank" rel="noopener noreferrer">Live site</a>
      </div>
    </footer>
  );
}

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/recover-2fa", element: <TwoFactorRecoveryPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/settings/:tab", element: <SettingsPage /> },
      { path: "/settings/2fa/backup-codes", element: <TwoFactorBackupCodesPage /> },
      { path: "/settings/notifications", element: <NotificationSettingsPage /> },
      { path: "/settings/security", element: <SecuritySettingsPage /> },

      // Startup routes
      { path: "/startup", element: <Navigate to="/startup/dashboard" replace /> },
      { path: "/startup/dashboard", element: <StartupDashboard /> },
      { path: "/startup/kyc", element: <KycWizardPage /> },
      { path: "/startup/report-revenue", element: <RevenueReportForm /> },
      // Issue #199 – Inline document uploader (Offering Registration wizard)
      { path: "/startup/offering-registration", element: <OfferingRegistrationDemo /> },
      // Governance routes
      { path: "/startup/governance/proposals", element: <GovernanceProposalsPage /> },
      // Issue #247 – Governance proposal creation multi-step form
      { path: "/startup/governance/proposals/create", element: <GovernanceProposalCreatePage /> },
      { path: "/startup/governance/proposals/:id", element: <GovernanceProposalDetailPage /> },
      { path: "/startup/governance/delegation", element: <GovernanceDelegationPage /> },
      // Issue #472 – Governance vote receipt with on-chain link
      { path: "/startup/governance/vote-receipt", element: <GovernanceVoteReceiptDemo /> },

      // Investor routes
      { path: "/investor", element: <Navigate to="/investor/portal" replace /> },
      { path: "/investor/portal", element: <InvestorDiscovery /> },
      { path: "/investor/portfolio", element: <InvestorPortfolioSummary /> },
      { path: "/investor/payouts", element: <PayoutSchedule /> },
      // Issue #139 – Virtualized Ledger Table
      { path: "/investor/ledger", element: <LedgerDemoPage /> },

      // Admin routes
      { path: "/admin", element: <Navigate to="/admin/alerts" replace /> },
      { path: "/admin/alerts", element: <AdminAlertsInbox /> },
      { path: "/admin/scheduled-exports", element: <ScheduledExportsPage /> },

      { path: "*", element: <Placeholder title="Page not found" /> },
    ],
  },
];

export function App() {
  // Created lazily so the router picks up the current URL at mount time.
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

function AppLayout() {
  const { locale, setLocale, t } = useI18n();
  const navigate = useNavigate();
  const {
    isOpen: isPaletteOpen,
    isMac: paletteIsMac,
    open: openPalette,
    close: closePalette,
    recentCommands,
    addRecent,
    clearRecent,
  } = useCommandPalette();
  const {
    isOpen: areShortcutsOpen,
    isMac: shortcutsIsMac,
    open: openShortcuts,
    close: closeShortcuts,
  } = useKeyboardShortcuts();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const handleCommandExecute = (item: CommandItem) => {
    addRecent(item);
    if (item.group === "navigate" && item.description) {
      navigate(item.description);
    }
    if (item.id === "action:toggle-shortcuts") {
      openShortcuts();
    }
  };
  const paletteShortcut = formatKeyLabels(["mod", "k"], paletteIsMac).join("+");

  const handleSkipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView?.({ block: "start" });
    window.location.hash = "main-content";
  };

  return (
    <NotificationProvider>
      <a href="#main-content" className="skip-link" onClick={handleSkipToContent}>
        Skip to main content
      </a>
      <header className="site-header">
        <Link to="/" className="site-header__brand">Revora</Link>
        <nav className="site-header__nav" aria-label="Primary">
          <NavLink to="/startup" className="site-link">Startup</NavLink>
          <NavLink to="/investor" className="site-link">Investor</NavLink>
          <NavLink to="/admin" className="site-link">Admin</NavLink>
        <nav className="site-header__nav" aria-label={t("header.primary-navigation")}>
          <Link to="/startup/dashboard" className="site-link">{t("header.startup")}</Link>
          <Link to="/investor/portal" className="site-link">{t("header.investor")}</Link>
          <Link to="/admin/alerts" className="site-link">{t("header.admin")}</Link>
          <NavLink to="/settings/security" className="site-link">Security</NavLink>
          <NavLink to="/settings" className="site-link">Settings</NavLink>
          <a href={REPO_URL} className="site-link" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button
            type="button"
            className="site-link"
            aria-label={`Open command palette (${paletteShortcut})`}
            aria-keyshortcuts={paletteIsMac ? "Meta+k" : "Control+k"}
            onClick={openPalette}
          >
            <Search size={16} aria-hidden="true" />
            <span>Search</span>
            <kbd aria-hidden="true">{paletteShortcut}</kbd>
          </button>
          <select
            aria-label={t("common.language")}
            className="site-link"
            value={locale}
            onChange={(event) => {
              const nextLocale = event.currentTarget.value;
              const supportedLocale = I18N_LOCALES.find(
                (candidate) => candidate === nextLocale,
              );
              if (supportedLocale) setLocale(supportedLocale);
            }}
          >
            <option value="en-US">English</option>
            <option value="ar-SA">العربية</option>
          </select>
        </nav>
        <NotificationBell />
      </header>
      <main id="main-content" tabIndex={-1}>
        <GovernanceProposalsProvider>
          <Outlet />
        </GovernanceProposalsProvider>
      </main>
      <SiteFooter />
    </NotificationProvider>
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        isMac={paletteIsMac}
        recentCommands={recentCommands}
        onCommandExecute={handleCommandExecute}
        onClearRecent={clearRecent}
      />
      <KeyboardShortcutsOverlay
        isOpen={areShortcutsOpen}
        onClose={closeShortcuts}
        isMac={shortcutsIsMac}
        isMobile={isMobile}
      />
    </>
  );
}

function Home() {
  const { t } = useI18n();
  return (
    <div className="home-container animate-fade-in">
      <div className="home-card glass-card">
        <h1 className="home-title">
          {t("home.title")} <span className="text-primary">Stellar</span>
        </h1>
        <p className="home-description">
          {t("home.description")}
        </p>
        <p className="home-description" role="note" style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {t("home.demo-notice")}
        </p>

        <div className="home-grid">
          <section className="home-section glass-card">
            <h2 className="home-section-title">{t("home.startup-dashboard")}</h2>
            <ul className="home-list">
              <li>
                <Link to="/startup/dashboard" className="link-styled">Issuer Dashboard</Link>
              </li>
              <li>Configure RevenueShare offerings</li>
              <li>
                <Link to="/startup/kyc" className="link-styled">Complete identity verification (KYC)</Link>
              </li>
              <li>
                <Link to="/startup/report-revenue" className="link-styled">Report monthly revenue</Link>
              </li>
              <li>
                <Link to="/startup/offering-registration" className="link-styled">Register a RevenueShare offering</Link>
              </li>
              <li>
                <Link to="/startup/governance/proposals" className="link-styled">Governance proposals</Link>
              </li>
              <li>
                <Link to="/startup/governance/proposals/create" className="link-styled">Create a governance proposal</Link>
              </li>
              <li>
                <Link to="/startup/governance/delegation" className="link-styled">Governance delegation</Link>
              </li>
              <li>
                <Link to="/startup/governance/vote-receipt" className="link-styled">Governance vote receipt</Link>
                • <Link to="/startup/dashboard" className="link-styled">{t("home.issuer-dashboard")}</Link>
              </li>
              <li>• {t("home.configure-offerings")}</li>
              <li>
                • <Link to="/startup/report-revenue" className="link-styled">{t("home.report-revenue")}</Link>
              </li>
              <li>
                • <Link to="/startup/offering-registration" className="link-styled">{t("home.register-offering")}</Link>
              </li>
              <li>
                • <Link to="/startup/governance/proposals/create" className="link-styled">{t("home.create-proposal")}</Link>
              </li>
              <li>
                • <Link to="/startup/governance/vote-receipt" className="link-styled">{t("home.vote-receipt")}</Link>
              </li>
            </ul>
          </section>

          <section className="home-section glass-card">
            <h2 className="home-section-title">{t("home.investor-portal")}</h2>
            <ul className="home-list">
              <li><Link to="/investor/portal" className="link-styled">Discover offerings</Link></li>
              <li>Invest using USDC on Stellar</li>
              <li><Link to="/investor/portfolio" className="link-styled">View portfolio summary</Link></li>
              <li><Link to="/investor/ledger" className="link-styled">Browse ledger entries</Link></li>
              <li><Link to="/investor/payouts" className="link-styled">View payout schedule</Link></li>
              <li>• <Link to="/investor/portal" className="link-styled">{t("home.discover-offerings")}</Link></li>
              <li>• {t("home.invest-usdc")}</li>
              <li>• <Link to="/investor/portfolio" className="link-styled">{t("home.portfolio-summary")}</Link></li>
              <li>• <Link to="/investor/ledger" className="link-styled">{t("home.ledger-entries")}</Link></li>
              <li>• <Link to="/investor/payouts" className="link-styled">{t("home.payout-schedule")}</Link></li>
            </ul>
          </section>

          <section className="home-section glass-card">
            <h2 className="home-section-title">{t("home.admin-account")}</h2>
            <ul className="home-list">
              <li><Link to="/admin/alerts" className="link-styled">Alerts inbox</Link></li>
              <li><Link to="/admin/scheduled-exports" className="link-styled">Scheduled exports</Link></li>
              <li><Link to="/settings/2fa/backup-codes" className="link-styled">2FA backup codes</Link></li>
              <li><Link to="/recover-2fa" className="link-styled">2FA recovery</Link></li>
              <li>• <Link to="/admin/alerts" className="link-styled">Alerts inbox</Link></li>
              <li>• <Link to="/admin/scheduled-exports" className="link-styled">Scheduled exports</Link></li>
              <li>• <Link to="/settings/notifications" className="link-styled">Notification preferences</Link></li>
              <li>• <Link to="/settings/2fa/backup-codes" className="link-styled">2FA backup codes</Link></li>
              <li>• <Link to="/recover-2fa" className="link-styled">2FA recovery</Link></li>
              <li>• <Link to="/admin/alerts" className="link-styled">{t("home.alerts-inbox")}</Link></li>
              <li>• <Link to="/admin/scheduled-exports" className="link-styled">{t("home.scheduled-exports")}</Link></li>
              <li>• <Link to="/settings/2fa/backup-codes" className="link-styled">{t("home.backup-codes")}</Link></li>
              <li>• <Link to="/recover-2fa" className="link-styled">{t("home.two-factor-recovery")}</Link></li>
            </ul>
          </section>
        </div>

        <div className="home-actions" style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <Link to="/signup" className="btn btn-primary" style={{ width: '100%' }}>
            {t("home.get-started")}
          </Link>
          <div className="relative flex items-center w-full my-2">
            <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
            <span className="flex-shrink mx-4 text-muted text-xs uppercase tracking-wider font-medium">
              {t("home.or-continue-email")}
            </span>
            <div className="flex-grow border-t border-[rgba(148,163,184,0.1)]"></div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <Link to="/signup" className="btn btn-secondary" style={{ flex: 1 }}>
              {t("home.sign-up")}
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ flex: 1 }}>
              {t("home.sign-in")}
            </Link>
          </div>
        </div>

        <div className="home-footer">
          revora-frontend (React + Vite + TS) • Powered by Stellar •{" "}
          <a href={REPO_URL} className="link-styled" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="placeholder-container">
      <div className="placeholder-card glass-card">
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-text">
          We could not find that page.
        </p>
        <Link to="/" className="btn btn--secondary btn--md">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
