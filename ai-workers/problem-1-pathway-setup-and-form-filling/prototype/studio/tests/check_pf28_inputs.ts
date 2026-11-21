// PF-28 part 1 (R1.10, map row 10, the PF/FO half; AG-18-57, AG-16-28, AG-10-32; STANDARDS §6): every platform and
// front-office door checks its input, proven by a sweep. Two halves:
//   (a) the code: every body or query a route under /api/platform, /api/front-office, /api/system, /api/public or
//       /api/hooks takes reaches a zod parse (tests/lib/routes.ts follows it into the service; `parseInput` counts);
//   (b) a running copy: every route the app serves under those paths (read from the app's own feature list, the way PF-4's
//       start-up rule reads it) is asked, with the Owner's token (none on public doors), an unknown field, a wrong type, a
//       missing field and a 1 MB string where it takes a body, an unknown query field where it takes a query, and
//       "not-a-uuid" in each path parameter. Each must answer 400, 404, 413 or 422 (an empty body may pass only when it
//       changes nothing), never 2xx and never 500, and the PF/FO tables' row counts are unchanged.
// What fails today is the reviewed allow-list tests/pf28-allow-list.json, each entry naming its fix part; it only shrinks
// (an entry fixed or gone fails, an entry with no fix part fails). Named cases DW1-DW7 (DW8 is the PR's browser run).
// Field errors answer 422 (Lead B rev 17.21; FIELD_ERROR_STATUS; question on #2619). US$0, no model call.
//   zsh studio/tools/isolated.sh runtime_pf28 4487 start PLATFORM_IDENTITY=local && tsx studio/tests/check_pf28_inputs.ts 4487 xr_studio_runtime_pf28
// (by hand, from studio/: tsx --tsconfig api/tsconfig.json tests/check_pf28_inputs.ts 4487 xr_studio_runtime_pf28; run-suites.sh adds it)
import "reflect-metadata";
import { MODULE_METADATA, PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { Reflector } from "@nestjs/core";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { follows, routes as codeRoutes } from "./lib/routes.ts";
import { planted } from "./lib/ts-files.ts";

const PORT = Number(process.argv[2] ?? 4487), DB = process.argv[3] ?? "xr_studio_runtime_pf28", BASE = `http://localhost:${PORT}`;
const STUDIO = join(import.meta.dirname, ".."), API = join(STUDIO, "api", "src"), LIST = join(import.meta.dirname, "pf28-allow-list.json");
const BIN = ["/opt/homebrew/opt/postgresql@18/bin", "/usr/lib/postgresql/18/bin"].find((b) => existsSync(join(b, "psql"))) ?? "";
const sql = (q: string) => execFileSync(join(BIN, "psql"), [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-X", "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8" }).trim();
export const DOORS = /^\/api\/(platform|front-office|system|public|hooks)(\/|$)/;
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 700)}` : ""}`); };

// ------------------------------------------------------------------------------------------------- the allow-list
/** "<file> <VERB> <path> <body|query>[(key)]" (code) or "<VERB> <path> <probe>" (running copy) → "PF-28 part N (area)". */
export type AllowList = { unparsed: Record<string, string>; probes: Record<string, string> };
export const FIX_PART = /^PF-28 part [2-9] \((platform|front-office sales|booking|retainers|money)\)$/;
/** DW7: every entry names its fix part. */
export const unnamed = (l: AllowList) => [...Object.entries(l.unparsed), ...Object.entries(l.probes)].filter(([, v]) => !FIX_PART.test(String(v ?? ""))).map(([k]) => k);
/** The fix part of an area, by the route's file (code) or path (running copy). */
export function partOf(where: string): string {
  if (/\/money\/|^front-office\/money/.test(where)) return "PF-28 part 6 (money)";
  if (/retainer/.test(where)) return "PF-28 part 5 (retainers)";
  if (/booking|availability|time-off|consult|\/api\/public\/(firms|bookings)/.test(where)) return "PF-28 part 4 (booking)";
  if (/front-office|\/api\/public\/(forms|embed)/.test(where)) return "PF-28 part 3 (front-office sales)";
  return "PF-28 part 2 (platform)";
}
/** The list only shrinks: what fails and is not listed, and what is listed but passes now (or is gone). */
export function judge(failing: Iterable<string>, seen: Iterable<string>, listed: Record<string, string>) {
  const f = new Set(failing), s = new Set(seen);
  return { unlisted: [...f].filter((k) => !(k in listed)), fixedButListed: Object.keys(listed).filter((k) => !s.has(k) || !f.has(k)) };
}
const allow: AllowList = JSON.parse(readFileSync(LIST, "utf8"));

