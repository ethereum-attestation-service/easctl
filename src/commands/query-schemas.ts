import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';

export const querySchemasCommand = new Command('query-schemas')
  .description('Query schemas by creator from the EAS GraphQL API')
  .requiredOption('-a, --creator <address>', 'Creator address')
  .option('-n, --limit <number>', 'Max results to return', '10')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      const take = parseInt(opts.limit, 10);
      const data = await graphqlQuery(opts.chain, QUERIES.getSchemata, {
        creator: opts.creator,
        take,
      });

      const schemas = data.schemata || [];

      output({
        success: true,
        data: { count: schemas.length, schemas },
      });
    } catch (err) {
      handleError(err);
    }
  });
