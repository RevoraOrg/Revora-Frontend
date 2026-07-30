import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  'aria-label'?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, className = '', 'aria-label': ariaLabel = 'Activity feed filters' }) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showScrollFade, setShowScrollFade] = useState({ left: false, right: false });
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    setShowScrollFade({
      left: hasOverflow && el.scrollLeft > 4,
      right: hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);

  useEffect(() => {
    checkOverflow();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkOverflow, { passive: true });
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkOverflow);
      ro.disconnect();
    };
  }, [checkOverflow, tabs]);

  useEffect(() => {
    if (activeIndex >= 0) {
      setFocusedIndex(activeIndex);
      const tabEl = document.getElementById(`tab-${tabs[activeIndex].id}`);
      tabEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeIndex, tabs]);

  const activateTab = (index: number) => {
    onTabChange(tabs[index].id);
    setFocusedIndex(index);
    const tabEl = document.getElementById(`tab-${tabs[index].id}`);
    tabEl?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = index > 0 ? index - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = index < tabs.length - 1 ? index + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        activateTab(index);
        return;
      default:
        return;
    }

    activateTab(newIndex);
  };

  return (
    <div className={`tabs-wrapper ${className}`}>
      {showScrollFade.left && <div className="tab-scroll-fade tab-scroll-fade--left" aria-hidden="true" />}
      <div
        ref={scrollRef}
        className="tabs-scroll-container"
        role="tablist"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
      >
        <div className="tabs-inner">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTab;
            const isFocused = index === focusedIndex;

            return (
              <button
                key={tab.id}
                onClick={() => activateTab(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`tab-btn${isActive ? ' tab-btn--active' : ''}${isFocused ? ' tab-btn--focused' : ''}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
              >
                <span className="tab-label">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`tab-badge${isActive ? ' tab-badge--active' : ''}`}
                    aria-label={`${tab.count} ${tab.label.toLowerCase()}`}
                  >
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
                {isActive && <span className="tab-active-indicator" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
      {showScrollFade.right && <div className="tab-scroll-fade tab-scroll-fade--right" aria-hidden="true" />}
    </div>
  );
};

export default Tabs;
