import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';

export const queryAttestationsCommand = new Command('query-attestations')
  .description('Query attestations by schema or attester from the EAS GraphQL API')
  .option('-s, --schema <uid>', 'Filter by schema UID')
  .option('-a, --attester <address>', 'Filter by attester address')
  .option('-n, --limit <number>', 'Max results to return', '10')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      if (!opts.schema && !opts.attester) {
        throw new Error('Provide at least one filter: --schema or --attester');
      }

      const take = parseInt(opts.limit, 10);
      let data;

      if (opts.schema) {
        data = await graphqlQuery(opts.chain, QUERIES.getAttestationsBySchema, {
          schemaId: opts.schema,
          take,
        });
      } else {
        data = await graphqlQuery(opts.chain, QUERIES.getAttestationsByAttester, {
          attester: opts.attester,
          take,
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
