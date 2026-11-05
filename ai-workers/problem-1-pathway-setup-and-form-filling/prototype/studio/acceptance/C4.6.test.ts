// C4.6 acceptance (P-220 pack 2; P-62 §7, P-143): Preview by person shows, for each person, what they get per channel —
// filled PDFs to upload, PDFs they must sign (and how), paper — and a form filed once for the couple or the application
// appears once. Visitor visa first. IRCC rules (compliance trace, Pack 2): IMM 5257 is completed by each person applying
// (IRCC-P2-03); the Family Information form by each applicant 18 or older (IRCC-P2-04); a parent or legal guardian signs
// for anyone under 18 (IRCC-P2-06); IMM 5476 is signed by the applicant and the representative (IRCC-P2-09).
// Today Preview groups forms by channel (and holds IMM 5707 back by age, C1.8) but says nothing about who signs which PDF,
// so the three signing checks fail. Portal screens stay parked (P-102): not tested.
// SHAPE (proposed; Question for the tech lead): PreviewForm gains `sign: { by: string; how: string } | null`.
// Who signs a minor's form (the principal, main's Sample rule, or "a parent or legal guardian", G5256) is an open question
// (see C3.11): the child's check below asks only that someone other than the child signs it.
//   zsh studio/tools/isolated.sh accept 4440 start && tsx studio/acceptance/C4.6.test.ts 4440 xr_studio_accept
import { AUTHOR, pack2, run } from "./lib/pack2.ts";

const T = pack2("C4.6");
const { call, sql, ok, words } = T;

