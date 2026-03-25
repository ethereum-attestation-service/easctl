import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  clean: true,
  sourcemap: true,
  noExternal: [
    '@ethereum-attestation-service/eas-sdk',
    '@ethereum-attestation-service/eas-contracts',
    '@ethereum-attestation-service/eas-contracts-legacy',
  ],
  banner: {
    js: '#!/usr/bin/env node',
  },
});
