// M3-S5 (P-113, P-171 (3), P-425): which Online form is answer-sheet only (no PDF copy) is read from the Form library's
// record of what IRCC accepts for the case's own IRCC account (engine/channels.ts answerSheetOnly), never from a list of
// form numbers in code. Forms outside the Visitor visa: IMM 0008 and IMM 5669 on Spouse or common-law partner (the PR
// Portal; Guide 5289, canada.ca, modified 2026-04-23, saved 27 Oct 2026: "You must fill out these forms within the
// portal. Do not fill out the PDF form.", samples/form-library-sample.json account_accepts, Sample) and on Express Entry
// (the IRCC secure account; the founder's record, FOUNDER_SAMPLE, P-171 (3)). Each rule has a passing and a failing case.
// Also: an Online form outside the Visitor visa gets its answer sheet in its own parts, in its own order (C7.3's rule).
// Pure: no database, no server, no model call (US$0).
//   tsx studio/tests/check_m3s5_sheet_only.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { allowedChannels, answerSheetOnly, answerSheetOnlyWords, type Accepts, type AcceptRecord } from "../engine/channels.ts";
import { copyOnlyForms, pdfForms } from "../engine/runtime/forms.ts";
import { partsInFormOrder, sheetOf, type FormPart } from "../engine/runtime/answer-sheet.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import type { BoxRow } from "../engine/render.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..");
const LINE = "You must fill out these forms within the portal. Do not fill out the PDF form.";
const portal: AcceptRecord = { account: "PR_PORTAL", channels: ["ONLINE"], basis: "SAMPLE_FIXTURE", quote: LINE };
const secure: AcceptRecord = { account: "IRCC_SECURE_ACCOUNT", channels: ["ONLINE"], basis: "FOUNDER_SAMPLE", quote: null };
/** A release of Online and PDF lines, each with IRCC's PDF and its field map (what a copy is made from). */
const release = (account: string | null, online: string[], pdf: string[]) => ({
  combination: { portal: account },
  forms: [...online.map((f) => ({ form_number: f, channel: "ONLINE" })), ...pdf.map((f) => ({ form_number: f, channel: "PDF_UPLOAD" }))],
  field_maps: [...online, ...pdf].map((f) => ({ form_number: f, channel: "PDF", official_file: `${f}.pdf` })),
} as unknown as Snapshot);

// ---------------------------------------------------------------- the record decides, for the case's own account
{
  ok("M3-S5 pass: a record that IRCC accepts the form through the case's account only Online makes it answer-sheet only (IMM 0008, PR Portal)", answerSheetOnly([portal], "PR_PORTAL") === portal);
  ok("M3-S5 fail: another account's record never applies (the PR Portal's record on a case filed through the APR Portal)", answerSheetOnly([portal], "APR_PORTAL") === null);
  ok("M3-S5 fail: no record is never answer-sheet only (every way offered, Sample: P-145's copy stays)", answerSheetOnly(undefined, "PR_PORTAL") === null && answerSheetOnly([], "PR_PORTAL") === null);
  ok("M3-S5 fail: a record that also takes a PDF upload or paper is not answer-sheet only", answerSheetOnly([{ ...portal, channels: ["ONLINE", "PDF_UPLOAD"] }], "PR_PORTAL") === null && answerSheetOnly([{ ...portal, channels: ["ONLINE", "PAPER"] }], "PR_PORTAL") === null);
  ok("M3-S5 fail: paper filing (no IRCC account) is never answer-sheet only, whatever the record", answerSheetOnly([{ ...portal, account: "ANY" }], "PAPER") === null);
  ok("M3-S5 pass: a record for every account (ANY) applies where the account has none of its own", answerSheetOnly([{ ...portal, account: "ANY" }], null)?.account === "ANY" && answerSheetOnly([{ ...portal, account: "ANY" }], "PR_PORTAL")?.account === "ANY");
  ok("M3-S5 fail: the account's own record wins over the one for every account", answerSheetOnly([{ ...portal, account: "ANY" }, { ...portal, channels: ["ONLINE", "PDF_UPLOAD"] }], "PR_PORTAL") === null);
  ok("M3-S5: answer-sheet only is exactly a record whose channels the line may take are Online alone (the same rule the Forms tab offers channels by)", allowedChannels([portal], "PR_PORTAL").channels.join() === "ONLINE");
}