run(async () => {
  await T.ready();
  const vv = T.combo("vv.single");
  await T.people(vv);
  for (const f of ["IMM 5257", "IMM 5707", "IMM 5476"]) await call("POST", `/combinations/${vv}/forms`, { formKey: f }, AUTHOR);
  const line = (f: string) => sql(`select cf.lineage_key from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='${f}' order by cf.version desc limit 1`);
  ok("setup: Visitor visa has IMM 5257, IMM 5707 and IMM 5476 lines", ["IMM 5257", "IMM 5707", "IMM 5476"].every((f) => !!line(f)));
  // Sample setup through the Forms tab's routes: 5257 signed by hand and scanned; 5707 from age 18; 5476 for each applicant
  // 18 or older (the spouse needs a separate form, adult dependants their own copy; IRCC-P2-09), only if a representative
  // is used, signed by the person and the representative.
  let r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line("IMM 5257"))}/channel`, { channel: "PDF_UPLOAD", signature: "HAND_SCANNED", from: "PDF_UPLOAD", fromSignature: "NONE" }, AUTHOR);
  ok("setup: IMM 5257 is PDF upload, signed by hand and scanned", r.status === 200, words(r));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205707`, { minAge: 18 }, AUTHOR);
  ok("setup: IMM 5707 is asked from age 18 (G5256: each person 18 or older)", r.status < 300, words(r));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205476`, { who: "each_applicant", minAge: 18, signedBy: "person_and_representative", attachMode: "ANSWER_CONDITIONAL", conditionPlain: "Only if the applicant uses a representative" }, AUTHOR);
  const l5476 = sql(`select coalesce(condition_plain,'')||'|'||who||'|'||coalesce(signed_by,'') from combination_form cf join gov_form_def g on g.id=cf.gov_form_def_id where cf.combination_id='${vv}' and g.form_key='IMM 5476' order by cf.version desc limit 1`);
  ok("setup: IMM 5476 is each adult applicant's, only if a representative is used, signed by the person and the representative (saved as such)", r.status < 300 && /representative/i.test(l5476.split("|")[0]) && l5476.split("|")[1] === "each_applicant", { status: r.status, saved: l5476 });
  // Forms filed once: IMM 5409 for the couple, IMM 5475 for the application (Sample).
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205409`, { who: "couple_once" }, AUTHOR);
  const r2 = await call("PATCH", `/combinations/${vv}/forms/IMM%205475`, { who: "case" }, AUTHOR);
  ok("setup: IMM 5409 is filed once for the couple, IMM 5475 once for the application", r.status < 300 && r2.status < 300, [words(r), words(r2)]);

  const pv = async (person: string, family = "") => (await call("GET", `/combinations/${vv}/workspace?tab=preview&person=${person}${family}`)).body?.preview;
  const P = await pv("principal");
  const f5257 = (P?.forms ?? []).find((f: any) => f.form === "IMM 5257");
  ok("C4.6 pass: the principal gets IMM 5257 as a PDF to upload", !!f5257 && f5257.group === "PDF_UPLOAD", f5257);
  ok("C4.6 pass: the principal's preview says IMM 5257 is a PDF they sign by hand and scan", !!f5257?.sign && /hand/i.test(f5257.sign.how) && /principal|themselves|person/i.test(f5257.sign.by), f5257?.sign);
  const people = (P?.people ?? []) as any[];
  const child = people.find((p) => p.role === "child");
  ok("setup: the preview family has a child", !!child, people.map((p) => p.role));
  const C = child ? await pv(child.subjectId) : null;
  const c5257 = (C?.forms ?? []).find((f: any) => f.form === "IMM 5257");
  ok("C4.6 pass: the child gets their own IMM 5257 (each person applying)", !!c5257 && c5257.applies === true, c5257);
  ok("C4.6 pass: the child's IMM 5257 is signed for them by a parent or legal guardian (under 18)", !!c5257?.sign && !/^child/i.test(c5257.sign.by), c5257?.sign);
  const c5707 = (C?.forms ?? []).find((f: any) => f.form === "IMM 5707");
  ok("C4.6 fail: a child under 18 gets no Family Information form (IMM 5707 from 18)", !!C && (!c5707 || c5707.applies === false), c5707);
  const rep = people.find((p) => p.role === "representative");
  const R = rep ? await pv(rep.subjectId) : null;
  const r5476 = (R?.forms ?? []).find((f: any) => f.form === "IMM 5476");
  ok("C4.6 pass: the representative's preview lists IMM 5476 as a form they sign", !!r5476?.sign, r5476);
  const S = people.find((p) => p.role === "spouse_or_partner");
  const s5476 = S ? ((await pv(S.subjectId))?.forms ?? []).find((f: any) => f.form === "IMM 5476") : null;
  ok("C4.6 pass: the spouse or partner has their own IMM 5476 to sign (a separate form, IRCC-P2-09)", !!s5476?.sign, s5476);
  ok("C4.6 fail: a child under 18 has no IMM 5476 of their own", !!C && !(C?.forms ?? []).some((f: any) => f.form === "IMM 5476" && f.applies === true));
  ok("C4.6 fail: the representative gets no IMM 5257 (not an applicant)", !(R?.forms ?? []).some((f: any) => f.form === "IMM 5257" && f.applies === true));
  // Once for the couple and once for the application: in their own groups, listed once across the family.
  const S2 = people.find((p) => p.role === "spouse_or_partner");
  const family = [P, S2 ? await pv(S2.subjectId) : null, C];
  const once = family.flatMap((x: any) => (x?.forms ?? []).filter((f: any) => f.group === "COUPLE" || f.group === "APPLICATION").map((f: any) => `${f.group}:${f.form}`));
  ok("C4.6 pass: IMM 5409 shows under 'Filed once for the couple' and IMM 5475 under 'Filed once for the application', each once across the family", once.includes("COUPLE:IMM 5409") && once.includes("APPLICATION:IMM 5475") && once.length === new Set(once).size, once);
  // QA-270: Preview's filled PDF takes Preview's own check (readerOf): case people are refused as on Preview itself, and a
  // refusal leaves no artifact and no audit line. A real fill by the studio's people: tests/check_fill_duty.ts (this line has no form map).
  const fillIt = (who: string) => call("POST", `/combinations/${vv}/fill`, { form: "IMM 5257", person: "principal", mode: "draft" }, who);
  const preview = (who: string) => call("GET", `/combinations/${vv}/preview?mode=draft`, undefined, who);
  const saved = () => ({ artifacts: Number(sql("select count(*) from generated_artifact")), audit: Number(sql("select count(*) from audit_event")) });
  for (const [who, label] of [["user-P", "a client"], ["user-Q", "another client"], ["user-S", "another firm's representative"], ["user-R", "the firm's own representative"], ["user-O", "a case officer"]]) {
    const before = saved();
    r = await fillIt(who);
    const after = saved(), seen = await preview(who);
    ok(`C4.6 fail: ${label} is refused the filled PDF by route (403, as on Preview), no form field returned, no artifact, no audit line`, r.status === 403 && seen.status === 403 && !r.body?.boxes && after.artifacts === before.artifacts && after.audit === before.audit, { fill: r.status, preview: seen.status, before, after, words: words(r) });
  }
  // Online is a choice per line, filled by the browser extension in a later wave (P-102, P-114): Preview says so.
  r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line("IMM 5707"))}/channel`, { channel: "ONLINE", signature: "TYPED_NAME", from: "PDF_UPLOAD", fromSignature: "NONE" }, AUTHOR);
  const on = ((await pv("principal"))?.forms ?? []).find((f: any) => f.form === "IMM 5707");
  ok("C4.6 pass: a form filed Online shows under 'Filled on the portal (Online)', saying the portal filling comes in a later wave", r.status === 200 && on?.group === "ONLINE" && /later|extension|not yet/i.test(`${on?.why ?? ""} ${on?.channelWords ?? ""}`), r.status >= 300 ? words(r) : on);
  T.done();
});
