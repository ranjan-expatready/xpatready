// Pack 1's own helpers (forms in and field mapping, P-220): the demo guard, the psql path and the sample-combination
// resolver every pack-1 file uses. Another pack owns acceptance/lib/m3.ts.
//  * guard(port, db): stops (exit 2) unless the database is an isolated copy's (xr_studio_<name>, name not "demo") and
//    the port is not the demo's 4400 — the house rule of tests/qa/check_qa_r1a_probe.ts and tools/isolated.sh. Every
//    file calls it before its first request, so a wrong port can never reset the founder's demo.
//  * checkCopy(port, db): guard, then the server on the port must answer and use that database (exit 2 otherwise).
//  * PSQL: env PSQL, else the current Homebrew path (one change moves every file, e.g. on Linux CI).
//  * comboFor(port, db, name): a sample combination found by its structure trail, so each file works on today's sample
//    and on P-112's six names (C11.3 AT-9, P-148): P-112's trail through GET /catalogue first, then today's key.
//    Returns "" when neither exists; needCombo() stops (exit 2) instead, so a missing setup is never a pass.
//  * plantRun(name, record): test input (Sample) written into prototype/p2/runs, where the server reads saved AI answers
//    (no per-copy folder exists for them). Every planted name carries "-pk1" and this process id; each is removed at the
//    end, on an error, on Ctrl-C (SIGINT), SIGTERM and SIGHUP, and leftovers of an earlier run whose process is gone are
//    removed at the start. p2/runs/.gitignore covers only studio-fieldmap-approved-*, which the finder's and the field
//    map's readers do not read, so these names are not ignored: the cleanup is what keeps git status clean. Proposal for
//    the Lead: add "*-pk1*.json" to p2/runs/.gitignore.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";

export const PSQL = process.env.PSQL || "/opt/homebrew/opt/postgresql@18/bin/psql";
export const DEMO_PORT = 4400;

export const stop = (why: string): never => { console.error(`STOP  setup missing: ${why}`); process.exit(2); };

export function guard(port: number, db: string) {
  if (!Number.isInteger(port) || port <= 0) stop(`no port given (usage: tsx acceptance/<file> <port> xr_studio_<name>)`);
  if (port === DEMO_PORT) stop("refused: never the shared demo on :4400 (start an isolated copy: zsh tools/isolated.sh <name> <port> start)");
  const m = /^xr_studio_([a-z0-9_]+)$/.exec(db);
  if (!m || m[1] === "demo") stop(`refused: ${db} is not an isolated copy's database (xr_studio_<name>, never the demo)`);
}

export const sqlFor = (db: string) => (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${db}`, "-Atc", q], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();

/** node:http without keep-alive (as tests/runtime/api.ts: fetch reuses sockets the server closed). */
export const get = (port: number, path: string, actor = "user-A"): Promise<{ status: number; body: any }> => new Promise((resolve) => { // eslint-disable-line @typescript-eslint/no-explicit-any -- read loosely
  const req = request({ host: "127.0.0.1", port, path: `/api${path}`, method: "GET", headers: { "x-actor": actor }, agent: false }, (res) => {
    const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, body: j }); });
  });
  req.on("error", () => resolve({ status: 0, body: null })); req.end();
});

export async function checkCopy(port: number, db: string) {
  guard(port, db);
  const served = (await get(port, "/session")).body?.workspace?.id;
  if (!served) stop(`no copy answers on port ${port}: start it with zsh tools/isolated.sh ${db.replace(/^xr_studio_/, "")} ${port} start`);
  let inDb = "";
  try { inDb = sqlFor(db)(`select id from workspace where id='${String(served).replace(/'/g, "")}'`); } catch { /* below */ }
  if (!inDb) stop(`the database ${db} is not the one the server on port ${port} uses`);
}

const T = (...p: string[]) => p.join(" › ");
/** P-112's trail (the wave 1 names, C11.3 AT-9) and today's sample key, per combination. super_visa has no P-112
 *  combination (P-148 removes it): files must not depend on it. */
export const COMBOS = {
  visitor_visa: { trail: T("Retail", "Temporary residence", "Visitors", "Visitor visa", "No sub-category"), key: "vv.single" },
  study_permit: { trail: T("Retail", "Temporary residence", "Study permits", "Study permit", "Outside Canada"), key: "sp.student" },
  lmia_work_permit: { trail: T("Retail", "Temporary residence", "Work permits", "Employer-specific work permit", "With an LMIA – inside Canada"), key: "wp.family" },
  pnp_express_entry: { trail: T("Retail", "Permanent residence", "Provincial nominees", "Express Entry stream", "No sub-category"), key: "" },
  spouse_partner: { trail: T("Retail", "Permanent residence", "Family sponsorship", "Spouse or common-law partner", "No sub-category"), key: "fs.outside" },
  high_wage: { trail: T("Corporate and employers", "Temporary residence", "Labour market impact assessment", "High-wage position", "No sub-category"), key: "lm.high_wage" },
} as const;
export type ComboName = keyof typeof COMBOS;

export async function comboFor(port: number, db: string, name: ComboName): Promise<string> {
  const want = COMBOS[name];
  for (const p of ["INDIVIDUAL", "CORPORATE"]) {
    const rows = ((await get(port, `/catalogue?pathway=${p}&filter=all`)).body?.rows ?? []) as { trail?: string[]; combinationId?: string | null }[];
    const hit = rows.find((r) => r.combinationId && T(...(r.trail ?? [])) === want.trail);
    if (hit?.combinationId) return hit.combinationId;
  }
  return want.key ? sqlFor(db)(`select id from combination where combination_key='${want.key}'`) : "";
}

export async function needCombo(port: number, db: string, name: ComboName): Promise<string> {
  const id = await comboFor(port, db, name);
  if (!id) stop(`the loaded sample has no ${name.replace(/_/g, " ")} combination (neither P-112's ${COMBOS[name].trail} nor today's ${COMBOS[name].key || "—"})`);
  return id;
}

export const RUNS = join(import.meta.dirname, "..", "..", "..", "p2", "runs");
const planted: string[] = [];
export const PLANT_MARK = `pk1${process.pid}`;
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
export function cleanupRuns() { for (const f of planted.splice(0)) rmSync(join(RUNS, f), { force: true }); }
let hooked = false;
/** Writes one saved-run record (test input, Sample) under a name the readers accept; the name must contain PLANT_MARK. */
export function plantRun(name: string, record: unknown) {
  if (!name.includes(PLANT_MARK)) throw new Error(`a planted run name must carry ${PLANT_MARK}`);
  if (!hooked) {
    hooked = true;
    for (const f of existsSync(RUNS) ? readdirSync(RUNS) : []) { const m = /pk1(\d+)\.json$/.exec(f); if (m && !alive(Number(m[1]))) rmSync(join(RUNS, f), { force: true }); }
    process.on("exit", cleanupRuns);
    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(sig, () => { cleanupRuns(); process.exit(130); });
  }
  writeFileSync(join(RUNS, name), JSON.stringify(record)); planted.push(name);
}
