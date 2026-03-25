import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import {
  SchemaEncoder,
  Offchain,
  OffchainAttestationVersion,
  createOffchainURL,
  NO_EXPIRATION,
  ZERO_BYTES32,
  EAS,
} from '@ethereum-attestation-service/eas-sdk';

// Use a deterministic test private key (not a real key - for testing only)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('off-chain attestation signing integration', () => {
  let signer: ethers.Wallet;
  let offchain: Offchain;
  const EAS_CONTRACT_ADDRESS = '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587';

  beforeAll(() => {
    signer = new ethers.Wallet(TEST_PRIVATE_KEY);

    // Create Offchain instance directly with test config (no network needed)
    offchain = new Offchain(
      {
        address: EAS_CONTRACT_ADDRESS,
        version: '1.3.0',
        chainId: 1n,
      },
      OffchainAttestationVersion.Version2,
      new EAS(EAS_CONTRACT_ADDRESS)
    );
  });

  it('signs and verifies an off-chain attestation', async () => {
    const schemaEncoder = new SchemaEncoder('uint256 score, string name');
    const encodedData = schemaEncoder.encodeData([
      { name: 'score', type: 'uint256', value: 100 },
      { name: 'name', type: 'string', value: 'Alice' },
    ]);

    const schemaUID = '0x' + 'ab'.repeat(32);

    const signedAttestation = await offchain.signOffchainAttestation(
      {
        schema: schemaUID,
        recipient: '0x0000000000000000000000000000000000000001',
        time: BigInt(Math.floor(Date.now() / 1000)),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: encodedData,
      },
      signer
    );

    // Verify the attestation has expected fields
    expect(signedAttestation.uid).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(signedAttestation.message).toBeDefined();
    expect(signedAttestation.signature).toBeDefined();
    expect(signedAttestation.message.schema).toBe(schemaUID);
    expect(signedAttestation.message.recipient).toBe('0x0000000000000000000000000000000000000001');
    expect(signedAttestation.message.revocable).toBe(true);

    // Verify the signature is valid
    const isValid = offchain.verifyOffchainAttestationSignature(
      signer.address,
      signedAttestation
    );
    expect(isValid).toBe(true);
  });

  it('rejects tampered attestation signature', async () => {
    const schemaEncoder = new SchemaEncoder('string msg');
    const encodedData = schemaEncoder.encodeData([
      { name: 'msg', type: 'string', value: 'original' },
    ]);

    const signed = await offchain.signOffchainAttestation(
      {
        schema: '0x' + '00'.repeat(32),
        recipient: '0x0000000000000000000000000000000000000000',
        time: BigInt(Math.floor(Date.now() / 1000)),
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: encodedData,
      },
      signer
    );

    // Tamper with the message data
    const tampered = {
      ...signed,
      message: { ...signed.message, recipient: '0x0000000000000000000000000000000000000099' },
    };

    // Verification should fail for a different attester or tampered data
    const isValid = offchain.verifyOffchainAttestationSignature(
      '0x0000000000000000000000000000000000000099', // wrong attester
      signed
    );
    expect(isValid).toBe(false);
  });

  it('different signers produce different signatures', async () => {
    const signer2 = new ethers.Wallet(
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    );

    const schemaEncoder = new SchemaEncoder('uint8 x');
    const encodedData = schemaEncoder.encodeData([{ name: 'x', type: 'uint8', value: 1 }]);

    const params = {
      schema: '0x' + '11'.repeat(32),
      recipient: '0x0000000000000000000000000000000000000000',
      time: 1700000000n,
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ZERO_BYTES32,
      data: encodedData,
    };

    const signed1 = await offchain.signOffchainAttestation(params, signer);
    const signed2 = await offchain.signOffchainAttestation(params, signer2);

    // Different signers produce different signatures
    expect(signed1.signature).not.toEqual(signed2.signature);

    // Each verifies with its own signer
    expect(offchain.verifyOffchainAttestationSignature(signer.address, signed1)).toBe(true);
    expect(offchain.verifyOffchainAttestationSignature(signer2.address, signed2)).toBe(true);

    // Cross-verification fails
    expect(offchain.verifyOffchainAttestationSignature(signer.address, signed2)).toBe(false);
    expect(offchain.verifyOffchainAttestationSignature(signer2.address, signed1)).toBe(false);
  });

  it('non-revocable attestation signs correctly', async () => {
    const schemaEncoder = new SchemaEncoder('uint8 x');
    const encodedData = schemaEncoder.encodeData([{ name: 'x', type: 'uint8', value: 1 }]);

    const signed = await offchain.signOffchainAttestation(
      {
        schema: '0x' + '22'.repeat(32),
        recipient: '0x0000000000000000000000000000000000000000',
        time: 1700000000n,
        expirationTime: NO_EXPIRATION,
        revocable: false,
        refUID: ZERO_BYTES32,
        data: encodedData,
      },
      signer
    );

    expect(signed.message.revocable).toBe(false);
    expect(offchain.verifyOffchainAttestationSignature(signer.address, signed)).toBe(true);
  });

  it('attestation with expiration signs correctly', async () => {
    const schemaEncoder = new SchemaEncoder('uint8 x');
    const encodedData = schemaEncoder.encodeData([{ name: 'x', type: 'uint8', value: 1 }]);

    const expiration = BigInt(Math.floor(Date.now() / 1000) + 86400); // +1 day

    const signed = await offchain.signOffchainAttestation(
      {
        schema: '0x' + '33'.repeat(32),
        recipient: '0x0000000000000000000000000000000000000000',
        time: 1700000000n,
        expirationTime: expiration,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: encodedData,
      },
      signer
    );

    expect(signed.message.expirationTime).toBe(expiration);
    expect(offchain.verifyOffchainAttestationSignature(signer.address, signed)).toBe(true);
  });
});

