import { WalletConnectionProvider } from './components/WalletConnection/WalletConnectionContext';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './components/AuthProvider';
import { DensityProvider } from './components/DensityProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { RecentNetworksProvider } from './components/RecentNetworksProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
    <ThemeProvider>
      <DensityProvider>
        <RecentNetworksProvider>
          <WalletConnectionProvider>
            <App />
          </WalletConnectionProvider>
        </RecentNetworksProvider>
      </DensityProvider>
    </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
