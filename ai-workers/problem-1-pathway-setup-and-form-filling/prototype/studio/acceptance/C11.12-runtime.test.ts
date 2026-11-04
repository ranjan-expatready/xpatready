// C11.12 acceptance, the runtime side (P-220 pack 2; P-119): a case may hold only the person roles its pinned release lists,
// and no more of each than its maximum. Needs a released combination: none of the six has a release until J4, so it runs
// on the suites' fixture's Work permit (family) (released in that fixture) until then; then with `vv.single` as 4th
// argument after J4 releases Visitor visa. Built on main (tests/runtime/check_runtime_r1a.ts): expected green on a fresh
// copy. With no such combination or no release (gate B runs it after Reset to the six): exit 2, setup missing (QA-215).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C11.12-runtime.test.ts 4440 xr_studio_accept [vv.single]
import { randomUUID } from "node:crypto";
import { pack2, run } from "./lib/pack2.ts";

const T = pack2("C11.12-runtime");
const { call, sql, ok, words } = T;
const OFFICER = "user-O", CLIENT = "user-P";
if (!process.argv[4]) process.argv[4] = "wp.family"; // the suites' fixture until a combination of the six is released

run(async () => {
  await T.ready();
  // QA-215: on the six (gate B's Reset to the six) neither the fixture's combination nor a release exists yet: that is
  // setup missing (exit 2), never a crash on combination_id='' (exit 1).
  const want = T.key("wp.family"), id = T.combo(want);
  if (!id) { console.error(`STOP  setup missing: no combination ${want} on this copy (the suites' fixture loads it; none of the six is released until J4). Run it on a fresh copy, or name a released combination as 4th argument.`); process.exit(2); }
  const snap = JSON.parse(sql(`select snapshot::text from config_release where combination_id='${id}' order by version desc limit 1`) || "null");
  if (!snap) { console.error(`STOP  setup missing: ${want} has no release yet (this pack needs a released combination).`); process.exit(2); }
  const listed = (snap?.combination?.participants ?? []) as { role: string; max?: number }[];
  ok("setup: the combination has a release listing its people", listed.length >= 2, listed.map((p) => `${p.role}:${p.max}`));
  let r = await call("POST", "/runtime/cases", { combinationId: id, reference: `ACC-${randomUUID().slice(0, 8)}`, clientActor: CLIENT, principal: { displayName: "Sample Applicant A" } }, OFFICER);
  const caseId = r.body?.id;
  ok("setup: the case officer opens a case on it", r.status === 201 && !!caseId, words(r));
  const notListed = ["sponsor", "parent", "spouse_or_partner", "child", "representative"].find((x) => !listed.some((p) => p.role === x && (p.max ?? 0) > 0));
  if (notListed) {
    r = await call("POST", `/runtime/cases/${caseId}/people`, { role: notListed, displayName: "Sample Person" }, OFFICER);
    ok(`C11.12 pass (P-119): a ${notListed} the release does not list is refused (422, in words)`, r.status === 422 && /does not list/.test(words(r)), words(r));
  }
  const capped = listed.find((p) => p.role !== "principal" && (p.max ?? 0) >= 1 && (p.max ?? 0) <= 4);
  const codes: number[] = [];
  for (let i = 0; i <= (capped?.max ?? 0); i++) codes.push((await call("POST", `/runtime/cases/${caseId}/people`, { role: capped?.role, displayName: `Sample ${i + 1}` }, OFFICER)).status);
  ok(`C11.12 pass (P-119): ${capped?.role} up to its maximum (${capped?.max}) is added; one more is refused (422)`, !!capped && codes.slice(0, -1).every((c) => c === 201) && codes.at(-1) === 422, codes);
  T.done();
});