// ------------------------------------------------------------------------------------- (a) the code: every input parses
type CodeInput = { key: string; parsedAt: string | null };
export function inputs(dir: string): CodeInput[] {
  return codeRoutes(dir).filter((r) => DOORS.test(r.path)).flatMap((r) => r.inputs.filter((i) => i.kind !== "param")
    .map((i) => ({ key: `${r.file} ${r.verb} ${r.path} ${i.kind}${i.key ? `(${i.key})` : ""}`, parsedAt: follows(dir, r.controller, r.node, i.name) })));
}
const found = inputs(API), unparsed = found.filter((x) => !x.parsedAt).map((x) => x.key);
console.log(`code: ${found.length} inputs under the PF/FO doors, ${unparsed.length} reach no zod parse (allow-listed: ${Object.keys(allow.unparsed).length})`);
const jc = judge(unparsed, found.map((x) => x.key), allow.unparsed);
ok("PF-28 (a) pass: every PF/FO body and query reaches a zod parse, or is on the allow-list", jc.unlisted.length === 0, jc.unlisted);
ok("PF-28 (a) pass: the code list only shrinks (no entry parses now or is gone)", jc.fixedButListed.length === 0, jc.fixedButListed);

// DW1: a throwaway route with an unparsed body fails the sweep; the same route given a schema passes.
const thing = (line: string) => `import { Body, Controller, Inject, Injectable, Param, Post } from "@nestjs/common";
import { parseInput, strict, text } from "../../platform/http/input.ts";
const Thing = strict({ name: text(100) });
@Injectable() export class Things { async put(id: string, body: unknown) { ${line} return { id }; } }
@Controller("api/front-office") export class ThingsController {
  constructor(@Inject(Things) private readonly t: Things) {}
  @Post("things/:id") put(@Param("id") id: string, @Body() b: unknown) { return this.t.put(id, b); }
}`;
const dw1bad = judge(inputs(planted({ "front-office/things/routes.ts": thing("const b = body as { name?: string };") })).filter((x) => !x.parsedAt).map((x) => x.key), [], {});
const dw1good = inputs(planted({ "front-office/things/routes.ts": thing("const b = parseInput(Thing, body);") }));
ok("PF-28 DW1 fail: a throwaway front-office route with an unparsed body fails the sweep", dw1bad.unlisted.join() === "front-office/things/routes.ts POST /api/front-office/things/:id body", dw1bad);
ok("PF-28 DW1 pass: the same route reading its body through parseInput(strict schema) passes", dw1good.length === 1 && dw1good[0].parsedAt === "Things.put", dw1good);

// DW7: the allow-list is checked in and every entry names its fix part; one with no part fails.
ok("PF-28 DW7 pass: every allow-list entry names its fix part (PF-28 part 2-6, by area)", unnamed(allow).length === 0, unnamed(allow));
/** The list only shrinks (review m1): its size as committed in part 1; a fix part lowers these numbers, never raises them. */
const PROBES_CEILING = 207, UNPARSED_CEILING = 71;   // part 1 committed 238 and 81; part 2a (identity doors) lowers them to 207 and 71; each fix part lowers both
ok("PF-28 DW7 fail: the allow-list never grows past its committed size", Object.keys(allow.unparsed).length <= UNPARSED_CEILING && Object.keys(allow.probes).length <= PROBES_CEILING, { unparsed: Object.keys(allow.unparsed).length, probes: Object.keys(allow.probes).length });
ok("PF-28 DW7 fail: an entry added without its fix part (or with another row's id) fails", unnamed({ unparsed: { "x.ts POST /api/platform/x body": "" }, probes: { "POST /api/platform/x unknown": "PF-5 part 3" } }).length === 2);

