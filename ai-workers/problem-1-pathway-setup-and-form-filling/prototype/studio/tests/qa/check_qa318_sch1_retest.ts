// qa (11 Nov, Lead 15's retest list on #1532; main fbfb263c7): QA-318 retest, qa's own check (the builder's is
// tests/check_qa318_sch1.ts). On the configured checkpoint a Visitor visa family case with every fact answered and
// confirmed (the pack helper, as in the finding): each adult's IMM 5257 SCH1 must leave no mandatory form field empty,
// and its card must never read "Facts confirmed" over an empty mandatory field. Found on main fc49dc5a4 (9 Nov): 5 left
// empty (Questions 4–8) under "Facts confirmed". Passes when fixed. US$0, no AI.
//   zsh tools/isolated.sh qa_318 4474 start && <Demo › Load the configured checkpoint as user-A> \
//     && tsx tests/qa/check_qa318_sch1_retest.ts 4474 xr_studio_qa_318
import { FAMILY, call, fillEverything, generateCopy, main, needVisitorVisa, ok, openCase } from "../../acceptance/lib/m3.ts";

type Row = { form: string; subject_id: string; person: string; fields_open?: { label?: string; reason?: string }[]; facts?: unknown[]; draft?: { written_now: number; mapped: number; to_fix: number } };
await main("QA-318", "IMM 5257 SCH1 leaves no mandatory form field empty on a fully answered case", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY);
  ok("QA-318 setup: every fact answered and confirmed by the pack helper", await fillEverything(c.id));
  const adults = [FAMILY[0].name, FAMILY[1].name];
  const forms = ((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []) as Row[];
  const sch1 = forms.filter((f) => f.form === "IMM 5257 SCH1" && adults.includes(f.person));
  ok("QA-318 setup: each adult has IMM 5257 SCH1", sch1.length === 2, forms.map((f) => `${f.form}|${f.person}`));
  for (const f of sch1) {
    await generateCopy(c.id, f.form, f.subject_id);
    const now = (((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []) as Row[]).find((x) => x.form === f.form && x.subject_id === f.subject_id)!;
    const open = now.fields_open ?? [];
    ok(`QA-318a ${f.person}: IMM 5257 SCH1 leaves no mandatory form field empty (was 5: Questions 4–8)`, open.length === 0, open.map((o) => `${o.label}: ${o.reason}`));
    ok(`QA-318b ${f.person}: never "Facts confirmed" over an empty mandatory form field`, open.length === 0 || (now.facts ?? []).length > 0, { open: open.length, facts: (now.facts ?? []).length });
  }
});
