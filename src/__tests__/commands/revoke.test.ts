import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWait = vi.fn().mockResolvedValue(undefined);
const mockRevoke = vi.fn().mockResolvedValue({ wait: mockWait });
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

import { revokeCommand } from '../../commands/revoke.js';
import { output, handleError } from '../../output.js';

describe('revoke command', () => {
  beforeEach(() => vi.clearAllMocks());

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
        schema: '0xschema',
        chain: 'ethereum',
      },
    });
  });

  it('passes SDK errors to handleError', async () => {
    mockRevoke.mockRejectedValue(new Error('revocation failed'));
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
});
