// Screen map drafting without AI (P-62 §1, P-65 "matching tries form path, then name and aliases, before any AI"; F1
// slice 1). For each input of an online version, in this order:
//   1. same path: an earlier approved online version of the same form and portal mapped the same element id;
//   2. PDF twin: the form's PDF edition has a mapped form field with the same label (normalised), or, for a date in three
//      form fields, a date part of the same date (the screen's group label, e.g. "Date of birth", is the PDF's heading);
//   3. name or alias: a shared field carries this label among its aliases (labels seen on other forms); an input in a
//      group ("Current country of residence › Country or territory") matches the group and label together, or the bare
//      label only when the group's own words are in the field's name (CHECK fix: the bare label named the wrong fact).
// A screen about another person (a spouse or partner, a child, a parent) takes only that person's form fields; a parent
// screen goes to a person, because the PDF's first and second parent cannot be told apart from the screen.
// Whatever is left is listed for drafting (the guarded AI in slice 2) or a person; a document upload is "not a fact".
// Nothing here is final: a person accepts the proposals; a merged-away field id redirects to the field it was merged into.
import type { CaptureRecord } from "./capture.ts";

export type PdfEntry = { data_path: string; caption: string | null; heading: string | null; fact: string | null; transform: string | null; person: string | null; outcome: string };
export type LibraryEntry = { key: string; valueType: string; aliases: string[]; mergedIntoKey: string | null; answerListKey?: string | null };
export type Proposal = {
  screen: string; screen_order: number; input: string; input_order: number; label: string; group: string | null; part: string | null; type: string;
  outcome: "mapped" | "leftover" | "not_a_fact"; method: "same_path" | "pdf_twin" | "alias" | null; fact: string | null; transform: string | null; person: string | null;
  from: string | null; candidates: string[]; why: string;
};

/** Labels compared as people read them: no "*", question numbers, list letters, qualifiers in brackets or punctuation. */
export function normLabel(s: string | null | undefined) {
  // Unicode forms (full-width letters, composed accents), curly apostrophes and invisible spaces compare as people read
  // them (break m9).
  return (s ?? "").normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").replace(/[\u2018\u2019\u02BC\u2032]/g, "'").toLowerCase().replace(/\(s\)/g, "s").replace(/\([^)]*\)/g, " ").replace(/^\s*\*+\s*/, "").replace(/^\s*question\s+\d+\s*[a-z]?\b\.?/, "")
    .replace(/^\s*[a-z]\)\s*/, "").replace(/[*:?.,;/\\›»>-]+/g, " ").replace(/\brequired\b/g, " ").replace(/\s+/g, " ").trim();
}
/** Words that put a fact in another period or role (as engine/normalize.ts): a "Family name" box must not fill
 *  person.other_family_name unless the screen's own label says "other". */
const QUALIFIERS = ["other", "previous", "former", "prior", "past", "intended", "proposed", "planned", "future", "original", "alternate", "secondary"];
const quals = (s: string) => QUALIFIERS.filter((q) => new RegExp(`\\b${q}\\b`).test(s.toLowerCase().replace(/[._]/g, " ")));
const keyWords = (k: string) => k.split(".").slice(1).join(" ").replace(/_/g, " ").split(" ").filter((w) => w && !["of", "the", "a", "an"].includes(w));
/** How well a shared field's own name matches a label (share of words in common). */
const nameScore = (key: string, label: string) => { const a = new Set(keyWords(key)), b = new Set(normLabel(label).split(" ").filter((w) => !["of", "the", "a", "an", "your"].includes(w))); if (!a.size || !b.size) return 0; let n = 0; for (const w of a) if (b.has(w)) n++; return n / (a.size + b.size - n); };
const partOf = (t: string | null) => /^date(?:_part)?:(YYYY|MM|DD)$/.exec((t ?? "").trim())?.[1] ?? null;
const choice = (type: string) => type === "select" || type === "radio";
const captionOf = (group: string | null | undefined, label: string) => (group && normLabel(group) !== normLabel(label) ? `${group} › ${label}` : label);

