// Screen 01 rules for one combination row, pure (no I/O): what is missing before firms can open cases on it (the
// startable check, SA-1B-90/91, BR-8), its single status (In setup · Not ready · Ready), the counts the row shows
// (BR-10: every question any person on the row could be asked), when its sources were last checked (BR-11) and its one
// next action (BR-13). The API calls these with snapshots it built; tests call them directly.
import { sharedStep, type MissingItem, type NextAction, type Status } from "../contracts/programs.ts";
import type { Problem } from "./validate.ts";
import type { Snapshot } from "./snapshot.ts";
import { isFilingFact } from "./resolver.ts";
import { STATUS_WORDS } from "../contracts/status-words.ts";
import { waitsForMap } from "./setup-checklist.ts";

type Participant = { role: string; label: string; min: number; max: number; applies?: boolean };
/** The parts of a snapshot these rules read (the snapshot's own lists are untyped until the team's contract lands). */
type Placement = { section_id: string; fact: string; repeats: string; rule_only?: boolean | null };
type FormLine = { form_number: string; form_kind?: string | null; channel?: string };
type FieldMap = { form_number: string; entries: unknown[] };
type DocumentLine = { base_or_conditional: string };
const applicants = (ps: Participant[]) => ps.filter((p) => p.role !== "representative" && p.applies !== false && p.max > 0);
const isCaseLevel = (p: { repeats: string; fact: string }) => isFilingFact(p.fact, p); // SH3 R5
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Questions a person is asked: placements in the questionnaire's sections that are asked of each person. */
function personQuestions(s: Snapshot) {
  const selected = new Set((s.sections as { id: string }[]).map((x) => x.id));
  return (s.placements as Placement[]).filter((p) => selected.has(p.section_id) && !p.rule_only && !isCaseLevel(p));
}

/** Where the row's setup stands (draft): forms attached as sources and not set up yet, and what moves them on. */
export type SetupState = { exists: boolean; forms: number; sources: number; draftable: number; fromLibrary: string[]; running: string | null; proposals: { job: string; n?: number }[] };

/** The setup steps of BR-13, in order, with their words (P-44). nextActionOf and the missing list both use this, so the
 *  page's missing list, the page header and the Programs row always name the same step (Lead check item 1). */
export function setupActionOf(r: SetupState): NextAction | null {
  if (!r.exists) return { kind: "start", label: "Start setup" };
  if (r.running) return { kind: "view_progress", label: "View AI progress", batchId: r.running };
  const items = r.proposals.reduce((s, p) => s + (p.n ?? 1), 0);
  if (items) return { kind: "review_proposals", label: `Review ${plural(items, "AI proposal")}`, jobId: r.proposals.find((p) => (p.n ?? 1) > 0)!.job };
  if (r.fromLibrary.length) return { kind: "add_from_library", label: `Add ${plural(r.fromLibrary.length, "form")} from the library`, forms: r.fromLibrary };
  if (r.draftable) return { kind: "draft_ai", label: "Draft setup" };
  // S3 early look (2): nothing attached → the one step is the finder offer on "Sources and forms" (one call to action).
  if (!r.forms) return { kind: "add_forms", label: "Find forms" };
  return null;
}

/** The startable check on a configuration (BR-8): every form has a current edition with its form fields mapped, every
 *  person role that files has questions, and every rule resolves (no error from the validator). An empty list =
 *  startable. Each line is one cause with the step that moves it (founder finding F2). While a setup step is waiting
 *  (sources to add, forms to add from the library or draft, AI work to see or review), that step moves every setup
 *  line, so each of them names it in the same words as the next step; the lines come in the order of those steps.
 *  A step is said once (Lead note 23 Oct): when every line has the same step, the lines carry only their causes and
 *  the screen names the step once under the list (sharedStep); a line whose step is its own still says it. */
