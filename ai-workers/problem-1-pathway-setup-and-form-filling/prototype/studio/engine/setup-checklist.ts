// W1 setup checklist (P-157, P-161, P-176, P-180; concept v4 §4–§8), pure (no I/O): one checklist per combination,
// worked out from data on every read, never stored. setupChecklistOf is the same for every viewer (the API caches it per
// combination); forViewer adds who must act (the duty and tier table of §5), which the server's 403s read too.
import { itemHref, STEP_KEYS, STEP_LABEL, STEP_TAB, type ChipStatus, type Counts, type ItemKind, type OpenItem, type SetupChecklist, type Step, type StepKey, type Tier, type ViewerOverlay } from "../contracts/setup-checklist.ts";
import { PROPOSAL_KINDS, type ProposalKind } from "../contracts/proposal-item.ts";
import { formsWords, questionsWords } from "../contracts/counts.ts";
import { nextReleaseWords } from "../contracts/status-words.ts";

/** Validator `where` → the step whose open item it is (concept §6). Every `where` literal in engine/ has a row; any other
 *  value falls back to step 5 (a check fails when a new literal has no row). */
export const WHERE_STEP: Record<string, { step: StepKey; part?: "documents" | "questions" }> = {
  Forms: { step: "forms" },
  Documents: { step: "questions_documents", part: "documents" },
  Questions: { step: "questions_documents", part: "questions" },
  Questionnaires: { step: "questions_documents", part: "questions" },
  Rules: { step: "questions_documents", part: "questions" },
  Checks: { step: "questions_documents", part: "questions" },
  "Derived fields": { step: "questions_documents", part: "questions" },
  Library: { step: "questions_documents", part: "questions" },
  // C6.9 part 1: a gate's problems are about facts the questionnaire asks (BR-5).
  Eligibility: { step: "questions_documents", part: "questions" },
  // C11.12: "Filing for <role>" is about Who can be in this application (the people step).
  People: { step: "people" },
  // G2 (C5.5): answer-key tests gate the release; their lines open Tests from step 5.
  Tests: { step: "release" },
};
export const stepOfWhere = (where: string) => WHERE_STEP[where] ?? { step: "release" as StepKey };

/** Proposal kind → step (concept §6; contract v2.1 PROPOSAL_KINDS, all eleven). */
export const KIND_STEP: Record<ProposalKind, { step: StepKey; part?: "documents" | "questions" }> = {
  person_role: { step: "people" },
  form_check: { step: "forms" }, field: { step: "forms" }, answer_list: { step: "forms" },
  document_type: { step: "questions_documents", part: "documents" }, requirement_line: { step: "questions_documents", part: "documents" },
  section: { step: "questions_documents", part: "questions" }, condition: { step: "questions_documents", part: "questions" }, comes_from: { step: "questions_documents", part: "questions" },
  cross_check: { step: "questions_documents", part: "questions" }, pqr_pick: { step: "questions_documents", part: "questions" },
};

/** Who acts on each open item (§5). A "sure" confirmation is the author's (the expert may too); "not sure" is the
 *  expert's alone. Review and sign is the expert's, never the submitter's; Release is the approver's, never an author of
 *  the changes or the submitter. Nobody acts on View AI progress (anyone opens it). */
export function actsOn(kind: ItemKind, tier?: Tier): { duties: ("author" | "sme" | "approve" | "review")[]; filledFor: "author" | "sme" | "approve" | "review" | null } {
  // Lead 5 on #616 Question 0 (2 Nov): AI and people proposals are decided by a holder of the review duty (To review, the
  // P-121 review screen), so Programs' Needs you and To review's agree for every person (C11.10, qa 2 Nov).
  if (kind === "review_proposals" || kind === "review_people") return { duties: ["review"], filledFor: "review" };
  if (kind === "confirm_pages" || kind === "choose_pages" || kind === "confirm_people") return tier === "author" ? { duties: ["author", "sme"], filledFor: "author" } : { duties: ["sme"], filledFor: "sme" };
  if (kind === "sign") return { duties: ["sme"], filledFor: "sme" };
  if (kind === "release") return { duties: ["approve"], filledFor: "approve" };
  if (kind === "view_ai") return { duties: [], filledFor: null };
  return { duties: ["author"], filledFor: "author" };
}
/** May this person act on this item (the duty and the second-person rule)? The API answers 403 when not. */
export function mayAct(item: Pick<OpenItem, "kind" | "tier" | "notBy">, actor: { id: string; duties: readonly string[] }) {
  return actsOn(item.kind, item.tier).duties.some((d) => actor.duties.includes(d)) && !(item.notBy ?? []).includes(actor.id);
}
/** Items that wait for a person's review or confirmation: they make "Needs you" (founder 30 Oct: "a review or a
 *  confirmation"); building items (find, add, map, draft, a draft's own problems) do not; a release's problems do
 *  (Not ready: firms cannot open cases). */
