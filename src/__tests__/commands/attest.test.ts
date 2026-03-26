import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEstimateGas = vi.fn().mockResolvedValue(21000n);
const mockWait = vi.fn();
const mockTx = { wait: mockWait, receipt: null as any, estimateGas: mockEstimateGas };
const mockAttest = vi.fn().mockResolvedValue(mockTx);
const mockClient = {
  eas: { attest: mockAttest },
  address: '0xAttester',
};

vi.mock('../../client.js', () => ({
  createEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('../../stdin.js', () => ({
  resolveInput: vi.fn((v: string) => Promise.resolve(v)),
}));

vi.mock('../../validation.js', () => ({
  validateAddress: vi.fn(),
  validateBytes32: vi.fn(),
  resolveAndValidateSchemaUID: vi.fn((v: string) => v),
}));

const mockEncodeData = vi.fn().mockReturnValue('0xencoded');

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  SchemaEncoder: class MockSchemaEncoder {
    constructor(...args: any[]) { mockSchemaEncoderConstructor(...args); }
    encodeData = mockEncodeData;
  },
  NO_EXPIRATION: 0n,
  ZERO_BYTES32: '0x0000000000000000000000000000000000000000000000000000000000000000',
}));

const mockSchemaEncoderConstructor = vi.fn();

import { attestCommand } from '../../commands/attest.js';
import { createEASClient } from '../../client.js';
import { output, handleError } from '../../output.js';
import { resolveInput } from '../../stdin.js';

describe('attest command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockImplementation(async () => {
      mockTx.receipt = { hash: '0xtxhash123' };
      return '0xuid123';
    });
  });

  async function runCommand(args: string[]) {
    await attestCommand.parseAsync(['node', 'test', ...args]);
  }

  it('creates attestation with valid data', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"score","type":"uint256","value":"100"}]',
    ]);

    expect(createEASClient).toHaveBeenCalledWith('ethereum', undefined);
    expect(resolveInput).toHaveBeenCalledWith('[{"name":"score","type":"uint256","value":"100"}]');
    expect(mockSchemaEncoderConstructor).toHaveBeenCalledWith('uint256 score');
    expect(mockEncodeData).toHaveBeenCalledWith([
      { name: 'score', type: 'uint256', value: '100' },
    ]);
    expect(mockAttest).toHaveBeenCalledWith({
      schema: '0xschema',
      data: expect.objectContaining({
        recipient: '0x0000000000000000000000000000000000000000',
        revocable: true,
        data: '0xencoded',
      }),
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        uid: '0xuid123',
        txHash: '0xtxhash123',
        attester: '0xAttester',
        schema: '0xschema',
        chain: 'ethereum',
      }),
    });
  });

  it('handles invalid JSON in --data', async () => {
    await runCommand(['-s', '0xschema', '-d', 'not-json']);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('Invalid JSON in --data');
  });

  it('uses custom chain and rpc-url', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '-c', 'sepolia',
      '--rpc-url', 'https://custom.rpc',
    ]);
    expect(createEASClient).toHaveBeenCalledWith('sepolia', 'https://custom.rpc');
  });

  it('passes custom recipient', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '-r', '0xRecipient',
    ]);
    expect(mockAttest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recipient: '0xRecipient' }),
      })
    );
  });

  it('passes value as BigInt', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--value', '1000',
    ]);
    expect(mockAttest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 1000n }),
      })
    );
  });

  it('uses NO_EXPIRATION constant when expiration is 0', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--expiration', '0',
    ]);
    const callData = mockAttest.mock.calls[0][0].data;
    expect(callData.expirationTime).toBe(0n);
  });

  it('passes non-zero expiration as BigInt (not NO_EXPIRATION)', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--expiration', '1700000000',
    ]);
    const callData = mockAttest.mock.calls[0][0].data;
    expect(callData.expirationTime).toBe(1700000000n);
    expect(callData.expirationTime).not.toBe(0n);
  });

  it('passes --no-revocable as false', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--no-revocable',
    ]);
    expect(mockAttest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revocable: false }),
      })
    );
  });

  it('passes SDK errors to handleError', async () => {
    mockAttest.mockRejectedValueOnce(new Error('insufficient funds'));
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
    ]);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('insufficient funds');
  });

  it('builds schema string from multiple data items', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"score","type":"uint256","value":"1"},{"name":"name","type":"string","value":"test"}]',
    ]);
    expect(mockSchemaEncoderConstructor).toHaveBeenCalledWith('uint256 score, string name');
  });

  it('estimates gas in dry-run mode without sending', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--dry-run',
    ]);

    expect(mockEstimateGas).toHaveBeenCalled();
    expect(mockWait).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { dryRun: true, estimatedGas: '21000', chain: 'ethereum' },
    });
  });
});
