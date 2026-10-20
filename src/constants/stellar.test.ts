/**
 * Unit tests for Stellar network configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_NETWORK,
  DEFAULT_NETWORK_PASSPHRASE,
  DEFAULT_RPC_URL,
  DEFAULT_CONTRACT_ID,
  DEFAULT_EXPLORER_BASE,
  DEFAULT_STELLAR_LAB_BASE,
  NETWORK,
  NETWORK_PASSPHRASE,
  RPC_URL,
  CONTRACT_ID,
  EXPLORER_BASE,
  STELLAR_LAB_BASE,
  buildContractExplorerUrl,
  buildStellarLabUrl,
  buildTransactionExplorerUrl,
} from './stellar';

describe('stellar constants', () => {
  beforeEach(() => {
    // Reset import.meta.env before each test
    vi.stubGlobal('import.meta.env', {});
  });

  it('has correct default values', () => {
    expect(DEFAULT_NETWORK).toBe('TESTNET');
    expect(DEFAULT_NETWORK_PASSPHRASE).toBeDefined();
    expect(DEFAULT_RPC_URL).toBe('https://soroban-testnet.stellar.org');
    expect(DEFAULT_CONTRACT_ID).toBe('CABIJLQV4TKBHMETNIISV4OT76EDR5WXCZVJJLXHA6AEIII2JVYAHP2I');
    expect(DEFAULT_EXPLORER_BASE).toBe('https://stellar.expert/explorer/testnet');
    expect(DEFAULT_STELLAR_LAB_BASE).toBe('https://lab.stellar.org/r/testnet');
  });

  it('uses defaults when no env vars are set', () => {
    expect(NETWORK).toBe(DEFAULT_NETWORK);
    expect(NETWORK_PASSPHRASE).toBe(DEFAULT_NETWORK_PASSPHRASE);
    expect(RPC_URL).toBe(DEFAULT_RPC_URL);
    expect(CONTRACT_ID).toBe(DEFAULT_CONTRACT_ID);
    expect(EXPLORER_BASE).toBe(DEFAULT_EXPLORER_BASE);
    expect(STELLAR_LAB_BASE).toBe(DEFAULT_STELLAR_LAB_BASE);
  });

  it('builds contract explorer URLs', () => {
    const url = buildContractExplorerUrl();
    expect(url).toBe(`${DEFAULT_EXPLORER_BASE}/contract/${DEFAULT_CONTRACT_ID}`);
    
    const customUrl = buildContractExplorerUrl('CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(customUrl).toBe(`${DEFAULT_EXPLORER_BASE}/contract/CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`);
  });

  it('builds Stellar Lab URLs', () => {
    const url = buildStellarLabUrl();
    expect(url).toBe(`${DEFAULT_STELLAR_LAB_BASE}/contract/${DEFAULT_CONTRACT_ID}`);
  });

  it('builds transaction explorer URLs', () => {
    const txHash = 'abc123';
    const url = buildTransactionExplorerUrl(txHash);
    expect(url).toBe(`${DEFAULT_EXPLORER_BASE}/tx/${txHash}`);
  });
});
