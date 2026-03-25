import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockProvider = { getNetwork: vi.fn() };
const mockWallet = { address: '0xTestAddress', provider: mockProvider };

vi.mock('ethers', () => {
  return {
    ethers: {
      JsonRpcProvider: class MockJsonRpcProvider {
        constructor(...args: any[]) {
          mockProviderConstructor(...args);
          return mockProvider as any;
        }
      },
      Wallet: class MockWallet {
        constructor(...args: any[]) {
          mockWalletConstructor(...args);
          return mockWallet as any;
        }
      },
    },
  };
});

const mockProviderConstructor = vi.fn();
const mockWalletConstructor = vi.fn();

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  EAS: class MockEAS {
    constructor(...args: any[]) { mockEASConstructor(...args); }
  },
  SchemaRegistry: class MockSchemaRegistry {
    constructor(...args: any[]) { mockSchemaRegistryConstructor(...args); }
  },
}));

const mockEASConstructor = vi.fn();
const mockSchemaRegistryConstructor = vi.fn();

import { getPrivateKey, createEASClient, createReadOnlyEASClient } from '../client.js';
import { getStoredPrivateKey } from '../config.js';

vi.mock('../config.js', () => ({
  getStoredPrivateKey: vi.fn(),
}));

describe('client module', () => {
  const originalEnv = process.env.EAS_PRIVATE_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.EAS_PRIVATE_KEY = originalEnv;
    } else {
      delete process.env.EAS_PRIVATE_KEY;
    }
  });

  describe('getPrivateKey', () => {
    it('returns key with 0x prefix when already present', () => {
      process.env.EAS_PRIVATE_KEY = '0xabc123';
      expect(getPrivateKey()).toBe('0xabc123');
    });

    it('adds 0x prefix when missing', () => {
      process.env.EAS_PRIVATE_KEY = 'abc123';
      expect(getPrivateKey()).toBe('0xabc123');
    });

    it('throws when env var is not set', () => {
      delete process.env.EAS_PRIVATE_KEY;
      expect(() => getPrivateKey()).toThrow('No private key found');
    });

    it('throws when env var is empty string', () => {
      process.env.EAS_PRIVATE_KEY = '';
      expect(() => getPrivateKey()).toThrow('No private key found');
    });

    it('falls back to stored key when env var not set', () => {
      delete process.env.EAS_PRIVATE_KEY;
      vi.mocked(getStoredPrivateKey).mockReturnValue('0xstoredkey');
      expect(getPrivateKey()).toBe('0xstoredkey');
    });

    it('env var takes priority over stored key', () => {
      process.env.EAS_PRIVATE_KEY = '0xenvkey';
      vi.mocked(getStoredPrivateKey).mockReturnValue('0xstoredkey');
      expect(getPrivateKey()).toBe('0xenvkey');
    });

    it('throws when both env var and stored key are missing', () => {
      delete process.env.EAS_PRIVATE_KEY;
      vi.mocked(getStoredPrivateKey).mockReturnValue(undefined);
      expect(() => getPrivateKey()).toThrow('No private key found');
    });
  });

  describe('createEASClient', () => {
    beforeEach(() => {
      process.env.EAS_PRIVATE_KEY = '0xdeadbeef';
      vi.clearAllMocks();
    });

    it('creates client with custom rpcUrl', () => {
      createEASClient('ethereum', 'https://custom-rpc.com');
      expect(mockProviderConstructor).toHaveBeenCalledWith('https://custom-rpc.com');
    });

    it('falls back to default chain RPC when no rpcUrl', () => {
      createEASClient('ethereum');
      expect(mockProviderConstructor).toHaveBeenCalledWith('https://ethereum-rpc.publicnode.com');
    });

    it('creates EAS with correct contract address and signer', () => {
      createEASClient('ethereum');
      expect(mockEASConstructor).toHaveBeenCalledWith(
        '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
        { signer: mockWallet }
      );
    });

    it('creates SchemaRegistry with correct contract address and signer', () => {
      createEASClient('ethereum');
      expect(mockSchemaRegistryConstructor).toHaveBeenCalledWith(
        '0xA7b39296258348C78294F95B872b282326A97BDF',
        { signer: mockWallet }
      );
    });

    it('returns client with address', () => {
      const client = createEASClient('ethereum');
      expect(client.address).toBe('0xTestAddress');
    });

    it('throws for unknown chain', () => {
      expect(() => createEASClient('unknown')).toThrow('Unknown chain "unknown"');
    });
  });

  describe('createReadOnlyEASClient', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates read-only client without wallet, passes provider as signer', () => {
      const client = createReadOnlyEASClient('sepolia');
      expect(mockWalletConstructor).not.toHaveBeenCalled();
      expect(client.provider).toBeDefined();
      // Verify EAS and SchemaRegistry receive the provider as signer (not a Wallet)
      expect(mockEASConstructor).toHaveBeenCalledWith(
        expect.any(String),
        { signer: mockProvider }
      );
      expect(mockSchemaRegistryConstructor).toHaveBeenCalledWith(
        expect.any(String),
        { signer: mockProvider }
      );
    });

    it('uses default RPC when no custom URL', () => {
      createReadOnlyEASClient('sepolia');
      expect(mockProviderConstructor).toHaveBeenCalledWith('https://ethereum-sepolia-rpc.publicnode.com');
    });

    it('uses custom RPC when provided', () => {
      createReadOnlyEASClient('sepolia', 'https://my-rpc.com');
      expect(mockProviderConstructor).toHaveBeenCalledWith('https://my-rpc.com');
    });
  });
});
