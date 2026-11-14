// PF-0p (rows rev 16, P-576, P-600; brief lead-b-briefs/PF-0p.md): the shared ports in studio/ports/ and their fakes, the
// interim AuditPort adapter over audit_event, and the back-relation slot lines in platform.prisma. A pass and a fail for
// each fake; the real adapter on a scratch database (every migration applied), dropped at the end. No server, no browser,
// no model call (US$0).
//   tsx studio/tests/check_pf0p_ports.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ZodError } from "zod";
import { auditEvent, PLATFORM_AUDIT_WORKSPACE } from "../api/src/platform/audit/audit-event.ts";
import { AuditEntry, AuditFailure, fakeAudit } from "../ports/audit.ts";
import { FAKE_NOW, FakeClock, systemClock } from "../ports/clock.ts";
import { FileKeyTaken, fakeFiles } from "../ports/files.ts";
import { cronMatches, fakeJobs, parseCron, type JobRun } from "../ports/jobs.ts";
import { fakeMail, MailMessage } from "../ports/mail.ts";
import { fakeRender } from "../ports/render.ts";
import { FAKE_FIRM_ID, fakeStaff, StaffContext, staffActor } from "../ports/staff.ts";

const STUDIO = join(import.meta.dirname, ".."), PORTS = join(STUDIO, "ports"), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf0p_${process.pid}`, urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf0p-check-${process.pid}`);

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const rejects = async (f: () => unknown, test: (e: unknown) => boolean = () => true) => { try { await f(); return false; } catch (e) { return test(e); } };
const zodSays = (path: string) => (e: unknown) => e instanceof ZodError && e.issues.some((i) => i.path.join(".") === path);
const sql = (q: string) => execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8" }).trim();
const FIRM_B = "00000000-0000-4000-8000-0000000f0002";
const entry = (over: Record<string, unknown> = {}) => ({ firmId: FAKE_FIRM_ID, actor: "staff:00000000-0000-4000-8000-0000000f0101", action: "retainer.sent", entity: "fo_retainer", entityKey: "r-1", summary: "Retainer agreement sent for signing.", detail: { retainerId: "r-1", version: 2 }, ...over });

// ------------------------------------------------------------------------------------------------- the folder's own rule
/** The import lines of a ports file that are not zod or one of the folder's own files (case-side contract v0.1 §1 rule 3). */
const foreignImports = (text: string) => [...text.matchAll(/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1] ?? m[2] ?? m[3]).filter((s) => s !== "zod" && !/^\.\/[a-z0-9-]+(\.port)?\.ts$/.test(s));
const portFiles = readdirSync(PORTS).filter((f) => f.endsWith(".ts"));
ok("PF-0p pass: the seven ports are in studio/ports/ (audit, staff, clock, jobs, mail, files, render)", ["audit", "staff", "clock", "jobs", "mail", "files", "render"].every((p) => portFiles.includes(`${p}.ts`)), portFiles);
const bad = portFiles.flatMap((f) => foreignImports(readFileSync(join(PORTS, f), "utf8")).map((s) => `${f}: ${s}`));
ok("PF-0p pass: every file in studio/ports/ imports only zod and its own files", bad.length === 0, bad);
ok("PF-0p fail: the import check catches a Prisma, a Nest, a node, an app, a dynamic, a side-effect and a require import", foreignImports(`import { z } from "zod";\nimport { FirmId } from "./audit.ts";\nimport type { Prisma } from "@prisma/client";\nimport { Injectable } from "@nestjs/common";\nimport { createHash } from "node:crypto";\nexport { x } from "../api/src/core.ts";\nconst e = await import("../engine/runtime/team.ts");\nimport "../api/src/main.ts";\nconst r = require("pg");`).length === 7);

