/**
 * Regression coverage for the `LockupClaimModal` empty/failure path in
 * `src/components/LockupClaimModal.tsx` (#746).
 *
 * Branch under guard
 * ------------------
 *   `if (!isOpen) return null;`
 *
 * The modal must mount nothing while closed, must not leak its Escape-key
 * listener, and must reset its claim state when it is closed and reopened.
 * The sibling suite covers the three happy-path interactions, so this file
 * focuses on the guarded branch, the lifecycle neighbours, and the boundary
 * inputs of the claim/gas logic.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LockupClaimModal } from "./LockupClaimModal";

function setup(props: Partial<React.ComponentProps<typeof LockupClaimModal>> = {}) {
  const onClose = vi.fn();
  const view = render(<LockupClaimModal isOpen onClose={onClose} {...props} />);
  return { onClose, ...view };
}

describe("LockupClaimModal — closed/failure path (#746)", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<LockupClaimModal isOpen={false} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /claim now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("does not attach the Escape listener while closed", () => {
    const onClose = vi.fn();
    render(<LockupClaimModal isOpen={false} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape while open", () => {
    const { onClose } = setup();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("removes the Escape listener when it closes", () => {
    const onClose = vi.fn();
    const { rerender, unmount } = render(<LockupClaimModal isOpen onClose={onClose} />);

    rerender(<LockupClaimModal isOpen={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("mounts the dialog when reopened after being closed", () => {
    const onClose = vi.fn();
    const { rerender } = render(<LockupClaimModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<LockupClaimModal isOpen onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears a previous claim status when the modal is closed and reopened", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<LockupClaimModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /claim now/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/claim request queued/i);

    rerender(<LockupClaimModal isOpen={false} onClose={onClose} />);
    rerender(<LockupClaimModal isOpen onClose={onClose} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("resets the auto-claim toggle to initialAutoClaim on close", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <LockupClaimModal isOpen onClose={onClose} initialAutoClaim={false} />,
    );

    const toggle = screen.getByRole("checkbox", { name: /auto-claim on next unlock/i });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();

    rerender(<LockupClaimModal isOpen={false} onClose={onClose} initialAutoClaim={false} />);
    rerender(<LockupClaimModal isOpen onClose={onClose} initialAutoClaim={false} />);

    expect(screen.getByRole("checkbox", { name: /auto-claim on next unlock/i })).not.toBeChecked();
  });

  it("honours initialAutoClaim=true", () => {
    setup({ initialAutoClaim: true });

    expect(screen.getByRole("checkbox", { name: /auto-claim on next unlock/i })).toBeChecked();
  });

  it("closes on a backdrop click but not on a click inside the dialog", () => {
    const { container, onClose } = setup();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exposes the labelled dialog contract", () => {
    setup();

    const dialog = screen.getByRole("dialog", { name: /claim your unlocked balance/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-describedby");
    expect(dialog).toHaveAttribute("dir", "auto");
    expect(screen.getByRole("button", { name: /close claim modal/i })).toBeInTheDocument();
  });
});

describe("LockupClaimModal — claim boundaries (#746)", () => {
  it("reports an error when the unlocked amount is exactly $0.00", async () => {
    const user = userEvent.setup();
    setup({ unlockedAmount: "$0.00" });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/nothing is currently available to claim/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports an error for an empty unlocked amount", async () => {
    const user = userEvent.setup();
    setup({ unlockedAmount: "" });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/nothing is currently available to claim/i);
  });

  it("treats the smallest non-zero amount as claimable", async () => {
    const user = userEvent.setup();
    setup({ unlockedAmount: "$0.01" });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/claim request queued/i);
  });

  it("prefers the empty-amount error over the high-gas warning", async () => {
    const user = userEvent.setup();
    setup({ unlockedAmount: "$0.00", gasEstimate: 95 });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/nothing is currently available to claim/i);
    expect(alert).not.toHaveTextContent(/high gas fees/i);
  });

  it.each([
    [0, "low network fee estimate", "$8"],
    [7, "low network fee estimate", "$8"],
    [10, "low network fee estimate", "$12"],
    [49, "low network fee estimate", "$59"],
    [50, "moderate network fee estimate", "$60"],
    [79, "moderate network fee estimate", "$95"],
    [80, "high network fee estimate", "$96"],
  ])("labels a gas estimate of %i as %s", (gasEstimate, label, fee) => {
    setup({ gasEstimate });

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(`${gasEstimate}%`)).toBeInTheDocument();
    expect(screen.getByText(`~${fee} fee`)).toBeInTheDocument();
  });

  it("warns instead of claiming when gas is at the high-fee boundary", async () => {
    const user = userEvent.setup();
    setup({ gasEstimate: 80 });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/high gas fees/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("claims normally one unit below the high-fee boundary", async () => {
    const user = userEvent.setup();
    setup({ gasEstimate: 79 });

    await user.click(screen.getByRole("button", { name: /claim now/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/claim request queued/i);
  });

  it("switches from the success state to the claim-later state", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /claim now/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/claim request queued/i);

    await user.click(screen.getByRole("button", { name: /claim later/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/remind you again/i);
  });

  it("toggles the auto-claim explanation tooltip", async () => {
    const user = userEvent.setup();
    setup();

    const trigger = screen.getByRole("button", { name: /learn more about auto-claim/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("tooltip")).toHaveTextContent(/hands-off/i);
  });

  it("uses the documented defaults when optional props are omitted", () => {
    setup();

    expect(screen.getByText("$12,480.00")).toBeInTheDocument();
    expect(screen.getByText("22%")).toBeInTheDocument();
    expect(screen.getByText(/low network fee estimate/i)).toBeInTheDocument();
  });
});
