// QA-165 part 2: the mandatory fields a copy leaves empty (engine/runtime/mandatory.ts), as the lines a person reads on
// the forms card. Pure and import-free, so the page and its check share it.

export type OpenFieldIn = { box: string; label: string; reason: string; why: string };
/** `boxes`: every form field the line covers (a date's year, month and day are one line), its first one first. */
export type OpenLine = OpenFieldIn & { key: string; n: number; boxes: string[] };

/** Only the parts of one question merge: boxes under the same parent whose names differ by a date part (a date's year,
 *  month and day are one "Date of birth"); never two fields that merely share words (Devin on #592: IMM 5257's Taiwan
 *  PIN and Israel passport boxes carry the same wrong caption). */
const DATE_PART = /(Year|Month|Day|YYYY|MM|DD)$/;
const segs = (box: string) => box.split(".");
const bare = (seg: string) => seg.replace(/\[\d+\]$/, "");
const indexOf = (seg: string) => Number(/\[(\d+)\]$/.exec(seg)?.[1] ?? 0);
/** A form name in words: "IsraelPassportIndicator" → "Israel Passport Indicator", "Dependants" → "Dependant". */
const words = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/_/g, " ").trim();
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const one = (name: string) => words(name).replace(/ies$/, "y").replace(/([^s])s$/, "$1");

export function openLines(open: OpenFieldIn[]): OpenLine[] {
  const by = new Map<string, OpenLine>();
  for (const o of open) {
    const parts = segs(o.box), leaf = bare(parts.pop() ?? "").replace(DATE_PART, "");
    const key = `${parts.join(".")}|${leaf}|${o.label}|${o.reason}|${o.why}`;
    const x = by.get(key); if (x) { x.n++; x.boxes.push(o.box); } else by.set(key, { ...o, key, n: 1, boxes: [o.box] });
  }
  const lines = [...by.values()];
  // Lines that read the same are told apart, in words (Devin on #592: by the caption alone, whatever their reasons): first
  // by the field's own name ("Taiwan PIN"); when names repeat too (one field per person, IMM 0008), by the parts of the form
  // where their places differ: the paths' shared start and end are dropped, and the fewest last parts that make every line
  // unique are named ("Address Row 2", "Dependant 2", "Dep Prime › Personal Details"); a count ("1 of 3") is the last resort.
  const sameWords = new Map<string, OpenLine[]>();
  for (const l of lines) sameWords.set(l.label, [...(sameWords.get(l.label) ?? []), l]);
  const out = new Map<string, string>();
  const field = (l: OpenLine) => words(bare(segs(l.box).at(-1) ?? "").replace(DATE_PART, "")) || words(bare(segs(l.box).at(-1) ?? ""));
  for (const group of sameWords.values()) {
    if (group.length < 2) continue;
    if (new Set(group.map((l) => field(l).toLowerCase())).size === group.length) { for (const l of group) out.set(l.key, `${l.label} (form field: ${field(l)})`); continue; }
    const paths = group.map((l) => segs(l.box).slice(0, -1));
    let pre = 0; while (paths.every((p) => p[pre] !== undefined && p[pre] === paths[0][pre])) pre++;
    let suf = 0; while (paths.every((p) => p.length - suf - 1 >= pre && p[p.length - suf - 1] === paths[0][paths[0].length - suf - 1])) suf++;
    const mids = paths.map((p) => p.slice(pre, p.length - suf));
    const named = (mid: string[], k: number, at: number) => mid.slice(-k).map((seg, n) => {
      const pos = mid.length - Math.min(k, mid.length) + n, others = mids.filter((_, m) => m !== at).map((o) => o[pos]);
      const repeated = others.length > 0 && others.every((o) => o !== undefined && bare(o) === bare(seg));
      return repeated ? `${cap(one(bare(seg)))} ${indexOf(seg) + 1}` : `${cap(words(bare(seg)))}${indexOf(seg) > 0 ? ` ${indexOf(seg) + 1}` : ""}`;
    }).join(" › ");
    const longest = Math.max(1, ...mids.map((m) => m.length));
    let quals: string[] | null = null;
    for (let k = 1; k <= longest && !quals; k++) { const q = mids.map((m, at) => named(m, k, at)); if (q.every(Boolean) && new Set(q.map((x) => x.toLowerCase())).size === q.length) quals = q; }
    group.forEach((l, at) => out.set(l.key, `${l.label} (form field: ${field(l)}, ${quals ? quals[at] : `${at + 1} of ${group.length}`})`));
  }
  // Break m-2 on #592: a label that is only a date part ("YYYY", "MM") says nothing; the field's own name says more.
  const said = (l: OpenLine) => (/^(YYYY|MM|DD|Year|Month|Day)$/i.test(l.label.trim()) ? `${words(bare(segs(l.box).at(-1) ?? "").replace(DATE_PART, "")) || "Date"} (${l.label.trim()})` : l.label);
  return lines.map((l) => (out.has(l.key) ? { ...l, label: out.get(l.key)! } : { ...l, label: said(l) }));
}

/** QA-318 (P-46, P-171): what the forms card counts as facts to answer. Every readiness line that is not a mandatory form
 *  field left empty, and also a mandatory form field left empty that "needs an answer" (a question fills it and its
 *  answer is missing), so "Facts confirmed" is never shown over a missing fact. Locking is unchanged: a field left empty
 *  never holds a copy's lock back (QA-165, #1318 M2); Ready to file names it. */
export function cardFacts<T extends { reason: string; why?: string }>(missing: T[]): { facts: T[]; emptyFields: T[] } {
  const waits = (m: T) => m.reason !== "left empty on the form" || /^needs an answer\b/.test(m.why ?? "");
  return { facts: missing.filter(waits), emptyFields: missing.filter((m) => !waits(m)) };
}