// ------------------------------------------------------------------------------------------------------------- audit
{
  ok("audit pass: a full entry is accepted", AuditEntry.safeParse(entry()).success);
  const { firmId: _f, ...noFirm } = entry();
  ok("audit fail: an entry without firmId is refused", !AuditEntry.safeParse(noFirm).success && AuditEntry.safeParse(noFirm).error?.issues.some((i) => i.path[0] === "firmId"));
  ok("audit fail: an actor that is not staff:, system: or seed: is refused", !AuditEntry.safeParse(entry({ actor: "alice" })).success && AuditEntry.safeParse(entry({ actor: "system:booking-door" })).success && AuditEntry.safeParse(entry({ actor: "seed:pf3" })).success);
  ok("audit fail: a summary over 600 characters is refused (600 accepted)", !AuditEntry.safeParse(entry({ summary: "x".repeat(601) })).success && AuditEntry.safeParse(entry({ summary: "x".repeat(600) })).success);
  ok("audit fail: detail holding an email address is refused (ids only)", !AuditEntry.safeParse(entry({ detail: { to: "client.a@example.com" } })).success && !AuditEntry.safeParse(entry({ detail: { nested: { name: "x" } } })).success);
  ok("audit fail: an unknown field is refused (strict)", !AuditEntry.safeParse(entry({ firmName: "x" })).success);

  const a = fakeAudit();
  await a.record("tx-1", entry());
  ok("audit pass: the fake records an entry in memory", a.entries.length === 1 && a.entries[0].entityKey === "r-1" && a.failures === 0);
  ok("audit fail: the fake refuses an entry without firmId (nothing recorded)", await rejects(() => a.record("tx-1", noFirm as never), zodSays("firmId")) && a.entries.length === 1);
  const f = fakeAudit({ failOn: (e) => e.action === "retainer.sent" });
  ok("audit fail: failOn matching throws AuditFailure and records nothing", await rejects(() => f.record("tx", entry()), (e) => e instanceof AuditFailure) && f.entries.length === 0 && f.failures === 1);
  await f.record("tx", entry({ action: "retainer.viewed" }));
  ok("audit pass: failOn not matching records", f.entries.length === 1);
  const seen: unknown[] = [], g = fakeAudit({ failOn: (_e, tx) => { seen.push(tx); return false; } }), handle = { prismaTx: 1 };
  await g.record(handle, entry());
  g.discard(handle);
  ok("audit pass: failOn receives the caller's tx, and discard(tx) drops that transaction's lines", seen[0] === handle && g.entries.length === 0);
  const t = fakeAudit({ failOn: (e) => e.entityKey === "r-2" });
  const thrown = await rejects(() => t.transaction(async (tx) => { await t.record(tx, entry()); await t.record(tx, entry({ entityKey: "r-2" })); }), (e) => e instanceof AuditFailure);
  await t.transaction(async (tx) => { await t.record(tx, entry({ entityKey: "r-3" })); });
  ok("audit pass/fail: the fake's in-memory transaction keeps a committed line and drops a rolled-back one", thrown && t.entries.map((e) => e.entityKey).join() === "r-3");
}

