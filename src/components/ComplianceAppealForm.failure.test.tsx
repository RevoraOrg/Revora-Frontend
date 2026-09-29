/**
 * Regression coverage for the failure and empty-result branches of
 * `ComplianceAppealForm` (`ComplianceAppealFormProps`).
 *
 * The main suite (`ComplianceAppealForm.test.tsx`) covers the happy path. This
 * suite pins the explicit failure/empty returns called out by the issue:
 *
 *  - `loadDraft()` -> `null` when there is no stored draft (no `raw` value);
 *  - `loadDraft()` -> `null` when `JSON.parse`/storage access throws;
 *  - `AutosaveChip` -> `null` when the form has no content;
 *  - submit rejection is surfaced as a stable `role="alert"` contract and the
 *    form stays on the editable step with the user's input preserved;
 *  - boundary inputs: blocked storage, attachments over the 10 MB cap, and a
 *    rejected submit after content was entered.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComplianceAppealForm } from "./ComplianceAppealForm";

const STORAGE_KEY = "compliance-appeal-draft";

// ─── localStorage harness ───────────────────────────────────────────────────

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

function installStorageMock() {
  store = {};
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null);
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    store[key] = value;
  });
  localStorageMock.removeItem.mockImplementation((key: string) => {
    delete store[key];
  });
  localStorageMock.clear.mockImplementation(() => {
    store = {};
  });
}

Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });

const defaultProps = {
  holdId: "hold-1",
  holdTitle: "Identity verification required",
  isOpen: true,
};

function makeFile(name: string, sizeBytes: number): File {
  const file = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

/** Drive the hidden file input the same way the browser does on user pick. */
function uploadFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", { value: files, configurable: true });
  fireEvent.change(input);
}

function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

beforeEach(() => {
  installStorageMock();
});

// ─── loadDraft empty-result branches ─────────────────────────────────────────

describe("draft loading failure paths", () => {
  it("renders the pristine form (no draft banner) when nothing is stored", () => {
    render(<ComplianceAppealForm {...defaultProps} />);

    expect(screen.getByText("Submit an Appeal")).toBeInTheDocument();
    expect(screen.queryByText(/Draft restored/i)).not.toBeInTheDocument();
    // No autosave status region before the user types anything.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("swallows a JSON parse failure and falls back to an empty form", () => {
    localStorageMock.getItem.mockReturnValueOnce("{not valid json");

    expect(() => render(<ComplianceAppealForm {...defaultProps} />)).not.toThrow();
    expect(screen.getByText("Submit an Appeal")).toBeInTheDocument();
    expect(screen.queryByText(/Draft restored/i)).not.toBeInTheDocument();
  });

  it("ignores a draft that belongs to a different hold", () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        holdId: "some-other-hold",
        reason: "incorrect_info",
        explanation: "stale",
        attachmentNames: [],
        updatedAt: new Date().toISOString(),
      }),
    );

    render(<ComplianceAppealForm {...defaultProps} />);

    expect(screen.queryByText(/Draft restored/i)).not.toBeInTheDocument();
    // The foreign draft's reason must not leak into the select.
    expect(screen.getByLabelText("Reason for appeal")).toHaveValue("");
  });

  it("survives a blocked storage backend instead of crashing on mount", () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("storage disabled");
    });

    expect(() => render(<ComplianceAppealForm {...defaultProps} />)).not.toThrow();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/Draft restored/i)).not.toBeInTheDocument();
  });

  it("restores a matching draft's reason and explanation", () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        holdId: "hold-1",
        reason: "already_verified",
        explanation: "Already verified through support.",
        attachmentNames: ["passport.pdf"],
        updatedAt: new Date().toISOString(),
      }),
    );

    render(<ComplianceAppealForm {...defaultProps} />);

    expect(screen.getByText(/Draft restored/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Reason for appeal")).toHaveValue("already_verified");
    expect(screen.getByLabelText("Explanation")).toHaveValue("Already verified through support.");
  });
});

// ─── AutosaveChip empty-result branch ────────────────────────────────────────

