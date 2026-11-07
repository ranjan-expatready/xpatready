// C8.1 signed PDFs (runtime lane), Devin on #617: through the API on an isolated copy with the pack's own setup.
// (1) An adult dependent child signs their own IMM 5257; a child under 18 is signed for by a parent (VV-R09), by the date
// of birth on the case. (2) Signing steps and the signed scan are refused on a form that is not signed by hand and
// scanned on this application. (3) Changing a form's channel sets its signing steps aside (kept as history), so steps
// done for the old channel never make it Ready. (4) #924: the sign and scan lines reach the firm's own staff only, never
// another firm's (user-S). (5) B129 (B3 challenge M2, break M3): once the submission is recorded the application is
// read-only, so no signing step and no signed scan is recorded on it, even a new print after a fact changed (409 in the
// server's words, nothing stored). (6) B132 (P-380 Q3): a form signed in pen on Paper takes Printed, then Signed in pen,
// in order (a barcode form printed only once its validated copy is read back); the prepare view's Paper line and the
// readiness read them. Sample data, no model call (US$0).
// It runs the pack's own setup on its copy first when the copy has no release 2 of Visitor visa yet
// (tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts), so the suites runner can run it alone (CI on #617).
//   zsh studio/tools/isolated.sh rt_c81 4438 start && tsx studio/tests/check_c81_signing_api.ts 4438 xr_studio_rt_c81
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { AUTHOR, DB, OFFICER, PORT, REVIEWER, agent, answer, call, confirmAll, fillEverything, filingOf, firms, generateCopy, inDays, itemsOf, needVisitorVisa, openCase, prepare, readinessOf, readyToFile, sendFile, signedScan, sql, validateRoundTrip, yearsAgo } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
// The pack's setup, once per copy: release 1 (setup_visitor_visa.ts), then release 2 with signers and channels (setup_vv_m3.ts).
const releases = () => { try { return Number(sql(`select coalesce(max(r.version), 0) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'`)); } catch { return 0; } };
const studio = join(import.meta.dirname, ".."), tsx = join(studio, "node_modules", ".bin", "tsx");
const setup = (file: string) => spawnSync(tsx, ["--tsconfig", join(studio, "api", "tsconfig.json"), join(studio, file), String(PORT), DB], { cwd: join(studio, ".."), stdio: "ignore", timeout: 900_000 });
if (releases() < 1) setup("tests/runtime/setup_visitor_visa.ts");
if (releases() < 2) setup("acceptance/lib/setup_vv_m3.ts"); // its own red lines (other rows' S2w, S7a) do not stop it
ok("setup: the copy has Visitor visa release 2 (the pack's setup)", releases() >= 2, releases());
const vv = needVisitorVisa();
const f = await firms();

// (1) Who signs, by age.
const fam = await openCase(vv, [{ role: "principal", name: "Sample Client B", dob: yearsAgo(45) }, { role: "child", name: "Sample Child B1", dob: yearsAgo(20) }, { role: "child", name: "Sample Child B2", dob: yearsAgo(9) }]);
const p1 = (await prepare(fam.id)).p;
const adult = itemsOf(p1, fam.subjects["Sample Child B1"], "IMM 5257")[0], minor = itemsOf(p1, fam.subjects["Sample Child B2"], "IMM 5257")[0];
ok("pass (Devin on #617): a dependent child aged 20 signs their own IMM 5257 (\"person\"), never \"parent\"", JSON.stringify(adult?.signers) === JSON.stringify(["person"]), adult?.signers);
ok("pass (VV-R09): a child aged 9 is signed for by a parent", JSON.stringify(minor?.signers) === JSON.stringify(["parent"]), minor?.signers);
const read = await call("GET", `/runtime/items/${adult?.id}`, undefined, OFFICER);
ok("pass: the item read says the same as the prepare view (one rule)", JSON.stringify(read.body?.signers) === JSON.stringify(["person"]), read.body?.signers);

