// X1a acceptance, the bug's real case (P-220 pack 2; BACKLOG F8, qa-2 on #298): a combination is sent for review while it
// has lines, then its last form and document lines are removed; the waiting submission must not be signed off or
// approved. tests/check_f8_empty_release.ts covers a combination that was always empty; this covers the emptied one.
// Needs a combination that can be submitted: none of the six can be yet (no field maps until J3), so it runs on the
// suites' fixture's Work permit (family) until Visitor visa is configured, then with `vv.single` as 4th argument.
// Product rule (PROD-P2-01), not an IRCC rule. Rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/X1a-submitted.test.ts 4440 xr_studio_accept [vv.single]
import { AUTHOR, APPROVER, REVIEWER, pack2, run } from "./lib/pack2.ts";

const T = pack2("X1a-submitted");
const { call, sql, ok, words } = T;
const EMPTY = /Nothing to release yet/;
if (!process.argv[4]) process.argv[4] = "wp.family"; // the suites' fixture until a combination of the six can be submitted

run(async () => {
  await T.ready();
  const id = T.combo(T.key("wp.family"));
  const live = (t: string) => sql(`select string_agg(lineage_key, '|') from ${t} f where f.combination_id='${id}' and f.status <> 'RETIRED' and f.version = (select max(version) from ${t} g where g.combination_id=f.combination_id and g.lineage_key=f.lineage_key)`).split("|").filter(Boolean);
  // A change since its last release, so it can be submitted: one PQR tick.
  const client = ((await call("GET", `/combinations/${id}/fact-sources`)).body?.facts ?? []).find((f: any) => f.source === "CLIENT" && !f.prequalification);
  let r = await call("PUT", `/combinations/${id}/fact-sources/${client?.role}/${encodeURIComponent(client?.fact ?? "x")}`, { version: client?.version, prequalification: true }, AUTHOR);
  r = await call("POST", `/combinations/${id}/submit`, { note: "X1a real case (acceptance)" }, AUTHOR);
  ok("setup: the combination, with its lines, is sent for review", r.status < 300, words(r));
  const changes = (r.body?.changeSummary ?? []) as any[];

  // Remove every form line and every document line while the submission waits.
  for (const code of live("combination_form")) {
    const v = Number(sql(`select max(version) from combination_form where combination_id='${id}' and lineage_key='${code}'`) || 1);
    await call("DELETE", `/combinations/${id}/forms/${encodeURIComponent(code)}`, { version: v, confirm: true }, AUTHOR);
  }
  for (const lin of live("document_requirement")) await call("PATCH", `/combinations/${id}/requirements/${encodeURIComponent(lin)}`, { retire: true }, AUTHOR);
  ok("setup: no form line and no document line is left", live("combination_form").length === 0 && live("document_requirement").length === 0, { forms: live("combination_form").length, docs: live("document_requirement").length });
  const probs = (await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? [];
  ok("X1a fail: the draft now says 'Nothing to release yet'", probs.some((p: any) => p.level === "error" && EMPTY.test(p.message)));

  r = await call("POST", `/combinations/${id}/signoff`, { items: changes.length ? [`${changes[0].kind}|${changes[0].key}`] : ["x|y"], action: "signed" }, REVIEWER);
  ok("X1a fail: the waiting submission can no longer be signed off (refused in words: the draft changed or is empty)", changes.length > 0 && r.status >= 400 && words(r).length > 10, { status: r.status, words: words(r) });
  const releases = Number(sql(`select count(*) from config_release where combination_id='${id}'`));
  r = await call("POST", `/combinations/${id}/approve`, {}, APPROVER);
  ok("X1a fail: approving it is refused (409)", r.status === 409, words(r));
  ok("X1a data: no new release was made", Number(sql(`select count(*) from config_release where combination_id='${id}'`)) === releases);
  T.done();
});
