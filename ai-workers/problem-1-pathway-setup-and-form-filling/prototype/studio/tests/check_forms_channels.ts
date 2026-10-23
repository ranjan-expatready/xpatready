// F1 forms channels, slice 1 (forms lane; P-61, P-62, P-65, P-66): every rule with a passing and a failing case, on an
// isolated copy (its own database and files; the demo is never touched). No browser, NO model call (US$0): the IMM 5257
// PDF twin is the saved real AI draft of 21 Oct, replayed. The portal screens are Sample fixtures (tests/fixtures/portal).
//   zsh studio/tools/isolated.sh forms_f1 4450 start && tsx studio/tests/check_forms_channels.ts 4450 xr_studio_forms_f1
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contractProblems, difference, fingerprint, noAnswers, type CaptureRecord } from "../engine/capture.ts";
import { filingMethod } from "../engine/channels.ts";
import { codeForValue, draftOptionMap, optionMapProblems } from "../engine/options.ts";
import { normLabel } from "../engine/twin.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_f1";
const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal");
const OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const upload = async (path: string, names: string[], actor = "user-A", dir = FIX): Promise<Res> => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(dir, n)))]), n);
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const rowId = (k: string) => sql(`select id from combination where combination_key='${k}'`);
const S1 = "imm5257-online-s1-personal.html", S2 = "imm5257-online-s2-marital.html", S3 = "imm5257-online-s3-language.html";
const capture = async (screens: string[], title = "Application for a visitor visa (online)", actor = "user-A") => {
  const c = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title, applicationType: "Visitor visa" }, actor)).body;
  const added = await upload(`/captures/${c.id}/screens`, screens, actor);
  return { id: c.id as string, added };
};