export function missingItems(s: Snapshot, participants: Participant[], problems: Problem[], setup?: SetupState): MissingItem[] {
  const out: (MissingItem & { cause: string })[] = [];
  const pending = setup ? setupActionOf(setup) : null;
  const line = (code: MissingItem["code"], cause: string, own: string, why = "") => {
    const step = pending?.label ?? own;
    return { code, step, cause, text: `${cause} Next step: ${step}${pending ? "" : why}.` };
  };
  const forms = s.forms as FormLine[];
  if (!forms.length) {
    const n = setup?.sources ?? 0;
    out.push(n ? line("no_forms", `${plural(n, "form")} attached as sources, 0 set up.`, "Add sources")
      : line("no_forms", "No forms yet.", "Find forms", " (find the forms this application files)"));
  }
  // W1-02 (P-102): every form is read from its PDF, so a line filed Online needs its PDF form fields mapped too.
  const unmapped = formsWithoutFieldMap(s).map((f) => f.form_number); // QA-180: the rule release reads too
  if (unmapped.length) out.push(line("form_without_edition", `No form fields mapped yet for ${unmapped.join(", ")}.`, "Draft setup", " (AI maps the form fields from the form)"));
  // Founder finding F2: one cause, one line, with what to do next (not one line per person role).
  const roles = personQuestions(s).length ? [] : applicants(participants).map((p) => p.label);
  // With its forms set up, questions come from the library's placements for the fields the forms read; AI drafting maps
  // boxes and never writes questions (api/src/ai.ts), so the step is a person's: add them on the Configuration tab.
  if (roles.length) out.push(line("role_without_questions", `No questions yet for ${roles.join(", ")}.`, "Add questions", " (Configuration › Questions and sections)"));
  // How a form is filed: its own line.
  const isFiling = (p: Problem) => p.where === "Forms";
  // V3 B1: a form with no field map is the form_without_edition line above, never a second "cannot be filed" line.
  const filing = problems.filter((p) => p.level === "error" && isFiling(p) && !waitsForMap(p));
  if (filing.length) { const cause = `${plural(filing.length, "form")} cannot be filed as set (first: ${filing[0].message})`; out.push({ code: "filing_problem", step: "Change how it is filed", cause, text: `${cause} Next step: change how ${filing.length === 1 ? "it is" : "they are"} filed (Overview › Forms), or add what it needs.` }); }
  // C11.12 BR-7: a role that may be an applicant with no filing mode, named with its step.
  const people = problems.filter((p) => p.level === "error" && p.where === "People");
  // Through line() (merge of #500, Lead check item 1): while a setup step waits, it is this line's next step too, so the
  // row, the header and every missing line name one step.
  if (people.length) out.push(line("filing_not_set", `${people.map((p) => p.item).join(", ")}: not set.`, "Set the filing", " (Forms › Who can be in this application)"));
  const errors = problems.filter((p) => p.level === "error" && !isFiling(p) && p.where !== "People");
  if (errors.length) { const cause = `${errors.length} rule${errors.length === 1 ? " does" : "s do"} not resolve (first: ${errors[0].item}: ${errors[0].message}).`; out.push({ code: "rule_problem", step: "Fix on the Configuration tab", cause, text: `${cause} Next step: fix ${errors.length === 1 ? "it" : "them"} on the Configuration tab.` }); }
  const shared = sharedStep(out);
  return out.map(({ cause, ...m }) => (shared ? { ...m, text: cause } : m));
}

/** One status per row (challenge O2 as trimmed by P-26): never released → In setup; released and passing the startable
 *  check → Ready; released but failing it → Not ready. */
export function statusOf(released: boolean, missing: MissingItem[]): Status {
  if (!released) return "IN_SETUP";
  return missing.length ? "NOT_READY" : "READY";
}
/** Words on screen (P-49): a released, startable combination is shown as "Live" (firms can open cases on it). */
/** UX-A part 3: the one word set (contracts/status-words.ts). */
export const STATUS_TEXT: Record<Status, string> = STATUS_WORDS;

/** BR-10 counts. Questions: every question any person on the row could be asked, once per person role that files
 *  (Principal applicant, Spouse or partner, …), plus questions asked once for the whole application, conditional ones
 *  included. Documents: document requirement lines, split into always and only-if. */
export function rowCounts(s: Snapshot, participants: Participant[]) {
  const selected = new Set((s.sections as { id: string }[]).map((x) => x.id));
  const asked = (s.placements as Placement[]).filter((p) => selected.has(p.section_id) && !p.rule_only);
  const perPerson = asked.filter((p) => !isCaseLevel(p)).length, once = asked.length - perPerson;
  const roles = Math.max(1, applicants(participants).length);
  const docs = s.document_requirements as DocumentLine[];
  const iff = docs.filter((d) => d.base_or_conditional === "conditional").length;
  return { documents: docs.length, documentsAlways: docs.length - iff, documentsIf: iff, questions: perPerson * roles + once, sections: s.sections.length, rules: s.rules.length };
}

