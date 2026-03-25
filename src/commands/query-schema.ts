import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';

export const querySchemaCommand = new Command('query-schema')
  .description('Query a schema from the EAS GraphQL API')
  .requiredOption('-u, --uid <uid>', 'Schema UID')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      const data = await graphqlQuery(opts.chain, QUERIES.getSchema, { id: opts.uid });

      if (!data.schema) {
        throw new Error(`Schema ${opts.uid} not found on ${opts.chain}`);
      }

      output({ success: true, data: data.schema });
    } catch (err) {
      handleError(err);
    }
  });
