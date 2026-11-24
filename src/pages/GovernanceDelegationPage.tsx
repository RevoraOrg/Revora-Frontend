import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GovernanceDelegation } from '../components/GovernanceDelegation/GovernanceDelegation';

export const GovernanceDelegationPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--spacing-xl) var(--spacing-lg)' }}>
      <nav aria-label="Governance navigation" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <Link
          to="/startup/governance/proposals"
          className="link-styled"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Proposals
        </Link>
      </nav>
      <GovernanceDelegation />
    </div>
  );
};

export default GovernanceDelegationPage;