describe("autosave chip empty-state", () => {
  it("stays unrendered until the form has content", () => {
    render(<ComplianceAppealForm {...defaultProps} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reason for appeal"), {
      target: { value: "incorrect_info" },
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Saving draft/i)).toBeInTheDocument();
  });

  it("re-hides when content is removed again", () => {
    render(<ComplianceAppealForm {...defaultProps} />);
    const explanation = screen.getByLabelText("Explanation");

    fireEvent.change(explanation, { target: { value: "temporary" } });
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.change(explanation, { target: { value: "" } });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

// ─── submit failure contract ─────────────────────────────────────────────────

describe("submit failure handling", () => {
  it("surfaces an Error message and keeps the form editable with input preserved", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ComplianceAppealForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Reason for appeal"), {
      target: { value: "incorrect_info" },
    });
    fireEvent.change(screen.getByLabelText("Explanation"), {
      target: { value: "Please review." },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit appeal/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Network error");
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Still on the form step, with the user's text intact.
    expect(screen.getByText("Submit an Appeal")).toBeInTheDocument();
    expect(screen.queryByText("Appeal submitted")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Explanation")).toHaveValue("Please review.");
  });

  it("falls back to a stable message when a non-Error value is thrown", async () => {
    const onSubmit = vi.fn().mockRejectedValue("boom");
    render(<ComplianceAppealForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Reason for appeal"), {
      target: { value: "time_sensitive" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit appeal/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to submit appeal. Please try again.",
      );
    });
  });

  it("does not call onSubmit when no reason is selected", () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ComplianceAppealForm {...defaultProps} onSubmit={onSubmit} />);

    const submit = screen.getByRole("button", { name: /submit appeal/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a previous submit error and succeeds on retry", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce(undefined);
    render(<ComplianceAppealForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Reason for appeal"), {
      target: { value: "document_error" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit appeal/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit appeal/i }));
    await waitFor(() => {
      expect(screen.getByText("Appeal submitted")).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─── attachment boundary inputs ──────────────────────────────────────────────

describe("attachment boundary handling", () => {
  it("rejects an oversized file and leaves the file list empty", () => {
    const { container } = render(<ComplianceAppealForm {...defaultProps} />);

    uploadFiles(getFileInput(container), [makeFile("huge.pdf", 10 * 1024 * 1024 + 1)]);

    expect(screen.getByRole("alert")).toHaveTextContent(
      '"huge.pdf" exceeds the 10 MB size limit.',
    );
    expect(screen.queryByText("huge.pdf")).not.toBeInTheDocument();
  });

  it("accepts a file exactly at the 10 MB boundary", () => {
    const { container } = render(<ComplianceAppealForm {...defaultProps} />);

    uploadFiles(getFileInput(container), [makeFile("exact.pdf", 10 * 1024 * 1024)]);

    expect(screen.getByText("exact.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the valid files when a batch mixes valid and oversized files", () => {
    const { container } = render(<ComplianceAppealForm {...defaultProps} />);

    uploadFiles(getFileInput(container), [
      makeFile("report.pdf", 1024),
      makeFile("oversized.pdf", 10 * 1024 * 1024 + 5),
    ]);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByText("oversized.pdf")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("oversized.pdf");
  });
});

// ─── close / unsaved-changes contract ────────────────────────────────────────

describe("close handling with unsaved content", () => {
  it("persists the draft before closing when the form has content", () => {
    const onClose = vi.fn();
    render(<ComplianceAppealForm {...defaultProps} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Reason for appeal"), {
      target: { value: "incorrect_info" },
    });
    fireEvent.change(screen.getByLabelText("Explanation"), {
      target: { value: "Unsaved work" },
    });
    fireEvent.click(screen.getByLabelText("Close appeal form"));

    expect(onClose).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(localStorageMock.getItem(STORAGE_KEY) as string);
    expect(saved).toMatchObject({
      holdId: "hold-1",
      reason: "incorrect_info",
      explanation: "Unsaved work",
    });
  });

  it("does not write a draft when closing an untouched form", () => {
    const onClose = vi.fn();
    render(<ComplianceAppealForm {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close appeal form"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("renders nothing when isOpen is false, even with a stored draft", () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        holdId: "hold-1",
        reason: "incorrect_info",
        explanation: "saved",
        attachmentNames: [],
        updatedAt: new Date().toISOString(),
      }),
    );

    const { container } = render(<ComplianceAppealForm {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });
});
