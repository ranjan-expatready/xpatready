// B107 (QA-296, QA-299, QA-300; C6.11, C7.7): what the representative puts on a filled IMM 5476 and IMM 5475 on the
// configured checkpoint, read field by field from the PDFs the case makes (the XFA data the filler wrote, read with the
// proven E5 reader, p1/e5_roundtrip.py). The gates and "filled by hand" come from the forms' own words
// (samples/form-field-gates.json), proposed by the author and approved by a second person when the checkpoint loads
// (api/src/features/checkpoint/045-form-field-gates.ts). Each rule with a passing and a failing case. Sample data
// (samples/firms.json), US$0, no model call.
//   zsh studio/tools/isolated.sh fb107 4450 start, then Demo › Reset and Demo › Load the configured checkpoint as the author
//   tsx studio/tests/check_b107_representative_copies.ts 4450 xr_studio_fb107
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { answer, APPROVER, AUTHOR, call, CLIENT, copyBytes, firms, generateCopy, itemsOf, main, needVisitorVisa, ok, openCase, prepare, readinessOf, sql, yearsAgo } from "../acceptance/lib/m3.ts";

const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
/** Every non-empty value a filled PDF holds, by its form field's data path (as check_qa296_imm5475.ts reads it). */
function pdfValues(pdf: Buffer): Record<string, string> {
  if (!pdf.length) return {};
  const dir = mkdtempSync(join(tmpdir(), "b107-")), file = join(dir, "copy.pdf");
  try {
    writeFileSync(file, pdf);
    const code = "import sys, json; sys.path.insert(0, sys.argv[1]); import e5_roundtrip as E, xml.etree.ElementTree as ET\n"
      + "r = E.open_reader(open(sys.argv[2], 'rb').read()); d = E.data_root(ET.fromstring(E.xfa_streams(r)['datasets'].get_object().get_data()))\n"
      + "print(json.dumps({p: v for p, v in E.leaves(d) if v}))";
    return JSON.parse(execFileSync(PY, ["-I", "-c", code, join(STUDIO, "..", "p1"), file], { encoding: "utf8" }).trim().split("\n").pop()!);
  } catch { return {}; } finally { rmSync(dir, { recursive: true, force: true }); }
}
type Box = { box: string; fact: string | null; result: string; why?: string | null };
const boxesOf = (copy: string | null): Box[] => JSON.parse(sql(`select coalesce(result_json->'boxes', '[]') from form_instance where id='${copy}'`) ?? "[]");
type FirmFile = { firms: { key: string; name: string; office: { unit: string; street_number: string; street_name: string; city: string; province_state: string; postal_code: string; phone: { country_code: string; number: string } }; users: { id: string; family_name?: string; given_names?: string; email?: string; licence: { number: string } | null }[] }[] };
const FIRMS = JSON.parse(readFileSync(join(STUDIO, "samples", "firms.json"), "utf8")) as FirmFile;

const B = "IMM_5476[0].Page1[0].SectionB[0].", Q6 = `${B}question6[0].`, Q7 = `${B}question7[0].`;

