import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface EASConfig {
  privateKey?: string;
}

export function getConfigPath(): string {
  return join(homedir(), '.eas-cli');
}

export function readConfig(): EASConfig {
  try {
    const data = readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeConfig(config: EASConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
}

export function getStoredPrivateKey(): string | undefined {
  return readConfig().privateKey;
}

export function setStoredPrivateKey(key: string): void {
  const normalized = key.startsWith('0x') ? key : `0x${key}`;
  const config = readConfig();
  config.privateKey = normalized;
  writeConfig(config);
}

export function clearStoredPrivateKey(): void {
  const config = readConfig();
  delete config.privateKey;
  writeConfig(config);
}
