/**
 * Append-only byte buffer that doubles its backing store, so building an N-byte string costs about N to 2N bytes
 * (a `number[]` costs about 8N). Pushing past `limit` throws the error `overflow` builds, so a hostile input
 * stops growing the buffer at the ceiling.
 */
export class ByteSink {
  private buf = new Uint8Array(64);
  private used = 0;
  private readonly limit: number;
  private readonly overflow: () => Error;

  constructor(limit: number, overflow: () => Error) {
    this.limit = limit;
    this.overflow = overflow;
  }

  get length(): number {
    return this.used;
  }

  push(byte: number): void {
    if (this.used >= this.limit) throw this.overflow();
    if (this.used === this.buf.length) {
      const grown = new Uint8Array(this.buf.length * 2);
      grown.set(this.buf);
      this.buf = grown;
    }
    this.buf[this.used] = byte;
    this.used += 1;
  }

  /** An exact-size copy of the bytes written so far. */
  toBytes(): Uint8Array {
    return this.buf.slice(0, this.used);
  }
}