// ------------------------------------------------------------------------------------------------------------- staff
{
  const s = fakeStaff();
  ok("staff pass: fakeStaff gives a valid StaffContext (Sample firm Owner, local)", StaffContext.safeParse(s).success && s.firmId === FAKE_FIRM_ID && s.via === "local" && s.roles.includes("OWNER"));
  const pf4Keys = ["staffId", "firmId", "firmKey", "roles", "keys", "duties", "authTime", "via"];   // PF-4 keys.ts StaffContext, in its order
  ok("staff pass: StaffContext has exactly PF-4's fields", JSON.stringify(Object.keys(StaffContext.shape)) === JSON.stringify(pf4Keys) && JSON.stringify(Object.keys(s)) === JSON.stringify(pf4Keys));
  const p = fakeStaff({ firmId: FIRM_B, keys: ["agent/staff:manage"], duties: ["firm_admin"], via: "cognito" });
  ok("staff pass: fakeStaff's sign-in time is FAKE_NOW, the FakeClock's start (never the wall clock: review M2)", s.authTime === Date.parse(FAKE_NOW) / 1000 && s.authTime === new FakeClock().now().getTime() / 1000);
  const later = new FakeClock(); await later.advance({ minutes: 6 });
  ok("staff fail: a sign-in 6 minutes before the clock's now is stale for a 5-minute step-up, whatever the day the test runs", (later.now().getTime() / 1000 - fakeStaff().authTime) > 300 && fakeStaff({}, later).authTime === later.now().getTime() / 1000);
  ok("staff pass: fakeStaff takes a partial", p.firmId === FIRM_B && p.keys[0] === "agent/staff:manage" && p.duties[0] === "firm_admin" && p.via === "cognito" && staffActor(p) === `staff:${p.staffId}`);
  const { firmId: _f, ...noFirm } = s;
  ok("staff fail: a StaffContext without firmId is refused", !StaffContext.safeParse(noFirm).success);
  ok("staff fail: fakeStaff refuses a shape the guard never gives (via, duty)", await rejects(() => fakeStaff({ via: "password" as never })) && await rejects(() => fakeStaff({ duties: ["boss" as never] })));
  // Type check (tsc): PF-4's type, copied from keys.ts on #1744, and this one are assignable both ways.
  type PF4 = { staffId: string; firmId: string; firmKey: string; roles: string[]; keys: string[]; duties: ("represent" | "case" | "firm_admin")[]; authTime: number; via: "local" | "cognito" };
  const _toPf4: PF4 = s, _fromPf4: StaffContext = _toPf4 as PF4;
  void _fromPf4;
}

// ------------------------------------------------------------------------------------------------------------- clock
{
  const c = new FakeClock("2026-11-24T14:00:00Z");
  await c.advance({ hours: 1, minutes: 30 });
  ok("clock pass: FakeClock advances", c.now().toISOString() === "2026-11-24T15:30:00.000Z");
  await c.set("2026-12-01T00:00:00Z");
  ok("clock pass: FakeClock sets", c.now().toISOString() === "2026-12-01T00:00:00.000Z");
  ok("clock fail: FakeClock refuses a backward step and a non-time", await rejects(() => c.advance(-1), (e) => e instanceof RangeError) && await rejects(() => c.set("not a time"), (e) => e instanceof RangeError) && c.now().toISOString() === "2026-12-01T00:00:00.000Z");
  const n = c.now(); n.setFullYear(2000);
  ok("clock fail: a caller changing the Date it got does not move the clock", c.now().getUTCFullYear() === 2026 && Math.abs(systemClock.now().getTime() - Date.now()) < 1000);
}

