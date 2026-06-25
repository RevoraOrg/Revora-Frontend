import React, { useEffect, useMemo, useRef, useState } from 'react';

type ChannelKey = 'inApp' | 'email' | 'sms';
type CategoryKey = 'distribution' | 'report' | 'compliance' | 'governance';

export type NotificationPreferencesValue = {
  matrix: Record<CategoryKey, Record<ChannelKey, boolean>>;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    timeZone: string;
  };
};

const CATEGORIES: Array<{ key: CategoryKey; label: string; description?: string }> = [
  { key: 'distribution', label: 'Distribution' },
  { key: 'report', label: 'Report' },
  { key: 'compliance', label: 'Compliance' },
  { key: 'governance', label: 'Governance' },
];

const CHANNELS: Array<{ key: ChannelKey; label: string }> = [
  { key: 'inApp', label: 'In-App' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

function buildDefaultValue(timeZone: string): NotificationPreferencesValue {
  const emptyMatrix = CATEGORIES.reduce((acc, c) => {
    acc[c.key] = {
      inApp: false,
      email: false,
      sms: false,
    };
    return acc;
  }, {} as Record<CategoryKey, Record<ChannelKey, boolean>>);

  return {
    matrix: emptyMatrix,
    quietHours: {
      enabled: false,
      // Reasonable defaults; app can override via controlled props.
      startTime: '22:00',
      endTime: '07:00',
      timeZone,
    },
  };
}

function normalizeTimeString(v: string): string {
  // Ensure we only keep HH:mm.
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
  return m ? `${m[1]}:${m[2]}` : v;
}

function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function CheckboxCell(props: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  describedBy?: string;
  disabled?: boolean;
}) {
  const { id, checked, onChange, label, describedBy, disabled } = props;

  return (
    <div className="flex items-center justify-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        aria-describedby={describedBy}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-60"
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
    </div>
  );
}

function useIndeterminateCheckbox(isAll: boolean, isNone: boolean) {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    // indeterminate is supported on HTMLInputElement.
    ref.current.indeterminate = !isAll && !isNone;
  }, [isAll, isNone]);

  return ref;
}

