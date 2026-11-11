import { describe, expect, it } from 'vitest';
import { MAX_ECHO_CHARS, safeText } from '../safe-text.js';

describe('safeText (file-controlled text echoed into error messages)', () => {
  it('printable ASCII up to the limit passes through unchanged', () => {
    expect(safeText('FlateDecode')).toBe('FlateDecode');
    expect(safeText('a'.repeat(MAX_ECHO_CHARS))).toBe('a'.repeat(MAX_ECHO_CHARS));
  });

  it('text longer than the limit is truncated and marked, so a 10,000-char token cannot bloat a message', () => {
    const out = safeText('x'.repeat(10_000));
    expect(out).toBe(`${'x'.repeat(MAX_ECHO_CHARS)}...`);
  });

  it('control bytes, DEL and high Latin-1 bytes are escaped, never emitted raw', () => {
    expect(safeText('a\x1b[31mb\x00\x7f\xe9')).toBe('a\\x1b[31mb\\x00\\x7f\\xe9');
  });

  it('code units above 0xFF are escaped as \\uXXXX', () => {
    expect(safeText(' \ud800')).toBe('\\u2028\\ud800');
  });

  it('output length is bounded even when every kept character expands to a 6-char escape', () => {
    expect(safeText(' '.repeat(10_000)).length).toBeLessThanOrEqual(MAX_ECHO_CHARS * 6 + 3);
  });

  it('the limit is 32 characters', () => {
    expect(MAX_ECHO_CHARS).toBe(32);
  });

  describe('the caller picks the bound and whether newlines survive (the merged clip-text)', () => {
    it('max defaults to MAX_ECHO_CHARS and an explicit max overrides it', () => {
      expect(safeText('x'.repeat(100))).toBe(`${'x'.repeat(MAX_ECHO_CHARS)}...`);
      expect(safeText('x'.repeat(100), 64)).toBe(`${'x'.repeat(64)}...`);
      expect(safeText('x'.repeat(64), 64)).toBe('x'.repeat(64));
    });

    it('a newline is escaped by default and kept only when keepNewlines is true', () => {
      expect(safeText('a\nb')).toBe('a\\x0ab');
      expect(safeText('a\nb', MAX_ECHO_CHARS, true)).toBe('a\nb');
    });

    it('keepNewlines never lets any other control character through', () => {
      expect(safeText('a\r\n\x1b[31m\u2028', 200, true)).toBe('a\\x0d\n\\x1b[31m\\u2028');
    });

    it('a stack-trace sized bound escapes every non-printable character and still truncates', () => {
      expect(safeText(`${'line\n'.repeat(1000)}`, 100, true)).toBe(`${'line\n'.repeat(20)}...`);
    });
  });
});
