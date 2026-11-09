// B116 (founder's ruling on #1123, 6 Nov 2026 ~03:15 IST; C10.1 row 12b): the product fills every box IMM 5257's own
// Validate insists on, never a hand tick in Adobe. The tech lead's Validate stopped on Background 1 a) (tuberculosis), and a
// practice pass showed Background 6 and the research-contact consent stop it too. None was mapped by the saved AI answer.
// So a Yes/No form field nothing fills yet is asked as its own question (POST /editions/:id/form-fields/own-question), in
// the form's words: its reading's printed question, or, where the reading prints a neighbour's words (the consent box), the
// form's question quoted and checked against its saved text. The checkpoint asks the three (samples/own-yes-no.json, data,
// Sample, Unconfirmed: expert) for every applicant, minors included, and the Sample family's copies write them.
// Pass and fail: on the configured checkpoint, US$0, no live AI; one SQL write stands in for a later change by another door
// (review M1) and is put back before the undo that follows.
//   zsh studio/tools/isolated.sh forms_b116 4446 start && tsx studio/tests/check_forms_b116_own_unmapped.ts 4446 xr_studio_forms_b116
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4446), DB = process.argv[3] ?? "xr_studio_forms_b116";
const VARDIR = join(import.meta.dirname, "..", "var", `isolated-${DB.replace(/^xr_studio_/, "")}`);
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !c ? ` — ${JSON.stringify(detail).slice(0, 500)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = (method: string, path: string, body?: unknown, actor = "user-A") => new Promise<{ status: number; body: any }>((done, failed) => {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const rq = request({ host: "localhost", port: PORT, path: `/api${path}`, method, headers: { "x-actor": actor, "content-type": "application/json", ...(data ? { "content-length": Buffer.byteLength(data) } : {}) } }, (r) => {
    let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => { let b: any = null; try { b = JSON.parse(t); } catch { /* not JSON */ } done({ status: r.statusCode ?? 0, body: b }); });
  });
  rq.on("error", failed); if (data) rq.write(data); rq.end();
});

const BOXES = {
  "form1[0].Page3[0].BackgroundInfo[0].Choice[0]": { fact: "person.tuberculosis_in_past_two_years", words: "Within the past two years, have you or a family member ever had tuberculosis of the lungs or been in close contact with a person with tuberculosis?" },
  "form1[0].Page3[0].PageWrapper[0].GovPosition[0].Choice[0]": { fact: "person.ill_treatment_of_prisoners_or_civilians", words: "Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?" },
  "form1[0].Page3[0].Signature[0].Consent0[0].Choice[0]": { fact: "person.consents_to_research_contact", words: "Do you consent to be contacted by CIC, or an organization at CIC’s request, in the future?" },
} as const;
// QA-165's last two (#1363): the configured checkpoint now asks IMM 5257's Taiwan PIN and Israel passport boxes itself, so
// this door's own pass and undo use IMM 5257 SCH1's Question 5 (its form's text is saved too,
// expected/source-text/imm5257_1e.xfa-template.txt), written in its own codes true and false. QA-318 (#1272): the
// checkpoint now asks SCH1's Question 5 itself too, and no released Yes/No box on a form whose text is saved is left that
// nothing fills. So, as review M1's write below, one SQL write puts that box's released row back to "filled by hand" (as
// the release's AI map left it) for these checks, and puts the checkpoint's row back after them.
const SCH1_Q5 = "Schedule1[0].WarHumanityCrimesInfo[0].HaveWitnessedParticipated[0]";
const RELATIONSHIP = "form1[0].Page2[0].MaritalStatus[0].SectionA[0].TypeOfRelationship[0]";
const NATID = "form1[0].Page2[0].natID[0].q1[0].natIDIndicator[0]";

const l = await call("POST", "/demo/load", { sample: "configured" });
if (l.status >= 300) { console.error("STOP  the configured checkpoint did not load", l.body); process.exit(2); }
ok("B116: the checkpoint loads at US$0", l.body?.cost_usd === 0, l.body?.cost_usd);
const row7 = (l.body?.checkpoint ?? []).find((r: { row: string }) => r.row === "7");
ok("B116: no refusal for the three asks in the checkpoint's row 7", !/Tuberculosis in past two years|Ill treatment of prisoners|Consents to research contact/.test(row7?.why ?? ""), row7?.why);
const ed = sql(`select id from form_edition where edition_label = 'IMM 5257 (09-2023)' and channel = 'PDF'`);
const ed1 = sql(`select id from form_edition where edition_label = 'IMM 5257 SCH1 (09-2023)' and channel = 'PDF'`);

// Pass: the release maps each box to its question, in the form's own Yes and No codes and the form's own words.
for (const [path, b] of Object.entries(BOXES)) {
  const r = sql(`select outcome || '|' || coalesce(canonical_field_key, '') || '|' || coalesce(transform, '') || '|' || coalesce(evidence_quote, '') from form_field_map where form_edition_id = '${ed}' and data_path = '${path}' and status = 'PUBLISHED' order by version desc limit 1`).split("|");
  ok(`B116 pass: release 1 maps "${b.words.slice(0, 40)}…" to ${b.fact} as yes_no_code:Y/N, quoting the form`, r[0] === "mapped" && r[1] === b.fact && r[2] === "yes_no_code:Y/N" && r[3] === b.words, r);
}
// Pass: every applicant is asked them, minors included; each copy writes the Sample family's No.
const caseId = sql(`select id from runtime_case where reference = 'SAMPLE-VV-FAMILY-1'`);
const q = await call("GET", `/runtime/cases/${caseId}/questionnaire`, undefined, "user-O");
const askedOf = (fact: string) => new Set((q.body?.sections ?? []).filter((s: any) => s.questions.some((x: any) => x.fact === fact)).map((s: any) => s.about_label));
for (const b of Object.values(BOXES)) ok(`B116 pass: all four applicants are asked ${b.fact}, the child under 18 included`, askedOf(b.fact).size === 4 && askedOf(b.fact).has("Child (Sample)"), [...askedOf(b.fact)]);
const dir = join(VARDIR, "workspaces", "demo", "cases", caseId);
const copies = readdirSync(dir).filter((f) => /^IMM5257-.*\.request\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")).values as Record<string, string>);
ok("B116 pass: four IMM 5257 copies, each writing N in the three boxes", copies.length === 4 && copies.every((v) => Object.keys(BOXES).every((p) => v[p] === "N")), copies.map((v) => Object.keys(BOXES).map((p) => v[p])));

// Setup (QA-318): SCH1's Question 5 as a released box nothing fills yet; the checkpoint's row is put back at the end.
const releasedQ5 = sql(`select id || '|' || outcome || '|' || coalesce(canonical_field_key, '') || '|' || coalesce(transform, '') from form_field_map where form_edition_id = '${ed1}' and data_path = '${SCH1_Q5}' and status = 'PUBLISHED' order by version desc limit 1`).split("|");
const lit = (v: string) => (v ? `'${v.replace(/'/g, "''")}'` : "null");
sql(`update form_field_map set outcome = 'by_hand', canonical_field_key = null, transform = null where id = '${releasedQ5[0]}'`);

