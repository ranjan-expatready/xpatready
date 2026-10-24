// F1 forms channels, slice 2b (forms lane): evidence findings F5 (a static form's page fields set with their appearances,
// so the as-written file shows its values outside Adobe) and F6 (the oath block of IMM 5409 is a person step), QA-15
// (a form code in any case at capture start) and D3 (a second live screen-map start reuses a finished draft whose
// proposals are waiting, US$0). Every rule has a passing and a failing case. The filler runs on copies of the official
// forms in a temporary folder; the API part runs on an isolated copy (its own database and files; the demo is never
// touched). NO model call (US$0): the screen-map proposals are a hand-written answer, said so in its check.
//   zsh studio/tools/isolated.sh forms_s2b 4452 start && tsx studio/tests/check_forms_slice2b.ts 4452 xr_studio_forms_s2b
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { factKeyProblem } from "../../contracts/fact-key.ts";
import { NewCapture } from "../contracts/forms.ts";
import { byAPerson, isOathBox, isSignatureBox, oathBoxes, personSteps } from "../engine/form-steps.ts";
import { planDraft, type Prior } from "../engine/parts.ts";
import { screenMapProposals } from "../engine/twin.ts";

const PORT = Number(process.argv[2] ?? 4452), DB = process.argv[3] ?? "xr_studio_forms_s2b";
const STUDIO = join(import.meta.dirname, "..");
const PROTOTYPE = join(STUDIO, "..");
const ROOT = join(PROTOTYPE, "..", "..", "..");
const FIX = join(STUDIO, "tests", "fixtures");
const PY = join(ROOT, ".tools", "solution-1-prototype", ".venv", "bin", "python");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const call = async (method: string, path: string, body?: unknown, actor = "user-A"): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const upload = async (path: string, names: string[], actor = "user-A"): Promise<Res> => {
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, "portal", n)))]), n);
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const until = async (fn: () => Promise<boolean>, ms = 300_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 1000)); } return false; };
const finished = async (jobId: string) => { let j: Res = { status: 0, body: null }; await until(async () => { j = await call("GET", `/jobs/${jobId}`); return !["QUEUED", "RUNNING"].includes(j.body?.status); }); return j.body; };
type Field = { data_path?: string | null; som?: string | null; ui?: string | null; caption?: string | null; required?: boolean | null };
const inventory = (f: string) => JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", `${f}.inventory.json`), "utf8")) as { fields: Field[]; groups?: [] };
const TMP = mkdtempSync(join(tmpdir(), "forms-s2b-"));
/** The product's filler (p5/fill.py, as the API runs it) on a copy of an official form; returns its report. */
const filler = (form_file: string, values: Record<string, string>, page_fields: Record<string, string>, name: string) => {
  const req = join(TMP, `${name}.request.json`), out = join(TMP, `${name}.pdf`);
  writeFileSync(req, JSON.stringify({ form_file, values, page_fields, out }));
  const p = spawnSync(PY, ["-I", join(PROTOTYPE, "p5", "fill.py"), req], { encoding: "utf8", cwd: ROOT, maxBuffer: 20 * 1024 * 1024 });
  if (p.status !== 0) return { error: p.stderr.slice(-400), out };
  return { ...JSON.parse(p.stdout.trim().split("\n").pop()!), out };
};
/** What a viewer that does not run XFA shows: poppler's text of page 1 (page fields drawn from their appearances). */
const shown = (pdf: string) => { try { return execFileSync("pdftotext", ["-layout", "-l", "1", pdf, "-"], { encoding: "utf8" }); } catch { return ""; } };

