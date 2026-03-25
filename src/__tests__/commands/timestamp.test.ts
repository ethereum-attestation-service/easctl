import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWait = vi.fn().mockResolvedValue(1700000000n);
const mockTimestamp = vi.fn().mockResolvedValue({ wait: mockWait });
const mockClient = {
  eas: { timestamp: mockTimestamp },
};

vi.mock('../../client.js', () => ({
  createEASClient: vi.fn(() => mockClient),
}));

vi.mock('../../output.js', () => ({
  output: vi.fn(),
  handleError: vi.fn(),
}));

import { timestampCommand } from '../../commands/timestamp.js';
import { output } from '../../output.js';

describe('timestamp command', () => {
  beforeEach(() => vi.clearAllMocks());

  async function runCommand(args: string[]) {
    await timestampCommand.parseAsync(['node', 'test', ...args]);
  }

  it('timestamps data on-chain', async () => {
    await runCommand(['-d', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890']);

    expect(mockTimestamp).toHaveBeenCalledWith(
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    );
    expect(output).toHaveBeenCalledWith({
      success: true,
      data: {
        timestamp: '1700000000',
        data: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        chain: 'ethereum',
      },
    });
  });

  it('uses specified chain', async () => {
    const { createEASClient } = await import('../../client.js');
    await runCommand(['-d', '0x1234', '-c', 'base']);
    expect(createEASClient).toHaveBeenCalledWith('base', undefined);
  });
});
