// C3.8 — The validator: every form field mapped or "not a fact", every option mapped per channel, every conditional
// question reachable.
// Status (qa/CAPABILITIES.md, 1 Nov): Partial; the row says reachability is not checked and "mapped or not a fact" is
// only a warning. Found writing this: both are built now for questions (K1 blocks submission; "Unreachable question" is
// an error). Still missing: a Background information question may be decided "not a fact" (IRCC returns an application
// with one unanswered); a family information form attached to the combination from the country package can be left out
// without a word. Reachability is checked as the capability says it: conditional questions of the questionnaire (AT-6).
// (An earlier draft also asked the validator to read the AI's free-text condition on a PDF box; no decision asks for
// that, so it was removed: a proposal for it goes to the Lead in challenge.md, not into this pack.)
// "Every option mapped per channel": AT-5 checks every option of the PDF channel's map. The per-channel part cannot be
// tested at US$0 today: no form in the sample has a second channel's map (online versions are parked, P-102, P-152), so
// the file prints a NOTE for it, never a pass.
// Decisions: P-62 §5.3 (channels and option maps, no AI), K1 (Screen 02: every form field decided), P-158 (completeness
// measured), P-171c (oath boxes). IRCC rules: [IRCC-F08] every Background information question must be answered or the
// application is returned; [IRCC-F09] the family information form (IMM 5707 or IMM 5645) in the country package must be
// completed.
// US$0: the saved real IMM 5257 answer is replayed and applied; the engine checks run on the copy's own snapshot with one
// change each (no model). Ledger checked unchanged.
// Run (from prototype/studio):
//   zsh tools/isolated.sh acc_c8 4572 start && ./node_modules/.bin/tsx acceptance/C3.8.test.ts 4572 xr_studio_acc_c8 ; zsh tools/isolated.sh acc_c8 4572 stop
// Expected today (main 931cb99a, run 1 Nov 2026 on an isolated copy, US$0): 9 pass, 2 fail, 1 NOTE — failing: AT-3 (the
// tuberculosis Background question of IMM 5257 is accepted as "not a fact" and nothing blocks) and AT-8 first check
// (IMM 5707 attached from the package but missing from the forms gives no problem) because those rules are not built;
// NOTE: AT-5 per channel is not testable on this sample.
// QA-199 (4 Nov 2026): AT-3 picked its question by "BackgroundInfo" in the path, as the product did, so it passed while
// IMM 5257's Q6 (ill-treatment) was accepted as "not a fact". It now names IMM 5257's nine Background questions from the
// form's own field list: on main debbf3fc8 10 pass, 2 fail (AT-3 both); with the QA-199 fix 12 pass, 1 NOTE.
// Exit: 0 all pass · 1 a check failed · 2 setup missing or refused (demo port or database, copy not reachable, sample).
import { validate, type Problem } from "../engine/validate.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { checkCopy, guard, needCombo, sqlFor, stop } from "./lib/pack1.ts";

const PORT = Number(process.argv[2] ?? 4572), DB = process.argv[3] ?? "xr_studio_acc_c8";
guard(PORT, DB); // before anything reads the database or calls the copy (never the demo)
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again once when a kept-alive connection was closed before any reply (as tests/check_forms_slice2.ts). */
const send = async (url: string, init: RequestInit): Promise<Response> => { try { return await fetch(url, init); } catch (e) { if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(String((e as { cause?: { code?: string } }).cause?.code ?? ""))) throw e; return fetch(url, init); } };
const call = async (method: string, path: string, body?: unknown, actor: string | null = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { ...(actor ? { "x-actor": actor } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } return { status: r.status, body: j };
};
const sql = sqlFor(DB);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => Promise<boolean>, ms = 120_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(500); } return false; };
const words = (r: Res) => String(r.body?.detail ?? r.body?.message ?? "");
const ledger = async () => { const l = (await call("GET", "/ledger")).body; return JSON.stringify([l?.committed_usd, l?.wave?.spent_usd]); };
const setupMissing = stop;

