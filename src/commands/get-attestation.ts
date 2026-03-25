import { Command } from 'commander';
import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { createReadOnlyEASClient } from '../client.js';
import { output, handleError } from '../output.js';

export const getAttestationCommand = new Command('get-attestation')
  .description('Get an attestation by UID')
  .requiredOption('-u, --uid <uid>', 'Attestation UID')
  .option('--decode <schema>', 'Schema string to decode data (e.g. "uint256 score, string name")')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      const client = createReadOnlyEASClient(opts.chain, opts.rpcUrl);
      const attestation = await client.eas.getAttestation(opts.uid);

      const result: Record<string, unknown> = {
        uid: attestation.uid,
        schema: attestation.schema,
        attester: attestation.attester,
        recipient: attestation.recipient,
        refUID: attestation.refUID,
        revocable: attestation.revocable,
        revocationTime: Number(attestation.revocationTime),
        expirationTime: Number(attestation.expirationTime),
        time: Number(attestation.time),
        data: attestation.data,
      };

      if (opts.decode) {
        try {
          const encoder = new SchemaEncoder(opts.decode);
          const decoded = encoder.decodeData(attestation.data);
          result.decodedData = decoded.map((item) => ({
            name: item.name,
            type: item.type,
            value: typeof item.value.value === 'bigint' ? item.value.value.toString() : item.value.value,
          }));
        } catch (decodeErr) {
          result.decodeError = decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
        }
      }

      output({ success: true, data: result });
    } catch (err) {
      handleError(err);
    }
  });
