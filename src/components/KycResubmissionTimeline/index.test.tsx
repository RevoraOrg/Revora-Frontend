import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import * as TimelineIndex from './index';
import {
  KycResubmissionTimeline,
  KycReviewStatus,
  KycResubmissionTimelineProps,
  addBusinessDays,
  businessDaysBetween,
  getTurnaroundMessage,
  isBusinessDay,
} from './index';
import * as DirectModule from './KycResubmissionTimeline';

expect.extend(toHaveNoViolations);

describe('KycResubmissionTimeline index module exports', () => {
  it('exposes all expected functions and components directly from the index barrel', () => {
    expect(typeof TimelineIndex.KycResubmissionTimeline).toBe('function');
    expect(typeof TimelineIndex.addBusinessDays).toBe('function');
    expect(typeof TimelineIndex.businessDaysBetween).toBe('function');
    expect(typeof TimelineIndex.getTurnaroundMessage).toBe('function');
    expect(typeof TimelineIndex.isBusinessDay).toBe('function');

    // Confirm that index exports are referentially identical to the underlying module exports
    expect(TimelineIndex.KycResubmissionTimeline).toBe(DirectModule.KycResubmissionTimeline);
    expect(TimelineIndex.addBusinessDays).toBe(DirectModule.addBusinessDays);
    expect(TimelineIndex.businessDaysBetween).toBe(DirectModule.businessDaysBetween);
    expect(TimelineIndex.getTurnaroundMessage).toBe(DirectModule.getTurnaroundMessage);
    expect(TimelineIndex.isBusinessDay).toBe(DirectModule.isBusinessDay);
  });

  it('allows importing typescript types without compile-time or runtime issues', () => {
    const status: KycReviewStatus = 'under-review';
    const props: KycResubmissionTimelineProps = {
      status,
      submittedAt: new Date(2026, 6, 24, 10, 0, 0),
    };
    expect(props.status).toBe('under-review');
  });
});

