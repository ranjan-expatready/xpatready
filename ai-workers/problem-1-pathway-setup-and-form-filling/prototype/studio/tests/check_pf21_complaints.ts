// PF-21 (P-579, P-584 (8), P-600; BACKLOG row PF-21 = FO-13k rev 12's Done when, plus the migration on empty and
// demo-data copies and `migrate diff` empty): the complaints register. Every line of the row, each with a passing and a
// failing case: a complaint without a received date or summary is refused at the field; the acknowledgement reminder
// fires once after the Sample period (fake clock); a closed complaint's outcome cannot change; a case officer who is not
// the handler cannot read it; delete is refused for everyone; every change goes through AuditPort. Plus: firm A never
// sees firm B's complaints (404), the database refuses what the service refuses, and P-600's conditions (own stamp,
// plat_ names, firm_id first). Ports are PF-0p's fakes (ports/). Three scratch databases: "empty" gets every migration;
// "demo" gets every migration before PF-21's, then demo-shaped rows (Sample cases, an audit line, the Sample firms and
// staff), then PF-21's migration and any later one; "bare" stops before PF-21. No server, no browser, no model call
// (US$0). All are dropped at the end.
//   tsx studio/tests/check_pf21_complaints.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { acknowledgeBy } from "../api/src/platform/complaints/business-days.ts";
import { ACK_REMINDER_JOB, ackReminderKey, ComplaintsService, COMPLAINT_KEYS, registerComplaintJobs } from "../api/src/platform/complaints/complaints.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { fakeAudit } from "../ports/audit.ts";
import { FakeClock } from "../ports/clock.ts";
import { fakeJobs } from "../ports/jobs.ts";
import { fakeMail } from "../ports/mail.ts";
import { ComplaintClosed, ComplaintReceived, EVENT } from "../ports/events.ts";
import { fakeStaff, type StaffContext } from "../ports/staff.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114200000_pf21_complaints";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_pf21_empty_${process.pid}`, DEMO = `xr_studio_pf21_demo_${process.pid}`, BARE = `xr_studio_pf21_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf21-check-${process.pid}`);
const TABLES = ["plat_complaint", "plat_complaint_event"];

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refusedCode = (db: string, q: string, code: string, re: RegExp) => { try { psql(db, ["-v", "VERBOSITY=verbose", "-Atc", q]); return false; } catch (e) { const err = String((e as { stderr?: string }).stderr ?? e); return err.includes(`ERROR:  ${code}:`) && re.test(err); } };
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
type Problem = { status?: number; response?: { status?: number; code?: string; fields?: Record<string, string> } };
/** The HTTP problem a call answers with (status, code, fields), or "ok". */
const answer = async (f: () => Promise<unknown>): Promise<{ status: number; code?: string; fields?: Record<string, string> } | "ok"> => {
  try { await f(); return "ok"; } catch (e) { const p = e as Problem & { getStatus?: () => number; getResponse?: () => Problem["response"] }; if (!p.getStatus) throw e; const r = p.getResponse?.() ?? {}; return { status: p.getStatus(), code: r.code, fields: r.fields }; }
};
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HOUR = 3_600_000, DAY = 24 * HOUR;
/** The jobs still waiting in a fake queue. */
const waiting = (j: { jobs: ReadonlyArray<{ status: string; key: string; name: string }> }) => j.jobs.filter((x) => x.status === "waiting");
/** A complaint by another person written straight in SQL, with its RECEIVED event in the same transaction (the database
 *  checks at commit that every complaint has one). */
const otherPerson = (id: string, firm: string, handler: string, name: string, received = "now()") =>
  `insert into plat_complaint (id, firm_id, subject_kind, complainant_name, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at) values ('${id}', '${firm}', 'OTHER_PERSON', '${name}', ${received}, 'PHONE', 'OTHER', 'Called about a delay', '${handler}', ${received} + interval '1 day', 'staff:x', now());
   insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) select gen_random_uuid(), firm_id, id, 'RECEIVED', received_at, 'staff:x' from plat_complaint where id = '${id}'; select 1`;

function platDiff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--exit-code"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0 && r.status !== 2) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /plat_|PlatComplaint/.test(l));
}
const indexesNotFirmFirst = (db: string) => sql(db, `select coalesce(string_agg(ic.relname, ',' order by ic.relname), '') from pg_index i
  join pg_class c on c.oid = i.indrelid join pg_class ic on ic.oid = i.indexrelid left join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.relnamespace = 'public'::regnamespace and c.relname = any('{${TABLES.join(",")}}') and not i.indisprimary and coalesce(a.attname, '') <> 'firm_id'`);
const functionsOf = (db: string) => sql(db, `select coalesce(string_agg(proname, ',' order by proname), '') from pg_proc where pronamespace = 'public'::regnamespace`).split(",").filter(Boolean);

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
try {
  const newest = all.filter((d) => d < NEW).at(-1) ?? "";
  ok(`PF-21 (P-600 (4)): the migration has its own stamp, later than every one before it (newest before it: ${newest})`, all.includes(NEW) && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1 && all.at(-1) === NEW, all.slice(-3));

  // ----------------------------------------------------------------------- migration on empty and demo-data copies
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-21 fail: before PF-21's migration there is no plat_ table and the schema differs (diff names plat_complaint)",
    sql(BARE, `select count(*) from pg_tables where tablename like 'plat\\_%'`) === "0" && platDiff(BARE).some((l) => /plat_complaint/.test(l)));
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-21 pass: every migration applies to an empty database; both tables exist", sql(EMPTY, `select count(*) from pg_tables where schemaname='public' and tablename = any('{${TABLES.join(",")}}')`) === "2");
  ok("PF-21 pass: migrate diff from the migrated empty database to the schema names no plat_ table or type", platDiff(EMPTY).length === 0, platDiff(EMPTY));
  ok("PF-21 fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr)); } })());

  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = u(1), CMB = u(2);
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values
      ('${u(10)}', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001'), ('${u(12)}', '${W}', '${CMB}', 'user-P', 'user-S', 'sample-solo', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  await pre.$disconnect();
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select string_agg(id::text, ',' order by id) from platform_staff)`;
  const before = sql(DEMO, demoRows), fnBefore = new Set(functionsOf(DEMO));
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-21 pass: the migration applies to a demo-data copy (cases, audit, the Sample firms and staff) and leaves its rows as they were", sql(DEMO, demoRows) === before, before);
  ok("PF-21 pass: migrate diff after it on the demo-data copy names no plat_ table or type", platDiff(DEMO).length === 0, platDiff(DEMO));
  const added = functionsOf(DEMO).filter((f) => !fnBefore.has(f));
  ok("PF-21 (P-600 (3), rev 15.2): every database function the migration adds carries the plat_ prefix, and it adds some", added.length >= 4 && added.every((f) => f.startsWith("plat_")), added);
  ok("PF-21 fail→pass: firm_id is first in every index of both tables (the primary keys aside)", indexesNotFirmFirst(DEMO) === "", indexesNotFirmFirst(DEMO));
  ok("PF-21: no plat_ column stores a time without its zone",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${TABLES.join(",")}}') and data_type in ('timestamp without time zone','date')`) === "0");

  const firmA = sql(DEMO, `select id from platform_firm where key='sample-firm'`), firmB = sql(DEMO, `select id from platform_firm where key='sample-solo'`);
  const staffOf = (actor: string) => sql(DEMO, `select id from platform_staff where actor_id='${actor}'`);
  const R = staffOf("user-R"), T = staffOf("user-T"), O = staffOf("user-O"), S = staffOf("user-S");
  const BOTH = [COMPLAINT_KEYS.record, COMPLAINT_KEYS.read];
  const owner: StaffContext = fakeStaff({ staffId: R, firmId: firmA, firmKey: "sample-firm", roles: ["OWNER"], keys: BOTH });
  const handlerT: StaffContext = fakeStaff({ staffId: T, firmId: firmA, firmKey: "sample-firm", roles: ["CASE_MANAGER"], keys: [] });
  const officerO: StaffContext = fakeStaff({ staffId: O, firmId: firmA, firmKey: "sample-firm", roles: ["CASE_OFFICER"], keys: [] });
  const readerOnly: StaffContext = fakeStaff({ staffId: O, firmId: firmA, firmKey: "sample-firm", roles: ["ADMIN"], keys: [COMPLAINT_KEYS.read] });
  const ownerB: StaffContext = fakeStaff({ staffId: S, firmId: firmB, firmKey: "sample-solo", roles: ["OWNER"], keys: BOTH });

  const db = client(DEMO); dbs.push(db);
  // Monday 16 Nov 2026 09:00 in Toronto (14:00Z): the firm's Sample hours Mon-Fri 09:00-17:00, zone America/Toronto.
  const clock = new FakeClock("2026-11-16T15:00:00Z"), jobs = fakeJobs(clock), mail = fakeMail(), audit = fakeAudit();
  const svc = new ComplaintsService({ db, audit, jobs, clock, mail });
  await registerComplaintJobs(jobs, svc);
  const base = { subjectKind: "FRONT_OFFICE_PERSON", subjectId: u(500), receivedAt: "2026-11-16T14:00:00Z", channel: "EMAIL", category: "SERVICE", summary: "The client says the study permit file was sent late.", handlerStaffId: T };
  const count = (t: string, where = "true") => sql(DEMO, `select count(*) from ${t} where ${where}`);

  // ------------------------------------------------------------- line 1: received date and summary refused at the field
  const noDate = await answer(() => svc.record(owner, { ...base, receivedAt: undefined }));
  const noSummary = await answer(() => svc.record(owner, { ...base, summary: undefined }));
  const blank = await answer(() => svc.record(owner, { ...base, summary: "  ​ " }));
  ok("PF-21 fail (FO-13k line 1): no received date → 422 at the field receivedAt; no summary → 422 at summary; a summary of only (non-breaking, zero-width) spaces → 422 at summary; nothing written",
    noDate !== "ok" && noDate.status === 422 && !!noDate.fields?.receivedAt && noSummary !== "ok" && noSummary.status === 422 && !!noSummary.fields?.summary
    && blank !== "ok" && blank.status === 422 && !!blank.fields?.summary && count("plat_complaint") === "0" && audit.entries.length === 0, { noDate, noSummary, blank });
  const future = await answer(() => svc.record(owner, { ...base, receivedAt: "2026-11-17T14:00:00Z" }));
  const other = await answer(() => svc.record(owner, { ...base, subjectKind: "OTHER_PERSON", subjectId: undefined }));
  const otherId = await answer(() => svc.record(owner, { ...base, subjectKind: "OTHER_PERSON", complainantName: "Client A's sponsor" }));
  const noSubject = await answer(() => svc.record(owner, { ...base, subjectId: undefined }));
  ok("PF-21 fail: a received date in the future, another person without a name, another person with a record id, a linked person without an id → 422 at the field",
    future !== "ok" && !!future.fields?.receivedAt && other !== "ok" && !!other.fields?.complainantName && otherId !== "ok" && !!otherId.fields?.subjectId && noSubject !== "ok" && !!noSubject.fields?.subjectId, { future, other, otherId, noSubject });
  const handlerB = await answer(() => svc.record(owner, { ...base, handlerStaffId: S }));
  const extra = await answer(() => svc.record(owner, { ...base, firmId: firmB }));
  ok("PF-21 fail: a handler from firm B → 422 at handlerStaffId; an unknown field (a firm id) → 422; nothing written",
    handlerB !== "ok" && !!handlerB.fields?.handlerStaffId && extra !== "ok" && extra.status === 422 && count("plat_complaint") === "0", { handlerB, extra });
  const noKey = await answer(() => svc.record(handlerT, base));
  ok("PF-21 fail: recording without agent/complaint:record → 403", noKey !== "ok" && noKey.status === 403, noKey);

  const c1 = await svc.record(owner, base);
  ok("PF-21 pass (line 1): with a received date and a summary the complaint is recorded OPEN, with its RECEIVED event, one audit line and one reminder job keyed by the complaint",
    c1.status === "OPEN" && count("plat_complaint_event", `complaint_id='${c1.id}' and kind='RECEIVED'`) === "1" && audit.entries.length === 1 && audit.entries[0].action === "complaint.record"
    && waiting(jobs).filter((j) => j.key === ackReminderKey(c1.id) && j.name === ACK_REMINDER_JOB).length === 1, { c1, entries: audit.entries, q: waiting(jobs) });
  ok("PF-21 pass: acknowledge-by is the close of the 2nd business day after the received day (Mon 09:00 Toronto → Wed 18 Nov 17:00 Toronto = 22:00Z)", c1.acknowledgeBy.toISOString() === "2026-11-18T22:00:00.000Z", c1.acknowledgeBy);
  const cal = { zone: "America/Toronto", hours: ["MON", "TUE", "WED", "THU", "FRI"].map((day) => ({ day, opens: "09:00", closes: "17:00" })), closedDays: [] as string[] };
  ok("PF-21 pass/fail: a Friday complaint skips the weekend (Fri 20 Nov → Tue 24 Nov 17:00), and a closed day is skipped too (Mon 23 Nov closed → Wed 25 Nov)",
    acknowledgeBy(new Date("2026-11-20T15:00:00Z"), cal).toISOString() === "2026-11-24T22:00:00.000Z" && acknowledgeBy(new Date("2026-11-20T15:00:00Z"), { ...cal, closedDays: ["2026-11-23"] }).toISOString() === "2026-11-25T22:00:00.000Z");
  ok("PF-21 pass: the firm's own zone counts (a complaint at 23:30 Toronto on Monday is a Monday complaint: 17 Nov 04:30Z → Wed 18 Nov)", acknowledgeBy(new Date("2026-11-17T04:30:00Z"), cal).toISOString() === "2026-11-18T22:00:00.000Z");

  // --------------------------------------------------- line 2: the acknowledgement reminder fires once (fake clock)
  await clock.advance(DAY);   // Tue 17 Nov 15:00Z: before the date
  ok("PF-21 fail (line 2): before the acknowledge-by date no reminder is sent", mail.sent.length === 0 && count("plat_complaint_event", `kind='REMINDER_SENT'`) === "0");
  const before2 = (await svc.list(owner, "overdue")).items;
  ok("PF-21 fail: before its date the complaint is not overdue", before2.length === 0, before2);
  await clock.advance(DAY + 8 * HOUR);   // Wed 18 Nov 23:00Z: past 22:00Z
  const handlerEmail = sql(DEMO, `select email from platform_staff where id='${T}'`);
  ok("PF-21 pass (line 2): past the date one reminder goes to the handler, recorded as one REMINDER_SENT event and one audit line by the system; the mail names no complainant and no summary",
    mail.sent.length === 1 && mail.sent[0].to === handlerEmail && !mail.sent[0].text.includes("study permit") && count("plat_complaint_event", `complaint_id='${c1.id}' and kind='REMINDER_SENT'`) === "1"
    && audit.entries.filter((e) => e.action === "complaint.reminder" && e.actor.startsWith("system:")).length === 1, mail.sent);
  await clock.advance(DAY);
  ok("PF-21 fail (line 2, once): the reminder does not fire again, and running the job again by hand is skipped", mail.sent.length === 1 && (await svc.runAckReminder({ firmId: firmA, complaintId: c1.id })) === "skipped" && mail.sent.length === 1);
  const overdue = (await svc.list(owner, "overdue")).items;
  ok("PF-21 pass: the list's overdue view shows it (open, not acknowledged, past its date)", overdue.length === 1 && overdue[0].id === c1.id && overdue[0].overdue === true, overdue);

  await clock.set("2026-11-23T15:00:00Z");
  const c2 = await svc.record(owner, { ...base, subjectKind: "CASE_PARTY", subjectId: u(501), receivedAt: "2026-11-23T14:30:00Z", category: "FEES", summary: "The sponsor disputes the fee." });
  await svc.acknowledge(handlerT, c2.id, { at: "2026-11-23T15:00:00Z" });
  ok("PF-21 pass: acknowledging cancels the reminder job", !waiting(jobs).some((j) => j.key === ackReminderKey(c2.id)));
  await clock.advance(5 * DAY);
  ok("PF-21 fail (line 2): an acknowledged complaint gets no reminder, even when the job is run by hand", mail.sent.length === 1 && (await svc.runAckReminder({ firmId: firmA, complaintId: c2.id })) === "skipped" && mail.sent.length === 1);
  const again = await answer(() => svc.acknowledge(owner, c2.id, { at: "2026-11-24T15:00:00Z" }));
  ok("PF-21 fail: the acknowledgement is recorded once (409), and the database refuses a second one", again !== "ok" && again.status === 409 && refused(DEMO, `update plat_complaint set acknowledged_at = now() where id='${c2.id}'`, /acknowledgement is recorded once/), again);

  // ------------------------------------------------------- line 3: a closed complaint's outcome cannot change
  const step = await svc.addStep(handlerT, c1.id, { kind: "STEP", note: "Called the client to understand the delay." });
  await svc.responseSent(handlerT, c1.id, { at: clock.now().toISOString() });
  const closed = await svc.close(owner, c1.id, { outcome: "RESOLVED", at: clock.now().toISOString(), note: "Explained the delay and the next step." });
  ok("PF-21 pass: steps, the response and the close are recorded; the complaint is CLOSED with its outcome and date", step.status === "OPEN" && closed.status === "CLOSED" && closed.outcome === "RESOLVED" && !!closed.closedAt && !!closed.responseSentAt);
  const reclose = await answer(() => svc.close(owner, c1.id, { outcome: "UPHELD", at: clock.now().toISOString(), note: "Changed my mind." }));
  const stepAfter = await answer(() => svc.addStep(owner, c1.id, { kind: "STEP", note: "Another step." }));
  ok("PF-21 fail (line 3): closing again with another outcome → 409; a step after the close → 409; the outcome is still RESOLVED",
    reclose !== "ok" && reclose.status === 409 && stepAfter !== "ok" && stepAfter.status === 409 && sql(DEMO, `select outcome from plat_complaint where id='${c1.id}'`) === "RESOLVED", { reclose, stepAfter });
  ok("PF-21 fail (line 3, database): changing a closed complaint's outcome directly is refused",
    refused(DEMO, `update plat_complaint set outcome = 'UPHELD' where id='${c1.id}'`, /closed complaint never changes/) && sql(DEMO, `select outcome from plat_complaint where id='${c1.id}'`) === "RESOLVED");
  const note = await answer(() => svc.addStep(owner, c1.id, { kind: "NOTE", note: "The client wrote to thank us." }));
  ok("PF-21 pass (line 3): a closed complaint stays readable and takes a NOTE as a new event; nothing on the record changes",
    note === "ok" && (await svc.get(owner, c1.id)).events?.at(-1)?.kind === "NOTE" && sql(DEMO, `select status || ':' || outcome from plat_complaint where id='${c1.id}'`) === "CLOSED:RESOLVED");
  ok("PF-21 fail (database): a closed complaint takes no event but a NOTE", refused(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) values (gen_random_uuid(), '${firmA}', '${c1.id}', 'ACKNOWLEDGED', '2026-12-01T12:00:00Z', 'staff:x')`, /takes only a NOTE/));

  // ---------------------------------------------- line 4: a case officer who is not the handler cannot read it
  const asOfficer = await answer(() => svc.get(officerO, c1.id));
  ok("PF-21 fail (line 4): a case officer who is not the handler cannot read it (404, the same as another firm's) nor see it in the list",
    asOfficer !== "ok" && asOfficer.status === 404 && (await svc.list(officerO, "all")).items.length === 0, asOfficer);
  const asHandler = await svc.get(handlerT, c1.id);
  ok("PF-21 pass (line 4): the handler (no complaint keys) reads it with its events; the list shows the handler's own; Owner reads every one",
    asHandler.id === c1.id && (asHandler.events?.length ?? 0) >= 5 && (await svc.list(handlerT, "all")).items.length === 2 && (await svc.list(owner, "all")).items.length === 2 && (await svc.get(owner, c2.id)).id === c2.id);
  const readerAct = await answer(() => svc.addStep(readerOnly, c2.id, { kind: "NOTE", note: "x" }));
  ok("PF-21 pass/fail: the read key alone reads every complaint but changes none (403)", (await svc.get(readerOnly, c2.id)).id === c2.id && readerAct !== "ok" && readerAct.status === 403, readerAct);
  const officerAct = await answer(() => svc.close(officerO, c2.id, { outcome: "RESOLVED", at: clock.now().toISOString(), note: "x" }));
  ok("PF-21 fail: a staff member who may not read it cannot change it either (404)", officerAct !== "ok" && officerAct.status === 404, officerAct);
  const handOver = await answer(() => svc.changeHandler(handlerT, c2.id, { handlerStaffId: R }));
  ok("PF-21 fail: the handler without the keys cannot pass the complaint on (403)", handOver !== "ok" && handOver.status === 403, handOver);
  const moved = await svc.changeHandler(owner, c2.id, { handlerStaffId: O });
  ok("PF-21 pass: Owner changes the handler; the new handler reads it and the old one no longer does",
    moved.handlerStaffId === O && (await svc.get(officerO, c2.id)).id === c2.id && (await answer(() => svc.get(handlerT, c2.id))) !== "ok");

  // --------------------------------------------------------------------------- firm walls (contracts §0.2)
  const crossGet = await answer(() => svc.get(ownerB, c2.id)), crossClose = await answer(() => svc.close(ownerB, c2.id, { outcome: "RESOLVED", at: clock.now().toISOString(), note: "x" }));
  ok("PF-21 fail (firm wall): firm B's Owner cannot read, list or close firm A's complaint (404, never 403)",
    crossGet !== "ok" && crossGet.status === 404 && crossClose !== "ok" && crossClose.status === 404 && (await svc.list(ownerB, "all")).items.length === 0 && sql(DEMO, `select status from plat_complaint where id='${c2.id}'`) === "OPEN");
  const cB = await svc.record(ownerB, { ...base, receivedAt: "2026-11-23T14:30:00Z", handlerStaffId: S });
  ok("PF-21 pass (firm wall): firm B's complaint is firm B's alone", (await svc.list(ownerB, "all")).items.map((c) => c.id).join() === cB.id && (await answer(() => svc.get(owner, cB.id))) !== "ok");
  ok("PF-21 fail (database): a complaint naming another firm's staff member as handler is refused 23503",
    refusedCode(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor, detail) values (gen_random_uuid(), '${firmA}', '${c2.id}', 'HANDLER_CHANGED', '2026-12-01T12:00:00Z', 'staff:x', '{"to": "${S}"}'); update plat_complaint set handler_staff_id = '${S}' where id='${c2.id}'`, "23503", /plat_complaint_firm_id_handler_staff_id_fkey/));
  ok("PF-21 fail (database): a complaint's facts never change (summary, received date)",
    refused(DEMO, `update plat_complaint set summary = 'Changed' where id='${c2.id}'`, /facts never change/) && refused(DEMO, `update plat_complaint set received_at = received_at - interval '1 day' where id='${c2.id}'`, /facts never change/));
  ok("PF-21 fail (database): another person needs a name and no record id; a closed complaint needs its outcome and date",
    refused(DEMO, `insert into plat_complaint (id, firm_id, subject_kind, subject_id, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at) values (gen_random_uuid(), '${firmA}', 'OTHER_PERSON', null, now(), 'EMAIL', 'OTHER', 'x', '${T}', now() + interval '1 day', 'staff:x', now())`, /plat_complaint_complainant_check/)
    && refused(DEMO, `insert into plat_complaint (id, firm_id, subject_kind, subject_id, complainant_name, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at) values (gen_random_uuid(), '${firmA}', 'OTHER_PERSON', '${u(9)}', 'A', now(), 'EMAIL', 'OTHER', 'x', '${T}', now() + interval '1 day', 'staff:x', now())`, /plat_complaint_subject_check/)
    && refused(DEMO, `update plat_complaint set outcome = 'RESOLVED' where id='${c2.id}'`, /plat_complaint_closed_check/));
  ok("PF-21 pass (database): another person with a name only is accepted",
    sql(DEMO, otherPerson(u(600), firmA, T, "Client A''s sponsor")) === "1");

  // --------------------------------------------------------------- line 5: delete refused for everyone
  const del = await answer(() => svc.remove(owner, c2.id)), delT = await answer(() => svc.remove(handlerT, c2.id));
  ok("PF-21 fail (line 5): delete → refused for everyone (Owner with both keys and the handler: 405)", del !== "ok" && del.status === 405 && delT !== "ok" && delT.status === 405, { del, delT });
  ok("PF-21 fail (line 5, database): deleting or truncating a complaint or its events is refused, even directly",
    refused(DEMO, `delete from plat_complaint where id='${c2.id}'`, /kept and never deleted/) && refused(DEMO, `delete from plat_complaint_event where complaint_id='${c1.id}'`, /kept and never deleted/)
    && refused(DEMO, `truncate plat_complaint_event`, /kept and never deleted/) && refused(DEMO, `truncate plat_complaint cascade`, /kept and never deleted/));
  ok("PF-21 fail (database): an event is never changed (insert-only)", refused(DEMO, `update plat_complaint_event set note = 'edited' where complaint_id='${c1.id}' and kind='NOTE'`, /never changed/));
  ok("PF-21 pass (line 5): every complaint and event is still there", count("plat_complaint", `firm_id='${firmA}'`) === "3" && Number(count("plat_complaint_event", `complaint_id='${c1.id}'`)) >= 6);
  const lone = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'lone@sample-firm.example.com', 'Lone', now()) returning id`);
  ok("PF-21 pass: a staff member no complaint names can still be deleted (as before PF-21)", sql(DEMO, `delete from platform_staff where id = '${lone}' returning 1`) === "1");
  const handlerOnly = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'handler@sample-firm.example.com', 'Handler', now()) returning id`);
  sql(DEMO, otherPerson(u(601), firmA, handlerOnly, "B"));
  ok("PF-21 fail (database): a staff member who handles a complaint (and nothing else) cannot be deleted or change id (RESTRICT: 23001)",
    refusedCode(DEMO, `delete from platform_staff where id='${handlerOnly}'`, "23001", /plat_complaint_firm_id_handler_staff_id_fkey/) && refusedCode(DEMO, `update platform_staff set id = gen_random_uuid() where id='${handlerOnly}'`, "23001", /plat_complaint_firm_id_handler_staff_id_fkey/));
  ok("PF-21 pass: the three foreign keys of the register are RESTRICT on delete and on update",
    sql(DEMO, `select string_agg(conname || ':' || confdeltype::text || confupdtype::text, ',' order by conname) from pg_constraint where contype = 'f' and conrelid::regclass::text like 'plat\\_%'`)
      === "plat_complaint_event_firm_id_complaint_id_fkey:rr,plat_complaint_firm_id_fkey:rr,plat_complaint_firm_id_handler_staff_id_fkey:rr");

  // -------------------------------------------------------------------- line 6: every change through AuditPort
  const actions = audit.entries.map((e) => e.action);
  ok("PF-21 pass (line 6): every change wrote one AuditPort line (record ×3, acknowledge, step, response, close, note, handler, reminder), each on plat_complaint with the complaint's id",
    ["complaint.record", "complaint.acknowledge", "complaint.step", "complaint.response", "complaint.close", "complaint.note", "complaint.handler", "complaint.reminder"].every((a) => actions.includes(a))
    && actions.filter((a) => a === "complaint.record").length === 3 && audit.entries.every((e) => e.entity === "plat_complaint" && e.entityKey === e.detail.complaintId), actions);
  ok("PF-21 pass: no audit line carries the complaint's words or a person's name (ids only in detail; summaries are fixed phrases)",
    audit.entries.every((e) => !/study permit|sponsor disputes|Client A|Called the client/.test(JSON.stringify(e))));
  ok("PF-21 fail: refused calls wrote no audit line (exactly the changes above)", audit.entries.length === actions.length && actions.length === 10, actions);
  const failing = fakeAudit({ failOn: (e) => e.action === "complaint.record" || e.action === "complaint.close" });
  const svc2 = new ComplaintsService({ db, audit: failing, jobs, clock, mail });
  const n0 = count("plat_complaint"), e0 = count("plat_complaint_event"), q0 = waiting(jobs).length;
  const forced = await svc2.record(owner, { ...base, receivedAt: clock.now().toISOString() }).then(() => "ok", (e: Error) => e.message);
  ok("PF-21 fail (line 6): a forced audit failure rolls the record back — no complaint, no event, no reminder job", /forced/.test(forced) && count("plat_complaint") === n0 && count("plat_complaint_event") === e0 && waiting(jobs).length === q0, forced);
  const forcedClose = await svc2.close(owner, c2.id, { outcome: "RESOLVED", at: clock.now().toISOString(), note: "x" }).then(() => "ok", (e: Error) => e.message);
  ok("PF-21 fail (line 6): a forced audit failure on close leaves the complaint OPEN with no CLOSED event", /forced/.test(forcedClose) && sql(DEMO, `select status from plat_complaint where id='${c2.id}'`) === "OPEN" && count("plat_complaint_event", `complaint_id='${c2.id}' and kind='CLOSED'`) === "0");

  ok("PF-21: no plat_ column is named like a password, secret or token",
    sql(DEMO, `select count(*) from information_schema.columns where table_name = any('{${TABLES.join(",")}}') and column_name ~ '(password|secret|token|api_key)'`) === "0");

  // ======================================================== review and break round 1 (screens/PF-21/review.md, break-report.md)
  const clock3 = new FakeClock("2026-11-30T15:00:00Z"), jobs3 = fakeJobs(clock3), mail3 = fakeMail(), audit3 = fakeAudit();
  const svc3 = new ComplaintsService({ db, audit: audit3, jobs: jobs3, clock: clock3, mail: mail3 });
  await registerComplaintJobs(jobs3, svc3);
  const at3 = (h: number) => new Date(Date.parse("2026-11-30T14:00:00Z") + h * HOUR).toISOString();

  // Roles from the catalogue (Lead 47 on #1753): record for Owner, Admin, Case Manager; read for Owner, Admin.
  ok("PF-21 (Lead 47): the catalogue gives agent/complaint:record to Owner, Admin and Case Manager and agent/complaint:read to Owner and Admin, nothing else",
    sql(DEMO, `select string_agg(role || ':' || permission_key, ',' order by permission_key, role) from platform_role_permission where permission_key like 'agent/complaint:%'`.replace("order by permission_key, role)", "order by permission_key, role::text)"))
      === "ADMIN:agent/complaint:read,OWNER:agent/complaint:read,ADMIN:agent/complaint:record,CASE_MANAGER:agent/complaint:record,OWNER:agent/complaint:record");
  const roleCtx = (role: string, staffId = S): StaffContext => fakeStaff({ staffId, firmId: firmB, firmKey: "sample-solo", roles: [role], keys: sql(DEMO, `select string_agg(permission_key, ',') from platform_role_permission where role = '${role}'`).split(",") });
  const ROLES = ["OWNER", "ADMIN", "CASE_MANAGER", "CASE_OFFICER", "BILLING_FINANCE", "READ_ONLY"];
  const recordBy: Record<string, string> = {};
  for (const r of ROLES) { const a = await answer(() => svc3.record(roleCtx(r, u(700)), { ...base, receivedAt: at3(-1), handlerStaffId: S })); recordBy[r] = a === "ok" ? "ok" : String(a.status); }
  ok("PF-21 pass/fail per role (Lead 47): Owner, Admin and Case Manager record a complaint; Case Officer, Billing / Finance and Read-only → 403",
    JSON.stringify(recordBy) === JSON.stringify({ OWNER: "ok", ADMIN: "ok", CASE_MANAGER: "ok", CASE_OFFICER: "403", BILLING_FINANCE: "403", READ_ONLY: "403" }), recordBy);
  const someB = (await svc.list(ownerB, "all")).items[0].id, readBy: Record<string, string> = {};
  for (const r of ROLES) { const a = await answer(() => svc3.get(roleCtx(r, u(701)), someB)); readBy[r] = a === "ok" ? "ok" : String(a.status); }
  ok("PF-21 pass/fail per role (Lead 47): Owner and Admin read a complaint they do not handle; Case Manager, Case Officer, Billing / Finance and Read-only → 404",
    JSON.stringify(readBy) === JSON.stringify({ OWNER: "ok", ADMIN: "ok", CASE_MANAGER: "404", CASE_OFFICER: "404", BILLING_FINANCE: "404", READ_ONLY: "404" }), readBy);

  // Dates and ids (review m2, m3; break m2, m3).
  const feb31 = await answer(() => svc3.record(owner, { ...base, receivedAt: "2026-02-31T10:00:00Z" })), y99 = await answer(() => svc3.record(owner, { ...base, receivedAt: "0099-01-01T10:00:00Z" }));
  const h24 = await answer(() => svc3.record(owner, { ...base, receivedAt: "2026-11-30T24:00:00Z" }));
  ok("PF-21 fail (review m3, break m2): 31 February, the year 0099 and 24:00 → 422 at receivedAt (never shifted, never a 500)",
    [feb31, y99, h24].every((a) => a !== "ok" && a.status === 422 && !!a.fields?.receivedAt), { feb31, y99, h24 });
  ok("PF-21 pass: a real date with an offset is accepted (2026-11-30T09:00:00-05:00)", (await answer(() => svc3.record(owner, { ...base, receivedAt: "2026-11-30T09:00:00-05:00" }))) === "ok");
  const dashes = "-".repeat(36), hexes = "a".repeat(36);
  const badIds = await Promise.all([answer(() => svc3.get(owner, dashes)), answer(() => svc3.get(owner, hexes)), answer(() => svc3.acknowledge(owner, dashes, { at: at3(0) })), answer(() => svc3.close(owner, hexes, { outcome: "RESOLVED", at: at3(0), note: "x" }))]);
  ok("PF-21 fail (review m2, break m3): 36 dashes or 36 letters as an id → 404 on read and on change (never a 500)", badIds.every((a) => a !== "ok" && a.status === 404), badIds);

  // Text (break m4): invisible-only text and C1 controls are refused by the service and the database alike.
  const invisible = await answer(() => svc3.record(owner, { ...base, summary: "⠀ㅤ‎⁦­᠎　" }));
  const c1ctl = await answer(() => svc3.record(owner, { ...base, summary: "Late \u009b file" }));
  const nelName = await answer(() => svc3.record(owner, { ...base, subjectKind: "OTHER_PERSON", subjectId: undefined, complainantName: "A B" }));
  ok("PF-21 fail (break m4): a summary of only invisible marks, a C1 control, a line separator in a name → 422 at the field",
    invisible !== "ok" && !!invisible.fields?.summary && c1ctl !== "ok" && !!c1ctl.fields?.summary && nelName !== "ok" && !!nelName.fields?.complainantName, { invisible, c1ctl, nelName });
  ok("PF-21 fail (break m4, database): an ideographic or em space only summary is refused by the database too",
    refused(DEMO, `insert into plat_complaint (id, firm_id, subject_kind, subject_id, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at) values (gen_random_uuid(), '${firmA}', 'CASE_PARTY', '${u(9)}', now(), 'EMAIL', 'OTHER', E'\\u3000\\u2003', '${T}', now() + interval '1 day', 'staff:x', now())`, /plat_complaint_summary_check/));
  ok("PF-21 pass: right-to-left and emoji text is kept as written", (await answer(() => svc3.record(owner, { ...base, receivedAt: at3(-1), summary: "الملف متأخر 📄 — late file" }))) === "ok");

  // The timeline is in order (break m7).
  const ord = await svc3.record(owner, { ...base, receivedAt: at3(-2) });
  await svc3.responseSent(owner, ord.id, { at: at3(-1) });
  const ackAfter = await answer(() => svc3.acknowledge(owner, ord.id, { at: at3(0) }));
  const closeEarly = await answer(() => svc3.close(owner, ord.id, { outcome: "RESOLVED", at: at3(-1.5), note: "x" }));
  ok("PF-21 fail (break m7): an acknowledgement after the response, or a close before the response → 422 at the date",
    ackAfter !== "ok" && !!ackAfter.fields?.at && closeEarly !== "ok" && !!closeEarly.fields?.at, { ackAfter, closeEarly });
  ok("PF-21 fail (break m7, database): acknowledged after the response, or closed before it, is refused by plat_complaint_dates_check",
    refused(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) values (gen_random_uuid(), '${firmA}', '${ord.id}', 'ACKNOWLEDGED', '${at3(0)}', 'staff:x'); update plat_complaint set acknowledged_at = '${at3(0)}' where id = '${ord.id}'`, /plat_complaint_dates_check/));
  ok("PF-21 pass (break m7): acknowledged before the response, then closed after it", (await answer(() => svc3.acknowledge(owner, ord.id, { at: at3(-1.5) }))) === "ok" && (await answer(() => svc3.close(owner, ord.id, { outcome: "RESOLVED", at: at3(0), note: "Answered." }))) === "ok");

  // The database keeps the record and its events in step (break m5).
  const dbC = await svc3.record(owner, { ...base, receivedAt: at3(-3) });
  ok("PF-21 fail (break m5): a row change without its event is refused (acknowledged, answered, closed, a new handler)",
    refused(DEMO, `update plat_complaint set acknowledged_at = '${at3(-1)}' where id = '${dbC.id}'`, /needs its ACKNOWLEDGED event/)
    && refused(DEMO, `update plat_complaint set response_sent_at = '${at3(-1)}' where id = '${dbC.id}'`, /needs its RESPONSE_SENT event/)
    && refused(DEMO, `update plat_complaint set status = 'CLOSED', outcome = 'RESOLVED', closed_at = '${at3(-1)}' where id = '${dbC.id}'`, /needs its CLOSED event/)
    && refused(DEMO, `update plat_complaint set handler_staff_id = '${R}' where id = '${dbC.id}'`, /needs its HANDLER_CHANGED event/));
  ok("PF-21 fail (break m5): a second ACKNOWLEDGED event, a second RECEIVED event or an event dated before the receipt is refused",
    refused(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) values (gen_random_uuid(), '${firmA}', '${dbC.id}', 'ACKNOWLEDGED', '${at3(-2)}', 'staff:x'), (gen_random_uuid(), '${firmA}', '${dbC.id}', 'ACKNOWLEDGED', '${at3(-2)}', 'staff:x')`, /ACKNOWLEDGED is recorded once/)
    && refused(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) values (gen_random_uuid(), '${firmA}', '${dbC.id}', 'RECEIVED', '${at3(-3)}', 'staff:x')`, /first event and only its first/)
    && refused(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor, note) values (gen_random_uuid(), '${firmA}', '${dbC.id}', 'STEP', '${at3(-4)}', 'staff:x', 'early')`, /before the complaint was received/));
  ok("PF-21 fail (break m5): a complaint written without its RECEIVED event is refused at commit",
    refused(DEMO, `insert into plat_complaint (id, firm_id, subject_kind, complainant_name, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at) values (gen_random_uuid(), '${firmA}', 'OTHER_PERSON', 'C', now(), 'PHONE', 'OTHER', 'x', '${T}', now() + interval '1 day', 'staff:x', now())`, /written with its RECEIVED event/));
  ok("PF-21 pass (break m5): with its event, a row change is accepted; then the response date is recorded once",
    sql(DEMO, `insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) values (gen_random_uuid(), '${firmA}', '${dbC.id}', 'RESPONSE_SENT', '${at3(-1)}', 'staff:x'); update plat_complaint set response_sent_at = '${at3(-1)}' where id = '${dbC.id}' returning 1`) === "1"
    && refused(DEMO, `update plat_complaint set response_sent_at = '${at3(0)}' where id = '${dbC.id}'`, /response date is recorded once/));

  // Races on two real connections (review m5): two closes at once → one closes, the other is refused; nothing else.
  const dbX = client(DEMO), dbY = client(DEMO); dbs.push(dbX, dbY);
  const sx = new ComplaintsService({ db: dbX, audit: fakeAudit(), jobs: jobs3, clock: clock3, mail: mail3 }), sy = new ComplaintsService({ db: dbY, audit: fakeAudit(), jobs: jobs3, clock: clock3, mail: mail3 });
  const race = await svc3.record(owner, { ...base, receivedAt: at3(-1) });
  const both = await Promise.all([answer(() => sx.close(owner, race.id, { outcome: "RESOLVED", at: at3(0), note: "first" })), answer(() => sy.close(owner, race.id, { outcome: "UPHELD", at: at3(0), note: "second" }))]);
  ok("PF-21 pass/fail (race, two connections): two closes at once → exactly one closes, the other answers 409; one CLOSED event",
    both.filter((a) => a === "ok").length === 1 && both.filter((a) => a !== "ok" && a.status === 409).length === 1 && count("plat_complaint_event", `complaint_id='${race.id}' and kind='CLOSED'`) === "1", both);
  const race2 = await svc3.record(owner, { ...base, receivedAt: at3(-1) });
  const mix = await Promise.all([answer(() => sx.close(owner, race2.id, { outcome: "RESOLVED", at: at3(0), note: "close" })), answer(() => sy.addStep(owner, race2.id, { kind: "STEP", note: "step" }))]);
  ok("PF-21 pass (race): a step racing a close is either before it or refused (409), never a STEP after CLOSED",
    sql(DEMO, `select count(*) from plat_complaint_event s join plat_complaint_event c on c.complaint_id = s.complaint_id and c.kind = 'CLOSED' where s.complaint_id = '${race2.id}' and s.kind = 'STEP' and s.seq > c.seq`) === "0" && mix[0] === "ok", mix);

  // After-commit work (review m4, break m1): a rolled-back acknowledgement keeps the reminder; mail only after commit.
  const keep = await svc3.record(owner, { ...base, receivedAt: at3(-1) });
  const failAck = new ComplaintsService({ db, audit: fakeAudit({ failOn: (e) => e.action === "complaint.acknowledge" }), jobs: jobs3, clock: clock3, mail: mail3 });
  const failed = await failAck.acknowledge(owner, keep.id, { at: at3(0) }).then(() => "ok", (e: Error) => e.message);
  ok("PF-21 fail→pass (break m1): an acknowledgement rolled back by a failing audit leaves its reminder job queued (cancel runs only after commit)",
    /forced/.test(failed) && waiting(jobs3).some((j) => j.key === ackReminderKey(keep.id)) && sql(DEMO, `select acknowledged_at is null from plat_complaint where id = '${keep.id}'`) === "t", failed);
  const failRem = new ComplaintsService({ db, audit: fakeAudit({ failOn: (e) => e.action === "complaint.reminder" }), jobs: jobs3, clock: clock3, mail: mail3 });
  const m0 = mail3.sent.length;
  const remFailed = await failRem.runAckReminder({ firmId: firmA, complaintId: keep.id }).then(() => "ok", (e: Error) => e.message);
  ok("PF-21 fail (review m4): a reminder run that rolls back sends no mail and records no REMINDER_SENT", /forced/.test(remFailed) && mail3.sent.length === m0 && count("plat_complaint_event", `complaint_id='${keep.id}' and kind='REMINDER_SENT'`) === "0");

  // No personal data in audit or mail (review m5's never-failing test): a named other person, a contact and a summary.
  const NAME = "Zebulon Quartermaine", CONTACT = "zebulon.q@example.org", WORDS = "missed the biometrics appointment";
  const named = await svc3.record(owner, { ...base, subjectKind: "OTHER_PERSON", subjectId: undefined, complainantName: NAME, complainantContact: CONTACT, receivedAt: at3(-1), summary: `Says we ${WORDS}.` });
  ok("PF-21 pass: the named person's name and contact are on the record itself", named.complainantName === NAME && named.complainantContact === CONTACT);
  await clock3.advance(5 * DAY);
  const leak = JSON.stringify([...audit3.entries, ...mail3.sent, ...jobs3.jobs]);
  ok("PF-21 fail (no leak): the reminder for it went out, and no audit line, job payload or mail carries the name, the contact or the summary's words",
    mail3.sent.some((m) => m.text.includes(named.id)) && !leak.includes(NAME) && !leak.includes(CONTACT) && !leak.includes(WORDS), mail3.sent.length);
  ok("PF-21 pass (break m10): the reminder gives the date in the firm's zone (America/Toronto) and a Reply-To of the firm's contact address",
    mail3.sent.filter((m) => m.text.includes(named.id)).every((m) => m.text.includes("America/Toronto") && m.replyTo === sql(DEMO, `select contact_email from platform_firm where id = '${firmA}'`)));

  // A deactivated handler (break m10): the reminder goes to the firm's active Owners and Admins instead.
  const gone = sql(DEMO, `insert into platform_staff (id, firm_id, email, display_name, updated_at) values (gen_random_uuid(), '${firmA}', 'leaver@sample-firm.example.com', 'Leaver', now()) returning id`);
  const orphan = await svc3.record(owner, { ...base, receivedAt: clock3.now().toISOString(), handlerStaffId: gone });
  sql(DEMO, `update platform_staff set status = 'DEACTIVATED', deactivation_reason = 'Left the firm' where id = '${gone}'`);
  const before10 = mail3.sent.length;
  await clock3.advance(5 * DAY);
  const sentTo = mail3.sent.slice(before10).filter((m) => m.text.includes(orphan.id)).map((m) => m.to).sort().join(",");
  const owners = sql(DEMO, `select string_agg(distinct s.email, ',' order by s.email) from platform_staff s join platform_role_grant g on g.firm_id = s.firm_id and g.staff_id = s.id where s.firm_id = '${firmA}' and s.status = 'ACTIVE' and g.ended_at is null and g.role in ('OWNER','ADMIN')`);
  ok("PF-21 fail→pass (break m10): a deactivated handler gets no reminder; the firm's active Owners and Admins do", sentTo === owners && !sentTo.includes("leaver@") && owners.length > 0, { sentTo, owners });

  // Daylight saving in the business-day count (review m5).
  ok("PF-21 pass (review m5, daylight saving): Fri 30 Oct 2026 → Tue 3 Nov 17:00 EST (22:00Z) across the clocks going back; Fri 6 Mar 2026 → Tue 10 Mar 17:00 EDT (21:00Z) across the clocks going forward",
    acknowledgeBy(new Date("2026-10-30T15:00:00Z"), cal).toISOString() === "2026-11-03T22:00:00.000Z" && acknowledgeBy(new Date("2026-03-06T15:00:00Z"), cal).toISOString() === "2026-03-10T21:00:00.000Z");
  ok("PF-21 pass (break m8): a closing time inside a daylight-saving gap lands just after the gap on the same day (Toronto 8 Mar 2026 02:30 → 03:30 EDT)",
    acknowledgeBy(new Date("2026-03-06T15:00:00Z"), { zone: "America/Toronto", hours: [{ day: "SUN", opens: "00:00", closes: "02:30" }, { day: "MON", opens: "09:00", closes: "17:00" }], closedDays: [] }).toISOString() === "2026-03-09T21:00:00.000Z"
    && acknowledgeBy(new Date("2026-03-06T15:00:00Z"), { zone: "America/Toronto", hours: [{ day: "SUN", opens: "00:00", closes: "02:30" }], closedDays: [] }).toISOString() === "2026-03-15T06:30:00.000Z"
    && acknowledgeBy(new Date("2026-03-01T15:00:00Z"), { zone: "America/Toronto", hours: [{ day: "SUN", opens: "00:00", closes: "02:30" }], closedDays: [] }, 1).toISOString() === "2026-03-08T07:30:00.000Z");

  // The list is paged, never cut short (review m6, break m9): 150 overdue complaints in firm B.
  sql(DEMO, `insert into plat_complaint (id, firm_id, subject_kind, complainant_name, received_at, channel, category, summary, handler_staff_id, acknowledge_by, recorded_by, updated_at)
      select gen_random_uuid(), '${firmB}', 'OTHER_PERSON', 'P' || i, timestamptz '2026-10-01T12:00:00Z' + i * interval '1 hour', 'PHONE', 'OTHER', 'Paged', '${S}', timestamptz '2026-10-03T12:00:00Z' + i * interval '1 hour', 'staff:x', now() from generate_series(1, 150) i;
    insert into plat_complaint_event (id, firm_id, complaint_id, kind, at, actor) select gen_random_uuid(), firm_id, id, 'RECEIVED', received_at, 'staff:x' from plat_complaint c where firm_id = '${firmB}' and summary = 'Paged'; select 1`);
  const totalB = Number(count("plat_complaint", `firm_id='${firmB}'`)), overdueB = Number(count("plat_complaint", `firm_id='${firmB}' and status='OPEN' and acknowledged_at is null and acknowledge_by < '${clock3.now().toISOString()}'`));
  const pages: string[][] = []; let cur: string | null | undefined;
  do { const pg = await svc3.list(ownerB, "all", cur ? { cursor: cur } : {}); pages.push(pg.items.map((c) => c.id)); cur = pg.next; } while (cur && pages.length < 10);
  const seen = pages.flat();
  ok(`PF-21 pass (break m9): "all" comes in pages of 100 with a cursor, and the pages together are every complaint of the firm once (${totalB})`,
    pages[0].length === 100 && seen.length === totalB && new Set(seen).size === totalB, pages.map((p) => p.length));
  const od1 = await svc3.list(ownerB, "overdue", { limit: 50 }), od2 = await svc3.list(ownerB, "overdue", { limit: 50, cursor: od1.next! });
  ok("PF-21 pass (break m9): the overdue view starts with the longest overdue (the oldest date first) and pages on in that order",
    od1.items.length === 50 && od1.items[0].acknowledgeBy.toISOString() === "2026-10-03T13:00:00.000Z" && od2.items[0].acknowledgeBy > od1.items[49].acknowledgeBy && overdueB > 100);
  const badPage = await answer(() => svc3.list(ownerB, "all", { limit: 101 })), badCur = await answer(() => svc3.list(ownerB, "all", { cursor: "not-a-cursor" }));
  ok("PF-21 fail (break m9): a page over 100 or a made-up cursor → 422", badPage !== "ok" && badPage.status === 422 && badCur !== "ok" && badCur.status === 422, { badPage, badCur });

  // ======================================================== events to the outbox (FO-13k: complaint.received, complaint.closed)
  const evs = (id: string) => sql(DEMO, `select coalesce(string_agg(type, ',' order by seq), '') from module_event where subject_id = '${id}'`);
  const payloadOf = (id: string, type: string) => JSON.parse(sql(DEMO, `select payload::text from module_event where subject_id = '${id}' and type = '${type}'`));
  ok("PF-21 pass (events): a recorded complaint wrote one complaint.received, its close one complaint.closed, and the note after the close none (the outbox, contracts §0.5)",
    evs(c1.id) === `${EVENT.COMPLAINT_RECEIVED},${EVENT.COMPLAINT_CLOSED}` && evs(c2.id) === EVENT.COMPLAINT_RECEIVED, { c1: evs(c1.id), c2: evs(c2.id) });
  const recvd = payloadOf(c1.id, EVENT.COMPLAINT_RECEIVED), closedEv = payloadOf(c1.id, EVENT.COMPLAINT_CLOSED);
  ok("PF-21 pass (events): the payloads read with the shared shapes (ports/events.ts) and carry the firm, the complaint, the subject and the outcome",
    ComplaintReceived.safeParse(recvd).success && ComplaintClosed.safeParse(closedEv).success && recvd.firmId === firmA && recvd.subjectId === u(500) && closedEv.outcome === "RESOLVED"
    && sql(DEMO, `select firm_id from module_event where subject_id = '${c1.id}' and type = '${EVENT.COMPLAINT_CLOSED}'`) === firmA, { recvd, closedEv });
  ok("PF-21 fail (events): no event payload carries a name, a contact or the summary's words (the named person's complaint included)",
    !/Zebulon|zebulon\.q@|biometrics|study permit|sponsor disputes/.test(sql(DEMO, `select coalesce(string_agg(payload::text, ' '), '') from module_event where type like 'complaint.%'`)) && evs(named.id) === EVENT.COMPLAINT_RECEIVED);
  ok("PF-21 fail (events): a payload with a name in it, or without its complaint id, is refused by the shared shape",
    !ComplaintReceived.safeParse({ ...recvd, complainantName: "Zebulon" }).success && !ComplaintReceived.safeParse({ ...recvd, complaintId: undefined }).success);
  const evBefore = count("module_event", "type like 'complaint.%'");
  const failRec = new ComplaintsService({ db, audit: fakeAudit({ failOn: (e) => e.action === "complaint.record" || e.action === "complaint.close" }), jobs: jobs3, clock: clock3, mail: mail3 });
  const r1 = await failRec.record(owner, { ...base, receivedAt: clock3.now().toISOString() }).then(() => "ok", (e: Error) => e.message);
  const open3 = (await svc3.list(owner, "open")).items[0].id;
  const r2 = await failRec.close(owner, open3, { outcome: "RESOLVED", at: clock3.now().toISOString(), note: "x" }).then(() => "ok", (e: Error) => e.message);
  ok("PF-21 fail (events): a change rolled back by a failing audit writes no event (record and close)", /forced/.test(r1) && /forced/.test(r2) && count("module_event", "type like 'complaint.%'") === evBefore, { r1, r2 });
} finally {
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