// confirm_people stays out of Needs you until a screen offers the confirmation (participantsConfirmedAs, P-176 Q1 open):
// a mark nobody can clear is noise. It still counts as open on the step and in the Next line. N8 (F2 review M1, break M3):
// the same for confirm_pages and choose_pages: the record and its endpoint exist, the "Before forms" block that offers
// them comes with slice C; until then they are not "Needs you".
// UX-A part 2 (P-273, UX baseline finding 2, 2 Nov): a draft's release-blocking problems are Needs you too (the founder's
// "Needs you includes release blockers"), not only a released version's; amends the 30 Oct "never a draft's own problem".
// Building steps (find, add, map, draft) and confirmations no screen offers yet stay out (N8).
const REVIEWS: ItemKind[] = ["review_people", "review_proposals", "review_edition", "sign", "release", "fix_problems", "unasked"];
/** The items that make a combination "Needs you" for this person: the one definition the Programs chip, the card mark,
 *  Structure and To review all read (UX-A part 2, review M2). */
export function needsYouItems(c: SetupChecklist, actor: { id: string; duties: readonly string[] }): (OpenItem & { step: StepKey; tab?: string })[] {
  if (c.chip.status === "RETIRED") return [];
  return c.steps.flatMap((s) => s.open.map((i) => ({ ...i, step: s.key, tab: s.tab }))).filter((i) => REVIEWS.includes(i.kind) && mayAct(i, actor));
}

/** The official-pages record (forms lane, queue item 2). Until it lands every combination reads "no_record". */
export type OfficialPages = { state: "no_record" } | { state: "proposed"; matches: number } | { state: "confirmed"; by: string | null; as: Tier };
export type ProblemIn = { level: "error" | "warning"; where: string; item: string; message: string; code?: string };
/** V3 B1 (P-297 (3)): a form with no field map blocks release (engine/validate.ts), but it is already one step of its own
 *  ("Map N forms", the missing line "No form fields mapped yet"), so the lists that count problems leave it out: one
 *  cause, one line, one count. */
export const NO_FIELD_MAP = "no_field_map";
export const waitsForMap = (p: object) => (p as { code?: string }).code === NO_FIELD_MAP;

