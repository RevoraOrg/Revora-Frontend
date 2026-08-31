import React, { useMemo } from "react";
import { Clock, Info, Lock, Unlock } from "lucide-react";
import { useCountdown } from "../../hooks/useCountdown";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import "./LockupStatusCard.css";

export type LockupPhaseKind = "cliff" | "vesting";

export interface LockupPhase {
  id: string;
  kind: LockupPhaseKind;
  label: string;
  description: string;
  startAt: string;
  endAt: string;
  amount: number;
}

export interface LockupSchedule {
  totalLocked: number;
  unlockedAmount: number;
  cliffEndAt?: string;
  vestingEndAt?: string;
  phases: LockupPhase[];
}

export type LockupCardStatus = "none" | "locked" | "cliff" | "vesting" | "unlocked";

export interface LockupStatusCardProps {
  schedule: LockupSchedule;
  compact?: boolean;
}

const STATUS_COPY: Record<LockupCardStatus, string> = {
  none: "No lockup",
  locked: "Locked",
  cliff: "Cliff in progress",
  vesting: "Vesting",
  unlocked: "Fully unlocked",
};

export function deriveLockupStatus(phases: LockupPhase[], nowMs: number): LockupCardStatus {
  if (phases.length === 0) {
    return "none";
  }
  if (phases.every((phase) => new Date(phase.endAt).getTime() <= nowMs)) {
    return "unlocked";
  }
  if (
    phases.some(
      (phase) =>
        phase.kind === "cliff" &&
        new Date(phase.startAt).getTime() <= nowMs &&
        nowMs < new Date(phase.endAt).getTime(),
    )
  ) {
    return "cliff";
  }
  if (
    phases.some(
      (phase) =>
        phase.kind === "vesting" &&
        new Date(phase.startAt).getTime() <= nowMs &&
        nowMs < new Date(phase.endAt).getTime(),
    )
  ) {
    return "vesting";
  }
  return "locked";
}

export function findNextMilestone(phases: LockupPhase[], nowMs: number): LockupPhase | null {
  const upcoming = phases
    .filter((phase) => new Date(phase.endAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
  return upcoming.length > 0 ? upcoming[0] : null;
}

export function phaseProgress(
  phase: LockupPhase,
  nowMs: number,
): "pending" | "active" | "completed" {
  const start = new Date(phase.startAt).getTime();
  const end = new Date(phase.endAt).getTime();
  if (nowMs >= end) {
    return "completed";
  }
  if (nowMs >= start) {
    return "active";
  }
  return "pending";
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export const LockupStatusCard: React.FC<LockupStatusCardProps> = ({ schedule, compact = false }) => {
  const reducedMotion = useReducedMotion();
  const phases = useMemo(
    () =>
      [...schedule.phases].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [schedule.phases],
  );
  const nowMs = Date.now();
  const status = deriveLockupStatus(phases, nowMs);
  const milestone = findNextMilestone(phases, nowMs);
  const countdownTarget = useMemo(
    () => (milestone ? new Date(milestone.endAt) : new Date()),
    [milestone],
  );
  const countdown = useCountdown(countdownTarget);

  const totalPhaseAmount = phases.reduce((sum, phase) => sum + phase.amount, 0);
  const unlockedPercent =
    schedule.totalLocked > 0
      ? Math.min(100, Math.round((schedule.unlockedAmount / schedule.totalLocked) * 100))
      : 0;

  return (
    <section
      className={`lockup-card glass-card ${compact ? "lockup-card--compact" : ""}`}
      aria-labelledby="lockup-card-title"
      data-testid="lockup-status-card"
      data-reduced-motion={reducedMotion ? "true" : undefined}
    >
      <div className="lockup-card-header">
        <div className="lockup-card-heading">
          {status === "unlocked" || status === "none" ? (
            <Unlock size={18} aria-hidden="true" className="lockup-card-icon" />
          ) : (
            <Lock size={18} aria-hidden="true" className="lockup-card-icon" />
          )}
          <div>
            <p className="lockup-eyebrow">Lockup status</p>
            <h3 id="lockup-card-title" className="lockup-card-title">
              Investor lockup schedule
            </h3>
          </div>
        </div>
        <span className={`lockup-pill lockup-pill--${status}`} data-testid="lockup-status-label">
          {STATUS_COPY[status]}
        </span>
      </div>

      <p className="lockup-sr-only" role="status" aria-live="polite">
        {STATUS_COPY[status]}
      </p>

      <div className="lockup-metrics">
        <div className="lockup-metric">
          <p className="lockup-metric-label">Total locked</p>
          <p className="lockup-metric-value" data-testid="lockup-total-locked">
            {formatCurrency(schedule.totalLocked)}
          </p>
        </div>
        <div className="lockup-metric">
          <p className="lockup-metric-label">Unlocked</p>
          <p className="lockup-metric-value" data-testid="lockup-unlocked">
            {formatCurrency(schedule.unlockedAmount)}
          </p>
        </div>
      </div>

      {milestone !== null && (
        <div className="lockup-countdown" data-testid="lockup-countdown">
          <div className="lockup-countdown-heading">
            <Clock size={14} aria-hidden="true" />
            <span>Next unlock</span>
          </div>
          <div
            className="lockup-countdown-value"
            role="timer"
            aria-label={`${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes until ${milestone.label.toLowerCase()}`}
            data-testid="lockup-countdown-timer"
          >
            {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
          </div>
          <p className="lockup-countdown-milestone" data-testid="lockup-countdown-milestone">
            {milestone.label}
          </p>
        </div>
      )}

      <div className="lockup-timeline">
        <p className="lockup-metric-label">Unlock timeline</p>
        <div
          className="lockup-timeline-track"
          role="progressbar"
          aria-label="Unlocked share"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={unlockedPercent}
          data-testid="lockup-timeline"
        >
          {phases.map((phase) => {
            const progress = phaseProgress(phase, nowMs);
            const width = totalPhaseAmount > 0 ? (phase.amount / totalPhaseAmount) * 100 : 0;
            return (
              <div
                key={phase.id}
                className={`lockup-phase lockup-phase--${progress}`}
                style={{ width: `${width}%` }}
                data-testid={`lockup-phase-${phase.id}`}
              />
            );
          })}
        </div>

        {phases.length > 0 && (
          <ul className="lockup-phase-list">
            {phases.map((phase) => {
              const tooltipId = `lockup-tooltip-${phase.id}`;
              return (
                <li key={phase.id}>
                  <button
                    type="button"
                    className="lockup-phase-trigger"
                    aria-describedby={tooltipId}
                  >
                    <Info size={12} aria-hidden="true" />
                    <span>{phase.label}</span>
                  </button>
                  <span id={tooltipId} role="tooltip" className="lockup-phase-tooltip">
                    {phase.description}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default LockupStatusCard;
