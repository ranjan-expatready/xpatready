// C4.7 acceptance (P-220 pack 2; P-76, P-132; Lead 29 Oct): the combination's PQR picks are drafted with a reason per
// pick, into the one review queue; a person accepts (the tick lands on the combination's draft, through the same
// refusals as a hand tick) or removes it (reject with a reason); a pick waiting changes nothing. Until AI step 6 has a
// saved run the rules propose picks labelled "Rules", never AI. Runs on Visitor visa of the six; needs first: Visitor visa
// has questions (J3 / C4.11) — until then exit 2, meanwhile on the suites' fixture with `wp.family` as 4th argument.
// The saved-AI path needs a saved run of step 6 (recorded once in the founder-approved live trial, P-131).
// Today pqrPicksByRules and acceptPqrPick exist (engine/sources.ts, api/src/fact-sources.ts) but nothing routes them and
// the queue has no pqr_pick lander, so this fails. Route: C4.11's plan with the one step pqr_picks (Rules only, US$0).
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.7.test.ts 4440 xr_studio_accept
import { randomUUID } from "node:crypto";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.7");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const wp = T.combo(T.key("vv.single"));
  await T.needQuestions(wp);
  const before = T.spent();
  const ticks = () => Number(sql(`select count(*) from fact_source f where f.combination_id='${wp}' and f.prequalification and f.status <> 'RETIRED' and f.version = (select max(version) from fact_source g where g.combination_id=f.combination_id and g.lineage_key=f.lineage_key)`));
  const t0 = ticks();
  let r = await call("POST", `/combinations/${wp}/draft/plan`, { steps: [{ step: "pqr_picks", mode: "rules" }] }, AUTHOR);
  ok("C4.7 pass: PQR picks can be planned on their own, by the rules (US$0)", r.status < 300 && r.body?.steps?.[0]?.cost?.worst === 0, r.status >= 300 ? words(r) : r.body?.steps);
  r = await call("POST", `/combinations/${wp}/draft`, { planSha256: r.body?.plan_sha256 ?? r.body?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  const runId = r.body?.runId;
  if (runId) await T.until(async () => ["COMPLETED", "FAILED"].includes(String((await call("GET", `/runs/${runId}`)).body?.status ?? "").toUpperCase()), 60_000);
  const picks = (await T.queued(wp)).filter((x: any) => x.kind === "pqr_pick");
  ok("C4.7 pass: picks wait in the queue under the combination", picks.length > 0, picks.length);
  ok("C4.7 pass: each pick has its reason (P-76) and names the person role and fact", picks.length > 0 && picks.every((x: any) => String(x.readings?.draft?.payload?.reason ?? x.reason ?? "").length >= 3 && x.readings?.draft?.payload?.role && x.readings?.draft?.payload?.factKey));
  ok("C4.7 pass: rules picks say Rules, never AI", picks.length > 0 && picks.every((x: any) => x.origin === "rules" && x.agreement === "rules_only"));
  ok("C4.7 pass: a pick waiting changes nothing (no tick yet)", picks.length > 0 && ticks() === t0, { t0, now: ticks() });

  const [a, b] = picks;
  r = await call("POST", "/review/proposals/decide", { ids: [a?.id ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C4.7 pass: accepting a pick ticks it on the combination's draft (lander exists)", r.status < 300 && ticks() === t0 + 1, r.status >= 300 ? words(r) : undefined);
  const tick = sql(`select origin||'|'||coalesce(reason,'') from fact_source where combination_id='${wp}' and prequalification and canonical_field_key='${a?.readings?.draft?.payload?.factKey}' order by version desc limit 1`);
  ok("C4.7 pass: the tick keeps the pick's origin and reason", /^(CODE_MATCH|AI_PROPOSAL)\|.{3,}/.test(tick), tick);
  r = await call("POST", "/review/proposals/decide", { ids: [b?.id ?? randomUUID()], action: "reject" }, AUTHOR);
  ok("C4.7 fail: removing a pick needs a reason (400)", !!b && r.status === 400, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [b?.id ?? randomUUID()], action: "reject", reason: "Not a deciding question for this program (Sample)." }, AUTHOR);
  ok("C4.7 pass: a removed pick ticks nothing", r.status < 300 && ticks() === t0 + 1, r.status >= 300 ? words(r) : undefined);
  // The same refusals as a hand tick (P-76): a fact the case officer gives can never be a PQR question.
  const officer = sql(`select role||'|'||canonical_field_key from fact_source where combination_id='${wp}' and source='AGENT' limit 1`);
  ok("C4.7 data: the pick producer never proposes a fact the case officer gives", picks.length > 0 && !picks.some((x: any) => `${x.readings?.draft?.payload?.role}|${x.readings?.draft?.payload?.factKey}` === officer), officer);
  // Accepting goes through the same refusals as a hand tick: once the fact is set by hand to come from the case officer,
  // its waiting pick cannot be accepted (422 in words) and ticks nothing.
  const c = picks[2], cp = c?.readings?.draft?.payload;
  const fv = ((await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? []).find((f: any) => f.role === cp?.role && f.fact === cp?.factKey);
  r = fv ? await call("PUT", `/combinations/${wp}/fact-sources/${fv.role}/${encodeURIComponent(fv.fact)}`, { version: fv.version, source: "AGENT", sourceReason: "The firm records it (acceptance C4.7)" }, AUTHOR) : { status: 0, body: null };
  ok("setup: a third pick's fact is set by hand to come from the case officer", r.status === 200, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [c?.id ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C4.7 fail: that pick is refused at acceptance with the hand tick's words (422, 'comes from the case officer')", !!c && r.status === 422 && /case officer/i.test(words(r)) && ticks() === t0 + 1, words(r));
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.7 pass: an accepted pick is not in the country PQR until the combination is released (P-132)", !!a && !(country?.lines ?? []).some((l: any) => l.fact === a?.readings?.draft?.payload?.factKey && (l.combinations ?? []).some((c: any) => c.id === wp)));
  // The saved-AI path (step 6 replayed, US$0): picks come as AI items with both readings and IRCC's quote found.
  r = await call("POST", `/combinations/${wp}/draft/plan`, { steps: [{ step: "pqr_picks", mode: "replay" }] }, AUTHOR);
  const r2 = await call("POST", `/combinations/${wp}/draft`, { planSha256: r.body?.plan_sha256 ?? r.body?.planSha256, idempotencyKey: randomUUID(), spendLimitUsd: 0 }, AUTHOR);
  if (r2.body?.runId) await T.until(async () => ["COMPLETED", "FAILED"].includes(String((await call("GET", `/runs/${r2.body.runId}`)).body?.status ?? "").toUpperCase()), 60_000);
  const ai = (await T.queued(wp)).filter((x: any) => x.kind === "pqr_pick" && x.origin === "ai");
  ok("C4.7 pass (saved AI): replayed picks are AI items with both readings and a quote found, each with its reason", ai.length > 0 && ai.every((x: any) => x.readings?.draft && x.readings?.check && x.source?.quote_found === true && String(x.readings.draft.payload?.reason ?? "").length >= 3), ai.length);
  ok("C4.7 pass: US$0", picks.length > 0 && T.spent() === before);
  T.done();
});
