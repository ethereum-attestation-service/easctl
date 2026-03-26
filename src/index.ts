import { Command } from 'commander';
import { setJsonMode, output } from './output.js';
import { listChains } from './chains.js';
import { attestCommand } from './commands/attest.js';
import { revokeCommand } from './commands/revoke.js';
import { getAttestationCommand } from './commands/get-attestation.js';
import { schemaRegisterCommand } from './commands/schema-register.js';
import { schemaGetCommand } from './commands/schema-get.js';
import { multiAttestCommand } from './commands/multi-attest.js';
import { offchainAttestCommand } from './commands/offchain-attest.js';
import { timestampCommand } from './commands/timestamp.js';
import { querySchemaCommand } from './commands/query-schema.js';
import { queryAttestationCommand } from './commands/query-attestation.js';
import { queryAttestationsCommand } from './commands/query-attestations.js';
import { querySchemasCommand } from './commands/query-schemas.js';
import { multiRevokeCommand } from './commands/multi-revoke.js';
import { multiTimestampCommand } from './commands/multi-timestamp.js';
import { setKeyCommand } from './commands/set-key.js';
import { clearKeyCommand } from './commands/clear-key.js';
import { popularSchemasCommand } from './commands/popular-schemas.js';

const program = new Command();

program
  .name('easctl')
  .description('Ethereum Attestation Service CLI — create, revoke, and query attestations')
  .version(process.env.CLI_VERSION || '0.0.0-dev')
  .option('--json', 'Output results as JSON (useful for agents and scripting)')
  .hook('preAction', (thisCommand, actionCommand) => {
    if (thisCommand.opts().json || actionCommand.opts().json) {
      setJsonMode(true);
    }
  });

// Attestation commands
program.addCommand(attestCommand);
program.addCommand(multiAttestCommand);
program.addCommand(offchainAttestCommand);
program.addCommand(revokeCommand);
program.addCommand(multiRevokeCommand);
program.addCommand(getAttestationCommand);

// Schema commands
program.addCommand(schemaRegisterCommand);
program.addCommand(schemaGetCommand);
program.addCommand(popularSchemasCommand);

// Timestamp commands
program.addCommand(timestampCommand);
program.addCommand(multiTimestampCommand);

// GraphQL query commands
program.addCommand(querySchemaCommand);
program.addCommand(queryAttestationCommand);
program.addCommand(queryAttestationsCommand);
program.addCommand(querySchemasCommand);

// Key management commands
program.addCommand(setKeyCommand);
program.addCommand(clearKeyCommand);

// Chains command
program
  .command('chains')
  .description('List supported chains and their EAS contract addresses')
  .action(() => {
    const chains = listChains();
    output({ success: true, data: { chains } });
  });

// Add --json to every subcommand so it works regardless of position
for (const cmd of program.commands) {
  cmd.option('--json', 'Output results as JSON');
}

program.parse();
