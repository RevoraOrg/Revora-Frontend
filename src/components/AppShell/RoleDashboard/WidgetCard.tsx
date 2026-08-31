// src/components/AppShell/RoleDashboard/WidgetCard.tsx
//
// Shared dashboard widget shell — every widget cell renders through this card so
// the header, loading, empty, error, and ready surfaces stay identical across
// the three role variants. The widget body (children) is rendered by
// DashboardWidgetContent for the ready state only.

import React from 'react';
import './WidgetCard.css';
import type {
  DashboardSlot,
  DashboardWidgetStatus,
} from './roleDashboard.types';

const STATUS_LABELS: Record<DashboardWidgetStatus, string> = {
  loading: 'Loading',
  error: 'Unavailable',
  empty: 'No data',
  ready: 'Ready',
};

export interface WidgetCardProps {
  id: string;
  title: string;
  slot: DashboardSlot;
  status: DashboardWidgetStatus;
  /** Shown when `status === 'empty'`. */
  emptyMessage?: string;
  /** Shown when `status === 'error'`. */
  errorMessage?: string;
  children?: React.ReactNode;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  id,
  title,
  slot,
  status,
  emptyMessage,
  errorMessage = 'This widget could not be loaded right now.',
  children,
}) => {
  const headingId = `rd-widget-title-${id}`;

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="rd-widget__skeleton" role="status" aria-label={`Loading ${title}`}>
            <span className="rd-skel rd-skel--lg" />
            <span className="rd-skel rd-skel--md" />
          </div>
        );
      case 'error':
        return (
          <div className="rd-widget__error" role="alert" aria-label={`${title} error`}>
            <span className="rd-widget__error-icon" aria-hidden="true">
              ⚠
            </span>
            <span>{errorMessage}</span>
          </div>
        );
      case 'empty':
        return (
          <div className="rd-widget__empty" role="status">
            <span className="rd-widget__empty-title">Nothing here yet</span>
            <span className="rd-widget__empty-body">
              {emptyMessage ?? 'No data available yet.'}
            </span>
          </div>
        );
      case 'ready':
      default:
        return children;
    }
  };

  return (
    <article
      className={`rd-widget rd-slot--${slot}`}
      data-widget-id={id}
      aria-labelledby={headingId}
      aria-busy={status === 'loading'}
    >
      <header className="rd-widget__header">
        <h2 id={headingId} className="rd-widget__title">
          {title}
        </h2>
        {status !== 'ready' && (
          <span className={`rd-widget__status rd-status--${status}`}>
            {STATUS_LABELS[status]}
          </span>
        )}
      </header>
      <div className="rd-widget__body">{renderBody()}</div>
    </article>
  );
};

export default WidgetCard;