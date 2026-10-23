// F1 forms channels, slice 1 (forms lane; P-61, P-62, P-65, P-66): every rule with a passing and a failing case, on an
// isolated copy (its own database and files; the demo is never touched). No browser, NO model call (US$0): the IMM 5257
// PDF twin is the saved real AI draft of 21 Oct, replayed. The portal screens are Sample fixtures (tests/fixtures/portal).
//   zsh studio/tools/isolated.sh forms_f1 4450 start && tsx studio/tests/check_forms_channels.ts 4450 xr_studio_forms_f1
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contractProblems, difference, fingerprint, noAnswers, type CaptureRecord } from "../engine/capture.ts";
import { channelProblems, filingMethod } from "../engine/channels.ts";
import { codeForValue, draftOptionMap, optionMapProblems, pdfOptions } from "../engine/options.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { draftScreenMap, normLabel } from "../engine/twin.ts";

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
const PYTHON = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
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

  // CHECK fixes (23 Oct): engine rules the reviewer and breaker found missing, each with a pass and a fail.
  const twice = JSON.parse(JSON.stringify(r1)); twice.screens[0].inputs[1].id = "in0";
  ok("contract fail: an element id used twice in one capture is refused (each input has its own id)", contractProblems(twice).some((x) => /more than once/.test(x)) && contractProblems(r1).length === 0, contractProblems(twice));
  const minLen = JSON.parse(JSON.stringify(r1)); minLen.screens[0].inputs[0].min_length = 2;
  ok("fingerprint fail: a minimum length is a rule change (new fingerprint, listed in the difference)", fingerprint(minLen) !== fingerprint(r1) && difference(r1, minLen)[0]?.change === "rules");
  ok("labels: curly apostrophes, full-width letters and invisible spaces compare as people read them", normLabel("Mother\u2019s maiden name") === normLabel("Mother's maiden name") && normLabel("\uFF26amily\u200B name") === normLabel("Family name") && normLabel("Place of birth › City") === normLabel("Place of birth City"));
  ok("fill fail: 'toString' or 'constructor' is not a code in an option map", codeForValue("toString", { map: { female: "F" }, unused: [], codes: ["F"] }, []) === null && codeForValue("constructor", { map: {}, unused: [], codes: [] }, []) === null);
  const marital = pdfOptions({}, "code_list:imm5707.marital_status_family (Common-law=1, Single=2, Divorced=3, Annulled marriage=4, Married=5, Legally separated=6, Widowed=7, Unknown=8; this list has no Conjugal option)");
  ok("PDF codes: a form field with no resolved options takes its codes from its field map's code list (the filler's own source)", marital.length === 8 && marital.find((o) => o.label === "Married")?.code === "5" && marital.find((o) => o.label === "Unknown")?.code === "8" && pdfOptions({}, "as_is").length === 0, marital);
  const snap = (forms: unknown[], maps: unknown[] = []) => ({ combination: { portal: "ircc_portal" }, forms, field_maps: maps, canonical_fields: [] }) as unknown as Snapshot;
  ok("validator fail: a PDF line for a form the library has only online has nothing to fill", channelProblems(snap([{ form_number: "IMM 7200", online_only: true }])).some((x) => x.level === "error" && /only its online version/.test(x.message)) && !channelProblems(snap([{ form_number: "IMM 5257" }])).length);
  ok("validator: an approved online version with no screen map yet says so (not 'no approved online version')", channelProblems(snap([{ form_number: "IMM 5257", channel: "ONLINE", online_versions: 1 }]))[0]?.message.includes("no screen map yet") && channelProblems(snap([{ form_number: "IMM 5257", channel: "ONLINE", online_versions: 0 }]))[0]?.message.includes("no approved online version"));
  const screen = (title: string, inputs: { id: string; label: string; group?: string; type?: string }[]): CaptureRecord => ({ ...r1, screens: [{ ...r1.screens[0], title, inputs: inputs.map((x, n) => ({ type: "text", required: false, order: n + 1, ...x })) }] });
  const pdfFam = (person: string) => ({ data_path: `f.${person}`, caption: "Family name", heading: null, fact: "person.family_name", transform: "as_is", person, outcome: "mapped" });
  const libFields = [{ key: "person.family_name", valueType: "text", aliases: [], mergedIntoKey: null }, { key: "person.country_of_birth", valueType: "country", aliases: ["Country or territory"], mergedIntoKey: null }, { key: "person.place_of_birth_city", valueType: "text", aliases: ["City or town"], mergedIntoKey: null }];
  const spouse = draftScreenMap(screen("Your spouse or common-law partner", [{ id: "sFam", label: "Family name" }]), { pdf: [pdfFam("form_subject")], pdfEdition: "PDF", previous: new Map(), library: libFields }).proposals[0];
  const spouse2 = draftScreenMap(screen("Your spouse or common-law partner", [{ id: "sFam", label: "Family name" }]), { pdf: [pdfFam("form_subject"), pdfFam("subject_spouse_or_partner")], pdfEdition: "PDF", previous: new Map(), library: libFields }).proposals[0];
  ok("screen map fail: a spouse screen never takes the applicant's form fields; with the spouse's own it maps for the spouse", spouse.outcome === "leftover" && spouse2.outcome === "mapped" && spouse2.person === "subject_spouse_or_partner", [spouse.why, spouse2.person]);
  const alias = (group: string, label: string) => draftScreenMap(screen("Personal details", [{ id: "x", group, label, type: group.includes("ountry") ? "select" : "text" }]), { pdf: [], pdfEdition: null, previous: new Map(), library: libFields }).proposals[0];
  ok("alias fail: a bare label under another group ('Current country of residence › Country or territory') is not the country of birth; under its own group it matches", alias("Current country of residence", "Country or territory").outcome === "leftover" && alias("Country of citizenship", "Country or territory").outcome === "leftover" && alias("Place of birth", "City or town").fact === "person.place_of_birth_city", [alias("Current country of residence", "Country or territory").why]);

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
  const kinds14 = readdirSync(OFFICIAL, { recursive: true }).map(String).filter((f) => /\.html?$/.test(f)).map((f) => JSON.parse(execFileSync(PYTHON, ["-I", join(STUDIO, "tools", "read_form_identity.py"), join(OFFICIAL, f)], { encoding: "utf8" }).trim().split("\n").pop()!).kind as string);
  ok("intake pass: every IRCC public page in the official library still reads as a guide or checklist (none as a portal screen)", kinds14.length >= 10 && kinds14.every((k) => k === "guide" || k === "checklist"), kinds14);
  const fd1 = new FormData(); fd1.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, "intake-one-question-answered.html")))]), "intake-one-question-answered.html"); fd1.append("combinationId", vv);
  const one = (await (await fetch(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd1 })).json()).results[0];
  ok("intake fail: a saved portal screen with one answered question is refused too, and not stored", one.outcome === "refused" && sql("select count(*) from source_attachment where file_name='intake-one-question-answered.html'") === "0" && sql("select coalesce(max(stored_path),'') from intake_item where file_name='intake-one-question-answered.html'") === "", one.message);

  // ──────────────────────────────────────────── captures: refusal, contract, second person, identity
  r = await call("POST", "/captures", { portal: "nowhere", form: "imm 5257", title: "x" });
  ok("capture fail: an unknown portal, a lower-case code and a short title are refused with field errors", r.status === 400 && r.body.errors?.length === 3, r.body.errors?.map((e: { field: string }) => e.field));
  const bad = await capture(["imm5257-online-s1-personal-with-answers.html"]);
  ok("capture fail: a screen with a typed name and a chosen option is refused and nothing of it is kept", bad.added.body.results[0].outcome === "refused" && bad.added.body.capture.questions === 0 && /holds an answer/.test(bad.added.body.results[0].message) && !readdirSync(join(STUDIO, "var", `isolated-${DB.replace("xr_studio_", "")}`, "workspaces", "demo", "capture-reading")).length, bad.added.body.results[0].message);
  ok("no file of a capture is kept on disk, refused or added (only checksums and structure)", !JSON.stringify(sql("select files from portal_capture")).includes("SAMPLE-PERSON") && !sql("select record::text from portal_capture").includes("SAMPLE-PERSON"));
  const c1 = await capture([S1, S2, S3]);
  ok("capture: three blank screens read in order, 13 questions, no values", c1.added.body.results.every((x: { outcome: string }) => x.outcome === "added") && c1.added.body.capture.questions === 13, c1.added.body.capture.screens);
  const t0 = Date.now();
  r = await call("POST", `/captures/${c1.id}/finish`);
  const answered = Date.now() - t0;
  const fin = r.body;
  ok("finish answers before the review document is printed (printed in the background; HTML until the PDF exists)", fin.status === "HELD" && fin.review_file?.endsWith(".html"), { ms: answered, review_file: fin.review_file });
  await until(async () => ((await call("GET", `/captures/${c1.id}`)).body.review_file ?? "").endsWith(".pdf"), 180_000);
  fin.review_file = (await call("GET", `/captures/${c1.id}`)).body.review_file;
  const dl = await fetch(`http://localhost:${PORT}/api/captures/${c1.id}/review`);
  ok("review document: downloaded through the API as a PDF", dl.status === 200 && Buffer.from(await dl.arrayBuffer()).subarray(0, 5).toString() === "%PDF-", dl.status);
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
  ok("return: the reviewer sends it back with the reason and the next step", r.body.status === "RETURNED" && /Remove the screens/.test(r.body.next));
  r = await call("DELETE", `/captures/${changed.id}/screens/9`);
  ok("remove fail: a screen the capture does not have", r.status === 404, r.body.message);
  for (const n of [3, 2, 1]) r = await call("DELETE", `/captures/${changed.id}/screens/${n}`);
  r = await upload(`/captures/${changed.id}/screens`, [S1, S2, S3]);
  const refinished = await call("POST", `/captures/${changed.id}/finish`);
  ok("a returned capture is fixed: the edited screens removed, the right ones added; finish finds them already in the library", r.body.capture.questions === 13 && refinished.body.status === "IN_LIBRARY", refinished.body.status_detail);
  const gone = await capture([S2]);
  r = await call("POST", `/captures/${gone.id}/abandon`, { note: "Started on the wrong form." });
  const late = await upload(`/captures/${gone.id}/screens`, [S3]);
  ok("abandon: a capture given up stays for the audit and takes no more screens", r.body.status === "ABANDONED" && late.status === 409, late.body.message);
  const tpl = (await call("POST", "/captures", { portal: "ircc_portal", form: "EE PROFILE", title: "Express Entry profile (Sample template)" })).body;
  r = await upload(`/captures/${tpl.id}/screens`, ["portal-capture-template.csv"], "user-A", join(STUDIO, "samples"));
  const r2 = await upload(`/captures/${tpl.id}/screens`, ["template-with-answers.csv"]);
  ok("template (way C): the spreadsheet template is read into the same record; a template with an answer column is refused", r.body.results[0].outcome === "added" && r.body.capture.screens.length === 2 && r2.body.results[0].outcome === "refused", [r.body.results[0].message, r2.body.results[0].message]);

  // ──────────────────────────────────────────── CHECK fixes: hostile pages, form codes, concurrency (review 4–6, break M1–M4, M9)
  const hostile = (await call("POST", "/captures", { portal: "ircc_portal", form: "TEST HOSTILE", title: "Hostile pages (Sample)" })).body;
  const hs = ["hostile-contenteditable.html", "hostile-aria-checked.html", "hostile-aria-unread.html", "hostile-label-answer.html", "hostile-option-passport.html", "hostile-title-identifier.html"];
  r = await upload(`/captures/${hostile.id}/screens`, hs);
  ok("reader fail: an answer in an editable area, a ticked custom control, an unreadable custom control, a label, an option label or the title is refused; nothing kept", r.body.results.every((x: { outcome: string }) => x.outcome === "refused") && r.body.capture.questions === 0 && !sql(`select record::text || files::text from portal_capture where id='${hostile.id}'`).includes("SAMPLE"), r.body.results.map((x: { message: string }) => x.message.slice(0, 90)));
  r = await upload(`/captures/${hostile.id}/screens`, ["blank-placeholder-selected.html"]);
  ok("reader pass: a selected 'Please select…' placeholder is not an answer, and a form named 'research-programme' is not a search form", r.body.results[0].outcome === "added" && r.body.capture.questions === 2, r.body.results[0].message);
  r = await call("POST", "/captures", { portal: "ircc_portal", form: "IMM-5257", title: "Visitor visa (spelled with a hyphen)" });
  const r7 = await call("POST", "/captures", { portal: "ircc_portal", form: "IMM  5257", title: "Visitor visa (two spaces)" });
  ok("form code: 'IMM-5257' and 'IMM  5257' are the library's IMM 5257, never a second form", r.body.form === "IMM 5257" && r7.body.form === "IMM 5257", [r.body.form, r7.body.form]);
  const race = (await call("POST", "/captures", { portal: "ircc_portal", form: "TEST RACE", title: "Concurrency (Sample)" })).body;
  const [ra, rb] = await Promise.all([upload(`/captures/${race.id}/screens`, [S2]), upload(`/captures/${race.id}/screens`, [S3])]);
  const said = [ra, rb].filter((x) => x.body.results?.[0]?.outcome === "added").length;
  ok("concurrency: two screens added at the same moment are both kept, or one is refused with 409; never 'added' and lost", Number(sql(`select jsonb_array_length(record->'screens') from portal_capture where id='${race.id}'`)) === said && said >= 1 && [ra, rb].every((x) => x.status === 201 || x.status === 409), [ra.status, rb.status, said]);
  if (said < 2) await upload(`/captures/${race.id}/screens`, [ra.body.results?.[0]?.outcome === "added" ? S3 : S2]);
  const [add, fin2] = await Promise.all([upload(`/captures/${race.id}/screens`, [S1]), call("POST", `/captures/${race.id}/finish`)]);
  const stored = Number(sql(`select jsonb_array_length(record->'screens') from portal_capture where id='${race.id}'`));
  ok("concurrency: a screen added while the capture is finished is kept or refused, never lost (the held version has what was said)", stored === 2 + (add.status === 201 && add.body.results?.[0]?.outcome === "added" ? 1 : 0) && (fin2.status === 201 || fin2.status === 409), [add.status, fin2.status, stored]);
  if (sql(`select status from portal_capture where id='${race.id}'`) === "OPEN") await call("POST", `/captures/${race.id}/finish`);
  const [ap, rt] = await Promise.all([call("POST", `/captures/${race.id}/approve`, undefined, "user-B"), call("POST", `/captures/${race.id}/return`, { note: "Returned at the same moment as an approval." }, "user-C")]);
  const final = sql(`select status || ':' || (form_edition_id is not null) from portal_capture where id='${race.id}'`);
  ok("concurrency fail: an approval and a return at the same moment cannot both succeed (one 409); the record agrees with the library", [ap.status, rt.status].filter((x) => x === 201).length === 1 && [ap.status, rt.status].includes(409) && (final === "APPROVED:true" || final === "RETURNED:false"), [ap.status, rt.status, final]);
  r = await call("GET", "/captures?take=2");
  ok("captures list: a page at a time, without each capture's full difference", r.body.length === 2 && r.body.every((x: { difference?: unknown; differences: number }) => x.difference === undefined && typeof x.differences === "number"));

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
  ok("accept: a person accepts; matches become the online field map, leftovers stay open with the reason; labels learned as aliases", r.status === 201 && r.body.mapped >= 10 && r.body.unresolved >= 1 && r.body.aliases_learned >= 1 && sql("select count(*) from canonical_field where canonical_field_key='person.family_name' and 'Full name › Family name (as shown on your passport or travel document)' = any(aliases)") !== "0" && sql(`select count(*) from form_field_map where form_edition_id='${ed}' and origin='CODE_MATCH'`) === "13", r.body);
  ok("accept: label matches are medium confidence, never 'exact'; learned labels keep their group ('Place of birth › Country or territory')", sql(`select count(*) from form_field_map where form_edition_id='${ed}' and confidence='exact'`) === "0" && sql("select count(*) from canonical_field where 'Country or territory' = any(aliases)") === "0" && sql("select count(*) from canonical_field where canonical_field_key='person.country_of_birth' and exists (select 1 from unnest(aliases) a where a like '% › Country or territory')") !== "0", sql("select string_agg(a, ' | ') from canonical_field, unnest(aliases) a where canonical_field_key='person.country_of_birth'"));
  r = await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  ok("accept fail: a second acceptance is refused (the map exists)", r.status === 409);
  // A person maps what the drafting left open (review 2: there was no way but SQL).
  const leftovers = sql(`select data_path from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split("\n").filter(Boolean);
  r = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: "dobYear", fact: "person.family_name" }, "user-C");
  const r4 = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: leftovers[0], fact: "person.sex", notAFact: true, reason: "both at once" }, "user-C");
  const r5 = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: "nowhere", notAFact: true, reason: "not on the screens" }, "user-C");
  ok("map input fail: a date part cannot take a text field; mapped and 'not a fact' at once is refused; an unknown input is not found", r.status === 400 && /date part/.test(r.body.message) && r4.status === 400 && r5.status === 404, [r.body.message, r4.body.detail, r5.body.message]);

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
  sql(`update form_edition set recheck_by = date '2026-01-01' where id='${ed}'`); // the date passes (time travel; no endpoint moves a date back)
  r = await call("GET", `/combinations/${vv}/channels`);
  ok("validator fail: an online version past its re-check date blocks release", r.body.problems.some((x: { message: string }) => /re-check date \(2026-01-01\)/.test(x.message)));
  const review = (await call("GET", `/combinations/${vv}/review`)).body;
  ok("the review's validator runs the channel rules (the re-check error is among the draft's problems at review and release)", review.draft.problems.some((x: { level: string; message: string }) => x.level === "error" && /re-check date \(2026-01-01\)/.test(x.message)), review.draft.problems.length);
  r = await call("POST", `/captures/${again.id}/confirm`, undefined, "user-A");
  ok("confirm fail: the person who captured the screens again cannot confirm them unchanged", r.status === 403);
  r = await call("POST", `/captures/${again.id}/confirm`, undefined, "user-C");
  const r6 = await call("POST", `/captures/${again.id}/confirm`, undefined, "user-B");
  ok("confirm: a second person confirms the identical re-capture; the re-check date runs from it, once", r.status === 201 && r.body.edition.recheck_by > "2026-01-01" && r6.status === 409 && !(await call("GET", `/combinations/${vv}/channels`)).body.problems.some((x: { message: string }) => /re-check/.test(x.message)), r.body.edition);
  for (const id of leftovers) r = await call("PATCH", `/online-versions/${ed}/screen-map`, { input: id, notAFact: true, reason: "Asked only by the portal (test: closed by a person)" }, "user-C");
  ok("map input: a person marks each open input 'not a fact' with the reason (a new draft version, origin HUMAN)", r.status === 200 && sql(`select count(*) from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`) === "0" && sql(`select count(*) from form_field_map where form_edition_id='${ed}' and origin='HUMAN'`) === String(leftovers.length), leftovers);
  r = await call("GET", `/combinations/${vv}/channels`);
  ok("validator pass: portal set, online version current, every input mapped or 'not a fact' → no channel error", !r.body.problems.some((x: { level: string }) => x.level === "error"), r.body.problems);
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
  const twinLabels = await call("POST", "/library/answer-lists", { key: "sex_twins", label: "Sex", values: [{ key: "female", label: "Female" }, { key: "female_2", label: "female" }] });
  ok("answer list: created once (Sample); a second list with the same key, or two values with one label, is refused", r.status === 201 && dup.status === 409 && twinLabels.status === 400);
  r = await call("POST", "/library/fields/person.sex/answer-list", { list: "sex" });
  ok("answer list: person.sex takes its values from it", r.status === 201);
  const pdfEd = sql("select id from form_edition where edition_label like 'IMM 5257 (%' limit 1");
  const om1 = await call("POST", `/editions/${pdfEd}/option-maps/draft`), om2 = await call("POST", `/editions/${ed}/option-maps/draft`);
  const pdfSex = om1.body.option_maps.find((o: { fact: string }) => o.fact === "person.sex"), webSex = om2.body.option_maps.find((o: { fact: string }) => o.fact === "person.sex");
  ok("option maps drafted without AI for both channels: same values, each channel's own codes", pdfSex?.optionMap.map.female === "Female" && webSex?.optionMap.map.female === "FEMALE" && webSex.unmatched.length === 0, { pdf: pdfSex?.optionMap.map, online: webSex?.optionMap.map });
  await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male" }, unused: ["Unknown", "Unspecified"] });
  r = await call("GET", `/combinations/${vv}/channels`);
  const gap = r.body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("validator fail: a value with no code in a channel blocks release, and says which", gap.some((x: { level: string; message: string }) => x.level === "error" && /no code for "another_gender", "unknown"/.test(x.message)), gap.map((x: { message: string }) => x.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "NOPE" } });
  ok("option map fail: a person cannot set a code the PDF field does not have", r.status === 400 && /NOPE/.test(r.body.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "Unspecified" } });
  const after = (await call("GET", `/combinations/${vv}/channels`)).body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("option map: a person maps 'Another gender' to the PDF's 'Unspecified'; both channels complete, no sex problem left", r.status === 200 && after.length === 0, after);

  // An answer list on a field whose PDF form fields keep their codes in the code list (review 1: release blocked for good).
  r = await call("POST", "/library/fields/person.family_name/answer-list", { list: "sex" });
  ok("answer list fail: a free-text field is not turned into a choice field", r.status === 400 && /free text/.test(r.body.message), r.body.message);
  await call("POST", "/library/answer-lists", { key: "marital_status", label: "Marital status (Sample)", values: [["married", "Married"], ["single", "Single"], ["common_law", "Common-law"], ["divorced", "Divorced"], ["separated", "Legally separated"], ["widowed", "Widowed"], ["annulled", "Annulled marriage"], ["unknown", "Unknown"]].map(([key, label]) => ({ key, label })) });
  r = await call("POST", "/library/fields/person.marital_status/answer-list", { list: "marital_status" });
  const ed5707 = sql("select id from form_edition where edition_label like 'IMM 5707 (%' limit 1");
  const om5707 = (await call("POST", `/editions/${ed5707}/option-maps/draft`)).body.option_maps.filter((o: { fact: string }) => o.fact === "person.marital_status");
  ok("PDF option maps: IMM 5707's marital status form fields take their codes from their code lists (Married = 5), drafted without AI", om5707.length >= 1 && om5707.every((o: { optionMap: { map: Record<string, string> } }) => o.optionMap.map.married === "5" && o.optionMap.map.single === "2"), om5707.map((o: { form_field: string; optionMap: unknown }) => o.optionMap));
  // The filler through the API (review 11): a form field on an answer list writes its option map's code; a value the
  // map lacks goes to "by hand", never guessed; a line filed Online is never filled as a PDF.
  const ed1295 = sql("select id from form_edition where edition_label like 'IMM 1295 (%' limit 1");
  const om1295 = (await call("POST", `/editions/${ed1295}/option-maps/draft`)).body.option_maps.find((o: { fact: string }) => o.fact === "person.marital_status");
  const box1295 = "form1[0].Page1[0].MaritalStatus[0].SectionA[0].MaritalStatus[0]";
  const filled = async () => (await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" })).body.boxes?.find((x: { box: string }) => x.box === box1295);
  const w1 = await filled();
  await call("PATCH", `/editions/${ed1295}/option-maps`, { dataPath: om1295.form_field, map: { single: "02" }, unused: om1295.optionMap.codes.filter((c: string) => c !== "02") });
  const w2 = await filled();
  ok("fill (API): 'married' is written as IMM 1295's own code 01 from the option map; without 'married' in the map it goes to 'by hand'", om1295?.optionMap.map.married === "01" && w1?.result === "written" && w1.written === "01" && w2?.result === "by hand" && /option map/.test(w2.why), [w1?.result, w1?.written, w2?.result, w2?.why]);
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "ONLINE" });
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" });
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "PDF_UPLOAD" });
  ok("fill fail: a line filed Online is not filled as a PDF, even though the library has the PDF", r.status === 409 && /filed Online/.test(r.body.message), r.body.message);
  r = await call("DELETE", "/library/fields/person.marital_status/answer-list");
  const unl = (await call("GET", `/combinations/${vv}/channels`)).body.problems.filter((x: { message: string }) => /marital_status/.test(x.message));
  ok("answer list: a list linked by mistake can be taken off; no option-map problem is left for that field", r.status === 200 && r.body.answer_list === null && unl.length === 0, unl);

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
  r = await call("PATCH", "/library/fields/person.town_of_birth", { meaning: "Edited after the merge, to bring it back" });
  const r8 = await call("POST", "/library/fields/person.town_of_birth/aliases", { alias: "Birth town" });
  ok("merge fail: a merged-away field is not edited back to a draft and takes no new label (it only redirects)", r.status === 409 && r8.status === 409, [r.body.message, r8.body.message]);
  // Chains, cycles and forks (break M5): one pending merge per field, and every merge checked again when approved.
  for (const k of ["x", "y", "z"]) await call("POST", "/library/fields", { key: `case.test_merge_${k}`, meaning: `A test field ${k} for the merge checks`, valueType: "text" });
  const xy = (await call("POST", "/library/merges", { keep: "case.test_merge_y", merge: "case.test_merge_x", reason: "Test: x means the same as y." })).body;
  r = await call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_y", reason: "Test: y means the same as z." });
  const r9 = await call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_x", reason: "Test: x means the same as z." });
  ok("merge fail: a field already waiting in a merge cannot enter a second one (no chain, cycle or fork)", r.status === 409 && r9.status === 409, [r.body.message, r9.body.message]);
  sql("update canonical_field set status='RETIRED' where canonical_field_key='case.test_merge_y'"); // retired by another path after the proposal
  r = await call("POST", `/library/merges/${xy.id}/approve`, {}, "user-C");
  ok("merge fail: checked again when approved; a field retired since the proposal stops it and nothing moves", r.status === 409 && /retired/.test(r.body.message) && sql(`select status from field_merge where id='${xy.id}'`) === "PROPOSED" && sql("select coalesce(max(merged_into_key),'') from canonical_field where canonical_field_key='case.test_merge_x'") === "", r.body.message);
  await call("POST", `/library/merges/${xy.id}/reject`, { note: "y was retired" }, "user-C");
  const [p1, p2] = await Promise.all([1, 2].map(() => call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_x", reason: "Test: proposed twice at once." })));
  ok("merge fail: the same merge proposed twice at the same moment is stored once", [p1.status, p2.status].sort().join() === "201,409" && sql("select count(*) from field_merge where merge_key='case.test_merge_x' and status='PROPOSED'") === "1", [p1.status, p2.status]);
  // Aliases: one label, one field, however it is written; all of several added at once are kept (break m8, m9).
  await call("POST", "/library/fields/person.family_name/aliases", { alias: "Mother's maiden name" });
  r = await call("POST", "/library/fields/person.given_names/aliases", { alias: "Mother\u2019s maiden name" });
  const r10 = await call("POST", "/library/fields/person.given_names/aliases", { alias: "??" });
  ok("alias fail: a curly-apostrophe twin of another field's label, and a label of punctuation only, are refused", r.status === 409 && r10.status === 400, [r.body.message, r10.body.message]);
  const many = await Promise.all(["Alias one", "Alias two", "Alias three", "Alias four", "Alias five"].map((alias) => call("POST", "/library/fields/case.test_merge_z/aliases", { alias })));
  ok("aliases added at the same moment are all kept", many.every((x) => x.status === 201) && sql("select cardinality(aliases) from canonical_field where canonical_field_key='case.test_merge_z' order by version desc limit 1") === "5", many.map((x) => x.status));

  // Duplicate element ids (review 5, break M3): the same screen twice is a duplicate; a spouse screen reusing the
  // applicant's ids keeps them qualified by its screen, and the online version's screen map can then be accepted.
  const dupe = (await call("POST", "/captures", { portal: "apr_portal", form: "IMM 5257", title: "Visitor visa, through the representative portal" })).body;
  r = await upload(`/captures/${dupe.id}/screens`, [S1, "imm5257-online-s4-spouse.html"]);
  const again2 = await upload(`/captures/${dupe.id}/screens`, ["imm5257-online-s1-personal-resaved.html"]);
  const dupeRec = (await call("GET", `/captures/${dupe.id}`)).body.record;
  const spouseIds = dupeRec.screens[1].inputs.map((i: { id: string }) => i.id);
  ok("duplicate ids: the same screen saved again is a duplicate; a spouse screen's reused ids are qualified by its screen", again2.body.results[0].outcome === "duplicate" && spouseIds.every((i: string) => i.endsWith("@your-spouse-or-common-law-partner")), [again2.body.results[0].message, spouseIds]);
  await call("POST", `/captures/${dupe.id}/finish`);
  r = await call("POST", `/captures/${dupe.id}/approve`, undefined, "user-B");
  const edApr = r.body.edition.id;
  const dr = (await call("POST", `/online-versions/${edApr}/screen-map/draft`)).body;
  const spouseMapped = dr.proposals.filter((x: { screen_order: number; outcome: string; person: string }) => x.screen_order === 2 && x.outcome === "mapped");
  r = await call("POST", `/online-versions/${edApr}/screen-map/accept`, {}, "user-C");
  ok("duplicate ids pass: the screen map is accepted; the spouse screen never takes the applicant's form fields", r.status === 201 && spouseMapped.every((x: { person: string }) => x.person !== "form_subject"), { accept: r.status, spouse: spouseMapped.map((x: { input: string; fact: string; person: string }) => `${x.input}:${x.fact}:${x.person}`) });

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
