import { Command } from 'commander';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';

export const schemaRegisterCommand = new Command('schema-register')
  .description('Register a new schema')
  .requiredOption('-s, --schema <definition>', 'Schema definition (e.g. "uint256 score, string name")')
  .option('--resolver <address>', 'Resolver contract address', '0x0000000000000000000000000000000000000000')
  .option('--revocable', 'Whether attestations using this schema can be revoked', true)
  .option('--no-revocable', 'Make attestations non-revocable')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);

      const tx = await client.schemaRegistry.register({
        schema: opts.schema,
        resolverAddress: opts.resolver,
        revocable: opts.revocable,
      });

      const uid = await tx.wait();

      output({
        success: true,
        data: {
          uid,
          schema: opts.schema,
          resolver: opts.resolver,
          revocable: opts.revocable,
          chain: opts.chain,
        },
      });
    } catch (err) {
      handleError(err);
    }
  });
