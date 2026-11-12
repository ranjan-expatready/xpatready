// Runtime API (runtime lane, R1 thin slice, P-67): a case for a released combination, pinned to that release; its
// people; one current answer per person per fact, append-only; repeating rows; the officer's "Confirm section" (P-72).
// Every read uses the case's pinned release, never the newest (STANDARDS §3.7). Deny by default: the case officer works
// on the workspace's cases; a client reaches only the case they answer, and only its questionnaire; configuration
// people reach no case. Answer values and typed names never go into audit text or logs (STANDARDS §5): audit lines name
// a case by its id.
import { additionsOf, withAdditions } from "../../engine/runtime/added-forms.ts";
import { clientPersonOf, withClient, type StoredChange } from "../../engine/runtime/filing-changes.ts";
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { caseName, type CaseListRow, ConfirmSection, fillsText, Reconfirm, notReadyForCases, releaseLabel, NewCase, type OpenableRelease, NewPerson, NewRow, NoneApply, PutAnswer, UpdatePerson, type CaseRole } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseView, checkValue, isClientField, OWN_LINK, pqrView, shapeOf, type Answer, type CaseView, type GroupAnswer, type Mode, type Participant, type Row } from "../../engine/runtime/case.ts";
import { ownerOf, privateFrom, progressOf } from "../../engine/runtime/privacy.ts"; // C6.16
import type { Snapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, fail, need, RUNTIME_ACTORS, Workspace, type Actor } from "./core.ts";
import { sameValue } from "./document-values.ts";
import { refuseIfCaseRecorded } from "./submission-record.ts"; // C8.2: a recorded case keeps its people
import { firmByKey, firmOfActor, STAND_IN } from "./firms.ts";
import { aiLive } from "./sources.ts";
import { FIRM_RECORD, openingTeam, REPRESENTATIVE, representativeAnswers, USES_REPRESENTATIVE, type Member } from "../../engine/runtime/team.ts";
import { employerLinkOffer } from "../../engine/runtime/employer.ts";
import { isFilingFact } from "../../engine/resolver.ts";
import { ONCE_WORDS } from "../../engine/field-scope.ts";
import { linkedOf } from "./employer-cases.ts";
import { awaitsClient, backgroundFacts, CLIENT_RECONFIRM, OFFICER_ENTRY } from "../../engine/runtime/background.ts";
import { backgroundBlockOf } from "./background-questions.ts";
import { Programs } from "./programs.ts";
import { pinChain } from "../../engine/runtime/release-update.ts";
import { openingStages } from "../../engine/runtime/stages.ts";
import { routeOf, routesOf, writeOpeningStages } from "./routes-data.ts";
/** C6.17 (P-78): the channel of an answer written from a stage record (the officer entered it on "Done before we started"). */
export const STAGE_RECORD = "stage_record";
import { ASKED_RELATIONS, cellAsked, isListRelation, listWords, relativeKey, relativeOf, SUBJECT_OR_RELATIVE, type Relation } from "../../engine/runtime/relatives.ts";

type H = string | undefined;
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
/** A rule refuses the request (nobody else changed anything): 409 "Not possible now" (break r1d-none-apply m4). */
/** Break M2 on #1246: blank in any shape: a string of spaces only (any Unicode space), an empty list or group, or one
 *  holding only blanks. */
const isBlank = (v: unknown): boolean => v === null || v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.every(isBlank)) || (typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every(isBlank));
const refused = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const conflict = (detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed by someone else", status: 409, detail, ...extra }, HttpStatus.CONFLICT); };
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: message, errors: [{ field, message }] }, HttpStatus.BAD_REQUEST); };
const RELATIONSHIP: Record<string, string> = { spouse_or_partner: "SPOUSE_OR_PARTNER", child: "CHILD" };
const isOfficer = (a: Actor) => (a.duties as readonly string[]).includes("case");
const FIELD_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const short = (id: string) => id.slice(0, 8);
/** B128 (QA-153): Confirm section also for a parent's key (`<person>/parent_1`); the same messages as the contract's. */
const ConfirmSubject = ConfirmSection.extend({ subjectId: z.string({ message: "Choose whose section to confirm." }).regex(SUBJECT_OR_RELATIVE, "Choose whose section to confirm.") });
/** B128: a relative with no stored subject yet has no answer to confirm (an id no subject ever has). */
const NOTHING_STORED = "00000000-0000-0000-0000-000000000000";
const nameIn = (f: { users: { id: string; name: string }[] }, id: string) => f.users.find((u) => u.id === id)?.name ?? id;
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";
type PeopleLine = { role: string; max?: number; label?: string; filingMode?: string };
const linesOf = (s: Snapshot) => (s.combination.participants ?? []) as PeopleLine[];
const roleWords = (p: Pick<PeopleLine, "role" | "label">) => p.label ?? p.role.replace(/_/g, " ");
/** B115 (P-319): who a person may add to a case: every role the pinned release lists with a maximum above 0, never the
 *  principal applicant or the application itself. One list for the case page's Add buttons and addPerson's check. */
export const addableRoles = (s: Snapshot) => linesOf(s).filter((p) => p.role !== "principal" && p.role !== "case" && (p.max ?? 0) > 0);
/** QA-293: why no detail of the representative is saved on a case: the firm record of the representative of record is
 *  their only source (C7.7, C6.11), and IMM 5475's designated individual, read by some of these keys, is not the
 *  representative (tech lead's ruling on #1072). True for a detail the firm record fills and for one it does not. */
export const REPRESENTATIVE_NOT_TYPED = "The representative's details come only from the firm record of the representative of record, so they are not saved on a case.";
/** B115 review M1 (C7.7): the case page's Add buttons. The representative is the case team's representative of record,
 *  read from the firm record (engine/runtime/team.ts: "A case has no representative participant"), so the screen never
 *  offers to add one as a person; every other role comes from the release (P-319). */
export const offeredRoles = (s: Snapshot) => addableRoles(s).filter((p) => p.role !== REPRESENTATIVE);

/** What a reached case carries: every pin revision, newest first (C9.5), its release; the people with their party and
 *  profile; and the case's first Make principal (C6.13 BR-3b: it names the client when roles were swapped). */
const REACHED = { pins: { orderBy: { revision: "desc" as const }, include: { release: { include: { packVersion: { select: { version: true } } } } } }, participants: { orderBy: { order: "asc" as const }, include: { subject: { include: { party: { include: { profile: true } } } } } },
  // C6.17 (BR-9): the case's stages; the current one names the pins and the application subject the case reads.
  stages: { orderBy: { ord: "asc" as const } },
  filingChanges: { where: { kind: "make_principal" }, orderBy: [{ changedAt: "asc" as const }, { id: "asc" as const }], take: 1, select: { kind: true, subjectId: true, otherSubjectId: true, changedAt: true } },
  // C7.8 (B141 M1): the live forms the case officer added to one filing, joined into the case's snapshot (snapshotOf).
  // C6.17 (review of #1262 M3): the current stage's filings only: a form added on an ended stage stays with that stage.
  formAdditions: { where: { removedAt: null, filing: { stage: { state: "CURRENT" } } }, orderBy: [{ addedAt: "asc" as const }, { id: "asc" as const }] } };
/** C9.5 (BR-1, challenge M1): a case reads its newest pin revision (`pins[0]`); every revision, older ones too, must still
 *  match its release and the case's combination, and the chain must hold (1…n, forward only). Otherwise refused, never read.
 *  C6.17 (BR-9, challenge B1): a case with several stages has pins on several combinations: the chain and `pins` are the
 *  current stage's (the case's combination); every other pin's hash and combination are still checked. Challenge B3: only
 *  the current stage's application subject is on the case now; an ended stage's stays with it. */
function pinned<C extends { combinationId: string; pins: { combinationId: string; revision: number; contentHash: string; release: { version: number; sha256: string; combinationId: string } }[];
  stages: { state: string; combinationId: string; applicationSubjectId: string | null }[]; participants: { role: string; subjectId: string }[] }>(c: C) {
  const stage: C["stages"][number] | undefined = c.stages.find((s) => s.state === "CURRENT");
  const pins: C["pins"] = c.pins.filter((p) => p.combinationId === c.combinationId), pin = pins[0];
  if (!stage || stage.combinationId !== c.combinationId || !pin || !pinChain(pins.map((p) => ({ revision: p.revision, version: p.release.version }))).ok || c.pins.some((p) => p.contentHash !== p.release.sha256 || p.release.combinationId !== p.combinationId)) fail("This case's pin to its release does not match the release; nothing was read or changed. Ask the Lead.", HttpStatus.CONFLICT);
  const participants: C["participants"] = c.participants.filter((p) => p.role !== "case" || p.subjectId === stage!.applicationSubjectId);
  return { ...c, pins, participants, stage: stage!, allPins: c.pins };
}
export type Reached = Awaited<ReturnType<Runtime["reach"]>>;
/** C6.16 (challenge M2): who saves an answer, row or group answer: case staff and the case's client (simulated by
 *  x-actor), or an adult on their own link (/api/link/*, actor "person:<subject id>", channel own_link, only their own
 *  subject). One write path for all three, so the rules are checked once. */
export type Writer = { id: string; name: string; officer: boolean; channel: "agent_view" | "questionnaire" | typeof OWN_LINK; own: string | null };
export const writerOf = (a: Actor): Writer => ({ id: a.id, name: a.name, officer: isOfficer(a), channel: isOfficer(a) ? "agent_view" : "questionnaire", own: null });
/** C6.16 BR-7: the words a client reads on a person whose answers are kept private from them. */
export const privateWords = (label: string) => `${label}'s answers are private to them and the firm: ${label} answers on their own link. You see how far they have got, not their answers.`;
/** C6.16 BR-7 (challenge M3): the client's view without the parts of people kept private from them, its summary counted
 *  again from what is left. */
function withoutHidden<V extends CaseView>(v: V, hidden: Set<string>, hiddenLabels: Set<string>, shownLabels: Set<string>): V {
  const sections = v.sections.filter((x) => !hidden.has(ownerOf(x.subjectId))); // a relative goes with their person (B128)
  return { ...v, sections, checks: v.checks.filter((x) => !hidden.has(ownerOf(x.subjectId))), forms: v.forms.filter((f) => !hiddenLabels.has(f.person) || shownLabels.has(f.person)),
    summary: { ...v.summary, questions: sections.reduce((n, x) => n + x.questions.length, 0), answered: sections.reduce((n, x) => n + x.answered, 0), confirmed: sections.reduce((n, x) => n + x.confirmed, 0), missing: sections.reduce((n, x) => n + x.missing.length, 0) } };
}

/** QA-322: the note for one open check: "changed" only when the answer now holds another value than the one the check
 *  compared (review M1 on 673f0794d: the same value saved again, or changed back, is still the compared answer). */
export function documentCheckNote(fact: string, documentName: string, compared: unknown, current: unknown): string {
  return pleaseCheckWords(documentName, current !== undefined && !sameValue(fact, current, compared));
}
/** QA-322 (P-142 D6): the client's words on an answer while a typed-versus-document check is open on it. The document's
 *  value is never shown; sentences under 20 words (BIC-20, review m2, m7); the document's own name, only its first letter
 *  in lower case (review m3: "Letter of invitation (Sample)" keeps "Sample"); and once the answer holds another value,
 *  words that say it has changed, without saying who changed it, instead of asking again (review m1, M1). */
export function pleaseCheckWords(documentName: string, changedSince: boolean): string {
  const doc = documentName.charAt(0).toLowerCase() + documentName.slice(1);
  // Review M1 on 673f0794d: "changed" is decided by value and never says who changed it (staff may have); m7: short
  // sentences, so even the release's longest document name stays under 20 words.
  return changedSince
    ? `Please check this answer. It has changed since it was compared with the ${doc} on file. Your case officer checks it again and settles any difference with you.`
    : `Please check this answer. It did not match the ${doc} on file. If it is wrong, change it here. Your case officer settles any difference with you.`;
}

