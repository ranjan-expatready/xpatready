// Case forms (runtime lane, R1d, plan §8 RT-13…RT-17): IMM 5257 and the case's other PDF forms filled from the case's
// confirmed facts only (P-72), through the shared filler (fill.ts writeForm: each value in the form field's own format,
// signatures never typed, append-only writer, read back, signatures checked). Never overwrite (P-65 d): each copy is a
// new row with the facts it read frozen beside it; a later answer makes a copy "out of date" (a locked one "stale") and
// never changes it; a new copy is made only when the officer asks. Generation runs as a queued job (STANDARDS §3:
// never inside the web request): one at a time, status kept, a restart resumes queued copies and fails running ones.
// Audit lines name the form, the person's role and the case by its short id: never a value or a typed name (RT-17).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Res, type OnModuleInit } from "@nestjs/common";
import type { Response } from "express";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { GenerateCopy, LockCopy, LOCK_KINDS, notReady, type CaseForm, type FormCopy } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseView } from "../../engine/runtime/case.ts";
import { changedFacts, formCoverage, inputHash, readiness, type FormFact } from "../../engine/runtime/forms.ts";
import type { BoxRow } from "../../engine/render.ts";
import { actorOf, Audit, Db, fail, ROOT, VAR, type Actor } from "./core.ts";
import { writeForm } from "./fill.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
type Stored = { facts: FormFact[]; boxes: BoxRow[] };
const short = (id: string) => id.slice(0, 8);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const conflict = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const ROLE: Record<string, string> = { principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A malformed id in the URL is "not found", never a database error. */
const idOf = (id: string, what: string) => (UUID.test(id) ? id : fail(`No such ${what}.`, HttpStatus.NOT_FOUND));

@Injectable()
export class CaseForms implements OnModuleInit {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly runtime: Runtime, @Inject(Audit) private readonly audit: Audit) {}
  private queue: string[] = [];
  private running = false;

  /** Restart recovery: a queued copy never started, so it resumes; a running one was cut off, so it failed (its partial
   *  file, if any, is never handed over). */
  async onModuleInit() {
    await this.db.formInstance.updateMany({ where: { status: "RUNNING" }, data: { status: "FAILED", error: "Interrupted by a restart; generate a new copy.", finishedAt: new Date() } });
    const queued = await this.db.formInstance.findMany({ where: { status: "QUEUED" }, orderBy: { createdAt: "asc" }, select: { id: true } });
    this.enqueue(queued.map((q) => q.id));
  }

  private officerCase(actor: Actor, caseId: string) { return this.runtime.reach(actor, idOf(caseId, "case"), "officer"); }

  /** Every PDF form that applies to someone on the case: the draft (what a copy made now would write), readiness and
   *  the copies made, each with out of date / stale and the facts that changed. One read of the case. */
  async list(actor: Actor, caseId: string): Promise<{ forms: CaseForm[] }> {
    const c = await this.officerCase(actor, caseId);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const { answers, rows } = await this.runtime.state(c);
    const view = caseView(s, people, answers, rows, "agent");
    const pdf = new Set((s.field_maps as { form_number: string; channel?: string; official_file?: string }[]).filter((m) => m.channel !== "ONLINE" && m.official_file).map((m) => m.form_number));
    const titles = new Map((s.forms as { form_number: string; title?: string }[]).map((f) => [f.form_number, f.title ?? f.form_number]));
    const copies = await this.db.formInstance.findMany({ where: { caseId }, orderBy: { createdAt: "desc" }, include: { snapshot: true } });
    const labels = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    const forms: CaseForm[] = [];
    for (const p of people.filter((x) => x.role !== "case")) {
      for (const form of [...pdf].sort()) {
        const cov = formCoverage(s, people, answers, rows, form, p.subjectId);
        if (!cov || cov.applies === false) continue;
        const mine = copies.filter((x) => x.formNumber === form && x.subjectId === p.subjectId);
        forms.push({ form, title: titles.get(form) ?? form, subject_id: p.subjectId, person: p.label,
          draft: { written_now: cov.facts.length, mapped: cov.mapped, unconfirmed: cov.boxes.filter((b) => b.coverage === "answered on screen").length },
          readiness: readiness(view, form, p.label), copies: mine.map((x) => this.copyOf(x, cov.facts, labels)) });
      }
    }
    return { forms };
  }

  /** A copy with its state today; changed facts are named by their question (labels), never by their keys. */
  private copyOf(x: Awaited<ReturnType<Db["formInstance"]["findMany"]>>[number] & { snapshot: { factsJson: unknown } }, today: FormFact[], labels = new Map<string, string>()): FormCopy {
    const then = (x.snapshot.factsJson as Stored).facts;
    const changed = x.status === "GENERATED" ? changedFacts(then, today).map((f) => labels.get(f) ?? f) : [];
    const result = x.resultJson as { counts?: FormCopy["counts"]; intact?: boolean; person_steps?: string[] } | null;
    return { id: x.id, status: x.status as FormCopy["status"], created_at: x.createdAt.toISOString(), created_by: x.createdBy, finished_at: x.finishedAt?.toISOString() ?? null, error: x.error,
      locked: x.lockedAt ? { kind: x.lockedKind as keyof typeof LOCK_KINDS, at: x.lockedAt.toISOString(), by: x.lockedBy! } : null,
      out_of_date: changed.length > 0, stale: !!x.lockedAt && changed.length > 0, changed, counts: result?.counts ?? null, intact: result?.intact ?? null, person_steps: result?.person_steps ?? [] };
  }

  /** RT-13: a new copy of one form for one person, from the confirmed facts as they are now (frozen with the copy).
   *  Missing facts are listed on the copy, not refused (P-71 blocks filing, not generating). Idempotent by key. */
  async generate(actor: Actor, caseId: string, form: string, subjectId: string, body: unknown) {
    const c = await this.officerCase(actor, caseId);
    const b = parse(GenerateCopy, body);
    const who = c.participants.find((p) => p.subjectId === idOf(subjectId, "person") && p.role !== "case");
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    if (b.idempotencyKey) { const again = await this.db.formInstance.findFirst({ where: { caseId, idempotencyKey: b.idempotencyKey } }); if (again) return this.answerFor(again, form, subjectId); }
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const { answers, rows } = await this.runtime.state(c);
    const map = (s.field_maps as { form_number: string; channel?: string; official_file?: string }[]).find((m) => m.form_number === form && m.channel !== "ONLINE" && m.official_file);
    if (!map) fail(`${form} has no PDF to fill in this case's release.`, HttpStatus.NOT_FOUND);
    const cov = formCoverage(s, people, answers, rows, form, subjectId);
    if (!cov || cov.applies === false) fail(`${form} does not apply to that person on this case.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const stored: Stored = { facts: cov!.facts, boxes: cov!.boxes };
    let copy;
    try {
      copy = await this.db.$transaction(async (tx) => {
        const snap = await tx.answerSnapshot.create({ data: { workspaceId: c.workspaceId, caseId, subjectId, formNumber: form, inputHash: inputHash(cov!.facts), factsJson: stored as object } });
        return tx.formInstance.create({ data: { workspaceId: c.workspaceId, caseId, subjectId, formNumber: form, configReleaseId: c.pins[0].configReleaseId, snapshotId: snap.id, idempotencyKey: b.idempotencyKey ?? null, createdBy: actor.id } });
      });
    } catch (e) {
      if (!unique(e) || !b.idempotencyKey) throw e;
      const again = await this.db.formInstance.findFirst({ where: { caseId, idempotencyKey: b.idempotencyKey } }); // a simultaneous press won
      return this.answerFor(again!, form, subjectId);
    }
    await this.audit.log(c.workspaceId, actor.id, "queued", "form copy", form, `${actor.name} asked for a new copy of ${form} for the ${ROLE[who!.role] ?? who!.role} on case ${short(caseId)} (${cov!.facts.length} confirmed facts)`);
    this.enqueue([copy.id]);
    return { id: copy.id, status: copy.status, created: true };
  }

  private answerFor(x: { id: string; formNumber: string; subjectId: string; status: string }, form: string, subjectId: string) {
    if (x.formNumber !== form || x.subjectId !== subjectId) conflict("This idempotency key was already used for another form or person; nothing was generated. Use a new key.");
    return { id: x.id, status: x.status, created: false };
  }

  private enqueue(ids: string[]) { this.queue.push(...ids); void this.drain(); }
  private async drain() {
    if (this.running) return;
    this.running = true;
    try { for (let id = this.queue.shift(); id; id = this.queue.shift()) await this.run(id); } finally { this.running = false; }
  }

  /** The job: writes exactly the facts frozen with the copy (not today's), so a copy is what was asked for. */
  private async run(id: string) {
    const x = await this.db.formInstance.findUnique({ where: { id }, include: { snapshot: true, case: { include: { pins: { include: { release: true } } } } } });
    if (!x || x.status !== "QUEUED") return;
    const started = await this.db.formInstance.updateMany({ where: { id, status: "QUEUED" }, data: { status: "RUNNING" } });
    if (started.count !== 1) return;
    try {
      const stored = x.snapshot.factsJson as Stored;
      const snapshot = x.case.pins.find((p) => p.configReleaseId === x.configReleaseId)!.release.snapshot as Parameters<typeof writeForm>[0];
      const dir = join(VAR("demo"), "cases", x.caseId); mkdirSync(dir, { recursive: true });
      const base = `${x.formNumber.replace(/\s+/g, "")}-${short(x.subjectId)}-${id}`;
      const r = await writeForm(snapshot, { boxes: stored.boxes }, x.formNumber, dir, base);
      if (!r.report.intact) throw new Error("the filled file did not pass its checks (read back, signatures, unchanged parts); it is not handed over");
      const by = (k: string) => r.boxes.filter((b: { result: string }) => b.result === k).length;
      const counts = { written: by("written"), by_hand: by("by hand"), blank: by("blank"), not_written: by("not written"), by_a_person: by("by a person") };
      await this.db.formInstance.update({ where: { id }, data: { status: "GENERATED", path: r.out.replace(`${ROOT}/`, ""), sha256: createHash("sha256").update(readFileSync(r.out)).digest("hex"), finishedAt: new Date(),
        resultJson: { counts, intact: r.report.intact, read_back_equal: r.report.read_back_equal, written: r.report.written, signatures: r.report.signatures, person_steps: r.steps.map((p) => p.say), report_file: r.reportFile,
          boxes: r.boxes.map((b: { box: string; fact: string | null; result: string; why?: string }) => ({ box: b.box, fact: b.fact, result: b.result, why: b.why ?? null })) } } });
      await this.audit.log(x.workspaceId, x.createdBy, "generated", "form copy", x.formNumber, `Copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)} generated: ${counts.written} form fields written, read back ${r.report.read_back_equal}/${r.report.written}, intact`);
    } catch (e) {
      const why = e instanceof HttpException ? String((e.getResponse() as { detail?: string; message?: string }).detail ?? e.message) : (e as Error).message;
      await this.db.formInstance.update({ where: { id }, data: { status: "FAILED", error: `Not generated: ${why}`.slice(0, 500), finishedAt: new Date() } });
      await this.audit.log(x.workspaceId, x.createdBy, "failed", "form copy", x.formNumber, `Copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)} failed`);
    }
  }

  private async copyFor(actor: Actor, id: string) {
    const x = await this.db.formInstance.findUnique({ where: { id: idOf(id, "copy") }, include: { snapshot: true } });
    if (!x) fail("No such copy.", HttpStatus.NOT_FOUND);
    const c: Reached = await this.officerCase(actor, x!.caseId); // the officer of the copy's workspace only; others are refused there
    return { x: x!, c };
  }

  async copy(actor: Actor, id: string) {
    const { x, c } = await this.copyFor(actor, id);
    const { answers, rows } = await this.runtime.state(c);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const cov = formCoverage(s, people, answers, rows, x.formNumber, x.subjectId);
    const labels = new Map(caseView(s, people, answers, rows, "agent").sections.flatMap((v) => v.questions).map((q) => [q.fact, q.label]));
    return this.copyOf(x, cov?.facts ?? [], labels);
  }

  /** RT-16: lock a generated, up-to-date copy once ("validated copy uploaded back" or "filed"). The officer only; an out
   *  of date copy is refused (make a new copy first). After this the database refuses any change to it. */
  async lock(actor: Actor, id: string, body: unknown) {
    const b = parse(LockCopy, body);
    const { x, c } = await this.copyFor(actor, id);
    if (x.status !== "GENERATED") conflict("Only a generated copy can be locked.");
    if (x.lockedAt) conflict(`This copy is already locked (${LOCK_KINDS[x.lockedKind as keyof typeof LOCK_KINDS]}); a locked copy never changes.`);
    const { answers, rows } = await this.runtime.state(c);
    const cov = formCoverage(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, x.formNumber, x.subjectId);
    const changed = changedFacts((x.snapshot.factsJson as Stored).facts, cov?.facts ?? []);
    if (changed.length) conflict(`This copy is out of date (${changed.length} fact${changed.length === 1 ? "" : "s"} changed since it was made); generate a new copy and lock that one.`);
    // P-71 (Lead, R1d early look): a copy is filed or uploaded back only when its form is ready to file.
    const who = c.participants.find((p) => p.subjectId === x.subjectId)!;
    const ready = readiness(caseView(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, "agent"), x.formNumber, who.subject.label);
    if (!ready.ready) conflict(notReady(ready.missing.length));
    const n = await this.db.formInstance.updateMany({ where: { id, status: "GENERATED", lockedAt: null }, data: { lockedKind: b.kind, lockedAt: new Date(), lockedBy: actor.id } });
    if (n.count !== 1) conflict("Someone locked this copy at the same moment.");
    await this.audit.log(c.workspaceId, actor.id, "locked", "form copy", x.formNumber, `${actor.name} locked copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)}: ${LOCK_KINDS[b.kind]}`);
    return this.copy(actor, id);
  }

  async file(actor: Actor, id: string) {
    const { x } = await this.copyFor(actor, id);
    if (x.status !== "GENERATED" || !x.path) fail("This copy has no file.", HttpStatus.NOT_FOUND);
    const path = join(ROOT, x.path!), bytes = readFileSync(path);
    if (createHash("sha256").update(bytes).digest("hex") !== x.sha256) fail("This copy's file changed on disk since it was made; it is not handed over.", HttpStatus.CONFLICT);
    return { path, name: `${x.formNumber.replace(/\s+/g, "")}-copy-${short(x.id)}.pdf` };
  }
}

@Controller("api/runtime")
export class CaseFormsController {
  constructor(@Inject(CaseForms) private readonly f: CaseForms) {}
  @Get("cases/:id/forms") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
  @Post("cases/:id/forms/:form/:subject/generate") @HttpCode(HttpStatus.ACCEPTED) generate(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Param("subject") s: string, @Body() b: unknown) { return this.f.generate(actorOf(a), id, form, s, b); }
  @Get("form-copies/:id") copy(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.copy(actorOf(a), id); }
  @Post("form-copies/:id/lock") lock(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.lock(actorOf(a), id, b); }
  @Get("form-copies/:id/file") async file(@Headers("x-actor") a: H, @Param("id") id: string, @Res() res: Response) { const d = await this.f.file(actorOf(a), id); res.download(d.path, d.name); }
}