// Fail: words the form does not print are never taken as its question.
const ownOn = (edition: string, body: Record<string, unknown>) => call("POST", `/editions/${edition}/form-fields/own-question`, { reason: "B116 check: asked as its own question", ...body });
const own = (body: Record<string, unknown>) => ownOn(ed, body), own1 = (body: Record<string, unknown>) => ownOn(ed1, body);
const made = await own1({ dataPath: SCH1_Q5, label: "Witnessed ill treatment", meaning: "Whether the person has seen prisoners or civilians treated badly (IMM 5257 SCH1, a check of the B116 door, Sample).", question: "Have you ever seen prisoners treated badly?" });
ok("B116 fail: a question the form's saved text does not hold is refused (409) in words", made.status === 409 && /not in IMM 5257 SCH1 \(09-2023\)'s own saved text/.test(made.body?.detail ?? made.body?.message ?? ""), made);
const code = await own1({ dataPath: SCH1_Q5, label: "Witnessed ill treatment", meaning: "Whether the person has witnessed the ill treatment of prisoners or civilians (IMM 5257 SCH1, a check of the B116 door, Sample).", question: "this.rawValue = xfa.layout.page(this);" });
ok("B116 fail (review M2): a piece of the form's script, though in its saved text, is never taken as its question (409)", code.status === 409 && /own saved text/.test(code.body?.detail ?? code.body?.message ?? ""), code);
const notYesNo = await own({ dataPath: RELATIONSHIP, label: "Type of earlier relationship", meaning: "The kind of relationship the person had with an earlier spouse or partner (IMM 5257)." });
ok("B116 fail: a form field the form prints no Yes and No for is refused (409)", notYesNo.status === 409 && /does not print one Yes and one No/.test(notYesNo.body?.detail ?? notYesNo.body?.message ?? ""), notYesNo);
const quoted = await own({ dataPath: NATID, field: "person.has_national_id", question: BOXES["form1[0].Page3[0].Signature[0].Consent0[0].Choice[0]"].words });
ok("B116 fail: quoted words are refused on a form field worked out from other answers (400)", quoted.status === 400 && /quote the form's words only for a form field nothing fills yet/.test(quoted.body?.detail ?? quoted.body?.message ?? ""), quoted);
ok("B116 fail: nothing changed on SCH1's Question 5 box after the refusals", sql(`select count(*) from form_field_map where form_edition_id = '${ed1}' and data_path = '${SCH1_Q5}' and status = 'DRAFT'`) === "0");

// Pass, then undo: a released "filled by hand" Yes/No box, asked with the form's own question quoted (SCH1 Question 5), then
// taken back to "filled by hand".
const words = "Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?";
const draft = () => sql(`select outcome || '|' || coalesce(transform, '') from form_field_map where form_edition_id = '${ed1}' and data_path = '${SCH1_Q5}' and status = 'DRAFT'`);
const t = await own1({ dataPath: SCH1_Q5, label: "Witnessed ill treatment", meaning: "Whether the person has ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings (IMM 5257 SCH1, Question 5; a check of the B116 door, Sample).", nearReason: "SCH1's own Question 5, asked here only to check the door (Sample).", question: words });
ok("B116 pass: a released \"filled by hand\" Yes/No box is asked with words the form prints, as a draft mapped in its own codes (yes_no_code:true/false)", t.status < 300 && t.body?.question === words && draft() === "mapped|yes_no_code:true/false", { t, draft: draft() });
// Review M1: a later change to the form field (here its draft's transform, as another door would write it) is never rolled
// back by Undo: it refuses, and the form field keeps that change.
const rowId = sql(`select id from form_field_map where form_edition_id = '${ed1}' and data_path = '${SCH1_Q5}' and status = 'DRAFT'`);
sql(`update form_field_map set transform = 'yes_no_code:false/true' where id = '${rowId}'`);
const later = await call("POST", `/editions/${ed1}/form-fields/own-question/undo`, { dataPath: SCH1_Q5 });
ok("B116 fail (review M1): Undo refuses (409) once the form field no longer holds what the ask wrote, and changes nothing", later.status === 409 && draft() === "mapped|yes_no_code:false/true", { later, draft: draft() });
sql(`update form_field_map set transform = 'yes_no_code:true/false' where id = '${rowId}'`);
const u = await call("POST", `/editions/${ed1}/form-fields/own-question/undo`, { dataPath: SCH1_Q5 });
ok("B116 pass: undo takes it back to \"filled by hand\": its draft goes, the release sees no change", u.status < 300 && u.body?.field === null && draft() === "", { u, draft: draft() });
const again = await call("POST", `/editions/${ed1}/form-fields/own-question/undo`, { dataPath: SCH1_Q5 });
ok("B116 fail: a second undo is refused (409): nothing is asked any more", again.status === 409, again);
sql(`update form_field_map set outcome = ${lit(releasedQ5[1])}, canonical_field_key = ${lit(releasedQ5[2])}, transform = ${lit(releasedQ5[3])} where id = '${releasedQ5[0]}'`);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
