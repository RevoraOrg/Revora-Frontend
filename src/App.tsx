import { lazy, Suspense, useEffect, useState, type MouseEvent } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  type RouteObject,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Search } from "lucide-react";
import {
  RequireRole,
  readStoredAuthSession,
  useOptionalAuth,
  writeStoredAuthSession,
} from "./components/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary/ErrorBoundary";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import type { CommandItem } from "./components/CommandPalette/commandPaletteData";
import { KeyboardShortcutsOverlay } from "./components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay";
import NotificationBell from "./components/Notifications/NotificationBell";
import { NotificationProvider } from "./components/Notifications/NotificationProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { GovernanceProposalsProvider } from "./context/GovernanceProposalsContext";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { I18N_LOCALES } from "./i18n/locales";
import { RevenueReportsProvider } from "./lib/revenueReportsStore";
import { AuditTrailPage } from "./pages/AuditTrailPage";
import { GovernanceDelegationPage } from "./pages/GovernanceDelegationPage";
import { GovernanceProposalDetailPage } from "./pages/GovernanceProposalDetailPage";
import { GovernanceProposalsPage } from "./pages/GovernanceProposalsPage";
import { MultiIssuerComparisonView } from "./pages/MultiIssuerComparisonView";
import { OfferingProspectusPage } from "./pages/OfferingProspectusPage";
import { SecuritySettingsPage } from "./pages/SecuritySettingsPage";
import { SettingsPage } from "./pages/SettingsPage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import { PageLoader } from "./components/PageLoader";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { useCommandPalette } from "./hooks/useCommandPalette";
import { useContractRead } from "./hooks/useContractRead";
import { useDocumentTitle } from "./hooks/useDocumentTitle";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { formatKeyLabels } from "./utils/keyLabels";
import {
  CONTRACT_ID,
  buildContractExplorerUrl,
  buildStellarLabUrl,
} from "./constants/stellar";
import { LIVE_URL, REPO_URL } from "./constants/links";

const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("./pages/Signup").then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then((m) => ({ default: m.ForgotPassword })));
const TwoFactorRecoveryPage = lazy(() =>
  import("./pages/TwoFactorRecoveryPage").then((m) => ({ default: m.TwoFactorRecoveryPage })),
);
const TwoFactorBackupCodesPage = lazy(() => import("./pages/TwoFactorBackupCodesPage"));
const InvestorDiscovery = lazy(() =>
  import("./components/InvestorDiscovery").then((m) => ({ default: m.InvestorDiscovery })),
);
const InvestorPortfolioSummary = lazy(() =>
  import("./pages/InvestorPortfolioSummary").then((m) => ({ default: m.InvestorPortfolioSummary })),
);
const LedgerDemoPage = lazy(() =>
  import("./pages/LedgerDemoPage").then((m) => ({ default: m.LedgerDemoPage })),
);
const OfferingRegistrationDemo = lazy(() =>
  import("./pages/OfferingRegistrationDemo").then((m) => ({ default: m.OfferingRegistrationDemo })),
);
const ScheduledExportsPage = lazy(() =>
  import("./pages/ScheduledExportsPage").then((m) => ({ default: m.ScheduledExportsPage })),
);
const StartupDashboard = lazy(() =>
  import("./pages/StartupDashboard").then((m) => ({ default: m.StartupDashboard })),
);
const KycWizardPage = lazy(() =>
  import("./pages/KycWizardPage").then((m) => ({ default: m.KycWizardPage })),
);
const GovernanceProposalCreatePage = lazy(() =>
  import("./pages/GovernanceProposalCreatePage").then((m) => ({
    default: m.GovernanceProposalCreatePage,
  })),
);
const AdminAlertsInbox = lazy(() =>
  import("./pages/AdminAlertsInbox").then((m) => ({ default: m.AdminAlertsInbox })),
);
const PayoutSchedule = lazy(() =>
  import("./pages/PayoutSchedule").then((m) => ({ default: m.PayoutSchedule })),
);
const GovernanceVoteReceiptDemo = lazy(() =>
  import("./pages/GovernanceVoteReceiptDemo").then((m) => ({
    default: m.GovernanceVoteReceiptDemo,
  })),
);
const AdminCompliancePage = lazy(() =>
  import("./pages/AdminCompliancePage").then((m) => ({ default: m.AdminCompliancePage })),
);
const RevenueReportSubmission = lazy(() =>
  import("./pages/RevenueReportSubmission").then((m) => ({
    default: m.RevenueReportSubmission,
  })),
);
const RevenueReports = lazy(() =>
  import("./pages/RevenueReports").then((m) => ({ default: m.RevenueReports })),
);
const STELLAR_LAB_URL = buildStellarLabUrl();
const STELLAR_EXPERT_URL = buildContractExplorerUrl();

async function loadContractSummary() {
  const { getContractSummary } = await import("./lib/soroban/revoraContract");
  return getContractSummary();
}

