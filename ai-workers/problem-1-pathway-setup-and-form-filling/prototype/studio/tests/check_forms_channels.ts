// F1 forms channels (forms lane; P-61, P-65, P-107) after W1-02 (P-102: the browser extension is parked, forms come in
// only as PDFs): every rule with a passing and a failing case, on an isolated copy (its own database and files; the demo
// is never touched). No browser, NO model call (US$0): the IMM 5257 PDF field map is the saved real AI draft of 21 Oct,
// replayed. The two saved portal screens are Sample fixtures (tests/fixtures/intake), refused by the intake.
//   zsh studio/tools/isolated.sh forms_f1 4450 start && tsx studio/tests/check_forms_channels.ts 4450 xr_studio_forms_f1
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { acceptedFor, allowedChannels, channelProblems, filingKind, filingMethod, fingerprintLine, lineOf, notNeededWords, type AcceptRecord } from "../engine/channels.ts";
import { diff, validate } from "../engine/validate.ts";
import { oathMappedProblems } from "../engine/form-steps.ts";
import { channelProposal } from "../api/src/filing.ts";
import { SetChannel, signatureFits, signatureMisfitWords, throughAccount } from "../contracts/forms.ts";
import { AcceptsBody } from "../contracts/form-library.ts";
import { codeForValue, draftOptionMap, optionMapProblems, pdfOptions } from "../engine/options.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { normLabel } from "../engine/twin.ts";
import { seedAnswerList, seedField } from "./seed_library.cjs";
import { acceptCleanOneByOne } from "./lib/accept-draft.ts";

const PORT = Number(process.argv[2] ?? 4450), DB = process.argv[3] ?? "xr_studio_forms_f1";
const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures", "intake");
const OFFICIAL = join(STUDIO, "..", "..", "official-sources", "ircc");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 220)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
/** fetch, sent again once when the kept-alive connection was already closed before any reply (EPIPE, reset): under heavy
 *  machine load the server closes an idle connection while a slow step runs, and the next request finds it closed. */
const send = async (url: string, init: RequestInit = {}): Promise<Response> => {
  try { return await fetch(url, init); } catch (e) {
    const code = (e as { cause?: { code?: string } }).cause?.code ?? "";
    if (!/EPIPE|ECONNRESET|UND_ERR_SOCKET/.test(code)) throw e;
    return fetch(url, init);
  }
};
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await send(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
const rowId = (k: string) => sql(`select id from combination where combination_key='${k}'`);
const PYTHON = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const intake = async (file: string, combinationId: string) => {
  const fd = new FormData(); fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, file)))]), file); fd.append("combinationId", combinationId);
  return (await (await send(`http://localhost:${PORT}/api/intake`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd })).json()).results[0];
};

