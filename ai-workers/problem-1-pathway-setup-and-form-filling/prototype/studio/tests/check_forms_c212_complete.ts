// C2.12 (IRCC-F08, plan BR-10 and F3a-1): "Field map complete" (step 6) is not said while form fields carried from an
// earlier release are still undecided, and every validator problem names the forms it touches. The pure rule with a pass
// and a fail, then the API on the sample. US$0 (no model call).
//   zsh studio/tools/isolated.sh forms_c212c 4457 start && tsx studio/tests/check_forms_c212_complete.ts 4457 xr_studio_forms_c212c
import { formProgress, type ProgressFacts } from "../engine/form-progress.ts";
import { needCombo } from "../acceptance/lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4457), DB = process.argv[3] ?? "xr_studio_forms_c212c";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const get = async (path: string) => { const r = await fetch(`http://localhost:${PORT}/api${path}`, { headers: { "x-actor": "user-A" } }); return { status: r.status, body: await r.json() as any }; }; // eslint-disable-line @typescript-eslint/no-explicit-any -- loose test reads
const base: ProgressFacts = { form: "IMM 5257", combinationId: "c1", line: "present", edition: "IMM 5257 (09-2023)", mapped: 12, unresolved: 0, draft: "done", items: [], problems: [], canAuthor: true };
const six = (f: Partial<ProgressFacts>) => formProgress({ ...base, ...f }).steps.find((s) => s.key === "complete")!;

(async () => {
  ok("C2.12 IRCC-F08 pass: every form field decided, nothing open above: step 6 is done", six({}).state === "done");
  const c = six({ carried: 16 });
  ok("C2.12 IRCC-F08 fail: 16 carried undecided form fields: step 6 is not done, says how many and is the author's", c.state === "needs_you" && c.count === 16 && /16 form fields not decided yet/.test(c.words) && c.next?.href === "/c/c1/forms", c);
  ok("C2.12 IRCC-F08 fail: the carried ones show in what's left", formProgress({ ...base, carried: 1 }).whats_left.some((w) => w.step === "complete" && w.count === 1));
  ok("C2.12 IRCC-F08 fail: a carried one keeps the path's current step on step 6", formProgress({ ...base, carried: 2 }).current === "complete");

  await fetch(`http://localhost:${PORT}/api/demo/reset`, { method: "POST", headers: { "x-actor": "user-A", "content-type": "application/json" }, body: JSON.stringify({ confirm: "RESET" }) });
  await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" } });
  const wp = await needCombo(PORT, DB, "lmia_work_permit");
  const problems = ((await get(`/combinations/${wp}`)).body?.draft?.problems ?? []) as { where: string; item: string; forms?: string[] }[];
  ok("C2.12 F3a-1 pass: every validator problem carries a forms list", problems.length > 0 && problems.every((p) => Array.isArray(p.forms)), problems.slice(0, 2));
  ok("C2.12 F3a-1 fail: a Forms problem lists its own form, never another", problems.filter((p) => p.where === "Forms").every((p) => p.forms!.length === 1 && p.forms![0] === p.item), problems.filter((p) => p.where === "Forms").slice(0, 2));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
