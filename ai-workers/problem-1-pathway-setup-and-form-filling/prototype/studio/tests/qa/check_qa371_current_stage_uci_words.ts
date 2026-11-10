// qa (9 Nov, C6.17 capability on main df52c9fc6; QA-371, UX · Minor): a case opened at the work permit with the study permit
// "Done before we started" and its UCI 12345678. The UCI is saved on the done-before stage's record and as Client A's
// answer (P-412 F13 (c)). The current stage's panel then reads "UCI (also the client's answer) · Not recorded": the words
// say the client's answer while that answer is 12345678. Fails today; passes when a key detail the route marks the same at
// every stage reads the person's current answer on every stage's panel (or the words stop calling it the client's answer).
// Runs on the configured checkpoint (Demo › Load the configured checkpoint, loaded first); one case opened by the API as
// setup (not under test). US$0, no AI.
//   zsh studio/tools/isolated.sh qa_371 4474 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa371_current_stage_uci_words.ts 4474 xr_studio_qa_371
import { CLIENT, PORT, call, main, ok, run, sql } from "../../acceptance/lib/m3.ts";
import { walker } from "../../acceptance/lib/browser.ts";

type Openable = { combination_id: string; startable: boolean; stage?: { earlier: { key: string; key_details: { field: string; same_every_stage: boolean }[] }[] } };
await main("QA-371", "the current stage's panel does not call a recorded client answer 'Not recorded'", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  const e = later?.stage?.earlier[0]; const same = e?.key_details.find((d) => d.same_every_stage)?.field;
  const made = later && e && same ? await call("POST", "/runtime/cases", { combinationId: later.combination_id, reference: `QA371-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client E" }, earlier: [{ stage: e.key, done_before: true, key_details: { [same]: "12345678" } }] }) : null;
  const id = made?.body?.id as string | undefined;
  const principal = (made?.body?.people ?? []).find((x: { role: string }) => x.role === "principal")?.subject_id as string | undefined;
  const answer = principal ? sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${principal}' and canonical_field_key='${same}' and superseded_by_id is null`) : null;
  ok("setup: opened at the later stage; the UCI is Client A's current answer", made?.status === 201 && answer === "12345678", { made: made?.status, answer });
  if (!id) return;
  const w = await walker(`http://127.0.0.1:${PORT}`);
  try {
    const p = await w.open("user-O", 1440);
    await p.goto(`/cases/${id}`); await w.settle(p, "case");
    await p.getByRole("button", { name: /Current/ }).first().click();
    const t = (await p.getByRole("dialog").innerText()).replace(/\s+/g, " ");
    const uciLine = (t.match(/UCI ?\(also the client's answer\) ?[^A-Z]*?(Not recorded|\d+)/) ?? [])[0] ?? "";
    ok(`QA-371 fail: the current stage's panel shows the client's UCI 12345678, never "Not recorded" (reads: "${uciLine}")`,
      /12345678/.test(uciLine) && !/Not recorded/.test(uciLine), { uciLine });
  } finally { await w.close(); }
});
