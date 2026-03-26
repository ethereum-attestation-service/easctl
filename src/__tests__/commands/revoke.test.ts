import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockEstimateGas = vi.fn().mockResolvedValue(30000n);
const mockWait = vi.fn();
const mockTx = { wait: mockWait, receipt: null as any, estimateGas: mockEstimateGas };
const mockRevoke = vi.fn().mockResolvedValue(mockTx);
const mockClient = {
  eas: { revoke: mockRevoke },
};

vi.mock('../../client.js', () => ({
  createEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('../../validation.js', () => ({
  validateBytes32: vi.fn(),
  resolveAndValidateSchemaUID: vi.fn((v: string) => v),
}));

import { revokeCommand } from '../../commands/revoke.js';
import { output, handleError } from '../../output.js';

describe('revoke command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockImplementation(async () => {
      mockTx.receipt = { hash: '0xrevokehash' };
      return undefined;
    });
  });

  async function runCommand(args: string[]) {
    await revokeCommand.parseAsync(['node', 'test', ...args]);
  }

  it('revokes attestation successfully', async () => {
    await runCommand(['-s', '0xschema', '-u', '0xuid']);

    expect(mockRevoke).toHaveBeenCalledWith({
      schema: '0xschema',
      data: { uid: '0xuid', value: 0n },
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        revoked: true,
        uid: '0xuid',
        txHash: '0xrevokehash',
        schema: '0xschema',
        chain: 'ethereum',
      },
    });
  });

  it('passes SDK errors to handleError', async () => {
    mockRevoke.mockRejectedValueOnce(new Error('revocation failed'));
    await runCommand(['-s', '0xschema', '-u', '0xuid']);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('revocation failed');
  });

  it('passes custom value as BigInt', async () => {
    await runCommand(['-s', '0xschema', '-u', '0xuid', '--value', '1000']);

    expect(mockRevoke).toHaveBeenCalledWith({
      schema: '0xschema',
      data: { uid: '0xuid', value: 1000n },
    });
  });

  it('estimates gas in dry-run mode without sending', async () => {
    await runCommand(['-s', '0xschema', '-u', '0xuid', '--dry-run']);

    expect(mockEstimateGas).toHaveBeenCalled();
    expect(mockWait).not.toHaveBeenCalled();
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { dryRun: true, estimatedGas: '30000', chain: 'ethereum' },
    });
  });
});
