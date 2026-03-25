export interface ChainConfig {
  chainId: number;
  eas: string;
  schemaRegistry: string;
  defaultRpc?: string;
}

const SHARED_V1_ADDRESSES = {
  eas: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
  schemaRegistry: '0xA7b39296258348C78294F95B872b282326A97BDF',
};

const OP_STACK_PREDEPLOY = {
  eas: '0x4200000000000000000000000000000000000021',
  schemaRegistry: '0x4200000000000000000000000000000000000020',
};

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: 1,
    ...SHARED_V1_ADDRESSES,
    defaultRpc: 'https://ethereum-rpc.publicnode.com',
  },
  sepolia: {
    chainId: 11155111,
    eas: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    schemaRegistry: '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0',
    defaultRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  base: {
    chainId: 8453,
    ...OP_STACK_PREDEPLOY,
    defaultRpc: 'https://base-rpc.publicnode.com',
  },
  'base-sepolia': {
    chainId: 84532,
    ...OP_STACK_PREDEPLOY,
    defaultRpc: 'https://base-sepolia-rpc.publicnode.com',
  },
  optimism: {
    chainId: 10,
    ...OP_STACK_PREDEPLOY,
    defaultRpc: 'https://optimism-rpc.publicnode.com',
  },
  'optimism-sepolia': {
    chainId: 11155420,
    ...OP_STACK_PREDEPLOY,
    defaultRpc: 'https://optimism-sepolia-rpc.publicnode.com',
  },
  arbitrum: {
    chainId: 42161,
    eas: '0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458',
    schemaRegistry: '0xA310da9c5B885E7fb3fbA9D66E9Ba6Df512b78eB',
    defaultRpc: 'https://arbitrum-one-rpc.publicnode.com',
  },
  'arbitrum-sepolia': {
    chainId: 421614,
    eas: '0xaEF4103A04090071165F78D45D83A0C0782c2B2a',
    schemaRegistry: '0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797',
    defaultRpc: 'https://arbitrum-sepolia-rpc.publicnode.com',
  },
  polygon: {
    chainId: 137,
    eas: '0x5E634ef5355f45A855d02D66eCD687b1502AF790',
    schemaRegistry: '0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7',
    defaultRpc: 'https://polygon-bor-rpc.publicnode.com',
  },
  scroll: {
    chainId: 534352,
    eas: '0xC47300428b6AD2c7D03BB76D05A176058b47E6B0',
    schemaRegistry: '0xD2CDF46556543316e7D34e8eDc4624e2bB95e3B6',
    defaultRpc: 'https://scroll-rpc.publicnode.com',
  },
  linea: {
    chainId: 59144,
    eas: '0xaEF4103A04090071165F78D45D83A0C0782c2B2a',
    schemaRegistry: '0x55D26f9ae0203EF95494AE4C170eD35f4Cf77797',
    defaultRpc: 'https://linea-rpc.publicnode.com',
  },
  celo: {
    chainId: 42220,
    eas: '0x72E1d8ccf5a114EA560D5Fd383f1ab3c0C5C1d50',
    schemaRegistry: '0x5ece93bE0d0D52EeD561Fdbb32e240b43C2CAb6e',
    defaultRpc: 'https://celo-rpc.publicnode.com',
  },
};

export function getChainConfig(name: string): ChainConfig {
  const config = CHAIN_CONFIGS[name];
  if (!config) {
    const available = Object.keys(CHAIN_CONFIGS).join(', ');
    throw new Error(`Unknown chain "${name}". Available chains: ${available}`);
  }
  return config;
}

export function listChains(): string[] {
  return Object.keys(CHAIN_CONFIGS);
}
