// QA-378 (UX · Minor, C8.3, row B144; #1440, ruling (a): a different validated copy read back withdraws the approval):
// a withdrawal for a different file is worded as a fact change. Through the product's routes, as QA-345's check: a
// send back that changes a barcode form's fact, round 2 approved (stamp none), the validated copy read back (the stamp
// moves to it, QA-345's fix), then a SECOND validated copy of the same facts read back, which withdraws the approval
// ("Approval withdrawn: the validated copy read back since is not the file this approval stamped…"). The check reads
// that form on the Review route: its file words must not claim the plain current stamp ("Stamped with the validated
// copy read back") and its tooltip must not say a fact changed. Fails today; passes when the words name the earlier
// copy and the file. (The footer button "Re-approve 1 changed form" is web words; read by screen in the qa report.)
// Run on a configured-checkpoint copy. No model call (US$0).
//   tsx --tsconfig api/tsconfig.json tests/qa/check_qa378_file_withdrawal_words.ts <port> <db>
import { agent, answer, call, confirmAll, expectedFor, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, validateRoundTrip, yearsAgo } from "../../acceptance/lib/m3.ts";

type Q = { subjectId: string; fact: string; value_type: string; hidden: boolean; group: string | null; fills: { form: string }[]; answer: { value?: unknown } | null };
type Form = { item: string; form: string; state: string; stamp: { file_kind: string; file_sha256: string | null } | null; live_hash: string | null; withdrawn_words: string | null; tooltip: string | null; file: { kind: string; words: string } };
await main("QA-378", "C8.3: a withdrawal for a different validated copy is worded as a file change, not a fact change", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client R"];
  await fillEverything(c.id);
  const bc = [...((await expectedFor(c.id))?.["Sample Client R"]?.forms ?? []), ...((await expectedFor(c.id))?.["Sample Client R"]?.waiting ?? [])].find((l) => l.barcode);
  if (bc?.channel === "ONLINE") { const q = (await prepare(c.id, officer)).p; await call("PATCH", `/runtime/items/${itemsOf(q, P, bc.form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer); }
  if (bc) await validateRoundTrip(c.id, bc.form, P);
  const fP = (await prepare(c.id, officer)).p?.filings[0]?.id;
  const read = async (r: string) => ((await call("GET", `/runtime/reviews/${r}`, undefined, rep)).body?.filings?.[0]?.forms ?? []) as Form[];
  const hashes = async (r: string) => Object.fromEntries((await read(r)).map((x) => [x.item, x.live_hash ?? "waits"]));
  // Round 1: sent back
  const r1 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer)).body?.id as string;
  await call("POST", `/runtime/reviews/${r1}/open`, { filing: fP }, rep);
  await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fP, verdict: "send_back", form_hashes: await hashes(r1), reasons: [{ text: `${bc?.form}: the city of birth does not match the passport (Sample).` }] }, rep);
  // The officer fixes a fact only the barcode form reads
  const q = (((await agent(c.id))?.sections ?? []) as { questions: Q[] }[]).flatMap((s) => s.questions).find((x) => x.subjectId === P && !x.hidden && !x.group && x.value_type === "text" && x.fills.length > 0 && x.fills.every((y) => y.form === bc?.form) && typeof x.answer?.value === "string");
  if (q) { await answer(c.id, P, q.fact, `${String(q.answer?.value)}VILLE`, officer); await confirmAll(c.id, P); }
  // Round 2: approved before the new read-back
  const r2 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer)).body?.id as string;
  await call("POST", `/runtime/reviews/${r2}/open`, { filing: fP }, rep);
  const dec = await call("POST", `/runtime/reviews/${r2}/decision`, { filing: fP, verdict: "approve", form_hashes: await hashes(r2), confirm_unticked: true }, rep);
  const kindBefore = sql(`select stamp_file_kind from review_round_form where round_id='${r2}' and form_number='${bc?.form}'`);
  // The validated copy read back (QA-345's fix stamps it), then a second copy of the same facts
  if (bc) await validateRoundTrip(c.id, bc.form, P);
  const kindMoved = sql(`select stamp_file_kind from review_round_form where round_id='${r2}' and form_number='${bc?.form}'`);
  if (bc) await validateRoundTrip(c.id, bc.form, P);
  const w = (await read(r2)).find((x) => x.form === bc?.form);
  ok("QA-378 setup: round 2 approved with no file, stamped on the first read-back, withdrawn by a second validated copy of the same facts (#1440's C8.3-23 path)",
    !!bc && !!q && dec.status === 200 && kindBefore === "none" && kindMoved === "validated_copy" && w?.state === "approval_withdrawn" && /not the file this approval stamped/.test(w?.withdrawn_words ?? ""),
    { bc: bc?.form, fact: q?.fact, dec: dec.status, kindBefore, kindMoved, state: w?.state, withdrawn: w?.withdrawn_words });
  ok("QA-378 (C8.3): on a file withdrawal, the stamp line does not read as the current file (\"Stamped with the validated copy read back\" with nothing saying it is an earlier copy) and the tooltip does not say a fact changed",
    !!w && !/^Stamped with the validated copy read back\.?$/.test(w.file?.words ?? "") && !/a fact on it changed/i.test(w.tooltip ?? ""),
    { file_words: w?.file?.words, tooltip: w?.tooltip });
});

