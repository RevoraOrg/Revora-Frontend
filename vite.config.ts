/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (!normalized.includes('/node_modules/')) return undefined;
          if (normalized.includes('/node_modules/@stellar/')) {
            return 'vendor-stellar';
          }
          if (
            normalized.includes('/node_modules/react-router') ||
            normalized.includes('/node_modules/@remix-run/')
          ) {
            return 'vendor-router';
          }
          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/setupTests.ts',
        'src/main.tsx',
        'src/pages/*Demo*.tsx',
        'src/pages/DistributionDashboard.types.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 89,
        functions: 87,
        branches: 85,
        'src/utils/financialTermsValidation.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/hooks/useFinancialTermsForm.ts': {
          branches: 88, functions: 95, lines: 95, statements: 95,
        },
        'src/components/FinancialTermsForm/FinancialTermsForm.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/hooks/useUploadQueue.ts': {
          branches: 94, functions: 95, lines: 95, statements: 95,
        },
        'src/components/UploadQueue/UploadQueue.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/DocumentUploader/DocumentUploader.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/HelpDrawer/HelpDrawer.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/GovernanceVoteReceipt/GovernanceVoteReceipt.tsx': {
          branches: 95, functions: 90, lines: 95, statements: 95,
        },
        'src/components/DensityProvider/DensityProvider.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/DensityToggle/DensityToggle.tsx': {
          branches: 93, functions: 95, lines: 95, statements: 95,
        },
        'src/hooks/useDensity.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/PayoutTimeline/PayoutTimeline.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/pages/PayoutSchedule.tsx': {
          branches: 79, functions: 76, lines: 86, statements: 87,
        },
        'src/components/InvestorDiscovery.tsx': {
          branches: 94,
          functions: 94,
          lines: 95,
          statements: 95,
        },
        'src/components/KpiHeader.tsx': {
          branches: 77,
          functions: 85,
          lines: 63,
          statements: 60,
        },
        'src/components/AllocationWidget.tsx': {
          branches: 84,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/components/PerformanceTrendWidget.tsx': {
          branches: 88,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/pages/InvestorPortfolioSummary.tsx': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        // Issue – Investor Statement PDF/UA
        'src/components/InvestorStatement/InvestorStatement.tsx': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/components/InvestorStatement/usePrintStatement.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // Issue #225 - Thumbnail Preview Grid
        'src/components/ThumbnailGrid/ThumbnailGrid.tsx': {
          branches: 81,
          functions: 95,
          lines: 95,
          statements: 89,
        },
        'src/components/CommandPalette/CommandPalette.tsx': {
          branches: 91,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/components/CommandPalette/commandPaletteData.ts': {
          branches: 94,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/hooks/useCommandPalette.ts': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        'src/components/Notifications/NotificationBell.tsx': {
          branches: 95, functions: 83, lines: 90, statements: 93,
        },
        'src/components/StatusTimeline/StatusTimeline.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/StatusTimeline/presets.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        // Issue #636 – Role-based dashboard variants
        'src/components/AppShell/RoleDashboard/RoleDashboard.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AppShell/RoleDashboard/WidgetCard.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AppShell/RoleDashboard/DashboardWidgetContent.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AppShell/RoleDashboard/widgets.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AppShell/RoleDashboard/onboardingHints.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AppShell/RoleDashboard/roleDashboard.types.ts': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
        'src/components/AdminAlertsInbox/AlertRow.tsx': {
          branches: 95, functions: 95, lines: 95, statements: 95,
        },
      }
    }
  }
});
