import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGraphQLEndpoint, graphqlQuery, QUERIES } from '../graphql.js';

describe('graphql module', () => {
  describe('getGraphQLEndpoint', () => {
    it('returns ethereum endpoint', () => {
      expect(getGraphQLEndpoint('ethereum')).toBe('https://easscan.org/graphql');
    });

    it('returns sepolia endpoint', () => {
      expect(getGraphQLEndpoint('sepolia')).toBe('https://sepolia.easscan.org/graphql');
    });

    it('returns base endpoint', () => {
      expect(getGraphQLEndpoint('base')).toBe('https://base.easscan.org/graphql');
    });

    it('throws for unknown chain', () => {
      expect(() => getGraphQLEndpoint('unknown')).toThrow('No GraphQL endpoint for chain "unknown"');
    });
  });

  describe('graphqlQuery', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('sends POST request with correct body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { schema: { id: '0x123' } } }),
      });

      await graphqlQuery('ethereum', 'query { schema }', { id: '0x123' });

      expect(fetchMock).toHaveBeenCalledWith('https://easscan.org/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query { schema }', variables: { id: '0x123' } }),
      });
    });

    it('returns data on success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { schema: { id: '0x123' } } }),
      });

      const result = await graphqlQuery('ethereum', 'query { schema }');
      expect(result).toEqual({ schema: { id: '0x123' } });
    });

    it('uses empty object as default variables', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });

      await graphqlQuery('ethereum', 'query { test }');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.variables).toEqual({});
    });

    it('throws on HTTP error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(graphqlQuery('ethereum', 'query { test }')).rejects.toThrow(
        'GraphQL request failed: 500 Internal Server Error'
      );
    });

    it('throws on GraphQL errors', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Field not found' }],
        }),
      });

      await expect(graphqlQuery('ethereum', 'query { test }')).rejects.toThrow(
        'GraphQL error: Field not found'
      );
    });

    it('throws for unknown chain', async () => {
      await expect(graphqlQuery('unknown', 'query { test }')).rejects.toThrow(
        'No GraphQL endpoint for chain "unknown"'
      );
    });
  });

  describe('QUERIES', () => {
    it('has getSchema query', () => {
      expect(QUERIES.getSchema).toContain('GetSchema');
      expect(QUERIES.getSchema).toContain('$id: String!');
    });

    it('has getAttestation query', () => {
      expect(QUERIES.getAttestation).toContain('GetAttestation');
      expect(QUERIES.getAttestation).toContain('decodedDataJson');
    });

    it('has getAttestationsBySchema query', () => {
      expect(QUERIES.getAttestationsBySchema).toContain('$schemaId: String!');
      expect(QUERIES.getAttestationsBySchema).toContain('$take: Int');
    });

    it('has getAttestationsByAttester query', () => {
      expect(QUERIES.getAttestationsByAttester).toContain('$attester: String!');
    });

    it('has getSchemata query', () => {
      expect(QUERIES.getSchemata).toContain('$creator: String');
      expect(QUERIES.getSchemata).toContain('schemata');
    });
  });
});