describe('Exported utilities - representative invalid inputs and boundary handling', () => {
  describe('isBusinessDay', () => {
    it('accurately identifies weekdays, weekends, and designated holidays', () => {
      // Monday to Friday
      expect(isBusinessDay(new Date(2026, 6, 20))).toBe(true); // Monday
      expect(isBusinessDay(new Date(2026, 6, 21))).toBe(true); // Tuesday
      expect(isBusinessDay(new Date(2026, 6, 22))).toBe(true); // Wednesday
      expect(isBusinessDay(new Date(2026, 6, 23))).toBe(true); // Thursday
      expect(isBusinessDay(new Date(2026, 6, 24))).toBe(true); // Friday

      // Saturday & Sunday
      expect(isBusinessDay(new Date(2026, 6, 25))).toBe(false); // Saturday
      expect(isBusinessDay(new Date(2026, 6, 26))).toBe(false); // Sunday

      // Weekday holiday
      expect(isBusinessDay(new Date(2026, 6, 22), [new Date(2026, 6, 22)])).toBe(false);

      // Holiday on weekend
      expect(isBusinessDay(new Date(2026, 6, 25), [new Date(2026, 6, 25)])).toBe(false);
    });

    it('handles holidays provided as Date instances, timestamps, or date strings', () => {
      const holidayDate = new Date(2026, 6, 22);
      expect(isBusinessDay(new Date(2026, 6, 22), [holidayDate])).toBe(false);
      expect(isBusinessDay(new Date(2026, 6, 22), ['2026-07-22T10:00:00'])).toBe(false);
    });

    it('works with default empty holidays array', () => {
      expect(isBusinessDay(new Date(2026, 6, 22))).toBe(true);
      expect(isBusinessDay(new Date(2026, 6, 26))).toBe(false);
    });

    it('throws deterministic error when holiday contains an invalid date', () => {
      expect(() => isBusinessDay(new Date(2026, 6, 22), ['invalid-holiday-date'])).toThrow(
        'KYC timeline received an invalid date'
      );
    });
  });

  describe('addBusinessDays', () => {
    it('adds business days correctly while skipping weekends and holidays', () => {
      // Friday + 1 business day -> Monday
      const plusOne = addBusinessDays(new Date(2026, 6, 24, 10, 0, 0), 1);
      expect([plusOne.getFullYear(), plusOne.getMonth(), plusOne.getDate()]).toEqual([2026, 6, 27]);

      // Friday + 3 business days skipping a Monday holiday -> Thursday
      const plusThreeWithHoliday = addBusinessDays(
        new Date(2026, 6, 24, 10, 0, 0),
        3,
        [new Date(2026, 6, 27)]
      );
      expect([
        plusThreeWithHoliday.getFullYear(),
        plusThreeWithHoliday.getMonth(),
        plusThreeWithHoliday.getDate(),
      ]).toEqual([2026, 6, 30]);
    });

    it('handles boundary days <= 0 by clamping to zero added days', () => {
      const start = new Date(2026, 6, 24, 14, 30, 0);
      const zeroDays = addBusinessDays(start, 0);
      expect([zeroDays.getFullYear(), zeroDays.getMonth(), zeroDays.getDate()]).toEqual([2026, 6, 24]);

      const negativeDays = addBusinessDays(start, -3);
      expect([negativeDays.getFullYear(), negativeDays.getMonth(), negativeDays.getDate()]).toEqual([
        2026, 6, 24,
      ]);
    });

    it('floors fractional business days', () => {
      // 2.8 days floored to 2: Friday + 2 business days -> Tuesday
      const fractional = addBusinessDays(new Date(2026, 6, 24, 10, 0, 0), 2.8);
      expect([fractional.getFullYear(), fractional.getMonth(), fractional.getDate()]).toEqual([
        2026, 6, 28,
      ]);
    });

    it('correctly calculates deadline when starting on a weekend', () => {
      // Saturday + 1 business day -> Monday
      const fromSaturday = addBusinessDays(new Date(2026, 6, 25, 10, 0, 0), 1);
      expect([fromSaturday.getFullYear(), fromSaturday.getMonth(), fromSaturday.getDate()]).toEqual([
        2026, 6, 27,
      ]);

      // Sunday + 1 business day -> Monday
      const fromSunday = addBusinessDays(new Date(2026, 6, 26, 10, 0, 0), 1);
      expect([fromSunday.getFullYear(), fromSunday.getMonth(), fromSunday.getDate()]).toEqual([
        2026, 6, 27,
      ]);
    });

    it('throws deterministic error when start date or holidays are invalid', () => {
      expect(() => addBusinessDays('not-a-valid-date', 3)).toThrow(
        'KYC timeline received an invalid date'
      );
      expect(() => addBusinessDays(new Date(2026, 6, 24), 3, ['corrupted-holiday'])).toThrow(
        'KYC timeline received an invalid date'
      );
    });
  });

  describe('businessDaysBetween', () => {
    it('calculates the number of working days between two dates', () => {
      // Monday to Friday of same week = 4 business days between
      expect(
        businessDaysBetween(new Date(2026, 6, 20, 10, 0, 0), new Date(2026, 6, 24, 10, 0, 0))
      ).toBe(4);

      // Friday to next Tuesday (skips weekend) = 2 business days
      expect(
        businessDaysBetween(new Date(2026, 6, 24, 10, 0, 0), new Date(2026, 6, 28, 10, 0, 0))
      ).toBe(2);

      // Friday to next Tuesday with Monday holiday = 1 business day
      expect(
        businessDaysBetween(
          new Date(2026, 6, 24, 10, 0, 0),
          new Date(2026, 6, 28, 10, 0, 0),
          [new Date(2026, 6, 27)]
        )
      ).toBe(1);
    });

    it('returns 0 when start date is identical to end date', () => {
      expect(
        businessDaysBetween(new Date(2026, 6, 24, 10, 0, 0), new Date(2026, 6, 24, 10, 0, 0))
      ).toBe(0);
    });

    it('returns 0 when start date is after end date', () => {
      expect(
        businessDaysBetween(new Date(2026, 6, 28, 10, 0, 0), new Date(2026, 6, 24, 10, 0, 0))
      ).toBe(0);
    });

    it('throws deterministic error on invalid start, end, or holiday dates', () => {
      expect(() => businessDaysBetween('bad-start', new Date(2026, 6, 24))).toThrow(
        'KYC timeline received an invalid date'
      );
      expect(() => businessDaysBetween(new Date(2026, 6, 20), 'bad-end')).toThrow(
        'KYC timeline received an invalid date'
      );
      expect(() =>
        businessDaysBetween(new Date(2026, 6, 20), new Date(2026, 6, 24), ['invalid-holiday'])
      ).toThrow('KYC timeline received an invalid date');
    });
  });

  describe('getTurnaroundMessage', () => {
    it('returns completed message when status is decision', () => {
      const result = getTurnaroundMessage({
        status: 'decision',
        submittedAt: new Date(2026, 6, 24),
        now: new Date(2026, 6, 30),
      });
      expect(result.overdue).toBe(false);
      expect(result.message).toBe('Review complete. Your decision is ready.');
    });

    it('returns canceled message when status is canceled', () => {
      const result = getTurnaroundMessage({
        status: 'canceled',
        submittedAt: new Date(2026, 6, 24),
        now: new Date(2026, 6, 30),
      });
      expect(result.overdue).toBe(false);
      expect(result.message).toBe('This application was canceled. No further review will take place.');
    });

    it('returns singular overdue message when 1 business day overdue', () => {
      // Submitted Friday 2026-07-24, SLA = 1 business day -> deadline Monday 2026-07-27.
      // Checked Tuesday 2026-07-28 -> 1 business day overdue.
      const result = getTurnaroundMessage({
        status: 'under-review',
        submittedAt: new Date(2026, 6, 24, 10, 0, 0),
        slaBusinessDays: 1,
        now: new Date(2026, 6, 28, 10, 0, 0),
      });
      expect(result.overdue).toBe(true);
      expect(result.message).toBe('Review is 1 business day overdue.');
    });

    it('returns plural overdue message when multiple business days overdue', () => {
      const result = getTurnaroundMessage({
        status: 'under-review',
        submittedAt: new Date(2026, 6, 24, 10, 0, 0),
        slaBusinessDays: 1,
        now: new Date(2026, 6, 30, 10, 0, 0),
      });
      expect(result.overdue).toBe(true);
      expect(result.message).toBe('Review is 3 business days overdue.');
    });

    it('returns today message when deadline is today', () => {
      // Submitted Friday 2026-07-24, SLA = 1 -> deadline Monday 2026-07-27.
      // Checked Monday 2026-07-27.
      const result = getTurnaroundMessage({
        status: 'submitted',
        submittedAt: new Date(2026, 6, 24, 10, 0, 0),
        slaBusinessDays: 1,
        now: new Date(2026, 6, 27, 10, 0, 0),
      });
      expect(result.overdue).toBe(false);
      expect(result.message).toMatch(/^We expect an update today\./);
      expect(result.message).toMatch(/Business days exclude weekends and listed holidays\.$/);
    });

    it('returns singular remaining message when 1 business day remains', () => {
      // Submitted Friday 2026-07-24, SLA = 2 -> deadline Tuesday 2026-07-28.
      // Checked Monday 2026-07-27 -> 1 business day remaining.
      const result = getTurnaroundMessage({
        status: 'under-review',
        submittedAt: new Date(2026, 6, 24, 10, 0, 0),
        slaBusinessDays: 2,
        now: new Date(2026, 6, 27, 10, 0, 0),
      });
      expect(result.overdue).toBe(false);
      expect(result.message).toMatch(/^We expect an update within 1 business day, by Tue, Jul 28\./);
    });

    it('returns weekend note when evaluated on Saturday or Sunday', () => {
      const onSaturday = getTurnaroundMessage({
        status: 'submitted',
        submittedAt: new Date(2026, 6, 24, 10, 0, 0),
        slaBusinessDays: 3,
        now: new Date(2026, 6, 25, 10, 0, 0), // Saturday
      });
      expect(onSaturday.overdue).toBe(false);
      expect(onSaturday.message).toMatch(/Weekends and listed holidays do not count toward review time\.$/);
    });

    it('uses default SLA of 3 business days when slaBusinessDays is omitted', () => {
      const result = getTurnaroundMessage({
        status: 'submitted',
        submittedAt: new Date(2026, 6, 20, 10, 0, 0), // Monday
        now: new Date(2026, 6, 21, 10, 0, 0), // Tuesday
      });
      // 3 business days from Mon Jul 20 -> Thu Jul 23
      expect(result.deadline.getDate()).toBe(23);
      expect(result.message).toMatch(/within 2 business days, by Thu, Jul 23\./);
    });

    it('throws deterministic error when inputs contain invalid dates', () => {
      expect(() =>
        getTurnaroundMessage({
          status: 'submitted',
          submittedAt: 'not-a-valid-date',
        })
      ).toThrow('KYC timeline received an invalid date');

      expect(() =>
        getTurnaroundMessage({
          status: 'submitted',
          submittedAt: new Date(2026, 6, 24),
          now: 'invalid-now',
        })
      ).toThrow('KYC timeline received an invalid date');

      expect(() =>
        getTurnaroundMessage({
          status: 'submitted',
          submittedAt: new Date(2026, 6, 24),
          holidays: ['bad-date'],
        })
      ).toThrow('KYC timeline received an invalid date');
    });
  });
});

