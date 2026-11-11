/** Bytes converted per `fromCharCode` call: bounded argument count, no per-byte array of one-character strings. */
const LATIN1_CHUNK = 4096;

/** One byte per UTF-16 unit (byte 0x80 is U+0080, unlike a windows-1252 decoder); chunked, so it is safe (and cheap) at any length. */
export function latin1(b: Uint8Array): string {
  const pieces: string[] = [];
  for (let at = 0; at < b.length; at += LATIN1_CHUNK) pieces.push(String.fromCharCode(...b.subarray(at, at + LATIN1_CHUNK)));
  return pieces.join('');
}