// The rule's own words (break m1-m3): a missing field and a wrong type say different things; "constructor" is named like
// any field; a "__proto__" key is refused; a long unknown key name is cut to 64 characters; never the value.
const { parseInput, strict: strictOf, text: textOf } = await import("../api/src/platform/http/input.ts");
const refusal = (v: unknown) => { try { parseInput(strictOf({ name: textOf(50) }), v); return null; } catch (e) { return (e as { getResponse(): { status: number; fields: Record<string, string>; detail: string } }).getResponse(); } };
const [missing, wrong, ctor, proto, long, good] = [{}, { name: 7 }, { name: "a", constructor: 1 }, JSON.parse('{"name":"a","__proto__":{"x":1}}'), { name: "a", ["k".repeat(300)]: "secret value" }, { name: "Sample" }].map(refusal);
ok("PF-28 rule pass: a missing field says it is required; a wrong type says what it must be", missing?.fields.name === "This is required." && wrong?.fields.name === "This must be text.", [missing?.fields, wrong?.fields]);
ok("PF-28 rule fail (break m2): \"constructor\" and \"__proto__\" are refused and named, never accepted or \"0 fields\"", Object.hasOwn(ctor?.fields ?? {}, "constructor") && Object.hasOwn(proto?.fields ?? {}, "__proto__") && !/^0 fields/.test(ctor?.detail ?? "0"), [ctor?.detail, proto?.detail]);
ok("PF-28 rule fail (break m3): an unknown key's name is cut to 64 characters and the value is never repeated; a good body passes", Object.keys(long?.fields ?? {}).every((k) => k.length <= 64) && !JSON.stringify(long).includes("secret value") && good === null && long?.status === 422, long?.fields);

// ------------------------------------------------------------------------------------- (b) a running copy: the probes
process.env.PLATFORM_ENVIRONMENT ??= "local";   // PF-24w: required, no default (the feature files read the loader at import)
const { registerFeatures } = await import("../api/src/features.ts");
const { PLATFORM_ACCESS } = await import("../api/src/platform/identity/keys.ts");
const { FIELD_ERROR_STATUS } = await import("../api/src/platform/http/input.ts");
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "ALL", "OPTIONS", "HEAD", "SEARCH"];
type Door = { method: string; path: string; body: boolean; query: boolean; keys: string[] | null; open: boolean };
/** Every route the app serves under the doors, with what it reads (Nest's own argument metadata: @Body 3, @Query 4). */
export function doors(controllers: unknown[]): Door[] {
  const out: Door[] = [], reflector = new Reflector();
  for (const c of controllers as (new (...a: never[]) => object)[]) {
    if (!c?.prototype) continue;
    for (const base of ([] as string[]).concat(Reflect.getMetadata(PATH_METADATA, c) ?? "")) for (const key of Object.getOwnPropertyNames(c.prototype)) {
      const h = (c.prototype as Record<string, unknown>)[key];
      if (key === "constructor" || typeof h !== "function" || Reflect.getMetadata(METHOD_METADATA, h) === undefined) continue;
      const args = Object.keys(Reflect.getMetadata(ROUTE_ARGS_METADATA, c, key) ?? {}).map((k) => Number(k.split(":")[0]));
      const access = reflector.getAllAndOverride<{ kind: string; keys?: string[] }>(PLATFORM_ACCESS, [h as () => unknown, c]);
      for (const p of ([] as string[]).concat(Reflect.getMetadata(PATH_METADATA, h) ?? "")) {
        const path = `/${[base, p].join("/")}`.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
        if (DOORS.test(path)) out.push({ method: METHODS[Reflect.getMetadata(METHOD_METADATA, h) as number] ?? "?", path, body: args.includes(3), query: args.includes(4), keys: access?.kind === "keys" ? access.keys! : null, open: !access });
      }
    }
  }
  return out;
}
class Features {}
await registerFeatures(Features);
const all = doors(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, Features) ?? []);
console.log(`running copy: ${all.length} routes under the PF/FO doors (${all.filter((d) => d.body).length} take a body, ${all.filter((d) => d.query).length} a query, ${all.filter((d) => /:/.test(d.path)).length} path parameters)`);
ok("PF-28 (b): the sweep reads every PF/FO route the app serves, the open doors and functionally registered controllers included", all.length >= 150 && all.some((d) => d.path === "/api/public/firms/:firmKey/book") && all.some((d) => d.path.startsWith("/api/public/signup")), all.length);