describe('KycResubmissionTimeline component - primary state transitions via index export', () => {
  const defaultSubmittedAt = new Date(2026, 6, 24, 10, 0, 0);
  const defaultNow = new Date(2026, 6, 27, 10, 0, 0);

  it('renders submitted initial state with current step and expected turnaround', () => {
    const { container } = render(
      <KycResubmissionTimeline
        status="submitted"
        submittedAt={defaultSubmittedAt}
        now={defaultNow}
      />
    );

    // Section heading
    expect(screen.getByRole('heading', { level: 2, name: /Your resubmission progress/i })).toBeInTheDocument();

    // Status header pill
    const statusPill = container.querySelector('.kyc-resubmission__status');
    expect(statusPill).toHaveTextContent('Submitted');

    // Timeline list inspection
    const timelineList = screen.getByRole('list', { name: /KYC resubmission progress/i });
    expect(timelineList).toBeInTheDocument();

    const steps = timelineList.querySelectorAll('.kyc-resubmission__step');
    expect(steps).toHaveLength(3);

    // Step 0: Submitted (current)
    expect(steps[0]).toHaveClass('kyc-resubmission__step--current');
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).toHaveTextContent('Submitted');
    expect(steps[0]).toHaveTextContent('We received your updated documents.');

    // Step 1: Under review (upcoming)
    expect(steps[1]).toHaveClass('kyc-resubmission__step--upcoming');
    expect(steps[1]).not.toHaveAttribute('aria-current');

    // Step 2: Decision (upcoming)
    expect(steps[2]).toHaveClass('kyc-resubmission__step--upcoming');
    expect(steps[2]).not.toHaveAttribute('aria-current');

    // Turnaround block
    expect(screen.getByRole('status')).toHaveTextContent(/Expected turnaround/i);
    expect(screen.queryByRole('link', { name: /Contact support/i })).not.toBeInTheDocument();
  });

  it('transitions from submitted to under-review state', () => {
    const { container, rerender } = render(
      <KycResubmissionTimeline
        status="submitted"
        submittedAt={defaultSubmittedAt}
        now={defaultNow}
      />
    );

    const reviewDate = new Date(2026, 6, 27, 12, 0, 0);
    rerender(
      <KycResubmissionTimeline
        status="under-review"
        submittedAt={defaultSubmittedAt}
        reviewStartedAt={reviewDate}
        now={defaultNow}
      />
    );

    const statusPill = container.querySelector('.kyc-resubmission__status');
    expect(statusPill).toHaveTextContent('Under review');

    const timelineList = screen.getByRole('list', { name: /KYC resubmission progress/i });
    const steps = timelineList.querySelectorAll('.kyc-resubmission__step');

    // Step 0: Submitted is now complete
    expect(steps[0]).toHaveClass('kyc-resubmission__step--complete');
    expect(steps[0]).not.toHaveAttribute('aria-current');

    // Step 1: Under review is now current
    expect(steps[1]).toHaveClass('kyc-resubmission__step--current');
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[1]).toHaveTextContent('Our compliance team checks your information.');

    // Step 2: Decision remains upcoming
    expect(steps[2]).toHaveClass('kyc-resubmission__step--upcoming');
    expect(steps[2]).not.toHaveAttribute('aria-current');
  });

  it('transitions to decision state with default "Approved" label', () => {
    const { container, rerender } = render(
      <KycResubmissionTimeline
        status="under-review"
        submittedAt={defaultSubmittedAt}
        reviewStartedAt={new Date(2026, 6, 27)}
        now={defaultNow}
      />
    );

    rerender(
      <KycResubmissionTimeline
        status="decision"
        submittedAt={defaultSubmittedAt}
        reviewStartedAt={new Date(2026, 6, 27)}
        decidedAt={new Date(2026, 6, 28)}
        now={new Date(2026, 6, 28)}
      />
    );

    const statusPill = container.querySelector('.kyc-resubmission__status');
    expect(statusPill).toHaveTextContent('Decision');

    const timelineList = screen.getByRole('list', { name: /KYC resubmission progress/i });
    const steps = timelineList.querySelectorAll('.kyc-resubmission__step');

    // Previous steps complete
    expect(steps[0]).toHaveClass('kyc-resubmission__step--complete');
    expect(steps[1]).toHaveClass('kyc-resubmission__step--complete');

    // Decision step current
    expect(steps[2]).toHaveClass('kyc-resubmission__step--current');
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[2]).toHaveTextContent('Decision');

    expect(screen.getByText(/Review complete\. Your decision is ready\./i)).toBeInTheDocument();
  });

  it('transitions to decision state with custom decisionLabel', () => {
    const { container } = render(
      <KycResubmissionTimeline
        status="decision"
        submittedAt={defaultSubmittedAt}
        decidedAt={new Date(2026, 6, 28)}
        decisionLabel="More information needed"
        now={new Date(2026, 6, 28)}
      />
    );

    const statusPill = container.querySelector('.kyc-resubmission__status');
    expect(statusPill).toHaveTextContent('More information needed');

    const timelineList = screen.getByRole('list', { name: /KYC resubmission progress/i });
    const steps = timelineList.querySelectorAll('.kyc-resubmission__step');
    expect(steps[2]).toHaveTextContent('More information needed');

    expect(screen.getByText(/Review complete\. Your decision is ready\./i)).toBeInTheDocument();
  });

  it('transitions to terminal canceled state', () => {
    const { container } = render(
      <KycResubmissionTimeline
        status="canceled"
        submittedAt={defaultSubmittedAt}
        decidedAt={new Date(2026, 6, 28)}
        now={new Date(2026, 6, 28)}
      />
    );

    const statusPill = container.querySelector('.kyc-resubmission__status');
    expect(statusPill).toHaveTextContent('Canceled');

    const timelineList = screen.getByRole('list', { name: /KYC resubmission progress/i });
    const steps = timelineList.querySelectorAll('.kyc-resubmission__step');

    expect(steps[2]).toHaveClass('kyc-resubmission__step--canceled');
    expect(steps[2]).toHaveTextContent('Canceled');
    expect(steps[2]).toHaveTextContent('The application will not be reviewed.');

    expect(
      screen.getByText(/This application was canceled\. No further review will take place\./i)
    ).toBeInTheDocument();
  });

  it('handles overdue state transition by rendering warning banner and support escalation link', () => {
    const { container, rerender } = render(
      <KycResubmissionTimeline
        status="submitted"
        submittedAt={new Date(2026, 6, 20)}
        slaBusinessDays={3}
        now={new Date(2026, 6, 22)}
      />
    );

    expect(container.querySelector('.kyc-resubmission--overdue')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Contact support/i })).not.toBeInTheDocument();

    // Advance now beyond SLA deadline (July 20 + 3 business days -> deadline is July 23)
    rerender(
      <KycResubmissionTimeline
        status="under-review"
        submittedAt={new Date(2026, 6, 20)}
        slaBusinessDays={3}
        now={new Date(2026, 6, 28)}
        escalationHref="/custom-support-desk"
      />
    );

    expect(container.querySelector('.kyc-resubmission--overdue')).toBeInTheDocument();
    expect(screen.getByText('Review taking longer than expected')).toBeInTheDocument();

    const escalationLink = screen.getByRole('link', { name: /Contact support about this review/i });
    expect(escalationLink).toBeInTheDocument();
    expect(escalationLink).toHaveAttribute('href', '/custom-support-desk');
  });

  it('renders default escalation link when escalationHref is not provided in overdue state', () => {
    render(
      <KycResubmissionTimeline
        status="submitted"
        submittedAt={new Date(2026, 6, 20)}
        slaBusinessDays={3}
        now={new Date(2026, 6, 28)}
      />
    );

    const escalationLink = screen.getByRole('link', { name: /Contact support about this review/i });
    expect(escalationLink).toHaveAttribute('href', '/support?topic=kyc-review');
  });

  it('fails deterministically with an invalid submittedAt prop', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
    };
    window.addEventListener('error', errorHandler);

    expect(() => {
      render(
        <KycResubmissionTimeline
          status="submitted"
          submittedAt="invalid-date-string"
          now={defaultNow}
        />
      );
    }).toThrow('KYC timeline received an invalid date');

    window.removeEventListener('error', errorHandler);
    consoleError.mockRestore();
  });

  it('satisfies accessibility standards with no axe violations across states', async () => {
    const { container, rerender } = render(
      <KycResubmissionTimeline
        status="submitted"
        submittedAt={defaultSubmittedAt}
        now={defaultNow}
      />
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <KycResubmissionTimeline
        status="under-review"
        submittedAt={defaultSubmittedAt}
        reviewStartedAt={new Date(2026, 6, 27)}
        now={defaultNow}
      />
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <KycResubmissionTimeline
        status="decision"
        submittedAt={defaultSubmittedAt}
        decidedAt={new Date(2026, 6, 28)}
        decisionLabel="Approved"
        now={new Date(2026, 6, 28)}
      />
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <KycResubmissionTimeline
        status="canceled"
        submittedAt={defaultSubmittedAt}
        now={new Date(2026, 6, 28)}
      />
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(
      <KycResubmissionTimeline
        status="under-review"
        submittedAt={new Date(2026, 6, 15)}
        slaBusinessDays={3}
        now={new Date(2026, 6, 28)}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
