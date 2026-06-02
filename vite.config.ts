/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/pages/Login.tsx',
        'src/pages/Signup.tsx',
        'src/pages/ForgotPassword.tsx',
        'src/components/AuthLayout.tsx',
        'src/components/AuthLayout.test.tsx'
      ],
      thresholds: {
        'src/components/AuthLayout.tsx': {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      }
    }
  }
});