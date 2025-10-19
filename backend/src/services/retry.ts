const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const delayMs = options.delayMs ?? RETRY_DELAY_MS;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error('Retry exhausted');
}