(async () => {
  await checkCopy(PORT, DB);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const loaded = await call("POST", "/demo/load");
  const vv = await needCombo(PORT, DB, "visitor_visa");
  const att = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  const a5707 = vv && sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5707e.pdf'`);
  if (loaded.status >= 300 || !att || !a5707) setupMissing("the sample (Visitor visa with IMM 5257 and IMM 5707) did not load");
  const ledger0 = await ledger();
  // Setup: IMM 5257's saved answer replayed, every proposal decided, applied to the Visitor visa draft (US$0).
  const d = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId: string = d.body?.id;
  if (!jobId || !(await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED"))) setupMissing("the saved IMM 5257 answer did not replay");
  await call("POST", `/jobs/${jobId}/accept-clean`, {}, "user-C");
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, "user-C");
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING"))
    await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "A different meaning from the candidates (acceptance check)" }, "user-C");
  if ((await call("POST", `/jobs/${jobId}/apply`, {})).status >= 300) setupMissing("the IMM 5257 draft did not apply");
  const ed = sql("select id from form_edition where edition_label='IMM 5257 (09-2023)'");
  const problems = async () => (await call("GET", `/combinations/${vv}/review`)).body?.draft?.problems as Problem[];
  const k1 = (ps: Problem[]) => ps.find((p) => p.level === "error" && p.where === "Forms" && /no decision in this draft/.test(p.message));
  const fields = async () => (await call("GET", `/editions/${ed}/form-fields`)).body?.fields as { dataPath: string; caption: string; outcome: string; background?: boolean }[];
  // IMM 5257's Background information questions, Q1 to Q6 with their parts, as the form's own field list numbers them
  // (p1/inventory/imm5257e.inventory.json; QA-199: Q4 military, Q5 political party and Q6 ill-treatment sit outside any
  // `BackgroundInfo` node, so the pack names them from the form, never by a word in the path).
  const BG = ["BackgroundInfo[0].Choice[0]", "BackgroundInfo[0].Choice[1]", "BackgroundInfo2[0].VisaChoice1[0]", "BackgroundInfo2[0].VisaChoice2[0]", "BackgroundInfo2[0].Details[0].VisaChoice3[0]",
    "PageWrapper[0].BackgroundInfo3[0].Choice[0]", "PageWrapper[0].Military[0].Choice[0]", "PageWrapper[0].Occupation[0].Choice[0]", "PageWrapper[0].GovPosition[0].Choice[0]"].map((x) => `form1[0].Page3[0].${x}`);

  // ── AT-1 [IRCC-F08] every form field mapped or "not a fact": undecided ones block submission
  let ps = await problems();
  const open = (await fields()).filter((f) => f.outcome === "unresolved");
  ok("C3.8 AT-1 [IRCC-F08] form fields with no decision are an error naming how many and one by its caption (not its PDF path)", open.length > 0 && !!k1(ps) && k1(ps)!.message.startsWith(`${open.length} form field`) && !/\[0\]/.test(k1(ps)!.message), { open: open.length, k1: k1(ps)?.message });
  const statusBefore = sql(`select count(*) from review_submission where combination_id='${vv}'`);
  let r = await call("POST", `/combinations/${vv}/submit`, { note: "acceptance check" });
  ok("C3.8 AT-1 refusal: submitting with undecided form fields is refused in plain words and nothing is submitted", r.status >= 400 && /Fix \d+ problem/.test(words(r)) && sql(`select count(*) from review_submission where combination_id='${vv}'`) === statusBefore, words(r).slice(0, 200));

  // ── AT-2 deciding a form field: who, and with a reason
  const plain = open.find((f) => !BG.includes(f.dataPath))!;
  r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: plain.dataPath, decision: "not_a_fact", reason: "no" });
  const r2 = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: plain.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills" }, "user-P");
  const mapped = (await fields()).find((f) => f.outcome === "mapped")!;
  const r3 = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: mapped.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills" });
  ok("C3.8 AT-2 refusal: \"not a fact\" needs a reason of a sentence (400), a client cannot decide (403), a mapped form field is changed on its map (409); nothing changes",
    r.status === 400 && /Say why/.test(JSON.stringify(r.body)) && r2.status === 403 && r3.status === 409 && (await fields()).filter((f) => f.outcome === "unresolved").length === open.length, [r.status, r2.status, r3.status]);

  // ── AT-3 [IRCC-F08] a Background information question cannot be left as "not a fact"
  const all = await fields();
  ok("C3.8 AT-3 [IRCC-F08] Form fields marks all nine Background information questions of IMM 5257 (Q1 to Q6, military, political party and ill-treatment included) and no other form field",
    BG.every((p) => all.find((f) => f.dataPath === p)?.background === true) && all.filter((f) => f.background).length === BG.length, { missing: BG.filter((p) => all.find((f) => f.dataPath === p)?.background !== true), marked: all.filter((f) => f.background).length });
  const openBg = open.filter((f) => BG.includes(f.dataPath));
  const tried: { q: string; status: number; flagged: boolean }[] = [];
  for (const bg of openBg) {
    r = await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: bg.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills (acceptance check)" });
    ps = await problems();
    tried.push({ q: bg.caption?.slice(0, 50) ?? bg.dataPath, status: r.status, flagged: ps.some((p) => p.level === "error" && p.message.includes(bg.caption ?? "\u0000") && /background/i.test(p.message)) });
  }
  ok("C3.8 AT-3 [IRCC-F08] every undecided Background information question decided \"not a fact\" is refused, or is an error that blocks submission (IRCC returns an application with one unanswered)",
    openBg.length > 0 && tried.every((t) => t.status >= 400 || t.flagged), openBg.length ? tried : "no undecided Background information question in this replay (setup)");
  // ── AT-4 pass: every other form field decided → the K1 error counts only what is still undecided
  for (const f of open.filter((x) => !BG.includes(x.dataPath))) await call("POST", `/editions/${ed}/form-fields/decision`, { dataPath: f.dataPath, decision: "not_a_fact", reason: "Not a fact this product fills (acceptance check)" });
  ps = await problems();
  const left = (await fields()).filter((f) => f.outcome === "unresolved").length;
  ok("C3.8 AT-4 every form field decided (mapped or \"not a fact\" with a reason): the undecided-form-fields error is gone, or names exactly the ones left", left === 0 ? !k1(ps) : !!k1(ps)?.message.startsWith(`${left} form field`), { left, k1: k1(ps)?.message });

  // ── engine rules on the copy's own snapshot (one change each)
  const snap = (await call("GET", `/combinations/${vv}/config`)).body?.snapshot as Snapshot;
  if (!snap) setupMissing("no draft snapshot for the Visitor visa");
  const lib = (s: Snapshot) => (s.canonical_fields as { id: string; value_type: string }[]).map((f) => ({ key: f.id, valueType: f.value_type }));
  const run = (s: Snapshot) => validate(s, lib(s), (s.derived_fields as { id: string; calculation: string }[]).map((x) => ({ id: x.id, calculation: x.calculation })));
  const clone = () => structuredClone(snap) as Snapshot & Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const entries = (s: any) => s.field_maps[0].entries as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  // AT-5 options per channel
  const ms = clone();
  const coded = entries(ms).find((e) => e.outcome === "mapped" && /^code_list:\S+ \(/.test(e.transform ?? ""))!;
  const codes = [...(coded.transform as string).matchAll(/=([^,)]+)/g)].map((m) => m[1].trim());
  const field = (ms.canonical_fields as any[]).find((f) => f.id === coded.fact); // eslint-disable-line @typescript-eslint/no-explicit-any
  field.answer_list = { key: "acc_list", values: codes.map((c, i) => ({ key: `v${i}`, label: `Value ${i}` })) };
  const noMap = run(ms).filter((p) => p.item === coded.data_path && p.level === "error");
  coded.option_map = { map: Object.fromEntries(codes.slice(0, -1).map((c, i) => [`v${i}`, c])), unused: [], codes };
  const oneShort = run(ms).filter((p) => p.item === coded.data_path && p.level === "error");
  coded.option_map = { map: Object.fromEntries(codes.map((c, i) => [`v${i}`, c])), unused: [], codes };
  const full = run(ms).filter((p) => p.item === coded.data_path && p.level === "error");
  ok("C3.8 AT-5 every option mapped: a coded form field on an answer list with no option map, or one value without its code, is an error in words; every value mapped is clean",
    codes.length > 1 && noMap.some((p) => /no option map yet/.test(p.message)) && oneShort.some((p) => /no code for "v/.test(p.message)) && full.length === 0, { field: coded.fact, codes: codes.length, noMap: noMap.map((p) => p.message), oneShort: oneShort.map((p) => p.message), full: full.map((p) => p.message) });

  // AT-6 reachability of a conditional question
  const rs = clone();
  const pl = (rs.placements as any[])[0]; // eslint-disable-line @typescript-eslint/no-explicit-any
  pl.condition = { field: "person.acceptance_never_asked", op: "eq", value: true }; pl.condition_effect = "SHOW"; pl.condition_plain = "only if never asked";
  const unreachable = run(rs).filter((p) => p.item === pl.fact && /Unreachable question/.test(p.message));
  pl.condition = { field: (rs.placements as any[])[1].fact, op: "eq", value: true }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const reachable = run(rs).filter((p) => p.item === pl.fact && /Unreachable question/.test(p.message));
  ok("C3.8 AT-6 every conditional question reachable: one that depends on a fact nobody is asked is an error in words; one that depends on an asked question is not", unreachable.length === 1 && unreachable[0].level === "error" && reachable.length === 0, { unreachable: unreachable.map((p) => p.message), reachable: reachable.length });

  const channelsOfMaps = [...new Set((snap.field_maps as { channel?: string }[]).map((m) => m.channel ?? "PDF"))];
  console.log(`NOTE  C3.8 AT-5 per channel: not testable on this sample (field maps by channel: ${channelsOfMaps.join(", ")}); needs a form with an online map as well as its PDF map`);

  // ── AT-8 [IRCC-F09] the family information form from the country package
  ps = await problems();
  const forms = (snap.forms as { form_number: string }[]).map((f) => f.form_number);
  const said5707 = ps.filter((p) => /IMM 5707/.test(`${p.item} ${p.message}`));
  ok("C3.8 AT-8 [IRCC-F09] the Visitor visa has IMM 5707 (family information) from its country package but not in its forms: the validator says so as an error", !forms.includes("IMM 5707") && said5707.some((p) => p.level === "error"), { forms, said: said5707.map((p) => p.message) });
  r = await call("POST", `/attachments/${a5707}/reuse`, {});
  ps = await problems();
  const snap2 = (await call("GET", `/combinations/${vv}/config`)).body?.snapshot as Snapshot;
  ok("C3.8 AT-8 [IRCC-F09] once IMM 5707 is added from the library with its reviewed field map, nothing about IMM 5707 blocks", r.status < 300 && (snap2.forms as { form_number: string }[]).some((f) => f.form_number === "IMM 5707") && (snap2.field_maps as { form_number: string }[]).some((m) => m.form_number === "IMM 5707") && !ps.some((p) => p.level === "error" && /IMM 5707/.test(`${p.item} ${p.message}`) && p.where === "Forms"),
    { status: r.status, body: words(r).slice(0, 120), errors: ps.filter((p) => p.level === "error" && /IMM 5707/.test(`${p.item} ${p.message}`)).map((p) => p.message).slice(0, 2) });
  r = await call("POST", `/attachments/${a5707}/reuse`, {});
  ok("C3.8 AT-8 refusal: adding IMM 5707 a second time is refused (409) in words", r.status === 409 && /already part of this combination/.test(words(r)), r.body);
  ok("C3.8 AT-9 the whole check spent nothing (ledger unchanged)", (await ledger()) === ledger0, { ledger0, now: await ledger() });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FAIL  C3.8 the check itself stopped:", e); process.exit(1); });
