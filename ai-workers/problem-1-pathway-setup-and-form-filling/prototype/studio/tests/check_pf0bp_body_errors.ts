// PF-0bp (BACKLOG row PF-0bp rev 16.24, from #1823; STANDARDS §6 [M] "Errors as RFC 9457 Problem Details"): a body the
// JSON parser cannot read, or one over the 5 MB limit, is a problem answer before any route, never a 500. Named cases
// DW1-DW5 (the brief, Lead B 16 Nov), each with a passing and a failing case. The real main.ts is started (the error
// filter is wired there only) on a scratch database (every migration, the Sample seed on start, local sign-in), on a
// free port; its output is captured as the log. No browser, no model call (US$0). The database is dropped at the end.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_pf0bp_body_errors.ts
import { execFileSync, spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { createServer, request } from "node:http";
import { join } from "node:path";

const STUDIO = join(import.meta.dirname, ".."), MIG = join(STUDIO, "prisma", "migrations");
const BIN = "/opt/homebrew/opt/postgresql@18/bin", PG = ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio"];
const DB = `xr_studio_pf0bp_${process.pid}`;
const urlOf = (db: string) => `postgresql://xr_studio@127.0.0.1:54329/${db}`;
const sql = (q: string) => execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };

execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", DB]); execFileSync(join(BIN, "createdb"), [...PG, DB]);
for (const d of readdirSync(MIG).filter((x) => /^\d{14}_/.test(x)).sort()) execFileSync(join(BIN, "psql"), [urlOf(DB), "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIG, d, "migration.sql")], { stdio: ["ignore", "ignore", "pipe"] });

const PORT = await new Promise<number>((res) => { const f = createServer().listen(0, "127.0.0.1", () => { const p = (f.address() as { port: number }).port; f.close(() => res(p)); }); });
const BASE = `http://127.0.0.1:${PORT}`;
type Res = { status: number; type: string; body: any; text: string };
/** A raw POST: the body is sent exactly as given (fetch would not send broken JSON differently, but this keeps it plain). */
const post = (path: string, body: string | Buffer, token?: string, extra: Record<string, string> = {}) => new Promise<Res>((done, failed) => {
  const rq = request({ host: "127.0.0.1", port: PORT, path, method: "POST", headers: { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)), ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra } }, (rs) => {
    let d = ""; rs.setEncoding("utf8"); rs.on("data", (c) => (d += c));
    rs.on("end", () => { let b: unknown = d; try { b = JSON.parse(d); } catch { /* text */ } done({ status: rs.statusCode ?? 0, type: String(rs.headers["content-type"] ?? ""), body: b, text: d }); });
  });
  rq.on("error", failed); rq.end(body);
});

