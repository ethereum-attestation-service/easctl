import { Command } from 'commander';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';

export const revokeCommand = new Command('revoke')
  .description('Revoke an on-chain attestation')
  .requiredOption('-s, --schema <uid>', 'Schema UID of the attestation')
  .requiredOption('-u, --uid <uid>', 'Attestation UID to revoke')
  .option('--value <wei>', 'ETH value to send (in wei)', '0')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);

      const tx = await client.eas.revoke({
        schema: opts.schema,
        data: {
          uid: opts.uid,
          value: BigInt(opts.value),
        },
      });

      await tx.wait();

      output({
        success: true,
        data: {
          revoked: true,
          uid: opts.uid,
          schema: opts.schema,
          chain: opts.chain,
        },
      });
    } catch (err) {
      handleError(err);
    }
  });