/** Who a screen is about, from its title or the input's group; null for the applicant's own screens. */
const PERSONS: [RegExp, string][] = [[/\b(spouse|common[- ]law|partner)\b/, "subject_spouse_or_partner"], [/\b(child|children|dependant|dependent)\b/, "subject_child"], [/\b(mother|father|parents?)\b/, "parent"], [/\brepresentative\b/, "representative"]];
function personOf(...texts: (string | null | undefined)[]) {
  const t = texts.map((x) => normLabel(x)).join(" ");
  return PERSONS.find(([rx]) => rx.test(t))?.[1] ?? null;
}
const PERSON_WORDS: Record<string, string> = { subject_spouse_or_partner: "the spouse or partner", subject_child: "a child", parent: "a parent", representative: "the representative" };

/** The executable step that turns the shared field's value into this input's own format. */
export function transformFor(type: string, part: string | null, lib: { answerListKey?: string | null } | undefined) {
  if (part) return `date:${part}`;
  if (type === "date") return "date:YYYY-MM-DD";
  if (type === "checkbox") return "yes_no_code:true/false";
  if (choice(type)) return lib?.answerListKey ? "option_map" : "code_list:portal_choices";
  return "as_is";
}
/** A date part needs a date; a choice needs a coded or yes/no value; free text takes text. Unknown types pass. */
export function compatible(type: string, part: string | null, valueType: string | undefined) {
  if (!valueType) return true;
  if (part || type === "date") return valueType === "date";
  if (choice(type)) return ["code", "country", "yes_no", "text"].includes(valueType);
  return !["date"].includes(valueType) || type === "text";
}

