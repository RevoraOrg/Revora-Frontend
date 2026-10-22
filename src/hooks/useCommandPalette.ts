/**
 * useCommandPalette
 *
 * Manages open/close state for the command palette and persists the
 * per-user recent-actions list in localStorage.
 *
 * Storage key:  "revora:recent-commands:<userId>"
 * Limit:        RECENT_LIMIT = 5
 * Clear:        call clearRecent() — invoked automatically on sign-out
 *               via the exported helper clearRecentCommandsForUser().
 *
 * Keyboard triggers (mirrored from useKeyboardShortcuts):
 *   - Cmd/Ctrl + K  → open palette
 *   - Escape         → close palette (when open, from any element)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CommandItem } from '../components/CommandPalette/commandPaletteData';
import { COMMAND_BY_ID } from '../components/CommandPalette/commandPaletteData';

export const RECENT_LIMIT = 5;

export interface RecentCommandEntry {
  id: string;
  timestamp: number;
}

/** Stable storage key for a given user. Pass '' / undefined for anonymous. */
export function recentCommandsKey(userId?: string): string {
  return `revora:recent-commands:${userId ?? 'anonymous'}`;
}

/** Reads the stored list without loading the hook (useful for sign-out). */
export function clearRecentCommandsForUser(userId?: string): void {
  try {
    localStorage.removeItem(recentCommandsKey(userId));
  } catch {
    // storage unavailable — ignore
  }
}

function parseStoredEntries(raw: string): RecentCommandEntry[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const entries: RecentCommandEntry[] = [];
    const seenIds = new Set<string>();

    for (const item of parsed) {
      if (!item) continue;

      let id: string | undefined;
      let timestamp = Date.now();

      if (typeof item === 'string') {
        id = item;
      } else if (typeof item === 'object') {
        if (typeof item.id === 'string') {
          id = item.id;
        }
        if (typeof item.timestamp === 'number') {
          timestamp = item.timestamp;
        }
      }

      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        entries.push({ id, timestamp });
      }
    }

    return entries.slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}

function loadRecent(userId?: string): CommandItem[] {
  try {
    const raw = localStorage.getItem(recentCommandsKey(userId));
    if (!raw) return [];
    const entries = parseStoredEntries(raw);

    const items: CommandItem[] = [];
    const validEntries: RecentCommandEntry[] = [];

    for (const entry of entries) {
      const catalogItem = COMMAND_BY_ID.get(entry.id);
      if (catalogItem) {
        items.push(catalogItem);
        validEntries.push(entry);
      }
    }

    saveRecentEntries(validEntries, userId);

    return items;
  } catch {
    return [];
  }
}

function saveRecentEntries(entries: RecentCommandEntry[], userId?: string): void {
  try {
    localStorage.setItem(recentCommandsKey(userId), JSON.stringify(entries));
  } catch {
    // quota exceeded or storage unavailable — ignore
  }
}

interface UseCommandPaletteOptions {
  /** Current user identifier — used to scope the recent-actions storage key. */
  userId?: string;
}

interface UseCommandPaletteReturn {
  isOpen: boolean;
  isMac: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  recentCommands: CommandItem[];
  addRecent: (item: CommandItem) => void;
  clearRecent: () => void;
}

export function useCommandPalette(
  options: UseCommandPaletteOptions = {},
): UseCommandPaletteReturn {
  const { userId } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [recentCommands, setRecentCommands] = useState<CommandItem[]>(() =>
    loadRecent(userId),
  );

  // Keep a ref so the keydown handler never captures stale state
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Reload recent commands when userId changes (e.g., sign-in → different user)
  useEffect(() => {
    setRecentCommands(loadRecent(userId));
  }, [userId]);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'));
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  /** Add a command to the top of the recent list, capping at RECENT_LIMIT. */
  const addRecent = useCallback(
    (item: CommandItem) => {
      setRecentCommands((prev) => {
        // Resolve canonical item from catalog if available
        const canonical = COMMAND_BY_ID.get(item.id) ?? item;
        // Remove any existing entry for the same command id then prepend
        const filtered = prev.filter((r) => r.id !== item.id);
        const next = [canonical, ...filtered].slice(0, RECENT_LIMIT);
        const entries: RecentCommandEntry[] = next.map((cmd) => ({
          id: cmd.id,
          timestamp: Date.now(),
        }));
        saveRecentEntries(entries, userId);
        return next;
      });
    },
    [userId],
  );

  /** Clear all recent actions for the current user and persist the change. */
  const clearRecent = useCallback(() => {
    setRecentCommands([]);
    clearRecentCommandsForUser(userId);
  }, [userId]);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.key === 'Escape' && isOpenRef.current) {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && !inInput) {
        e.preventDefault();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, close]);

  return {
    isOpen,
    isMac,
    open,
    close,
    toggle,
    recentCommands,
    addRecent,
    clearRecent,
  };
}
