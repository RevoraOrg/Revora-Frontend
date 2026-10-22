import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConnectWalletModal,
  ConnectWalletModalProps,
} from "./ConnectWalletModal";
afterEach(cleanup);
const provider = {
  id: "freighter",
  name: "Freighter",
  status: "detected" as const,
  installUrl: "https://www.freighter.app/",
};
function props(
  overrides: Partial<ConnectWalletModalProps> = {},
): ConnectWalletModalProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    providers: [provider],
    onConnect: vi.fn(),
    onCancel: vi.fn(),
    connectingProviderId: null,
    errorState: null,
    onRetry: vi.fn(),
    ...overrides,
  };
}
describe("ConnectWalletModal", () => {
  it.each(["detected", "not-installed", "unavailable", "checking"] as const)(
    "has no axe violations in %s state",
    async (status) => {
      render(
        <ConnectWalletModal
          {...props({ providers: [{ ...provider, status }] })}
        />,
      );
      expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
    },
  );
  it("traps focus, handles Escape/backdrop, locks scroll and restores focus", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const config = props();
    const view = render(<ConnectWalletModal {...config} />);
    const close = screen.getByRole("button", {
      name: "Close Connect Wallet dialog",
    });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Connect" })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(config.onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("dialog"));
    expect(config.onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(config.onClose).toHaveBeenCalledTimes(2);
    view.rerender(<ConnectWalletModal {...config} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
    trigger.remove();
  });
  it("deduplicates providers and delegates connect, cancel and retry", async () => {
    const config = props({ providers: [provider, provider] });
    const view = render(<ConnectWalletModal {...config} />);
    expect(screen.getAllByRole("heading", { name: "Freighter" })).toHaveLength(
      1,
    );
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(config.onConnect).toHaveBeenCalledWith("freighter");
    view.rerender(
      <ConnectWalletModal {...config} connectingProviderId="freighter" />,
    );
    expect(screen.getByText("Connecting to Freighter…")).toBeInTheDocument();
    expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(config.onCancel).toHaveBeenCalledWith("freighter");
    view.rerender(<ConnectWalletModal {...config} />);
    expect(screen.getByText("Connection cancelled.")).toBeInTheDocument();
    view.rerender(
      <ConnectWalletModal
        {...config}
        errorState={{
          providerId: "freighter",
          type: "rejected",
          message: "Connection was declined.",
        }}
      />,
    );
    expect(await axe(screen.getByRole("dialog"))).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(config.onRetry).toHaveBeenCalledWith("freighter");
  });
  it("renders an empty list safely and gives restricted browsers guidance", () => {
    const view = render(<ConnectWalletModal {...props({ providers: [] })} />);
    expect(
      screen.getByRole("heading", { name: "No wallets detected" }),
    ).toBeInTheDocument();
    view.rerender(
      <ConnectWalletModal
        {...props({ providers: [{ ...provider, status: "unavailable" }] })}
      />,
    );
    expect(
      screen.getByText(/Wallet access is unavailable/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect" }),
    ).not.toBeInTheDocument();
  });
});
