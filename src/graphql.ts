export const EASSCAN_URLS: Record<string, string> = {
  ethereum: 'https://easscan.org',
  sepolia: 'https://sepolia.easscan.org',
  base: 'https://base.easscan.org',
  'base-sepolia': 'https://base-sepolia.easscan.org',
  optimism: 'https://optimism.easscan.org',
  'optimism-sepolia': 'https://optimism-sepolia.easscan.org',
  arbitrum: 'https://arbitrum.easscan.org',
  'arbitrum-sepolia': 'https://arbitrum-sepolia.easscan.org',
  polygon: 'https://polygon.easscan.org',
  scroll: 'https://scroll.easscan.org',
  linea: 'https://linea.easscan.org',
  celo: 'https://celo.easscan.org',
};

export function getEASScanUrl(chainName: string): string {
  const url = EASSCAN_URLS[chainName];
  if (!url) {
    throw new Error(`No EASScan URL for chain "${chainName}"`);
  }
  return url;
}

export function getGraphQLEndpoint(chainName: string): string {
  return `${getEASScanUrl(chainName)}/graphql`;
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
    query GetAttestationsBySchema($schemaId: String!, $take: Int, $skip: Int) {
      attestations(
        where: { schemaId: { equals: $schemaId } }
        take: $take
        skip: $skip
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
    query GetAttestationsByAttester($attester: String!, $take: Int, $skip: Int) {
      attestations(
        where: { attester: { equals: $attester } }
        take: $take
        skip: $skip
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
    query GetSchemata($take: Int, $skip: Int) {
      schemata(
        take: $take
        skip: $skip
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
  getSchemataByCreator: `
    query GetSchemataByCreator($creator: String!, $take: Int, $skip: Int) {
      schemata(
        where: { creator: { equals: $creator } }
        take: $take
        skip: $skip
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