// -------------------------------------------------------------------------------------------------------------- jobs
{
  const clock = new FakeClock("2026-11-24T14:00:00Z"), jobs = fakeJobs(clock), ran: JobRun[] = [];
  await jobs.handle("booking.confirm", async (j) => { ran.push(j); });
  const first = await jobs.enqueue("booking.confirm", { bookingId: "b-1" }, { key: "booking:b-1:confirm", firmId: FAKE_FIRM_ID });
  const second = await jobs.enqueue("booking.confirm", { bookingId: "b-1" }, { key: "booking:b-1:confirm", firmId: FAKE_FIRM_ID });
  await jobs.runDue();
  ok("jobs pass: a job queues and runs once", first.queued && ran.length === 1 && ran[0].payload.bookingId === "b-1" && ran[0].firmId === FAKE_FIRM_ID && ran[0].attempt === 1);
  ok("jobs fail: the same key never queues twice (second enqueue: queued false, one run)", !second.queued && jobs.jobs.filter((j) => j.key === "booking:b-1:confirm").length === 1);
  await jobs.runDue();
  ok("jobs fail: a key that ran does not queue again", !(await jobs.enqueue("booking.confirm", {}, { key: "booking:b-1:confirm", firmId: FAKE_FIRM_ID })).queued && ran.length === 1);

  const reminders: JobRun[] = [];
  await jobs.handle("booking.reminder", async (j) => { reminders.push(j); });
  await jobs.schedule("booking.reminder", new Date("2026-11-25T13:00:00Z"), { bookingId: "b-2" }, { key: "booking:b-2:24h", firmId: FAKE_FIRM_ID });
  await jobs.runDue();
  await clock.advance({ hours: 22, minutes: 59 });
  ok("jobs fail: a scheduled job does not run before its time", reminders.length === 0);
  await clock.advance({ minutes: 1 });
  ok("jobs pass: a scheduled job runs once the clock reaches it", reminders.length === 1 && reminders[0].key === "booking:b-2:24h");
  await jobs.schedule("booking.reminder", new Date("2026-11-26T13:00:00Z"), { bookingId: "b-3" }, { key: "booking:b-3:24h", firmId: FAKE_FIRM_ID });
  ok("jobs pass: cancel takes back a waiting job", await jobs.cancel("booking:b-3:24h") && !(await jobs.cancel("booking:b-3:24h")));
  await clock.advance({ days: 2 });
  ok("jobs fail: a cancelled job never runs, and its key stays used", reminders.length === 1 && !(await jobs.schedule("booking.reminder", new Date(), {}, { key: "booking:b-3:24h", firmId: FAKE_FIRM_ID })).queued);
  // Keys are unique per job name (PF-14: pg-boss keys its job table by name); cancel(key) reaches every name.
  const other = await jobs.schedule("booking.followup", new Date("2026-12-24T13:00:00Z"), {}, { key: "booking:b-4:x", firmId: FAKE_FIRM_ID });
  const sameName = await jobs.schedule("booking.followup", new Date("2026-12-24T13:00:00Z"), {}, { key: "booking:b-4:x", firmId: FAKE_FIRM_ID });
  const otherName = await jobs.schedule("booking.reminder", new Date("2026-12-24T13:00:00Z"), {}, { key: "booking:b-4:x", firmId: FAKE_FIRM_ID });
  ok("jobs pass/fail: a key is unique per job name (another name queues it; the same name does not)", other.queued && !sameName.queued && otherName.queued);
  ok("jobs pass: cancel(key) cancels the waiting job under every name", await jobs.cancel("booking:b-4:x") && jobs.jobs.filter((j) => j.key === "booking:b-4:x").every((j) => j.status === "cancelled") && jobs.jobs.filter((j) => j.key === "booking:b-4:x").length === 2);
  await jobs.schedule("booking.reminder", new Date("2026-12-25T13:00:00Z"), { n: 1 }, { key: "booking:b-5:24h", firmId: FAKE_FIRM_ID });
  const look = jobs.jobs.find((j) => j.key === "booking:b-5:24h")!;
  (look.runAt as Date).setUTCFullYear(2000); (look.payload as Record<string, unknown>).n = 2;
  const again = jobs.jobs.find((j) => j.key === "booking:b-5:24h")!;
  ok("jobs fail: changing what jobs returns never changes the queued job (date and payload are copies)", again.runAt.getUTCFullYear() === 2026 && again.payload.n === 1);

  const { firmId: _f, ...noFirm } = { key: "k-1", firmId: FAKE_FIRM_ID };
  ok("jobs fail: the options schema refuses a missing firmId", await rejects(() => jobs.enqueue("booking.confirm", {}, noFirm as never), zodSays("firmId")) && !jobs.jobs.some((j) => j.key === "k-1"));
  ok("jobs fail: a payload that is not plain JSON is refused (a Date)", await rejects(() => jobs.enqueue("booking.confirm", { at: new Date() } as never, { key: "k-2", firmId: FAKE_FIRM_ID })));
  ok("jobs fail: a bad job name is refused", await rejects(() => jobs.enqueue("Booking Confirm", {}, { key: "k-3", firmId: FAKE_FIRM_ID })));

  await jobs.handle("booking.fails", async () => { throw new Error("mail down"); });
  await jobs.enqueue("booking.fails", {}, { key: "k-4", firmId: FAKE_FIRM_ID });
  await jobs.runDue();
  ok("jobs fail: a handler's throw marks its job failed with the reason", jobs.jobs.find((j) => j.key === "k-4")?.status === "failed" && jobs.jobs.find((j) => j.key === "k-4")?.error === "mail down");

  // Recurring: weekdays 09:00 Toronto time = 14:00 UTC in November (EST, UTC-5).
  const rc = new FakeClock("2026-11-27T13:00:00Z"), rj = fakeJobs(rc), sweeps: JobRun[] = [];   // Friday 08:00 Toronto
  await rj.handle("invoice.overdue_sweep", async (j) => { sweeps.push(j); });
  await rj.recurring("invoice.overdue_sweep", "0 9 * * 1-5", "America/Toronto");
  await rc.advance({ minutes: 59 });
  ok("jobs fail: a recurring job does not run before its minute", sweeps.length === 0);
  await rc.advance({ minutes: 1 });
  ok("jobs pass: a recurring job runs at its minute in its zone (Fri 09:00 Toronto = 14:00 UTC)", sweeps.length === 1 && sweeps[0].runAt.toISOString() === "2026-11-27T14:00:00.000Z" && sweeps[0].firmId === null);
  await rc.advance({ days: 3 });   // Sat, Sun skipped; Mon 30 Nov 09:00
  ok("jobs pass: across a weekend it runs Monday only", sweeps.length === 2 && sweeps[1].runAt.toISOString() === "2026-11-30T14:00:00.000Z");
  ok("jobs fail: a day field starting with * and a restricted weekday both have to match (Vixie cron: Mon 30 Nov is not an odd day)", !cronMatches(parseCron("0 9 */2 * 1"), new Date("2026-11-30T14:00:00Z"), "America/Toronto") && cronMatches(parseCron("0 9 */2 * 1"), new Date("2026-11-23T14:00:00Z"), "America/Toronto") && cronMatches(parseCron("0 9 1 * 1"), new Date("2026-11-30T14:00:00Z"), "America/Toronto"));
  ok("jobs fail: a bad cron or zone is refused", await rejects(() => rj.recurring("x.sweep", "0 9 * *", "America/Toronto")) && await rejects(() => rj.recurring("x.sweep", "61 9 * * *", "America/Toronto")) && await rejects(() => rj.recurring("x.sweep", "0 9 * * *", "Mars/Olympus")));
}

