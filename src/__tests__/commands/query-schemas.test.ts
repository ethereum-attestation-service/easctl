import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../graphql.js', () => ({
  graphqlQuery: vi.fn(),
  QUERIES: {
    getSchemata: 'query GetSchemata',
    getSchemataByCreator: 'query GetSchemataByCreator',
  },
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

vi.mock('../../validation.js', () => ({
  validateAddress: vi.fn(),
}));

import { querySchemasCommand } from '../../commands/query-schemas.js';
import { graphqlQuery, QUERIES } from '../../graphql.js';
import { output } from '../../output.js';

describe('query-schemas command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await querySchemasCommand.parseAsync(['node', 'test', ...args]);
  }

  it('queries latest schemas without creator', async () => {
    (graphqlQuery as any).mockResolvedValue({
      schemata: [{ id: '0xs1', schema: 'uint256 x' }, { id: '0xs2', schema: 'string y' }],
    });

    await runCommand([]);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getSchemata, {
      take: 10,
      skip: 0,
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 2, schemas: expect.any(Array) },
    });
  });

  it('queries schemas by creator when provided', async () => {
    (graphqlQuery as any).mockResolvedValue({
      schemata: [{ id: '0xs1', schema: 'uint256 x' }],
    });

    await runCommand(['-a', '0xCreator']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getSchemataByCreator, {
      creator: '0xCreator',
      take: 10,
      skip: 0,
    });
  });

  it('passes custom limit', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-a', '0xCreator', '-n', '50']);

    expect(graphqlQuery).toHaveBeenCalledWith(
      'ethereum',
      QUERIES.getSchemataByCreator,
      expect.objectContaining({ take: 50 })
    );
  });

  it('passes skip for pagination', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-a', '0xCreator', '--skip', '15']);

    expect(graphqlQuery).toHaveBeenCalledWith(
      'ethereum',
      QUERIES.getSchemataByCreator,
      expect.objectContaining({ skip: 15 })
    );
  });

  it('returns empty results with count 0', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand([]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, schemas: [] },
    });
  });

  it('handles missing schemata key in response', async () => {
    (graphqlQuery as any).mockResolvedValue({});

    await runCommand([]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, schemas: [] },
    });
  });

  it('passes GraphQL errors to handleError', async () => {
    (graphqlQuery as any).mockRejectedValue(new Error('network timeout'));
    await runCommand([]);
    const { handleError } = await import('../../output.js');
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('network timeout');
  });

  it('uses specified chain', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-c', 'polygon']);

    expect(graphqlQuery).toHaveBeenCalledWith('polygon', QUERIES.getSchemata, expect.any(Object));
  });
});
