import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWait = vi.fn().mockResolvedValue('0xschemauid');
const mockRegister = vi.fn().mockResolvedValue({ wait: mockWait });
const mockClient = {
  schemaRegistry: { register: mockRegister },
};

vi.mock('../../client.js', () => ({
  createEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

import { schemaRegisterCommand } from '../../commands/schema-register.js';
import { output } from '../../output.js';

describe('schema-register command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await schemaRegisterCommand.parseAsync(['node', 'test', ...args]);
  }

  it('registers schema with defaults', async () => {
    await runCommand(['-s', 'uint256 score, string name']);

    expect(mockRegister).toHaveBeenCalledWith({
      schema: 'uint256 score, string name',
      resolverAddress: '0x0000000000000000000000000000000000000000',
      revocable: true,
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        uid: '0xschemauid',
        schema: 'uint256 score, string name',
        resolver: '0x0000000000000000000000000000000000000000',
        revocable: true,
        chain: 'ethereum',
      },
    });
  });

  it('passes custom resolver', async () => {
    await runCommand(['-s', 'uint8 x', '--resolver', '0xResolver']);
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ resolverAddress: '0xResolver' })
    );
  });

  it('passes SDK errors to handleError', async () => {
    mockRegister.mockRejectedValueOnce(new Error('tx reverted'));
    await runCommand(['-s', 'uint8 x']);
    const { handleError } = await import('../../output.js');
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('tx reverted');
  });

  it('handles --no-revocable', async () => {
    await runCommand(['-s', 'uint8 x', '--no-revocable']);
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ revocable: false })
    );
  });
});
