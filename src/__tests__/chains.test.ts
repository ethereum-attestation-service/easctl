import { describe, it, expect } from 'vitest';
import { getChainConfig, listChains, CHAIN_CONFIGS } from '../chains.js';

describe('chains module', () => {
  describe('getChainConfig', () => {
    it('returns ethereum config', () => {
      const config = getChainConfig('ethereum');
      expect(config.chainId).toBe(1);
      expect(config.eas).toBe('0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587');
      expect(config.schemaRegistry).toBe('0xA7b39296258348C78294F95B872b282326A97BDF');
      expect(config.defaultRpc).toBe('https://ethereum-rpc.publicnode.com');
    });

    it('returns sepolia config', () => {
      const config = getChainConfig('sepolia');
      expect(config.chainId).toBe(11155111);
    });

    it('returns base config with OP stack addresses', () => {
      const config = getChainConfig('base');
      expect(config.chainId).toBe(8453);
      expect(config.eas).toBe('0x4200000000000000000000000000000000000021');
      expect(config.schemaRegistry).toBe('0x4200000000000000000000000000000000000020');
    });

    it('returns optimism config with OP stack addresses', () => {
      const config = getChainConfig('optimism');
      expect(config.eas).toBe('0x4200000000000000000000000000000000000021');
    });

    it('throws for unknown chain', () => {
      expect(() => getChainConfig('unknown')).toThrow('Unknown chain "unknown"');
    });

    it('lists available chains in error message', () => {
      expect(() => getChainConfig('invalid')).toThrow('Available chains:');
    });
  });

  describe('listChains', () => {
    it('returns all chain names', () => {
      const chains = listChains();
      expect(chains).toContain('ethereum');
      expect(chains).toContain('sepolia');
      expect(chains).toContain('base');
      expect(chains).toContain('base-sepolia');
      expect(chains).toContain('optimism');
      expect(chains).toContain('optimism-sepolia');
      expect(chains).toContain('arbitrum');
      expect(chains).toContain('arbitrum-sepolia');
      expect(chains).toContain('polygon');
      expect(chains).toContain('scroll');
      expect(chains).toContain('linea');
      expect(chains).toContain('celo');
    });

    it('returns 12 chains', () => {
      expect(listChains()).toHaveLength(12);
    });
  });

  describe('CHAIN_CONFIGS', () => {
    it('all chains have required fields', () => {
      for (const [name, config] of Object.entries(CHAIN_CONFIGS)) {
        expect(config.chainId, `${name} missing chainId`).toBeTypeOf('number');
        expect(config.eas, `${name} missing eas`).toBeTypeOf('string');
        expect(config.schemaRegistry, `${name} missing schemaRegistry`).toBeTypeOf('string');
      }
    });

    it('all chains have a defaultRpc', () => {
      for (const [name, config] of Object.entries(CHAIN_CONFIGS)) {
        expect(config.defaultRpc, `${name} missing defaultRpc`).toBeTypeOf('string');
      }
    });

    it('all chain IDs are unique', () => {
      const ids = Object.values(CHAIN_CONFIGS).map((c) => c.chainId);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
