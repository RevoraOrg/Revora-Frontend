import React, { useId, useState } from 'react';
import './TokenSupplyBlock.css';

interface TokenSupplyBlockProps {
  initialTotalSupply?: number;
  initialTreasuryAllocation?: number;
  initialPublicOffering?: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');

export const TokenSupplyBlock: React.FC<TokenSupplyBlockProps> = ({
  initialTotalSupply = 10000000,
  initialTreasuryAllocation = 2000000,
  initialPublicOffering = 5000000,
}) => {
  const [totalSupply, setTotalSupply] = useState<string>(initialTotalSupply.toString());
  const [treasuryAllocation, setTreasuryAllocation] = useState<string>(initialTreasuryAllocation.toString());
  const [publicOffering, setPublicOffering] = useState<string>(initialPublicOffering.toString());

  const patternId = useId();
  const parsedTotal = Number.parseFloat(totalSupply) || 0;
  const parsedTreasury = Number.parseFloat(treasuryAllocation) || 0;
  const parsedPublic = Number.parseFloat(publicOffering) || 0;

  const totalAllocated = parsedTreasury + parsedPublic;
  const remainingAllocation = Math.max(0, parsedTotal - totalAllocated);
  const isOverAllocated = totalAllocated > parsedTotal;

  const displayTreasuryPct = parsedTotal > 0 ? (parsedTreasury / parsedTotal) * 100 : 0;
  const displayPublicPct = parsedTotal > 0 ? (parsedPublic / parsedTotal) * 100 : 0;
  const displayRemainingPct = parsedTotal > 0 ? (remainingAllocation / parsedTotal) * 100 : 0;

  const referenceTotal = Math.max(parsedTotal, totalAllocated, 1);
  const visualTreasuryPct = referenceTotal > 0 ? (parsedTreasury / referenceTotal) * 100 : 0;
  const visualPublicPct = referenceTotal > 0 ? (parsedPublic / referenceTotal) * 100 : 0;
  const visualRemainingPct = !isOverAllocated && referenceTotal > 0 ? (remainingAllocation / referenceTotal) * 100 : 0;

  const segments = [
    {
      key: 'treasury',
      label: 'Treasury',
      value: parsedTreasury,
      width: visualTreasuryPct,
      patternId: `${patternId}-treasury`,
      className: 'token-supply-segment--treasury',
      description: `Treasury allocation ${displayTreasuryPct.toFixed(1)} percent`,
    },
    {
      key: 'public',
      label: 'Public',
      value: parsedPublic,
      width: visualPublicPct,
      patternId: `${patternId}-public`,
      className: 'token-supply-segment--public',
      description: `Public offering ${displayPublicPct.toFixed(1)} percent`,
    },
    {
      key: 'remaining',
      label: 'Remaining',
      value: remainingAllocation,
      width: visualRemainingPct,
      patternId: `${patternId}-remaining`,
      className: 'token-supply-segment--remaining',
      description: `Unallocated ${displayRemainingPct.toFixed(1)} percent`,
    },
  ];

  return (
    <div className="token-supply-block glass-card p-6" data-testid="token-supply-block">
      <h2 className="text-xl font-semibold mb-4">Token Supply & Allocation</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] gap-8 items-start">
        <div className="space-y-4">
          <div>
            <label htmlFor="totalSupply" className="block text-sm font-medium mb-1">
              Total Supply
            </label>
            <input
              id="totalSupply"
              type="number"
              min="0"
              value={totalSupply}
              onChange={(event) => setTotalSupply(event.target.value)}
              className="token-supply-input w-full"
              aria-describedby="totalSupply-desc"
              aria-invalid={parsedTotal <= 0}
            />
            <p id="totalSupply-desc" className="text-xs text-muted mt-1">Total tokens to be minted.</p>
          </div>

          <div>
            <label htmlFor="treasuryAllocation" className="block text-sm font-medium mb-1">
              Treasury Allocation
            </label>
            <input
              id="treasuryAllocation"
              type="number"
              min="0"
              value={treasuryAllocation}
              onChange={(event) => setTreasuryAllocation(event.target.value)}
              className="token-supply-input w-full"
              aria-describedby="allocation-help"
            />
          </div>

          <div>
            <label htmlFor="publicOffering" className="block text-sm font-medium mb-1">
              Public Offering
            </label>
            <input
              id="publicOffering"
              type="number"
              min="0"
              value={publicOffering}
              onChange={(event) => setPublicOffering(event.target.value)}
              className="token-supply-input w-full"
              aria-describedby="allocation-help"
            />
          </div>

          <p id="allocation-help" className="text-xs text-muted">
            Changes update the stacked bar instantly so founders can review the distribution in context.
          </p>

          {isOverAllocated ? (
            <div className="token-supply-alert" role="alert">
              Allocation exceeds total supply by {numberFormatter.format(totalAllocated - parsedTotal)} tokens.
            </div>
          ) : parsedTotal > 0 && remainingAllocation > 0 ? (
            <p className="text-sm text-slate-300">{numberFormatter.format(remainingAllocation)} tokens remain unallocated.</p>
          ) : null}
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Allocation Preview</h3>
            <p className="text-sm text-muted mb-4">
              The bar combines color, patterns, and labels to make each slice understandable without relying on color alone.
            </p>

            {parsedTotal === 0 ? (
              <div className="token-supply-empty" data-testid="empty-state" role="status">
                Enter a total supply greater than 0 to view the allocation preview.
              </div>
            ) : (
              <>
                <svg width="0" height="0" className="sr-only" aria-hidden="true">
                  <defs>
                    <pattern id={`${patternId}-treasury`} width="8" height="8" patternUnits="userSpaceOnUse">
                      <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
                    </pattern>
                    <pattern id={`${patternId}-public`} width="8" height="8" patternUnits="userSpaceOnUse">
                      <circle cx="4" cy="4" r="2" fill="rgba(255,255,255,0.35)" />
                    </pattern>
                    <pattern id={`${patternId}-remaining`} width="8" height="8" patternUnits="userSpaceOnUse">
                      <path d="M0,8 L8,0" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
                    </pattern>
                  </defs>
                </svg>

                <div
                  className={`token-supply-bar ${isOverAllocated ? 'token-supply-bar--error' : ''}`}
                  role="img"
                  aria-label={`Token allocation distribution. Treasury ${displayTreasuryPct.toFixed(1)} percent, public ${displayPublicPct.toFixed(1)} percent, remaining ${displayRemainingPct.toFixed(1)} percent.`}
                >
                  {segments
                    .filter((segment) => segment.value > 0 && segment.width > 0)
                    .map((segment) => (
                      <div
                        key={segment.key}
                        className={`token-supply-segment ${segment.className}`}
                        style={{ width: `${segment.width}%` }}
                        title={`${segment.label}: ${segment.description}`}
                        aria-hidden="true"
                      >
                        <span className="token-supply-segment-label">{segment.label}</span>
                      </div>
                    ))}
                </div>

                <div className="token-supply-summary" role="list" aria-label="Allocation legend">
                  {segments.map((segment) => {
                    const displayValue =
                      segment.key === 'treasury'
                        ? displayTreasuryPct
                        : segment.key === 'public'
                          ? displayPublicPct
                          : displayRemainingPct;

                    const valueText =
                      segment.key === 'treasury'
                        ? `${displayValue.toFixed(1)}% (${numberFormatter.format(parsedTreasury)})`
                        : segment.key === 'public'
                          ? `${displayValue.toFixed(1)}% (${numberFormatter.format(parsedPublic)})`
                          : isOverAllocated
                            ? '0.0% (0)'
                            : `${displayValue.toFixed(1)}% (${numberFormatter.format(remainingAllocation)})`;

                    return (
                      <div key={segment.key} className="token-supply-summary-item" role="listitem">
                        <div className={`token-supply-summary-swatch token-supply-summary-swatch--${segment.key}`}>
                          <svg width="100%" height="100%" className="absolute inset-0" aria-hidden="true">
                            <rect width="100%" height="100%" fill={`url(#${segment.patternId})`} />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{segment.label}</div>
                          <div className="text-muted text-xs">{valueText}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
