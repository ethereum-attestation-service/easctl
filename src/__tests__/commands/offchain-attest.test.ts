import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOffchainAttestation = vi.fn().mockResolvedValue({
  uid: '0xoffchainuid',
  sig: '0xsig',
});
const mockGetOffchain = vi.fn().mockResolvedValue({
  signOffchainAttestation: mockSignOffchainAttestation,
});
const mockSigner = { address: '0xSignerAddr' };
const mockClient = {
  eas: { getOffchain: mockGetOffchain },
  signer: mockSigner,
  address: '0xAttester',
};

vi.mock('../../client.js', () => ({
  createEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

const mockEncodeData = vi.fn().mockReturnValue('0xencoded');

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  SchemaEncoder: class MockSchemaEncoder {
    encodeData = (...args: any[]) => mockEncodeData(...args);
  },
  NO_EXPIRATION: 0n,
  ZERO_BYTES32: '0x0000000000000000000000000000000000000000000000000000000000000000',
  createOffchainURL: vi.fn().mockReturnValue('/offchain/url/123'),
}));

import { offchainAttestCommand } from '../../commands/offchain-attest.js';
import { createEASClient } from '../../client.js';
import { output, handleError } from '../../output.js';
import { createOffchainURL } from '@ethereum-attestation-service/eas-sdk';

describe('offchain-attest command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await offchainAttestCommand.parseAsync(['node', 'test', ...args]);
  }

  it('creates offchain attestation with correct signing args', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '-r', '0xRecipient',
    ]);

    expect(mockGetOffchain).toHaveBeenCalled();
    expect(mockEncodeData).toHaveBeenCalledWith([
      { name: 'x', type: 'uint8', value: '1' },
    ]);

    // Verify signOffchainAttestation was called with correct params
    const signCall = mockSignOffchainAttestation.mock.calls[0];
    const params = signCall[0];
    expect(params.schema).toBe('0xschema');
    expect(params.recipient).toBe('0xRecipient');
    expect(params.expirationTime).toBe(0n); // NO_EXPIRATION
    expect(params.revocable).toBe(true);
    expect(params.refUID).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
    expect(params.data).toBe('0xencoded');
    expect(typeof params.time).toBe('bigint');
    expect(params.time).toBeGreaterThan(0n);

    // Verify signer was passed
    expect(signCall[1]).toBe(mockSigner);
  });

  it('passes createOffchainURL the correct package', async () => {
    const signedAttestation = { uid: '0xoffchainuid', sig: '0xsig' };
    mockSignOffchainAttestation.mockResolvedValueOnce(signedAttestation);

    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
    ]);

    expect(createOffchainURL).toHaveBeenCalledWith({
      sig: signedAttestation,
      signer: '0xAttester',
    });
  });

  it('outputs uid, attester, chain, and offchainUrl', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
    ]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        uid: '0xoffchainuid',
        attester: '0xAttester',
        chain: 'ethereum',
        offchainUrl: 'https://easscan.org/offchain/url/123',
      }),
    });
  });

  it('handles invalid JSON in --data', async () => {
    await runCommand(['-s', '0xschema', '-d', '{bad json']);
    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('Invalid JSON in --data');
  });

  it('uses chain-specific EASSCAN host', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '-c', 'base',
    ]);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        offchainUrl: 'https://base.easscan.org/offchain/url/123',
      }),
    });
  });

  it('passes --no-revocable as false to signing', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--no-revocable',
    ]);

    const params = mockSignOffchainAttestation.mock.calls[0][0];
    expect(params.revocable).toBe(false);
  });

  it('passes non-zero expiration as BigInt', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--expiration', '1700000000',
    ]);

    const params = mockSignOffchainAttestation.mock.calls[0][0];
    expect(params.expirationTime).toBe(1700000000n);
  });

  it('uses custom chain and rpc-url', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '-c', 'sepolia',
      '--rpc-url', 'https://custom.rpc',
    ]);

    expect(createEASClient).toHaveBeenCalledWith('sepolia', 'https://custom.rpc');
  });

  it('passes --ref-uid to signing params', async () => {
    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
      '--ref-uid', '0xreferenceduid',
    ]);

    const params = mockSignOffchainAttestation.mock.calls[0][0];
    expect(params.refUID).toBe('0xreferenceduid');
  });

  it('includes full attestation object in output', async () => {
    const signedAttestation = { uid: '0xoffchainuid', sig: '0xsig', message: {} };
    mockSignOffchainAttestation.mockResolvedValueOnce(signedAttestation);

    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
    ]);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.attestation).toBe(signedAttestation);
  });

  it('passes SDK errors to handleError', async () => {
    mockGetOffchain.mockRejectedValueOnce(new Error('network unavailable'));

    await runCommand([
      '-s', '0xschema',
      '-d', '[{"name":"x","type":"uint8","value":"1"}]',
    ]);

    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toBe('network unavailable');
  });
});