/** BR-11: the row is as fresh as its oldest source (the weakest link); next review 12 months later; overdue in orange. */
export function checkedOf(sourceDates: Date[], now: Date) {
  sourceDates = sourceDates.filter((d) => !Number.isNaN(d.getTime())); // a hand-written manifest date may not parse
  if (!sourceDates.length) return null;
  const at = new Date(Math.min(...sourceDates.map((d) => d.getTime())));
  const next = new Date(at); next.setUTCFullYear(next.getUTCFullYear() + 1);
  return { at: at.toISOString(), nextReview: next.toISOString(), overdue: next.getTime() < now.getTime() };
}

/** BR-13: exactly one next action per row, named by the next step in the journey board's words (P-44). The AI ones are
 *  the row's one AI place. A Ready row with nothing to do has no action; the screen offers "Open". */
export function nextActionOf(r: SetupState & { status: Status; changes: number; missing: MissingItem[]; held?: number }): NextAction | null {
  const setup = setupActionOf(r);
  if (setup) return setup;
  if (r.status === "NOT_READY" || (r.status === "IN_SETUP" && r.missing.length)) return { kind: "see_missing", label: `See ${r.missing.length} missing` };
  // A new edition of one of its forms is held for impact review (P-32): it is never used silently, so it is the next step.
  if (r.held) return { kind: "see_new_edition", label: r.held === 1 ? "See new edition" : `See ${r.held} new editions` };
  if (r.changes) return { kind: "release", label: "Review and release" };
  return null;
}

/** Edition order (review #5, P-32): an IRCC edition is the month and year printed on the form, "IMM 5476 (11-2025)",
 *  so "12-2021" is older than "11-2025" (text order says the opposite). The printed date is the edition's identity and
 *  is always present (a file without one is held by the intake); the PDF's "date modified" only breaks a tie, since any
 *  re-save changes it. A label with no readable date sorts oldest. */
export function editionMonth(label: string | null | undefined): number {
  const m = /\b(\d{1,2})-(\d{4})\b/.exec(label ?? "");
  return m && Number(m[1]) >= 1 && Number(m[1]) <= 12 ? Number(m[2]) * 12 + Number(m[1]) - 1 : -1;
}
export function compareEditions(a: { editionLabel: string; published?: string | null }, b: { editionLabel: string; published?: string | null }) {
  return editionMonth(a.editionLabel) - editionMonth(b.editionLabel) || String(a.published ?? "").localeCompare(String(b.published ?? "")) || a.editionLabel.localeCompare(b.editionLabel);
}
/** The newest edition of a list (by compareEditions), or undefined. */
export const newestEdition = <T extends { editionLabel: string; published?: string | null }>(list: T[]): T | undefined => [...list].sort((a, b) => compareEditions(b, a))[0];

/** P-32 (the newest printed edition is the one in use): a form's PDF field map in use in a snapshot. A snapshot carries
 *  every mapped PDF edition of a form (engine/snapshot.ts, oldest first; an answer key may test an older one), so a
 *  reader that takes "the first" fills, counts or trials the oldest. The one rule for the fill (api/src/fill.ts
 *  writeForm), the case's copies and trials (api/src/fill-case.ts), the case's coverage (engine/render.ts) and the Forms
 *  tab (api/src/workspace.ts): the newest by its printed month and year (editionMonth); with the same printed date, the
 *  later in the snapshot's order (it sorts by compareEditions, which breaks that tie by the file's date). Online maps are
 *  never a PDF edition. Undefined when the form has no PDF map. */
export function pdfMapInUse<M extends { form_number: string; form_edition?: string | null; channel?: string | null }>(maps: readonly M[], form: string): M | undefined {
  let best: M | undefined;
  for (const m of maps) if (m.form_number === form && m.channel !== "ONLINE" && (!best || editionMonth(m.form_edition) >= editionMonth(best.form_edition))) best = m;
  return best;
}

