/**
 * GovernanceProposalCreatePage — Issue #247
 *
 * Page wrapper for the multi-step governance proposal creation form.
 * Provides a full-page layout with the form component.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GovernanceProposalForm, ProposalDraft } from '../components/GovernanceProposalForm/GovernanceProposalForm';
import { useOptionalGovernanceProposals } from '../context/GovernanceProposalsContext';

export const GovernanceProposalCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const store = useOptionalGovernanceProposals();

  const handleSubmit = (draft: ProposalDraft) => {
    if (store) {
      const created = store.create(draft);
      navigate(`/startup/governance/proposals/${created.id}`);
      return;
    }
    navigate('/startup/governance/proposals');
  };

  const handleCancel = () => {
    navigate('/startup/dashboard');
  };

  return (
    <GovernanceProposalForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};

export default GovernanceProposalCreatePage;
