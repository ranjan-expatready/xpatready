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
import { createHash } from "node:crypto";
import type { CaptureRecord } from "./capture.ts";
import { ASKED_DIFFERENTLY, SCREEN_MAP_OUTCOMES } from "../contracts/forms.ts";
import PDF_SECTIONS from "../contracts/pdf-sections.json" with { type: "json" };

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
/** A portal screen's identity: its whole heading, in any script, with the words in brackets kept ("Personal details
 *  (Spouse or common-law partner)" is another screen than "Personal details"), never the order it was captured in (F2a,
 *  challenge B1; break B1: brackets dropped and a 40-character cut made two screens one). Only case, spacing, invisible
 *  characters and punctuation are ignored. A heading with no letter or digit is known by a checksum of its text. */
export function screenIdentity(title: string) {
  const t = (title ?? "").normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").toLowerCase();
  const slug = t.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return slug || `screen-${createHash("sha256").update(t.trim()).digest("hex").slice(0, 12)}`;
}
/** The short form of a screen's identity that qualifies an element id another screen uses ("familyName@your-spouse…"):
 *  40 characters, with a checksum of the whole identity when it is longer, so two long headings never share it. */
export const screenQualifier = (title: string) => { const id = screenIdentity(title); return id.length <= 40 ? id : `${id.slice(0, 31)}-${createHash("sha256").update(id).digest("hex").slice(0, 8)}`; };
/** The page's own element id of a stored input id ("familyName@your-spouse" → "familyName"). */
export const rawId = (id: string) => id.split("@")[0];
/** An input's place: its screen and the page's element id, whatever a capture qualified it as. */
export const inputKey = (screenTitle: string, id: string) => `${screenIdentity(screenTitle)}|${rawId(id)}`;

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

