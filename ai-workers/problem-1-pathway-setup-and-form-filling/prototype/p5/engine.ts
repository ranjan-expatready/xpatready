// P5 case engine: pure functions over one case record and one released configuration (c1-v3). Nothing here names a
// form, box, document or question: the release drives the checklist, the remaining questions, which forms apply,
// and every form value. Document evidence becomes proposals; only staff-confirmed facts fill forms (D182, 8.1).
// Storage is a JSON file per case (demonstration-only; the product keeps facts, history and approvals in its own
// tables, implementation design §6.1).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CALCULATIONS, evaluate, type PredicateNode } from "../contracts/rules.ts";
import { buildViews } from "../p4/views.ts";
import { parseAddress, runTransform, type Box } from "./transforms.ts";

export const PROTOTYPE = join(import.meta.dirname, "..");
export const RELEASE_DIR = join(PROTOTYPE, "p3", "releases", "c1-v3");
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

// ------------------------------------------------------------------ release
export type Release = { config: any; hash: string; views: any; inv: Map<string, Map<string, Box & { caption?: string; required?: boolean }>>; field: Map<string, any>; place: Map<string, any>; section: Map<string, any> };
export function loadRelease(dir = RELEASE_DIR): Release {
  const config = JSON.parse(readFileSync(join(dir, "configuration.json"), "utf8"));
  const hash = JSON.parse(readFileSync(join(dir, "release.json"), "utf8")).configuration_sha256;
  const inv = new Map<string, Map<string, any>>();
  const idir = join(PROTOTYPE, "p1", "inventory");
  for (const f of readdirSync(idir).filter((x) => x.endsWith(".inventory.json") && !x.includes(".text."))) {
    const i = JSON.parse(readFileSync(join(idir, f), "utf8"));
    if (i.summary?.sha256) inv.set(i.summary.sha256, new Map((i.fields ?? []).filter((x: any) => x.data_path).map((x: any) => [x.data_path, x])));
  }
  return { config, hash, views: buildViews(config), inv, field: new Map(config.canonical_fields.map((f: any) => [f.id, f])), place: new Map(config.placements.map((p: any) => [p.fact, p])), section: new Map(config.sections.map((s: any) => [s.id, s])) };
}

// ------------------------------------------------------------------ case record
export type PersonRole = "principal" | "partner" | "child";
export type Person = { id: string; role: PersonRole; label: string };
export type Source = { kind: "questionnaire" | "document" | "profile" | "staff" | "lead"; by: string; doc_id?: string; file_sha256?: string; page?: number; where?: string; as_printed?: string | null; reader?: string; confidence?: string };
export type FactRecord = { id: string; fact: string; about: string; row?: number; value: unknown; status: "proposed" | "verified" | "rejected" | "superseded"; source: Source; at: string; verified_by?: string; verified_at?: string; supersedes?: string; note?: string };
export type DocRecord = {
  doc_id: string; sha256: string; file: string; original_name: string; media_type: string; uploaded_by: "client" | "agent"; uploaded_at: string; batch: number;
  claimed_type: string; for_person?: string; kind_seen?: string; about?: string | null; association?: "matched" | "ambiguous" | "wrong_person" | "not_a_person_document" | "unreadable";
  association_reason?: string; processing: "read" | "reused_cached_extraction" | "duplicate" | "unreadable" | "failed" | "wrong_type"; duplicate_of?: string;
  status: "Received" | "Accepted" | "Needs replacing" | "Not needed"; status_reason?: string; reader?: string; extraction_file?: string; issues?: string[]; letter_date?: string | null;
};
export type Item = {
  id: string; batch: number; doc_id: string; fact: string; about: string; section: string; kind: "new" | "corroborates" | "conflict" | "changed" | "unresolved" | "internal_conflict" | "relationship_check";
  value: unknown; as_printed?: string | null; where?: string; confidence?: string; current?: { record_id: string; value: unknown; status: string; source: Source } | null; reason?: string;
  decision?: { action: "confirm" | "reject" | "keep_current" | "use_value"; value?: unknown; by: string; at: string; note?: string };
};
export type Approval = { form: string; person: string; by: string; at: string; values_sha256: string; status: "approved" | "withdrawn"; withdrawn_reason?: string };
export type Case = { case_id: string; release: string; combination: string; created_at: string; people: Person[]; facts: FactRecord[]; documents: DocRecord[]; items: Item[]; approvals: Approval[]; events: { at: string; what: string; by: string }[]; batches: number };

