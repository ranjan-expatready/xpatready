// C6.12, C11.6 (M3-B, runtime lane; M3 case view r5c §6; P-122, P-135, P-137, P-171): a case's "Prepare application"
// view. Its filings, submission groups and items are derived from the pinned release and the case on every read and
// stored (tables filing, filing_applicant, submission_group, filing_item) so their ids stay when people change, a split
// stays split and a form keeps the channel the case officer chose. Fees are worked out per group on each read
// (engine/runtime/filings.ts). The case officer reads and changes it; a client and configuration people do not. A
// combination whose filings cannot be worked out (filings.ts) says why. No model call (US$0). Readiness is C7.6's
// (engine/runtime/readiness.ts, M3-A3; L-SA3, P-315): this view gathers its inputs (api/src/readiness-inputs.ts) and
// shows the result per filing; the rules are never decided here.
// One implementation (#356 on #325's tables, migration 20261102030000): #325's guards are kept (the release must match
// its fingerprint, B2; a read with nothing new takes no transaction, B1; HEAD is refused, B4); a filing or item that
// stops applying keeps its row with active = false, so its id (and an item's chosen channel) come back with it.
// C7.6 (review m10 on #861): one write a read can make outside that: a filing marked Ready to file that is no longer
// ready goes back to Not started, recorded with the reader as the actor (the reader is who saw it change).
import { ADDED_TAG, addedOn, completedSince, dayWords } from "../../engine/runtime/added-forms.ts";
import { unverifiedOf } from "../../engine/runtime/must-verify.ts";
import { createHash } from "node:crypto";
import { Body, Controller, Get, Head, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import PDF_SECTIONS from "../../contracts/pdf-sections.json" with { type: "json" };
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { ACCOUNT_WORDS, CHANNEL_WORDS, isBarcodeForm, throughAccount } from "../../contracts/forms.ts";
import { acceptsOf } from "../../engine/channels.ts";
import { caseChecklist } from "../../engine/runtime/case-checklist.ts";
import { caseView, checkValue, isClientField, knownOf, optionsOf } from "../../engine/runtime/case.ts";
import { releaseModes } from "../../engine/filing-modes.ts";
import { ageOn, cad, deriveFilings, FAMILY_GROUP, FEE_TABLE, rulesFrom, stepRule } from "../../engine/runtime/filings.ts";
import { addedFilings } from "../../engine/runtime/added-filings.ts";
import { blocksLock, changedGroups, formCoverage, gateOf, groupFacts, inputHash, markNothingRecorded, readiness as formReadiness, type FormFact, type GatePlacement, type GroupFact } from "../../engine/runtime/forms.ts";
import { factChanges, markKey, outOfDateReason, representativeWords, restoredFromOf, undoTarget, type ChangeWords, type FactChange } from "../../engine/runtime/out-of-date.ts";
import { REPRESENTATIVE } from "../../engine/runtime/team.ts";
import { changesOf, partsInFormOrder, sectionHash, sheetOf as layOut, sheetWords, waitsOf, type FormPart, type Layout, type Sheet, type SheetAnswer } from "../../engine/runtime/answer-sheet.ts";
import { formPartsOf } from "./form-parts.ts";
import { BIOMETRICS_STEP, biometricsWaits, channelChange, channelOf, paperLine, prepareVersion, readBackOf, wantedItems, type FormLine, type PaperValidated } from "../../engine/runtime/prepare.ts";
import { lineCondition, render, type Role } from "../../engine/render.ts";
import { conditionSubjects } from "../../engine/resolver.ts";
import { snapshotHash } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { feesOnTheirFilings, heldBy, keepRecorded, keptRowsOf, recordedOverlay, refuseIfRecorded } from "./submission-record.ts"; // C8.2: the record, its tasks and the read-only lock
import { currentValues, factWords } from "../../engine/runtime/submission-record.ts";
import { formValues, recordedYesNo } from "../../engine/form-values.ts";
import { CaseForms, copyNotForFiling, formPassed, formReadinessOf, inventoryOf, plainWhy } from "./fill-case.ts";
import { Runtime, type Reached } from "./runtime.ts";
import { minorFromAnswers, signedState, signersOf } from "../../engine/runtime/signing.ts";
import { signStepsOf } from "./sign-steps.ts";
import { copyStateOf, readinessOfCase, waitingFactsKey, type PreparedForm, type ReadinessInputs } from "./readiness-inputs.ts";
import { lowestOf } from "../../engine/runtime/readiness-figure.ts";
import { pdfMapInUse } from "../../engine/programs.ts";
import { draftNote, releaseOutOfDate, reviewCounts, touchedFilings } from "../../engine/runtime/release-update.ts";
import { caseName, releaseLabel, type Readiness } from "../../contracts/runtime.ts";
import { caseInputs, diffCache, pinReleases, targetRelease } from "./release-context.ts";
/** B171 (B169 review M1): the IRCC account in words, from the Forms tab's own contract (contracts/forms.ts), for every
 *  account: "through PR Portal", "on paper, with no IRCC account"; never the raw key (only "APR Portal" had words). */
const filedThrough = (account: string) => (account === "PAPER" ? throughAccount(account) : `through ${ACCOUNT_WORDS[account as "ANY"] ?? account}`);

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (id: string, what: string) => (UUID.test(id) ? id : fail(`No such ${what}.`, HttpStatus.NOT_FOUND));
const short = (id: string) => id.slice(0, 8);
const ROLE: Record<string, string> = { principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const stale = (): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail: "This application's filings or items changed since you read them. Reload, then make your change again." }, HttpStatus.CONFLICT); };
const stageMoved = (): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail: "This case moved to its next stage while you read it: read the case again. Nothing was changed for the ended stage.", code: "stage_moved" }, HttpStatus.CONFLICT); }; // C6.17 BR-10
const refuse = (status: number, field: string, detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: status === 422 ? "Not accepted" : "Some details need fixing", status, detail, errors: [{ field, message: detail }] }, status); };
const Version = z.union([z.string(), z.number()], { error: "Reload: the version you read is missing." });
// Break m2: a reason is plain text: no control characters (C0, C1), no hidden direction marks, separators or zero-width spaces.
const ReasonText = z.string().trim().max(400, "Keep the reason under 400 characters.").refine((x) => !/[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\u115f\u1160\u3164\uffa0]/.test(x) && !/[\ud800-\udfff]/u.test(x), "Write the reason as plain text: it holds a hidden or control character.")
  // Break r3 m1, m2: joiners that scripts and emoji need (U+200C, U+200D) are allowed; a reason must say something.
  .refine((x) => x === "" || /[\p{L}\p{N}]/u.test(x), "Write the reason in words: it holds no letter or digit.");
const Reason = ReasonText.optional();
const SplitBody = z.object({ filing: z.string({ error: "Choose the filing to split out." }), reason: Reason, version: Version });
const ChannelBody = z.object({ channel: z.unknown(), reason: Reason, version: Version });
const EnteredBody = z.object({ version: z.string({ error: "Send the section's version from the answer sheet you read (Reload)." }) });
// C7.3 (P-401): unticking "Entered in the portal" needs the section's version and the tick it read (when it was ticked), and
// a reason, checked as every other reason here (break M1: the shared rule, never a weaker copy).
const UnenteredBody = z.object({ version: z.string({ error: "Send the section's version from the answer sheet you read (Reload)." }),
  entered_at: z.string({ error: "Send when the tick you read was made (Reload)." }).refine((x) => !Number.isNaN(Date.parse(x)), "Send when the tick you read was made, as the sheet gives it (Reload)."),
  reason: z.string({ error: "Say why the tick comes off." }).pipe(ReasonText).refine((x) => x !== "", "Say why the tick comes off.") });
const DOB = "person.date_of_birth";

type Item = Awaited<ReturnType<Db["filingItem"]["findMany"]>>[number];
/** C9.2: one changed fact on an out-of-date item, as the screen reads it (Undo: what it restores, the answer seen). */
type ChangeRow = { subject: string; fact: string; label: string; person: string; was: unknown; now: unknown; confirmed: boolean; at: string | null; undo: boolean; expected_id: string | null; restores: unknown };

/** C9 (review M1): an item of the view by id, whether it is a form to fill or one not yet known (`waiting`): the item
 *  routes (channel, PDF copy) act on both. */
const itemIn = (v: { items: unknown[]; waiting?: unknown[] }, id: string) => [...v.items, ...(v.waiting ?? [])].find((i) => (i as { id: string }).id === id);
type RenderedForm = { form: string; title?: string; form_kind?: string; person: string; applies: boolean | "cannot_tell" };
/** An answer in words: Yes or No, or a choice's own label from the release (never its key). */
const answerWords = (s: Parameters<typeof optionsOf>[0], fact: string, v: unknown) => (v === true ? "Yes" : v === false ? "No" : typeof v === "string" ? optionsOf(s, fact)?.find((o) => o.key === v)?.label ?? v : JSON.stringify(v));
/** The facts a configured condition reads (its `field`s, nested `args` included), in order, once each. */
const conditionFacts = (c: unknown, seen: string[] = []): string[] => {
  if (!c || typeof c !== "object") return seen;
  const o = c as { field?: unknown; args?: unknown };
  if (typeof o.field === "string" && !seen.includes(o.field)) seen.push(o.field);
  if (Array.isArray(o.args)) for (const a of o.args) conditionFacts(a, seen);
  return seen;
};
/** C9 (QA-246): each filer's conditional form that an answer says does not apply, with that answer as its reason. A
 *  line the person never reaches by its minimum age is not listed (it was never one of their forms, answered or not);
 *  the age gates a dependent child only on a "principal, partner and adult children" line (QA-221). */
export function notNeededForms(s: Parameters<typeof lineCondition>[0], people: Parameters<typeof lineCondition>[2], known: Parameters<typeof lineCondition>[1], forms: RenderedForm[], lines: Map<string, FormLine>,
  filers: Set<string>, ages: Map<string, number | null>, caseSubject: string | null, answers: { subjectId: string; field: string; value: unknown; rowKey?: unknown }[], question: (fact: string) => string, label: Map<string, string>) {
  return forms.filter((f) => f.applies === false && filers.has(f.person) && (f.form_kind ?? "data_form") === "data_form").flatMap((f) => {
    const line = lines.get(f.form) as (FormLine & { condition?: { subjectKind?: string } | null; min_age?: number | null; who?: string }) | undefined;
    if (!line?.condition) return [];
    const role = people.find((p) => p.id === f.person)?.role, age = ages.get(f.person) ?? null;
    const gated = !!line.min_age && !(line.who === "principal_partner_adult_children" && role !== "child");
    if (gated && age !== null && age < line.min_age!) return [];
    const rule = lineCondition(s, known, people, f.person, line.condition);
    if (rule.applies !== false) return [];
    // Review m3: the answer read is the one the condition is decided on (the holder, another person by role, or the
    // case); with nobody in that role, that is the reason.
    const on = conditionSubjects(people, f.person, line.condition.subjectKind), deciders = Array.isArray(on) ? on.filter((x) => people.some((p) => p.id === x)) : [];
    const said = rule.nobody ? [`there is no ${rule.nobody} on this case`] : conditionFacts(line.condition).map((fact) => {
      const a = deciders.map((d) => answers.find((x) => x.field === fact && !x.rowKey && x.subjectId === d)).find(Boolean) ?? answers.find((x) => x.field === fact && !x.rowKey && x.subjectId === caseSubject);
      return a ? `"${question(fact)}" is answered ${answerWords(s, fact, a.value)}` : `the answer to "${question(fact)}" says it does not apply`;
    });
    return [{ kind: "form" as const, form: f.form, title: f.title ?? null, subject: f.person, person: label.get(f.person) ?? "", state: "not_needed" as const,
      reason: `Not needed: ${said.join(" and ") || "its condition does not apply"}.`, decided_by: conditionFacts(line.condition) }];
  });
}

/** C7.8 (B141 §5): a blank added form's item, in words. */
const BLANK_WORDS = { todo: "Blank official PDF: download it, fill it by hand, upload the completed copy.", done: "Filled by hand: the completed copy is uploaded" };

/** C8.3 (B144): one form of the case as the review freezes it: its facts hash (null while it cannot start), the facts
 *  its copy would write, its validated copy read back and its newest copy for filing (B2's file order). */
export type ReviewBasisForm = { item: string; filing: string; form: string; subject: string; person: string; channel: string; state: string; waits: boolean;
  hash: string | null; inputHash: string; facts: FormFact[]; validated: PaperValidated; validatedSha: string | null; forFiling: { id: string; hash: string } | null; reads: string[] };
export type ReviewBasis = { forms: ReviewBasisForm[]; words: ChangeWords; caseSubject: string | null; valueWords: (fact: string, v: unknown) => string | null; answers: Awaited<ReturnType<Runtime["state"]>>["answers"] };