export function draftScreenMap(twin: CaptureRecord, ctx: { pdf: PdfEntry[]; pdfEdition: string | null; previous: Map<string, { fact: string | null; transform: string | null; person: string | null; edition: string }>; library: LibraryEntry[] }): { proposals: Proposal[]; pdf_not_on_portal: { caption: string; fact: string }[]; counts: Record<string, number> } {
  const lib = new Map(ctx.library.map((l) => [l.key, l]));
  const resolve = (k: string | null) => { let key = k, n = 0; while (key && lib.get(key)?.mergedIntoKey && n++ < 5) key = lib.get(key)!.mergedIntoKey; return key; };
  const mapped = ctx.pdf.filter((e) => e.outcome === "mapped" && e.fact);
  const byAlias = new Map<string, string[]>();
  for (const l of ctx.library) if (!l.mergedIntoKey) for (const a of l.aliases) { const k = normLabel(a); if (k) byAlias.set(k, [...new Set([...(byAlias.get(k) ?? []), l.key])]); }
  const used = new Set<string>();
  const proposals: Proposal[] = [];
  for (const s of twin.screens) for (const i of s.inputs) {
    const base = { screen: s.title, screen_order: s.order, input: i.id, input_order: i.order, label: i.label, group: i.group ?? null, part: i.part ?? null, type: i.type, candidates: [] as string[] };
    const done = (method: Proposal["method"], fact: string, person: string | null, from: string | null, why: string) => {
      const key = resolve(fact)!;
      proposals.push({ ...base, outcome: "mapped", method, fact: key, transform: transformFor(i.type, i.part ?? null, lib.get(key)), person: person ?? "form_subject", from, why: key !== fact ? `${why} (${fact} was merged into ${key})` : why });
    };
    const who = personOf(s.title, i.group);
    if (i.type === "file") { proposals.push({ ...base, outcome: "not_a_fact", method: null, fact: null, transform: null, person: null, from: null, why: "A document upload: the document checklist asks for it, not a shared field." }); continue; }
    // 1. same path
    const prev = ctx.previous.get(i.id);
    if (prev?.fact) { done("same_path", prev.fact, prev.person, prev.edition, `Same element id as in ${prev.edition}, which maps it to ${prev.fact}.`); continue; }
    // 2. PDF twin
    let hits: PdfEntry[] = [];
    const own = quals(`${i.group ?? ""} ${i.label}`);
    if (i.part) {
      // A date part: the PDF's same part (date:YYYY …) of the date the screen's group names ("Date of birth").
      const parts = mapped.filter((e) => partOf(e.transform) === i.part);
      const best = Math.max(0, ...parts.map((e) => nameScore(e.fact!, i.group ?? "")));
      hits = best >= 0.5 ? parts.filter((e) => nameScore(e.fact!, i.group ?? "") === best) : parts.filter((e) => i.group && normLabel(e.caption).includes(normLabel(i.group)));
    } else {
      const l = normLabel(i.label);
      hits = l ? mapped.filter((e) => normLabel(e.caption) === l && !partOf(e.transform)) : [];
    }
    hits = hits.filter((h) => compatible(i.type, i.part ?? null, lib.get(resolve(h.fact)!)?.valueType));
    // Same label, several fields: drop fields of another period or role the screen does not name ("other", "previous").
    if (new Set(hits.map((h) => h.fact)).size > 1) hits = hits.filter((h) => quals(h.fact!).every((q) => own.includes(q)));
    // The screen's person: the applicant's own screen prefers the PDF's form fields about the form's subject; a screen
    // about another person takes only that person's form fields (review 8: a spouse screen took the applicant's).
    if (who) hits = hits.filter((h) => h.person === who);
    else { const subject = hits.filter((h) => h.person === "form_subject"); if (subject.length) hits = subject; }
    // Still several: the field whose own name best matches the screen's group and label ("Place of birth › Country or
    // territory" → person.country_of_birth), only when that best match is unique.
    if (new Set(hits.map((h) => h.fact)).size > 1 && i.group) {
      const score = new Map([...new Set(hits.map((h) => h.fact!))].map((f) => [f, nameScore(f, `${i.group} ${i.label}`)]));
      const ranked = [...score.values()].sort((a, b) => b - a);
      if (ranked[0] > 0 && ranked[0] > ranked[1]) hits = hits.filter((h) => score.get(h.fact!) === ranked[0]);
    }
    const facts = [...new Set(hits.map((h) => h.fact!))];
    if (facts.length === 1) { const h = hits[0]; used.add(facts[0]); done("pdf_twin", facts[0], h.person, `${ctx.pdfEdition} · ${h.caption ?? h.data_path}`, `Same ${i.part ? `date part (${i.part}) of "${i.group}"` : "label"} as the PDF form field "${h.caption}" in ${ctx.pdfEdition}.`); continue; }
    // 3. name or alias: the group and label together, else the bare label when the group's own words are in the
    // field's name ("Place of birth › City or town" → person.place_of_birth_city, never "Current country of residence ›
    // Country or territory" → person.country_of_birth).
    const groupWords = new Set(normLabel(i.group).split(" ").filter((w) => w.length > 2 && !normLabel(i.label).split(" ").includes(w) && !["your", "the", "and"].includes(w)));
    const fits = (k: string) => !i.group || i.part || !groupWords.size || keyWords(k).some((w) => groupWords.has(w));
    const named = i.part ? byAlias.get(normLabel(`${i.group} ${i.label}`)) ?? byAlias.get(normLabel(i.group)) : (i.group ? byAlias.get(normLabel(`${i.group} ${i.label}`)) : undefined) ?? (byAlias.get(normLabel(i.label)) ?? []).filter(fits);
    const keys = (named ?? []).filter((k) => compatible(i.type, i.part ?? null, lib.get(k)?.valueType));
    if (keys.length === 1 && who !== "parent") { used.add(keys[0]); done("alias", keys[0], who ?? "form_subject", null, `"${i.part ? i.group : captionOf(i.group, i.label)}" is an alias of ${keys[0]} (a label seen on another form)${who ? `, for ${PERSON_WORDS[who]}` : ""}.`); continue; }
    const cands = facts.length ? facts : keys;
    proposals.push({ ...base, outcome: "leftover", method: null, fact: null, transform: null, person: null, from: null, candidates: cands,
      why: who === "parent" ? "A screen about a parent: the PDF's first and second parent cannot be told apart from the screen, so a person maps it." : cands.length > 1 ? `Matches ${cands.length} different shared fields (${cands.join(", ")}): a person chooses, or drafting decides.` : who ? `No PDF form field about ${PERSON_WORDS[who]}, earlier version or alias has this label: drafting (slice 2) or a person maps it.` : "No PDF form field, earlier version or alias has this label: drafting (slice 2) or a person maps it." });
  }
  const pdf_not_on_portal = [...new Map(mapped.filter((e) => !used.has(e.fact!) && !proposals.some((p) => p.fact === e.fact)).map((e) => [e.fact!, { caption: (e.caption ?? e.data_path).slice(0, 120), fact: e.fact! }])).values()];
  const n = (o: string) => proposals.filter((p) => p.outcome === o || p.method === o).length;
  return { proposals, pdf_not_on_portal, counts: { inputs: proposals.length, mapped: n("mapped"), same_path: n("same_path"), pdf_twin: n("pdf_twin"), alias: n("alias"), leftover: n("leftover"), not_a_fact: n("not_a_fact"), ai_calls: 0 } };
}
