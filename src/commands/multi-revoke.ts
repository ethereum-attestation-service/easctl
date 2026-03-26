import { Command } from 'commander';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';
import { resolveInput } from '../stdin.js';
import { resolveSchemaUID } from '../popular-schemas.js';

interface RevocationInput {
  schema: string;
  uid: string;
  value?: string;
}

export const multiRevokeCommand = new Command('multi-revoke')
  .description('Revoke multiple attestations in a single transaction')
  .requiredOption('-i, --input <json>', 'JSON array of revocation objects: [{"schema":"0x...","uid":"0x..."}]')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .option('--dry-run', 'Estimate gas without sending the transaction')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);
      const rawInput = await resolveInput(opts.input);
      let inputs: RevocationInput[];
      try {
        inputs = JSON.parse(rawInput);
      } catch (e) {
        throw new Error(`Invalid JSON in --input: ${e instanceof Error ? e.message : e}`);
      }

      const grouped = new Map<string, { schema: string; data: any[] }>();

      for (const input of inputs) {
        input.schema = resolveSchemaUID(input.schema);
        if (!grouped.has(input.schema)) {
          grouped.set(input.schema, { schema: input.schema, data: [] });
        }
        grouped.get(input.schema)!.data.push({
          uid: input.uid,
          value: input.value ? BigInt(input.value) : 0n,
        });
      }

      const tx = await client.eas.multiRevoke(Array.from(grouped.values()));

      if (opts.dryRun) {
        const gasEstimate = await tx.estimateGas();
        output({ success: true, data: { dryRun: true, estimatedGas: gasEstimate.toString(), chain: opts.chain } });
      } else {
        await tx.wait();
        output({
          success: true,
          data: {
            revoked: inputs.length,
            txHash: tx.receipt!.hash,
            chain: opts.chain,
          },
        });
      }
    } catch (err) {
      handleError(err);
    }
  });
