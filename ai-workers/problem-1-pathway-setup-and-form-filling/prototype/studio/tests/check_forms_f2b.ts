// F2b (forms lane, F2 plan §7 XT-1…XT-3, BR-15; Lead decision Q1; challenge M7): the browser extension signs in with a
// one-time code from the Studio, gets an opaque token bound to the person, the modes their duties give and the fixed
// extension's id, and uses only that token; the API answers the extension's origin only. Every rule with a passing and
// a failing case. Isolated copy (own database and files), no browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_f2b 4456 start && tsx studio/tests/check_forms_f2b.ts 4456 xr_studio_forms_f2b
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does: core.ts uses decorators)
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
/** fetch, sent again when the copy was just restarted (a kept-alive connection closed, or not listening yet), for up to
 *  60 s; never sent twice once a reply came. */
const send = async (url: string, init: RequestInit): Promise<Response> => {
  for (const t = Date.now(); ;) {
    try { return await fetch(url, init); } catch (e) {
      if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET|ECONNREFUSED/.test((e as { cause?: { code?: string } }).cause?.code ?? "") || Date.now() - t > 60_000) throw e;
      await new Promise((res) => setTimeout(res, 300));
    }
  }
};
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
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

  // ──────────────────────────────────────────── STANDARDS §8, review-2 Minor 1: wrong tries count per code, in the database
  // A code's first three characters find it; a wrong code with them counts against it; the fifth voids it. Never a pause
  // per address (a shared office address paused everyone) and never a count in memory (a restart forgot it).
  const ROOT = join(STUDIO, "..", "..", "..", "..");
  const restart = () => execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), DB.replace(/^xr_studio_/, ""), String(PORT), "restart"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  /** The i-th wrong code that starts like `code` (its last character changed). */
  const wrongOf = (code: string, i: number) => `${code.slice(0, 7)}${ALPHA[(ALPHA.indexOf(code[7]) + 1 + i) % ALPHA.length]}`;
  // Each scenario below starts with no tries in the last minute (the throttle per address is checked on its own after them).
  const clearTries = () => sql("delete from extension_code_try");
  const triesOf = (code: string) => sql(`select wrong_tries || '|' || (voided_at is not null) from extension_pairing where code_hash = encode(sha256('${code}'::bytea), 'hex')`);
  clearTries();
  const four = await pair("user-O");
  for (let n = 0; n < 4; n++) r = await connect(wrongOf(four.code, n));
  ok("C2.9: Minor 1 a wrong code that starts like an open code is refused (401) in words, and counted against that code in the database", r.status === 401 && /check it/.test(r.body.message) && /stops working after 5 wrong tries/.test(r.body.message) && triesOf(four.code) === "4|false", { message: r.body.message, tries: triesOf(four.code) });
  r = await connect(four.code);
  ok("C2.9: Minor 1 after four wrong tries the right code still works (201)", r.status === 201, r.status);
  const kept3 = await pair("user-O");
  for (let n = 0; n < 3; n++) await connect(wrongOf(kept3.code, n));
  restart();
  for (let n = 3; n < 5; n++) r = await connect(wrongOf(kept3.code, n));
  const after5 = await connect(kept3.code);
  ok("C2.9: Minor 1 fail: three wrong tries, a server restart, two more: the fifth voids the code and the right code is refused (the count survived the restart)", r.status === 401 && /stopped working after 5 wrong tries/.test(r.body.message) && after5.status === 401 && /stopped working/.test(after5.body.message) && triesOf(kept3.code) === "5|true", { fifth: r.body.message, right: after5.body.message, tries: triesOf(kept3.code) });
  ok("C2.9: Minor 1 the voided code is in the audit for its person, without the code", sql(`select count(*) from audit_event where action='voided' and actor='user-O'`) !== "0" && sql(`select count(*) from audit_event where summary like '%${kept3.code}%'`) === "0");
  // A shared office address: thirty wrong codes that start like no open code pause nobody.
  clearTries();
  const office = await Promise.all(Array.from({ length: 30 }, (_, i) => connect(`ZZZ${ALPHA.slice(i % 20, (i % 20) + 5)}`)));
  const colleague = await connect((await pair("user-O")).code);
  ok("C2.9: Minor 1 thirty wrong codes from one address (a shared office) never pause another person's right code (201, no 429)", office.every((x) => x.status === 401) && colleague.status === 201, { refused: office.filter((x) => x.status === 401).length, colleague: colleague.status });
  // Break M1: wrong tries sent at the same moment are all counted; the code is voided at exactly five.
  clearTries();
  const burstCode = await pair("user-O");
  const burst = await Promise.all(Array.from({ length: 30 }, (_, i) => connect(wrongOf(burstCode.code, i % 29))));
  const late = await connect(burstCode.code);
  ok("C2.9: break M1 thirty wrong codes against one code at the same moment: all refused, counted to exactly five, the code voided", burst.every((x) => x.status === 401) && triesOf(burstCode.code) === "5|true" && late.status === 401, { tries: triesOf(burstCode.code), late: late.status });
  // The right code and the fifth wrong try at the same moment: one wins, never both.
  clearTries();
  const edge = await pair("user-O");
  for (let n = 0; n < 4; n++) await connect(wrongOf(edge.code, n));
  const [right, fifth] = await Promise.all([connect(edge.code), connect(wrongOf(edge.code, 4))]);
  const state = sql(`select (used_at is not null) || '|' || (voided_at is not null) || '|' || (select count(*) from extension_session s where s.pairing_id = p.id) from extension_pairing p where code_hash = encode(sha256('${edge.code}'::bytea), 'hex')`);
  ok("C2.9: break M1 the right code and the fifth wrong try at the same moment: either a session (used) or a void, never both", fifth.status === 401 && ((right.status === 201 && state === "true|false|1") || (right.status === 401 && state === "false|true|0")), { right: right.status, state });
  r = await call("POST", "/extension/sessions", { code: wrongOf((await pair("user-O")).code, 0), extensionId: "b".repeat(32) }, { origin: ORIGIN });
  ok("C2.9: break m2 a request from another extension is refused for who it is and spends no try of any code", r.status === 401 && /not the ExpatReady extension/.test(r.body.message) && sql("select count(*) from extension_pairing where wrong_tries > 0 and used_at is null and voided_at is null") === "0", r.body.message);
  // A voided code no longer counts as open: the person can ask for another.
  sql("delete from extension_pairing where person='user-A' and used_at is null"); clearTries();
  const fiveA = [];
  for (let n = 0; n < 5; n++) fiveA.push((await pair("user-A")).code as string);
  const sixth = await call("POST", "/extension/pairings", {}, studio("user-A"));
  for (let n = 0; n < 5; n++) await connect(wrongOf(fiveA[0], n));
  const again = await call("POST", "/extension/pairings", {}, studio("user-A"));
  ok("C2.9: Minor 1 a voided code no longer holds one of the five open places (sixth refused 429; after a void, a new code 201)", sixth.status === 429 && again.status === 201, [sixth.status, again.status]);
  sql("delete from extension_pairing where person='user-A' and used_at is null"); // the author's open places again, for the checks below
  // Review-3 Major 2: every try is throttled in the database, 60 a minute per address and 600 for the whole server.
  clearTries();
  const sweep = await Promise.all(Array.from({ length: 70 }, (_, i) => connect(`QQ${ALPHA.slice(i % 25, (i % 25) + 6)}`)));
  const blocked = await connect((await pair("user-O")).code);
  ok("C2.9: review-3 Major 2 fail: one address sweeping codes is stopped after 60 tries in a minute (429, in words), the right code too while it lasts", sweep.filter((x) => x.status === 401).length <= 60 && sweep.filter((x) => x.status === 429).length >= 10 && blocked.status === 429 && /Too many tries from this network/.test(blocked.body.message), { tried: sweep.filter((x) => x.status === 401).length, refused: sweep.filter((x) => x.status === 429).length, next: blocked.body.message });
  restart();
  ok("C2.9: review-3 Major 2 the count is in the database: a restart does not lift it", (await connect((await pair("user-O")).code)).status === 429);
  sql("update extension_code_try set at = now() - interval '2 minutes'");
  ok("C2.9: review-3 Major 2 a minute later the right code connects (201): a shared office is never paused for long", (await connect((await pair("user-O")).code)).status === 201);
  sql("insert into extension_code_try (address) select 'other-' || g from generate_series(1, 600) g");
  r = await connect((await pair("user-O")).code);
  ok("C2.9: review-3 Major 2 fail: 600 tries from many addresses in a minute pause every try for that minute (429, in words)", r.status === 429 && /Too many tries to connect an extension/.test(r.body.message), r.body.message);
  clearTries();
  // Review-4 Major 1: one address over its own limit never sets off the server-wide one for everyone else.
  sql("delete from extension_pairing where person='user-O' and used_at is null"); // codes the refused tries above left open
  sql("insert into extension_code_try (address) select 'one-address' from generate_series(1, 600)");
  r = await connect((await pair("user-O")).code);
  ok("C2.9: review-4 Major 1 fail case: 600 tries from one other address in a minute never pause a colleague's right code (201, not 429)", r.status === 201, r.body.message ?? r.status);
  sql("insert into extension_code_try (address) select 'many-' || (g % 9) from generate_series(1, 600) g");
  r = await connect((await pair("user-O")).code);
  ok("C2.9: review-4 Major 1 the server-wide limit still holds: ten addresses each at their own limit pause the next try (429)", r.status === 429 && /Too many tries to connect an extension/.test(r.body.message), r.body.message);
  clearTries();
  sql("delete from extension_pairing where person='user-O' and used_at is null"); // codes the refused tries above left open
  const ten: unknown[] = [];
  for (let n = 0; n < 10; n++) { const x = await connect((await pair("user-O")).code); ten.push(x.status === 201 ? 201 : `${x.status} ${x.body.message}`); }
  ok("C2.9: review-3 Major 2 a right code's own try is taken back: ten codes in a row from one office connect and leave no try counted", ten.every((x) => x === 201) && sql("select count(*) from extension_code_try") === "0", { ten, left: sql("select count(*) from extension_code_try") });
  restart();
  for (let n = 0; n < 22; n++) await connect((await pair("user-O")).code);
  const mine = (await call("GET", "/extension/sessions", undefined, studio("user-O"))).body as { state: string }[];
  ok("C2.9: break m3 every live session of a person is listed (22 connected, none hidden behind the newest 20)", mine.filter((x) => x.state === "connected").length >= 22, mine.filter((x) => x.state === "connected").length);

  // ──────────────────────────────────────────── Lead note 25 Oct 09:30: a demo reset signs every extension out
  const kept = (await connect((await pair("user-O")).code)).body.token as string;
  const openCode = (await pair("user-A")).code as string;
  ok("C2.9: before the reset: a live session and an open code", (await call("GET", "/extension/session", undefined, ext(kept))).status === 200 && Number(sql("select count(*) from extension_session")) > 0);
  r = await call("POST", "/demo/reset", { confirm: "RESET" }, studio("user-A"));
  const left = sql("select (select count(*) from extension_session)||':'||(select count(*) from extension_pairing)||':'||(select count(*) from recapture_task)");
  ok("C2.9: the demo reset deletes the workspace's extension sessions, codes and tasks (0:0:0)", r.status < 300 && left === "0:0:0", { reset: r.status, left });
  ok("C2.9: fail: after the reset the old token and the old code no longer work (401)", (await call("GET", "/extension/session", undefined, ext(kept))).status === 401 && (await connect(openCode)).status === 401);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
