// C8.3 (B144): the data the screen walk (tests/check_c83_review_browser.cjs) starts from, made through the product's own
// routes as acceptance/C8.3.test.ts does: a Visitor visa case with two filings, every fact answered and confirmed; round
// 1 sent; the spouse's filing approved by the representative of record and the principal's sent back; the case officer
// fixes a fact only the principal's barcode form reads and sends round 2; then changes a fact only the spouse's barcode
// form reads, which withdraws that one form's approval (P-412 F1). Prints one JSON line. No model call (US$0).
//   tsx --tsconfig api/tsconfig.json tests/runtime/setup_c83_walk.ts <port> <db>
import { agent, answer, call, confirmAll, expectedFor, fillEverything, firms, itemsOf, needVisitorVisa, openCase, prepare, validateRoundTrip, yearsAgo } from "../../acceptance/lib/m3.ts";

type Q = { subjectId: string; fact: string; value_type: string; collected_from: string; hidden: boolean; group: string | null; fills: { form: string }[]; answer: { value?: unknown } | null };
const vv = needVisitorVisa();
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A with a long family name to show wrapping", dob: yearsAgo(38) }], { representative: rep, caseOfficers: [officer] });
const P = c.subjects["Sample Client A"], S = Object.entries(c.subjects).find(([n]) => n.startsWith("Sample Spouse A"))![1];
await fillEverything(c.id);
const exp = await expectedFor(c.id);
const barcodeOf = (subject: string) => { const name = subject === P ? "Sample Client A" : "Sample Spouse A with a long family name to show wrapping"; return [...(exp?.[name]?.forms ?? []), ...(exp?.[name]?.waiting ?? [])].find((l) => l.barcode); };
for (const subj of [P, S]) {
  const bc = barcodeOf(subj);
  if (bc?.channel === "ONLINE") { const q = (await prepare(c.id, officer)).p; await call("PATCH", `/runtime/items/${itemsOf(q, subj, bc.form)[0]?.id}/channel`, { channel: "PAPER", reason: "Cannot apply online: accommodation (Sample)", version: q?.version }, officer); }
  if (bc) await validateRoundTrip(c.id, bc.form, subj);
}
const p = (await prepare(c.id, officer)).p;
const fP = p?.filings.find((x) => x.applicants[0]?.subject === P)?.id, fS = p?.filings.find((x) => x.applicants[0]?.subject === S)?.id;
const r1 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP, fS] }, officer)).body?.id;
const hashes = async (round: string, filing: string | undefined) => Object.fromEntries((((await call("GET", `/runtime/reviews/${round}`, undefined, rep)).body?.filings ?? []) as { filing: string; forms: { item: string; live_hash: string | null }[] }[]).find((x) => x.filing === filing)?.forms.map((x) => [x.item, x.live_hash ?? "waits"]) ?? []);
await call("POST", `/runtime/reviews/${r1}/open`, { filing: fS }, rep);
await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fS, verdict: "approve", form_hashes: await hashes(r1, fS), confirm_unticked: true }, rep);
await call("POST", `/runtime/reviews/${r1}/open`, { filing: fP }, rep);
await call("POST", `/runtime/reviews/${r1}/decision`, { filing: fP, verdict: "send_back", form_hashes: await hashes(r1, fP), reasons: [{ text: `${barcodeOf(P)?.form}: the city of birth does not match the passport (Sample).` }] }, rep);
const onlyOn = async (subject: string, form: string | undefined) => (((await agent(c.id))?.sections ?? []) as { questions: Q[] }[]).flatMap((s) => s.questions)
  .filter((q) => q.subjectId === subject && !q.hidden && !q.group && q.value_type === "text" && q.collected_from !== "client_questionnaire" && q.fills.length > 0 && q.fills.every((x) => x.form === form) && typeof q.answer?.value === "string");
const qP = await onlyOn(P, barcodeOf(P)?.form);
if (qP[0]) { await answer(c.id, P, qP[0].fact, `${String(qP[0].answer?.value)}VILLE`, officer); await confirmAll(c.id, P); }
const r2 = (await call("POST", `/runtime/cases/${c.id}/reviews`, { filings: [fP] }, officer)).body?.id;
const qS = await onlyOn(S, barcodeOf(S)?.form);
if (qS[0]) { await answer(c.id, S, qS[0].fact, `${String(qS[0].answer?.value)}TOWN`, officer); await confirmAll(c.id, S); }
// A second fact on the principal's barcode form, for the walk's "changed while you were reading" step.
const spare = qP[1] ? { subject: P, fact: qP[1].fact, value: `${String(qP[1].answer?.value)} X` } : null;
// Review M1: a solo firm's filing approved (self-reviewed), then a fact the solo representative types withdraws it, so the
// walk re-approves it from the page with the self-review statement.
const solo = f.soloRep ?? "user-S";
const sc = await openCase(vv, [{ role: "principal", name: "Sample Solo Client", dob: yearsAgo(45) }], { representative: solo, caseOfficers: [solo] });
const sf = (await prepare(sc.id, solo)).p?.filings[0]?.id;
const sr = (await call("POST", `/runtime/cases/${sc.id}/reviews`, { filings: [sf], now: true }, solo)).body?.id;
const sh = Object.fromEntries((((await call("GET", `/runtime/reviews/${sr}`, undefined, solo)).body?.filings ?? []) as { forms: { item: string; live_hash: string | null }[] }[])[0]?.forms.map((x) => [x.item, x.live_hash ?? "waits"]) ?? []);
await call("POST", `/runtime/reviews/${sr}/decision`, { filing: sf, verdict: "approve", form_hashes: sh, confirm_unticked: true, self: true }, solo);
await answer(sc.id, sc.subjects["Sample Solo Client"], "person.family_name", "SOLOSAMPLE", solo);
console.log(JSON.stringify({ caseId: c.id, r1, r2, fP, fS, officer, rep, spare, solo: { caseId: sc.id, round: sr, filing: sf, actor: solo } }));
process.exit(0);
