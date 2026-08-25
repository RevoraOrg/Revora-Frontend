import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, AlertTriangle, X } from "lucide-react";
import { useLocation } from "react-router-dom";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecoveryVariant = "form" | "upload" | "payout";

export interface RecoveryFrame {
  page: string;
  timestamp: number;
  payload: unknown;
  /**
   * Optional declared context for the interrupted task. When present it
   * wins over `variantFromPage` URL inference, giving pages exact control
   * over the banner copy and CTA.
   */
  variant?: RecoveryVariant;
}

export interface ResumeRecoveryBannerProps {
  /** Number of days before a cached recovery frame expires. Default: 7. */
  expirationDays?: number;
  /** Optional override for the active page key. Falls back to pathname. */
  activePage?: string;
  /** Callback fired when the user clicks the primary resume CTA. The stored frame is consumed (cleared) after this fires. */
  onResume: (page: string, payload: unknown) => void;
  /** Optional external className. */
  className?: string;
  /** Optional id for the live-region container. */
  id?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

const STORAGE_PREFIX = "recovery_state_";
const DISMISS_PREFIX = "recovery_dismissed_";

// ---------------------------------------------------------------------------
// Variant copy
// ---------------------------------------------------------------------------

const VARIANT_COPY: Record<
  RecoveryVariant,
  { heading: string; description: string; cta: string }
> = {
  form: {
    heading: "Your form draft was saved",
    description:
      "We detected an incomplete form submission. Resume where you left off to avoid re-entering data.",
    cta: "Resume form",
  },
  upload: {
    heading: "Your upload was interrupted",
    description:
      "A file upload did not complete. You can resume the upload without starting over.",
    cta: "Resume upload",
  },
  payout: {
    heading: "Your payout setup was interrupted",
    description:
      "We saved your payout configuration. Resume to complete the setup.",
    cta: "Resume setup",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storageKey(page: string): string {
  return `${STORAGE_PREFIX}${page}`;
}

function dismissKey(page: string): string {
  return `${DISMISS_PREFIX}${page}`;
}

/**
 * Read a recovery frame from localStorage. Returns `null` if missing,
 * expired, or flagged as permanently dismissed.
 */
export function readRecoveryFrame(
  page: string,
  expirationDays: number,
): RecoveryFrame | null {
  if (typeof window === "undefined") return null;

  // Permanently dismissed – never show again.
  try {
    if (localStorage.getItem(dismissKey(page)) === "true") return null;
  } catch {
    return null;
  }

  try {
    const raw = localStorage.getItem(storageKey(page));
    if (!raw) return null;

    const frame: RecoveryFrame = JSON.parse(raw);
    if (
      !frame ||
      typeof frame.timestamp !== "number" ||
      typeof frame.page !== "string"
    ) {
      return null;
    }

    // Expiration barrier.
    if (Date.now() - frame.timestamp > expirationDays * MS_PER_DAY) {
      localStorage.removeItem(storageKey(page));
      return null;
    }

    return frame;
  } catch {
    localStorage.removeItem(storageKey(page));
    return null;
  }
}

/**
 * Persist a recovery frame into localStorage.
 */
export function saveRecoveryFrame(frame: RecoveryFrame): void {
  try {
    localStorage.setItem(storageKey(frame.page), JSON.stringify(frame));
  } catch {
    // Storage full or unavailable – degrade silently.
  }
}

/**
 * Remove the cached recovery frame for a page without touching the
 * permanent-dismiss flag. A future failure can save a fresh frame.
 */
export function clearRecoveryFrame(page: string): void {
  try {
    localStorage.removeItem(storageKey(page));
  } catch {
    // Ignore.
  }
}

/**
 * Permanently dismiss recovery for a given page.
 */
export function dismissRecoveryForever(page: string): void {
  try {
    localStorage.setItem(dismissKey(page), "true");
    localStorage.removeItem(storageKey(page));
  } catch {
    // Ignore.
  }
}

/** Whether recovery prompts have been permanently disabled for a page. */
export function isDismissedForever(page: string): boolean {
  try {
    return localStorage.getItem(dismissKey(page)) === "true";
  } catch {
    return false;
  }
}

/**
 * Re-enable recovery prompts for a page after a permanent dismissal
 * (e.g. from a support or preferences flow).
 */
export function resetDismissedForever(page: string): void {
  try {
    localStorage.removeItem(dismissKey(page));
  } catch {
    // Ignore.
  }
}

/**
 * Derive a RecoveryVariant from a pathname string.
 */
export function variantFromPage(page: string): RecoveryVariant {
  if (page.includes("upload")) return "upload";
  if (page.includes("payout")) return "payout";
  return "form";
}

/**
 * Human-readable relative age for a saved frame ("2 hours ago").
 */
export function formatRelativeAge(timestamp: number, now: number = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diffMinutes = Math.round((timestamp - now) / 60_000);
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round((timestamp - now) / 3_600_000);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(Math.round((timestamp - now) / MS_PER_DAY), "day");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ResumeRecoveryBanner — the inline "resume where you left off" pattern.
 *
 * When users return to a page after an error interrupted their task, this
 * banner appears inline at the top of that page's content with enough context
 * to recognise the situation and a single primary CTA to continue. Cached
 * state lives in `localStorage` behind a timestamp-based expiration barrier
 * (N days, default 7).
 *
 * Dismissal has two tiers:
 * - **✕ / Dismiss for now** — discards only the current frame; the next
 *   failed attempt saves a fresh one and the banner may reappear.
 * - **Don't show again** — permanently opts the page out of recovery prompts
 *   (`recovery_dismissed_<page>` flag). Reversible via `resetDismissedForever`.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Container uses `role="status"` (`aria-live="polite"`, `aria-atomic="true"`),
 *   consistent with the UndoBanner live-region convention.
 * - Every interactive element carries an explicit accessible name; the icon
 *   and decorative elements are `aria-hidden`.
 * - Color contrast meets 4.5:1 minimum against the dark surface.
 * - Fully keyboard operable with visible focus rings. If focus falls back to
 *   `<body>` when the banner unmounts, focus returns to the element focused
 *   before the banner appeared (same contract as the Undo keyboard shortcut).
 */
export const ResumeRecoveryBanner: React.FC<ResumeRecoveryBannerProps> = ({
  expirationDays = 7,
  activePage,
  onResume,
  className = "",
  id = "resume-recovery-banner",
}) => {
  const location = useLocation();
  const currentPage = activePage ?? location.pathname;

  const [frame, setFrame] = useState<RecoveryFrame | null>(null);

  // Focus-return origin, captured when the banner first appears.
  const originRef = useRef<HTMLElement | null>(null);

  // -----------------------------------------------------------------------
  // 1. LocalStorage seeding & expiration check
  // -----------------------------------------------------------------------
  useEffect(() => {
    const matched = readRecoveryFrame(currentPage, expirationDays);
    setFrame(matched);
  }, [currentPage, expirationDays]);

  // Capture the origin element on mount so focus can be restored there
  // if the banner's unmount drops focus back to <body>.
  useEffect(() => {
    const el = document.activeElement;
    originRef.current =
      el instanceof HTMLElement && el !== document.body ? el : null;
    return () => {
      if (
        document.activeElement === document.body &&
        originRef.current?.isConnected
      ) {
        originRef.current.focus();
      }
    };
  }, []);

  // -----------------------------------------------------------------------
  // 2. Concurrent recovery router gate — only show the frame matching the
  //    active route. If multiple keys were cached we'd filter here.
  // -----------------------------------------------------------------------
  const visibleFrame = useMemo(() => {
    if (!frame) return null;
    // Strict match: only display when the cached page equals the active route.
    if (frame.page !== currentPage) return null;
    return frame;
  }, [frame, currentPage]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------
  const variant: RecoveryVariant = useMemo(() => {
    const declared = visibleFrame?.variant;
    if (declared === "form" || declared === "upload" || declared === "payout") {
      return declared;
    }
    return variantFromPage(currentPage);
  }, [visibleFrame, currentPage]);

  const copy = VARIANT_COPY[variant];

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  /** Consume the frame and continue the interrupted task. */
  const handleResume = useCallback(() => {
    if (!visibleFrame) return;
    onResume(visibleFrame.page, visibleFrame.payload);
    clearRecoveryFrame(currentPage);
    setFrame(null);
  }, [visibleFrame, onResume, currentPage]);

  /** Discard only the current frame — a future failure can save a fresh one. */
  const handleDismiss = useCallback(() => {
    clearRecoveryFrame(currentPage);
    setFrame(null);
  }, [currentPage]);

  /** Permanently opt this page out of recovery prompts. */
  const handleDismissForever = useCallback(() => {
    dismissRecoveryForever(currentPage);
    setFrame(null);
  }, [currentPage]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!visibleFrame) return null;

  const age = Date.now() - visibleFrame.timestamp;
  const remainingDays = Math.max(
    0,
    Math.ceil((expirationDays * MS_PER_DAY - age) / MS_PER_DAY),
  );

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Recovery available: ${copy.heading}`}
      data-testid="resume-recovery-banner"
      className={`flex flex-col gap-3 rounded-lg border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm text-[#fbbf24] shadow-lg sm:flex-row sm:items-center sm:gap-4 ${className}`}
    >
      {/* Status icon */}
      <AlertTriangle
        size={20}
        className="flex-shrink-0 text-[#fbbf24]"
        aria-hidden="true"
      />

      {/* Context copy */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#fbbf24]" data-testid="resume-recovery-heading">
          {copy.heading}
        </p>
        <p className="mt-0.5 text-xs text-[#fbbf24]/80">
          {copy.description}
        </p>
        <p className="mt-1 text-xs text-[#fbbf24]/70 tabular-nums">
          Saved {formatRelativeAge(visibleFrame.timestamp)}
          {remainingDays > 0 && (
            <>
              {" · "}
              Available for {remainingDays} more day{remainingDays !== 1 ? "s" : ""}
            </>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {/* Primary CTA */}
        <button
          type="button"
          onClick={handleResume}
          aria-label={`${copy.cta}: ${copy.heading}`}
          data-testid="resume-recovery-resume"
          className="flex items-center gap-1.5 rounded-md bg-[#f59e0b] px-3 py-1.5 text-xs font-semibold text-[#1f2937] hover:bg-[#d97706] focus:outline-none focus:ring-2 focus:ring-[#f59e0b] focus:ring-offset-2 focus:ring-offset-[#111827] transition-colors"
        >
          <RotateCcw size={14} aria-hidden="true" />
          {copy.cta}
        </button>

        {/* Permanent opt-out */}
        <button
          type="button"
          onClick={handleDismissForever}
          aria-label={`Don't show recovery suggestions for this page again`}
          data-testid="resume-recovery-dismiss-forever"
          className="rounded-md px-2 py-1.5 text-xs font-medium text-[#fbbf24]/90 hover:bg-white/10 hover:text-[#fbbf24] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/60 transition-colors"
        >
          Don&rsquo;t show again
        </button>

        {/* Soft dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={`Dismiss for now: ${copy.heading}`}
          data-testid="resume-recovery-dismiss"
          className="rounded p-1 text-[#fbbf24]/60 hover:bg-white/10 hover:text-[#fbbf24] focus:outline-none focus:ring-2 focus:ring-[#fbbf24]/50 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