const now = () => new Date().toISOString();
const nid = (c: Case, p: string) => `${p}-${(c.facts.length + c.items.length + c.documents.length + c.events.length + 1).toString().padStart(4, "0")}-${sha(String(Math.random())).slice(0, 4)}`;
export const norm = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").toUpperCase() : JSON.stringify(v));
const COUNTRY_ALIASES: Record<string, string> = { IND: "INDIA", INDIAN: "INDIA" };
/** Same meaning for comparison: case, spacing, ICAO country codes, a one-line address in parts. Never fuzzy. */
export function same(a: unknown, b: unknown): boolean {
  if (typeof a === "boolean" || typeof b === "boolean") return a === b;
  const x = norm(a), y = norm(b);
  if (x === y) return true;
  if ((COUNTRY_ALIASES[x] ?? x) === (COUNTRY_ALIASES[y] ?? y)) return true;
  const pa = parseAddress(a), pb = parseAddress(b);
  return !!pa && !!pb && typeof a === "string" && typeof b === "string" && /\d/.test(x) && norm(JSON.stringify(pa)) === norm(JSON.stringify(pb));
}

export function newCase(caseId: string, release: Release, people: Person[], by: string): Case {
  return { case_id: caseId, release: release.hash, combination: release.config.combination, created_at: now(), people, facts: [], documents: [], items: [], approvals: [], events: [{ at: now(), what: `case opened on release c1-v3 ${release.hash.slice(0, 8)}`, by }], batches: 0 };
}

export const sectionOf = (r: Release, fact: string) => r.section.get(r.place.get(fact)?.section_id)?.title ?? "Other";
/** The current record for a fact: the latest verified one, else the latest proposed one. */
export function current(c: Case, fact: string, about: string, row?: number): FactRecord | undefined {
  const rs = c.facts.filter((f) => f.fact === fact && f.about === about && (f.row ?? null) === (row ?? null) && (f.status === "verified" || f.status === "proposed"));
  return rs.filter((f) => f.status === "verified").at(-1) ?? rs.at(-1);
}
export const verified = (c: Case, fact: string, about: string, row?: number) => { const r = current(c, fact, about, row); return r?.status === "verified" ? r : undefined; };

export function propose(c: Case, fact: string, about: string, value: unknown, source: Source, row?: number): FactRecord {
  const rec: FactRecord = { id: nid(c, "f"), fact, about, ...(row !== undefined ? { row } : {}), value, status: "proposed", source, at: now() };
  // A newer proposal from the same kind of source replaces the older unverified one; verified history is never touched.
  for (const f of c.facts) if (f.fact === fact && f.about === about && (f.row ?? null) === (row ?? null) && f.status === "proposed" && f.source.kind === source.kind && f.source.doc_id === source.doc_id) f.status = "superseded";
  c.facts.push(rec);
  return rec;
}

/** Staff confirmation: the value becomes the verified fact, the previous verified value stays in history. Affected
 *  form approvals are withdrawn (5.3/9.3: an approval holds only for the values it saw). */
export function verify(c: Case, r: Release, fact: string, about: string, value: unknown, source: Source, by: string, row?: number, note?: string): FactRecord {
  const prev = verified(c, fact, about, row);
  if (prev && same(prev.value, value)) { prev.note = [prev.note, `corroborated by ${source.kind}${source.doc_id ? ` ${source.doc_id}` : ""}`].filter(Boolean).join("; "); return prev; }
  for (const f of c.facts) if (f.fact === fact && f.about === about && (f.row ?? null) === (row ?? null) && (f.status === "verified" || f.status === "proposed")) f.status = "superseded";
  const rec: FactRecord = { id: nid(c, "f"), fact, about, ...(row !== undefined ? { row } : {}), value, status: "verified", source, at: now(), verified_by: by, verified_at: now(), ...(prev ? { supersedes: prev.id } : {}), ...(note ? { note } : {}) };
  c.facts.push(rec);
  if (prev) withdrawApprovals(c, r, fact, about, `${fact} for ${about} changed from ${JSON.stringify(prev.value)} to ${JSON.stringify(value)}`);
  return rec;
}

