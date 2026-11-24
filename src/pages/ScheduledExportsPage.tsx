import React from 'react';
import { ScheduledExportsPanel } from '../components/ScheduledExports/ScheduledExportsPanel';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ScheduledExportsPage: React.FC = () => {
  useDocumentTitle('Scheduled Exports');
  return <ScheduledExportsPanel />;
};

export default ScheduledExportsPage;