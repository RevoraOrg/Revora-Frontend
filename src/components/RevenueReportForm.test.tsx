import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RevenueReportForm } from "./RevenueReportForm";
import { saveRecoveryFrame } from "./ResumeRecoveryBanner";

const RECOVERY_KEY = "recovery_state_/startup/report-revenue";

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/startup/report-revenue"]}>
      <RevenueReportForm />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("RevenueReportForm resume recovery", () => {
  it("does not render the recovery banner when no failure was recorded", () => {
    const { container } = renderForm();
    expect(container.querySelector('[data-testid="resume-recovery-banner"]')).toBeNull();
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });

  it("offers the saved draft back and restores entries when resuming", () => {
    saveRecoveryFrame({
      page: "/startup/report-revenue",
      timestamp: Date.now(),
      variant: "form",
      payload: {
        reportPeriod: "2026-04",
        grossRevenue: "125000",
        currency: "EUR",
        notes: "Q1 reconciliation pending",
      },
    });

    renderForm();

    expect(screen.getByTestId("resume-recovery-banner")).toBeInTheDocument();
    expect(screen.getByText("Your form draft was saved")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("resume-recovery-resume"));

    // Entries are restored into the form…
    expect(screen.getByLabelText(/reporting period/i)).toHaveValue("2026-04");
    expect(screen.getByLabelText(/gross revenue/i)).toHaveValue("125000");
    expect(screen.getByLabelText(/^currency/i)).toHaveValue("EUR");
    expect(screen.getByLabelText(/notes or attachments/i)).toHaveValue(
      "Q1 reconciliation pending",
    );
    // …and the recovery point is consumed.
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
    expect(screen.queryByTestId("resume-recovery-banner")).not.toBeInTheDocument();
  });

  it("saves a recovery frame when the reporting service rejects the submission", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/gross revenue/i), {
      target: { value: "150000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't reach the reporting service/i,
    );

    const raw = localStorage.getItem(RECOVERY_KEY);
    expect(raw).not.toBeNull();
    const frame = JSON.parse(raw as string);
    expect(frame.variant).toBe("form");
    expect(frame.payload.grossRevenue).toBe("150000000");
  });

  it("clears stale recovery frames after a successful submission", async () => {
    saveRecoveryFrame({
      page: "/startup/report-revenue",
      timestamp: Date.now(),
      variant: "form",
      payload: { reportPeriod: "2026-05", grossRevenue: "999", currency: "USD", notes: "" },
    });

    renderForm();

    fireEvent.change(screen.getByLabelText(/gross revenue/i), {
      target: { value: "50000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/report submitted/i)).toBeInTheDocument();
    expect(localStorage.getItem(RECOVERY_KEY)).toBeNull();
  });
});
