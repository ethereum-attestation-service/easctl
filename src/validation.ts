import { resolveSchemaUID } from './popular-schemas.js';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function validateAddress(value: string, label: string): void {
  if (!ADDRESS_RE.test(value)) {
    throw new Error(`Invalid ${label} address: expected 0x + 40 hex characters, got "${value}"`);
  }
}

const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;

export function validateBytes32(value: string, label: string): void {
  if (!BYTES32_RE.test(value)) {
    throw new Error(`Invalid ${label}: expected 0x + 64 hex characters, got "${value}"`);
  }
}

export function resolveAndValidateSchemaUID(value: string, label: string): string {
  const resolved = resolveSchemaUID(value);
  validateBytes32(resolved, label);
  return resolved;
}