// -------------------------------------------------------------------------------------------------------------- mail
{
  const m = fakeMail(), base = { firmId: FAKE_FIRM_ID, to: "Client.A@example.com", replyTo: "office@sample-firm.example", text: "Hello", class: "TRANSACTIONAL" as const };
  await m.send({ ...base, subject: "First" });
  await m.send({ ...base, to: "someone.else@example.com", subject: "Other" });
  await m.send({ ...base, subject: "Second", class: "SERVICE", templateKey: "booking.reminder" });
  await m.send({ ...base, subject: "Third" });
  ok("mail pass: sentAt is FAKE_NOW by default and the clock's now when given one", m.sent[0].sentAt.toISOString() === FAKE_NOW && await (async () => { const c = new FakeClock("2026-12-01T10:00:00Z"), mm = fakeMail({ clock: c }); await mm.send({ ...base, subject: "x" }); return mm.sent[0].sentAt.toISOString() === "2026-12-01T10:00:00.000Z"; })());
  ok("mail pass: the fake inbox keeps the order sent, per address (lower case)", m.inbox("client.a@example.com").map((x) => x.subject).join() === "First,Second,Third" && m.sent.length === 4 && m.sent[2].templateKey === "booking.reminder");
  const { firmId: _f, ...noFirm } = { ...base, subject: "x" };
  ok("mail fail: a message without firmId is refused (nothing sent)", await rejects(() => m.send(noFirm as never), zodSays("firmId")) && m.sent.length === 4);
  ok("mail fail: a bad address, class or empty attachment is refused", !MailMessage.safeParse({ ...base, subject: "x", to: "not-an-email" }).success && !MailMessage.safeParse({ ...base, subject: "x", class: "BULK" }).success && !MailMessage.safeParse({ ...base, subject: "x", attachments: [{ filename: "a.pdf", contentType: "application/pdf", bytes: new Uint8Array() }] }).success);
  ok("mail pass: an attachment and html are accepted", MailMessage.safeParse({ ...base, subject: "x", html: "<p>Hello</p>", attachments: [{ filename: "a.pdf", contentType: "application/pdf", bytes: new Uint8Array([1]) }] }).success);
  const down = fakeMail({ failOn: (x) => x.class === "MARKETING" });
  ok("mail fail: failOn forces a send failure", await rejects(() => down.send({ ...base, subject: "x", class: "MARKETING" })) && down.sent.length === 0);
  const keep = fakeMail(), buf = new Uint8Array([1]);
  await keep.send({ ...base, subject: "with file", attachments: [{ filename: "a.pdf", contentType: "application/pdf", bytes: buf }] });
  buf[0] = 2;
  const got = keep.sent[0]; got.attachments![0].bytes[0] = 3; got.sentAt.setUTCFullYear(2000);
  ok("mail fail: changing the sent buffer or the record read back never changes what was sent", keep.sent[0].attachments![0].bytes[0] === 1 && keep.inbox(base.to)[0].sentAt.toISOString() === FAKE_NOW);
}