// ------------------------------------------------------------------ subjects, conditions, forms
const personOf = (c: Case, role: PersonRole) => c.people.find((p) => p.role === role);
/** Every value a condition may read for one subject: its own facts, the case's, verified first, then proposed. */
export function factsFor(c: Case, r: Release, about: string): { facts: Record<string, unknown>; provisional: string[] } {
  const facts: Record<string, unknown> = {}, provisional: string[] = [];
  for (const scope of ["case", about]) for (const f of c.facts) {
    if (f.about !== scope || f.row !== undefined || !(f.status === "verified" || f.status === "proposed")) continue;
    const cur = current(c, f.fact, scope);
    if (cur && cur.id === f.id) { facts[f.fact] = f.value; if (f.status === "proposed") provisional.push(f.fact); }
  }
  return { facts, provisional: [...new Set(provisional)] };
}
const derivedOf = (r: Release) => (r.config.derived_fields ?? []).filter((d: any) => d.executable && CALCULATIONS[d.calculation]);

/** The people a 'who' or a condition's subjectKind applies to. */
export function subjectsFor(c: Case, who: string, subjectKind?: string): string[] {
  const p = personOf(c, "principal")?.id, s = personOf(c, "partner")?.id, ch = c.people.filter((x) => x.role === "child").map((x) => x.id);
  const applicants = [p, s].filter(Boolean) as string[]; // the scenario: both adults apply (D20); the child does not
  if (subjectKind === "CASE") return ["case"];
  if (subjectKind === "PRINCIPAL") return p ? [p] : [];
  if (subjectKind === "SPOUSE") return s ? [s] : [];
  if (subjectKind === "DEPENDENT") return ch;
  switch (who) {
    case "each_applicant": return applicants;
    case "principal_applicant": return p ? [p] : [];
    case "spouse_or_partner": return s ? [s] : [];
    case "couple_once": return s ? [s] : [];
    case "each_dependent_child": return ch;
    case "each_person": return c.people.map((x) => x.id);
    case "each_adult_18_plus": return applicants;
    default: return [];
  }
}

export type CondResult = { applies: true | false | "cannot_tell"; missing: string[]; provisional: string[] };
export function condition(c: Case, r: Release, tree: (PredicateNode & { subjectKind?: string }) | null, about: string): CondResult {
  if (!tree) return { applies: true, missing: [], provisional: [] };
  const { subjectKind: _k, ...node } = tree as any;
  const { facts, provisional } = factsFor(c, r, about);
  const derived = derivedOf(r).filter((d: any) => JSON.stringify(node).includes(d.id));
  const e = evaluate(node as PredicateNode, facts, derived);
  return { applies: e.result, missing: e.missing, provisional: provisional.filter((p) => JSON.stringify(node).includes(p)) };
}

export function formsFor(c: Case, r: Release): { form: string; title: string; person: string; applies: CondResult["applies"]; missing: string[]; why: string }[] {
  const out: any[] = [];
  for (const f of r.config.forms) {
    if (f.status === "dismissed") continue;
    const kind = f.condition?.subjectKind;
    for (const person of subjectsFor(c, f.who)) {
      const res = condition(c, r, f.condition, kind === "CASE" ? "case" : person);
      out.push({ form: f.form_number, title: f.title, person, applies: res.applies, missing: res.missing, why: f.condition_plain ?? "always required" });
    }
  }
  return out;
}

