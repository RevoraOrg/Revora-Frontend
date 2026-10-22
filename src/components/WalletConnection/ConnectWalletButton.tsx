import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "../Button";
import { ConnectWalletModal } from "./ConnectWalletModal";
import {
  TESTNET_PASSPHRASE,
  useWalletConnection,
} from "./WalletConnectionContext";

export function ConnectWalletButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wallet = useWalletConnection();
  useEffect(() => {
    if (wallet.status === "connected") setOpen(false);
  }, [wallet.status]);
  const close = () => {
    if (wallet.status === "connecting") wallet.disconnect();
    setOpen(false);
  };
  return (
    <>
      <Button
        type="button"
        className="w-full"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Wallet size={18} aria-hidden="true" />
        {wallet.address
          ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
          : "Connect Stellar Wallet"}
      </Button>
      {wallet.address && (
        <div className="wallet-account" role="status">
          <p>Connected network: {wallet.network || "Custom network"}</p>
          {wallet.networkPassphrase !== TESTNET_PASSPHRASE && (
            <p role="alert">
              Switch Freighter to TESTNET. Revora uses the Stellar test network.
            </p>
          )}
          <Button variant="secondary" type="button" onClick={wallet.disconnect}>
            Disconnect wallet
          </Button>
        </div>
      )}
      <ConnectWalletModal
        isOpen={open}
        onClose={close}
        providers={[
          {
            id: "freighter",
            name: "Freighter",
            installUrl: "https://www.freighter.app/",
            status: wallet.detection,
          },
        ]}
        onConnect={wallet.connect}
        onRetry={wallet.connect}
        onCancel={wallet.disconnect}
        connectingProviderId={
          wallet.status === "connecting" ? "freighter" : null
        }
        errorState={wallet.error}
      />
    </>
  );
}
