// F2b (forms lane, F2 plan §7 XT-1…XT-3, BR-15; Lead decision Q1; challenge M7): the browser extension signs in with a
// one-time code from the Studio, gets an opaque token bound to the person, the modes their duties give and the fixed
// extension's id, and uses only that token; the API answers the extension's origin only. Every rule with a passing and
// a failing case. Isolated copy (own database and files), no browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_f2b 4456 start && tsx studio/tests/check_forms_f2b.ts 4456 xr_studio_forms_f2b
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bearerOf } from "../api/src/core.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_f2b";
const STUDIO = join(import.meta.dirname, "..");
const ID = "ipomjnfjkniidipddghocobgcfecebaf", ORIGIN = `chrome-extension://${ID}`;
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any; headers: Headers }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j, headers: r.headers };
};
const studio = (actor: string) => ({ "x-actor": actor });
const ext = (token: string, origin = ORIGIN) => ({ authorization: `Bearer ${token}`, origin });
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const pair = async (actor = "user-A") => (await call("POST", "/extension/pairings", {}, studio(actor))).body;
const connect = async (code: string, extra: Record<string, string> = {}) => call("POST", "/extension/sessions", { code, extensionId: ID }, { origin: ORIGIN, ...extra });

(async () => {
  // ──────────────────────────────────────────── S-2 core.ts bearerOf (no server)
  const t43 = "A".repeat(43);
  ok("C2.9: S-2 bearerOf reads the extension's token from \"Bearer <43 characters>\"", bearerOf(`Bearer ${t43}`) === t43 && bearerOf(`  Bearer ${t43} `) === t43);
  ok("C2.9: S-2 bearerOf fail: no header, another scheme, a short or padded token, two tokens: no token", [undefined, "", `Basic ${t43}`, `Bearer ${t43.slice(1)}`, `Bearer ${t43}=`, `Bearer ${t43} ${t43}`, `bearer${t43}`].every((h) => bearerOf(h) === null));
  await call("POST", "/demo/load");
  // ──────────────────────────────────────────── XT-1 pairing code
  const a = await pair();
  ok("C2.9: XT-1 the signed-in author gets an 8-character code for 5 minutes, capture mode, the words the panel shows", /^[A-HJ-NP-Z2-9]{8}$/.test(a.code) && a.modes.join() === "capture" && /within 5 minutes/.test(a.message), { modes: a.modes, message: a.message });
  ok("C2.9: XT-1 the code is kept only as its hash (no row or audit line holds it)", sql(`select count(*) from extension_pairing where code_hash = encode(sha256('${a.code}'::bytea), 'hex')`) === "1" && sql(`select count(*) from audit_event where summary like '%${a.code}%'`) === "0" && sql(`select count(*) from extension_pairing where code_hash = '${a.code}'`) === "0");
  const o = await pair("user-O");
  ok("C2.9: BR-15 the case officer's code gives fill mode only", o.modes?.join() === "fill", o.modes);
  let r = await call("POST", "/extension/pairings", {}, studio("user-P"));
  ok("C2.9: BR-15 fail: a client (neither duty) gets no code (403)", r.status === 403, r.body.message);
  r = await call("POST", "/extension/pairings", {}, studio("nobody"));
  ok("C2.9: XT-1 fail: an unknown person gets no code (401)", r.status === 401, r.status);
  r = await call("POST", "/extension/pairings", {}, {});
  ok("C2.9: XT-1 fail: no sign-in at all gets no code (401)", r.status === 401, r.status);
  for (let n = 0; n < 4; n++) await pair();
  r = await call("POST", "/extension/pairings", {}, studio("user-A"));
  ok("C2.9: XT-1 fail: a sixth open code is refused (429), in words", r.status === 429 && /codes are still open/.test(r.body.message), r.body.message);

  // ──────────────────────────────────────────── XT-2 session
  r = await connect(a.code);
  const token = r.body.token as string;
  ok("C2.9: XT-2 the code gives an opaque token for 8 hours, the person and capture mode", r.status === 201 && /^[A-Za-z0-9_-]{43}$/.test(token) && r.body.person.id === "user-A" && r.body.modes.join() === "capture", { status: r.status, person: r.body.person, expires: r.body.expires_at });
  ok("C2.9: XT-2 the token is kept only as its hash, and never in the audit or the server's log", sql(`select count(*) from extension_session where token_hash = encode(sha256('${token}'::bytea), 'hex')`) === "1" && sql(`select count(*) from audit_event where summary like '%${token}%'`) === "0" && !readFileSync(join(STUDIO, "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "api.log"), "utf8").includes(token));
  r = await connect(a.code);
  ok("C2.9: XT-2 fail: a code works once (401 the second time)", r.status === 401 && /already used/.test(r.body.message), r.body.message);
  const b = await pair("user-O");
  r = await call("POST", "/extension/sessions", { code: b.code, extensionId: "a".repeat(32) }, { origin: ORIGIN });
  ok("C2.9: XT-2 fail: another extension id is refused (401)", r.status === 401, r.body.message);
  r = await call("POST", "/extension/sessions", { code: b.code, extensionId: ID }, { origin: "https://portal.example" });
  ok("C2.9: XT-2 fail: the right id from another origin is refused (401)", r.status === 401, r.body.message);
  sql(`update extension_pairing set expires_at = now() - interval '1 second' where code_hash = encode(sha256('${b.code}'::bytea), 'hex')`);
  r = await connect(b.code);
  ok("C2.9: XT-2 fail: a code older than 5 minutes is refused (401)", r.status === 401 && /more than 5 minutes old/.test(r.body.message), r.body.message);
  const c = await pair("user-O");
  const race = await Promise.all([connect(c.code), connect(c.code), connect(c.code)]);
  ok("C2.9: XT-2 three exchanges of one code at the same moment give one session", race.filter((x) => x.status === 201).length === 1 && race.filter((x) => x.status === 401).length === 2 && sql(`select count(*) from extension_session s join extension_pairing p on p.id = s.pairing_id where p.code_hash = encode(sha256('${c.code}'::bytea), 'hex')`) === "1", race.map((x) => x.status));
  const officer = race.find((x) => x.status === 201)!.body.token as string;

  // ──────────────────────────────────────────── XT-2/XT-3 using the token (M7)
  r = await call("GET", "/extension/session", undefined, ext(token));
  ok("C2.9: XT-2 the token says who it is and its modes", r.status === 200 && r.body.person.name === "Configuration author" && r.body.modes.join() === "capture", r.body);
  r = await call("GET", "/extension/session", undefined, { authorization: `Bearer ${token}` });
  ok("C2.9: XT-3 fail: the token without the extension's origin is refused (401)", r.status === 401, r.body.message);
  r = await call("GET", "/extension/session", undefined, ext(token, "https://portal.example"));
  ok("C2.9: XT-3 fail: the token from a web page's origin is refused (401)", r.status === 401, r.body.message);
  r = await call("GET", "/extension/session", undefined, { ...studio("user-A"), origin: ORIGIN });
  ok("C2.9: M7 fail: the Studio's x-actor sign-in alone is refused on the extension's routes (401)", r.status === 401 && /never the Studio's/.test(r.body.message), r.body.message);
  r = await call("GET", "/extension/session", undefined, ext("x".repeat(43)));
  ok("C2.9: XT-2 fail: a made-up token is refused (401)", r.status === 401, r.status);
  r = await call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)" }, ext(officer));
  ok("C2.9: BR-15 fail: a fill-only token cannot capture (403)", r.status === 403 && /capture duty/.test(r.body.message), r.body.message);
  r = await call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)" }, ext(token));
  ok("C2.9: BR-15 a capture token starts an extension capture for its person", r.status === 201 && r.body.way === "extension" && r.body.captured_by === "user-A", { status: r.status, way: r.body.way });
  r = await call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "x", value: "SAMPLE" }, ext(token));
  ok("C2.9: fail: a key the capture contract does not name is refused (400)", r.status === 400, r.status);

  // revoke: from the extension, and from the Studio (own sessions only)
  const list = await call("GET", "/extension/sessions", undefined, studio("user-O"));
  ok("C2.9: XT-2 the Studio lists a person's own extension sessions", list.status === 200 && list.body.length === 1 && list.body[0].state === "connected", list.body);
  r = await call("DELETE", `/extension/sessions/${list.body[0].id}`, undefined, studio("user-A"));
  ok("C2.9: XT-2 fail: one person cannot disconnect another's session (404)", r.status === 404, r.status);
  r = await call("DELETE", `/extension/sessions/${list.body[0].id}`, undefined, studio("user-O"));
  const after = await call("GET", "/extension/session", undefined, ext(officer));
  ok("C2.9: XT-2 the Studio disconnects its own session: the token stops working (401)", r.status === 204 && after.status === 401, { revoke: r.status, after: after.status });
  r = await call("DELETE", "/extension/session", undefined, ext(token));
  const gone = await call("GET", "/extension/session", undefined, ext(token));
  ok("C2.9: XT-2 the extension signs itself out: the token stops working (401)", r.status === 204 && gone.status === 401, { out: r.status, after: gone.status });
  const d = await pair();
  const t2 = (await connect(d.code)).body.token as string;
  sql(`update extension_session set expires_at = now() - interval '1 second' where token_hash = encode(sha256('${t2}'::bytea), 'hex')`);
  r = await call("GET", "/extension/session", undefined, ext(t2));
  ok("C2.9: XT-2 fail: a token older than 8 hours is refused (401)", r.status === 401 && /session ended/.test(r.body.message), r.body.message);

  // ──────────────────────────────────────────── XT-3 CORS: the fixed extension's origin only
  const pre = await fetch(`http://localhost:${PORT}/api/extension/session`, { method: "OPTIONS", headers: { origin: ORIGIN, "access-control-request-method": "GET", "access-control-request-headers": "authorization" } });
  ok("C2.9: XT-3 the extension's preflight is answered for its origin, with authorization and content-type only (no x-actor, no credentials)", pre.status === 204 && pre.headers.get("access-control-allow-origin") === ORIGIN && pre.headers.get("access-control-allow-headers") === "authorization, content-type" && !pre.headers.get("access-control-allow-credentials"), [pre.status, pre.headers.get("access-control-allow-headers")]);
  const bad = await fetch(`http://localhost:${PORT}/api/extension/session`, { method: "OPTIONS", headers: { origin: "https://portal.example", "access-control-request-method": "GET" } });
  ok("C2.9: XT-3 fail: another origin's preflight is refused, with no CORS header", bad.status === 403 && !bad.headers.get("access-control-allow-origin"), bad.status);
  r = await call("GET", "/session", undefined, { ...studio("user-A"), origin: ORIGIN });
  ok("C2.9: XT-3 fail: the Studio's own routes send no CORS header, even to the extension", r.status === 200 && !r.headers.get("access-control-allow-origin"));

  // ──────────────────────────────────────────── STANDARDS §8: wrong codes pause tries (last: it pauses this address)
  const good = await pair("user-O");
  const wrong = [];
  for (let n = 0; n < 5; n++) wrong.push((await call("POST", "/extension/sessions", { code: "ZZZZZZZZ", extensionId: ID }, { origin: ORIGIN })).status);
  r = await connect(good.code);
  // The used code, the expired code and the two exchanges that lost the race above count too: 4 wrong tries already.
  const first = wrong.indexOf(429);
  ok("C2.9: STANDARDS §8 five wrong codes (wrong, used or expired) in 5 minutes pause tries from that address (429), even with a good code next", first === 1 && wrong.slice(first).every((x) => x === 429) && r.status === 429 && /Too many wrong codes/.test(r.body.message), { wrong, next: r.status });

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
