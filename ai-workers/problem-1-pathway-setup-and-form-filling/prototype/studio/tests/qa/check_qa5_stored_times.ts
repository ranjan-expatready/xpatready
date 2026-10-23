// QA-5 (Minor): times written by the Studio must be stored as the real moment. Today every time the app writes (audit
// lines, combinations, releases) lands in PostgreSQL 5 h 30 min early on this machine (server time zone Asia/Kolkata):
// the app reads its own values back correctly, but anything reading the database (SQL reports, exports, a team backend,
// "checked more than 12 months ago" in SQL) sees the wrong time. FAILS today; PASSES when stored = actual.
//   tsx studio/tests/qa/check_qa5_stored_times.ts <port> <database>     (an isolated copy; writes one program)
import { execFileSync } from "node:child_process";
const PORT = Number(process.argv[2] ?? 4470), DB = process.argv[3] ?? "xr_studio_qa_m2";
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const label = `QA time probe ${Date.now()}`;
const r = await fetch(`http://localhost:${PORT}/api/program-nodes`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ kind: "PROGRAM", parentKey: "individual", label }) });
const seconds = Number(sql(`select extract(epoch from (now() - at))::int from audit_event where summary like '%${label}%' order by at desc limit 1`));
const shown = await (await fetch(`http://localhost:${PORT}/api/activity`)).json() as any[];
const apiAt = shown.find((a) => a.summary?.includes(label))?.at;
const apiSkew = apiAt ? Math.round((Date.now() - Date.parse(apiAt)) / 1000) : NaN;
console.log(`setup: program created (${r.status}); server time zone ${sql("show timezone")}`);
console.log(`${Math.abs(apiSkew) < 120 ? "PASS" : "FAIL"}  control: the app shows the audit line at the real time (${apiSkew} s ago)`);
console.log(`${Math.abs(seconds) < 120 ? "PASS" : "FAIL"}  QA-5: the stored audit time is the real time (stored ${seconds} s before now)`);
process.exit(Math.abs(seconds) < 120 ? 0 : 1);
