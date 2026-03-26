import { Command } from 'commander';
import { SchemaEncoder, NO_EXPIRATION, ZERO_BYTES32 } from '@ethereum-attestation-service/eas-sdk';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';
import { resolveInput } from '../stdin.js';
import { validateAddress, resolveAndValidateSchemaUID } from '../validation.js';

export const attestCommand = new Command('attest')
  .description('Create an on-chain attestation')
  .requiredOption('-s, --schema <uid>', 'Schema UID or popular schema name')
  .requiredOption('-d, --data <json>', 'Attestation data as JSON array: [{"name":"field","type":"uint256","value":"123"}]')
  .option('-r, --recipient <address>', 'Recipient address', '0x0000000000000000000000000000000000000000')
  .option('--ref-uid <uid>', 'Referenced attestation UID', ZERO_BYTES32)
  .option('--expiration <timestamp>', 'Expiration timestamp (0 for none)', '0')
  .option('--revocable', 'Whether the attestation is revocable', true)
  .option('--no-revocable', 'Make the attestation non-revocable')
  .option('--value <wei>', 'ETH value to send (in wei)', '0')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .option('--dry-run', 'Estimate gas without sending the transaction')
  .action(async (opts) => {
    try {
      opts.schema = resolveAndValidateSchemaUID(opts.schema, 'schema UID');
      if (opts.recipient !== '0x0000000000000000000000000000000000000000') {
        validateAddress(opts.recipient, 'recipient');
      }

      const client = createEASClient(opts.chain, opts.rpcUrl);

      const rawData = await resolveInput(opts.data);
      let dataItems;
      try {
        dataItems = JSON.parse(rawData);
      } catch (e) {
        throw new Error(`Invalid JSON in --data: ${e instanceof Error ? e.message : e}`);
      }
      const schemaString = dataItems.map((item: any) => `${item.type} ${item.name}`).join(', ');
      const encoder = new SchemaEncoder(schemaString);
      const encodedData = encoder.encodeData(dataItems);

      const tx = await client.eas.attest({
        schema: opts.schema,
        data: {
          recipient: opts.recipient,
          expirationTime: BigInt(opts.expiration) === 0n ? NO_EXPIRATION : BigInt(opts.expiration),
          revocable: opts.revocable,
          refUID: opts.refUid,
          data: encodedData,
          value: BigInt(opts.value),
        },
      });

      if (opts.dryRun) {
        const gasEstimate = await tx.estimateGas();
        output({ success: true, data: { dryRun: true, estimatedGas: gasEstimate.toString(), chain: opts.chain } });
      } else {
        const uid = await tx.wait();
        output({
          success: true,
          data: {
            uid,
            txHash: tx.receipt!.hash,
            attester: client.address,
            recipient: opts.recipient,
            schema: opts.schema,
            chain: opts.chain,
          },
        });
      }
    } catch (err) {
      handleError(err);
    }
  });
