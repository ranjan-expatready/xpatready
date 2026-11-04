// C4.7 acceptance (P-220 pack 2; P-76, P-132; Lead 29 Oct): the combination's PQR picks are drafted with a reason per
// pick, into the one review queue; a person accepts (the tick lands on the combination's draft, through the same
// refusals as a hand tick) or removes it (reject with a reason); a pick waiting changes nothing. Until AI step 6 has a
// saved run the rules propose picks labelled "Rules", never AI. Runs on Visitor visa of the six; needs first: Visitor visa
// has questions (J3 / C4.11) — until then exit 2, meanwhile on the suites' fixture with `wp.family` as 4th argument.
// The saved-AI path needs a Saved result of the two rounds (Track A records it; P-225, P-227); with one, the saved AI
// picks are the ones accepted and removed (QA-162); until then the rules picks are, and the Saved checks say WAIT.
// Route (#282, adopted by the forms builder 2 Nov): POST
// /combinations/:id/pqr-picks/plan then /pqr-picks/draft (synchronous). "rules" is the API's stand-in producer; a person
// sees only Live and Saved (P-227).
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
  let r = await call("POST", `/combinations/${wp}/pqr-picks/plan`, { mode: "rules" }, AUTHOR);
  ok("C4.7 pass: PQR picks can be planned on their own, by the rules (US$0)", r.status < 300 && r.body?.totals?.worst_usd === 0, r.status >= 300 ? words(r) : r.body?.totals);
  // QA-162 (forms, 2 Nov): with a Saved AI result for this combination's guide, the picks a person accepts or removes are
  // the saved AI picks (P-227: a paid result is usable as Saved, US$0); the rules picks are the stand-in only while none
  // is saved (the header above). On Visitor visa the rules read no fact (no eligibility rules yet), so they propose none.
  const sp = await call("POST", `/combinations/${wp}/pqr-picks/plan`, { mode: "replay" }, AUTHOR);
  const S1 = "C4.7 pass (P-227): the Saved plan says a Saved result exists for this combination's guide";
  const S2 = "C4.7 pass (saved AI): replayed picks are AI items with a quote found and their reason; both readings when the rounds agree, else one with a Decide reason";
  const useSaved = sp.status === 200 && sp.body?.saved?.available === true;
  if (useSaved) {
    ok(S1, true);
    r = await call("POST", `/combinations/${wp}/pqr-picks/draft`, { mode: "replay", planSha256: sp.body?.plan_sha256 }, AUTHOR);
    ok("setup: the Saved draft ran at US$0", r.status === 201 && r.body?.usd === 0, r.status >= 300 ? words(r) : r.body?.note);
    // QA-194: with #530's v1 pair (guide only) 7 → 6 proposed, 10 → 13 left out: "Purpose of visit" (both readings) and
    // "Criminal record" each fit two questions, so they are left out naming both, never guessed. With the v2 pair (#764: the
    // rounds name the question list's keys) all 9 are proposed and none is left out, so "none dropped silently" is that every
    // pick left out has its reason, not that one is left out.
    ok("C4.7 pass (QA-162): every saved pick left out is listed with its reason, none dropped silently", r.status === 201 && (r.body?.dropped ?? []).every((d: any) => String(d.why ?? "").length > 20) && r.body.proposed >= 6 && (r.body.dropped ?? []).length <= 13, { proposed: r.body?.proposed, dropped: (r.body?.dropped ?? []).length });
  } else {
    if (sp.status === 200) { const on = `Track A's Saved PQR-picks result (${sp.body?.saved?.why ?? "none yet"})`; T.wait(S1, on); T.wait(S2, on); }
    else ok(S1, false, words(sp));
    r = await call("POST", `/combinations/${wp}/pqr-picks/draft`, { mode: "rules", planSha256: r.body?.plan_sha256 }, AUTHOR);
    ok("setup: the rules draft ran", r.status === 201, r.status >= 300 ? words(r) : r.body?.note);
  }
  // The queue shows a person words, never keys (QA-82): a pick's reason is its "meaning"; its person role and fact are the
  // item's identity key ("role|fact"), read from the database (adopted 2 Nov: the first draft read readings.draft.payload,
  // which a rules pick does not have).
  const key = (x: any) => { const [role, factKey] = (x?.id ? sql(`select identity_key from proposal_item where id='${x.id}'`) : "").split("|"); return { role, factKey }; };
  const picks = (await T.queued(wp)).filter((x: any) => x.kind === "pqr_pick");
  ok("C4.7 pass: picks wait in the queue under the combination", picks.length > 0, picks.length);
  ok("C4.7 pass: each pick has its reason (P-76) and names the person role and fact", picks.length > 0 && picks.every((x: any) => String(x.meaning ?? "").length >= 3 && key(x).role && key(x).factKey), picks[0]?.meaning);
  if (useSaved) {
    const ai = picks.filter((x: any) => x.origin === "ai");
    ok(S2, ai.length > 0 && ai.length === picks.length && ai.every((x: any) => x.source?.quote_found === true && String((x.readings?.draft ?? x.readings?.check)?.payload?.reason ?? "").length >= 3
      && (x.readings?.draft && x.readings?.check ? true : /Only the (first|second) reading .*Decide/.test(String(x.reason ?? "")))), ai.length);
  } else ok("C4.7 pass: rules picks say Rules, never AI", picks.length > 0 && picks.every((x: any) => x.origin === "rules" && x.agreement === "rules_only"));
  ok("C4.7 pass: a pick waiting changes nothing (no tick yet)", picks.length > 0 && ticks() === t0, { t0, now: ticks() });

  // A third pick whose fact the case officer may give (review M1, QA-162: a client-only fact, e.g. criminal history, is
  // refused that choice): offered facts first, then the queue order, skipping any the hand change refuses.
  const facts0 = (await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? [];
  const offered = (x: any) => facts0.some((f: any) => f.role === key(x).role && f.fact === key(x).factKey && f.agentOffered);
  const [a, b] = picks;
  r = await call("POST", "/review/proposals/decide", { ids: [a?.id ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C4.7 pass: accepting a pick ticks it on the combination's draft (lander exists)", r.status < 300 && ticks() === t0 + 1, r.status >= 300 ? words(r) : undefined);
  const tick = sql(`select origin||'|'||coalesce(reason,'') from fact_source where combination_id='${wp}' and prequalification and canonical_field_key='${key(a).factKey}' and role='${key(a).role}' order by version desc limit 1`);
  ok("C4.7 pass: the tick keeps the pick's origin and reason", /^(CODE_MATCH|AI_PROPOSAL)\|.{3,}/.test(tick), tick);
  r = await call("POST", "/review/proposals/decide", { ids: [b?.id ?? randomUUID()], action: "reject" }, AUTHOR);
  ok("C4.7 fail: removing a pick needs a reason (400)", !!b && r.status === 400, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [b?.id ?? randomUUID()], action: "reject", reason: "Not a deciding question for this program (Sample)." }, AUTHOR);
  ok("C4.7 pass: a removed pick ticks nothing", r.status < 300 && ticks() === t0 + 1, r.status >= 300 ? words(r) : undefined);
  // The same refusals as a hand tick (P-76): a fact the case officer gives can never be a PQR question.
  const officer = sql(`select role||'|'||canonical_field_key from fact_source where combination_id='${wp}' and source='AGENT' limit 1`);
  ok("C4.7 data: the pick producer never proposes a fact the case officer gives", picks.length > 0 && !picks.some((x: any) => `${key(x).role}|${key(x).factKey}` === officer), officer);
  // Accepting goes through the same refusals as a hand tick: once the fact is set by hand to come from the case officer,
  // its waiting pick cannot be accepted (422 in words) and ticks nothing.
  // The third pick is the first later one (offered first) whose fact may be set to come from the case officer; a
  // declaration (client only) is refused that and skipped. (With #530's v1 pair QA-194 left the purpose of the visit out;
  // with the v2 pair, #764, it is a Ready pick, and the loop below takes whichever later pick qualifies.)
  let c: (typeof picks)[number] | null = null;
  r = { status: 0, body: null };
  for (const x of [...picks.slice(2).filter(offered), ...picks.slice(2).filter((y) => !offered(y))]) {
    const fv = ((await call("GET", `/combinations/${wp}/fact-sources`)).body?.facts ?? []).find((f: any) => f.role === key(x).role && f.fact === key(x).factKey);
    r = fv ? await call("PUT", `/combinations/${wp}/fact-sources/${fv.role}/${encodeURIComponent(fv.fact)}`, { version: fv.version, source: "AGENT", sourceReason: "The firm records it (acceptance C4.7)" }, AUTHOR) : { status: 0, body: null };
    if (r.status === 200) { c = x; break; }
  }
  ok("setup: a third pick's fact is set by hand to come from the case officer", r.status === 200, words(r));
  r = await call("POST", "/review/proposals/decide", { ids: [c?.id ?? randomUUID()], action: "accept" }, AUTHOR);
  ok("C4.7 fail: that pick is refused at acceptance with the hand tick's words (422, 'comes from the case officer')", !!c && r.status === 422 && /case officer/i.test(words(r)) && ticks() === t0 + 1, words(r));
  const country = (await call("GET", `/combinations/${wp}/pqr/country`)).body;
  ok("C4.7 pass: an accepted pick is not in the country PQR until the combination is released (P-132)", !!a && !(country?.lines ?? []).some((l: any) => l.fact === key(a).factKey && (l.combinations ?? []).some((c: any) => c.id === wp)));
  ok("C4.7 pass: US$0 so far", picks.length > 0 && T.spent() === before);
  T.done();
});
