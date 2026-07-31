import React, { useRef, useEffect, useCallback } from 'react';
import { useRecentNetworks } from '../../hooks/useRecentNetworks';
import type { Network } from './NetworkSwitcher';

interface NetworkSwitcherPanelProps {
  networks: Network[];
  currentNetworkId?: string;
  onNetworkChange: (networkId: string) => void;
  onClose: () => void;
}

export function NetworkSwitcherPanel({
  networks,
  currentNetworkId,
  onNetworkChange,
  onClose,
}: NetworkSwitcherPanelProps) {
  const { recentNetworkIds, addRecentNetwork } = useRecentNetworks();
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const recentNetworks = recentNetworkIds
    .map((id) => networks.find((n) => n.id === id))
    .filter((n): n is Network => Boolean(n));
  const nonRecentNetworks = networks.filter((n) => !recentNetworkIds.includes(n.id));

  const handleNetworkClick = useCallback(
    (networkId: string) => {
      addRecentNetwork(networkId);
      onNetworkChange(networkId);
    },
    [addRecentNetwork, onNetworkChange],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.parentElement?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    listboxRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = panelRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="option"]',
      );
      if (!items || items.length === 0) return;

      const currentIndex = Array.from(items).indexOf(
        document.activeElement as HTMLButtonElement,
      );

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % items.length;
          items[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + items.length) % items.length;
          items[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          items[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [onClose],
  );

  const renderNetworkItem = (network: Network) => (
    <li key={network.id} role="presentation">
      <button
        role="option"
        aria-selected={network.id === currentNetworkId}
        className="network-switcher-item"
        onClick={() => handleNetworkClick(network.id)}
      >
        {network.name}
      </button>
    </li>
  );

  return (
    <div ref={panelRef} className="network-switcher-panel" onKeyDown={handleKeyDown}>
      {networks.length === 0 ? (
        <div className="network-switcher-empty">
          <p className="network-switcher-empty-title">No networks available</p>
          <p className="network-switcher-empty-description">
            Networks will appear here once they are configured for your account.
          </p>
        </div>
      ) : (
        <div
          ref={listboxRef}
          className="network-switcher-listbox"
          role="listbox"
          aria-label="Select a network"
          tabIndex={-1}
        >
          {recentNetworks.length > 0 && (
            <>
              <div
                id="network-switcher-recents-heading"
                className="network-switcher-section-header"
                aria-hidden="true"
              >
                Recent Networks
              </div>
              <ul
                className="network-switcher-list"
                role="group"
                aria-labelledby="network-switcher-recents-heading"
              >
                {recentNetworks.map(renderNetworkItem)}
              </ul>
              <div
                className="network-switcher-separator"
                data-testid="network-switcher-separator"
                aria-hidden="true"
              />
            </>
          )}
          {nonRecentNetworks.length > 0 && (
            <>
              <div
                id="network-switcher-all-heading"
                className="network-switcher-section-header"
                aria-hidden="true"
              >
                All Networks
              </div>
              <ul
                className="network-switcher-list"
                role="group"
                aria-labelledby="network-switcher-all-heading"
              >
                {nonRecentNetworks.map(renderNetworkItem)}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="network-switcher-footer">
        <button className="network-switcher-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
