import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../graphql.js', () => ({
  graphqlQuery: vi.fn(),
  QUERIES: {
    getSchemata: 'query GetSchemata',
  },
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

import { querySchemasCommand } from '../../commands/query-schemas.js';
import { graphqlQuery, QUERIES } from '../../graphql.js';
import { output } from '../../output.js';

describe('query-schemas command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await querySchemasCommand.parseAsync(['node', 'test', ...args]);
  }

  it('queries schemas by creator', async () => {
    (graphqlQuery as any).mockResolvedValue({
      schemata: [{ id: '0xs1', schema: 'uint256 x' }, { id: '0xs2', schema: 'string y' }],
    });

    await runCommand(['-a', '0xCreator']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getSchemata, {
      creator: '0xCreator',
      take: 10,
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 2, schemas: expect.any(Array) },
    });
  });

  it('passes custom limit', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-a', '0xCreator', '-n', '50']);

    expect(graphqlQuery).toHaveBeenCalledWith(
      'ethereum',
      QUERIES.getSchemata,
      expect.objectContaining({ take: 50 })
    );
  });

  it('returns empty results with count 0', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-a', '0xCreator']);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, schemas: [] },
    });
  });

  it('handles missing schemata key in response', async () => {
    (graphqlQuery as any).mockResolvedValue({});

    await runCommand(['-a', '0xCreator']);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, schemas: [] },
    });
  });

  it('passes GraphQL errors to handleError', async () => {
    (graphqlQuery as any).mockRejectedValue(new Error('network timeout'));
    await runCommand(['-a', '0xCreator']);
    const { handleError } = await import('../../output.js');
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('network timeout');
  });

  it('uses specified chain', async () => {
    (graphqlQuery as any).mockResolvedValue({ schemata: [] });

    await runCommand(['-a', '0xCreator', '-c', 'polygon']);

    expect(graphqlQuery).toHaveBeenCalledWith('polygon', QUERIES.getSchemata, expect.any(Object));
  });
});