// ------------------------------------------------------------------ checklist (documents)
export type ChecklistRow = { requirement: string; person: string; base_or_conditional: string; applies: CondResult["applies"]; missing: string[]; why: string; source_quote: string; status: "Needed" | "Received" | "Accepted" | "Needs replacing" | "Not needed" | "Cannot tell yet"; documents: string[] };
const KIND_FOR_REQUIREMENT: Record<string, RegExp> = { passport: /^Passport or travel document/, job_offer: /^(Job offer letter|Copy of LMIA|Employment contract)/, birth_certificate: /^Birth certificate/ };
export function checklist(c: Case, r: Release): ChecklistRow[] {
  const rows: ChecklistRow[] = [];
  for (const d of r.config.document_requirements) {
    if (d.status === "dismissed") continue;
    const kind = d.condition?.subjectKind;
    if (kind === "DOCUMENT") continue; // evaluated per uploaded document (translations), not per person
    const people = kind === "CASE" ? subjectsFor(c, d.who) : subjectsFor(c, d.who, kind === "EACH_APPLICANT" ? undefined : kind);
    for (const person of people) {
      const res = condition(c, r, d.condition, kind === "CASE" ? "case" : person);
      const docKind = Object.entries(KIND_FOR_REQUIREMENT).find(([, re]) => re.test(d.document_type))?.[0];
      const docs = c.documents.filter((x) => docKind && x.kind_seen === docKind && x.about === person && x.processing !== "duplicate");
      const status: ChecklistRow["status"] = res.applies === false ? "Not needed" : docs.some((x) => x.status === "Accepted") ? "Accepted" : docs.some((x) => x.status === "Received") ? "Received" : docs.some((x) => x.status === "Needs replacing") ? "Needs replacing" : res.applies === "cannot_tell" ? "Cannot tell yet" : "Needed";
      rows.push({ requirement: d.document_type, person, base_or_conditional: d.base_or_conditional, applies: res.applies, missing: res.missing, why: d.condition_plain ?? (d.base_or_conditional === "base" ? "required for every applicant it names" : d.reason ?? ""), source_quote: d.source_quote, status, documents: docs.map((x) => x.doc_id) });
    }
  }
  return rows;
}

// ------------------------------------------------------------------ questions (generated SQR minus what is known)
const ABOUT_TO_PERSON = (c: Case, about: string, answerer: string): string | null => {
  const p = personOf(c, "principal")?.id, s = personOf(c, "partner")?.id, ch = personOf(c, "child")?.id;
  if (about.startsWith("The application")) return "case";
  if (about === "Principal applicant") return p ?? null;
  if (about === "Spouse or partner (also applying)") return s ?? null;
  if (about.startsWith("Children")) return ch ?? null;
  if (about.endsWith("parents (each parent)")) return `${answerer === "principal" ? p : s}/parents`;
  return null;
};
export type Question = { fact: string; label: string; about: string; person: string; section: string; repeats: string; status: "answered" | "proposed from a document" | "needs an answer" | "not needed"; value?: unknown; source?: string; used_by_forms: string[]; why: string; value_type: string; allowed_values: string[] };
export function questions(c: Case, r: Release, answerer: "principal" | "partner"): Question[] {
  const sqr = r.views.sqr[answerer];
  const formsNow = formsFor(c, r);
  const out: Question[] = [];
  for (const grp of sqr.people) for (const b of grp.blocks) for (const q of b.questions) for (const person0 of [ABOUT_TO_PERSON(c, grp.about, answerer)]) for (const person of person0?.endsWith("/parents") ? [person0.replace("/parents", "/parent_1"), person0.replace("/parents", "/parent_2")] : [person0]) {
    if (!person) continue;
    // Executed conditions: a question is needed only while at least one form that reads it applies (or cannot be
    // decided yet) to the person whose form it is.
    const subj = person === "case" || person.includes("/parent_") || person === personOf(c, "child")?.id ? personOf(c, answerer)!.id : person;
    const readers = q.used_by.map((u: any) => u.form.split(" (")[0]);
    const applicable = formsNow.filter((f) => readers.includes(f.form) && (f.person === subj || f.person === person) && f.applies !== false);
    const cur = current(c, q.fact, person);
    const status: Question["status"] = !applicable.length ? "not needed" : cur ? (cur.source.kind === "document" && cur.status === "proposed" ? "proposed from a document" : "answered") : "needs an answer";
    out.push({ fact: q.fact, label: q.label, about: person.includes("/parent_") ? `${grp.about.replace(" (each parent)", "")}: parent ${person.slice(-1)}` : grp.about, person, section: b.block, repeats: q.repeats, status, value: cur?.value, source: cur ? `${cur.source.kind}${cur.status === "verified" ? ", verified" : ", not yet verified"}` : undefined,
      used_by_forms: [...new Set(readers as string[])], why: applicable.length ? `read by ${[...new Set(applicable.map((f) => f.form))].join(", ")}` : `no form that reads it applies (${[...new Set(formsNow.filter((f) => readers.includes(f.form)).map((f) => `${f.form}: ${f.why}`))].join("; ")})`, value_type: r.field.get(q.fact)?.value_type ?? "text", allowed_values: q.allowed_values });
  }
  return out;
}