// ---------------------------------------------------------------- no PDF copy for those forms; P-145 holds for the rest
{
  const accepts: Accepts = new Map([["IMM 0008", [portal]], ["IMM 5669", [portal, secure]], ["IMM 5406", [portal, secure]]]);
  const spouse = release("PR_PORTAL", ["IMM 0008", "IMM 5669", "IMM 5406", "IMM 5257"], ["IMM 1344", "IMM 5532"]);
  const copies = copyOnlyForms(spouse, accepts);
  ok("M3-S5 pass: on Spouse or common-law partner (PR Portal) IMM 0008, IMM 5669 and IMM 5406 make no PDF copy: the answer sheet only", !copies.has("IMM 0008") && !copies.has("IMM 5669") && !copies.has("IMM 5406"), [...copies]);
  ok("M3-S5 fail: an Online form with no such record still gets its \"Copy, not for filing\" (P-145)", copies.has("IMM 5257"), [...copies]);
  ok("M3-S5 fail: the PDF forms of the same release are untouched (still filled as PDFs)", ["IMM 1344", "IMM 5532"].every((f) => pdfForms(spouse).has(f)) && !copies.has("IMM 1344"));
  const ee = release("IRCC_SECURE_ACCOUNT", ["IMM 5669", "IMM 5406"], ["IMM 0008"]);
  ok("M3-S5 pass: on Express Entry (IRCC secure account) IMM 5669 and IMM 5406 make no PDF copy, from the founder's record (P-171 (3)), not a list in code", copyOnlyForms(ee, accepts).size === 0);
  ok("M3-S5 fail: the same Online forms on a release with no IRCC account get a copy (no record is read for it)", copyOnlyForms(release(null, ["IMM 5669", "IMM 5406"], []), accepts).size === 2);
  ok("M3-S5 fail: without the library's records every Online form with IRCC's PDF gets its copy (nothing is decided by form number)", copyOnlyForms(ee, new Map()).size === 2);
  const words = answerSheetOnlyWords("IMM 0008", portal);
  ok("M3-S5: the reason names the form, the account and IRCC's own line (P-170), never a program", /IMM 0008/.test(words) && /through the PR Portal only Online/.test(words) && words.includes(LINE) && !/Express Entry|Visitor/.test(words), words);
  ok("M3-S5: a record with no line (the founder's) says so in words without one", !/IRCC's line/.test(answerSheetOnlyWords("IMM 5669", secure)) && /through the IRCC secure account only Online/.test(answerSheetOnlyWords("IMM 5669", secure)));
}

// ---------------------------------------------------------------- the shipped records cite IRCC's own line (P-170)
{
  const f = JSON.parse(readFileSync(join(STUDIO, "samples", "form-library-sample.json"), "utf8")) as { account_accepts?: { records?: { form: string; account: string; channels: string[]; quote: string; url: string; read: string }[] } };
  const recs = f.account_accepts?.records ?? [];
  ok("M3-S5 (P-170): each shipped account record has IRCC's line, its canada.ca page and the date it was read", recs.length === 4 && recs.every((r) => r.quote === LINE && /^https:\/\/www\.canada\.ca\/.*guide-5289/.test(r.url) && /^\d{4}-\d{2}-\d{2}$/.test(r.read)), recs.map((r) => r.form));
  const page = readFileSync(join(STUDIO, "..", "..", "official-sources", "ircc", "instructions", "guide-5289.html"), "utf8").replace(/<[^>]+>/g, " ").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");
  ok("M3-S5 (P-170): the line is on the recorded Guide 5289 page, under its \"digital forms\" list naming those forms", page.includes("You must fill out these forms within the portal. Do not fill out the PDF form") && ["IMM 0008", "IMM 5669", "IMM 5406", "IMM 5562"].every((x) => page.includes(`(${x})`)));
}

// ---------------------------------------------------------------- an Online form outside the Visitor visa gets its sheet
{
  const parts: FormPart[] = [
    { key: "addresses", title: "Addresses", named: true, fieldKeys: ["IMM_5669[0].Page3[0].Addresses[0].From[0]"] },
    { key: "your_full_name", title: "Your full name", named: true, fieldKeys: ["IMM_5669[0].Page1[0].FullName[0].Family[0]"] },
    { key: "father", title: "Personal details of your father", named: true, fieldKeys: ["IMM_5669[0].Page1[0].Father[0].Family[0]"] },
  ];
  const order = ["IMM_5669[0].Page1[0].FullName[0].Family[0]", "IMM_5669[0].Page1[0].Father[0].Family[0]", "IMM_5669[0].Page3[0].Addresses[0].From[0]"];
  const box = (b: string, fact: string, about: string, value: unknown, coverage: BoxRow["coverage"]): BoxRow => ({ box: b, caption: fact, fact, meaning: null, about, about_label: about === "p" ? "Client A" : "Client A's father", row: null, coverage, detail: "", value });
  const boxes = [box(order[2], "person.address_history", "p", null, "unresolved"), box(order[0], "person.family_name", "p", "SAMPLE", "confirmed fact"), box(order[1], "person.family_name", "p/parent_1", null, "unresolved")];
  const s = sheetOf({ basis: "form_parts", parts: partsInFormOrder(parts, order) }, boxes, () => "questionnaire", new Map([["person.family_name", "Family name"]]), new Map());
  ok("M3-S5 pass: IMM 5669's answer sheet is in its own parts, in the order its fields run (full name, father, addresses), whatever order they were proposed in", s.order_basis === "form_parts" && s.sections.map((x) => x.key).join() === "your_full_name,father,addresses", s.sections.map((x) => x.key));
  ok("M3-S5 pass: a confirmed answer is there to copy, with its person and source", s.sections[0].answers[0]?.copy_text === "SAMPLE" && s.sections[0].answers[0]?.source === "Client");
  ok("M3-S5 fail: an answer not given yet is only waited for, never shown as a value (the father's family name, the address history)", s.sections[1].answers.length === 0 && s.sections[1].waiting.length === 1 && s.sections[2].waiting[0]?.fact === "person.address_history");
}

process.exit(summary() ? 1 : 0);
