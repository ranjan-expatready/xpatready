// qa (9 Nov, C6.17 capability on main df52c9fc6; QA-374, Gap · Minor; the B139 review's open minor m7, flagged untracked by
// the fresh Opus reader): concept BR-8 shows the deadline (Sample) on "the strip, the stage panel, the dialog and the
// Open-a-case summary", but Open a case › Earlier stages shows none, even with the study permit's "valid until" typed.
// Fails today; passes when the Open a case step shows the deadline it will set (or "Can't set …"), labelled Sample.
// Runs on the configured checkpoint (loaded first); nothing is created (the dialog is cancelled). US$0, no AI.
//   zsh studio/tools/isolated.sh qa_374 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa374_open_case_deadline.ts 4473 xr_studio_qa_374
import { PORT, call, main, ok } from "../../acceptance/lib/m3.ts";
import { walker } from "../../acceptance/lib/browser.ts";

type Openable = { combination: string; startable: boolean; stage?: { earlier: unknown[] } };
await main("QA-374", "Open a case at a later stage shows the deadline it will set", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  ok("setup: a combination that opens at a later stage", !!later, rows.map((r) => r.combination));
  if (!later) return;
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const p = await w.open("user-O", 1440);
    await p.goto("/cases"); await w.settle(p, "cases");
    await p.getByRole("button", { name: "Open a case" }).click();
    const d = p.getByRole("dialog"); await d.waitFor();
    const sel = d.getByLabel("Combination (released)");
    await sel.locator("option", { hasText: later.combination }).first().waitFor({ state: "attached" }); // options load after the dialog opens
    const opts = await sel.locator("option").evaluateAll((os) => os.map((o) => [(o as HTMLOptionElement).value, (o.textContent ?? "").replace(/\s+/g, " ").trim()]));
    const value = opts.find(([, s]) => s.startsWith(later.combination))?.[0] ?? "";
    await sel.selectOption(value);
    await d.getByText("Earlier stages").waitFor();
    await d.getByLabel(/Done before we started/).check();
    await d.getByLabel(/valid until/i).first().fill("2027-02-03"); await p.waitForTimeout(600);
    const t = await d.innerText();
    ok(`QA-374 fail: with "valid until" 2027-02-03 typed, Open a case shows the deadline it will set, labelled Sample`, /3 Feb 2027|Feb 3, 2027|2027-02-03/.test(t.replace(/valid until[\s\S]{0,40}2027-02-03/i, "")) && /Apply .* by|Deadline/i.test(t), { text: t.slice(t.indexOf("Earlier stages"), t.indexOf("Earlier stages") + 600) });
    await d.getByRole("button", { name: "Cancel" }).click();
  } finally { await w.close(); }
});
