export interface CLIOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

let jsonMode = false;

export function setJsonMode(enabled: boolean) {
  jsonMode = enabled;
}

export function isJsonMode(): boolean {
  return jsonMode;
}

export function output(result: CLIOutput) {
  if (jsonMode) {
    console.log(JSON.stringify(result, bigintReplacer, 2));
  } else if (result.success && result.data) {
    for (const [key, value] of Object.entries(result.data)) {
      if (typeof value === 'object' && value !== null) {
        console.log(`${key}:`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          console.log(`  ${k}: ${formatValue(v)}`);
        }
      } else {
        console.log(`${key}: ${formatValue(value)}`);
      }
    }
  } else if (!result.success && result.error) {
    console.error(`Error: ${result.error}`);
  }
}

function formatValue(v: unknown): string {
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'object' && v !== null) return JSON.stringify(v, bigintReplacer);
  return String(v);
}

function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  output({ success: false, error: message });
  process.exit(1);
}
