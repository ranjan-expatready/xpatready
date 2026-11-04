// C3.4 AI step (forms; P-149 (5), P-158, P-134, P-175, P-227): a form edition's checks and document types, and a guide's
// checks, drafted by two AI rounds, Live or Saved. Proves with NO model call (US$0):
//   E  the rules over the rounds (engine/masters-ai.ts): the source's own words, the 11 operators over its own boxes or
//      answers, two or three examples that hold, Ready only when both rounds agree, an identity document never read by AI;
//   P  the prompts each step uses (v2, P-296 (3)) show a worked tree, and every worked tree and example in them passes
//      the same rules (the three v1 prompts the #669 rounds read showed none); the form's output limit is 16,000;
//   L  Live with the live switch off is refused at US$0 before anything runs, and no job is written (P-175);
//   S  Saved with nothing recorded is refused in plain words at US$0; Saved with a recorded run (launcher-shaped, made
//      from the real launcher's stub pass of the committed job) replays both rounds into To review at US$0, once per
//      edition: IMM 5257's sections and answer lists (rules) with its checks and document types (AI); guide 5256's checks;
//      a recorded run under another edition's key is never used.
// Files it writes (simulated runs, stub runs) are removed after; the committed stub passes and canary digest are restored.
//   zsh studio/tools/isolated.sh forms_c34ai 4454 start && tsx studio/tests/check_forms_c34_ai.ts 4454 xr_studio_forms_c34ai
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4454), DB = process.argv[3] ?? "xr_studio_forms_c34ai";
process.env.DATABASE_URL = `postgresql://xr_studio@127.0.0.1:54329/${DB}`; // before the app's modules are loaded (core.ts reads it once)
const STUDIO = join(import.meta.dirname, ".."), PROTOTYPE = join(STUDIO, ".."), ROOT = join(PROTOTYPE, "..", "..", "..");
const P2 = join(PROTOTYPE, "p2"), RUNS = join(P2, "runs");
const log: unknown[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("psql", [process.env.DATABASE_URL!, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
// As the PA check (break M2): simulated live runs are stamped 1 Jan 2000 (never outrank a real run) and tagged (gitignored).
// Each simulated run has its own time on 1 Jan 2000, in the order recorded: Saved pairs a checker with the draft recorded
// just before it (break B1), as the paid runner records them. The tag keeps them gitignored (.gitignore: 20000101t*-pacheck).
let seq = 0;
const stamp = () => `-live-20000101t${String(++seq).padStart(9, "0")}z-pacheck${process.pid}x`;
const written: string[] = [], kept = new Map<string, Buffer | null>();
const keep = (f: string) => { if (!kept.has(f)) kept.set(f, existsSync(f) ? readFileSync(f) : null); };
// The C3.4 v2 rerun (3 Nov) committed the Mac paid runner's real C3.4 runs. This check proves the replay rules with its own
// simulated runs (the saved result itself is acceptance/C3.4.test.ts), so the real ones are set aside in the copy's var
// folder while it runs and put back after, also on Ctrl-C or a stop; a folder a killed check left is put back first.
const MASTERS_LIVE = /^studio-masters-.+-live-\d{8}t\d{9}z-[a-z0-9]+\.json$/;
const aside = join(STUDIO, "var", `c34-real-runs-${process.pid}`);
const putBack = (dir = aside) => { if (!existsSync(dir)) return; for (const f of readdirSync(dir)) renameSync(join(dir, f), join(RUNS, f)); rmSync(dir, { recursive: true, force: true }); };
const setAside = () => {
  const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  for (const d of existsSync(join(STUDIO, "var")) ? readdirSync(join(STUDIO, "var")).filter((x) => /^c34-real-runs-\d+$/.test(x)) : []) if (!alive(Number(d.slice(14)))) putBack(join(STUDIO, "var", d));
  mkdirSync(aside, { recursive: true });
  for (const f of readdirSync(RUNS).filter((x) => MASTERS_LIVE.test(x) && !x.includes("pacheck"))) renameSync(join(RUNS, f), join(aside, f));
};
const cleanUp = () => { for (const f of written) rmSync(f, { force: true }); for (const [f, b] of kept) { if (b === null) rmSync(f, { force: true }); else writeFileSync(f, b); } putBack(); };
for (const [sig, code] of [["SIGINT", 130], ["SIGTERM", 143]] as const) process.on(sig, () => { cleanUp(); process.exit(code); });

import { CHOICE, DETAILS, FORM_ANSWER, formCheck, GUIDE_ANSWER, guideCheck, passport } from "./fixtures/c34-answers.ts";
import { CODED_IDENTITY, isIdentityName } from "../engine/identity-documents.ts"; // QA-195
import { evaluate } from "../../contracts/rules.ts";

(async () => {
  setAside();
  // ---------------------------------------------------------------- E: the rules over the rounds (pure, no server)
  const m = await import("../engine/masters-ai.ts");
  const { printedChoices } = await import("../api/src/form-masters.ts");
  const inv = JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5257e.inventory.json"), "utf8")) as { fields: { data_path?: string; caption?: string; heading?: string; presence?: string; options?: unknown; options_resolved?: unknown }[] };
  const boxes = inv.fields.filter((f) => f.data_path && !/invisible|hidden/i.test(String(f.presence ?? ""))).map((f) => ({ path: f.data_path!, words: [f.caption, f.heading].filter(Boolean).join(" \n "), choices: printedChoices(f) }));
  const FS = { file: "imm5257e.pdf", sha256: "0".repeat(64), edition: "IMM 5257 (09-2023)", printed: "IMM 5257 (09-2023)", boxes };
  const r = (output: any, from: "replay" | "live" = "replay") => ({ output, from, runFile: "prototype/p2/runs/x.json", costUsd: 0 });
  const both = (a: any, b: any = a) => m.formMastersFromRounds({ draft: r(a), check: r(b) }, FS, { runId: "00000000-0000-4000-8000-000000000001" });
  let e = both(FORM_ANSWER);
  const fc = e.items.find((x) => x.kind === "form_check"), dt = e.items.find((x) => x.kind === "document_type");
  ok("C3.4 E pass: both rounds give the same form check: Ready, agreed, its 3 examples run and hold, unconfirmed until the expert", fc?.confidence === "ready" && fc?.agreement === "agreed" && (fc?.payload as any).examples.length === 3 && (fc?.payload as any).examples.every((x: any) => x.confirmedBy === null) && fc?.rules.every((x) => x.passed), fc);
  ok("C3.4 E pass: the passport is proposed as a document type read by its coded lines, never by AI (P-134), resting on the form's printed words", dt?.confidence === "ready" && (dt?.payload as any).readerKind === "coded_lines" && (dt?.payload as any).identityDocument === true && dt?.source?.quote === "Passport number", dt?.payload);
  ok("C3.4 E pass: what the AI could not express is kept as unresolved, never dropped silently", e.unresolved.length === 1 && e.dropped.length === 0, e.unresolved);
  const bad = (patch: any) => both({ ...FORM_ANSWER, checks: [{ ...formCheck, ...patch }], document_types: [] });
  e = bad({ quote: "If you answered yes, please give us everything." });
  ok("C3.4 E fail: a check whose words are not printed on the form is not proposed, with the reason (M1)", !e.items.length && /not printed on IMM 5257/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ reads: [CHOICE, "form1[0].Barcodes[0].PaperFormsBarcode1[0]"] });
  ok("C3.4 E fail: a check that reads a box not visible on this edition is not proposed (M2)", !e.items.length && /not a visible form field/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ reads: [CHOICE] });
  ok("C3.4 E fail: a check whose condition reads a box it does not name is not proposed (M2)", !e.items.length && /does not name/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ tree_json: JSON.stringify({ op: "between", field: CHOICE, value: 1 }) });
  ok("C3.4 E fail: a condition outside the 11 operators is not proposed (M2)", !e.items.length && /11 operators/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ examples: [formCheck.examples[0]] });
  ok("C3.4 E fail: a check with fewer than two worked examples is not proposed (P-149 (5), M3)", !e.items.length && /fewer than two/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ examples: [formCheck.examples[0], formCheck.examples[1], { ...formCheck.examples[2], expected: false }] });
  ok("C3.4 E fail: an example that its condition answers otherwise makes the check Check, naming the example (M3)", e.items[0]?.confidence === "check" && /Example 3/.test(e.items[0]?.reason ?? ""), e.items[0]?.reason);
  e = both(FORM_ANSWER, { ...FORM_ANSWER, checks: [{ ...formCheck, tree_json: JSON.stringify({ op: "exists", field: DETAILS }), examples: [{ facts_json: JSON.stringify({ [DETAILS]: "x" }), expected: true }, { facts_json: "{}", expected: false }] }] });
  const differ = e.items.find((x) => x.kind === "form_check");
  ok("C3.4 E fail: the same boxes with another condition is Check, both readings kept (M4)", differ?.agreement === "differ" && differ?.confidence === "check" && !!differ?.rounds.draft && !!differ?.rounds.check, differ?.agreement);
  e = both(FORM_ANSWER, { checks: [], document_types: [], unresolved: [] });
  ok("C3.4 E fail: an item only one round gives is Decide (M4)", e.items.length === 2 && e.items.every((x) => x.confidence === "decide" && x.agreement === "one_round" && x.rounds.check === null), e.items.map((x) => x.confidence));
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, reader: "letter_or_record" }] });
  ok("C3.4 E fail: an identity document the AI would read is set to a person's reading and flagged Check (P-134, M5)", (e.items[0]?.payload as any)?.readerKind === "person_only" && e.items[0]?.confidence === "check" && e.items[0]?.rules.some((x) => x.rule === "identity_not_read_by_ai" && !x.passed), e.items[0]?.payload);
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, reader: "letter_or_record", identity_document: false }] });
  ok("C3.4 E fail (review M2): an identity-category document both readings call not identity is still never AI-read (P-134)", (e.items[0]?.payload as any)?.readerKind === "person_only" && (e.items[0]?.payload as any)?.identityDocument === true && e.items[0]?.confidence === "check", e.items[0]?.payload);
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, category: "travel", reader: "letter_or_record", identity_document: false }] }, { ...FORM_ANSWER, checks: [], document_types: [{ ...passport, category: "travel" }] });
  ok("C3.4 E fail (review M2): when only the checker says identity, the draft's payload a person accepts is not AI-read either (P-134)", (e.items[0]?.payload as any)?.readerKind === "person_only" && (e.items[0]?.payload as any)?.identityDocument === true && (e.items[0]?.rounds.draft?.payload as any)?.readerKind === "person_only" && e.items[0]?.confidence !== "ready", { payload: e.items[0]?.payload, confidence: e.items[0]?.confidence });
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, category: "financial", name: "Bank statement", proves: "funds for the stay", reader: "letter_or_record", identity_document: false, quote: "Passport number" }] });
  ok("C3.4 E pass: a document that is not an identity document keeps its letter reader", (e.items[0]?.payload as any)?.readerKind === "letter_or_record" && (e.items[0]?.payload as any)?.identityDocument === false && e.items[0]?.confidence === "ready", e.items[0]?.payload);
  // QA-195 (P-134, P-153 (1)): the name decides too (engine/identity-documents.ts), never only a flag or a category.
  e = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, name: "Passport", category: "travel", reader: "letter_or_record", identity_document: false }] });
  ok("QA-195 C3.4 E fail: \"Passport\" in category \"travel\", flagged not identity by both readings with an AI reader, is an identity document set to a person's reading and flagged Check",
    (e.items[0]?.payload as any)?.identityDocument === true && (e.items[0]?.payload as any)?.readerKind === "person_only" && e.items[0]?.confidence === "check" && e.items[0]?.rules.some((x) => x.rule === "identity_not_read_by_ai" && !x.passed), e.items[0]?.payload);
  const named = ["National identity card", "national_id_card", "Birth certificate", "Refugee travel document", "Permanent resident card", "Copy of passports", "Driver's licence", "Citizenship certificate", "Passport photo page",
    // break B3–B5: short names, misspellings, look-alike and invisible characters, other languages
    "Photo ID", "proof of identity", "Travel doc", "Confirmation of Permanent Residence", "Driving licence", "Passeport", "ePassport", "Passport photo and information page", "Driver\u2019s licence", "\uff30\uff41\uff53\uff53\uff50\uff4f\uff52\uff54", "travel\u00a0document", "Pass\u200bport", "P\u0430ssport", "Carte d'identit\u00e9", "Personalausweis", "Aadhaar card",
    // review Major 1 on 369e4cf06: IRCC's own wording, and French editions
    "Photo identification", "Identification document", "Certificate of identity", "Certificate of citizenship", "Certificate of birth", "PRTD", "Driving permit", "Acte de naissance", "Titre de voyage", "Permis de conduire", "Carte de r\u00e9sident permanent", "Certificat de citoyennet\u00e9",
    // #882 break B3: other scripts' look-alikes (Armenian, Cyrillic outside the map, Cherokee), dotless i, small capitals, invisible separators
    "Passp\u0585rt", "I\u0501entity card", "Ident\u0131ty card", "\u13e2assport", "Passpor\u1d1b", "Pass\u180eport", "Pass\u2062port", "Pass\u3164port"].map((name) => {
    const x = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, name, category: "other", reader: "letter_or_record", identity_document: false }] }).items[0];
    return { name, identity: (x?.payload as any)?.identityDocument, reader: (x?.payload as any)?.readerKind };
  });
  ok("QA-195 C3.4 E fail: other identity documents by name (identity card, birth certificate, travel document, PR card, driver's licence…) are never AI-read", named.every((x) => x.identity === true && x.reader === "person_only"), named);
  const byCategory = ["Identit\u00e9", "identification", "ID", "id_documents", "id\u0435ntity"].map((category) => {
    const x = both({ ...FORM_ANSWER, checks: [], document_types: [{ ...passport, name: "Holder's document", category, reader: "letter_or_record", identity_document: false }] }).items[0];
    return { category, identity: (x?.payload as any)?.identityDocument, reader: (x?.payload as any)?.readerKind };
  });
  ok("QA-195 C3.4 E fail (#882 break B8): a category that names identity in other words (Identit\u00e9, identification, ID, id_documents, a look-alike letter) makes it an identity document, never AI-read", byCategory.every((x) => x.identity === true && x.reader === "person_only"), byCategory);
  const notId = ["Passport-size photo", "Passport-sized photo", "Two passport photos", "Proof of travel", "Travel history", "Bank statement", "Marriage certificate", "Police certificate"].map((name) => ({ name, identity: isIdentityName(name) }));
  ok("QA-195 pass: a passport-size photo, proof of travel, a bank statement or a marriage certificate is not an identity document by name", notId.every((x) => !x.identity), notId);
  ok("QA-195 pass: the C2.6 checklist keeps its coded-lines list (a passport or travel document; never a photo)", CODED_IDENTITY.test("passport information page copy") && CODED_IDENTITY.test("travel document") && !CODED_IDENTITY.test("visa application photos"));
  e = bad({ tree_json: JSON.stringify({ op: "and", args: [{ op: "eq", field: CHOICE, value: "Yes" }, { op: "eq", field: CHOICE, value: "No" }] }), examples: [{ facts_json: JSON.stringify({ [CHOICE]: "Yes" }), expected: false }, { facts_json: JSON.stringify({ [CHOICE]: "No" }), expected: false }] });
  ok("C3.4 E fail (break B5): a check that can never pass, with only failing examples, is not proposed", !e.items.length && /both a passing and a failing/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ tree_json: JSON.stringify({ op: "or", args: [{ op: "exists", field: CHOICE }, { op: "not", arg: { op: "exists", field: CHOICE } }] }), examples: [{ facts_json: JSON.stringify({ [CHOICE]: "Yes" }), expected: true }, { facts_json: "{}", expected: true }] });
  ok("C3.4 E fail (break B5): a check that always passes, with only passing examples, is not proposed", !e.items.length && /both a passing and a failing/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = bad({ quote: "ort numb" });
  const e2 = bad({ quote: "of the" });
  ok("C3.4 E fail (break minor): a fragment of the form's words (\"ort numb\", \"of the\") is not its quote (M1)", !e.items.length && !e2.items.length, [e.dropped[0]?.why, e2.dropped[0]?.why]);
  ok("C3.4 E fail: an answer of the wrong shape is never used (shape check)", !m.formShapeOk({ checks: [{ sentence: "x" }], document_types: [], unresolved: [] }) && m.formShapeOk(FORM_ANSWER) && m.guideShapeOk(GUIDE_ANSWER) && !m.guideShapeOk(FORM_ANSWER));
  const guideText = String(JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "guide-5256.text.inventory.json"), "utf8")).text);
  const GS = { file: "prototype/p1/inventory/guide-5256.text.inventory.json", sha256: "0".repeat(64), text: guideText, code: "Guide 5256" };
  const g = (a: any, facts: { key: string; names: string[] }[], b: any = a) => m.guideMastersFromRounds({ draft: r(a), check: r(b) }, GS, facts, { runId: "00000000-0000-4000-8000-000000000001", combinationId: "00000000-0000-4000-8000-000000000002" });
  let ge = g(GUIDE_ANSWER, [{ key: "person.passport_number", names: ["Passport number"] }]);
  ok("C3.4 E pass: a guide check over a library question reads its key, Ready when both rounds agree, on the combination", ge.items[0]?.kind === "form_check" && ge.items[0]?.confidence === "ready" && (ge.items[0]?.payload as any).reads[0] === "person.passport_number" && ge.items[0]?.landsOn === "combination" && JSON.stringify((ge.items[0]?.payload as any).examples[0].facts) === JSON.stringify({ "person.passport_number": "AB123456" }), ge.items[0]?.payload);
  ge = g(GUIDE_ANSWER, []);
  ok("C3.4 E fail: a guide check over an answer that is not a library question is Decide, saying which (M6)", ge.items[0]?.confidence === "decide" && /"Passport number" is not a question/.test(ge.items[0]?.reason ?? ""), ge.items[0]?.reason);
  ge = g({ checks: [{ ...guideCheck, quote: "Passports must be valid for six months." }], unresolved: [] }, []);
  ok("C3.4 E fail: a guide check whose sentence is not in the guide is not proposed (M1)", !ge.items.length && /not in Guide 5256's text/.test(ge.dropped[0]?.why ?? ""), ge.dropped[0]);
  ge = g({ checks: [{ ...guideCheck, needs_calculation: "days from the application date to the passport expiry date" }], unresolved: [] }, [{ key: "person.passport_number", names: ["Passport number"] }]);
  ok("C3.4 E fail: a guide check that needs a calculation is kept for a person as Decide, never dropped (M6)", ge.items[0]?.confidence === "decide" && /calculation/.test(ge.items[0]?.reason ?? ""), ge.items[0]?.reason);
  const cross = { ...guideCheck, group: "cross_record", reads: ["Passport number", "Family name"], tree_json: JSON.stringify({ op: "and", args: [{ op: "exists", field: "passport_number" }, { op: "exists", field: "family_name" }] }),
    examples: [{ facts_json: JSON.stringify({ passport_number: "A", family_name: "B" }), expected: true }, { facts_json: JSON.stringify({ family_name: "B" }), expected: false }] };
  ge = g({ checks: [cross], unresolved: [] }, [{ key: "person.passport_number", names: ["Passport number"] }, { key: "person.family_name", names: ["Family name"] }]);
  ok("C3.4 E pass: a guide check over two answers is a cross-answer check that only warns (contract), even when the AI said block", ge.items[0]?.kind === "cross_check" && (ge.items[0]?.payload as any).severity === "warn" && (ge.items[0]?.payload as any).reads.length === 2, ge.items[0]?.payload);

  // Review M1 / break M1 on the v2 prompts (P-296 (3)): a choice value is one of the box's printed choices, in its words.
  const PCR = "form1[0].Page1[0].PersonalDetails[0].PCRIndicator[0]", PREV = "form1[0].Page1[0].PersonalDetails[0].PreviousCOR[0].Row2[0].Country[0]";
  const pcrCheck = (yes: unknown, no: unknown) => ({ sentence: "When residence in another country is declared, the country is given", reads: [PCR, PREV], subject_kind: "PRINCIPAL",
    tree_json: JSON.stringify({ op: "or", args: [{ op: "neq", field: PCR, value: yes }, { op: "exists", field: PREV }] }), quote: "If you replied Yes to question 8 A, please give your previous country",
    examples: [{ facts_json: JSON.stringify({ [PCR]: yes }), expected: false }, { facts_json: JSON.stringify({ [PCR]: no }), expected: true }] });
  const pcr = (yes: unknown, no: unknown) => ({ checks: [pcrCheck(yes, no)], document_types: [], unresolved: [] });
  ok("C3.4 E setup: IMM 5257's Yes/No box carries its choices only in options, and they reach the rules", JSON.stringify(boxes.find((b) => b.path === PCR)?.choices) === JSON.stringify([["* No", "N"], ["* Yes", "Y"]]), boxes.find((b) => b.path === PCR)?.choices);
  e = both(pcr("* Yes", "* No"), pcr("Y", "N"));
  ok("C3.4 E pass: one reading writes the printed words (\"* Yes\"), the other the export code (\"Y\"): the same check, Ready, written in the printed words", e.items.length === 1 && e.items[0].confidence === "ready" && e.items[0].agreement === "agreed" && JSON.stringify((e.items[0].payload as any).tree).includes('"value":"* Yes"') && !e.dropped.length, { c: e.items[0]?.confidence, tree: (e.items[0]?.payload as any)?.tree, dropped: e.dropped });
  e = both(pcr("*Yes", "*No"), pcr("* Yes", "* No"));
  ok("C3.4 E pass: a spacing variant of the printed words (\"*Yes\") is the same choice, and both readings agree", e.items[0]?.confidence === "ready" && JSON.stringify((e.items[0]?.payload as any).tree).includes('"value":"* Yes"'), e.items[0]?.confidence);
  e = both(pcr("Maybe", "* No"));
  ok("C3.4 E fail: a value that is not one of the box's printed choices is not proposed (its check could never fail), with the reason", !e.items.length && /not one of that form field's printed choices/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  e = both(pcr(true, "* No"));
  ok("C3.4 E fail: a true/false value on a choice box is not one of its printed choices either", !e.items.length && /printed choices/.test(e.dropped[0]?.why ?? ""), e.dropped[0]);
  // Review round 2 M1: choices by the shape each box kind is stored in, never rows of a column list or a check box's states.
  const inv5645 = JSON.parse(readFileSync(join(PROTOTYPE, "p1", "inventory", "imm5645e.inventory.json"), "utf8")) as { fields: any[] };
  const mstat = printedChoices(inv5645.fields.find((f) => /ChildMStatus\[0\]$/.test(f.data_path ?? ""))) as [string, string][];
  ok("C3.4 E pass (review round 2 M1): a drop-down stored as two columns gives each choice its own words and code (IMM 5645 marital status)", Array.isArray(mstat) && mstat.length === 8 && m.choiceOf(mstat, "Common-law") === "Common-law" && m.choiceOf(mstat, "Married-physically present") === "Married-physically present" && m.choiceOf(mstat, "2") === "Common-law", mstat);
  const visa = boxes.find((b) => /VisaType\[0\]\.VisaType\[0\]$/.test(b.path))?.choices as [string, string][];
  ok("C3.4 E pass (review round 2 M1): IMM 5257's column-stored drop-down (Visa requested) gives its printed words, its blank row left out", JSON.stringify(visa) === JSON.stringify([["Visitor Visa", "VisitorVisa"], ["Transit", "Transit"]]) && m.choiceOf(visa, "VisitorVisa") === "Visitor Visa", visa);
  const BOX = "form1[0].Page2[0].ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0].Other[0]", PHONE = "form1[0].Page2[0].ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0].NumberCountry[0]";
  const boxCheck = (leaf: any) => ({ checks: [{ sentence: "When the telephone is not a Canada/US number, it is given", reads: [BOX, PHONE], subject_kind: "PRINCIPAL", tree_json: JSON.stringify({ op: "or", args: [leaf, { op: "exists", field: PHONE }] }), quote: "Other \n Telephone no.",
    examples: [{ facts_json: JSON.stringify({ [BOX]: "1" }), expected: false }, { facts_json: JSON.stringify({ [BOX]: "0" }), expected: true }] }], document_types: [], unresolved: [] });
  const e2a = both(boxCheck({ op: "neq", field: BOX, value: "1" }));
  const e2b = both(boxCheck({ op: "not", arg: { op: "exists", field: BOX } }));
  ok("C3.4 E fail (review round 2 M1): a check that reads a check box (its value, or whether it exists) is not proposed, never turned into another state", boxes.find((b) => b.path === BOX)?.choices === "check_box" && !e2a.items.length && /check box/.test(e2a.dropped[0]?.why ?? "") && !e2b.items.length && /check box/.test(e2b.dropped[0]?.why ?? ""), [e2a.dropped[0], e2b.dropped[0]]);

  // ---------------------------------------------------------------- P: the prompts (P-296 (3); #669 review minors 1, 3)
  // #669: three v1 prompts showed no worked tree, so the AI wrote its own shapes and the rules dropped every item. Each
  // prompt a step uses must show at least one worked tree, and every worked tree and example in it must pass the same
  // rules the AI's answers meet (treeOf: the 11 operators over its own reads; runExamples: both outcomes, each holding).
  const PROMPTS = join(P2, "prompts");
  const worked = (file: string, text = readFileSync(join(PROMPTS, file), "utf8")) => {
    // Each fenced block and each inline span, with where it starts (fenced blocks blanked out before inline spans are read).
    const fenced = [...text.matchAll(/```\n([\s\S]*?)```/g)].map((x) => ({ at: x.index!, t: x[1] }));
    const inline = [...text.replace(/```[\s\S]*?```/g, (b) => " ".repeat(b.length)).matchAll(/`([^`\n]+)`/g)].map((x) => ({ at: x.index!, t: x[1] }));
    const parsed = [...fenced, ...inline].sort((a, b) => a.at - b.at).flatMap(({ at, t }) => { try { let v = JSON.parse(t); if (typeof v === "string") v = JSON.parse(v); return v && typeof v === "object" ? [{ at, v }] : []; } catch { return []; } });
    const trees = parsed.filter((x) => typeof x.v.op === "string").map((x) => x.v), entries = parsed.filter((x) => typeof x.v.tree_json === "string").map((x) => x.v);
    const bad: string[] = [];
    for (const t of trees) { const r = m.treeOf(JSON.stringify(t), "PRINCIPAL", new Set(m.fieldsOf(t))); if ("why" in r) bad.push(`tree: ${r.why}`); }
    for (const en of entries) {
      const r = m.treeOf(en.tree_json, en.subject_kind, new Set(/guide/.test(file) ? en.reads.map(m.snake) : en.reads));
      if ("why" in r) { bad.push(`entry: ${r.why}`); continue; }
      const ex = m.runExamples(r, en.examples);
      if ("why" in ex) bad.push(`entry: ${ex.why}`); else if (ex.wrong) bad.push(`entry: ${ex.wrong}`);
    }
    // An inline example ("`{facts}` → true") holds for the nearest worked tree before it in the text.
    const claims = [...text.matchAll(/`(\{[^`\n]*\})` → (true|false)/g)];
    for (const c of claims) {
      const near = parsed.filter((x) => x.at < c.index! && (typeof x.v.op === "string" || typeof x.v.tree_json === "string")).pop();
      if (!near) { bad.push(`example ${c[1]} follows no worked tree`); continue; }
      const got = evaluate(typeof near.v.op === "string" ? near.v : JSON.parse(near.v.tree_json), JSON.parse(c[1])).result;
      if (got !== (c[2] === "true")) bad.push(`example ${c[1]} gives ${got}, the prompt says ${c[2]}`);
    }
    // Break M2: a guide tree's fields are already in the tool's snake case; a form tree's choice values are the printed
    // words of the listing the prompt names for its made-up choice box (break M1: never another spelling, never the code).
    const allTrees = [...trees, ...entries.map((en) => JSON.parse(en.tree_json))];
    if (/guide/.test(file)) for (const f of allTrees.flatMap((t) => m.fieldsOf(t))) if (f !== m.snake(f)) bad.push(`field ${f} is not the tool's snake case (${m.snake(f)})`);
    if (!/guide/.test(file)) {
      const listing = /choice box list(?:s|ing) `(\[\[[^`]*\]\])`/.exec(text)?.[1];
      const choices = listing ? (JSON.parse(listing) as [string, string][]) : [];
      const leaves: any[] = []; const walk = (n: any) => { if (!n || typeof n !== "object") return; if (n.field) leaves.push(n); (n.args ?? []).forEach(walk); if (n.arg) walk(n.arg); };
      allTrees.forEach(walk);
      for (const l of leaves.filter((x) => /Choice\[0\]$/.test(x.field) && x.op !== "exists")) for (const v of [l.value].flat()) if (!choices.some(([w]) => w === v)) bad.push(`choice value ${JSON.stringify(v)} is not the printed words of ${JSON.stringify(choices)}`);
      if (!choices.length && leaves.some((x) => /Choice\[0\]$/.test(x.field))) bad.push("its choice box's listing is not stated");
    }
    return { shown: trees.length + entries.length, claims: claims.length, bad };
  };
  const { MASTERS_FORM_AI, MASTERS_GUIDE_AI } = await import("../api/src/form-masters.ts");
  ok("C3.4 P pass: the steps use the v2 prompts; the form's output limit is 16,000 (its v1 draft stopped at 8,000, #669), the guide's stays 6,000",
    MASTERS_FORM_AI.template === "masters-form.v2.md" && MASTERS_FORM_AI.check === "masters-form-check.v2.md" && MASTERS_GUIDE_AI.template === "masters-guide.v2.md" && MASTERS_GUIDE_AI.check === "masters-guide-check.v2.md"
    && MASTERS_FORM_AI.max_output_tokens === 16000 && MASTERS_GUIDE_AI.max_output_tokens === 6000 && !MASTERS_FORM_AI.replays && !MASTERS_GUIDE_AI.replays, { form: MASTERS_FORM_AI.max_output_tokens, guide: MASTERS_GUIDE_AI.max_output_tokens });
  for (const file of [MASTERS_FORM_AI.template, MASTERS_FORM_AI.check, MASTERS_GUIDE_AI.template, MASTERS_GUIDE_AI.check]) {
    const w = worked(file);
    ok(`C3.4 P pass: ${file} shows a worked tree, and its trees and examples pass the step's own rules`, w.shown >= 1 && !w.bad.length && /tree_json/.test(readFileSync(join(PROMPTS, file), "utf8")), w);
  }
  // Break m6: the rules each prompt must state word for word (the node grammar, the choice and snake-case rules).
  const MUST: Record<string, (string | RegExp)[]> = {
    all: ['{"op": "in", "field": F, "value": [V1, V2]}', /"arg": node/, /"args": \[node/, /\{"op": "exists", "field": F\}/, "value_field"],
    form: [/never (write )?(its|the) code \(`"Y"`\)/i, /`options` when it has no `options_resolved`/, /two lists.{0,80}first list/, /whether a check box is ticked goes to `unresolved`/],
    guide: [/every run of characters that are not letters or digits/, "spouse_s_date_of_birth"],
  };
  for (const file of [MASTERS_FORM_AI.template, MASTERS_FORM_AI.check, MASTERS_GUIDE_AI.template, MASTERS_GUIDE_AI.check]) {
    const text = readFileSync(join(PROMPTS, file), "utf8");
    const missing = [...MUST.all, ...MUST[/guide/.test(file) ? "guide" : "form"]].filter((w) => !(typeof w === "string" ? text.includes(w) : w.test(text)));
    ok(`C3.4 P pass: ${file} states the node grammar and its ${/guide/.test(file) ? "snake-case" : "choice-value"} rule word for word, and never "values"`, !missing.length && !/"values"/.test(text), missing.map(String));
  }
  const broken = worked("masters-form-check.v2.md", 'Trees: `{"op": "or", "args": [{"op": "neq", "field": "a", "value": "Yes"}, {"op": "exists", "field": "b"}]}`, with `{"a": "No"}` → false; and ```\n{"op": "or", "args": []}\n```.');
  const badGuide = worked("masters-guide.v2.md", 'A tree: ```\n{"op": "and", "args": [{"op": "exists", "field": "spouse_family_name"}, {"op": "exists", "field": "spouse\'s_date"}]}\n```');
  const badForm = worked("masters-form.v2.md", 'Its made-up choice box lists `[["* No", "N"], ["* Yes", "Y"]]`: ```\n{"op": "or", "args": [{"op": "neq", "field": "form1[0].Page9[0].X[0].Choice[0]", "value": "Yes"}, {"op": "exists", "field": "form1[0].Page9[0].X[0].D[0]"}]}\n```');
  ok("C3.4 P fail: a guide field not in the tool's snake case, and a form choice value spelled otherwise than its listing, are caught (break M1, M2)", badGuide.bad.some((b) => /snake case/.test(b)) && badForm.bad.some((b) => /choice value "Yes"/.test(b)), { guide: badGuide.bad, form: badForm.bad });
  ok("C3.4 P fail: a prompt whose worked tree has an empty list, or whose example says the wrong outcome, is caught", broken.bad.length === 2 && broken.bad.some((b) => /11 operators/.test(b)) && broken.bad.some((b) => /gives true, the prompt says false/.test(b)), broken.bad);
  const v1 = ["masters-form-check.v1.md", "masters-guide.v1.md", "masters-guide-check.v1.md"].map((f) => ({ f, ...worked(f) }));
  ok("C3.4 P fail: the three v1 prompts the #669 rounds read show no worked tree (the defect this check finds)", v1.every((x) => x.shown === 0), v1.map((x) => [x.f, x.shown]));

  // ---------------------------------------------------------------- server: Live off, Saved
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  const reset = await call("POST", "/demo/reset-to-six", { confirm: "RESET" });
  if (reset.status >= 300) { console.error("STOP  Reset to the six did not finish", reset.body); process.exit(2); }
  const att = (file: string) => sql(`select a.id from source_attachment a join combination c on c.id=a.combination_id where c.combination_key='vv.single' and a.file_name='${file}'`);
  const form = att("imm5257e.pdf"), guide = att("guide-5256.html"), vv = sql(`select id from combination where combination_key='vv.single'`);
  const jobs = () => Number(sql(`select count(*) from drafting_job where kind='masters_edition'`));
  const spent = () => Number(sql("select coalesce(sum(cost_usd),0) from drafting_job") || 0);
  const { LEDGER_DIR } = await import("../../p2/policy.ts");
  const { SpendLedger } = await import("../../p2/ledger.ts");
  const ledger0 = new SpendLedger(LEDGER_DIR).committed(), jobs0 = jobs(), spent0 = spent();

  let x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "live" });
  ok("C3.4 L fail: Live with the live switch off is refused at US$0 (P-175), and no job is started", x.status === 409 && /Live is not open yet/.test(x.body?.detail ?? "") && jobs() === jobs0, x.body?.detail);
  x = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "live" });
  ok("C3.4 L fail: the Live plan is refused too while the switch is off", x.status === 409, x.status);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: Saved with nothing recorded says so in plain words, US$0, no job", x.status === 409 && /No saved AI answer drafts this form edition/.test(x.body?.detail ?? "") && jobs() === jobs0, x.body?.detail);
  x = await call("POST", `/attachments/${att("imm5484e.pdf")}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: a checklist is refused (it is drafted into document requirements)", x.status === 400 && /checklist/.test(x.body?.message ?? x.body?.detail ?? ""), x.body);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "draft" });
  ok("C3.4 S fail: a mode other than rules, Saved or Live is refused", x.status === 400, x.status);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" }, "user-C");
  ok("C3.4 S fail: only an author drafts (a viewer is refused)", x.status === 403, x.status);

  // Recorded runs: the real launcher's stub pass of each committed job, turned into the live record a paid run leaves.
  const tool = await import("../tools/track-a-jobs.ts");
  const derived = (await tool.deriveJobs()).filter((d) => d.row === "C3.4");
  ok("C3.4 J pass: four committed C3.4 jobs, byte for byte the jobs the app's live rounds write now (IMM 5257 by its edition key, guide 5256 by Visitor visa)", derived.length === 4 && derived.every((d) => readFileSync(join(P2, "jobs", `${d.job.job_id}.json`), "utf8") === tool.jobText(d.job))
    && derived.filter((d) => d.job.combination === "edition:IMM 5257:09-2023" && d.job.known?.form_edition === "IMM 5257 (09-2023)").length === 2 && derived.filter((d) => d.job.combination === "vv.single").length === 2, derived.map((d) => d.job.job_id));
  let worst = 0;
  for (const d of derived) { const c = tool.costsOf(d.job); worst += c.worst_usd; ok(`C3.4 W pass: ${d.label}: worst US$${c.worst_usd.toFixed(2)} fits its budget US$${c.budget_usd.toFixed(2)} and the US$5 run cap; usual ~US$${c.usual_usd.toFixed(2)}`, c.fits_budget && c.under_run_cap && c.usual_usd > 0 && c.usual_usd < c.worst_usd, c); }
  const formUsual = derived.filter((d) => /^studio-masters-form-/.test(d.job.job_id)).map((d) => tool.costsOf(d.job).usual_usd);
  ok("C3.4 W pass: each IMM 5257 round's usual is priced at the token rate #669 measured (US$0.55–0.80 each, one attempt), not the guide's", formUsual.length === 2 && formUsual.every((u) => u >= 0.55 && u <= 0.8), formUsual);
  ok(`C3.4 W pass: the four C3.4 runs together: worst US$${worst.toFixed(2)}, within the US$6.55 the PR states (P-296 (3): the form's 16,000 output limit)`, worst > 0 && worst <= 6.55, worst);
  const scratch = join(STUDIO, "var", `c34-check-ledger-${process.pid}`); mkdirSync(scratch, { recursive: true });
  keep(join(P2, "screening", "canary-digest.json"));
  const record = (jobId: string, answer: unknown, edition?: string, template?: string) => {
    keep(join(RUNS, "stub-pass", `${jobId}.json`));
    const s = spawnSync(process.execPath, [join(P2, "launch.ts"), "--job", jobId, "--stub"], { cwd: ROOT, encoding: "utf8", timeout: 120_000, env: { ...process.env, P2_LEDGER_DIR: scratch } });
    const out = JSON.parse(s.stdout.trim().split("\n").pop() ?? "{}");
    if (out.run_file) written.push(out.run_file);
    const rec = JSON.parse(readFileSync(out.run_file, "utf8"));
    rec.caller = "live"; rec.raw_output = JSON.stringify(answer);
    rec.drafting_run.output_sha256 = rec.launch_evidence.output_sha256 = createHash("sha256").update(rec.raw_output).digest("hex");
    if (edition) rec.drafting_run.inputs.combination = edition;
    if (template) rec.launch_evidence.template_sha256 = createHash("sha256").update(readFileSync(join(P2, "prompts", template))).digest("hex");
    const f = join(RUNS, `${jobId}${stamp()}${Math.random().toString(36).slice(2, 8)}.json`);
    writeFileSync(f, JSON.stringify(rec, null, 1) + "\n"); written.push(f);
    return f;
  };
  const [fd, fk, gd, gk] = derived.map((d) => d.job.job_id);
  // S fail first: the same answers recorded under another edition's key are never replayed for IMM 5257 (09-2023).
  const wrong = [record(fd, FORM_ANSWER, "edition:IMM 5257:01-2020"), record(fk, FORM_ANSWER, "edition:IMM 5257:01-2020")];
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: Saved never uses a recorded run of another edition (refused, US$0)", x.status === 409 && jobs() === jobs0, x.body?.detail);
  for (const f of wrong) rmSync(f, { force: true });
  // P-296 (3), #669 review minor 4: a recorded run that answered a v1 prompt (as #669's four did) is never replayed by the
  // v2 step, even with this edition's key, its own input file and a well-shaped answer.
  const v1Runs = [record(fd, FORM_ANSWER, undefined, "masters-form.v1.md"), record(fk, FORM_ANSWER, undefined, "masters-form-check.v1.md")];
  const v1Plan = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "replay" });
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S fail: Saved never replays a run recorded with a v1 prompt (refused, US$0, no job)", v1Plan.body?.saved?.available === false && x.status === 409 && jobs() === jobs0, { plan: v1Plan.body?.saved, status: x.status });
  for (const f of v1Runs) rmSync(f, { force: true });
  const mixed = [record(fd, FORM_ANSWER, undefined, "masters-form.v1.md"), record(fk, FORM_ANSWER)];
  const mixedPlan = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "replay" });
  ok("C3.4 S fail: a v1 draft round with a v2 checker round is never replayed either (break m6)", mixedPlan.body?.saved?.available === false && jobs() === jobs0, mixedPlan.body?.saved);
  for (const f of mixed) rmSync(f, { force: true });
  record(fd, FORM_ANSWER); record(fk, FORM_ANSWER); record(gd, GUIDE_ANSWER); record(gk, GUIDE_ANSWER);
  rmSync(scratch, { recursive: true, force: true });

  const plan = await call("POST", `/attachments/${form}/draft-masters/plan`, { mode: "replay" });
  ok("C3.4 S pass: the Saved plan finds both rounds of one recorded run, US$0", plan.status === 200 && plan.body?.saved?.available === true && plan.body?.saved?.files?.length === 2 && plan.body?.totals?.worst_usd === 0, plan.body?.saved);
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  const again = await call("POST", `/attachments/${form}/draft-masters`, { mode: "replay" });
  ok("C3.4 S pass: Saved replays IMM 5257's recorded run into To review at US$0 (sections and answer lists by rules, checks and document types by AI)", x.status === 201 && x.body?.status === "COMPLETED" && x.body?.from === "replay" && x.body?.usd === 0 && x.body?.proposals > 2 && x.body?.group === "edition:IMM 5257 (09-2023)", { status: x.status, note: x.body?.message });
  ok("C3.4 S pass: a second click returns the edition's one draft (P-138), nothing added", again.status === 201 && again.body?.id === x.body?.id && again.body?.proposals === 0, again.body?.id);
  const q = await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`);
  const bands = q.body?.group?.bands ?? {}, items: any[] = [...(bands.ready ?? []), ...(bands.check ?? []), ...(bands.decide ?? [])];
  const kinds = Object.fromEntries(["section", "answer_list", "form_check", "document_type"].map((k) => [k, items.filter((i) => i.kind === k).length]));
  ok("C3.4 S pass: the edition's group in the one queue holds sections, answer lists, form checks and a document type", Object.values(kinds).every((n) => n > 0), kinds);
  // QA-195 (break B1; P-153 (1)): the one door holds the identity rule whoever edits the proposal. An edit that gives an
  // identity document (by its name) an AI reader is refused (409) and lands nothing; with a reader that is not AI it
  // lands, recorded as an identity document even when the edit says it is not.
  const dtItem = items.find((i) => i.kind === "document_type");
  const asEdited = (patch: object) => ({ ...(dtItem?.payload ?? dtItem?.readings?.draft?.payload ?? {}), kind: "document_type", ...patch });
  const typesNamed = (n: string) => sql(`select coalesce(string_agg(reader_profile->>'readerKind' || '/' || (reader_profile->>'identityDocument'), ','), '') from document_type where name = '${n}'`);
  const aiEdit = await call("POST", "/review/proposals/decide", { ids: [dtItem?.id], action: "edit", payload: asEdited({ name: "Passport", category: "travel", readerKind: "letter_or_record", identityDocument: false }) }, "user-C");
  ok("QA-195 fail (break B1): an edit giving \"Passport\" an AI reader is refused at the one door (409), and no document type lands", aiEdit.status === 409 && /identity document: AI never reads it/.test(aiEdit.body?.detail ?? aiEdit.body?.message ?? "") && typesNamed("Passport") === "", { status: aiEdit.status, body: aiEdit.body, landed: typesNamed("Passport") });
  const okEdit = await call("POST", "/review/proposals/decide", { ids: [dtItem?.id], action: "edit", payload: asEdited({ name: "Passport", category: "travel", readerKind: "coded_lines", identityDocument: false }) }, "user-C");
  ok("QA-195 pass (break B1): the same edit with its coded lines lands, recorded as an identity document", okEdit.status === 201 && typesNamed("Passport") === "coded_lines/true", { status: okEdit.status, body: okEdit.body?.detail, landed: typesNamed("Passport") });
  // QA-195 (P-134): a row stored before the masters guard knew names (Ready, agreed, its rule passed, reusing the
  // library's Passport, with an AI reader) is refused by Accept and by bulk accept in plain words, and the queue's box
  // says why; a reuse accept runs no lander, so the one door checks it before the reuse branch. With a reader that is
  // not AI the same rows go together.
  const passportKey = sql(`select document_type_key from document_type where name = 'Passport' limit 1`);
  const stored = (n: number, reader: string) => sql(`insert into proposal_item (id, workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, reuse, payload, source, rounds, rules, agreement, confidence, origin, identity, identity_key, basis)
    select gen_random_uuid(), workspace_id, kind, run_id, step, form_edition, combination_id, lands_on, '${JSON.stringify({ match: "reuse", existingKey: passportKey })}'::jsonb,
      '${JSON.stringify({ kind: "document_type", name: "Passport", proves: `identity and travel (stored row ${n})`, category: "travel", suppliesFacts: [], readerKind: reader, identityDocument: false })}'::jsonb,
      source, rounds, '[{"rule":"quote_printed_on_form","passed":true,"why":null},{"rule":"identity_not_read_by_ai","passed":true,"why":null}]'::jsonb, 'agreed', 'ready', origin, identity, identity_key || '-qa195-${n}', basis
    from proposal_item where id = '${dtItem?.id}' returning id`).split("\n")[0];
  const s1 = stored(1, "letter_or_record"), s2 = stored(2, "letter_or_record");
  const statusOf = (id: string) => sql(`select status from proposal_item where id = '${id}'`);
  const q2 = await call("GET", `/review/proposals?group=${encodeURIComponent("edition:IMM 5257 (09-2023)")}`);
  const b2 = q2.body?.group?.bands ?? {}, row1 = [...(b2.ready ?? []), ...(b2.check ?? []), ...(b2.decide ?? [])].find((i: any) => i.id === s1);
  ok("QA-195 fail: the queue's box says a stored AI-read \"Passport\" cannot be ticked with others, because it is an identity document", /identity document: AI never reads it/.test(row1?.bulk_why ?? ""), row1?.bulk_why ?? row1);
  const one = await call("POST", "/review/proposals/decide", { ids: [s1], action: "accept" }, "user-C");
  ok("QA-195 fail: Accept refuses a stored \"Passport\" (category travel, not flagged) that reuses the library's type with an AI reader (409, plain words), and it stays waiting",
    one.status === 409 && /"Passport" is an identity document: AI never reads it \(P-134\)/.test(one.body?.detail ?? one.body?.message ?? "") && statusOf(s1) === "waiting", { status: one.status, body: one.body, s: statusOf(s1) });
  const bulk = await call("POST", "/review/proposals/decide", { ids: [s1, s2], action: "accept" }, "user-C");
  ok("QA-195 fail: bulk accept of two stored AI-read \"Passport\" rows is refused in plain words, and nothing is accepted",
    bulk.status === 409 && /identity document: AI never reads it/.test(bulk.body?.detail ?? bulk.body?.message ?? "") && statusOf(s1) === "waiting" && statusOf(s2) === "waiting", { status: bulk.status, body: bulk.body, s: [statusOf(s1), statusOf(s2)] });
  sql(`update proposal_item set payload = jsonb_set(payload, '{readerKind}', '"coded_lines"') where id in ('${s1}', '${s2}')`);
  const bulkOk = await call("POST", "/review/proposals/decide", { ids: [s1, s2], action: "accept" }, "user-C");
  ok("QA-195 pass: the same two rows read by their coded lines are accepted together, reusing the library's Passport",
    bulkOk.status === 201 && statusOf(s1) === "accepted" && statusOf(s2) === "accepted", { status: bulkOk.status, body: bulkOk.body, s: [statusOf(s1), statusOf(s2)] });
  // #882 break B1: the door decides by the row's kind, never the payload's; a stored payload without its kind is refused
  // by the contract in plain words, alone and in the queue's box, and nothing lands.
  const s3 = stored(3, "letter_or_record");
  sql(`update proposal_item set payload = payload - 'kind' where id = '${s3}'`);
  const noKind = await call("POST", "/review/proposals/decide", { ids: [s3], action: "accept" }, "user-C");
  ok("QA-195 fail (#882 break B1): a stored AI-read \"Passport\" whose payload lost its kind is refused (409, the contract in plain words), and it stays waiting",
    noKind.status === 409 && /does not follow the queue's contract/.test(noKind.body?.detail ?? "") && statusOf(s3) === "waiting", { status: noKind.status, body: noKind.body?.detail, s: statusOf(s3) });
  // #882 break B2: a reuse never lands on a library document type that is itself an identity document read by AI.
  const s4 = stored(4, "coded_lines");
  sql(`update document_type set reader_profile = jsonb_set(reader_profile, '{readerKind}', '"letter_or_record"') where document_type_key = '${passportKey}'`);
  const libAi = await call("POST", "/review/proposals/decide", { ids: [s4], action: "accept" }, "user-C");
  ok("QA-195 fail (#882 break B2): a reuse of the library's Passport while the library reads it by AI is refused (409), and it stays waiting",
    libAi.status === 409 && /in the library is an identity document with a reader that is AI/.test(libAi.body?.detail ?? "") && statusOf(s4) === "waiting", { status: libAi.status, body: libAi.body?.detail, s: statusOf(s4) });
  sql(`update document_type set reader_profile = jsonb_set(reader_profile, '{readerKind}', '"coded_lines"') where document_type_key = '${passportKey}'`);
  const libOk = await call("POST", "/review/proposals/decide", { ids: [s4], action: "accept" }, "user-C");
  ok("QA-195 pass (#882 break B2): with the library's Passport read by its coded lines, the same reuse is accepted", libOk.status === 201 && statusOf(s4) === "accepted", { status: libOk.status, body: libOk.body?.detail });
  const check = items.find((i) => i.kind === "form_check");
  ok("C3.4 S pass: the form check rests on IMM 5257 with its printed words found, Ready (both rounds agree), its examples unconfirmed, Sample", check?.band === "ready" && check?.source?.quote_found === true && /imm5257/i.test(check?.source?.file ?? "") && check?.basis === "SAMPLE" && (check?.readings?.draft?.payload?.examples ?? []).length === 3, check);
  ok("C3.4 S pass: the whole Saved draft spent US$0 (jobs and the shared ledger)", spent() === spent0 && new SpendLedger(LEDGER_DIR).committed() === ledger0, { spent: spent(), ledger: new SpendLedger(LEDGER_DIR).committed() });
  x = await call("POST", `/attachments/${form}/draft-masters`, { mode: "rules" });
  ok("C3.4 S pass: the rules pass after the AI draft returns the edition's one draft (no second set of sections)", x.status === 201 && x.body?.proposals === 0, x.body?.proposals);

  x = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "replay" });
  const fromGuide = (await call("GET", `/review/proposals?group=${encodeURIComponent(`combination:${vv}`)}`)).body?.group?.bands ?? {};
  const gi: any[] = [...(fromGuide.ready ?? []), ...(fromGuide.check ?? []), ...(fromGuide.decide ?? [])].filter((i) => ["form_check", "cross_check"].includes(i.kind) && /5256/.test(i.source?.file ?? ""));
  ok("C3.4 S pass: Saved on Visitor visa's guide 5256 proposes its checks on the combination, resting on the guide's sentence, US$0", x.status === 201 && x.body?.usd === 0 && gi.length === 1 && gi[0].source?.quote_found === true, { status: x.status, n: gi.length, note: x.body?.message });
  ok("C3.4 S pass: the guide's Saved draft spent US$0", spent() === spent0 && new SpendLedger(LEDGER_DIR).committed() === ledger0);

  // Break B1: two recorded runs of the same committed jobs; the newer one's checker is of the wrong shape. Saved must use
  // both rounds of the older run, never the older checker with the newer draft.
  sql(`delete from proposal_item where step='masters_guide'; delete from drafting_job where kind='masters_edition' and detail->>'guide' is not null`);
  for (const f of readdirSync(RUNS).filter((x) => x.startsWith("studio-masters-guide") && x.includes("pacheck"))) rmSync(join(RUNS, f), { force: true });
  const run1d = record(gd, GUIDE_ANSWER), run1k = record(gk, GUIDE_ANSWER);
  const run2d = record(gd, { checks: [{ ...guideCheck, sentence: "The newer run's draft" }], unresolved: [] }), run2k = record(gk, { wrong: "shape" });
  const gplan = await call("POST", `/attachments/${guide}/draft-masters/plan`, { mode: "replay" });
  const short = (f: string) => `prototype/p2/runs/${f.split("/").pop()}`;
  ok("C3.4 B1 fail→pass: Saved pairs the older run's checker with that run's own draft, never the newer run's draft", gplan.body?.saved?.available === true && JSON.stringify(gplan.body?.saved?.files) === JSON.stringify([short(run1d), short(run1k)]), { files: gplan.body?.saved?.files, newer: [short(run2d), short(run2k)] });
  // Break B2: a Saved draft with nothing usable is not the source's one draft: a later good recorded run drafts it.
  sql(`delete from proposal_item where step='masters_guide'; delete from drafting_job where kind='masters_edition' and detail->>'guide' is not null`);
  for (const f of readdirSync(RUNS).filter((x) => x.startsWith("studio-masters-guide") && x.includes("pacheck"))) rmSync(join(RUNS, f), { force: true });
  const useless = { checks: [{ ...guideCheck, quote: "A sentence the guide does not hold anywhere at all." }], unresolved: [] };
  record(gd, useless); record(gk, useless);
  const first = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "replay" });
  ok("C3.4 B2 pass: a Saved draft whose items are all left out ends with nothing proposed and says it can be drafted again", first.status === 201 && first.body?.proposals === 0 && /can be drafted again/.test(first.body?.message ?? ""), first.body?.message);
  record(gd, GUIDE_ANSWER); record(gk, GUIDE_ANSWER);
  const second = await call("POST", `/attachments/${guide}/draft-masters`, { mode: "replay" });
  ok("C3.4 B2 fail→pass: a later good recorded run drafts the guide (the empty draft never blocks it)", second.status === 201 && second.body?.id !== first.body?.id && second.body?.proposals === 1, { id: second.body?.id, proposals: second.body?.proposals });
  const viewerPlan = await call("POST", `/attachments/${guide}/draft-masters/plan`, { mode: "replay" }, "user-C");
  ok("C3.4 fail (break minor): the plan, which names run files and the AI cap, is refused to a viewer", viewerPlan.status === 403, viewerPlan.status);
})().catch((e) => { console.error("FAIL  unexpected", e); fail++; }).finally(() => {
  cleanUp();
  const out = join(STUDIO, "var", "suites"); mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "check_forms_c34_ai.json"), JSON.stringify({ at: new Date().toISOString(), pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
});
