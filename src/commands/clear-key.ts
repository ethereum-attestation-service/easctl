import { Command } from 'commander';
import { clearStoredPrivateKey, getStoredPrivateKey } from '../config.js';

export const clearKeyCommand = new Command('clear-key')
  .description('Remove the stored private key from ~/.eas-cli')
  .action(() => {
    if (!getStoredPrivateKey()) {
      console.log('No private key is currently stored.');
      return;
    }

    clearStoredPrivateKey();
    console.log('Private key removed from ~/.eas-cli.');
  });
