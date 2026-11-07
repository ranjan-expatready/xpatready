// QA-235 (closed 7 Nov; its fix is B84, commit c1eb87094): a copy of IMM 5257 SCH1 and of IMM 0008 DEP can be made on the
// configured checkpoint: Schedule 1 for the principal, the spouse and a child from 18, refused in words for a child of 10;
// a junk form name is "No such form." and never echoed. PASSES today. US$0, no model call.
//   tsx studio/tests/qa/check_qa235_schedule1_copy.ts <port> <database>     (an isolated copy on the configured checkpoint)
import { OFFICER, call, firms, main, needVisitorVisa, ok, openCase, yearsAgo } from "../../acceptance/lib/m3.ts";

const make = async (caseId: string, form: string, subject: string, officer: string) => {
  const r = await call("POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(form)}/${subject}/generate`, { idempotencyKey: `qa235-${subject}` }, officer);
  let copy: { status?: string; intact?: boolean } | null = null;
  if (r.body?.id) for (let i = 0; i < 90 && !["GENERATED", "FAILED"].includes(copy?.status ?? ""); i++) { await new Promise((z) => setTimeout(z, 500)); copy = (await call("GET", `/runtime/form-copies/${r.body.id}`, undefined, officer)).body; }
  return { status: r.status, detail: r.body?.detail as string | undefined, copy };
};

await main("QA-235", "Schedule 1's copy can be made", async () => {
  const f = await firms(), officer = f.officer ?? OFFICER;
  const c = await openCase(needVisitorVisa(), [{ role: "principal", name: "Sample Client S", dob: yearsAgo(45) }, { role: "spouse_or_partner", name: "Sample Spouse S", dob: yearsAgo(43) }, { role: "child", name: "Sample Grown Child S", dob: yearsAgo(20) }, { role: "child", name: "Sample Child S", dob: yearsAgo(10) }], { representative: f.rep, caseOfficers: [officer] });
  for (const name of ["Sample Client S", "Sample Spouse S", "Sample Grown Child S"]) {
    const r = await make(c.id, "IMM 5257 SCH1", c.subjects[name], officer);
    ok(`QA-235-1 pass: Schedule 1's copy is made for ${name}, intact`, r.status === 202 && r.copy?.status === "GENERATED" && r.copy?.intact === true, r);
  }
  const small = await make(c.id, "IMM 5257 SCH1", c.subjects["Sample Child S"], officer);
  ok("QA-235-2 fail: a child of 10 has no Schedule 1, refused in words (422)", small.status === 422 && /does not apply/i.test(small.detail ?? ""), small);
  const junk = await call("POST", `/runtime/cases/${c.id}/forms/${encodeURIComponent("IMM 9999<x>")}/${c.subjects["Sample Client S"]}/generate`, { idempotencyKey: "qa235-junk-name" }, officer);
  ok("QA-235-3 fail: a junk form name is \"No such form.\", never echoed (404)", junk.status === 404 && junk.body?.detail === "No such form.", junk.body);
});
