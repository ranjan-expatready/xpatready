// C6.13 Filing changes while preparing (screens lane, B135; P-406 (1); concept screens/B135/concept.md r2): the case
// officer's Make principal, Remove filing and Add filing back. POST /api/runtime/cases/:id/filing-changes with
// `preview: true` names every filing that changes, by person, before anything happens (BR-4); without it the change is
// applied over the preview's `basis` with a reason (BR-6, BR-8), under the case's row lock, and kept on a filing_change
// row. Refused in words: the principal's filing (BR-2), a child or a person not travelling as principal (BR-3), a case
// with people on the principal's application (BR-0), anything once a filing is recorded as submitted (BR-7). The rules
// are engine/runtime/filing-changes.ts; the filings and fees are CaseFilings.deriveFor, the same derivation as the
// filings view (M7). Case staff of the case's firm only (Runtime.reach "officer"). No model call (US$0).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { MINOR, type CaseFilings as Derived } from "../../contracts/runtime.ts";
import { releaseModes } from "../../engine/filing-modes.ts";
import { ageOn, defaultModeOf } from "../../engine/runtime/filings.ts";
import { applyChange, basisOf, CHANGE_KINDS, diffFilings, type ChangeKind } from "../../engine/runtime/filing-changes.ts";
import type { Participant } from "../../engine/runtime/case.ts";
import { actorOf, Audit, CaseRead, Db, type Actor } from "./core.ts";
import { liveParticipants } from "./stage-scope.ts"; // C6.17
import { CaseFilings } from "./case-filings.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
const Change = z.object({
  kind: z.enum(CHANGE_KINDS, { message: "Say which change: make_principal, remove_filing or add_back." }),
  subject: z.string().uuid({ message: "Name the person (their id on this case)." }),
  preview: z.boolean().optional(),
  basis: z.string().regex(/^[0-9a-f]{64}$/, { message: "Send the basis from the preview you read." }).optional(),
  reason: z.string().max(500, { message: "Keep the reason under 500 characters." }).optional(),
});
const problem = (status: number, title: string, detail: string, errors?: { field: string; message: string }[]): never => {
  throw new HttpException({ type: "https://expatready.local/problems/filing-change", title, status, detail, ...(errors ? { errors } : {}) }, status);
};
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/;
/** Break m: a reason says something (a letter or a digit), never only spaces or invisible characters. */
const SAYS = /[\p{L}\p{N}]/u;
const KIND_WORDS: Record<ChangeKind, string> = { make_principal: "made the principal applicant", remove_filing: "filing removed", add_back: "filing added back" };
const inverse = (kind: ChangeKind, subject: string, other: string | null): { kind: ChangeKind; subject: string } =>
  kind === "make_principal" ? { kind, subject: other! } : { kind: kind === "remove_filing" ? "add_back" : "remove_filing", subject };

export type FilingChangePreview = {
  kind: ChangeKind; subject: string; title: string; stays: string;
  changes: { person: string; label: string; words: string[]; on?: string }[];
  totals: { before_cents: number; after_cents: number } | null; basis: string;
};

@Injectable()
export class FilingChanges {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(CaseFilings) private readonly f: CaseFilings, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  /** What the case's release says each role files (C11.12 releaseModes; the table's default for a role it leaves out). */
  private modeOf(c: Reached) {
    const s = this.r.snapshotOf(c), modes = releaseModes((s.combination?.participants ?? []) as { role: string }[]), key = s.combination?.key ?? "";
    return (role: string) => (role === "principal" ? "files_own" : modes.get(role) ?? defaultModeOf(key, role) ?? null);
  }

  private async recorded(c: Reached, q: Pick<Db, "filingRecord"> = this.db) {
    const r = await q.filingRecord.findFirst({ where: { caseId: c.id, filing: { stageId: c.stage.id } }, orderBy: { recordedAt: "asc" }, include: { filing: { select: { subjectId: true } } } });
    if (!r) return null;
    return { name: c.participants.find((p) => p.subjectId === r.filing.subjectId)?.subject.label ?? "A person", on: r.submittedOn.toISOString().slice(0, 10), number: r.applicationNumber };
  }

