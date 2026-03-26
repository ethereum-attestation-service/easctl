import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../graphql.js', () => ({
  graphqlQuery: vi.fn(),
  QUERIES: {
    getSchema: 'query GetSchema($id: String!) { schema(where: { id: $id }) { id } }',
  },
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('../../validation.js', () => ({
  validateBytes32: vi.fn(),
  resolveAndValidateSchemaUID: vi.fn((v: string) => v),
}));

import { querySchemaCommand } from '../../commands/query-schema.js';
import { graphqlQuery, QUERIES } from '../../graphql.js';
import { output, handleError } from '../../output.js';

describe('query-schema command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await querySchemaCommand.parseAsync(['node', 'test', ...args]);
  }

  it('queries and returns schema data', async () => {
    (graphqlQuery as any).mockResolvedValue({
      schema: { id: '0xschema', schema: 'uint256 score', creator: '0xCreator' },
    });

    await runCommand(['-u', '0xschema']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getSchema, { id: '0xschema' });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { id: '0xschema', schema: 'uint256 score', creator: '0xCreator' },
    });
  });

  it('throws when schema not found', async () => {
    (graphqlQuery as any).mockResolvedValue({ schema: null });

    await runCommand(['-u', '0xmissing']);

    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('not found');
  });

  it('uses specified chain', async () => {
    (graphqlQuery as any).mockResolvedValue({
      schema: { id: '0xschema' },
    });

    await runCommand(['-u', '0xschema', '-c', 'base']);
    expect(graphqlQuery).toHaveBeenCalledWith('base', QUERIES.getSchema, { id: '0xschema' });
  });
});
