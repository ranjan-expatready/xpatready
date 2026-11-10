// C10.2 (Adobe Acrobat's own Validate on the finished story's Paper IMM 5257, 9 Nov 2026, 17:13–17:45 IST): Validate
// refused "7. Current country of residence (status)" must contain a value though the page showed "Citizen", after two
// "You entered information that is not required, please review". Cause, read from the copy and the form's own script:
// the stored status was "01", one of its export values (so not an export-value fault), but the copy also held "Other"
// details and From and To dates beside it, and IMM 5257's validateCOR empties the status for either ("negative case").
// The fix is data (P-319): IMM 5257 (09-2023)'s form-field gates in samples/form-field-gates.json (B107), so those boxes
// are written, and their questions asked, only for the statuses the form takes them for.
// This check loads the finished story once (about 4 minutes; replays only, US$0) and reads every copy it filled (Paper,
// PDF upload, and the case copies of the Online lines) with the project's XFA reader (tests/fixtures/read_choice_values.py):
//   1. every choice-list field's stored value is one of its export values (all forms, all copies);
//   2. on every IMM 5257 copy, nothing the form's own Validate empties the status for: no From or To date beside
//      Citizen, Permanent resident, Protected Person or Refugee Claimant (01, 02, 07, 08), no "Other" details beside a
//      status other than Other (06), in question 7 and in question 9 B;
//   3. the release the case files on carries those gates, and the copy says why each such box is empty.
//   4. (QA-361, 9 Nov: the tech lead's Acrobat Validate stopped at "Alternate Telephone no. must contain a value") on every
//      IMM 5257 copy, no telephone block is written "Canada/US" without its North American number parts: the filler writes
//      none yet (p5/transforms.ts phone_part:nanp_*), and the form's own Validate then requires them (IMM 5257 p. 2,
//      validateAlternateTelephone, validateFaxNumber, the Canada/US box's click script).
//   5. (10 Nov: the tech lead's Acrobat Validate stopped at "-Details Of Visit- … 1a) Purpose of my visit" after "not
//      required") on every IMM 5257 copy, nothing 14 of the form's own "negative case" branches empty a box for (the
//      detail-beside-an-answer ones, modelled from the official template below, NOT_REQUIRED). Validate shows only the
//      first such message, so v5 reads them all at once. Not modelled (review m1 on #1482; none fires on the story on
//      10 Nov): validateCWA "same as current country" Yes with row data, the Transit visa beside a purpose, funds or Other
//      (validateDetailsOfVisit), the province, country and district checks of the mailing (4) and residential (4)
//      addresses and the school (2); the telephones read a block's visibility (v4); questions 7 and 9 B are v2;
//   6. the release the Paper copy is on carries the 10 Nov gates, and the copy says why each such box is empty.
//   7. (10 Nov, the founder's Adobe Validate: Validate passed, but the read-back found Languages c) empty where the product
//      wrote 01) on every IMM 5257 copy, no Languages c) beside an answer to b) but Both: validateLanguageSection disables c)
//      then, and the form's own util.enableField empties a field it disables (rawValue = null), with no message; the release
//      carries the gate on c) and the Paper copy says why c) is empty.
// Each has a fail case on a test-only copy with one value changed (the reader must catch it).
//   zsh studio/tools/isolated.sh rt_c102v 4431 start && tsx studio/tests/check_c102_copy_values.ts 4431 xr_studio_rt_c102v
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4431), DB = process.argv[3] ?? "xr_studio_rt_c102v";
const STUDIO = join(import.meta.dirname, ".."), ROOT = join(STUDIO, "..", "..", "..", "..");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python"), READER = join(STUDIO, "tests", "fixtures", "read_choice_values.py");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
if (PORT === 4400 || DB === "xr_studio_demo") { console.log("refused: this check loads the finished story; run it on an isolated copy, never the demo (:4400, xr_studio_demo)"); process.exit(2); }
const sql = (q: string) => execFileSync(process.env.PSQL ?? "/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) as { story?: { state: string } | null; checkpoint?: string | null } | null };
};
type Choice = { path: string; caption: string; wrote: string; is_export: boolean; is_display: boolean; exports: number };
type Read = { file: string; choices: Choice[]; values: Record<string, string> };
const readCopies = (files: string[]): Read[] => execFileSync(PY, ["-I", READER, ...files], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

// IMM 5257 (09-2023) p. 1, its own Validate script: validateCOR (question 7) and validateCWA (question 9 B) set the status to
// null on a date beside 01/02/07/08 (validateCOR only) or "Other" details beside any status but 06. Test-side reading of
// the official form, independent of the gate data it checks.
const PD = "form1[0].Page1[0].PersonalDetails[0].";
const NO_DATES = ["01", "02", "07", "08"];
const ROWS = [{ q: "7", row: `${PD}CurrentCOR[0].Row2[0].`, dates: true }, { q: "9 B", row: `${PD}CountryWhereApplying[0].Row2[0].`, dates: false }];
function cleared(v: Record<string, string>): string[] {
  const out: string[] = [];
  for (const r of ROWS) {
    const status = v[`${r.row}Status[0]`] ?? "";
    if (r.dates && NO_DATES.includes(status)) for (const d of ["FromDate", "ToDate"]) if (v[`${r.row}${d}[0]`]) out.push(`question ${r.q}: ${d} "${v[`${r.row}${d}[0]`]}" beside status ${status}`);
    if (status !== "06" && v[`${r.row}Other[0]`]) out.push(`question ${r.q}: Other "${v[`${r.row}Other[0]`]}" beside status ${status || "(empty)"}`);
  }
  return out;
}

// IMM 5257 (09-2023), its own Validate (validateCompletedForm calls each in this order): 14 "negative case" branches that
// empty a box for a detail beside an answer (the rest: see 5. above), read 10 Nov 2026 from the official template (official-sources/ircc/forms/imm5257e.pdf, sha256
// 0dc03b24…a562e). Each empties a required box (a status, a purpose, a Yes/No) when a detail sits beside an answer that
// does not ask for it; the form then says "You entered information that is not required, please review" (only the first
// time), and later that the emptied box "must contain a value". Test-side reading, independent of the gate data.
const P1 = "form1[0].Page1[0].", P2 = "form1[0].Page2[0].", P3 = "form1[0].Page3[0].", CT = `${P2}ContactInformation[0].contact[0].`;
type Branch = { fn: string; when: (v: Record<string, string>) => boolean; details: string[] };
const NOT_REQUIRED: Branch[] = [
  { fn: "validateNames (alias No)", when: (v) => v[`${P1}PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]`] === "N", details: [`${P1}PersonalDetails[0].AliasName[0].AliasFamilyName[0]`, `${P1}PersonalDetails[0].AliasName[0].AliasGivenName[0]`] },
  ...["Row2", "Row3"].map((r) => ({ fn: `validatePCOR (${r} Other beside a status but 06)`, when: (v: Record<string, string>) => v[`${PD}PreviousCOR[0].${r}[0].Status[0]`] !== "06", details: [`${PD}PreviousCOR[0].${r}[0].Other[0]`] })),
  { fn: "validateMaritalStatus (spouse beside a status but married or common-law, 01/03)", when: (v) => !["01", "03"].includes(v[`${P1}MaritalStatus[0].SectionA[0].MaritalStatus[0]`] ?? ""), details: ["DateOfMarriage[0]", "FamilyName[0]", "GivenName[0]"].map((x) => `${P1}MaritalStatus[0].SectionA[0].${x}`) },
  { fn: "validatePrevMarriedSection (previous spouse beside No)", when: (v) => v[`${P2}MaritalStatus[0].SectionA[0].PrevMarriedIndicator[0]`] === "N", details: ["PMFamilyName[0]", "GivenName[0].PMGivenName[0]", "TypeOfRelationship[0]", "FromDate[0]", "ToDate[0].ToDate[0]", "PrevSpouseDOB[0].DOBYear[0]", "PrevSpouseDOB[0].DOBMonth[0]", "PrevSpouseDOB[0].DOBDay[0]"].map((x) => `${P2}MaritalStatus[0].SectionA[0].${x}`) },
  { fn: "validateIdentityDocument (national identity document beside No)", when: (v) => v[`${P2}natID[0].q1[0].natIDIndicator[0]`] === "N", details: ["DocNum[0].DocNum[0]", "CountryofIssue[0].CountryofIssue[0]", "IssueDate[0].IssueDate[0]", "ExpiryDate[0]"].map((x) => `${P2}natID[0].natIDdocs[0].${x}`) },
  { fn: "validateUSCard (US card beside No)", when: (v) => v[`${P2}USCard[0].q1[0].usCardIndicator[0]`] === "N", details: ["DocNum[0].DocNum[0]", "ExpiryDate[0]"].map((x) => `${P2}USCard[0].usCarddocs[0].${x}`) },
  { fn: "validateResidentialAddress (a residential address beside same as mailing: Yes; or a mailing PO box)", when: (v) => v[`${CT}SameAsMailingIndicator[0]`] === "Y", details: [`${CT}AddressRow1[0].POBox[0].POBox[0]`, ...["ResidentialAddressRow1[0].AptUnit[0].AptUnit[0]", "ResidentialAddressRow1[0].StreetNum[0].StreetNum[0]", "ResidentialAddressRow1[0].StreetName[0].Streetname[0]", "ResidentialAddressRow1[0].CityTown[0].CityTown[0]", "ResidentialAddressRow2[0].Country[0].Country[0]", "ResidentialAddressRow2[0].ProvinceState[0].ProvinceState[0]", "ResidentialAddressRow2[0].PostalCode[0].PostalCode[0]", "ResidentialAddressRow2[0].District[0]"].map((x) => CT + x)] },
  { fn: "validateDetailsOfVisit (question 1 b) Other beside a purpose but Other, 03)", when: (v) => v[`${P3}DetailsOfVisit[0].PurposeRow1[0].PurposeOfVisit[0].PurposeOfVisit[0]`] !== "03", details: [`${P3}DetailsOfVisit[0].PurposeRow1[0].Other[0].Other[0]`] },
  { fn: "validateEducation (a school beside No)", when: (v) => v[`${P3}Education[0].EducationIndicator[0]`] === "N", details: ["FromYear[0]", "FromMonth[0]", "ToYear[0]", "ToMonth[0]", "FieldOfStudy[0]", "School[0]", "CityTown[0]", "Country[0].Country[0]", "ProvState[0]"].map((x) => `${P3}Education[0].Edu_Row1[0].${x}`) },
  { fn: "validateBackGroundInformation (question 1 c) beside No to 1 a) and 1 b))", when: (v) => v[`${P3}BackgroundInfo[0].Choice[0]`] === "N" && v[`${P3}BackgroundInfo[0].Choice[1]`] === "N", details: [`${P3}BackgroundInfo[0].Details[0].MedicalDetails[0]`] },
  { fn: "validateBackGroundInformation (question 2 d) beside No to 2 a), 2 b) and 2 c))", when: (v) => ["VisaChoice1[0]", "VisaChoice2[0]", "Details[0].VisaChoice3[0]"].every((x) => v[`${P3}BackgroundInfo2[0].${x}`] === "N"), details: [`${P3}BackgroundInfo2[0].Details[0].refusedDetails[0]`] },
  { fn: "validateBackGroundInformation (question 3 b) beside No to 3 a))", when: (v) => v[`${P3}PageWrapper[0].BackgroundInfo3[0].Choice[0]`] === "N", details: [`${P3}PageWrapper[0].BackgroundInfo3[0].details[0]`] },
  { fn: "validateBackGroundInformation (question 4 b) beside No to 4 a))", when: (v) => v[`${P3}PageWrapper[0].Military[0].Choice[0]`] === "N", details: [`${P3}PageWrapper[0].Military[0].militaryServiceDetails[0]`] },
];
const notRequired = (v: Record<string, string>) => NOT_REQUIRED.flatMap((b) => (b.when(v) ? b.details.filter((d) => v[d]).map((d) => `${b.fn}: ${d.split(".").slice(-2).join(".")} "${v[d]}"`) : []));

const tmp = mkdtempSync(join(tmpdir(), "xr-c102v-"));
try {
  let r = await call("POST", "/demo/checkpoints/finished-story", { confirm: "RESET" });
  ok("setup: the finished story starts (202)", r.status === 202, r.status);
  let done = false;
  for (const until = Date.now() + 900_000; r.status === 202 && Date.now() < until && !done;) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = (await call("GET", "/demo/status")).body;
    done = s?.story?.state === "done" && s?.checkpoint === "finished_story";
    if (s?.story?.state === "failed") break;
  }
  ok("setup: the finished story is loaded", done);

  // Every copy the story filled, with the channel of its line: the person's own (a moved line, C11.6), else the release's,
  // else PDF upload (release 1 names none). An Online line is entered from its answer sheet, so it has no copy here; its
  // filing's other forms (Schedule 1, IMM 5645, IMM 5476 on release 2) are PDF uploads and are read like the rest.
  const rows = (sql(`select f.form_number || '|' || coalesce(i.channel::text, (select x->>'channel' from config_release c, jsonb_array_elements(c.snapshot->'forms') x where c.id=f.config_release_id and x->>'form_number'=f.form_number limit 1), 'PDF_UPLOAD') || '|' || f.path || '|' || f.config_release_id from form_instance f left join filing_item i on i.case_id=f.case_id and i.subject_id=f.subject_id and i.item_key=f.form_number and i.active where f.status='GENERATED' and f.path is not null order by f.created_at`) || "").split("\n").filter(Boolean)
    .map((l) => { const [form, channel, path, release] = l.split("|"); return { form, channel, path: join(ROOT, path), release }; });
  const reads = rows.length ? readCopies(rows.map((x) => x.path)) : [];
  const copies = rows.map((x, i) => ({ ...x, read: reads[i] }));
  const paper = copies.filter((c) => c.form === "IMM 5257" && c.channel === "PAPER");
  // The Paper copy the case files: the newest, made on the release the case is on (release 2; the first was on release 1).
  const filed = paper[paper.length - 1];
  const onRelease = copies.filter((c) => c.release === filed?.release && c !== filed);
  ok("setup: the story filled copies, each read back: the Paper IMM 5257 and, on the same release, the PDF uploads filed with the Online filings", copies.length > 0 && reads.length === copies.length && !!filed && onRelease.length > 0 && onRelease.every((c) => c.channel === "PDF_UPLOAD"),
    { copies: copies.length, paper: paper.length, onRelease: onRelease.map((c) => `${c.form} ${c.channel}`) });
  if (!filed) throw new Error("no Paper IMM 5257 copy: nothing to check (the story's Paper line is in samples/finished-story.json, paper_line)");

  // 1. Choice values (the first suspect on 9 Nov): every stored value is one of its field's export values.
  const notExport = copies.flatMap((c) => (c.read?.choices ?? []).filter((x) => !x.is_export).map((x) => ({ form: c.form, channel: c.channel, field: x.path.split(".").slice(-3).join("."), wrote: x.wrote, display: x.is_display })));
  const choices = copies.reduce((n, c) => n + (c.read?.choices.length ?? 0), 0);
  ok(`C10.2-v1 pass: every choice field with a fixed place on every copy (${choices} values, ${copies.length} copies: Paper and PDF upload, both releases) holds one of its export values (a repeating row's fields have no fixed data path in the reader and are not read)`, choices > 0 && notExport.length === 0, notExport);
  const statusPath = `${PD}CurrentCOR[0].Row2[0].Status[0]`;
  const badChoice = join(tmp, "bad-choice.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badChoice, `${statusPath}=Citizen`], { stdio: ["ignore", "pipe", "pipe"] });
  const bc = readCopies([badChoice])[0].choices.find((x) => x.path === statusPath);
  ok("C10.2-v1 fail: a status stored as its display word (\"Citizen\", not \"01\") is caught as not an export value", !!bc && !bc.is_export && bc.is_display, bc);

  // 2. IMM 5257's own Validate: nothing it empties the status for.
  const i5257 = copies.filter((c) => c.form === "IMM 5257");
  const hits = i5257.flatMap((c) => cleared(c.read?.values ?? {}).map((w) => `${c.channel || "copy"}: ${w}`));
  ok(`C10.2-v2 pass (IMM 5257 validateCOR, validateCWA): no date beside 01/02/07/08 and no "Other" details beside a status but 06, on every IMM 5257 copy (${i5257.length})`, i5257.length > 0 && i5257.every((c) => !!c.read?.values[statusPath]) && hits.length === 0, hits);
  const badRule = join(tmp, "bad-rule.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badRule, `${statusPath}=01`, `${PD}CurrentCOR[0].Row2[0].Other[0]=SAMPLE`, `${PD}CurrentCOR[0].Row2[0].FromDate[0]=2024-01-15`, `${PD}CurrentCOR[0].Row2[0].ToDate[0]=`], { stdio: ["ignore", "pipe", "pipe"] });
  const br = cleared(readCopies([badRule])[0].values);
  ok("C10.2-v2 fail: Citizen with \"Other\" details and a From date, no To date (each box set, whatever the copy held) is caught twice", br.length === 2 && br.some((w) => /Other/.test(w)) && br.some((w) => /FromDate/.test(w)), br);

  // 3. The gates the fix adds are in the release the Paper copy was made on, and the copy says why each box is empty.
  const gated = ["CurrentCOR[0].Row2[0].Other[0]", "CurrentCOR[0].Row2[0].FromDate[0]", "CurrentCOR[0].Row2[0].ToDate[0]", "CountryWhereApplying[0].Row2[0].Other[0]"].map((x) => PD + x);
  const inRelease = Number(sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where r.id='${filed.release}' and m->>'form_number'='IMM 5257' and e->'condition_rule'->'gate' is not null and e->>'data_path' in (${gated.map((g) => `'${g}'`).join(",")})`) || 0);
  ok("C10.2-v3 pass (B107 data, samples/form-field-gates.json): the Paper copy's release carries IMM 5257's four gates", inRelease === 4, inRelease);
  const boxes: { box: string; result: string; why: string | null }[] = JSON.parse(sql(`select coalesce(result_json->'boxes', '[]') from form_instance where path='${filed.path.replace(`${ROOT}/`, "")}' order by created_at desc limit 1`) || "[]");
  const said = gated.slice(0, 3).map((g) => boxes.find((b) => b.box === g)).filter(Boolean) as { result: string; why: string | null }[];
  ok("C10.2-v3 pass: on the Paper copy (a Citizen) the status row's Other, From and To are not written, each saying \"Not needed\"", said.length === 3 && said.every((b) => b.result !== "written" && /^Not needed/.test(b.why ?? "")), said);

  // 4. QA-361: a telephone block written "Canada/US" needs its North American number parts, which the filler does not write.
  const CI = "form1[0].Page2[0].ContactInformation[0].contact[0].";
  const PHONES = [`${CI}PhoneNumbers[0].Phone[0].`, `${CI}PhoneNumbers[0].AltPhone[0].`, `${CI}FaxEmail[0].Phone[0].`];
  const naStuck = (v: Record<string, string>) => PHONES.filter((b) => v[`${b}CanadaUS[0]`] === "1" && ["AreaCode", "FirstThree", "LastFive"].some((x) => !v[`${b}NANumber[0].${x}[0]`])).map((b) => b.split(".").slice(-3, -1).join("."));
  const stuck = i5257.flatMap((c) => naStuck(c.read?.values ?? {}).map((b) => `${c.channel || "copy"}: ${b}`));
  ok(`C10.2-v4 pass (QA-361; IMM 5257 validateAlternateTelephone, validateFaxNumber): no telephone block written "Canada/US" without its North American number parts, on every IMM 5257 copy (${i5257.length})`, i5257.length > 0 && stuck.length === 0, stuck);
  const badPhone = join(tmp, "bad-phone.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badPhone, `${CI}PhoneNumbers[0].AltPhone[0].CanadaUS[0]=1`, `${CI}PhoneNumbers[0].AltPhone[0].Other[0]=0`, `${CI}PhoneNumbers[0].AltPhone[0].NumberCountry[0]=1`, `${CI}PhoneNumbers[0].AltPhone[0].IntlNumber[0].IntlNumber[0]=`], { stdio: ["ignore", "pipe", "pipe"] });
  const bp = naStuck(readCopies([badPhone])[0].values);
  ok("C10.2-v4 fail: the 9 Nov combination (the alternate telephone written \"Canada/US\", country code 1, no number parts) is caught", bp.some((b) => /AltPhone/.test(b)), bp); // asserts the box it sets only, whatever the base copy holds (the v2 fail case's lesson, 178b95d)

  // 5. 10 Nov: every "negative case" branch of the form's own Validate that reads stored values (NOT_REQUIRED), on every copy.
  const nr = i5257.flatMap((c) => notRequired(c.read?.values ?? {}).map((w) => `${c.channel || "copy"}: ${w}`));
  ok(`C10.2-v5 pass (IMM 5257's own Validate, ${NOT_REQUIRED.length} branches: validateDetailsOfVisit, validateBackGroundInformation and the rest): no detail beside an answer that does not ask for it, on every IMM 5257 copy (${i5257.length})`, i5257.length > 0 && nr.length === 0, nr);
  const purposeAt = `${P3}DetailsOfVisit[0].PurposeRow1[0].`, badDetail = join(tmp, "bad-detail.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badDetail, `${purposeAt}PurposeOfVisit[0].PurposeOfVisit[0]=08`, `${purposeAt}Other[0].Other[0]=SAMPLE`, `${P3}PageWrapper[0].Military[0].Choice[0]=N`, `${P3}PageWrapper[0].Military[0].militaryServiceDetails[0]=SAMPLE`], { stdio: ["ignore", "pipe", "pipe"] });
  const bd = notRequired(readCopies([badDetail])[0].values);
  ok("C10.2-v5 fail: the 10 Nov combination (purpose Family Visit, 08, with \"Other\" details SAMPLE) and question 4 b) details beside No are caught", bd.some((w) => /validateDetailsOfVisit.*Other\[0\]\.Other\[0\] "SAMPLE"/.test(w)) && bd.some((w) => /question 4 b\)/.test(w)), bd); // asserts the boxes it sets only

  // 6. The 10 Nov gates are in the Paper copy's release, and the copy says why each such box is empty.
  const gated10 = ["DetailsOfVisit[0].PurposeRow1[0].Other[0].Other[0]", "BackgroundInfo2[0].Details[0].refusedDetails[0]", "PageWrapper[0].BackgroundInfo3[0].details[0]", "PageWrapper[0].Military[0].militaryServiceDetails[0]"].map((x) => P3 + x);
  const inRelease10 = Number(sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where r.id='${filed.release}' and m->>'form_number'='IMM 5257' and e->'condition_rule'->'gate' is not null and e->>'data_path' in (${gated10.map((g) => `'${g}'`).join(",")})`) || 0);
  ok("C10.2-v6 pass (B107 data, samples/form-field-gates.json, 10 Nov): the Paper copy's release carries the gates on Details of visit 1 b) and Background Information 2 d), 3 b), 4 b)", inRelease10 === 4, inRelease10);
  const said10 = gated10.map((g) => ({ g: g.split(".").slice(-2).join("."), b: boxes.find((b) => b.box === g) }));
  ok("C10.2-v6 pass: on the Paper copy (purpose Family Visit, No to questions 2 to 4) those four boxes are not written, each saying \"Not needed: written only when …\"", said10.every((x) => !!x.b && x.b.result !== "written" && /^Not needed: written only when/.test(x.b.why ?? "")), said10);

  // 7. Languages c) is kept by the form only beside b) Both (validateLanguageSection + util.enableField's rawValue = null).
  const LG = `${P2}MaritalStatus[0].SectionA[0].Languages[0].languages[0].`;
  const cleared7 = (v: Record<string, string>) => (v[`${LG}lov[0]`] && v[`${LG}ableToCommunicate[0].ableToCommunicate[0]`] !== "Both" ? [`c) "${v[`${LG}lov[0]`]}" beside b) "${v[`${LG}ableToCommunicate[0].ableToCommunicate[0]`] ?? ""}"`] : []);
  const h7 = i5257.flatMap((c) => cleared7(c.read?.values ?? {}).map((w) => `${c.channel || "copy"}: ${w}`));
  ok(`C10.2-v7 pass (IMM 5257 validateLanguageSection, util.enableField): no Languages c) beside an answer to b) but Both, on every IMM 5257 copy (${i5257.length})`, i5257.length > 0 && h7.length === 0, h7);
  const badLang = join(tmp, "bad-lang.pdf");
  execFileSync(PY, ["-I", READER, "--set", filed.path, badLang, `${LG}ableToCommunicate[0].ableToCommunicate[0]=English`, `${LG}lov[0]=01`], { stdio: ["ignore", "pipe", "pipe"] });
  const bl = cleared7(readCopies([badLang])[0].values);
  ok("C10.2-v7 fail: the 10 Nov combination (b) English, c) 01) is caught", bl.length === 1 && /c\) "01" beside b\) "English"/.test(bl[0]), bl);
  const gateC = Number(sql(`select count(*) from config_release r, jsonb_array_elements(r.snapshot->'field_maps') m, jsonb_array_elements(m->'entries') e where r.id='${filed.release}' and m->>'form_number'='IMM 5257' and e->'condition_rule'->'gate' is not null and e->>'data_path' = '${LG}lov[0]'`) || 0);
  const boxC = boxes.find((b) => b.box === `${LG}lov[0]`);
  ok("C10.2-v7 pass (B107 data, 10 Nov): the Paper copy's release carries the gate on Languages c), and the copy (b) English) leaves c) empty saying \"Not needed: written only when …\"", gateC === 1 && !!boxC && boxC.result !== "written" && /^Not needed: written only when/.test(boxC.why ?? ""), { gateC, boxC });
} catch (e) {
  ok("the check ran to its end", false, (e as Error).message);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
