import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';
import { validateAddress, resolveAndValidateSchemaUID } from '../validation.js';

export const queryAttestationsCommand = new Command('query-attestations')
  .description('Query attestations by schema or attester from the EAS GraphQL API')
  .option('-s, --schema <uid>', 'Filter by schema UID or popular schema name')
  .option('-a, --attester <address>', 'Filter by attester address')
  .option('-n, --limit <number>', 'Max results to return', '10')
  .option('--skip <number>', 'Number of results to skip (for pagination)', '0')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      if (!opts.schema && !opts.attester) {
        throw new Error('Provide at least one filter: --schema or --attester');
      }
      if (opts.schema) opts.schema = resolveAndValidateSchemaUID(opts.schema, 'schema UID');
      if (opts.attester) validateAddress(opts.attester, 'attester');

      const take = parseInt(opts.limit, 10);
      const skip = parseInt(opts.skip, 10);
      if (isNaN(take) || take < 1) throw new Error('--limit must be a positive integer');
      if (isNaN(skip) || skip < 0) throw new Error('--skip must be a non-negative integer');
      let data;

      if (opts.schema) {
        data = await graphqlQuery(opts.chain, QUERIES.getAttestationsBySchema, {
          schemaId: opts.schema,
          take,
          skip,
        });
      } else {
        data = await graphqlQuery(opts.chain, QUERIES.getAttestationsByAttester, {
          attester: opts.attester,
          take,
          skip,
        });
      }

      const attestations = data.attestations || [];
      for (const att of attestations) {
        if (att.decodedDataJson) {
          try {
            att.decodedData = JSON.parse(att.decodedDataJson);
          } catch { /* keep raw */ }
        }
      }

      output({
        success: true,
        data: { count: attestations.length, attestations },
      });
    } catch (err) {
      handleError(err);
    }
  });