  /** The preview of one change, or its refusal (thrown, in words). Read only. */
  async preview(c: Reached, kind: ChangeKind, subject: string): Promise<{ view: FilingChangePreview; after: Participant[]; other: string | null }> {
    const people = this.r.peopleOf(c), s = this.r.snapshotOf(c);
    const out = applyChange(kind, subject, people, { modeOf: this.modeOf(c), combination: s.combination?.label ?? "this combination", recorded: await this.recorded(c) });
    if ("status" in out) problem(out.status, out.status === 409 ? "Not changed here" : out.status === 404 ? "Not found" : "Not possible", out.words);
    const { after, other } = out as { after: Participant[]; other: string | null };
    const [before, then] = await Promise.all([this.f.deriveFor(c, people), this.f.deriveFor(c, after)]) as unknown as [Derived, Derived];
    const extra = await this.extraWords(c, kind, subject, other, people, before, then);
    const diff = diffFilings(before, then, people, extra);
    const me = people.find((p) => p.subjectId === subject)!, them = other ? people.find((p) => p.subjectId === other) : undefined;
    // BK-9: a person on someone's shared application has no filing of their own: the words name that application.
    const onApp = kind !== "make_principal" ? diff.lines.find((l) => l.person === subject)?.on ?? (before.derived ? before.filings.find((f) => f.owner?.subject !== subject && f.applicants.some((a) => a.subject === subject))?.owner?.label : undefined) : undefined;
    const title = kind === "make_principal" ? `Make ${me.label} the principal applicant?` : onApp ? (kind === "remove_filing" ? `Take ${me.label} off as travelling on ${onApp}'s application?` : `Add ${me.label} back as travelling on ${onApp}'s application?`) : kind === "remove_filing" ? `Remove ${me.label}'s filing?` : `Add ${me.label}'s filing back?`;
    const stays = onApp ? (kind === "remove_filing" ? `${me.label} stays on ${onApp}'s application, declared only (not travelling): asked only what the others' forms need about them. Their answers and uploads are kept.` : `${me.label} applies on ${onApp}'s application again, with the same items as before.`)
      : kind === "make_principal"
      ? `${me.label} becomes principal applicant; ${them?.label ?? "the principal"} becomes spouse or partner. Each person keeps their own answers and uploads, and the client who answers the questionnaire stays the same person, so no answer becomes confirmed or unconfirmed.`
      : kind === "remove_filing" ? `${me.label} stays on the case, not travelling: asked only what the others' forms need about them. Their answers and uploads are kept.`
      : `${me.label} files their own application again: the same filing, with its items and channels as before.`;
    const totals = before.derived && before.fees_worked_out ? diff.totals : null;
    const body = { kind, subject, title, stays, changes: diff.lines, totals };
    return { view: { ...body, basis: basisOf({ body, people: people.map((p) => [p.subjectId, p.role, p.applies]) }) }, after, other };
  }

