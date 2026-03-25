import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config.js', () => ({
  clearStoredPrivateKey: vi.fn(),
  getStoredPrivateKey: vi.fn(),
}));

import { clearKeyCommand } from '../commands/clear-key.js';
import { clearStoredPrivateKey, getStoredPrivateKey } from '../config.js';

describe('clear-key command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('clears the stored key', async () => {
    vi.mocked(getStoredPrivateKey).mockReturnValue('0xabc');
    await clearKeyCommand.parseAsync(['node', 'test']);
    expect(clearStoredPrivateKey).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Private key removed from ~/.eas-cli.');
  });

  it('reports when no key is stored', async () => {
    vi.mocked(getStoredPrivateKey).mockReturnValue(undefined);
    await clearKeyCommand.parseAsync(['node', 'test']);
    expect(clearStoredPrivateKey).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('No private key is currently stored.');
  });
});
