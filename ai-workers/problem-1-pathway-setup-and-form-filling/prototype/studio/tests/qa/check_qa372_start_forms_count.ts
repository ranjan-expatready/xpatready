// qa (9 Nov, C6.17 capability on main df52c9fc6; QA-372, UX · Minor; found by the fresh Opus reader of qa's verdict):
// "Start next stage" says "5 forms: IMM 5409, IMM 5475, IMM 5476, IMM 5707, IMM 5710" (dialog) and "5 forms … added" (toast),
// but the new stage's Prepare application lists 2 (IMM 5476, IMM 5710): the count includes forms that only may apply later
// (`api/src/case-stages.ts` preview: `applies !== false`). Fails today; passes when the preview's forms are the forms the new
// stage's Prepare lists, or the preview tells them apart (e.g. a `may_apply` list beside `forms`).
// Runs on the configured checkpoint (loaded first); one study-permit case opened and moved on by the API (setup). US$0, no AI.
//   zsh studio/tools/isolated.sh qa_372 4473 start && <load the configured checkpoint as user-A> \
//     && tsx studio/tests/qa/check_qa372_start_forms_count.ts 4473 xr_studio_qa_372
import { CLIENT, call, main, ok, prepare, run, sql } from "../../acceptance/lib/m3.ts";

type Openable = { combination_id: string; startable: boolean; stage?: { route: string; earlier: unknown[] } };
await main("QA-372", "Start next stage counts the forms the new stage lists", async () => {
  const rows = ((await call("GET", "/runtime/openable")).body ?? []) as Openable[];
  const later = rows.find((r) => r.startable && r.stage && r.stage.earlier.length > 0);
  const firstKey = later?.stage ? sql(`select (stages->0->>'combination_key') from route where key='${later.stage.route}'`) : null;
  const first = rows.find((r) => r.startable && !r.stage && sql(`select combination_key from combination where id='${r.combination_id}'`) === firstKey);
  const made = first ? await call("POST", "/runtime/cases", { combinationId: first.combination_id, reference: `QA372-${run}`, clientActor: CLIENT, principal: { displayName: "Sample Client F" } }) : null;
  const id = made?.body?.id as string | undefined;
  if (id) await prepare(id);
  const st = id ? (await call("GET", `/runtime/cases/${id}/stages`)).body as { current: string; stages: { id: string; version: number }[] } : null;
  const cur = st?.stages.find((s) => s.id === st.current);
  const pv = id ? (await call("GET", `/runtime/cases/${id}/stages/next`)).body as { forms: string[]; may_apply?: string[] } : null;
  const go = id && cur ? await call("POST", `/runtime/cases/${id}/stages/next`, { from_stage: cur.id, stage_version: cur.version, reason: "qa check QA-372 (Sample)" }) : null;
  ok("setup: a case on the route's first stage moved to the next stage", made?.status === 201 && go?.status === 201, { made: made?.status, go: go?.status, body: go?.body?.detail });
  if (go?.status !== 201 || !id) return;
  const p2 = (await prepare(id)).p as { items?: { kind: string; form?: string }[] };
  const listed = [...new Set((p2?.items ?? []).filter((i) => i.kind === "form").map((i) => i.form as string))].sort();
  const said = [...(pv?.forms ?? [])].sort();
  ok(`QA-372 fail: the preview's forms (${said.join(", ")}) are the forms the new stage's Prepare lists (${listed.join(", ")}), or it names the ones that may apply apart`,
    JSON.stringify(said) === JSON.stringify(listed) || (Array.isArray(pv?.may_apply) && JSON.stringify([...said, ...pv!.may_apply!].sort()) !== JSON.stringify(said)), { said, listed });
});
