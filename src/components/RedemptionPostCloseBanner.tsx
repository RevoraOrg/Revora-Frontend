import React, { useState, useEffect } from 'react';
import { FileText, X } from 'lucide-react';

interface RedemptionPostCloseBannerProps {
  totalRedeemed: number;
  userShare: number;
  reportLink: string;
  onDismiss: () => void;
  closedAt: string; // ISO date string
}

export const RedemptionPostCloseBanner: React.FC<RedemptionPostCloseBannerProps> = ({
  totalRedeemed,
  userShare,
  reportLink,
  onDismiss,
  closedAt,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const closedDate = new Date(closedAt);
    const now = new Date();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    if (now.getTime() - closedDate.getTime() > thirtyDaysInMs) {
      setIsVisible(false);
      onDismiss();
    }
  }, [closedAt, onDismiss]);

  if (!isVisible) return null;

  const hasParticipated = userShare > 0;

  return (
    <section 
      className="glass-card animate-fade-in p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" 
      aria-labelledby="post-close-banner-title"
      role="region"
    >
      <div className="flex-1">
        <h2 id="post-close-banner-title" className="text-lg font-semibold text-white">
          Redemption Window Closed
        </h2>
        <p className="text-muted text-sm mt-1">
          {hasParticipated 
            ? "The redemption window has closed. Here is your summary."
            : "The redemption window has closed. You did not participate in this window."
          }
        </p>
      </div>

      {hasParticipated && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-white/5 rounded-full px-4 py-1.5 text-sm font-medium text-white border border-white/10">
            Total Redeemed: ${totalRedeemed.toLocaleString()}
          </div>
          <div className="bg-primary/20 rounded-full px-4 py-1.5 text-sm font-medium text-primary border border-primary/20">
            Your Share: ${userShare.toLocaleString()}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <a 
          href={reportLink} 
          className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors flex items-center gap-2"
        >
          <FileText size={16} />
          View Detailed Report
        </a>
        <button 
          onClick={onDismiss}
          className="text-muted hover:text-white transition-colors p-1"
          aria-label="Dismiss banner"
        >
          <X size={18} />
        </button>
      </div>
    </section>
  );
};
