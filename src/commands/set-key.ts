import { Command } from 'commander';
import { ethers } from 'ethers';
import { setStoredPrivateKey } from '../config.js';

export const setKeyCommand = new Command('set-key')
  .description('Store your private key in ~/.eas-cli for future use')
  .argument('<key>', 'Wallet private key (hex string, with or without 0x prefix)')
  .action((key: string) => {
    const normalized = key.startsWith('0x') ? key : `0x${key}`;

    try {
      const wallet = new ethers.Wallet(normalized);
      setStoredPrivateKey(key);
      console.log(`Private key stored successfully.`);
      console.log(`Wallet address: ${wallet.address}`);
    } catch {
      console.error('Error: Invalid private key format.');
      process.exit(1);
    }
  });
