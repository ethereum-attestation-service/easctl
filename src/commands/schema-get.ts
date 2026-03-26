import { Command } from 'commander';
import { createReadOnlyEASClient } from '../client.js';
import { output, handleError } from '../output.js';
import { resolveAndValidateSchemaUID } from '../validation.js';

export const schemaGetCommand = new Command('schema-get')
  .description('Get a schema by UID')
  .requiredOption('-u, --uid <uid>', 'Schema UID or popular schema name')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .action(async (opts) => {
    try {
      opts.uid = resolveAndValidateSchemaUID(opts.uid, 'schema UID');

      const client = createReadOnlyEASClient(opts.chain, opts.rpcUrl);
      const schema = await client.schemaRegistry.getSchema({ uid: opts.uid });

      output({
        success: true,
        data: {
          uid: schema.uid,
          schema: schema.schema,
          resolver: schema.resolver,
          revocable: schema.revocable,
        },
      });
    } catch (err) {
      handleError(err);
    }
  });
