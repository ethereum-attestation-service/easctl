import { describe, it, expect } from 'vitest';
import { graphqlQuery, QUERIES } from '../../graphql.js';

/**
 * Live smoke tests against the real EASScan GraphQL API (Sepolia).
 * These verify that our query strings and expected response shapes
 * actually work against the real indexer — something unit tests with
 * mocked fetch cannot prove.
 *
 * These hit the network so they're slower (~1-2s each).
 */
describe('GraphQL live queries (sepolia)', () => {
  const chain = 'sepolia';

  it('getSchemata returns schemas with expected fields', async () => {
    const data = await graphqlQuery(chain, QUERIES.getSchemata, { take: 2 });

    expect(data.schemata).toBeDefined();
    expect(data.schemata.length).toBeGreaterThan(0);

    const schema = data.schemata[0];
    expect(schema).toHaveProperty('id');
    expect(schema).toHaveProperty('schema');
    expect(schema).toHaveProperty('creator');
    expect(schema).toHaveProperty('revocable');
    expect(schema).toHaveProperty('time');
  });

  it('getSchema returns a single schema with expected fields', async () => {
    // First get a schema ID to query
    const list = await graphqlQuery(chain, QUERIES.getSchemata, { take: 1 });
    const schemaId = list.schemata[0].id;

    const data = await graphqlQuery(chain, QUERIES.getSchema, { id: schemaId });

    expect(data.schema).toBeDefined();
    expect(data.schema.id).toBe(schemaId);
    expect(data.schema).toHaveProperty('schema');
    expect(data.schema).toHaveProperty('creator');
    expect(data.schema).toHaveProperty('resolver');
    expect(data.schema).toHaveProperty('revocable');
    expect(data.schema).toHaveProperty('txid');
    expect(data.schema).toHaveProperty('time');
  });

  it('getAttestationsBySchema returns attestations with expected fields', async () => {
    // Use a well-known schema that has attestations on sepolia
    const data = await graphqlQuery(chain, QUERIES.getAttestationsBySchema, {
      schemaId: '0x0000000000000000000000000000000000000000000000000000000000000000',
      take: 1,
    });

    expect(data.attestations).toBeDefined();
    expect(Array.isArray(data.attestations)).toBe(true);
    // Zero-schema may or may not have attestations, but the shape should be valid
  });

  it('getAttestationsByAttester returns attestations array', async () => {
    const data = await graphqlQuery(chain, QUERIES.getAttestationsByAttester, {
      attester: '0x0000000000000000000000000000000000000000',
      take: 1,
    });

    expect(data.attestations).toBeDefined();
    expect(Array.isArray(data.attestations)).toBe(true);
  });

  it('getAttestation returns a single attestation with all expected fields', async () => {
    // First get a real attestation ID by querying recent attestations by a known schema
    // We use getSchemata to find a schema, then query its attestations
    const schemaList = await graphqlQuery(chain, QUERIES.getSchemata, { take: 1 });
    const schemaId = schemaList.schemata[0].id;

    const attList = await graphqlQuery(chain, QUERIES.getAttestationsBySchema, {
      schemaId,
      take: 1,
    });

    if (attList.attestations.length === 0) {
      // No attestations for this schema — skip rather than fail
      return;
    }

    const attId = attList.attestations[0].id;

    const data = await graphqlQuery(chain, QUERIES.getAttestation, { id: attId });

    expect(data.attestation).toBeDefined();
    expect(data.attestation.id).toBe(attId);
    expect(data.attestation).toHaveProperty('attester');
    expect(data.attestation).toHaveProperty('recipient');
    expect(data.attestation).toHaveProperty('time');
    expect(data.attestation).toHaveProperty('expirationTime');
    expect(data.attestation).toHaveProperty('revocationTime');
    expect(data.attestation).toHaveProperty('revoked');
    expect(data.attestation).toHaveProperty('revocable');
    expect(data.attestation).toHaveProperty('schemaId');
    expect(data.attestation).toHaveProperty('data');
    expect(data.attestation).toHaveProperty('decodedDataJson');
    expect(data.attestation).toHaveProperty('isOffchain');
    expect(data.attestation).toHaveProperty('txid');
  });
});
