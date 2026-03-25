# EAS CLI

Command-line interface for the [Ethereum Attestation Service](https://attest.org). Built on [EAS SDK v2](https://github.com/ethereum-attestation-service/eas-sdk-v2) and [ethers](https://docs.ethers.org).

Designed to be agent-friendly — all commands support `--json` output for easy parsing.

## Installation

```bash
npm install -g @ethereum-attestation-service/eas-cli
```

Or run directly with npx:

```bash
npx @ethereum-attestation-service/eas-cli --help
```

## Configuration

Store your private key for persistent use:

```bash
eas set-key 0xYourPrivateKeyHere
```

This saves the key to `~/.eas-cli` (file permissions `0600`, owner-only). The command displays your wallet address for confirmation.

To remove the stored key:

```bash
eas clear-key
```

Alternatively, set the `EAS_PRIVATE_KEY` environment variable. When set, it takes priority over the stored key:

```bash
export EAS_PRIVATE_KEY=0xYourPrivateKeyHere
```

## Commands

### Create an Attestation

```bash
eas attest \
  --schema 0xSchemaUID \
  --data '[{"name":"score","type":"uint256","value":"100"},{"name":"comment","type":"string","value":"great work"}]' \
  --recipient 0xRecipientAddress \
  --chain sepolia
```

### Create Multiple Attestations

```bash
eas multi-attest \
  --input '[{"schema":"0xSchemaUID","recipient":"0xAddr","data":[{"name":"score","type":"uint256","value":"100"}]}]' \
  --chain sepolia
```

### Create an Off-Chain Attestation

```bash
eas offchain-attest \
  --schema 0xSchemaUID \
  --data '[{"name":"score","type":"uint256","value":"100"}]' \
  --recipient 0xRecipientAddress \
  --chain sepolia
```

### Revoke an Attestation

```bash
eas revoke \
  --schema 0xSchemaUID \
  --uid 0xAttestationUID \
  --chain sepolia
```

### Get an Attestation

```bash
eas get-attestation \
  --uid 0xAttestationUID \
  --decode "uint256 score, string comment" \
  --chain sepolia
```

### Register a Schema

```bash
eas schema-register \
  --schema "uint256 score, string comment" \
  --chain sepolia
```

### Get a Schema

```bash
eas schema-get \
  --uid 0xSchemaUID \
  --chain sepolia
```

### Timestamp Data

```bash
eas timestamp \
  --data 0xBytes32Data \
  --chain sepolia
```

### Manage Private Key

```bash
# Store your private key
eas set-key 0xYourPrivateKeyHere

# Remove the stored key
eas clear-key
```

### List Supported Chains

```bash
eas chains
```

## Global Options

| Option    | Description                              |
|-----------|------------------------------------------|
| `--json`  | Output results as JSON (agent-friendly)  |
| `--help`  | Display help for any command             |

## Common Options (per command)

| Option           | Description                    | Default      |
|------------------|--------------------------------|--------------|
| `-c, --chain`    | Target chain                   | `ethereum`   |
| `--rpc-url`      | Custom RPC endpoint            | Chain default|

## Supported Chains

Ethereum, Sepolia, Base, Base Sepolia, Optimism, Optimism Sepolia, Arbitrum, Arbitrum Sepolia, Polygon, Scroll, Linea, Celo.

## JSON Mode

Pass `--json` to any command to get structured JSON output. This is designed for agent integrations:

```bash
eas get-attestation --uid 0x... --chain sepolia --json
```

Returns:

```json
{
  "success": true,
  "data": {
    "uid": "0x...",
    "schema": "0x...",
    "attester": "0x...",
    "recipient": "0x...",
    "time": 1700000000,
    "data": "0x..."
  }
}
```

On error:

```json
{
  "success": false,
  "error": "Error message here"
}
```

## Agent Integration

This CLI is designed for use as a tool by AI agents. Example MCP/tool definition:

```json
{
  "name": "eas_attest",
  "description": "Create an on-chain attestation on the Ethereum Attestation Service",
  "parameters": {
    "schema": "Schema UID",
    "data": "JSON array of {name, type, value} objects",
    "recipient": "Recipient Ethereum address",
    "chain": "Target chain (default: ethereum)"
  }
}
```

## Development

```bash
npm install
npm run build
node dist/index.js --help
```

## License

MIT
