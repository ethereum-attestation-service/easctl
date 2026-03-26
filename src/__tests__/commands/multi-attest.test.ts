import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEstimateGas = vi.fn().mockResolvedValue(50000n);
const mockWait = vi.fn();
const mockTx = { wait: mockWait, receipt: null as any, estimateGas: mockEstimateGas };
const mockMultiAttest = vi.fn().mockResolvedValue(mockTx);
const mockClient = {
  eas: { multiAttest: mockMultiAttest },
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

vi.mock('../../popular-schemas.js', () => ({
  resolveSchemaUID: vi.fn((v: string) => v),
}));

const mockEncodeData = vi.fn().mockReturnValue('0xencoded');

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  SchemaEncoder: class MockSchemaEncoder {
    encodeData = mockEncodeData;
  },
  NO_EXPIRATION: 0n,
  ZERO_BYTES32: '0x0000000000000000000000000000000000000000000000000000000000000000',
}));

import { multiAttestCommand } from '../../commands/multi-attest.js';
import { output, handleError } from '../../output.js';

describe('multi-attest command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockImplementation(async () => {
      mockTx.receipt = { hash: '0xtxhash456' };
      return ['0xuid1', '0xuid2'];
    });
  });

  async function runCommand(args: string[]) {
    await multiAttestCommand.parseAsync(['node', 'test', ...args]);
  }

  it('processes single attestation input', async () => {
    const input = JSON.stringify([
      { schema: '0xschema1', data: [{ name: 'x', type: 'uint8', value: '1' }] },
    ]);

    await runCommand(['-i', input]);

    expect(mockEncodeData).toHaveBeenCalledWith([
      { name: 'x', type: 'uint8', value: '1' },
    ]);
    expect(mockMultiAttest).toHaveBeenCalledWith([
      {
        schema: '0xschema1',
        data: [
          expect.objectContaining({
            recipient: '0x0000000000000000000000000000000000000000',
            expirationTime: 0n,
            revocable: true,
            refUID: '0x0000000000000000000000000000000000000000000000000000000000000000',
            data: '0xencoded',
            value: 0n,
          }),
        ],
      },
    ]);
  });

  it('groups attestations by schema', async () => {
    const input = JSON.stringify([
      { schema: '0xschemaA', data: [{ name: 'x', type: 'uint8', value: '1' }] },
      { schema: '0xschemaB', data: [{ name: 'y', type: 'uint8', value: '2' }] },
      { schema: '0xschemaA', data: [{ name: 'x', type: 'uint8', value: '3' }] },
    ]);

    await runCommand(['-i', input]);

    const groups = mockMultiAttest.mock.calls[0][0];
    expect(groups).toHaveLength(2);
    const groupA = groups.find((g: any) => g.schema === '0xschemaA');
    expect(groupA.data).toHaveLength(2);
  });

  it('handles invalid JSON in --input', async () => {
    await runCommand(['-i', 'not-json']);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('Invalid JSON in --input');
  });

  it('uses custom values when provided', async () => {
    const input = JSON.stringify([
      {
        schema: '0xschema1',
        recipient: '0xCustomRecipient',
        expirationTime: '1700000000',
        revocable: false,
        refUID: '0xref',
        value: '500',
        data: [{ name: 'x', type: 'uint8', value: '1' }],
      },
    ]);

    await runCommand(['-i', input]);

    const attestData = mockMultiAttest.mock.calls[0][0][0].data[0];
    expect(attestData.recipient).toBe('0xCustomRecipient');
    expect(attestData.expirationTime).toBe(1700000000n);
    expect(attestData.revocable).toBe(false);
    expect(attestData.refUID).toBe('0xref');
    expect(attestData.value).toBe(500n);
  });

  it('passes SDK errors to handleError', async () => {
    mockMultiAttest.mockRejectedValueOnce(new Error('tx failed'));
    const input = JSON.stringify([
      { schema: '0xschema1', data: [{ name: 'x', type: 'uint8', value: '1' }] },
    ]);
    await runCommand(['-i', input]);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('tx failed');
  });

  it('outputs uids, count, and txHash on success', async () => {
    const input = JSON.stringify([
      { schema: '0xschema1', data: [{ name: 'x', type: 'uint8', value: '1' }] },
    ]);

    await runCommand(['-i', input]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        uids: ['0xuid1', '0xuid2'],
        count: 2,
        txHash: '0xtxhash456',
        chain: 'ethereum',
      },
    });
  });

  it('estimates gas in dry-run mode without sending', async () => {
    const input = JSON.stringify([
      { schema: '0xschema1', data: [{ name: 'x', type: 'uint8', value: '1' }] },
    ]);

    await runCommand(['-i', input, '--dry-run']);

    expect(mockEstimateGas).toHaveBeenCalled();
    expect(mockWait).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { dryRun: true, estimatedGas: '50000', chain: 'ethereum' },
    });
  });
});
