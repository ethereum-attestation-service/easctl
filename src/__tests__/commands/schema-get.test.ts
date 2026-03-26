import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSchema = vi.fn().mockResolvedValue({
  uid: '0xschemauid',
  schema: 'uint256 score',
  resolver: '0x0000000000000000000000000000000000000000',
  revocable: true,
});
const mockClient = {
  schemaRegistry: { getSchema: mockGetSchema },
};

vi.mock('../../client.js', () => ({
  createReadOnlyEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('../../validation.js', () => ({
  validateBytes32: vi.fn(),
  resolveAndValidateSchemaUID: vi.fn((v: string) => v),
}));

import { schemaGetCommand } from '../../commands/schema-get.js';
import { createReadOnlyEASClient } from '../../client.js';
import { output } from '../../output.js';

describe('schema-get command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await schemaGetCommand.parseAsync(['node', 'test', ...args]);
  }

  it('gets schema by uid', async () => {
    await runCommand(['-u', '0xschemauid']);

    expect(createReadOnlyEASClient).toHaveBeenCalledWith('ethereum', undefined);
    expect(mockGetSchema).toHaveBeenCalledWith({ uid: '0xschemauid' });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        uid: '0xschemauid',
        schema: 'uint256 score',
        resolver: '0x0000000000000000000000000000000000000000',
        revocable: true,
      },
    });
  });

  it('passes SDK errors to handleError', async () => {
    mockGetSchema.mockRejectedValueOnce(new Error('contract not found'));
    await runCommand(['-u', '0xschemauid']);
    const { handleError } = await import('../../output.js');
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('contract not found');
  });

  it('uses specified chain', async () => {
    await runCommand(['-u', '0xschemauid', '-c', 'base']);
    expect(createReadOnlyEASClient).toHaveBeenCalledWith('base', undefined);
  });
});
