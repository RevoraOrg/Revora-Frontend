import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Wallet, X, LoaderCircle } from "lucide-react";
import { Button } from "../Button";
import type { Detection, WalletError } from "./WalletConnectionContext";
import "./WalletConnection.css";

export interface WalletProvider {
  id: string;
  name: string;
  icon?: string;
  installUrl: string;
  status: Detection;
}
export interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: WalletProvider[];
  onConnect: (providerId: string) => void;
  onCancel: (providerId: string) => void;
  connectingProviderId: string | null;
  errorState: WalletError | null;
  onRetry: (providerId: string) => void;
}
export function ConnectWalletModal({
  isOpen,
  onClose,
  providers,
  onConnect,
  onCancel,
  connectingProviderId,
  errorState,
  onRetry,
}: ConnectWalletModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  const previousConnecting = useRef<string | null>(null);
  const unique = providers.filter(
    (provider, index) =>
      providers.findIndex((item) => item.id === provider.id) === index,
  );
  const connecting = unique.find(
    (provider) => provider.id === connectingProviderId,
  );
  const cancelled =
    !connectingProviderId && previousConnecting.current && !errorState;
  useEffect(() => {
    previousConnecting.current = connectingProviderId;
  }, [connectingProviderId]);
  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      panel.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex="0"]',
      );
    focusables()?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const nodes = focusables();
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        !panel.current?.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const focusin = () => {
      if (!panel.current?.contains(document.activeElement))
        focusables()?.[0]?.focus();
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const empty =
    !connecting &&
    !errorState &&
    !unique.some(
      (provider) =>
        provider.status === "detected" || provider.status === "checking",
    );
  return createPortal(
    <div
      className="wallet-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="wallet-panel glass-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <div className="wallet-heading">
          <h2 id={`${id}-title`}>Connect Wallet</h2>
          <Button
            variant="secondary"
            type="button"
            className="wallet-close"
            aria-label="Close Connect Wallet dialog"
            onClick={onClose}
          >
            <X aria-hidden="true" size={20} />
          </Button>
        </div>
        <p id={`${id}-description`}>
          Connect your Stellar wallet to Revora. No transactions will be signed.
        </p>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {connecting
            ? `Connecting to ${connecting.name}…`
            : errorState?.message || (cancelled ? "Connection cancelled." : "")}
        </p>
        {empty && (
          <div>
            <h3>No wallets detected</h3>
            <p>
              Install a supported wallet, or open this page in a standard
              browser.
            </p>
          </div>
        )}
        {unique.map((provider) => {
          const error =
            errorState?.providerId === provider.id ? errorState : null;
          return (
            <div className="wallet-row" key={provider.id}>
              <div className="wallet-heading">
                {provider.icon ? (
                  <img
                    width="28"
                    height="28"
                    src={provider.icon}
                    alt={`${provider.name} wallet icon`}
                  />
                ) : (
                  <Wallet aria-hidden="true" size={28} />
                )}
                <h3>{provider.name}</h3>
              </div>
              {connectingProviderId === provider.id ? (
                <>
                  <span>
                    <LoaderCircle
                      className="wallet-spinner"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Connecting…</span>Confirm in your
                    wallet.
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onCancel(provider.id)}
                  >
                    Cancel
                  </Button>
                </>
              ) : error ? (
                <>
                  <p>{error.message}</p>
                  <Button type="button" onClick={() => onRetry(provider.id)}>
                    Try Again
                  </Button>
                </>
              ) : provider.status === "unavailable" ? (
                <p>
                  Wallet access is unavailable here. Open this page in a
                  standard browser with Freighter enabled.
                </p>
              ) : provider.status === "checking" ? (
                <p role="status">Checking for {provider.name}…</p>
              ) : (
                <>
                  <Button
                    type="button"
                    disabled={
                      provider.status !== "detected" || !!connectingProviderId
                    }
                    onClick={() => onConnect(provider.id)}
                  >
                    Connect
                  </Button>
                  {provider.status === "not-installed" && (
                    <a
                      className="link-styled"
                      href={provider.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Install ${provider.name} — opens in a new tab`}
                    >
                      Install {provider.name}
                    </a>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
