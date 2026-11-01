// C4.6 acceptance (P-220 pack 2; P-62 §7, P-143): Preview by person shows, for each person, what they get per channel —
// filled PDFs to upload, PDFs they must sign (and how), paper — and a form filed once for the couple or the application
// appears once. Visitor visa first. IRCC rules (compliance trace, Pack 2): IMM 5257 is completed by each person applying
// (IRCC-P2-03); the Family Information form by each applicant 18 or older (IRCC-P2-04); a parent or legal guardian signs
// for anyone under 18 (IRCC-P2-06); IMM 5476 is signed by the applicant and the representative (IRCC-P2-09).
// Today Preview groups forms by channel but has no "to sign" output, and a child's Family Information form is not held
// back by age on Visitor visa, so this fails. Portal screens stay parked (P-102): not tested.
// SHAPE (proposed; Question for the tech lead): PreviewForm gains `sign: { by: string; how: string } | null`.
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
  // Sample setup through the Forms tab's routes: 5257 signed by hand and scanned; 5707 from age 18; 5476 for the principal,
  // only if there is a representative, signed by the person and the representative.
  let r = await call("PATCH", `/combinations/${vv}/forms/${encodeURIComponent(line("IMM 5257"))}/channel`, { channel: "PDF_UPLOAD", signature: "HAND_SCANNED", from: "PDF_UPLOAD", fromSignature: "NONE" }, AUTHOR);
  ok("setup: IMM 5257 is PDF upload, signed by hand and scanned", r.status === 200, words(r));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205707`, { minAge: 18 }, AUTHOR);
  ok("setup: IMM 5707 is asked from age 18 (G5256: each person 18 or older)", r.status < 300, words(r));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM%205476`, { who: "principal_applicant", signedBy: "person_and_representative", conditionPlain: "Only if the applicant uses a representative" }, AUTHOR);
  ok("setup: IMM 5476 is the principal's, signed by the person and the representative", r.status < 300, words(r));

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
  ok("C4.6 pass: the child's IMM 5257 is signed for them by a parent or legal guardian (under 18)", !!c5257?.sign && /parent|guardian|principal/i.test(c5257.sign.by), c5257?.sign);
  const c5707 = (C?.forms ?? []).find((f: any) => f.form === "IMM 5707");
  ok("C4.6 fail: a child under 18 gets no Family Information form (IMM 5707 from 18)", !!C && (!c5707 || c5707.applies === false), c5707);
  const rep = people.find((p) => p.role === "representative");
  const R = rep ? await pv(rep.subjectId) : null;
  const r5476 = (R?.forms ?? []).find((f: any) => f.form === "IMM 5476");
  ok("C4.6 pass: the representative's preview lists IMM 5476 as a form they sign", !!r5476?.sign, r5476);
  ok("C4.6 fail: the representative gets no IMM 5257 (not an applicant)", !(R?.forms ?? []).some((f: any) => f.form === "IMM 5257" && f.applies === true));
  T.done();
});
