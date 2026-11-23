import { WalletConnectionProvider } from './components/WalletConnection/WalletConnectionContext';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './components/AuthProvider';
import { DensityProvider } from './components/DensityProvider';
import { RecentNetworksProvider } from './components/RecentNetworksProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <DensityProvider>
        <RecentNetworksProvider>
          <WalletConnectionProvider>
            <App />
          </WalletConnectionProvider>
        </RecentNetworksProvider>
      </DensityProvider>
    </AuthProvider>
  </React.StrictMode>
);
