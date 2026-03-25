import { Command } from 'commander';
import { graphqlQuery, QUERIES } from '../graphql.js';
import { output, handleError } from '../output.js';

export const queryAttestationCommand = new Command('query-attestation')
  .description('Query an attestation from the EAS GraphQL API')
  .requiredOption('-u, --uid <uid>', 'Attestation UID')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .action(async (opts) => {
    try {
      const data = await graphqlQuery(opts.chain, QUERIES.getAttestation, { id: opts.uid });

      if (!data.attestation) {
        throw new Error(`Attestation ${opts.uid} not found on ${opts.chain}`);
      }

      const att = data.attestation;
      if (att.decodedDataJson) {
        try {
          att.decodedData = JSON.parse(att.decodedDataJson);
        } catch { /* keep raw */ }
      }

      output({ success: true, data: att });
    } catch (err) {
      handleError(err);
    }
  });