type Answer = { status: number; body: Record<string, unknown> | null };
const call = async (method: string, path: string, o: { token?: string; body?: string } = {}): Promise<Answer> => {
  const bodyless = method === "GET" || method === "HEAD" || method === "OPTIONS" || method === "DELETE";
  try {
    const r = await fetch(`${BASE}${path}`, { method, headers: { ...(o.token ? { authorization: `Bearer ${o.token}` } : {}), ...(bodyless ? {} : { "content-type": "application/json" }) }, body: bodyless ? undefined : (o.body ?? "{}") });
    const t = await r.text(); let body: Record<string, unknown> | null = null; try { body = JSON.parse(t); } catch { /* not JSON */ }
    return { status: r.status, body };
  } catch { return { status: 0, body: null }; }
};
const reached = (await call("GET", "/api/public/plans")).status !== 0;
ok(`PF-28 (b): a copy answers on :${PORT}`, reached, reached ? undefined : `start it: zsh studio/tools/isolated.sh runtime_pf28 ${PORT} start`);
if (!reached) { console.log(`${pass}/${pass + fail} passed`); process.exit(1); }
const signIn = async (actorId: string, firmKey = "sample-firm") => (await call("POST", "/api/platform/session/local", { body: JSON.stringify({ firmKey, actorId, secondStep: true }) })).body?.token as string;
const tR = await signIn("user-R"), keysR = new Set<string>(((await call("GET", "/api/platform/me", { token: tR })).body?.keys as string[]) ?? []);

/** The PF/FO tables' row counts by table (exact counts, so a probe that stored anything shows). Left out: the session
 *  table (sign-in) and msg_firm, the key row the messages module inserts on first read (PF-19a, ON CONFLICT DO NOTHING). */
const rows = async () => { return Object.fromEntries(sql(`select string_agg(relname || ':' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', relname), false, true, '')))[1]::text, ',') from pg_stat_user_tables where (relname ~ '^(platform_|fo_|money_|msg_|plat_|auto_)' or relname in ('module_event', 'webhook_receipt')) and relname not in ('platform_session_revocation', 'msg_firm')`).split(",").map((x) => x.split(":"))); };
const before = await rows();

const MB = "a".repeat(1024 * 1024);
/** What each probe must answer (Lead B rev 17.21): an unknown field 422 naming it; a wrong type and a missing field 422 (an
 *  empty body may pass when nothing is required: the row counts judge it); a 1 MB string 413; a malformed id 404. A body
 *  or query probe answered 404 (a random record looked up before the input was read) proves nothing, so it does not pass
 *  (review M1): such a route is on the allow-list until its fix part reads the input first or the sweep gets a real id. */
export function fine(probe: string, withIds: boolean, a: { status: number; body: Record<string, unknown> | null }): boolean {
  const named = (k: string) => typeof a.body?.fields === "object" && a.body.fields !== null && k in (a.body.fields as object);
  if (probe === "1mb") return a.status === 413;
  if (probe.startsWith("id:")) return a.status === 404;
  void withIds;
  if (probe === "unknown" || probe === "query-unknown") return a.status === FIELD_ERROR_STATUS && named("pf28Unknown");
  if (probe === "missing" && a.status >= 200 && a.status < 300) return true;
  return a.status === FIELD_ERROR_STATUS;
}
/** Path keys that are not record ids (break M1): a random uuid there makes every probe a 404 that proves nothing, so the
 *  Sample firm's real key, form token and a public consultation type's slug are used. A door whose key has no real value
 *  here (a booking link's or an invitation's token) is "unreached": on the allow-list until its fix part reaches it. */
