// QA-275 (C4.6): two Preview fills of one form and person in one minute must not share a file or change the first artifact's bytes.
// The Sample profile is changed between fills on this isolated copy so the two PDFs must differ. Live AI off, US$0.
//   zsh studio/tools/isolated.sh qa_fill_overwrite 4470 start && tsx studio/tests/qa/check_qa275_fill_overwrite.ts 4470 xr_studio_qa_fill_overwrite
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "content-type": "application/json", "x-actor": "user-A" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let parsed: unknown = text; try { parsed = JSON.parse(text); } catch { /* a file or plain words */ }
  return { status: r.status, body: parsed };
};
const file = async (id: string) => {
  const r = await fetch(`http://localhost:${PORT}/api/artifacts/${id}/file`, { headers: { "x-actor": "user-A" } });
  return { status: r.status, sha256: createHash("sha256").update(Buffer.from(await r.arrayBuffer())).digest("hex") };
};
type Artifact = { id: string; path: string; sha256: string };
const artifact = (id: string) => JSON.parse(sql(`select row_to_json(x) from (select id, path, sha256 from generated_artifact where id='${id}') x`)) as Artifact;

const intoMinute = Date.now() % 60_000;
if (intoMinute >= 50_000) await new Promise((resolve) => setTimeout(resolve, 60_000 - intoMinute + 100));
const load = await call("POST", "/demo/load");
if (load.status >= 300) { console.error("STOP  the Sample fixture did not load", load.body); process.exit(2); }
const combination = sql("select id from combination where combination_key='wp.family' and retired_at is null limit 1");
const fill = () => call("POST", `/combinations/${combination}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" });
const firstResponse = await fill();
ok("QA-275 setup (C4.6): the first Preview fill completes", firstResponse.status === 201 && !!(firstResponse.body as { artifact_id?: string })?.artifact_id, firstResponse.status);
if (firstResponse.status !== 201) process.exit(2);
const first = artifact((firstResponse.body as { artifact_id: string }).artifact_id);
const firstRead = await file(first.id);
ok("QA-275 setup: the first artifact initially serves its own bytes", firstRead.status === 200 && firstRead.sha256 === first.sha256, { stored: first.sha256, served: firstRead.sha256 });
const anonymous = await fetch(`http://localhost:${PORT}/api/artifacts/${first.id}/file`);
ok("QA-270 fail (C4.6, the file route): an artifact download with no person is refused (401), not served to anyone holding its link", anonymous.status === 401, anonymous.status);

const changed = sql("update sample_fact set value='\"QA_CHANGED_SAMPLE_NAME\"'::jsonb where canonical_field_key='person.family_name' and person_id='principal' and profile_id in (select id from sample_profile where profile_key='client-a-family') returning 1");
ok("QA-275 setup: one Sample family-name fact changes between fills", changed.split("\n")[0] === "1", changed);
const secondResponse = await fill();
ok("QA-275 setup: a second fill of the same form and person completes in the same minute", secondResponse.status === 201, secondResponse.status);
if (secondResponse.status !== 201) process.exit(2);
const second = artifact((secondResponse.body as { artifact_id: string }).artifact_id);
const outputs = join(import.meta.dirname, "..", "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`, "workspaces", "demo", "outputs");
const request = JSON.parse(readFileSync(join(outputs, basename(second.path).replace(/\.pdf$/, ".request.json")), "utf8"));
ok("QA-275 setup: the second PDF really receives the changed Sample value", JSON.stringify(request.values).includes("QA_CHANGED_SAMPLE_NAME") && second.sha256 !== first.sha256, { first: first.sha256, second: second.sha256 });
ok("QA-275 fail (C4.6): each fill gets its own file name, never a minute-sized name shared by both", first.path !== second.path, { first: first.path, second: second.path });
const firstAfter = await file(first.id);
ok("QA-275 fail (C4.6): the earlier artifact still serves its own original bytes after the later fill", firstAfter.status === 200 && firstAfter.sha256 === first.sha256, { expected: first.sha256, actual: firstAfter.sha256, second: second.sha256 });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
