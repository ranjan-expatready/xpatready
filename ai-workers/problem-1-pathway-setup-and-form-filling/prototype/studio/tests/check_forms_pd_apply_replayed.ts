// Row PD (forms, #528 reviewer M1): every replayed field-map draft of the six can be applied. IMM 5532's inventory once
// gave one data path to separate boxes in unnamed subforms (44 entries on 20 paths), so Apply on its replayed draft hit
// form_field_map's unique key and answered 409. The reader now numbers same-named boxes per data scope; this check loads
// the six, returns every proposal of each replayed draft (the library stays as it was, so no draft goes stale), and
// applies each one: 201, one form_field_map row per box. Its list is the load's own replayed drafts, never a fixed list,
// so a saved run added later (IMM 5532's re-run) is covered without editing this file. The unique key is not loosened:
// the fail side proves the database still refuses a second row for a box. Isolated copy, no browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh forms_pd 4456 start && tsx studio/tests/check_forms_pd_apply_replayed.ts 4456 xr_studio_forms_pd
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";

const PORT = Number(process.argv[2] ?? 4456), DB = process.argv[3] ?? "xr_studio_forms_pd";
const SOLUTION = join(import.meta.dirname, "..", "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const psql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8").length : 0; };

(async () => {
  const before = ledger();
  const load = await call("POST", "/demo/load", { sample: "six" });
  if (load.status >= 300) { console.error("STOP  the six did not load", load.body); process.exit(2); }
  const jobs = psql(`select j.id || '§' || a.file_name || '§' || j.run_file || '§' || a.inventory_file from drafting_job j join source_attachment a on a.id = j.attachment_id
    where j.kind = 'field_map' and j.mode = 'REPLAY' and j.status = 'COMPLETED' order by a.file_name`).split("\n").filter(Boolean)
    .map((l) => { const [id, file, run, inventory] = l.split("§"); return { id, file, run, inventory }; });
  ok("PD: the six replay their saved field-map answers (every replayed draft is checked below)", jobs.length > 0 && jobs.length === load.body?.drafts?.replayed, { replayed: load.body?.drafts?.replayed, completed: jobs.map((j) => j.file) });

  // Each replayed draft's inventory gives every box its own data path: the cause of the 409, checked before Apply.
  const shared = jobs.map((j) => {
    const inv = JSON.parse(readFileSync(join(SOLUTION, j.inventory), "utf8")) as { fields: { data_path: string | null }[] };
    const paths = inv.fields.map((f) => f.data_path).filter(Boolean);
    return { file: j.file, repeated: paths.length - new Set(paths).size };
  }).filter((s) => s.repeated);
  ok("PD pass: every replayed draft's inventory gives each box its own data path", shared.length === 0, shared);

  const applied: { file: string; status: number; boxes: number; rows: number; message?: string }[] = [];
  for (const j of jobs) {
    const items = ((await call("GET", `/jobs/${j.id}`)).body?.items ?? []) as { id: string; decision: string }[];
    for (const it of items.filter((i) => i.decision === "PENDING"))
      await call("POST", `/jobs/${j.id}/items/${it.id}`, { decision: "RETURNED", note: "PD check: left for a person." }, "user-C");
    const r = await call("POST", `/jobs/${j.id}/apply`, {});
    const rows = r.status === 201 ? Number(psql(`select count(*) from form_field_map m join form_edition e on e.id = m.form_edition_id where e.sha256 = (select a.sha256 from drafting_job d join source_attachment a on a.id = d.attachment_id where d.id = '${j.id}')`)) : 0;
    applied.push({ file: j.file, status: r.status, boxes: Number(r.body?.boxes ?? -1), rows, message: r.status === 201 ? undefined : r.body?.message });
  }
  ok("PD pass: Apply of each replayed draft of the six answers 201", applied.length === jobs.length && applied.every((a) => a.status === 201), applied.map((a) => `${a.file} ${a.status}${a.message ? ` ${a.message}` : ""}`));
  ok("PD pass: each applied draft writes one form_field_map row per box it reports", applied.every((a) => a.boxes > 0 && a.rows === a.boxes), applied.map((a) => `${a.file} ${a.rows}/${a.boxes}`));
  ok("PD pass: within each form edition no data path is mapped twice", Number(psql(`select count(*) from (select form_edition_id, data_path, version from form_field_map group by 1, 2, 3 having count(*) > 1) d`)) === 0);

  // Fail side: the unique key (form_edition_id, data_path, version) stays; a second row for an applied box is refused.
  const one = psql(`select id from form_field_map order by data_path limit 1`);
  let refused = "";
  try {
    psql(`insert into form_field_map (id, workspace_id, form_edition_id, data_path, outcome, version, status, origin, updated_by)
      select gen_random_uuid(), workspace_id, form_edition_id, data_path, outcome, version, status, origin, 'pd-check' from form_field_map where id = '${one}'`);
  } catch (e) { refused = String((e as { stderr?: string }).stderr ?? e); }
  ok("PD fail: the database still refuses a second form_field_map row for the same box (the unique key is not loosened)", /duplicate key|unique constraint/i.test(refused) && Number(psql(`select count(*) from form_field_map where updated_by = 'pd-check'`)) === 0, refused.split("\n")[0]);
  const again = jobs[0] ? await call("POST", `/jobs/${jobs[0].id}/apply`, {}) : { status: 0, body: null };
  ok("PD fail: applying a draft a second time is refused with a plain reason, nothing written twice", again.status === 409 && /Already applied/.test(again.body?.message ?? ""), { status: again.status, message: again.body?.message });
  ok("R-143: no live AI call, the spend ledger unchanged", ledger() === before && Number(psql(`select count(*) from drafting_job where mode = 'LIVE'`)) === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
