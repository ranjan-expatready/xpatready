/**
 * FD-38 exemption (security invariant): how much file-controlled text may appear in an error message.
 * Messages reach logs and API responses, so a hostile 50 MB token must not be echoed whole. 32 characters
 * is enough to recognise the offending token; no firm or operator has a reason to vary it. A caller that needs
 * more (a guest stack trace) passes its own bound to `safeText`, which is still a fixed constant at that call site.
 */
export const MAX_ECHO_CHARS = 32;

const hex = (n: number, width: number): string => n.toString(16).padStart(width, '0');

/**
 * Makes text taken from a PDF, a datasets packet or a form script safe to place in an error message: truncated to `max`
 * characters (marked with `...`) and every character outside printable ASCII escaped as `\xNN` / `\uNNNN`, so a hostile
 * file cannot inject terminal escapes or newlines into logs. `keepNewlines` leaves line feeds as they are, so a guest
 * stack trace stays readable; every other control character is still escaped. Output is at most `max * 6 + 3` characters.
 */
export function safeText(text: string, max: number = MAX_ECHO_CHARS, keepNewlines = false): string {
  const shown = Math.min(text.length, max);
  let out = '';
  for (let i = 0; i < shown; i++) {
    const c = text.charCodeAt(i);
    if ((c >= 0x20 && c <= 0x7e) || (keepNewlines && c === 0x0a)) out += text[i];
    else if (c <= 0xff) out += `\\x${hex(c, 2)}`;
    else out += `\\u${hex(c, 4)}`;
  }
  return text.length > max ? `${out}...` : out;
}