// ------------------------------------------------------------------ document intelligence: association and reconciliation
const NAME_FACTS = ["person.family_name", "person.given_names"];
export function identityOf(c: Case, person: string) {
  const v = (f: string) => current(c, f, person)?.value as string | undefined;
  return { family: v("person.family_name"), given: v("person.given_names"), dob: v("person.date_of_birth"), passport: v("person.passport_number") };
}
/** Which case person a document is about. A name alone never merges people: a name match with a different date of
 *  birth, or two people with the same name, is ambiguous and goes to staff. */
export function associate(c: Case, out: any, claimedFor?: string): { about: string | null; association: DocRecord["association"]; reason: string } {
  if (out.document.readable === "no") return { about: claimedFor ?? null, association: "unreadable", reason: "nothing legible to associate" };
  const val = (f: string) => out.fields.find((x: any) => x.fact === f && x.status === "proposed")?.value as string | undefined;
  const fam = val("person.family_name"), giv = val("person.given_names"), dob = val("person.date_of_birth"), full = val("person.full_name"), num = val("person.passport_number");
  const cands = c.people.filter((p) => p.role !== "child" || out.document.kind_seen === "birth_certificate").map((p) => ({ p, id: identityOf(c, p.id) }));
  const nameHit = (i: ReturnType<typeof identityOf>) => {
    if (fam && giv && i.family && i.given) return norm(fam) === norm(i.family) && norm(giv) === norm(i.given);
    if (full && i.family && i.given) { const n = norm(full).split(" ").sort().join(" "); return n === `${norm(i.given)} ${norm(i.family)}`.split(" ").sort().join(" "); }
    return false;
  };
  const hits = cands.filter((x) => nameHit(x.id));
  const exact = hits.filter((x) => (!dob || !x.id.dob || same(dob, x.id.dob)) && (!num || !x.id.passport || same(num, x.id.passport)));
  const dobClash = hits.filter((x) => dob && x.id.dob && !same(dob, x.id.dob));
  let about: string | null = null, association: DocRecord["association"] = "ambiguous", reason = "";
  if (exact.length === 1) { about = exact[0].p.id; association = "matched"; reason = `name${dob ? " and date of birth" : ""} match ${exact[0].p.label}`; }
  else if (exact.length > 1) reason = `the name matches ${exact.map((x) => x.p.label).join(" and ")}; a person decides`;
  else if (dobClash.length) reason = `the name matches ${dobClash[0].p.label} but the date of birth differs (${dob} vs ${dobClash[0].id.dob}); a person decides`;
  else if (!fam && !full) reason = "no name on the document to associate";
  else reason = "no case person has this name yet";
  if (association !== "matched" && claimedFor && !hits.length && !c.people.some((p) => identityOf(c, p.id).family)) { about = claimedFor; association = "matched"; reason = "uploaded for this person; no identity recorded yet to compare"; }
  if (association === "matched" && claimedFor && about !== claimedFor) { association = "wrong_person"; reason = `uploaded for ${c.people.find((p) => p.id === claimedFor)?.label} but the document is ${c.people.find((p) => p.id === about)?.label}'s`; }
  return { about, association, reason };
}

