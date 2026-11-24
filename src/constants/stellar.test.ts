/**
 * Unit tests for Stellar network configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  isValidTxHash,
} from './stellar';

describe('stellar constants', () => {
  beforeEach(() => {
    // Reset import.meta.env before each test
    vi.stubGlobal('import.meta.env', {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  it('validates 64-character hex transaction hashes', () => {
    expect(isValidTxHash('a'.repeat(64))).toBe(true);
    expect(isValidTxHash('0123456789abcdefABCDEF'.repeat(2) + '0123456789abcdef0123')).toBe(true);
    expect(isValidTxHash('')).toBe(false);
    expect(isValidTxHash('abc123')).toBe(false);
    expect(isValidTxHash('a'.repeat(63))).toBe(false);
    expect(isValidTxHash('a'.repeat(65))).toBe(false);
    expect(isValidTxHash('g'.repeat(64))).toBe(false);
    expect(isValidTxHash(`${'a'.repeat(60)}/../`)).toBe(false);
  });

  it('builds transaction explorer URLs for valid 64-hex hashes', () => {
    const txHash = '0123456789abcdef'.repeat(4);
    const url = buildTransactionExplorerUrl(txHash);
    expect(url).toBe(`${DEFAULT_EXPLORER_BASE}/tx/${txHash}`);

    const upperHash = '0123456789ABCDEF'.repeat(4);
    expect(buildTransactionExplorerUrl(upperHash)).toBe(`${DEFAULT_EXPLORER_BASE}/tx/${upperHash}`);
  });

  it('returns null from buildTransactionExplorerUrl for invalid hashes', () => {
    expect(buildTransactionExplorerUrl('')).toBeNull();
    expect(buildTransactionExplorerUrl('abc123')).toBeNull();
    expect(buildTransactionExplorerUrl('a'.repeat(63))).toBeNull();
    expect(buildTransactionExplorerUrl('a'.repeat(65))).toBeNull();
    expect(buildTransactionExplorerUrl('z'.repeat(64))).toBeNull();
    expect(buildTransactionExplorerUrl('../evil?x=1')).toBeNull();
    expect(buildTransactionExplorerUrl(` ${'a'.repeat(64)} `)).toBeNull();
  });

  describe('VITE_STELLAR_CONTRACT_ID validation', () => {
    it('accepts a valid StrKey contract ID', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      vi.stubEnv('VITE_STELLAR_CONTRACT_ID', DEFAULT_CONTRACT_ID);

      const mod = await import('./stellar');
      expect(mod.CONTRACT_ID).toBe(DEFAULT_CONTRACT_ID);
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('falls back to default with console.error for a 56-char C-prefixed ID with bad checksum', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badChecksumId = `${DEFAULT_CONTRACT_ID.slice(0, -1)}A`;
      vi.resetModules();
      vi.stubEnv('VITE_STELLAR_CONTRACT_ID', badChecksumId);

      const mod = await import('./stellar');
      expect(mod.CONTRACT_ID).toBe(DEFAULT_CONTRACT_ID);
      expect(errorSpy).toHaveBeenCalledWith(
        `[Stellar Config] Invalid VITE_STELLAR_CONTRACT_ID: "${badChecksumId}". Falling back to default:`,
        DEFAULT_CONTRACT_ID,
      );
    });

    it('falls back to default with console.error for lowercase contract ID input', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const lowercaseId = DEFAULT_CONTRACT_ID.toLowerCase();
      vi.resetModules();
      vi.stubEnv('VITE_STELLAR_CONTRACT_ID', lowercaseId);

      const mod = await import('./stellar');
      expect(mod.CONTRACT_ID).toBe(DEFAULT_CONTRACT_ID);
      expect(errorSpy).toHaveBeenCalledWith(
        `[Stellar Config] Invalid VITE_STELLAR_CONTRACT_ID: "${lowercaseId}". Falling back to default:`,
        DEFAULT_CONTRACT_ID,
      );
    });
  });
});
