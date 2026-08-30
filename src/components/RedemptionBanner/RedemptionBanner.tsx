import React, { useState, useEffect } from 'react';
import './RedemptionBanner.css';

export type RedemptionStatus = 'upcoming' | 'active' | 'closing-soon';

export interface RedemptionBannerProps {
  windowId: string;
  status: RedemptionStatus;
  endDate: Date;
  eligibilityHint?: string;
  onCtaClick?: () => void;
  ctaText?: string;
}

export const RedemptionBanner: React.FC<RedemptionBannerProps> = ({
  windowId,
  status,
  endDate,
  eligibilityHint,
  onCtaClick,
  ctaText = 'Redeem Now'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // Check persistence
    const isDismissed = localStorage.getItem(`redemption_banner_dismissed_${windowId}`);
    if (!isDismissed) {
      setIsVisible(true);
    }
  }, [windowId]);

  useEffect(() => {
    if (!isVisible) return;

    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        return 'Ended';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(timer);
  }, [endDate, isVisible]);

  const handleDismiss = () => {
    localStorage.setItem(`redemption_banner_dismissed_${windowId}`, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`redemption-banner redemption-banner--${status}`}
      role="region"
      aria-live="polite"
      aria-label="Redemption Window Announcement"
    >
      <div className="redemption-banner__content">
        <div className="redemption-banner__info">
          <span className="redemption-banner__status">
            {status === 'upcoming' && '📅 Upcoming'}
            {status === 'active' && '🟢 Active'}
            {status === 'closing-soon' && '⏳ Closing Soon'}
          </span>
          <span className="redemption-banner__countdown">
            Closes in: {timeLeft}
          </span>
          {eligibilityHint && (
            <span className="redemption-banner__eligibility">
              ({eligibilityHint})
            </span>
          )}
        </div>
        <div className="redemption-banner__actions">
          <button className="redemption-banner__cta" onClick={onCtaClick}>
            {ctaText}
          </button>
          <button 
            className="redemption-banner__close" 
            onClick={handleDismiss}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
