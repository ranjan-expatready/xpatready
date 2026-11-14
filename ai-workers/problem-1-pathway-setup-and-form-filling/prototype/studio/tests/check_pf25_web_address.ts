// PF-25 (rows rev 15, rev 16; P-599, P-600; SA-2-27, SA2-D8, AG-4-16, AG-4-17, AG01-1): each firm's own web address —
// the migration, its database rules, the service (availability, suggestion, the staff-only change with its 90-day
// redirect) and the host routing over real HTTP. Every line of the row's "Done when", each with a passing and a failing
// case. Three scratch databases: "empty" gets every migration (then the Sample seed); "demo" gets every migration before
// PF-25's, then demo-shaped rows and the Sample firms, then PF-25's; "bare" stops before PF-25. The HTTP part starts the
// feature's own controller and host routing in this process on a free port (the app's guard included, a stand-in for the
// single-page app's catch-all added after start-up as main.ts does), on the empty copy. Ports are PF-0p's fakes
// (StaffContext, FakeClock, fakeAudit) and its real interim AuditPort adapter. No browser, no model call (US$0). All
// scratch databases are dropped at the end.
//   tsx studio/tests/check_pf25_web_address.ts
import "reflect-metadata";
import { Controller, Get, Module, Param, Req, Res } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawnSync } from "node:child_process";
import { request } from "node:http";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fakeAudit } from "../ports/audit.ts";
import { FakeClock } from "../ports/clock.ts";
import { fakeStaff } from "../ports/staff.ts";
import { ConfigReadGuard, Db, OpenRead } from "../api/src/core.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { PUBLIC_NOT_FOUND_HTML, PUBLIC_NOT_FOUND_JSON, publicFirmOf, sendPublicNotFound } from "../api/src/platform/web-address/host.ts";
import { WebAddressController, WebAddressHostRouting } from "../api/src/platform/web-address/routes.ts";
import { checkAddressShape, readHost } from "../api/src/platform/web-address/rules.ts";
import { ADDRESS_CHANGE_KEY, WebAddresses } from "../api/src/platform/web-address/service.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), SCHEMA = join(STUDIO, "prisma", "schema");
const NEW = "20261114230000_pf25_web_address";
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const EMPTY = `xr_studio_pf25_empty_${process.pid}`, DEMO = `xr_studio_pf25_demo_${process.pid}`, BARE = `xr_studio_pf25_bare_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const WORK = join(STUDIO, "var", `pf25-check-${process.pid}`);
const DAY = 24 * 60 * 60 * 1000;
const ADDRESSES = `select string_agg(f.key || '=' || coalesce(w.address, '-'), ',' order by f.key) from platform_firm f left join platform_firm_web_address w on w.firm_id = f.id where f.key like 'sample-%'`;

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const psql = (db: string, args: string[]) => execFileSync(join(BIN, "psql"), [urlOf(db), "-v", "ON_ERROR_STOP=1", "-q", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sql = (db: string, q: string) => psql(db, ["-Atc", q]);
const refused = (db: string, q: string, re: RegExp) => { try { sql(db, q); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };
const client = (db: string) => new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(db), options: "-c TimeZone=UTC" }) });
/** The HTTP problem a service call throws: its status and body. */
const problemOf = async (f: () => Promise<unknown>) => { try { await f(); return null; } catch (e) { const x = e as { getStatus?: () => number; getResponse?: () => unknown }; return x.getStatus ? { status: x.getStatus(), body: x.getResponse?.() as Record<string, unknown> } : { status: 0, body: { error: String(e) } }; } };

// prisma migrate diff from a database to the schema folder: the lines that name PF-25's column or table.
function pf25Diff(db: string): string[] {
  mkdirSync(WORK, { recursive: true });
  const cfg = join(WORK, `prisma.${db}.config.ts`);
  writeFileSync(cfg, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(SCHEMA)}, migrations: { path: ${JSON.stringify(MIG)} }, datasource: { url: ${JSON.stringify(urlOf(db))} } });\n`);
  const r = spawnSync(join(STUDIO, "node_modules", ".bin", "prisma"), ["migrate", "diff", "--config", cfg, "--from-config-datasource", "--to-schema", SCHEMA, "--script"], { cwd: STUDIO, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`migrate diff: ${r.stdout}${r.stderr}`);
  return `${r.stdout}`.split("\n").filter((l) => /web_address|address_history/.test(l));
}

