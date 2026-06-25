import React from "react";
import { Info, AlertTriangle, ShieldAlert, X } from "lucide-react";

export type ComplianceSeverity = "info" | "warning" | "blocking";

export interface ComplianceHold {
  id: string;
  type: string;
  severity: ComplianceSeverity;
  title: string;
  message: string;
  canDismiss?: boolean;
}

interface ComplianceHoldBannerProps {
  holds: ComplianceHold[];
  onDismiss?: (holdId: string) => void;
  className?: string;
  id?: string;
}

/**
 * ComplianceHoldBanner component for displaying compliance holds with severity variants.
 * 
 * Follows WCAG 2.1 AA guidelines for contrast and screen reader accessibility.
 * Includes reduced-motion support and responsive design.
 * 
 * @example
 * ```tsx
 * <ComplianceHoldBanner
 *   holds={[{
 *     id: "1",
 *     type: "kyc",
 *     severity: "blocking",
 *     title: "Identity verification required",
 *     message: "Complete identity verification to continue"
 *   }]}
 * />
 * ```
 */
export const ComplianceHoldBanner: React.FC<ComplianceHoldBannerProps> = ({
  holds,
  onDismiss,
  className = "",
  id = "compliance-hold-banner",
}) => {
  if (!holds || holds.length === 0) return null;

  const getSeverityConfig = (severity: ComplianceSeverity) => {
    switch (severity) {
      case "info":
        return {
          icon: Info,
          bgClass: "bg-[rgba(59,130,246,0.1)]",
          borderClass: "border-[rgba(59,130,246,0.2)]",
          textClass: "text-[#60a5fa]",
          iconClass: "text-[#60a5fa]",
          ariaRole: "status",
          ariaLive: "polite",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          bgClass: "bg-[rgba(245,158,11,0.1)]",
          borderClass: "border-[rgba(245,158,11,0.2)]",
          textClass: "text-[#fbbf24]",
          iconClass: "text-[#fbbf24]",
          ariaRole: "alert",
          ariaLive: "assertive",
        };
      case "blocking":
        return {
          icon: ShieldAlert,
          bgClass: "bg-[rgba(239,68,68,0.1)]",
          borderClass: "border-[rgba(239,68,68,0.2)]",
          textClass: "text-[#f87171]",
          iconClass: "text-[#f87171]",
          ariaRole: "alert",
          ariaLive: "assertive",
        };
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      id={id}
      role="region"
      aria-label="Compliance holds"
    >
      {holds.map((hold) => {
        const config = getSeverityConfig(hold.severity);
        const Icon = config.icon;

        return (
          <div
            key={hold.id}
            className={`relative flex items-start gap-3 p-4 rounded-lg border ${config.bgClass} ${config.borderClass} ${config.textClass} animate-fade-in`}
            role={config.ariaRole}
            aria-live={config.ariaLive}
            aria-atomic="true"
          >
            <Icon
              size={20}
              className={config.iconClass}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm mb-1">{hold.title}</p>
              <p className="text-sm opacity-90">{hold.message}</p>
            </div>
            {hold.canDismiss && onDismiss && (
              <button
                onClick={() => onDismiss(hold.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={`Dismiss ${hold.title}`}
                type="button"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
