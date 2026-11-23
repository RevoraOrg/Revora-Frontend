import { WalletConnectionProvider } from './components/WalletConnection/WalletConnectionContext';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { DensityProvider } from './components/DensityProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { RecentNetworksProvider } from './components/RecentNetworksProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <DensityProvider>
        <RecentNetworksProvider>
          <WalletConnectionProvider>
            <App />
          </WalletConnectionProvider>
        </RecentNetworksProvider>
      </DensityProvider>
    </ThemeProvider>
  </React.StrictMode>
);
