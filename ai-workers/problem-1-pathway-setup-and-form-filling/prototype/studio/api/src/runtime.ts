// Runtime API (runtime lane, R1 thin slice, P-67): a case for a released combination, pinned to that release; its
// people; one current answer per person per fact, append-only; repeating rows; the officer's "Confirm section" (P-72).
// Every read uses the case's pinned release, never the newest (STANDARDS §3.7). Deny by default: the case officer works
// on the workspace's cases; a client reaches only the case they answer, and only its questionnaire; configuration
// people reach no case. Answer values and typed names never go into audit text or logs (STANDARDS §5): audit lines name
// a case by its id.
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { z } from "zod";
import { ConfirmSection, fillsText, notReadyForCases, releaseLabel, NewCase, type OpenableRelease, NewPerson, NewRow, NoneApply, PutAnswer, UpdatePerson, type CaseRole } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseView, checkValue, isClientField, pqrView, shapeOf, type Answer, type GroupAnswer, type Mode, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, fail, need, Workspace, type Actor } from "./core.ts";
import { refuseIfCaseRecorded } from "./submission-record.ts"; // C8.2: a recorded case keeps its people
import { firmByKey, firmOfActor, STAND_IN } from "./firms.ts";
import { aiLive } from "./sources.ts";
import { FIRM_RECORD, openingTeam, REPRESENTATIVE, representativeAnswers, USES_REPRESENTATIVE, type Member } from "../../engine/runtime/team.ts";
import { employerLinkOffer } from "../../engine/runtime/employer.ts";
import { linkedOf } from "./employer-cases.ts";
import { Programs } from "./programs.ts";

type H = string | undefined;
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
/** A rule refuses the request (nobody else changed anything): 409 "Not possible now" (break r1d-none-apply m4). */
const refused = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/not-possible", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const conflict = (detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed by someone else", status: 409, detail, ...extra }, HttpStatus.CONFLICT); };
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: message, errors: [{ field, message }] }, HttpStatus.BAD_REQUEST); };
const RELATIONSHIP: Record<string, string> = { spouse_or_partner: "SPOUSE_OR_PARTNER", child: "CHILD" };
const isOfficer = (a: Actor) => (a.duties as readonly string[]).includes("case");
const FIELD_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const short = (id: string) => id.slice(0, 8);
const nameIn = (f: { users: { id: string; name: string }[] }, id: string) => f.users.find((u) => u.id === id)?.name ?? id;
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";
type PeopleLine = { role: string; max?: number; label?: string; filingMode?: string };
const linesOf = (s: Snapshot) => (s.combination.participants ?? []) as PeopleLine[];
const roleWords = (p: Pick<PeopleLine, "role" | "label">) => p.label ?? p.role.replace(/_/g, " ");
/** B115 (P-319): who a person may add to a case: every role the pinned release lists with a maximum above 0, never the
 *  principal applicant or the application itself. One list for the case page's Add buttons and addPerson's check. */
export const addableRoles = (s: Snapshot) => linesOf(s).filter((p) => p.role !== "principal" && p.role !== "case" && (p.max ?? 0) > 0);
/** B115 review M1 (C7.7): the case page's Add buttons. The representative is the case team's representative of record,
 *  read from the firm record (engine/runtime/team.ts: "A case has no representative participant"), so the screen never
 *  offers to add one as a person; every other role comes from the release (P-319). */
export const offeredRoles = (s: Snapshot) => addableRoles(s).filter((p) => p.role !== REPRESENTATIVE);

