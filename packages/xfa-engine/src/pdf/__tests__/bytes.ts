export const enc = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** Latin-1 decode without spreading (safe for large arrays). */
export const dec = (b: Uint8Array): string => Array.from(b, (c) => String.fromCharCode(c)).join('');
