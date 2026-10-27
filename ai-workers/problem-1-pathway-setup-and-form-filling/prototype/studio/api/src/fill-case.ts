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
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { GenerateCopy, LockCopy, LOCK_KINDS, notReady, type CaseForm, type CaseOnlineForm, type FormCopy } from "../../contracts/runtime.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseView } from "../../engine/runtime/case.ts";
import { changedFacts, changedGroups, formCoverage, groupFacts, inputHash, pdfForms, readiness, type FormFact, type GroupFact } from "../../engine/runtime/forms.ts";
import type { BoxRow } from "../../engine/render.ts";
import { actorOf, Audit, Db, fail, PROTOTYPE, ROOT, VAR, VAR_ROOT, type Actor } from "./core.ts";
import { writeForm } from "./fill.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
type Stored = { facts: FormFact[]; boxes: BoxRow[]; groups?: GroupFact[] };
const short = (id: string) => id.slice(0, 8);
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const conflict = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Not possible now", status: 409, detail }, HttpStatus.CONFLICT); };
const ROLE: Record<string, string> = { principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const unique = (e: unknown) => (e as { code?: string }).code === "P2002";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A malformed id in the URL is "not found", never a database error. */
const idOf = (id: string, what: string) => (UUID.test(id) ? id : fail(`No such ${what}.`, HttpStatus.NOT_FOUND));
/** A form number as releases write them ("IMM 5257"); anything else is "not found", never echoed back (break m6). */
const formOf = (form: string) => (/^[A-Z]{2,6} ?\d{3,5}[A-Z]?$/.test(form) ? form : fail("No such form.", HttpStatus.NOT_FOUND));
/** At most this many copies of one case wait or run at once (break m6): one case cannot hold up every other. */
const ACTIVE_PER_CASE = 5;

/** P-65 (a), review M1: a form's fill trial verdict, read from the evidence lane's own record
 *  (evidence-lane/E1/<form>/STATUS.md, its "## Verdict": "Passes …" or "The product's part passes …", never "… does not
 *  pass …"). No record or
 *  another verdict: copies are "Checked copy, not for filing" and cannot be locked. */
const TRIALS = join(PROTOTYPE, "evidence-lane", "E1");
export function trialPassed(form: string): boolean {
  try {
    const text = readFileSync(join(TRIALS, form.toLowerCase().replace(/\s+/g, ""), "STATUS.md"), "utf8");
    const verdict = /## Verdict[^\n]*\n+\*\*([^*]+)\*\*/.exec(text)?.[1] ?? "";
    // "Passes in Adobe … does not pass from the product's file alone" (IMM 1344) is not a pass of the product's file.
    return (/^Passes\b/.test(verdict) || /^The product's part passes\b/.test(verdict)) && !/\bdoes not pass\b/.test(verdict);
  } catch { return false; }
}

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
  async list(actor: Actor, caseId: string): Promise<{ forms: CaseForm[]; online: CaseOnlineForm[] }> {
    const c = await this.officerCase(actor, caseId);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const { answers, rows, groups } = await this.runtime.state(c);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const pdf = pdfForms(s);
    const titles = new Map((s.forms as { form_number: string; title?: string }[]).map((f) => [f.form_number, f.title ?? f.form_number]));
    const copies = await this.db.formInstance.findMany({ where: { caseId }, orderBy: { createdAt: "desc" }, include: { snapshot: true } });
    const labels = new Map(view.sections.flatMap((x) => x.questions).map((q) => [q.fact, q.label]));
    const forms: CaseForm[] = [];
    for (const p of people.filter((x) => x.role !== "case")) {
      for (const form of [...pdf].sort()) {
        const cov = formCoverage(s, people, answers, rows, form, p.subjectId);
        const applies = !!cov && cov.applies !== false;
        const mine = copies.filter((x) => x.formNumber === form && x.subjectId === p.subjectId);
        if (!applies && !mine.length) continue; // a form that stops applying keeps its copies in view (break M4)
        forms.push({ form, title: titles.get(form) ?? form, subject_id: p.subjectId, person: p.label, applies, trial_passed: trialPassed(form),
          draft: { written_now: cov?.facts.length ?? 0, mapped: cov?.mapped ?? 0, unconfirmed: cov?.boxes.filter((b) => b.coverage === "answered on screen").length ?? 0 },
          readiness: readiness(view, form, p.subjectId), copies: mine.map((x) => this.copyOf(x, cov?.facts ?? [], labels, groupFacts(view, form, p.subjectId))) });
      }
    }
    // QA-40: a form filed Online is listed too (no PDF copy is made), with the people it applies to (P-113: the case
    // officer types it into the portal from the answer sheet; the browser extension fills it in a later wave).
    const online = (s.forms as { form_number: string; title?: string; channel?: string }[]).filter((f) => f.channel === "ONLINE").map((f) => ({
      form: f.form_number, title: f.title ?? f.form_number,
      people: [...new Set(view.forms.filter((x) => x.form === f.form_number && x.applies !== false).map((x) => x.person))],
    })).filter((f) => f.people.length);
    return { forms, online };
  }

  /** A copy with its state today; changed facts are named by their question (labels), never by their keys. */
  private copyOf(x: Awaited<ReturnType<Db["formInstance"]["findMany"]>>[number] & { snapshot: { factsJson: unknown } }, today: FormFact[], labels = new Map<string, string>(), todayGroups: GroupFact[] = []): FormCopy {
    const stored = x.snapshot.factsJson as Stored, then = stored.facts;
    const changed = x.status === "GENERATED" ? [...changedFacts(then, today).map((f) => labels.get(f) ?? f), ...changedGroups(stored.groups, todayGroups)] : [];
    const result = x.resultJson as { counts?: FormCopy["counts"]; intact?: boolean; person_steps?: string[]; boxes?: { fact: string | null; result: string; why: string | null }[] } | null;
    const byHand = (result?.boxes ?? []).filter((b) => b.result === "by hand").map((b) => ({ label: (b.fact && labels.get(b.fact)) || "A form field", why: b.why ?? "" }));
    return { id: x.id, status: x.status as FormCopy["status"], created_at: x.createdAt.toISOString(), created_by: x.createdBy, finished_at: x.finishedAt?.toISOString() ?? null, error: x.error,
      locked: x.lockedAt ? { kind: x.lockedKind as keyof typeof LOCK_KINDS, at: x.lockedAt.toISOString(), by: x.lockedBy! } : null,
      out_of_date: changed.length > 0, stale: !!x.lockedAt && changed.length > 0, changed, counts: result?.counts ?? null, intact: result?.intact ?? null, person_steps: result?.person_steps ?? [],
      by_hand: byHand, file_ok: x.status === "GENERATED" && !!x.path && existsSync(join(ROOT, x.path)) };
  }

  /** RT-13: a new copy of one form for one person, from the confirmed facts as they are now (frozen with the copy).
   *  Missing facts are listed on the copy, not refused (P-71 blocks filing, not generating). Idempotent by key. */
  async generate(actor: Actor, caseId: string, formIn: string, subjectId: string, body: unknown) {
    const c = await this.officerCase(actor, caseId), form = formOf(formIn);
    const b = parse(GenerateCopy, body);
    const who = c.participants.find((p) => p.subjectId === idOf(subjectId, "person") && p.role !== "case");
    if (!who) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    if (b.idempotencyKey) { const again = await this.db.formInstance.findFirst({ where: { caseId, idempotencyKey: b.idempotencyKey } }); if (again) return this.answerFor(again, form, subjectId); }
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const { answers, rows, groups } = await this.runtime.state(c);
    if ((s.forms as { form_number: string; channel?: string }[]).some((f) => f.form_number === form && f.channel === "ONLINE"))
      fail(`${form} is filed Online in this case's release: its answers go on the portal sheet, not in a PDF.`, HttpStatus.UNPROCESSABLE_ENTITY);
    if (!pdfForms(s).has(form)) fail(`${form} has no PDF to fill in this case's release.`, HttpStatus.NOT_FOUND);
    const cov = formCoverage(s, people, answers, rows, form, subjectId);
    if (!cov || cov.applies === false) fail(`${form} does not apply to that person on this case.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const stored: Stored = { facts: cov!.facts, boxes: cov!.boxes, groups: groupFacts(caseView(s, people, answers, rows, "agent", new Date(), groups), form, subjectId) };
    let copy;
    try {
      copy = await this.db.$transaction(async (tx) => {
        // The cap is counted under a lock on the case row, so simultaneous requests are counted one after another (PR #12 review 3).
        await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${caseId}::uuid FOR UPDATE`;
        const active = await tx.formInstance.count({ where: { caseId, status: { in: ["QUEUED", "RUNNING"] } } });
        if (active >= ACTIVE_PER_CASE) throw new HttpException({ type: "https://expatready.local/problems/form-copy", title: "Busy", status: 429, detail: `${active} copies of this case are being generated; wait for them, then ask again.` }, HttpStatus.TOO_MANY_REQUESTS);
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
    // A failing job never ends the server (break M7): each one is caught and its copy marked failed where it still exists.
    try { for (let id = this.queue.shift(); id; id = this.queue.shift()) { try { await this.run(id); } catch (e) { console.error(`form copy ${short(id)}: ${(e as Error).message.slice(0, 200)}`); } } } finally { this.running = false; }
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
      // The case may be gone (a demo reset during the job): then there is nothing left to mark.
      const n = await this.db.formInstance.updateMany({ where: { id, status: "RUNNING" }, data: { status: "FAILED", error: `Not generated: ${why}`.slice(0, 500), finishedAt: new Date() } });
      if (n.count) await this.audit.log(x.workspaceId, x.createdBy, "failed", "form copy", x.formNumber, `Copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)} failed`);
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
    const { answers, rows, groups } = await this.runtime.state(c);
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    const cov = formCoverage(s, people, answers, rows, x.formNumber, x.subjectId);
    const view = caseView(s, people, answers, rows, "agent", new Date(), groups);
    const labels = new Map(view.sections.flatMap((v) => v.questions).map((q) => [q.fact, q.label]));
    return this.copyOf(x, cov?.facts ?? [], labels, groupFacts(view, x.formNumber, x.subjectId));
  }

  /** RT-16: lock a generated, up-to-date copy once ("validated copy uploaded back" or "filed"). The officer only; an out
   *  of date copy is refused (make a new copy first). After this the database refuses any change to it. */
  async lock(actor: Actor, id: string, body: unknown) {
    const { x, c } = await this.copyFor(actor, id); // who may lock is checked before what was sent (break m4)
    const b = parse(LockCopy, body);
    if (x.status !== "GENERATED") conflict("Only a generated copy can be locked.");
    if (x.lockedAt) conflict(`This copy is already locked (${LOCK_KINDS[x.lockedKind as keyof typeof LOCK_KINDS]}); a locked copy never changes.`);
    const { answers, rows, groups } = await this.runtime.state(c);
    const cov = formCoverage(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, x.formNumber, x.subjectId);
    const lockView = caseView(this.runtime.snapshotOf(c), this.runtime.peopleOf(c), answers, rows, "agent", new Date(), groups);
    const changed = [...changedFacts((x.snapshot.factsJson as Stored).facts, cov?.facts ?? []), ...changedGroups((x.snapshot.factsJson as Stored).groups, groupFacts(lockView, x.formNumber, x.subjectId))];
    if (changed.length) conflict(`This copy is out of date (${changed.length} change${changed.length === 1 ? "" : "s"} since it was made); generate a new copy and lock that one.`);
    // P-71 (Lead, R1d early look): a copy is filed or uploaded back only when its form is ready to file.
    const ready = readiness(lockView, x.formNumber, x.subjectId);
    if (!ready.ready) conflict(notReady(ready.missing.length));
    if (!trialPassed(x.formNumber)) conflict(`${x.formNumber}'s fill trial has not passed yet: this is a checked copy, not for filing (P-65).`);
    // Only the file that was made is ever locked: it must still be there with the bytes recorded (PR #12 review 2), since
    // a locked copy can never be corrected afterwards.
    this.checkedFile(x, HttpStatus.CONFLICT);
    const n = await this.db.formInstance.updateMany({ where: { id, status: "GENERATED", lockedAt: null }, data: { lockedKind: b.kind, lockedAt: new Date(), lockedBy: actor.id } });
    if (n.count !== 1) conflict("Someone locked this copy at the same moment.");
    await this.audit.log(c.workspaceId, actor.id, "locked", "form copy", x.formNumber, `${actor.name} locked copy ${short(id)} of ${x.formNumber} on case ${short(x.caseId)}: ${LOCK_KINDS[b.kind]}`);
    return this.copy(actor, id);
  }

  /** The copy's file as it was made: present (else `missing`, 404 to download, 409 to lock), inside the working files,
   *  and with the hash recorded. One read: the bytes checked are the bytes used. */
  private checkedFile(x: { path: string | null; sha256: string | null }, missing: HttpStatus) {
    const path = join(ROOT, x.path ?? "");
    if (!x.path || !existsSync(path)) fail("This copy's file is missing from the working files; generate a new copy.", missing);
    if (!realpathSync(path).startsWith(realpathSync(VAR_ROOT) + "/")) fail("This copy's file is not in the working files; it is not handed over.", HttpStatus.CONFLICT);
    const bytes = readFileSync(path);
    if (createHash("sha256").update(bytes).digest("hex") !== x.sha256) fail("This copy's file changed on disk since it was made; generate a new copy.", HttpStatus.CONFLICT);
    return bytes;
  }

  /** The copy's bytes, checked against the hash recorded when it was made, and those same bytes are what is sent (break
   *  M1: one read). The file must lie in the working files (break m5) and still exist (break m1). */
  async file(actor: Actor, id: string) {
    const { x } = await this.copyFor(actor, id);
    if (x.status !== "GENERATED" || !x.path) fail("This copy has no file.", HttpStatus.NOT_FOUND);
    const bytes = this.checkedFile(x, HttpStatus.NOT_FOUND);
    return { bytes, name: `${x.formNumber.replace(/\s+/g, "")}-copy-${short(x.id)}.pdf` };
  }
}

@Controller("api/runtime")
export class CaseFormsController {
  constructor(@Inject(CaseForms) private readonly f: CaseForms) {}
  @Get("cases/:id/forms") list(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.list(actorOf(a), id); }
  @Post("cases/:id/forms/:form/:subject/generate") @HttpCode(HttpStatus.ACCEPTED) generate(@Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Param("subject") s: string, @Body() b: unknown) { return this.f.generate(actorOf(a), id, form, s, b); }
  @Get("form-copies/:id") copy(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.copy(actorOf(a), id); }
  @Post("form-copies/:id/lock") lock(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.lock(actorOf(a), id, b); }
  @Get("form-copies/:id/file") async file(@Headers("x-actor") a: H, @Param("id") id: string, @Res() res: Response) { const d = await this.f.file(actorOf(a), id); res.setHeader("content-type", "application/pdf"); res.setHeader("content-disposition", `attachment; filename="${d.name}"`); res.end(d.bytes); }
}

