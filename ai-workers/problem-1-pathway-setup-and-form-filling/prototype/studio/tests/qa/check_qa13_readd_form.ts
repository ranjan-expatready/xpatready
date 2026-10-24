// QA-13 (Bug, Major, C1.4 / C2.4; BR-12): a form removed from a combination must be addable again. Today the removed
// draft line is kept as RETIRED version 1 and "+ Add" (POST /combinations/:id/lines) creates version 1 again, so the
// database refuses it: 409 "the database refused a duplicate" (found by the Lead on the shared demo, Visitor visa).
// Replayable check on its own isolated copy (qa lane ports, xr_studio_qa_*). No browser, no model call.
// FAILS today (main 65826022); PASSES once re-adding creates the next version (or revives the line).
//   tsx studio/tests/qa/check_qa13_readd_form.ts [port=4473]        (starts a fresh copy itself)
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4473), NAME = "qa_qa13", DB = `xr_studio_${NAME}`;
const STUDIO = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};

(async () => {
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "start"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  let r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status < 300);
  const vv = sql("select id from combination where combination_key='vv.single'");
  const lines = () => sql(`select coalesce(string_agg(version || ':' || status, ','), '') from combination_form where combination_id='${vv}' and lineage_key='IMM 5707'`);
  ok("setup: Visitor visa has no IMM 5707 line yet (its next step is 'Add 1 form from the library')", lines() === "", lines());
  r = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 5707" });
  ok("the author adds IMM 5707 from the library", r.status === 201 && r.body?.added === "form_line", r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5707")}`, { retire: true });
  ok("the author removes it again (draft)", r.status < 300 && lines().includes("RETIRED"), lines());
  r = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 5707" });
  ok("QA-13: adding the removed form again works (one live line, history kept)", r.status === 201, { status: r.status, detail: r.body?.detail, lines: lines() });
  ok("QA-13: the screen's words are not a database message", !/database refused a duplicate/.test(r.body?.detail ?? ""), r.body?.detail);
  console.log(`\n${pass} pass, ${fail} fail`);
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "stop"]);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
