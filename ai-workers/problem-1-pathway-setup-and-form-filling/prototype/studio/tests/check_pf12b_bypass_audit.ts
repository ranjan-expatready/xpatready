// PF-12b part 1 (QA-499; R1.4 "every use writes an audit line"; P-607, P-571 (1), AG-1-45): every bypass use that crosses
// firms writes one platform.bypass audit_event line per firm it touches, in that firm's transaction, or is refused.
// DW1 the outbox sweep, the demo reset and the demo inbox on the two Sample firms (one line per firm, in that firm's
// trail only); DW2 a line that cannot be written refuses the use and rolls its work back (500 in plain words); DW3 every
// BYPASS_USES entry names how it audits; DW4 sign-up verify writes its line under the new firm in the transaction that
// creates it; DW7 QA-499's count matches the uses × firms touched, and an own-firm door adds none. A scratch database
// with every migration and the Sample firms, through the app's walled pool (xr_app); dropped at the end. No server, no
// browser, no model call (US$0).
//   tsx studio/tests/check_pf12b_bypass_audit.ts
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FakeClock } from "../ports/clock.ts";
import { fakeAudit } from "../ports/audit.ts";
import { fakeBilling } from "../ports/billing.ts";
import { fakeFiles } from "../ports/files.ts";
import { fakeJobs } from "../ports/jobs.ts";
import { fakeMail } from "../ports/mail.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { appDatabaseUrl, asBypass, asJob, BYPASS_USES, currentBypass, mayRunInside, BypassNotRecorded, BypassRefused, FirmScopeError, inRequest, onBypassAudit, touchFirm, touchingAudit, WalledPool } from "../api/src/platform/firm-scope.ts";
import { FirmSignUp, type SignUpPorts } from "../api/src/platform/firms/signup.ts";
import { LocalSignUp } from "../api/src/platform/firms/signup-identity.ts";
import { resetSampleFirmSettings } from "../api/src/platform/identity/demo-reset.ts";
import { PlatformInbox } from "../api/src/platform/messages/demo-inbox.ts";
import { Messages, type MessagesDeps } from "../api/src/platform/messages/send/messages.ts";
import { requestScope } from "../api/src/platform/observability/log.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { WebAddressCatchUp } from "../api/src/platform/web-address/routes.ts";
import { StorageWatch, STORAGE_DAILY_QUEUE } from "../api/src/platform/entitlements/storage.ts";
import { LIMIT_CHANGE_KEY, PlanLimitChanges } from "../api/src/platform/entitlements/limit-changes.ts";
import { fakeStaff } from "../ports/staff.ts";
import { fakeAlerts } from "../ports/alert.ts";
import { localEmail } from "../api/src/platform/messages/channels/email/local.ts";
import { ConsentStore } from "../api/src/platform/messages/consent/consent-store.ts";
import { channelsOf } from "../api/src/platform/messages/send/channels.ts";
import { MessagesMail } from "../api/src/platform/messages/send/mail.ts";
import { JsonLog, useLog } from "../api/src/platform/observability/log.ts";
import { BACKOFF_MAX_MS, CATCH_UP_USE, ProspectWonPoll, touchedEach, type WonBackoff } from "../api/src/case-clients/live.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const BIN = ["/opt/homebrew/opt/postgresql@18/bin", "/usr/lib/postgresql/18/bin"].find((b) => existsSync(join(b, "psql"))) ?? "";
const PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf12b_${process.pid}`, URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const sql = (q: string) => execFileSync(join(BIN, "psql"), [URL, "-X", "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
/** QA-499's count: the platform.bypass lines of one use, as "firm:count" in firm order. */
const lines = (use: string) => sql(`select coalesce(string_agg(f || ':' || n, ',' order by f), '') from (select detail->>'firmId' as f, count(*) as n from audit_event where action = 'platform.bypass' and detail->>'use' = '${use}' group by 1) x`);
const total = () => Number(sql(`select count(*) from audit_event where action = 'platform.bypass'`));
const errOf = async (f: () => Promise<unknown>) => { try { await f(); return null; } catch (e) { return e; } };
const plain = (e: unknown) => e instanceof BypassNotRecorded && e.getStatus() === 500 && /could not be written to the firm's activity record, so nothing was done/.test(JSON.stringify(e.getResponse()));

/** DW3's reader: the entries whose audit field is missing or says nothing (also run on a broken copy of the list). */
export function unaudited(list: Readonly<Record<string, object>>): string[] {
  return Object.entries(list as Record<string, { audit?: unknown }>).filter(([, e]) => !(e.audit === "per-firm" || e.audit === "platform")).map(([k]) => k);
}

/** Brief PF-12b1m's run check: a use whose class does not match what running it wrote ("per-firm" with no line, or
 *  "none: …" with a line) is named. `wrote` is the use's platform.bypass lines from one run. */
export function misclassed(use: string, entry: { audit?: unknown }, wrote: number): string | null {
  if (entry.audit === "per-firm") return wrote > 0 ? null : `${use}: "per-firm" but running it wrote no platform.bypass line (no touchFirm)`;
  if (entry.audit === "platform") return wrote > 0 ? null : `${use}: "platform" but running it wrote no platform.bypass line (no touchPlatform)`;
  return `${use}: no audit`;
}

// ---------------------------------------------------------------------------------------------------------- DW3 first
ok("PF-12b DW3 pass: every BYPASS_USES entry names how it audits (per-firm or platform; PF-12b part 3: no none)", unaudited(BYPASS_USES).length === 0, unaudited(BYPASS_USES));
const broken = { ...BYPASS_USES, "pf12b.new-use": { why: "a use added without its audit field", routes: [] } };
ok("PF-12b DW3 fail: a use added without `audit`, or with any none reason (PF-12b part 3: every use writes a line), is named by the check", JSON.stringify(unaudited(broken)) === '["pf12b.new-use"]' && unaudited({ x: { audit: "none: a long reason that the check accepted before PF-12b part 3, now refused" } }).length === 1);
const PER_FIRM = ["cases.prospect-won.catch-up", "job:messages.outbox_sweep", "job:platform.entitlements.storage_daily", "platform.demo.inbox", "platform.demo.reset", "platform.entitlements.limit-change", "platform.firms.signup", "platform.web-address.catch-up"];
const DOORS = ["fo.booking.public-page", "fo.booking.self-service", "fo.sales.web-form", "platform.identity.authenticate", "platform.identity.invitation", "platform.identity.sign-in", "platform.web-address.host"];
const perFirm = Object.entries(BYPASS_USES).filter(([, e]) => e.audit === "per-firm").map(([k]) => k).sort();
ok("PF-12b DW3 pass: the eight cross-firm uses audit per firm; the seven own-firm doors are off the list (PF-12b part 2: narrow lookups, tests/check_pf12b_doors.ts)", JSON.stringify(perFirm) === JSON.stringify(PER_FIRM) && DOORS.every((d) => !(d in BYPASS_USES)), perFirm);
const PLATFORM = ["job:messages.send", "job:platform.signup.purge", "platform.account.mail"];
ok("PF-12b3 pass: the registry is the 8 per-firm uses plus 3 platform uses, nothing else; the re-encrypt job left it (it refuses a job with no firm before any read)",
  JSON.stringify(Object.entries(BYPASS_USES).filter(([, e]) => e.audit === "platform").map(([k]) => k).sort()) === JSON.stringify(PLATFORM) && Object.keys(BYPASS_USES).length === PER_FIRM.length + PLATFORM.length && !("job:platform.secret_box.reencrypt" in BYPASS_USES), Object.keys(BYPASS_USES));

execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]);
execFileSync(join(BIN, "createdb"), [...PG, DB]);
const clients: PrismaClient[] = [], pools: WalledPool[] = [];
try {
  for (const d of readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort()) execFileSync(join(BIN, "psql"), [URL, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL, options: "-c TimeZone=UTC" }) }); clients.push(owner);
  await seedSampleFirms(owner);
  const [A, B] = sql(`select id from platform_firm order by key`).split("\n");
  sql(`insert into msg_firm (firm_id) values ('${A}'), ('${B}') on conflict do nothing`);
  const INBOX = "client-a@sample.example.com";
  for (const f of [A, B]) {
    sql(`insert into msg_outbox (id, firm_id, channel, address, rendered_hash, class, state, created_at, updated_at) values (gen_random_uuid(), '${f}', 'EMAIL', 'stuck@sample.example.com', repeat('a', 64), 'TRANSACTIONAL', 'QUEUED', now() - interval '10 minutes', now())`);
    sql(`insert into msg_outbox (id, firm_id, channel, address, rendered_hash, class, state, provider_id, created_at, updated_at, sent_at) values (gen_random_uuid(), '${f}', 'EMAIL', '${INBOX}', repeat('a', 64), 'TRANSACTIONAL', 'SENT', 'local:${f}', now(), now(), now())`);
  }
  // The app's own client: xr_app through the walled pool (PF-12), as the API connects.
  const pool = new WalledPool({ connectionString: appDatabaseUrl(URL, {}), options: "-c TimeZone=UTC" }); pools.push(pool);
  const db = new PrismaClient({ adapter: new PrismaPg(pool) }); clients.push(db);
  const clock = new FakeClock(new Date());
  const jobs = fakeJobs(clock);
  const messages = new Messages({ db, jobs, clock } as unknown as MessagesDeps);
  const inbox = new PlatformInbox(db as never, fakeFiles(), () => true);
  const inboxRoute = { method: "GET", path: "/api/demo/platform-inbox" };

  // ---------------------------------------------------------------------------------------------------------- DW1
  // The known limit (review m1, break M1): the line is written where a use calls touchFirm; a use that reads without the call
  // writes none. The guard is the named list, one use at a time (no use inside another) and this suite, per use.
  ok("PF-12b DW1 fail (QA-499's count before any use runs, and the known limit): a cross-firm read that never calls touchFirm writes no line, so QA-499's count reads 0", total() === 0 && (await asBypass("platform.demo.reset", () => db.platformStaff.findMany({ select: { firmId: true } }))).length >= 2 && total() === 0);
  const queued = await requestScope.run({ correlationId: "job:0b12b000-0000-4000-8000-00000000a001", firmId: () => undefined }, () => asJob("messages.outbox_sweep", () => messages.sweep()));
  ok("PF-12b DW1 pass: the outbox sweep writes one platform.bypass line per firm it read, then queues both firms' rows", lines("job:messages.outbox_sweep") === [A, B].sort().map((f) => `${f}:1`).join(",") && queued === 2, { lines: lines("job:messages.outbox_sweep"), queued });
  const line = sql(`select actor || '|' || entity || '|' || entity_key || '|' || (detail->>'method') || '|' || (detail->>'correlationId') from audit_event where action = 'platform.bypass' and detail->>'use' = 'job:messages.outbox_sweep' and detail->>'firmId' = '${A}'`);
  ok("PF-12b DW1 pass: the line names the use, the actor (system:<use>), the firm, the method (none outside a request) and the correlation id", line === `system:job:messages.outbox_sweep|platform_firm|${A}|none|job:0b12b000-0000-4000-8000-00000000a001`, line);
  await resetSampleFirmSettings(db);
  ok("PF-12b DW1 pass: the demo reset writes one line per Sample firm, each in its own firm's trail", lines("platform.demo.reset") === [A, B].sort().map((f) => `${f}:1`).join(","), lines("platform.demo.reset"));
  await requestScope.run({ correlationId: "0b12b000-0000-4000-8000-00000000c0de", firmId: () => undefined }, () => inRequest(inboxRoute, () => inbox.list(INBOX, undefined)));
  ok("PF-12b DW1 pass: the demo inbox writes one line per firm whose mail it listed, with the method and the request's correlation id", lines("platform.demo.inbox") === [A, B].sort().map((f) => `${f}:1`).join(",") && sql(`select string_agg(distinct (detail->>'method') || ':' || (detail->>'correlationId'), ',') from audit_event where detail->>'use' = 'platform.demo.inbox'`) === "GET:0b12b000-0000-4000-8000-00000000c0de");
  ok("PF-12b DW1 pass/fail: firm A's trail shows its own lines only, never firm B's (and B's the same)", sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'firmId' = '${A}' and entity_key <> '${A}'`) === "0" && sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'firmId' = '${A}'`) === "3" && sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'firmId' = '${B}'`) === "3");
  sql(`delete from platform_firm_web_address where firm_id in ('${A}', '${B}')`);
  const catchUp = new WebAddressCatchUp(db as never); catchUp.onApplicationBootstrap(); const caught = await catchUp.done;
  ok("PF-12b DW1 pass (catch-up): the start-up catch-up writes one line per firm it gave an address, in that firm's own transaction (with its firm.web_address.set line)", caught?.results.length === 2 && lines("platform.web-address.catch-up") === [A, B].sort().map((f) => `${f}:1`).join(",") && sql(`select count(*) from (select xmin from audit_event where detail->>'firmId' = '${A}' and action in ('firm.web_address.set', 'platform.bypass') and (action <> 'platform.bypass' or detail->>'use' = 'platform.web-address.catch-up') group by xmin) x`) === "1", { caught, lines: lines("platform.web-address.catch-up") });
  const tx0 = {}; const rec = fakeAudit(); const was0 = onBypassAudit(rec);
  await asBypass("platform.demo.reset", async () => { await touchFirm(tx0, A); await touchFirm(tx0, A); await touchFirm(tx0, B); });
  await touchFirm({}, A);   // outside a bypass use: nothing crossed a wall
  onBypassAudit(was0);
  ok("PF-12b DW1 pass: one line per firm and transaction (a second touch of the same firm adds none); outside a bypass use touchFirm writes nothing", rec.entries.length === 2 && rec.entries.map((e) => e.firmId).join(",") === `${A},${B}`, rec.entries);

  // AUD-1m beside PF-12b: AuditPort also takes a case-side line (a workspace, no firm). The wrapping port cannot name a
  // firm for it, so on a bypass use it is refused before the inner port sees it; a firm's line still gets its touch.
  const inner = fakeAudit(), wrapped = touchingAudit(inner), wasT = onBypassAudit(fakeAudit());
  const caseLine = { workspaceId: "0b12b000-0000-4000-8000-0000000000c5", actor: "system:studio", action: "answered", entity: "case", entityKey: null, summary: "Sample case line" };
  const caseErr = await errOf(() => asBypass("platform.demo.reset", () => wrapped.record({}, caseLine)));
  await wrapped.record({}, caseLine);   // outside a bypass use: passes through
  await asBypass("platform.demo.reset", () => wrapped.record({}, { firmId: A, actor: "system:test", action: "platform.setting.change", entity: "platform_firm_setting", entityKey: "platform.language", summary: "Sample firm line" }));
  onBypassAudit(wasT);
  ok("PF-12b fail (AUD-1m's case line): the wrapping port refuses a case-side line on a bypass use (it names no firm to write the line for), passes it through outside one, and still passes a firm's line", caseErr instanceof FirmScopeError && inner.caseEntries.length === 1 && inner.entries.length === 1 && inner.entries[0]?.firmId === A, { caseErr: String(caseErr), cases: inner.caseEntries.length, entries: inner.entries.length });

  // Break M1, M2, m3, m4 (the breaker's report, screens/PF-12b/break-report.md).
  // PF-12b part 2: the doors left the list, so two uses that may both run outside a request stand in (each allowed alone).
  const nested = await errOf(() => asBypass("platform.demo.reset", () => asBypass("job:messages.outbox_sweep", () => db.platformStaff.findMany())));
  ok("PF-12b fail (break M1): a bypass use inside another is refused before any query (it would cross under the outer use's lines)", nested instanceof BypassRefused && /may not run inside/.test(String(nested)), String(nested));
  const signupRoute = { method: "POST", path: "/api/public/signup" };
  let pair: unknown;
  try { pair = await inRequest(signupRoute, () => asBypass("platform.firms.signup", async () => { const inner = await asBypass("platform.account.mail", () => currentBypass()); return [inner, currentBypass()]; })); } catch (e) { pair = String(e); }   // review n1: a regression prints FAIL
  ok("PF-12b pass (the one named exception, PF-19p): platform.account.mail (touches no firm's rows) runs inside platform.firms.signup under its own name, and sign-up's use comes back after it", JSON.stringify(pair) === JSON.stringify(["platform.account.mail", "platform.firms.signup"]), pair);
  const notNamed = await errOf(() => asBypass("platform.firms.signup", () => asBypass("job:messages.outbox_sweep", () => 1)));   // PF-12b part 2: a use allowed here alone
  const reversed = await errOf(() => inRequest(signupRoute, () => asBypass("platform.account.mail", () => asBypass("platform.firms.signup", () => 1))));
  const named = Object.entries(BYPASS_USES).filter(([, e]) => e.inside?.length).map(([k, e]) => `${k}<${e.inside!.join("|")}`);
  ok("PF-12b fail (the exception stays narrow): another use inside sign-up, and sign-up inside platform.account.mail, are both refused; only that one pair is named, on a platform use",
    notNamed instanceof BypassRefused && /may not run inside/.test(String(notNamed)) && reversed instanceof BypassRefused && JSON.stringify(named) === JSON.stringify(["platform.account.mail<platform.firms.signup"]) && BYPASS_USES["platform.account.mail"].audit === "platform", { notNamed: String(notNamed), reversed: String(reversed), named });
  const mail = BYPASS_USES["platform.account.mail"];
  ok("PF-12b fail (review m1): a per-firm use that names an outer use may still not run inside it; nor may a platform use inside a use it does not name",
    mayRunInside(mail, "platform.firms.signup") && !mayRunInside({ ...mail, audit: "per-firm" }, "platform.firms.signup") && !mayRunInside(mail, "platform.demo.inbox") && !mayRunInside({ audit: mail.audit }, "platform.firms.signup"));
  const spoof = fakeAudit(), wasS = onBypassAudit(spoof);
  await requestScope.run({ correlationId: "Client.A.passport.lost", firmId: () => undefined }, () => asBypass("platform.demo.reset", async () => { await touchFirm({}, A); }));
  await requestScope.run({ correlationId: "job:Client.A.passport.lost", firmId: () => undefined }, () => asBypass("platform.demo.reset", async () => { await touchFirm({}, B); }));
  await requestScope.run({ correlationId: "0b12b000-0000-4000-8000-00000000beef", firmId: () => undefined }, () => asBypass("platform.demo.reset", async () => { await touchFirm({}, A); }));
  const clientErr = await errOf(() => asBypass("platform.demo.reset", () => touchFirm(db, A)));
  const tx4 = {};
  await asBypass("platform.demo.reset", () => Promise.all([touchFirm(tx4, A), touchFirm(tx4, A), touchFirm(tx4, A)]));
  onBypassAudit(wasS);
  ok("PF-12b fail (break M2): a caller's X-Request-Id that is not our id shape (free text, or free text after job:) is never kept in the trail (null); a uuid is kept", spoof.entries[0]?.detail.correlationId === null && spoof.entries[1]?.detail.correlationId === null && spoof.entries[2]?.detail.correlationId === "0b12b000-0000-4000-8000-00000000beef", spoof.entries.map((e) => e.detail));
  ok("PF-12b fail (break m3): touchFirm refuses the client in place of a transaction (its line would commit alone)", clientErr instanceof FirmScopeError, String(clientErr));
  ok("PF-12b pass (break m4): three touches of one firm at the same moment in one transaction write one line", spoof.entries.length === 4, spoof.entries.length);

  // Main's PF-15 use (Lead B, 6999415832): the daily storage measure lists every firm on its bypass use, then measures each
  // in its own firm scope. Run as the job runner runs it (asJob opens the use; daily() names it again inside).
  const watch = new StorageWatch({ db, files: { usedBytes: async () => 0 }, mail: null, now: () => clock.now().getTime() });
  const ran = await asJob(STORAGE_DAILY_QUEUE, () => watch.daily());
  ok("PF-12b DW1 pass (PF-15's storage_daily): the daily measure writes one line per firm it listed and measures each, also when asJob already opened its use", lines("job:platform.entitlements.storage_daily") === [A, B].sort().map((f) => `${f}:1`).join(",") && ran.measured === 2 && ran.failed === 0, { lines: lines("job:platform.entitlements.storage_daily"), ran });
  const was15 = onBypassAudit(fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }));
  const ran2 = await asJob(STORAGE_DAILY_QUEUE, () => watch.daily());
  onBypassAudit(was15);
  ok("PF-12b DW2 fail (PF-15's storage_daily): a firm whose line cannot be written is not measured and counts as failed; the others are measured", ran2.measured === 1 && ran2.failed === 1, ran2);

  // Main's PF-15 part 2 use (Lead B, 7005749630): our team's limit change on a plan reaches every firm live on it. Both
  // Sample firms are put on one plan for the case, then firm B goes back to its own.
  const LC = "platform.entitlements.limit-change", ours = fakeStaff({ keys: [LIMIT_CHANGE_KEY] }, clock);
  sql(`update platform_subscription set status = 'ENDED' where firm_id = '${B}' and status <> 'ENDED'; insert into platform_subscription (id, firm_id, plan_id, status, updated_at) select gen_random_uuid(), '${B}', id, 'ACTIVE', now() from platform_plan where code = 'team'`);
  const changeRows = () => sql(`select count(*) from platform_limit_change`);
  const wasLC = onBypassAudit(fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }));
  const lcErr = await errOf(() => new PlanLimitChanges({ db, audit: auditEvent, mail: null }).change(ours, { plan: "team", metric: "active_individual_cases", value: 140, reason: "Sample lowering, PF-12b" }));
  onBypassAudit(wasLC);
  ok("PF-12b DW2 fail (PF-15's limit change): when one firm's line cannot be written the change is refused in plain words and nothing is stored (no change row, no line)", plain(lcErr) && changeRows() === "0" && lines(LC) === "", { lcErr: String(lcErr), rows: changeRows(), lines: lines(LC) });
  const changed = await new PlanLimitChanges({ db, audit: auditEvent, mail: null }).change(ours, { plan: "team", metric: "active_individual_cases", value: 140, reason: "Sample lowering, PF-12b" });
  ok("PF-12b DW1 pass (PF-15's limit change): one limit change on a plan with two live firms writes one platform.bypass line to each firm, in the change's own transaction (the same transaction id as its plan.limit.lowered lines)", changed.firms.length === 2 && lines(LC) === [A, B].sort().map((f) => `${f}:1`).join(",")
    && sql(`select count(distinct xmin::text) from audit_event where (action = 'platform.bypass' and detail->>'use' = '${LC}') or (action = 'plan.limit.lowered' and entity_key = '${changed.changeId}')`) === "1", { firms: changed.firms, lines: lines(LC) });
  const heldMail = fakeMail({ clock }), ownersB = Number(sql(`select count(*) from platform_staff s join platform_role_grant g on g.staff_id = s.id and g.firm_id = s.firm_id and g.role = 'OWNER' and g.ended_at is null where s.firm_id = '${B}' and s.status = 'ACTIVE'`));
  const wasN = onBypassAudit(fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }));
  const held = await new PlanLimitChanges({ db, audit: auditEvent, mail: heldMail }).sendNotices(changed.changeId);
  onBypassAudit(wasN);
  ok("PF-12b DW2 fail (PF-15's limit change): at notice time a firm whose line cannot be written is sent nothing and its Owners are listed as failed; the other firm's Owners are told, and nothing is thrown (the change is already committed)", ownersB >= 1 && held.failed.length === ownersB && held.sent >= 1 && heldMail.sent.length === held.sent && heldMail.sent.every((m) => "firmId" in m && m.firmId === A), { held, ownersB, to: heldMail.sent.map((m) => ("firmId" in m ? m.firmId : "platform account")) });
  const noticeMail = fakeMail({ clock });
  const told = await new PlanLimitChanges({ db, audit: auditEvent, mail: noticeMail }).sendNotices(changed.changeId);
  ok("PF-12b DW1 pass (PF-15's limit change): sending the notices reads both firms' Owners, so each firm gets one more line", told.sent >= 2 && told.failed.length === 0 && lines(LC) === [A, B].sort().map((f) => `${f}:2`).join(","), { told, lines: lines(LC) });
  sql(`update platform_subscription set status = 'ENDED' where firm_id = '${B}' and status <> 'ENDED'; insert into platform_subscription (id, firm_id, plan_id, status, updated_at) select gen_random_uuid(), '${B}', id, 'ACTIVE', now() from platform_plan where code = 'solo'`);

  // ---------------------------------------------------------------------------------------------------------- DW2
  const refusing = fakeAudit({ failOn: (e) => e.action === "platform.bypass" });
  sql(`insert into platform_firm_setting (firm_id, key, value, changed_by, changed_at) values ('${A}', 'platform.language', '"fr"', 'test', now()) on conflict (firm_id, key) do update set value = '"fr"'`);
  const settingLines = () => sql(`select count(*) from audit_event where action = 'platform.setting.change'`);
  const beforeLines = settingLines(), beforeJobs = jobs.jobs.length;
  const was = onBypassAudit(refusing);
  const resetErr = await errOf(() => resetSampleFirmSettings(db));
    await clock.advance({ hours: 2 });   // a new hour: the sweep's job keys are new, so only the refusal can stop them
  const sweepErr = await errOf(() => asJob("messages.outbox_sweep", () => messages.sweep()));
  const inboxErr = await errOf(() => inRequest(inboxRoute, () => inbox.list(INBOX, undefined)));
  onBypassAudit(was);
  ok("PF-12b DW2 fail: a line that cannot be written refuses the demo reset; firm A's setting is unchanged and no setting line is stored (rolled back)", plain(resetErr) && sql(`select value::text from platform_firm_setting where firm_id = '${A}' and key = 'platform.language'`) === '"fr"' && settingLines() === beforeLines, { resetErr: String(resetErr), value: sql(`select value::text from platform_firm_setting where firm_id = '${A}' and key = 'platform.language'`) });
  ok("PF-12b DW2 fail: the sweep is refused and queues nothing (a job fails and is retried)", sweepErr instanceof BypassNotRecorded && (jobs.jobs.length) === beforeJobs, { sweepErr: String(sweepErr) });
  const onlyB = fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }), wasB = onBypassAudit(onlyB);
  await clock.advance({ hours: 1 });
  const jobsBefore = jobs.jobs.length, partErr = await errOf(() => asJob("messages.outbox_sweep", () => messages.sweep()));
  onBypassAudit(wasB);
  const newJobs = jobs.jobs.slice(jobsBefore).map((j) => (j.payload as { firmId: string }).firmId);
  ok("PF-12b DW2 fail (break m6): when only firm B's line fails, B's rows are not queued, A's are (with A's line), and the sweep then fails", partErr instanceof BypassNotRecorded && JSON.stringify(newJobs) === JSON.stringify([A]) && onlyB.entries.map((e) => e.firmId).join(",") === A, { partErr: String(partErr), newJobs, lines: onlyB.entries.map((e) => e.firmId) });
  ok("PF-12b DW2 fail: a request (the demo inbox) answers 500 in plain words, and no line was stored for it", plain(inboxErr) && lines("platform.demo.inbox") === [A, B].sort().map((f) => `${f}:1`).join(","), String(inboxErr));
  await resetSampleFirmSettings(db);
  ok("PF-12b DW2 pass: with the trail writable again the same reset runs (A's setting back to its default, one more line per firm)", sql(`select value::text from platform_firm_setting where firm_id = '${A}' and key = 'platform.language'`) === '"en"' && lines("platform.demo.reset") === [A, B].sort().map((f) => `${f}:2`).join(","));

  // ---------------------------------------------------------------------------------------------------------- DW4
  const identity = new LocalSignUp(() => clock.now());
  const ports: SignUpPorts = { audit: auditEvent, billing: fakeBilling({ prices: [] }), identity, mail: fakeMail({ clock }), clock, appUrl: "https://app.expatready.test" };
  const s = new FirmSignUp(db, ports);
  const p = await s.plans(); await clock.advance({ seconds: 5 });
  const form = { email: "owner@pf12b.example.com", password: "correct horse battery staple 77", firmName: "PF12b Immigration", countryCode: "CA", acceptedTerms: p.terms.map((t) => t.id), formStamp: p.formStamp, planCode: p.defaultPlan };
  // Lead 15 on #2814: sign-up's no-firm steps each write one firm-less line, with the pending id and never the email.
  const stepLines = (step: string) => sql(`select coalesce(string_agg(coalesce(firm_id::text, 'null') || '|' || coalesce(detail->>'key', 'none') || '|' || (position('@' in detail::text || summary) > 0)::text, ',' order by at), '') from audit_event where action = 'platform.bypass' and detail->>'use' = 'platform.firms.signup' and detail->>'step' = '${step}'`);
  const failAll = { record: async () => { throw new Error("audit store down (Sample)"); } };
  const wasSN = onBypassAudit(failAll);
  await s.signUp({ ...form, email: "blocked@pf12b3.example.com" }, "10.12.0.20"); await s.settled();
  onBypassAudit(wasSN);
  ok("PF-12b3 fail (sign-up, new email): when the line cannot be written, no pending sign-up is stored (lookup, provider call and pending row are one step)", sql(`select count(*) from platform_signup_pending where email = 'blocked@pf12b3.example.com'`) === "0" && stepLines("signup.new-email") === "");
  await s.signUp(form, "10.12.0.1"); await s.settled();
  const pendingId = sql(`select id from platform_signup_pending where email = '${form.email}' and used_at is null`);
  ok("PF-12b3 pass (sign-up, new email): the staff lookup and the pending row write one platform.bypass line with no firm, keyed by the pending id, with no email in it", stepLines("signup.new-email") === `null|${pendingId}|false`, stepLines("signup.new-email"));
  // Re-review 2 M1 of #2814: the provider call stays outside the transaction, so a burst larger than the pool (10) is stored whole.
  // A provider that, like the local one sending its email through MessagesMail, needs a pooled connection of its own while
  // it works: a sign-up transaction held across it would hold the pool (10) while 16 such calls wait for an 11th.
  const slowIdentity = Object.assign(Object.create(identity), { register: async (r: Parameters<LocalSignUp["register"]>[0]) => { await db.$transaction(async (tx) => { await tx.$queryRaw`select 1 as ok from pg_sleep(0.3)`; }); return identity.register(r); } }) as LocalSignUp;
  const sSlow = new FirmSignUp(db, { ...ports, identity: slowIdentity });
  const pBurst = await sSlow.plans(); await clock.advance({ seconds: 5 });
  const burst = Array.from({ length: 16 }, (_, i) => `burst${i}@pf12b3.example.com`);
  await Promise.all(burst.map((email, i) => sSlow.signUp({ ...form, email, formStamp: pBurst.formStamp }, `10.13.${i}.1`))); await sSlow.settled();
  ok("PF-12b3 pass (re-review 2 M1): 16 new-email sign-ups at once, more than the pool, are all stored, each with its one firm-less line",
    sql(`select count(*) from platform_signup_pending where email like 'burst%@pf12b3.example.com' and used_at is null`) === "16" && stepLines("signup.new-email").split(",").length === 17, { stored: sql(`select count(*) from platform_signup_pending where email like 'burst%@pf12b3.example.com'`) });
  const link = identity.sent.find((m) => m.to === form.email)?.text ?? "";
  const token = /token=([A-Za-z0-9_-]{43})/.exec(link)?.[1] ?? "", code = /code=(\d{6})/.exec(link)?.[1] ?? "";
  const firmsBefore = sql(`select count(*) from platform_firm`), signupBefore = lines("platform.firms.signup");
  const badErr = await errOf(() => s.verify({ token: "x".repeat(43), code }, "10.12.0.2"));
  ok("PF-12b DW4 fail: a refused verify (an unknown link) makes no firm and writes no firm's line", badErr !== null && sql(`select count(*) from platform_firm`) === firmsBefore && lines("platform.firms.signup") === signupBefore, String(badErr));
  ok("PF-12b3 pass (verify, unknown link): one platform.bypass line with no firm and no key (no pending row), and the answer is the same 404", (badErr as { getStatus?: () => number })?.getStatus?.() === 404 && stepLines("signup.verify-refused") === "null|none|false", stepLines("signup.verify-refused"));
  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
  const wrongErr = await errOf(() => s.verify({ token, code: wrong }, "10.12.0.21"));
  ok("PF-12b3 pass (verify, wrong code): 400 CODE_WRONG and one more firm-less line, keyed by the pending id", (wrongErr as { getStatus?: () => number })?.getStatus?.() === 400 && stepLines("signup.verify-refused") === `null|none|false,null|${pendingId}|false`, stepLines("signup.verify-refused"));
  const wasV = onBypassAudit(failAll);
  const vUnknown = await errOf(() => s.verify({ token: "y".repeat(43), code }, "10.12.0.22")), vWrong = await errOf(() => s.verify({ token, code: wrong }, "10.12.0.23"));
  onBypassAudit(wasV);
  ok("PF-12b3 fail (verify): when the line cannot be written, an unknown link and a wrong code both answer 500 in plain words (BypassNotRecorded), and no line is written",
    plain(vUnknown) && plain(vWrong) && stepLines("signup.verify-refused").split(",").length === 2, { vUnknown: String(vUnknown), vWrong: String(vWrong) });
  const was4 = onBypassAudit(refusing);
  const rolled = await errOf(() => s.verify({ token, code }, "10.12.0.3"));
  onBypassAudit(was4);
  ok("PF-12b DW4 fail: when the new firm's line cannot be written, the verify is refused and the firm is not made (the same transaction)", plain(rolled) && sql(`select count(*) from platform_firm`) === firmsBefore && sql(`select count(*) from platform_signup_pending where email = '${form.email}' and used_at is null`) === "1", String(rolled));
  const made = await s.verify({ token, code }, "10.12.0.4");
  const newFirm = sql(`select id from platform_firm where key = '${made.firmKey}'`);
  ok("PF-12b DW4 pass: a verify writes its one line under the new firm, in the transaction that creates it (the same transaction id as firm.created)", lines("platform.firms.signup") === `${newFirm}:1` && sql(`select count(distinct xmin::text) from audit_event where detail->>'firmId' = '${newFirm}' and action in ('firm.created', 'platform.bypass')`) === "1", { lines: lines("platform.firms.signup"), newFirm });
  const staffA = sql(`select email from platform_staff where firm_id = '${A}' order by email limit 1`);
  const p2 = await s.plans(); await clock.advance({ seconds: 5 });
  await s.signUp({ ...form, email: staffA, formStamp: p2.formStamp }, "10.12.0.5"); await s.settled();
  ok("PF-12b DW4 pass: a sign-up with firm A's staff email (the lookup read A's staff) writes A's line before the 'already have an account' email", lines("platform.firms.signup").split(",").includes(`${A}:1`), lines("platform.firms.signup"));

  // Re-review 8, M1: the demo's Sample seed (demo.ts, on "platform.demo.reset") crosses firms too: one line per Sample firm.
  const seedBefore = lines("platform.demo.reset"), totalBefore = total();
  await asBypass("platform.demo.reset", () => seedSampleFirms(db));
  const seedAfter = lines("platform.demo.reset");
  await seedSampleFirms(db);   // outside a bypass use: no line
  ok("PF-12b DW1 pass (re-review 8 M1): the demo's Sample seed on its bypass use writes one line per Sample firm; the same seed outside a bypass use writes none",
    seedAfter === [A, B].sort().map((f) => `${f}:${Number(seedBefore.split(",").find((x) => x.startsWith(f))?.split(":")[1] ?? 0) + 1}`).join(",") && total() === totalBefore + 2, { seedBefore, seedAfter, totalBefore, total: total() });

  // ---------------------------------------------------------------------------------------------------------- DW7
  const before7 = total();
  const purged = await asJob("platform.signup.purge", () => s.purgeExpired());   // the own-firm doors left the bypass (PF-12b part 2): their DW7 is in check_pf12b_doors.ts
  const purgeLine = sql(`select coalesce(firm_id::text, 'null') || '|' || actor || '|' || entity_key || '|' || (detail->>'method') from audit_event where action = 'platform.bypass' and detail->>'use' = 'job:platform.signup.purge' order by at desc limit 1`);
  ok("PF-12b3 pass (job:platform.signup.purge): the purge writes one platform.bypass line with no firm, naming the use and the actor system:<use>", typeof purged === "number" && total() === before7 + 1 && purgeLine === "null|system:job:platform.signup.purge|job:platform.signup.purge|none", { before7, after: total(), purgeLine });
  sql(`insert into platform_signup_pending (id, email, firm_name, country_code, plan_code, identity_subject, terms_version_ids, terms_accepted_at, token_hash, created_at, expires_at) values (gen_random_uuid(), 'expired@pf12b3.example.com', 'F', 'CA', 'team', 's', array[(select id from platform_terms_version limit 1)]::uuid[], now(), 'pf12b3-expired', now() - interval '25 hours', now() - interval '1 hour')`);
  const pendingBefore = sql(`select count(*) from platform_signup_pending`);
  const failPort = { record: async () => { throw new Error("audit store down (Sample)"); } }, wasF = onBypassAudit(failPort);
  const purgeErr = await errOf(() => asJob("platform.signup.purge", () => s.purgeExpired()));
  onBypassAudit(wasF);
  ok("PF-12b3 fail (job:platform.signup.purge): when the line cannot be written the purge does not happen (BypassNotRecorded, nothing deleted)", plain(purgeErr) && sql(`select count(*) from platform_signup_pending`) === pendingBefore && Number(pendingBefore) > 0 && total() === before7 + 1, { purgeErr: String(purgeErr), pendingBefore });
  const expected = { "job:messages.outbox_sweep": 2, "platform.demo.reset": 6, "platform.demo.inbox": 2, "platform.firms.signup": 21, "platform.web-address.catch-up": 2, "job:platform.entitlements.storage_daily": 2, "platform.entitlements.limit-change": 4, "job:platform.signup.purge": 1 };
  const byUse = Object.fromEntries(sql(`select detail->>'use' || '=' || count(*) from audit_event where action = 'platform.bypass' group by detail->>'use' order by 1`).split("\n").filter(Boolean).map((l) => l.split("=")).map(([k, v]) => [k, Number(v)]));
  ok("PF-12b DW7 pass: QA-499's count equals the uses × firms touched (sweep 2, reset 2 × 2 + the demo seed 2, inbox 2, sign-up 2 + its no-firm steps 19 (new email 1 + the burst 16, an unknown link, a wrong code), catch-up 2, storage_daily 2, limit change 2 + its notices 2, the purge 1 with no firm: PF-12b part 3), no door among them", JSON.stringify(byUse) === JSON.stringify(Object.fromEntries(Object.entries(expected).sort())) && !DOORS.some((d) => d in byUse), byUse);

  // ------------------------------------------------------------------------- brief PF-12b1m: PF-19p's two new uses
  // PF-12b part 3: both are "platform" uses (they read and write only PLATFORM_ACCOUNT rows, no firm) and each writes one
  // firm-less platform.bypass line. Run after DW7 so its count stays the uses × firms of the other uses. Through the walled pool (xr_app), as the API runs.
  const NEW_USES = ["job:messages.send", "platform.account.mail"] as const;
  ok("PF-12b1m pass: job:messages.send and platform.account.mail each name audit \"platform\", and the check reads them as audited",
    NEW_USES.every((u) => BYPASS_USES[u]?.audit === "platform") && !NEW_USES.some((u) => unaudited(BYPASS_USES).includes(u)),
    NEW_USES.map((u) => BYPASS_USES[u]?.audit));
  const stripped = Object.fromEntries(NEW_USES.map((u) => { const { audit: _gone, ...rest } = BYPASS_USES[u]; return [u, rest]; }));
  ok("PF-12b1m fail: the same two entries with no `audit` are both named by the check", JSON.stringify(unaudited({ ...BYPASS_USES, ...stripped }).filter((u) => (NEW_USES as readonly string[]).includes(u)).sort()) === JSON.stringify([...NEW_USES].sort()), unaudited({ ...BYPASS_USES, ...stripped }));
  const pfiles = fakeFiles(), pjobs = fakeJobs(clock);
  const pm = new Messages({ db, consent: new ConsentStore(auditEvent, clock), files: pfiles, jobs: pjobs, alerts: () => fakeAlerts(), channels: channelsOf([["EMAIL", localEmail]]), clock } as unknown as MessagesDeps);
  await pm.register();
  const pmail = new MessagesMail({ db, messages: pm, files: pfiles } as never);
  /** Every firm's rows a message use could reach (its outbox and events, and the firm-scoped audit trail), as one hash. */
  const firmRows = () => sql(`select md5(coalesce((select string_agg(id::text || state::text || coalesce(state_reason, '') || updated_at::text, ',' order by id) from msg_outbox where firm_id is not null), '') || '|' || coalesce((select string_agg(id::text, ',' order by id) from msg_event where firm_id is not null), '') || '|' || (select count(*) from audit_event where firm_id is not null))`);
  const lines0 = total(), firm0 = firmRows(), platformTo = "new.owner@pf12b1m.example.com";
  const sentP = await inRequest({ method: "POST", path: "/api/public/signup/verify" }, () => pmail.send({ platformAccount: true, to: platformTo, replyTo: "ignored@example.com", subject: "Confirm your email", text: "Your code is 654321.", class: "TRANSACTIONAL", idempotencyKey: "signup:pf12b1m-1" } as never));
  const rowP = await owner.msgOutbox.findUniqueOrThrow({ where: { id: sentP.messageId } });
  const mailWrote = total() - lines0, mailFirm = firmRows();
  const nullLines = (use: string) => sql(`select count(*) || '|' || count(*) filter (where firm_id is null and actor = 'system:${use}') from audit_event where action = 'platform.bypass' and detail->>'use' = '${use}' and at > now() - interval '1 hour'`);
  const mailLines = nullLines("platform.account.mail");
  ok("PF-12b3 pass (platform.account.mail): a sign-up verification email writes its PLATFORM_ACCOUNT row (no firm) and exactly one platform.bypass line with no firm, and touches no firm's row",
    rowP.audience === "PLATFORM_ACCOUNT" && rowP.firmId === null && rowP.state === "QUEUED" && mailWrote === 1 && mailLines.split("|")[0] === mailLines.split("|")[1] && mailFirm === firm0 && misclassed("platform.account.mail", BYPASS_USES["platform.account.mail"], mailWrote) === null,
    { audience: rowP.audience, firmId: rowP.firmId, mailWrote, mailLines, same: mailFirm === firm0 });
  const sendJob = pjobs.jobs.find((j) => (j.payload as { outboxId?: string }).outboxId === sentP.messageId);
  const delivered = await asJob("messages.send", () => pm.deliver(null, sentP.messageId));
  const sendWrote = total() - lines0 - mailWrote;
  ok("PF-12b3 pass (job:messages.send): the platform job (no firm) sends that PLATFORM_ACCOUNT row, writes one platform.bypass line with no firm, and touches no firm's row",
    sendJob?.name === "messages.send" && sendJob.firmId === null && delivered === "sent" && (await owner.msgOutbox.findUniqueOrThrow({ where: { id: sentP.messageId } })).state === "SENT"
      && sendWrote === 1 && /^(\d+)\|\1$/.test(nullLines("job:messages.send")) && firmRows() === firm0 && misclassed("job:messages.send", BYPASS_USES["job:messages.send"], sendWrote) === null,
    { job: sendJob, delivered, sendWrote, same: firmRows() === firm0 });
  ok("PF-12b1m fail: a stand-in that says \"per-firm\" on either use (which calls no touchFirm) is named by the run check, and so is one with no audit",
    NEW_USES.every((u) => misclassed(u, { ...BYPASS_USES[u], audit: "per-firm" }, 0) !== null) && misclassed("job:messages.send", stripped["job:messages.send"] as { audit?: unknown }, 0) !== null
      && misclassed("platform.demo.inbox", BYPASS_USES["platform.demo.inbox"], 2) === null && misclassed("x", { audit: "platform" }, 0) !== null);
  // PF-12b3 fail-closed: a line that cannot be written stops each use; nothing it would have written stays.
  const failPort2 = { record: async () => { throw new Error("audit store down (Sample)"); } }, wasF2 = onBypassAudit(failPort2);
  const outboxBefore = sql(`select count(*) from msg_outbox where firm_id is null`), linesF = total();
  const mailErr = await errOf(() => inRequest({ method: "POST", path: "/api/public/signup/verify" }, () => pmail.send({ platformAccount: true, to: "fail.closed@pf12b3.example.com", replyTo: "ignored@example.com", subject: "Confirm your email", text: "Your code is 111111.", class: "TRANSACTIONAL", idempotencyKey: "signup:pf12b3-fail" } as never)));
  const sentQ = await inRequest({ method: "POST", path: "/api/public/signup/verify" }, async () => { onBypassAudit(wasF2); const r = await pmail.send({ platformAccount: true, to: "queued@pf12b3.example.com", replyTo: "ignored@example.com", subject: "Confirm", text: "Code 222222.", class: "TRANSACTIONAL", idempotencyKey: "signup:pf12b3-q" } as never); onBypassAudit(failPort2); return r; });
  const sendErr = await errOf(() => asJob("messages.send", () => pm.deliver(null, sentQ.messageId)));
  onBypassAudit(wasF2);
  ok("PF-12b3 fail (platform.account.mail, job:messages.send): when the line cannot be written, the email's row is not written and the send does not happen (BypassNotRecorded; the row stays QUEUED with no try counted)",
    plain(mailErr) && plain(sendErr) && sql(`select count(*) from msg_outbox where firm_id is null`) === String(Number(outboxBefore) + 1)
      && sql(`select state || '|' || coalesce(state_reason, '') from msg_outbox where id = '${sentQ.messageId}'`) === "QUEUED|" && total() === linesF + 1, { mailErr: String(mailErr), sendErr: String(sendErr), outboxBefore });
  // Review m2: the send's catch path. A provider refusal counts one try in its own transaction, with one firm-less line;
  // an audit port that fails only on the first write (the send's own line) counts no try (BypassNotRecorded is rethrown).
  const sendTo = async (to: string, key: string) => (await inRequest({ method: "POST", path: "/api/public/signup/verify" }, () => pmail.send({ platformAccount: true, to, replyTo: "ignored@example.com", subject: "Confirm", text: "Code 333333.", class: "TRANSACTIONAL", idempotencyKey: key } as never))).messageId;
  const refusedId = await sendTo("refused@example.com", "signup:pf12b3-refused"), linesR = total();
  const refusedErr = await errOf(() => asJob("messages.send", () => pm.deliver(null, refusedId)));
  ok("PF-12b3 pass (job:messages.send, provider refusal): the try is counted with exactly one firm-less line, and the job is retried",
    !!refusedErr && !(refusedErr instanceof BypassNotRecorded) && sql(`select state || '|' || coalesce(state_reason, '') from msg_outbox where id = '${refusedId}'`) === "QUEUED|send failed: try 1 of 5"
      && total() === linesR + 1 && sql(`select count(*) from audit_event where action = 'platform.bypass' and firm_id is null and detail->>'use' = 'job:messages.send' and at > now() - interval '1 minute'`) !== "0", { refusedErr: String(refusedErr), linesR, total: total() });
  const onceId = await sendTo("once@pf12b3.example.com", "signup:pf12b3-once"), linesO = total();
  let calls = 0;
  const failOnce = { record: async (tx: unknown, e: never) => { if (calls++ === 0) throw new Error("audit store down once (Sample)"); await auditEvent.record(tx as never, e); } }, wasO = onBypassAudit(failOnce);
  const onceErr = await errOf(() => asJob("messages.send", () => pm.deliver(null, onceId)));
  onBypassAudit(wasO);
  ok("PF-12b3 fail (job:messages.send, review m2): when the send's own line fails, no try is counted and nothing is written (BypassNotRecorded rethrown before the catch path)",
    plain(onceErr) && calls === 1 && sql(`select state || '|' || coalesce(state_reason, '') from msg_outbox where id = '${onceId}'`) === "QUEUED|" && total() === linesO, { onceErr: String(onceErr), calls });
  // Break m3: a "platform" use in a firm's scope is refused, never written to that firm's trail.
  const linesS = total();
  const scopedErr = await errOf(() => requestScope.run({ correlationId: randomUUID(), firmId: () => A }, () => asJob("platform.signup.purge", () => s.purgeExpired())));
  ok("PF-12b3 fail (break m3): the purge run in a scope that names firm A is refused (BypassNotRecorded) and writes no line on A's trail",
    plain(scopedErr) && total() === linesS, { scopedErr: String(scopedErr), linesS, total: total() });

  // The sweep, both behaviours together: firm B's line fails, firm A's row and one PLATFORM_ACCOUNT row are due.
  await clock.advance({ hours: 1 });   // a new hour: no job key from an earlier sweep is reused
  const ago = new Date(clock.now().getTime() - 3_600_000).toISOString();
  for (const f of [A, B]) sql(`insert into msg_firm (firm_id) values ('${f}') on conflict do nothing; insert into msg_outbox (id, firm_id, channel, address, rendered_hash, class, state, created_at, updated_at) values (gen_random_uuid(), '${f}', 'EMAIL', 'sweep@pf12b1m.example.com', repeat('c', 64), 'TRANSACTIONAL', 'QUEUED', '${ago}', '${ago}')`);
  const platId = sql(`insert into msg_outbox (id, firm_id, audience, channel, address, rendered_hash, class, state, idempotency_key, created_at, updated_at) values (gen_random_uuid(), null, 'PLATFORM_ACCOUNT', 'EMAIL', 'due@pf12b1m.example.com', repeat('b', 64), 'TRANSACTIONAL', 'QUEUED', 'signup:pf12b1m-due', '${new Date(clock.now().getTime() - 3_600_000).toISOString()}', '${new Date(clock.now().getTime() - 3_600_000).toISOString()}') returning id`).split("\n")[0];
  const logged: Record<string, unknown>[] = [], wasLog = useLog(new JsonLog((l) => { try { logged.push(JSON.parse(l) as Record<string, unknown>); } catch { /* not JSON */ } }));
  const sweepRec = fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }), wasSw = onBypassAudit(sweepRec);
  const sjBefore = pjobs.jobs.length;
  const swErr = await errOf(() => asJob("messages.outbox_sweep", () => pm.sweep()));
  onBypassAudit(wasSw); useLog(wasLog);
  const swJobs = pjobs.jobs.slice(sjBefore);
  const firmJobs = swJobs.filter((j) => j.firmId !== null).map((j) => j.firmId), platJobs = swJobs.filter((j) => j.firmId === null);
  ok("PF-12b1m sweep: firm B's line fails, so B is skipped and logged; firm A's row still queues (with A's one line); the PLATFORM_ACCOUNT row is retried as a platform job with no touchFirm; then the sweep throws the first error",
    swErr instanceof BypassNotRecorded && JSON.stringify(firmJobs) === JSON.stringify([A])
      && platJobs.length === 1 && (platJobs[0].payload as { outboxId?: string; platform?: boolean }).outboxId === platId && (platJobs[0].payload as { platform?: boolean }).platform === true && platJobs[0].name === "messages.send"
      && sweepRec.entries.map((e) => e.firmId).join(",") === A
      && logged.some((l) => l.event === "messages_sweep_firm_skipped" && l.firmId === B.toLowerCase()) && !logged.some((l) => l.event === "messages_sweep_firm_skipped" && l.firmId !== B.toLowerCase()),
    { swErr: String(swErr), firmJobs, platJobs, lines: sweepRec.entries.map((e) => e.firmId), logged: logged.filter((l) => String(l.event).startsWith("messages_sweep")) });

  // Merge of main (QA-601, 20 Nov): a firm row the provider refused is queued again once its wait is over. That read crosses
  // firms too, so each firm with a due retry gets its line first, and a firm whose line fails gets no retry queued.
  await clock.advance({ hours: 1 });
  const longAgo = new Date(clock.now().getTime() - 2 * 86_400_000).toISOString();
  sql(`update msg_outbox set state = 'SENT' where state = 'QUEUED'`);   // only the two retry rows below are due
  const retryIds = [A, B].map((f) => sql(`insert into msg_outbox (id, firm_id, channel, address, rendered_hash, class, state, state_reason, created_at, updated_at) values (gen_random_uuid(), '${f}', 'EMAIL', 'retry@pf12b.example.com', repeat('d', 64), 'TRANSACTIONAL', 'QUEUED', 'send failed: try 1 of 5', '${longAgo}', '${longAgo}') returning id`));
  const retryRec = fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }), wasR = onBypassAudit(retryRec);
  const rjBefore = pjobs.jobs.length;
  const rErr = await errOf(() => asJob("messages.outbox_sweep", () => pm.sweep()));
  onBypassAudit(wasR);
  const rJobs = pjobs.jobs.slice(rjBefore).map((j) => (j.payload as { outboxId?: string }).outboxId);
  ok("PF-12b fail (QA-601 retry, merge of main): firm B's line cannot be written, so B's due retry is not queued; firm A's is, after A's one line; the sweep then fails",
    rErr instanceof BypassNotRecorded && JSON.stringify(rJobs) === JSON.stringify([retryIds[0]]) && retryRec.entries.map((e) => e.firmId).join(",") === A, { rErr: String(rErr), rJobs, retryIds, lines: retryRec.entries.map((e) => e.firmId) });
  // No clock step here: the fake runner's own minute sweep would take this hour's keys first.
  // The fake job runner tried the rows meanwhile (the stand-in hash fails delivery): both are put back to a due retry, a later try (a new job key).
  sql(`update msg_outbox set state = 'QUEUED', state_reason = 'send failed: try 2 of 5', updated_at = '${new Date(clock.now().getTime() - 2 * 86_400_000).toISOString()}' where id in ('${retryIds[0]}', '${retryIds[1]}')`);
  const passRec = fakeAudit(), wasP = onBypassAudit(passRec), pjBefore = pjobs.jobs.length;
  await asJob("messages.outbox_sweep", () => pm.sweep());
  onBypassAudit(wasP);
  const pJobs = pjobs.jobs.slice(pjBefore).map((j) => (j.payload as { outboxId?: string }).outboxId).sort();
  ok("PF-12b pass (QA-601 retry, merge of main): with both trails writable, each firm with a due retry gets one line and its retry is queued",
    JSON.stringify(pJobs) === JSON.stringify([...retryIds].sort()) && passRec.entries.map((e) => e.firmId).sort().join(",") === [A, B].sort().join(","), { pJobs, lines: passRec.entries.map((e) => e.firmId) });
  // ------------------------------------------------------------------- CS-K1 part 2's catch-up (merge of main, 20 Nov)
  // cases.prospect-won.catch-up lists every firm's won prospects on the bypass; each firm with a due prospect gets its line
  // once a run, before its clients are made as that firm (case-clients/live.ts touchedEach).
  const madeIn: string[] = [];
  const work = (f: string) => async () => { madeIn.push(f); return f; };
  const wonBefore = lines(CATCH_UP_USE);
  const wonRan = await asBypass(CATCH_UP_USE, async () => { const each = touchedEach(db); return [await each(A, work(A), "pA1"), await each(A, work(A), "pA2"), await each(B, work(B), "pB1")]; });
  ok("PF-12b pass (CS-K1 catch-up): one platform.bypass line per firm with a due prospect, once a run (A's two prospects, one line), then each prospect runs",
    wonBefore === "" && lines(CATCH_UP_USE) === [A, B].sort().map((f) => `${f}:1`).join(",") && wonRan.join(",") === `${A},${A},${B}` && madeIn.length === 3, { lines: lines(CATCH_UP_USE), wonRan });
  const wonRec = fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }), wasW = onBypassAudit(wonRec);
  madeIn.length = 0;
  const wonErrs = await asBypass(CATCH_UP_USE, async () => { const each = touchedEach(db); return Promise.all([errOf(() => each(A, work(A), "pA1")), errOf(() => each(B, work(B), "pB1")), errOf(() => each(B, work(B), "pB2"))]); });
  onBypassAudit(wasW);
  ok("PF-12b fail (CS-K1 catch-up): when firm B's line cannot be written, B's prospects are not taken in (each refused in plain words), A's still are",
    wonErrs[0] === null && plain(wonErrs[1]) && plain(wonErrs[2]) && JSON.stringify(madeIn) === JSON.stringify([A]) && wonRec.entries.map((e) => e.firmId).join(",") === A, { errs: wonErrs.map(String), madeIn });
  ok("PF-12b pass (CS-K1 catch-up): outside the bypass use (a suite or the tool) the same helper writes no line", await (async () => { const n = total(); await touchedEach(db)(A, work(A), "pA1").catch(() => null); return total() === n; })());
  // Break M1 (20 Nov): a prospect that never succeeds must not write a line on every poll (8,640 a day at 10 s).
  let t = 1_000_000; const tNow = () => t, backoff: WonBackoff = new Map();
  const stuck = async () => { throw new Error("a prospect that never succeeds"); };
  const run = () => asBypass(CATCH_UP_USE, async () => { const each = touchedEach(db, backoff, tNow, 10_000); return [await errOf(() => each(A, stuck, "stuck")), await each(B, work(B), "fine")]; });
  const linesOf = (f: string) => Number(sql(`select count(*) from audit_event where action = 'platform.bypass' and detail->>'use' = '${CATCH_UP_USE}' and detail->>'firmId' = '${f}'`));
  const a0 = linesOf(A), b0 = linesOf(B);
  const tries: number[] = [];
  // A day of polls, every 10 s. A poll while the prospect waits writes nothing and tries nothing (the next check proves it),
  // so only the polls where its wait is over are run here, to keep the suite fast.
  for (let k = 0; k < 8640; k++, t += 10_000) { const h = backoff.get(`${A}:stuck`); if (h && h.until > t) continue; const before = linesOf(A); await run(); if (linesOf(A) > before) tries.push(t); }
  const day = linesOf(A) - a0, waits = tries.slice(1).map((x, i) => x - tries[i]);
  ok("PF-12b pass (break M1): a prospect that never succeeds is retried after a doubling wait capped at one hour, so a day of 10 s polls writes about 33 lines to its firm, not 8,640",
    day >= 20 && day <= 40 && waits.slice(0, 3).join(",") === "10000,20000,40000" && Math.max(...waits) <= BACKOFF_MAX_MS + 10_000 && backoff.get(`${A}:stuck`)!.wait === BACKOFF_MAX_MS, { day, waits: waits.slice(0, 12) });
  ok("PF-12b fail (break M1): while firm A's prospect waits, a poll writes no line for A and does not try it; firm B's healthy prospect is tried (and lined) on its runs, and leaves no backoff",
    await (async () => { const n = linesOf(A); const r = await run(); return linesOf(A) === n && r[0] === null && r[1] === B && !backoff.has(`${B}:fine`) && linesOf(B) > b0; })());
  // Review m4 (20 Nov): the app's poller passes its own backoff, kept across ticks. A won event in firm A whose payload names
  // firm B can never be taken (prospect-won.ts refuses it): two ticks in a row write one line to A's trail, not two.
  const W = randomUUID(); sql(`insert into workspace (id, key, label) values ('${W}', 'pf12b-${process.pid}', 'PF-12b suite')`);
  const keyB = sql(`select key from platform_firm where id = '${B}'`), pX = randomUUID();
  const wonPayload = JSON.stringify({ firm_id: B, firm_key: keyB, prospect_id: pX, lead_id: randomUUID(), won_via: "CONVERTED", retainer_id: null, representative_staff_id: null, representative_actor_id: null, owner_staff_id: null, interested_in: null,
    answers: { "person.given_names": "Ana", "person.family_name": "Sample", "person.email": null, "person.phone_number": null, "person.current_residence_country": null }, consent_ids: [], sealed_retainer_sha256: null, type: "INDIVIDUAL", fromStageKey: "new", retainerSigned: false, subject: { subject: "PERSON", personId: randomUUID() } });
  sql(`insert into module_event (id, firm_id, type, subject_id, payload) values (gen_random_uuid(), '${A}', 'prospect.won', '${pX}', '${wonPayload}'::jsonb)`);
  const foStub = { ensureForClient: async () => ({ foPersonId: randomUUID() }), ensureCompanyForClient: async () => ({ foCompanyId: randomUUID() }) };
  const poll = new ProspectWonPoll(db as never, { id: async () => W } as never, foStub as never, undefined);
  const pollA0 = linesOf(A);
  await poll.tick(); const firstTick = linesOf(A) - pollA0, failedFirst = poll.last?.failed.some((f) => f.prospectId === pX);
  await poll.tick(); await poll.tick();
  ok("PF-12b pass/fail (review m4): the app's poller keeps its backoff across ticks: a prospect it can never take writes its firm's line on the first tick only, not on the next two",
    firstTick === 1 && failedFirst === true && linesOf(A) - pollA0 === 1 && sql(`select count(*) from case_client where prospect_id = '${pX}'`) === "0", { firstTick, failedFirst, total: linesOf(A) - pollA0, last: poll.last });
  backoff.set(`${A}:mends`, { until: t - 1, wait: BACKOFF_MAX_MS });
  const mended = await asBypass(CATCH_UP_USE, () => touchedEach(db, backoff, tNow, 10_000)(A, work(A), "mends"));
  ok("PF-12b pass (break M1): a waiting prospect whose wait is over is tried (with its line) and, once it succeeds, leaves the backoff", mended === A && !backoff.has(`${A}:mends`));

  // ------------------------------------------------- sign-up with the real platform account mail (merge of main, 20 Nov)
  // Sign-up's background step runs inside "platform.firms.signup"; its verification email (PF-19p, MessagesMail) opens
  // "platform.account.mail". One bypass use at a time (break M1) must not stop the email: it is written all the same.
  const realMailIdentity = new LocalSignUp(() => clock.now(), pmail);
  const realSignUp = new FirmSignUp(db, { ...ports, identity: realMailIdentity, mail: pmail });
  const pr = await realSignUp.plans(); await clock.advance({ seconds: 5 });
  const realTo = "real.mail@pf12b.example.com";
  await realSignUp.signUp({ ...form, email: realTo, formStamp: pr.formStamp }, "10.12.0.9"); await realSignUp.settled();
  const realRows = sql(`select count(*) from msg_outbox where audience = 'PLATFORM_ACCOUNT' and firm_id is null and address = '${realTo}'`);
  ok("PF-12b pass (sign-up, real mail): the verification email is written as a PLATFORM_ACCOUNT row (no firm) from inside sign-up's background step, and the pending sign-up is stored",
    realRows === "1" && sql(`select count(*) from platform_signup_pending where email = '${realTo}'`) === "1", { realRows });
  const knownTo = sql(`select email from platform_staff where firm_id = '${A}' order by email limit 1`);
  const knownLines = lines("platform.firms.signup");
  const pk = await realSignUp.plans(); await clock.advance({ seconds: 5 });
  await realSignUp.signUp({ ...form, email: knownTo, formStamp: pk.formStamp }, "10.12.0.10"); await realSignUp.settled();
  ok("PF-12b pass (sign-up, real mail): an email already on firm A's staff gets the \"already have an account\" platform email, and firm A gets one more platform.bypass line",
    sql(`select count(*) from msg_outbox where audience = 'PLATFORM_ACCOUNT' and address = '${knownTo}'`) === "1" && lines("platform.firms.signup") !== knownLines, { knownTo, before: knownLines, after: lines("platform.firms.signup") });
  const knownB = sql(`select email from platform_staff where firm_id = '${B}' order by email limit 1`);
  const refuseB = fakeAudit({ failOn: (e) => e.action === "platform.bypass" && e.firmId === B }), wasK = onBypassAudit(refuseB);
  const pb = await realSignUp.plans(); await clock.advance({ seconds: 5 });
  await realSignUp.signUp({ ...form, email: knownB, formStamp: pb.formStamp }, "10.12.0.11"); await realSignUp.settled();
  onBypassAudit(wasK);
  ok("PF-12b fail (review m2): when firm B's line cannot be written, the known-account lookup sends no \"already have an account\" email (the line comes first, P-607)",
    sql(`select count(*) from msg_outbox where address = '${knownB}'`) === "0" && refuseB.entries.length === 0, { knownB, rows: sql(`select count(*) from msg_outbox where address = '${knownB}'`) });
} finally {
  for (const c of clients) await c.$disconnect().catch(() => {});
  for (const p of pools) await p.end().catch(() => {});
  try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]); } catch { /* left for the next run's drop */ }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