function AccordionItem(props: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  headerId: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const { title, isOpen, onToggle, headerId, children, rightSlot } = props;

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] overflow-hidden">
      <button
        type="button"
        className="w-full px-4 py-3 flex items-center justify-between gap-3"
        onClick={onToggle}
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-controls={`${headerId}-region`}
      >
        <span className="text-sm font-semibold text-text-main">{title}</span>
        {rightSlot ? <span className="flex items-center">{rightSlot}</span> : <span />}
      </button>
      {isOpen && (
        <div
          id={`${headerId}-region`}
          role="region"
          aria-labelledby={headerId}
          className="px-4 pb-4 pt-1"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export type NotificationPreferencesProps = {
  value?: NotificationPreferencesValue;
  onChange?: (next: NotificationPreferencesValue) => void;
  /** Optional heading shown above both matrix and quiet hours sections. */
  title?: string;
};

export default function NotificationPreferences(props: NotificationPreferencesProps) {
  const { value, onChange, title = 'Notification Preferences' } = props;

  const [internalTZ] = useState(() => getLocalTimeZone());
  const [internalValue, setInternalValue] = useState<NotificationPreferencesValue>(() =>
    buildDefaultValue(internalTZ),
  );

  // Keep internal state in sync if controlled value changes.
  useEffect(() => {
    if (!value) return;
    setInternalValue(value);
  }, [value]);

  const mergedValue = value ?? internalValue;

  const setNextValue = (next: NotificationPreferencesValue) => {
    if (onChange) onChange(next);
    else setInternalValue(next);
  };

  const tzLabel = mergedValue?.quietHours?.timeZone || internalTZ;

  const isControlled = !!value;
  void isControlled;

  // Track accordion open state for mobile usability.
  const [openCategory, setOpenCategory] = useState<CategoryKey | null>('distribution');

  const matrix = mergedValue.matrix;

  const allSelectedByChannel = useMemo(() => {
    const res: Record<ChannelKey, { isAll: boolean; isNone: boolean }> = {
      inApp: { isAll: true, isNone: true },
      email: { isAll: true, isNone: true },
      sms: { isAll: true, isNone: true },
    };

    for (const ch of CHANNELS) {
      let any = false;
      let all = true;
      for (const cat of CATEGORIES) {
        const v = matrix[cat.key]?.[ch.key] ?? false;
        any = any || v;
        all = all && v;
      }
      res[ch.key] = { isAll: all, isNone: !any };
    }
    return res;
  }, [matrix]);

  const setChannelForAllCategories = (channel: ChannelKey, enabled: boolean) => {
    const nextMatrix = { ...matrix };
    for (const cat of CATEGORIES) {
      nextMatrix[cat.key] = { ...nextMatrix[cat.key], [channel]: enabled };
    }
    setNextValue({ ...mergedValue, matrix: nextMatrix });
  };

  const setCategoryForAllChannels = (category: CategoryKey, enabled: boolean) => {
    const nextMatrix = { ...matrix };
    const catRow = nextMatrix[category];
    nextMatrix[category] = {
      ...catRow,
      inApp: enabled,
      email: enabled,
      sms: enabled,
    };
    setNextValue({ ...mergedValue, matrix: nextMatrix });
  };

  const setCell = (category: CategoryKey, channel: ChannelKey, enabled: boolean) => {
    const nextMatrix = { ...matrix };
    nextMatrix[category] = { ...nextMatrix[category], [channel]: enabled };
    setNextValue({ ...mergedValue, matrix: nextMatrix });
  };

  const quietEnabled = mergedValue.quietHours.enabled;

  const setQuiet = (patch: Partial<NotificationPreferencesValue['quietHours']>) => {
    setNextValue({
      ...mergedValue,
      quietHours: {
        ...mergedValue.quietHours,
        ...patch,
        startTime:
          patch.startTime !== undefined ? normalizeTimeString(patch.startTime) : mergedValue.quietHours.startTime,
        endTime:
          patch.endTime !== undefined ? normalizeTimeString(patch.endTime) : mergedValue.quietHours.endTime,
      },
    });
  };

  return (
    <section className="w-full" aria-label="Notification Preferences">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-main">{title}</h2>
        <p className="text-sm text-muted mt-1">
          Choose how you receive updates and configure quiet hours for reduced notifications.
        </p>
      </div>

      {/* Matrix - Desktop */}
      <div className="hidden md:block" aria-label="Notification Preferences Matrix">
        <div className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] p-4">
          <div className="grid" style={{ gridTemplateColumns: 'minmax(10rem, 1.4fr) repeat(3, minmax(6rem, 1fr))' }}>
            {/* Column headers */}
            <div className="text-sm font-semibold text-text-main" aria-hidden="true" />
            {CHANNELS.map((ch) => {
              const id = `np-col-${ch.key}`;
              const { isAll, isNone } = allSelectedByChannel[ch.key];
              const indRef = useIndeterminateCheckbox(isAll, isNone);
              return (
                <div key={ch.key} className="flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <input
                      ref={indRef}
                      id={id}
                      type="checkbox"
                      checked={isAll}
                      onChange={(e) => setChannelForAllCategories(ch.key, e.target.checked)}
                      aria-label={`Toggle ${ch.label} notifications for all categories`}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor={id} className="text-sm font-medium text-text-main cursor-pointer">
                      {ch.label}
                    </label>
                  </div>
                </div>
              );
            })}

            {/* Rows */}
            {CATEGORIES.map((cat) => {
              const rowCells = matrix[cat.key];
              const rowAny = Object.values(rowCells ?? {}).some(Boolean);
              const rowAll = Object.values(rowCells ?? {}).every(Boolean);
              const rowIndRef = useIndeterminateCheckbox(rowAll, !rowAny);

              const rowToggleLabel = `Toggle all channels for ${cat.label}`;

              return (
                <React.Fragment key={cat.key}>
                  <div className="flex items-center justify-between gap-3 pr-2">
                    <span className="text-sm font-semibold text-text-main">{cat.label}</span>
                    <input
                      ref={rowIndRef}
                      type="checkbox"
                      checked={rowAll}
                      onChange={(e) => setCategoryForAllChannels(cat.key, e.target.checked)}
                      aria-label={rowToggleLabel}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>

                  {CHANNELS.map((ch) => {
                    const cellChecked = !!matrix[cat.key]?.[ch.key];
                    const cellId = `np-${cat.key}-${ch.key}`;
                    return (
                      <CheckboxCell
                        key={ch.key}
                        id={cellId}
                        checked={cellChecked}
                        onChange={(next) => setCell(cat.key, ch.key, next)}
                        label={`${cat.label}: ${ch.label}`}
                        disabled={false}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Matrix - Mobile (Accordion per category) */}
      <div className="md:hidden" aria-label="Notification Preferences Matrix (mobile)">
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const rowCells = matrix[cat.key];
            const rowAny = Object.values(rowCells ?? {}).some(Boolean);
            const rowAll = Object.values(rowCells ?? {}).every(Boolean);
            const rowIndRef = useIndeterminateCheckbox(rowAll, !rowAny);

            const rowToggleLabel = `Toggle all channels for ${cat.label}`;

            return (
              <AccordionItem
                key={cat.key}
                title={cat.label}
                isOpen={openCategory === cat.key}
                onToggle={() => setOpenCategory(openCategory === cat.key ? null : cat.key)}
                headerId={`np-acc-${cat.key}`}
                rightSlot={
                  <input
                    ref={rowIndRef}
                    type="checkbox"
                    checked={rowAll}
                    onChange={(e) => setCategoryForAllChannels(cat.key, e.target.checked)}
                    aria-label={rowToggleLabel}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                }
              >
                <div className="grid grid-cols-1 gap-2" role="group" aria-label={`${cat.label} channel preferences`}>
                  {CHANNELS.map((ch) => {
                    const cellChecked = !!matrix[cat.key]?.[ch.key];
                    const cellId = `np-m-${cat.key}-${ch.key}`;
                    return (
                      <div key={ch.key} className="flex items-center justify-between gap-3">
                        <label htmlFor={cellId} className="text-sm font-medium text-text-main">
                          {ch.label}
                        </label>
                        <input
                          id={cellId}
                          type="checkbox"
                          checked={cellChecked}
                          onChange={(e) => setCell(cat.key, ch.key, e.target.checked)}
                          aria-label={`${cat.label}: ${ch.label}`}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            );
          })}

          {/* Column bulk toggles on mobile */}
          <div className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] p-4" aria-label="Bulk channel toggles">
            <div className="text-sm font-semibold text-text-main mb-3">Bulk toggles</div>
            <div className="grid grid-cols-1 gap-2">
              {CHANNELS.map((ch) => {
                const id = `np-m-col-${ch.key}`;
                const { isAll, isNone } = allSelectedByChannel[ch.key];
                const indRef = useIndeterminateCheckbox(isAll, isNone);
                return (
                  <div key={ch.key} className="flex items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm font-medium text-text-main">
                      {ch.label}
                    </label>
                    <input
                      ref={indRef}
                      id={id}
                      type="checkbox"
                      checked={isAll}
                      onChange={(e) => setChannelForAllCategories(ch.key, e.target.checked)}
                      aria-label={`Toggle ${ch.label} notifications for all categories`}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="mt-5 rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(15,23,42,0.35)] p-4" aria-label="Quiet Hours Scheduler">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-main">Quiet Hours</h3>
            <p className="text-sm text-muted mt-1">
              When enabled, notifications can be reduced during your selected time range.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="np-quiet-enabled"
              type="checkbox"
              checked={quietEnabled}
              onChange={(e) => setQuiet({ enabled: e.target.checked })}
              aria-label="Enable quiet hours"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="np-quiet-enabled" className="text-sm font-medium text-text-main cursor-pointer">
              Enable quiet hours
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="np-quiet-start" className="text-sm font-medium text-text-muted">
              Start Time
            </label>
            <input
              id="np-quiet-start"
              type="time"
              value={mergedValue.quietHours.startTime}
              onChange={(e) => setQuiet({ startTime: e.target.value })}
              disabled={!quietEnabled}
              aria-label="Quiet hours start time"
              className="mt-2 w-full rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(2,6,23,0.6)] px-3 py-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="np-quiet-end" className="text-sm font-medium text-text-muted">
              End Time
            </label>
            <input
              id="np-quiet-end"
              type="time"
              value={mergedValue.quietHours.endTime}
              onChange={(e) => setQuiet({ endTime: e.target.value })}
              disabled={!quietEnabled}
              aria-label="Quiet hours end time"
              className="mt-2 w-full rounded-xl border border-[rgba(148,163,184,0.15)] bg-[rgba(2,6,23,0.6)] px-3 py-2 text-text-main focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-3 text-xs text-muted">
          Time zone: <span className="text-text-main font-medium">{tzLabel}</span>
        </div>
      </div>
    </section>
  );
}