/** One HTTP request with any Host header (fetch forbids setting Host). */
function http(port: number, host: string, path: string, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
    const r = request({ host: "127.0.0.1", port, path, method: "GET", headers: { host, ...headers } }, (res) => {
      let body = ""; res.setEncoding("utf8"); res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    r.on("error", reject); r.end();
  });
}

const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
for (const db of [EMPTY, DEMO, BARE]) { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", db]); execFileSync(join(BIN, "createdb"), [...PG, db]); }
const dbs: PrismaClient[] = [];
let app: NestExpressApplication | null = null;
try {
  ok(`PF-25: the migration has its own stamp, later than every other migration (P-600 (4); newest: ${all.at(-1)})`,
    all.at(-1) === NEW && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));

  // ---------------------------------------------------------------------------- migration on empty and demo-data copies
  for (const d of all.filter((x) => x < NEW)) psql(BARE, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-25 fail: before PF-25's migration there is no address table and the schema differs (the diff names it)",
    sql(BARE, `select count(*) from pg_tables where tablename in ('platform_firm_web_address', 'platform_firm_address_history')`) === "0" && pf25Diff(BARE).length > 0);
  for (const d of all) psql(EMPTY, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-25 pass: every migration applies to an empty database; migrate diff names no PF-25 column or table", pf25Diff(EMPTY).length === 0, pf25Diff(EMPTY));
  ok("PF-25 fail: the migration does not apply twice", (() => { try { psql(EMPTY, ["-f", join(MIG, NEW, "migration.sql")]); return false; } catch (e) { return /already exists/.test(String((e as { stderr?: string }).stderr ?? e)); } })());
  const db = client(EMPTY); dbs.push(db);
  await seedSampleFirms(db);
  ok("PF-25 pass: on the empty copy the Sample firms seeded after the migration get their key as their address (sample-firm, sample-solo)",
    sql(EMPTY, ADDRESSES) === "sample-firm=sample-firm,sample-solo=sample-solo");
  const firmX = sql(EMPTY, `insert into platform_firm (id, key, operating_name, country_code, status, contact_email, updated_at) values (gen_random_uuid(), 'firm-x', 'X', 'CA', 'ACTIVE', 'x@firm-x.example.com', now()) returning id`);
  ok("PF-25 fail: a firm that is not a Sample firm gets no address from its key (its address comes from sign-up)", sql(EMPTY, `select count(*) from platform_firm_web_address where firm_id='${firmX}'`) === "0");

  for (const d of all.filter((x) => x < NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  const W = "00000000-0000-4000-8000-000000000001", CMB = "00000000-0000-4000-8000-000000000002";
  sql(DEMO, `set session_replication_role = replica;
    insert into runtime_case (id, workspace_id, combination_id, client_actor_id, created_by, firm_key, case_number) values ('00000000-0000-4000-8000-000000000010', '${W}', '${CMB}', 'user-P', 'user-O', 'sample-firm', 'C-2026-00001');
    insert into audit_event (id, workspace_id, actor, action, entity, summary) values (gen_random_uuid(), '${W}', 'user-R', 'case.open', 'runtime_case', 'Sample');`);
  const pre = client(DEMO); dbs.push(pre);
  await seedSampleFirms(pre);
  const demoRows = `select (select count(*) from runtime_case) || ':' || (select count(*) from audit_event) || ':' || (select count(*) from platform_firm) || ':' || (select count(*) from platform_staff)`;
  const before = sql(DEMO, demoRows);
  for (const d of all.filter((x) => x >= NEW)) psql(DEMO, ["-f", join(MIG, d, "migration.sql")]);
  ok("PF-25 pass: on a demo-data copy the migration gives the Sample firms their key as their address and leaves every other row as it was",
    sql(DEMO, demoRows) === before && sql(DEMO, ADDRESSES) === "sample-firm=sample-firm,sample-solo=sample-solo", [before, sql(DEMO, demoRows), sql(DEMO, ADDRESSES)]);
  ok("PF-25 pass: migrate diff after it on the demo-data copy names no PF-25 column or table", pf25Diff(DEMO).length === 0, pf25Diff(DEMO));

  // ------------------------------------------------------------------------------------------- the database's own rules
  const setX = (a: string) => `insert into platform_firm_web_address (firm_id, address, set_by, updated_at) values ('${firmX}', '${a}', 'system:sign-up', now()) returning address`;
  ok("PF-25 fail (database): Maple, -maple, ma, www, xn--maple and maple- are refused as an address; maple is accepted",
    ["Maple", "-maple", "ma", "www", "xn--maple", "maple-"].every((a) => refused(EMPTY, setX(a), /platform_firm_web_address_allowed/)) && sql(EMPTY, setX("maple")) === "maple");
  ok("PF-25 fail (database): an address does not change without its redirect record, never moves firm and is never removed",
    refused(EMPTY, `update platform_firm_web_address set address = 'maple-two' where firm_id = '${firmX}'`, /changes only with its redirect record/)
    && refused(EMPTY, `update platform_firm_web_address set firm_id = (select id from platform_firm where key='sample-solo') where firm_id = '${firmX}'`, /never moves to another firm/)
    && refused(EMPTY, `delete from platform_firm_web_address where firm_id = '${firmX}'`, /never removed/) && refused(EMPTY, `truncate platform_firm_web_address cascade`, /never removed/));
  ok("PF-25 fail (database): a history row must name the firm's address as it is (no made-up hold on another firm's address)",
    refused(EMPTY, `insert into platform_firm_address_history (id, firm_id, old_address, new_address, until, reason, changed_by) values (gen_random_uuid(), '${firmX}', 'sample-firm', 'maple-two', now() + interval '90 days', 'Sample reason', 'staff:t')`, /is not this firm's web address/));
  ok("PF-25 pass (database): the history row first, then the address, in one transaction, is accepted",
    sql(EMPTY, `begin; insert into platform_firm_address_history (id, firm_id, old_address, new_address, until, reason, changed_by) values (gen_random_uuid(), '${firmX}', 'maple', 'maple-two', now() + interval '90 days', 'Sample reason', 'staff:t'); update platform_firm_web_address set address = 'maple-two' where firm_id = '${firmX}'; commit; select address from platform_firm_web_address where firm_id = '${firmX}'`) === "maple-two");
  ok("PF-25 fail (database): the address history is insert-only (update, delete and truncate refused)",
    refused(EMPTY, `update platform_firm_address_history set until = now() + interval '1 day'`, /insert_only/) && refused(EMPTY, `delete from platform_firm_address_history`, /insert_only/) && refused(EMPTY, `truncate platform_firm_address_history`, /insert_only/));
  ok("PF-25 fail (database): another firm cannot take an address held for a redirect; the firm that gave it up can take it back",
    refused(EMPTY, `begin; insert into platform_firm_address_history (id, firm_id, old_address, new_address, until, reason, changed_by) select gen_random_uuid(), firm_id, 'sample-solo', 'maple', now() + interval '1 day', 'Sample', 'staff:t' from platform_firm_web_address where address = 'sample-solo'; update platform_firm_web_address set address = 'maple' where address = 'sample-solo'; commit`, /held for another firm's redirect/)
    && refused(EMPTY, `with f as (insert into platform_firm (id, key, operating_name, country_code, contact_email, updated_at) values (gen_random_uuid(), 'firm-y', 'Y', 'CA', 'y@y.example.com', now()) returning id) insert into platform_firm_web_address (firm_id, address, set_by, updated_at) select id, 'maple', 'system:sign-up', now() from f`, /held for another firm's redirect/)
    && sql(EMPTY, `begin; insert into platform_firm_address_history (id, firm_id, old_address, new_address, until, reason, changed_by) values (gen_random_uuid(), '${firmX}', 'maple-two', 'maple', now() + interval '90 days', 'Sample back', 'staff:t'); update platform_firm_web_address set address = 'maple' where firm_id = '${firmX}'; commit; select address from platform_firm_web_address where firm_id = '${firmX}'`) === "maple");

  // ------------------------------------------------------------------------------------ availability and suggestion
  const clock = new FakeClock(new Date());
  const audit = fakeAudit();
  const svc = new WebAddresses({ db, audit, clock });
  const real = new WebAddresses({ db, audit: auditEvent, clock });
  const firmA = sql(EMPTY, `select id from platform_firm where key='sample-firm'`), firmB = sql(EMPTY, `select id from platform_firm where key='sample-solo'`);
  ok("PF-25 pass: a free address (maple-law) is offered", JSON.stringify(await svc.availability("maple-law")) === JSON.stringify({ address: "maple-law", available: true }));
  const refusals = await Promise.all(["Maple-Law", "-maple-law", "ma", "www"].map((a) => svc.availability(a)));
  ok("PF-25 fail: Maple-Law, -maple-law, ma and www are refused, each with its plain reason",
    refusals.map((r) => !r.available && `${r.reason}:${r.message}`).join(" | ") === [
      "uppercase:Use lower-case letters only (maple, not Maple).", "hyphen-edge:A web address cannot start or end with a hyphen.",
      "short:Use at least 3 characters.", "reserved:This address is kept for ExpatReady's own pages. Choose another."].join(" | "), refusals);
  ok("PF-25 pass: a refused shape still gets a usable suggestion (Maple-Law → maple-law; www → www-firm)",
    (refusals[0] as { suggestion: string }).suggestion === "maple-law" && (refusals[3] as { suggestion: string }).suggestion === "www-firm");
  const taken = await svc.availability("maple");
  ok("PF-25 fail: a taken address (maple, firm-x's) → \"taken\" with a free suggestion (maple-2)",
    !taken.available && taken.reason === "taken" && taken.message === "This address is taken." && taken.suggestion === "maple-2" && (await svc.availability("maple-2")).available, taken);
  ok("PF-25 pass: an address held for firm-x's redirect (maple-two) is \"taken\" for everyone else, and free for firm-x itself",
    !(await svc.availability("maple-two")).available && (await svc.availability("maple-two", firmX)).available);
  ok("PF-25 pass: a suggestion from the operating name drops accents and legal words (Érable Immigration Inc. → erable-immigration)",
    (await svc.suggest("Érable Immigration Inc.")).suggestion === "erable-immigration");
  ok("PF-25 fail: no suggestion from an empty or over-long name", (await svc.suggest("  ")).suggestion === null && (await svc.suggest("x".repeat(201))).suggestion === null);

  // ------------------------------------------------------------------------------ the staff-only change (system/firm:address)
  const ownerKeys = sql(EMPTY, `select string_agg(permission_key, ',') from platform_role_permission where role = 'OWNER'`).split(",");
  const firmOwner = fakeStaff({ firmId: firmA, firmKey: "sample-firm", roles: ["OWNER", "ADMIN"], keys: ownerKeys, duties: ["firm_admin"] });
  const ours = fakeStaff({ roles: [], keys: [ADDRESS_CHANGE_KEY] });
  const addressOf = (firmId: string) => sql(EMPTY, `select coalesce((select address from platform_firm_web_address where firm_id = '${firmId}'), '-')`);
  const historyCount = () => sql(EMPTY, `select count(*) from platform_firm_address_history where firm_id = '${firmA}'`);
  const p403 = await problemOf(() => svc.change(firmOwner, firmA, { address: "sample-law", reason: "We renamed the firm" }));
  ok("PF-25 fail: a firm's own staff (its Owner, every agent/* key) changing the address → 403, nothing written, no audit line",
    p403?.status === 403 && addressOf(firmA) === "sample-firm" && historyCount() === "0" && audit.entries.length === 0, p403);
  const p422 = await problemOf(() => svc.change(ours, firmA, { address: "sample-law", reason: "  " }));
  ok("PF-25 fail: ExpatReady staff with no reason → 422 naming the reason field, nothing written",
    p422?.status === 422 && typeof (p422.body.fields as Record<string, string>)?.reason === "string" && historyCount() === "0", p422);
  const failing = new WebAddresses({ db, audit: fakeAudit({ failOn: (e) => e.action === "firm.web_address.changed" }), clock });
  ok("PF-25 fail: a failed audit line rolls the whole change back (address, redirect record)",
    (await problemOf(() => failing.change(ours, firmA, { address: "sample-law", reason: "Renamed after the merger" })))?.status === 0
    && addressOf(firmA) === "sample-firm" && historyCount() === "0");
  const changedAt = clock.now().getTime();
  const res = await real.change(ours, firmA, { address: "sample-law", reason: "Renamed after the merger" });
  const line = sql(EMPTY, `select actor || '|' || action || '|' || entity_key || '|' || (detail->>'oldAddress') || '|' || (detail->>'newAddress') || '|' || (detail->>'firmId') from audit_event where action = 'firm.web_address.changed'`);
  ok("PF-25 pass: ExpatReady staff with a reason → changed, one redirect record (until = 90 days on the clock), one audit line by staff:<id>",
    res.address === "sample-law" && res.oldAddress === "sample-firm" && Date.parse(res.redirectUntil!) === changedAt + 90 * DAY
    && sql(EMPTY, `select old_address || '>' || new_address || '|' || reason || '|' || changed_by from platform_firm_address_history where firm_id='${firmA}'`) === `sample-firm>sample-law|Renamed after the merger|staff:${ours.staffId}`
    && line === `staff:${ours.staffId}|firm.web_address.changed|${firmA}|sample-firm|sample-law|${firmA}`, [res, line]);
  const pTaken = await problemOf(() => svc.change(ours, firmB, { address: "sample-firm", reason: "Wants the old name" }));
  ok("PF-25 fail: another firm cannot be given the old address during its 90 days (409 taken, with a suggestion)",
    pTaken?.status === 409 && pTaken.body.code === "WEB_ADDRESS_TAKEN" && typeof pTaken.body.suggestion === "string", pTaken);
  ok("PF-25 fail: a firm's address can be set at sign-up once only (claimAtSignUp refuses a firm that has one)",
    (await problemOf(() => db.$transaction((tx) => svc.claimAtSignUp(tx, firmA, "sample-again", "system:sign-up"))))?.status === 409);

  // ------------------------------------------------------------------------------------------------- host resolution
  ok("PF-25 pass: hosts read case-insensitively, with a port or a trailing dot; reserved names and bare suffixes are ExpatReady's own",
    JSON.stringify(readHost("Sample-Law.LOCALHOST:4400")) === JSON.stringify({ kind: "label", address: "sample-law", suffix: "localhost", port: "4400" })
    && readHost("sample-law.expatready.com.").kind === "label" && ["localhost:4400", "127.0.0.1:4400", "app.expatready.com", "expatready.com", "www.localhost", undefined].every((h) => readHost(h).kind === "main"));
  ok("PF-25 fail: two labels deep, or a label that breaks the rules, is never a firm (a.sample-law.localhost, -x.localhost)",
    readHost("a.sample-law.localhost").kind === "none" && readHost("-x.localhost").kind === "none" && !checkAddressShape("a.b").ok);
  ok("PF-25 pass: the new address serves firm A (its id only)", JSON.stringify(await svc.resolveHost("sample-law.localhost:4400")) === JSON.stringify({ kind: "firm", firmId: firmA, address: "sample-law" }));
  const r0 = await svc.resolveHost("sample-firm.expatready.com");
  await clock.advance({ days: 89, hours: 23 });
  const r89 = await svc.resolveHost("sample-firm.expatready.com");
  await clock.advance({ hours: 2 });
  const r90 = await svc.resolveHost("sample-firm.expatready.com");
  ok("PF-25 pass: the old address redirects to the new one for 90 days on the clock (day 0, day 89 23 h)",
    r0.kind === "redirect" && r0.address === "sample-law" && r89.kind === "redirect", [r0, r89]);
  ok("PF-25 fail: after 90 days the old address answers like an unknown one", r90.kind === "unknown", r90);
  ok("PF-25 fail: an unknown address, and a firm that is not serving (PROVISIONING), answer unknown",
    (await svc.resolveHost("no-such-firm.localhost")).kind === "unknown"
    && (sql(EMPTY, `update platform_firm set status='PROVISIONING' where id='${firmX}' returning 1`) === "1") && (await svc.resolveHost("maple.localhost")).kind === "unknown");
  sql(EMPTY, `update platform_firm set status='ACTIVE' where id='${firmX}'`);
  await clock.set(new Date());

  // ------------------------------------------------------------------------------------------- over HTTP, as the app
  // As FO-3's public API will (its pages are the single-page app, which main.ts serves before any controller): a known
  // slug serves, an unknown one gives the one plain not-found. (Decorators as calls, as in api/src/platform/.)
  type PageRes = { status(n: number): unknown; setHeader(k: string, v: string): unknown; end(b?: string): unknown; json(b: unknown): unknown };
  class StandInPages {
    page(slug: string, req: { path: string; publicFirm?: { firmId: string } }, res: PageRes) {
      const firmId = publicFirmOf(req);
      if (!firmId || slug !== "free-consultation") return sendPublicNotFound(req, res as never);
      res.json({ page: "free-consultation", firmId });
    }
  }
  Controller()(StandInPages);
  const pageDescriptor = Object.getOwnPropertyDescriptor(StandInPages.prototype, "page")!;
  Get("api/public/booking-types/:slug")(StandInPages.prototype, "page", pageDescriptor);
  OpenRead("a visitor on a firm's public page")(StandInPages.prototype, "page", pageDescriptor);
  Param("slug")(StandInPages.prototype, "page", 0); Req()(StandInPages.prototype, "page", 1); Res()(StandInPages.prototype, "page", 2);
  class TestModule {}
  Module({ controllers: [WebAddressController, StandInPages], providers: [{ provide: Db, useValue: db }, { provide: WebAddresses, useValue: svc }, WebAddressHostRouting, { provide: APP_GUARD, useClass: ConfigReadGuard }] })(TestModule);
  app = await NestFactory.create<NestExpressApplication>(TestModule, { logger: ["error"] });
  // The single-page app's catch-all, added after the app is built as main.ts adds it: host routing must still come first.
  app.getHttpAdapter().getInstance().get(/^\/(?!api\/).*/, (_req: unknown, res: { end(b: string): unknown }) => res.end("studio single-page app"));
  await app.listen(0, "127.0.0.1");
  const port = (app.getHttpServer().address() as { port: number }).port;

  const unknownHost = await http(port, `no-such-firm.localhost:${port}`, "/api/public/booking-types/free-consultation");
  const unknownSlug = await http(port, `sample-law.localhost:${port}`, "/api/public/booking-types/no-such-type");
  ok("PF-25 pass: an unknown address gives exactly the answer of an unknown slug (status, type, bytes: \"This page is not available.\")",
    unknownHost.status === 404 && unknownSlug.status === 404 && unknownHost.body === unknownSlug.body && unknownHost.body === PUBLIC_NOT_FOUND_JSON
    && unknownHost.headers["content-type"] === unknownSlug.headers["content-type"], [unknownHost.status, unknownSlug.status, unknownSlug.body.slice(0, 80)]);
  const pageUnknown = await http(port, `no-such-firm.localhost:${port}`, "/book/free-consultation");
  const pageKnown = await http(port, `sample-law.localhost:${port}`, "/book/free-consultation");
  ok("PF-25 pass: a page on an unknown address is the plain not-found page (FO-3's pages show the same for an unknown slug); on a firm's address the page is served",
    pageUnknown.status === 404 && pageUnknown.body === PUBLIC_NOT_FOUND_HTML && /text\/html/.test(String(pageUnknown.headers["content-type"])) && pageKnown.status === 200 && pageKnown.body === "studio single-page app", [pageUnknown.status, pageKnown.status]);
  const pageA = await http(port, `sample-law.localhost:${port}`, "/api/public/booking-types/free-consultation");
  ok("PF-25 pass: firm A's address serves firm A's page", pageA.status === 200 && JSON.parse(pageA.body).firmId === firmA, pageA);
  const tricks = await Promise.all([
    http(port, `sample-law.localhost:${port}`, `/api/public/site?firm=sample-solo&firmId=${firmB}`, { "x-forwarded-host": `sample-solo.localhost:${port}`, "x-firm-key": "sample-solo" }),
    http(port, `sample-solo.localhost:${port}`, "/api/public/site"),
  ]);
  ok("PF-25 fail: firm A's address never serves firm B's page, whatever the query or forwarded headers name; B's address serves B",
    JSON.parse(tricks[0].body).webAddress === "sample-law" && JSON.parse(tricks[1].body).webAddress === "sample-solo", tricks.map((t) => t.body));
  const studioOnFirm = await Promise.all(["/", "/studio", "/api/health", "/assets/../index.html", "/book/%2e%2e/api/health"].map((p) => http(port, `sample-law.localhost:${port}`, p)));
  const studioOnMain = await http(port, `localhost:${port}`, "/studio");
  ok("PF-25 fail: on a firm's address the studio's own pages and API are not served (the plain not-found); on localhost they are, as before",
    studioOnFirm.every((r) => r.status === 404) && studioOnMain.status === 200 && studioOnMain.body === "studio single-page app", studioOnFirm.map((r) => r.status));
  await db.$transaction(async (tx) => { await tx.platformFirmAddressHistory.create({ data: { firmId: firmB, oldAddress: "sample-solo", newAddress: "solo-law", until: new Date(clock.now().getTime() + 90 * DAY), reason: "Sample rename", changedBy: `staff:${ours.staffId}` } }); await tx.platformFirmWebAddress.update({ where: { firmId: firmB }, data: { address: "solo-law", setBy: `staff:${ours.staffId}` } }); });
  const moved = await http(port, `sample-solo.localhost:${port}`, "/book/free-consultation?ref=email");
  ok("PF-25 pass: an old address answers 301 to the same path and query on the new address",
    moved.status === 301 && moved.headers.location === `http://solo-law.localhost:${port}/book/free-consultation?ref=email`, [moved.status, moved.headers.location]);
  const movedPublic = await http(port, `sample-solo.expatready.com`, "/book");
  ok("PF-25 pass: under expatready.com the redirect is always https", movedPublic.status === 301 && movedPublic.headers.location === "https://solo-law.expatready.com/book", movedPublic.headers.location);
  const avail = await http(port, `localhost:${port}`, "/api/public/web-address/availability?address=sample-law");
  const availOnFirm = await http(port, `sample-law.localhost:${port}`, "/api/public/web-address/availability?address=maple-law");
  ok("PF-25 pass: the availability route answers on ExpatReady's own host with no sign-in (taken, with a suggestion)",
    avail.status === 200 && JSON.parse(avail.body).reason === "taken" && JSON.parse(avail.body).suggestion === "sample-law-2", avail.body);
  ok("PF-25 fail: the availability route is not served on a firm's address (the plain not-found, JSON form)", availOnFirm.status === 404 && availOnFirm.body === PUBLIC_NOT_FOUND_JSON, availOnFirm.body);
  const siteOnMain = await http(port, `localhost:${port}`, "/api/public/site");
  ok("PF-25 fail: /api/public/site on ExpatReady's own host names no firm (the plain not-found)", siteOnMain.status === 404 && siteOnMain.body === PUBLIC_NOT_FOUND_JSON);
} finally {
  await app?.close().catch(() => undefined);
  for (const d of dbs) await d.$disconnect().catch(() => undefined);
  for (const db of [EMPTY, DEMO, BARE]) spawnSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", db], { stdio: "ignore" });
  rmSync(WORK, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
