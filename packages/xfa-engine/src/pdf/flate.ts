// Kept in its own module so tests can mock `inflate` across the ESM import boundary (see reader-cache.test.ts).
import { concatBytes } from './concat-bytes.js';
import { XfaPdfError } from './errors.js';

/**
 * FD-38 exemption (security invariant): per-stream ceiling on inflated output.
 * It is a denial-of-service guard against decompression bombs in uploaded PDFs
 * (a few KB of Flate can expand to gigabytes); no firm or operator has a reason
 * to vary it, and real form streams are orders of magnitude smaller.
 */
export const MAX_INFLATED_BYTES = 64 * 1024 * 1024;

/** The output cap was hit; distinct from a corrupt stream so callers do not retry it. */
export class FlateLimitError extends XfaPdfError {
  constructor(limit: number) {
    super('MALFORMED', `Flate output exceeds ${limit} bytes`);
    this.name = 'FlateLimitError';
  }
}

async function transform(
  bytes: Uint8Array,
  stream: DecompressionStream | CompressionStream,
  what: string,
  limit: number,
): Promise<Uint8Array> {
  const reader = new Blob([bytes.slice()]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel();
        throw new FlateLimitError(limit);
      }
      chunks.push(value);
    }
  } catch (cause) {
    if (cause instanceof FlateLimitError) throw cause;
    throw new XfaPdfError('MALFORMED', `${what} failed`, { cause });
  }
  return concatBytes(chunks);
}

/**
 * Inflates one complete zlib (RFC 1950) stream with the web Streams API
 * (Node 24 and evergreen browsers). Corrupt or truncated data, bytes after the
 * end of the zlib stream (runtimes differ on tolerating these, so callers strip
 * PDF whitespace first, see `decodeStream`) and output beyond `limit` are all
 * MALFORMED. `limit` is injectable for tests only; production uses the default.
 */
export function inflate(bytes: Uint8Array, limit: number = MAX_INFLATED_BYTES): Promise<Uint8Array> {
  return transform(bytes, new DecompressionStream('deflate'), 'Flate inflate', limit);
}

export function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  return transform(bytes, new CompressionStream('deflate'), 'Flate deflate', Number.MAX_SAFE_INTEGER);
}
