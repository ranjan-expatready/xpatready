// C8.1 signed PDFs (runtime lane), Devin on #617: through the API on an isolated copy with the pack's own setup.
// (1) An adult dependent child signs their own IMM 5257; a child under 18 is signed for by a parent (VV-R09), by the date
// of birth on the case. (2) Signing steps and the signed scan are refused on a form that is not signed by hand and
// scanned on this application. (3) Changing a form's channel sets its signing steps aside (kept as history), so steps
// done for the old channel never make it Ready. Sample data, no model call (US$0).
//   zsh studio/tools/isolated.sh rt_c81 4438 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4438 xr_studio_rt_c81
//   tsx studio/acceptance/lib/setup_vv_m3.ts 4438 xr_studio_rt_c81
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/check_c81_signing_api.ts 4438 xr_studio_rt_c81
import { AUTHOR, OFFICER, REVIEWER, answer, call, confirmAll, fillEverything, firms, generateCopy, itemsOf, needVisitorVisa, openCase, prepare, sendFile, signedScan, sql, yearsAgo } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
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
  p = (await prepare(c.id)).p;
  const to = (it.accepts ?? []).find((x) => x !== it.channel)!;
  const ch = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: to, reason: "Sample: filed another way", version: (p as unknown as { version: string }).version }, OFFICER);
  ok(`fail (Devin on #617): after ${it.form}'s channel changes (${it.channel} → ${to}), the steps done for the old one no longer count, and are kept as history`, ch.status === 200 && (await done()).length === 0
    && Number(sql(`select count(*) from sign_step where item_id='${it.id}' and superseded_at is not null`)) === 3, { status: ch.status, detail: ch.body?.detail, done: await done() });
  p = (await prepare(c.id)).p;
  const back = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: it.channel, reason: "Sample: back to the first channel", version: (p as unknown as { version: string }).version }, OFFICER);
  ok("fail (Devin on #617): changing back does not bring the old steps back: the form is signed again for this channel", back.status === 200 && (await done()).length === 0, { status: back.status, done: await done() });
}
summary();
