import type { MouseEvent } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Outlet } from "react-router-dom";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { InvestorDiscovery } from "./components/InvestorDiscovery"; // Import here
import { ActivityFeed } from "./components/ActivityFeed";
import NotificationBell from "./components/Notifications/NotificationBell";
import { notificationsMock } from "./components/Notifications/notificationsData";

export function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/startup/dashboard"
            element={<Placeholder title="Startup Dashboard" />}
          />

          {/* Updated Route - Issue #63 */}
          <Route path="/investor/portal" element={<InvestorDiscovery />} />
        </Route>
      </Routes>
    </Router>
  );
}

function AppLayout() {
  const handleSkipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    const main = document.getElementById("main-content");
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView?.({ block: "start" });
    window.location.hash = "main-content";
  };

  return (
    <>
      <a href="#main-content" className="skip-link" onClick={handleSkipToContent}>
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      {/* Header bar with notification bell */}
      <div className="w-full flex justify-end mb-4">
        <NotificationBell notifications={notificationsMock} />
      </div>
      <div className="w-full max-w-[720px] glass-card p-10 md:p-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Stellar RevenueShare – Revora
        </h1>
        <p className="text-muted text-lg mb-8 max-w-lg mx-auto">
          Tokenized revenue-sharing infrastructure on Stellar. Bridge the gap
          between visionaries and supporters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <section className="glass-card p-6 text-left border-[rgba(148,163,184,0.15)]">
            <h2 className="text-xl font-semibold mb-3">Startup Dashboard</h2>
            <ul className="text-muted text-sm space-y-2">
              <li>• Configure RevenueShare offerings</li>
              <li>• Report monthly revenue</li>
              <li>• Track on-chain RevenueShare payouts</li>
            </ul>
          </section>

          <section className="glass-card p-6 text-left border-[rgba(148,163,184,0.15)]">
            <h2 className="text-xl font-semibold mb-3">Investor Portal</h2>
            <ul className="text-muted text-sm space-y-2">
              <li>• Discover high-potential offerings</li>
              <li>• Invest using USDC on Stellar</li>
              <li>• See real-time RevenueShare payouts</li>
            </ul>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup" className="btn-primary sm:w-auto px-10">
            Get Started
          </Link>
          <Link to="/login" className="btn-secondary sm:w-auto px-10">
            Sign In
          </Link>
        </div>

        <div className="mt-12 text-xs text-muted">
          revora-frontend (React + Vite + TS) • Powered by Stellar
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-10">
      <div className="glass-card p-20 text-center">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-muted mb-8">
          This dashboard is currently under construction.
        </p>
        <Link to="/" className="btn-secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
