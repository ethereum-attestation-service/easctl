import { Command } from 'commander';
import {
  SchemaEncoder,
  NO_EXPIRATION,
  ZERO_BYTES32,
  createOffchainURL,
} from '@ethereum-attestation-service/eas-sdk';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';

const EASSCAN_HOSTS: Record<string, string> = {
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

export const offchainAttestCommand = new Command('offchain-attest')
  .description('Create an off-chain attestation (signed but not submitted on-chain)')
  .requiredOption('-s, --schema <uid>', 'Schema UID')
  .requiredOption('-d, --data <json>', 'Attestation data as JSON array: [{"name":"field","type":"uint256","value":"123"}]')
  .option('-r, --recipient <address>', 'Recipient address', '0x0000000000000000000000000000000000000000')
  .option('--ref-uid <uid>', 'Referenced attestation UID', ZERO_BYTES32)
  .option('--expiration <timestamp>', 'Expiration timestamp (0 for none)', '0')
  .option('--revocable', 'Whether the attestation is revocable', true)
  .option('--no-revocable', 'Make the attestation non-revocable')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);

      let dataItems;
      try {
        dataItems = JSON.parse(opts.data);
      } catch (e) {
        throw new Error(`Invalid JSON in --data: ${e instanceof Error ? e.message : e}`);
      }
      const schemaString = dataItems.map((item: any) => `${item.type} ${item.name}`).join(', ');
      const encoder = new SchemaEncoder(schemaString);
      const encodedData = encoder.encodeData(dataItems);

      const offchain = await client.eas.getOffchain();

      const attestation = await offchain.signOffchainAttestation(
        {
          schema: opts.schema,
          recipient: opts.recipient,
          expirationTime: BigInt(opts.expiration) === 0n ? NO_EXPIRATION : BigInt(opts.expiration),
          revocable: opts.revocable,
          refUID: opts.refUid,
          data: encodedData,
          time: BigInt(Math.floor(Date.now() / 1000)),
        },
        client.signer
      );

      const pkg = { sig: attestation, signer: client.address };
      const urlPath = createOffchainURL(pkg);
      const host = EASSCAN_HOSTS[opts.chain] || EASSCAN_HOSTS['ethereum'];
      const offchainUrl = `${host}${urlPath}`;

      output({
        success: true,
        data: {
          uid: attestation.uid,
          offchainUrl,
          attester: client.address,
          chain: opts.chain,
          attestation: attestation as unknown as Record<string, unknown>,
        },
      });
    } catch (err) {
      handleError(err);
    }
  });
