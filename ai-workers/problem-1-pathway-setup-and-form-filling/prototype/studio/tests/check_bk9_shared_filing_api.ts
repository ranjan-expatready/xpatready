// BK-9 API checks (P-448, Bake plan row 23): on the configured checkpoint, through the product's routes, a family's shared
// filing (people on the principal's application) is changed on any pathway, never refused for the combination:
//   Study permit (its children are on the principal's application): Remove filing for the child keeps one application,
//     the child on it declared only, their items no longer applying; Add filing back brings the same items back (same ids);
//   Express Entry (the spouse is on the principal's application), when released: Make principal moves the one application
//     to the spouse, the same filing and items (same ids), the former principal on it as spouse;
//   Visitor visa (everyone files their own): unchanged, Remove filing stops the child's own filing.
// Each rule has a passing and a failing case. Product routes only, except two set-up writes in SQL named where they are
// (a signed scan; a Ready to file mark). No model call (US$0).
//   zsh studio/tools/isolated.sh rt_bk9 4436 start && tsx studio/tests/check_bk9_shared_filing_api.ts 4436 xr_studio_rt_bk9
import { call, firms, openCase, prepare, sql, yearsAgo, type Prepare } from "../acceptance/lib/m3.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const AUTHOR = "user-A";
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? JSON.stringify(r.body?.errors ?? ""));
const comboId = (key: string) => sql(`select c.id from combination c where c.combination_key='${key}' and exists (select 1 from config_release r where r.combination_id=c.id)`);
if (!comboId("sp.outside")) { const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR); if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.status); process.exit(2); } }
const f = await firms();
const officer = f.officer ?? "user-O", rep = f.rep ?? "user-R";
const team = { representative: rep, caseOfficers: [officer] };
const preview = (caseId: string, kind: string, subject: string) => call("POST", `/runtime/cases/${caseId}/filing-changes`, { kind, subject, preview: true }, officer);
const apply = async (caseId: string, kind: string, subject: string) => {
  const v = await preview(caseId, kind, subject);
  return { v, r: v.status === 200 ? await call("POST", `/runtime/cases/${caseId}/filing-changes`, { kind, subject, basis: v.body?.basis, reason: "BK-9 check on a test copy (Sample)" }, officer) : v };
};
const lines = (v: { body: any }) => ((v.body?.changes ?? []) as { label: string; words: string[] }[]).flatMap((l) => l.words.map((w) => `${l.label}: ${w}`));
const itemIds = (p: Prepare | null, subject: string) => (p?.items ?? []).filter((i) => i.subject === subject).map((i) => i.id).sort();
const ref = (k: string) => `BK9-${k}-${Date.now().toString(36)}`;

