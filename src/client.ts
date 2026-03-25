import { ethers } from 'ethers';
import { EAS, SchemaRegistry } from '@ethereum-attestation-service/eas-sdk';
import { getChainConfig, type ChainConfig } from './chains.js';

export interface EASClient {
  eas: EAS;
  schemaRegistry: SchemaRegistry;
  signer: ethers.Wallet;
  provider: ethers.JsonRpcProvider;
  chainConfig: ChainConfig;
  address: string;
}

export function getPrivateKey(): string {
  const key = process.env.EAS_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      'EAS_PRIVATE_KEY environment variable is required. Set it to your wallet private key (with 0x prefix).'
    );
  }
  return key.startsWith('0x') ? key : `0x${key}`;
}

export function createEASClient(chainName: string, rpcUrl?: string): EASClient {
  const chainConfig = getChainConfig(chainName);
  const privateKey = getPrivateKey();

  const provider = new ethers.JsonRpcProvider(rpcUrl || chainConfig.defaultRpc);
  const signer = new ethers.Wallet(privateKey, provider);

  const eas = new EAS(chainConfig.eas, { signer });
  const schemaRegistry = new SchemaRegistry(chainConfig.schemaRegistry, { signer });

  return {
    eas,
    schemaRegistry,
    signer,
    provider,
    chainConfig,
    address: signer.address,
  };
}

export function createReadOnlyEASClient(chainName: string, rpcUrl?: string) {
  const chainConfig = getChainConfig(chainName);
  const provider = new ethers.JsonRpcProvider(rpcUrl || chainConfig.defaultRpc);

  const eas = new EAS(chainConfig.eas, { signer: provider });
  const schemaRegistry = new SchemaRegistry(chainConfig.schemaRegistry, { signer: provider });

  return { eas, schemaRegistry, provider, chainConfig };
}
