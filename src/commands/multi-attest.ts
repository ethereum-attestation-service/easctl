import { Command } from 'commander';
import { SchemaEncoder, NO_EXPIRATION, ZERO_BYTES32 } from '@ethereum-attestation-service/eas-sdk';
import { createEASClient } from '../client.js';
import { output, handleError } from '../output.js';
import { resolveInput } from '../stdin.js';
import { resolveSchemaUID } from '../popular-schemas.js';

interface AttestationInput {
  schema: string;
  recipient?: string;
  refUID?: string;
  expirationTime?: string;
  revocable?: boolean;
  value?: string;
  data: Array<{ name: string; type: string; value: unknown }>;
}

export const multiAttestCommand = new Command('multi-attest')
  .description('Create multiple on-chain attestations in a single transaction')
  .requiredOption('-i, --input <json>', 'JSON array of attestation objects')
  .option('-c, --chain <name>', 'Chain name', 'ethereum')
  .option('--rpc-url <url>', 'Custom RPC URL')
  .option('--dry-run', 'Estimate gas without sending the transaction')
  .action(async (opts) => {
    try {
      const client = createEASClient(opts.chain, opts.rpcUrl);
      const rawInput = await resolveInput(opts.input);
      let inputs: AttestationInput[];
      try {
        inputs = JSON.parse(rawInput);
      } catch (e) {
        throw new Error(`Invalid JSON in --input: ${e instanceof Error ? e.message : e}`);
      }

      const grouped = new Map<string, { schema: string; data: any[] }>();

      for (const input of inputs) {
        input.schema = resolveSchemaUID(input.schema);
        const schemaString = input.data.map((item) => `${item.type} ${item.name}`).join(', ');
        const encoder = new SchemaEncoder(schemaString);
        const encodedData = encoder.encodeData(input.data as any);

        if (!grouped.has(input.schema)) {
          grouped.set(input.schema, { schema: input.schema, data: [] });
        }

        grouped.get(input.schema)!.data.push({
          recipient: input.recipient || '0x0000000000000000000000000000000000000000',
          expirationTime: input.expirationTime ? BigInt(input.expirationTime) : NO_EXPIRATION,
          revocable: input.revocable ?? true,
          refUID: input.refUID || ZERO_BYTES32,
          data: encodedData,
          value: input.value ? BigInt(input.value) : 0n,
        });
      }

      const tx = await client.eas.multiAttest(Array.from(grouped.values()));

      if (opts.dryRun) {
        const gasEstimate = await tx.estimateGas();
        output({ success: true, data: { dryRun: true, estimatedGas: gasEstimate.toString(), chain: opts.chain } });
      } else {
        const uids = await tx.wait();
        output({
          success: true,
          data: {
            uids,
            count: uids.length,
            txHash: tx.receipt!.hash,
            chain: opts.chain,
          },
        });
      }
    } catch (err) {
      handleError(err);
    }
  });
