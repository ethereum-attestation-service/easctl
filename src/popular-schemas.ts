export interface PopularSchema {
  name: string;
  schema: string;
  uid: string;
  description: string;
  revocable: boolean;
  category: string;
}

// UIDs are deterministic: keccak256(abi.encodePacked(schema, address(0), revocable))
// Same UID on every chain (no resolver).
export const POPULAR_SCHEMAS: PopularSchema[] = [
  // General
  {
    name: 'make-a-statement',
    schema: 'string statement',
    uid: '0xf58b8b212ef75ee8cd7e8d803c37c03e0519890502d5e99ee2412aae1456cafe',
    description: 'General-purpose text statement or note',
    revocable: true,
    category: 'general',
  },
  {
    name: 'is-true',
    schema: 'bool isTrue',
    uid: '0x4eb603f49d68888d7f8b1fadd351b35a252f287ba465408ceb2b1e1e1efd90d5',
    description: 'Simple boolean assertion',
    revocable: true,
    category: 'general',
  },
  {
    name: 'score',
    schema: 'uint256 score',
    uid: '0xef2dbf5e8da46ea760bb4c6eb2635bf04adfc1ade6158e594263363db2a55bcf',
    description: 'Numeric score or rating',
    revocable: true,
    category: 'general',
  },
  {
    name: 'tag',
    schema: 'bytes32 tag',
    uid: '0x7d105b048bfc4c781474627045d2fb9008016018b3f2af686eef31ee6d1d5857',
    description: 'Arbitrary tag or label',
    revocable: true,
    category: 'general',
  },
  // Identity
  {
    name: 'is-a-human',
    schema: 'bool isHuman',
    uid: '0x8af15e65888f2e3b487e536a4922e277dcfe85b4b18187b0cf9afdb802ba6bb6',
    description: 'Humanity verification attestation',
    revocable: true,
    category: 'identity',
  },
  {
    name: 'verified-account',
    schema: 'string platform, string username',
    uid: '0xa0ce1ea8fd393b308ec22d86a9a4451bb16e61f455f964374f2105a371077d02',
    description: 'Social account verification (platform + username)',
    revocable: true,
    category: 'identity',
  },
  // Social
  {
    name: 'is-a-friend',
    schema: 'bool isFriend',
    uid: '0x27d06e3659317e9a4f8154d1e849eb53d43d91fb4f219884d1684f86d797804a',
    description: 'Friendship attestation',
    revocable: true,
    category: 'social',
  },
  {
    name: 'met-irl',
    schema: 'bool metIRL',
    uid: '0xc59265615401143689cbfe73046a922c975c99d97e4c248070435b1104b2dea7',
    description: 'Attest that you met someone in real life',
    revocable: true,
    category: 'social',
  },
  {
    name: 'vouch',
    schema: 'address vouched, string context',
    uid: '0xec3decee9f94f4ef4d1a95b23743ac4904b1b8687164e266564945efd435cf48',
    description: 'Vouch for an address with context',
    revocable: true,
    category: 'social',
  },
  {
    name: 'endorsement',
    schema: 'string endorsement',
    uid: '0xb7fb3a3cae206db4784b42600aaaa640d20babf3b2d4b45161c4856f2b6c6aec',
    description: 'Open-ended endorsement',
    revocable: true,
    category: 'social',
  },
];

const byName = new Map(POPULAR_SCHEMAS.map((s) => [s.name, s]));

export function getPopularSchemaByName(name: string): PopularSchema | undefined {
  return byName.get(name);
}

export function resolveSchemaUID(value: string): string {
  const schema = byName.get(value);
  return schema ? schema.uid : value;
}

export function listPopularSchemas(): PopularSchema[] {
  return POPULAR_SCHEMAS;
}

export function listPopularSchemasByCategory(): Record<string, PopularSchema[]> {
  const grouped: Record<string, PopularSchema[]> = {};
  for (const s of POPULAR_SCHEMAS) {
    (grouped[s.category] ??= []).push(s);
  }
  return grouped;
}
