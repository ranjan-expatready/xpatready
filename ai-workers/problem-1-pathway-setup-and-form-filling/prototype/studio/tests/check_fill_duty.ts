// QA-270 (C4.6): who may fill a form from Preview, by route, on a draft that really fills. POST combinations/:id/fill takes
// Preview's own check (readerOf): the studio's people fill; a case person is refused as on Preview, and nothing is saved.
// No browser, no AI, US$0.
//   zsh studio/tools/isolated.sh fill_duty 4443 start && tsx studio/tests/check_fill_duty.ts 4443 xr_studio_fill_duty
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": actor }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let parsed: unknown = t; try { parsed = JSON.parse(t); } catch { /* words */ }
  return { status: r.status, body: parsed };
};
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();

const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the fixture did not load", load.body); process.exit(2); }
const wp = sql("select id from combination where combination_key = 'wp.family' and retired_at is null limit 1");
const fill = (who: string) => call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" }, who);
const preview = (who: string) => call("GET", `/combinations/${wp}/preview?mode=draft`, undefined, who);
// This copy's own output folder (isolated.sh: var/isolated-<name>), so "nothing saved" covers the files as well as the rows.
const outputs = join(import.meta.dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "workspaces", "demo", "outputs");
const saved = () => ({ artifacts: Number(sql("select count(*) from generated_artifact")), audit: Number(sql("select count(*) from audit_event")), files: existsSync(outputs) ? readdirSync(outputs).length : 0 });

// The refusals run first, on a draft the studio's people can fill (the pass lines below prove it).
for (const [who, label] of [["user-P", "a client"], ["user-Q", "another client"], ["user-S", "another firm's representative"], ["user-R", "the firm's own representative"], ["user-T", "the firm's second representative"], ["user-O", "a case officer"]]) {
  const before = saved();
  const r = await fill(who);
  const after = saved(), seen = await preview(who);
  ok(`QA-270 fail (C4.6): ${label} is refused the filled PDF by route (403, as on Preview), no form field returned, no artifact, no audit line, no file`, r.status === 403 && seen.status === 403 && !r.body?.boxes && !r.body?.artifact_id && JSON.stringify(after) === JSON.stringify(before), { fill: r.status, preview: seen.status, before, after });
}
const before = saved();
for (const who of ["nobody", ""]) {
  const r = await fill(who);
  ok(`QA-270 fail (C4.6): ${who ? "an unknown name" : "no person"} is still 401 on the filled PDF`, r.status === 401, { status: r.status });
}
ok("QA-270 fail (C4.6): nobody and an unknown name save nothing", JSON.stringify(saved()) === JSON.stringify(before), saved());

for (const [who, label] of [["user-A", "the configuration author"], ["user-C", "the content reviewer"], ["user-B", "the approver"]]) {
  const was = saved();
  const r = await fill(who);
  const now = saved(), seen = await preview(who);
  const art = r.body?.artifact_id ? sql(`select created_by from generated_artifact where id='${r.body.artifact_id}'`) : "";
  ok(`QA-270 pass (C4.6): ${label}, who reads Preview, still gets the filled PDF: read back equal and intact, one artifact in their name, one audit line`, r.status === 201 && seen.status === 200 && r.body?.report?.intact === true && r.body?.report?.read_back_equal === r.body?.report?.written && art === who && now.artifacts === was.artifacts + 1 && now.audit === was.audit + 1 && now.files >= 3, { fill: r.status, preview: seen.status, was, now, art });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
