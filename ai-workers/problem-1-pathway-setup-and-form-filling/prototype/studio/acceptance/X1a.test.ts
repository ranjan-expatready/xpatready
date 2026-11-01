// X1a acceptance (P-220 pack 2; BACKLOG F8): an empty combination (no form line and no document line) can never be
// submitted, signed off or released, by any route. tests/check_f8_empty_release.ts (on main since F8) covers a combination
// that was always empty; this test covers the seams it does not: a combination made empty again by removing its last
// line, the shared Release page (GET /draft, POST /pack/release) and an approver going straight to approve. Product rule,
// not an IRCC rule: the nearest official parallel is that an incomplete application is returned (trace IRCC-P2-08).
// Rules only, no AI (US$0). Expected to pass on main where F8 holds; red means a route lets an empty combination through.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/X1a.test.ts 4440 xr_studio_accept
import { AUTHOR, APPROVER, pack2, run } from "./lib/pack2.ts";

const T = pack2("X1a");
const { call, sql, ok, words } = T;
const EMPTY = /Nothing to release yet/;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  const lines = () => Number(sql(`select count(*) from combination_form f where f.combination_id='${vv}' and f.status <> 'RETIRED' and f.version = (select max(version) from combination_form g where g.combination_id=f.combination_id and g.lineage_key=f.lineage_key)`));
  const docs = () => Number(sql(`select count(*) from document_requirement d where d.combination_id='${vv}' and d.status <> 'RETIRED' and d.version = (select max(version) from document_requirement e where e.combination_id=d.combination_id and e.lineage_key=d.lineage_key)`));
  ok("setup: Visitor visa starts with no form line and no document line", lines() === 0 && docs() === 0, { lines: lines(), docs: docs() });

  // Made empty again: add one form line, then remove it.
  let r = await call("POST", `/combinations/${vv}/forms`, { formKey: "IMM 5257" }, AUTHOR);
  ok("setup: one form line added", r.status < 300 && lines() === 1, r.status >= 300 ? words(r) : undefined);
  const has = async () => ((await call("GET", `/combinations/${vv}`)).body?.draft?.problems ?? []).some((p: any) => p.level === "error" && EMPTY.test(p.message));
  ok("X1a pass: with a form line the 'Nothing to release yet' error is gone", !(await has()));
  const v = Number(sql(`select max(version) from combination_form where combination_id='${vv}' and lineage_key='IMM 5257'`) || 1);
  r = await call("DELETE", `/combinations/${vv}/forms/${encodeURIComponent("IMM 5257")}`, { version: v }, AUTHOR);
  ok("setup: the only form line is removed", r.status < 300 && lines() === 0, r.status >= 300 ? words(r) : undefined);
  ok("X1a fail: removing the last line brings the error back on the draft", await has());

  r = await call("POST", `/combinations/${vv}/submit`, {}, AUTHOR);
  ok("X1a fail: sending a combination made empty again for review is refused, in words", r.status === 400 && EMPTY.test(words(r)), words(r));
  r = await call("POST", `/combinations/${vv}/signoff`, { items: ["configuration|vv.single"], action: "signed" }, "user-C");
  ok("X1a fail: nothing waits for sign-off (no submission was made)", r.status >= 400 && /Nothing is waiting for review/.test(words(r)), words(r));
  r = await call("POST", `/combinations/${vv}/approve`, {}, APPROVER);
  ok("X1a fail: the approver going straight to approve is refused (409), naming the empty combination", r.status === 409 && EMPTY.test(words(r)), words(r));

  // The shared Release page: the row is held back with the same reason, and a release of the page releases nothing for it.
  const d = (await call("GET", "/draft", undefined, APPROVER)).body;
  const row = (d?.rows ?? []).find((x: any) => x.combinationId === vv);
  ok("X1a fail: on the Release page the empty combination is either absent or held back saying 'Nothing to release yet'", !row || (row.held === true && EMPTY.test(String(row.why ?? ""))), row);
  if (d?.changes) {
    r = await call("POST", "/pack/release", { expectedChanges: d.changes }, APPROVER);
    ok("X1a fail: releasing the shared draft never releases the empty combination (the release answers, in words, without it)", r.status < 500 && !JSON.stringify(r.body ?? {}).includes(vv), r.status);
  }
  ok("X1a data: no configuration release row exists for it", sql(`select count(*) from config_release where combination_id='${vv}'`) === "0");
  T.done();
});