export type Reached = Awaited<ReturnType<Runtime["reach"]>>;

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
    const c = await this.db.case.findFirst({ where: { id: caseId, workspaceId }, include: { pins: { include: { release: { include: { packVersion: { select: { version: true } } } } } }, participants: { orderBy: { order: "asc" }, include: { subject: { include: { party: { include: { profile: true } } } } } } } });
    // C6.11 (BR-20): staff reach only their own firm's cases; another firm's case is "not found", as for a client.
    if (!c || (!officer && c.clientActorId !== actor.id) || (officer && c.firmKey !== firmOfActor(actor)?.key)) fail("No such case.", HttpStatus.NOT_FOUND);
    const pin = c!.pins[0];
    if (!pin || c!.pins.length !== 1 || pin.contentHash !== pin.release.sha256 || pin.release.combinationId !== c!.combinationId) fail("This case's pin to its release does not match the release; nothing was read or changed. Ask the Lead.", HttpStatus.CONFLICT);
    return c!;
  }

  snapshotOf(c: Reached) { return c.pins[0].release.snapshot as unknown as Snapshot; }
  peopleOf(c: Reached): Participant[] {
    return c.participants.map((p) => ({ subjectId: p.subjectId, role: p.role as Participant["role"], label: p.subject.label, applies: p.applies }));
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
    let id: string;
    try {
      id = await this.db.$transaction(async (tx) => {
        const party = await tx.party.create({ data: { workspaceId, profile: { create: { workspaceId, displayName: b.principal.displayName } } } });
        const c = await tx.case.create({ data: { workspaceId, firmKey: firm!.key, combinationId: b.combinationId, reference: b.reference, clientActorId: client!.id, createdBy: actor.id, idempotencyKey: b.idempotencyKey ?? null, idempotencyFingerprint: b.idempotencyKey ? fingerprint : null } });
        const caseSubject = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "case", label: "The application" } });
        const principal = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "principal", label: b.principal.displayName } });
        await tx.caseParticipant.createMany({ data: [{ workspaceId, caseId: c.id, subjectId: caseSubject.id, role: "case", order: 0 }, { workspaceId, caseId: c.id, subjectId: principal.id, role: "principal", order: 1 }] });
        await tx.caseTeamMember.createMany({ data: [{ workspaceId, caseId: c.id, userId: representative, role: "LEAD_REPRESENTATIVE", assignedBy: actor.id }, ...officers.map((u) => ({ workspaceId, caseId: c.id, userId: u, role: "OFFICER", assignedBy: actor.id }))] });
        await tx.packWorkPin.create({ data: { workspaceId, caseId: c.id, combinationId: b.combinationId, partyId: party.id, packVersionId: release!.packVersionId, configReleaseId: release!.id, contentHash: release!.sha256, actorId: actor.id } });
        return c.id;
      }, { timeout: 15_000, maxWait: 10_000 }); // With the connections busy Prisma's default 2 s and 5 s answered a 500 (P2028)
    } catch (e) {
      if (!unique(e)) throw e;
      const same = await replay(); // a simultaneous create with the same key won: answer with its case
      if (same) return same;
      fail("A case with this reference already exists; give the new case its own reference.", HttpStatus.CONFLICT);
    }
    await this.audit.log(workspaceId, actor.id, "opened", "case", id!, `${actor.name} opened case ${short(id!)} on "${combination!.label}" released version ${release!.version} (${release!.sha256.slice(0, 12)}); representative of record ${nameIn(firm!, representative)}, case officers ${officers.map((o) => nameIn(firm!, o)).join(", ")}`, undefined, b.combinationId);
    return { ...(await this.get(actor, id!)), created: true };
  }

  async get(actor: Actor, caseId: string) {
    const c = await this.reach(actor, caseId, "read");
    const pin = c.pins[0];
    // C6.11: staff see the case team in the header (the client's screens come after M3, P-129).
    const team = isOfficer(actor) ? await this.teamLine(c.id) : undefined;
    const snapshot = this.snapshotOf(c), roleOfRelease = new Map(linesOf(snapshot).map((p) => [p.role, roleWords(p)]));
    const coFiling = new Set(linesOf(snapshot).filter((p) => p.filingMode === "co_files").map((p) => p.role));
    return { id: c.id, ...(team ? { team } : {}), reference: c.reference, status: c.status, combination_id: c.combinationId, client: c.clientActorId,
      pin: { release_version: pin.release.version, sha256: pin.contentHash, pinned_at: pin.pinnedAt, revision: pin.revision },
      // G13 (QA-140): the release in the studio's own words.
      release: { label: releaseLabel(pin.release), version: pin.release.version, release: pin.release.packVersion?.version ?? pin.release.version },
      // B115: each person's role in the release's own words (the sponsor has no fixed word on the screen).
      // B115 review m1: co_files marks the person whose application is always sent with the principal's (the sponsor).
      people: c.participants.map((p) => ({ subject_id: p.subjectId, role: p.role, role_label: roleOfRelease.get(p.role) ?? null, label: p.subject.label, applies: p.applies, co_files: coFiling.has(p.role) })),
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
    const rows = await this.db.configRelease.findMany({ where: { workspaceId, combination: { retiredAt: null } }, orderBy: { version: "desc" }, distinct: ["combinationId"], include: { combination: { select: { label: true } } } });
    const out = await Promise.all(rows.map(async (r) => {
      const missing = await this.programs.startableMissing(r.combinationId, r);
      return { combination_id: r.combinationId, combination: r.combination.label, version: r.version, startable: !missing.length, items: missing.length, why: missing.length ? notReadyForCases(r.combination.label, missing.length) : null };
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
    const addable = addableRoles(this.snapshotOf(c)).map((p) => roleWords(p).toLowerCase());
    if (b.role === "case") fail(`The application itself is not a person, so it cannot be added. ${addable.length ? `This application can add: ${addable.join(", ")}.` : "This application lists no one else to add."}`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!limit || !(limit.max ?? 0)) fail(`This case's release does not list a ${(limit?.label ?? b.role.replace(/_/g, " ")).toLowerCase()} in who can be in this application, so one cannot be added.`, HttpStatus.UNPROCESSABLE_ENTITY);
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
    });
    await this.audit.log(c.workspaceId, actor.id, "changed", "person", caseId, `${actor.name} marked a ${p!.role.replace(/_/g, " ")} on case ${short(caseId)} as ${b.applies ? "travelling" : "not travelling"}`);
    return { subject_id: subjectId, applies: b.applies };
  }

  async state(c: Reached) {
    const subjects = c.participants.map((p) => p.subjectId);
    const [answers, rows, groupRows] = await Promise.all([
      this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, supersededById: null } }),
      this.db.clientFactRecord.findMany({ where: { subjectId: { in: subjects }, supersededById: null, tombstone: false } }),
      this.db.clientGroupAnswer.findMany({ where: { subjectId: { in: subjects }, supersededById: null } }),
    ]);
    // A confirmation version names the answer it confirmed (sourceJson.from): who first answered stays visible (review M4).
    const fromIds = answers.map((x) => (x.sourceJson as { from?: string }).from).filter((x): x is string => !!x);
    const firsts = new Map((fromIds.length ? await this.db.clientCanonicalAnswer.findMany({ where: { id: { in: fromIds } }, select: { id: true, sourceJson: true } }) : []).map((x) => [x.id, x.sourceJson as { channel: string; actor: string; at: string }]));
    const a: Answer[] = answers.map((x) => { const src = x.sourceJson as { channel: string; actor: string; at: string; from?: string }; const first = src.from ? firsts.get(src.from) : undefined; return { id: x.id, subjectId: x.subjectId, field: x.canonicalFieldKey, rowKey: x.rowKey, value: x.valueJson, status: x.status as Answer["status"], channel: src.channel, actor: src.actor, at: src.at, origin: first ? { channel: first.channel, actor: first.actor, at: first.at } : null }; });
    const r: Row[] = rows.map((x) => ({ rowKey: x.rowKey, subjectId: x.subjectId, group: x.groupKey, order: x.order }));
    const gFrom = groupRows.map((x) => (x.sourceJson as { from?: string }).from).filter((x): x is string => !!x);
    const gFirsts = new Map((gFrom.length ? await this.db.clientGroupAnswer.findMany({ where: { id: { in: gFrom } }, select: { id: true, sourceJson: true } }) : []).map((x) => [x.id, x.sourceJson as { channel: string; actor: string; at: string }]));
    const groups: GroupAnswer[] = groupRows.map((x) => { const src = x.sourceJson as { channel: string; actor: string; at: string; from?: string }; const first = src.from ? gFirsts.get(src.from) : undefined; return { id: x.id, subjectId: x.subjectId, group: x.groupKey, noneApply: x.noneApply, status: x.status as GroupAnswer["status"], channel: src.channel, actor: src.actor, at: src.at, origin: first ? { channel: first.channel, actor: first.actor, at: first.at } : null }; });
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
    const { answers, rows, groups } = await this.state(c);
    return { case: await this.get(actor, caseId), ...caseView(this.snapshotOf(c), this.peopleOf(c), answers, rows, mode, new Date(), groups) };
  }

  /** P-47 mode 1, PQR (C4.4 part 2): the pre-qualification questions only, with a plain result line. The officer's PQR
   *  reads the agent view; a client's reads their own questionnaire (PQR ⊂ SQR). */
  async pqr(actor: Actor, caseId: string) {
    const c = await this.reach(actor, caseId, "read");
    const { answers, rows, groups } = await this.state(c);
    const s = this.snapshotOf(c), people = this.peopleOf(c);
    return { case: await this.get(actor, caseId), ...pqrView(s, people, caseView(s, people, answers, rows, isOfficer(actor) ? "agent" : "sqr", new Date(), groups)) };
  }

  /** P-47 tier 3 (C4.4 part 2): the independent review the officer runs on demand. It reads answers and never changes
   *  them. The run itself is an AI call (C7.5, M3-E): with this copy's live switch off it is refused in words at US$0
   *  before anything starts (P-175, QA-100); with it on it is still refused until C7.5 builds the run. Nothing is written. */
  async review(actor: Actor, caseId: string) {
    await this.reach(actor, caseId, "read");
    if (!isOfficer(actor)) fail("The independent review is run by the case officer.", HttpStatus.FORBIDDEN);
    if (!aiLive()) refused("The independent review is an AI run, and live AI is off on this copy (the founder's switch). Nothing was run and nothing changed: US$0.");
    return refused("The independent review run is not built yet (C7.5, M3-E). Nothing was run and nothing changed: US$0.");
  }

  /** Saves one answer: append-only (the old row is stamped superseded by the new one, in one transaction). A client
   *  answers only the client's own fields (engine rule, P-72); the officer any fact. Never blocked by its checks (P-47). */
  async putAnswer(actor: Actor, caseId: string, subjectId: string, fieldKey: string, body: unknown) {
    if (!FIELD_KEY.test(fieldKey)) fail("No such question.", HttpStatus.NOT_FOUND);
    const c = await this.reach(actor, caseId, "answer");
    const b = parse(PutAnswer, body);
    const s = this.snapshotOf(c), officer = isOfficer(actor);
    const who = c.participants.find((p) => p.subjectId === subjectId);
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    // C6.11: "Uses a representative" comes from the case team (the representative of record), never typed; a client is
    // told the case team sets it (403), staff that the team changes it (422). Only while the case has a representative.
    if (fieldKey === USES_REPRESENTATIVE && who!.role === "case" && await this.db.caseTeamMember.count({ where: { caseId, role: "LEAD_REPRESENTATIVE", endedAt: null } })) {
      if (!officer) fail("Your case team sets whether a representative is used; you don't need to answer it.", HttpStatus.FORBIDDEN);
      fail("Uses a representative comes from the case team: this case has a representative of record. Change the team (Case team), not the answer.", HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const field = (s.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === fieldKey);
    const place = (s.placements as { fact: string; repeats: string; section_id: string; collected_from: string }[]).find((p) => p.fact === fieldKey);
    if (!field || !place) fail(`The release this case works from does not ask for ${fieldKey}.`, HttpStatus.NOT_FOUND);
    if (!officer && !isClientField(s, fieldKey)) fail("The officer enters this fact from a document or record.", HttpStatus.FORBIDDEN);
    // P-97, P-130: a declaration is always the client's own; the officer never makes it for them (C4.4 review M1).
    if (officer && (field as { value_type?: string }).value_type === "declaration") fail("Only the client makes this declaration, in their own questionnaire; the officer cannot tick it for them.", HttpStatus.FORBIDDEN);
    const caseLevel = place!.repeats === "once_per_case" || fieldKey.startsWith("case.");
    if (caseLevel !== (who!.role === "case")) fail(caseLevel ? "This is asked once for the application, not for a person." : "This is asked for a person, not for the application.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (place!.repeats !== "per_row" && b.row) fail("This question has one answer, not rows.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (place!.repeats === "per_row" && !b.row) fail("Name the row this answer belongs to (add a row first).", HttpStatus.UNPROCESSABLE_ENTITY);
    const def = await this.db.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: fieldKey, version: field!.item_version } });
    if (!def) fail(`The library has no version ${field!.item_version} of ${fieldKey}.`, HttpStatus.CONFLICT);
    const rowKey = b.row ?? null;
    const source = { channel: officer ? "agent_view" : "questionnaire", actor: actor.id, at: new Date().toISOString() };
    const newId = randomUUID();
    try {
      await this.db.$transaction(async (tx) => {
        // The row stays live until this answer is saved: a removal at the same moment waits, or wins and this one is refused.
        if (rowKey) { const live = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM client_fact_record WHERE row_key = ${rowKey}::uuid AND subject_id = ${subjectId}::uuid AND group_key = ${place!.section_id} AND superseded_by_id IS NULL AND NOT tombstone FOR SHARE`; if (!live.length) fail("No such row for this person.", HttpStatus.NOT_FOUND); }
        const current = await tx.clientCanonicalAnswer.findFirst({ where: { subjectId, canonicalFieldKey: fieldKey, rowKey, supersededById: null } });
        if ((current?.id ?? null) !== b.expectedId) conflict("Someone changed this answer after you opened it; the newer answer is shown. Check it and save again.", { current: current ? { id: current.id, value: current.valueJson, by: (current.sourceJson as { actor: string }).actor } : null });
        if (current) { const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: current.id, supersededById: null }, data: { supersededById: newId } }); if (n.count !== 1) conflict("Someone changed this answer at the same moment; refresh and save again."); }
        await tx.clientCanonicalAnswer.create({ data: { id: newId, workspaceId: c.workspaceId, partyId: who!.subject.partyId, subjectId, canonicalFieldId: def!.id, canonicalFieldKey: fieldKey, rowKey, valueJson: b.value as object, status: "DECLARED", sourceJson: source } });
      });
    } catch (e) {
      if (unique(e)) { const now = await this.db.clientCanonicalAnswer.findFirst({ where: { subjectId, canonicalFieldKey: fieldKey, rowKey, supersededById: null } }); conflict("Someone answered this at the same moment; their answer is shown. Check it and save again.", { current: now ? { id: now.id, value: now.valueJson } : null }); }
      throw e;
    }
    await this.audit.log(c.workspaceId, actor.id, "answered", "case fact", fieldKey, `${actor.name} ${b.expectedId ? "changed" : "answered"} ${fieldKey} on case ${short(caseId)} (${officer ? "Agent view" : "Client questionnaire"})`);
    const after = await this.view(actor, caseId, officer ? "agent" : "sqr");
    const q = after.sections.flatMap((x) => x.questions).find((x) => x.subjectId === subjectId && x.fact === fieldKey);
    const ans = rowKey ? q?.rows.find((x) => x.row === rowKey)?.answer : q?.answer;
    const fills = q?.fills ?? [];
    return { answer: ans ?? { id: newId, problems: checkValue(s, fieldKey, b.value) }, fills,
      message: fills.length ? `Saved. It fills ${fillsText(fills, true)}.` : "Saved." };
  }

  /** Adds a row to a person's repeating group (or the application's, for a case-level group). Rows of one group are
   *  numbered one at a time (a transaction lock), and the database refuses two live rows in one place. */
  /** Who may write a repeating group of a person on this case: the group exists, belongs to that kind of subject, and
   *  the client writes it only when it holds a client field. */
  private groupFor(actor: Actor, c: Reached, subjectId: string, groupKey: string) {
    const who = c.participants.find((p) => p.subjectId === subjectId);
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const s = this.snapshotOf(c);
    const group = (s.placements as { fact: string; section_id: string; repeats: string }[]).filter((p) => p.section_id === groupKey && p.repeats === "per_row");
    if (!group.length) fail("That section has no repeating group.", HttpStatus.NOT_FOUND);
    const caseLevel = group.every((p) => p.fact.startsWith("case."));
    if (caseLevel !== (who!.role === "case")) fail(caseLevel ? "This group is asked once for the application, not for a person." : "This group is asked for a person, not for the application.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (!isOfficer(actor) && !group.some((p) => isClientField(s, p.fact))) fail("The officer fills this group.", HttpStatus.FORBIDDEN);
    return who!;
  }

  async addRow(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.reach(actor, caseId, "answer");
    const b = parse(NewRow, body);
    this.groupFor(actor, c, subjectId, b.group);
    const id = randomUUID();
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${subjectId}|${b.group}`}))`;
      // "None apply" stands until someone says entries apply: an entry is never added beside it (never contradict silently).
      if ((await tx.clientGroupAnswer.findFirst({ where: { subjectId, groupKey: b.group, supersededById: null } }))?.noneApply) refused("\"None apply\" is recorded for this group; change it to \"entries apply\" first, then add the entries.");
      const live = await tx.clientFactRecord.findMany({ where: { subjectId, groupKey: b.group, supersededById: null } });
      await tx.clientFactRecord.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey: b.group, rowKey: id, order: live.length ? Math.max(...live.map((x) => x.order)) + 1 : 0, sourceJson: { channel: isOfficer(actor) ? "agent_view" : "questionnaire", actor: actor.id, at: new Date().toISOString() } } });
    });
    await this.audit.log(c.workspaceId, actor.id, "added", "row", b.group, `${actor.name} added a row to ${b.group} on case ${short(caseId)}`);
    return { row: id, group: b.group };
  }

  /** "None apply" for a repeating group (Lead, break M3, P-71/P-72), or "entries apply" to change it back: a new version
   *  each time (append-only), checked against the version the person saw, never beside live entries. It waits for
   *  confirmation by the same rule as an answer to the group (the client's own answer counts for the principal). */
  async noneApply(actor: Actor, caseId: string, subjectId: string, groupKey: string, body: unknown) {
    const c = await this.reach(actor, caseId, "answer");
    const b = parse(NoneApply, body);
    const who = this.groupFor(actor, c, subjectId, groupKey);
    const id = randomUUID();
    const changed = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${subjectId}|${groupKey}`}))`;
      const cur = await tx.clientGroupAnswer.findFirst({ where: { subjectId, groupKey, supersededById: null } });
      // The answer already stands (even from an older view: break m5), or "entries apply" with nothing said before
      // (break m1: it would record nothing new): nothing is saved.
      if ((cur && cur.noneApply === b.noneApply) || (!cur && !b.noneApply)) return false;
      if ((cur?.id ?? null) !== b.expectedId) conflict("Someone answered this at the same moment; nothing was saved. Look at their answer and try again.");
      const entries = await tx.clientFactRecord.count({ where: { subjectId, groupKey, supersededById: null, tombstone: false } });
      if (b.noneApply && entries) refused(`This group has ${entries} entr${entries === 1 ? "y" : "ies"}; remove ${entries === 1 ? "it" : "them"} first, then say none apply.`);
      if (cur) { const n = await tx.clientGroupAnswer.updateMany({ where: { id: cur.id, supersededById: null }, data: { supersededById: id } }); if (n.count !== 1) conflict("Someone answered this at the same moment; nothing was saved. Look at their answer and try again."); }
      await tx.clientGroupAnswer.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey, noneApply: b.noneApply, status: "DECLARED", sourceJson: { channel: isOfficer(actor) ? "agent_view" : "questionnaire", actor: actor.id, at: new Date().toISOString() } } });
      return true;
    });
    if (changed) await this.audit.log(c.workspaceId, actor.id, "answered", "group", groupKey, `${actor.name} recorded that ${b.noneApply ? "no entries apply" : "entries apply"} in ${groupKey} for the ${who.role.replace(/_/g, " ")} on case ${short(caseId)}`);
    const v = await this.view(actor, caseId, isOfficer(actor) ? "agent" : "sqr");
    return { saved: changed, group: v.sections.find((x) => x.subjectId === subjectId && x.section === groupKey)?.group ?? null };
  }

  /** Removing a row inserts a tombstone version of it; its answers stay stored and are no longer read (team rule). */
  async removeRow(actor: Actor, caseId: string, subjectId: string, rowKey: string) {
    const c = await this.reach(actor, caseId, "answer");
    const cur = await this.db.clientFactRecord.findFirst({ where: { rowKey, subjectId, supersededById: null, tombstone: false } });
    if (!cur || !c.participants.some((p) => p.subjectId === subjectId)) fail("No such row for this person.", HttpStatus.NOT_FOUND);
    const id = randomUUID();
    await this.db.$transaction(async (tx) => {
      const n = await tx.clientFactRecord.updateMany({ where: { id: cur!.id, supersededById: null }, data: { supersededById: id } });
      if (n.count !== 1) conflict("Someone changed this row at the same moment; refresh and try again.");
      await tx.clientFactRecord.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey: cur!.groupKey, rowKey, order: cur!.order, tombstone: true, sourceJson: { channel: isOfficer(actor) ? "agent_view" : "questionnaire", actor: actor.id, at: new Date().toISOString() } } });
    });
    await this.audit.log(c.workspaceId, actor.id, "removed", "row", cur!.groupKey, `${actor.name} removed a row from ${cur!.groupKey} on case ${short(caseId)}`);
    return { row: rowKey, removed: true };
  }

  /** "Confirm section" (P-72): the officer vouches for the answers they reviewed (their ids). Each becomes VERIFIED as a
   *  new version (history kept). An answer that changed or arrived since the officer looked is refused with 409 and
   *  listed, never confirmed unseen. Unanswered questions are listed, not blocked. */
  async confirmSection(actor: Actor, caseId: string, section: string, body: unknown) {
    const c = await this.reach(actor, caseId, "officer");
    const b = parse(ConfirmSection, body);
    if (!c.participants.some((p) => p.subjectId === b.subjectId)) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const s = this.snapshotOf(c);
    const fields = new Set((s.placements as { fact: string; section_id: string }[]).filter((p) => p.section_id === section).map((p) => p.fact));
    if (!fields.size) fail("No such section in this case's release.", HttpStatus.NOT_FOUND);
    const seen = new Set(b.seen);
    const at = new Date();
    // QA-164 (golden journey 1, step 4): a confirm covers the questions the officer's view lists for this person and
    // section. A fact the view leaves out (a worked-out "has any children" once a child is on the case, C7.7 and D4) can
    // never be seen on screen, so its stored answer is neither asked as seen nor confirmed: it never blocks the section.
    const { answers: now, rows: nowRows, groups: nowGroups } = await this.state(c);
    const firmGives = new Set(now.filter((x) => x.channel === FIRM_RECORD && x.subjectId === b.subjectId).map((x) => x.field));
    const listed = new Set(caseView(s, this.peopleOf(c), now, nowRows, "agent", at, nowGroups).sections
      .filter((x) => x.subjectId === b.subjectId && x.section === section).flatMap((x) => x.questions.map((q) => q.fact)));
    const confirmed = await this.db.$transaction(async (tx) => {
      // A removed row's answers stay stored (history) but are no longer read (PR 7 review D1): only answers outside a
      // row or in a live row are current; a seen id of a removed row's answer is not "changed".
      const stored = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: b.subjectId, supersededById: null, canonicalFieldKey: { in: [...fields] } } });
      const live = new Set((await tx.clientFactRecord.findMany({ where: { subjectId: b.subjectId, supersededById: null, tombstone: false }, select: { rowKey: true } })).map((r) => r.rowKey));
      // C6.11 (review M1): a fact the firm record gives (the representative's part, "Uses a representative") shows the
      // firm's answer, never a stored one, so a stored one can never be seen: it neither blocks nor is confirmed.
      const current = stored.filter((a) => (a.rowKey === null || live.has(a.rowKey)) && listed.has(a.canonicalFieldKey) && !firmGives.has(a.canonicalFieldKey));
      // The section's "none apply", when it is a repeating group (Lead, break M3), is confirmed with its answers.
      // With entries, the entries answer the group: its earlier "entries apply" is neither shown nor confirmed (review m6).
      const entries = await tx.clientFactRecord.count({ where: { subjectId: b.subjectId, groupKey: section, supersededById: null, tombstone: false } });
      const held = await tx.clientGroupAnswer.findFirst({ where: { subjectId: b.subjectId, groupKey: section, supersededById: null } });
      const ga = entries ? null : held; // its id, when sent, is still a current id (never "changed")
      const currentIds = new Set([...stored.map((a) => a.id), ...(held ? [held.id] : [])]);
      const gone = [...seen].filter((id) => !currentIds.has(id));
      const unseen = current.filter((a) => a.status === "DECLARED" && !seen.has(a.id));
      const gaUnseen = !!ga && ga.status === "DECLARED" && !seen.has(ga.id);
      if (gone.length || unseen.length || gaUnseen) {
        const changed = await tx.clientCanonicalAnswer.findMany({ where: { id: { in: gone } }, select: { canonicalFieldKey: true } });
        // The group is named only when it is a group and its own answer changed (break m2), never for another person's id.
        const groupGone = gone.length && await tx.clientGroupAnswer.count({ where: { id: { in: gone }, subjectId: b.subjectId, groupKey: section } });
        conflict("Some answers in this section changed or arrived after you reviewed it; nothing was confirmed. Review them and confirm again.", { changed: [...new Set([...changed, ...unseen].map((a) => a.canonicalFieldKey)), ...(gaUnseen || groupGone ? [`group:${section}`] : [])] });
      }
      const open = current.filter((a) => a.status === "DECLARED");
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
    await this.audit.log(c.workspaceId, actor.id, "confirmed", "section", section, `${actor.name} confirmed ${confirmed} answer${confirmed === 1 ? "" : "s"} in ${section} on case ${short(caseId)}`);
    const v = await this.view(actor, caseId, "agent");
    const sec = v.sections.find((x) => x.subjectId === b.subjectId && x.section === section);
    return { confirmed, section, missing: sec?.missing ?? [], invalid: sec?.invalid ?? 0 };
  }

  /** The workspace's cases, newest first, a page at a time (cursor: the last case id of the previous page). */
  async list(actor: Actor, q: { take?: string; after?: string }) {
    need(actor, "case");
    const workspaceId = await this.ws.id();
    const take = Math.min(Math.max(Number(q.take ?? 50) || 50, 1), 100);
    const rows = await this.db.case.findMany({ where: { workspaceId, firmKey: firmOfActor(actor)?.key ?? "" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1, ...(q.after ? { cursor: { id: q.after }, skip: 1 } : {}), include: { combination: { select: { label: true } } } });
    return { cases: rows.slice(0, take).map((c) => ({ id: c.id, reference: c.reference, combination: c.combination.label, status: c.status, created_at: c.createdAt })), next: rows.length > take ? rows[take - 1].id : null };
  }
}

@CaseRead()
@Controller("api/runtime")
export class RuntimeController {
  constructor(@Inject(Runtime) private readonly r: Runtime) {}
  @Get("cases") list(@Headers("x-actor") a: H, @Query() q: { take?: string; after?: string }) { return this.r.list(actorOf(a), q); }
  @Post("cases") create(@Headers("x-actor") a: H, @Body() b: unknown) { return this.r.createCase(actorOf(a), b); }
  @Get("openable") openable(@Headers("x-actor") a: H) { return this.r.openable(actorOf(a)); }
  @Get("combinations/:id/employer-link") employerLink(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.employerLink(actorOf(a), id); }
  @Get("cases/:id") get(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.get(actorOf(a), id); }
  @Post("cases/:id/people") addPerson(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.r.addPerson(actorOf(a), id, b); }
  @Patch("cases/:id/people/:subject") updatePerson(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.updatePerson(actorOf(a), id, s, b); }
  @Get("cases/:id/questionnaire") view(@Headers("x-actor") a: H, @Param("id") id: string, @Query("mode") m?: string) { return m === "pqr" ? this.r.pqr(actorOf(a), id) : this.r.view(actorOf(a), id, m === "agent" ? "agent" : "sqr"); }
  @Post("cases/:id/review") review(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.review(actorOf(a), id); }
  @Put("cases/:id/answers/:subject/:field") answer(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("field") f: string, @Body() b: unknown) { return this.r.putAnswer(actorOf(a), id, s, f, b); }
  @Put("cases/:id/groups/:subject/:group/none-apply") noneApply(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("group") g: string, @Body() b: unknown) { return this.r.noneApply(actorOf(a), id, s, g, b); }
  @Post("cases/:id/groups/:subject/rows") addRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.addRow(actorOf(a), id, s, b); }
  @Delete("cases/:id/groups/:subject/rows/:row") removeRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("row") r: string) { return this.r.removeRow(actorOf(a), id, s, r); }
  @Post("cases/:id/sections/:section/confirm") confirm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("section") s: string, @Body() b: unknown) { return this.r.confirmSection(actorOf(a), id, s, b); }
}
