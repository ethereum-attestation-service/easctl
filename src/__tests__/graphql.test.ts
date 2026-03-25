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
    it('getSchema queries the schema root field with required fields', () => {
      expect(QUERIES.getSchema).toContain('$id: String!');
      expect(QUERIES.getSchema).toMatch(/schema\s*\(\s*where:/);
      expect(QUERIES.getSchema).toContain('schema');
      expect(QUERIES.getSchema).toContain('creator');
      expect(QUERIES.getSchema).toContain('resolver');
      expect(QUERIES.getSchema).toContain('revocable');
    });

    it('getAttestation queries the attestation root field with required fields', () => {
      expect(QUERIES.getAttestation).toContain('$id: String!');
      expect(QUERIES.getAttestation).toMatch(/attestation\s*\(\s*where:/);
      expect(QUERIES.getAttestation).toContain('attester');
      expect(QUERIES.getAttestation).toContain('recipient');
      expect(QUERIES.getAttestation).toContain('decodedDataJson');
      expect(QUERIES.getAttestation).toContain('schemaId');
      expect(QUERIES.getAttestation).toContain('data');
      expect(QUERIES.getAttestation).toContain('revoked');
    });

    it('getAttestationsBySchema queries attestations root field with schema filter', () => {
      expect(QUERIES.getAttestationsBySchema).toContain('$schemaId: String!');
      expect(QUERIES.getAttestationsBySchema).toContain('$take: Int');
      expect(QUERIES.getAttestationsBySchema).toMatch(/attestations\s*\(/);
      expect(QUERIES.getAttestationsBySchema).toContain('schemaId');
      expect(QUERIES.getAttestationsBySchema).toContain('decodedDataJson');
    });

    it('getAttestationsByAttester queries attestations root field with attester filter', () => {
      expect(QUERIES.getAttestationsByAttester).toContain('$attester: String!');
      expect(QUERIES.getAttestationsByAttester).toContain('$take: Int');
      expect(QUERIES.getAttestationsByAttester).toMatch(/attestations\s*\(/);
      expect(QUERIES.getAttestationsByAttester).toContain('decodedDataJson');
    });

    it('getSchemata queries schemata root field with creator filter', () => {
      expect(QUERIES.getSchemata).toContain('$creator: String');
      expect(QUERIES.getSchemata).toContain('$take: Int');
      expect(QUERIES.getSchemata).toMatch(/schemata\s*\(/);
      expect(QUERIES.getSchemata).toContain('schema');
      expect(QUERIES.getSchemata).toContain('creator');
    });
  });
});