/** Everything the checklist reads for one combination, already loaded by the API (rows()) or a check. */
export type SetupInput = {
  combinationId: string | null;
  retired: boolean;
  /** The latest release and the errors its own snapshot raises now (Not ready when any). */
  release: { number: number; problems: ProblemIn[] } | null;
  pages: OfficialPages;
  /** Roles with max > 0, those of them that apply, whether a list was saved (participantsBy), its tier and who confirmed. */
  people: { roles: number; applicants: number; saved: boolean; confirmed?: { by: string | null; as: Tier } | null; tier: Tier; reason?: string };
  /** Forms: draft lines; library forms found for its sources (added without AI); attached sources AI can draft; data
   *  forms with no fields mapped; attached sources not yet set up. */
  forms: { lines: number; fromLibrary: number; draftable: number; unmapped: number; sources: number; onCombination?: number };
  /** Waiting proposals about this combination, by kind. */
  proposals: Partial<Record<ProposalKind, number>>;
  /** Draft errors (structure and validator). */
  problems: ProblemIn[];
  documents: { lines: number; rolesWithout: number };
  questions: number;
  held: number;
  /** UX-A part 3 (break B1): the catalogue's startable check failed on the released version (statusOf: Not ready), so the
   *  chip is Not ready even when the release raises no validator error: one state on the header, strip and card. */
  notStartable?: boolean;
  /** Devin review on #622: the startable check's causes (engine/programs.ts missingItems, on the released version), so a
   *  Not ready combination whose release raises no validator error still has an item to act on, on the step that fixes it. */
  notStartableWhy?: { code: string; text: string }[];
  running: { batchId: string; step: StepKey } | null;
  changes: number;
  review: { stage: "submit" | "sign" | "release"; submittedBy: string | null; authors: string[] };
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const item = (kind: ItemKind, count: number, text: string, focus: string, extra: Partial<OpenItem> = {}): OpenItem => {
  const a = actsOn(kind, extra.tier);
  return { kind, count, text, focus, acts: a.duties[0] ?? null, fromRelease: false, ...extra };
};
/** Where each startable-check cause is fixed (engine/programs.ts missingItems codes). */
const NOT_STARTABLE_AT: Record<string, { step: StepKey; focus: string }> = {
  no_forms: { step: "forms", focus: "forms:problems" }, form_without_edition: { step: "forms", focus: "forms:problems" }, filing_problem: { step: "forms", focus: "forms:problems" },
  filing_not_set: { step: "people", focus: "people:problems" }, role_without_questions: { step: "questions_documents", focus: "questionnaires:problems" },
  rule_problem: { step: "questions_documents", focus: "questionnaires:problems" },
};
const problemsItem = (n: number, step: StepKey, fromRelease: boolean) =>
  item("fix_problems", n, fromRelease ? `Fix ${plural(n, "problem")}: firms cannot open cases until ${n === 1 ? "it is" : "they are"} fixed` : `Fix ${plural(n, step === "forms" ? "form problem" : "problem")}`, `${step}:problems`, { fromRelease });

/** The checklist of one combination (concept §4, §6, §8). Steps are judged one by one; the bar says how many are done;
 *  the next item is the first open item of a release problem (Not ready), else of the first open step. */
export function setupChecklistOf(s: SetupInput, key = ""): SetupChecklist {
  const proposalsBy = Object.fromEntries(STEP_KEYS.map((k) => [k, 0])) as Record<StepKey, number>;
  const partProposals = { documents: 0, questions: 0 };
  for (const kind of PROPOSAL_KINDS) {
    const n = s.proposals[kind] ?? 0; if (!n) continue;
    const t = KIND_STEP[kind]; proposalsBy[t.step] += n; if (t.part) partProposals[t.part] += n;
  }
  const errors = s.problems.filter((p) => p.level === "error" && !waitsForMap(p));
  const problemsBy = Object.fromEntries(STEP_KEYS.map((k) => [k, 0])) as Record<StepKey, number>;
  const partProblems = { documents: 0, questions: 0 };
  for (const p of errors) { const t = stepOfWhere(p.where); problemsBy[t.step]++; if (t.part) partProblems[t.part]++; }
  const relErrors = (s.release?.problems ?? []).filter((p) => p.level === "error" && !waitsForMap(p));
  const relBy = Object.fromEntries(STEP_KEYS.map((k) => [k, 0])) as Record<StepKey, number>;
  // X1 (review M1): step 4's release problems are split by part, so a Not ready item lands on the tab that holds it.
  const relPart = { documents: 0, questions: 0 };
  for (const p of relErrors) { const t = stepOfWhere(p.where); relBy[t.step]++; if (t.part) relPart[t.part]++; }
  const notReady = relErrors.length > 0 || (!!s.release && !!s.notStartable);
  const counts: Counts = { forms: s.forms.onCombination ?? s.forms.lines + s.forms.sources, formsSetUp: s.forms.lines, people: s.people.roles, applicants: s.people.applicants, documents: s.documents.lines, questions: s.questions, proposals: proposalsBy, problems: problemsBy, held: s.held };

  const open: Record<StepKey, OpenItem[]> = { pages: [], people: [], forms: [], questions_documents: [], release: [] };
  // Release problems first, on their own steps (Not ready, §6).
  for (const k of STEP_KEYS) if (relBy[k]) {
    if (k !== "questions_documents") { open[k].push(problemsItem(relBy[k], k, true)); continue; }
    for (const [part, focus] of [["documents", "documents:problems"], ["questions", "questionnaires:problems"]] as const) if (relPart[part]) open[k].push({ ...problemsItem(relPart[part], k, true), focus });
  }
  // Devin review on #622: Not ready only by the startable check (no validator error on the release): each cause is a
  // release fix item on the step that fixes it, so the header never says "Nothing to do right now" while Not ready.
  if (s.release && s.notStartable && !relErrors.length) for (const m of s.notStartableWhy ?? []) {
    const at = NOT_STARTABLE_AT[m.code] ?? { step: "forms" as StepKey, focus: "forms:problems" };
    open[at.step].push(item("fix_problems", 1, `${m.text.replace(/\s*Next step:.*$/, "").replace(/\.$/, "")}: firms cannot open cases until it is fixed`, at.focus, { fromRelease: true, startable: true }));
  }
  if (s.combinationId) {
    // 1 Official pages: no record yet → open, with no item until the forms lane lands the record (plan.md slice A).
    if (s.pages.state === "proposed") open.pages.push(s.pages.matches === 1 ? item("confirm_pages", 1, "Confirm the checklist page", "pages:record", { tier: "author" })
      : item("choose_pages", 1, "Choose the checklist page", "pages:record", { tier: "expert", reason: s.pages.matches ? `${s.pages.matches} pages match` : "No page matches" }));
    // 2 People.
    if (proposalsBy.people) open.people.push(item("review_proposals", proposalsBy.people, `Review ${plural(proposalsBy.people, "people proposal")}`, "review:people"));
    else if (!s.people.saved || !s.people.applicants || !s.people.confirmed) open.people.push(item("confirm_people", 1, "Confirm who can apply", "people:card", { tier: s.people.tier, reason: s.people.reason }));
    // C11.12 (review n3): a draft's own People problems ("Filing for <role>") are a Fix item on the people step.
    if (problemsBy.people) open.people.push({ ...problemsItem(problemsBy.people, "people", false), focus: "people:card" });
    // 3 Forms, in the order of concept §4.
    if (!s.forms.lines && !s.forms.fromLibrary && !s.forms.draftable) open.forms.push(item("find_forms", 1, "Find forms", "forms:finder"));
    if (s.forms.fromLibrary) open.forms.push(item("add_forms_found", s.forms.fromLibrary, `Add ${plural(s.forms.fromLibrary, "form")} found`, "forms:sources"));
    if (s.forms.draftable || s.forms.unmapped) { const n = Math.max(s.forms.draftable, s.forms.unmapped); open.forms.push(item("map_forms", n, `Map ${plural(n, "form")}`, "forms:lines")); }
    if (proposalsBy.forms) open.forms.push(item("review_proposals", proposalsBy.forms, `Review ${plural(proposalsBy.forms, "proposal")}`, "review:forms"));
    if (problemsBy.forms) open.forms.push(problemsItem(problemsBy.forms, "forms", false));
    if (s.held) open.forms.push(item("review_edition", s.held, s.held === 1 ? "Review new edition" : `Review ${s.held} new editions`, "forms:held"));
    // 4 Questions and documents: 4a documents first, then 4b questions (P-130, P-174).
    const qd = open.questions_documents;
    // No document lines is never done, with or without forms yet (concept §4a: a document line for every applicant role).
    if (!s.documents.lines && !partProposals.documents) qd.push(item("draft", 1, "Draft questions and documents", "documents:lines"));
    else if (s.documents.rolesWithout) qd.push(item("draft", s.documents.rolesWithout, `Add documents for ${plural(s.documents.rolesWithout, "person role")}`, "documents:lines"));
    if (partProposals.documents) qd.push(item("review_proposals", partProposals.documents, `Review ${plural(partProposals.documents, "proposal")}`, "review:documents"));
    if (partProblems.documents) qd.push(item("fix_problems", partProblems.documents, `Fix ${plural(partProblems.documents, "problem")}`, "documents:problems"));
    if (partProposals.questions) qd.push(item("review_proposals", partProposals.questions, `Review ${plural(partProposals.questions, "proposal")}`, "review:questions"));
    const unasked = errors.filter((p) => p.where === "Questionnaires").length;
    if (unasked) qd.push(item("unasked", unasked, `${plural(unasked, "answer")} asked of nobody`, "questionnaires:gaps"));
    if (partProblems.questions - unasked > 0) qd.push(item("fix_problems", partProblems.questions - unasked, `Fix ${plural(partProblems.questions - unasked, "problem")}`, "questionnaires:problems"));
    // 5 Review and release: draft changes since the latest release (or none yet), and its checks pass.
    if (problemsBy.release) open.release.push(problemsItem(problemsBy.release, "release", false));
    if (s.changes > 0 || !s.release) {
      // PR #108 minor (b): Submit is offered once Forms and Questions and documents have nothing open (the submit endpoint
      // refuses while their problems stand). Official pages and people are not gated: no screen confirms them yet (P-176 Q1).
      if (s.review.stage === "submit") { if (!open.forms.length && !open.questions_documents.length) open.release.push(item("submit", 1, "Submit for review", "review:submit")); }
      else if (s.review.stage === "sign") open.release.push(item("sign", 1, "Review and sign", "review:sign", { notBy: s.review.submittedBy ? [s.review.submittedBy] : [] }));
      else open.release.push(item("release", 1, "Release", "review:release", { notBy: [...new Set([...(s.review.submittedBy ? [s.review.submittedBy] : []), ...s.review.authors])] }));
    }
    if (s.running) open[s.running.step].unshift(item("view_ai", 1, "View AI progress", `ai:${s.running.batchId}`));
  }

  const doneOf: Record<StepKey, boolean> = {
    pages: !!s.combinationId && s.pages.state === "confirmed" && !open.pages.length,
    people: !!s.combinationId && !open.people.length,
    forms: !!s.combinationId && !open.forms.length,
    questions_documents: !!s.combinationId && !open.questions_documents.length,
    // Done only with no draft changes since the latest release (concept), not just because Submit is held back (#111 review m1).
    release: !!s.combinationId && !!s.release && !notReady && !open.release.length && !(s.changes > 0),
  };
  const firstOpen = STEP_KEYS.find((k) => !doneOf[k]) ?? null;
  const releaseFirst = STEP_KEYS.find((k) => open[k].some((i) => i.fromRelease));
  const nextStep = releaseFirst ?? STEP_KEYS.find((k) => !doneOf[k] && open[k].length) ?? null;
  const steps: Step[] = STEP_KEYS.map((k) => {
    const items = open[k];
    const state = doneOf[k] ? "done" : k === nextStep && items[0]?.kind === "view_ai" ? "ai" : k === nextStep ? "next" : items.some((i) => i.kind === "view_ai") ? "ai" : "todo";
    const step: Step = { key: k, label: STEP_LABEL[k], state, summary: summaryOf(k, s, counts, doneOf[k]), open: items, tab: k === "questions_documents" && !items.length ? "documents" : k === "questions_documents" && items[0].focus.startsWith("questionnaires") ? "questionnaires" : STEP_TAB[k] };
    if (k === "pages" && s.pages.state === "confirmed") step.confirmed = { by: s.pages.by, as: s.pages.as };
    if (k === "people" && s.people.confirmed) step.confirmed = s.people.confirmed;
    if (k === "questions_documents") step.parts = [{ key: "documents", done: !items.some((i) => i.focus.startsWith("documents") || i.focus === "review:documents") }, { key: "questions", done: !items.some((i) => i.focus.startsWith("questionnaires") || i.focus === "review:questions") }];
    return step;
  });
  const done = STEP_KEYS.filter((k) => doneOf[k]).length;
  const chipStatus: ChipStatus = s.retired ? "RETIRED" : !s.combinationId ? "NOT_STARTED" : notReady ? "NOT_READY" : s.release ? "LIVE" : "IN_PROGRESS";
  const first = nextStep ? open[nextStep][0] : null;
  const id = s.combinationId ?? "";
  const hrefOf = (st: StepKey, i: OpenItem) => itemHref(id, st, steps[STEP_KEYS.indexOf(st)].tab, i);
  return {
    combinationId: s.combinationId,
    chip: { status: chipStatus, release: s.release?.number ?? null },
    steps,
    current: firstOpen,
    next: !s.combinationId ? null : first && nextStep ? { item: first, step: nextStep, href: hrefOf(nextStep, first), line: `${STEP_LABEL[nextStep]}: ${first.text}` } : null,
    bar: { done, of: 5, text: chipStatus === "RETIRED" ? `Retired at Release ${s.release?.number ?? 1}` : chipStatus === "LIVE" ? "✓ Live" : `${done} of 5 steps`, next: chipStatus === "LIVE" ? nextReleaseWords(5 - done) : null },
    counts,
    key,
  };
}

/** QA-184: GET /catalogue's progress, from the same checklist as the card and the Overview (before, an older four-step
 *  count, "Step 2 of 4: Draft", beside the Overview's five). The step is the one its next item is on (the first open step
 *  when nothing is open there); the words are the card's: "✓ Live" then the next release's line, or "n of 5 steps". */
export function progressOf(c: SetupChecklist): { step: number; of: 5; label: string; done: boolean[]; live: boolean } {
  const at = c.next?.step ?? c.current;
  const live = c.chip.status === "LIVE";
  return { step: at ? STEP_KEYS.indexOf(at) + 1 : 5, of: 5, done: c.steps.map((s) => s.state === "done"), live, label: live && c.bar.next ? `${c.bar.text} · ${c.bar.next}` : c.bar.text };
}

function summaryOf(k: StepKey, s: SetupInput, c: Counts, done: boolean): string {
  if (!s.combinationId) return "Not started";
  if (k === "pages") return s.pages.state === "no_record" ? "No official pages record yet" : s.pages.state === "proposed" ? "Proposed by the rules, not confirmed" : `Confirmed by the ${s.pages.as === "author" ? "configuration author · sure" : "immigration expert · not sure"}`;
  if (k === "people") return `${plural(c.people, "person role")}, ${plural(c.applicants, "applicant role")}`;
  if (k === "forms") return `${formsWords({ total: c.forms, setUp: c.formsSetUp })}${c.held ? ` · ${plural(c.held, "new edition")} held` : ""}`;
  if (k === "questions_documents") return `${plural(c.documents, "document")} · ${questionsWords(c.questions)}`;
  return done ? `Released as Release ${s.release!.number}` : s.release ? `${plural(s.changes, "change")} since Release ${s.release.number}` : "Not released yet";
}

const WAITING_FOR: Record<"author" | "sme" | "approve" | "review", string> = { author: "the configuration author", sme: "the immigration expert", approve: "a second person", review: "a content publisher" };
/** The duty overlay (§5, P-180 Q1): the card's one button for this person (Open for anyone without the author duty),
 *  Needs you when a review or confirmation on their duty and tier waits, and the Next line in their words. Runs after
 *  the cache. */
export function forViewer(c: SetupChecklist, actor: { id: string; duties: readonly string[] }): ViewerOverlay {
  const author = actor.duties.includes("author");
  const button = !author || c.chip.status === "LIVE" || c.chip.status === "RETIRED" ? "Open" : c.chip.status === "NOT_STARTED" ? "Start setup" : "Resume setup";
  const mine = needsYouItems(c, actor);
  const n = mine.reduce((t, i) => t + i.count, 0);
  const first = c.next?.item;
  const filled = !!first && first.kind !== "view_ai" && mayAct(first, actor);
  const who = first ? actsOn(first.kind, first.tier).filledFor : null;
  return {
    button,
    needsYou: n ? { count: n, text: mine.map((i) => i.text).join(" · ") } : null,
    nextLine: !c.next ? null : filled || !who ? c.next.line : `Waiting for ${WAITING_FOR[who]}: ${first!.text}${first!.reason ? ` (${first!.reason})` : ""}`,
    filled,
  };
}