await main("B107", "The representative on the filled IMM 5476 and IMM 5475 — checkpoint, field by field", async () => {
  const vv = needVisitorVisa(), f = await firms(), officer = f.officer!;
  const firm = FIRMS.firms.find((x) => x.users.some((u) => u.id === f.rep))!, rep = firm.users.find((u) => u.id === f.rep)!, rep2 = firm.users.find((u) => u.id === f.rep2)!;
  const c = await openCase(vv, [{ role: "principal", name: "Sample Client B107", dob: yearsAgo(40) }], { representative: f.rep, caseOfficers: [officer] });
  const P = c.subjects["Sample Client B107"];

  // ---- IMM 5476: the representative of record, field by field (QA-299, QA-300).
  const c5476 = await generateCopy(c.id, "IMM 5476", P);
  const v = pdfValues(await copyBytes(c5476 ?? "", officer)), boxes = boxesOf(c5476);
  ok("B107-C1 setup: a copy of IMM 5476 is made for the principal and read back", !!c5476 && Object.keys(v).length > 0, c5476);
  const expect: [string, string][] = [
    [`${B}familyName[0]`, rep.family_name!], [`${B}givenName[0]`, rep.given_names!],
    [`${Q6}questionII[0].compensated[0]`, "1"], [`${Q6}questionII[0].ICCRCMember[0]`, rep.licence!.number],
    [`${Q7}organization[0]`, firm.name], [`${Q7}unit[0]`, firm.office.unit], [`${Q7}streetNo[0]`, firm.office.street_number], [`${Q7}streetName[0]`, firm.office.street_name],
    [`${Q7}city[0]`, firm.office.city], [`${Q7}postalcode[0]`, firm.office.postal_code], [`${Q7}country[0]`, "Canada"],
    [`${Q7}phoneCountryCode[0]`, firm.office.phone.country_code], [`${Q7}phoneNumber[0]`, firm.office.phone.number], [`${Q7}email[0]`, rep.email!],
  ];
  const wrong = expect.filter(([k, want]) => v[k] !== want).map(([k, want]) => `${k.replace(B, "")}: ${JSON.stringify(v[k] ?? null)} (want ${JSON.stringify(want)})`);
  ok("B107-C2 pass (QA-300): IMM 5476 holds the representative's names, CICC tick and number, firm, office address, phone and e-mail from the firm record, each in its own box", wrong.length === 0, wrong);
  ok("B107-C3 pass: the office's province is written in question 7", (v[`${Q7}province[0]`] ?? "").length > 0, v[`${Q7}province[0]`]);
  const empty = [`${Q6}questionII[0].membership[0]`, `${Q6}questionII[0].province[0]`, `${Q6}questionII[0].quebecLaw[0]`, `${Q6}questionI[0].uncompensated[0]`, `${Q6}questionI[0].membership[0]`, `${Q6}questionI[0].otherRep[0]`, `${Q6}questionI[0].province[0]`, `${Q7}lawyer[0]`, `${Q7}membershipID[0]`, `${Q7}faxCountryCode[0]`, `${Q7}faxNumber[0]`];
  const filled = empty.filter((k) => v[k]).map((k) => `${k.replace(B, "")}=${v[k]}`);
  ok("B107-C4 fail (QA-299): no other body's membership box, no uncompensated part, no student-at-law or fax box is written for a compensated CICC representative", filled.length === 0, filled);
  ok("B107-C5 fail (QA-299): the membership number is in exactly one box of the PDF", Object.values(v).filter((x) => x === rep.licence!.number).length === 1, Object.entries(v).filter(([, x]) => x === rep.licence!.number).map(([k]) => k));
  const notNeeded = boxes.filter((b) => empty.includes(b.box));
  ok("B107-C6 pass: those boxes say why on the copy, in the form's own words (\"Not needed: written only when …\"), never \"written\"", notNeeded.length === empty.length && notNeeded.every((b) => b.result !== "written" && /^Not needed: written only when /.test(b.why ?? "")), notNeeded.map((b) => `${b.box.replace(B, "")}=${b.result}: ${b.why ?? ""}`));

  // ---- IMM 5475: the designated individual is never the representative (QA-296).
  const c5475 = await generateCopy(c.id, "IMM 5475", P);
  const v5 = pdfValues(await copyBytes(c5475 ?? "", officer)), b5 = boxesOf(c5475);
  const five = Object.entries(v5).filter(([k]) => k.includes(".Five[0]."));
  ok("B107-C7 fail (QA-296): IMM 5475's part 5 and 6 (the designated individual) hold nothing from the case", !!c5475 && five.length === 0, five);
  // The copy lists only the form fields the case reads; what the release says of part 5 and 6 is in its frozen map.
  const map = JSON.parse(sql(`select r.snapshot->'field_maps' from form_instance i join config_release r on r.id = i.config_release_id where i.id = '${c5475}'`) ?? "[]") as { form_number: string; entries: { data_path: string; outcome: string; fact: string | null; person: string | null }[] }[];
  const fiveRows = map.find((m) => m.form_number === "IMM 5475")?.entries.filter((e) => e.data_path.includes(".Five[0].")) ?? [];
  ok("B107-C8 pass (QA-296): in the release the case is pinned to, every form field of IMM 5475's part 5 and 6 is filled by hand and reads no fact about anyone", fiveRows.length >= 15 && fiveRows.every((e) => e.outcome === "by_hand" && !e.fact && !e.person), fiveRows.map((e) => `${e.data_path.split(".").slice(-1)}=${e.outcome}/${e.person ?? "-"}`));
  ok("B107-C8b fail (QA-296): and no form field of IMM 5475 is about the representative", (map.find((m) => m.form_number === "IMM 5475")?.entries ?? []).every((e) => e.person !== "representative"));
  void b5;
  const repValues = new Set([rep.family_name, rep.given_names, rep.email, firm.name, firm.office.street_name, firm.office.phone.number, rep.licence!.number]);
  ok("B107-C9 fail (QA-296): nothing of the representative's or the firm's is anywhere on IMM 5475", Object.values(v5).every((x) => !repValues.has(x)), Object.entries(v5).filter(([, x]) => repValues.has(x)));
  const own = await Promise.all([answer(c.id, P, "person.family_name", "Applicantfamily", CLIENT), answer(c.id, P, "person.given_names", "Applicantgiven", CLIENT)]);
  const again = await generateCopy(c.id, "IMM 5475", P), vAgain = pdfValues(await copyBytes(again ?? "", officer));
  ok("B107-C10 pass: the applicant's own confirmed names reach IMM 5475's applicant part (part 1), once each", own.every((x) => x.status < 300) && vAgain["IMM_5475[0].Page1[0].AppDetails[0].AppFamily[0]"] === "Applicantfamily" && vAgain["IMM_5475[0].Page1[0].AppDetails[0].AppGiven[0]"] === "Applicantgiven" && Object.values(vAgain).filter((x) => x === "Applicantfamily").length === 1, Object.entries(vAgain).filter(([k]) => /App(Family|Given)/.test(k)));

  // ---- The case: nobody is asked what nobody can answer; nothing about the representative is the client's (QA-300).
  const view = (await call("GET", `/runtime/cases/${c.id}/questionnaire?mode=agent`, undefined, officer)).body;
  const repQs = (view?.sections ?? []).filter((x: { subjectId: string }) => x.subjectId === "representative").flatMap((x: { questions: { fact: string; answer: { channel: string } | null; fills: { form: string }[] }[] }) => x.questions);
  const open = repQs.filter((q: { answer: unknown }) => !q.answer).map((q: { fact: string }) => q.fact);
  ok("B107-C11 pass (QA-300): every question about the representative on the case is answered by the firm record", repQs.length > 0 && open.length === 0, open);
  ok("B107-C12 fail (QA-296): no question about the representative fills IMM 5475", repQs.every((q: { fills: { form: string }[] }) => !q.fills.some((x) => x.form === "IMM 5475")), repQs.filter((q: { fills: { form: string }[] }) => q.fills.some((x) => x.form === "IMM 5475")).map((q: { fact: string }) => q.fact));
  ok("B107-C13 fail (QA-300): the law society's province, the uncompensated part, the student-at-law and fax facts are not asked of a CICC representative", !repQs.some((q: { fact: string }) => /licensing_province|uncompensated|supervising_lawyer|fax_/.test(q.fact)), repQs.map((q: { fact: string }) => q.fact));
  const forms = (await call("GET", `/runtime/cases/${c.id}/forms`, undefined, officer)).body?.forms ?? [];
  const f5476 = forms.find((x: { form: string }) => x.form === "IMM 5476"); // the case has one person
  const repMissing = ((f5476?.readiness?.missing ?? []) as { about?: string; fact?: string; subject?: string }[]).filter((m) => m.subject === "representative" || m.about === "The representative");
  ok("B107-C14 fail (QA-300): IMM 5476's readiness lists no missing fact about the representative", !!f5476 && repMissing.length === 0, repMissing);
  const p = (await prepare(c.id, officer)).p, it = itemsOf(p, P, "IMM 5476")[0];
  const warns = (readinessOf(p, it?.filing)?.warns ?? []) as { code: string; owes?: string; item?: string; key?: string; words: string }[];
  const owed = warns.filter((w) => w.item === it?.id && w.code === "missing_facts" && w.owes === "client" && /representative\.|person\.(address_|phone_|email|fax_)/.test(w.key ?? ""));
  ok("B107-C14b fail (QA-300): no line of IMM 5476 tells the client it owes a fact about the representative", !!it && owed.length === 0, owed.map((w) => `${w.owes}: ${w.words.slice(0, 160)}`));

  // ---- A change of representative: the new IMM 5476 holds the second representative's number in the CICC box only.
  const t = await call("GET", `/runtime/cases/${c.id}/team`, undefined, f.admin);
  const moved = await call("PUT", `/runtime/cases/${c.id}/team/representative`, { userId: f.rep2, reason: "Workload (Sample)", expectedRepresentative: t.body?.representative?.id ?? f.rep }, f.admin);
  const c2 = await generateCopy(c.id, "IMM 5476", P), v2 = pdfValues(await copyBytes(c2 ?? "", officer));
  ok("B107-C15 pass: after a change of representative, the new IMM 5476 names the second representative and holds their number in the CICC box", moved.status < 300 && v2[`${B}givenName[0]`] === rep2.given_names && v2[`${Q6}questionII[0].ICCRCMember[0]`] === rep2.licence!.number && v2[`${Q7}email[0]`] === rep2.email, [moved.status, moved.body?.detail, v2[`${B}givenName[0]`], v2[`${Q6}questionII[0].ICCRCMember[0]`]]);
  ok("B107-C16 fail (QA-299): and in no other box", Object.values(v2).filter((x) => x === rep2.licence!.number).length === 1 && !v2[`${Q6}questionII[0].membership[0]`] && !v2[`${Q6}questionI[0].membership[0]`] && !v2[`${Q6}questionII[0].quebecLaw[0]`]);

  // ---- The library: each decision went through a second person, and a release carries it.
  const changes = sql(`select action || ':' || status || ':' || count(*) from library_change where kind = 'form_field_condition' and action in ('SET_FORM_FIELD_GATE', 'SET_FORM_FIELD_BY_HAND') group by action, status order by 1`) ?? "";
  ok("B107-C17 pass: the gates and filled by hand were each approved by a second person and released (To review › form fields)", /SET_FORM_FIELD_BY_HAND:RELEASED:\d+/.test(changes) && /SET_FORM_FIELD_GATE:RELEASED:13/.test(changes) && !/WAITING|RETURNED/.test(changes), changes);
  const proposer = sql(`select string_agg(distinct proposed_by || '>' || coalesce(decided_by, '?'), ',') from library_change where kind = 'form_field_condition' and action in ('SET_FORM_FIELD_GATE', 'SET_FORM_FIELD_BY_HAND')`);
  ok("B107-C18 fail: nobody approved their own proposal", !!proposer && proposer.split(",").every((x) => { const [a, b] = x.split(">"); return a !== b && b !== "?"; }), proposer);

  // ---- What the second person reads (review M1): plain words, never the action's code, and the decision as it is.
  const listed = ((await call("GET", "/library/changes?status=RELEASED", undefined, AUTHOR)).body ?? []) as { action: string; action_word: string; form_field?: { sentence: string; words: string; decided?: { kind: string; cite: string } | null } }[];
  const ours = listed.filter((x) => x.action === "SET_FORM_FIELD_GATE" || x.action === "SET_FORM_FIELD_BY_HAND");
  ok("B107-C19 fail (review M1): no change names its action by a code, and each says gate or by hand with its source", ours.length === 26 && ours.every((x) => !/^[A-Z_]+$/.test(x.action_word) && !!x.form_field?.decided?.cite && x.form_field.decided.kind === (x.action === "SET_FORM_FIELD_GATE" ? "gate" : "by_hand")), ours.slice(0, 2).map((x) => [x.action_word, x.form_field?.decided]));
  ok("B107-C20 fail (review M1): a gate's sentence is the rest of \"Filled only when …\", never \"filled only when filled …\"", ours.every((x) => !/^filled\b/i.test(x.form_field?.sentence ?? "")), ours.map((x) => x.form_field?.sentence).filter((t) => /^filled\b/i.test(t ?? "")).slice(0, 2));
  ok("B107-C21 fail (review m7): no source shows an escaped quote", ours.every((x) => !(x.form_field?.decided?.cite ?? "").includes("\\")));

  // ---- The door at approval (review m1), through the real approve route: a WAITING gate change shaped as the door writes it.
  const BOX = `${Q6}questionII[0].ICCRCMember[0]`, ed = sql(`select id from form_edition where edition_label = 'IMM 5476 (11-2021)' and channel <> 'ONLINE' limit 1`);
  const row = sql(`select id from form_field_map where form_edition_id = '${ed}' and data_path = '${BOX}' order by version desc limit 1`);
  const ws = sql(`select workspace_id from form_edition where id = '${ed}'`);
  const changeId = sql(`insert into library_change (id, workspace_id, kind, key, label, action, reason, matches, meaning_checked, status, proposed_by, proposed_at, version, applied_by)
    select gen_random_uuid(), '${ws}', 'form_field_condition', '${ed}:${BOX}', 'IMM 5476 · B107 check gate', 'SET_FORM_FIELD_GATE', 'B107 check, Sample',
      jsonb_build_object('formEditionId', '${ed}', 'dataPath', '${BOX}', 'form', 'IMM 5476', 'edition', 'IMM 5476 (11-2021)', 'caption', coalesce(m.caption, ''), 'words', 'B107 check words', 'sentence', 'B107 check words', 'cite', 'IMM 5476 (11-2021) p. 1, B107 check source',
        'before', jsonb_build_object('outcome', m.outcome, 'fact', m.canonical_field_key, 'person', m.person, 'transform', m.transform, 'rule', m.condition_rule),
        'after', jsonb_build_object('gate', m.condition_rule->'gate', 'words', 'B107 check words', 'cite', 'IMM 5476 (11-2021) p. 1, B107 check source'), 'byHand', false, 'reason', 'x', 'replaces', '[]'::jsonb),
      false, 'WAITING', '${AUTHOR}', now(), 1, '${AUTHOR}' from form_field_map m where m.id = '${row}' returning id`)?.split("\n")[0] ?? null;
  const approve = (actor: string) => call("POST", `/library/changes/${changeId}/approve`, { note: "B107 check (Sample)" }, actor);
  const self = await approve(AUTHOR);
  ok("B107-C22 fail: the author cannot approve their own gate change", !!changeId && self.status === 403, [self.status, self.body?.detail ?? self.body?.message]);
  const was = sql(`select transform from form_field_map where id = '${row}'`);
  sql(`update form_field_map set transform = 'as_is (max 20 chars)' where id = '${row}'`);
  const stale = await approve(APPROVER);
  sql(`update form_field_map set transform = ${was === null || was === "" ? "null" : `'${was.replace(/'/g, "''")}'`} where id = '${row}'`);
  ok("B107-C23 fail: a form field changed since the proposal is refused at approval, nothing applied (409 \"Changed since\")", stale.status === 409 && /changed after this was proposed/i.test(JSON.stringify(stale.body ?? {})), [stale.status, stale.body?.detail]);
  const good = await approve(APPROVER);
  const drafted = sql(`select updated_by || ':' || (condition_rule->>'words') from form_field_map where form_edition_id = '${ed}' and data_path = '${BOX}' and status = 'DRAFT'`);
  ok("B107-C24 pass: unchanged, a second person's approval writes a draft of the form field holding the gate, by the proposer", good.status < 300 && drafted === `${AUTHOR}:B107 check words`, [good.status, good.body?.detail, drafted]);
});