// (1) Study permit: the child is on the principal's application.
{
  const sp = comboId("sp.outside")!;
  const c = await openCase(sp, [{ role: "principal", name: "Sample Student K", dob: yearsAgo(30) }, { role: "child", name: "Sample Child K", dob: yearsAgo(8) }], team, ref("sp"));
  const S = c.subjects["Sample Student K"], K = c.subjects["Sample Child K"];
  const p0 = (await prepare(c.id, officer)).p;
  const kItems = itemIds(p0, K);
  ok("C6.13 BK-9 setup: the Study permit case has one application with the child applying on it, and the child has items", p0?.filings.length === 1 && p0.filings[0].applicants.some((a) => a.subject === K && a.mode === "applying") && kItems.length > 0, p0?.filings);
  const { v, r } = await apply(c.id, "remove_filing", K);
  ok("C6.13 BK-9: remove pass (failed before BK-9 with 422 \"not worked out yet\"): the preview is given and names the child declared only on the principal's application", v.status === 200 && lines(v).some((w) => /Sample Child K is declared on this filing only \(not travelling\)/.test(w)) && lines(v).some((w) => /Sample Child K: \d+ items? stop applying/.test(w)), [v.status, words(v), lines(v)]);
  const childLine = ((v.body?.changes ?? []) as { person: string; on?: string }[]).find((l) => l.person === K);
  ok("C6.13 BK-9: remove pass (walk finding): the words never call the child's place \"their filing\": the title and the child's line name the student's application", /^Take Sample Child K off as travelling on Sample Student K's application\?$/.test(v.body?.title ?? "") && /stays on Sample Student K's application, declared only/.test(v.body?.stays ?? "") && childLine?.on === "Sample Student K", [v.body?.title, v.body?.stays, childLine]);
  const p1 = (await prepare(c.id, officer)).p;
  ok("C6.13 BK-9: remove pass: applied, still one application; the child is on it declared only, with no items applying", r.status === 200 && p1?.filings.length === 1 && p1.filings[0].applicants.some((a) => a.subject === K && a.mode === "declared_only") && itemIds(p1, K).length === 0 && itemIds(p1, S).length > 0, [r.status, words(r), p1?.filings]);
  const again = await preview(c.id, "remove_filing", K);
  ok("C6.13 BK-9: remove fail: removing it again is refused in words (not travelling), not for the pathway", again.status === 422 && /not travelling/.test(words(again)) && !/not worked out yet/.test(words(again)), [again.status, words(again)]);
  const back = await apply(c.id, "add_back", K);
  const p2 = (await prepare(c.id, officer)).p;
  ok("C6.13 BK-9: add back pass: the child applies on the principal's application again, with the same items (same ids)", back.r.status === 200 && lines(back.v).some((w) => /Sample Child K applies on this filing again/.test(w)) && p2?.filings[0].applicants.some((a) => a.subject === K && a.mode === "applying") && JSON.stringify(itemIds(p2, K)) === JSON.stringify(kItems), [back.r.status, words(back.r), itemIds(p2, K).length, kItems.length]);
  const principal = await preview(c.id, "remove_filing", S);
  ok("C6.13 BK-9: remove fail: the principal's application is never removed (422, in words)", principal.status === 422 && /Make someone else principal first/.test(words(principal)), [principal.status, words(principal)]);
}

