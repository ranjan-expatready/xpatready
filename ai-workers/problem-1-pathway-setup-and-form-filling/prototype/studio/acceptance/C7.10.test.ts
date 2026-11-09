// C7.10 Readiness figure per filing on Ready to file, the case shows its lowest (row B143; AG-7-27, BR-30; founder
// P-406 (2): ours, beside C7.6 so C7.6's finish line does not move). The prepare view carries, beside `readiness[]`, one
// figure per filing (state Not ready · Attention · Ready, a whole number rounded down, the counted items and the rule in
// words) and the case's lowest state and lowest figure, each naming its filing. Each rule has a pass and a fail; the
// figure is checked against the same view's C7.6 lines (100 exactly when Ready to file is allowed). Visitor visa, on the
// data the run is given (the demo's six or the configured checkpoint); synthetic people only; no model call (US$0).
//   zsh studio/tools/isolated.sh accept 4440 start
//   tsx studio/acceptance/C7.10.test.ts 4440 xr_studio_accept
import { CLIENT, call, fillEverything, firms, main, needVisitorVisa, ok, openCase, prepare, readinessOf, readyToFile, filingOf, yearsAgo, FAMILY, type Prepare } from "./lib/m3.ts";

type FigureItem = { kind: string; key: string; label: string; done: boolean; passed: boolean };
type Figure = { filing: string; state: "not_ready" | "attention" | "ready"; score: number; done: number; countable: number; passed: number; items: FigureItem[]; rule: string };
type CaseFigure = { state: Figure["state"]; state_filing: string; score: number; score_filing: string };
type View = Prepare & { figures?: Figure[]; case_figure?: CaseFigure | null };
const ORDER = ["not_ready", "attention", "ready"];
const view = async (caseId: string, actor?: string) => (await prepare(caseId, actor)).p as View | null;
const figOf = (v: View | null, filing: string | undefined) => v?.figures?.find((g) => g.filing === filing) ?? null;
/** The figure agrees with its own items and with the same view's C7.6 lines (BR-1, BR-4). */
const agrees = (v: View | null, g: Figure | null) => {
  const r = readinessOf(v, g?.filing); if (!g || !r) return false;
  // Challenge M1: an open CRITICAL review finding (a plain warning in C7.6, its words say "CRITICAL finding") is Not ready.
  const crit = r.blocks.length > 0 || r.warns.some((w) => w.severity === "critical" || (w.code === "finding" && /^CRITICAL finding/.test(w.words)));
  return g.countable === g.items.length && g.done === g.items.filter((i) => i.done).length && g.score === Math.floor((g.done * 100) / g.countable)
    && (g.score === 100) === r.ready && (g.state === "ready") === r.ready && (g.state === "not_ready") === crit && g.passed === g.items.filter((i) => i.passed && i.done).length;
};
const brief = (g: Figure | null) => g && { state: g.state, score: g.score, done: g.done, countable: g.countable, passed: g.passed, open: g.items.filter((i) => !i.done).map((i) => i.label) };