  /** Words the derivation cannot give: items of a filing that stops, Ready to file marks taken back, a minor's signer. */
  private async extraWords(c: Reached, kind: ChangeKind, subject: string, other: string | null, people: Participant[], before: Derived, then: Derived) {
    const extra = new Map<string, string[]>(), add = (s: string, w: string) => extra.set(s, [...(extra.get(s) ?? []), w]);
    const filings = await this.db.filing.findMany({ where: { caseId: c.id, stageId: c.stage.id }, select: { id: true, subjectId: true, status: true, active: true } });
    if (kind === "remove_filing") {
      // BK-9: the person's own items, on their own filing or on the principal's shared one.
      const theirs = { subjectId: subject, filing: { caseId: c.id, stageId: c.stage.id, active: true } };
      const [items, signed] = await Promise.all([this.db.filingItem.count({ where: { ...theirs, active: true } }), this.db.signedScan.count({ where: { item: theirs } })]);
      if (items) add(subject, `${items} item${items === 1 ? "" : "s"} stop applying${signed ? ` (${signed} signed by hand)` : ""}: kept, and they come back if the filing is added back`);
    }
    // BR-4 (M6): the principal signs for a minor child (signing.ts, by role): the signer moves with the principal.
    if (kind === "make_principal" && other) {
      const { answers } = await this.r.state(c), today = new Date();
      const nameOf = (s: string) => people.find((p) => p.subjectId === s)?.label ?? "someone";
      // Review m: only a child who files (a child not travelling signs nothing for this application).
      for (const child of people.filter((p) => p.role === "child" && p.applies)) {
        const age = ageOn(answers.find((a) => a.subjectId === child.subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value as string | undefined, today);
        if (age === null || age >= MINOR.underAge) continue;
        add(child.subjectId, `Signed for as their parent by ${nameOf(subject)} instead of ${nameOf(other)}`);
        const childFiling = filings.find((x) => x.subjectId === child.subjectId && x.active);
        const signed = childFiling ? await this.db.signedScan.count({ where: { item: { filingId: childFiling.id } } }) : 0;
        if (signed) add(child.subjectId, `${signed} form${signed === 1 ? "" : "s"} already signed by hand by ${nameOf(other)}: to be signed again (warning)`);
      }
    }
    // BR-6 (review M1, break M4): every filing named in the preview, for any reason (fees, applicants, items, a minor's
    // signer), is the set the apply takes back from Ready to file; the words name each one, so nothing resets unsaid.
    const changed = new Set([...diffFilings(before, then, people).lines.map((l) => l.person), ...extra.keys()]);
    for (const x of filings) if (x.status === "READY_TO_FILE" && x.active && changed.has(x.subjectId)) add(x.subjectId, "Marked Ready to file → Not started");
    return extra;
  }

  async change(actor: Actor, caseId: string, body: unknown) {
    // Break m: who may act is checked first, so a client's malformed body is a 403, not a 400.
    const c = await this.r.reach(actor, caseId, "officer");
    const p = Change.safeParse(body ?? {});
    if (!p.success) throw new HttpException(problemFromZod(p.error), HttpStatus.BAD_REQUEST);
    const b = p.data;
    const { view, after, other } = await this.preview(c, b.kind, b.subject);
    if (b.preview) return view;
    const reason = (b.reason ?? "").trim();
    if (!reason || CONTROL.test(reason) || !SAYS.test(reason)) problem(400, "Some details need fixing", "Write a reason: it is kept with the change.", [{ field: "reason", message: "Write a reason: it is kept with the change." }]);
    if (!b.basis) problem(400, "Some details need fixing", "Send the basis from the preview you read.", [{ field: "basis", message: "Look at what changes first (preview), then apply." }]);
    if (b.basis !== view.basis) problem(409, "Changed since you looked", "This case changed since you opened this. Look again before changing it; nothing was changed.");
    // QA-329: the people in one fixed order (by subject), so two reads of the same people give the same JSON, however the
    // database returns their rows (an object keeps its keys in insertion order; a case with an added person read
    // unordered came back in another order and every change was refused).
    const roles = (list: { subjectId: string; role: string; applies: boolean }[]) => Object.fromEntries(list.filter((x) => x.role !== "case").map((x) => [x.subjectId, { role: x.role, applies: x.applies }] as const).sort(([a], [z]) => (a < z ? -1 : a > z ? 1 : 0)));
    const changedPeople = after.filter((a) => { const was = c.participants.find((x) => x.subjectId === a.subjectId); return !!was && (was.role !== a.role || was.applies !== a.applies); });
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      // BR-8: the people are still as the preview read them, and nothing was recorded meanwhile (BR-7).
      const now = await tx.caseParticipant.findMany({ where: liveParticipants(c.id), orderBy: { order: "asc" }, select: { subjectId: true, role: true, applies: true } });
      if (JSON.stringify(roles(now)) !== JSON.stringify(roles(c.participants))) problem(409, "Changed since you looked", "This case changed since you opened this. Look again before changing it; nothing was changed.");
      // Review m: the same words as before the lock (BR-7: the name, the date, the number and where it is done instead).
      const rec = await this.recorded(c, tx);
      if (rec) { const out = applyChange(b.kind, b.subject, this.r.peopleOf(c), { modeOf: this.modeOf(c), combination: "", recorded: rec }); problem(409, "Not changed here", "words" in out ? out.words : "Recorded as submitted meanwhile."); }
      for (const a of changedPeople) await tx.caseParticipant.update({ where: { subjectId: a.subjectId }, data: { role: a.role, applies: a.applies } });
      await tx.filingChange.create({ data: { id: randomUUID(), workspaceId: c.workspaceId, caseId: c.id, kind: b.kind, subjectId: b.subject, otherSubjectId: other, rolesBefore: roles(c.participants), rolesAfter: roles(after.map((x) => ({ ...x, subjectId: x.subjectId }))), reason, basis: view.basis, changedBy: actor.id } });
      // BR-6 (M2): a changed filing marked Ready to file is not ready for the new shape: back to Not started.
      const changedSubjects = view.changes.map((x) => x.person);
      if (changedSubjects.length) await tx.filing.updateMany({ where: { caseId: c.id, stageId: c.stage.id, subjectId: { in: changedSubjects }, status: "READY_TO_FILE" }, data: { status: "NOT_STARTED" } });
    });
    const me = c.participants.find((x) => x.subjectId === b.subject)!;
    await this.audit.log(c.workspaceId, actor.id, "changed", "filing", c.id, `${actor.name}: a ${me.role.replace(/_/g, " ")} on case ${c.id.slice(0, 8)}: ${KIND_WORDS[b.kind]}`, { kind: b.kind, changes: view.changes.length });
    const words = b.kind === "make_principal" ? `${me.subject.label} is now the principal applicant. Filings and fees worked out again.` : b.kind === "remove_filing" ? `${me.subject.label}'s filing removed. Fees worked out again.` : `${me.subject.label}'s filing added back. Fees worked out again.`;
    return { done: true, words, undo: inverse(b.kind, b.subject, other) };
  }

  /** The case's filing changes, newest first, for the person rows (BR-6: the reason is read back). */
  async list(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, caseId, "officer");
    const rows = await this.db.filingChange.findMany({ where: { caseId: c.id }, orderBy: [{ changedAt: "desc" }, { id: "desc" }] });
    return { changes: rows.map((x) => ({ kind: x.kind, subject: x.subjectId, other: x.otherSubjectId, reason: x.reason, by: x.changedBy, at: x.changedAt.toISOString() })) };
  }
}

@CaseRead()
@Controller("api/runtime")
export class FilingChangesController {
  constructor(@Inject(FilingChanges) private readonly x: FilingChanges) {}
  @Post("cases/:id/filing-changes") @HttpCode(200) change(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.change(actorOf(a), id, b); }
  @Get("cases/:id/filing-changes") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.list(actorOf(a), id); }
}
