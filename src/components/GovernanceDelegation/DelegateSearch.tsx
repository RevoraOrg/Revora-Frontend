import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Clock, User } from 'lucide-react';
import './GovernanceDelegation.css';

/* ─── Types ──────────────────────────────────────────────────── */

export interface DelegateSearchResult {
  id: string;
  name: string;
  address: string;
  /** Whether this is the current user */
  isSelf?: boolean;
  /** Whether this delegate is recently searched */
  isRecent?: boolean;
}

interface DelegateSearchProps {
  onSelectDelegate: (delegateId: string) => void;
  /** The user's own wallet address for self-delegation detection */
  userAddress?: string;
  /** Whether the search is in a loading state */
  loading?: boolean;
}

/* ─── Mock data ──────────────────────────────────────────────── */

const MOCK_DELEGATES: DelegateSearchResult[] = [
  { id: 'del-1', name: 'Alice Voter', address: '0x1234...5678' },
  { id: 'del-2', name: 'Bob Stake', address: '0x8765...4321' },
  { id: 'del-3', name: 'Charlie Node', address: '0xABCD...EF01' },
  { id: 'del-4', name: 'Diana Chain', address: '0xFEED...BEEF' },
  { id: 'del-5', name: 'Evan Block', address: '0xC0DE...CAFE' },
];

const RECENT_SEARCHES_KEY = 'gd-recent-delegate-searches';

/* ─── Helpers ────────────────────────────────────────────────── */

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(id: string): void {
  try {
    const recent = getRecentSearches().filter((r) => r !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 5)));
  } catch {
    // Storage unavailable – silent fail
  }
}

/* ─── Component ──────────────────────────────────────────────── */

export const DelegateSearch: React.FC<DelegateSearchProps> = ({
  onSelectDelegate,
  userAddress,
  loading = false,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allDelegates = MOCK_DELEGATES.map((d) => ({
    ...d,
    isSelf: userAddress ? d.address.toLowerCase() === userAddress.toLowerCase() : false,
  }));

  const recentIds = getRecentSearches();
  const recentDelegates = recentIds
    .map((id) => allDelegates.find((d) => d.id === id))
    .filter(Boolean) as DelegateSearchResult[];

  const filteredDelegates = query
    ? allDelegates.filter(
        (d) =>
          d.name.toLowerCase().includes(query.toLowerCase()) ||
          d.address.toLowerCase().includes(query.toLowerCase()),
      )
    : [];

  const showResults = isFocused && query.length > 0;
  const showRecent = isFocused && query.length === 0 && recentDelegates.length > 0;
  const showEmpty = isFocused && query.length > 0 && filteredDelegates.length === 0;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (delegateId: string) => {
      addRecentSearch(delegateId);
      onSelectDelegate(delegateId);
      setQuery('');
      setActiveIndex(-1);
      setIsFocused(false);
    },
    [onSelectDelegate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = filteredDelegates.length > 0 ? filteredDelegates : [];
    const maxIndex = results.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex <= maxIndex) {
          handleSelect(results[activeIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setQuery('');
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="gd-search" data-testid="delegate-search" ref={containerRef}>
      {/* Label */}
      <label htmlFor="delegate-search-input" className="gd-search-label">
        Find a Delegate
      </label>

      {/* Input wrapper */}
      <div className="gd-search-input-wrapper">
        <Search size={18} className="gd-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id="delegate-search-input"
          type="text"
          placeholder="Search by name or wallet address…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay to allow result click to register
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          className="gd-search-input"
          role="combobox"
          aria-expanded={showResults || showRecent}
          aria-controls="gd-search-results"
          aria-activedescendant={activeIndex >= 0 ? `gd-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label="Search delegates by name or address"
          autoComplete="off"
        />
        {query && !loading && (
          <button
            type="button"
            className="gd-search-clear"
            onClick={handleClear}
            aria-label="Clear search"
            data-testid="search-clear"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        {loading && (
          <span className="gd-search-spinner" aria-label="Searching…" role="status" data-testid="search-spinner">
            <span className="animate-spin-loader" style={{ width: 16, height: 16, border: '2px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }} />
          </span>
        )}
      </div>

      {/* Results dropdown */}
      {(showResults || showRecent) && (
        <ul
          ref={listRef}
          id="gd-search-results"
          role="listbox"
          className="gd-search-results"
          aria-label={showRecent ? 'Recent searches' : 'Search results'}
          data-testid="search-results"
        >
          {showRecent && (
            <li className="gd-search-results-header" role="presentation">
              <Clock size={14} aria-hidden="true" />
              Recent Searches
            </li>
          )}

          {showRecent &&
            recentDelegates.map((delegate, index) => (
              <li
                key={delegate.id}
                id={`gd-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`gd-search-result-item ${index === activeIndex ? 'gd-search-result-item--active' : ''}`}
                onClick={() => handleSelect(delegate.id)}
                onMouseEnter={() => setActiveIndex(index)}
                data-testid={`search-result-${delegate.id}`}
              >
                <div className="gd-search-result-avatar" aria-hidden="true">
                  {delegate.name.charAt(0)}
                </div>
                <div className="gd-search-result-info">
                  <span className="gd-search-result-name">
                    {delegate.name}
                    {delegate.isSelf && (
                      <span className="gd-search-self-tag">You</span>
                    )}
                  </span>
                  <span className="gd-search-result-address">{delegate.address}</span>
                </div>
                <Clock size={12} className="text-muted" aria-label="Recent" />
              </li>
            ))}

          {showResults &&
            filteredDelegates.map((delegate, index) => (
              <li
                key={delegate.id}
                id={`gd-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`gd-search-result-item ${index === activeIndex ? 'gd-search-result-item--active' : ''}`}
                onClick={() => handleSelect(delegate.id)}
                onMouseEnter={() => setActiveIndex(index)}
                data-testid={`search-result-${delegate.id}`}
              >
                <div className="gd-search-result-avatar" aria-hidden="true">
                  {delegate.name.charAt(0)}
                </div>
                <div className="gd-search-result-info">
                  <span className="gd-search-result-name">
                    {delegate.name}
                    {delegate.isSelf && (
                      <span className="gd-search-self-tag">You</span>
                    )}
                  </span>
                  <span className="gd-search-result-address">{delegate.address}</span>
                </div>
                {delegate.isSelf ? (
                  <User size={12} className="gd-search-self-icon" aria-label="Your address" />
                ) : (
                  <span className="sr-only">Select {delegate.name}</span>
                )}
              </li>
            ))}
        </ul>
      )}

      {/* Empty state */}
      {showEmpty && (
        <div className="gd-search-empty" role="status" data-testid="search-empty">
          <Search size={20} aria-hidden="true" />
          <p>No delegates found for "<strong>{query}</strong>"</p>
          <span className="text-muted">Try a different name or address</span>
        </div>
      )}

      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite" data-testid="search-live-region">
        {loading && 'Searching for delegates…'}
        {showResults && `${filteredDelegates.length} delegate${filteredDelegates.length !== 1 ? 's' : ''} found`}
        {showEmpty && 'No delegates found'}
      </div>
    </div>
  );
};

DelegateSearch.displayName = 'DelegateSearch';
export default DelegateSearch;
