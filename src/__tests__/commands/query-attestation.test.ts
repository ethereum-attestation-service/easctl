import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../graphql.js', () => ({
  graphqlQuery: vi.fn(),
  QUERIES: {
    getAttestation: 'query GetAttestation($id: String!) { attestation(where: { id: $id }) { id } }',
  },
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

import { queryAttestationCommand } from '../../commands/query-attestation.js';
import { graphqlQuery } from '../../graphql.js';
import { output, handleError } from '../../output.js';

describe('query-attestation command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await queryAttestationCommand.parseAsync(['node', 'test', ...args]);
  }

  it('queries and returns attestation', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestation: { id: '0xatt', attester: '0xAttester', data: '0xdata' },
    });

    await runCommand(['-u', '0xatt']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', expect.any(String), { id: '0xatt' });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({ id: '0xatt', attester: '0xAttester' }),
    });
  });

  it('parses decodedDataJson when present', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestation: {
        id: '0xatt',
        decodedDataJson: '[{"name":"score","type":"uint256","value":{"value":"100"}}]',
      },
    });

    await runCommand(['-u', '0xatt']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData).toEqual([
      { name: 'score', type: 'uint256', value: { value: '100' } },
    ]);
  });

  it('keeps raw data when decodedDataJson is invalid JSON', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestation: {
        id: '0xatt',
        decodedDataJson: 'not-json{{{',
      },
    });

    await runCommand(['-u', '0xatt']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.decodedData).toBeUndefined();
    expect(outputCall.data.decodedDataJson).toBe('not-json{{{');
  });

  it('throws when attestation not found', async () => {
    (graphqlQuery as any).mockResolvedValue({ attestation: null });

    await runCommand(['-u', '0xmissing']);

    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('not found');
  });
});
