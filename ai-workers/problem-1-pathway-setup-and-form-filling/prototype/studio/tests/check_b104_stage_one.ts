// B104 (P-351): offline checks of the configured checkpoint's J7 Stage 1 data (samples/checkpoint-stage-one.json) and its
// guard (api/src/checkpoint-stage-one-data.ts stageOneProblems). No server, no database, no model call (US$0).
// The live step (who signs, the IRCC account, the gates on Visitor visa's release 1) is proved on a fresh checkpoint by
// the packs C8.2 and C6.9 and by the walk product/screens/B104-checkpoint-stage-one/walk-stage1-1440.cjs (PR #1084).
//   tsx studio/tests/check_b104_stage_one.ts
import { stageOneOf, stageOneProblems, type StageOne } from "../api/src/checkpoint-stage-one-data.ts";
import { VV_FORM_RULES, FAMILY_FORM_BY_CHANNEL, FORM_SETUP } from "../api/src/form-setup.ts";

let failed = 0;
const ok = (label: string, cond: boolean, detail: unknown = "") => { if (!cond) failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : ` — ${JSON.stringify(detail).slice(0, 300)}`}`); };

const vv = stageOneOf("vv.single");
ok("B104-1 pass: the Visitor visa has Stage 1 data, and the sample file passes its guard", !!vv && stageOneProblems(vv).length === 0, vv ? stageOneProblems(vv) : "no vv.single entry");
ok("B104-2 pass: a combination with no entry gets nothing (no combination is assumed, P-319)", stageOneOf("wp.lmia_inside") === null && stageOneOf(undefined) === null);
// Every form the file names is a line the checkpoint puts on the Visitor visa (FORM_SETUP), so none is silently skipped.
const lines = new Set([FORM_SETUP["vv.single"].application, ...VV_FORM_RULES.map((r) => r.form), FAMILY_FORM_BY_CHANNEL.paper.form]);
const named = (vv?.signers ?? []).map((s) => s.form);
ok("B104-3 pass: each form whose signer is set is a line of the configured Visitor visa", named.length === 3 && named.every((f) => lines.has(f)), { named, lines: [...lines] });
ok("B104-4 pass: the account is APR Portal and the gates are the two Sample gates and four officer's-judgement lines (S7)",
  vv?.account?.value === "APR_PORTAL" && vv?.eligibility?.gates.length === 2 && vv?.eligibility?.judgement.length === 4, vv?.eligibility);

const base: StageOne = { account: { value: "APR_PORTAL", cite: "a source quoted with its page and date" }, signers: [{ form: "IMM 5707", signedBy: "person", cite: "a source quoted with its page and date" }] };
const says = (s: StageOne, re: RegExp) => stageOneProblems(s).some((p) => re.test(p));
ok("B104-5 fail: a signer the product does not know is refused, naming the known ones", says({ ...base, signers: [{ form: "IMM 5707", signedBy: "nobody", cite: base.signers![0].cite }] }, /"nobody" is not a signer the product knows \(person, /));
ok("B104-6 fail: an IRCC account the product does not know is refused", says({ ...base, account: { value: "APR", cite: base.account!.cite } }, /IRCC account "APR" is not one the product knows/));
ok("B104-7 fail: a value with no source quoted is refused (P-170)", says({ ...base, signers: [{ form: "IMM 5707", signedBy: "person", cite: "" }] }, /IMM 5707: who signs it has no source quoted/) && says({ ...base, account: { value: "APR_PORTAL", cite: " " } }, /no source quoted/));
ok("B104-8 fail: a form named twice is refused", says({ ...base, signers: [...base.signers!, ...base.signers!] }, /IMM 5707 is named twice/));
ok("B104-9 fail: gates with no source quoted are refused", says({ ...base, eligibility: { gates: [], judgement: [], cite: "" } }, /eligibility gates have no source quoted/));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