export function draftScreenMap(twin: CaptureRecord, ctx: { pdf: PdfEntry[]; pdfEdition: string | null; /** keyed by inputKey(screen title, element id) */ previous: Map<string, { fact: string | null; transform: string | null; person: string | null; edition: string }>; library: LibraryEntry[] }): { proposals: Proposal[]; pdf_not_on_portal: { caption: string; fact: string }[]; counts: Record<string, number> } {
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
    // 1. same path: the same element id on the same screen (B1: never the same id on another screen, whose person may
    // differ, such as the applicant's and the spouse's familyName).
    const prev = ctx.previous.get(inputKey(s.title, i.id));
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

// ───────────────────────────────────────────── F3a-0 (plan D1): PDF section groups and online screen coverage
/** The PDF section group of a form field: its subform path without the page ("Page2.MaritalStatus.SectionA" →
 *  "MaritalStatus", "page1.SectionB.Child" → "SectionB"); a path with no page is its own first part. */
export function sectionGroupOf(path: string | null | undefined): string | null {
  const parts = (path ?? "").split(".").map((p) => p.replace(/\[\d+\]$/, "").trim()).filter(Boolean);
  if (parts.length > 1 && /^page\d+$/i.test(parts[0])) parts.shift();
  return parts[0] ?? null;
}
/** The plain label of a section group (Sample, contracts/pdf-sections.json; the immigration expert confirms), never the
 *  path itself (BR-16). */
export function sectionLabel(form: string, group: string | null): string {
  const labels = (PDF_SECTIONS as unknown as Record<string, Record<string, string>>)[form] ?? {};
  return (group && labels[group]) || `Other questions of ${form}`;
}
/** A row of an online version's screen map that is a page input (D1: every reader goes through this; a section-level
 *  decision such as "asked differently online" is never an input). */
export const isScreenInput = (row: { outcome: string; dataPath: string }) =>
  (SCREEN_MAP_OUTCOMES as readonly string[]).includes(row.outcome) && !row.dataPath.startsWith(ASKED_DIFFERENTLY.prefix);

export type CoverageEntry = { data_path: string; heading: string | null; fact: string | null; person: string | null; outcome: string };
/** A PDF section with form fields no captured question matches yet: `questions` of its `total` mapped form fields. */
export type SectionNotSeen = { group: string; label: string; sharedFields: string[]; questions: number; total: number };
/** An entry's group: from its section, else from its own form path (a repeated row such as "Row2" has no section of
 *  its own in the inventory: "form1[0].Page1[0].PersonalDetails[0].PreviousCOR[0].Row2[0]…" → "PersonalDetails"). */
export const groupOfEntry = (e: { data_path: string; heading: string | null }) =>
  sectionGroupOf(e.heading) ?? sectionGroupOf(e.data_path.split(".").slice(1).join(".")) ?? "";
const personKey = (fact: string, person: string | null) => `${fact}|${person ?? "form_subject"}`;
/** BR-12: the PDF sections whose mapped form fields no captured screen asks yet, in PDF order. A form field is seen when
 *  a captured screen input maps to the same shared field for the same person (D1, B2: the applicant's family name never
 *  covers the spouse's); form fields decided "not a fact" or "filled by hand" are not counted (only mapped ones are),
 *  and a group a person marked "asked differently online" is cleared. No AI, nothing stored. */
export function screenCoverage(form: string, pdf: CoverageEntry[], seen: { fact: string | null; person: string | null }[], askedDifferently: string[] = []): SectionNotSeen[] {
  const have = new Set(seen.filter((s) => s.fact).map((s) => personKey(s.fact!, s.person)));
  const cleared = new Set(askedDifferently);
  const out = new Map<string, { group: string; facts: Set<string>; paths: Set<string>; all: Set<string> }>();
  for (const e of pdf) {
    if (e.outcome !== "mapped" || !e.fact) continue;
    const group = groupOfEntry(e);
    if (cleared.has(group)) continue;
    const g = out.get(group) ?? { group, facts: new Set<string>(), paths: new Set<string>(), all: new Set<string>() };
    g.all.add(e.data_path); out.set(group, g);
    if (!have.has(personKey(e.fact, e.person))) { g.facts.add(e.fact); g.paths.add(e.data_path); }
  }
  // Review Major 1: a section partly asked says how much ("29 of 37"); a section fully asked is not listed.
  return [...out.values()].filter((g) => g.paths.size).map((g) => ({ group: g.group, label: sectionLabel(form, g.group || null), sharedFields: [...g.facts], questions: g.paths.size, total: g.all.size }));
}

// ───────────────────────────────────────────── F1 slice 2: the AI's screen map for leftovers (guarded screen_map job)
export type ScreenMapAnswer = { canonical_fields: { id: string; meaning: string; value_type: string }[]; entries: { input: string; outcome: string; person: string; fact: string | null; transform: string | null; confidence: string; unresolved_reason: string | null; evidence_quote: string }[] };
export type Leftover = { input: string; type: string; part: string | null; label: string };
export type AiProposal = { input: string; label: string; outcome: "mapped" | "not_a_fact" | "unresolved"; fact: string | null; person: string | null; transform: string | null; ai_confidence: string; why: string };
const PERSON_KEYS = ["form_subject", "subject_spouse_or_partner", "subject_parent_1", "subject_parent_2", "subject_child", "subject_sibling", "representative", "none"];

/** What a person may accept from a guarded screen_map answer, one input at a time. Only the inputs that were left open
 *  are considered (anything else in the answer is ignored and listed); a fact must already be in the library under a
 *  valid name and suit the input's type (a new field is created by a person first); our own transform is used, never
 *  the AI's text. Rules, no AI. */
export function screenMapProposals(answer: ScreenMapAnswer, leftovers: Leftover[], library: LibraryEntry[], keyProblem: (k: string) => string | null): { proposals: AiProposal[]; ignored: string[]; not_answered: string[] } {
  const lib = new Map(library.map((l) => [l.key, l]));
  const resolve = (k: string) => { let key = k, n = 0; while (lib.get(key)?.mergedIntoKey && n++ < 5) key = lib.get(key)!.mergedIntoKey!; return key; };
  const open = new Map(leftovers.map((l) => [l.input, l]));
  const proposals: AiProposal[] = [], ignored: string[] = [], seen = new Set<string>();
  for (const e of answer.entries ?? []) {
    const l = open.get(e.input);
    if (!l || seen.has(e.input)) { ignored.push(e.input); continue; }
    seen.add(e.input);
    const base = { input: l.input, label: l.label, ai_confidence: e.confidence, fact: null, person: null, transform: null };
    if (e.outcome === "not_a_fact") { proposals.push({ ...base, outcome: "not_a_fact", why: `AI: not a fact (${(e.unresolved_reason ?? "no reason given").slice(0, 300)})` }); continue; }
    if (e.outcome !== "mapped" || !e.fact) { proposals.push({ ...base, outcome: "unresolved", why: `AI left it open: ${(e.unresolved_reason ?? "no reason given").slice(0, 300)}` }); continue; }
    const problem = keyProblem(e.fact);
    const key = problem ? null : resolve(e.fact);
    const field = key ? lib.get(key) : undefined;
    const person = PERSON_KEYS.includes(e.person) ? e.person : null;
    const stay = (why: string) => proposals.push({ ...base, outcome: "unresolved", why });
    if (problem) stay(`AI proposed a field named ${problem}: a person names the field`);
    else if (!field) stay(`AI proposed ${e.fact}, which is not in the library: a person creates it (or picks another) first`);
    else if (!compatible(l.type, l.part, field.valueType)) stay(`AI proposed ${key}, which holds a ${field.valueType}; this input is a ${l.part ? `date part (${l.part})` : l.type}`);
    else if (!person) stay(`AI gave no valid person ("${e.person}")`);
    else proposals.push({ ...base, outcome: "mapped", fact: key!, person, transform: transformFor(l.type, l.part, field), why: `AI proposed ${key}${key !== e.fact ? ` (${e.fact} was merged into ${key})` : ""} for ${person} (${e.confidence}; "${e.evidence_quote.slice(0, 120)}")` });
  }
  return { proposals, ignored, not_answered: leftovers.filter((l) => !seen.has(l.input)).map((l) => l.input) };
}

/** A screen-map run that did not give a usable answer, in plain words (never blank). */
function explainScreenRun(rec: { drafting_run?: { status?: string; usage?: { cost_usd?: number } }; output_errors?: unknown; contract_valid?: boolean }) {
  const cost = `US$${Number(rec.drafting_run?.usage?.cost_usd ?? 0).toFixed(2)}`;
  const s = rec.drafting_run?.status;
  if (s === "invalid_output") return `The AI answered, but not in the agreed shape (${String(typeof rec.output_errors === "string" ? rec.output_errors : JSON.stringify(rec.output_errors)).slice(0, 160)}). Nothing was proposed. Cost ${cost}.`;
  if (s === "refused") return `The AI declined to draft these inputs. Nothing was proposed. Cost ${cost}.`;
  return `The AI step ended without a usable draft (status ${s ?? "unknown"}${rec.contract_valid === false ? ", the run record failed our check" : ""}). Nothing was proposed. Cost ${cost}.`;
}

/** What a finished guarded screen_map run means (the live branch of the job, review 6: it is tested at US$0 with
 *  hand-written records): a usable answer becomes proposals by screenMapProposals, anything else a plain message. */
export function readScreenRun(rec: { drafting_run?: { run_id?: string; status?: string; usage?: { cost_usd?: number } }; contract_valid?: boolean; output_errors?: unknown; raw_output?: string | null }, leftovers: Leftover[], library: LibraryEntry[], keyProblem: (k: string) => string | null) {
  const cost = rec.drafting_run?.usage?.cost_usd ?? 0;
  if (!/^completed/.test(rec.drafting_run?.status ?? "") || rec.contract_valid !== true || !rec.raw_output) return { ok: false as const, cost, message: explainScreenRun(rec) };
  let answer: ScreenMapAnswer;
  try { answer = JSON.parse(rec.raw_output) as ScreenMapAnswer; } catch { return { ok: false as const, cost, message: explainScreenRun({ ...rec, drafting_run: { ...rec.drafting_run, status: "invalid_output" }, output_errors: "not JSON" }) }; }
  const out = screenMapProposals(answer, leftovers, library, keyProblem);
  const mapped = out.proposals.filter((p) => p.outcome !== "unresolved").length;
  return { ok: true as const, cost, ...out, message: `AI draft ${rec.drafting_run?.run_id}: ${mapped} of ${leftovers.length} open inputs have a proposal a person can accept (${out.proposals.length - mapped} stay open${out.ignored.length ? `; ${out.ignored.length} answers for inputs that were not asked were ignored` : ""}). Cost US$${Number(cost).toFixed(2)}.` };
}