function SiteFooter() {
  const { data: contractSummary, isLoading, isError, error, retry } = useContractRead(
    loadContractSummary,
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
    element: <RevenueReportsProvider><AppLayout /></RevenueReportsProvider>,
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
      { path: "/startup/revenue-calendar", element: <RevenueReports /> },
      { path: "/startup/report-revenue", element: <RevenueReportSubmission /> },
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
      {
        path: "/investor",
        element: <RequireRole role="investor" />,
        children: [
          { index: true, element: <Navigate to="/investor/portal" replace /> },
          { path: "portal", element: <InvestorDiscovery /> },
          { path: "portfolio", element: <InvestorPortfolioSummary /> },
          { path: "payouts", element: <PayoutSchedule /> },
          // Issue #139 – Virtualized Ledger Table
          { path: "ledger", element: <LedgerDemoPage /> },
        ],
      },
      { path: "/investor", element: <Navigate to="/investor/portal" replace /> },
      { path: "/investor/portal", element: <InvestorDiscovery /> },
      { path: "/offerings/:id", element: <OfferingProspectusPage /> },
      { path: "/investor/portfolio", element: <InvestorPortfolioSummary /> },
      { path: "/investor/payouts", element: <PayoutSchedule /> },
      { path: "/investor/compare", element: <MultiIssuerComparisonView /> },
      // Issue #139 – Virtualized Ledger Table
      { path: "/investor/ledger", element: <LedgerDemoPage /> },

      // Admin routes
      {
        path: "/admin",
        element: <RequireRole role="admin" />,
        children: [
          { index: true, element: <Navigate to="/admin/alerts" replace /> },
          { path: "alerts", element: <AdminAlertsInbox /> },
          { path: "compliance", element: <AdminCompliancePage /> },
          { path: "scheduled-exports", element: <ScheduledExportsPage /> },
        ],
      },
      { path: "/admin", element: <Navigate to="/admin/alerts" replace /> },
      { path: "/admin/alerts", element: <AdminAlertsInbox /> },
      { path: "/admin/audit", element: <AuditTrailPage /> },
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
  const auth = useOptionalAuth();
  const currentUser = auth ? auth.user : readStoredAuthSession();
  const currentRole = currentUser?.role ?? null;

  const handleSignOut = () => {
    if (auth) {
      auth.signOut();
    } else {
      writeStoredAuthSession(null);
    }
    navigate("/login", { replace: true });
  };

  const location = useLocation();
  const handleSkipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView?.({ block: "start" });
  };

  return (
    <NotificationProvider>
      <a href="#main-content" className="skip-link" onClick={handleSkipToContent}>
        Skip to main content
      </a>
      <header className="site-header">
        <Link to="/" className="site-header__brand">Revora</Link>
        <nav className="site-header__nav" aria-label="Primary">
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
          {(!currentRole || currentRole === "startup") && (
            <NavLink to="/startup" className="site-link">Startup</NavLink>
          )}
          {(!currentRole || currentRole === "investor") && (
            <NavLink to="/investor" className="site-link">Investor</NavLink>
          )}
          {(!currentRole || currentRole === "admin") && (
            <NavLink to="/admin" className="site-link">Admin</NavLink>
          )}
          {currentUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="site-link"
              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit" }}
            >
              Sign out
            </button>
          ) : (
            <NavLink to="/login" className="site-link">Sign in</NavLink>
          )}
        </nav>
        <NotificationBell />
        <ThemeToggle compact />
      </header>
      <main id="main-content" tabIndex={-1}>
        <ErrorBoundary resetKey={location.key}>
          <RouteErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoader label="Loading page..." />}>
              <GovernanceProposalsProvider>
                <Outlet />
              </GovernanceProposalsProvider>
            </Suspense>
          </RouteErrorBoundary>
        </ErrorBoundary>
      </main>
      <SiteFooter />
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
    </NotificationProvider>
  );
}

function Home() {
  const { t } = useI18n();
  useDocumentTitle("Home");

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
              </li>
            </ul>
          </section>

          <section className="home-section glass-card">
            <h2 className="home-section-title">{t("home.investor-portal")}</h2>
            <ul className="home-list">
              <li><Link to="/investor/portal" className="link-styled">Discover offerings</Link></li>
              <li>Invest using USDC on Stellar</li>
              <li><Link to="/investor/portfolio" className="link-styled">View portfolio summary</Link></li>
              <li><Link to="/investor/compare" className="link-styled">Compare issuers</Link></li>
              <li><Link to="/investor/ledger" className="link-styled">Browse ledger entries</Link></li>
              <li><Link to="/investor/payouts" className="link-styled">View payout schedule</Link></li>
            </ul>
          </section>

          <section className="home-section glass-card">
            <h2 className="home-section-title">{t("home.admin-account")}</h2>
            <ul className="home-list">
              <li><Link to="/admin/alerts" className="link-styled">Alerts inbox</Link></li>
              <li><Link to="/admin/compliance" className="link-styled">Compliance workflow</Link></li>
              <li><Link to="/admin/audit" className="link-styled">Audit trail</Link></li>
              <li><Link to="/admin/scheduled-exports" className="link-styled">Scheduled exports</Link></li>
              <li><Link to="/settings/2fa/backup-codes" className="link-styled">2FA backup codes</Link></li>
              <li><Link to="/recover-2fa" className="link-styled">2FA recovery</Link></li>
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
  useDocumentTitle(title);

  return (
    <div className="placeholder-container">
      <div className="placeholder-card glass-card">
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-text">
          We could not find that page.
        </p>
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
