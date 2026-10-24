// Runtime API (runtime lane, R1 thin slice, P-67): a case for a released combination, pinned to that release; its
// people; one current answer per person per fact, append-only; repeating rows; the officer's "Confirm section" (P-72).
// Every read uses the case's pinned release, never the newest (STANDARDS §3.7). Deny by default: the case officer works
// on the workspace's cases; a client reaches only the case they answer, and only its questionnaire; configuration
// people reach no case. Answer values and typed names never go into audit text or logs (STANDARDS §5): audit lines name
// a case by its id.
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import type { z } from "zod";
import { ConfirmSection, NewCase, NewPerson, NewRow, PutAnswer, UpdatePerson, type CaseRole } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseView, checkValue, isClientField, type Answer, type Mode, type Participant, type Row } from "../../engine/runtime/case.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, Db, fail, need, Workspace, type Actor } from "./core.ts";

type H = string | undefined;
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const conflict = (detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: "https://expatready.local/problems/stale-answer", title: "Changed by someone else", status: 409, detail, ...extra }, HttpStatus.CONFLICT); };
const fieldError = (field: string, message: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: message, errors: [{ field, message }] }, HttpStatus.BAD_REQUEST); };
const RELATIONSHIP: Record<string, string> = { spouse_or_partner: "SPOUSE_OR_PARTNER", child: "CHILD" };
const isOfficer = (a: Actor) => (a.duties as readonly string[]).includes("case");
const FIELD_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
const short = (id: string) => id.slice(0, 8);
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";

type Reached = Awaited<ReturnType<Runtime["reach"]>>;