/** Reconciles one read document with the case: one item per proposed or unresolved field. Nothing is accepted here. */
export function reconcile(c: Case, r: Release, doc: DocRecord, out: any, batch: number): Item[] {
  const items: Item[] = [];
  if (!doc.about || doc.association !== "matched") return items;
  const add = (it: Omit<Item, "id" | "batch" | "doc_id" | "section">) => { const x = { ...it, id: nid(c, "i"), batch, doc_id: doc.doc_id, section: sectionOf(r, it.fact) } as Item; items.push(x); c.items.push(x); };
  const conflicts = new Set((out.internal_conflicts ?? []).map((k: any) => k.fact));
  for (const k of out.internal_conflicts ?? []) add({ fact: k.fact, about: doc.about, kind: "internal_conflict", value: null, reason: `the document disagrees with itself: ${k.values.join(" vs ")}`, where: k.where });
  for (const f of out.fields) {
    if (f.fact === "person.full_name") continue; // used to associate the document, not a case fact here
    if (f.fact === "mother.full_name" || f.fact === "father.full_name") {
      const parent = personOf(c, f.fact.startsWith("mother") ? "principal" : "partner");
      const pid = parent ? identityOf(c, parent.id) : null;
      const ok = !!(f.value && pid?.family && norm(f.value).split(" ").sort().join(" ") === `${norm(pid.given)} ${norm(pid.family)}`.split(" ").sort().join(" "));
      add({ fact: f.fact, about: doc.about, kind: "relationship_check", value: f.value, as_printed: f.as_printed, where: f.where, confidence: f.confidence, reason: ok ? `matches ${parent?.label} (relationship evidence)` : `does not match the case's ${f.fact.startsWith("mother") ? "principal" : "partner"} name; a person checks` });
      continue;
    }
    if (conflicts.has(f.fact)) continue;
    const about = r.place.get(f.fact)?.repeats === "once_per_case" ? "case" : doc.about;
    if (f.status !== "proposed" || f.value == null) { add({ fact: f.fact, about, kind: "unresolved", value: null, reason: f.reason ?? "not legible", where: f.where }); continue; }
    const cur = current(c, f.fact, about);
    const earlierDoc = cur?.source.doc_id ? c.documents.find((d) => d.doc_id === cur.source.doc_id) : undefined;
    const newerVersion = !!(earlierDoc && earlierDoc.kind_seen === doc.kind_seen && earlierDoc.about === doc.about && doc.letter_date && earlierDoc.letter_date && doc.letter_date > earlierDoc.letter_date);
    const kind: Item["kind"] = !cur ? "new" : same(cur.value, f.value) ? "corroborates" : newerVersion ? "changed" : "conflict";
    add({ fact: f.fact, about, kind, value: f.value, as_printed: f.as_printed, where: f.where, confidence: f.confidence,
      current: cur ? { record_id: cur.id, value: cur.value, status: cur.status, source: cur.source } : null,
      reason: kind === "changed" ? `a newer version of the same document (${doc.letter_date}) replaces ${earlierDoc!.doc_id} (${earlierDoc!.letter_date}); a person confirms` : kind === "conflict" ? `differs from the ${cur!.status} value from ${cur!.source.kind}${cur!.source.doc_id ? ` ${cur!.source.doc_id}` : ""}; a person decides (no last-upload-wins)` : undefined });
    // The evidence is recorded as a proposal on the fact only when nothing verified differs from it.
    if (kind === "new") propose(c, f.fact, about, f.value, { kind: "document", by: doc.uploaded_by, doc_id: doc.doc_id, file_sha256: doc.sha256, page: f.page, where: f.where, as_printed: f.as_printed, reader: doc.reader, confidence: f.confidence });
  }
  return items;
}

/** Staff decide review items. Clean items (new, corroborating) may be confirmed together; conflicts, changes and
 *  internal conflicts need an explicit choice. */