@Injectable()
export class Runtime {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Programs) private readonly programs: Programs) {}

  /** The case, if this person may reach it: the officer any case of the workspace, a client only their own (others are
   *  "not found", as the team's cross-tenant rule). Configuration people hold neither duty. The pin must still match
   *  its release's hash: a changed pin or release is refused, never read. */
  async reach(actor: Actor, caseId: string, want: "read" | "answer" | "officer") {
    const workspaceId = await this.ws.id();
    const officer = isOfficer(actor), client = (actor.duties as readonly string[]).includes("answer");
    if (!officer && !client) fail(`${actor.name} (simulated) works on configuration, not on cases.`, HttpStatus.FORBIDDEN);
    if (want === "officer" && !officer) fail("Only the case officer can do this.", HttpStatus.FORBIDDEN);
    const c = await this.db.case.findFirst({ where: { id: caseId, workspaceId }, include: REACHED });
    // C6.11 (BR-20): staff reach only their own firm's cases; another firm's case is "not found", as for a client.
    if (!c || (!officer && c.clientActorId !== actor.id) || (officer && c.firmKey !== firmOfActor(actor)?.key)) fail("No such case.", HttpStatus.NOT_FOUND);
    return pinned(c!);
  }

  /** C6.16 (BR-5): the case of a link session, which /api/link/*'s guard already checked (live session, live link, the
   *  person still on the case). The same pin check as reach. */
  async reachByLink(caseId: string) {
    const c = await this.db.case.findFirst({ where: { id: caseId, workspaceId: await this.ws.id() }, include: REACHED });
    if (!c) fail("No such case.", HttpStatus.NOT_FOUND);
    return pinned(c!);
  }

  /** The case's snapshot: its pinned release with the forms the case officer added to one filing joined in (C7.8 M1,
   *  engine/runtime/added-forms.ts withAdditions, the one join point). Read once per reached case. */
  snapshotOf(c: Reached): Snapshot {
    const got = this.joined.get(c);
    if (got) return got;
    const s = withAdditions(this.releaseSnapshotOf(c), additionsOf(c.formAdditions ?? []));
    this.joined.set(c, s);
    return s;
  }
  private readonly joined = new WeakMap<object, Snapshot>();
  /** The release snapshot exactly as released (its fingerprint is checked against this, never the joined one). */
  releaseSnapshotOf(c: Reached) { return c.pins[0].release.snapshot as unknown as Snapshot; }

  /** C6.18 (P-244): the facts of a case's release that are background answers (engine/runtime/background.ts), read once
   *  per release (a release never changes). */
  private readonly background = new Map<string, Set<string>>();
  backgroundOf(c: Reached): Set<string> {
    const id = c.pins[0].release.id;
    let got = this.background.get(id);
    if (!got) { got = backgroundFacts(this.releaseSnapshotOf(c), backgroundBlockOf); this.background.set(id, got); }
    return got;
  }
  peopleOf(c: Reached): Participant[] {
    const people = c.participants.map((p) => ({ subjectId: p.subjectId, role: p.role as Participant["role"], label: p.subject.label, applies: p.applies }));
    // C6.13 BR-3b: the client stays the same person after Make principal; only a case whose roles were swapped says so.
    if (!c.filingChanges.length) return people;
    return withClient(people, clientPersonOf(people, c.filingChanges.map((x) => ({ kind: x.kind as StoredChange["kind"], subject: x.subjectId, other: x.otherSubjectId, at: x.changedAt.toISOString() }))));
  }

  /** C6.16 (review M1, C6.13): the case's client person: the principal, unless Make principal swapped roles (the client
   *  stays the same person, `peopleOf(c)[].client`). "The principal" of BR-1 and BR-7 is this person. */
  clientSubjectOf(c: Reached): string | null {
    const people = this.peopleOf(c);
    return people.find((x) => x.client === true)?.subjectId ?? people.find((x) => x.role === "principal")?.subjectId ?? null;
  }
  /** C6.16 BR-7: the participant (owner of a relative's key) whose stored setting hides them from the client, else null. */
  hiddenFromClient(c: Reached, subjectId: string) {
    const owner = ownerOf(subjectId), client = this.clientSubjectOf(c);
    const p = c.participants.find((x) => x.subjectId === owner);
    return p && privateFrom({ kind: "client" }, { subjectId: owner, role: p.role, keepPrivate: p.keepPrivate, isClient: owner === client }) ? p : null;
  }

  /** B128 (QA-153): the relatives' answer subjects of this case (a parent a form describes, never a person on it), each
   *  with the key the engine reads it under (`<person>/parent_1`). A relative's subject hangs on the party of the person
   *  whose relative it is, as the application's own subject hangs on the principal's (AnswerSubject: no migration); one
   *  per party and relation, made under a lock (subjectFor) and held by the database (B157: a partial unique index,
   *  migration 20261108050000_b157_one_relative_subject). Reads still take the lowest id, as before. */
  async relativesOf(c: Reached): Promise<{ id: string; key: string }[]> {
    const owner = new Map(c.participants.filter((p) => p.role !== "case").map((p) => [p.subject.partyId, p.subjectId]));
    if (!owner.size) return [];
    const rows = await this.db.answerSubject.findMany({ where: { partyId: { in: [...owner.keys()] }, subjectKind: { in: [...ASKED_RELATIONS] } }, orderBy: [{ id: "asc" }], select: { id: true, partyId: true, subjectKind: true } });
    const out = new Map<string, { id: string; key: string }>();
    for (const r of rows) { const key = relativeKey(owner.get(r.partyId)!, r.subjectKind as Relation); if (!out.has(key)) out.set(key, { id: r.id, key }); }
    return [...out.values()];
  }

  /** B128: who an answer about `subjectId` belongs to on this case, and the stored subject it is kept on. A relative's
   *  key names a person on the case (never the application) and a relation the release's forms read (with `fact`, that
   *  fact about that relation: review m2, a fact no form reads about a parent is never stored); its subject is made on
   *  its first answer (`create`), under a lock, so two first answers never make two; B157: should the database refuse a
   *  second all the same (its unique index), the one it holds is read and used. */
  private async subjectFor(c: Reached, subjectId: string, create: boolean, fact?: string): Promise<{ who: Reached["participants"][number]; stored: string | null }> {
    const rel = relativeOf(subjectId);
    const who = c.participants.find((p) => p.subjectId === (rel ? rel.owner : subjectId) && (!rel || p.role !== "case"));
    // C6.17 (review round 2): the application of a stage that has ended (the case moved to its next stage while this was
    // open) is said so: 409, never "not on this case".
    if (!who && !rel && c.stages.some((s) => s.applicationSubjectId === subjectId && s.state !== "CURRENT")) conflict("This case moved to its next stage while you answered: this application's questions are asked again there. Read the case again; nothing was saved.");
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    if (!rel) return { who: who!, stored: subjectId };
    const read = (this.snapshotOf(c).field_maps as { entries: { person?: string | null; outcome?: string; fact?: string | null }[] }[]).some((m) => m.entries.some((e) => e.outcome === "mapped" && e.person === `subject_${rel.relation}` && (!fact || e.fact === fact)));
    if (!read) fail(fact ? `No form of this case's release asks this about ${isListRelation(rel.relation) ? listWords(rel.relation).one : "that parent"}.` : "No form of this case's release describes that relative.", HttpStatus.NOT_FOUND);
    const found = (await this.relativesOf(c)).find((x) => x.key === subjectId);
    if (found || !create) return { who: who!, stored: found?.id ?? null };
    const held = () => this.db.answerSubject.findFirst({ where: { partyId: who!.subject.partyId, subjectKind: rel.relation }, orderBy: [{ id: "asc" }] });
    const stored = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`relative|${who!.subject.partyId}|${rel.relation}`}))`;
      const again = await tx.answerSubject.findFirst({ where: { partyId: who!.subject.partyId, subjectKind: rel.relation }, orderBy: [{ id: "asc" }] });
      return again?.id ?? (await tx.answerSubject.create({ data: { workspaceId: c.workspaceId, partyId: who!.subject.partyId, subjectKind: rel.relation, label: `${who!.subject.label}: ${rel.relation.replace(/_/g, " ")}` } })).id;
    }).catch(async (e) => { const one = unique(e) ? await held() : null; if (!one) throw e; return one.id; });
    return { who: who!, stored };
  }

  async createCase(actor: Actor, body: unknown) {
    need(actor, "case");
    const b = parse(NewCase, body);
    const workspaceId = await this.ws.id();
    // C6.11 (BR-20): the case belongs to the opener's firm; its reference and idempotency key are the firm's own (break M2, M3).
    const firm = firmOfActor(actor);
    if (!firm) fail(`${actor.name} (simulated) is not staff of a firm, so cannot open a case.`, HttpStatus.FORBIDDEN);
    const { idempotencyKey: _k, ...request } = b;
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const replay = async () => {
      const again = b.idempotencyKey ? await this.db.case.findFirst({ where: { workspaceId, firmKey: firm!.key, idempotencyKey: b.idempotencyKey } }) : null;
      if (!again) return null;
      if (again.idempotencyFingerprint !== fingerprint) fail("This idempotency key was already used for a different case request; nothing was created. Use a new key.", HttpStatus.CONFLICT);
      return { ...(await this.get(actor, again.id)), created: false };
    };
    const earlier = await replay();
    if (earlier) return earlier;
    const combination = await this.db.combination.findFirst({ where: { id: b.combinationId, workspaceId } });
    if (!combination) fail("No such combination.", HttpStatus.NOT_FOUND);
    // W1-03 addendum A2 (P-116, Lead 26 Oct; screens lane): a release retired it, so no new case opens on it; cases
    // already open keep their pinned release.
    if (combination!.retiredAt) fail(`"${combination!.label}" was retired by a release: new cases are not opened on it. Cases already open keep their release.`, HttpStatus.CONFLICT);
    const release = await this.db.configRelease.findFirst({ where: { combinationId: b.combinationId }, orderBy: { version: "desc" } });
    if (!release) fail(`"${combination!.label}" has no released version yet: a case opens only on a released configuration.`, HttpStatus.CONFLICT);
    // S4 (SA-1B-90): a case opens only on a startable release. The case officer reads a plain sentence (review M2 on
    // ea7f28b2: no field paths or keys, no author's step); the catalogue's own lines go in `missing` for the authors.
    const missing = await this.programs.startableMissing(b.combinationId, release!);
    if (missing.length) throw new HttpException({ type: "https://expatready.local/problems/not-startable", title: "Not ready for cases", status: 409, detail: notReadyForCases(combination!.label, missing.length), missing: missing.map((m) => ({ code: m.code, text: m.text, step: m.step })) }, HttpStatus.CONFLICT);
    let client: Actor | null = null;
    try { client = actorOf(b.clientActor); } catch { /* reported below as a field error */ }
    if (!client || !(client.duties as readonly string[]).includes("answer")) fieldError("clientActor", "Choose a client login (the client who answers the questionnaire).");
    // C6.11 (BR-20): the case opens with the firm's representative of record and case officers.
    const team = openingTeam(firm!, { representative: b.representative, caseOfficers: b.caseOfficers });
    if ("field" in team) fieldError(team.field, team.message);
    const { representative, officers } = team as { representative: string; officers: string[] };
    // C6.17 (BR-3, SA-1B-212): a combination that is a later stage of a route may open with its earlier stages ticked
    // "Done before we started"; their key details are typed by their field before anything is written (400 on the field).
    const onRoute = routeOf(await routesOf(this.db, workspaceId), combination!.combinationKey);
    if (b.earlier?.length && !onRoute) fieldError("earlier", "This combination is on no route, so it has no earlier stages.");
    const opening = openingStages(onRoute?.route ?? null, combination!.combinationKey, b.earlier ?? [], actor.id, new Date().toISOString());
    if ("field" in opening) fieldError(opening.field, opening.message);
    // A key detail that is also the person's answer (P-412 F13 (c): the UCI) passes the release's own check of that field.
    const releaseSnapshot = release!.snapshot as unknown as Snapshot;
    for (const [i, e] of (b.earlier ?? []).entries()) for (const [field, v] of Object.entries(e.key_details ?? {})) {
      const def = onRoute?.route.stages.find((x) => x.key === e.stage)?.key_details.find((d) => d.field === field);
      if (def?.same_every_stage && typeof v === "string" && v.trim() && shapeOf(releaseSnapshot, field)) { const p = checkValue(releaseSnapshot, field, v.trim(), new Date()); if (p.length) fieldError(`earlier.${i}.key_details.${field}`, `${def.label}: ${p[0]}`); }
    }
    let id: string;
    let stagesWritten: { stages: number; doneBefore: number } = { stages: 1, doneBefore: 0 };
    try {
      id = await this.db.$transaction(async (tx) => {
        const party = await tx.party.create({ data: { workspaceId, profile: { create: { workspaceId, displayName: b.principal.displayName } } } });
        // A24-1 (P-492, CS-7, AG-7-3): the firm's next case number for this year, taken in this transaction: an opening
        // made at the same moment waits on the counter row and gets the next one; a refused opening gives its number back.
        const [{ n: caseNumber }] = await tx.$queryRaw<{ n: string }[]>`SELECT runtime_next_case_number(${workspaceId}::uuid, ${firm!.key}, now()) AS n`;
        const c = await tx.case.create({ data: { workspaceId, firmKey: firm!.key, combinationId: b.combinationId, caseNumber, reference: b.reference ?? null, clientActorId: client!.id, createdBy: actor.id, idempotencyKey: b.idempotencyKey ?? null, idempotencyFingerprint: b.idempotencyKey ? fingerprint : null } });
        const caseSubject = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "case", label: "The application" } });
        const principal = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "principal", label: b.principal.displayName } });
        await tx.caseParticipant.createMany({ data: [{ workspaceId, caseId: c.id, subjectId: caseSubject.id, role: "case", order: 0 }, { workspaceId, caseId: c.id, subjectId: principal.id, role: "principal", order: 1 }] });
        await tx.caseTeamMember.createMany({ data: [{ workspaceId, caseId: c.id, userId: representative, role: "LEAD_REPRESENTATIVE", assignedBy: actor.id }, ...officers.map((u) => ({ workspaceId, caseId: c.id, userId: u, role: "OFFICER", assignedBy: actor.id }))] });
        await tx.packWorkPin.create({ data: { workspaceId, caseId: c.id, combinationId: b.combinationId, partyId: party.id, packVersionId: release!.packVersionId, configReleaseId: release!.id, contentHash: release!.sha256, actorId: actor.id } });
        // C6.17 (M5): every case writes its stage rows; a done-before stage's same-at-every-stage detail (the UCI) is also
        // the principal's answer, entered by the officer through the stage record (P-78 channel "stage_record").
        const at = new Date();
        const st = await writeOpeningStages(tx, { workspaceId, caseId: c.id, firmKey: firm!.key, combination: combination!, applicationSubjectId: caseSubject.id, route: onRoute?.route ?? null, earlier: b.earlier ?? [], actor: actor.id, at });
        if ("field" in st) fieldError(st.field, st.message);
        const written = st as Exclude<typeof st, { field: string }>;
        stagesWritten = written;
        for (const x of written.answers) {
          const item = (releaseSnapshot.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === x.field);
          const def = item ? await tx.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: x.field, version: item.item_version } }) : null;
          if (def) await tx.clientCanonicalAnswer.create({ data: { workspaceId, partyId: party.id, subjectId: principal.id, canonicalFieldId: def.id, canonicalFieldKey: x.field, valueJson: x.value, status: "DECLARED", sourceJson: { channel: STAGE_RECORD, actor: actor.id, at: at.toISOString() } } });
        }
        return c.id;
      }, { timeout: 15_000, maxWait: 10_000 }); // With the connections busy Prisma's default 2 s and 5 s answered a 500 (P2028)
    } catch (e) {
      if (!unique(e)) throw e;
      const same = await replay(); // a simultaneous create with the same key won: answer with its case
      if (same) return same;
      // Break m1: with no reference given, the clash can only be the case number (the firm's counter behind its cases).
      fail(b.reference ? "A case with this reference already exists; give the new case its own reference." : "The case could not be given its case number, so nothing was created. Ask the Lead.", HttpStatus.CONFLICT);
    }
    await this.audit.log(workspaceId, actor.id, "opened", "case", id!, `${actor.name} opened case ${short(id!)} on "${combination!.label}" released version ${release!.version} (${release!.sha256.slice(0, 12)}); representative of record ${nameIn(firm!, representative)}, case officers ${officers.map((o) => nameIn(firm!, o)).join(", ")}${stagesWritten.stages > 1 ? `; a stage of a route (${stagesWritten.stages} stages, ${stagesWritten.doneBefore} done before we started)` : ""}`, undefined, b.combinationId);
    return { ...(await this.get(actor, id!)), created: true };
  }

  async get(actor: Actor, caseId: string) {
    const c = await this.reach(actor, caseId, "read");
    const pin = c.pins[0];
    // C6.11: staff see the case team in the header (the client's screens come after M3, P-129).
    const team = isOfficer(actor) ? await this.teamLine(c.id) : undefined;
    const snapshot = this.snapshotOf(c), roleOfRelease = new Map(linesOf(snapshot).map((p) => [p.role, roleWords(p)]));
    const coFiling = new Set(linesOf(snapshot).filter((p) => p.filingMode === "co_files").map((p) => p.role));
    return { id: c.id, ...(team ? { team } : {}), case_number: c.caseNumber, reference: c.reference, status: c.status, combination_id: c.combinationId, client: c.clientActorId,
      pin: { release_version: pin.release.version, sha256: pin.contentHash, pinned_at: pin.pinnedAt, revision: pin.revision },
      // G13 (QA-140): the release in the studio's own words.
      release: { label: releaseLabel(pin.release), version: pin.release.version, release: pin.release.packVersion?.version ?? pin.release.version },
      // B115: each person's role in the release's own words (the sponsor has no fixed word on the screen).
      // B115 review m1: co_files marks the person whose application is always sent with the principal's (the sponsor).
      people: (() => { const client = new Map(this.peopleOf(c).map((x) => [x.subjectId, x.client])); return c.participants.map((p) => ({ subject_id: p.subjectId, role: p.role, role_label: roleOfRelease.get(p.role) ?? null, label: p.subject.label, applies: p.applies, co_files: coFiling.has(p.role),
        // C6.13 BR-3b (break M1): who the client is, once roles were swapped (absent before any swap: the principal).
        ...(client.get(p.subjectId) !== undefined ? { client: client.get(p.subjectId) } : {}) })); })(),
      // B115 (P-319): the roles the case page offers to add, from its pinned release, with how many the case has.
      can_add: offeredRoles(snapshot).map((p) => ({ role: p.role, label: roleWords(p), max: p.max!, has: c.participants.filter((x) => x.role === p.role).length })),
      // C11.5 (P-106): whether this case may rely on an employer case, read from its pinned release (staff only, as the team; review m3).
      // C1.3: and, once picked, the employer case it relies on (its facts copied then, never updated later).
      ...(team ? { employer_link: { ...employerLinkOffer(snapshot), linked: await linkedOf(this.db, c.workspaceId, c.id) } } : {}) };
  }

  /** V3 B1 (runtime side, P-297 (3)): what the "Open a case" dialog may offer. Each not retired combination's newest
   *  release (the one a case opens on), with the startable check `createCase` runs; opening a case keeps refusing a
   *  release that is not startable, and the dialog now says so before the officer tries. Staff only. */
  async openable(actor: Actor): Promise<OpenableRelease[]> {
    need(actor, "case");
    // The same people as opening a case (review minor): firm staff only.
    if (!firmOfActor(actor)) fail(`${actor.name} (simulated) is not staff of a firm, so cannot open a case.`, HttpStatus.FORBIDDEN);
    const workspaceId = await this.ws.id();
    const rows = await this.db.configRelease.findMany({ where: { workspaceId, combination: { retiredAt: null } }, orderBy: { version: "desc" }, distinct: ["combinationId"], include: { combination: { select: { label: true, combinationKey: true } } } });
    const routes = await routesOf(this.db, workspaceId);
    const out = await Promise.all(rows.map(async (r) => {
      const missing = await this.programs.startableMissing(r.combinationId, r);
      // C6.17 (BR-3): a later stage of a route says which stages come before it, so the dialog can record them.
      const on = routeOf(routes, r.combination.combinationKey);
      const stage = on && on.at > 0 ? { route: on.route.key, route_label: on.route.label, key: on.route.stages[on.at].key, name: on.route.stages[on.at].staff_name,
        earlier: on.route.stages.slice(0, on.at).map((x) => ({ key: x.key, name: x.staff_name, key_details: (x.key_details ?? []).map((d) => ({ field: d.field, label: d.label, type: d.type, same_every_stage: !!d.same_every_stage })) })) } : undefined;
      return { combination_id: r.combinationId, combination: r.combination.label, version: r.version, startable: !missing.length, items: missing.length, why: missing.length ? notReadyForCases(r.combination.label, missing.length) : null, ...(stage ? { stage } : {}) };
    }));
    return out.sort((a, b) => Number(b.startable) - Number(a.startable) || a.combination.localeCompare(b.combination));
  }

  /** C11.5 (P-106): before a case opens, whether one on this combination's newest release may rely on an employer case
   *  (the "Open a case" line). Staff only; a combination with no release answers 409, as opening one does. */
  async employerLink(actor: Actor, combinationId: string) {
    need(actor, "case");
    const workspaceId = await this.ws.id();
    const ok = /^[0-9a-f-]{36}$/i.test(combinationId) ? await this.db.combination.findFirst({ where: { id: combinationId, workspaceId }, select: { id: true, label: true } }) : null;
    if (!ok) fail("No such combination.", HttpStatus.NOT_FOUND);
    const release = await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" } });
    if (!release) fail(`"${ok!.label}" has no released version yet: a case opens only on a released configuration.`, HttpStatus.CONFLICT);
    return { combination_id: combinationId, release_version: release!.version, ...employerLinkOffer(release!.snapshot as unknown as Snapshot) };
  }

  /** The header's team chip: the representative of record and the case officers now (names from the Sample firm). */
  private async teamLine(caseId: string) {
    const rows = await this.db.caseTeamMember.findMany({ where: { caseId, endedAt: null }, orderBy: { assignedAt: "asc" } });
    const firm = (await this.db.case.findUnique({ where: { id: caseId }, select: { firmKey: true } }))!.firmKey;
    const f = firmByKey(firm), name = (id: string) => f?.users.find((u) => u.id === id)?.name ?? id;
    const rep = rows.find((r) => r.role === "LEAD_REPRESENTATIVE");
    return { firm: f ? { key: f.key, name: f.name, solo: f.solo } : null, stand_in: STAND_IN, representative: rep ? { id: rep.userId, name: name(rep.userId), licence: f?.users.find((u) => u.id === rep.userId)?.licence ?? null } : null, officers: rows.filter((r) => r.role === "OFFICER").map((r) => ({ id: r.userId, name: name(r.userId) })) };
  }

  /** Adds a person in any role the pinned release lists (addableRoles), within its limits. The case row is locked while counting, so simultaneous
   *  adds are counted one after the other (each lawful one succeeds; the one over the limit is refused). */
  async addPerson(actor: Actor, caseId: string, body: unknown) {
    const c = await this.reach(actor, caseId, "officer");
    const b = parse(NewPerson, body);
    const limits = linesOf(this.snapshotOf(c));
    const limit = limits.find((p) => p.role === b.role);
    // C11.12 BR-6: a role released as Declared only starts as not travelling when the request does not say.
    if (limit?.filingMode === "declared_only" && (body as { applies?: unknown } | null)?.applies === undefined) b.applies = false;
    // Break M2: a co-filing role (the sponsor) is never a travelling applicant; its sponsorship goes with the principal's.
    if (limit?.filingMode === "co_files") b.applies = false;
    // S5 (M3): any role the pinned release lists, within its maximum; anything else is refused (P-119).
    // QA-135: the role in the release's own words, never its internal name; the application itself is not a person.
    // Review m3: the examples are the roles this release really lets a person add (never a fixed list).
    // B117 (P-373, C7.7): the representative of record comes from the case team, never from this list (see below).
    const addable = offeredRoles(this.snapshotOf(c)).map((p) => roleWords(p).toLowerCase());
    const canAdd = addable.length ? `This application can add: ${addable.join(", ")}.` : "This application lists no one else to add.";
    if (b.role === "case") fail(`The application itself is not a person, so it cannot be added. ${canAdd}`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!limit || !(limit.max ?? 0)) fail(`This case's release does not list a ${(limit?.label ?? b.role.replace(/_/g, " ")).toLowerCase()} in who can be in this application, so one cannot be added.`, HttpStatus.UNPROCESSABLE_ENTITY);
    // B117: a representative added here would be a person on the case whose answers displace the firm record's (C7.7),
    // though no screen offers it. The representative of record is chosen in the case team ("Case team" on the case page).
    if (b.role === REPRESENTATIVE) fail(`The ${(limit!.label ?? "representative").toLowerCase()} cannot be added as a person: the case's representative of record comes from its case team ("Case team" on the case page). ${canAdd}`, HttpStatus.UNPROCESSABLE_ENTITY);
    const workspaceId = c.workspaceId;
    // QA-28: the same idempotency key answers with the person it added; a different request with that key is refused.
    const { idempotencyKey: key, ...request } = b;
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const replay = async () => {
      const again = key ? await this.db.caseParticipant.findFirst({ where: { caseId, idempotencyKey: key }, include: { subject: true } }) : null;
      if (!again) return null;
      if (again.idempotencyFingerprint !== fingerprint) fail("This idempotency key was already used to add a different person; nothing was added. Use a new key.", HttpStatus.CONFLICT);
      return { subject_id: again.subjectId, role: again.role as CaseRole, label: again.subject.label, applies: again.applies, created: false };
    };
    const earlier = await replay();
    if (earlier) return earlier;
    let subjectId: string | null;
    try { subjectId = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR UPDATE`;
      await refuseIfCaseRecorded(tx, caseId, "nobody is added"); // C8.2 review M1, under the case's row lock
      const same = key ? await tx.caseParticipant.findFirst({ where: { caseId, idempotencyKey: key } }) : null;
      if (same) return null; // the first press won while this one waited for the lock: answered below
      const now = await tx.caseParticipant.findMany({ where: { caseId } });
      const already = now.filter((p) => p.role === b.role).length;
      if (limit!.max !== undefined && already >= limit!.max) fail(`The release allows at most ${limit!.max} ${(limit!.label ?? b.role).toLowerCase()} on a case; this case has ${already}.`, HttpStatus.UNPROCESSABLE_ENTITY);
      const principal = c.participants.find((p) => p.role === "principal")!;
      const party = await tx.party.create({ data: { workspaceId, profile: { create: { workspaceId, displayName: b.displayName } } } });
      await tx.partyRelationship.create({ data: { workspaceId, fromPartyId: principal.subject.partyId, toPartyId: party.id, relationshipType: RELATIONSHIP[b.role] ?? b.role.toUpperCase() } });
      const s = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: b.role, label: b.displayName } });
      await tx.caseParticipant.create({ data: { workspaceId, caseId, subjectId: s.id, role: b.role, applies: b.applies, order: Math.max(...now.map((p) => p.order)) + 1, idempotencyKey: key ?? null, idempotencyFingerprint: key ? fingerprint : null } });
      return s.id;
    }); } catch (e) { if (!unique(e)) throw e; subjectId = null; }
    if (!subjectId) { const same = await replay(); if (same) return same; conflict("Someone added a person to this case at the same moment; refresh and try again."); }
    await this.audit.log(workspaceId, actor.id, "added", "person", caseId, `${actor.name} added a ${b.role.replace(/_/g, " ")} to case ${short(caseId)}`);
    return { subject_id: subjectId, role: b.role as CaseRole, label: b.displayName, applies: b.applies, created: true };
  }

  async updatePerson(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.reach(actor, caseId, "officer");
    const b = parse(UpdatePerson, body);
    const p = c.participants.find((x) => x.subjectId === subjectId && x.role !== "case" && x.role !== "principal");
    if (!p) fail("Only a spouse, partner or child on this case can be marked travelling or not.", HttpStatus.NOT_FOUND);
    // C11.12 BR-6: a co-filing role (the sponsor) is not travelling or not: its application always goes with the principal's.
    const line = linesOf(this.snapshotOf(c)).find((x) => x.role === p!.role);
    if (line?.filingMode === "co_files") fail(`The ${(line.label ?? "sponsor").toLowerCase()}'s application is always sent with the principal's.`, HttpStatus.UNPROCESSABLE_ENTITY);
    // C8.2 review M1: under the case's row lock, so a record and this change never pass each other.
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR NO KEY UPDATE`;
      await refuseIfCaseRecorded(tx, caseId, `nobody is marked ${b.applies ? "travelling" : "not travelling"}`);
      await tx.caseParticipant.update({ where: { id: p!.id }, data: { applies: b.applies } });
      // C6.13 BR-10 (M4): this door changes a filing too, so it leaves the same record as the Filing changes route (no
      // reason is typed here; the screen uses POST …/filing-changes, with its preview and reason).
      if (p!.applies !== b.applies) {
        const roles = Object.fromEntries(c.participants.filter((x) => x.role !== "case").map((x) => [x.subjectId, { role: x.role, applies: x.applies }]));
        await tx.filingChange.create({ data: { workspaceId: c.workspaceId, caseId, kind: "travelling_flag", subjectId, rolesBefore: roles, rolesAfter: { ...roles, [subjectId]: { role: p!.role, applies: b.applies } }, changedBy: actor.id } });
        // C6.13 BR-6 (break M2): a filing starting or stopping changes the others' fees, so no filing of the case stays
        // marked Ready to file on the old shape (this door has no preview to name them; the case page uses the preview).
        await tx.filing.updateMany({ where: { caseId, stageId: c.stage.id, status: "READY_TO_FILE" }, data: { status: "NOT_STARTED" } });
      }
    });
    await this.audit.log(c.workspaceId, actor.id, "changed", "person", caseId, `${actor.name} marked a ${p!.role.replace(/_/g, " ")} on case ${short(caseId)} as ${b.applies ? "travelling" : "not travelling"}`);
    return { subject_id: subjectId, applies: b.applies };
  }

  async state(c: Reached) {
    // B128: a relative's answers are read under the relative's key (`<person>/parent_1`), as the forms read them.
    const relatives = await this.relativesOf(c), keyOf = new Map(relatives.map((r) => [r.id, r.key]));
    const subjects = [...c.participants.map((p) => p.subjectId), ...relatives.map((r) => r.id)];
    const [answers, rows, groupRows] = await Promise.all([
      this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, supersededById: null } }),
      this.db.clientFactRecord.findMany({ where: { subjectId: { in: subjects }, supersededById: null, tombstone: false } }),
      this.db.clientGroupAnswer.findMany({ where: { subjectId: { in: subjects }, supersededById: null } }),
    ]);
    // A confirmation version names the answer it confirmed (sourceJson.from): who first answered stays visible (review M4).
    const fromIds = answers.map((x) => (x.sourceJson as { from?: string }).from).filter((x): x is string => !!x);
    const firsts = new Map((fromIds.length ? await this.db.clientCanonicalAnswer.findMany({ where: { id: { in: fromIds } }, select: { id: true, sourceJson: true } }) : []).map((x) => [x.id, x.sourceJson as { channel: string; actor: string; at: string; recorded?: { by: string; at: string } }]));
    const bg = this.backgroundOf(c);
    const a: Answer[] = answers.map((x) => { const src = x.sourceJson as { channel: string; actor: string; at: string; from?: string; recorded?: { by: string; at: string }; earlier_case?: string; earlier_reference?: string; reconfirmed_by?: string; reconfirmed_at?: string }; const first = src.from ? firsts.get(src.from) : undefined;
      // C6.19 (challenge B1, review M1): a copy from an earlier case keeps its status and its giver (channel, actor, and the
      // earlier answer's own `from`, so the origin is still who first gave it); where it came from is said apart.
      const copiedFrom = src.earlier_case && src.reconfirmed_by && src.reconfirmed_at ? { reference: src.earlier_reference ?? "", by: src.reconfirmed_by, at: src.reconfirmed_at } : null;
      const one: Answer = { id: x.id, subjectId: keyOf.get(x.subjectId) ?? x.subjectId, field: x.canonicalFieldKey, rowKey: x.rowKey, value: x.valueJson, status: x.status as Answer["status"], channel: src.channel, actor: src.actor, at: src.at, origin: first ? { channel: first.channel, actor: first.actor, at: first.at } : null, ...(copiedFrom ? { copiedFrom } : {}) };
      // C6.18 (P-244): a background answer, and whether an officer recorded it and the client has not re-confirmed it.
      if (!bg.has(one.field)) return one;
      // Who on the staff recorded it: this version, the version it confirms, or (re-confirmed) the one the client's names.
      const officerRecorded = src.channel === OFFICER_ENTRY ? { by: src.actor, at: src.at } : first?.channel === OFFICER_ENTRY ? { by: first.actor, at: first.at } : src.recorded ?? first?.recorded ?? null;
      return { ...one, background: true, awaitsClient: awaitsClient(one, bg), officerRecorded }; });
    const r: Row[] = rows.map((x) => ({ rowKey: x.rowKey, subjectId: keyOf.get(x.subjectId) ?? x.subjectId, group: x.groupKey, order: x.order }));
    const gFrom = groupRows.map((x) => (x.sourceJson as { from?: string }).from).filter((x): x is string => !!x);
    const gFirsts = new Map((gFrom.length ? await this.db.clientGroupAnswer.findMany({ where: { id: { in: gFrom } }, select: { id: true, sourceJson: true } }) : []).map((x) => [x.id, x.sourceJson as { channel: string; actor: string; at: string }]));
    const groups: GroupAnswer[] = groupRows.map((x) => { const src = x.sourceJson as { channel: string; actor: string; at: string; from?: string }; const first = src.from ? gFirsts.get(src.from) : undefined; return { id: x.id, subjectId: keyOf.get(x.subjectId) ?? x.subjectId, group: x.groupKey, noneApply: x.noneApply, status: x.status as GroupAnswer["status"], channel: src.channel, actor: src.actor, at: src.at, origin: first ? { channel: first.channel, actor: first.actor, at: first.at } : null }; });
    // C7.7 (G25): IMM 5476's representative block reads the representative of record from the firm record (never asked).
    // C6.11: so do its licence part and firm name, and "Uses a representative" for the application (the case has a
    // representative of record), which replaces any answer typed before.
    const f = firmByKey(c.firmKey), caseSubject = c.participants.find((p) => p.role === "case")?.subjectId;
    // QA-289: the office phone in the shape this release's question reads it (parts where a form writes it part by part).
    const phoneParts = shapeOf(this.snapshotOf(c), "person.telephone_number").phone;
    const fromFirm = f ? representativeAnswers(f, (await this.db.caseTeamMember.findMany({ where: { caseId: c.id } })).map((m): Member => ({ ...m, role: m.role as Member["role"] })), caseSubject, phoneParts) : [];
    const firmGives = new Set(fromFirm.map((x) => `${x.subjectId}|${x.field}`));
    return { answers: [...a.filter((x) => !firmGives.has(`${x.subjectId}|${x.field}`)), ...fromFirm], rows: r, groups };
  }

  async view(actor: Actor, caseId: string, mode: Mode) {
    const c = await this.reach(actor, caseId, "read");
    if (mode === "agent" && !isOfficer(actor)) fail("The Agent view is for the case officer.", HttpStatus.FORBIDDEN);
    if (!isOfficer(actor)) {
      // QA-322 for the client too (lost in the third main merge: this early return skipped main's line below). Read
      // from clientView's sections, so a private person's parts carry no note either (C6.16 BR-7).
      const v = await this.clientView(c);
      const checks = [...v.view.checks, ...await this.documentChecks(c, v.view.sections)];
      return { case: await this.get(actor, caseId), ...v.view, checks, private_people: v.private_people };
    }
    const { answers, rows, groups } = await this.state(c);
    const view = caseView(this.snapshotOf(c), this.peopleOf(c), answers, rows, mode, new Date(), groups, { background: this.backgroundOf(c) });
    // QA-322 (P-142 D6): the client sees "please check" on an answer while a typed-versus-document check is open on it.
    // The client's view only: the officer resolves the check in the drawer, with a reason (unchanged), and only staff
    // mark a value checked (P-142 D3). The document's value is not shown here; the client is asked to look again.
    if (mode !== "agent") view.checks = [...view.checks, ...await this.documentChecks(c, view.sections)];
    return { case: await this.get(actor, caseId), ...view };
  }

  /** QA-322: the open typed-versus-document checks (C6.5, BR-7) as "please check" notes on the client's own parts. A
   *  check on a question the client is not asked (an answer staff enter from the document) is not shown to the client. */
  private async documentChecks(c: Reached, sections: ReturnType<typeof caseView>["sections"]): Promise<ReturnType<typeof caseView>["checks"]> {
    const open = await this.db.answerCheck.findMany({ where: { caseId: c.id, state: "open" }, select: { id: true, subjectId: true, fact: true, documentId: true, typedValueJson: true }, orderBy: [{ openedAt: "asc" }, { id: "asc" }] });
    if (!open.length) return [];
    const docs = await this.db.caseDocument.findMany({ where: { id: { in: [...new Set(open.map((k) => k.documentId))] } }, select: { id: true, documentType: true } });
    const types = (this.snapshotOf(c).document_types ?? []) as { key: string; name: string }[];
    const nameOf = (id: string) => { const key = docs.find((d) => d.id === id)?.documentType ?? "document"; return types.find((t) => t.key === key)?.name ?? key.replace(/_/g, " "); };
    // Review m1, M1 on 673f0794d: whether the answer now holds another value than the one the check compared, by value
    // (never by row: the same value saved again, or changed back, is still the compared answer), whoever changed it.
    const current = await this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: [...new Set(open.map((k) => k.subjectId))] }, rowKey: null, supersededById: null, canonicalFieldKey: { in: [...new Set(open.map((k) => k.fact))] } }, select: { subjectId: true, canonicalFieldKey: true, valueJson: true } });
    const now = (k: (typeof open)[number]) => current.find((a) => a.subjectId === k.subjectId && a.canonicalFieldKey === k.fact)?.valueJson;
    return open.flatMap((k) => {
      const sec = sections.find((x) => x.subjectId === k.subjectId && x.questions.some((q) => q.fact === k.fact && !q.hidden && !q.group));
      if (!sec) return [];
      return [{ id: `document_check.${k.id}`, severity: "warn", group: "document", subjectId: k.subjectId, about_label: sec.about_label, fact: k.fact, section: sec.section, illustrative: false,
        message: documentCheckNote(k.fact, nameOf(k.documentId), k.typedValueJson, now(k)) }];
    });
  }

  /** C6.16 BR-7 (challenge M3, M4): the client's questionnaire. The values, rows and group answers of a person whose
   *  stored setting is on are left out before anything is worked out, so no follow-up question, check or form reveals
   *  them; that person's parts are dropped and their progress (counted from all answers, on the server) takes their place. */
  async clientView(c: Reached) {
    const s = this.snapshotOf(c), people = this.peopleOf(c), now = new Date();
    const st = await this.state(c);
    const hidden = new Set(c.participants.filter((p) => this.hiddenFromClient(c, p.subjectId)).map((p) => p.subjectId));
    const opts = { background: this.backgroundOf(c) };
    if (!hidden.size) return { view: caseView(s, people, st.answers, st.rows, "sqr", now, st.groups, opts), private_people: [] };
    const full = caseView(s, people, st.answers, st.rows, "sqr", now, st.groups, opts);
    const private_people = c.participants.filter((p) => hidden.has(p.subjectId)).map((p) => ({ subject_id: p.subjectId, label: p.subject.label, progress: progressOf(full.sections.filter((x) => ownerOf(x.subjectId) === p.subjectId)) }));
    // B128: a private person's relatives' answers (`<person>/parent_1`) are theirs too, and are left out with them.
    const shown = (id: string) => !hidden.has(ownerOf(id));
    const seen = caseView(s, people, st.answers.filter((a) => shown(a.subjectId)), st.rows.filter((r) => shown(r.subjectId)), "sqr", now, st.groups.filter((g) => shown(g.subjectId)), opts);
    const labels = (keep: boolean) => new Set(c.participants.filter((p) => hidden.has(p.subjectId) === keep).map((p) => p.subject.label));
    return { view: withoutHidden(seen, hidden, labels(true), labels(false)), private_people };
  }

  /** C6.16 BR-5 (SA-1B-269 rule 2): what an adult reads on their own link: their own parts (to answer) and the
   *  application's (shared, read-only); nobody else's part, check or form. */
  async linkView(c: Reached, own: string) {
    const s = this.snapshotOf(c), st = await this.state(c);
    const caseSubject = c.participants.find((p) => p.role === "case")?.subjectId;
    const keep = (id: string) => ownerOf(id) === own || id === caseSubject; // their relatives' parts are theirs too (B128)
    const v = caseView(s, this.peopleOf(c), st.answers, st.rows, "sqr", new Date(), st.groups, { background: this.backgroundOf(c) });
    const others = new Set(c.participants.filter((p) => !keep(p.subjectId)).map((p) => p.subjectId));
    const labels = (k: boolean) => new Set(c.participants.filter((p) => keep(p.subjectId) === k).map((p) => p.subject.label));
    return { case: { id: c.id, reference: caseName(c), people: c.participants.filter((p) => keep(p.subjectId)).map((p) => ({ subject_id: p.subjectId, role: p.role, label: p.subject.label, applies: p.applies })) }, own,
      ...withoutHidden(v, others, labels(false), labels(true)) };
  }

  /** P-47 mode 1, PQR (C4.4 part 2): the pre-qualification questions only, with a plain result line. The officer's PQR
   *  reads the agent view; a client's reads their own questionnaire (PQR ⊂ SQR). */
  async pqr(actor: Actor, caseId: string) {
    const c = await this.reach(actor, caseId, "read");
    const s = this.snapshotOf(c), people = this.peopleOf(c);
    if (!isOfficer(actor)) return { case: await this.get(actor, caseId), ...pqrView(s, people, (await this.clientView(c)).view) }; // C6.16 BR-7
    const { answers, rows, groups } = await this.state(c);
    return { case: await this.get(actor, caseId), ...pqrView(s, people, caseView(s, people, answers, rows, "agent", new Date(), groups)) };
  }

  /** P-47 tier 3 (C4.4 part 2): the independent review the officer runs on demand. It reads answers and never changes
   *  them. The run itself is an AI call (C7.5, M3-E): with this copy's live switch off it is refused in words at US$0
   *  before anything starts (P-175, QA-100); with it on it is still refused until C7.5 builds the run. Nothing is written. */
  async review(actor: Actor, caseId: string) {
    await this.reach(actor, caseId, "read");
    if (!isOfficer(actor)) fail("The independent review is run by the case officer.", HttpStatus.FORBIDDEN);
    if (!aiLive()) refused("The independent review is an AI run, and live AI is off on this copy (the founder's switch). Nothing was run and nothing changed: US$0.");
    return refused("The independent review runs from the case's Review page, one person's form at a time (POST /api/runtime/cases/:id/review-runs, C7.5). Nothing was run and nothing changed: US$0.");
  }

  /** Saves one answer: append-only (the old row is stamped superseded by the new one, in one transaction). A client
   *  answers only the client's own fields (engine rule, P-72); the officer any fact. Never blocked by its checks (P-47). */
  async putAnswer(actor: Actor, caseId: string, subjectId: string, fieldKey: string, body: unknown) {
    if (!FIELD_KEY.test(fieldKey)) fail("No such question.", HttpStatus.NOT_FOUND);
    const c = await this.reach(actor, caseId, "answer");
    return this.saveAnswer(c, writerOf(actor), subjectId, fieldKey, body, () => this.view(actor, caseId, isOfficer(actor) ? "agent" : "sqr"));
  }

  /** C6.16 (challenge M3): before any value of the person is read, the writer must be allowed to write them: a client
   *  never writes a person whose stored setting is on (403, also after take back: challenge M4); a link writes only its
   *  own person. */
  private refusePrivate(w: Writer, c: Reached, subjectId: string) {
    if (w.officer) return;
    // B128, B155: a relative (`<person>/parent_1`, `<person>/sibling`) is that person's: the person's setting decides.
    const owner = ownerOf(subjectId);
    if (w.own !== null) { if (owner !== w.own) fail("Your link is for your own questions only.", HttpStatus.FORBIDDEN); return; }
    const p = this.hiddenFromClient(c, owner);
    if (p) fail(privateWords(p.subject.label), HttpStatus.FORBIDDEN);
  }

  /** One answer saved by case staff, the client or an adult on their own link (Writer). */
  async saveAnswer(c: Reached, w: Writer, subjectId: string, fieldKey: string, body: unknown, after: () => Promise<{ sections: CaseView["sections"] }>) {
    if (!FIELD_KEY.test(fieldKey)) fail("No such question.", HttpStatus.NOT_FOUND);
    const caseId = c.id;
    const b = parse(PutAnswer, body);
    const s = this.snapshotOf(c), officer = w.officer;
    // QA-293: the representative is no person on the case; their details come only from the firm record of the
    // representative of record (C7.7, C6.11), so a save about them is refused in words (never "not on this case").
    if (subjectId === REPRESENTATIVE) fail(REPRESENTATIVE_NOT_TYPED, HttpStatus.UNPROCESSABLE_ENTITY);
    this.refusePrivate(w, c, subjectId); // C6.16 BR-7: before the current answer (and the 409 body) is read
    // B128: a relative's answer (`<person>/parent_1`) is kept on the relative's own subject, never on the person's.
    const { who } = await this.subjectFor(c, subjectId, false, fieldKey);
    // C6.11: "Uses a representative" comes from the case team (the representative of record), never typed; a client is
    // told the case team sets it (403), staff that the team changes it (422). Only while the case has a representative.
    if (fieldKey === USES_REPRESENTATIVE && who!.role === "case" && await this.db.caseTeamMember.count({ where: { caseId, role: "LEAD_REPRESENTATIVE", endedAt: null } })) {
      if (!officer) fail("Your case team sets whether a representative is used; you don't need to answer it.", HttpStatus.FORBIDDEN);
      fail("Uses a representative comes from the case team: this case has a representative of record. Change the team (Case team), not the answer.", HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const field = (s.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === fieldKey);
    const place = (s.placements as { fact: string; repeats: string; section_id: string; collected_from: string; scope?: string }[]).find((p) => p.fact === fieldKey);
    if (!field || !place) fail(`The release this case works from does not ask for ${fieldKey}.`, HttpStatus.NOT_FOUND);
    if (!officer && !isClientField(s, fieldKey)) fail("The officer enters this fact from a document or record.", HttpStatus.FORBIDDEN);
    // P-97, P-130: a declaration is always the client's own; the officer never makes it for them (C4.4 review M1).
    if (officer && (field as { value_type?: string }).value_type === "declaration") fail("Only the client makes this declaration, in their own questionnaire; the officer cannot tick it for them.", HttpStatus.FORBIDDEN);
    // R5 and C3.16 BR-4: a filing fact, or a household or employer fact (the release's mark), is saved once on the case.
    const caseLevel = isFilingFact(fieldKey, place);
    if (caseLevel !== (who!.role === "case")) fail(caseLevel ? ONCE_WORDS[place!.scope === "household" || place!.scope === "organisation" ? place!.scope : "filing"] : "This is asked for a person, not for the application.", HttpStatus.UNPROCESSABLE_ENTITY);
    // B155: a list relative's answers (a brother or sister) are always in an entry of its group, named by the relation.
    const listRel = relativeOf(subjectId), groupKey = listRel && isListRelation(listRel.relation) ? listRel.relation : place!.repeats === "per_row" ? place!.section_id : null;
    if (!groupKey && b.row) fail("This question has one answer, not rows.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (groupKey && !b.row) fail("Name the row this answer belongs to (add a row first).", HttpStatus.UNPROCESSABLE_ENTITY);
    // B155 (break m2 on #1367): an entry of a list relative that has a row on the form takes only what that row has a box for
    // (IMM 5645 maps "accompanies" on its seventh row only): an answer nobody is asked for there is refused, never kept hidden.
    if (listRel && isListRelation(listRel.relation) && b.row) {
      const held = (await this.subjectFor(c, subjectId, false, fieldKey)).stored;
      const live = held ? (await this.db.clientFactRecord.findMany({ where: { subjectId: held, groupKey: listRel.relation, supersededById: null, tombstone: false }, select: { rowKey: true, order: true } })).sort((x, y) => x.order - y.order || x.rowKey.localeCompare(y.rowKey)) : [];
      const at = live.findIndex((x) => x.rowKey === b.row);
      const boxes = (s.field_maps as { entries: { person?: string | null; outcome?: string; fact?: string | null; row?: number | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.outcome === "mapped" && e.person === `subject_${listRel.relation}` && typeof e.row === "number"));
      const rowsOf = (f?: string) => new Set(boxes.filter((e) => !f || e.fact === f).map((e) => e.row!));
      if (at >= 0 && rowsOf().has(at) && !rowsOf(fieldKey).has(at)) fail(`The form has no room for this answer in entry ${at + 1}: it is asked only in entry ${[...rowsOf(fieldKey)].sort((x, y) => x - y).map((r) => r + 1).join(", ")}.`, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const def = await this.db.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: fieldKey, version: field!.item_version } });
    if (!def) fail(`The library has no version ${field!.item_version} of ${fieldKey}.`, HttpStatus.CONFLICT);
    const rowKey = b.row ?? null;
    const source = { channel: officer ? OFFICER_ENTRY : w.channel, actor: w.id, at: new Date().toISOString() }; // C6.16: own_link on a person's own link
    // C6.18 (P-244): staff may record a background answer (by phone or in person): it is marked "Officer" (its channel,
    // who and when) and waits for the client to re-confirm it before signing. A blank is never saved (PutAnswer).
    const recordedForClient = officer && this.backgroundOf(c).has(fieldKey);
    // Break M2 on #1246: a blank in any shape (spaces, an empty list or group) is no answer to a background question,
    // whoever gives it: it is refused, never saved or re-confirmed (P-244: a blank is never defaulted).
    if (this.backgroundOf(c).has(fieldKey) && isBlank(b.value)) fail("Give an answer: a background question is never saved blank (spaces or an empty list are blank).", HttpStatus.BAD_REQUEST);
    const newId = randomUUID();
    const stored = subjectId === who!.subjectId ? subjectId : (await this.subjectFor(c, subjectId, true, fieldKey)).stored!;
    try {
      await this.db.$transaction(async (tx) => {
        // C6.17 (breaker M5): an answer about the application is the current stage's: read the stage again under the case
        // row (a start holds it FOR UPDATE), so an answer racing "Start next stage" never lands on the ended application.
        if (who!.role === "case") {
          await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR KEY SHARE`;
          const now = await tx.caseStage.findFirst({ where: { caseId: c.id, state: "CURRENT" }, select: { applicationSubjectId: true } });
          if (now?.applicationSubjectId !== stored) conflict("This case moved to its next stage while you answered: this application's questions are asked again there. Read the case again; nothing was saved.");
        }
        // C6.16 (break m8): the setting is read again under a share lock, so a client's save that races the adult's first
        // right code (which updates this row) is refused once privacy is on, never saved just after.
        if (!officer && w.own === null) {
          const owner = ownerOf(subjectId), [row] = await tx.$queryRaw<{ keep_private: boolean; label: string }[]>`SELECT p.keep_private, s.label FROM case_participant p JOIN answer_subject s ON s.id = p.subject_id WHERE p.subject_id = ${owner}::uuid FOR SHARE OF p`;
          if (row?.keep_private && owner !== this.clientSubjectOf(c)) fail(privateWords(row.label), HttpStatus.FORBIDDEN);
        }
        // The row stays live until this answer is saved: a removal at the same moment waits, or wins and this one is refused.
        if (rowKey) { const live = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM client_fact_record WHERE row_key = ${rowKey}::uuid AND subject_id = ${stored}::uuid AND group_key = ${groupKey} AND superseded_by_id IS NULL AND NOT tombstone FOR SHARE`; if (!live.length) fail("No such row for this person.", HttpStatus.NOT_FOUND); }
        const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId: stored, canonicalFieldKey: fieldKey, rowKey, supersededById: null } });
        if ((current?.id ?? null) !== b.expectedId) conflict("Someone changed this answer after you opened it; the newer answer is shown. Check it and save again.", { current: current ? { id: current.id, value: current.valueJson, by: (current.sourceJson as { actor: string }).actor } : null });
        if (current) { const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: current.id, supersededById: null }, data: { supersededById: newId } }); if (n.count !== 1) conflict("Someone changed this answer at the same moment; refresh and save again."); }
        await tx.clientCanonicalAnswer.create({ data: { id: newId, workspaceId: c.workspaceId, partyId: who!.subject.partyId, subjectId: stored, canonicalFieldId: def!.id, canonicalFieldKey: fieldKey, rowKey, valueJson: b.value as object, status: "DECLARED", sourceJson: source } });
      });
    } catch (e) {
      if (unique(e)) { const now = await this.db.clientCanonicalAnswer.findFirst({ where: { subjectId: stored, canonicalFieldKey: fieldKey, rowKey, supersededById: null } }); conflict("Someone answered this at the same moment; their answer is shown. Check it and save again.", { current: now ? { id: now.id, value: now.valueJson } : null }); }
      throw e;
    }
    await this.audit.log(c.workspaceId, w.id, "answered", "case fact", fieldKey, `${w.name} ${b.expectedId ? "changed" : "answered"} ${fieldKey} on case ${short(caseId)} (${officer ? "Agent view" : w.own ? "their own link" : "Client questionnaire"}${recordedForClient ? "; a background answer recorded by staff, marked Officer: the client re-confirms it before signing" : ""})`);
    const q = (await after()).sections.flatMap((x) => x.questions).find((x) => x.subjectId === subjectId && x.fact === fieldKey);
    const ans = rowKey ? q?.rows.find((x) => x.row === rowKey)?.answer : q?.answer;
    const fills = q?.fills ?? [];
    // B155 (break m3 on #1367): an entry of a list with no row on the form fills no form field: it goes on an extra sheet.
    const offForm = !!listRel && isListRelation(listRel.relation) && !!rowKey && q?.rows.find((x) => x.row === rowKey)?.fits === false;
    return { answer: ans ?? { id: newId, problems: checkValue(s, fieldKey, b.value) }, fills,
      message: `${offForm ? "Saved. This entry has no row on the form: write it on an extra sheet." : fills.length ? `Saved. It fills ${fillsText(fills, true)}.` : "Saved."}${recordedForClient ? " Marked Officer: the client re-confirms it before signing." : ""}` };
  }

  /** C6.18 (P-244): the client re-confirms one background answer their case officer recorded (by phone or in person),
   *  the version they were shown: a new version of the same value, the client's own from now on, that still names the
   *  officer's answer (who recorded it and when stays visible). Only the client does this; staff never do it for them.
   *  To change the value instead, the client answers the question again (their own answer replaces the officer's). */
  async reconfirm(actor: Actor, caseId: string, answerId: string, body: unknown = {}) {
    if (isOfficer(actor)) fail("Only the client re-confirms an answer their case officer recorded; staff cannot do it for them.", HttpStatus.FORBIDDEN);
    const c = await this.reach(actor, caseId, "answer");
    const b = parse(Reconfirm, body ?? {});
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const row = UUID.test(answerId) ? await this.db.clientCanonicalAnswer.findUnique({ where: { id: answerId } }) : null;
    if (!row || !c.participants.some((p) => p.subjectId === row.subjectId)) fail("No such answer on this case.", HttpStatus.NOT_FOUND);
    this.refusePrivate(writerOf(actor), c, row!.subjectId); // C6.16 BR-7: before the newer answer (and its value) is read
    const newer = () => this.db.clientCanonicalAnswer.findFirst({ where: { subjectId: row!.subjectId, canonicalFieldKey: row!.canonicalFieldKey, rowKey: row!.rowKey, supersededById: null } });
    if (row!.supersededById) { const now = await newer(); conflict("This answer changed after you opened it; nothing was re-confirmed. Check the newer answer shown, then re-confirm that one.", { current: now ? { id: now.id, value: now.valueJson } : null }); }
    const a: Answer | undefined = (await this.state(c)).answers.find((x) => x.id === answerId);
    if (!a?.awaitsClient) refused("Nothing to re-confirm: your case officer did not record this answer for you, or you have already re-confirmed it.");
    if (!isClientField(this.snapshotOf(c), row!.canonicalFieldKey)) fail("The officer enters this fact from a document or record.", HttpStatus.FORBIDDEN);
    // Break M1 on #1246: what the client has on screen is the officer's answer, or they changed it (then it is saved, as theirs).
    if (b.value !== undefined && JSON.stringify(b.value) !== JSON.stringify(row!.valueJson)) refused("You changed this answer, so it was not re-confirmed as your case officer's. Press Save to keep your answer.");
    // Break M2 on #1246: an answer with a problem is never vouched for as it is.
    const problems = checkValue(this.snapshotOf(c), row!.canonicalFieldKey, row!.valueJson);
    if (problems.length) refused(`This answer needs a fix first: ${problems.join(" ")} Change it, then save it as your answer.`);
    // The officer's own answer stays the one named (a "Confirm section" version names it in its turn).
    const officerAnswer = (row!.sourceJson as { channel: string; from?: string }).channel === OFFICER_ENTRY ? row!.id : (row!.sourceJson as { from?: string }).from ?? row!.id;
    const id = randomUUID(), at = new Date().toISOString();
    await this.db.$transaction(async (tx) => {
      const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: row!.id, supersededById: null }, data: { supersededById: id } });
      if (n.count !== 1) conflict("This answer changed at the same moment; nothing was re-confirmed. Check the newer answer shown, then re-confirm that one.");
      await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: row!.workspaceId, partyId: row!.partyId, subjectId: row!.subjectId, canonicalFieldId: row!.canonicalFieldId, canonicalFieldKey: row!.canonicalFieldKey, rowKey: row!.rowKey, valueJson: row!.valueJson as object, status: "DECLARED", sourceJson: { channel: CLIENT_RECONFIRM, actor: actor.id, at, from: officerAnswer, recorded: a!.officerRecorded ?? null } } });
    });
    await this.audit.log(c.workspaceId, actor.id, "re-confirmed", "case fact", row!.canonicalFieldKey, `${actor.name} re-confirmed ${row!.canonicalFieldKey} on case ${short(caseId)}: a background answer ${RUNTIME_ACTORS.find((x) => x.id === a!.officerRecorded?.by)?.name ?? "a member of staff"} recorded (Officer)`);
    const after = await this.view(actor, caseId, "sqr");
    const q = after.sections.flatMap((x) => x.questions).find((x) => x.subjectId === row!.subjectId && x.fact === row!.canonicalFieldKey);
    return { answer: (row!.rowKey ? q?.rows.find((x) => x.row === row!.rowKey)?.answer : q?.answer) ?? null, message: "Re-confirmed: it is your own answer now." };
  }

  /** Adds a row to a person's repeating group (or the application's, for a case-level group). Rows of one group are
   *  numbered one at a time (a transaction lock), and the database refuses two live rows in one place. */
  /** Who may write a repeating group of a person on this case: the group exists, belongs to that kind of subject, and
   *  the client writes it only when it holds a client field. */
  private async groupFor(w: Writer, c: Reached, subjectId: string, groupKey: string, create = false): Promise<{ who: Reached["participants"][number]; stored: string | null }> {
    if (subjectId === REPRESENTATIVE) fail(REPRESENTATIVE_NOT_TYPED, HttpStatus.UNPROCESSABLE_ENTITY); // QA-293 review m3
    this.refusePrivate(w, c, subjectId); // C6.16 BR-7
    const s = this.snapshotOf(c);
    // B155: a list relative's group (`<person>/sibling`, group "sibling"): the release's forms read that relation, the
    // client writes it when one of its facts is a client field, and it is kept on the relative's own subject (made on the
    // first entry or "none apply", as a parent's is on the first answer).
    const rel = relativeOf(subjectId);
    if (rel) {
      if (!isListRelation(rel.relation) || groupKey !== rel.relation) fail("That section has no repeating group.", HttpStatus.NOT_FOUND);
      const { who, stored } = await this.subjectFor(c, subjectId, create);
      const facts = new Set((s.field_maps as { entries: { person?: string | null; outcome?: string; fact?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.outcome === "mapped" && e.person === `subject_${rel.relation}` && e.fact).map((e) => e.fact!)));
      if (!w.officer && ![...facts].some((f) => isClientField(s, f))) fail("The officer fills this group.", HttpStatus.FORBIDDEN);
      return { who, stored };
    }
    const who = c.participants.find((p) => p.subjectId === subjectId);
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const group = (s.placements as { fact: string; section_id: string; repeats: string }[]).filter((p) => p.section_id === groupKey && p.repeats === "per_row");
    if (!group.length) fail("That section has no repeating group.", HttpStatus.NOT_FOUND);
    const caseLevel = group.every((p) => p.fact.startsWith("case."));
    if (caseLevel !== (who!.role === "case")) fail(caseLevel ? "This group is asked once for the application, not for a person." : "This group is asked for a person, not for the application.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (!w.officer && !group.some((p) => isClientField(s, p.fact))) fail("The officer fills this group.", HttpStatus.FORBIDDEN);
    return { who: who!, stored: subjectId };
  }

  async addRow(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    return this.saveRow(await this.reach(actor, caseId, "answer"), writerOf(actor), subjectId, body);
  }
  async saveRow(c: Reached, w: Writer, subjectId: string, body: unknown) {
    const caseId = c.id;
    const b = parse(NewRow, body);
    const subject = (await this.groupFor(w, c, subjectId, b.group, true)).stored!;
    const id = randomUUID();
    await this.db.$transaction(async (tx) => {
      const subjectId = subject; // B155: a list relative's entries are kept on its own subject
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${subjectId}|${b.group}`}))`;
      // "None apply" stands until someone says entries apply: an entry is never added beside it (never contradict silently).
      if ((await tx.clientGroupAnswer.findFirst({ where: { subjectId, groupKey: b.group, supersededById: null } }))?.noneApply) refused("\"None apply\" is recorded for this group; change it to \"entries apply\" first, then add the entries.");
      const live = await tx.clientFactRecord.findMany({ where: { subjectId, groupKey: b.group, supersededById: null } });
      await tx.clientFactRecord.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey: b.group, rowKey: id, order: live.length ? Math.max(...live.map((x) => x.order)) + 1 : 0, sourceJson: { channel: w.channel, actor: w.id, at: new Date().toISOString() } } });
    });
    await this.audit.log(c.workspaceId, w.id, "added", "row", b.group, `${w.name} added a row to ${b.group} on case ${short(caseId)}`);
    return { row: id, group: b.group };
  }

  /** "None apply" for a repeating group (Lead, break M3, P-71/P-72), or "entries apply" to change it back: a new version
   *  each time (append-only), checked against the version the person saw, never beside live entries. It waits for
   *  confirmation by the same rule as an answer to the group (the client's own answer counts for the principal). */
  async noneApply(actor: Actor, caseId: string, subjectId: string, groupKey: string, body: unknown) {
    return this.saveNoneApply(await this.reach(actor, caseId, "answer"), writerOf(actor), subjectId, groupKey, body, () => this.view(actor, caseId, isOfficer(actor) ? "agent" : "sqr"));
  }
  async saveNoneApply(c: Reached, w: Writer, subjectId: string, groupKey: string, body: unknown, after: () => Promise<{ sections: CaseView["sections"] }>) {
    const caseId = c.id;
    const b = parse(NoneApply, body);
    const { who, stored } = await this.groupFor(w, c, subjectId, groupKey, b.noneApply);
    const id = randomUUID();
    const changed = !stored ? false : await this.db.$transaction(async (tx) => {
      const subjectId = stored; // B155: a list relative's "none apply" is kept on its own subject
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${subjectId}|${groupKey}`}))`;
      const cur = await tx.clientGroupAnswer.findFirst({ where: { subjectId, groupKey, supersededById: null } });
      // The answer already stands (even from an older view: break m5), or "entries apply" with nothing said before
      // (break m1: it would record nothing new): nothing is saved.
      if ((cur && cur.noneApply === b.noneApply) || (!cur && !b.noneApply)) return false;
      if ((cur?.id ?? null) !== b.expectedId) conflict("Someone answered this at the same moment; nothing was saved. Look at their answer and try again.");
      const entries = await tx.clientFactRecord.count({ where: { subjectId, groupKey, supersededById: null, tombstone: false } });
      if (b.noneApply && entries) refused(`This group has ${entries} entr${entries === 1 ? "y" : "ies"}; remove ${entries === 1 ? "it" : "them"} first, then say none apply.`);
      if (cur) { const n = await tx.clientGroupAnswer.updateMany({ where: { id: cur.id, supersededById: null }, data: { supersededById: id } }); if (n.count !== 1) conflict("Someone answered this at the same moment; nothing was saved. Look at their answer and try again."); }
      await tx.clientGroupAnswer.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey, noneApply: b.noneApply, status: "DECLARED", sourceJson: { channel: w.channel, actor: w.id, at: new Date().toISOString() } } });
      return true;
    });
    if (changed) await this.audit.log(c.workspaceId, w.id, "answered", "group", groupKey, `${w.name} recorded that ${b.noneApply ? "no entries apply" : "entries apply"} in ${groupKey} for the ${who.role.replace(/_/g, " ")}${subjectId === who.subjectId ? "" : `'s ${groupKey.replace(/_/g, " ")}`} on case ${short(caseId)}`);
    const v = await after();
    return { saved: changed, group: v.sections.find((x) => x.subjectId === subjectId && x.section === groupKey)?.group ?? null };
  }

  /** Removing a row inserts a tombstone version of it; its answers stay stored and are no longer read (team rule). */
  async removeRow(actor: Actor, caseId: string, subjectId: string, rowKey: string) {
    return this.dropRow(await this.reach(actor, caseId, "answer"), writerOf(actor), subjectId, rowKey);
  }
  async dropRow(c: Reached, w: Writer, subjectId: string, rowKey: string) {
    const caseId = c.id;
    this.refusePrivate(w, c, subjectId); // C6.16 BR-7: before the row is read
    // B155: a list relative's entry is removed from its own subject (none stored yet: no such row).
    const rel = relativeOf(subjectId);
    const stored = rel ? (isListRelation(rel.relation) ? (await this.subjectFor(c, subjectId, false)).stored : null) : c.participants.some((p) => p.subjectId === subjectId) ? subjectId : null;
    const cur = stored ? await this.db.clientFactRecord.findFirst({ where: { rowKey, subjectId: stored, supersededById: null, tombstone: false } }) : null;
    if (!cur) fail("No such row for this person.", HttpStatus.NOT_FOUND);
    const id = randomUUID();
    await this.db.$transaction(async (tx) => {
      const n = await tx.clientFactRecord.updateMany({ where: { id: cur!.id, supersededById: null }, data: { supersededById: id } });
      if (n.count !== 1) conflict("Someone changed this row at the same moment; refresh and try again.");
      await tx.clientFactRecord.create({ data: { id, workspaceId: c.workspaceId, subjectId: cur!.subjectId, groupKey: cur!.groupKey, rowKey, order: cur!.order, tombstone: true, sourceJson: { channel: w.channel, actor: w.id, at: new Date().toISOString() } } });
    });
    await this.audit.log(c.workspaceId, w.id, "removed", "row", cur!.groupKey, `${w.name} removed a row from ${cur!.groupKey} on case ${short(caseId)}`);
    return { row: rowKey, removed: true };
  }

  /** "Confirm section" (P-72): the officer vouches for the answers they reviewed (their ids). Each becomes VERIFIED as a
   *  new version (history kept). An answer that changed or arrived since the officer looked is refused with 409 and
   *  listed, never confirmed unseen. Unanswered questions are listed, not blocked. */
  async confirmSection(actor: Actor, caseId: string, section: string, body: unknown) {
    const c = await this.reach(actor, caseId, "officer");
    const b = parse(ConfirmSubject, body);
    // B128: a relative's section is confirmed on the relative's own subject (none yet: nothing stored to confirm).
    const storedId = (await this.subjectFor(c, b.subjectId, false)).stored ?? NOTHING_STORED;
    const s = this.snapshotOf(c);
    // B155: a list relative's section is its group (named by the relation): the facts the release's forms read about it.
    const rel = relativeOf(b.subjectId), listOf = rel && isListRelation(rel.relation) && section === rel.relation ? rel.relation : null;
    if (rel && isListRelation(rel.relation) && !listOf) fail(`No such section for ${listWords(rel.relation).list}: their section is "${rel.relation}".`, HttpStatus.NOT_FOUND);
    const fields = new Set(listOf
      ? (s.field_maps as { entries: { person?: string | null; outcome?: string; fact?: string | null }[] }[]).flatMap((m) => m.entries.filter((e) => e.outcome === "mapped" && e.person === `subject_${listOf}` && e.fact).map((e) => e.fact!))
      : (s.placements as { fact: string; section_id: string }[]).filter((p) => p.section_id === section).map((p) => p.fact));
    if (!fields.size) fail("No such section in this case's release.", HttpStatus.NOT_FOUND);
    const seen = new Set(b.seen);
    const at = new Date();
    // QA-164 (golden journey 1, step 4): a confirm covers the questions the officer's view lists for this person and
    // section. A fact the view leaves out (a worked-out "has any children" once a child is on the case, C7.7 and D4) can
    // never be seen on screen, so its stored answer is neither asked as seen nor confirmed: it never blocks the section.
    const { answers: now, rows: nowRows, groups: nowGroups } = await this.state(c);
    const firmGives = new Set(now.filter((x) => x.channel === FIRM_RECORD && x.subjectId === b.subjectId).map((x) => x.field));
    const shownSections = caseView(s, this.peopleOf(c), now, nowRows, "agent", at, nowGroups).sections.filter((x) => x.subjectId === b.subjectId && x.section === section);
    const listed = new Set(shownSections.flatMap((x) => x.questions.map((q) => q.fact)));
    // B155 (break m2 on #1367): a list's entry shows only the cells it asks (cellAsked); an answer in a cell it does not show
    // (left there when an earlier entry was removed) is never seen, so it neither blocks nor is confirmed.
    const shownCells = listOf ? new Set(shownSections.flatMap((x) => { const g = x.questions.filter((q) => q.group); return g.flatMap((q) => q.rows.filter((_, i) => cellAsked(g, q, i)).map((r) => `${q.fact}|${r.row}`)); })) : null;
    const bg = this.backgroundOf(c);
    let waiting = 0;
    const confirmed = await this.db.$transaction(async (tx) => {
      // C6.5 (BR-6, BR-7; case-documents.ts): while a typed answer and a document differ on a fact of this section (an open
      // check), or the document a check came from also gives a fact of this section (its review is not finished), the section
      // is not confirmed: the officer resolves the check first, with a reason.
      const openChecks = await tx.answerCheck.findMany({ where: { subjectId: storedId, state: "open", OR: [{ fact: { in: [...fields] } }, { readValue: { read: { values: { some: { fact: { in: [...fields] } } } } } }] }, select: { id: true, fact: true } });
      if (openChecks.length) {
        // Lead 35 on #1369: the refusal names each open check and the section it sits in, so the officer knows where to go.
        const place = (f: string) => (s.placements as { fact: string; section_id: string; question_text?: string }[]).find((p) => p.fact === f);
        const titleOf = (id: string | undefined) => (s.sections as { id: string; title: string }[]).find((x) => x.id === id)?.title ?? id ?? "another section";
        const named = openChecks.map((k) => ({ ...k, label: place(k.fact)?.question_text || k.fact.split(".").pop()!.replace(/_/g, " "), section: place(k.fact)?.section_id ?? null, section_title: titleOf(place(k.fact)?.section_id) }));
        throw new HttpException({ type: "https://expatready.local/problems/open-checks", title: "Not possible now", status: 409, code: "open_checks",
          detail: `${named.map((k) => `"${k.label}" in ${k.section === section ? "this section" : `"${k.section_title}"`}`).join("; ")} differ${named.length === 1 ? "s" : ""} from a document (an open check${named.length === 1 ? "" : "s"}): resolve ${named.length === 1 ? "it" : "them"} first, with a reason. Nothing was confirmed.`, checks: named }, HttpStatus.CONFLICT);
      }
      // A removed row's answers stay stored (history) but are no longer read (PR 7 review D1): only answers outside a
      // row or in a live row are current; a seen id of a removed row's answer is not "changed".
      const stored = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: storedId, supersededById: null, canonicalFieldKey: { in: [...fields] } } });
      const live = new Set((await tx.clientFactRecord.findMany({ where: { subjectId: storedId, supersededById: null, tombstone: false }, select: { rowKey: true } })).map((r) => r.rowKey));
      // C6.11 (review M1): a fact the firm record gives (the representative's part, "Uses a representative") shows the
      // firm's answer, never a stored one, so a stored one can never be seen: it neither blocks nor is confirmed.
      const current = stored.filter((a) => (a.rowKey === null || live.has(a.rowKey)) && listed.has(a.canonicalFieldKey) && !firmGives.has(a.canonicalFieldKey) && (!shownCells || a.rowKey === null || shownCells.has(`${a.canonicalFieldKey}|${a.rowKey}`)));
      // The section's "none apply", when it is a repeating group (Lead, break M3), is confirmed with its answers.
      // With entries, the entries answer the group: its earlier "entries apply" is neither shown nor confirmed (review m6).
      const entries = await tx.clientFactRecord.count({ where: { subjectId: storedId, groupKey: section, supersededById: null, tombstone: false } });
      const held = await tx.clientGroupAnswer.findFirst({ where: { subjectId: storedId, groupKey: section, supersededById: null } });
      const ga = entries ? null : held; // its id, when sent, is still a current id (never "changed")
      const currentIds = new Set([...stored.map((a) => a.id), ...(held ? [held.id] : [])]);
      const gone = [...seen].filter((id) => !currentIds.has(id));
      const unseen = current.filter((a) => a.status === "DECLARED" && !seen.has(a.id));
      const gaUnseen = !!ga && ga.status === "DECLARED" && !seen.has(ga.id);
      if (gone.length || unseen.length || gaUnseen) {
        const changed = await tx.clientCanonicalAnswer.findMany({ where: { id: { in: gone } }, select: { canonicalFieldKey: true } });
        // The group is named only when it is a group and its own answer changed (break m2), never for another person's id.
        const groupGone = gone.length && await tx.clientGroupAnswer.count({ where: { id: { in: gone }, subjectId: storedId, groupKey: section } });
        conflict("Some answers in this section changed or arrived after you reviewed it; nothing was confirmed. Review them and confirm again.", { changed: [...new Set([...changed, ...unseen].map((a) => a.canonicalFieldKey)), ...(gaUnseen || groupGone ? [`group:${section}`] : [])] });
      }
      // C6.18 (P-244): a background answer the officer recorded is the client's to re-confirm; the officer's confirm leaves
      // it waiting for the client (it was seen, so it never blocks the section) and says how many.
      const forClient = current.filter((a) => a.status === "DECLARED" && awaitsClient({ field: a.canonicalFieldKey, channel: (a.sourceJson as { channel: string }).channel }, bg));
      const open = current.filter((a) => a.status === "DECLARED" && !forClient.includes(a));
      waiting = forClient.length;
      for (const a of open) {
        const id = randomUUID();
        const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: a.id, supersededById: null }, data: { supersededById: id } });
        if (n.count !== 1) conflict("An answer in this section changed while confirming; nothing was confirmed. Review it and confirm again.", { changed: [a.canonicalFieldKey] });
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: a.workspaceId, partyId: a.partyId, subjectId: a.subjectId, canonicalFieldId: a.canonicalFieldId, canonicalFieldKey: a.canonicalFieldKey, rowKey: a.rowKey, valueJson: a.valueJson as object, status: "VERIFIED", sourceJson: { channel: "confirm_section", actor: actor.id, at: at.toISOString(), from: a.id }, verifiedBy: actor.id, verifiedAt: at } });
      }
      if (ga?.status === "DECLARED") {
        const id = randomUUID();
        const n = await tx.clientGroupAnswer.updateMany({ where: { id: ga.id, supersededById: null }, data: { supersededById: id } });
        if (n.count !== 1) conflict("An answer in this section changed while confirming; nothing was confirmed. Review it and confirm again.", { changed: [`group:${section}`] });
        await tx.clientGroupAnswer.create({ data: { id, workspaceId: ga.workspaceId, subjectId: ga.subjectId, groupKey: ga.groupKey, noneApply: ga.noneApply, status: "VERIFIED", sourceJson: { channel: "confirm_section", actor: actor.id, at: at.toISOString(), from: ga.id }, verifiedBy: actor.id, verifiedAt: at } });
      }
      return open.length + (ga?.status === "DECLARED" ? 1 : 0);
    });
    await this.audit.log(c.workspaceId, actor.id, "confirmed", "section", section, `${actor.name} confirmed ${confirmed} answer${confirmed === 1 ? "" : "s"} in ${section} on case ${short(caseId)}${waiting ? `; ${waiting} background answer${waiting === 1 ? "" : "s"} recorded by staff still wait${waiting === 1 ? "s" : ""} for the client to re-confirm` : ""}`);
    const v = await this.view(actor, caseId, "agent");
    const sec = v.sections.find((x) => x.subjectId === b.subjectId && x.section === section);
    return { confirmed, section, missing: sec?.missing ?? [], invalid: sec?.invalid ?? 0, awaiting_client: waiting };
  }

  /** The workspace's cases, newest first, a page at a time (cursor: the last case id of the previous page). Each row names
   *  its client (the simulated login that answers). BK-3 PR 3 (P-447 (2), challenge B1: one request per page view,
   *  STANDARDS §5): `client=<login>` keeps one client's cases, inside the same firm filter (C6.11 BR-20), and only then
   *  each row also lists its people by name and role (no answers, progress or privacy settings: staff see the same names
   *  on the case page, and keep-private hides people from the client, never from staff, C6.16).
   *  A24-1 (P-492, CS-7, CS-8): each row also carries its case number, its client person's name (the principal when the
   *  case opened, as on the case page: clientPersonOf) and how many applications (filings) its current stage holds, read
   *  in one query each for the whole page, never one per row. A case not yet prepared holds none (0). */
  async list(actor: Actor, q: { take?: string; after?: string; client?: string }) {
    need(actor, "case");
    const workspaceId = await this.ws.id();
    const take = Math.min(Math.max(Number(q.take ?? 50) || 50, 1), 100);
    // Break m5: one login or none; a list or an empty value is refused, never read as "every client".
    if (q.client !== undefined && (typeof q.client !== "string" || !q.client)) fieldError("client", "Name one client login.");
    const client = q.client ?? null;
    const rows = await this.db.case.findMany({ where: { workspaceId, firmKey: firmOfActor(actor)?.key ?? "", ...(client ? { clientActorId: client } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1, ...(q.after ? { cursor: { id: q.after }, skip: 1 } : {}), include: { combination: { select: { label: true } } } });
    const page = rows.slice(0, take), ids = page.map((c) => c.id);
    // The people of this page's cases in one query (never one per row): for the client's name, and for one client's page.
    const people = new Map<string, { subjectId: string; label: string; role: string; applies: boolean }[]>();
    const changes = new Map<string, StoredChange[]>(), filings = new Map<string, number>();
    if (page.length) {
      for (const p of await this.db.caseParticipant.findMany({ where: { caseId: { in: ids }, role: { not: "case" } }, orderBy: [{ caseId: "asc" }, { order: "asc" }], select: { caseId: true, subjectId: true, role: true, applies: true, subject: { select: { label: true } } } })) people.set(p.caseId, [...(people.get(p.caseId) ?? []), { subjectId: p.subjectId, label: p.subject.label, role: p.role, applies: p.applies }]);
      for (const x of await this.db.filingChange.findMany({ where: { caseId: { in: ids }, kind: "make_principal" }, orderBy: [{ changedAt: "asc" }, { id: "asc" }], select: { caseId: true, kind: true, subjectId: true, otherSubjectId: true, changedAt: true } })) changes.set(x.caseId, [...(changes.get(x.caseId) ?? []), { kind: x.kind as StoredChange["kind"], subject: x.subjectId, other: x.otherSubjectId, at: x.changedAt.toISOString() }]);
      for (const g of await this.db.filing.groupBy({ by: ["caseId"], where: { caseId: { in: ids }, active: true, stage: { state: "CURRENT" } }, _count: { _all: true } })) filings.set(g.caseId, g._count._all);
    }
    const clientName = (caseId: string) => { const ps = people.get(caseId) ?? [], who = clientPersonOf(ps as Participant[], changes.get(caseId) ?? []); return ps.find((p) => p.subjectId === who)?.label ?? null; };
    return { cases: page.map((c): CaseListRow => ({ id: c.id, case_number: c.caseNumber, reference: c.reference, combination: c.combination.label, status: c.status, created_at: c.createdAt, client: c.clientActorId,
      client_name: clientName(c.id), filings: filings.get(c.id) ?? 0, ...(client ? { people: (people.get(c.id) ?? []).map((p) => ({ label: p.label, role: p.role })) } : {}) })), next: rows.length > take ? rows[take - 1].id : null };
  }
}

@CaseRead()
@Controller("api/runtime")
export class RuntimeController {
  constructor(@Inject(Runtime) private readonly r: Runtime) {}
  @Get("cases") list(@Headers("x-actor") a: H, @Query() q: { take?: string; after?: string; client?: string }) { return this.r.list(actorOf(a), q); }
  @Post("cases") create(@Headers("x-actor") a: H, @Body() b: unknown) { return this.r.createCase(actorOf(a), b); }
  @Get("openable") openable(@Headers("x-actor") a: H) { return this.r.openable(actorOf(a)); }
  @Get("combinations/:id/employer-link") employerLink(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.employerLink(actorOf(a), id); }
  @Get("cases/:id") get(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.get(actorOf(a), id); }
  @Post("cases/:id/people") addPerson(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.r.addPerson(actorOf(a), id, b); }
  @Patch("cases/:id/people/:subject") updatePerson(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.updatePerson(actorOf(a), id, s, b); }
  @Get("cases/:id/questionnaire") view(@Headers("x-actor") a: H, @Param("id") id: string, @Query("mode") m?: string) { return m === "pqr" ? this.r.pqr(actorOf(a), id) : this.r.view(actorOf(a), id, m === "agent" ? "agent" : "sqr"); }
  @Post("cases/:id/review") review(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.review(actorOf(a), id); }
  @Put("cases/:id/answers/:subject/:field") answer(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("field") f: string, @Body() b: unknown) { return this.r.putAnswer(actorOf(a), id, s, f, b); }
  /** B128: a relative's answer, its key (`<person>/parent_1`) written as two path parts. */
  @Put("cases/:id/answers/:subject/:relation/:field") relativeAnswer(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("field") f: string, @Body() b: unknown) { return this.r.putAnswer(actorOf(a), id, `${s}/${r}`, f, b); }
  @Put("cases/:id/groups/:subject/:group/none-apply") noneApply(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("group") g: string, @Body() b: unknown) { return this.r.noneApply(actorOf(a), id, s, g, b); }
  @Post("cases/:id/groups/:subject/rows") addRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.addRow(actorOf(a), id, s, b); }
  /** B155: a list relative's group (`<person>/sibling`), its key written as two path parts. */
  @Post("cases/:id/groups/:subject/:relation/rows") relativeAddRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Body() b: unknown) { return this.r.addRow(actorOf(a), id, `${s}/${r}`, b); }
  @Delete("cases/:id/groups/:subject/:relation/rows/:row") relativeRemoveRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("row") x: string) { return this.r.removeRow(actorOf(a), id, `${s}/${r}`, x); }
  @Put("cases/:id/groups/:subject/:relation/:group/none-apply") relativeNoneApply(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("group") g: string, @Body() b: unknown) { return this.r.noneApply(actorOf(a), id, `${s}/${r}`, g, b); }
  @Delete("cases/:id/groups/:subject/rows/:row") removeRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("row") r: string) { return this.r.removeRow(actorOf(a), id, s, r); }
  @Post("cases/:id/answers/:answer/reconfirm") reconfirm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("answer") x: string, @Body() b: unknown) { return this.r.reconfirm(actorOf(a), id, x, b); }
  @Post("cases/:id/sections/:section/confirm") confirm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("section") s: string, @Body() b: unknown) { return this.r.confirmSection(actorOf(a), id, s, b); }
}