@Injectable()
export class CasePrepare {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(CaseForms) private readonly forms: CaseForms) {}

  async view(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, idOf(caseId, "case"), "officer");
    return this.build(actor, c);
  }

  /** Derives, stores what changed (under the case's row lock, so two reads never make two family groups), and answers. */
  /** C9.5 (break m3): the view as stored, for a read that must write nothing (GET …/release-update): null when the
   *  stored filings and items are not the derived ones yet (only a Prepare read stores them). */
  async peek(actor: Actor, c: Reached) { return this.compose(actor, c, true); }

  private async build(actor: Actor, c: Reached) { return (await this.compose(actor, c, false))!; }

  /** C8.3 (B144, concept B2): the view, and each form's own facts as the review freezes and stamps them, worked out in
   *  the same pass as the view's readiness (so a form's hash here is the one its filing's facts hash is made of). */
  async reviewBasis(actor: Actor, c: Reached) {
    let basis: ReviewBasis | null = null;
    const view = (await this.compose(actor, c, false, (b) => { basis = b; }))!;
    return { view, basis: basis as ReviewBasis | null };
  }

  private async compose(actor: Actor, c: Reached, noWrite: boolean, sink?: (b: ReviewBasis) => void) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // The release must describe the case's own combination (as case-filings.ts): never another combination's filings.
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true, portalKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; nothing was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    // #325 break B2: a release row edited underneath its fingerprint is never stored from.
    // C7.8 (M1): the fingerprint is the release's own, never the snapshot with the added forms joined.
    if (snapshotHash(this.r.releaseSnapshotOf(c)) !== pin.release.sha256) fail("This case's release no longer matches its fingerprint (it was changed after release); nothing was prepared. Ask the Lead.", HttpStatus.CONFLICT);
    const people = this.r.peopleOf(c), today = new Date();
    const { answers, rows, groups: groupAnswers } = await this.r.state(c);
    // An answer its own checks reject never decides an age or a line (as the checklist, C6.4 B-M2).
    const clean = answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0);
    const ages = new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, ageOn(clean.find((a) => a.subjectId === p.subjectId && a.field === DOB && !a.rowKey)?.value as string | undefined, today)]));
    // M3-0, C11.12: the filing mode per role is the release's ("Who can be in this application"); a role it leaves out
    // uses the default. One reading of the release's modes for this view and GET …/filings (releaseModes).
    const modes = releaseModes(s.combination.participants ?? []);
    // M3-S2: a filing a person's line adds when its rule holds on their answers (the same reading as GET …/filings).
    const { known } = knownOf(s, people, clean, rows, today);
    const adds = addedFilings(s, known, people);
    const first = deriveFilings(own!.combinationKey, people, undefined, { ages, modes, adds, label: s.combination.label });
    if (!first.derived) return { case_id: c.id, reference: caseName(c), release_version: pin.release.version, derived: false, why: first.why, portal: own!.portalKey ?? null, filings: [], groups: [], items: [], waiting: [], not_needed: [], fees: [], readiness: [], figures: [], case_figure: null, stage1: [], version: "0" };

    // Items the release and the case give each filer (forms by who and minimum age, the checklist's documents, biometrics).
    const renderPeople = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies }));
    const r = render(s, renderPeople, known, { today });
    const list = caseChecklist(s, own!.combinationKey, people, known, today);
    const docs = new Map(list.derived ? list.people.map((p) => [p.subject, p.lines]) : []);
    // C11.12 (challenge M1): items go to each person on the filing they are on: an applying applicant on their filing (their
    // own, or the principal's), a co-filing sponsor on the sponsorship. A declared-only person gets no forms until a "for
    // non-applying people" marker exists (Not built). Filings are stored by their owner's subject.
    const onFiling = new Map<string, string>();
    for (const f of first.filings) { if (f.mode === "co_filed") onFiling.set(f.owner!.subject, f.owner!.subject); for (const a of f.applicants) if (a.mode === "applying") onFiling.set(a.subject, f.owner!.subject); }
    // Break M2: a co-filing sponsor gets the forms that name them, never an applicant's biometrics step.
    const coFilers = new Set(first.filings.filter((f) => f.mode === "co_filed").map((f) => f.owner!.subject));
    const filers = [...onFiling.keys()];
    // Review r1 M4, BK-8 (P-448, P-452): who gives biometrics (the ages, IRCC's page) comes from the case's own
    // combination's fee rows (the line its row lists for the step), read once for the items and their words; never
    // another pathway's.
    const bio = stepRule(own!.combinationKey, BIOMETRICS_STEP.key);
    const wanted = [...wantedItems(filers.filter((x) => !coFilers.has(x)), r.forms as never, docs as never, bio, ages),
      ...wantedItems(filers.filter((x) => coFilers.has(x)), r.forms as never, new Map(), undefined, ages)];
    const wantApplicants = (owner: string) => first.filings.find((f) => f.owner!.subject === owner)!.applicants;

    // #325 break B1: a read with nothing new to store takes no lock; only a read with something to store takes the case's
    // row lock and, under it, reads the stored rows again before writing (only through tx). Break r3 M1: the three reads
    // are one snapshot (one repeatable-read batch on one connection, no lock), so groups, filings, items and the version
    // made from them always agree.
    const read = (q: Tx | Db) => [
      q.submissionGroup.findMany({ where: { caseId: c.id, stageId: c.stage.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      q.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id }, include: { applicants: true } }),
      q.filingItem.findMany({ where: { caseId: c.id, filing: { stageId: c.stage.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    ] as const;
    const sync = async (tx: Tx | Db, write: boolean) => {
      const [g0, filings0, items0] = write ? await Promise.all(read(tx)) : await this.db.$transaction([...read(this.db)], { isolationLevel: "RepeatableRead", maxWait: 10_000 }); // C7.6: as the write path (C6.12 B1, 120 reads at once)
      let groups = g0;
      // BK-17 (BK-15 breaker M3): a filing recorded as submitted is kept as recorded: never made inactive, its mode, people
      // and items never changed by a later answer. A person on it stays on it: the derivation makes no other filing for
      // them and puts them on no other filing (keepRecorded reads the view the same way).
      // Break B1: and a person a later answer would move onto a recorded filing stays on the application they are on
      // (keptRowsOf): that row is kept as stored too, its items still following the answers.
      const kept = keptRowsOf(first.filings, filings0, g0), keptIds = new Set(kept.map((x) => x.id));
      const recIds = new Set(filings0.filter((x) => x.status === "SUBMITTED").map((x) => x.id));
      const heldOn = new Map(kept.flatMap((x) => [...x.applicants.map((a) => [a.subjectId, x.subjectId] as const), [x.subjectId, x.subjectId] as const]));
      const plan = first.filings.filter((f) => !heldOn.has(f.owner!.subject)).map((f) => ({ ...f, applicants: f.applicants.filter((a) => !heldOn.has(a.subject)) }));
      const keep = new Set([...plan.map((f) => f.owner!.subject), ...kept.map((x) => x.subjectId)]);
      const ownerOf = (subject: string) => heldOn.get(subject) ?? (keep.has(onFiling.get(subject) ?? "") ? onFiling.get(subject) : undefined);
      const liveOwner = new Map(filings0.filter((f) => f.active || recIds.has(f.id)).map((f) => [f.subjectId, f.id]));
      const live = new Map([...onFiling.keys(), ...heldOn.keys()].filter((subject) => liveOwner.has(ownerOf(subject) ?? "")).map((subject) => [subject, liveOwner.get(ownerOf(subject)!)!]));
      // A recorded filing's items are the ones it was recorded with: none added, none dropped.
      const wantKeys = new Set(wanted.filter((w) => live.has(w.subject) && !recIds.has(live.get(w.subject)!)).map((w) => `${live.get(w.subject)}|${w.kind}|${w.key}|${w.subject}`));
      // C11.12 (challenge M1): the applicant rows are compared too (who is on it, and applying or declared only).
      // C6.13 (m2): and their role, so Make principal (a swap of roles only) refreshes the stored applicant rows.
      const sameApplicants = (row: (typeof filings0)[number], want: { subject: string; mode: string; role: string }[]) => row.applicants.length === want.length && want.every((a) => row.applicants.some((x) => x.subjectId === a.subject && x.mode === a.mode && x.role === a.role));
      const has = new Set(items0.map((i) => `${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`));
      const changes = !groups.some((g) => g.kind === "FAMILY")
        || plan.some((f) => { const row = filings0.find((x) => x.subjectId === f.owner!.subject); return !row || !row.active || row.mode !== f.mode || !sameApplicants(row, f.applicants); })
        || filings0.some((x) => x.active !== (keep.has(x.subjectId) || recIds.has(x.id)) && (x.active || recIds.has(x.id)))
        || [...wantKeys].some((k) => !has.has(k))
        || items0.some((i) => !recIds.has(i.filingId) && i.active !== wantKeys.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`));
      if (!changes) return { groups, filings: filings0.filter((f) => f.active).sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id)), items: items0.filter((i) => i.active) };
      if (!write) return null;
      let family = groups.find((g) => g.kind === "FAMILY");
      if (!family) { family = await tx.submissionGroup.create({ data: { workspaceId: c.workspaceId, caseId: c.id, stageId: c.stage.id, kind: "FAMILY", createdBy: actor.id } }); groups = [family, ...groups]; }
      let filings = await tx.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id }, include: { applicants: true } });
      // BK-9: a shared application whose owner changed (Make principal on a family on the principal's application) is the
      // same application: its row moves to the new owner, so its items, copies and passes keep their ids.
      for (const f of plan) {
        const to = f.owner!.subject;
        if (filings.some((x) => x.subjectId === to)) continue;
        const from = filings.find((x) => x.active && !keptIds.has(x.id) && !keep.has(x.subjectId) && f.applicants.some((a) => a.subject === x.subjectId) && x.applicants.some((a) => a.subjectId === to));
        if (from) { await tx.filing.update({ where: { id: from.id }, data: { subjectId: to } }); from.subjectId = to; }
      }
      for (const f of plan) {
        const subject = f.owner!.subject, row = filings.find((x) => x.subjectId === subject);
        // A co-filed sponsorship always goes in the principal's group (it cannot be sent alone).
        const principalRow = filings.find((x) => x.subjectId === first.filings.find((y) => y.owner!.role === "principal")?.owner!.subject);
        const group = f.mode === "co_filed" && principalRow ? principalRow.submissionGroupId : family.id;
        const applicants = f.applicants.map((a) => ({ subjectId: a.subject, role: a.role, mode: a.mode }));
        if (!row) await tx.filing.create({ data: { workspaceId: c.workspaceId, caseId: c.id, stageId: c.stage.id, subjectId: subject, combinationKey: own!.combinationKey, mode: f.mode, submissionGroupId: group, applicants: { create: applicants } } });
        else {
          if (!row.active || row.mode !== f.mode) await tx.filing.update({ where: { id: row.id }, data: { active: true, mode: f.mode } });
          // C11.12 (challenge M1): applicant rows follow the people on it, each with their own mode (applying or declared only).
          await tx.filingApplicant.deleteMany({ where: { filingId: row.id, subjectId: { notIn: applicants.map((a) => a.subjectId) } } });
          for (const a of applicants) await tx.filingApplicant.upsert({ where: { filingId_subjectId: { filingId: row.id, subjectId: a.subjectId } }, create: { filingId: row.id, ...a }, update: { role: a.role, mode: a.mode } });
        }
      }
      for (const row of filings.filter((x) => x.active && !keep.has(x.subjectId) && !recIds.has(x.id))) await tx.filing.update({ where: { id: row.id }, data: { active: false } });
      // BK-17: a recorded filing made inactive before BK-17 (an answer moved its owner) is listed again, as recorded.
      // Review m2: with the form items it was recorded with (filing_record.filed_facts), so its after-filing tasks still open.
      for (const row of filings.filter((x) => !x.active && recIds.has(x.id))) {
        await tx.filing.update({ where: { id: row.id }, data: { active: true } });
        const filed = (((await tx.filingRecord.findUnique({ where: { filingId: row.id }, select: { filedFacts: true } }))?.filedFacts ?? []) as { item?: string }[]).flatMap((x) => (x.item ? [x.item] : []));
        if (filed.length) await tx.filingItem.updateMany({ where: { id: { in: filed }, filingId: row.id, active: false }, data: { active: true } });
      }
      filings = await tx.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id, active: true }, include: { applicants: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const byOwner = new Map(filings.map((f) => [f.subjectId, f.id]));
      const filingOf = new Map([...onFiling.keys(), ...heldOn.keys()].filter((subject) => byOwner.has(ownerOf(subject) ?? "")).map((subject) => [subject, byOwner.get(ownerOf(subject)!)!]));
      await tx.filingItem.createMany({ data: wanted.filter((w) => filingOf.has(w.subject) && !recIds.has(filingOf.get(w.subject)!)).map((w) => ({ workspaceId: c.workspaceId, caseId: c.id, filingId: filingOf.get(w.subject)!, subjectId: w.subject, kind: w.kind, itemKey: w.key })), skipDuplicates: true });
      let items = await tx.filingItem.findMany({ where: { caseId: c.id, filing: { stageId: c.stage.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const want = new Set(wanted.map((w) => `${filingOf.get(w.subject)}|${w.kind}|${w.key}|${w.subject}`));
      const gone = items.filter((i) => i.active && !recIds.has(i.filingId) && !want.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`)).map((i) => i.id);
      const back = items.filter((i) => !i.active && !recIds.has(i.filingId) && want.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`)).map((i) => i.id);
      if (gone.length) await tx.filingItem.updateMany({ where: { id: { in: gone } }, data: { active: false } });
      if (back.length) await tx.filingItem.updateMany({ where: { id: { in: back } }, data: { active: true } });
      if (gone.length || back.length) items = await tx.filingItem.findMany({ where: { caseId: c.id, filing: { stageId: c.stage.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return { groups, filings, items: items.filter((i) => i.active) };
    };
    const ready = await sync(this.db, false);
    if (!ready && noWrite) return null;
    const stored = ready ?? await busyWords(() => this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      // C6.17 (BR-10, challenge M4): the stage read again under the lock; a case that moved to its next stage meanwhile
      // writes nothing for the ended one.
      if ((await tx.case.findUnique({ where: { id: c.id }, select: { combinationId: true } }))?.combinationId !== c.combinationId) stageMoved();
      return (await sync(tx, true))!;
    }, { timeout: 15_000, maxWait: 10_000 }));

    // Fees per stored group: a split filing is priced on its own.
    const groupOfSubject = new Map(stored.filings.map((f) => [f.subjectId, f.submissionGroupId]));
    const kindOf = new Map(stored.groups.map((g) => [g.id, g.kind === "FAMILY" ? "family" as const : "separate" as const]));
    const d = deriveFilings(own!.combinationKey, people, undefined, { ages, modes, adds, label: s.combination.label, groupOf: (subj) => groupOfSubject.get(subj) ?? FAMILY_GROUP, groupKind: (g) => kindOf.get(g) ?? "family" });
    if (!d.derived) fail("The filings could not be worked out.", HttpStatus.CONFLICT);
    const done = d as Extract<typeof d, { derived: true }>;
    const idOfFiling = new Map(stored.filings.map((f) => [`filing-${f.subjectId}`, f.id]));
    const fid = (x: string) => idOfFiling.get(x) ?? x;
    // BK-17: a recorded filing reads as recorded (its label, people and group), whatever the answers say now.
    const personOf = new Map(people.map((p) => [p.subjectId, p.label]));
    const keptRows = keptRowsOf(first.filings, stored.filings, stored.groups);
    const kept = keepRecorded({ filings: done.filings.map((f) => ({ ...f, id: fid(f.id) })), groups: done.groups.map((g) => ({ ...g, filings: g.filings.map(fid) })) }, keptRows,
      { labelOf: (x) => personOf.get(x) ?? "", combination: own!.combinationKey, combinationLabel: done.label, idOf: (r) => r.id, kindOf: (g) => kindOf.get(g) ?? "family" });
    // C11.12 (challenge M1, concept §6): each applicant's own mode (applying or declared only), never the filing's.
    const filings = kept.filings.map((f) => ({ id: fid(f.id), combination: f.combination, label: f.label, mode: f.mode, owner: f.owner, applicants: f.applicants.map((a) => ({ subject: a.subject, label: a.label, role: a.role, mode: a.mode })), group: f.group, status: f.status as string, number: f.number }));
    // B152 (FQ-7): a recorded group reads its fees as they were recorded (submission_group.recorded_fees, written once by
    // "Record the submission"), never worked out again: a birthday, a corrected date of birth or a new fee table later
    // changes nothing that was filed. A group recorded before B152 has none and is worked out today, as before.
    type Frozen = { at: string; totals: (typeof done.groups)[number]["totals"]; total_cents: number | null; fees: unknown[] };
    const frozen = new Map(stored.groups.filter((x) => x.recordedFees).map((x) => [x.id, x.recordedFees as unknown as Frozen]));
    // Review M1: `subject` is the person the line is for (several people share the principal's filing), never the owner.
    const derivedFees0 = done.fees.map((f) => ({ filing: fid(f.filing), subject: f.person, payer: f.payer, key: f.line, line: f.label, amount: f.amount_cents / 100, amount_cents: f.amount_cents, amount_words: cad(f.amount_cents), exempt: f.exempt, reason: f.why, ...(f.waiting ? { waiting: f.waiting } : {}),
      source: (f.source ?? done.groups.find((g) => g.filings.includes(f.filing))?.totals.find((t) => t.line === f.line)?.source)?.url ?? "Sample", source_detail: f.source ?? done.groups.find((g) => g.filings.includes(f.filing))?.totals.find((t) => t.line === f.line)?.source ?? null }));
    // BK-17 (break B4): a line only on a filing its person is on in the view; a group that charged someone kept on a
    // recorded filing says its fees are not worked out here.
    const placed = feesOnTheirFilings(derivedFees0, kept.groups, filings, { filing: (l) => l.filing, person: (l) => l.subject, frozen: (g) => frozen.has(g), labelOf: (x) => personOf.get(x) ?? "a person", held: heldBy(keptRows) });
    const derivedFees = placed.lines;
    const groups = placed.groups.map((g) => {
      const base = { ...g, reason: stored.groups.find((x) => x.id === g.id)?.reason ?? null }, f = frozen.get(g.id);
      return f ? { ...base, totals: f.totals, total_cents: f.total_cents, fees_recorded: { at: f.at } } : base;
    });
    const frozenFilings = new Set(groups.filter((g) => frozen.has(g.id)).flatMap((g) => g.filings));
    const fees = [...derivedFees.filter((l) => !frozenFilings.has(l.filing)), ...groups.filter((g) => frozen.has(g.id)).flatMap((g) => frozen.get(g.id)!.fees as typeof derivedFees)];

    // Items in the view: each with one state; a form with its channel, what IRCC accepts and the signature that follows.
    const view = caseView(s, people, answers, rows, "agent", today, groupAnswers);
    // QA-165 (P-71; #1256 cause 2): each form's readiness also reads what a copy made now would write (a box refused with a
    // fix, a mandatory box left empty), as GET …/forms does; worked out once per form and person in this view.
    const readyOf = new Map<string, ReturnType<typeof formReadiness>>(), covs = new Map<string, ReturnType<typeof formCoverage>>();
    // One coverage per form and person, shared by readiness and the filing's facts fingerprint (factsHash below).
    const covOf = (form: string, subject: string) => { const k = `${form}|${subject}`; if (!covs.has(k)) covs.set(k, formCoverage(s, people, answers, rows, form, subject)); return covs.get(k)!; };
    const formReady = (form: string, subject: string) => { const k = `${form}|${subject}`; if (!readyOf.has(k)) readyOf.set(k, formReadinessOf(s, people, answers, rows, view, form, subject, covOf(form, subject))); return readyOf.get(k)!; };
    const accepts = await acceptsOf(this.db, c.workspaceId);
    const lines = new Map((s.forms as FormLine[]).map((l) => [l.form_number, l]));
    const label = new Map(people.map((p) => [p.subjectId, p.label]));
    const enteredRows = await this.db.enteredSection.findMany({ where: { caseId: c.id, supersededAt: null }, include: { snapshot: { select: { inputHash: true, factsJson: true } } } });
    const enteredBy = new Map<string, typeof enteredRows>();
    const parts = await partsOfRelease(this.db, c); // C7.3: each Online form's own parts, as released
    for (const e of enteredRows) enteredBy.set(e.itemId, [...(enteredBy.get(e.itemId) ?? []), e]);
    const wantedOf = (i: Item) => wanted.find((w) => w.subject === i.subjectId && w.kind === i.kind && w.key === i.itemKey);
    // C8.1: who signs each form item (SH3 R7, in words) and the steps done on a form signed by hand and scanned.
    const signPeople = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role, label: p.label, applies: p.applies }));
    const stepsOf = await signStepsOf(this.db, c.id);
    const minor = minorFromAnswers(answers, today); // Devin on #617: an adult dependent child signs their own form
    // C7.7 part 2: per form × person, the validated copy read back that counts (readBackOf: each copy judged on its newest
    // read-back, as the copy view and `lock` do; QA-165), current while the form's facts are what they were when it was read back.
    const reads = await this.db.validatedCopy.findMany({ where: { copy: { caseId: c.id } }, orderBy: [{ readAt: "desc" }, { id: "asc" }], select: { factsHash: true, sha256: true, readAt: true, readBack: true, copy: { select: { id: true, formNumber: true, subjectId: true, resultJson: true, configReleaseId: true, snapshot: { select: { factsJson: true } } } } } });
    // C9.5 (BR-6, challenge M4): a copy made on an earlier release of the case (before a move) whose form the move
    // changed is out of date because of the release: words that name both releases and what changed, never fact lines
    // (so never an Undo), and it never counts as current. Only after a move (more than one pin revision).
    // C7.8 (M1): release-to-release comparisons read the releases themselves, never the case's added forms (an added form
    // is the case's, so a newer release never "removes" it).
    const relSnap = this.r.releaseSnapshotOf(c);
    const pins = pinReleases(c), diffOf = diffCache(), curLabel = releaseLabel(pin.release);
    const releaseOfCopy = new Map<string, string>(reads.map((v) => [v.copy.id, v.copy.configReleaseId]));
    const releaseWords = (copy: string | null | undefined, form: string, what: string): string | null => {
      const rel = copy ? releaseOfCopy.get(copy) : undefined, old = rel && rel !== pin.configReleaseId ? pins.find((p) => p.id === rel) : undefined;
      return old ? releaseOutOfDate(diffOf(old.id, old.snapshot, pin.configReleaseId, relSnap).forms.get(form), { from: old.label, to: curLabel }, what) : null;
    };
    const readsOf = new Map<string, { copy: string; at: Date; factsHash: string; sha256: string; readBack: unknown }[]>();
    // Row C3 (review m1): a read-back of a copy stamped "Copy, not for filing" (made while the form was filed Online) never
    // counts, by the same rule as Validate and `lock` (copyNotForFiling): such rows were kept before Validate refused them.
    for (const v of reads) { if (copyNotForFiling(s, v.copy)) continue; const k = `${v.copy.formNumber}|${v.copy.subjectId}`; readsOf.set(k, [...(readsOf.get(k) ?? []), { copy: v.copy.id, at: v.readAt, factsHash: v.factsHash, sha256: v.sha256, readBack: v.readBack }]); }
    const paperValidated = (form: string, subject: string): PaperValidated => {
      const v = readBackOf(readsOf.get(`${form}|${subject}`) ?? [], formPassed);
      return v ? { copy: v.copy, at: v.at.toISOString(), current: v.factsHash === inputHash(covOf(form, subject)?.facts ?? []) && !releaseWords(v.copy, form, "validated copy") } : null;
    };
    // C8.3 QA-345: the fingerprint of the validated copy that counts for filing (the read-back paperValidated counts), else null.
    const validatedSha = (form: string, subject: string): string | null => paperValidated(form, subject)?.current ? readBackOf(readsOf.get(`${form}|${subject}`) ?? [], formPassed)?.sha256 ?? null : null;
    // C9.2 (BR-12): what each finished item read when it was finished (its copy's stored facts, or its entered section's
    // answers), to name each fact that changed since, with its old and new value and the date of the change.
    const printedCopy = (id: string) => stepsOf.get(id)?.print?.copy ?? null;
    const copyIds = [...new Set([...reads.map((v) => v.copy.id), ...stored.items.map((i) => printedCopy(i.id)).filter((x): x is string => !!x)])];
    const copyFacts = new Map((copyIds.length ? await this.db.formInstance.findMany({ where: { id: { in: copyIds } }, select: { id: true, configReleaseId: true, snapshot: { select: { factsJson: true } } } }) : [])
      .map((x) => { releaseOfCopy.set(x.id, x.configReleaseId); return [x.id, (x.snapshot?.factsJson ?? {}) as { facts?: FormFact[]; groups?: GroupFact[] }]; }));
    const scans = await this.db.signedScan.findMany({ where: { caseId: c.id }, orderBy: [{ uploadedAt: "desc" }, { id: "asc" }], select: { id: true, itemId: true, uploadedAt: true } });
    const questionWords = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    const placementWords = new Map<string, string>();
    for (const p of s.placements as { fact: string; question_text?: string | null }[]) if (p.question_text?.trim() && !placementWords.has(p.fact)) placementWords.set(p.fact, p.question_text.trim());
    const meaning = new Map((s.canonical_fields as { id: string; meaning?: string }[]).map((f) => [f.id, f.meaning ?? ""]));
    // A case-level fact is "about" "case" in a form's facts; its answers are stored on the case's own subject (as caseView
    // reads it). CI on #926: never sent to the database as a subject id.
    const caseSubject = people.find((p) => p.role === "case")?.subjectId ?? null;
    const subjectOfAbout = (about: string) => (about === "case" ? caseSubject ?? about : about);
    const answerOf = (about: string, fact: string) => answers.find((a) => a.subjectId === subjectOfAbout(about) && a.field === fact && !a.rowKey);
    const words: ChangeWords = {
      label: (fact) => questionWords.get(fact) || placementWords.get(fact) || meaning.get(fact) || fact,
      person: (about) => (about === REPRESENTATIVE ? "the representative" : label.get(subjectOfAbout(about)) || "the application"),
      at: (about, fact) => answerOf(about, fact)?.at ?? null,
      saved: (about, fact) => answerOf(about, fact)?.value ?? null,
    };
    const nowFacts = (form: string, subject: string) => covOf(form, subject)?.facts ?? [];
    const changesSince = (copy: string | null | undefined, form: string, subject: string) => {
      const then = copy ? copyFacts.get(copy) : undefined;
      if (!then) return { changes: [] as FactChange[], groups: [] as string[] };
      return { changes: factChanges(then.facts ?? [], nowFacts(form, subject), words), groups: changedGroups(then.groups, groupFacts(view, form, subject)) };
    };
    // The structured list the screen reads for "Undo this change" (one per person and fact; never the firm record's).
    // Review S1: never offered for the firm record's facts, a list entry or a declaration (the route refuses them).
    const placeOf = new Map((s.placements as { fact: string; repeats: string }[]).map((p) => [p.fact, p.repeats]));
    const typeOf = new Map((s.canonical_fields as { id: string; value_type?: string }[]).map((f) => [f.id, f.value_type ?? ""]));
    // A relative's fact (another person on the form, "<id>/parent_1") is changed where it is asked, not undone from here.
    const undoable = (x: FactChange) => x.about !== REPRESENTATIVE && !x.relation && UUID.test(subjectOfAbout(x.about)) && placeOf.get(x.fact) !== "per_row" && typeOf.get(x.fact) !== "declaration";
    // `undo`, `expected_id` and `restores` are filled once every item is worked out (one read of the answers' history).
    const changeList = (cs: FactChange[]): ChangeRow[] => cs.map((x) => ({ subject: subjectOfAbout(x.about), fact: x.fact, label: x.label, person: x.person, was: x.was, now: x.now, confirmed: x.confirmed, at: x.at, undo: undoable(x), expected_id: null, restores: null }));
    // C9 (QA-246, C7.7; VV-R07, VV-R09, VV-R10): a form whose line applies only on an answer not given yet names the
    // question it waits on, in the questionnaire's own words (never "N answers").
    const asksOf = (facts: string[]) => facts.map((fact) => ({ fact, question: words.label(fact) }));
    const waitWords = (facts: string[]) => facts.length ? `Cannot start yet: waits for the answer to ${asksOf(facts).map((q) => `"${q.question}"`).join(" and ")}, which decides whether it applies.` : "Cannot start yet: waits for an answer that decides whether it applies.";
    const staleOf = new Map<string, string[]>(); // C7.6: Online sections entered before a fact changed, per item
    const items = stored.items.flatMap((i) => {
      const w = wantedOf(i), base = { id: i.id, kind: i.kind as "form" | "document" | "step", filing: i.filingId, subject: i.subjectId, person: label.get(i.subjectId) ?? "", version: i.version };
      if (i.kind === "form") {
        const ch = channelOf(lines.get(i.itemKey), accepts.get(i.itemKey), own!.portalKey, i.channel);
        // QA-165 (#1318): the item's state waits on facts ("Waiting for N facts…"); a mandatory box left empty is not one: it is
        // its own CRITICAL line on Ready to file (blocksLock, the copy's lock rule too).
        const rd = { missing: formReady(i.itemKey, i.subjectId).missing.filter(blocksLock) };
        const waits = w?.applies === "cannot_tell";
        // C7.3: an Online form's answer sheet: Out of date when a section entered in the portal changed since (warns only,
        // FQ-6, P-168), Done when every section is entered and current.
        // QA-309: a section waits only for what this form's readiness names (never "none apply", answered rows or facts the
        // release never asks), so the sheet and the item read the same rule.
        const sheet = ch.channel === "ONLINE" ? sheetOf(i, s, people, answers, rows, view, enteredBy.get(i.id) ?? [], parts, rd.missing, covOf(i.itemKey, i.subjectId)) : null;
        const stale = sheet?.sections.filter((x) => x.out_of_date) ?? [];
        const fb = { ...base, form: i.itemKey, channel: ch.channel, line_channel: ch.line_channel, accepts: ch.accepts, accepts_quote: ch.accepts_basis?.quote ?? null, signature: ch.signature, signed_by: lines.get(i.itemKey)?.signed_by ?? null, channel_changed: i.channel ? { by: i.channelBy, at: i.channelAt?.toISOString() ?? null, reason: i.channelReason } : null };
        // C7.8 (B141 BR-5, BR-7): a blank official PDF the case officer added is filled by hand: To do until its completed
        // copy is uploaded (the one upload; it is also the signed copy when it is signed, M5), then Ready.
        const added = addedOn(s, i.itemKey, i.subjectId);
        if (added?.kind === "blank") {
          const scan = completedSince(scans.filter((x) => x.itemId === i.id), added);
          const signersB = signersOf(signPeople, i.subjectId, lines.get(i.itemKey)?.who ?? "each_applicant", lines.get(i.itemKey)?.signed_by, minor);
          return { ...fb, signers: signersB, blank: { addition: added.id, download: `/api/runtime/form-additions/${added.id}/blank`, completed: scan ? { id: scan.id, at: scan.uploadedAt.toISOString() } : null },
            state: scan && stepsOf.get(i.id)?.uploaded_to_ircc ? "done" : scan ? "ready" : "to_do",
            reason: scan && stepsOf.get(i.id)?.uploaded_to_ircc ? `${BLANK_WORDS.done}, and uploaded to IRCC.` : scan ? `${BLANK_WORDS.done} (${dayWords(scan.uploadedAt.toISOString())}). Upload it to IRCC once the filing is Ready to file.` : BLANK_WORDS.todo };
        }
        if (stale.length) staleOf.set(i.id, stale.map((x) => x.title));
        if (sheet && stale.length && !waits) {
          // C9.2: each stale section's answers as entered, against what it shows now (warns only, FQ-6, P-168).
          const ticks = enteredBy.get(i.id) ?? [];
          const changes = stale.flatMap((x) => {
            const e = ticks.find((t) => t.sectionKey === x.key), then = ((e?.snapshot.factsJson ?? {}) as { answers?: { fact: string; subject: string; row: number | null; value: unknown; label?: string; recorded?: true; nothing_recorded?: true }[] }).answers ?? [];
            // QA-392, QA-392b: a "recorded" Yes/No is named by the form's question it answers, never the list's column (a
            // tick saved before QA-392b marks it `nothing_recorded`).
            const own = (a: { label?: string; recorded?: true; nothing_recorded?: true }) => ((a.recorded || a.nothing_recorded) && a.label ? `“${a.label}”` : undefined);
            return factChanges(then.map((a) => ({ fact: a.fact, about: a.subject, row: a.row, value: a.value, label: own(a) })), x.answers.map((a) => ({ fact: a.fact, about: a.subject, row: a.row, value: a.value, label: own(a) })), words);
          });
          const first = ticks.filter((t) => stale.some((x) => x.key === t.sectionKey)).map((t) => t.enteredAt).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
          // Review B1 on #861: this line names who signs too (readiness reads it).
          return { ...fb, signers: signersOf(signPeople, i.subjectId, lines.get(i.itemKey)?.who ?? "each_applicant", lines.get(i.itemKey)?.signed_by, minor), state: "out_of_date", reason: outOfDateReason("entered", `${i.itemKey} (${stale.map((x) => x.title).join(", ")})`, first, changes), changes: changeList(changes) };
        }
        // Review M2: Done only when every section is entered, current and waits for nothing, and (QA-309) the form's
        // readiness names nothing either.
        const allEntered = !!sheet && sheet.sections.length > 0 && sheet.sections.every((x) => x.entered && !x.out_of_date && !x.waiting.length) && !rd.missing.length;
        const signers = signersOf(signPeople, i.subjectId, lines.get(i.itemKey)?.who ?? "each_applicant", lines.get(i.itemKey)?.signed_by, minor);
        // C8.1: a form signed by hand and scanned is Ready once its signed scan is in, Done once uploaded to IRCC.
        const signed = !waits && ch.signature === "HAND_SCANNED" ? signedState(stepsOf.get(i.id) ?? {}, i.itemKey) : null;
        if (signed) {
          // C9.5 (BR-6, challenge M4): signed on a copy made on the release the case left, whose form the move changed: out
          // of date because of the release (no fact lines, no Undo); a new signed copy is asked for on this release.
          const relSigned = releaseWords(printedCopy(i.id), i.itemKey, "signed form");
          if (relSigned) {
            const scan = scans.find((x) => x.itemId === i.id) ?? null;
            const old = { ...fb, signers, ...signed, state: "out_of_date", reason: relSigned, release_out_of_date: true as const };
            if (signed.state === "done") return old;
            return [{ ...old, id: scan?.id ?? i.id, item: i.id, record: "signed_scan" as const },
              { ...fb, signers, state: "to_do", replaces: scan?.id ?? null, reason: `A new signed ${i.itemKey} is needed: the signed one was made on an earlier release that ${curLabel} changes. Print the new copy, have it signed and upload the scan.` }];
          }
          // C9.2 (BR-12, BR-20): the signed form is never changed; when a fact on the copy that was printed and signed
          // changed since (the representative of record among them), it is Out of date and a new signed one is asked for.
          const { changes, groups: groupsChanged } = changesSince(printedCopy(i.id), i.itemKey, i.subjectId);
          if (!changes.length && !groupsChanged.length) return { ...fb, signers, ...signed };
          const scan = scans.find((x) => x.itemId === i.id) ?? null, rep = changes.filter((x) => x.about === REPRESENTATIVE);
          const extra = [...(rep.length ? [representativeWords(null, null, rep[0].at)] : []), ...groupsChanged.map((g) => `${g} changed`)];
          const old = { ...fb, signers, ...signed, state: "out_of_date", reason: outOfDateReason("signed_scan", i.itemKey, scan?.uploadedAt ?? null, changes, extra), changes: changeList(changes) };
          // Uploaded to IRCC already: the item itself is out of date (what to do after filing is C8.2's record, BR-12).
          if (signed.state === "done") return old;
          // Otherwise the signed scan is listed as the out-of-date record (its own id, the item named), and the item asks
          // for a new signed copy: printing a new copy starts its signing steps again (sign-steps.ts).
          return [{ ...old, id: scan?.id ?? i.id, item: i.id, record: "signed_scan" as const },
            { ...fb, signers, state: "to_do", replaces: scan?.id ?? null, reason: `A new signed ${i.itemKey} is needed: the signed one is out of date (${rep.length ? representativeWords(null, null, rep[0].at) : changes.length ? changes.slice(0, 2).map((x) => `${x.label.charAt(0).toLowerCase()}${x.label.slice(1)} of ${x.person}`).join(", ") + " changed" : "a fact it reads changed"}). Print the new copy, have it signed and upload the scan.` }];
        }
        // C7.7 part 2 (r5c BR-8, P-144): a Paper line with its barcode page and its steps, in order.
        // C9.2: a validated copy read back that no longer matches the case is Out of date, naming what changed.
        const validated = !waits && ch.channel !== "ONLINE" ? paperValidated(i.itemKey, i.subjectId) : null;
        // C9.5 (BR-6, challenge M4): a validated copy made on the release the case left, whose form the move changed.
        const relValidated = validated ? releaseWords(validated.copy, i.itemKey, "validated copy") : null;
        if (relValidated) return { ...fb, signers, validated, state: "out_of_date", reason: relValidated, release_out_of_date: true as const };
        const since = validated && !validated.current ? changesSince(validated.copy, i.itemKey, i.subjectId) : null;
        // Only a change it can name marks it (C8.2 break M4: the same value typed again is no change); a Paper line keeps
        // its own Validate-again rule (C7.7, paperLine).
        const staleCopy = since && (since.changes.length || since.groups.length || ch.channel === "PAPER") ? since : null;
        const staleWords = (next?: string) => staleCopy ? { reason: outOfDateReason("validated_copy", i.itemKey, validated!.at, staleCopy.changes, staleCopy.groups.map((g) => `${g} changed`), next), changes: changeList(staleCopy.changes) } : {};
        if (ch.channel === "PAPER" && !waits) {
          // B132: the recorded Printed and Signed in pen; on a barcode form only those done on its current validated copy
          // (Devin on #1278: a newer read-back is not signed by an earlier print), so readiness never counts an old signature.
          const pen = stepsOf.get(i.id), barcodeForm = isBarcodeForm(i.itemKey);
          const penDone = !barcodeForm || (validated?.current && pen?.print?.copy === validated.copy) ? pen : undefined;
          const line = paperLine(i.itemKey, { barcode: barcodeForm, missing: rd.missing.length, validated, signers, done: penDone });
          // C7.7 (P-144): a Paper line keeps its own next step (a new barcode page), after the words of what changed.
          return { ...fb, signers, ...line, ...(line.state === "out_of_date" ? staleWords("Make a new copy, press Validate again (a new barcode page) and read it back before you print, or undo the change.") : {}) };
        }
        if (staleCopy) return { ...fb, signers, validated, state: "out_of_date", ...staleWords() };
        return { ...base, form: i.itemKey, channel: ch.channel, line_channel: ch.line_channel, accepts: ch.accepts, accepts_quote: ch.accepts_basis?.quote ?? null, signature: ch.signature, signed_by: lines.get(i.itemKey)?.signed_by ?? null, signers,
          channel_changed: i.channel ? { by: i.channelBy, at: i.channelAt?.toISOString() ?? null, reason: i.channelReason } : null,
          state: waits ? "cannot_start" : allEntered ? "done" : "to_do", reason: allEntered && !waits ? "Every section is entered in the portal, with every answer confirmed and current." : waits ? waitWords(w?.missing ?? []) : sheet ? sheetWords(sheet, rd.missing) : rd.missing.length ? `Waiting for ${rd.missing.length} fact${rd.missing.length === 1 ? "" : "s"} to answer or confirm.` : "Every fact it reads is confirmed." };
      }
      if (i.kind === "document") return { ...base, document_type: w?.document_type ?? i.itemKey, label: w?.label ?? i.itemKey, state: "to_do", reason: "Not requested yet (the checklist, C6.4)." };
      return { ...base, step: BIOMETRICS_STEP.label, neededBefore: "after_filing" as const, state: "cannot_start", reason: w?.applies === "cannot_tell" ? biometricsWaits(bio) : BIOMETRICS_STEP.after };
    });
    // C6.11 (VV-R10, BR-20): a form that names the representative (IMM 5476's licence part, the library's representative.*
    // facts, from the firm record) says which representative of record it is for, so a change of representative shows on
    // the item that needs a new one. A form reading only a person's name and address about the representative (IMM
    // 5475's designated individual, break M3) is not tagged.
    const repOfRecord = (await this.db.caseTeamMember.findFirst({ where: { caseId: c.id, role: "LEAD_REPRESENTATIVE", endedAt: null }, select: { userId: true } }))?.userId ?? null;
    const namesRep = new Map<string, boolean>();
    for (const i of items) {
      if (i.kind !== "form" || !("form" in i) || !i.form) continue;
      const k = `${i.form}|${i.subject}`;
      if (!namesRep.has(k)) namesRep.set(k, nowFacts(i.form, i.subject).some((f) => f.about === REPRESENTATIVE && f.fact.startsWith("representative.")));
      if (namesRep.get(k)) Object.assign(i, { representative: repOfRecord });
    }
    // C9.2 review M1, M2: what Undo would put back for each change (the same rule as the route: the newest earlier value
    // that differs, undoTarget) and the answer the officer saw, so the screen names the real value and a stale tab gets 409.
    const rowsOfChanges = items.flatMap((x) => ((x as { changes?: ChangeRow[] }).changes ?? []).filter((y) => y.undo && UUID.test(y.subject)));
    if (rowsOfChanges.length) {
      const pairs = [...new Map(rowsOfChanges.map((y) => [`${y.subject}|${y.fact}`, { subjectId: y.subject, canonicalFieldKey: y.fact, rowKey: null }])).values()];
      const hist = await this.db.clientCanonicalAnswer.findMany({ where: { OR: pairs }, orderBy: [{ effectiveAt: "desc" }, { id: "desc" }], select: { id: true, subjectId: true, canonicalFieldKey: true, valueJson: true, supersededById: true, sourceJson: true } });
      for (const y of rowsOfChanges) {
        const mine = hist.filter((h) => h.subjectId === y.subject && h.canonicalFieldKey === y.fact).map((h) => ({ ...h, value: h.valueJson, restoredFrom: restoredFromOf(h.sourceJson) }));
        const cur = mine.find((h) => !h.supersededById), target = cur ? undoTarget(cur, mine.filter((h) => h.id !== cur.id)) : null;
        y.expected_id = cur?.id ?? null; y.restores = target ? target.value : null; y.undo = !!target;
      }
    }
    // C9 (QA-246, C7.7): the forms to fill and, apart, the forms not yet known. A form that cannot start yet (an answer
    // decides whether it applies) is never a form to fill and never counted as one: it is listed in `waiting`, naming the
    // question it waits on. Readiness still reads it (break B3: a CRITICAL line on its filing until that answer is in),
    // and the C8.2 overlay sees every item as before. A conditional form answered so that it does not apply is listed in
    // `not_needed`, with its reason, so it never just disappears.
    const notYetKnown = (i: (typeof items)[number]) => i.kind === "form" && i.state === "cannot_start";
    const toFill = items.filter((i) => !notYetKnown(i));
    const waiting = items.filter(notYetKnown).map((i) => Object.assign(i, { waits_on: asksOf(wanted.find((x) => x.subject === i.subject && x.kind === "form" && x.key === ("form" in i ? i.form : null))?.missing ?? []) }));
    const notNeeded = notNeededForms(s, renderPeople, known, r.forms as RenderedForm[], lines, new Set(filers), ages, people.find((p) => p.role === "case")?.subjectId ?? null, clean, words.label, label);
    // Stage 1 (C7.7): the facts each filing's forms to fill still wait for, counted before any item.
    const stage1 = filings.map((f) => { const mine = toFill.filter((i) => i.filing === f.id && i.kind === "form") as { form: string; subject: string }[]; const missing = new Set(mine.flatMap((i) => formReady(i.form, i.subject).missing.filter(blocksLock).map((m) => `${m.about}|${m.fact}`))); return { filing: f.id, to_confirm: missing.size, confirmed: mine.length && !missing.size ? 1 : 0 }; });
    // C7.6 (L-SA3, P-315): each filing's blocks and warnings from engine/runtime/readiness.ts, on this view's own items.
    // The edition a form is filled on: the release's PDF edition in use (pdfMapInUse, P-32: the newest, as the fill picks
    // it; review M2 on #861); on a line filed Online, its online version, else the PDF edition its answer sheet follows
    // (C7.3 order_basis pdf_twin).
    const maps = ((s as { field_maps?: { form_number: string; form_edition: string; channel?: string }[] }).field_maps ?? []);
    const pdfOf = (form: string) => pdfMapInUse(maps, form)?.form_edition ?? null;
    const editionOf = (form: string, channel: string) => (channel === "ONLINE" ? maps.find((m) => m.form_number === form && m.channel === "ONLINE")?.form_edition : null) ?? pdfOf(form);
    const docLine = (subject: string, type: string) => (docs.get(subject) as { document_type: string; required: boolean; never_waivable: boolean; never_if?: string[] }[] | undefined)?.find((x) => x.document_type === type);
    // Break B3: "cannot start" ones too. Review m7: built field by field, so a line missing a field is a type error, not a 500.
    // C9.2 (BR-12, P-136, P-237): an out-of-date validated, signed or uploaded item is a CRITICAL "out of date" line on its
    // filing (an Online section entered before a change warns, enteredStale). A signed scan's own out-of-date record is
    // not a form of its own: its mark goes on its item, which asks for a new signed copy.
    const records = new Map(items.flatMap((i) => ("record" in i && i.record === "signed_scan" && "item" in i ? [[i.item as string, i]] : [])));
    const markOf = (i: (typeof items)[number] | undefined) => {
      if (!i || i.state !== "out_of_date" || ("channel" in i && i.channel === "ONLINE")) return null;
      // C9.5 (BR-6): out of date because of the release: the release's words, keyed by the pin revision (a pass covers it
      // until the next move), never a fact.
      if ("release_out_of_date" in i && i.release_out_of_date) return { fact: "the release", since: pin.pinnedAt.toISOString(), key: `release|${pin.revision}`, words: "reason" in i ? String(i.reason) : undefined };
      const cs = (i as { changes?: ChangeRow[] }).changes ?? [];
      // bot review on #926: the warning's identity is every change with its value now (a pass never covers a later change);
      // its date is the latest change's.
      // A repeating group's state now is in it too (bot review on #926: a group-only change has no fact change to name).
      const groupsNow = "form" in i && i.form ? groupFacts(view, i.form, i.subject) : [];
      const key = markKey(cs, groupsNow);
      const since = cs.map((x) => x.at).filter((x): x is string => !!x).sort().at(-1) ?? today.toISOString();
      return { fact: cs.length ? `${cs[0].label}${cs.length > 1 ? ` and ${cs.length - 1} more` : ""}` : "a fact it reads", since, key };
    };
    // C7.8 (B141 BR-7): each item of a form the case officer added says so ("Added by the case officer": who, when, why).
    for (const i of items) {
      if (i.kind !== "form" || !("form" in i) || !i.form) continue;
      const a = addedOn(s, i.form, i.subject);
      if (a) Object.assign(i, { added: { id: a.id, tag: ADDED_TAG, kind: a.kind, by: a.by, at: a.at, reason: a.reason, edition: a.edition, words: `${ADDED_TAG} on ${dayWords(a.at)}. Not part of the combination.` } });
    }
    const formItems: PreparedForm[] = items.flatMap((i) => i.kind === "form" && "form" in i && i.form && !("record" in i) ? [{ id: i.id, filing: i.filing, subject: i.subject, person: i.person, form: i.form,
      ...("blank" in i && i.blank ? { blank: { completed: !!i.blank.completed, key: i.blank.addition } } : {}),
      channel: i.channel, signature: i.signature, signed_by: i.signed_by, signers: "signers" in i ? i.signers : [], state: i.state, reason: i.reason,
      steps: "steps" in i ? (i.steps as PreparedForm["steps"]) : undefined, outOfDate: markOf(i) ?? markOf(records.get(i.id)) }] : []);
    const docItems = items.filter((i) => i.kind === "document") as { id: string; filing: string; subject: string; person: string; document_type: string; label: string }[];
    // C9.5 (BR-6, challenge M5): after a move, a review with the same facts counts only if made after the move or the
    // move touched nothing on its filing. (BR-8, challenge M6): while a newer release is out, only the filings it would
    // change warn, naming what it changes (passable with a reason, never a block).
    const st = { people, answers, rows, groups: groupAnswers }, forTouch = filings.map((f) => ({ id: f.id, people: f.applicants.map((a) => a.subject) }));
    const prev = pins[1];
    // Review m4 (round 1): every move made after the review counts, not only the newest: a review withdrawn by one move
    // never comes back with a later move that leaves its filing alone. Moves are read newest first (pins is ordered).
    const movedTouch = new Map<number, Map<string, string[]>>();
    const touchedBy = (k: number) => { if (!movedTouch.has(k)) { const to = pins[k], from = pins[k + 1]; movedTouch.set(k, touchedFilings(diffOf(from.id, from.snapshot, to.id, to.snapshot), caseInputs(from.snapshot, to.snapshot, own!.combinationKey, st, today, true), forTouch, { to: to.label })); } return movedTouch.get(k)!; };
    const reviewAfterMove = prev ? (filing: string, reviewedAt: Date) => {
      for (let k = 0; k < pins.length - 1 && pins[k].pinnedAt.getTime() >= reviewedAt.getTime(); k++) {
        const t = touchedBy(k).get(filing) ?? [];
        if (!reviewCounts({ hashEqual: true, reviewedAt, pinnedAt: pins[k].pinnedAt, revision: pins[k].revision, touched: t.length > 0 }))
          return `The case moved to ${pins[k].label}, which changes this filing (${t.slice(0, 2).join("; ")}${t.length > 2 ? ` and ${t.length - 2} more` : ""})`;
      }
      return null;
    } : undefined;
    const target = await targetRelease(this.db, c);
    const pending = target ? touchedFilings(diffOf(pin.configReleaseId, relSnap, target.id, target.snapshot), caseInputs(relSnap, target.snapshot, own!.combinationKey, st, today, true), forTouch, { to: target.label }) : null;
    const recordedFiling = new Set(stored.filings.filter((f) => f.status === "SUBMITTED").map((f) => f.id));
    const releaseUpdate = pending ? (filing: string) => {
      const w = recordedFiling.has(filing) ? [] : pending.get(filing) ?? []; // break m2: a recorded filing stays on its release
      return w.length ? { key: String(target!.version), words: `${target!.label} of ${s.combination.label} is out and changes this filing: ${w.slice(0, 2).join("; ")}${w.length > 2 ? ` and ${w.length - 2} more` : ""}. This filing is on ${curLabel}. Move the case from the notice under its header, or pass this warning with a reason.` } : null;
    } : undefined;
    // C9.5 (BR-4, BR-6): a form whose newest copy was made on the release the case left, and which the move changed,
    // says so on its item (to fill again, or filed another way now), until the officer makes a copy on this release.
    if (prev) {
      const newest = new Map<string, { id: string; configReleaseId: string }>();
      for (const x of await this.db.formInstance.findMany({ where: { caseId: c.id, status: "GENERATED", configReleaseId: { in: c.pins.map((p) => p.configReleaseId) } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, formNumber: true, subjectId: true, configReleaseId: true } }))
        if (!newest.has(`${x.formNumber}|${x.subjectId}`)) newest.set(`${x.formNumber}|${x.subjectId}`, x);
      for (const i of items) {
        if (i.kind !== "form" || !("form" in i) || !i.form || i.state === "out_of_date") continue;
        const x = newest.get(`${i.form}|${i.subject}`), old = x && x.configReleaseId !== pin.configReleaseId ? pins.find((p) => p.id === x.configReleaseId) : undefined;
        let note = old ? draftNote(diffOf(old.id, old.snapshot, pin.configReleaseId, relSnap).forms.get(i.form), { from: old.label, to: curLabel }) : null;
        // Review m3 (round 1): sections entered in the portal before the move, on a form the move changed, are marked by
        // the release too (no fact lines, no Undo; the entries themselves are never changed).
        const entered = "channel" in i && i.channel === "ONLINE" ? (enteredBy.get(i.id) ?? []).filter((e) => e.enteredAt.getTime() < pin.pinnedAt.getTime()) : [];
        if (!note && entered.length) note = releaseOutOfDate(diffOf(prev.id, prev.snapshot, pin.configReleaseId, relSnap).forms.get(i.form), { from: prev.label, to: curLabel }, "entry in the IRCC account");
        if (note) Object.assign(i, { release_note: note, ...(entered.length && !old ? { release_out_of_date_entered: true } : {}) });
      }
    }
    // C7.7 (BR-9, C7.7-18): the boxes the newest copy of each form on this release leaves "To write by hand", in the
    // copy's own words (the question's label, else "A form field"; why, without engine words: fill-case.ts plainWhy).
    // The newest copy, current or not, is the one that would be filed, so a stale copy never hides its by-hand boxes; a
    // newest copy that is "Copy, not for filing" (made while the line was Online) raises none (review m4). Review m5: the
    // newest copy per form and person is picked first, and only those copies' results are read.
    const askedAs = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    const newestCopy = new Map<string, string>();
    for (const x of await this.db.formInstance.findMany({ where: { caseId: c.id, status: "GENERATED", configReleaseId: pin.configReleaseId }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, formNumber: true, subjectId: true } }))
      if (!newestCopy.has(`${x.formNumber}|${x.subjectId}`)) newestCopy.set(`${x.formNumber}|${x.subjectId}`, x.id);
    const handOf = new Map<string, { copy: string; box: string; label: string; why: string; caption?: string | null }[]>();
    // Breaker M3: each box's own caption from the form's field list, read once a form. Devin on #1331: the field list of the
    // PDF edition the copy was filled on: the copies here are this release's, and the fill takes pdfMapInUse (P-32), so
    // the same map is read here, never simply the first edition listed.
    const captionsOf = new Map<string, Map<string, string>>();
    const captionOf = (form: string, box: string) => {
      if (!captionsOf.has(form)) { const file = pdfMapInUse(s.field_maps as FieldMap[], form)?.inventory_file; captionsOf.set(form, new Map((file ? inventoryOf(file)?.fields ?? [] : []).flatMap((x) => (x.data_path && x.caption ? [[x.data_path, x.caption] as [string, string]] : [])))); }
      return captionsOf.get(form)!.get(box) ?? null;
    };
    for (const x of newestCopy.size ? await this.db.formInstance.findMany({ where: { id: { in: [...newestCopy.values()] } }, select: { id: true, formNumber: true, subjectId: true, resultJson: true, snapshot: { select: { factsJson: true } } } }) : []) {
      if (copyNotForFiling(s, x)) continue;
      const boxes = ((x.resultJson as { boxes?: { box: string; fact: string | null; result: string; why: string | null }[] } | null)?.boxes ?? []);
      handOf.set(`${x.formNumber}|${x.subjectId}`, boxes.filter((b) => b.result === "by hand").map((b) => ({ copy: x.id, box: b.box, label: (b.fact && askedAs.get(b.fact)) || "A form field", why: plainWhy(b.why), caption: captionOf(x.formNumber, b.box) })));
    }
    // B162 (review M1, m2; breaker M1, M2 on #1344): the newest copy for filing of each form for each person, made on any
    // release of the case (a move never takes a made copy away; C9.5 BR-4), a newer "Copy, not for filing" never hiding
    // an older one for filing. It counts only while it holds today's facts (its fingerprint equals the form's facts now,
    // as the copy view reads it): a copy made before the answers, or before a fact changed, is "older than today's facts".
    // One read of each copy's flag, channel and fingerprint; never the copies' whole results.
    const copyRows = await this.db.$queryRaw<{ id: string; form_number: string; subject_id: string; not_for_filing: boolean | null; channel: string | null; input_hash: string; groups: GroupFact[] | null }[]>`SELECT f.id, f.form_number, f.subject_id, (f.result_json->>'not_for_filing')::boolean AS not_for_filing, s.facts_json->>'channel' AS channel, s.input_hash, s.facts_json->'groups' AS groups FROM form_instance f JOIN answer_snapshot s ON s.id = f.snapshot_id WHERE f.case_id = ${c.id}::uuid AND f.status = 'GENERATED' AND f.config_release_id = ANY(${c.pins.map((p) => p.configReleaseId)}::uuid[]) ORDER BY f.created_at DESC, f.id ASC`; // C6.17 (BR-7, breaker M2): the current stage's releases only
    const forFiling = new Map<string, { id: string; hash: string; groups: GroupFact[] | null }>();
    for (const x of copyRows) {
      const k = `${x.form_number}|${x.subject_id}`;
      if (forFiling.has(k) || copyNotForFiling(s, { formNumber: x.form_number, resultJson: x.not_for_filing === null ? null : { not_for_filing: x.not_for_filing }, snapshot: { factsJson: x.channel ? { channel: x.channel } : null } })) continue;
      forFiling.set(k, { id: x.id, hash: x.input_hash, groups: x.groups });
    }
    // Devin on #1344: current only when the facts and the repeating groups it reads are both unchanged (copyStateOf).
    const copyOf = (form: string, subject: string) => copyStateOf(forFiling.get(`${form}|${subject}`), { hash: inputHash(covOf(form, subject)?.facts ?? []), groups: groupFacts(view, form, subject) }, pin.configReleaseId);
    // Breaker N1 (#861 round 2): the confirmed values the form writes, and every fact it still waits for with its
    // answer as given now (an unconfirmed change is a change the representative did not review).
    // C9.5 build discovery: the answers are read with no order (runtime.ts `state`), so two reads could list the same
    // answers in another order and give another fingerprint, withdrawing a review nobody's facts changed: sorted.
    const formHash = (form: string, subject: string) => createHash("sha256").update(`${inputHash(covOf(form, subject)?.facts ?? [])}|${waitingFactsKey(formReady(form, subject).missing, answers)}`).digest("hex");
    // C7.9 (review M1 on #1282): answers read as knownOf reads them: the application's subject as "case", relatives under
    // their own key (state() keys them), removed rows never.
    const reading = { aboutOf: (id: string) => (people.find((p) => p.subjectId === id)?.role === "case" ? "case" : id), liveRows: new Set(rows.map((x) => x.rowKey)) };
    // M3-S4 break M1: a never waivable line that may be needed (its condition waits for an answer) blocks its person's
    // filing until the answer decides it, so Ready to file is never reached around it.
    const waitingNever = list.people.flatMap((p) => p.waiting.filter((l) => l.never_waivable).flatMap((l) => {
      const filing = filings.find((f) => f.applicants.some((a) => a.subject === p.subject))?.id;
      const ask = l.missing.filter((m) => !m.answered).map((m) => m.question);
      return filing ? [{ subject: p.subject, person: p.label, filing, document_type: l.document.key, label: l.label, required: false, never_waivable: true, waiting: ask.length ? ask.join(", ") : "the questions its condition reads" }] : [];
    }));
    const readiness = await readinessOfCase(this.db, { workspaceId: c.workspaceId, caseId: c.id, filings: filings.map((f) => f.id), forms: formItems, reviewAfterMove, releaseUpdate,
      byHand: (form, subject) => handOf.get(`${form}|${subject}`) ?? [],
      copy: copyOf,
      documents: docItems.map((d) => ({ subject: d.subject, person: d.person, filing: d.filing, item: d.id, document_type: d.document_type, label: d.label, required: docLine(d.subject, d.document_type)?.required ?? true, never_waivable: docLine(d.subject, d.document_type)?.never_waivable ?? false, ...(docLine(d.subject, d.document_type)?.never_if?.length ? { waiting: docLine(d.subject, d.document_type)!.never_if!.join(", ") } : {}) }) as ReadinessInputs["documents"][number]).concat(waitingNever), // M3-S4
      factsOf: (form, subject) => formReady(form, subject),
      // C7.9 (P-242): the must-verify facts this form writes from an unchecked client-given value.
      unverifiedOf: (form, subject) => unverifiedOf(s, answers, formCoverage(s, people, answers, rows, form, subject)?.facts ?? [], reading), owesFact: (fact, subject) => (subject !== REPRESENTATIVE && isClientField(s, fact) ? "client" : "staff"), // B107: the representative's facts are the firm record's
      validatedCurrent: (form, subject) => !!paperValidated(form, subject)?.current, validatedSha, scanned: (item) => !!stepsOf.get(item)?.scan_received,
      editionOf, enteredStale: staleOf, barcode: isBarcodeForm, factsHash: formHash, today });
    // C8.3 (B144, B2): each form's facts for the review's freeze and stamp, from this very pass.
    sink?.({ answers, words, caseSubject, valueWords: (fact, v) => (v === null || v === undefined || v === "" ? "no answer" : typeof v === "object" ? null : answerWords(s, fact, v)), forms: formItems.map((f) => ({ item: f.id, filing: f.filing, form: f.form, subject: f.subject, person: f.person, channel: f.channel, state: f.state,
      waits: f.state === "cannot_start", hash: f.state === "cannot_start" ? null : formHash(f.form, f.subject), inputHash: inputHash(covOf(f.form, f.subject)?.facts ?? []), facts: covOf(f.form, f.subject)?.facts ?? [],
      validated: paperValidated(f.form, f.subject), validatedSha: validatedSha(f.form, f.subject), forFiling: forFiling.get(`${f.form}|${f.subject}`) ?? null,
      // C8.3 (CI on #1247, BR-8): every fact the form reads, confirmed (its facts) or not yet (what it waits for), as
      // "<subject or relative key>|<fact>", so an answer typed but not confirmed still counts as typed by its typist.
      reads: [...new Set([...(covOf(f.form, f.subject)?.facts ?? []).map((x) => `${x.about === "case" ? caseSubject ?? x.about : x.about}|${x.fact}`), ...(f.state === "cannot_start" ? [] : formReady(f.form, f.subject).missing).map((m) => `${m.subject === "case" ? caseSubject ?? m.subject : m.subject ?? f.subject}|${m.fact}`)])] })) });
    // C7.6: a filing marked Ready to file (or later) says so; before that, the derived status (Not started). Break B1 on
    // #861: a filing marked Ready to file that is no longer ready (a fact changed, the barcode copy is out of date, a new
    // warning) goes back to Not started, recorded, so nothing downstream trusts a stale "Ready to file".
    const statusOf = new Map(stored.filings.map((f) => [f.id, f.status]));
    for (const f of filings) {
      if (!noWrite && statusOf.get(f.id) === "READY_TO_FILE" && readiness.find((x) => x.filing === f.id)?.ready === false) {
        const n = await this.db.filing.updateMany({ where: { id: f.id, status: "READY_TO_FILE" }, data: { status: "NOT_STARTED" } });
        if (n.count) await this.audit.log(c.workspaceId, actor.id, "ready_to_file_reopened", "filing", f.id, `A filing on case ${short(c.id)} is no longer Ready to file: something changed after it was marked (C7.6).`);
        statusOf.set(f.id, "NOT_STARTED");
      }
      const st = statusOf.get(f.id); if (st && st !== "NOT_STARTED") f.status = st.toLowerCase();
    }
    // Review r3 m1: the version from the very rows this view shows (never a later read), so a write from it is checked
    // against what the officer saw.
    // C9.5 (break m9): the pin revision is part of the version, so a write from a screen read before a move (record, split,
    // channel) is refused under the case's row lock, as Fill is.
    const version = withRevision(versionOf(stored.filings, stored.items), pin.revision);
    const peopleView = people.filter((p) => p.role !== "case").map((p) => { const f = filings.find((x) => x.applicants.some((a) => a.subject === p.subjectId) || x.owner?.subject === p.subjectId); const nf = done.not_filing.find((x) => x.subject === p.subjectId); return { subject: p.subjectId, label: p.label, role: p.role, applies: p.applies, age: ages.get(p.subjectId) ?? null, filing: f?.id ?? null, why: nf?.why ?? null }; });
    // C8.2 (BR-12, BR-15): a recorded filing reads "submitted" with its record; a form filed with a fact changed since reads
    // "Filed with an earlier value" and opens its task (api/src/submission-record.ts).
    const questionOf = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    const tasks = noWrite ? [] : await recordedOverlay(this.db, { workspaceId: c.workspaceId, caseId: c.id, actor: actor.id, filings, items: items as never, label,
      nowOf: (form, subject) => currentValues(covOf(form, subject)?.boxes ?? []), labelOf: (fact) => questionOf.get(fact) ?? factWords(fact) });
    return { case_id: c.id, reference: caseName(c), release_version: pin.release.version, derived: true, combination: own!.combinationKey, portal: own!.portalKey ?? null, portal_words: own!.portalKey ? `Filed ${filedThrough(own!.portalKey)}: set by the combination, not on the case` : null,
      // #325's list of people with no filing, each with the reason (kept for its readers and tests).
      not_filing: done.not_filing,
      people: peopleView, filings, groups, items: toFill, waiting, not_needed: notNeeded, fees, stage1, readiness: readiness.map(({ figure: _f, ...x }) => ({ ...x, pin_revision: pin.revision })),
      // C7.10 (B143; AG-7-27, BR-30): each filing's readiness figure with its counted items and the rule, and the case's
      // lowest state and lowest figure (each naming its filing), for the Ready to file panel, the case header and the
      // team's header. Beside `readiness[]`, never inside it (C7.6's entries carry no percentage).
      // Challenge M2: a filing recorded as submitted is marked so and never holds the case's lowest.
      figures: readiness.map((x) => ({ ...x.figure, submitted: recordedFiling.has(x.filing) })), case_figure: lowestOf(readiness.map((x) => ({ ...x.figure, submitted: recordedFiling.has(x.filing) }))), pin_revision: pin.revision, currency: done.currency, fees_worked_out: done.fees_worked_out, fees_why: done.fees_why, basis: done.basis, version, tasks };
  }

  /** C6.12 (BR-16): split one filing out of a group, with a reason (the family maximum it loses is said first). The
   *  version, the group's size and the filing's place are all checked under the case's row lock (review M1, break M1):
   *  two splits from one read never both pass, so a family group is never emptied. */
  async split(actor: Actor, groupId: string, body: unknown) {
    const g = await this.db.submissionGroup.findUnique({ where: { id: idOf(groupId, "submission group") } });
    if (!g) fail("No such submission group.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, g!.caseId, "officer");
    const b = parse(SplitBody, body);
    await refuseIfRecorded(this.db, (await this.db.filing.findMany({ where: { submissionGroupId: g!.id }, select: { id: true } })).map((f) => f.id).concat(UUID.test(String(b.filing)) ? [b.filing] : []), "the submission group"); // C8.2-9
    const now = await this.build(actor, c);
    const group = now.groups.find((x) => x.id === g!.id);
    if (!b.reason) {
      const rules = (rulesFrom(FEE_TABLE, now.combination ?? "")?.fees ?? []).filter((x) => x.basis === "family_maximum"); // break r1: the capped lines from the table, never keys in code
      // Break on #500 m6: with no capped line there is no maximum to name.
      refuse(400, "reason", rules.length ? `Give a reason to split this filing out: it is then priced on its own, and the family maximum (${rules.map((r) => `${r!.label} ${cad(r!.familyMaxCents)} for ${r!.familyFrom} or more`).join(", ")}) of ${group ? "this group" : "the family"} no longer covers it.`
        : "Give a reason to split this filing out: it is then sent on its own.");
    }
    const moved = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) return "stale" as const;
      const members = await tx.filing.findMany({ where: { submissionGroupId: g!.id, active: true }, select: { id: true, subjectId: true, mode: true } });
      await refuseIfRecorded(tx, members.map((m) => m.id), "the submission group"); // C8.2-9, under the case's row lock
      const f = members.find((x) => x.id === b.filing);
      if (!f) return "not_in_group" as const;
      // C11.12 BR-4: a sponsorship is sent with the principal's application; neither is split from the other (break m5:
      // anyone else's own filing still may be).
      const principalSubject = c.participants.find((p) => p.role === "principal")?.subjectId;
      if (members.some((x) => x.mode === "co_filed") && (f.mode === "co_filed" || f.subjectId === principalSubject)) return "co_filed" as const;
      if (members.length < 2) return "alone" as const;
      const own = await tx.submissionGroup.create({ data: { workspaceId: c.workspaceId, caseId: c.id, stageId: c.stage.id, kind: "SEPARATE", reason: b.reason!, createdBy: actor.id } });
      await tx.filing.update({ where: { id: f.id }, data: { submissionGroupId: own.id } });
      return f;
    });
    if (moved === "stale") stale();
    if (moved === "not_in_group") refuse(409, "filing", "That filing is not in this submission group (it may have been split out already). Reload.");
    if (moved === "alone") refuse(409, "filing", "A group of one has nothing to split.");
    if (moved === "co_filed") refuse(409, "filing", "The sponsorship and the principal's application are sent together and cannot be split.");
    const who = c.participants.find((p) => p.subjectId === (moved as { subjectId: string }).subjectId);
    // Review M2, break B1: the reason stays on the group row; the audit line says only that one was given.
    await this.audit.log(c.workspaceId, actor.id, "split", "submission group", g!.id, `${actor.name} split the ${ROLE[who?.role ?? ""] ?? "person"}'s filing out of the family submission group on case ${short(c.id)} (reason given)`);
    return this.build(actor, await this.r.reach(actor, c.id, "officer"));
  }

  /** C7.7 (P-145): "Download PDF copy" on an Online form item: IRCC's own PDF filled from the same confirmed facts, as a
   *  queued copy marked "Copy, not for filing" (never an item, never counted, never locked or filed). A PDF upload or
   *  Paper item has no separate copy: its own PDF is the deliverable. */
  async pdfCopy(actor: Actor, itemId: string, body: unknown) {
    const item = await this.db.filingItem.findUnique({ where: { id: idOf(itemId, "item") } });
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    if (item!.kind !== "form" || !item!.active) refuse(422, "item", "Only a form on this application has a PDF copy.");
    const now = itemIn(await this.build(actor, c), item!.id) as { channel?: string } | undefined;
    if (now?.channel !== "ONLINE") refuse(409, "item", `${item!.itemKey} is filed as ${CHANNEL_WORDS[(now?.channel ?? "PDF_UPLOAD") as keyof typeof CHANNEL_WORDS]}: its own PDF is what is filed, so there is no separate copy. Make its copy from the form.`);
    const b = (body ?? {}) as { idempotencyKey?: unknown };
    return this.forms.generate(actor, c.id, item!.itemKey, item!.subjectId, typeof b.idempotencyKey === "string" ? { idempotencyKey: b.idempotencyKey } : {});
  }

  /** C7.3: the answer sheet of an Online form item, for the case officer (a client never reads it). */
  async sheet(actor: Actor, itemId: string): Promise<Sheet & { item: string; form: string; subject: string }> {
    const { c, item, parts } = await this.onlineItem(actor, itemId);
    const s = this.r.snapshotOf(c), people = this.r.peopleOf(c);
    const { answers, rows, groups } = await this.r.state(c);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const entered = await this.db.enteredSection.findMany({ where: { itemId: item.id, supersededAt: null }, include: { snapshot: { select: { inputHash: true, factsJson: true } } } });
    // QA-309: what the sheet waits for is what the form's readiness names, as on the item (the same coverage for both).
    const cov = formCoverage(s, people, answers, rows, item.itemKey, item.subjectId);
    const missing = formReadinessOf(s, people, answers, rows, view, item.itemKey, item.subjectId, cov).missing.filter(blocksLock);
    const sheet = sheetOf(item, s, people, answers, rows, view, entered, parts, missing, cov);
    // C7.3 (P-401): an out-of-date section says why its tick no longer counts (each answer then and now); a section not
    // ticked now shows its last untick and the reason given (the audit line, the record).
    // Break m7: an untick ends a tick, so only an item with an ended tick is looked up, from that tick's time on (the
    // audit table's workspace and time index), never the whole table.
    const ended = await this.db.enteredSection.findFirst({ where: { itemId: item.id, supersededAt: { not: null } }, orderBy: { enteredAt: "asc" }, select: { enteredAt: true } });
    const unticks = ended ? await this.db.auditEvent.findMany({ where: { workspaceId: c.workspaceId, at: { gte: ended.enteredAt }, action: "unentered", entity: "item", entityKey: item.id }, orderBy: { at: "desc" }, select: { at: true, actor: true, detail: true } }) : [];
    for (const x of sheet.sections) {
      const e = entered.find((y) => y.sectionKey === x.key);
      if (e && x.out_of_date) x.changes = changesOf(((e.snapshot.factsJson as { answers?: SheetAnswer[] } | null)?.answers ?? []), x.answers);
      if (!e) { const u = unticks.find((y) => (y.detail as { section?: string } | null)?.section === x.key); x.unticked = u ? { at: u.at.toISOString(), by: u.actor, reason: String((u.detail as { reason?: string }).reason ?? "") } : null; }
    }
    return { item: item.id, form: item.itemKey, subject: item.subjectId, ...sheet };
  }

  /** C7.3: "Entered in the portal" for one section: freezes the answers the officer read (the section's `version`, review
   *  M3: a sheet that changed since is a 409, Reload). Ticking a current section again changes nothing (200); ticking an
   *  out-of-date one freezes the new answers and keeps the old tick as history (review M1). */
  async entered(actor: Actor, itemId: string, key: string, body: unknown) {
    const { c, item } = await this.onlineItem(actor, itemId);
    await refuseIfRecorded(this.db, [item.filingId], `"Entered in the portal" for ${item.itemKey}`); // C8.2-9
    const now = await this.sheet(actor, itemId);
    const sec = now.sections.find((x) => x.key === key);
    if (!sec) fail(`${item.itemKey}'s answer sheet has no such section.`, HttpStatus.NOT_FOUND);
    const b = parse(EnteredBody, body);
    // Review n1: a stale tick says what changed: this section's answers.
    if (b.version !== sec!.version) throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail: `The answers in "${sec!.title}" changed since you read the sheet. Reload it, check them against the portal, then tick again.` }, HttpStatus.CONFLICT);
    const made = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      await refuseIfRecorded(tx, [item.filingId], `"Entered in the portal" for ${item.itemKey}`); // C8.2-9, under the lock
      const was = await tx.enteredSection.findFirst({ where: { itemId: item.id, sectionKey: key, supersededAt: null }, include: { snapshot: { select: { inputHash: true } } } });
      if (was && was.snapshot.inputHash === sec!.version) return { row: was, created: false };
      if (was) await tx.enteredSection.update({ where: { id: was.id }, data: { supersededAt: new Date() } });
      const snap = await tx.answerSnapshot.create({ data: { workspaceId: c.workspaceId, caseId: c.id, subjectId: item.subjectId, formNumber: item.itemKey, inputHash: sec!.version, factsJson: { section: key, answers: sec!.answers } as object } });
      return { row: await tx.enteredSection.create({ data: { workspaceId: c.workspaceId, caseId: c.id, itemId: item.id, sectionKey: key, snapshotId: snap.id, enteredBy: actor.id } }), created: true, again: !!was };
    });
    if (made.created) {
      const who = c.participants.find((p) => p.subjectId === item.subjectId), n = sec!.answers.length;
      await this.audit.log(c.workspaceId, actor.id, "entered", "item", item.id, `${actor.name} ticked "${sec!.title}" of ${item.itemKey} as entered in the portal${"again" in made && made.again ? " again, after a change" : ""} for the ${ROLE[who?.role ?? ""] ?? "person"} on case ${short(c.id)} (${n} answer${n === 1 ? "" : "s"} frozen)`);
    }
    return { created: made.created, section: key, entered: { at: made.row.enteredAt.toISOString(), by: made.row.enteredBy } };
  }

  /** C7.3 (P-401): take "Entered in the portal" off one section, with a reason: the tick ends (kept as history, its
   *  frozen answers too) and the section counts as still to tick again, so the item is no longer Done. The officer sends
   *  the section's `version` and the tick's `entered_at` as read: a sheet or tick that changed since is a 409 (Reload).
   *  The audit line holds who, when and the reason; a section not ticked is a 409 in words. */
  async unentered(actor: Actor, itemId: string, key: string, body: unknown) {
    const { c, item } = await this.onlineItem(actor, itemId);
    await refuseIfRecorded(this.db, [item.filingId], `the tick "Entered in the portal" on ${item.itemKey}`); // C8.2-9
    const now = await this.sheet(actor, itemId);
    const sec = now.sections.find((x) => x.key === key);
    if (!sec) fail(`${item.itemKey}'s answer sheet has no such section.`, HttpStatus.NOT_FOUND);
    const b = parse(UnenteredBody, body);
    const changed = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail }, HttpStatus.CONFLICT); };
    if (b.version !== sec!.version) changed(`The answers in "${sec!.title}" changed since you read the sheet. Reload it, check them against the portal, then decide again.`);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR UPDATE`;
      await refuseIfRecorded(tx, [item.filingId], `the tick "Entered in the portal" on ${item.itemKey}`); // under the lock
      const was = await tx.enteredSection.findFirst({ where: { itemId: item.id, sectionKey: key, supersededAt: null } });
      if (!was) throw new HttpException({ type: "https://expatready.local/problems/not-ticked", title: "Not ticked", status: 409, detail: `"${sec!.title}" is not ticked "Entered in the portal", so there is no tick to take off. Reload the sheet.` }, HttpStatus.CONFLICT);
      if (new Date(b.entered_at).getTime() !== was!.enteredAt.getTime()) changed(`"${sec!.title}" was ticked again since you read the sheet. Reload it, then decide again.`);
      const row = await tx.enteredSection.update({ where: { id: was!.id }, data: { supersededAt: new Date() } });
      // Break M1: the audit line is written in the same transaction: a tick never comes off without its record (who,
      // when, why). The same row Audit.log writes.
      const who = c.participants.find((p) => p.subjectId === item.subjectId);
      await tx.auditEvent.create({ data: { workspaceId: c.workspaceId, actor: actor.id, action: "unentered", entity: "item", entityKey: item.id, combinationId: null,
        summary: [`${actor.name} took the tick "Entered in the portal" off "${sec!.title}" of ${item.itemKey} for the ${ROLE[who?.role ?? ""] ?? "person"} on case ${short(c.id)}; it counts as still to tick. Reason: ${b.reason}`].map((t) => Array.from(t).slice(0, 600).join(""))[0], // by character, never half an emoji
        detail: { section: key, reason: b.reason, ticked_by: row.enteredBy, ticked_at: row.enteredAt.toISOString() } } });
      return row;
    });
    return { section: key, entered: null };
  }

  /** An item of this case that is a form filed Online now (its own channel, else its line's), reached by the officer. */
  private async onlineItem(actor: Actor, itemId: string) {
    const item = await this.db.filingItem.findUnique({ where: { id: idOf(itemId, "item") } });
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    if (item!.kind !== "form" || !item!.active) refuse(422, "item", "Only a form on this application has an answer sheet.");
    const line = (this.r.snapshotOf(c).forms as FormLine[]).find((l) => l.form_number === item!.itemKey);
    const channel = item!.channel ?? channelOf(line, undefined, null, null).line_channel;
    if (channel !== "ONLINE") refuse(409, "item", `${item!.itemKey} is filed as ${CHANNEL_WORDS[channel as keyof typeof CHANNEL_WORDS]}: its PDF is the deliverable, so it has no answer sheet.`);
    // C7.3 (P-319): laid out from the form's own parts in the release's configuration, else the twin's Sample sections.
    const parts = await partsOfRelease(this.db, c);
    if (!layoutOf(item!.itemKey, this.r.snapshotOf(c), parts)) refuse(409, "item", `${item!.itemKey}'s parts are not set up in this case's release, so its answer sheet cannot be laid out yet. Ask the Lead.`);
    return { c, item: item!, parts };
  }

  /** C11.6: a form item's channel, inside what IRCC accepts for it on the combination's IRCC account. The same channel
   *  again changes nothing (break m1); the version is checked under the case's row lock. */
  async channel(actor: Actor, itemId: string, body: unknown) {
    const item = await this.db.filingItem.findUnique({ where: { id: idOf(itemId, "item") } });
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    await refuseIfRecorded(this.db, [item!.filingId], `how ${item!.itemKey} is filed`); // C8.2-9: even a change IRCC accepts
    const b = parse(ChannelBody, body);
    if (item!.kind !== "form" || !item!.active) refuse(422, "channel", "Only a form on this application has a channel.");
    const accepts = await acceptsOf(this.db, c.workspaceId);
    const portal = (await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { portalKey: true } }))?.portalKey ?? null;
    const ok = channelChange(item!.itemKey, b.channel, b.reason, accepts.get(item!.itemKey), portal);
    if (!ok.ok) refuse(ok.status, ok.field, ok.detail);
    const now = await this.build(actor, c);
    const before = (itemIn(now, item!.id) as { channel?: keyof typeof CHANNEL_WORDS } | undefined)?.channel ?? "PDF_UPLOAD";
    const to = (ok as { channel: keyof typeof CHANNEL_WORDS }).channel;
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) return "stale" as const;
      const row = await tx.filingItem.findUnique({ where: { id: item!.id } });
      if (!row || !row.active) return "stale" as const;
      await refuseIfRecorded(tx, [row.filingId], `how ${row.itemKey} is filed`); // C8.2-9, under the case's row lock
      if ((row.channel ?? before) === to) return "same" as const;
      await tx.filingItem.update({ where: { id: row.id }, data: { channel: to, channelReason: b.reason || null, channelBy: actor.id, channelAt: new Date(), version: row.version + 1 } });
      // Devin on #617: signing steps done for the old channel never count for the new one (they are kept as history).
      await tx.signStep.updateMany({ where: { itemId: row.id, supersededAt: null }, data: { supersededAt: new Date() } });
      return "changed" as const;
    });
    if (result === "stale") stale();
    if (result === "changed") {
      const who = c.participants.find((p) => p.subjectId === item!.subjectId);
      // RT-17, review M2, break B1: the form, the person's role and the case; the reason stays on the item row only.
      await this.audit.log(c.workspaceId, actor.id, "changed", "item", item!.id, `${actor.name} changed how ${item!.itemKey} is filed for the ${ROLE[who?.role ?? ""] ?? "person"} on case ${short(c.id)}: from ${CHANNEL_WORDS[before]} to ${CHANNEL_WORDS[to]}${b.reason ? " (reason given)" : ""}`, { from: before, to, reason_given: !!b.reason });
    }
    const after = result === "same" ? now : await this.build(actor, await this.r.reach(actor, c.id, "officer"));
    return { item: itemIn(after, item!.id), version: after.version, changed: result === "changed" };
  }
}

/** C7.3: one Online form item's answer sheet: the person's boxes for that form (every declared or confirmed answer, each
 *  with its mark and "to confirm", P-242, P-411), in the form's own parts (else the twin's sections), with each entered
 *  tick compared against the answers it froze. */
function sheetOf(item: { itemKey: string; subjectId: string }, s: ReturnType<Runtime["snapshotOf"]>, people: ReturnType<Runtime["peopleOf"]>, answers: Awaited<ReturnType<Runtime["state"]>>["answers"], rows: Awaited<ReturnType<Runtime["state"]>>["rows"], view: ReturnType<typeof caseView>, entered: { sectionKey: string; enteredAt: Date; enteredBy: string; snapshot: { inputHash: string } }[], parts: Map<string, FormPart[]>, missing: Readiness["missing"], cov = formCoverage(s, people, answers, rows, item.itemKey, item.subjectId)): Sheet {
  const labels = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
  // QA-392: a box written No because nothing is recorded has no answer of its own: its source and mark are those of the
  // answer that vouches for it (the list's "none apply", else the No to the Yes/No question it is asked under).
  const qs = view.sections.flatMap((x) => x.questions), filing = people.find((p) => p.role === "case")?.subjectId;
  const vouch = (subject: string, fact: string) => view.sections.find((x) => x.subjectId === subject && x.group?.none_apply?.value && x.questions.some((q) => q.fact === fact))?.group?.none_apply
    ?? (() => { const g = gateOf(s.placements as GatePlacement[], fact); const a = g ? qs.find((q) => q.subjectId === subject && q.fact === g)?.answer : null; return a?.value === false ? a : null; })();
  const origin = (subject: string, fact: string) => { const a = answers.find((x) => x.subjectId === subject && x.field === fact); if (a) return a.origin?.channel ?? a.channel; const v = vouch(subject, fact); return v?.answered?.channel ?? v?.channel; };
  const layout = layoutOf(item.itemKey, s, parts) ?? { basis: "pdf_twin" as const, sections: {} };
  // P-411 (B150 review M2): the officer types from this sheet, so each answer carries who gave it and whether it is still to confirm.
  const markOf = (about: string, fact: string, row: number | null) => {
    const subject = about === "case" ? filing : about;
    const q = qs.find((x) => x.subjectId === subject && x.fact === fact), a = (q ? (q.group ? q.rows[row ?? 0]?.answer : q.answer) : null) ?? (subject && row === null ? vouch(subject, fact) : null);
    return a ? { mark: a.mark, confirmed: a.confirmed, why: a.why } : undefined;
  };
  // QA-309: a box waits only for what the form's readiness names (`missing`: the item's own rule).
  // QA-392: the boxes as the PDF copy writes them (fill-case.ts generate): the same rule marks the "nothing recorded" ones.
  // QA-392b: each "recorded" Yes/No box's Yes or No is the copy's own value step's (formValues, on the edition the copy
  // fills, P-32; else the edition the sheet lays out), read back through the box's yes/no code (recordedYesNo).
  const boxes = cov ? markNothingRecorded(cov.boxes, view, s.placements as GatePlacement[]) : [];
  const map = pdfMapInUse(s.field_maps as FieldMap[], item.itemKey) ?? fieldMapOf(s, item.itemKey);
  const inv = map?.inventory_file ? inventoryOf(map.inventory_file) : null;
  const yesNo = recordedYesNo(formValues(s as unknown as Parameters<typeof formValues>[0], { entries: map?.entries ?? [] }, inv ?? { fields: [] }, boxes).boxes);
  return layOut(layout, boxes, origin, labels, new Map(entered.map((e) => [e.sectionKey, { at: e.enteredAt.toISOString(), by: e.enteredBy, hash: e.snapshot.inputHash }])), markOf, waitsOf(view, missing, item.subjectId, filing),
    // QA-317 (review M1): a choice is copied in the release's own words, never its key.
    (fact, v) => (typeof v === "string" ? optionsOf(s, fact)?.find((o) => o.key === v)?.label : undefined), yesNo);
}

/** C7.3: the release's field map for a form (its edition and its form fields in the form's order). */
type FieldMap = { form_number: string; form_edition?: string; inventory_file?: string; entries?: { data_path: string }[] };
const fieldMapOf = (s: ReturnType<Runtime["snapshotOf"]>, form: string) => (s.field_maps as FieldMap[]).find((m) => m.form_number === form);
/** The parts of every form edition the release maps, as they stood when it was released (review M3 on #1075: released
 *  means frozen), titled by the release's own section titles; read once per request. */
async function partsOfRelease(db: Db, c: Reached) {
  const rel = c.pins[0].release, s = rel.snapshot as unknown as ReturnType<Runtime["snapshotOf"]>;
  const titles = new Map([...((s.section_titles ?? []) as { id: string; title: string }[]), ...((s.sections ?? []) as { id: string; title: string }[])].map((x) => [x.id, x.title] as const));
  return formPartsOf(db, c.workspaceId, (s.field_maps as FieldMap[]).map((m) => m.form_edition ?? ""), rel.releasedAt, titles);
}
/** How a form's sheet is laid out: its own parts for the release's edition, in the form's order (P-319: from the
 *  configuration); a form whose edition has none takes the twin's Sample sections; neither: null (no sheet yet). */
function layoutOf(form: string, s: ReturnType<Runtime["snapshotOf"]>, parts: Map<string, FormPart[]>): Layout | null {
  const m = fieldMapOf(s, form);
  const own = m?.form_edition ? parts.get(m.form_edition) ?? [] : [];
  // Review M1 on #1075: the order the form prints its fields is its field list's (the snapshot's entries are sorted by
  // data path, which is alphabetical); the entries' own order only when the field list cannot be read.
  const listed = m?.inventory_file ? (inventoryOf(m.inventory_file)?.fields ?? []).map((f) => f.data_path).filter((p): p is string => !!p) : [];
  if (own.length) return { basis: "form_parts", parts: partsInFormOrder(own, listed.length ? listed : (m?.entries ?? []).map((e) => e.data_path)) };
  const twin = (PDF_SECTIONS as unknown as Record<string, Record<string, string>>)[form];
  return twin ? { basis: "pdf_twin", sections: twin } : null;
}

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
/** The view's version from the stored rows (the groups holding a current filing, and the current items), so a write
 *  checks it under the case's row lock exactly as the view computed it. */
export async function storedVersion(tx: Tx | Db, caseId: string) {
  // C6.17 (BR-9): the pin of the case's current stage (its combination); filings and items of the current stage.
  const combinationId = (await tx.case.findUnique({ where: { id: caseId }, select: { combinationId: true } }))?.combinationId;
  const [filings, items, pin] = await Promise.all([
    tx.filing.findMany({ where: { caseId, active: true, stage: { state: "CURRENT" } }, select: { id: true, submissionGroupId: true } }),
    tx.filingItem.findMany({ where: { caseId, active: true, filing: { stage: { state: "CURRENT" } } }, select: { id: true, channel: true, version: true } }),
    tx.packWorkPin.findFirst({ where: { caseId, combinationId }, orderBy: { revision: "desc" }, select: { revision: true } }),
  ]);
  return withRevision(versionOf(filings, items), pin?.revision ?? 1);
}
/** C9.5: a case never moved keeps the version it had (revision 1); after a move the revision is part of it. */
const withRevision = (v: string, revision: number) => (revision > 1 ? `${v}~r${revision}` : v);
export { busyWords } from "./busy.ts";
import { busyWords } from "./busy.ts";
/** The version of a set of current filings and items (the same rule for the view and for a write's check). */
function versionOf(filings: { id: string; submissionGroupId: string }[], items: { id: string; channel?: string | null; version: number }[]) {
  const groups = [...new Set(filings.map((f) => f.submissionGroupId))].map((id) => ({ id, filings: filings.filter((f) => f.submissionGroupId === id).map((f) => f.id) }));
  return prepareVersion(groups, items);
}

@CaseRead()
@Controller("api/runtime")
export class CasePrepareController {
  constructor(@Inject(CasePrepare) private readonly p: CasePrepare) {}
  // #325 break B4: HEAD would run the GET handler and store rows; it is refused (405), never answered from a write.
  @Head("cases/:id/prepare") head() { fail("HEAD is not offered on /prepare: use GET.", HttpStatus.METHOD_NOT_ALLOWED); }
  @Get("cases/:id/prepare") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.p.view(actorOf(a), id); }
  @Post("groups/:gid/split") @HttpCode(HttpStatus.OK) split(@Headers("x-actor") a: H, @Param("gid") gid: string, @Body() b: unknown) { return this.p.split(actorOf(a), gid, b); }
  @Post("items/:id/pdf-copy") @HttpCode(HttpStatus.ACCEPTED) pdfCopy(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.p.pdfCopy(actorOf(a), id, b); }
  @Get("items/:id/answer-sheet") sheet(@Headers("x-actor") a: H, @Param("id") id: string) { return this.p.sheet(actorOf(a), id); }
  @Post("items/:id/screens/:key/entered") async entered(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") key: string, @Body() b: unknown, @Res({ passthrough: true }) res: Response) { const r = await this.p.entered(actorOf(a), id, key, b); res.status(r.created ? HttpStatus.CREATED : HttpStatus.OK); return r; }
  @Post("items/:id/screens/:key/unentered") @HttpCode(HttpStatus.OK) unentered(@Headers("x-actor") a: H, @Param("id") id: string, @Param("key") key: string, @Body() b: unknown) { return this.p.unentered(actorOf(a), id, key, b); }
  @Patch("items/:id/channel") channel(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.p.channel(actorOf(a), id, b); }
}