export function decide(c: Case, r: Release, ids: string[], action: NonNullable<Item["decision"]>["action"], by: string, value?: unknown, note?: string): { ok: boolean; done: string[]; refused: { id: string; reason: string }[] } {
  const done: string[] = [], refused: { id: string; reason: string }[] = [];
  for (const id of ids) {
    const it = c.items.find((x) => x.id === id);
    if (!it) { refused.push({ id, reason: "no such item" }); continue; }
    if (it.decision) { refused.push({ id, reason: "already decided" }); continue; }
    if (action === "confirm" && !["new", "corroborates", "changed"].includes(it.kind)) { refused.push({ id, reason: `${it.kind} needs an explicit choice, not a bulk confirm` }); continue; }
    if (action === "use_value" && value === undefined) { refused.push({ id, reason: "no value given" }); continue; }
    const doc = c.documents.find((d) => d.doc_id === it.doc_id)!;
    const src: Source = { kind: "document", by: doc.uploaded_by, doc_id: doc.doc_id, file_sha256: doc.sha256, where: it.where, as_printed: it.as_printed, reader: doc.reader, confidence: it.confidence };
    if (action === "confirm" || (action === "use_value")) {
      if (it.kind === "relationship_check") { it.decision = { action, by, at: now(), note }; done.push(id); continue; }
      const v = action === "use_value" ? value : it.value;
      verify(c, r, it.fact, it.about, v, action === "use_value" ? { kind: "staff", by, where: `chosen by staff while reviewing ${it.doc_id}${note ? `: ${note}` : ""}` } : src, by, undefined, note);
    }
    if (action === "keep_current" && it.current) { const cur = c.facts.find((f) => f.id === it.current!.record_id); if (cur && cur.status === "proposed") verify(c, r, it.fact, it.about, cur.value, cur.source, by, undefined, note); }
    it.decision = { action, by, at: now(), ...(value !== undefined ? { value } : {}), ...(note ? { note } : {}) };
    done.push(id);
  }
  c.events.push({ at: now(), what: `${by} ${action} ${done.length} item(s)${refused.length ? `, ${refused.length} refused` : ""}`, by });
  return { ok: refused.length === 0, done, refused };
}

// ------------------------------------------------------------------ forms from confirmed facts
export type BoxValue = { box: string; caption: string; fact: string; about: string; row?: number; value?: string; status: "filled" | "blank" | "hand"; reason?: string; source?: string; verified_by?: string; required?: boolean };
export function formValues(c: Case, r: Release, formNumber: string, subject: string): { form: string; edition: string; form_sha256: string; boxes: BoxValue[]; values: Record<string, string>; values_sha256: string } {
  const m = r.config.field_maps.find((x: any) => x.form_edition.startsWith(`${formNumber} (`));
  const inv = r.inv.get(m.form_sha256) ?? new Map();
  const other = c.people.find((p) => p.role === (c.people.find((x) => x.id === subject)?.role === "principal" ? "partner" : "principal"))?.id;
  const child = personOf(c, "child")?.id;
  const boxes: BoxValue[] = [];
  for (const e of m.entries) {
    const box = inv.get(e.data_path) ?? {};
    if (e.outcome === "unresolved") { boxes.push({ box: e.data_path, caption: box.caption ?? "", fact: "", about: "", status: "hand", reason: `unresolved in the release: ${e.unresolved_reason ?? ""}`.slice(0, 200), required: !!box.required }); continue; }
    if (e.outcome !== "mapped" || !e.fact) continue;
    const scope = r.place.get(e.fact)?.repeats;
    const about = e.fact.startsWith("organisation.") ? subject // D33: the prospective employer of the form's subject
      : scope === "once_per_case" ? "case"
      : e.person === "form_subject" ? subject : e.person === "subject_spouse_or_partner" ? other : e.person === "subject_child" ? child
      : e.person === "subject_parent_1" || e.person === "subject_parent_2" ? `${subject}/${e.person.slice(8)}` : e.person === "representative" ? "representative" : "case";
    if (!about) { boxes.push({ box: e.data_path, caption: box.caption ?? "", fact: e.fact, about: e.person, status: "blank", reason: "no such person on this case" }); continue; }
    const rec = verified(c, e.fact, about, e.row ?? undefined) ?? (e.row === 0 ? verified(c, e.fact, about) : undefined);
    const proposedOnly = !rec && current(c, e.fact, about, e.row ?? undefined);
    const o = runTransform(e.transform, rec?.value, box);
    const base = { box: e.data_path, caption: box.caption ?? "", fact: e.fact, about, ...(e.row !== undefined && e.row !== null ? { row: e.row } : {}), required: !!box.required };
    if (o.ok) boxes.push({ ...base, value: o.value, status: "filled", source: rec ? `${rec.source.kind}${rec.source.doc_id ? ` ${rec.source.doc_id}` : ""}` : "rule (no value recorded)", verified_by: rec?.verified_by });
    else boxes.push({ ...base, status: "hand" in o ? "hand" : "blank", reason: proposedOnly ? "a value is proposed but not yet confirmed by staff" : o.reason });
  }
  const values = Object.fromEntries(boxes.filter((b) => b.status === "filled").map((b) => [b.box, b.value!]));
  return { form: formNumber, edition: m.form_edition, form_sha256: m.form_sha256, boxes, values, values_sha256: sha(JSON.stringify(Object.entries(values).sort())) };
}