const SAMPLE = "(select id from platform_firm where key = 'sample-firm')";
const REAL: Record<string, string> = { ":firmKey": "sample-firm", ":slug": sql(`select coalesce(min(slug), '') from fo_consultation_type where firm_id = ${SAMPLE} and active and show_on_booking_page and deleted_at is null`) };
if (all.some((d) => d.path.startsWith("/api/public/forms/:token"))) REAL[":formToken"] = sql(`select coalesce(min(public_token), '') from fo_web_form where firm_id = ${SAMPLE}`);
const keyOf = (path: string, p: string) => (p === ":token" && path.startsWith("/api/public/forms/") ? ":formToken" : p);
const isKey = (path: string, p: string) => keyOf(path, p) in REAL || (path.startsWith("/api/public/") && p !== ":id");
const fill = (path: string, bad?: string) => path.replace(/:[A-Za-z_]+/g, (m) => (m === bad ? "not-a-uuid" : REAL[keyOf(path, m)] || randomUUID()));
/** Whether a 404 may stand for "this random record does not exist": only when some path value is a random id. */
const randomIds = (path: string) => (path.match(/:[A-Za-z_]+/g) ?? []).some((p) => !REAL[keyOf(path, p)]);
const failing: string[] = [], seen: string[] = [], skipped: string[] = [];
const answers = new Map<string, Answer>();
for (const d of all) {
  if (d.keys && !d.keys.every((k) => keysR.has(k))) { skipped.push(`${d.method} ${d.path}`); continue; }   // no Sample token holds them: NOT TESTED, named below
  const token = d.open ? undefined : tR, method = d.method === "ALL" ? "POST" : d.method;
  const probes: [string, string, string | undefined][] = [];
  if (d.body) probes.push(["unknown", fill(d.path), JSON.stringify({ pf28Unknown: "x" })], ["wrong-type", fill(d.path), "[1]"], ["missing", fill(d.path), "{}"], ["1mb", fill(d.path), JSON.stringify({ pf28: MB })]);
  if (d.query) probes.push(["query-unknown", `${fill(d.path)}?pf28Unknown=x`, undefined]);
  for (const p of d.path.match(/:[A-Za-z_]+/g) ?? []) probes.push([`id${p}`, fill(d.path, p), d.body ? "{}" : undefined]);
  const unreached = (d.path.match(/:[A-Za-z_]+/g) ?? []).filter((p) => isKey(d.path, p) && !REAL[keyOf(d.path, p)]);
  if (unreached.length && (d.body || d.query)) { const k = `${d.method} ${d.path} unreached`; seen.push(k); failing.push(k); answers.set(k, { status: 0, body: { keys: unreached } }); }
  for (const [probe, url, body] of probes) {
    const key = `${d.method} ${d.path} ${probe}`, a = await call(method, url, { token, body });
    seen.push(key); answers.set(key, a);
    if (!fine(probe, randomIds(d.path), a)) failing.push(key);
  }
}
if (process.env.PF28_DUMP) writeFileSync(process.env.PF28_DUMP, JSON.stringify(Object.fromEntries(answers), null, 1));   // every answer, for writing the allow-list
const after = await rows(), changed = Object.keys({ ...before, ...after }).filter((t) => before[t] !== after[t]).map((t) => `${t} ${before[t]}→${after[t]}`);
console.log(`probes: ${seen.length} on ${all.length - skipped.length} routes; ${failing.length} not as the rule says (allow-listed: ${Object.keys(allow.probes).length}); NOT TESTED (no Sample token holds the keys): ${skipped.length} ${skipped.join(", ")}`);
const jp = judge(failing, seen, allow.probes);
ok("PF-28 (b) pass: every probe answers as the rule says (unknown field 422 naming it, wrong type and missing 422, 1 MB 413, bad id 404), or is on the allow-list", jp.unlisted.length === 0, jp.unlisted.map((k) => `${k} → ${answers.get(k)?.status}`));
ok("PF-28 (b) pass: the probe list only shrinks (no entry answers well now or is gone)", jp.fixedButListed.length === 0, jp.fixedButListed.map((k) => `${k} → ${answers.get(k)?.status ?? "gone"}`));
ok("PF-28 (b) pass: no probe answered 500", ![...answers.values()].some((a) => a.status >= 500), [...answers].filter(([, a]) => a.status >= 500).map(([k]) => k));
ok("PF-28 (b) pass: the PF/FO tables' row counts are unchanged after every probe", changed.length === 0, changed);