// ------------------------------------------------------------------------------------------------------------- files
{
  const fs = fakeFiles(), bytes = new TextEncoder().encode("signed retainer v1");
  const r = await fs.put(FAKE_FIRM_ID, "retainers/r-1/v1.pdf", bytes, "application/pdf");
  ok("files pass: put returns the sha256 of the bytes", r.sha256 === createHash("sha256").update(bytes).digest("hex") && r.key === "retainers/r-1/v1.pdf");
  const g = await fs.get(FAKE_FIRM_ID, "retainers/r-1/v1.pdf");
  ok("files pass: get returns the same bytes and type; exists is true", !!g && Buffer.from(g.bytes).equals(Buffer.from(bytes)) && g.contentType === "application/pdf" && await fs.exists(FAKE_FIRM_ID, "retainers/r-1/v1.pdf"));
  ok("files fail: another firm's key reads as absent", (await fs.get(FIRM_B, "retainers/r-1/v1.pdf")) === null && !(await fs.exists(FIRM_B, "retainers/r-1/v1.pdf")) && !(await fs.exists(FAKE_FIRM_ID, "retainers/r-1/v2.pdf")));
  ok("files pass: the same bytes again under the key are accepted (a retry)", (await fs.put(FAKE_FIRM_ID, "retainers/r-1/v1.pdf", bytes, "application/pdf")).sha256 === r.sha256 && fs.count === 1);
  ok("files fail: other bytes, or the same bytes as another type, under a used key are refused (write once)", await rejects(() => fs.put(FAKE_FIRM_ID, "retainers/r-1/v1.pdf", new Uint8Array([9]), "application/pdf"), (e) => e instanceof FileKeyTaken) && await rejects(() => fs.put(FAKE_FIRM_ID, "retainers/r-1/v1.pdf", bytes, "text/plain"), (e) => e instanceof FileKeyTaken) && (await fs.get(FAKE_FIRM_ID, "retainers/r-1/v1.pdf"))?.contentType === "application/pdf");
  ok("files fail: a missing firmId and a path-escaping key are refused", await rejects(() => fs.put(undefined as never, "a.pdf", bytes, "application/pdf"), zodSays("firmId")) && await rejects(() => fs.put(FAKE_FIRM_ID, "../other/a.pdf", bytes, "application/pdf")) && await rejects(() => fs.put(FAKE_FIRM_ID, "a/../b.pdf", bytes, "application/pdf")) && fs.count === 1);
}

