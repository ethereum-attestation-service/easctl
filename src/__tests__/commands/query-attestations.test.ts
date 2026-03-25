import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../graphql.js', () => ({
  graphqlQuery: vi.fn(),
  QUERIES: {
    getAttestationsBySchema: 'query BySchema',
    getAttestationsByAttester: 'query ByAttester',
  },
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

import { queryAttestationsCommand } from '../../commands/query-attestations.js';
import { graphqlQuery, QUERIES } from '../../graphql.js';
import { output, handleError } from '../../output.js';

describe('query-attestations command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await queryAttestationsCommand.parseAsync(['node', 'test', ...args]);
  }

  it('queries by schema', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestations: [{ id: '0x1' }, { id: '0x2' }],
    });

    await runCommand(['-s', '0xschema']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getAttestationsBySchema, {
      schemaId: '0xschema',
      take: 10,
    });
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 2, attestations: expect.any(Array) },
    });
  });

  it('queries by attester', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestations: [{ id: '0x1' }],
    });

    await runCommand(['-a', '0xAttester']);

    expect(graphqlQuery).toHaveBeenCalledWith('ethereum', QUERIES.getAttestationsByAttester, {
      attester: '0xAttester',
      take: 10,
    });
  });

  it('schema takes precedence when both provided', async () => {
    (graphqlQuery as any).mockResolvedValue({ attestations: [] });

    await runCommand(['-s', '0xschema', '-a', '0xAttester']);

    expect(graphqlQuery).toHaveBeenCalledTimes(1);
    expect(graphqlQuery).toHaveBeenCalledWith(
      'ethereum',
      QUERIES.getAttestationsBySchema,
      expect.objectContaining({ schemaId: '0xschema' })
    );
  });

  it('throws when neither schema nor attester provided', async () => {
    await runCommand([]);

    expect(handleError).toHaveBeenCalledWith(expect.any(Error));
    const err = (handleError as any).mock.calls[0][0] as Error;
    expect(err.message).toContain('Provide at least one filter');
  });

  it('passes limit as integer', async () => {
    (graphqlQuery as any).mockResolvedValue({ attestations: [] });

    await runCommand(['-s', '0xschema', '-n', '25']);

    expect(graphqlQuery).toHaveBeenCalledWith(
      'ethereum',
      expect.any(String),
      expect.objectContaining({ take: 25 })
    );
  });

  it('parses decodedDataJson for each attestation', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestations: [
        { id: '0x1', decodedDataJson: '{"key":"value"}' },
        { id: '0x2', decodedDataJson: null },
      ],
    });

    await runCommand(['-s', '0xschema']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.attestations[0].decodedData).toEqual({ key: 'value' });
    expect(outputCall.data.attestations[1].decodedData).toBeUndefined();
  });

  it('handles invalid decodedDataJson gracefully', async () => {
    (graphqlQuery as any).mockResolvedValue({
      attestations: [{ id: '0x1', decodedDataJson: 'bad-json' }],
    });

    await runCommand(['-s', '0xschema']);

    const outputCall = (output as any).mock.calls[0][0];
    expect(outputCall.data.attestations[0].decodedData).toBeUndefined();
  });

  it('returns empty results with count 0', async () => {
    (graphqlQuery as any).mockResolvedValue({ attestations: [] });

    await runCommand(['-s', '0xschema']);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, attestations: [] },
    });
  });

  it('handles missing attestations key in response', async () => {
    (graphqlQuery as any).mockResolvedValue({});

    await runCommand(['-s', '0xschema']);

    expect(output).toHaveBeenCalledWith({
      success: true,
      data: { count: 0, attestations: [] },
    });
  });
});