// DW2: a route that parses strictly refuses an unknown field with 422 naming it, and stores nothing.
const s1 = answers.get("POST /api/platform/complaints/:id/handler unknown");
ok("PF-28 DW2 pass: POST /api/platform/complaints/:id/handler (a strict schema, found by the sweep) refuses an unknown field with 422 naming it; the row counts above show nothing stored", s1?.status === FIELD_ERROR_STATUS && fine("unknown", false, s1) && changed.length === 0, s1);
const off = answers.get("POST /api/platform/offices unknown");
ok("PF-28 DW2 fail: POST /api/platform/offices parses loosely today (400, the field not named), so its probe is on the allow-list for part 2", off !== undefined && !fine("unknown", false, off) && allow.probes["POST /api/platform/offices unknown"] === "PF-28 part 2 (platform)", off);

// PF-28 part 2a (identity doors: sign-in, staff, invitations, licence records): each body goes through parseInput before
// any record is read, and a staff id is checked before the body.
const inv = answers.get("POST /api/platform/staff/invitations unknown"), invites = () => sql(`select count(*) from platform_invitation`);
const n0 = invites(), typo = await call("POST", "/api/platform/staff/invitations", { token: tR, body: JSON.stringify({ email: "pf28.sample@example.com", roles: ["CASE_OFFICER"], emial: "x" }) });
ok("PF-28 part 2a fail: an invitation with a misspelt field (emial) → 422 naming it in plain words, and no invitation stored", typo.status === FIELD_ERROR_STATUS && (typo.body?.fields as Record<string, string>)?.emial === "This field is not allowed here." && /Nothing was saved/.test(String(typo.body?.detail)) && invites() === n0 && inv?.status === FIELD_ERROR_STATUS, typo.body);
const badId = await call("POST", "/api/platform/staff/not-a-uuid/deactivate", { token: tR, body: JSON.stringify({ pf28Unknown: "x" }) });
const noFirm = await call("POST", "/api/platform/session/local", { body: JSON.stringify({ email: "owner@example.com", secondStep: true }) });
ok("PF-28 part 2a fail: a malformed staff id → 404 before the body is read; a sign-in without a firm key → 422 naming firmKey", badId.status === 404 && noFirm.status === FIELD_ERROR_STATUS && (noFirm.body?.fields as Record<string, string>)?.firmKey === "This is required.", [badId.status, noFirm.body?.fields]);
// Review of part 2a (m1-m4): a misspelt row field is flagged on its row; a body-less resend is {}; a malformed invitation id
// is 404 before the body; an over-long sign-in code is the "used or expired" 401, not a field error.
const nmae = await call("POST", "/api/platform/staff/invitations/batch", { token: tR, body: JSON.stringify({ rows: [{ email: "pf28.row@example.com", roles: ["CASE_OFFICER"], nmae: "Client B" }] }) });
const rowFlags = ((nmae.body?.rows as { flags: { code: string }[] }[] | undefined)?.[0]?.flags ?? []).map((f) => f.code);
ok("PF-28 part 2a fail (review m1): a batch row with a misspelt field (nmae) → 422 ROWS_FLAGGED with UNKNOWN_FIELD on that row, nothing stored", nmae.status === 422 && nmae.body?.code === "ROWS_FLAGGED" && rowFlags.includes("UNKNOWN_FIELD") && sql(`select count(*) from platform_invitation where email = 'pf28.row@example.com'`) === "0", nmae.body);
const bodyless = await fetch(`${BASE}/api/platform/staff/invitations/${randomUUID()}/resend`, { method: "POST", headers: { authorization: `Bearer ${tR}` } }).then((r) => r.status);
const badInv = await call("POST", "/api/platform/staff/invitations/not-a-uuid/resend", { token: tR, body: JSON.stringify({ pf28Unknown: "x" }) });
ok("PF-28 part 2a fail (review m2, m3): a resend with no body at all reads as {} (a random id → 404, never 422); a malformed invitation id → 404 before the body", bodyless === 404 && badInv.status === 404, [bodyless, badInv.status]);
const longCode = await call("POST", "/api/platform/session/callback", { body: JSON.stringify({ code: "c".repeat(2001) }) });
ok("PF-28 part 2a fail (review m4): a sign-in code over 2,000 characters → 401 SIGN_IN_CODE_REFUSED (the \"used or expired\" words), not a field error", longCode.status === 401 && longCode.body?.code === "SIGN_IN_CODE_REFUSED", longCode.body);

