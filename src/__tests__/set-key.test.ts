import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', () => ({
  setStoredPrivateKey: vi.fn(),
}));

const mockWalletAddress = '0xMockWalletAddress';
vi.mock('ethers', () => ({
  ethers: {
    Wallet: class MockWallet {
      address = mockWalletAddress;
      constructor(key: string) {
        if (key === '0xinvalid') throw new Error('invalid private key');
      }
    },
  },
}));

import { setKeyCommand } from '../commands/set-key.js';
import { setStoredPrivateKey } from '../config.js';

describe('set-key command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  it('stores key and shows wallet address', async () => {
    await setKeyCommand.parseAsync(['node', 'test', '0xabc123']);
    expect(setStoredPrivateKey).toHaveBeenCalledWith('0xabc123');
    expect(consoleSpy).toHaveBeenCalledWith('Private key stored successfully.');
    expect(consoleSpy).toHaveBeenCalledWith(`Wallet address: ${mockWalletAddress}`);
  });

  it('rejects invalid key', async () => {
    await setKeyCommand.parseAsync(['node', 'test', 'invalid']);
    expect(errorSpy).toHaveBeenCalledWith('Error: Invalid private key format.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