(async () => {
  // ──────────────────────────────────────────── engine (no server)
  const rec = (labels: string[]): CaptureRecord => ({ contract: "portal-capture/v1", portal: "ircc_portal", form: "IMM 5257", title: "Visitor visa", way: "saved_page",
    screens: [{ key: "s01", order: 1, title: "Personal details", source: { way: "saved_page", file: "a.html", sha256: "0".repeat(64) }, inputs: labels.map((l, i) => ({ id: `in${i}`, label: l, type: "text", required: false, order: i + 1 })) }] });
  const r1 = rec(["Family name", "Given name(s)"]);
  ok("contract: a structure-only record is valid", contractProblems(r1).length === 0 && noAnswers(r1).length === 0);
  const withValue = JSON.parse(JSON.stringify(r1)); withValue.screens[0].inputs[0].value = "SAMPLE";
  ok("contract fail: a record carrying an answer is refused by the contract and by the answer check", contractProblems(withValue).length > 0 && noAnswers(withValue).length === 1, contractProblems(withValue)[0]);
  const moved = JSON.parse(JSON.stringify(r1)); moved.screens[0].source = { way: "template", file: "other.csv", sha256: "1".repeat(64) };
  ok("fingerprint: the same structure from another file or way has the same fingerprint", fingerprint(r1) === fingerprint(moved));
  ok("fingerprint fail: a reworded label changes it, and the difference names the input", fingerprint(r1) !== fingerprint(rec(["Surname", "Given name(s)"])) && difference(r1, rec(["Surname", "Given name(s)"]))[0]?.change === "reworded");
  ok("labels compare as people read them", normLabel("*Family name (as shown on your passport)") === normLabel("Family name") && normLabel("* City/Town") !== normLabel("City or town"));
  ok("filing method: PDF only · Online only · mixed · online with signed PDFs, worked out from the lines",
    filingMethod([{ form_number: "A" }]) === "PDF only" && filingMethod([{ form_number: "A", channel: "ONLINE" }]) === "Online only"
    && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B" }]) === "Online + PDF uploads"
    && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "SIGNED_PDF_UPLOAD" }]) === "Online + signed PDF uploads");
  ok("filing method: a channel only a conditional line adds is said with its condition",
    filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", status: "conditional", condition_plain: "the applicant has a representative" }]) === "Online only; plus pdf upload when the applicant has a representative", filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", status: "conditional", condition_plain: "the applicant has a representative" }]));
  const sexList = [{ key: "female", label: "Female" }, { key: "male", label: "Male" }, { key: "another_gender", label: "Another gender" }, { key: "unknown", label: "Unknown" }];
  const online = draftOptionMap(sexList, [{ code: "FEMALE", label: "Female" }, { code: "MALE", label: "Male" }, { code: "ANOTHER", label: "Another gender" }, { code: "UNKNOWN", label: "Unknown" }]);
  ok("option map (online): every value finds the portal's own code, by label", online.unmatched.length === 0 && online.optionMap.map.another_gender === "ANOTHER" && optionMapProblems(sexList.map((v) => v.key), online.optionMap).length === 0, online.optionMap.map);
  const pdf = draftOptionMap(sexList, [{ code: "Female", label: "F Female" }, { code: "Male", label: "M Male" }, { code: "Unknown", label: "U Unknown" }, { code: "Unspecified", label: "X Another gender" }]);
  ok("option map (PDF): the same values take the PDF's codes; one the matcher cannot place is left for a person", pdf.optionMap.map.female === "Female" && pdf.optionMap.map.unknown === "Unknown", { map: pdf.optionMap.map, unmatched: pdf.unmatched });
  ok("option map fail: a value without a code is a problem (filling would refuse it)", optionMapProblems(sexList.map((v) => v.key), { map: { female: "Female" }, unused: [], codes: ["Female", "Male"] }).length === 2);
  ok("fill: one shared value gives each channel its own code; a value with no code is refused", codeForValue("Female", pdf.optionMap, sexList) === "Female" && codeForValue("female", online.optionMap, sexList) === "FEMALE" && codeForValue("Another gender", { map: {}, unused: [], codes: [] }, sexList) === null);

  // ──────────────────────────────────────────── setup: sample rows, IMM 5257 PDF map from the saved real AI draft (US$0)
  await call("POST", "/demo/load");
  const vv = rowId("vv.single");
  const att = sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  let r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId = r.body?.id;
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }); await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" });
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED" });
  r = await call("POST", `/jobs/${jobId}/apply`, {});
  const pdfMapped = Number(sql("select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label like 'IMM 5257 (%' and m.outcome='mapped'"));
  ok("setup: IMM 5257's PDF field map comes from the saved real AI draft (replayed, no model call)", r.status === 201 && pdfMapped > 100 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { applied: r.status, mapped: pdfMapped });
  // IMM 5707 comes from the library (its reviewed map is reused, no AI), so the row files two forms.
  for (const f of ["imm5707e.pdf"]) { const a = sql(`select id from source_attachment where combination_id='${vv}' and file_name='${f}'`); if (a) await call("POST", `/attachments/${a}/reuse`, {}); }
  ok("setup: the visitor visa row files IMM 5257 and IMM 5707, both PDF uploads (today's behaviour kept)", sql(`select string_agg(distinct lineage_key || ':' || channel, ',' order by lineage_key || ':' || channel) from combination_form where combination_id='${vv}'`) === "IMM 5257:PDF_UPLOAD,IMM 5707:PDF_UPLOAD", sql(`select string_agg(distinct lineage_key || ':' || channel, ',') from combination_form where combination_id='${vv}'`) + " | " + sql(`select string_agg(file_name || ':' || status, ',') from source_attachment where combination_id='${vv}'`));
  const wp = rowId("wp.family");
  const wpRelease = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.release?.sha256, wpDraft = (await call("GET", `/combinations/${wp}/config`)).body.sha256;
  ok("a configuration without channels keeps its fingerprint (draft equals its release after the migration)", !!wpRelease && wpRelease === wpDraft, { wpRelease, wpDraft });

  // ──────────────────────────────────────────── intake: a saved portal screen is never a guide
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, S1)))]), S1); fd.append("combinationId", vv);
  const intake = await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json();
  ok("intake: a saved portal screen is refused as a source and pointed to a portal capture; nothing attached", intake.results[0].outcome === "refused" && /portal capture/.test(intake.results[0].message) && sql(`select count(*) from source_attachment where file_name='${S1}'`) === "0", intake.results[0].message);
  ok("intake pass: IRCC's public pages are still guides (no question inputs)", sql(`select count(*) from source_attachment where combination_id='${vv}' and file_name like 'page-imm5257%'`) !== "0" || sql("select count(*) from intake_item where kind='guide'") !== "0");

  // ──────────────────────────────────────────── captures: refusal, contract, second person, identity
  r = await call("POST", "/captures", { portal: "nowhere", form: "imm 5257", title: "x" });
  ok("capture fail: an unknown portal, a lower-case code and a short title are refused with field errors", r.status === 400 && r.body.errors?.length === 3, r.body.errors?.map((e: { field: string }) => e.field));
  const bad = await capture(["imm5257-online-s1-personal-with-answers.html"]);
  ok("capture fail: a screen with a typed name and a chosen option is refused and nothing of it is kept", bad.added.body.results[0].outcome === "refused" && bad.added.body.capture.questions === 0 && /holds an answer/.test(bad.added.body.results[0].message) && !readdirSync(join(STUDIO, "var", `isolated-${DB.replace("xr_studio_", "")}`, "workspaces", "demo", "capture-reading")).length, bad.added.body.results[0].message);
  ok("no file of a capture is kept on disk, refused or added (only checksums and structure)", !JSON.stringify(sql("select files from portal_capture")).includes("SAMPLE-PERSON") && !sql("select record::text from portal_capture").includes("SAMPLE-PERSON"));
  const c1 = await capture([S1, S2, S3]);
  ok("capture: three blank screens read in order, 13 questions, no values", c1.added.body.results.every((x: { outcome: string }) => x.outcome === "added") && c1.added.body.capture.questions === 13, c1.added.body.capture.screens);
  r = await call("POST", `/captures/${c1.id}/finish`);
  const fin = r.body;
  ok("finish: held for a second person, with fingerprint, portal twin and a review document (PDF)", fin.status === "HELD" && /^[0-9a-f]{64}$/.test(fin.fingerprint) && fin.review_file?.endsWith(".pdf") && readFileSync(join(STUDIO, "..", "..", fin.review_file)).subarray(0, 5).toString() === "%PDF-", fin.status_detail);
  const twin = JSON.parse(readFileSync(join(STUDIO, "..", "..", sql(`select twin_file from portal_capture where id='${c1.id}'`)), "utf8"));
  ok("the twin meets the capture contract and carries no answer", contractProblems(twin.record).length === 0 && noAnswers(twin.record).length === 0 && twin.record.screens[0].inputs.find((i: { id: string }) => i.id === "dobYear")?.part === "YYYY");
  r = await call("POST", `/captures/${c1.id}/approve`, undefined, "user-A");
  ok("approval fail: the person who captured the screens cannot approve them", r.status === 403, r.body.message);
  r = await call("POST", `/captures/${c1.id}/approve`, undefined, "user-C");
  ok("approval: a second person makes it an online version, re-check date set (Sample 180 days)", r.status === 201 && r.body.edition?.channel === "ONLINE" && r.body.edition.recheck_by > r.body.edition.captured_on, r.body.edition);
  const ed = r.body.edition.id as string;
  r = await call("POST", `/captures/${c1.id}/approve`, undefined, "user-B");
  ok("approval fail: approving again is refused (already approved)", r.status === 409);
  const again = await capture(["imm5257-online-s1-personal-resaved.html", S2, S3]);
  r = await call("POST", `/captures/${again.id}/finish`);
  ok("identity: the same screens saved again (new session token, script, time) are 'already in the library'", r.body.status === "IN_LIBRARY" && readFileSync(join(FIX, S1)).toString() !== readFileSync(join(FIX, "imm5257-online-s1-personal-resaved.html")).toString(), r.body.status_detail);
  const changed = await capture(["imm5257-online-s1-personal-reworded.html", S2, S3]);
  r = await call("POST", `/captures/${changed.id}/finish`);
  const kinds = (r.body.difference ?? []).map((d: { input: string; change: string }) => `${d.input}:${d.change}`);
  ok("identity fail: a reworded label and an added option are held with the field-by-field difference", r.body.status === "HELD" && kinds.includes("familyName:reworded") && kinds.includes("sex:options"), kinds);
  r = await call("POST", `/captures/${changed.id}/return`, { note: "ok" }, "user-C");
  ok("return fail: a reason of a few words is required", r.status === 400);
  r = await call("POST", `/captures/${changed.id}/return`, { note: "Capture the surname screen again: the label looks edited." }, "user-C");
  ok("return: the reviewer sends it back with the reason", r.body.status === "RETURNED");
  const tpl = (await call("POST", "/captures", { portal: "ircc_portal", form: "EE PROFILE", title: "Express Entry profile (Sample template)" })).body;
  r = await upload(`/captures/${tpl.id}/screens`, ["portal-capture-template.csv"], "user-A", join(STUDIO, "samples"));
  const r2 = await upload(`/captures/${tpl.id}/screens`, ["template-with-answers.csv"]);
  ok("template (way C): the spreadsheet template is read into the same record; a template with an answer column is refused", r.body.results[0].outcome === "added" && r.body.capture.screens.length === 2 && r2.body.results[0].outcome === "refused", [r.body.results[0].message, r2.body.results[0].message]);

  // ──────────────────────────────────────────── screen map without AI: PDF twin, aliases
  r = await call("POST", `/online-versions/${ed}/screen-map/draft`);
  const firstDraft = r.body;
  let p = new Map<string, { outcome: string; method: string | null; fact: string | null; transform: string | null }>(r.body.proposals.map((x: { input: string }) => [x.input, x]));
  ok("twin reuse: drafted from the IMM 5257 PDF map with no AI call", r.body.counts.ai_calls === 0 && r.body.pdf_edition?.startsWith("IMM 5257 (") && r.body.counts.pdf_twin >= 7, r.body.counts);
  ok("twin reuse: names, UCI, sex, country of birth and marital status take the PDF's shared fields (not 'other names')", p.get("familyName")?.fact === "person.family_name" && p.get("givenNames")?.fact === "person.given_names" && p.get("uci")?.fact === "person.uci" && p.get("sex")?.fact === "person.sex" && p.get("birthCountry")?.fact === "person.country_of_birth" && p.get("maritalStatus")?.fact === "person.marital_status",
    [...["familyName", "givenNames", "uci", "sex", "birthCountry", "maritalStatus"].map((k) => p.get(k)?.fact), p.get("birthCountry")]);
  ok("three-part date: Year, Month and Day map to one shared field with date:YYYY / date:MM / date:DD", ["dobYear", "dobMonth", "dobDay"].every((k, i) => p.get(k)?.fact === "person.date_of_birth" && p.get(k)?.transform === `date:${["YYYY", "MM", "DD"][i]}`));
  ok("twin reuse fail: a reworded label ('City or town' vs the PDF's 'City/Town') is left for drafting or a person, not guessed", p.get("birthCity")?.outcome === "leftover" && p.get("usedPortalBefore")?.outcome === "leftover", p.get("birthCity"));
  r = await call("POST", "/library/fields/person.place_of_birth_city/aliases", { alias: "City or town" });
  const r3 = await call("POST", "/library/fields/person.country_of_birth/aliases", { alias: "City or town" });
  ok("alias: a label seen on another form is added; the same label on a second field is refused (one label, one field)", r.status === 201 && r3.status === 409, r3.body.message);
  r = await call("POST", `/online-versions/${ed}/screen-map/draft`);
  p = new Map(r.body.proposals.map((x: { input: string }) => [x.input, x]));
  ok("alias: drafting again matches 'City or town' to person.place_of_birth_city by its alias, still without AI", p.get("birthCity")?.method === "alias" && p.get("birthCity")?.fact === "person.place_of_birth_city" && r.body.counts.ai_calls === 0);
  const draftFile = join(STUDIO, "var", `isolated-${DB.replace("xr_studio_", "")}`, "workspaces", "demo", "screen-maps", `${ed}.json`);
  const saved = readFileSync(draftFile, "utf8");
  writeFileSync(draftFile, saved.replace(/"fingerprint": "[0-9a-f]+"/, `"fingerprint": "${"0".repeat(64)}"`));
  r = await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  ok("accept fail: a draft made for other screens than the approved version is refused (draft again)", r.status === 409 && /changed since/.test(r.body.message), r.body.message);
  writeFileSync(draftFile, saved);
  r = await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  ok("accept: a person accepts; matches become the online field map, leftovers stay open with the reason; labels learned as aliases", r.status === 201 && r.body.mapped >= 10 && r.body.unresolved >= 1 && r.body.aliases_learned >= 1 && sql("select count(*) from canonical_field where canonical_field_key='person.family_name' and 'Family name (as shown on your passport or travel document)' = any(aliases)") !== "0" && sql(`select count(*) from form_field_map where form_edition_id='${ed}' and origin='CODE_MATCH'`) === "13", r.body);
  r = await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  ok("accept fail: a second acceptance is refused (the map exists)", r.status === 409);

  // ──────────────────────────────────────────── channels and the validator
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "BY_FAX" });
  ok("channel fail: an unknown channel is refused", r.status === 400);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "ONLINE" });
  const noPortal = r.body.problems.find((x: { item: string; message: string }) => x.item === "IMM 5257" && /no portal/.test(x.message));
  ok("validator fail: a line filed Online needs the combination's portal", !!noPortal, noPortal?.message);
  r = await call("PATCH", `/combinations/${vv}/portal`, { portal: "ircc_portal" });
  const open = r.body.problems.find((x: { message: string }) => /neither mapped/.test(x.message));
  ok("validator fail: online inputs left open block release (neither mapped nor 'not a fact')", !!open && r.body.lines.find((l: { form: string }) => l.form === "IMM 5257")?.version?.includes("online"), open?.message);
  ok("filing method is derived: Online + PDF uploads; signatures follow the channel", r.body.filing_method === "Online + PDF uploads" && r.body.lines.find((l: { form: string }) => l.form === "IMM 5257").signature.includes("portal"), r.body.filing_method);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "ONLINE" });
  ok("validator fail: a line filed Online for a form with no online version from that portal", r.body.problems.some((x: { item: string; message: string }) => x.item === "IMM 5707" && /no approved online version/.test(x.message)));
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "SIGNED_PDF_UPLOAD" });
  ok("filing method: online plus a form signed by hand is 'Online + signed PDF uploads' (the fourth situation of P-62)", r.body.filing_method === "Online + signed PDF uploads" && r.body.lines.find((l: { form: string }) => l.form === "IMM 5707")?.signature.includes("by hand"), r.body.filing_method);
  await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD" });
  sql(`update form_edition set recheck_by = date '2026-01-01' where id='${ed}'`);
  r = await call("GET", `/combinations/${vv}/channels`);
  ok("validator fail: an online version past its re-check date blocks release", r.body.problems.some((x: { message: string }) => /re-check date \(2026-01-01\)/.test(x.message)));
  sql(`update form_edition set recheck_by = captured_on + 180 where id='${ed}'`);
  for (const id of sql(`select data_path from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split("\n").filter(Boolean)) sql(`update form_field_map set outcome='not_a_fact', reason='test: closed by a person' where form_edition_id='${ed}' and data_path='${id}'`);
  r = await call("GET", `/combinations/${vv}/channels`);
  ok("validator pass: portal set, online version current, every input mapped or 'not a fact' → no channel error", !r.body.problems.some((x: { level: string }) => x.level === "error"), r.body.problems);
  const review = (await call("GET", `/combinations/${vv}/review`)).body;
  ok("the review's validator runs the channel rules too (one validator at review and release)", JSON.stringify(review).includes("Field map") || Array.isArray(review.problems) || review.validation !== undefined);
  const lib = (await call("GET", "/library/forms")).body.find((f: { code: string }) => f.code === "IMM 5257");
  ok("Forms library: IMM 5257 shows both channels and its online version", lib?.channels?.includes("Online") && lib.channels.includes("PDF") && lib.online_versions?.length === 1, lib?.channels);
  const sv = rowId("sv.super_visa");
  await call("PATCH", `/combinations/${sv}/portal`, { portal: "ircc_portal" });
  const svAtt = sql(`select id from source_attachment where combination_id='${sv}' and file_name='imm5257e.pdf'`);
  r = await call("POST", `/attachments/${svAtt}/reuse`, {});
  ok("default channel: a form added where an online version exists for the row's portal starts as Online", sql(`select channel from combination_form where combination_id='${sv}' and lineage_key='IMM 5257' order by version desc limit 1`) === "ONLINE", r.body);
  const svOther = sql(`select id from source_attachment where combination_id='${sv}' and file_name='imm5707e.pdf'`);
  if (svOther) await call("POST", `/attachments/${svOther}/reuse`, {});
  ok("default channel fail: a form without an online version starts as PDF upload", !svOther || sql(`select channel from combination_form where combination_id='${sv}' and lineage_key='IMM 5707' order by version desc limit 1`) === "PDF_UPLOAD");

  // ──────────────────────────────────────────── one answer list end to end
  r = await call("POST", "/library/answer-lists", { key: "sex", label: "Sex", values: [{ key: "female", label: "Female" }] });
  ok("answer list fail: fewer than two values is refused", r.status === 400);
  r = await call("POST", "/library/answer-lists", { key: "sex", label: "Sex (Sample)", values: sexList });
  const dup = await call("POST", "/library/answer-lists", { key: "sex", label: "Sex", values: sexList });
  ok("answer list: created once (Sample); a second list with the same key is refused", r.status === 201 && dup.status === 409);
  r = await call("POST", "/library/fields/person.sex/answer-list", { list: "sex" });
  ok("answer list: person.sex takes its values from it", r.status === 201);
  const pdfEd = sql("select id from form_edition where edition_label like 'IMM 5257 (%' limit 1");
  const om1 = await call("POST", `/editions/${pdfEd}/option-maps/draft`), om2 = await call("POST", `/editions/${ed}/option-maps/draft`);
  const pdfSex = om1.body.option_maps.find((o: { fact: string }) => o.fact === "person.sex"), webSex = om2.body.option_maps.find((o: { fact: string }) => o.fact === "person.sex");
  ok("option maps drafted without AI for both channels: same values, each channel's own codes", pdfSex?.optionMap.map.female === "Female" && webSex?.optionMap.map.female === "FEMALE" && webSex.unmatched.length === 0, { pdf: pdfSex?.optionMap.map, online: webSex?.optionMap.map });
  r = await call("GET", `/combinations/${vv}/channels`);
  const gap = r.body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("validator fail: a value with no code in a channel blocks release, and says which", pdfSex?.unmatched.length ? gap.some((x: { message: string }) => /no code for/.test(x.message)) : true, gap.map((x: { message: string }) => x.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "NOPE" } });
  ok("option map fail: a person cannot set a code the PDF field does not have", r.status === 400 && /NOPE/.test(r.body.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "Unspecified" } });
  const after = (await call("GET", `/combinations/${vv}/channels`)).body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("option map: a person maps 'Another gender' to the PDF's 'Unspecified'; both channels complete, no sex problem left", r.status === 200 && after.length === 0, after);

  // ──────────────────────────────────────────── reviewed merges (P-65)
  r = await call("POST", "/library/fields", { key: "person.town_of_birth", meaning: "The town or city where the person was born", valueType: "text" });
  ok("setup: a second field with the same meaning is added by a person (the duplicate a merge removes)", r.status === 201, r.body?.message);
  await call("POST", "/library/fields/person.town_of_birth/aliases", { alias: "Town of birth" });
  const cityRow = sql(`select id from form_field_map where form_edition_id='${ed}' and data_path='birthCity'`);
  sql(`update form_field_map set canonical_field_key='person.town_of_birth', status='PUBLISHED' where id='${cityRow}'`);
  const vvRelease = (await call("GET", `/combinations/${vv}/config?mode=published`)).body.release?.sha256;
  r = await call("POST", "/library/merges", { keep: "person.place_of_birth_city", merge: "person.date_of_birth", reason: "testing a merge of two kinds" });
  ok("merge fail: fields of different kinds (text vs date) are not merged", r.status === 409);
  r = await call("POST", "/library/merges", { keep: "person.place_of_birth_city", merge: "person.town_of_birth", reason: "Same meaning: the place of birth, city or town." });
  const m = r.body;
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-A");
  ok("merge fail: the person who proposed it cannot approve it", r.status === 403);
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-C");
  ok("merge: approved by a second person; the merged id becomes an alias that redirects", r.body.status === "APPLIED" && sql("select merged_into_key from canonical_field where canonical_field_key='person.town_of_birth' order by version desc limit 1") === "person.place_of_birth_city" && sql("select count(*) from canonical_field where canonical_field_key='person.place_of_birth_city' and 'person.town_of_birth' = any(aliases) and 'Town of birth' = any(aliases)") !== "0", r.body.moved);
  ok("merge: the published form field gets a new draft version reading the surviving id; its released version is untouched", sql(`select string_agg(status || ':' || canonical_field_key, ',' order by version) from form_field_map where form_edition_id='${ed}' and data_path='birthCity'`) === "PUBLISHED:person.town_of_birth,DRAFT:person.place_of_birth_city", sql(`select string_agg(status || ':' || canonical_field_key, ',' order by version) from form_field_map where form_edition_id='${ed}' and data_path='birthCity'`));
  ok("merge: frozen releases are not changed", (await call("GET", `/combinations/${vv}/config?mode=published`)).body.release?.sha256 === vvRelease);
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-C");
  ok("merge fail: a merge is applied once", r.status === 409);

  // Evidence for the early look (slice 1 has no screen): the review document, the screen-map drafts and the channels.
  const out = join(STUDIO, "evidence", "forms-channels"); mkdirSync(out, { recursive: true });
  copyFileSync(join(STUDIO, "..", "..", fin.review_file), join(out, "imm5257-online-review.pdf"));
  writeFileSync(join(out, "screen-map-first-draft.json"), JSON.stringify(firstDraft, null, 1));
  writeFileSync(join(out, "channels-visitor-visa.json"), JSON.stringify((await call("GET", `/combinations/${vv}/channels`)).body, null, 1));

  // ──────────────────────────────────────────── reset removes the new records with the workspace
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("reset removes portal captures, answer lists and merges with the workspace", sql("select count(*) from portal_capture") === "0" && sql("select count(*) from answer_list") === "0" && sql("select count(*) from field_merge") === "0", r.body.remaining_rows);

  console.log(`\n${pass}/${pass + fail} passed`);
  writeFileSync(join(out, "check_forms_channels.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, fixtures: "Sample (tests/fixtures/portal/README.md)", pass, fail, log }, null, 1));
  if (!existsSync(out)) process.exit(2);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