// (2) Express Entry (the spouse is on the principal's application): Make principal moves the one application.
{
  const ee = comboId("pnp.express_entry");
  if (!ee) ok("C6.13 BK-9: Express Entry is released on the configured checkpoint (needed for Make principal on a shared application)", false, "not released on this copy");
  else {
    const c = await openCase(ee, [{ role: "principal", name: "Sample Principal E", dob: yearsAgo(35) }, { role: "spouse_or_partner", name: "Sample Spouse E", dob: yearsAgo(33) }, { role: "child", name: "Sample Child E", dob: yearsAgo(8) }], team, ref("ee"));
    const A = c.subjects["Sample Principal E"], B = c.subjects["Sample Spouse E"], K = c.subjects["Sample Child E"];
    const p0 = (await prepare(c.id, officer)).p;
    // An item is one person's form, document or step: the ones both shapes want keep their id (role-specific ones follow the role).
    const byKey = (p: Prepare | null) => new Map((p?.items ?? []).filter((i) => i.subject === A || i.subject === B || i.subject === K).map((i) => [`${i.subject}|${i.kind}|${i.form ?? i.document_type ?? i.step ?? ""}`, i.id]));
    const fid = p0?.filings[0]?.id, all = byKey(p0);
    ok("C6.13 BK-9 setup: the Express Entry case has one application with the spouse on it", p0?.filings.length === 1 && p0.filings[0].applicants.some((a) => a.subject === B), p0?.filings);
    // Review M1: a form of the 8-year-old child already signed by hand (set in SQL: the signed-scan route needs every sign
    // step first) is warned about on the shared application as on an own filing.
    const kForm = (p0?.items ?? []).find((i) => i.subject === K && i.kind === "form");
    if (kForm) sql(`insert into signed_scan (id, workspace_id, case_id, item_id, file_name, media_type, size_bytes, sha256, path, uploaded_by) select gen_random_uuid(), workspace_id, case_id, id, 'signed.pdf', 'application/pdf', 10, repeat('0', 64), 'x', 'user-O' from filing_item where id='${kForm.id}'`);
    // Review m3: the filing is Ready to file before the change (set in SQL as setup).
    sql(`update filing set status='READY_TO_FILE' where id='${fid}'`);
    const { v, r } = await apply(c.id, "make_principal", B);
    ok("C6.13 BK-9: make principal pass (failed before BK-9): the preview says the family's application moves to the spouse, as one application", v.status === 200 && lines(v).some((w) => /^Sample Spouse E: The family's application is now Sample Spouse E's/.test(w)) && lines(v).some((w) => /^Sample Principal E: Now on Sample Spouse E's application/.test(w)) && !lines(v).some((w) => /stops|starts again/.test(w)), [v.status, words(v), lines(v)]);
    ok("C6.13 BK-9: make principal pass (review M1): the child's form already signed by hand by the former principal is warned about", !!kForm && lines(v).some((w) => /^Sample Child E: 1 form already signed by hand by Sample Principal E: to be signed again/.test(w)), lines(v));
    // Review m3: right after (no prepare read in between) taking the child off resets the shared filing's Ready to file.
    sql(`update filing set status='READY_TO_FILE' where id='${fid}'`);
    const rm = await apply(c.id, "remove_filing", K);
    ok("C6.13 BK-9: remove fail (review m3): straight after Make principal, removing the child takes the shared filing back from Ready to file, and says so", rm.r.status === 200 && sql(`select status from filing where id='${fid}'`) === "NOT_STARTED" && lines(rm.v).some((w) => /Marked Ready to file → Not started/.test(w)), [rm.r.status, sql(`select status from filing where id='${fid}'`), lines(rm.v)]);
    ok("C6.13 BK-9: remove pass (review m4): the done words say the child is off as travelling on the application, not \"filing removed\"", /^Sample Child E taken off as travelling on Sample Spouse E's application/.test(rm.r.body?.words ?? ""), rm.r.body?.words);
    await apply(c.id, "add_back", K);
    const p1 = (await prepare(c.id, officer)).p;
    const now = p1?.filings[0];
    ok("C6.13 BK-9: make principal pass: the same application (same id) is now the spouse's, the former principal on it as spouse", r.status === 200 && p1?.filings.length === 1 && now?.id === fid && now?.applicants.some((a) => a.subject === B && a.role === "principal") && now?.applicants.some((a) => a.subject === A && a.role === "spouse_or_partner"), [r.status, words(r), p1?.filings, fid]);
    const after = byKey(p1), kept = [...after].filter(([k]) => all.has(k));
    ok("C6.13 BK-9: make principal fail: no item both shapes want is made again (the same item ids, so copies, signatures and passes stay)", kept.length > 0 && kept.every(([k, id]) => all.get(k) === id), { kept: kept.length, changed: kept.filter(([k, id]) => all.get(k) !== id).map(([k]) => k) });
  }
}

// (3) Visitor visa: everyone files their own; unchanged.
{
  const vv = comboId("vv.single")!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Visitor V", dob: yearsAgo(40) }, { role: "child", name: "Sample Child V", dob: yearsAgo(10) }], team, ref("vv"));
  const K = c.subjects["Sample Child V"];
  await prepare(c.id, officer);
  const v = await preview(c.id, "remove_filing", K);
  ok("C6.13 BK-9: own filings pass: on the Visitor visa, Remove filing still stops the child's own application", v.status === 200 && lines(v).some((w) => /Sample Child V: Their own filing stops \(not travelling\)/.test(w)), [v.status, words(v), lines(v)]);
  ok("C6.13 BK-9: own filings fail: and it never speaks of a family's application moving", !lines(v).some((w) => /family's application/.test(w)));
}

process.exitCode = summary() ? 1 : 0;