await main("C7.10", "Readiness figure per filing; the case shows its lowest (Visitor visa)", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O";

  // A family: one filing per person who files (C6.12), each with its own figure.
  const fam = await openCase(vv, FAMILY, { representative: f.rep, caseOfficers: [officer] });
  let v = await view(fam.id, officer);
  const filings = v?.filings ?? [];
  ok(`C7.10-1 pass: the prepare view gives one figure per filing (${filings.length} filings), each with a state, a whole number 0 to 100, its counted items and the rule; and the case's figure`,
    filings.length >= 2 && (v?.figures ?? []).length === filings.length && filings.every((x) => { const g = figOf(v, x.id); return !!g && ORDER.includes(g.state) && Number.isInteger(g.score) && g.score >= 0 && g.score <= 100 && g.items.length > 0 && g.rule.length > 40; }) && !!v?.case_figure,
    { filings: filings.length, figures: (v?.figures ?? []).map(brief), case: v?.case_figure });
  ok("C7.10-2 fail (BR-8): C7.6's readiness entries are unchanged: no figure inside them and no percentage (C7.6-1 holds)",
    (v?.readiness ?? []).length === filings.length && (v?.readiness ?? []).every((r) => !("figure" in r) && !("score" in r) && !/%/.test(JSON.stringify(r))));
  const P = fam.subjects["Sample Client A"], fP = filingOf(v, P)?.id;
  let gP = figOf(v, fP);
  ok("C7.10-3 fail (BR-1, BR-4): a new case's filing, facts not yet answered, is Not ready and under 100, and the figure agrees with its C7.6 lines",
    !!gP && gP.state === "not_ready" && gP.score < 100 && readinessOf(v, fP)?.ready === false && agrees(v, gP), brief(gP));
  ok("C7.10-4 pass (BR-2, BR-7): the rule is shown in words (rounded down; a pass counts as done; what is not counted here) and the counted items name the forms, the facts and the representative's review",
    !!gP && /rounded down/.test(gP.rule) && /passed with a reason, or a finding closed with a reason, counts as done/.test(gP.rule) && /retainer/.test(gP.rule) && ["form", "facts", "review"].every((k) => gP!.items.some((i) => i.kind === k)) && gP.items.filter((i) => i.kind === "form").every((i) => /for /.test(i.label)),
    { rule: gP?.rule, kinds: gP?.items.map((i) => i.kind) });
  const low = v?.case_figure, figs = v?.figures ?? [];
  const minState = ORDER[Math.min(...figs.map((g) => ORDER.indexOf(g.state)))], minScore = Math.min(...figs.map((g) => g.score));
  ok("C7.10-5 pass (BR-5): the case shows the lowest state and the lowest figure of its filings, each naming a filing of the case that has it",
    !!low && low.state === minState && low.score === minScore && figOf(v, low.state_filing)?.state === low.state && figOf(v, low.score_filing)?.score === low.score, { low, figures: figs.map((g) => [g.filing.slice(0, 8), g.state, g.score]) });

  // Answering every fact moves the figure up (the facts item is done); passing a warning counts as done and is shown.
  const before = gP?.score ?? 0;
  await fillEverything(fam.id);
  v = await view(fam.id, officer); gP = figOf(v, fP);
  ok("C7.10-6 pass (BR-3): with every fact answered and confirmed, the facts item is done and the principal's figure rises; it still agrees with C7.6",
    !!gP && gP.items.find((i) => i.kind === "facts")?.done === true && gP.score > before && agrees(v, gP), { before, after: brief(gP) });
  const warn = readinessOf(v, fP)?.warns.find((w) => w.severity !== "critical") ?? readinessOf(v, fP)?.warns[0];
  const scoreBefore = gP?.score ?? 0, passedBefore = gP?.passed ?? 0;
  const passRes = warn ? await call("POST", `/runtime/filings/${fP}/warnings/${warn.code}/pass`, { reason: "Passed to check the figure (Sample)", key: warn.key }, officer) : null;
  v = await view(fam.id, officer); gP = figOf(v, fP);
  ok(`C7.10-7 pass (BR-3, BR-30 rule 5): a warning passed with a reason (${warn?.code ?? "none open"}) counts as done: the pass is in C7.6's passed lines, "passed" never falls, the figure never falls, and it still agrees with C7.6`,
    passRes?.status === 200 && !!gP && (readinessOf(v, fP)?.passed ?? []).some((x) => x.key === warn?.key) && gP.passed >= passedBefore && gP.score >= scoreBefore && agrees(v, gP), { status: passRes?.status, before: scoreBefore, after: brief(gP) });

  // Only the principal's filing is made ready: the case still shows the lowest, another filing.
  const others = (v?.filings ?? []).filter((x) => x.id !== fP).map((x) => x.id);
  const reachedAll = await readyToFile(fam.id, f.rep);
  v = await view(fam.id, officer);
  const ready = (v?.figures ?? []).filter((g) => g.state === "ready");
  ok(`C7.10-8 pass (BR-1, BR-4): each filing that reaches Ready to file reads Ready at exactly 100 (${reachedAll.length} of ${filings.length} reached it), and every figure agrees with C7.6`,
    reachedAll.length > 0 && reachedAll.every((id) => figOf(v, id)?.score === 100 && figOf(v, id)?.state === "ready") && (v?.figures ?? []).every((g) => agrees(v, g)) && ready.length >= reachedAll.length,
    { reached: reachedAll.length, figures: (v?.figures ?? []).map(brief) });
  const lowNow = v?.case_figure, notReady = (v?.figures ?? []).filter((g) => g.score < 100);
  ok(`C7.10-9 ${notReady.length ? "fail" : "pass"} (BR-5): ${notReady.length ? "a filing still under 100 holds the case back: the case names it, never a ready filing" : "every filing is ready: the case reads Ready at 100"}`,
    !!lowNow && (notReady.length ? lowNow.score < 100 && notReady.some((g) => g.filing === lowNow.score_filing) && lowNow.score_filing !== reachedAll[0] : lowNow.state === "ready" && lowNow.score === 100), { lowNow, others: others.length, notReady: notReady.map(brief) });

  // One person, one filing: the case's figure is the filing's own, and 100 only once Ready to file is allowed.
  const solo = await openCase(vv, [{ role: "principal", name: "Sample Client T", dob: yearsAgo(33) }], { representative: f.rep, caseOfficers: [officer] });
  let sv = await view(solo.id, officer);
  const sf = sv?.filings[0]?.id;
  const refused = await call("POST", `/runtime/filings/${sf}/ready`, {}, officer);
  ok("C7.10-10 fail (BR-6): under 100, Ready to file is still refused by C7.6 (409), and the case's figure is the one filing's own",
    refused.status === 409 && (figOf(sv, sf)?.score ?? 100) < 100 && sv?.case_figure?.score_filing === sf && sv?.case_figure?.state_filing === sf && sv?.case_figure?.score === figOf(sv, sf)?.score, { status: refused.status, fig: brief(figOf(sv, sf)) });
  const soloDone = await readyToFile(solo.id, f.rep);
  sv = await view(solo.id, officer);
  ok("C7.10-11 pass (BR-4, BR-5): once Ready to file is allowed and marked, the filing and the case read Ready at 100",
    soloDone.includes(sf ?? "") && figOf(sv, sf)?.score === 100 && figOf(sv, sf)?.state === "ready" && sv?.case_figure?.state === "ready" && sv?.case_figure?.score === 100, { done: soloDone, fig: brief(figOf(sv, sf)), case: sv?.case_figure });

  // The figure goes where the prepare view goes: a client never reads the case team's view.
  const asClient = await call("GET", `/runtime/cases/${solo.id}/prepare`, undefined, CLIENT);
  ok("C7.10-12 fail: a client does not get the case team's figure (the prepare view refuses, 403 or 404)", [403, 404].includes(asClient.status) && !JSON.stringify(asClient.body ?? {}).includes("\"figures\""), asClient.status);
});
