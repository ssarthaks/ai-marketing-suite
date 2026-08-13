function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
}

export function stableToolCacheKey(toolName: string, input: unknown): string {
  return `${toolName}:${JSON.stringify(canonicalize(input))}`;
}

function isRetryableFailure(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const error = (value as Record<string, unknown>).error;
  return (
    !!error &&
    typeof error === "object" &&
    !Array.isArray(error) &&
    (error as Record<string, unknown>).retryable === true
  );
}

/**
 * Deduplicates completed and in-flight tool calls during one agent run.
 * Transient failures and rejected promises are evicted so a later step can
 * retry them.
 */
export class ToolExecutionCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  async run(
    toolName: string,
    input: unknown,
    execute: () => Promise<unknown>,
  ): Promise<unknown> {
    const key = stableToolCacheKey(toolName, input);
    let pending = this.entries.get(key);
    if (!pending) {
      pending = Promise.resolve().then(execute);
      this.entries.set(key, pending);
    }

    try {
      const result = await pending;
      if (isRetryableFailure(result) && this.entries.get(key) === pending) {
        this.entries.delete(key);
      }
      return result;
    } catch (error) {
      if (this.entries.get(key) === pending) this.entries.delete(key);
      throw error;
    }
  }
}
