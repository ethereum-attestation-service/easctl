import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import {
  getConfigPath,
  readConfig,
  getStoredPrivateKey,
  setStoredPrivateKey,
  clearStoredPrivateKey,
} from '../config.js';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

describe('config module', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getConfigPath', () => {
    it('returns ~/.eas-cli', () => {
      expect(getConfigPath()).toBe('/mock/home/.eas-cli');
    });
  });

  describe('readConfig', () => {
    it('returns parsed config when file exists', () => {
      vi.mocked(readFileSync).mockReturnValue('{"privateKey":"0xabc"}');
      expect(readConfig()).toEqual({ privateKey: '0xabc' });
    });

    it('returns empty object when file does not exist', () => {
      vi.mocked(readFileSync).mockImplementation(() => { throw new Error('ENOENT'); });
      expect(readConfig()).toEqual({});
    });

    it('returns empty object when file contains malformed JSON', () => {
      vi.mocked(readFileSync).mockReturnValue('not valid json{{{');
      expect(readConfig()).toEqual({});
    });
  });

  describe('getStoredPrivateKey', () => {
    it('returns the stored key', () => {
      vi.mocked(readFileSync).mockReturnValue('{"privateKey":"0xdef"}');
      expect(getStoredPrivateKey()).toBe('0xdef');
    });

    it('returns undefined when no key is stored', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      expect(getStoredPrivateKey()).toBeUndefined();
    });
  });

  describe('setStoredPrivateKey', () => {
    it('stores key with 0x prefix', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      setStoredPrivateKey('0xabc123');
      expect(writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.eas-cli',
        JSON.stringify({ privateKey: '0xabc123' }, null, 2) + '\n',
        { mode: 0o600 },
      );
    });

    it('adds 0x prefix when missing', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      setStoredPrivateKey('abc123');
      expect(writeFileSync).toHaveBeenCalledWith(
        '/mock/home/.eas-cli',
        JSON.stringify({ privateKey: '0xabc123' }, null, 2) + '\n',
        { mode: 0o600 },
      );
    });

    it('preserves other config fields', () => {
      vi.mocked(readFileSync).mockReturnValue('{"other":"value"}');
      setStoredPrivateKey('0xkey');
      const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(written)).toEqual({ other: 'value', privateKey: '0xkey' });
    });
  });

  describe('clearStoredPrivateKey', () => {
    it('removes the privateKey field', () => {
      vi.mocked(readFileSync).mockReturnValue('{"privateKey":"0xabc","other":"value"}');
      clearStoredPrivateKey();
      const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(written)).toEqual({ other: 'value' });
    });

    it('handles missing key gracefully', () => {
      vi.mocked(readFileSync).mockReturnValue('{}');
      clearStoredPrivateKey();
      const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
      expect(JSON.parse(written)).toEqual({});
    });
  });
});
