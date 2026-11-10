// qa (9 Nov, C6.17 capability on main df52c9fc6; QA-373, UX · Minor; found by the fresh Opus reader of qa's verdict): at 400 px
// the Start next stage dialog's footer is wider than the dialog: Cancel starts at x ≈ -25 px, cut off at the screen's left
// edge ("ancel"). It still works by click and the × closes the dialog. Fails today; passes when both footer buttons sit
// fully inside the viewport. Runs on the configured checkpoint (loaded first); one study case opened by the API (setup);
// the dialog is cancelled. US$0, no AI.
//   zsh studio/tools/isolated.sh qa_373 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa373_start_dialog_400px.ts 4473 xr_studio_qa_373
import { CLIENT, PORT, call, main, ok, run, sql } from "../../acceptance/lib/m3.ts";
import { walker } from "../../acceptance/lib/browser.ts";

type Openable = { combination_id: string; startable: boolean; stage?: { route: string; earlier: unknown[] } };
await main("QA-373", "the Start next stage dialog's buttons fit at 400 px", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  const firstKey = later?.stage ? sql(`select (stages->0->>'combination_key') from route where key='${later.stage.route}'`) : null;
  const first = rows.find((r) => r.startable && !r.stage && sql(`select combination_key from combination where id='${r.combination_id}'`) === firstKey);
  const made = first ? await call("POST", "/runtime/cases", { combinationId: first.combination_id, reference: `QA373-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client G" } }) : null;
  const id = made?.body?.id as string | undefined;
  ok("setup: a case on the route's first stage", made?.status === 201, { made: made?.status });
  if (!id) return;
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const p = await w.open("user-O", 400);
    await p.goto(`/cases/${id}`); await w.settle(p, "case");
    await p.getByRole("button", { name: /Start next stage/ }).click();
    const dlg = p.getByRole("dialog"); await dlg.getByText("This cannot be undone.").waitFor();
    const vw = p.viewportSize()!.width;
    const boxes = { cancel: await dlg.getByRole("button", { name: "Cancel" }).boundingBox(), start: await p.locator('button[data-start-confirm="true"]').boundingBox() };
    const inside = (b: { x: number; width: number } | null) => !!b && b.x >= 0 && b.x + b.width <= vw;
    ok(`QA-373 fail: at 400 px both footer buttons are fully inside the viewport (Cancel x=${boxes.cancel?.x?.toFixed(1)}, Start x=${boxes.start?.x?.toFixed(1)})`, inside(boxes.cancel) && inside(boxes.start), boxes);
    await dlg.getByRole("button", { name: "Cancel" }).click();
  } finally { await w.close(); }
});
