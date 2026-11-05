// Compares the canonical fields an AI field-map draft proposes for an added form with the shared library.
// Deterministic and explainable: key identity, words of the key and the meaning, value type, period/context words
// (current versus previous, intended, first...) and the people the boxes concern. It never merges two keys on its
// own: an exact key with a compatible type and meaning is proposed for reuse; anything close but not identical is
// put to a person (AMBIGUOUS), a type clash is a CONFLICT, and the rest are proposed NEW definitions. A person
// decides every item; reuse never merges two people's values, because a box keeps its own person.
// P-65 (F1): a key that was merged into another redirects to it (reuse the surviving field); a box whose label is an
// alias of one library field (a label seen on another form) is put to a person with that field recommended.
import { normLabel } from "./twin.ts";

export type LibraryField = { key: string; meaning: string; valueType: string; status: string; aliases?: string[] };
export type ProposedField = { id: string; meaning: string; value_type: string };
export type Entry = { data_path: string; outcome: string; person?: string | null; row?: number | null; fact?: string | null; transform?: string | null; confidence?: string | null; evidence_quote?: string | null; caption?: string | null };

const STOP = new Set("the a an of or and in on to for as is are be any this that by with from who which their its it person persons case form applicant applicants s number details detail information name".split(" "));
/** Words that put a fact in a different period or role. "current", "present", "usual" and "primary" are the default
 *  reading of an unqualified field, so their absence on one side is not a difference. */
const QUALIFIERS = ["previous", "former", "prior", "past", "intended", "proposed", "planned", "future", "first", "last", "original", "history", "alternate", "secondary", "other"];
/** Parts of a composite library value (address, phone) the transformation executor can select (p5/transforms.ts). */
const PARTS: Record<string, string> = { city: "city", town: "city", province_state: "province", province: "province", state: "province", postal_code: "postal_code", zip: "postal_code", country: "country", street_name: "street_name", street: "street_name", street_number: "street_number", apt_unit: "apt_unit", unit: "apt_unit", apartment: "apt_unit", district: "district", po_box: "po_box" };
const ROLES = ["spouse", "partner", "child", "children", "parent", "mother", "father", "sibling", "representative", "employer", "sponsor", "host", "inviter"];
const TYPE_GROUP: Record<string, string> = { text: "text", email: "text", code: "code", country: "code", date: "date", yes_no: "bool", number: "number", address: "address", phone: "phone" };

