// PF-12b part 2 (QA-499 own-firm half, QA-608; R1.4 map row 4 "every use writes an audit line"; P-607, AG-1-45; brief
// lead-b-front-office:product/design/lead-b-briefs/PF-12b.md "What to build, part 2"): the seven own-firm doors leave the
// bypass. Each finds its firm through a narrow definer lookup (migration pf12b2_door_lookups: firm id only, owned by
// xr_wall_reader, search_path pinned, EXECUTE for xr_app and the bypass role only) and runs as that firm.
// DW5 each door still works as before (pass) and a wrong key or token answers as before (fail), through the real walled
// API on a scratch database (xr_app); none of the seven is on BYPASS_USES or calls asBypass (neither). DW6 the seven
// functions from the catalogue. DW7 the doors write no platform.bypass line and no bypass log line. Every value Sample;
// no browser, no model call (US$0). The scratch database is dropped at the end.
//   tsx studio/tests/check_pf12b_doors.ts
import "reflect-metadata";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { seedSampleFirms } from "../api/src/platform/seed-sample-firms.ts";
import { seedSampleFirmsFrontOffice } from "../api/src/front-office/firm-seed.ts";
import { hashVerifier, issueToken } from "../api/src/front-office/booking/tokens.ts";
import { appDatabaseUrl, asBypass, BYPASS_USES, BypassRefused, inRequest, WalledPool } from "../api/src/platform/firm-scope.ts";
import { PlatformIdentity } from "../api/src/platform/identity/service.ts";
import { PlatformClock } from "../api/src/platform/identity/port.ts";
import { auditEvent } from "../api/src/platform/audit/audit-event.ts";
import { ConsentStore } from "../api/src/platform/messages/consent/consent-store.ts";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations"), NEW = "20261121120000_pf12b2_door_lookups";
const BIN = ["/opt/homebrew/opt/postgresql@18/bin", "/usr/lib/postgresql/18/bin"].find((b) => existsSync(join(b, "psql"))) ?? "";
const PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf12b2_${process.pid}`, urlOf = (user = "xr_studio") => `postgresql://${user}@127.0.0.1:54329/${DB}`;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 600)}` : ""}`); };
const sql = (q: string, user = "xr_studio") => execFileSync(join(BIN, "psql"), [urlOf(user), "-X", "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const refused = (f: () => unknown, re: RegExp) => { try { f(); return false; } catch (e) { return re.test(String((e as { stderr?: string }).stderr ?? e)); } };

const DOORS = ["platform.identity.authenticate", "platform.identity.sign-in", "platform.identity.invitation", "fo.sales.web-form", "fo.booking.public-page", "fo.booking.self-service", "platform.web-address.host", "platform.branding.public"];   // the eighth: PF-13 part 1b's, moved in PF-12b part 3
/** The seven functions, what each returns, and the door it serves. */
const FNS: [string, string][] = [["platform_firm_of_key(text)", "uuid"], ["platform_staff_firm(uuid, text)", "uuid"], ["platform_invitation_firm(text)", "uuid"], ["platform_staff_email_taken(text)", "boolean"],
  ["fo_sales_web_form_firm(text)", "uuid"], ["fo_booking_token_firm(uuid, text)", "uuid"], ["platform_web_address_firm(text, timestamp with time zone)", "uuid"]];

// ------------------------------------------------------------------------------------------- neither: off the list
ok("PF-12b DW5 neither: none of the seven doors is on BYPASS_USES", DOORS.every((d) => !(d in BYPASS_USES)), DOORS.filter((d) => d in BYPASS_USES));
const code = execFileSync("git", ["grep", "-n", "asBypass(", "--", "api/src"], { cwd: STUDIO, encoding: "utf8" });
ok("PF-12b DW5 neither: no code calls asBypass with one of the seven doors' names", !DOORS.some((d) => code.includes(`"${d}"`)), code.split("\n").filter((l) => DOORS.some((d) => l.includes(`"${d}"`))));
const refusedNow = await Promise.all(DOORS.map((d) => inRequest({ method: "GET", path: "/api/public/forms/abc" }, () => asBypass(d, () => 1)).then(() => false, (e) => e instanceof BypassRefused)));
ok("PF-12b DW5 fail: asking the bypass for any of the seven doors by name is now refused (BypassRefused) before any query", refusedNow.every(Boolean), refusedNow);

execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]);
execFileSync(join(BIN, "createdb"), [...PG, DB]);
const clients: PrismaClient[] = [], pools: WalledPool[] = [];
try {
  const all = readdirSync(MIG).filter((d) => /^\d{14}_/.test(d)).sort();
  ok(`PF-12b DW6: the migration has its own stamp, later than every migration before it and unique (rows rev 15.2, 16.7: never "the newest of all"; before it: ${all.filter((d) => d < NEW).at(-1)})`, all.includes(NEW) && (all.filter((d) => d < NEW).at(-1) ?? "") < NEW && all.filter((d) => d.slice(0, 14) === NEW.slice(0, 14)).length === 1, all.slice(-3));
  const text = readFileSync(join(MIG, NEW, "migration.sql"), "utf8").replace(/^\s*--.*$/gm, "");
  ok("PF-12b DW6: the migration only creates the seven functions and sets their owner and grants (no table, column, policy or row)", [...text.matchAll(/CREATE FUNCTION (\w+)/g)].length === 7 && !/\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|POLICY|TYPE|ROLE)\b|\b(INSERT|UPDATE|DELETE)\b/i.test(text));
  for (const d of all) execFileSync(join(BIN, "psql"), [urlOf(), "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });
  const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlOf(), options: "-c TimeZone=UTC" }) }); clients.push(owner);
  await seedSampleFirms(owner);
  await seedSampleFirmsFrontOffice(owner);
  const [A, B] = sql(`select id from platform_firm order by key`).split("\n");   // sample-firm, sample-solo
  const keyOf = (f: string) => sql(`select key from platform_firm where id = '${f}'`);

  // ------------------------------------------------------------------------------------------------------ DW6
  const cat = (fn: string) => sql(`select r.rolname || '|' || p.prosecdef || '|' || array_to_string(p.proconfig, ',') || '|' || pg_get_function_result(p.oid) || '|' || has_function_privilege('public', p.oid, 'EXECUTE') || '|' || has_function_privilege('xr_app', p.oid, 'EXECUTE') || '|' || has_function_privilege('xr_staff_bypass', p.oid, 'EXECUTE') || '|' || (select count(*) from aclexplode(p.proacl) a where a.privilege_type = 'EXECUTE' and a.grantee not in (p.proowner, 'xr_app'::regrole, 'xr_staff_bypass'::regrole)) from pg_proc p join pg_roles r on r.oid = p.proowner where p.oid = '${fn}'::regprocedure`);
  const rows = FNS.map(([fn, ret]) => ({ fn, got: cat(fn), want: `xr_wall_reader|true|search_path=pg_catalog, public, pg_temp|${ret}|false|true|true|0` }));
  ok("PF-12b DW6 pass: each of the seven functions is owned by xr_wall_reader, SECURITY DEFINER, search_path pinned (pg_temp last), returns only the firm id (the email check: yes or no); xr_app may run it, and the bypass role (a suite or tool process), and no one else", rows.every((r) => r.got === r.want), rows.filter((r) => r.got !== r.want));
  ok("PF-12b DW6 fail: PUBLIC cannot run any of them, and each name has one function only (no overload to slip in)", rows.every((r) => r.got.split("|")[4] === "false") && FNS.every(([fn]) => sql(`select count(*) from pg_proc where proname = '${fn.slice(0, fn.indexOf("("))}'`) === "1"));
  ok("PF-12b DW6 fail: xr_app cannot alter, rename, re-own or drop any of them (it owns none, and may not become xr_wall_reader)",
    FNS.every(([fn]) => refused(() => sql(`alter function ${fn} set search_path = public`, "xr_app"), /must be owner|permission denied/)
      && refused(() => sql(`drop function ${fn}`, "xr_app"), /must be owner|permission denied/)
      && refused(() => sql(`set role xr_wall_reader`, "xr_app"), /permission denied/)));
  // As xr_app with no firm (a public door before it knows its firm): the walled tables read nothing, the lookups answer.
  const formToken = sql(`select public_token from fo_web_form where firm_id = '${A}' limit 1`);
  ok("PF-12b DW6 pass: as xr_app with no firm, the web form table reads nothing, but the lookup gives the form's firm id (and nothing else)",
    sql(`select count(*) from fo_web_form`, "xr_app") === "0" && sql(`select fo_sales_web_form_firm('${formToken}')`, "xr_app") === A, { n: sql(`select count(*) from fo_web_form`, "xr_app") });
  ok("PF-12b DW6 fail (breaker: a guessed key or token): each lookup answers an unknown key with null, the same as not found",
    sql(`select coalesce(platform_firm_of_key('no-such-firm')::text, 'null') || coalesce(platform_staff_firm('${randomUUID()}', null)::text, 'null') || coalesce(platform_staff_firm(null, 'no-subject')::text, 'null')
      || coalesce(platform_invitation_firm(repeat('0', 64))::text, 'null') || coalesce(fo_sales_web_form_firm('${randomBytes(24).toString("base64url")}')::text, 'null') || coalesce(fo_booking_token_firm('${randomUUID()}', repeat('0', 64))::text, 'null')
      || coalesce(platform_web_address_firm('no-such-address', now())::text, 'null') || platform_staff_email_taken('nobody@pf12b2.example.com')::text`, "xr_app") === "nullnullnullnullnullnullnullfalse");
  ok("PF-12b DW6 fail (breaker: another firm's row through a lookup's return): a lookup returns one value only; a row's other columns are not reachable through it",
    sql(`select count(*) from (select platform_firm_of_key('${keyOf(B)}')) x`, "xr_app") === "1" && refused(() => sql(`select (platform_firm_of_key('${keyOf(B)}')).operating_name`, "xr_app"), /column notation|not a composite|operating_name/i));

  // ---------------------------------------------------------------------------------------- data for the doors
  const wording = await owner.$transaction((tx) => new ConsentStore(auditEvent).publishWording(tx, { firmId: A, channel: "EMAIL", purpose: "MARKETING", locale: "en", text: "Send me news and offers from the firm by email. I can stop at any time. (Sample)", by: "seed:PF-12b2-test" }));
  sql(`update fo_web_form set enabled = true, consent_wording_version_id = '${wording.id}' where firm_id = '${A}'`);
  sql(`insert into platform_firm_web_address (firm_id, address, set_by, updated_at) values ('${A}', 'pf12b2-old', 'system:pf12b2-test', now()) on conflict do nothing`);
  // A change by our staff: the old address redirects to the new one for 90 days (PF-25), read by the host door as the firm.
  sql(`begin; insert into platform_firm_address_history (id, firm_id, old_address, new_address, until, reason, changed_by) values (gen_random_uuid(), '${A}', 'pf12b2-old', 'pf12b2-a', now() + interval '90 days', 'Sample reason', 'staff:t'); update platform_firm_web_address set address = 'pf12b2-a' where firm_id = '${A}'; commit;`);
  const ownerStaff = sql(`select s.id from platform_staff s join platform_role_grant g on g.staff_id = s.id and g.ended_at is null where s.firm_id = '${A}' and g.role = 'OWNER' and s.status = 'ACTIVE' limit 1`);
  const invite = (email: string) => { const tok = randomBytes(32).toString("base64url"); sql(`insert into platform_invitation (id, firm_id, email, roles, token_hash, invited_by, expires_at) values (gen_random_uuid(), '${A}', '${email}', '{OWNER}', '${createHash("sha256").update(tok).digest("hex")}', 'staff:${ownerStaff}', now() + interval '48 hours')`); return tok; };
  const inviteOk = invite("new.person@pf12b2.example.com");
  const otherFirmEmail = sql(`select email from platform_staff where firm_id = '${B}' limit 1`);
  const inviteTaken = invite(otherFirmEmail);
  // A booking of firm B (sample-solo) and its self-service link, written as the owner.
  const bStaff = sql(`select id from platform_staff where firm_id = '${B}' limit 1`);
  const type = sql(`insert into fo_consultation_type (id, firm_id, slug, name, modes, host_staff_ids, minutes, updated_at) values (gen_random_uuid(), '${B}', 'pf12b2', 'Consult (Sample)', '{VIDEO}', '{${bStaff}}', 30, now()) returning id`).split("\n")[0];
  const start0 = new Date(Date.now() + 3 * 86_400_000), end0 = new Date(start0.getTime() + 30 * 60_000);
  const booking = sql(`insert into fo_booking (id, firm_id, type_id, staff_id, mode, starts_at, ends_at, visitor_time_zone, updated_at) values (gen_random_uuid(), '${B}', '${type}', '${bStaff}', (select modes[1] from fo_consultation_type where id = '${type}'), '${start0.toISOString()}', '${end0.toISOString()}', 'America/Toronto', now()) returning id`).split("\n")[0];
  const link = await owner.$transaction((tx) => issueToken(tx, B, booking, end0));
  const badVerifier = `${link.split(".")[0]}.${randomBytes(32).toString("base64url")}`, unknownId = `${randomUUID()}.${link.split(".")[1]}`;

  const [linkId, linkSecret] = link.split(".");
  ok("PF-12b DW6 pass/fail (review m4): the booking link's lookup gives the firm for the token id with its secret's hash, and null for the same id with a wrong hash (the stored hash is never returned)",
    sql(`select fo_booking_token_firm('${linkId}', '${hashVerifier(linkSecret)}')`, "xr_app") === B && sql(`select coalesce(fo_booking_token_firm('${linkId}', repeat('0', 64))::text, 'null')`, "xr_app") === "null");

  // --------------------------------------------------------- DW5 direct: the guard's lookup, as the API runs it (xr_app)
  const pool = new WalledPool({ connectionString: appDatabaseUrl(urlOf(), {}), options: "-c TimeZone=UTC" }); pools.push(pool);
  const db = new PrismaClient({ adapter: new PrismaPg(pool) }); clients.push(db);
  const port = (lookup: object) => ({ via: "local", verify: async () => ({ via: "local", lookup, authTime: Math.floor(Date.now() / 1000), secondStep: true }) });
  const identity = (lookup: object) => new PlatformIdentity(db as never, port(lookup) as never, new PlatformClock());
  const me = await inRequest({ method: "GET", path: "/api/platform/me" }, () => identity({ staffId: ownerStaff }).authenticate("t"));
  ok("PF-12b DW5 pass (platform.identity.authenticate): through xr_app with no firm yet, the guard's lookup finds the staff member's firm and reads them as that firm (roles, keys)", me.firmId === A && me.staffId === ownerStaff && me.roles.includes("OWNER") && me.keys.length > 0, me);
  const unknown = await inRequest({ method: "GET", path: "/api/platform/me" }, () => identity({ staffId: randomUUID() }).authenticate("t")).then(() => null, (e) => ({ s: e.getStatus?.(), b: e.getResponse?.() }));
  const noSub = await inRequest({ method: "GET", path: "/api/platform/me" }, () => identity({ identitySubject: "no-such-subject" }).authenticate("t")).then(() => null, (e) => ({ s: e.getStatus?.(), b: e.getResponse?.() }));
  ok("PF-12b DW5 fail (platform.identity.authenticate): an unknown staff id, or an unknown provider subject, is the same 401 UNKNOWN_STAFF as before", unknown?.s === 401 && JSON.stringify(unknown.b).includes("UNKNOWN_STAFF") && JSON.stringify(noSub) === JSON.stringify(unknown), { unknown, noSub });

  // ---------------------------------------------------------------------------- DW5 through the real walled API
  const PORT = await new Promise<number>((res) => { const f = createServer().listen(0, "127.0.0.1", () => { const p = (f.address() as { port: number }).port; f.close(() => res(p)); }); }), BASE = `http://127.0.0.1:${PORT}`;
  const http = async (path: string, o: { token?: string; body?: unknown } = {}) => {
    const r = await fetch(`${BASE}${path}`, { method: o.body ? "POST" : "GET", headers: { "content-type": "application/json", ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) }, body: o.body ? JSON.stringify(o.body) : undefined });
    return { status: r.status, body: await r.json().catch(() => null) as any };
  };
  const onHost = (path: string, host: string) => new Promise<{ status: number; body: any; location?: string }>((res) => { request({ host: "127.0.0.1", port: PORT, path, headers: { host } }, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => { let b: unknown = null; try { b = JSON.parse(d); } catch { /* not json */ } res({ status: r.statusCode ?? 0, body: b, location: r.headers.location }); }); }).on("error", () => res({ status: 0, body: null })).end(); });
  const bypassLines = () => Number(sql(`select count(*) from audit_event where action = 'platform.bypass'`));
  const seen: Record<string, any> = {};
  let out = "";
  const code0 = await new Promise<number | null>((resolve) => {
    const p = spawn(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "api", "src", "main.ts")],
      { cwd: STUDIO, env: { ...process.env, PLATFORM_ENVIRONMENT: "local", PLATFORM_IDENTITY: "local", DATABASE_URL: urlOf(), STUDIO_PORT: String(PORT), STUDIO_VAR: join(STUDIO, "var", `pf12b2-check-${process.pid}`) }, stdio: ["ignore", "pipe", "pipe"] });
    let up = false;
    const t = setTimeout(() => { p.kill("SIGKILL"); }, 240_000);
    const during = async () => {
      await new Promise((r) => setTimeout(r, 1500));   // the start-up catch-ups write their own per-firm lines first
      seen.linesBefore = bypassLines(); seen.outAt = out.length;
      const signIn = await http("/api/platform/session/local", { body: { firmKey: keyOf(A), actorId: "user-R", secondStep: true } });
      seen.signIn = signIn;
      seen.me = await http("/api/platform/me", { token: signIn.body?.token });
      seen.signInBad = await http("/api/platform/session/local", { body: { firmKey: "no-such-firm", actorId: "user-R", secondStep: true } });
      seen.meBad = await http("/api/platform/me", { token: "not-a-token" });
      seen.inv = await http(`/api/public/invitations/${inviteOk}`);
      seen.invBad = await http(`/api/public/invitations/${randomBytes(32).toString("base64url")}`);
      seen.acc = await http(`/api/public/invitations/${inviteOk}/accept`, { body: {} });
      seen.accAgain = await http(`/api/public/invitations/${inviteOk}/accept`, { body: {} });
      seen.accBad = await http(`/api/public/invitations/${randomBytes(32).toString("base64url")}/accept`, { body: {} });
      seen.accTaken = await http(`/api/public/invitations/${inviteTaken}/accept`, { body: {} });
      seen.form = await http(`/api/public/forms/${formToken}`);
      seen.formBad = await http(`/api/public/forms/${randomBytes(24).toString("base64url")}`);
      seen.formOff = await http(`/api/public/forms/${sql(`select public_token from fo_web_form where firm_id = '${B}' limit 1`)}`);
      seen.page = await http(`/api/public/firms/${keyOf(B)}/book`);
      seen.pageBad = await http(`/api/public/firms/no-such-firm/book`);
      seen.brand = await http(`/api/public/firms/${keyOf(B)}/branding`);
      seen.brandBad = await http(`/api/public/firms/no-such-firm/branding`);
      seen.self = await http(`/api/public/bookings/${link}`);
      seen.selfBad = await http(`/api/public/bookings/${badVerifier}`);
      seen.selfUnknown = await http(`/api/public/bookings/${unknownId}`);
      seen.host = await onHost("/api/public/site", `pf12b2-a.localhost:${PORT}`);
      seen.hostOld = await onHost("/api/public/site", `pf12b2-old.localhost:${PORT}`);
      seen.hostBad = await onHost("/api/public/site", `pf12b2-nobody.localhost:${PORT}`);
      seen.formOnA = await onHost(`/api/public/forms/${sql(`select public_token from fo_web_form where firm_id = '${B}' limit 1`)}`, `pf12b2-a.localhost:${PORT}`);
      seen.linesAfter = bypassLines();
    };
    const onData = (b: Buffer) => { out += b.toString(); if (!up && /Product Studio on http/.test(out)) { up = true; void during().catch((e) => { seen.error = String(e); }).finally(() => p.kill("SIGTERM")); } };
    p.stdout.on("data", onData); p.stderr.on("data", onData); p.on("exit", (c) => { clearTimeout(t); resolve(c); });
  });
  ok("PF-12b: the real API started as xr_app on the scratch database and every door was asked", /Product Studio on http/.test(out) && !seen.error && seen.linesAfter !== undefined, { code0, error: seen.error, tail: out.slice(-500) });
  const st = (k: string) => seen[k]?.status, codeOf = (k: string) => seen[k]?.body?.code ?? seen[k]?.body?.state;
  ok("PF-12b DW5 pass (platform.identity.sign-in, platform.identity.authenticate): a staff member signs in by the firm key, and their session reads their own firm (who-am-I)", st("signIn") === 200 && st("me") === 200 && seen.me.body?.firmKey === keyOf(A), { signIn: seen.signIn, me: seen.me });
  ok("PF-12b DW5 fail (platform.identity.sign-in, authenticate): an unknown firm key is 401 UNKNOWN_STAFF; a bad session is 401", st("signInBad") === 401 && codeOf("signInBad") === "UNKNOWN_STAFF" && st("meBad") === 401, { signInBad: seen.signInBad, meBad: seen.meBad });
  ok("PF-12b DW5 pass (platform.identity.invitation): the invitation link shows its firm and email, and accepting makes the staff member in that firm", seen.inv?.body?.state === "VALID" && seen.inv.body.email === "new.person@pf12b2.example.com" && st("acc") === 200 && seen.acc.body?.firmKey === keyOf(A)
    && sql(`select firm_id from platform_staff where email = 'new.person@pf12b2.example.com'`) === A, { inv: seen.inv, acc: seen.acc });
  ok("PF-12b DW5 fail (platform.identity.invitation): an unknown token shows NOT_VALID; accepting it, or accepting twice, is 410 INVITATION_NOT_VALID", seen.invBad?.body?.state === "NOT_VALID" && st("accBad") === 410 && codeOf("accBad") === "INVITATION_NOT_VALID" && st("accAgain") === 410 && codeOf("accAgain") === "INVITATION_NOT_VALID", { invBad: seen.invBad, accBad: seen.accBad, accAgain: seen.accAgain });
  ok("PF-12b DW5 fail (platform.identity.invitation, the cross-firm email check): an email that signs in to another firm is 409 EMAIL_IN_ANOTHER_FIRM, and no staff member is made", st("accTaken") === 409 && codeOf("accTaken") === "EMAIL_IN_ANOTHER_FIRM" && sql(`select count(*) from platform_staff where email = '${otherFirmEmail}'`) === "1", seen.accTaken);
  ok("PF-12b DW5 pass (fo.sales.web-form): the firm's enabled enquiry form answers with its words", st("form") === 200 && !!seen.form.body, seen.form);
  ok("PF-12b DW5 fail (fo.sales.web-form): an unknown token, and a firm's form that is off, answer the same 404 as before; another firm's form on firm A's own address is 404", st("formBad") === 404 && st("formOff") === 404 && JSON.stringify(seen.formBad.body) === JSON.stringify(seen.formOff.body) && st("formOnA") === 404, { formBad: seen.formBad, formOff: seen.formOff, formOnA: seen.formOnA });
  ok("PF-12b DW5 pass (fo.booking.public-page): the firm's booking page answers by its key", st("page") === 200, seen.page);
  ok("PF-12b DW5 fail (fo.booking.public-page): an unknown firm key is 404", st("pageBad") === 404, seen.pageBad);
  ok("PF-12b DW5 pass (platform.branding.public, PF-12b part 3): the firm's public branding answers by its key, with its name", st("brand") === 200 && typeof seen.brand.body?.name === "string" && seen.brand.body.name.length > 0, seen.brand);
  ok("PF-12b DW5 fail (platform.branding.public): an unknown firm key is 404", st("brandBad") === 404, seen.brandBad);
  ok("PF-12b DW5 pass (fo.booking.self-service): the booker's own link opens the booking", st("self") === 200 && seen.self.body?.status === "SCHEDULED", seen.self);
  ok("PF-12b DW5 fail (fo.booking.self-service): a wrong secret part and an unknown link both answer the same 404", st("selfBad") === 404 && st("selfUnknown") === 404 && JSON.stringify(seen.selfBad.body) === JSON.stringify(seen.selfUnknown.body), { selfBad: seen.selfBad, selfUnknown: seen.selfUnknown });
  ok("PF-12b DW5 pass (platform.web-address.host): a firm's own web address serves its public site", st("host") === 200 && seen.host.body?.webAddress === "pf12b2-a", seen.host);
  ok("PF-12b DW5 pass (platform.web-address.host, review m5): the firm's old address (changed by our staff, within 90 days) redirects 301 to its current one", st("hostOld") === 301 && String(seen.hostOld.location ?? "").includes("pf12b2-a.localhost"), seen.hostOld);
  ok("PF-12b DW5 fail (platform.web-address.host): an unknown address is the one 404", st("hostBad") === 404, seen.hostBad);

  // ------------------------------------------------------------------------------------------------------ DW7
  const doorLog = out.slice(seen.outAt ?? 0).split("\n").filter((l) => /platform_bypass/.test(l));
  ok("PF-12b DW7 pass: all those door calls wrote no platform.bypass audit line (QA-499's count is unchanged by the doors)", seen.linesBefore !== undefined && seen.linesAfter === seen.linesBefore, { before: seen.linesBefore, after: seen.linesAfter });
  ok("PF-12b DW7 pass: and no bypass operations line (PF-23) names any of the seven doors", !doorLog.some((l) => DOORS.some((d) => l.includes(d))), doorLog.slice(0, 5));
} finally {
  for (const c of clients) await c.$disconnect().catch(() => undefined);
  for (const p of pools) await p.end().catch(() => undefined);
  try { execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]); } catch { /* prune-test-dbs.sh */ }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
