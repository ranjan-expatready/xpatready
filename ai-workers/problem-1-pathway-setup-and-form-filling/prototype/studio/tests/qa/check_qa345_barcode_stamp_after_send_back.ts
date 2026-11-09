// QA-345 (Conflict · Major, C8.3, row B144; concept "Beaten": each form stamped with "the file that goes to IRCC (the
// validated copy for a barcode form)"): after a send back that changes a fact on a barcode form, round 2's approval
// stamps the barcode form with no file (the old read-back no longer matches), and the validated copy read back
// afterwards is filed under that approval without ever being stamped or re-approved. This check encodes fix option (a)
// (stamp the first file read back after an approval that stamped none, or ask for re-approval); retire it if the
// founder takes option (b) (facts-only stamps; the row and the dialog's words change). Fails today, passes when fixed.
// Through the product's routes, as acceptance/C8.3.test.ts does; run on a configured-checkpoint copy. No model call.
//   tsx --tsconfig api/tsconfig.json tests/qa/check_qa345_barcode_stamp_after_send_back.ts <port> <db>
import { agent, answer, call, confirmAll, expectedFor, fillEverything, firms, itemsOf, main, needVisitorVisa, ok, openCase, prepare, sql, validateRoundTrip, yearsAgo } from "../../acceptance/lib/m3.ts";

type Q = { subjectId: string; fact: string; value_type: string; hidden: boolean; group: string | null; fills: { form: string }[]; answer: { value?: unknown } | null };
type Form = { item: string; form: string; state: string; stamp: { file_kind: string; file_sha256: string | null } | null; live_hash: string | null };
await main("QA-345", "C8.3: the filed validated copy of a barcode form is stamped by an approval after a send back", async () => {
  const vv = needVisitorVisa();
  const f = await firms();
  const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client Q", dob: yearsAgo(40) }], { representative: rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client Q"];
  await fillEverything(c.id);
  const bc = [...((await expectedFor(c.id))?.["Sample Client Q"]?.forms ?? []), ...((await expectedFor(c.id))?.["Sample Client Q"]?.waiting ?? [])].find((l) => l.barcode);
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
  ok("QA-345 setup: a barcode form, a send back that changed one of its facts, round 2 approved (its stamp holds no file, as today)", !!bc && !!q && dec.status === 200 && kindBefore === "none", { bc: bc?.form, fact: q?.fact, dec: dec.status, kindBefore });
  // The validated copy for today's facts is read back after the approval
  if (bc) await validateRoundTrip(c.id, bc.form, P);
  const after = (await read(r2)).find((x) => x.form === bc?.form);
  const liveSha = sql(`select v.sha256 from validated_copy v join form_instance fi on fi.id=v.form_instance_id where fi.case_id='${c.id}' and fi.subject_id='${P}' and fi.form_number='${bc?.form}' order by v.read_at desc nulls last limit 1`);
  ok("QA-345 (C8.3, concept 'Beaten', row B144): the validated copy filed for a barcode form is under an approval that stamps that file, or the approval asks again (not 'approved' with no file)",
    !!after && ((after.stamp?.file_kind === "validated_copy" && !!after.stamp?.file_sha256 && after.stamp.file_sha256 === liveSha) || after.state !== "approved"),
    { state: after?.state, stamp: after?.stamp, liveSha });
});