export function words(s: string): string[] {
  return (s.toLowerCase().replace(/['’]s\b/g, "").match(/[a-z]+/g) ?? []).map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).filter((w) => !STOP.has(w));
}
const jaccard = (a: string[], b: string[]) => { const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 0; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };
const keyWords = (k: string) => words(k.split(".").slice(1).join(" ").replace(/_/g, " "));
const area = (k: string) => k.split(".")[0];
const qualifiers = (s: string) => QUALIFIERS.filter((q) => new RegExp(`\\b${q}\\b`, "i").test(s.replace(/_/g, " ")));
const roles = (s: string) => ROLES.filter((r) => new RegExp(`\\b${r}\\b`, "i").test(s.replace(/_/g, " ")));
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

export function similarity(p: ProposedField, l: LibraryField) {
  const k = jaccard(keyWords(p.id), keyWords(l.key)), m = jaccard(words(p.meaning), words(l.meaning));
  const score = 0.55 * k + 0.45 * m - (area(p.id) !== area(l.key) ? 0.15 : 0);
  const qp = qualifiers(`${p.id} ${p.meaning}`), ql = qualifiers(`${l.key} ${l.meaning}`);
  const rp = roles(p.id), rl = roles(l.key);
  return { score: Math.round(score * 100) / 100, key: Math.round(k * 100) / 100, meaning: Math.round(m * 100) / 100, contextDiffers: !sameSet(qp, ql), qualifiersProposed: qp, qualifiersLibrary: ql, roleDiffers: !sameSet(rp, rl),
    typeCompatible: (TYPE_GROUP[p.value_type] ?? p.value_type) === (TYPE_GROUP[l.valueType] ?? l.valueType) };
}

/** "person.mailing_address_city" against a library "person.mailing_address" of type address: a part of a composite value. */
export function partOf(proposedKey: string, lib: LibraryField[]): { key: string; part: string; transform: string } | null {
  for (const l of lib) {
    if (!["address"].includes(l.valueType) || !proposedKey.startsWith(`${l.key}_`)) continue;
    const suffix = proposedKey.slice(l.key.length + 1);
    if (PARTS[suffix]) return { key: l.key, part: PARTS[suffix], transform: `address_part:${PARTS[suffix]}` };
  }
  return null;
}

export type Item = {
  proposedKey: string; proposedMeaning: string; proposedType: string; outcome: "REUSE" | "NEW" | "AMBIGUOUS" | "CONFLICT"; matchedKey: string | null;
  candidates: { key: string; meaning: string; valueType: string; score: number; why: string }[]; persons: string[];
  boxes: { data_path: string; caption: string | null; person: string | null; row: number | null; transform: string | null; confidence: string | null; evidence: string | null }[];
  evidence: { quotes: string[]; confidence: Record<string, number> }; reason: string; recommendation: { action: "reuse" | "create_new" | "decide"; key: string | null; text: string; transform?: string };
};

export function normalize(proposed: ProposedField[], entries: Entry[], library: LibraryField[], redirects: Map<string, string> = new Map()): Item[] {
  const lib = new Map(library.map((l) => [l.key, l]));
  const byAlias = new Map<string, LibraryField[]>();
  for (const l of library) for (const a of l.aliases ?? []) { const k = normLabel(a); if (k) byAlias.set(k, [...(byAlias.get(k) ?? []), l]); }
  const mapped = entries.filter((e) => e.outcome === "mapped" && e.fact);
  const out: Item[] = [];
  const keys = [...new Set([...proposed.map((p) => p.id), ...mapped.map((e) => e.fact!)])];
  for (const key of keys) {
    const p = proposed.find((x) => x.id === key) ?? { id: key, meaning: "(used by a form field but not defined by the draft)", value_type: "text" };
    const boxes = mapped.filter((e) => e.fact === key).map((e) => ({ data_path: e.data_path, caption: e.caption ?? null, person: e.person ?? null, row: e.row ?? null, transform: e.transform ?? null, confidence: e.confidence ?? null, evidence: e.evidence_quote ?? null }));
    if (!boxes.length) continue; // a definition no box reads is not added
    const persons = [...new Set(boxes.map((b) => b.person ?? "none"))];
    const conf: Record<string, number> = {};
    for (const b of boxes) conf[b.confidence ?? "unstated"] = (conf[b.confidence ?? "unstated"] ?? 0) + 1;
    const quotes = [...new Set(boxes.map((b) => b.evidence).filter(Boolean) as string[])].slice(0, 4);
    const base = { proposedKey: key, proposedMeaning: p.meaning, proposedType: p.value_type, persons, boxes, evidence: { quotes, confidence: conf } };
    const moved = redirects.get(key);
    if (moved && lib.get(moved)) {
      out.push({ ...base, outcome: "REUSE", matchedKey: moved, candidates: [], reason: `${key} was merged into ${moved} after a review (P-65); the merged id redirects, so the form fields read ${moved}.`, recommendation: { action: "reuse", key: moved, text: `Reuse ${moved}` } });
      continue;
    }
    const exact = lib.get(key);
    const aliasHits = exact ? [] : [...new Map(boxes.flatMap((b) => byAlias.get(normLabel(b.caption)) ?? []).map((l) => [l.key, l])).values()].filter((l) => similarity(p, l).typeCompatible);
    if (aliasHits.length === 1) {
      const l = aliasHits[0];
      out.push({ ...base, outcome: "AMBIGUOUS", matchedKey: l.key, candidates: [{ key: l.key, meaning: l.meaning, valueType: l.valueType, score: 1, why: "the form field's label is an alias of this field" }], reason: `Not an existing key, but the form field's label is an alias of ${l.key} (a label seen on another form). Probably the same meaning under another name.`, recommendation: { action: "reuse", key: l.key, text: `Use the existing ${l.key}` } });
      continue;
    }
    // Equal scores rank by key, by character code so no machine's locale changes it (QA-193 order row): the top three
    // never depend on the order the library's rows came in, so comparing a draft again gives the same candidates and
    // keeps its decisions (sources.ts recompare).
    const ranked = library.filter((l) => l.key !== key).map((l) => ({ l, s: similarity(p, l) })).filter((x) => x.s.score >= 0.3).sort((a, b) => b.s.score - a.s.score || (a.l.key < b.l.key ? -1 : a.l.key > b.l.key ? 1 : 0)).slice(0, 3);
    const candidates = ranked.map(({ l, s }) => ({ key: l.key, meaning: l.meaning, valueType: l.valueType, score: s.score,
      why: [`key words ${s.key}`, `meaning words ${s.meaning}`, s.contextDiffers ? `period/context differs (${s.qualifiersProposed.join("/") || "none"} vs ${s.qualifiersLibrary.join("/") || "none"})` : "", s.roleDiffers ? "names a different relation" : "", s.typeCompatible ? "" : `type ${p.value_type} vs ${l.valueType}`].filter(Boolean).join("; ") }));
    if (exact) {
      const s = similarity(p, exact);
      if (!s.typeCompatible) { out.push({ ...base, outcome: "CONFLICT", matchedKey: key, candidates, reason: `Same key as the library field, but the value type differs: library ${exact.valueType}, this form ${p.value_type}. Using it as is could write the wrong kind of value.`, recommendation: { action: "decide", key, text: "Keep the library type and fix the map's transformation, or define a separate field" } }); continue; }
      if (s.contextDiffers && s.meaning < 0.5) { out.push({ ...base, outcome: "AMBIGUOUS", matchedKey: key, candidates, reason: `Same key, but the meanings differ in period or context (${s.qualifiersProposed.join("/") || "none"} on this form, ${s.qualifiersLibrary.join("/") || "none"} in the library). A current value must not fill a previous-value form field.`, recommendation: { action: "decide", key, text: "Confirm it is the same meaning, or define a separate field" } }); continue; }
      out.push({ ...base, outcome: "REUSE", matchedKey: key, candidates: [], reason: `Same key and a compatible type (${exact.valueType}); meaning overlap ${s.meaning}. The form fields keep their own person, so reuse shares the definition, not anyone's value.`, recommendation: { action: "reuse", key, text: `Reuse ${key}` } });
      continue;
    }
    const part = partOf(key, library);
    if (part) {
      out.push({ ...base, outcome: "AMBIGUOUS", matchedKey: part.key, candidates, reason: `Looks like one part (${part.part}) of the library's composite field ${part.key}. Reusing it with the transformation "${part.transform}" keeps one address per person instead of a second, separately maintained definition.`, recommendation: { action: "reuse", key: part.key, text: `Use ${part.key} (${part.part} part)`, transform: part.transform } });
      continue;
    }
    const top = ranked[0];
    if (top && top.s.score >= 0.55 && !top.s.contextDiffers && !top.s.roleDiffers && top.s.typeCompatible) {
      out.push({ ...base, outcome: "AMBIGUOUS", matchedKey: top.l.key, candidates, reason: `Not an existing key, but very close to ${top.l.key} ("${top.l.meaning}"). Probably a duplicate definition under another name.`, recommendation: { action: "reuse", key: top.l.key, text: `Use the existing ${top.l.key}` } });
    } else if (top && (top.s.score >= 0.55 || (top.s.score >= 0.35 && (top.s.contextDiffers || top.s.roleDiffers)))) {
      out.push({ ...base, outcome: "NEW", matchedKey: null, candidates, reason: `Similar to ${top.l.key}, but kept distinct: ${top.s.contextDiffers ? `period/context differs (${top.s.qualifiersProposed.join("/") || "none"} vs ${top.s.qualifiersLibrary.join("/") || "none"})` : top.s.roleDiffers ? "it names a different relation" : `type ${p.value_type} vs ${top.l.valueType}`}.`, recommendation: { action: "create_new", key, text: `Create ${key} as a new definition` } });
    } else if (top && top.s.score >= 0.35) {
      out.push({ ...base, outcome: "AMBIGUOUS", matchedKey: null, candidates, reason: `No existing key; partly similar to ${top.l.key} (${top.s.score}). A person decides whether it is the same meaning.`, recommendation: { action: "create_new", key, text: `Create ${key}, unless it means the same as ${top.l.key}` } });
    } else {
      out.push({ ...base, outcome: "NEW", matchedKey: null, candidates, reason: "No library definition with this meaning.", recommendation: { action: "create_new", key, text: `Create ${key} as a new definition` } });
    }
  }
  const rank = { CONFLICT: 0, AMBIGUOUS: 1, NEW: 2, REUSE: 3 } as const;
  return out.sort((a, b) => rank[a.outcome] - rank[b.outcome] || a.proposedKey.localeCompare(b.proposedKey));
}
