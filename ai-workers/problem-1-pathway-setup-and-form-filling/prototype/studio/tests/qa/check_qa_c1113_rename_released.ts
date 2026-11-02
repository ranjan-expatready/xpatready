// qa (2 Nov, after-merge on main 2ef4f15d): C11.13 / P-266 — a rename of a shared field that a released combination
// uses needs a second person. The guarded check (POST /change-sets/check, G-CORE B1) says "second_person", but the
// library's own rename (PATCH /library/fields/:key/name) still renames at once for one author. Fails today; passes
// when the rename goes through the guarded path (G-CORE B2). No browser, NO model call (US$0).
//   zsh studio/tools/isolated.sh qa_c1113r 4477 start && tsx studio/tests/qa/check_qa_c1113_rename_released.ts 4477 xr_studio_qa_c1113r
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const PORT = Number(process.argv[2] ?? 4477), DB = process.argv[3] ?? "xr_studio_qa_c1113r";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const PSQL = existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql";
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

(async () => {
  const FIELD = "person.family_name", NEW = "Last name (qa P-266)";
  const loaded = await call("POST", "/demo/load");
  ok("setup: the sample inputs load", loaded.status === 201, loaded.body?.message);
  const rel = sql(`select r.combination_id from config_release r where r.snapshot->'canonical_fields' @> jsonb_build_array(jsonb_build_object('id', '${FIELD}')) order by r.version desc limit 1`);
  ok("setup: a released combination carries the field", /^[0-9a-f-]{36}$/.test(rel), rel);
  const before = sql(`select label from canonical_field where canonical_field_key = '${FIELD}' order by version desc limit 1`);

  const chk = await call("POST", "/change-sets/check", { items: [{ action: "rename", kind: "field", key: FIELD, name: NEW }] });
  ok("the guarded check rates this rename 'second person' (P-266)", chk.body?.tier?.tier === "second_person", chk.body?.tier);

  const r = await call("PATCH", `/library/fields/${FIELD}/name`, { name: NEW });
  const after = sql(`select label from canonical_field where canonical_field_key = '${FIELD}' order by version desc limit 1`);
  ok("P-266: one author's rename of a field a released combination uses does not take effect alone (waits for a second person or is refused in words)",
    after === before && r.status !== 200, { status: r.status, body: r.body, labelBefore: before, labelAfter: after });

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
