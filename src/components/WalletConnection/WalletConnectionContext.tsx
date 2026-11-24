import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
} from "@stellar/freighter-api";
import { ChainMetadata, getChainFromPassphrase } from "../../constants/chains";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export type WalletError = {
  providerId: string;
  type: "rejected" | "timeout";
  message: string;
};
export type WalletStatus = "idle" | "connecting" | "connected" | "error";
export type Detection =
  "checking" | "detected" | "not-installed" | "unavailable";
const TIMEOUT = 30000;
function bounded<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("timeout")),
      TIMEOUT,
    );
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}
interface WalletState {
  address: string | null;
  networkPassphrase: string | null;
  network: string | null;
  status: WalletStatus;
  error: WalletError | null;
}
const initial: WalletState = {
  address: null,
  networkPassphrase: null,
  network: null,
  status: "idle",
  error: null,
};
interface WalletContextValue extends WalletState {
  detection: Detection;
  /** Chain metadata derived from the connected wallet's networkPassphrase, or null when disconnected */
  chain: ChainMetadata | null;
  /** Numeric chain ID derived from the connected wallet's networkPassphrase, or null when disconnected */
  chainId: number | null;
  connect: (providerId: string) => Promise<void>;
  disconnect: () => void;
}
const WalletContext = createContext<WalletContextValue | null>(null);
export function WalletConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<WalletState>(initial);
  const [detection, setDetection] = useState<Detection>("checking");
  const generation = useRef(0);
  const busy = useRef(false);
  const disconnect = useCallback(() => {
    generation.current++;
    busy.current = false;
    setState(initial);
  }, []);

  useEffect(() => {
    // Same ref object as `generation`; captured so the cleanup below bumps the
    // counter that is current when it runs.
    const generationRef = generation;
    let disposed = false;
    let timer: number;
    const detect = async () => {
      try {
        const result = await bounded(isConnected());
        if (!disposed)
          setDetection(
            result.isConnected
              ? "detected"
              : result.error
                ? "unavailable"
                : "not-installed",
          );
      } catch {
        if (!disposed) setDetection("unavailable");
      }
      // Detect extensions installed or injected after the first render as well.
      if (!disposed) timer = window.setTimeout(detect, 3000);
    };
    void detect();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      generationRef.current++;
      busy.current = false;
    };
  }, []);

  const connect = useCallback(async (providerId: string) => {
    if (providerId !== "freighter" || busy.current) return;
    busy.current = true;
    const attempt = ++generation.current;
    setState({ ...initial, status: "connecting" });
    try {
      const installed = await bounded(isConnected());
      if (attempt !== generation.current) return;
      if (!installed.isConnected) {
        setDetection(installed.error ? "unavailable" : "not-installed");
        setState(initial);
        return;
      }
      setDetection("detected");
      const access = await bounded(requestAccess());
      if (attempt !== generation.current) return;
      if (access.error || !access.address)
        throw new Error("Connection was declined. Try again?");
      const [account, details] = await bounded(
        Promise.all([getAddress(), getNetworkDetails()]),
      );
      if (attempt !== generation.current) return;
      if (
        account.error ||
        details.error ||
        !account.address ||
        !details.networkPassphrase
      ) {
        throw new Error(
          "Unable to read your wallet account and network. Try again?",
        );
      }
      setState({
        address: account.address,
        networkPassphrase: details.networkPassphrase,
        network: details.network,
        status: "connected",
        error: null,
      });
    } catch (cause) {
      if (attempt !== generation.current) return;
      const timeout = cause instanceof Error && cause.message === "timeout";
      setState({
        ...initial,
        status: "error",
        error: {
          providerId,
          type: timeout ? "timeout" : "rejected",
          message: timeout
            ? "Connection timed out. Try again?"
            : cause instanceof Error
              ? cause.message
              : "Unable to connect to Freighter. Try again?",
        },
      });
    } finally {
      if (attempt === generation.current) busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (state.status !== "connected") return;
    let disposed = false;
    let timer: number;
    const attempt = generation.current;
    const refresh = async () => {
      try {
        const [account, details] = await bounded(
          Promise.all([getAddress(), getNetworkDetails()]),
        );
        if (disposed || generation.current !== attempt) return;
        if (
          account.error ||
          details.error ||
          !account.address ||
          !details.networkPassphrase
        ) {
          disconnect();
          return;
        }
        setState({
          address: account.address,
          networkPassphrase: details.networkPassphrase,
          network: details.network,
          status: "connected",
          error: null,
        });
      } catch {
        if (!disposed && generation.current === attempt) disconnect();
      }
      if (!disposed) timer = window.setTimeout(refresh, 3000);
    };
    timer = window.setTimeout(refresh, 3000);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [state.status, disconnect]);

  const chain = getChainFromPassphrase(state.networkPassphrase);
  const chainId = chain?.id ?? null;

  return (
    <WalletContext.Provider
      value={{ ...state, detection, chain, chainId, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}
export function useWalletConnection() {
  const context = useContext(WalletContext);
  if (!context)
    throw new Error("useWalletConnection requires WalletConnectionProvider");
  return context;
}
/**
 * Optional variant of useWalletConnection that returns null when rendered
 * outside WalletConnectionProvider (e.g. standalone component tests).
 */
export function useOptionalWalletConnection() {
  return useContext(WalletContext);
}