// (3) needs a hand-signed form this account also accepts another way: IMM 5476 on Paper too (Sample, as setup_vv_m3.ts
// records IMM 5257's accepted channels).
const acc = await call("POST", "/library/forms/IMM%205476/accepts", { account: "APR_PORTAL", channels: ["PDF_UPLOAD", "PAPER"], reason: "Sample for check_c81_signing_api: IMM 5476 also on paper, so its channel can change" }, AUTHOR);
// A second person approves it (as setup_vv_m3.ts S8 does), so the Form library's record takes effect.
for (const ch of (await call("GET", "/library/changes?status=WAITING", undefined, REVIEWER)).body ?? []) await call("POST", `/library/changes/${ch.id}/approve`, {}, REVIEWER);
ok("setup: IMM 5476 is accepted on PDF upload and Paper (Sample), approved by a second person", acc.status < 300, acc.body?.detail ?? acc.status);

// (2) and (3) on a case whose facts are confirmed (a form is signed only then, P-71).
const c = await openCase(vv, [{ role: "principal", name: "Sample Client C", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [f.officer ?? OFFICER] });
const P = c.subjects["Sample Client C"];
await fillEverything(c.id);
let p = (await prepare(c.id)).p;
const notHand = (p?.items ?? []).find((i) => i.subject === P && i.form && i.signature && i.signature !== "HAND_SCANNED");
if (notHand) {
  const r = await call("POST", `/runtime/items/${notHand.id}/sign-steps/signed`, {}, OFFICER);
  const s = await sendFile(`/runtime/items/${notHand.id}/signed-scan`, signedScan(notHand.form!), "signed.pdf");
  ok(`fail (Devin on #617): ${notHand.form} (${notHand.signature}) takes no signing step and no signed scan (409, in words), nothing recorded`, r.status === 409 && /not signed by hand and scanned/.test(r.body?.detail ?? "") && s.status === 409
    && sql(`select count(*) from sign_step where item_id='${notHand.id}'`) === "0" && sql(`select count(*) from signed_scan where item_id='${notHand.id}'`) === "0", [r.status, r.body?.detail, s.status]);
} else ok("setup: the case has a form that is not signed by hand and scanned", false, (p?.items ?? []).map((i) => `${i.form}:${i.signature}`));

// A form signed by hand and scanned that this account also accepts another way (its channel can change).
const all = (p?.items ?? []) as { id: string; subject: string; form?: string; signature?: string; channel?: string; accepts?: string[] }[];
const it = all.find((i) => i.subject === P && i.signature === "HAND_SCANNED" && (i.accepts ?? []).some((x) => x !== i.channel));
if (!it) ok("setup: a hand-signed form of this case accepts another channel", false, all.filter((i) => i.form).map((i) => `${i.form}:${i.signature}:${i.channel}:${(i.accepts ?? []).join("/")}`));
else {
  // Break M1 on #617: a copy made before a fact it shows changed is out of date, and is never printed for signing.
  const old = await generateCopy(c.id, it.form!, P);
  await answer(c.id, P, "person.family_name", "SAMPLECHANGED");
  const stale = await call("POST", `/runtime/items/${it.id}/sign-steps/print`, { copy: old }, OFFICER);
  ok(`fail (break M1 on #617): printing ${it.form} from a copy made before a fact it shows changed is refused (409, in words), nothing recorded`, stale.status === 409 && /out of date/.test(stale.body?.detail ?? "") && sql(`select count(*) from sign_step where item_id='${it.id}'`) === "0", [stale.status, stale.body?.detail]);
  await confirmAll(c.id, P);
  const copy = await generateCopy(c.id, it.form!, P);
  await call("POST", `/runtime/items/${it.id}/sign-steps/print`, { copy }, OFFICER);
  await call("POST", `/runtime/items/${it.id}/sign-steps/signed`, {}, OFFICER);
  await sendFile(`/runtime/items/${it.id}/signed-scan`, signedScan(it.form!), "signed.pdf");
  const done = async () => ((await call("GET", `/runtime/items/${it.id}`, undefined, OFFICER)).body?.sign_steps ?? []).filter((x: { done: unknown }) => x.done).map((x: { key: string }) => x.key);
  ok(`setup: ${it.form} printed, signed and its scan received`, JSON.stringify(await done()) === JSON.stringify(["print", "signed", "scan_received"]), await done());
  // #924 (P-278): the sign and scan lines reach this firm's staff only; user-S (the other firm) never reads them.
  type Ev = { entity: string; summary: string };
  // Each feed must be read (200): a refused read would otherwise pass "never reads" without testing anything (break m7).
  const feed = async (actor: string) => { const x = await call("GET", "/activity", undefined, actor); return { status: x.status, lines: (x.status === 200 ? x.body as Ev[] : []).filter((e) => (e.entity === "sign step" || e.entity === "signed scan") && e.summary.includes(c.id.slice(0, 8))) }; };
  const { status: sm, lines: mine } = await feed(f.officer ?? OFFICER), { status: st, lines: theirs } = await feed("user-S");
  ok("pass (#924): the firm's own officer reads this case's sign and scan lines in the activity feed", sm === 200 && mine.some((e) => e.entity === "sign step") && mine.some((e) => e.entity === "signed scan"), { status: sm, entities: mine.map((e) => e.entity) });
  ok("fail (#924, security): another firm's staff (user-S) never read this case's sign or scan lines", st === 200 && theirs.length === 0, { status: st, lines: theirs.map((e) => e.summary) });
  p = (await prepare(c.id)).p;
  const to = (it.accepts ?? []).find((x) => x !== it.channel)!;
  const ch = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: to, reason: "Sample: filed another way", version: (p as unknown as { version: string }).version }, OFFICER);
  ok(`fail (Devin on #617): after ${it.form}'s channel changes (${it.channel} → ${to}), the steps done for the old one no longer count, and are kept as history`, ch.status === 200 && (await done()).length === 0
    && Number(sql(`select count(*) from sign_step where item_id='${it.id}' and superseded_at is not null`)) === 3, { status: ch.status, detail: ch.body?.detail, done: await done() });
  p = (await prepare(c.id)).p;
  const back = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: it.channel, reason: "Sample: back to the first channel", version: (p as unknown as { version: string }).version }, OFFICER);
  ok("fail (Devin on #617): changing back does not bring the old steps back: the form is signed again for this channel", back.status === 200 && (await done()).length === 0, { status: back.status, done: await done() });
  // Review N4 on #617: a copy whose repeating group changed since it was made (here IMM 5476 reads "intended_work"; its
  // "none apply" taken back) is out of date, and is never printed for signing, as `lock` refuses it.
  const groupCopy = await generateCopy(c.id, it.form!, P);
  const sec = ((await agent(c.id))?.sections ?? []).find((x: { subjectId: string; section: string }) => x.subjectId === P && x.section === "intended_work");
  const undo = await call("PUT", `/runtime/cases/${c.id}/groups/${P}/intended_work/none-apply`, { noneApply: false, expectedId: sec?.group?.none_apply?.id ?? null }, OFFICER);
  const g = await call("POST", `/runtime/items/${it.id}/sign-steps/print`, { copy: groupCopy }, OFFICER);
  ok(`fail (review N4 on #617): printing ${it.form} from a copy made before its repeating group changed ("none apply" taken back) is refused (409, out of date), nothing recorded`,
    undo.status < 300 && g.status === 409 && /out of date/.test(g.body?.detail ?? "") && sql(`select count(*) from sign_step where item_id='${it.id}' and superseded_at is null`) === "0", [undo.status, g.status, g.body?.detail]);
}
// (5) B129: a recorded application is read-only for its signing too (C8.2-9's lock, as the channel and "entered" are).
{
  const officer = f.officer ?? OFFICER;
  const r5 = await openCase(vv, [{ role: "principal", name: "Sample Client R", dob: yearsAgo(41) }], { representative: f.rep, caseOfficers: [officer] });
  const R = r5.subjects["Sample Client R"];
  const ready = await readyToFile(r5.id, f.rep); // facts, IMM 5476 printed, signed and scanned, the review, warnings passed
  let pr = (await prepare(r5.id, officer)).p;
  const fl = filingOf(pr, R), hand = itemsOf(pr, R).find((i) => i.signature === "HAND_SCANNED");
  const g = pr?.groups.find((x) => x.filings.includes(fl?.id ?? ""));
  const rec = await call("PATCH", `/runtime/groups/${g?.id}/record`, { filings: [{ filing: fl?.id, our_reference: "SAMPLE-REF-B129", submitted_on: inDays(0), application_number: "V300000129", fee_receipt: "SAMPLE-RECEIPT" }], ucis: [{ subject: R, uci: "1290-1290" }], version: pr?.version }, officer);
  ok("setup (B129): the filing is Ready to file and its submission is recorded; its IMM 5476 is signed by hand and scanned", ready.includes(fl?.id ?? "-") && rec.status < 300 && !!hand, { ready, rec: rec.status, detail: rec.body?.detail, hand: hand?.form });
  const steps = () => sql(`select count(*) || '/' || count(superseded_at) from sign_step where item_id='${hand?.id}'`), scans = () => sql(`select count(*) from signed_scan where item_id='${hand?.id}'`);
  const [s0, n0] = [steps(), scans()];
  // A fact the printed copy reads changes (answers stay open after recording), and a new copy is made: before B129 the
  // server took a new print as a restart, then Signed and a new scan (break M3 on #1221).
  await answer(r5.id, R, "person.family_name", "SAMPLERECORDED", officer); await confirmAll(r5.id, R);
  const copy = (await generateCopy(r5.id, hand?.form ?? "IMM 5476", R)) ?? sql(`select copy_id from sign_step where item_id='${hand?.id}' and key='print' and superseded_at is null`);
  const recorded = (x: { status: number; body: { detail?: string } | null }) => x.status === 409 && /recorded as submitted to IRCC, so it is read-only/.test(x.body?.detail ?? "") && /signing of IMM 5476/.test(x.body?.detail ?? "");
  const print = await call("POST", `/runtime/items/${hand?.id}/sign-steps/print`, { copy }, officer);
  const signed = await call("POST", `/runtime/items/${hand?.id}/sign-steps/signed`, {}, officer);
  const scan = await sendFile(`/runtime/items/${hand?.id}/signed-scan`, signedScan("IMM 5476"), "imm5476-after-recording.pdf", officer);
  const up = await call("POST", `/runtime/items/${hand?.id}/sign-steps/uploaded_to_ircc`, {}, officer);
  ok("B129 fail: on a recorded application a new Printed is refused (409, the server's read-only words), nothing recorded", recorded(print), [print.status, print.body?.detail]);
  ok("B129 fail: Signed by hand is refused the same way", recorded(signed), [signed.status, signed.body?.detail]);
  ok("B129 fail: a signed scan is refused the same way, and no file or row is stored", recorded(scan) && scans() === n0, [scan.status, scan.body?.detail, scans(), n0]);
  ok("B129 fail: \"Uploaded to IRCC\" is refused the same way (the filing was Ready, now recorded)", recorded(up), [up.status, up.body?.detail]);
  ok("B129 pass: the signing steps are as they were when the submission was recorded (none added, none superseded)", steps() === s0, [steps(), s0]);
  pr = (await prepare(r5.id, officer)).p;
  ok("B129 pass: the recorded filing still reads submitted", String(filingOf(pr, R)?.status).toLowerCase() === "submitted", filingOf(pr, R)?.status);
}
// (6) B132: a barcode form (IMM 5257) moved to Paper is signed in pen: Printed (after its validated copy is read back),
// then Signed in pen, recorded and read by the Paper line and by readiness (no "missing signature" once signed).
{
  const officer = f.officer ?? OFFICER;
  const c6 = await openCase(vv, [{ role: "principal", name: "Sample Client P", dob: yearsAgo(39) }], { representative: f.rep, caseOfficers: [officer] });
  const Q = c6.subjects["Sample Client P"];
  await fillEverything(c6.id);
  let pv = (await prepare(c6.id, officer)).p;
  const i57 = itemsOf(pv, Q, "IMM 5257")[0];
  const moved = await call("PATCH", `/runtime/items/${i57?.id}/channel`, { channel: "PAPER", reason: "Sample: on paper as an accommodation (B132)", version: (pv as unknown as { version: string }).version }, officer);
  pv = (await prepare(c6.id, officer)).p;
  type PaperItem = { id: string; signature?: string; steps?: { key: string; done: boolean | null }[] };
  const it6 = () => itemsOf(pv, Q, "IMM 5257").find((x) => !(x as { record?: string }).record) as unknown as PaperItem | undefined;
  ok("setup (B132): IMM 5257 moved to Paper is signed in pen, with its Validate step first", moved.status === 200 && it6()?.signature === "PEN" && it6()?.steps?.[0]?.key === "validate", { status: moved.status, detail: moved.body?.detail, item: it6() });
  const post = (key: string, body: unknown = {}) => call("POST", `/runtime/items/${i57?.id}/sign-steps/${key}`, body, officer);
  const rows = () => (sql(`select string_agg(key, ',' order by done_at) from sign_step where item_id='${i57?.id}' and superseded_at is null`) ?? "");
  let r = await post("sign_in_pen");
  ok("B132 fail: Signed in pen before Printed is refused in the server's words (409), nothing recorded", r.status === 409 && /Signed in pen comes after "Printed": print IMM 5257 first/.test(r.body?.detail ?? "") && rows() === "", [r.status, r.body?.detail]);
  r = await post("signed");
  ok("B132 fail: a hand-signed step on a form signed in pen is refused, naming its own steps (409)", r.status === 409 && /signed in pen on Paper: its steps are Printed, Signed in pen/.test(r.body?.detail ?? ""), [r.status, r.body?.detail]);
  const plainCopy = await generateCopy(c6.id, "IMM 5257", Q);
  r = await post("print", { copy: plainCopy });
  ok("B132 fail: a barcode form on Paper is not printed before its validated copy is read back (409, the server's words), nothing recorded", r.status === 409 && /Printed comes after the validated copy of IMM 5257 is read back/.test(r.body?.detail ?? "") && rows() === "", [r.status, r.body?.detail]);
  const vcopy = await validateRoundTrip(c6.id, "IMM 5257", Q);
  r = await post("print", { copy: vcopy });
  ok("B132 pass: once the validated copy is read back, Printed is recorded with the copy printed", !!vcopy && r.status === 200 && rows() === "print" && sql(`select copy_id from sign_step where item_id='${i57?.id}' and key='print' and superseded_at is null`) === vcopy, [r.status, r.body?.detail, rows()]);
  r = await post("sign_in_pen");
  const again = await post("sign_in_pen");
  ok("B132 pass: Signed in pen is recorded after Printed; a second press is refused (409, already done)", r.status === 200 && rows() === "print,sign_in_pen" && again.status === 409 && /Signed in pen is already done for IMM 5257/.test(again.body?.detail ?? ""), [r.status, r.body?.detail, again.status, rows()]);
  const scan = await sendFile(`/runtime/items/${i57?.id}/signed-scan`, signedScan("IMM 5257"), "imm5257-pen.pdf", officer);
  ok("B132 fail: a form signed in pen takes no signed scan (409), nothing stored", scan.status === 409 && sql(`select count(*) from signed_scan where item_id='${i57?.id}'`) === "0", [scan.status, scan.body?.detail]);
  pv = (await prepare(c6.id, officer)).p;
  const st = (k: string) => it6()?.steps?.find((x) => x.key === k)?.done;
  ok("B132 pass: the prepare view's Paper line reads Printed and Signed in pen as done (Mail not yet recorded)", st("validate") === true && st("print") === true && st("sign_in_pen") === true && st("mail") === null, it6()?.steps);
  const warns = (readinessOf(pv, filingOf(pv, Q)?.id) as { warns?: { code: string; item?: string }[] } | null)?.warns ?? [];
  ok("B132 pass: readiness no longer warns \"missing signature\" for IMM 5257 once it is signed in pen", !warns.some((w) => w.code === "missing_signature" && w.item === i57?.id), warns.map((w) => `${w.code}:${w.item === i57?.id ? "IMM 5257" : "other"}`));
  const read6 = await call("GET", `/runtime/items/${i57?.id}`, undefined, officer);
  ok("B132 pass: the item read lists a pen form's own steps, Printed then Signed in pen, both done", JSON.stringify((read6.body?.sign_steps ?? []).map((x: { key: string; done: unknown }) => `${x.key}:${!!x.done}`)) === JSON.stringify(["print:true", "sign_in_pen:true"]), read6.body?.sign_steps);
}
// (7) B132 review M1, M2, m2: a Paper barcode form is printed from its validated copy only (also on a re-print after a
// fact changed); two uploads of the same signed scan at once give one 201 and one 409 in words, never a 500 (lock order);
// a hand-signed form refuses the pen step.
{
  const officer = f.officer ?? OFFICER;
  const c7 = await openCase(vv, [{ role: "principal", name: "Sample Client V", dob: yearsAgo(37) }], { representative: f.rep, caseOfficers: [officer] });
  const V = c7.subjects["Sample Client V"];
  await fillEverything(c7.id);
  let pv = (await prepare(c7.id, officer)).p;
  const i57 = itemsOf(pv, V, "IMM 5257")[0], i76 = itemsOf(pv, V, "IMM 5476")[0];
  const mv = await call("PATCH", `/runtime/items/${i57?.id}/channel`, { channel: "PAPER", reason: "Sample: on paper as an accommodation (B132 M1)", version: (pv as unknown as { version: string }).version }, officer);
  const post = (id: string | undefined, key: string, body: unknown = {}) => call("POST", `/runtime/items/${id}/sign-steps/${key}`, body, officer);
  const printed = () => sql(`select copy_id from sign_step where item_id='${i57?.id}' and key='print' and superseded_at is null`);
  const vcopy = await validateRoundTrip(c7.id, "IMM 5257", V);
  const plain = await generateCopy(c7.id, "IMM 5257", V); // the newest copy, current, never validated
  let r = await post(i57?.id, "print", { copy: plain });
  ok("B132 M1 fail: on Paper a barcode form is never printed from a copy that is not its validated copy, even a current one (409 in words), nothing recorded", mv.status === 200 && r.status === 409 && /validated copy/.test(r.body?.detail ?? "") && !printed(), [mv.status, r.status, r.body?.detail, printed()]);
  r = await post(i57?.id, "print", { copy: vcopy });
  ok("B132 M1 pass: the validated copy itself is printed", r.status === 200 && printed() === vcopy, [r.status, r.body?.detail]);
  await post(i57?.id, "sign_in_pen");
  await answer(c7.id, V, "person.family_name", "SAMPLEREPRINT", officer); await confirmAll(c7.id, V);
  const plain2 = await generateCopy(c7.id, "IMM 5257", V);
  r = await post(i57?.id, "print", { copy: plain2 });
  ok("B132 M1 fail (re-print after a fact changed): a new print from a copy never validated is refused (409 in words); the signed one stays as it was", r.status === 409 && /validated copy/.test(r.body?.detail ?? "") && printed() === vcopy, [r.status, r.body?.detail, printed()]);
  const v2 = await validateRoundTrip(c7.id, "IMM 5257", V);
  r = await post(i57?.id, "print", { copy: v2 });
  ok("B132 M1 pass (re-print): the newly validated copy is printed and its signing starts again (the earlier steps superseded)", !!v2 && r.status === 200 && printed() === v2 && sql(`select count(*) from sign_step where item_id='${i57?.id}' and superseded_at is null`) === "1", [r.status, r.body?.detail, printed()]);
  // Devin on #1278 (red): a newer validated copy read back after a fact changed is not signed by the earlier print: Signed
  // in pen is refused until that copy is printed, and the Paper line and readiness never count steps done on another copy.
  const stepDone = async (k: string) => ((itemsOf((await prepare(c7.id, officer)).p, V, "IMM 5257").find((x) => !(x as { record?: string }).record) as unknown as { steps?: { key: string; done: boolean | null }[] })?.steps ?? []).find((x) => x.key === k)?.done;
  const penWarn = async () => {
    const pp = (await prepare(c7.id, officer)).p;
    return ((readinessOf(pp, filingOf(pp, V)?.id) as { warns?: { code: string; item?: string }[] } | null)?.warns ?? []).some((w) => w.code === "missing_signature" && w.item === i57?.id);
  };
  await answer(c7.id, V, "person.family_name", "SAMPLETHIRD", officer); await confirmAll(c7.id, V);
  const v3 = await validateRoundTrip(c7.id, "IMM 5257", V);                // read back, not printed
  r = await post(i57?.id, "sign_in_pen");
  ok("B132 (Devin, red) fail: Signed in pen on the print of an earlier copy, after a newer validated copy is read back, is refused (409 in words), nothing recorded", !!v3 && r.status === 409 && /validated copy/.test(r.body?.detail ?? "") && sql(`select count(*) from sign_step where item_id='${i57?.id}' and key='sign_in_pen' and superseded_at is null`) === "0", [r.status, r.body?.detail]);
  ok("B132 (Devin, red) fail: the Paper line does not count the earlier copy's print as this copy's (Printed not done)", (await stepDone("print")) === false, await stepDone("print"));
  r = await post(i57?.id, "print", { copy: v3 });
  const pen3 = await post(i57?.id, "sign_in_pen");
  ok("B132 (Devin, red) pass: the newer validated copy is printed (its signing starts again) and Signed in pen is recorded on it; readiness counts it", r.status === 200 && pen3.status === 200 && printed() === v3 && (await stepDone("sign_in_pen")) === true && !(await penWarn()), [r.status, r.body?.detail, pen3.status, pen3.body?.detail]);
  await answer(c7.id, V, "person.family_name", "SAMPLEFOURTH", officer); await confirmAll(c7.id, V);
  const v4 = await validateRoundTrip(c7.id, "IMM 5257", V);                // a signed print, then a newer read-back
  ok("B132 (Devin, red) fail: once a newer validated copy is read back, the earlier copy's pen signature no longer counts: the line shows it not done and readiness warns \"missing signature\" again", !!v4 && (await stepDone("sign_in_pen")) === false && (await penWarn()), [await stepDone("sign_in_pen"), await penWarn()]);
  r = await post(i57?.id, "print", { copy: v4 });
  ok("B132 (Devin, red) pass: the newer validated copy is printed: its signing starts again", r.status === 200 && printed() === v4 && sql(`select count(*) from sign_step where item_id='${i57?.id}' and superseded_at is null`) === "1", [r.status, r.body?.detail]);
  // m2: a hand-signed form refuses the pen step.
  r = await post(i76?.id, "sign_in_pen");
  ok("B132 m2 fail: a form signed by hand and scanned refuses \"Signed in pen\", naming its own steps (409), nothing recorded", r.status === 409 && /signed by hand and scanned: its steps are Printed, Signed by hand/.test(r.body?.detail ?? "") && sql(`select count(*) from sign_step where item_id='${i76?.id}' and key='sign_in_pen'`) === "0", [r.status, r.body?.detail]);
  // M2: two uploads of the same signed scan at once.
  await post(i76?.id, "print", { copy: await generateCopy(c7.id, "IMM 5476", V) });
  await post(i76?.id, "signed");
  const both = await Promise.all([1, 2].map((n) => sendFile(`/runtime/items/${i76?.id}/signed-scan`, signedScan(`IMM 5476 (${n})`), `imm5476-twice-${n}.pdf`, officer)));
  const codes = both.map((x) => x.status).sort();
  ok("B132 M2 pass: two uploads of the signed scan at once give one 201 and one 409 in words, never a 500; one scan stored", JSON.stringify(codes) === JSON.stringify([201, 409]) && both.some((x) => x.status === 409 && /already done|just done/.test(x.body?.detail ?? "")) && sql(`select count(*) from signed_scan where item_id='${i76?.id}'`) === "1", { codes, details: both.map((x) => x.body?.detail) });
}
// B129: a red line fails the suite (run-suites.sh judges the exit code; before, this suite always exited 0).
process.exit(summary() ? 1 : 0);
