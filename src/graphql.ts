const EASSCAN_GRAPHQL: Record<string, string> = {
  ethereum: 'https://easscan.org/graphql',
  sepolia: 'https://sepolia.easscan.org/graphql',
  base: 'https://base.easscan.org/graphql',
  'base-sepolia': 'https://base-sepolia.easscan.org/graphql',
  optimism: 'https://optimism.easscan.org/graphql',
  'optimism-sepolia': 'https://optimism-sepolia.easscan.org/graphql',
  arbitrum: 'https://arbitrum.easscan.org/graphql',
  'arbitrum-sepolia': 'https://arbitrum-sepolia.easscan.org/graphql',
  polygon: 'https://polygon.easscan.org/graphql',
  scroll: 'https://scroll.easscan.org/graphql',
  linea: 'https://linea.easscan.org/graphql',
  celo: 'https://celo.easscan.org/graphql',
};

export function getGraphQLEndpoint(chainName: string): string {
  const endpoint = EASSCAN_GRAPHQL[chainName];
  if (!endpoint) {
    throw new Error(`No GraphQL endpoint for chain "${chainName}"`);
  }
  return endpoint;
}

export async function graphqlQuery(
  chainName: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<any> {
  const endpoint = getGraphQLEndpoint(chainName);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }
  return json.data;
}

export const QUERIES = {
  getSchema: `
    query GetSchema($id: String!) {
      schema(where: { id: $id }) {
        id
        schema
        creator
        resolver
        revocable
        txid
        time
      }
    }
  `,
  getAttestation: `
    query GetAttestation($id: String!) {
      attestation(where: { id: $id }) {
        id
        attester
        recipient
        time
        expirationTime
        revocationTime
        revoked
        revocable
        schemaId
        data
        decodedDataJson
        isOffchain
        txid
      }
    }
  `,
  getAttestationsBySchema: `
    query GetAttestationsBySchema($schemaId: String!, $take: Int) {
      attestations(
        where: { schemaId: { equals: $schemaId } }
        take: $take
        orderBy: [{ time: desc }]
      ) {
        id
        attester
        recipient
        time
        revoked
        decodedDataJson
        isOffchain
      }
    }
  `,
  getAttestationsByAttester: `
    query GetAttestationsByAttester($attester: String!, $take: Int) {
      attestations(
        where: { attester: { equals: $attester } }
        take: $take
        orderBy: [{ time: desc }]
      ) {
        id
        recipient
        schemaId
        time
        revoked
        decodedDataJson
        isOffchain
      }
    }
  `,
  getSchemata: `
    query GetSchemata($creator: String, $take: Int) {
      schemata(
        where: { creator: { equals: $creator } }
        take: $take
        orderBy: [{ time: desc }]
      ) {
        id
        schema
        creator
        revocable
        time
      }
    }
  `,
};
