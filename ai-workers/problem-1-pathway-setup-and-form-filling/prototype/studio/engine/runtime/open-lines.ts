// QA-165 part 2: the mandatory fields a copy leaves empty (engine/runtime/mandatory.ts), as the lines a person reads on
// the forms card. Pure and import-free, so the page and its check share it.

export type OpenFieldIn = { box: string; label: string; reason: string; why: string };
export type OpenLine = OpenFieldIn & { key: string; n: number };

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
    const x = by.get(key); if (x) x.n++; else by.set(key, { ...o, key, n: 1 });
  }
  const lines = [...by.values()];
  // Lines that still read the same are told apart, in words: first by the field's own name ("Taiwan PIN"), then, when
  // that repeats too (one field per person, IMM 0008's dependants; Devin on #592), by the first part of the form where
  // they differ ("Dependant 2"); a count ("1 of 3") when nothing in their names tells them apart.
  const sameWords = new Map<string, OpenLine[]>();
  for (const l of lines) sameWords.set(`${l.label}|${l.reason}|${l.why}`, [...(sameWords.get(`${l.label}|${l.reason}|${l.why}`) ?? []), l]);
  const out = new Map<string, string>();
  for (const group of sameWords.values()) {
    if (group.length < 2) continue;
    const field = (l: OpenLine) => words(bare(segs(l.box).at(-1) ?? "").replace(DATE_PART, "")) || words(bare(segs(l.box).at(-1) ?? ""));
    const fields = new Map<string, OpenLine[]>();
    for (const l of group) fields.set(field(l), [...(fields.get(field(l)) ?? []), l]);
    for (const [name, same] of fields) {
      if (same.length < 2) { out.set(same[0].key, `${same[0].label} (form field: ${name})`); continue; }
      same.forEach((l, k) => {
        const ps = segs(l.box), others = same.filter((x) => x !== l).map((x) => segs(x.box));
        const at = ps.findIndex((seg, i) => others.some((o) => o[i] !== seg));
        // The same block repeated ("dependants[0]", "dependants[1]") is named with its number; different blocks
        // ("PersonalDetails", "depPrime", "dependants" on IMM 0008) by their own name, in words.
        const repeated = at >= 0 && others.every((o) => bare(o[at] ?? "") === bare(ps[at]));
        const part = at < 0 || at >= ps.length - 1 ? `${k + 1} of ${same.length}` : repeated ? `${cap(one(bare(ps[at])))} ${indexOf(ps[at]) + 1}` : cap(words(bare(ps[at])));
        out.set(l.key, `${l.label} (form field: ${name}, ${part})`);
      });
    }
  }
  // Break m-2 on #592: a label that is only a date part ("YYYY", "MM") says nothing; the field's own name says more.
  const said = (l: OpenLine) => (/^(YYYY|MM|DD|Year|Month|Day)$/i.test(l.label.trim()) ? `${words(bare(segs(l.box).at(-1) ?? "").replace(DATE_PART, "")) || "Date"} (${l.label.trim()})` : l.label);
  return lines.map((l) => (out.has(l.key) ? { ...l, label: out.get(l.key)! } : { ...l, label: said(l) }));
}