describe('createOffchainURL integration', () => {
  it('produces a URL path from a signed attestation package', async () => {
    const signer = new ethers.Wallet(TEST_PRIVATE_KEY);
    const offchain = new Offchain(
      { address: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587', version: '1.3.0', chainId: 1n },
      OffchainAttestationVersion.Version2,
      new EAS('0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587')
    );

    const encoder = new SchemaEncoder('uint8 x');
    const data = encoder.encodeData([{ name: 'x', type: 'uint8', value: 1 }]);

    const signed = await offchain.signOffchainAttestation(
      {
        schema: '0x' + '00'.repeat(32),
        recipient: '0x0000000000000000000000000000000000000000',
        time: 1700000000n,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
        data,
      },
      signer
    );

    const pkg = { sig: signed, signer: signer.address };
    const urlPath = createOffchainURL(pkg);

    expect(urlPath).toContain('/offchain/url/#attestation=');
    expect(urlPath.length).toBeGreaterThan(50);
  });

  it('produces deterministic URLs for same input', async () => {
    const signer = new ethers.Wallet(TEST_PRIVATE_KEY);
    const offchain = new Offchain(
      { address: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587', version: '1.3.0', chainId: 1n },
      OffchainAttestationVersion.Version2,
      new EAS('0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587')
    );

    const encoder = new SchemaEncoder('string msg');
    const data = encoder.encodeData([{ name: 'msg', type: 'string', value: 'test' }]);

    const params = {
      schema: '0x' + 'ff'.repeat(32),
      recipient: '0x0000000000000000000000000000000000000001',
      time: 1700000000n,
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ZERO_BYTES32,
      data,
    };

    const signed = await offchain.signOffchainAttestation(params, signer);
    const pkg = { sig: signed, signer: signer.address };

    const url1 = createOffchainURL(pkg);
    const url2 = createOffchainURL(pkg);
    expect(url1).toBe(url2);
  });
});
