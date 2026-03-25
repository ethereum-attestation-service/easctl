import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAttestation = vi.fn();
const mockClient = {
  eas: { getAttestation: mockGetAttestation },
};

vi.mock('../../client.js', () => ({
  createReadOnlyEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

const mockDecodeData = vi.fn();

vi.mock('@ethereum-attestation-service/eas-sdk', () => ({
  SchemaEncoder: class MockSchemaEncoder {
    decodeData = mockDecodeData;
  },
}));

import { getAttestationCommand } from '../../commands/get-attestation.js';
import { output, handleError } from '../../output.js';

const mockAttestation = {
  uid: '0xuid',
  schema: '0xschema',
  attester: '0xattester',
  recipient: '0xrecipient',
  refUID: '0xref',
  revocable: true,
  revocationTime: 0n,
  expirationTime: 0n,
  time: 1700000000n,
  data: '0xdata',
};

describe('get-attestation command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAttestation.mockResolvedValue(mockAttestation);
  });

  async function runCommand(args: string[]) {
    await getAttestationCommand.parseAsync(['node', 'test', ...args]);
  }

  it('gets attestation by uid', async () => {
    await runCommand(['-u', '0xuid']);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        uid: '0xuid',
        schema: '0xschema',
        attester: '0xattester',
        recipient: '0xrecipient',
        revocationTime: 0,
        expirationTime: 0,
        time: 1700000000,
        data: '0xdata',
      }),
    });
  });

  it('decodes data when --decode is provided', async () => {
    mockDecodeData.mockReturnValue([
      { name: 'score', type: 'uint256', value: { value: 100n } },
    ]);

    await runCommand(['-u', '0xuid', '--decode', 'uint256 score']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData).toEqual([
      { name: 'score', type: 'uint256', value: '100' },
    ]);
  });

  it('converts bigint values to strings in decoded data', async () => {
    mockDecodeData.mockReturnValue([
      { name: 'amount', type: 'uint256', value: { value: 999999999999999999n } },
    ]);

    await runCommand(['-u', '0xuid', '--decode', 'uint256 amount']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData[0].value).toBe('999999999999999999');
  });

  it('passes through non-bigint decoded values', async () => {
    mockDecodeData.mockReturnValue([
      { name: 'label', type: 'string', value: { value: 'hello' } },
    ]);

    await runCommand(['-u', '0xuid', '--decode', 'string label']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData[0].value).toBe('hello');
  });

  it('adds decodeError on decode failure instead of throwing', async () => {
    mockDecodeData.mockImplementation(() => {
      throw new Error('decode failed');
    });

    await runCommand(['-u', '0xuid', '--decode', 'bad schema']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodeError).toBe('decode failed');
    expect(outputCall.data.decodedData).toBeUndefined();
  });

  it('does not include decodedData when --decode not provided', async () => {
    await runCommand(['-u', '0xuid']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData).toBeUndefined();
    expect(outputCall.data.decodeError).toBeUndefined();
  });
});