let log = "";
const p = spawn(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "api", "src", "main.ts")], {
  cwd: STUDIO, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, PLATFORM_ENVIRONMENT: "local", DATABASE_URL: urlOf(DB), STUDIO_PORT: String(PORT), STUDIO_VAR: join(STUDIO, "var", `pf0bp-check-${process.pid}`), PLATFORM_IDENTITY: "local", PLATFORM_SAMPLE_SEED: "on" },
});
p.stdout.on("data", (b: Buffer) => (log += b.toString())); p.stderr.on("data", (b: Buffer) => (log += b.toString()));
try {
  const t0 = Date.now();
  while (!/Product Studio on http/.test(log)) {
    if (Date.now() - t0 > 180_000 || p.exitCode !== null) throw new Error(`main.ts did not start: ${log.slice(-800)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  const actor = sql(`select s.actor_id from platform_staff s join platform_firm f on f.id = s.firm_id join platform_role_grant g on g.staff_id = s.id and g.ended_at is null where f.key = 'sample-firm' and g.role = 'OWNER' and s.status = 'ACTIVE' order by s.actor_id limit 1`);
  const signIn = await post("/api/platform/session/local", JSON.stringify({ firmKey: "sample-firm", actorId: actor, secondStep: true }));
  const token = signIn.body?.token as string;
  ok("PF-0bp setup: the firm's Owner signs in on the real server", signIn.status === 200 && !!token, signIn);
  const rows = () => sql(`select (select count(*) from fo_lead) || ':' || (select count(*) from plat_complaint)`);
  const before = rows(), logAt = log.length;
  const notJson = (r: Res) => r.status === 400 && /application\/problem\+json/.test(r.type) && r.body?.code === "BODY_NOT_JSON" && r.body?.title === "Request refused" && r.body?.detail === "The request body is not valid JSON. Nothing was saved or started.";

  // ---------------------------------------------------------------------------------------------------------- DW1
  const broken = ["/api/front-office/leads", "/api/platform/complaints"].map((path) => ({ path }));
  for (const b of broken) {
    const r = await post(b.path, '{"a":', token, { "idempotency-key": `pf0bp-${b.path.length}` });
    ok(`PF-0bp DW1 ${notJson(r) ? "pass" : "fail"}: POST ${b.path} with {"a": → 400 application/problem+json BODY_NOT_JSON`, notJson(r), r);
    const v = await post(b.path, "{}", token, { "idempotency-key": `pf0bp-valid-${b.path.length}` });
    // Review m2: the handler's own refusal of an empty body (its field check), not any answer under 500.
    const own = b.path.endsWith("/leads") ? v.status === 422 && v.body?.code === "INVALID" : v.status === 422 && v.body?.code === "COMPLAINT_FIELDS";
    ok(`PF-0bp DW1 pass: the same post with valid JSON reaches its handler (its own 422 field refusal, not BODY_NOT_JSON): POST ${b.path}`, own, v);
  }
  const anon = await post("/api/front-office/leads", "{not json");
  ok("PF-0bp DW1: a broken body is refused before the guard too (no token: still 400 BODY_NOT_JSON, never a 500)", notJson(anon), anon);

  // ---------------------------------------------------------------------------------------------------------- DW2
  const big = Buffer.from(JSON.stringify({ note: "x".repeat(6 * 1024 * 1024) }));
  const tooBig = await post("/api/front-office/leads", big, token);
  ok("PF-0bp DW2 pass: a 6 MB JSON body on a staff route → 413 BODY_TOO_LARGE, in size-neutral words (PF-28: the limit depends on the address)", tooBig.status === 413 && tooBig.body?.code === "BODY_TOO_LARGE" && tooBig.body?.detail === "This request is larger than this address takes. Nothing was saved or started.", tooBig.body);
  const formBig = await post("/api/public/forms/pf0bp-token/submissions", Buffer.from(JSON.stringify({ message: "x".repeat(33 * 1024) })));
  ok("PF-0bp DW2 fail→pass: the web-form door's 33 KB body still answers FO-2's own 413 (TOO_LARGE), not the 5 MB words", formBig.status === 413 && formBig.body?.code === "TOO_LARGE" && formBig.body?.detail === "This form is too long. Please shorten your message and try again.", formBig.body);

  // ---------------------------------------------------------------------------------------------------------- DW3
  const marked = await post("/api/front-office/leads", '{"note": "secret-marker-123", oops}', token);
  await new Promise((r) => setTimeout(r, 300));
  ok("PF-0bp DW3 pass: a malformed body holding secret-marker-123 → 400 BODY_NOT_JSON, and neither the answer nor the server's log repeats it",
    notJson(marked) && !marked.text.includes("secret-marker-123") && !log.includes("secret-marker-123"), { answer: marked.text, log: log.slice(logAt).slice(-600) });
  ok("PF-0bp DW3 fail: the answer gives no parser message (no 'Unexpected token', no position)", !/Unexpected|position|JSON at/i.test(marked.text), marked.text);
  // Review m1: a bare marker is the body the parser quotes whole on main ("Unexpected token 's', "secret-marker-123" is not valid JSON").
  const bare = await post("/api/front-office/leads", "secret-marker-123", token);
  await new Promise((r) => setTimeout(r, 300));
  ok("PF-0bp DW3 pass (bare marker): a body that is only secret-marker-123 → 400 BODY_NOT_JSON; neither the answer nor the log repeats it",
    notJson(bare) && !bare.text.includes("secret-marker-123") && !log.includes("secret-marker-123"), { answer: bare.text, log: log.slice(logAt).slice(-600) });

  // ---------------------------------------------------------------------------------------------------------- DW4
  const after = rows();
  ok("PF-0bp DW4: neither error reached a handler (no lead and no complaint written by the broken, oversized or marked bodies; the valid ones were refused by their handlers)", after === before, { before, after });
  ok("PF-0bp DW4 fail: no answer above was a 500, and the server logged no 500 for them", !/"status":\s*500|statusCode":\s*500/.test(log.slice(logAt)) && !/Something went wrong on the server/.test([anon, tooBig, formBig, marked, bare].map((x) => x.text).join("")), log.slice(logAt).slice(-600));
} finally {
  p.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  execFileSync(join(BIN, "dropdb"), [...PG, "--if-exists", "--force", DB]);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
