import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEstimateGas = vi.fn().mockResolvedValue(40000n);
const mockWait = vi.fn();
const mockTx = { wait: mockWait, receipt: null as any, estimateGas: mockEstimateGas };
const mockMultiRevoke = vi.fn().mockResolvedValue(mockTx);
const mockClient = {
  eas: { multiRevoke: mockMultiRevoke },
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

import { multiRevokeCommand } from '../../commands/multi-revoke.js';
import { output, handleError } from '../../output.js';

describe('multi-revoke command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockImplementation(async () => {
      mockTx.receipt = { hash: '0xmultirevokehash' };
      return undefined;
    });
  });

  async function runCommand(args: string[]) {
    await multiRevokeCommand.parseAsync(['node', 'test', ...args]);
  }

  it('revokes multiple attestations grouped by schema', async () => {
    const input = JSON.stringify([
      { schema: '0xschemaA', uid: '0xuid1' },
      { schema: '0xschemaB', uid: '0xuid2' },
      { schema: '0xschemaA', uid: '0xuid3' },
    ]);

    await runCommand(['-i', input]);

    const groups = mockMultiRevoke.mock.calls[0][0];
    expect(groups).toHaveLength(2);
    const groupA = groups.find((g: any) => g.schema === '0xschemaA');
    expect(groupA.data).toHaveLength(2);
    expect(groupA.data[0]).toEqual({ uid: '0xuid1', value: 0n });
    expect(groupA.data[1]).toEqual({ uid: '0xuid3', value: 0n });
  });

  it('outputs revoked count and txHash', async () => {
    const input = JSON.stringify([
      { schema: '0xschema', uid: '0xuid1' },
      { schema: '0xschema', uid: '0xuid2' },
    ]);

    await runCommand(['-i', input]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        revoked: 2,
        txHash: '0xmultirevokehash',
        chain: 'ethereum',
      },
    });
  });

  it('handles invalid JSON in --input', async () => {
    await runCommand(['-i', 'not-json']);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('Invalid JSON in --input');
  });

  it('passes custom value as BigInt', async () => {
    const input = JSON.stringify([
      { schema: '0xschema', uid: '0xuid1', value: '500' },
    ]);

    await runCommand(['-i', input]);

    const data = mockMultiRevoke.mock.calls[0][0][0].data[0];
    expect(data.value).toBe(500n);
  });

  it('passes SDK errors to handleError', async () => {
    mockMultiRevoke.mockRejectedValueOnce(new Error('tx failed'));
    const input = JSON.stringify([{ schema: '0xschema', uid: '0xuid1' }]);
    await runCommand(['-i', input]);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('tx failed');
  });

  it('estimates gas in dry-run mode without sending', async () => {
    const input = JSON.stringify([{ schema: '0xschema', uid: '0xuid1' }]);

    await runCommand(['-i', input, '--dry-run']);

    expect(mockEstimateGas).toHaveBeenCalled();
    expect(mockWait).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { dryRun: true, estimatedGas: '40000', chain: 'ethereum' },
    });
  });
});
