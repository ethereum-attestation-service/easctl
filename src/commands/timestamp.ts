import { Command } from 'commander';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';

export const timestampCommand = new Command('timestamp')
  .description('Timestamp data on-chain')
  .requiredOption('-d, --data <bytes32>', 'Data to timestamp (bytes32 hex string)')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);

      const tx = await client.eas.timestamp(opts.data);
      const timestamp = await tx.wait();

      output({
        success: true,
        data: {
          timestamp: timestamp.toString(),
          data: opts.data,
          chain: opts.chain,
        },
      });
    } catch (err) {
      handleError(err);
    }
  });
