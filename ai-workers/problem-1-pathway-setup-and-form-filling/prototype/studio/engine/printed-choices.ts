// A form box's printed choices as its committed reading (p1/inventory) stores them: the C3.4 masters step
// (api/src/form-masters.ts) guards an AI check's values with them, and the QA-196 check lander reads a check's printed
// choice words as the shared field's answers with them. Pure: no database, no file.
export type InvField = { caption?: string | null; data_path?: string | null; section?: string | null; options_from?: string | null; options_resolved?: unknown; options?: unknown; presence?: string | null; heading?: string | null; ui?: string | null };

/** P-296 (3): a box's choices as the AI reads them, [words, code] each, by the shape its box kind is stored in (every
 *  committed inventory, review round 2 M1): `options_resolved` is always [words, code] rows; a Yes/No group's `options`
 *  too (IMM 5257's 21 carry only these, spelled "* Yes", "*Yes" or "Yes"); a drop-down's `options` is two columns, the
 *  words then the codes. A check box's `options` are its on/off states, never words: "check_box". Rows without words
 *  are left out; any other shape gives no choices (the box is not guarded). */
export function printedChoices(f: InvField): [string, string][] | "check_box" {
  const parse = (raw: unknown): unknown => { if (typeof raw !== "string") return raw; try { return JSON.parse(raw.replace(/'/g, '"')); } catch { return null; } };
  const strs = (r: unknown): r is string[] => Array.isArray(r) && r.every((x) => typeof x === "string");
  const rows = (raw: unknown) => (Array.isArray(raw) && raw.length && raw.every((r) => strs(r) && r.length === 2) ? (raw as [string, string][]).filter(([w]) => w.trim() !== "") : null);
  const resolved = rows(parse(f.options_resolved));
  if (resolved?.length) return resolved;
  if (f.ui === "checkButton") return "check_box";
  const o = parse(f.options);
  if (f.ui === "exclGroup") return rows(o) ?? [];
  if (f.ui === "choiceList" && Array.isArray(o) && o.length === 2 && strs(o[0]) && strs(o[1]) && o[0].length === o[1].length)
    return o[0].map((w, i) => [w, o[1][i]] as [string, string]).filter(([w]) => w.trim() !== "");
  return [];
}
