// R-146 (2 Nov, #508): a whole-form field-map job gets 128k output and a 1,500 s timeout from 240 form fields, 64k and
// 900 s below (engine/parts.ts wholeFormOutput, used by Sources.ensureJobFile). Offline: no database, no server, no AI.
// Checks the rule at its edge, on inputs that are not an inventory (break m5), and on every committed v2 whole-form job
// file, which must carry exactly what the rule gives its inventory (QA-145: Load sample rewrites a file that differs).
//   tsx studio/tests/check_r146_whole_form_output.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LARGE_FORM_FIELDS, partOutputTokens, wholeFormOutput } from "../engine/parts.ts";

const PROTOTYPE = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const inv = (n: number, extra = 0) => ({ fields: [...Array.from({ length: n }, (_, i) => ({ data_path: `F[0].f${i}[0]` })), ...Array.from({ length: extra }, () => ({ data_path: null, caption: "a label" }))] });

const below = wholeFormOutput(inv(LARGE_FORM_FIELDS - 1)), at = wholeFormOutput(inv(LARGE_FORM_FIELDS));
ok("R-146 pass: 240 form fields get 128k output and a 1,500 s timeout", at.fields === 240 && at.max_output_tokens === 128_000 && at.timeout_ms === 1_500_000, at);
ok("R-146 edge: 239 form fields keep 64k and 900 s", below.fields === 239 && below.max_output_tokens === 64_000 && below.timeout_ms === 900_000, below);
const labels = wholeFormOutput(inv(239, 20));
ok("R-146 edge: only fields with a data path count (239 boxes and 20 labels stay at 64k; IMM 1344 has 245 entries, 233 boxes)", labels.fields === 239 && labels.max_output_tokens === 64_000, labels);
const odd = [null, undefined, "not json", 42, {}, { fields: "x" }, { fields: { a: 1 } }, { fields: [null, 7, "s", { data_path: 3 }, { data_path: "" }] }].map((v) => wholeFormOutput(v));
ok("R-146 fail (break m5): anything that is not an inventory with a list of fields counts 0 fields and gets 64k, never a crash", odd.every((o) => o.fields === 0 && o.max_output_tokens === 64_000 && o.timeout_ms === 900_000), odd.map((o) => o.fields));
ok("R-146: parts keep their own limit (at most 64k), whatever the whole form gets", partOutputTokens(240) === 64_000 && partOutputTokens(60) === 22_000);

// Every committed whole-form job written by ensureJobFile (template field-map.v2.md) carries what the rule gives its inventory.
// Committed only (P-214 fix, 4 Nov): p2/jobs/.gitignore keeps part jobs and "studio-fieldmap-approved-*" jobs (written per
// copy by a suite such as check_forms_demo.ts, pointing into its isolated copy) out of git, so they are not read here.
const JOBS = join(PROTOTYPE, "p2", "jobs");
const jobs = readdirSync(JOBS).filter((f) => /^studio-fieldmap-[a-z0-9-]+\.json$/.test(f) && !/-p\d+of\d+-/.test(f) && !f.startsWith("studio-fieldmap-approved-")).map((f) => ({ f, j: JSON.parse(readFileSync(join(JOBS, f), "utf8")) })).filter(({ j }) => j.template === "field-map.v2.md");
const wrong = jobs.filter(({ j }) => { const r = wholeFormOutput(JSON.parse(readFileSync(join(PROTOTYPE, "..", j.inputs[0].file), "utf8"))); return j.settings.max_output_tokens !== r.max_output_tokens || j.settings.timeout_ms !== r.timeout_ms; }).map(({ f }) => f);
ok("R-146: every committed v2 whole-form job file carries the rule's output limit and timeout for its inventory", jobs.length >= 10 && wrong.length === 0, { jobs: jobs.length, wrong });
const big = jobs.filter(({ j }) => j.settings.max_output_tokens === 128_000).map(({ f }) => f.replace(/^studio-fieldmap-|\.json$/g, "")).sort();
// C11.7: IMM 5669's job (its edition now read, so the six's load writes it) is a 128k job by the same rule. BK-16 PR 2
// (P-490): IMM 1295's committed v2 job (the spouse's work permit form on the Study permit) is one too, for its 242 fields.
ok("R-146: the 128k jobs are exactly IMM 0008, 1294, 1295, 5257, 5532, 5669 and 5710", big.join() === "imm0008e,imm1294e,imm1295e,imm5257e,imm5532e,imm5669e,imm5710e", big);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