// ------------------------------------------------------------------------------------------------------------ render
{
  const r = fakeRender({ templates: ["retainer.standard"] });
  const a = await r.render("retainer.standard", { client: { id: "p-1" }, fee: 1500, currency: "CAD" });
  const b = await r.render("retainer.standard", { currency: "CAD", fee: 1500, client: { id: "p-1" } });
  const c = await r.render("retainer.standard", { client: { id: "p-1" }, fee: 1600, currency: "CAD" });
  ok("render pass: the same template and data give the same bytes, whatever the key order", Buffer.from(a.bytes).equals(Buffer.from(b.bytes)) && a.contentType === b.contentType);
  ok("render fail: other data gives other bytes", !Buffer.from(a.bytes).equals(Buffer.from(c.bytes)));
  ok("render fail: an unknown template and non-JSON data are refused", await rejects(() => r.render("retainer.other", {})) && await rejects(() => r.render("retainer.standard", { at: new Date() } as never)) && r.calls.length === 3);
}

// ------------------------------------------------------------------------------------------------- platform.prisma slots
const SLOTS = ["messages (PF-19a)", "money (FO-7a)", "compliance (FO-13)", "register (PF-21)", "retainers (FO-5)", "web address (PF-25)"];
/** The models missing a slot line, or holding two slot lines with no blank line between them (they would collide in git). */
function slotProblems(text: string, models: string[]): string[] {
  const out: string[] = [];
  for (const model of models) {
    const body = new RegExp(`\\nmodel ${model} \\{\\n([\\s\\S]*?)\\n\\}`).exec(text)?.[1];
    if (!body) { out.push(`${model}: not found`); continue; }
    const lines = body.split("\n");
    for (const s of SLOTS) if (lines.filter((l) => l.trim() === `// back-relation slot: ${s}`).length !== 1) out.push(`${model}: slot ${s}`);
    lines.forEach((l, i) => { if (/back-relation slot:/.test(l) && i > 0 && /back-relation slot:/.test(lines[i - 1])) out.push(`${model}: line ${i} touches the slot above`); });
  }
  return out;
}
const platform = readFileSync(join(SCHEMA, "platform.prisma"), "utf8");
ok("slots pass: PlatformFirm and PlatformStaff each hold the six slot lines, one per area, separated by blank lines", slotProblems(platform, ["PlatformFirm", "PlatformStaff"]).length === 0, slotProblems(platform, ["PlatformFirm", "PlatformStaff"]));
ok("slots fail: two slot lines with no blank line between them, or a missing one, are caught", slotProblems(platform.replace("  // back-relation slot: money (FO-7a)\n\n", "  // back-relation slot: money (FO-7a)\n"), ["PlatformFirm"]).length === 1 && slotProblems(platform.replace("  // back-relation slot: register (PF-21)\n", ""), ["PlatformFirm"]).length === 1);