/** QA-180 (BR-8, P-297 (3)): the one rule Review and release (engine/validate.ts) and Open a case (missingItems, through
 *  api/src/programs.ts startableMissing) both read. A data form can be filled on a case only when its edition in use
 *  (pdfMapInUse, P-32: the newest PDF edition, the one a case fills) has form fields mapped; an Online line is read from
 *  its PDF too (P-102), so an online map never counts. Each form without one, with the edition in use when there is one
 *  (its map is empty; real snapshots drop empty maps, engine/snapshot.ts, so this guards hand-built or imported data), in
 *  the snapshot's filing order. */
export function formsWithoutFieldMap(s: Pick<Snapshot, "forms" | "field_maps">): { form_number: string; title?: string; edition: string | null; olderMapped: boolean }[] {
  const maps = s.field_maps as (FieldMap & { form_edition?: string | null; channel?: string | null })[];
  return (s.forms as (FormLine & { title?: string })[]).filter((f) => (f.form_kind ?? "data_form") === "data_form")
    .map((f) => ({ f, inUse: pdfMapInUse(maps, f.form_number) })).filter(({ inUse }) => !inUse?.entries.length)
    .map(({ f, inUse }) => ({ form_number: f.form_number, title: f.title, edition: inUse?.form_edition ?? null,
      olderMapped: !!inUse && maps.some((m) => m !== inUse && m.form_number === f.form_number && m.channel !== "ONLINE" && m.entries.length) }));
}

/** "Needs work" (P-49, the default view): every combination firms cannot use yet (In setup, Not ready) and every one
 *  with a next step (AI proposals waiting, forms to add or draft, draft changes not yet released, a new form edition
 *  held for impact review). "Live" (founder finding F1) is every combination whose status is Live, i.e. firms can open
 *  cases on it, whether or not it has a next step: a Live row with work is in both, so the Live count always equals
 *  the rows showing Live. */
export function needsWork(r: { status: Status; nextAction: NextAction | null }) {
  return r.status !== "READY" || r.nextAction !== null;
}
export const isLive = (r: { status: Status }) => r.status === "READY";
/** "Need you" (S2 fix 6, founder 27 Oct): a combination waiting on a person: something to review (AI proposals, a new
 *  edition, a release), something missing, or Not ready. Not started and Live with nothing waiting do not count; the
 *  counts line already shows those. */
const WAITING: NextAction["kind"][] = ["review_proposals", "see_missing", "see_new_edition", "release"];
export function waitsForPerson(r: { status: Status; nextAction: NextAction | null; aiProposals: number; held: number }) {
  return r.status === "NOT_READY" || r.aiProposals > 0 || r.held > 0 || (!!r.nextAction && WAITING.includes(r.nextAction.kind));
}

/** Status column sort (P-49): most urgent first — Not ready (released but firms cannot use it), In setup, Live; the
 *  path order breaks ties. Descending reverses the status order only. */
const RANK: Record<Status, number> = { NOT_READY: 0, IN_SETUP: 1, READY: 2 };
export function compareStatus(a: { status: Status }, b: { status: Status }) { return RANK[a.status] - RANK[b.status]; }

/** The flat list's order (P-35): Program A–Z → Category A–Z → Sub-category A–Z, except that route steps ("Step 1 of 2")
 *  keep their step order among their siblings, ahead of any sibling without a step. */
const stepOf = (link: string | null) => { const m = /^Step (\d+) of/i.exec(link ?? ""); return m ? Number(m[1]) : null; };
export function comparePaths(a: { path: string[]; linkLabel: string | null }, b: { path: string[]; linkLabel: string | null }) {
  const n = Math.max(a.path.length, b.path.length);
  for (let i = 0; i < n; i++) {
    const x = a.path[i], y = b.path[i];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const lastA = i === a.path.length - 1, lastB = i === b.path.length - 1;
    if (lastA && lastB && a.path.slice(0, i).join("\u0000") === b.path.slice(0, i).join("\u0000")) {
      const sa = stepOf(a.linkLabel), sb = stepOf(b.linkLabel);
      if (sa !== null || sb !== null) return sa === null ? 1 : sb === null ? -1 : sa - sb;
    }
    return x.localeCompare(y, "en-CA", { sensitivity: "base" });
  }
  return 0;
}
