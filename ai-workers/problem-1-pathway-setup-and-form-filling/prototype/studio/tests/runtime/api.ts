// Shared helpers for the runtime lane's API checks (R1): calls the isolated copy's API as a simulated person, reads its
// database read-only, and records pass/fail lines. Each check runs against an isolated copy (tools/isolated.sh), never
// the demo.
import { execFileSync } from "node:child_process";
import { request } from "node:http";

export type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- API responses are read loosely in checks, as in the other API checks

export function client(port: number, db: string) {
  // node:http without keep-alive: fetch reuses idle sockets the server has already closed (ECONNRESET between long steps).
  const call = (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const headers: Record<string, string | number> = { "content-type": "application/json", ...(data ? { "content-length": data.length } : {}) };
    if (actor !== null) headers["x-actor"] = actor;
    const req = request({ host: "127.0.0.1", port, path: `/api${path}`, method, headers, agent: false }, (res) => {
      const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, body: j }); });
    });
    req.on("error", reject); if (data) req.write(data); req.end();
  });
  // BK-25 (P-598): a query may return whole release snapshots (C10.1's releasesOf: the Study permit now has two), past
  // execFileSync's default 1 MB, which threw before any check ran; the same buffer acceptance/lib/pack1.ts sqlFor uses.
  const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${db}`, "-Atc", q], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim();
  const until = async (fn: () => Promise<boolean>, ms = 60_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
  return { call, sql, until };
}

export function recorder() {
  const log: { name: string; ok: boolean; detail?: unknown }[] = [];
  const ok = (name: string, c: unknown, detail?: unknown) => { log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); return !!c; };
  const summary = () => { const f = log.filter((x) => !x.ok).length; console.log(`\n${log.length - f}/${log.length} passed`); return f; };
  return { ok, log, summary };
}
