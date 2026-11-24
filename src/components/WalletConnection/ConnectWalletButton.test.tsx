import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectWalletButton } from "./ConnectWalletButton";
import {
  TESTNET_PASSPHRASE,
  useWalletConnection,
} from "./WalletConnectionContext";

vi.mock("./WalletConnectionContext", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./WalletConnectionContext")>();
  return { ...actual, useWalletConnection: vi.fn() };
});

afterEach(cleanup);

const initialWallet: ReturnType<typeof useWalletConnection> = {
  address: null,
  networkPassphrase: null,
  network: null,
  status: "idle",
  error: null,
  detection: "detected",
  chain: null,
  chainId: null,
  connect: vi.fn(async () => {}),
  disconnect: vi.fn(),
};

function renderButton(
  wallet: Partial<ReturnType<typeof useWalletConnection>> = {},
) {
  vi.mocked(useWalletConnection).mockReturnValue({
    ...initialWallet,
    ...wallet,
  });
  return render(<ConnectWalletButton />);
}

describe("ConnectWalletButton", () => {
  it("shows the connect label when disconnected", () => {
    renderButton();

    expect(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    ).toBeInTheDocument();
  });

  it("shows a truncated address when connected", () => {
    renderButton({
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC",
      networkPassphrase: TESTNET_PASSPHRASE,
      network: "TESTNET",
      status: "connected",
    });

    expect(
      screen.getByRole("button", { name: "GABCDE…ZABC" }),
    ).toBeInTheDocument();
  });

  it("shows a warning only when the connected wallet is not on Testnet", () => {
    const wallet = {
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC",
      network: "PUBLIC",
      status: "connected" as const,
    };
    const { rerender } = renderButton({
      ...wallet,
      networkPassphrase: TESTNET_PASSPHRASE,
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    vi.mocked(useWalletConnection).mockReturnValue({
      ...initialWallet,
      ...wallet,
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
    rerender(<ConnectWalletButton />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your wallet is connected to PUBLIC. Revora uses Stellar Testnet.",
    );
  });

  it("closes the connect modal when wallet status becomes connected", () => {
    const { rerender } = renderButton();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    vi.mocked(useWalletConnection).mockReturnValue({
      ...initialWallet,
      address: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC",
      networkPassphrase: TESTNET_PASSPHRASE,
      network: "TESTNET",
      status: "connected",
    });
    rerender(<ConnectWalletButton />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