// DW3: a 1 MB string → 413 (the body limit), never 500; a 200 KB valid body on a long-text route still succeeds.
const big = await call("POST", "/api/platform/offices", { token: tR, body: JSON.stringify({ name: MB }) });
ok("PF-28 DW3 fail: a 1 MB string on a platform route → 413 BODY_TOO_LARGE in size-neutral words", big.status === 413 && big.body?.code === "BODY_TOO_LARGE" && big.body?.detail === "This request is larger than this address takes. Nothing was saved or started.", big);
const note = await call("POST", `/api/front-office/leads/${randomUUID()}/notes`, { token: tR, body: JSON.stringify({ text: "Sample long note. ".repeat(11_600) }) }), tooBig = await call("POST", `/api/front-office/leads/${randomUUID()}/notes`, { token: tR, body: JSON.stringify({ text: "Sample long note. ".repeat(16_000) }) });
ok("PF-28 DW3 pass: a 200 KB body passes the 256 KB limit and reaches the route's own rule (here 422: notes are capped at 5,000 characters), never 413 or 500; 280 KB → 413", note.status === 422 && tooBig.status === 413, { note: note.status, tooBig: tooBig.status });

// DW4: a non-uuid staff id → the one not-found; a valid uuid of another firm → the same 404.
const other = sql(`select id from platform_staff where firm_id <> (select id from platform_firm where key = 'sample-firm') limit 1`);
const n1 = await call("GET", "/api/platform/staff/not-a-uuid", { token: tR }), n2 = await call("GET", `/api/platform/staff/${other}`, { token: tR });
ok("PF-28 DW4 pass: a non-uuid staff id → 404", n1.status === 404, n1);
ok("PF-28 DW4 fail: another firm's staff id → the same 404 (no hint it exists)", other !== "" && n2.status === 404 && n2.body?.title === n1.body?.title, [n1.body, n2.body]);

// DW5: the public doors get the same probes with no token; FO-2's 33 KB web-form body keeps FO-2's 413 words.
const publicKeys = seen.filter((k) => / \/api\/public\//.test(k));
ok(`PF-28 DW5 pass: the public doors were probed with no token (${publicKeys.length} probes)`, publicKeys.length >= 10 && publicKeys.every((k) => answers.get(k)!.status !== 401), publicKeys.length);
const form = await call("POST", "/api/public/forms/not-a-token/submissions", { body: JSON.stringify({ message: "x".repeat(33 * 1024) }) });
ok("PF-28 DW5 fail: FO-2's 33 KB web-form body still answers FO-2's own 413 words, not the platform limit's", form.status === 413 && form.body?.code === "TOO_LARGE", form);

// DW6 (AG-10-32, amendment 1): the Stripe webhook is PF-5 part 2 (#1959), not on main yet.
const hook = all.some((d) => d.path === "/api/hooks/stripe");
if (hook) ok("PF-28 DW6: /api/hooks/stripe is on main: write DW6 (signed event verifies; one byte changed → 400, nothing stored)", false);
else console.log("NOT TESTED  PF-28 DW6: /api/hooks/stripe is not on main (PF-5 part 2, #1959); a signed event and a one-byte change are tested once it lands (P-405: never green)");

console.log(`${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
