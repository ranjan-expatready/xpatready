// BK-16 PR 2 (P-496 (1), (A3), tech lead on #1632): compare a combination's WHOLE release snapshot with a capture, where
// only the `status` of named shared library items may differ. A release records as a draft each shared item it is the
// first to carry, so when another combination's release carries a shared item first, that item's status (and nothing
// else) reads PUBLISHED instead of DRAFT. Names are row_versions keys: "field:<key>", "placement:<lineage>",
// "section:<key>". Pure; used by tests/check_bk16_family_forms_api.ts and to write its fixture.
import { createHash } from "node:crypto";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const EITHER = "(status may differ)";

/** JSON with every object's keys in order, so two equal snapshots give the same text whatever their key order. */
export function canonicalJson(x: unknown): string {
  const norm = (v: unknown): Json => Array.isArray(v) ? v.map(norm) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])])) : (v as Json);
  return JSON.stringify(norm(x));
}

/** The snapshot with the named items' status (and their row_versions status word) replaced, and which names it found. */
export function withStatusIgnored(snapshot: Record<string, unknown>, names: readonly string[]): { snapshot: Record<string, unknown>; missing: string[] } {
  const s = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  const rv = (s.row_versions ?? {}) as Record<string, string>;
  const list = (part: string) => (Array.isArray(s[part]) ? s[part] : []) as Record<string, unknown>[];
  const missing: string[] = [];
  for (const name of names) {
    const [kind, key] = [name.slice(0, name.indexOf(":")), name.slice(name.indexOf(":") + 1)];
    const rows = kind === "field" ? list("canonical_fields").filter((x) => x.id === key)
      : kind === "placement" ? list("placements").filter((x) => x.lineage === key)
      : kind === "section" ? list("sections").filter((x) => x.id === key) : [];
    if (!rows.length || !(name in rv)) { missing.push(name); continue; }
    for (const r of rows) r.status = EITHER;
    rv[name] = rv[name].replace(/\b(DRAFT|PUBLISHED)$/, EITHER);
  }
  return { snapshot: s, missing };
}

/** The sha256 of the whole snapshot, canonical, with the named items' status ignored. */
export const releaseSha = (snapshot: Record<string, unknown>, names: readonly string[]) =>
  createHash("sha256").update(canonicalJson(withStatusIgnored(snapshot, names).snapshot)).digest("hex");

/** The parts of two snapshots that differ once the named items' status is ignored (for a failure's words). */
export function partsThatDiffer(a: Record<string, unknown>, b: Record<string, unknown>, names: readonly string[]): string[] {
  const x = withStatusIgnored(a, names).snapshot, y = withStatusIgnored(b, names).snapshot;
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].sort().filter((k) => canonicalJson(x[k] ?? null) !== canonicalJson(y[k] ?? null));
}
