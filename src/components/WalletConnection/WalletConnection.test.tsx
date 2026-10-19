import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
} from "@stellar/freighter-api";
import {
  WalletConnectionProvider,
  TESTNET_PASSPHRASE,
} from "./WalletConnectionContext";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { Login } from "../../pages/Login";
import { Signup } from "../../pages/Signup";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getAddress: vi.fn(),
  getNetworkDetails: vi.fn(),
}));
const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABC";
const details = {
  network: "TESTNET",
  networkUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: TESTNET_PASSPHRASE,
};
beforeEach(() => {
  vi.mocked(isConnected).mockResolvedValue({ isConnected: true });
  vi.mocked(requestAccess).mockResolvedValue({ address });
  vi.mocked(getAddress).mockResolvedValue({ address });
  vi.mocked(getNetworkDetails).mockResolvedValue(details);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
});
function mount(child = <ConnectWalletButton />) {
  return render(
    <WalletConnectionProvider>
      <MemoryRouter>{child}</MemoryRouter>
    </WalletConnectionProvider>,
  );
}
async function open() {
  fireEvent.click(
    screen.getByRole("button", { name: "Connect Stellar Wallet" }),
  );
  await screen.findByRole("button", { name: "Connect" });
}
async function connect() {
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));
  await screen.findByText("Connected network: TESTNET");
}

describe("Stellar wallet connection", () => {
  it.each([
    ["Login", <Login />],
    ["Signup", <Signup />],
  ])("connects from %s and shows the address", async (name, page) => {
    mount(page);
    if (name === "Signup") fireEvent.click(screen.getByText("Startup Founder"));
    await connect();
    expect(
      screen.getByRole("button", {
        name: `${address.slice(0, 6)}…${address.slice(-4)}`,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/Switch Freighter/)).not.toBeInTheDocument();
    expect(requestAccess).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    expect(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    ).toBeInTheDocument();
  });
  it("offers Retry after rejection and then connects", async () => {
    vi.mocked(requestAccess).mockResolvedValueOnce({
      address: "",
      error: { code: -4, message: "User declined access", ext: [] },
    });
    mount();
    await open();
    fireEvent.click(screen.getByRole("button", { name: "Connect" }));
    await screen.findByRole("button", { name: "Try Again" });
    expect(
      screen.getAllByText("Connection was declined. Try again?"),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await screen.findByText("Connected network: TESTNET");
  });
  it("shows the official install link when absent", async () => {
    vi.mocked(isConnected).mockResolvedValue({ isConnected: false });
    mount();
    await open();
    const link = screen.getByRole("link", { name: /Install Freighter/ });
    expect(link).toHaveAttribute("href", "https://www.freighter.app/");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(requestAccess).not.toHaveBeenCalled();
  });
  it("waits for asynchronous detection without flashing an install link", async () => {
    let resolve!: (value: { isConnected: boolean }) => void;
    vi.mocked(isConnected).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    );
    expect(screen.getByText("Checking for Freighter…")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Install/ }),
    ).not.toBeInTheDocument();
    await act(async () => resolve({ isConnected: true }));
    expect(screen.getByRole("button", { name: "Connect" })).toBeEnabled();
  });
  it.each(["Cancel", "Close Connect Wallet dialog"])(
    "ignores late access responses after %s",
    async (label) => {
      let resolve!: (value: { address: string }) => void;
      vi.mocked(requestAccess).mockReturnValueOnce(
        new Promise((done) => {
          resolve = done;
        }),
      );
      mount();
      await open();
      fireEvent.click(screen.getByRole("button", { name: "Connect" }));
      await waitFor(() => expect(requestAccess).toHaveBeenCalledOnce());
      fireEvent.click(screen.getByRole("button", { name: label }));
      await act(async () => resolve({ address }));
      expect(
        screen.queryByText("Connected network: TESTNET"),
      ).not.toBeInTheDocument();
      expect(getAddress).not.toHaveBeenCalled();
    },
  );
  it("updates account/network changes and clears state if access is revoked", async () => {
    vi.useFakeTimers();
    mount();
    await act(async () => {});
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Connect" })),
    );
    vi.mocked(getAddress).mockResolvedValue({ address: "GNEWACCOUNT123456" });
    vi.mocked(getNetworkDetails).mockResolvedValue({
      ...details,
      network: "PUBLIC",
      networkPassphrase: "Public Global Stellar Network ; September 2015",
    });
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(
      screen.getByRole("button", { name: "GNEWAC…3456" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Switch Freighter to TESTNET",
    );
    vi.mocked(getNetworkDetails).mockResolvedValue(details);
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    vi.mocked(getAddress).mockResolvedValue({ address: "" });
    await act(async () => vi.advanceTimersByTimeAsync(3000));
    expect(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    ).toBeInTheDocument();
  });
  it("times out an unanswered wallet prompt and supports retry", async () => {
    vi.useFakeTimers();
    vi.mocked(requestAccess).mockReturnValueOnce(new Promise(() => {}));
    mount();
    await act(async () => {});
    fireEvent.click(
      screen.getByRole("button", { name: "Connect Stellar Wallet" }),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Connect" })),
    );
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(
      screen.getByRole("button", { name: "Try Again" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Connection timed out. Try again?"),
    ).toHaveLength(2);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Try Again" })),
    );
    expect(screen.getByText("Connected network: TESTNET")).toBeInTheDocument();
  });
});
