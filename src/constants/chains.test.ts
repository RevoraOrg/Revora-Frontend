import {
  DEFAULT_APP_CHAIN_ID,
  getChainMetadata,
  parseChainId,
  SUPPORTED_CHAINS,
  type ChainMetadata,
} from './chains';

const supportedChainIds = [1, 10, 137, 8453, 42161, 43114, 11155111];

describe('chain metadata exports', () => {
  it('represents a complete ChainMetadata value through the public type', () => {
    const metadata: ChainMetadata = {
      id: 137,
      hexId: '0x89',
      name: 'Polygon PoS',
      shortName: 'Polygon',
      nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
      blockExplorerUrl: 'https://polygonscan.com',
      color: '#8247e5',
      accentColor: '#a472f7',
    };

    expect(metadata.id).toBe(137);
    expect(metadata.nativeCurrency.decimals).toBe(18);
  });

  it('exposes every supported chain with internally consistent identifiers', () => {
    expect(Object.keys(SUPPORTED_CHAINS).map(Number)).toEqual(supportedChainIds);

    for (const chainId of supportedChainIds) {
      const chain = SUPPORTED_CHAINS[chainId];

      expect(chain.id).toBe(chainId);
      expect(parseInt(chain.hexId, 16)).toBe(chainId);
      expect(chain.name).toBeTruthy();
      expect(chain.shortName).toBeTruthy();
      expect(chain.nativeCurrency.decimals).toBe(18);
      expect(chain.blockExplorerUrl).toMatch(/^https:\/\//);
      expect(chain.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(chain.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('uses Polygon as the default application chain', () => {
    expect(DEFAULT_APP_CHAIN_ID).toBe(137);
    expect(SUPPORTED_CHAINS[DEFAULT_APP_CHAIN_ID]).toEqual(
      expect.objectContaining({ shortName: 'Polygon', hexId: '0x89' }),
    );
  });

  it.each([
    [1, 1],
    ['137', 137],
    ['0x89', 137],
    ['0XAA36A7', 11155111],
  ])('resolves supported chain input %s to metadata for chain %s', (input, chainId) => {
    expect(getChainMetadata(input)).toBe(SUPPORTED_CHAINS[chainId]);
  });

  it('transitions from supported metadata to a deterministic unknown-chain fallback', () => {
    const known = getChainMetadata(DEFAULT_APP_CHAIN_ID);
    const unknown = getChainMetadata(999999);

    expect(known).toBe(SUPPORTED_CHAINS[DEFAULT_APP_CHAIN_ID]);
    expect(unknown).toEqual({
      id: 999999,
      hexId: '0xf423f',
      name: 'Unknown Network (Chain ID: 999999)',
      shortName: 'Chain 999999',
      nativeCurrency: { name: 'Unknown', symbol: 'ETH', decimals: 18 },
      blockExplorerUrl: '',
      color: '#94a3b8',
      accentColor: '#cbd5e1',
    });
    expect(unknown).not.toBe(known);
  });

  it.each([
    ['not-a-chain', 'Unknown Network (Chain ID: NaN)'],
    ['', 'Unknown Network (Chain ID: NaN)'],
  ])('handles invalid chain input %j without throwing', (input, expectedName) => {
    expect(() => getChainMetadata(input)).not.toThrow();
    expect(getChainMetadata(input)).toEqual(
      expect.objectContaining({
        id: 0,
        hexId: '0x0',
        name: expectedName,
        blockExplorerUrl: '',
      }),
    );
  });

  it.each([
    ['0x1', 1],
    ['0X89', 137],
    ['137', 137],
    [42161, 42161],
  ])('parses %j as chain ID %i', (input, expected) => {
    expect(parseChainId(input)).toBe(expected);
  });
});