(async () => {
  // ──────────────────────────────────────────── engine (no server)
  ok("C3.5: labels compare as people read them", normLabel("*Family name (as shown on your passport)") === normLabel("Family name") && normLabel("* City/Town") !== normLabel("City or town"));
  ok("C3.5: labels: curly apostrophes, full-width letters and invisible spaces compare as people read them", normLabel("Mother’s maiden name") === normLabel("Mother's maiden name") && normLabel("Ｆamily​ name") === normLabel("Family name") && normLabel("Place of birth › City") === normLabel("Place of birth City"));
  ok("C1.6: filing method: PDF only · Online only · mixed, worked out from the lines (a hand-signed PDF upload is a PDF upload)",
    filingMethod([{ form_number: "A" }]) === "PDF only" && filingMethod([{ form_number: "A", channel: "ONLINE" }]) === "Online only"
    && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B" }]) === "Online + PDF uploads"
    && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "PDF_UPLOAD", signature: "HAND_SCANNED" }]) === "Online + PDF uploads");
  const snap = (forms: unknown[]) => ({ combination: {}, forms, field_maps: [], canonical_fields: [] }) as unknown as Snapshot;
  // ──────────────────────────────────────────── W1-10 slice 1: four channels and a signature value (P-143), engine
  ok("C1.6 C-7: filing method: Paper only · Online + paper forms · Not needed lines left out · nothing to file",
    filingMethod([{ form_number: "A", channel: "PAPER" }]) === "Paper only" && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "PAPER" }]) === "Online + paper forms"
    && filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "NOT_NEEDED" }]) === "Online only" && /^Nothing to file/.test(filingMethod([{ form_number: "A", channel: "NOT_NEEDED" }])),
    [filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "PAPER" }])]);
  ok("C1.6 C-7: filing kind: Paper only; Not needed is not filed; Online + PDF is mixed", filingKind([{ form_number: "A", channel: "PAPER" }]) === "Paper only" && filingKind([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "NOT_NEEDED" }]) === "Online only" && filingKind([{ form_number: "A", channel: "ONLINE" }, { form_number: "B" }]) === "Mixed: online and PDF");
  ok("C1.6 C-2 pass: the signatures that fit: Paper in pen, PDF upload signed by hand and scanned, Online typed or none, Not needed none",
    signatureFits("PAPER", "PEN") && signatureFits("PDF_UPLOAD", "HAND_SCANNED") && signatureFits("ONLINE", "TYPED_NAME") && signatureFits("ONLINE", "NONE") && signatureFits("NOT_NEEDED", "NONE"));
  ok("C1.6 C-2 fail: pen only on Paper, hand-scanned only on a PDF upload, Paper never unsigned, Not needed never signed",
    !signatureFits("PDF_UPLOAD", "PEN") && !signatureFits("ONLINE", "HAND_SCANNED") && !signatureFits("PAPER", "NONE") && !signatureFits("NOT_NEEDED", "TYPED_NAME") && !signatureFits("ONLINE", "PEN"));
  const misfit = channelProblems(snap([{ form_number: "IMM 5257", channel: "PAPER", signature: "NONE" }]));
  ok("C1.6 C-2 fail: at release a Paper line with no signature is an error in words", misfit.some((x) => x.level === "error" && /does not fit a line filed as Paper/.test(x.message)), misfit);
  // Break m6: every refusal in words, and the account read as a sentence.
  const m6sig = SetChannel.safeParse({ channel: "PAPER", signature: "PEN", fromSignature: "X" }), m6sigOk = SetChannel.safeParse({ channel: "PAPER", signature: "PEN", fromSignature: "NONE" });
  ok("C1.6 m6 fail: a signature it was changed from that is not one of the four is refused in words", !m6sig.success && /^Say which signature you changed it from/.test(m6sig.error.issues[0].message), m6sig.success ? null : m6sig.error.issues[0].message);
  ok("C1.6 m6 pass: a known signature it was changed from is accepted", m6sigOk.success);
  const m6q = AcceptsBody.safeParse({ account: "ANY", channels: ["PAPER"], quote: "x".repeat(401) }), m6qOk = AcceptsBody.safeParse({ account: "ANY", channels: ["PAPER"], quote: "x".repeat(400) });
  ok("C11.18 m6 fail: a canada.ca line of 401 characters is refused in words", !m6q.success && /at most 400 characters/.test(m6q.error.issues[0].message), m6q.success ? null : m6q.error.issues[0].message);
  ok("C11.18 m6 pass: a canada.ca line of 400 characters is accepted", m6qOk.success);
  ok("C1.6 m6 pass: the words read as sentences: \"An Online line\", \"on paper, with no IRCC account\", \"paper filing (no IRCC account) asks it\"",
    /\. An Online line is/.test(signatureMisfitWords("IMM 5257", "ONLINE", "PEN")) && /\. A Paper line is/.test(signatureMisfitWords("IMM 5257", "PAPER", "NONE"))
    && throughAccount("PAPER") === "on paper, with no IRCC account" && throughAccount("PR_PORTAL") === "through the PR Portal" && /no record says paper filing \(no IRCC account\) asks it itself/.test(notNeededWords("IMM 5257", "PAPER")));
  ok("C1.6 m6 fail: no sentence says \"A Online\" or \"through the No account\"", !/A Online|through the No account|the No account/.test([signatureMisfitWords("A", "ONLINE", "PEN"), throughAccount("PAPER"), notNeededWords("A", "PAPER")].join(" ")));
  ok("C1.6 C-1 fail: the old spelling SIGNED_PDF_UPLOAD is refused with its new name", (() => { const r = SetChannel.safeParse({ channel: "SIGNED_PDF_UPLOAD" }); return !r.success && /PDF upload, signed by hand and scanned/.test(r.error.issues[0].message); })());
  ok("C1.6 C-1 pass: each of the four channels and four signatures is a value", ["ONLINE", "PDF_UPLOAD", "PAPER", "NOT_NEEDED"].every((c) => SetChannel.safeParse({ channel: c }).success) && ["TYPED_NAME", "HAND_SCANNED", "PEN", "NONE"].every((x) => SetChannel.safeParse({ channel: "PDF_UPLOAD", signature: x }).success));
  const recs: AcceptRecord[] = [{ account: "ANY", channels: ["PDF_UPLOAD", "ONLINE"], basis: "AI_SAMPLE", quote: "q" }, { account: "IRCC_SECURE_ACCOUNT", channels: ["ONLINE"], basis: "FOUNDER_SAMPLE", quote: null }, { account: "PR_PORTAL", channels: ["NOT_NEEDED"], basis: "PERSON_SAMPLE", quote: "q" }];
  ok("C1.6 C-3 pass: the combination's account's own record wins; without one, the record for every account", acceptedFor(recs, "IRCC_SECURE_ACCOUNT")?.channels.join() === "ONLINE" && acceptedFor(recs, "APR_PORTAL")?.account === "ANY" && acceptedFor(recs, null)?.account === "ANY");
  ok("C1.6 C-3 fail: another account's record never applies, and no record offers Online, PDF upload and Paper (Sample), never Not needed",
    acceptedFor([recs[1]], "PR_PORTAL") === null && allowedChannels(undefined, "PR_PORTAL").channels.join() === "ONLINE,PDF_UPLOAD,PAPER" && allowedChannels(undefined, "PR_PORTAL").record === null);
  ok("C1.6 C-4 pass and fail: Not needed only from the account's own record", allowedChannels(recs, "PR_PORTAL").channels.join() === "NOT_NEEDED" && !allowedChannels([{ ...recs[2], account: "ANY" }], "PR_PORTAL").channels.includes("NOT_NEEDED"));
  const acc = new Map([["IMM 5669", recs.slice(1, 2)]]);
  const ee = (ch: string) => channelProblems({ ...snap([{ form_number: "IMM 5669", channel: ch }]), combination: { portal: "IRCC_SECURE_ACCOUNT" } } as unknown as Snapshot, acc);
  ok("C1.6 C-12 pass and fail: IMM 5669 through the IRCC secure account is Online only; a PDF upload line is refused at release in words",
    !ee("ONLINE").some((x) => x.level === "error") && ee("PDF_UPLOAD").some((x) => x.level === "error" && /through the IRCC secure account only as Online/.test(x.message)), ee("PDF_UPLOAD"));
  const nn = channelProblems({ ...snap([{ form_number: "IMM 5669", channel: "NOT_NEEDED" }]), combination: { portal: "APR_PORTAL" } } as unknown as Snapshot, new Map([["IMM 5669", recs]]));
  ok("C1.6 C-4 fail: a Not needed line without its account's record is an error at release", nn.some((x) => x.level === "error" && /marked Not needed/.test(x.message)), nn);
  const nnRead = (account: string) => ({ value: "NOT_NEEDED", account, quote: "The account asks these questions itself." }) as Parameters<typeof channelProposal>[0];
  const nnAny = channelProposal(nnRead("ANY"), nnRead("ANY"), null, () => true), nnPr = channelProposal(nnRead("PR_PORTAL"), nnRead("PR_PORTAL"), null, () => true);
  ok("C1.6 C-5 fail (review M1): the finder never proposes Not needed for every account (no one could approve it); it is listed with the reason", nnAny.outcome === "listed" && /named no IRCC account/.test(nnAny.why ?? ""), nnAny);
  ok("C1.6 C-5 pass: Not needed for one account, both rounds agreeing, is proposed (Ready)", nnPr.outcome === "ready" && nnPr.account === "PR_PORTAL", nnPr);
  // C-11 (P-171 c): a release whose field map maps a box of IMM 5409's oath block says that box is completed by a person
  // at the oath and never filled; a declarant's own box mapped is not flagged. The real inventory, read as validate reads it.
  const S5 = "IMM_5409[0].Page1[0].Section5[0].", INV5409 = "prototype/p1/inventory/imm5409e.inventory.json";
  const map5409 = (paths: string[]) => [{ form_number: "IMM 5409", form_edition: "IMM 5409 (test)", inventory_file: INV5409, entries: paths.map((p) => ({ data_path: p, caption: p.split(".").pop(), outcome: "mapped", fact: "person.family_name" })) }];
  const inv5409 = (f: string) => JSON.parse(readFileSync(join(STUDIO, "..", "..", f), "utf8")).fields;
  const oathHit = oathMappedProblems(map5409([`${S5}City[0]`, `${S5}NameDecl[0]`]), inv5409);
  ok("C1.6 C-11 pass: at release a mapped oath box of IMM 5409 (where it is declared) is said to be completed by a person at the oath, never filled", oathHit.length === 1 && oathHit[0].item === `${S5}City[0]` && oathHit[0].level === "warning" && /By a person/.test(oathHit[0].message) && /never fills it/.test(oathHit[0].message), oathHit);
  ok("C1.6 C-11 fail: a declarant's own box, an unmapped oath box, an Online map or a map with no form field list is not flagged",
    oathMappedProblems(map5409([`${S5}NameDecl[0]`]), inv5409).length === 0
    && oathMappedProblems([{ ...map5409([`${S5}City[0]`])[0], entries: [{ data_path: `${S5}City[0]`, outcome: "unresolved", fact: null }] }], inv5409).length === 0
    && oathMappedProblems([{ ...map5409([`${S5}City[0]`])[0], channel: "ONLINE" }], inv5409).length === 0
    && oathMappedProblems([{ ...map5409([`${S5}City[0]`])[0], inventory_file: null }], inv5409).length === 0);
  const relOath = validate({ ...snap([]), sections: [], placements: [], document_requirements: [], document_types: [], rules: [], checks: [], derived_fields: [], field_maps: map5409([`${S5}Title[0]`]) } as unknown as Snapshot, [{ key: "person.family_name", valueType: "text" }], []).filter((x) => /belongs to the oath/.test(x.message));
  ok("C1.6 C-11 pass: the release's own validation (validate) carries it, reading the form field list from the map", relOath.length === 1 && relOath[0].item === `${S5}Title[0]`, relOath);
  ok("C1.6 C-8 pass: an older release's SIGNED_PDF_UPLOAD reads as PDF upload, signed by hand and scanned", JSON.stringify(lineOf({ channel: "SIGNED_PDF_UPLOAD" })) === '{"channel":"PDF_UPLOAD","signature":"HAND_SCANNED"}' && lineOf({ channel: "PAPER" }).signature === "PEN");
  const old = { forms: [{ form_number: "IMM 5707", channel: "SIGNED_PDF_UPLOAD", title: "T" }] }, now = { forms: [{ form_number: "IMM 5707", signature: "HAND_SCANNED", title: "T" }] };
  ok("C1.6 C-8 pass: the same line in the new spelling is not a change since release (fingerprint and comparison)", (fingerprintLine(now.forms[0]) as { channel?: string }).channel === "SIGNED_PDF_UPLOAD" && !("signature" in fingerprintLine(now.forms[0])) && !diff(old as unknown as Snapshot, now as unknown as Snapshot).some((c) => c.kind === "Form"));
  ok("C1.6 C-8 fail: a real change (hand-scanned to typed name) is still a change", diff(old as unknown as Snapshot, { forms: [{ form_number: "IMM 5707", signature: "TYPED_NAME", title: "T" }] } as unknown as Snapshot).some((c) => c.kind === "Form"));
  ok("C11.18 C-3 fail: Not needed for every account is refused (it is said for one account)", !AcceptsBody.safeParse({ account: "ANY", channels: ["NOT_NEEDED"], reason: "test" }).success && AcceptsBody.safeParse({ account: "PR_PORTAL", channels: ["NOT_NEEDED"], reason: "test" }).success);
  ok("C1.6: filing method: a channel only a conditional line adds is said with its condition",
    filingMethod([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", status: "conditional", condition_plain: "the applicant has a representative" }]) === "Online only; plus PDF upload when the applicant has a representative");
  const sexList = [{ key: "female", label: "Female" }, { key: "male", label: "Male" }, { key: "another_gender", label: "Another gender" }, { key: "unknown", label: "Unknown" }];
  const pdf = draftOptionMap(sexList, [{ code: "Female", label: "F Female" }, { code: "Male", label: "M Male" }, { code: "Unknown", label: "U Unknown" }, { code: "Unspecified", label: "X Another gender" }]);
  ok("C3.8: option map (PDF): the values take the PDF's codes; one the matcher cannot place is left for a person", pdf.optionMap.map.female === "Female" && pdf.optionMap.map.unknown === "Unknown", { map: pdf.optionMap.map, unmatched: pdf.unmatched });
  // QA-144 slice 2: IMM 5710 prints "Separated" (05) where the shared marital status list says "Legally Separated".
  const maritalList = [{ key: "married", label: "Married" }, { key: "legally_separated", label: "Legally Separated" }, { key: "single", label: "Single" }];
  const m5710 = draftOptionMap(maritalList, [{ code: "01", label: "Married" }, { code: "05", label: "Separated" }, { code: "02", label: "Single" }]);
  ok("C3.8: option map pass: a form label the value's own label ends with is matched (\"Separated\" for \"Legally Separated\")", m5710.optionMap.map.legally_separated === "05" && m5710.unmatched.length === 0 && m5710.optionMap.unused.length === 0, m5710.optionMap);
  const exactFirst = draftOptionMap([{ key: "legally_separated", label: "Legally Separated" }, { key: "separated", label: "Separated" }], [{ code: "05", label: "Separated" }]);
  const twoTails = draftOptionMap([{ key: "x", label: "Not legally separated" }], [{ code: "a", label: "Separated" }, { code: "b", label: "Legally separated" }]);
  // Review R1-M1: two values that end with one option's label take no code from it; a person decides.
  const twoValues = draftOptionMap([{ key: "simplified", label: "Simplified Chinese" }, { key: "traditional", label: "Traditional Chinese" }], [{ code: "ZH", label: "Chinese" }]);
  ok("C3.8: option map fail: an exact match keeps its code, an ending two options share and an option two values end with are left for a person", exactFirst.optionMap.map.separated === "05" && !("legally_separated" in exactFirst.optionMap.map) && twoTails.unmatched[0] === "x" && twoValues.unmatched.length === 2 && twoValues.optionMap.unused[0] === "ZH",
    { exactFirst: exactFirst.optionMap.map, twoTails: twoTails.optionMap.map, twoValues: twoValues.optionMap.map });
  ok("C3.8: option map fail: a value without a code is a problem (filling would refuse it)", optionMapProblems(sexList.map((v) => v.key), { map: { female: "Female" }, unused: [], codes: ["Female", "Male"] }).length === 2);
  ok("C3.8: fill: a shared value gives the PDF its own code; a value with no code is refused", codeForValue("Female", pdf.optionMap, sexList) === "Female" && codeForValue("Another gender", { map: {}, unused: [], codes: [] }, sexList) === null);
  ok("C3.8: fill fail: 'toString' or 'constructor' is not a code in an option map", codeForValue("toString", { map: { female: "F" }, unused: [], codes: ["F"] }, []) === null && codeForValue("constructor", { map: {}, unused: [], codes: [] }, []) === null);
  const marital = pdfOptions({}, "code_list:imm5707.marital_status_family (Common-law=1, Single=2, Divorced=3, Annulled marriage=4, Married=5, Legally separated=6, Widowed=7, Unknown=8; this list has no Conjugal option)");
  ok("C3.8: PDF codes: a form field with no resolved options takes its codes from its field map's code list (the filler's own source)", marital.length === 8 && marital.find((o) => o.label === "Married")?.code === "5" && marital.find((o) => o.label === "Unknown")?.code === "8" && pdfOptions({}, "as_is").length === 0, marital);
  const onlineLine = channelProblems(snap([{ form_number: "IMM 5257", channel: "ONLINE" }]));
  ok("C1.6: P-107 a line filed Online is allowed: one warning that it needs the browser extension (later wave), never an error that blocks release",
    onlineLine.length === 1 && onlineLine[0].level === "warning" && /needs the browser extension \(later wave\)/.test(onlineLine[0].message), onlineLine);
  ok("C1.6: P-107 fail case: a PDF line has no channel problem at all (no portal, no online version asked for)", channelProblems(snap([{ form_number: "IMM 5257" }, { form_number: "IMM 5707", channel: "PDF_UPLOAD", signature: "HAND_SCANNED" }])).length === 0);

  // ──────────────────────────────────────────── setup: sample rows, IMM 5257 PDF map from the saved real AI draft (US$0)
  await call("POST", "/demo/load");
  const vv = rowId("vv.single");
  const att = sql(`select id from source_attachment where combination_id='${vv}' and file_name='imm5257e.pdf'`);
  let r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" });
  const jobId = r.body?.id;
  await until(async () => (await call("GET", `/jobs/${jobId}`)).body?.status === "COMPLETED");
  await acceptCleanOneByOne(call, jobId, ["REUSE", "NEW"]);
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "Test: a different meaning from the library field that could fit (BR-7)." });
  r = await call("POST", `/jobs/${jobId}/apply`, {});
  const pdfMapped = Number(sql("select count(*) from form_field_map m join form_edition e on e.id=m.form_edition_id where e.edition_label like 'IMM 5257 (%' and m.outcome='mapped'"));
  ok("C3.1: setup: IMM 5257's PDF field map comes from the saved real AI draft (replayed, no model call)", r.status === 201 && pdfMapped > 100 && sql("select count(*) from drafting_job where mode='LIVE'") === "0", { applied: r.status, mapped: pdfMapped });
  // IMM 5707 comes from the library (its reviewed map is reused, no AI), so the row files two forms.
  for (const f of ["imm5707e.pdf"]) { const a = sql(`select id from source_attachment where combination_id='${vv}' and file_name='${f}'`); if (a) await call("POST", `/attachments/${a}/reuse`, {}); }
  ok("C1.6: setup: the visitor visa row files IMM 5257 and IMM 5707, both PDF uploads (a new line is a PDF upload)", sql(`select string_agg(distinct lineage_key || ':' || channel, ',' order by lineage_key || ':' || channel) from combination_form where combination_id='${vv}'`) === "IMM 5257:PDF_UPLOAD,IMM 5707:PDF_UPLOAD", sql(`select string_agg(distinct lineage_key || ':' || channel, ',') from combination_form where combination_id='${vv}'`));
  const wp = rowId("wp.family");
  const wpRelease = (await call("GET", `/combinations/${wp}/config?mode=published`)).body.release?.sha256, wpDraft = (await call("GET", `/combinations/${wp}/config`)).body.sha256;
  ok("C1.6: a configuration without channels keeps its fingerprint (draft equals its release)", !!wpRelease && wpRelease === wpDraft, { wpRelease, wpDraft });

  // ──────────────────────────────────────────── intake: forms come in only as PDFs (P-102)
  const screen = await intake("saved-portal-screen.html", vv);
  ok("C2.1: P-102 a saved portal screen is refused: forms come in only as their official PDF; nothing attached", screen.outcome === "refused" && /only as their official PDF/.test(screen.message) && !/portal capture/.test(screen.message) && sql("select count(*) from source_attachment where file_name='saved-portal-screen.html'") === "0", screen.message);
  // canada/ holds the recorded canada.ca copies the S4 form finder reads as page text, never through the intake.
  const kinds14 = readdirSync(OFFICIAL, { recursive: true }).map(String).filter((f) => /\.html?$/.test(f) && !f.startsWith("canada/")).map((f) => JSON.parse(execFileSync(PYTHON, ["-I", join(STUDIO, "tools", "read_form_identity.py"), join(OFFICIAL, f)], { encoding: "utf8" }).trim().split("\n").pop()!).kind as string);
  ok("C2.1: intake pass: every IRCC public page in the official library still reads as a guide or checklist (none as a portal screen)", kinds14.length >= 10 && kinds14.every((k) => k === "guide" || k === "checklist"), kinds14);
  const one = await intake("saved-portal-screen-one-answer.html", vv);
  ok("C2.1: intake fail: a saved portal screen with one answered question is refused too, and not stored", one.outcome === "refused" && sql("select count(*) from source_attachment where file_name='saved-portal-screen-one-answer.html'") === "0" && sql("select coalesce(max(stored_path),'') from intake_item where file_name='saved-portal-screen-one-answer.html'") === "", one.message);

  // ──────────────────────────────────────────── the parked routes are gone (P-102)
  const gone = await Promise.all([["POST", "/captures"], ["GET", "/portals"], ["PATCH", `/combinations/${vv}/portal`], ["GET", `/combinations/${vv}/online-forms`], ["GET", `/combinations/${vv}/drafting-sources`], ["POST", `/combinations/${vv}/channels/use-defaults`], ["POST", "/extension/pair"], ["GET", "/capture-template.csv"]].map(([m, p]) => call(m, p, m === "GET" ? undefined : {})));
  ok("C1.6: P-102 capture, portal choice, online forms, online drafting, the extension's pairing and the capture template answer 404 (parked)", gone.every((x) => x.status === 404), gone.map((x) => x.status));

  // ──────────────────────────────────────────── channels and the validator (P-107)
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "BY_FAX" });
  ok("C1.6: channel fail: an unknown channel is refused", r.status === 400);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "ONLINE" });
  const later = r.body.problems?.find((x: { item: string; message: string }) => x.item === "IMM 5257");
  ok("C1.6: P-107 Online stays selectable: the line is saved Online and says it needs the browser extension (later wave), a warning only", r.status === 200 && later?.level === "warning" && /later wave/.test(later.message) && !r.body.problems.some((x: { level: string }) => x.level === "error") && r.body.portal === undefined, r.body.problems);
  ok("C1.6: filing method is derived: Online + PDF uploads; an Online line has no signature by default", r.body.filing_method === "Online + PDF uploads" && r.body.lines.find((l: { form: string }) => l.form === "IMM 5257").signature_kind === "NONE", r.body.filing_method);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" });
  ok("C1.6 C-2 pass: a PDF upload signed by hand and scanned is saved with its signature (the old 'signed PDF upload')", r.status === 200 && r.body.filing_method === "Online + PDF uploads" && r.body.lines.find((l: { form: string }) => l.form === "IMM 5707")?.signature === "Signed by hand and scanned", r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD", from: "ONLINE" });
  ok("C1.6: channel fail: a save from an out-of-date screen is refused (409), the line stays as it is", r.status === 409 && sql(`select channel || ':' || signature from combination_form where combination_id='${vv}' and lineage_key='IMM 5707' order by version desc limit 1`) === "PDF_UPLOAD:HAND_SCANNED", r.body.message);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "SIGNED_PDF_UPLOAD" });
  ok("C1.6 C-1 fail: the old spelling is refused on the write route (400, in words), the line unchanged", r.status === 400 && /signed by hand and scanned/.test(JSON.stringify(r.body)) && sql(`select channel from combination_form where combination_id='${vv}' and lineage_key='IMM 5707' order by version desc limit 1`) === "PDF_UPLOAD", r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD", signature: "PEN" });
  ok("C1.6 C-2 fail: signed in pen on a PDF upload is refused in words, the line unchanged", r.status === 400 && /does not fit a line filed as PDF upload/.test(JSON.stringify(r.body)) && sql(`select signature from combination_form where combination_id='${vv}' and lineage_key='IMM 5707' order by version desc limit 1`) === "HAND_SCANNED", r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PAPER" });
  ok("C1.6 C-2 pass: a line moved to Paper takes signed in pen (its default), the filing method says paper", r.status === 200 && r.body.lines.find((l: { form: string }) => l.form === "IMM 5707")?.signature_kind === "PEN" && /paper/.test(r.body.filing_method), r.body.filing_method);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "NOT_NEEDED" });
  ok("C1.6 C-4 fail: Not needed with no record that the account asks it itself is refused in words", r.status === 400 && /marked Not needed/.test(JSON.stringify(r.body)), r.body);
  // C-3 per account: a record for the IRCC secure account (Online only) beside the record for every account.
  const acc5707 = sql(`select e.id from form_edition e join gov_form_def d on d.id=e.gov_form_def_id where d.form_key='IMM 5707' and e.channel='PDF' order by e.edition_label desc limit 1`), ws5707 = sql(`select workspace_id from combination where id='${vv}'`);
  sql(`insert into form_edition_accept (workspace_id, form_edition_id, account, channels, basis, quote, set_by) values ('${ws5707}', '${acc5707}', 'IRCC_SECURE_ACCOUNT', '{ONLINE}', 'PERSON_SAMPLE', 'Test line for the secure account', 'test') on conflict do nothing`);
  r = await call("PATCH", `/combinations/${vv}/account`, { account: "LMIA_SOMETHING", from: null });
  ok("C1.6 Q1 fail: an unknown IRCC account is refused", r.status === 400, r.body);
  r = await call("PATCH", `/combinations/${vv}/account`, { account: "IRCC_SECURE_ACCOUNT" });
  ok("C1.6 Q1 fail (break M3): an account save that does not say which account it changed is refused", r.status === 400 && /changed it from/.test(JSON.stringify(r.body)), r.body);
  // Break M3: two saves at once from the same account: one wins, the other is refused (409), and the history is right.
  const race = await Promise.all([call("PATCH", `/combinations/${vv}/account`, { account: "PR_PORTAL", from: null }), call("PATCH", `/combinations/${vv}/account`, { account: "IRCC_PORTAL", from: null })]);
  const won = race.filter((x) => x.status === 200), lost = race.filter((x) => x.status === 409);
  const hist = sql(`select count(*) from audit_event where combination_id='${vv}' and summary like '%IRCC account%not set →%'`);
  ok("C1.6 Q1 fail (break M3): of two account saves at once one wins and one is refused; one history line says 'not set →'", won.length === 1 && lost.length === 1 && hist === "1", { statuses: race.map((x) => x.status), hist });
  const wonAccount = won[0]?.body?.account ?? null;
  r = await call("PATCH", `/combinations/${vv}/account`, { account: null, from: wonAccount });
  ok("C1.6 Q1 pass: the account is set back to not set from the one saved", r.status === 200 && r.body.account === null, r.body);
  r = await call("PATCH", `/combinations/${vv}/account`, { account: "IRCC_SECURE_ACCOUNT", from: null });
  const paperNow = r.body.problems?.find((x: { item: string; level: string }) => x.item === "IMM 5707" && x.level === "error");
  ok("C1.6 C-3 pass: once the account is the IRCC secure account, its record applies: the Paper line becomes an error in words (not changed silently)", r.status === 200 && r.body.account === "IRCC_SECURE_ACCOUNT" && /through the IRCC secure account only as Online/.test(paperNow?.message ?? ""), r.body.problems);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD", signature: "NONE" });
  ok("C1.6 C-3 fail: a PDF upload the account does not accept is refused on save", r.status === 400 && /only as Online/.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "ONLINE" });
  ok("C1.6 C-3 pass: Online, which the account accepts, is saved", r.status === 200 && r.body.lines.find((l: { form: string }) => l.form === "IMM 5707")?.channel === "ONLINE", r.body);
  const formsTab = (await call("GET", `/combinations/${vv}/workspace?tab=forms`)).body;
  const l5707 = formsTab?.lines?.find((l: { code: string }) => l.code === "IMM 5707");
  ok("C1.6 §5: the Forms tab offers each channel with its reason when refused, and the signatures that fit", !!l5707 && l5707.channelOptions.find((o: { channel: string }) => o.channel === "PDF_UPLOAD")?.ok === false && /only as Online/.test(l5707.channelOptions.find((o: { channel: string }) => o.channel === "PDF_UPLOAD")?.why ?? "") && l5707.signatures.map((x: { kind: string }) => x.kind).join() === "NONE,TYPED_NAME", l5707);
  await call("PATCH", `/combinations/${vv}/account`, { account: null, from: "IRCC_SECURE_ACCOUNT" });
  sql(`delete from form_edition_accept where set_by='test'`);
  await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PDF_UPLOAD" });
  const review = (await call("GET", `/combinations/${vv}/review`)).body;
  ok("C3.8: the review's validator runs the channel rules: the Online line is a warning there too, never an error", review.draft.problems.some((x: { level: string; item: string; message: string }) => x.level === "warning" && x.item === "IMM 5257" && /later wave/.test(x.message)) && !review.draft.problems.some((x: { level: string; message: string }) => x.level === "error" && /Online|portal/.test(x.message)), review.draft.problems.length);
  const summary = (await call("GET", `/combinations/${vv}/summary`)).body;
  ok("C1.6: the combination summary carries no portal and no online forms; IMM 5257 shows its PDF edition while filed Online", summary.portal === undefined && summary.onlineForms === undefined && /^IMM 5257 \(/.test(summary.forms.find((f: { code: string }) => f.code === "IMM 5257")?.edition ?? ""), summary.forms.find((f: { code: string }) => f.code === "IMM 5257"));
  await call("PATCH", `/combinations/${vv}/forms/IMM 5257/channel`, { channel: "PDF_UPLOAD" });
  const lib = (await call("GET", "/library/forms")).body.find((f: { code: string }) => f.code === "IMM 5257");
  ok("C3.12: Forms library: IMM 5257 shows its PDF editions only, no online version", lib?.channels?.join() === "PDF" && lib.online_versions === undefined && lib.editions.length >= 1, lib?.channels);
  const sv = rowId("sv.super_visa");
  const svAtt = sql(`select id from source_attachment where combination_id='${sv}' and file_name='imm5257e.pdf'`);
  r = await call("POST", `/attachments/${svAtt}/reuse`, {});
  ok("C1.6: default channel: a form added from the library starts as PDF upload", sql(`select channel from combination_form where combination_id='${sv}' and lineage_key='IMM 5257' order by version desc limit 1`) === "PDF_UPLOAD", r.body);

  // ──────────────────────────────────────────── slice 1 FIX: paper filing, Mixed words, accepts impact, edition at approval
  ok("C1.6 C-7 (review S1): Online + PDF upload + Paper names all three; Online + PDF stays as it was", filingKind([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "PDF_UPLOAD" }, { form_number: "C", channel: "PAPER" }]) === "Mixed: online, PDF and paper" && filingKind([{ form_number: "A", channel: "ONLINE" }, { form_number: "B", channel: "PDF_UPLOAD" }]) === "Mixed: online and PDF");
  const paperOnly = allowedChannels([{ account: "ANY", channels: ["ONLINE", "PDF_UPLOAD", "PAPER"], basis: "PERSON_SAMPLE", quote: null }], "PAPER");
  ok("C1.6 C-3 (break M6): with no account (paper filing) only Paper is allowed, whatever every account accepts; another account keeps its record", paperOnly.channels.join() === "PAPER" && allowedChannels([{ account: "ANY", channels: ["ONLINE", "PAPER"], basis: "PERSON_SAMPLE", quote: null }], "PR_PORTAL").channels.join() === "ONLINE,PAPER", paperOnly);
  const [was5707, wasSig5707] = sql(`select channel || '|' || signature from combination_form where combination_id='${vv}' and lineage_key='IMM 5707' order by version desc limit 1`).split("|");
  r = await call("PATCH", `/combinations/${vv}/account`, { account: "PAPER", from: null });
  const paperErr = r.body.problems?.find((x: { item: string; level: string }) => x.item === "IMM 5707" && x.level === "error");
  ok("C1.6 C-3 (break M6): once filed with no account, a PDF upload line is an error in words (not changed silently)", r.status === 200 && /no IRCC account \(paper filing\): every form is filed on paper/.test(paperErr?.message ?? ""), r.body.problems);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "ONLINE" });
  ok("C1.6 C-3 fail (break M6): an Online line on a paper-filing combination is refused in words", r.status === 400 && /every form is filed on paper/.test(JSON.stringify(r.body)), r.body);
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: "PAPER" });
  ok("C1.6 C-3 pass (break M6): Paper is saved on a paper-filing combination", r.status === 200 && r.body.lines.find((l: { form: string }) => l.form === "IMM 5707")?.channel === "PAPER", r.body);
  await call("PATCH", `/combinations/${vv}/account`, { account: null, from: "PAPER" });
  r = await call("PATCH", `/combinations/${vv}/forms/IMM 5707/channel`, { channel: was5707, signature: wasSig5707 });
  ok("set-up: IMM 5707 is put back as it was", r.status === 200, r.body);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5476")}/accepts`, { account: "PAPER", channels: ["ONLINE"], reason: "break M6 test" });
  ok("C11.18 fail (break M6): a record for no account (paper filing) that is not Paper is refused in words", r.status === 400 && /files only on paper/.test(JSON.stringify(r.body)), r.body);
  // Break M5: approving what IRCC accepts names every combination in use it would break, before the click.
  const vvLabel = sql(`select label from combination where id='${vv}'`);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5707")}/accepts`, { account: "ANY", channels: ["ONLINE"], reason: "break M5 test" });
  const m5 = r.body?.id;
  let seen = (await call("GET", `/library/changes/${m5}`, undefined, "user-B")).body;
  ok("C11.18 (break M5): the approver sees which combinations the change breaks, each with why, before approving", r.status < 300 && seen?.accepts_impact?.some((i: { label: string; channel: string; words: string }) => i.label === vvLabel && i.channel === "PDF_UPLOAD" && /only as Online/.test(i.words)), seen?.accepts_impact ?? r.body);
  sql(`delete from library_change where id='${m5}'`);
  r = await call("POST", `/library/forms/${encodeURIComponent("IMM 5707")}/accepts`, { account: "ANY", channels: ["PDF_UPLOAD", "ONLINE"], reason: "break M5 test, keeps PDF upload" });
  const m5b = r.body?.id;
  seen = (await call("GET", `/library/changes/${m5b}`, undefined, "user-B")).body;
  ok("C11.18 (break M5) fail-guard: a change that keeps every line allowed lists nothing", r.status < 300 && Array.isArray(seen?.accepts_impact) && !seen.accepts_impact.some((i: { label: string }) => i.label === vvLabel), seen?.accepts_impact);
  // Break m5: a newer edition arriving after the proposal is refused at approval; nothing is written.
  sql(`update library_change set matches = jsonb_set(matches, '{edition}', '"IMM 5707 (01-1999)"') where id='${m5b}'`);
  r = await call("POST", `/library/changes/${m5b}/approve`, { note: "ok" }, "user-B");
  ok("C11.18 fail (break m5): approval for an edition that is no longer current is refused in words and the change still waits", r.status === 409 && /proposed for IMM 5707 \(01-1999\)/.test(r.body?.detail ?? "") && sql(`select status from library_change where id='${m5b}'`) === "WAITING", r.body?.detail);
  sql(`delete from library_change where id='${m5b}'`);

  // ──────────────────────────────────────────── one answer list end to end (PDF)
  // P-158 note b (screens lane, S6 2a): an answer list comes only from a source (a form box's own choices or an IRCC
  // code list); the free add is gone. The list is written here as that source would give it (tests/seed_library.cjs).
  r = await call("POST", "/library/answer-lists", { key: "sex", label: "Sex (Sample)", values: sexList });
  ok("C3.8 P-158 fail: an answer list is not typed in by hand (410), and nothing is written", r.status === 410 && sql("select count(*) from answer_list where answer_list_key='sex'") === "0", r.status);
  seedAnswerList(sql, { key: "sex", label: "Sex (Sample)", values: sexList });
  r = await call("POST", "/library/fields/person.sex/answer-list", { list: "sex" });
  ok("C3.8: answer list: person.sex takes its values from it", r.status === 201);
  const pdfEd = sql("select id from form_edition where edition_label like 'IMM 5257 (%' limit 1");
  const om1 = await call("POST", `/editions/${pdfEd}/option-maps/draft`);
  const pdfSex = om1.body.option_maps.find((o: { fact: string }) => o.fact === "person.sex");
  ok("C3.8: option maps drafted without AI for the PDF: the list's values take the PDF's own codes", om1.body.channel === "PDF" && pdfSex?.optionMap.map.female === "Female", pdfSex?.optionMap.map);
  await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male" }, unused: ["Unknown", "Unspecified"] });
  r = await call("GET", `/combinations/${vv}/channels`);
  const gap = r.body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("C3.8: validator fail: a value with no code on the PDF blocks release, and says which", gap.some((x: { level: string; message: string }) => x.level === "error" && /no code for "another_gender", "unknown"/.test(x.message)), gap.map((x: { message: string }) => x.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "NOPE" } });
  ok("C3.8: option map fail: a person cannot set a code the PDF field does not have", r.status === 400 && /NOPE/.test(r.body.message));
  r = await call("PATCH", `/editions/${pdfEd}/option-maps`, { dataPath: pdfSex.form_field, map: { female: "Female", male: "Male", unknown: "Unknown", another_gender: "Unspecified" } });
  const after = (await call("GET", `/combinations/${vv}/channels`)).body.problems.filter((x: { message: string }) => /person\.sex/.test(x.message));
  ok("C3.8: option map: a person maps 'Another gender' to the PDF's 'Unspecified'; no sex problem left", r.status === 200 && after.length === 0, after);

  // An answer list on a field whose PDF form fields keep their codes in the code list (review 1: release blocked for good).
  r = await call("POST", "/library/fields/person.family_name/answer-list", { list: "sex" });
  ok("C3.8: answer list fail: a free-text field is not turned into a choice field", r.status === 400 && /free text/.test(r.body.message), r.body.message);
  seedAnswerList(sql, { key: "marital_status", label: "Marital status (Sample)", values: [["married", "Married"], ["single", "Single"], ["common_law", "Common-law"], ["divorced", "Divorced"], ["separated", "Legally separated"], ["widowed", "Widowed"], ["annulled", "Annulled marriage"], ["unknown", "Unknown"]].map(([key, label]) => ({ key, label })) });
  r = await call("POST", "/library/fields/person.marital_status/answer-list", { list: "marital_status" });
  const ed5707 = sql("select id from form_edition where edition_label like 'IMM 5707 (%' limit 1");
  const om5707 = (await call("POST", `/editions/${ed5707}/option-maps/draft`)).body.option_maps.filter((o: { fact: string }) => o.fact === "person.marital_status");
  ok("C3.8: PDF option maps: IMM 5707's marital status form fields take their codes from their code lists (Married = 5), drafted without AI", om5707.length >= 1 && om5707.every((o: { optionMap: { map: Record<string, string> } }) => o.optionMap.map.married === "5" && o.optionMap.map.single === "2"), om5707.map((o: { form_field: string; optionMap: unknown }) => o.optionMap));
  // The filler through the API (review 11): a form field on an answer list writes its option map's code; a value the
  // map lacks goes to "by hand", never guessed; a line filed Online is never filled as a PDF.
  const ed1295 = sql("select id from form_edition where edition_label like 'IMM 1295 (%' limit 1");
  const om1295 = (await call("POST", `/editions/${ed1295}/option-maps/draft`)).body.option_maps.find((o: { fact: string }) => o.fact === "person.marital_status");
  const box1295 = "form1[0].Page1[0].MaritalStatus[0].SectionA[0].MaritalStatus[0]";
  const filled = async () => (await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" })).body.boxes?.find((x: { box: string }) => x.box === box1295);
  const w1 = await filled();
  await call("PATCH", `/editions/${ed1295}/option-maps`, { dataPath: om1295.form_field, map: { single: "02" }, unused: om1295.optionMap.codes.filter((c: string) => c !== "02") });
  const w2 = await filled();
  ok("C3.8: fill (API): 'married' is written as IMM 1295's own code 01 from the option map; without 'married' in the map it goes to 'by hand'", om1295?.optionMap.map.married === "01" && w1?.result === "written" && w1.written === "01" && w2?.result === "by hand" && /option map/.test(w2.why), [w1?.result, w1?.written, w2?.result, w2?.why]);
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "ONLINE" });
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" });
  await call("PATCH", `/combinations/${wp}/forms/IMM 1295/channel`, { channel: "PDF_UPLOAD" });
  ok("C1.6: fill fail: a line filed Online is not filled as a PDF, even though the library has the PDF", r.status === 409 && /filed Online/.test(r.body.message), r.body.message);
  r = await call("DELETE", "/library/fields/person.marital_status/answer-list");
  const unl = (await call("GET", `/combinations/${vv}/channels`)).body.problems.filter((x: { message: string }) => /marital_status/.test(x.message));
  ok("C3.8: answer list: a list linked by mistake can be taken off; no option-map problem is left for that field", r.status === 200 && r.body.answer_list === null && unl.length === 0, unl);

  // ──────────────────────────────────────────── reviewed merges (P-65)
  seedField(sql, { key: "person.town_of_birth", meaning: "The town or city where the person was born", source: "a second form's box (test setup)" });
  ok("C3.5: setup: a second field with the same meaning comes from another source (the duplicate a merge removes)", sql("select count(*) from canonical_field where canonical_field_key='person.town_of_birth'") === "1");
  await call("POST", "/library/fields/person.town_of_birth/aliases", { alias: "Town of birth" });
  // A PDF form field reads the duplicate and is published (as a released line would be).
  const [cityRow, cityPath] = sql(`select id || '|' || data_path from form_field_map where form_edition_id='${pdfEd}' and canonical_field_key='person.place_of_birth_city' order by version desc limit 1`).split("|");
  sql(`update form_field_map set canonical_field_key='person.town_of_birth', status='PUBLISHED' where id='${cityRow}'`);
  const cityVersions = () => sql(`select string_agg(status || ':' || canonical_field_key, ',' order by version) from form_field_map where form_edition_id='${pdfEd}' and data_path='${cityPath.replace(/'/g, "''")}'`);
  const vvRelease = (await call("GET", `/combinations/${vv}/config?mode=published`)).body.release?.sha256;
  r = await call("POST", "/library/merges", { keep: "person.place_of_birth_city", merge: "person.date_of_birth", reason: "testing a merge of two kinds" });
  ok("C3.5: merge fail: fields of different kinds (text vs date) are not merged", r.status === 409);
  r = await call("POST", "/library/merges", { keep: "person.place_of_birth_city", merge: "person.town_of_birth", reason: "Same meaning: the place of birth, city or town." });
  const m = r.body;
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-A");
  ok("C3.5: merge fail: the person who proposed it cannot approve it", r.status === 403);
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-C");
  ok("C3.5: merge: approved by a second person; the merged id becomes an alias that redirects", r.body.status === "APPLIED" && sql("select merged_into_key from canonical_field where canonical_field_key='person.town_of_birth' order by version desc limit 1") === "person.place_of_birth_city" && sql("select count(*) from canonical_field where canonical_field_key='person.place_of_birth_city' and 'person.town_of_birth' = any(aliases) and 'Town of birth' = any(aliases)") !== "0", r.body.moved);
  ok("C3.5: merge: the published form field gets a new draft version reading the surviving id; its released version is untouched", cityVersions() === "PUBLISHED:person.town_of_birth,DRAFT:person.place_of_birth_city", cityVersions());
  ok("C3.5: merge: frozen releases are not changed", (await call("GET", `/combinations/${vv}/config?mode=published`)).body.release?.sha256 === vvRelease);
  r = await call("POST", `/library/merges/${m.id}/approve`, {}, "user-C");
  ok("C3.5: merge fail: a merge is applied once", r.status === 409);
  r = await call("PATCH", "/library/fields/person.town_of_birth", { meaning: "Edited after the merge, to bring it back" });
  const r8 = await call("POST", "/library/fields/person.town_of_birth/aliases", { alias: "Birth town" });
  ok("C3.5: merge fail: a merged-away field is not edited back to a draft and takes no new label (it only redirects)", r.status === 409 && r8.status === 409, [r.body.message, r8.body.message]);
  // Chains, cycles and forks (break M5): one pending merge per field, and every merge checked again when approved.
  for (const k of ["x", "y", "z"]) seedField(sql, { key: `case.test_merge_${k}`, meaning: `A test field ${k} for the merge checks` });
  const xy = (await call("POST", "/library/merges", { keep: "case.test_merge_y", merge: "case.test_merge_x", reason: "Test: x means the same as y." })).body;
  r = await call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_y", reason: "Test: y means the same as z." });
  const r9 = await call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_x", reason: "Test: x means the same as z." });
  ok("C3.5: merge fail: a field already waiting in a merge cannot enter a second one (no chain, cycle or fork)", r.status === 409 && r9.status === 409, [r.body.message, r9.body.message]);
  sql("update canonical_field set status='RETIRED' where canonical_field_key='case.test_merge_y'"); // retired by another path after the proposal
  r = await call("POST", `/library/merges/${xy.id}/approve`, {}, "user-C");
  ok("C3.5: merge fail: checked again when approved; a field retired since the proposal stops it and nothing moves", r.status === 409 && /retired/.test(r.body.message) && sql(`select status from field_merge where id='${xy.id}'`) === "PROPOSED" && sql("select coalesce(max(merged_into_key),'') from canonical_field where canonical_field_key='case.test_merge_x'") === "", r.body.message);
  await call("POST", `/library/merges/${xy.id}/reject`, { note: "y was retired" }, "user-C");
  const [p1, p2] = await Promise.all([1, 2].map(() => call("POST", "/library/merges", { keep: "case.test_merge_z", merge: "case.test_merge_x", reason: "Test: proposed twice at once." })));
  ok("C3.5: merge fail: the same merge proposed twice at the same moment is stored once", [p1.status, p2.status].sort().join() === "201,409" && sql("select count(*) from field_merge where merge_key='case.test_merge_x' and status='PROPOSED'") === "1", [p1.status, p2.status]);
  // Aliases: one label, one field, however it is written; all of several added at once are kept (break m8, m9).
  await call("POST", "/library/fields/person.family_name/aliases", { alias: "Mother's maiden name" });
  r = await call("POST", "/library/fields/person.given_names/aliases", { alias: "Mother’s maiden name" });
  const r10 = await call("POST", "/library/fields/person.given_names/aliases", { alias: "??" });
  ok("C3.5: alias fail: a curly-apostrophe twin of another field's label, and a label of punctuation only, are refused", r.status === 409 && r10.status === 400, [r.body.message, r10.body.message]);
  const many = await Promise.all(["Alias one", "Alias two", "Alias three", "Alias four", "Alias five"].map((alias) => call("POST", "/library/fields/case.test_merge_z/aliases", { alias })));
  ok("C3.5: aliases added at the same moment are all kept", many.every((x) => x.status === 201) && sql("select cardinality(aliases) from canonical_field where canonical_field_key='case.test_merge_z' order by version desc limit 1") === "5", many.map((x) => x.status));

  const out = join(STUDIO, "evidence", "forms-channels"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "channels-visitor-visa.json"), JSON.stringify((await call("GET", `/combinations/${vv}/channels`)).body, null, 1));

  // ──────────────────────────────────────────── services on this copy's database (never the demo's)
  if (/xr_studio_demo/.test(DB)) throw new Error("This check never runs on the demo database.");
  process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`;
  const { Db } = await import("../api/src/core.ts"), { Finder } = await import("../api/src/finder.ts"), { addFormLine } = await import("../api/src/form-lines.ts");
  const db = new Db(), wsId = sql(`select workspace_id from combination where id='${vv}'`);
  // Review S5: two finds proposing what IRCC accepts for the same form at the same moment: one change waits, the other is "kept".
  const raceForm = sql(`select d.form_key from gov_form_def d join form_edition e on e.gov_form_def_id=d.id where d.workspace_id='${wsId}' and d.form_kind='data_form' and e.channel<>'ONLINE' and d.retired_at is null
    and not exists (select 1 from library_change c where c.kind='form_accepts' and c.key=d.form_key and c.status in ('WAITING','RETURNED','APPROVED')) order by d.form_key limit 1`);
  // Both finds pass the "already waiting" check before either writes: each insert waits until the other has arrived.
  let arrived = 0, release = () => {}; const gate = new Promise<void>((r) => { release = r; });
  const atOnce = new Proxy(db, { get(t, k) {
    if (k === "libraryChange") return new Proxy(t.libraryChange, { get(lc, m) {
      if (m === "create") return async (a: Parameters<typeof lc.create>[0]) => { if (++arrived >= 2) release(); await Promise.race([gate, new Promise((r) => setTimeout(r, 5000))]); return lc.create(a); };
      const v = (lc as unknown as Record<string | symbol, unknown>)[m]; return typeof v === "function" ? v.bind(lc) : v; } });
    const v = (t as unknown as Record<string | symbol, unknown>)[k]; return typeof v === "function" ? v.bind(t) : v; } });
  const finder = new Finder(atOnce, null as never, { log: async () => undefined } as never, null as never) as unknown as { proposeChannel: (w: string, c: string, p: unknown, by: string) => Promise<{ outcome: string; change_id?: string }> };
  const proposal = { outcome: "ready", channels: ["PAPER"], account: "ANY", quote: "Print the form, sign it and mail it.", why: null, readings: { draft: null, check: null, keyword: null } };
  const settled = await Promise.allSettled([1, 2].map(() => finder.proposeChannel(wsId, raceForm, proposal, "system")));
  const both = settled.map((x) => (x.status === "fulfilled" ? x.value : { outcome: `refused: ${String((x.reason as Error)?.message ?? x.reason).slice(0, 80)}` as string, change_id: undefined }));
  const waiting = sql(`select count(*) from library_change where kind='form_accepts' and key='${raceForm}' and status='WAITING'`);
  ok("C11.18 C-5 fail (review S5): two finds proposing for one form at the same moment: one waiting change, and neither find fails on the database refusal", waiting === "1" && both.filter((x) => x.change_id).length === 1 && !both.some((x) => x.outcome.startsWith("refused")), { raceForm, waiting, both: both.map((x) => x.outcome) });
  ok("C11.18 C-5 pass (review S5): the other find says the change already waits (kept)", both.filter((x) => x.outcome === "kept").length === 1 && both.some((x) => x.outcome === "ready"), both);
  sql(`delete from library_change where kind='form_accepts' and key='${raceForm}' and matches->>'source'='finder'`);
  // A Paper line removed in a release comes back with its signature (C-2: the database refuses Paper with none).
  const back = sql(`select d.id || '|' || d.form_key from gov_form_def d join form_edition e on e.gov_form_def_id=d.id where d.workspace_id='${wsId}' and d.form_kind='data_form' and d.retired_at is null
    and not exists (select 1 from combination_form f where f.combination_id='${vv}' and f.lineage_key=d.form_key) order by d.form_key limit 1`).split("|");
  const v1 = "00000000-0000-4000-8000-00000000b001";
  sql(`insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, status, origin, updated_by, channel, signature, version) values ('${v1}', '${wsId}', '${vv}', '${back[0]}', '${back[1]}', 'each_applicant', 'COMBINATION_MANDATORY', 'SUPERSEDED', 'HUMAN', 'test', 'PAPER', 'PEN', 1);
    insert into combination_form (id, workspace_id, combination_id, gov_form_def_id, lineage_key, who, attach_mode, status, origin, updated_by, channel, signature, version, supersedes_id) values (gen_random_uuid(), '${wsId}', '${vv}', '${back[0]}', '${back[1]}', 'each_applicant', 'COMBINATION_MANDATORY', 'RETIRED', 'HUMAN', 'test', 'PAPER', 'PEN', 2, '${v1}');`);
  const added = await addFormLine(db, { workspaceId: wsId, combinationId: vv, govFormDefId: back[0], formKey: back[1], origin: "HUMAN", by: "user-A", sourceQuote: "Test" }).catch((e: Error) => e.message);
  const v3 = sql(`select channel || ':' || signature from combination_form where combination_id='${vv}' and lineage_key='${back[1]}' and version=3`);
  ok("C1.6 C-2 pass: a Paper line removed in a release and added back is Paper, signed in pen, as it was", added === "added" && v3 === "PAPER:PEN", { added, v3 });
  ok("C1.6 C-2 fail: the database refuses the Paper line with no signature the old restore wrote", (() => { try { sql(`update combination_form set signature='NONE' where combination_id='${vv}' and lineage_key='${back[1]}' and version=3`); return false; } catch { return true; } })());
  sql(`delete from combination_form where combination_id='${vv}' and lineage_key='${back[1]}'`);
  await db.$disconnect();

  // ──────────────────────────────────────────── reset removes the new records with the workspace
  r = await call("POST", "/demo/reset", { confirm: "RESET" });
  ok("C3.5: reset removes answer lists and merges with the workspace", sql("select count(*) from answer_list") === "0" && sql("select count(*) from field_merge") === "0", r.body.remaining_rows);

  console.log(`\n${pass}/${pass + fail} passed`);
  writeFileSync(join(out, "check_forms_channels.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, fixtures: "Sample (tests/fixtures/intake/README.md)", pass, fail, log }, null, 1));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