(async () => {
  // ──────────────────────────────────────────── F6: the oath block of IMM 5409 (no server)
  const inv5409 = inventory("imm5409e");
  const S5 = "IMM_5409[0].Page1[0].Section5[0].";
  const oath = oathBoxes(inv5409.fields).map((f) => f.data_path);
  const expected = ["City", "AdminDecl", "County", "Province", "Country", "Title", "Day", "Month", "Year", "SignatureAdminDecl"].map((n) => `${S5}${n}[0]`);
  ok("F6: IMM 5409's oath block is the place declared, the administrator's name, title and signature, and the date (10 boxes)", oath.length === 10 && expected.every((p) => oath.includes(p)), oath);
  ok("F6 fail: the declarants' own names and signatures, the jurisdiction and the links are not oath boxes", ![`${S5}NameDecl[0]`, `${S5}NamePartner[0]`, `${S5}SignatureDecl[0]`, "IMM_5409[0].Page1[0].Info[0].City[0]", `${S5}link[0]`].some((p) => oath.includes(p)));
  const steps5409 = personSteps(inv5409.fields, { [`${S5}NameDecl[0]`]: "CLIENTA EXAMPLE" }, inv5409.groups ?? []);
  const f6 = steps5409.find((s) => s.finding === "F6");
  ok("F6: filling IMM 5409 gives the person step 'at the oath' listing those boxes, said in plain words", f6?.kind === "oath" && f6.boxes.length === 10 && /never fills them/.test(f6.say) && /Declared before me/.test(f6.say), f6?.say);
  ok("F6 fail: forms with no solemn declaration (IMM 5476, IMM 1295, IMM 1344, IMM 5707) get no oath step", ["imm5476e", "imm1295e", "imm1344e", "imm5707e"].every((f) => { const i = inventory(f); return oathBoxes(i.fields).length === 0 && !personSteps(i.fields, {}, i.groups ?? []).some((s) => s.finding === "F6"); }));
  const moved = inv5409.fields.map((f) => (f.data_path === `${S5}City[0]` ? { ...f, caption: "City" } : f));
  ok("F6 fail: without the 'Declared before me' box the block is found only through the administrator's boxes (no guessing)", oathBoxes(moved).map((f) => f.data_path).join() === `${S5}AdminDecl[0],${S5}SignatureAdminDecl[0]`, oathBoxes(moved).map((f) => f.data_path));
  ok("F6 with F2: the administrator's signature is both an oath box and a signature box; neither is ever written", isOathBox(inv5409.fields, { data_path: `${S5}SignatureAdminDecl[0]` }) && isSignatureBox(inv5409.fields.find((f) => f.data_path === `${S5}SignatureAdminDecl[0]`)!));
  const box = (p: string) => inv5409.fields.find((f) => f.data_path === p)!;
  ok("F6 (fill rule, review 5): a mapped oath box is 'by a person' for the oath, a declarant's signature for signing; a name box may be written", /^the oath/.test(byAPerson(inv5409.fields, box(`${S5}City[0]`)) ?? "") && /^a signature/.test(byAPerson(inv5409.fields, box(`${S5}SignatureDecl[0]`)) ?? "") && byAPerson(inv5409.fields, box(`${S5}NameDecl[0]`)) === null);
  // Review 2: static forms mark nothing required, yet are signed: each signature is listed for the person.
  const sign5409 = steps5409.find((s) => s.finding === "F2");
  ok("F2 on a static form (review 2): IMM 5409 lists both declarants' signatures (not the administrator's: that is the oath), signed by hand", sign5409?.boxes.join() === `${S5}SignatureDecl[0],${S5}SignaturePartner[0]` && /by hand on the printed form/.test(sign5409.say), sign5409);
  const inv5476s = inventory("imm5476e");
  const sign5476 = personSteps(inv5476s.fields, {}, inv5476s.groups ?? []).find((s) => s.finding === "F2");
  ok("F2 on a static form (review 2): IMM 5476 lists its signature boxes for the person", (sign5476?.boxes.length ?? 0) >= 2 && sign5476!.boxes.every((b) => isSignatureBox(inv5476s.fields.find((f) => f.data_path === b)!)), sign5476?.boxes);
  const inv1344 = inventory("imm1344e");
  const sign1344 = personSteps(inv1344.fields, {}, inv1344.groups ?? []).find((s) => s.finding === "F2");
  ok("F2 fail: a form that marks its signatures required (IMM 1344) keeps listing only those, with 'types their own name, then Validate'", !!sign1344 && sign1344.boxes.every((b) => inv1344.fields.find((f) => f.data_path === b)?.required) && /types their own name/.test(sign1344.say));

  // ──────────────────────────────────────────── F5: page fields on static forms (the filler, no server)
  const ev = JSON.parse(readFileSync(join(PROTOTYPE, "evidence-lane", "E1", "imm5409", "values.complete.json"), "utf8")).values as Record<string, string>;
  const som = new Map(inv5409.fields.filter((f) => f.data_path).map((f) => [f.data_path!, f.som!]));
  const pages = (v: Record<string, string>, m = som) => Object.fromEntries(Object.entries(v).map(([p, x]) => [m.get(p) ?? p, x]));
  const r5409 = filler("imm5409e.pdf", ev, pages(ev), "imm5409");
  const pf = r5409.page_fields ?? {};
  ok("F5: IMM 5409 (static) as written: the 18 values are in the form data AND its page fields, each read back by a fresh reader", r5409.read_back_equal === 18 && pf.form_kind === "static" && pf.written === 18 && pf.read_back_equal === 18 && pf.shown_outside_adobe === true, { data: r5409.read_back_equal, pf, error: r5409.error });
  ok("F5: the as-written file is still intact: original bytes kept, nothing else changed, the IRCC usage-rights signature verifies, poppler opens it cleanly", r5409.intact === true && r5409.original_bytes_kept && r5409.signatures?.["/UR3"] === "verified" && r5409.poppler_syntax_errors === 0, { intact: r5409.intact, sigs: r5409.signatures });
  const text = r5409.out ? shown(r5409.out) : "";
  ok("F5: a viewer without XFA (poppler) shows the values on the page: names, place, years and dates", ["CLIENTA EXAMPLE", "PARTNER EXAMPLEP", "NEW DELHI", "2015-06-01", "2026-10-24"].every((v) => text.includes(v)));
  const blank = filler("imm5409e.pdf", ev, {}, "imm5409-data-only");
  ok("F5 fail (the finding reproduced): written as before (form data only), the same viewer shows none of the values", blank.read_back_equal === 18 && blank.page_fields?.form_kind === "none" && !["CLIENTA EXAMPLE", "NEW DELHI"].some((v) => shown(blank.out).includes(v)), blank.page_fields);
  const radio = `${"IMM_5409[0].Page1[0].Section2[0]."}yesno[0]`;
  const odd = filler("imm5409e.pdf", { [radio]: "9" }, { [radio]: "9" }, "imm5409-odd");
  ok("F5 fail: a choice value with no widget of its own on the page is not guessed: left unset, reported, not 'shown outside Adobe'", odd.page_fields?.not_set?.[0]?.name === radio && odd.page_fields.shown_outside_adobe === false && odd.page_fields.written === 0, odd.page_fields);
  const radios = filler("imm5409e.pdf", { [radio]: "1" }, { [radio]: "1" }, "imm5409-yes");
  ok("F5: a radio group's page field turns on the widget of the value written (Yes = 1), read back as 1", radios.page_fields?.read_back_equal === 1 && radios.intact === true, radios.page_fields);
  const inv5476 = inventory("imm5476e");
  const som5476 = new Map(inv5476.fields.filter((f) => f.data_path).map((f) => [f.data_path!, f.som!]));
  const v5476 = { "IMM_5476[0].Page1[0].SectionA[0].familyName[0]": "EXAMPLE", "IMM_5476[0].Page1[0].SectionA[0].givenName[0]": "CLIENTA", "IMM_5476[0].Page1[0].SectionA[0].DOB[0]": "1990-01-01" };
  const r5476 = filler("imm5476e.pdf", v5476, pages(v5476, som5476), "imm5476");
  ok("F5: IMM 5476 (the other static form) shows its values outside Adobe too, intact", r5476.page_fields?.shown_outside_adobe === true && r5476.intact === true && shown(r5476.out).includes("CLIENTA"), { pf: r5476.page_fields, error: r5476.error });
  const inv1295 = inventory("imm1295e");
  const p1295 = inv1295.fields.find((f) => f.data_path && f.ui === "textEdit")!;
  const r1295 = filler("imm1295e.pdf", { [p1295.data_path!]: "EXAMPLE" }, { [p1295.som!]: "EXAMPLE" }, "imm1295");
  ok("F5 fail: a dynamic form (IMM 1295) has no page fields for its boxes: none set, said 'dynamic', the file intact as before", r1295.page_fields?.form_kind === "dynamic" && r1295.page_fields.written === 0 && r1295.intact === true, { pf: r1295.page_fields, error: r1295.error });
  // Break M1, M2 / review 1: a page field is set only when it can draw the value exactly; "shown" means drawn.
  const first = "IMM_5409[0].Page1[0].Info[0].FirstName[0]", country = "IMM_5409[0].Page1[0].Info[0].Country[0]", other = "IMM_5409[0].Page1[0].Section4[0].TextField2[0]";
  const hostile = { [first]: "ŁUKASZ ŻÓŁĆ", [country]: "भारत", [other]: "line one\nline two" };
  const rh = filler("imm5409e.pdf", hostile, hostile, "imm5409-hostile");
  const why = (n: string) => rh.page_fields?.not_set?.find((x: { name: string }) => x.name === n)?.why ?? "";
  ok("F5 fail (break M1): letters the page font cannot draw (Polish Ł, Devanagari) are not drawn as '?': left unset with the reason, not 'shown outside Adobe'", /cannot draw/.test(why(first)) && /cannot draw/.test(why(country)) && rh.page_fields.shown_outside_adobe === false && !shown(rh.out).includes("?UKASZ"), rh.page_fields?.not_set);
  ok("F5 fail (break M2): several lines in a one-line page field are not cut to the first line: left unset with the reason", /several lines/.test(why(other)) && !shown(rh.out).includes("line one"));
  ok("F5 (break M1): those values are still in the form data, read back exactly, and the file is intact (Adobe shows them)", rh.read_back_equal === 3 && rh.intact === true, { data: rh.read_back_equal, intact: rh.intact });
  const long = { [first]: "CLIENTA " + "EXAMPLE".repeat(10) };
  const rl = filler("imm5409e.pdf", long, long, "imm5409-long");
  ok("F5 fail (break M2, m4): a name longer than the page field's width is not drawn cut off at both ends: left unset, 'too long'", /too long/.test(rl.page_fields?.not_set?.[0]?.why ?? "") && rl.page_fields.written === 0, rl.page_fields?.not_set);
  const unit = "IMM_5476[0].Page1[0].SectionB[0].question7[0].unit[0]";
  const rm = filler("imm5476e.pdf", { [unit]: "UNIT 123456789" }, { [unit]: "UNIT 123456789" }, "imm5476-maxlen");
  ok("F5 fail (break m3): a value longer than the page field's maximum length (IMM 5476 unit, 10) is not set", /maximum length|10 characters/.test(rm.page_fields?.not_set?.[0]?.why ?? ""), rm.page_fields?.not_set);
  const accents = { [first]: "JOSÉ FRANÇOIS MÜLLER" };
  const ra = filler("imm5409e.pdf", accents, accents, "imm5409-accents");
  ok("F5: letters the font does have (é, ç, ü) are drawn and read back from the drawing itself", ra.page_fields?.read_back_equal === 1 && ra.page_fields.shown_outside_adobe === true && shown(ra.out).includes("JOSÉ FRANÇOIS MÜLLER"), ra.page_fields);
  const zero = filler("imm5409e.pdf", { [radio]: "0" }, { [radio]: "0" }, "imm5409-zero");
  ok("F5 fail (break m1): a radio value that is not one of its options ('0') never turns on the widget that happens to be named /0 (Yes)", zero.page_fields?.written === 0 && zero.page_fields.not_set?.length === 1, zero.page_fields);
  const unknown = filler("imm5409e.pdf", { [first]: "X" }, { "IMM_5409[0].Nowhere[0]": "X" }, "imm5409-unknown");
  ok("F5 fail (break m2, review 6): static is read from the file: a static form whose names all miss is 'static', with the miss counted, not 'dynamic'", unknown.page_fields?.form_kind === "static" && unknown.page_fields.without_page_field === 1 && unknown.page_fields.shown_outside_adobe === false, unknown.page_fields);
  const sig1295 = filler("imm1295e.pdf", { [p1295.data_path!]: "EXAMPLE" }, { [p1295.som!]: "EXAMPLE", "IMM_1295[0].Page1[0].Sig[0]": "X" }, "imm1295-sig");
  ok("F5 fail (break m2): a dynamic form stays 'dynamic' and untouched even when a request names one of its few page fields", sig1295.page_fields?.form_kind === "dynamic" && sig1295.page_fields.written === 0 && sig1295.intact === true, sig1295.page_fields);

  // ──────────────────────────────────────────── QA-15: form codes in any case (contract, no server)
  const cap = (form: string) => NewCapture.safeParse({ portal: "ircc_portal", form, title: "Visitor visa" }).success;
  ok("QA-15: 'imm 5257', 'Imm-5257', 'imm_5257' and 'ee profile' pass the capture contract", ["imm 5257", "Imm-5257", "imm_5257", "ee profile", "IMM 5257"].every(cap));
  ok("QA-15 fail: a code that starts with a digit, holds other signs or is one letter is refused, with the reason on the field", !cap("5257") && !cap("imm 5257!") && !cap("I") && /A form code starts with a letter/.test(NewCapture.safeParse({ portal: "ircc_portal", form: "5257", title: "Visitor visa" }).error?.issues[0].message ?? ""));

  // ──────────────────────────────────────────── QA-33: A4 reuse compares the kind of box (no server)
  const inv5257 = inventory("imm5257e");
  const uci = inv5257.fields.find((f) => f.data_path && f.ui === "textEdit" && /UCI/i.test(f.caption ?? ""))!;
  const prior = (ui?: string | null): Prior => ({ data_path: uci.data_path!, caption: uci.caption ?? null, outcome: "mapped", fact: "person.uci", person: "form_subject", transform: "as_is", row: null, condition: null, edition: "IMM 5257 (01-2020)", options: null, ...(ui === undefined ? {} : { ui }) });
  ok("QA-33: a form field that is the same kind of box as in the earlier edition is reused", planDraft(inv5257, [prior("textEdit")]).reused.length === 1);
  ok("QA-33 fail: the earlier edition's date box that is a text box now (UCI) is not reused: the AI or a person drafts it", planDraft(inv5257, [prior("dateTimeEdit")]).reused.length === 0, uci.caption);
  ok("QA-33: a prior that does not know its kind of box (older callers) is compared on caption and choices as before", planDraft(inv5257, [prior(undefined)]).reused.length === 1);

  // ──────────────────────────────────────────── through the API (isolated copy, US$0)
  await call("POST", "/demo/load");
  const rowId = (k: string) => sql(`select id from combination where combination_key='${k}'`);
  const vv = rowId("vv.single"), wp = rowId("wp.family");
  let r = await call("POST", "/captures", { portal: "ircc_portal", form: "imm 5257", title: "Visitor visa (Sample)" });
  ok("QA-15 (API): a capture started with 'imm 5257' is the library's IMM 5257 (one form, one code)", r.status === 201 && r.body.form === "IMM 5257" && sql("select count(*) from gov_form_def where form_key ilike 'imm%5257'") === "1", { status: r.status, form: r.body?.form });
  const c2 = await call("POST", "/captures", { portal: "ircc_portal", form: "5257", title: "Visitor visa (Sample)" });
  ok("QA-15 fail (API): '5257' is refused with the contract's words", c2.status === 400 && /starts with a letter/.test(JSON.stringify(c2.body)), c2.body);
  const ee = await call("POST", "/captures", { portal: "ircc_portal", form: "ee_profile_", title: "Express Entry profile (Sample)" });
  ok("QA-15 (break m5): a trailing separator leaves no trailing space ('ee_profile_' is EE PROFILE)", ee.status === 201 && ee.body.form === "EE PROFILE", ee.body?.form);

  const capFirst = r.body.id as string; // the IMM 5257 capture, used by D3 below
  // ──────────────────────────────────────────── QA-34: capture and fill refusals no suite reached (P-69 coverage floor)
  const raw = async (path: string, files: [string, Uint8Array<ArrayBuffer>][]) => {
    const fd = new FormData(); for (const [n, b] of files) fd.append("files", new Blob([b]), n);
    const x = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": "user-A" }, body: fd });
    return { status: x.status, body: await x.json() };
  };
  const listed = await call("GET", "/captures?take=abc&skip=-5");
  ok("QA-34: the capture list takes odd paging values safely (default page, never a negative offset)", listed.status === 200 && Array.isArray(listed.body) && listed.body.length >= 1, listed.status);
  const k = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5532", title: "Relationship information (Sample)" })).body.id as string;
  r = await raw(`/captures/${k}/screens`, []);
  ok("QA-34 fail: adding screens with no file is refused in plain words", r.status === 400 && /at least one saved screen/.test(r.body.message), r.body?.message);
  r = await raw(`/captures/${k}/screens`, [["empty.html", new Uint8Array()]]);
  ok("QA-34 fail: an empty file is refused and nothing is added", r.status === 201 && r.body.results?.[0]?.outcome === "refused" && /empty/.test(r.body.results[0].message), r.body?.results);
  r = await call("GET", `/captures/${k}/review`);
  ok("QA-34 fail: the review document does not exist before the capture is finished (404, plain words)", r.status === 404, r.status);
  r = await call("POST", `/captures/${k}/finish`);
  ok("QA-34 fail: finishing a capture with no screen is refused with the next step", r.status === 400 && /Add at least one screen/.test(r.body.message), r.body?.message);
  const page = new Uint8Array(readFileSync(join(FIX, "portal", "imm5257-online-s1-personal.html"))) as Uint8Array<ArrayBuffer>;
  r = await raw(`/captures/${k}/screens`, [["client 1234567 page.html", page]]);
  const again = await raw(`/captures/${k}/screens`, [["same.html", page]]);
  ok("QA-34: a file name carrying a number is not kept (renamed), and the same file again is a duplicate, not a second screen", r.body.results?.[0]?.outcome === "added" && !/1234567/.test(JSON.stringify(r.body)) && again.body.results?.[0]?.outcome === "duplicate", { first: r.body.results?.[0], again: again.body.results?.[0]?.outcome });
  r = await call("POST", `/captures/${k}/approve`, undefined, "user-C");
  const ret = await call("POST", `/captures/${k}/return`, { note: "The second screen of the form is missing from this capture." }, "user-C");
  ok("QA-34 fail: an open capture can be neither approved nor returned (409, plain words)", r.status === 409 && ret.status === 409, [r.body?.message, ret.body?.message]);
  await call("POST", `/captures/${k}/finish`);
  r = await call("POST", `/captures/${k}/finish`);
  ok("QA-34 fail: a held capture cannot be finished again", r.status === 409 && /only an open capture can be finished/.test(r.body.message), r.body?.message);
  r = await call("POST", `/captures/${k}/return`, { note: "The second screen of the form is missing from this capture." });
  ok("QA-34 fail: the person who captured it cannot return it to themselves (a second person reviews)", r.status === 403, r.body?.message);
  r = await call("POST", `/captures/${k}/abandon`, { note: "test: not needed" });
  const twice = await call("POST", `/captures/${k}/abandon`, {});
  ok("QA-34: a held capture can be abandoned with a note, once; abandoning again is refused", r.status === 201 && r.body.status === "ABANDONED" && twice.status === 409, [r.body?.status, twice.status]);
  const pdfEd = sql("select id from form_edition where channel = 'PDF' limit 1");
  r = await call("POST", `/online-versions/${pdfEd}/screen-map/draft`);
  ok("QA-34 fail: a screen map is never drafted for a PDF edition", r.status === 400 && /online versions/.test(r.body.message), r.body?.message);
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "nobody", mode: "draft" });
  ok("QA-34 fail: filling a form for a person it does not apply to is a 404 in plain words", r.status === 404 && /does not apply to that person/.test(r.body.message), r.body?.message);
  r = await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal" });
  ok("QA-34: with no mode the fill uses the latest release (or says plainly why it cannot)", (r.status === 201 && r.body.label) || (r.status >= 400 && r.status < 500 && typeof r.body.message === "string"), { status: r.status, label: r.body?.label, message: r.body?.message });

  // D3: a finished draft whose proposals are waiting is reused (US$0), never paid for again.
  const capId = capFirst;
  await upload(`/captures/${capId}/screens`, ["imm5257-online-s1-personal.html", "imm5257-online-s2-marital.html", "imm5257-online-s3-language.html"]);
  await call("POST", `/captures/${capId}/finish`);
  const ed = (await call("POST", `/captures/${capId}/approve`, undefined, "user-C")).body.edition.id as string;
  await call("POST", `/online-versions/${ed}/screen-map/draft`);
  await call("POST", `/online-versions/${ed}/screen-map/accept`, {}, "user-C");
  // The Visitor visa files IMM 5257 online (the library holds only this approved online version in a fresh copy).
  await call("PATCH", `/combinations/${vv}/portal`, { portal: "ircc_portal" });
  const line = await call("POST", `/combinations/${vv}/lines`, { kind: "FORM", formKey: "IMM 5257" });
  ok("D3 setup: the Visitor visa files IMM 5257 through the IRCC Portal", line.status === 201 || line.status === 200, line.body);
  const open = sql(`select string_agg(data_path, ',' order by data_path) from form_field_map where form_edition_id='${ed}' and outcome='unresolved'`).split(",").filter(Boolean);
  r = await call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "STUB" });
  const sm = await finished(r.body.id);
  ok("D3 setup: the stub draft of the open inputs finished and named the inputs it was sent", sm.status === "COMPLETED" && open.length >= 2 && [...(sm.detail.sent_inputs ?? [])].sort().join() === [...open].sort().join(), { status: sm.status, open: open.length, sent: sm.detail?.sent_inputs?.length });
  // A completed answer, hand-written for this check (no model call): two proposals, as a finished live draft holds them.
  const answer = { canonical_fields: [], entries: [open[0], open[1]].map((i) => ({ input: i, outcome: "not_a_fact", person: "none", fact: null, transform: null, confidence: "medium", unresolved_reason: "asked only by the portal", evidence_quote: i })) };
  const proposals = screenMapProposals(answer, open.map((i) => ({ input: i, type: "text", part: null, label: i })), [], factKeyProblem);
  sql(`update drafting_job set run_id = 'hand-written-check-answer', detail = detail || '${JSON.stringify(proposals).replace(/'/g, "''")}'::jsonb where id = '${sm.id}'`);
  const jobsBefore = sql(`select count(*) from drafting_job where kind='screen_map'`);
  r = await call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "LIVE" });
  ok("D3: a live start while that draft's proposals wait reuses it: no new job, no AI call, US$0, said plainly (no cost confirmation needed)", r.status === 201 && r.body.reused === true && r.body.id === sm.id && /No new AI call \(US\$0\)/.test(r.body.reused_message) && sql(`select count(*) from drafting_job where kind='screen_map'`) === jobsBefore, { status: r.status, reused: r.body.reused, msg: r.body.reused_message ?? r.body.message });
  ok("D3: the reuse is in the history (who asked, which version, US$0)", Number(sql(`select count(*) from audit_event where action='reused' and entity='screen-map draft'`)) >= 1);
  const [x1, x2] = await Promise.all([1, 2].map(() => call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "LIVE", confirmWorstUsd: 9.99 })));
  ok("D3 fail: two live starts at the same moment are both answered with the waiting draft, never a paid job", [x1, x2].every((x) => x.status === 201 && x.body.reused) && sql(`select count(*) from drafting_job where kind='screen_map'`) === jobsBefore, [x1.status, x2.status]);
  // An open input the waiting draft was not sent: a new draft would pay again for the ones it answered → refused.
  sql(`update drafting_job set detail = jsonb_set(detail, '{sent_inputs}', '${JSON.stringify(open.slice(0, -1))}'::jsonb) where id = '${sm.id}'`);
  r = await call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "LIVE" });
  ok("D3 fail: when other inputs are open too, a new live draft is refused until the waiting proposals are decided (nothing paid)", r.status === 409 && /proposals? waiting/.test(r.body.message) && sql(`select count(*) from drafting_job where kind='screen_map'`) === jobsBefore, r.body.message);
  sql(`update drafting_job set detail = jsonb_set(detail, '{sent_inputs}', '${JSON.stringify(open)}'::jsonb) where id = '${sm.id}'`);
  await call("POST", `/online-versions/${ed}/screen-map/ai/accept`, { jobId: sm.id }, "user-C");
  r = await call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "LIVE" });
  ok("D3: once its proposals are accepted nothing waits: a new live draft of what is still open asks for its worst case again", r.status === 409 && /costs at most US\$[0-9.]+/.test(r.body.message) && !r.body.reused, r.body.message);
  r = await call("POST", `/online-versions/${ed}/screen-map/ai`, { combinationId: vv, mode: "STUB" });
  ok("D3 fail: a stub start (free) is never turned into a reuse", r.status === 201 && !r.body.reused && r.body.id !== sm.id, { status: r.status, reused: r.body?.reused });
  await finished(r.body.id);

  // F5 through the API: IMM 1295 is dynamic: no page fields set, said so in the report and the artifact.
  const f = (await call("POST", `/combinations/${wp}/fill`, { form: "IMM 1295", person: "principal", mode: "draft" })).body;
  const art = f.artifact_id ? sql(`select detail->'page_fields'->>'form_kind' from generated_artifact where id='${f.artifact_id}'`) : "";
  ok("F5 (API): the fill report and the artifact say whether page fields were set; IMM 1295 is dynamic (none), still intact", f.report?.page_fields?.form_kind === "dynamic" && f.report.page_fields.requested > 0 && art === "dynamic" && f.report.intact === true, { pf: f.report?.page_fields, art });
  ok("F6 fail (API): IMM 1295 has no oath block: no box is 'the oath' and no F6 step", !f.boxes.some((b: { why?: string }) => /the oath/.test(b.why ?? "")) && !f.person_steps.some((s: { finding: string }) => s.finding === "F6"));
  // Review 4 / break: a static form through the API (IMM 5476 for the work permit family's principal).
  const g = (await call("POST", `/combinations/${wp}/fill`, { form: "IMM 5476", person: "principal", mode: "draft" })).body;
  const shownApi = g.artifact_id ? shown(join(ROOT, sql(`select path from generated_artifact where id='${g.artifact_id}'`))) : "";
  ok("F5 (API, review 4): IMM 5476 filled through the API is static: every value written is drawn on its page field, read back, intact", g.report?.page_fields?.form_kind === "static" && g.report.page_fields.requested > 0 && g.report.page_fields.read_back_equal === g.report.page_fields.written && g.report.intact === true && shownApi.length > 0, { pf: g.report?.page_fields, error: g.message });
  ok("F2 (API, review 2): the IMM 5476 fill lists its signatures for the person; none is written", g.person_steps?.some((s: { finding: string }) => s.finding === "F2") && !g.boxes?.some((b: { result: string; why?: string }) => b.result === "written" && /signature/.test(b.why ?? "")), g.person_steps?.map((s: { finding: string }) => s.finding));

  // ──────────────────────────────────────────── evidence for the Lead and reset
  const out = join(STUDIO, "evidence", "forms-slice2b"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "f5-imm5409-report.json"), JSON.stringify({ written_with_page_fields: { ...r5409, output: "(temporary)", out: undefined }, data_only: { page_fields: blank.page_fields, read_back_equal: blank.read_back_equal } }, null, 1));
  writeFileSync(join(out, "f5-imm5409-page1-text.txt"), text);
  await call("POST", "/demo/reset", { confirm: "RESET" });
  console.log(`\n${pass}/${pass + fail} passed`);
  writeFileSync(join(out, "check_forms_slice2b.json"), JSON.stringify({ at: new Date().toISOString(), port: PORT, database: DB, paid_calls: 0, pass, fail, log }, null, 1));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