// --------------------------------------------------------------------------------- the real adapter on a scratch database
execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), [...PG, DB]);
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB), options: "-c TimeZone=UTC" }) });
try {
  for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });

  // migrate diff, database → schema folder: the slot lines are comments, so nothing about platform changes.
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, "prisma.config.ts");
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(DB))} } });\n`);
  const diff = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  const platformLines = `${diff.stdout}`.split("\n").filter((l) => /platform|Platform/.test(l));
  ok("slots pass: migrate diff names nothing in the platform tables (the slot lines change no schema)", (diff.status === 0 || diff.status === 2) && platformLines.length === 0, platformLines.length ? platformLines : `${diff.stdout}${diff.stderr}`.slice(0, 400));

  const lines = () => Number(sql(`select count(*) from audit_event e join workspace w on w.id = e.workspace_id where w.key = '${PLATFORM_AUDIT_WORKSPACE}'`));
  await db.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "r-10", detail: { retainerId: "r-10", firmId: FIRM_B } })); });
  const row = sql(`select e.actor || '|' || e.action || '|' || e.entity || '|' || e.entity_key || '|' || (e.detail->>'firmId') || '|' || (e.detail->>'retainerId') from audit_event e join workspace w on w.id = e.workspace_id where w.key = '${PLATFORM_AUDIT_WORKSPACE}'`);
  ok("adapter pass: record writes one audit_event line in the platform-audit workspace, the firm id in detail.firmId (the entry's, never the detail's)", row === `staff:00000000-0000-4000-8000-0000000f0101|retainer.sent|fo_retainer|r-10|${FAKE_FIRM_ID}|r-10`, row);

  // A forced audit failure rolls the whole change back: the change, and the line the real adapter already wrote.
  const forced = fakeAudit({ failOn: () => true }), before = lines(), wsBefore = sql("select count(*) from workspace");
  const rolledBack = await rejects(() => db.$transaction(async (tx) => {
    await tx.workspace.create({ data: { key: "pf0p-change", label: "a change that must roll back" } });
    await auditEvent.record(tx, entry({ entityKey: "r-11" }));
    await forced.record(tx, entry({ entityKey: "r-11" }));
  }), (e) => e instanceof AuditFailure);
  ok("adapter fail: failOn throws inside the transaction and the rolled-back transaction leaves no audit row and no change", rolledBack && lines() === before && sql("select count(*) from workspace") === wsBefore && sql("select count(*) from workspace where key = 'pf0p-change'") === "0");

  const { firmId: _f, ...noFirm } = entry({ entityKey: "r-12" });
  const refused = await rejects(() => db.$transaction(async (tx) => {
    await tx.workspace.create({ data: { key: "pf0p-change-2", label: "a change that must roll back" } });
    await auditEvent.record(tx, noFirm as never);
  }), zodSays("firmId"));
  ok("adapter fail: an entry without firmId is refused and the change rolls back", refused && lines() === before && sql("select count(*) from workspace where key = 'pf0p-change-2'") === "0");

  // The first line ever, in a transaction that rolls back: the workspace it made goes too, and the next write remakes it.
  sql(`delete from audit_event where workspace_id in (select id from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'); delete from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'`);
  await rejects(() => db.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "r-13" })); throw new Error("roll back"); }));
  const wsGone = sql(`select count(*) from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'`) === "0";
  await db.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "r-14" })); });
  ok("adapter pass: a rolled-back first line leaves no workspace and no stale id; the next line remakes it", wsGone && lines() === 1);

  // Review M1: two first writers at once on a database with no audit workspace yet. The second waits for the first's
  // commit and then uses its row; both lines land, one workspace. Then the same with the first rolling back.
  const reset = () => sql(`delete from audit_event where workspace_id in (select id from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'); delete from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'`);
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const db2 = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(DB), options: "-c TimeZone=UTC" }) });
  try {
    reset();
    const both = await Promise.allSettled([
      db.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "race-a" })); await pause(800); }, { timeout: 20_000 }),
      pause(200).then(() => db2.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "race-b" })); }, { timeout: 20_000 })),
    ]);
    ok("adapter pass: two first writers at once both commit, one workspace (review M1)", both.every((r) => r.status === "fulfilled") && lines() === 2 && sql(`select count(*) from workspace where key = '${PLATFORM_AUDIT_WORKSPACE}'`) === "1", both.map((r) => r.status === "rejected" ? String(r.reason).slice(0, 200) : "ok"));
    reset();
    const firstFails = await Promise.allSettled([
      db.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "race-c" })); await pause(800); throw new Error("first writer rolls back"); }, { timeout: 20_000 }),
      pause(200).then(() => db2.$transaction(async (tx) => { await auditEvent.record(tx, entry({ entityKey: "race-d" })); }, { timeout: 20_000 })),
    ]);
    ok("adapter fail: when the first writer rolls back, the waiting second still commits its line (one line, one workspace)", firstFails[0].status === "rejected" && firstFails[1].status === "fulfilled" && lines() === 1 && sql(`select count(*) from audit_event where entity_key = 'race-d'`) === "1", firstFails.map((r) => r.status === "rejected" ? String(r.reason).slice(0, 200) : "ok"));
  } finally { await db2.$disconnect(); }
} finally {
  await db.$disconnect();
  execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]);
  rmSync(WORK, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