/** Form-native checks that apply to the values about to be written (the release's own check list, by box). */
export function formChecks(r: Release, formNumber: string, fv: ReturnType<typeof formValues>) {
  const out: { id: string; severity: string; box: string; message: string }[] = [];
  for (const b of fv.boxes) {
    if (b.required && b.status !== "filled") out.push({ id: "REQUIRED", severity: b.status === "hand" ? "warn" : "block", box: b.box, message: `${b.caption || b.box}: required box ${b.status === "hand" ? "to complete by hand" : "has no confirmed value"}${b.reason ? ` (${b.reason})` : ""}` });
  }
  return out;
}

export function withdrawApprovals(c: Case, r: Release, fact: string, about: string, why: string) {
  for (const a of c.approvals.filter((x) => x.status === "approved")) {
    const fv = formValues(c, r, a.form, a.person);
    if (fv.values_sha256 !== a.values_sha256) { a.status = "withdrawn"; a.withdrawn_reason = why; c.events.push({ at: now(), what: `approval of ${a.form} for ${a.person} withdrawn: ${why}`, by: "system" }); }
  }
  void fact; void about;
}
export function approve(c: Case, r: Release, form: string, person: string, by: string): Approval {
  const fv = formValues(c, r, form, person);
  const a: Approval = { form, person, by, at: now(), values_sha256: fv.values_sha256, status: "approved" };
  c.approvals.push(a);
  c.events.push({ at: now(), what: `${by} approved ${form} for ${person} (values ${fv.values_sha256.slice(0, 8)})`, by });
  return a;
}

/** Staff settle an ambiguous or wrong-person document: they name the person it is about; reconciliation then runs on
 *  the stored extraction. Staff may also mark it not about anyone on the case. */
export function assignDocument(c: Case, r: Release, docId: string, person: string | null, by: string, out: any): Item[] {
  const d = c.documents.find((x) => x.doc_id === docId);
  if (!d) throw new Error("no such document");
  const before = d.association;
  d.about = person; d.association = person ? "matched" : "not_a_person_document";
  d.association_reason = person ? `assigned by ${by} (was ${before}: ${d.association_reason})` : `${by}: not about anyone on this case`;
  c.events.push({ at: now(), what: `${by} assigned ${docId} to ${person ?? "nobody"}`, by });
  return person ? reconcile(c, r, d, out, d.batch) : [];
}

/** Facts a condition needs before it can decide (a form or a document 'cannot tell yet'): asked of whoever the
 *  release says collects them, or of staff when no placement exists. A question may exist only to drive a rule. */
export function conditionInputs(c: Case, r: Release): { fact: string; about: string; for: string[]; collected_from: string; label: string }[] {
  const need = new Map<string, { fact: string; about: string; for: Set<string> }>();
  const add = (facts: string[], about: string, what: string) => { for (const f of facts) { const about2 = f.startsWith("case.") ? "case" : about; const k = `${f}|${about2}`; const x = need.get(k) ?? { fact: f, about: about2, for: new Set<string>() }; x.for.add(what); need.set(k, x); } };
  for (const f of formsFor(c, r)) if (f.applies === "cannot_tell") add(f.missing, f.person, `${f.form} (${f.why})`);
  for (const d of checklist(c, r)) if (d.applies === "cannot_tell") add(d.missing, d.person, d.requirement);
  return [...need.values()].map((x) => ({ fact: x.fact, about: x.about, for: [...x.for], collected_from: r.place.get(x.fact)?.collected_from ?? "staff (no placement in the release)", label: r.field.get(x.fact)?.meaning ?? x.fact }));
}

export { NAME_FACTS };
