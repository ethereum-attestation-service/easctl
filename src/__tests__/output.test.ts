import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setJsonMode, isJsonMode, output, handleError } from '../output.js';

describe('output module', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setJsonMode(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setJsonMode / isJsonMode', () => {
    it('defaults to false', () => {
      expect(isJsonMode()).toBe(false);
    });

    it('sets to true', () => {
      setJsonMode(true);
      expect(isJsonMode()).toBe(true);
    });

    it('toggles back to false', () => {
      setJsonMode(true);
      setJsonMode(false);
      expect(isJsonMode()).toBe(false);
    });
  });

  describe('output() in JSON mode', () => {
    beforeEach(() => setJsonMode(true));

    it('outputs JSON for success result', () => {
      output({ success: true, data: { uid: 'abc' } });
      expect(logSpy).toHaveBeenCalledOnce();
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed).toEqual({ success: true, data: { uid: 'abc' } });
    });

    it('serializes BigInt values as strings', () => {
      output({ success: true, data: { value: BigInt(123) as any } });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed.data.value).toBe('123');
    });

    it('outputs JSON for error result', () => {
      output({ success: false, error: 'something failed' });
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed).toEqual({ success: false, error: 'something failed' });
    });
  });

  describe('output() in text mode', () => {
    it('prints key-value pairs for success with data', () => {
      output({ success: true, data: { uid: 'abc', chain: 'ethereum' } });
      expect(logSpy).toHaveBeenCalledWith('uid: abc');
      expect(logSpy).toHaveBeenCalledWith('chain: ethereum');
    });

    it('prints nested objects with indentation', () => {
      output({ success: true, data: { info: { name: 'test', value: '42' } } });
      expect(logSpy).toHaveBeenCalledWith('info:');
      expect(logSpy).toHaveBeenCalledWith('  name: test');
      expect(logSpy).toHaveBeenCalledWith('  value: 42');
    });

    it('formats BigInt values as strings in text mode', () => {
      output({ success: true, data: { amount: BigInt(999) as any } });
      expect(logSpy).toHaveBeenCalledWith('amount: 999');
    });

    it('formats array values through nested object path', () => {
      output({ success: true, data: { items: [1, 2, 3] as any } });
      // Arrays are objects, so they go through the nested object path
      expect(logSpy).toHaveBeenCalledWith('items:');
      expect(logSpy).toHaveBeenCalledWith('  0: 1');
      expect(logSpy).toHaveBeenCalledWith('  1: 2');
      expect(logSpy).toHaveBeenCalledWith('  2: 3');
    });

    it('prints error to stderr', () => {
      output({ success: false, error: 'bad thing happened' });
      expect(errorSpy).toHaveBeenCalledWith('Error: bad thing happened');
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('does nothing for success with no data', () => {
      output({ success: true });
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('does nothing for success false with no error', () => {
      output({ success: false });
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleError', () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('extracts message from Error instance', () => {
      handleError(new Error('test error'));
      expect(errorSpy).toHaveBeenCalledWith('Error: test error');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('converts non-Error to string', () => {
      handleError('string error');
      expect(errorSpy).toHaveBeenCalledWith('Error: string error');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('converts number to string', () => {
      handleError(42);
      expect(errorSpy).toHaveBeenCalledWith('Error: 42');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('outputs JSON error in JSON mode', () => {
      setJsonMode(true);
      handleError(new Error('json error'));
      const parsed = JSON.parse(logSpy.mock.calls[0][0]);
      expect(parsed).toEqual({ success: false, error: 'json error' });
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
