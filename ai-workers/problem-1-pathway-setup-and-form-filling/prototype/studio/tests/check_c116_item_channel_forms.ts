// C11.6 (review M2 on #1056): the case's forms follow each person's item channel, not only the release line. A Visitor
// visa family case (release 2 of the pack's setup): Client A's IMM 5707 is filed Online, so its PDF copy is stamped
// "Copy, not for filing" and never locked; moved to PDF upload on the case, /forms gives it for filing and names Client A
// no longer among the Online forms, but the copy made while it was Online stays stamped and is refused at lock with the
// words to generate a new one; a new copy is not stamped and is refused only for what still blocks filing. Moved back
// to Online, nothing on it is validated or locked. No model call (US$0).
//   zsh studio/tools/isolated.sh fm_c116f 4454 start && tsx studio/tests/check_c116_item_channel_forms.ts 4454 xr_studio_fm_c116f
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { DB, FAMILY, PORT, call, itemsOf, needVisitorVisa, officerOf, openCase, prepare, sql } from "../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, "..");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const releases = () => Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`) ?? 0);
const setup = (file: string) => spawnSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, file), String(PORT), DB], { cwd: join(STUDIO, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts");
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());

const vv = needVisitorVisa();
const c = await openCase(vv, FAMILY);
const officer = officerOf(c.id), P = c.subjects["Sample Client A"];
type Copy = { id: string; status: string; copy_not_for_filing: boolean };
type Forms = { forms: { form: string; subject_id: string; channel: string; for_filing: boolean; copies: Copy[] }[]; online: { form: string; people: string[] }[] };
const forms = async () => (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body as Forms;
const mine = (f: Forms) => f.forms.find((x) => x.form === "IMM 5707" && x.subject_id === P);
async function generated(): Promise<Copy | undefined> {
  const r = await call("POST", `/runtime/cases/${c.id}/forms/${encodeURIComponent("IMM 5707")}/${P}/generate`, { idempotencyKey: crypto.randomUUID() }, officer);
  const id = (r.body as { id?: string })?.id;
  for (let i = 0; i < 120; i++) {
    const x = mine(await forms())?.copies.find((k) => !id || k.id === id);
    if (x && x.status !== "QUEUED" && x.status !== "RUNNING") return x;
    await new Promise((res) => setTimeout(res, 500));
  }
  return undefined;
}
const move = async (to: string) => { const p = (await prepare(c.id)).p!; return call("PATCH", `/runtime/items/${itemsOf(p, P, "IMM 5707")[0]?.id}/channel`, { channel: to, version: p.version }, officer); };
const lock = (id: string) => call("POST", `/runtime/form-copies/${id}/lock`, { kind: "filed" }, officer);

const f0 = await forms();
ok("pass: on its line's channel, Client A's IMM 5707 is Online: not for filing, and named among the Online forms", mine(f0)?.channel === "ONLINE" && mine(f0)?.for_filing === false && (f0.online.find((x) => x.form === "IMM 5707")?.people ?? []).includes("Sample Client A"), { mine: mine(f0), online: f0.online });
const old = await generated();
ok("pass: a copy made while it is Online is stamped \"Copy, not for filing\"", old?.status === "GENERATED" && old.copy_not_for_filing === true, old);

ok("setup: Client A's IMM 5707 moved to PDF upload on the case", (await move("PDF_UPLOAD")).status === 200);
const f1 = await forms();
ok("C11.6 (review M2): /forms follows the item: PDF upload, for filing; the Online list no longer names Client A; the spouse's stays Online",
  mine(f1)?.channel === "PDF_UPLOAD" && mine(f1)?.for_filing === true && !(f1.online.find((x) => x.form === "IMM 5707")?.people ?? []).includes("Sample Client A")
  && f1.forms.find((x) => x.form === "IMM 5707" && x.subject_id === c.subjects["Sample Spouse A"])?.channel === "ONLINE", { mine: mine(f1), online: f1.online });
ok("pass: the copy made while it was Online still reads stamped (it is what its pages say)", mine(f1)?.copies.find((k) => k.id === old?.id)?.copy_not_for_filing === true);
let r = await lock(old!.id);
ok("fail: the stamped copy is refused at lock (409) with the words to generate a new copy; nothing locked", r.status === 409 && /stamped "Copy, not for filing"\. Generate a new copy/.test(r.body?.detail ?? "") && sql(`select coalesce(locked_kind, '') from form_instance where id='${old!.id}'`) === "", r.body?.detail);
const fresh = await generated();
ok("pass: a new copy is made for filing (not stamped)", fresh?.status === "GENERATED" && fresh.copy_not_for_filing === false && sql(`select result_json->>'not_for_filing' from form_instance where id='${fresh.id}'`) === "false", fresh);
r = await lock(fresh!.id);
ok("pass: the new copy is refused only for what still blocks filing, never as stamped", r.status === 409 && !/stamped/.test(r.body?.detail ?? ""), r.body?.detail);

ok("setup: moved back to Online", (await move("ONLINE")).status === 200);
r = await lock(fresh!.id);
ok("fail: back on Online, the copy is refused at lock as filed Online (409)", r.status === 409 && /is filed Online/.test(r.body?.detail ?? ""), r.body?.detail);
ok("pass: back on Online, /forms gives it not for filing and names Client A among the Online forms again", mine(await forms())?.for_filing === false && ((await forms()).online.find((x) => x.form === "IMM 5707")?.people ?? []).includes("Sample Client A"));

console.log(`\n${pass}/${pass + fail} passed`);
process.exitCode = fail ? 1 : 0;
