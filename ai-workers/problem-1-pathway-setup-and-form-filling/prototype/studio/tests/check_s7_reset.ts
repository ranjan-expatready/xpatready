// S7 step 1 (P-108: Reset empties everything): after Reset no table keeps a row of the old workspace. The tables are read
// from the database's own column list, so a table added later is checked without changing this test. No AI (US$0).
//   zsh studio/tools/isolated.sh runtime_s7 4435 start && tsx studio/tests/check_s7_reset.ts 4435 xr_studio_runtime_s7
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_s7";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
/** Every table with a workspace id, and how many of its rows name a workspace that no longer exists. */
const orphans = () => {
  const tables = sql(`select table_name from information_schema.columns where table_schema='public' and column_name='workspace_id' and table_name <> 'workspace' order by 1`).split("\n").filter(Boolean);
  return { tables: tables.length, left: tables.map((t) => [t, Number(sql(`select count(*) from "${t}" where workspace_id not in (select id from workspace)`))] as const).filter(([, n]) => n > 0) };
};

(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const old = sql(`select id from workspace limit 1`);
  // A canada.ca file the finder saved and a Forms tab line change: the two tables Reset missed before S7.
  const combo = sql(`select id from combination where workspace_id='${old}' limit 1`);
  sql(`insert into form_line_action (id, workspace_id, combination_id, action, detail, "by") values ('${randomUUID()}', '${old}', '${combo}', 'edit', '{}', 'user-A')`);
  sql(`insert into official_download (id, workspace_id, sha256, kind, form_page_url, source_url, file_name, stored_path, bytes, basis, started_by) values ('${randomUUID()}', '${old}', '${"a".repeat(64)}', 'form', 'https://www.canada.ca/x', 'https://www.canada.ca/x.pdf', 'x.pdf', 'x.pdf', 1, 'download', 'user-A')`);
  const scope = (await call("GET", "/demo/status")).body?.scope?.rows ?? {};
  ok("C10.1: Reset's list of what it removes counts the finder's saved files and the form line changes", (scope["canada.ca files saved by the finder and form line changes"] ?? 0) >= 2, scope["canada.ca files saved by the finder and form line changes"]);
  const r = await call("POST", "/demo/reset", { confirm: "RESET" });
  const after = orphans();
  ok("C10.1 pass (P-108): after Reset no table keeps a row of the old workspace, every table with a workspace id checked", r.status < 300 && after.tables >= 40 && after.left.length === 0, after);
  ok("C10.1: built-in person roles stay (P-108, 27 Oct), nothing else", r.body?.remaining_rows === 0 && r.body?.remaining_built_in >= 6 && r.body?.preserved_unchanged === true, { remaining: r.body?.remaining_rows, builtIn: r.body?.remaining_built_in });
  // Fail: a row left behind in any table is found and named (planted under a workspace id that does not exist).
  const ghost = randomUUID();
  sql(`insert into form_line_action (id, workspace_id, combination_id, action, detail, "by") values ('${randomUUID()}', '${ghost}', '${randomUUID()}', 'edit', '{}', 'user-A')`);
  const planted = orphans();
  ok("C10.1 fail: a row left behind is found and its table named", planted.left.some(([t, n]) => t === "form_line_action" && n === 1), planted.left);
  sql(`delete from form_line_action where workspace_id='${ghost}'`);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
