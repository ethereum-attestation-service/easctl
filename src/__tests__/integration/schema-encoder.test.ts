import { describe, it, expect } from 'vitest';
import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';

describe('SchemaEncoder integration', () => {
  describe('encode/decode round-trip', () => {
    it('handles uint256', () => {
      const encoder = new SchemaEncoder('uint256 score');
      const encoded = encoder.encodeData([{ name: 'score', type: 'uint256', value: 42 }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0].name).toBe('score');
      expect(decoded[0].type).toBe('uint256');
      expect(decoded[0].value.value).toBe(42n);
    });

    it('handles string', () => {
      const encoder = new SchemaEncoder('string name');
      const encoded = encoder.encodeData([{ name: 'name', type: 'string', value: 'hello world' }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe('hello world');
    });

    it('handles bool', () => {
      const encoder = new SchemaEncoder('bool active');
      const encoded = encoder.encodeData([{ name: 'active', type: 'bool', value: true }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe(true);
    });

    it('handles address', () => {
      const addr = '0x0000000000000000000000000000000000000001';
      const encoder = new SchemaEncoder('address wallet');
      const encoded = encoder.encodeData([{ name: 'wallet', type: 'address', value: addr }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe(addr);
    });

    it('handles bytes32', () => {
      const hash = '0x' + 'ab'.repeat(32);
      const encoder = new SchemaEncoder('bytes32 hash');
      const encoded = encoder.encodeData([{ name: 'hash', type: 'bytes32', value: hash }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe(hash);
    });

    it('handles multiple fields', () => {
      const encoder = new SchemaEncoder('uint256 score, string name, bool active');
      const encoded = encoder.encodeData([
        { name: 'score', type: 'uint256', value: 100 },
        { name: 'name', type: 'string', value: 'Alice' },
        { name: 'active', type: 'bool', value: false },
      ]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded).toHaveLength(3);
      expect(decoded[0].value.value).toBe(100n);
      expect(decoded[1].value.value).toBe('Alice');
      expect(decoded[2].value.value).toBe(false);
    });

    it('handles large BigInt values', () => {
      const encoder = new SchemaEncoder('uint256 amount');
      const bigVal = 2n ** 128n - 1n;
      const encoded = encoder.encodeData([{ name: 'amount', type: 'uint256', value: bigVal }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe(bigVal);
    });

    it('handles zero values', () => {
      const encoder = new SchemaEncoder('uint256 val');
      const encoded = encoder.encodeData([{ name: 'val', type: 'uint256', value: 0 }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe(0n);
    });

    it('handles empty string', () => {
      const encoder = new SchemaEncoder('string text');
      const encoded = encoder.encodeData([{ name: 'text', type: 'string', value: '' }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe('');
    });

    it('handles bytes (dynamic)', () => {
      const encoder = new SchemaEncoder('bytes data');
      const encoded = encoder.encodeData([{ name: 'data', type: 'bytes', value: '0xdeadbeef' }]);
      const decoded = encoder.decodeData(encoded);

      expect(decoded[0].value.value).toBe('0xdeadbeef');
    });
  });

  describe('schema validation', () => {
    it('throws on invalid schema type', () => {
      expect(() => new SchemaEncoder('invalidtype foo')).toThrow();
    });

    it('throws on mismatched field count in encodeData', () => {
      const encoder = new SchemaEncoder('uint256 a, string b');
      expect(() =>
        encoder.encodeData([{ name: 'a', type: 'uint256', value: 1 }])
      ).toThrow();
    });
  });

  describe('encoded output format', () => {
    it('produces a hex string', () => {
      const encoder = new SchemaEncoder('uint256 x');
      const encoded = encoder.encodeData([{ name: 'x', type: 'uint256', value: 1 }]);
      expect(encoded).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    it('produces deterministic encoding', () => {
      const encoder = new SchemaEncoder('uint256 x, string y');
      const data = [
        { name: 'x', type: 'uint256', value: 42 },
        { name: 'y', type: 'string', value: 'test' },
      ];
      const encoded1 = encoder.encodeData(data);
      const encoded2 = encoder.encodeData(data);
      expect(encoded1).toBe(encoded2);
    });
  });
});
