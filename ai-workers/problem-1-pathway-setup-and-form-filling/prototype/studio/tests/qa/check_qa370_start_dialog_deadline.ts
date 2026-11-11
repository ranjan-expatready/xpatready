// qa (9 Nov, C6.17 capability on main df52c9fc6; QA-370, UX · Minor): in the "Start next stage" dialog the officer types the
// ending stage's "Study permit valid until", the key detail the next stage's deadline is worked out from, but the dialog's
// Deadline line still reads "Can't set: Study permit valid until is missing (Sample rule)". The started stage then shows
// "Apply for the work permit by <that date>". The dialog tells the person the wrong thing right before "This cannot be undone".
// Fails today; passes when the dialog's deadline follows the date typed (or says it is worked out from it at the start).
// Runs on the configured checkpoint (Demo › Load the configured checkpoint, loaded first); one study-permit case opened by
// the API as setup (not under test). Changes nothing: the dialog is cancelled. US$0, no AI.
//   zsh studio/tools/isolated.sh qa_370 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa370_start_dialog_deadline.ts 4473 xr_studio_qa_370
import { CLIENT, PORT, call, main, ok, run, sql } from "../../acceptance/lib/m3.ts";
import { walker } from "../../acceptance/lib/browser.ts";

type Openable = { combination_id: string; startable: boolean; stage?: { route: string; earlier: unknown[] } };
await main("QA-370", "the Start next stage dialog's deadline follows the date typed in it", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  // the route's first stage, as the pack finds it (acceptance/C6.17.test.ts)
  const firstKey = later?.stage ? sql(`select (stages->0->>'combination_key') from route where key='${later.stage.route}'`) : null;
  const first = rows.find((r) => r.startable && !r.stage && sql(`select combination_key from combination where id='${r.combination_id}'`) === firstKey);
  const made = first ? await call("POST", "/runtime/cases", { combinationId: first.combination_id, reference: `QA370-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client D" } }) : null;
  const id = made?.body?.id as string | undefined;
  const preview = id ? await call("GET", `/runtime/cases/${id}/stages/next`) : null;
  ok("setup: a case on the route's first stage, its next stage offered", made?.status === 201 && preview?.status === 200, { made: made?.status, preview: preview?.status });
  if (!id || preview?.status !== 200) return;
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const p = await w.open("user-O", 1440);
    await p.goto(`/cases/${id}`); await w.settle(p, "case");
    await p.getByRole("button", { name: /Start next stage/ }).click();
    const dlg = p.getByRole("dialog"); await dlg.getByText("This cannot be undone.").waitFor();
    const field = dlg.getByLabel(/valid until/i).first();
    await field.fill("2027-05-31"); await p.waitForTimeout(800);
    const t = await dlg.innerText();
    const line = (t.split("Deadline")[1] ?? "").split("\n").map((s) => s.trim()).filter(Boolean)[0] ?? "";
    ok(`QA-370 fail: with "valid until" 2027-05-31 typed in the dialog, its Deadline line names that date, not "Can't set … missing" (reads: "${line}")`,
      !/Can't set/.test(line) && /31 May 2027|May 31, 2027|2027-05-31/.test(line), { line });
    await dlg.getByRole("button", { name: "Cancel" }).click();
  } finally { await w.close(); }
});
