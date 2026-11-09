// How a value a document gave compares with an answer (C6.5, P-242). Plain functions with no Nest decorators, so the
// acceptance packs (run by tsx without the API's tsconfig, as gate B runs them) and the counts rule can import them.
/** Names compare without case and repeated spaces (the coded line is upper case); every other value as written. */
export function sameValue(fact: string, a: unknown, b: unknown): boolean {
  const s = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v ?? null)).trim();
  const name = /_names?$/.test(fact);
  return name ? s(a).toUpperCase().replace(/\s+/g, " ") === s(b).toUpperCase().replace(/\s+/g, " ") : s(a) === s(b);
}