@Injectable()
export class Runtime {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** The case, if this person may reach it: the officer any case of the workspace, a client only their own (others are
   *  "not found", as the team's cross-tenant rule). Configuration people hold neither duty. The pin must still match
   *  its release's hash: a changed pin or release is refused, never read. */
  private async reach(actor: Actor, caseId: string, want: "read" | "answer" | "officer") {
    const workspaceId = await this.ws.id();
    const officer = isOfficer(actor), client = (actor.duties as readonly string[]).includes("answer");
    if (!officer && !client) fail(`${actor.name} (simulated) works on configuration, not on cases.`, HttpStatus.FORBIDDEN);
    if (want === "officer" && !officer) fail("Only the case officer can do this.", HttpStatus.FORBIDDEN);
    const c = await this.db.case.findFirst({ where: { id: caseId, workspaceId }, include: { pins: { include: { release: true } }, participants: { orderBy: { order: "asc" }, include: { subject: { include: { party: { include: { profile: true } } } } } } } });
    if (!c || (!officer && c.clientActorId !== actor.id)) fail("No such case.", HttpStatus.NOT_FOUND);
    const pin = c!.pins[0];
    if (!pin || c!.pins.length !== 1 || pin.contentHash !== pin.release.sha256 || pin.release.combinationId !== c!.combinationId) fail("This case's pin to its release does not match the release; nothing was read or changed. Ask the Lead.", HttpStatus.CONFLICT);
    return c!;
  }

  private snapshotOf(c: Reached) { return c.pins[0].release.snapshot as unknown as Snapshot; }
  private peopleOf(c: Reached): Participant[] {
    return c.participants.map((p) => ({ subjectId: p.subjectId, role: p.role as Participant["role"], label: p.subject.label, applies: p.applies }));
  }

  async createCase(actor: Actor, body: unknown) {
    need(actor, "case");
    const b = parse(NewCase, body);
    const workspaceId = await this.ws.id();
    const { idempotencyKey: _k, ...request } = b;
    const fingerprint = createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const replay = async () => {
      const again = b.idempotencyKey ? await this.db.case.findFirst({ where: { workspaceId, idempotencyKey: b.idempotencyKey } }) : null;
      if (!again) return null;
      if (again.idempotencyFingerprint !== fingerprint) fail("This idempotency key was already used for a different case request; nothing was created. Use a new key.", HttpStatus.CONFLICT);
      return { ...(await this.get(actor, again.id)), created: false };
    };
    const earlier = await replay();
    if (earlier) return earlier;
    const combination = await this.db.combination.findFirst({ where: { id: b.combinationId, workspaceId } });
    if (!combination) fail("No such combination.", HttpStatus.NOT_FOUND);
    const release = await this.db.configRelease.findFirst({ where: { combinationId: b.combinationId }, orderBy: { version: "desc" } });
    if (!release) fail(`"${combination!.label}" has no released version yet: a case opens only on a released configuration.`, HttpStatus.CONFLICT);
    let client: Actor | null = null;
    try { client = actorOf(b.clientActor); } catch { /* reported below as a field error */ }
    if (!client || !(client.duties as readonly string[]).includes("answer")) fieldError("clientActor", "Choose a client login (the client who answers the questionnaire).");
    let id: string;
    try {
      id = await this.db.$transaction(async (tx) => {
        const party = await tx.party.create({ data: { workspaceId, profile: { create: { workspaceId, displayName: b.principal.displayName } } } });
        const c = await tx.case.create({ data: { workspaceId, combinationId: b.combinationId, reference: b.reference, clientActorId: client!.id, createdBy: actor.id, idempotencyKey: b.idempotencyKey ?? null, idempotencyFingerprint: b.idempotencyKey ? fingerprint : null } });
        const caseSubject = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "case", label: "The application" } });
        const principal = await tx.answerSubject.create({ data: { workspaceId, partyId: party.id, subjectKind: "principal", label: b.principal.displayName } });
        await tx.caseParticipant.createMany({ data: [{ workspaceId, caseId: c.id, subjectId: caseSubject.id, role: "case", order: 0 }, { workspaceId, caseId: c.id, subjectId: principal.id, role: "principal", order: 1 }] });
        await tx.packWorkPin.create({ data: { workspaceId, caseId: c.id, combinationId: b.combinationId, partyId: party.id, packVersionId: release!.packVersionId, configReleaseId: release!.id, contentHash: release!.sha256, actorId: actor.id } });
        return c.id;
      });
    } catch (e) {
      if (!unique(e)) throw e;
      const same = await replay(); // a simultaneous create with the same key won: answer with its case
      if (same) return same;
      fail("A case with this reference already exists; give the new case its own reference.", HttpStatus.CONFLICT);
    }
    await this.audit.log(workspaceId, actor.id, "opened", "case", id!, `${actor.name} opened case ${short(id!)} on "${combination!.label}" released version ${release!.version} (${release!.sha256.slice(0, 12)})`, undefined, b.combinationId);
    return { ...(await this.get(actor, id!)), created: true };
  }

  async get(actor: Actor, caseId: string) {
    const c = await this.reach(actor, caseId, "read");
    const pin = c.pins[0];
    return { id: c.id, reference: c.reference, status: c.status, combination_id: c.combinationId, client: c.clientActorId,
      pin: { release_version: pin.release.version, sha256: pin.contentHash, pinned_at: pin.pinnedAt, revision: pin.revision },
      people: c.participants.map((p) => ({ subject_id: p.subjectId, role: p.role, label: p.subject.label, applies: p.applies })) };
  }

  /** Adds a spouse or child within the pinned release's limits. The case row is locked while counting, so simultaneous
   *  adds are counted one after the other (each lawful one succeeds; the one over the limit is refused). */
  async addPerson(actor: Actor, caseId: string, body: unknown) {
    const c = await this.reach(actor, caseId, "officer");
    const b = parse(NewPerson, body);
    const limits = (this.snapshotOf(c).combination.participants ?? []) as { role: string; max?: number; label?: string }[];
    const limit = limits.find((p) => p.role === b.role);
    if (!limit) fail(`This combination's released configuration has no ${b.role.replace(/_/g, " ")}.`, HttpStatus.UNPROCESSABLE_ENTITY);
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
      const same = key ? await tx.caseParticipant.findFirst({ where: { caseId, idempotencyKey: key } }) : null;
      if (same) return null; // the first press won while this one waited for the lock: answered below
      const now = await tx.caseParticipant.findMany({ where: { caseId } });
      const already = now.filter((p) => p.role === b.role).length;
      if (limit!.max !== undefined && already >= limit!.max) fail(`The release allows at most ${limit!.max} ${(limit!.label ?? b.role).toLowerCase()} on a case; this case has ${already}.`, HttpStatus.UNPROCESSABLE_ENTITY);
      const principal = c.participants.find((p) => p.role === "principal")!;
      const party = await tx.party.create({ data: { workspaceId, profile: { create: { workspaceId, displayName: b.displayName } } } });
      await tx.partyRelationship.create({ data: { workspaceId, fromPartyId: principal.subject.partyId, toPartyId: party.id, relationshipType: RELATIONSHIP[b.role] } });
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
    await this.db.caseParticipant.update({ where: { id: p!.id }, data: { applies: b.applies } });
    await this.audit.log(c.workspaceId, actor.id, "changed", "person", caseId, `${actor.name} marked a ${p!.role.replace(/_/g, " ")} on case ${short(caseId)} as ${b.applies ? "travelling" : "not travelling"}`);
    return { subject_id: subjectId, applies: b.applies };
  }

  private async state(c: Reached) {
    const subjects = c.participants.map((p) => p.subjectId);
    const [answers, rows] = await Promise.all([
      this.db.clientCanonicalAnswer.findMany({ where: { subjectId: { in: subjects }, supersededById: null } }),
      this.db.clientFactRecord.findMany({ where: { subjectId: { in: subjects }, supersededById: null, tombstone: false } }),
    ]);
    const a: Answer[] = answers.map((x) => { const src = x.sourceJson as { channel: string; actor: string; at: string }; return { id: x.id, subjectId: x.subjectId, field: x.canonicalFieldKey, rowKey: x.rowKey, value: x.valueJson, status: x.status as Answer["status"], channel: src.channel, actor: src.actor, at: src.at }; });
    const r: Row[] = rows.map((x) => ({ rowKey: x.rowKey, subjectId: x.subjectId, group: x.groupKey, order: x.order }));
    return { answers: a, rows: r };
  }

  async view(actor: Actor, caseId: string, mode: Mode) {
    const c = await this.reach(actor, caseId, "read");
    if (mode === "agent" && !isOfficer(actor)) fail("The agent view is for the case officer.", HttpStatus.FORBIDDEN);
    const { answers, rows } = await this.state(c);
    return { case: await this.get(actor, caseId), ...caseView(this.snapshotOf(c), this.peopleOf(c), answers, rows, mode) };
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
    const field = (s.canonical_fields as { id: string; item_version: number }[]).find((f) => f.id === fieldKey);
    const place = (s.placements as { fact: string; repeats: string; section_id: string; collected_from: string }[]).find((p) => p.fact === fieldKey);
    if (!field || !place) fail(`The release this case works from does not ask for ${fieldKey}.`, HttpStatus.NOT_FOUND);
    if (!officer && !isClientField(s, fieldKey)) fail("The officer enters this fact from a document or record.", HttpStatus.FORBIDDEN);
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
    await this.audit.log(c.workspaceId, actor.id, "answered", "case fact", fieldKey, `${actor.name} ${b.expectedId ? "changed" : "answered"} ${fieldKey} on case ${short(caseId)} (${officer ? "agent view" : "questionnaire"})`);
    const after = await this.view(actor, caseId, officer ? "agent" : "sqr");
    const q = after.sections.flatMap((x) => x.questions).find((x) => x.subjectId === subjectId && x.fact === fieldKey);
    const ans = rowKey ? q?.rows.find((x) => x.row === rowKey)?.answer : q?.answer;
    const fills = q?.fills ?? [];
    return { answer: ans ?? { id: newId, problems: checkValue(s, fieldKey, b.value) }, fills,
      message: fills.length ? `Saved. It fills ${fills.map((f) => `${f.form} for ${f.person} (${f.boxes} box${f.boxes > 1 ? "es" : ""})`).join(", ")}.` : "Saved." };
  }

  /** Adds a row to a person's repeating group (or the application's, for a case-level group). Rows of one group are
   *  numbered one at a time (a transaction lock), and the database refuses two live rows in one place. */
  async addRow(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.reach(actor, caseId, "answer");
    const b = parse(NewRow, body);
    const who = c.participants.find((p) => p.subjectId === subjectId);
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const s = this.snapshotOf(c);
    const group = (s.placements as { fact: string; section_id: string; repeats: string }[]).filter((p) => p.section_id === b.group && p.repeats === "per_row");
    if (!group.length) fail("That section has no repeating group.", HttpStatus.NOT_FOUND);
    const caseLevel = group.every((p) => p.fact.startsWith("case."));
    if (caseLevel !== (who!.role === "case")) fail(caseLevel ? "This group is asked once for the application, not for a person." : "This group is asked for a person, not for the application.", HttpStatus.UNPROCESSABLE_ENTITY);
    if (!isOfficer(actor) && !group.some((p) => isClientField(s, p.fact))) fail("The officer fills this group.", HttpStatus.FORBIDDEN);
    const id = randomUUID();
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${subjectId}|${b.group}`}))`;
      const live = await tx.clientFactRecord.findMany({ where: { subjectId, groupKey: b.group, supersededById: null } });
      await tx.clientFactRecord.create({ data: { id, workspaceId: c.workspaceId, subjectId, groupKey: b.group, rowKey: id, order: live.length ? Math.max(...live.map((x) => x.order)) + 1 : 0, sourceJson: { channel: isOfficer(actor) ? "agent_view" : "questionnaire", actor: actor.id, at: new Date().toISOString() } } });
    });
    await this.audit.log(c.workspaceId, actor.id, "added", "row", b.group, `${actor.name} added a row to ${b.group} on case ${short(caseId)}`);
    return { row: id, group: b.group };
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
    const confirmed = await this.db.$transaction(async (tx) => {
      // A removed row's answers stay stored (history) but are no longer read (PR 7 review D1): only answers outside a
      // row or in a live row are current; a seen id of a removed row's answer is not "changed".
      const stored = await tx.clientCanonicalAnswer.findMany({ where: { subjectId: b.subjectId, supersededById: null, canonicalFieldKey: { in: [...fields] } } });
      const live = new Set((await tx.clientFactRecord.findMany({ where: { subjectId: b.subjectId, supersededById: null, tombstone: false }, select: { rowKey: true } })).map((r) => r.rowKey));
      const current = stored.filter((a) => a.rowKey === null || live.has(a.rowKey));
      const currentIds = new Set(stored.map((a) => a.id));
      const gone = [...seen].filter((id) => !currentIds.has(id));
      const unseen = current.filter((a) => a.status === "DECLARED" && !seen.has(a.id));
      if (gone.length || unseen.length) {
        const changed = await tx.clientCanonicalAnswer.findMany({ where: { id: { in: gone } }, select: { canonicalFieldKey: true } });
        conflict("Some answers in this section changed or arrived after you reviewed it; nothing was confirmed. Review them and confirm again.", { changed: [...new Set([...changed, ...unseen].map((a) => a.canonicalFieldKey))] });
      }
      const open = current.filter((a) => a.status === "DECLARED");
      for (const a of open) {
        const id = randomUUID();
        const n = await tx.clientCanonicalAnswer.updateMany({ where: { id: a.id, supersededById: null }, data: { supersededById: id } });
        if (n.count !== 1) conflict("An answer in this section changed while confirming; nothing was confirmed. Review it and confirm again.", { changed: [a.canonicalFieldKey] });
        await tx.clientCanonicalAnswer.create({ data: { id, workspaceId: a.workspaceId, partyId: a.partyId, subjectId: a.subjectId, canonicalFieldId: a.canonicalFieldId, canonicalFieldKey: a.canonicalFieldKey, rowKey: a.rowKey, valueJson: a.valueJson as object, status: "VERIFIED", sourceJson: { channel: "confirm_section", actor: actor.id, at: at.toISOString(), from: a.id }, verifiedBy: actor.id, verifiedAt: at } });
      }
      return open.length;
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
    const rows = await this.db.case.findMany({ where: { workspaceId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take + 1, ...(q.after ? { cursor: { id: q.after }, skip: 1 } : {}), include: { combination: { select: { label: true } } } });
    return { cases: rows.slice(0, take).map((c) => ({ id: c.id, reference: c.reference, combination: c.combination.label, status: c.status, created_at: c.createdAt })), next: rows.length > take ? rows[take - 1].id : null };
  }
}

@Controller("api/runtime")
export class RuntimeController {
  constructor(@Inject(Runtime) private readonly r: Runtime) {}
  @Get("cases") list(@Headers("x-actor") a: H, @Query() q: { take?: string; after?: string }) { return this.r.list(actorOf(a), q); }
  @Post("cases") create(@Headers("x-actor") a: H, @Body() b: unknown) { return this.r.createCase(actorOf(a), b); }
  @Get("cases/:id") get(@Headers("x-actor") a: H, @Param("id") id: string) { return this.r.get(actorOf(a), id); }
  @Post("cases/:id/people") addPerson(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.r.addPerson(actorOf(a), id, b); }
  @Patch("cases/:id/people/:subject") updatePerson(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.updatePerson(actorOf(a), id, s, b); }
  @Get("cases/:id/questionnaire") view(@Headers("x-actor") a: H, @Param("id") id: string, @Query("mode") m?: string) { return this.r.view(actorOf(a), id, m === "agent" ? "agent" : "sqr"); }
  @Put("cases/:id/answers/:subject/:field") answer(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("field") f: string, @Body() b: unknown) { return this.r.putAnswer(actorOf(a), id, s, f, b); }
  @Post("cases/:id/groups/:subject/rows") addRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.r.addRow(actorOf(a), id, s, b); }
  @Delete("cases/:id/groups/:subject/rows/:row") removeRow(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Param("row") r: string) { return this.r.removeRow(actorOf(a), id, s, r); }
  @Post("cases/:id/sections/:section/confirm") confirm(@Headers("x-actor") a: H, @Param("id") id: string, @Param("section") s: string, @Body() b: unknown) { return this.r.confirmSection(actorOf(a), id, s, b); }
}
