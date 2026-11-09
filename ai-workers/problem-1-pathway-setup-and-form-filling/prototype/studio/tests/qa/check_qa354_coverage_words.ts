// qa (9 Nov, C7.8 capability on main 8d00b2a65; QA-354, UX · Minor): the add-a-form panel's coverage line says "<n> of <m>
// form fields fill from this case's confirmed facts", but a copy of the added form then writes fewer and lists the rest
// "by hand". Fails today; passes when the panel's count is the number the copy writes, or its words name the by-hand part.
// Runs on the configured checkpoint (Demo › Load the configured checkpoint); one Visitor visa case opened here. US$0, no AI.
//   zsh studio/tools/isolated.sh qa_354 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa354_coverage_words.ts 4473 xr_studio_qa_354
import { FAMILY, call, fillEverything, filingOf, generateCopy, main, needVisitorVisa, ok, openCase, prepare } from "../../acceptance/lib/m3.ts";

await main("QA-354", "the added form's coverage words match what its copy writes", async () => {
  const c = await openCase(needVisitorVisa(), FAMILY.slice(0, 1));
  await fillEverything(c.id);
  const P = Object.values(c.subjects)[0] as string;
  const fP = filingOf((await prepare(c.id)).p, P)?.id ?? "";
  const forms = ((await call("GET", `/runtime/filings/${fP}/addable-forms?q=`)).body?.forms ?? []) as { form: string; kind: string; why_not: unknown }[];
  const fills = forms.find((f) => f.kind === "fills" && !f.why_not)?.form ?? "";
  const det = (await call("GET", `/runtime/filings/${fP}/addable-forms/${encodeURIComponent(fills)}`)).body as { coverage?: { fills: number; total: number } | null } | null;
  const add = await call("POST", `/runtime/filings/${fP}/form-additions`, { form: fills });
  const copy = await generateCopy(c.id, fills, P);
  const row = ((await call("GET", `/runtime/cases/${c.id}/forms`)).body?.forms ?? []).find((f: { form: string; subject_id: string }) => f.form === fills && f.subject_id === P);
  const counts = row?.copies?.find((x: { id: string }) => x.id === copy)?.counts as { written: number; by_hand: number } | undefined;
  ok(`QA-354 fail: ${fills || "(no fills pick)"}: the panel says ${det?.coverage?.fills ?? "?"} of ${det?.coverage?.total ?? "?"} fill from the case; its copy writes ${counts?.written ?? "?"} (by hand ${counts?.by_hand ?? "?"}); the two agree`,
    add.status === 201 && !!counts && det?.coverage?.fills === counts.written, { coverage: det?.coverage, counts, add: add.status });
});
