// C7.5 part 2 scaffolding for the review-run checks (tests/check_c75_review_runs_api.ts, tests/check_c75_review_page_browser.cjs):
// a MADE-UP saved review, written only into an isolated copy's own folder (var/isolated-<name>/made-up-review-runs, read
// when the copy runs with STUDIO_MADE_UP_REVIEW_RUNS=1), never into p2/runs, never committed, labelled test_fixture in each
// record (the product refuses such a record anywhere else). It is never a real answer: the real saved run is the tech
// lead's one paid run (P-295). Its findings: one fact both rounds raise (High), one only the first round raises (Low), one
// checker finding whose quote is not on the form (dropped by the rules), one box the checker could not judge.
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/fixtures/c75-made-up-run.ts <port> <db> prepare
//     → opens the pack's case (acceptance/C7.5.test.ts's values), writes its made-up run, prints {case, subject}
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as m3 from "../../acceptance/lib/m3.ts";
import { FORM_REVIEW } from "../../api/src/review-runs.ts";

const STUDIO = join(import.meta.dirname, "..", ".."), PROTOTYPE = join(STUDIO, ".."), SOLUTION = join(PROTOTYPE, "..");
export const MADE_UP = join(STUDIO, "var", `isolated-${m3.DB.replace(/^xr_studio_/, "")}`, "made-up-review-runs");
const tSha = (t: string) => createHash("sha256").update(readFileSync(join(PROTOTYPE, "p2", "prompts", t))).digest("hex");
type Input = { file: string; sha256: string };
export type Plan = { forms: { form: string; edition: string; sheet: string; sheet_sha256: string; lines: { box: string; caption: string; fact: string | null; value: string }[]; saved: { available: boolean; why: string | null; files: string[]; made_up: boolean } }[]; estimate: { live_usd: number; live_worst_usd: number; replay_usd: number; job_cap_usd: number }; live_allowed: boolean; replay_available: boolean; made_up: boolean; made_up_words: string | null; plan_sha256: string; stand_in: string };
const FIXTURE = "made up by tests/check_c75_review_runs_api.ts for its own isolated copy: never a real answer, never counted";

/** A made-up saved run of one round, in the launcher's record shape (as tests/fixtures/c91-saved-run.ts), for these inputs. */
export const record = (isCheck: boolean, inputs: Input[], edition: { code: string; edition: string }, out: unknown) => ({ test_fixture: FIXTURE, caller: "live", contract_valid: true, raw_output: JSON.stringify(out),
  drafting_run: { status: "completed", usage: { cost_usd: 0.5 }, attempts: [{ outcome: "completed" }], inputs: { official_files: inputs, combination: `edition:${edition.code}:${edition.edition}` } },
  launch_evidence: { template_sha256: tSha(isCheck ? FORM_REVIEW.check : FORM_REVIEW.template) } });
let stamp = 100;
/** Writes the draft and checker rounds of one made-up run into the copy's own folder (never p2/runs). */
export function writeMadeUp(tag: string, inputs: Input[], draft: unknown, check: unknown) {
  mkdirSync(MADE_UP, { recursive: true });
  const t = `20261108t10${String(stamp++).padStart(4, "0")}000z`;
  const ed = { code: "IMM 5257", edition: "09-2023" };
  writeFileSync(join(MADE_UP, `${FORM_REVIEW.jobBase}-c75fixture${tag}-live-${t}-c75fix.json`), JSON.stringify(record(false, inputs, ed, draft)));
  writeFileSync(join(MADE_UP, `${FORM_REVIEW.jobBase}-check-c75fixture${tag}-live-${t}-c75fix.json`), JSON.stringify(record(true, inputs, ed, check)));
}
export const sheetOf = (plan: Plan) => ({ fields: plan.forms[0].lines });
export const inputsOf = (plan: Plan): Input[] => [{ file: "prototype/p1/inventory/imm5257e.inventory.json", sha256: createHash("sha256").update(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"))).digest("hex") }, { file: plan.forms[0].sheet, sha256: plan.forms[0].sheet_sha256 }];
/** Two made-up findings on facts the sheet fills: one both rounds raise (High), one only the first round raises (Low), and
 *  one in the checker round whose quote is not on the form (dropped by the rules). */
export function answersFor(plan: Plan) {
  const rows = sheetOf(plan).fields.filter((r) => r.fact && r.value.length >= 2);
  const pick = (fact: string) => rows.find((r) => r.fact === fact);
  const a = pick("person.applying_from_country") ?? rows[0], b = pick("person.current_residence_country") ?? rows.find((r) => r !== a)!;
  const d = rows.find((r) => r.fact !== a.fact && r.fact !== b.fact)!;
  const fa = { field: a.fact!, box: a.box, severity: "MAJOR", quote: a.value.slice(0, 20), reason: `Made-up test finding on ${a.caption} (Sample).` };
  const fb = { field: b.fact!, box: b.box, severity: "MINOR", quote: b.value.slice(0, 20), reason: `Made-up test finding on ${b.caption} (Sample).` };
  const edition = plan.forms[0].edition;
  return { a, b, draft: { form_edition: edition, findings: [fa, fb], unreadable: [] }, check: { form_edition: edition, findings: [{ ...fa, reason: "Made-up checker reason (Sample)." }, { field: d.fact!, box: d.box, severity: "INFO", quote: "words that are not on this form", reason: "Made up (Sample)." }], unreadable: [{ box: "Made-up unreadable box", why: "Made up (Sample)." }] } };
}
/** The pack's own case, made the same way (acceptance/C7.5.test.ts up to its plan), so its plan names the same sheet. */
export async function packLikeCase() {
  const vv = m3.needVisitorVisa();
  const c = await m3.openCase(vv, [{ role: "principal", name: "Sample Client A", dob: m3.FIXED.dob }]);
  const P = c.subjects["Sample Client A"];
  await m3.fillEverything(c.id);
  await m3.prepare(c.id);
  await m3.answer(c.id, c.caseSubject, "case.intended_stay_from", m3.FIXED.stayFrom); await m3.answer(c.id, c.caseSubject, "case.intended_stay_to", m3.FIXED.stayTo);
  await m3.answer(c.id, P, "person.passport_expiry_date", m3.FIXED.expiry); await m3.confirmAll(c.id, P); await m3.confirmAll(c.id, c.caseSubject);
  return { c, P };
}


if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[4] === "prepare") {
  const { c, P } = await packLikeCase();
  const plan = (await m3.call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P })).body as Plan;
  const { draft, check } = answersFor(plan);
  writeMadeUp(`p${process.pid}`, inputsOf(plan), draft, check);
  console.log(JSON.stringify({ case: c.id, subject: P }));
}
//   … c75-made-up-run.ts <port> <db> answer <case> <person> <fact> <value>: the officer answers and confirms (the pack's helpers).
if (import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[4] === "answer") {
  const [caseId, subject, fact, value] = process.argv.slice(5);
  const r = await m3.answer(caseId, subject, fact, value); await m3.confirmAll(caseId, subject);
  process.exitCode = r.status === 200 ? 0 : 1;
}
