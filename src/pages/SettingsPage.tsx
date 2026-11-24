import React, { useState } from "react";
import { Navigate, useInRouterContext, useNavigate, useParams } from "react-router-dom";
import { Settings as SettingsIcon } from "lucide-react";
import { I18nFormatterPreview } from "../components/I18nFormatterPreview";
import { PayoutSettingsTab } from "../components/PayoutSettingsTab";
import { ComplianceSettingsTab } from "../components/ComplianceSettingsTab";
import { OfferingSettingsGeneralTab } from "../components/OfferingSettingsGeneralTab";
import Tabs, { type Tab } from "../components/Tabs";

export type SettingsTab = "i18n" | "payouts" | "compliance" | "general";

export const DEFAULT_SETTINGS_TAB: SettingsTab = "i18n";

export const SETTINGS_TABS: Array<Tab & { id: SettingsTab }> = [
  { id: "i18n", label: "Localization & Formatting" },
  { id: "payouts", label: "Payout Settings" },
  { id: "compliance", label: "Compliance & Regions" },
  { id: "general", label: "General Offering Settings" },
];

const VALID_TABS = new Set<SettingsTab>(SETTINGS_TABS.map((tab) => tab.id));

export function isSettingsTab(value: string | undefined): value is SettingsTab {
  return typeof value === "string" && VALID_TABS.has(value as SettingsTab);
}

const DEFAULT_GENERAL_OFFERING = {
  name: "Revora Revenue Share Series A",
  description:
    "Tokenized revenue-sharing offering configured on the Stellar network with automated pro-rata distributions.",
  metadata: "Series A • Stellar Testnet",
};

const SettingsPageWithRouter: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  if (tab !== undefined && !isSettingsTab(tab)) {
    return <Navigate to={`/settings/${DEFAULT_SETTINGS_TAB}`} replace />;
  }

  const activeTab: SettingsTab = isSettingsTab(tab) ? tab : DEFAULT_SETTINGS_TAB;

  const handleTabChange = (nextTabId: string) => {
    if (!isSettingsTab(nextTabId) || nextTabId === activeTab) return;
    navigate(`/settings/${nextTabId}`);
  };

  return <SettingsPageContent activeTab={activeTab} onTabChange={handleTabChange} />;
};

const SettingsPageStandalone: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(DEFAULT_SETTINGS_TAB);

  const handleTabChange = (nextTabId: string) => {
    if (isSettingsTab(nextTabId)) {
      setActiveTab(nextTabId);
    }
  };

  return <SettingsPageContent activeTab={activeTab} onTabChange={handleTabChange} />;
};

interface SettingsPageContentProps {
  activeTab: SettingsTab;
  onTabChange: (tabId: string) => void;
}

const SettingsPageContent: React.FC<SettingsPageContentProps> = ({
  activeTab,
  onTabChange,
}) => {
  const [generalOfferingData, setGeneralOfferingData] = useState(DEFAULT_GENERAL_OFFERING);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-main flex items-center gap-3">
            <SettingsIcon className="text-primary" size={28} />
            <span>Account & Application Settings</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Manage your regional preferences, number formatting, and payout distribution configurations.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onTabChange={onTabChange}
        ariaLabel="Settings tabs"
        className="border-b border-slate-800 pb-3"
      />

      {/* Tab Panels */}
      <div className="tab-content">
        {activeTab === "i18n" && (
          <div id="tabpanel-i18n" role="tabpanel" aria-labelledby="tab-i18n">
            <I18nFormatterPreview />
          </div>
        )}

        {activeTab === "payouts" && (
          <div id="tabpanel-payouts" role="tabpanel" aria-labelledby="tab-payouts">
            <PayoutSettingsTab />
          </div>
        )}

        {activeTab === "compliance" && (
          <div id="tabpanel-compliance" role="tabpanel" aria-labelledby="tab-compliance">
            <ComplianceSettingsTab />
          </div>
        )}

        {activeTab === "general" && (
          <div id="tabpanel-general" role="tabpanel" aria-labelledby="tab-general">
            <h2 className="sr-only">General Offering Settings</h2>
            <OfferingSettingsGeneralTab
              initialData={generalOfferingData}
              onSave={(data) => setGeneralOfferingData((prev) => ({ ...prev, ...data }))}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const inRouter = useInRouterContext();
  return inRouter ? <SettingsPageWithRouter /> : <SettingsPageStandalone />;
};

