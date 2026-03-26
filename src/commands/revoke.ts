import { Command } from 'commander';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';
import { validateBytes32, resolveAndValidateSchemaUID } from '../validation.js';

export const revokeCommand = new Command('revoke')
  .description('Revoke an on-chain attestation')
  .requiredOption('-s, --schema <uid>', 'Schema UID or popular schema name')
  .requiredOption('-u, --uid <uid>', 'Attestation UID to revoke')
  .option('--value <wei>', 'ETH value to send (in wei)', '0')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .option('--dry-run', 'Estimate gas without sending the transaction')
  .action(async (opts) => {
    try {
      opts.schema = resolveAndValidateSchemaUID(opts.schema, 'schema UID');
      validateBytes32(opts.uid, 'attestation UID');

      const client = createEASClient(opts.chain, opts.rpcUrl);

      const tx = await client.eas.revoke({
        schema: opts.schema,
        data: {
          uid: opts.uid,
          value: BigInt(opts.value),
        },
      });

      if (opts.dryRun) {
        const gasEstimate = await tx.estimateGas();
        output({ success: true, data: { dryRun: true, estimatedGas: gasEstimate.toString(), chain: opts.chain } });
      } else {
        await tx.wait();
        output({
          success: true,
          data: {
            revoked: true,
            uid: opts.uid,
            txHash: tx.receipt!.hash,
            schema: opts.schema,
            chain: opts.chain,
          },
        });
      }
    } catch (err) {
      handleError(err);
    }
  });
