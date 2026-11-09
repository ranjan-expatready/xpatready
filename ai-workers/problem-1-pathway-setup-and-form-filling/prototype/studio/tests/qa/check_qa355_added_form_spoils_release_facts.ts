// qa (9 Nov, C7.8 capability on main 8d00b2a65; QA-355, Bug · Major; found by the fresh Opus reader of the C7.8 verdict,
// confirmed here): adding a form that fills (IMM 0008) to one filing makes facts the release's own forms already wrote
// "answered with a problem" on those forms (IMM 5257, IMM 5645): the added form's map gives the shared fact the choice list
// "codes as listed in the inventory" (engine/runtime/case.ts shapeOf over withAdditions' joined maps), which no real value
// matches. Fails today; passes when an add leaves every release form's written fields and open lines as they were.
// Runs on the configured checkpoint (Demo › Load the configured checkpoint); one Visitor visa case opened here. US$0, no AI.
//   zsh studio/tools/isolated.sh qa_355 4474 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa355_added_form_spoils_release_facts.ts 4474 xr_studio_qa_355
import { FAMILY, call, fillEverything, filingOf, main, needVisitorVisa, ok, openCase, prepare } from "../../acceptance/lib/m3.ts";

type Row = { form: string; subject_id: string; added?: unknown; draft?: { written_now: number; to_fix: number } };
await main("QA-355", "adding a form leaves the release's forms as they were", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY.slice(0, 1));
  await fillEverything(c.id);
  const P = Object.values(c.subjects)[0] as string;
  const fP = filingOf((await prepare(c.id)).p, P)?.id ?? "";
  const read = async () => (((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []) as Row[]).filter((f) => f.subject_id === P && !f.added)
    .map((f) => `${f.form}: written ${f.draft?.written_now}, to fix ${f.draft?.to_fix}`).sort();
  const before = await read();
  const forms = ((await call("GET", `/runtime/filings/${fP}/addable-forms?q=`)).body?.forms ?? []) as { form: string; kind: string; why_not: unknown }[];
  const fills = forms.find((f) => f.kind === "fills" && !f.why_not)?.form ?? "";
  const add = await call("POST", `/runtime/filings/${fP}/form-additions`, { form: fills });
  const after = await read();
  ok(`QA-355 fail: adding ${fills || "(no fills pick)"} leaves each release form's written and to-fix counts unchanged`, add.status === 201 && before.join("|") === after.join("|"), { add: add.status, before, after });
  const rm = await call("POST", `/runtime/form-additions/${add.body?.id}/remove`, { reason: "qa check: undo the add (Sample)" });
  const back = await read();
  ok("QA-355 pass: removing the addition restores them (the cause is the addition)", rm.status === 200 && back.join("|") === before.join("|"), { rm: rm.status, back });
});
