import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';
import { validateAddress } from '../validation.js';

export const querySchemasCommand = new Command('query-schemas')
  .description('Query latest schemas from the EAS GraphQL API, optionally filtered by creator')
  .option('-a, --creator <address>', 'Filter by creator address')
  .option('-n, --limit <number>', 'Max results to return', '10')
  .option('--skip <number>', 'Number of results to skip (for pagination)', '0')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      if (opts.creator) validateAddress(opts.creator, 'creator');

      const take = parseInt(opts.limit, 10);
      const skip = parseInt(opts.skip, 10);
      if (isNaN(take) || take < 1) throw new Error('--limit must be a positive integer');
      if (isNaN(skip) || skip < 0) throw new Error('--skip must be a non-negative integer');

      const query = opts.creator ? QUERIES.getSchemataByCreator : QUERIES.getSchemata;
      const variables: Record<string, unknown> = { take, skip };
      if (opts.creator) variables.creator = opts.creator;

      const data = await graphqlQuery(opts.chain, query, variables);

      const schemas = data.schemata || [];

      output({
        success: true,
        data: { count: schemas.length, schemas },
      });
    } catch (err) {
      handleError(err);
    }
  });
