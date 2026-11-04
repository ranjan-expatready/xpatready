// C5.1 acceptance (qa/CAPABILITIES.md C5.1; P-248, amending P-207; F8, X1a; SA-1B-90; row G5): "Author submits; expert
// ticks; a different person approves and releases; a combination is refused unless it has at least one document line
// and one form line (a PDF, a portal-screen edition or an online-only form), with a warning while it is configured."
// Written 4 Nov (G5): C5.1 had no pack. Part A is P-248: the form line (A1–A24) and the document line (A25–A32, added on
// the tech lead's ruling on #868 after qa's gate A); part B is C5.1's own rule (submit, the expert's tick, a different
// person releases). A combination with forms and no document line is refused the same way, in its own words ("No
// document line yet", Add a document): on the checkpoint the Visitor visa as loaded, on the fixture Super visa.
// As a person: on a combination with documents and no form, its Review and release tab shows "No form line yet: this
// combination cannot be released" with Add a form, Submit for review is greyed, and the shared Release page lists the
// row "Held back: No form line yet: …". Underneath: Submit is refused (400) and Approve (409), and so is the Release
// page's Release (409), each in the words that say what to add; nothing is released. A PDF line, a line filed Online
// (a portal-screen edition, P-245) or on paper each clear it; an online-only form (P-152 (2)) clears it in the rule
// itself (no screen makes one today: online capture is parked); a checklist or a line marked Not needed does not (Not
// needed is the rule's and the property's: neither data set has an account record that allows it, so its live step
// prints NOTE). An approver who changed the draft is refused release (BR-14) in tests/check_s5_slice1.ts.
// Steps: A1–A32 are P-248 (both data sets; A22 paper and A23 Not needed run only where the account accepts that channel,
// and A23 runs on neither today), B1–B10 C5.1's own rule: B4 is red on the checkpoint until QA-144, and B5–B10 run only
// where B4 is green (today the fixture). Gate B reads the PR's named steps (gate-b.mjs).
// Data (P-322, release is a later step): by default Demo › Load the configured checkpoint (loaded here when the copy
// holds anything else), part A on With a high wage LMIA, which the checkpoint leaves empty. Its part B needs a
// combination whose draft has no problem, which the checkpoint has none of until QA-144: then B4 is FAIL (exit 1),
// and it releases the first clean one as soon as one exists. A fixture key as 4th argument (wp.family) loads the suites'
// fixture instead: part A on Visitor visa, part B releases the work permit's next version.
// Screenshots go to studio/var/acceptance/C5.1-*-1440.png (the PR's: product/screens/G5-release-form-line/screenshots/).
// No model call (US$0). Exit 0 = all pass, 1 = a failure (on the checkpoint today: B4 only), 2 = setup missing.
//   zsh studio/tools/isolated.sh accept 4446 start && tsx studio/acceptance/C5.1.test.ts 4446 xr_studio_accept
import { mkdirSync } from "node:fs";
import fc from "fast-check";
import { join } from "node:path";
import { DOCUMENT_LINE_WORDS, documentLineProblem, FORM_LINE_WORDS, formLineProblem, isFormLine, releaseLineProblems } from "../engine/programs.ts";
import { sourceEveryNumber } from "../tests/fixtures/source-every-number.cjs";
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "./lib/pack2.ts";
import { walker } from "./lib/browser.ts";

const T = pack2("C5.1");
const { call, sql, ok, words } = T;
const FIXTURE = process.argv[4] === "wp.family";
const DATA = FIXTURE ? "fixture" : "checkpoint";
const SHOT = join(import.meta.dirname, "..", "var", "acceptance");
const NO_FORM = /^No form line yet: /, NO_DOC = /^No document line yet: /;
const errorsOf = async (id: string) => ((await call("GET", `/combinations/${id}`)).body?.draft?.problems ?? []).filter((p: any) => p.level === "error") as any[];
const formLineErr = (ps: any[]) => ps.filter((p) => NO_FORM.test(String(p.message)));
const released = (id: string) => Number(sql(`select count(*) from config_release where combination_id='${id}'`) || 0);
const lineVersion = (id: string, code: string) => Number(sql(`select max(version) from combination_form where combination_id='${id}' and lineage_key='${code}'`) || 0);

run(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  if (!served) { console.error(`STOP  no studio answers on port ${T.PORT}`); process.exit(2); }
  // ---------------------------------------------------------------- the data a person loads
  if (FIXTURE) {
    if (!(await call("GET", "/demo/status")).body?.loaded) { const l = await call("POST", "/demo/load", {}, AUTHOR); if (l.status >= 300) { console.error("STOP  the fixture did not load", l.body); process.exit(2); } }
  } else if (sql("select count(*) from audit_event where action='loaded' and entity='configured checkpoint'") === "0") {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    if (l.status >= 300) { console.error("STOP  Demo › Load the configured checkpoint refused", l.status, words(l)); process.exit(2); }
  }
  const A = T.combo(FIXTURE ? "vv.single" : "lm.high_wage");
  const formA = FIXTURE ? "IMM 5257" : "IMM 5710";
  ok(`setup (${DATA}): ${FIXTURE ? "Visitor visa" : "With a high wage LMIA"} has no form line, no document line and no release`, !!A && sql(`select count(*) from combination_form where combination_id='${A}' and status<>'RETIRED'`) === "0" && sql(`select count(*) from document_requirement where combination_id='${A}'`) === "0" && released(A) === 0, A);
  const spent0 = T.spent();

  // ---------------------------------------------------------------- A. P-248: a form line, with a warning while configured
  // The rule itself: what counts as a form line (an online-only form included: no screen makes one today).
  ok("C5.1-A1 P-248 (rule): a PDF line, a portal-screen edition (filed Online), a paper line and an online-only form are form lines", [{ form_kind: "data_form" }, { form_kind: "data_form", channel: "ONLINE" }, { form_kind: "data_form", channel: "PAPER" }, { form_kind: "data_form", channel: "ONLINE", online_only: true }].every(isFormLine));
  ok("C5.1-A2 P-248 fail (rule): a checklist, a document form and a line marked Not needed are not", ![{ form_kind: "checklist" }, { form_kind: "document" }, { form_kind: "data_form", channel: "NOT_NEEDED" }].some(isFormLine));
  const rule = (forms: object[], docs: number) => formLineProblem({ forms, document_requirements: Array(docs).fill({}) } as any);
  ok("C5.1-A3 P-248 fail (rule): documents only, or a checklist only, holds the release with one error in the form-line words", rule([], 2).length === 1 && rule([], 2)[0].level === "error" && rule([], 2)[0].message === FORM_LINE_WORDS && rule([{ form_kind: "checklist" }], 0).length === 1);
  ok("C5.1-A4 P-248 pass (rule): an online-only form beside the documents clears it; nothing at all is F8's line, not this one", rule([{ form_kind: "data_form", channel: "ONLINE", online_only: true }], 2).length === 0 && rule([], 0).length === 0);
  ok("C5.1-A5 P-248 pass (rule, review m2): an old library row kept as a document but titled as a form (IMM 5802 style) is filed, so it counts", isFormLine({ form_kind: "document", title: "Offer of employment form" }) && !isFormLine({ form_kind: "document", title: "Document checklist" }));
  // STANDARDS §7 (review m5): the rule as a property: held exactly when the draft has lines and none of them is filed.
  const kinds = fc.record({ form_kind: fc.constantFrom("data_form", "checklist", "guide", "document", null), title: fc.constantFrom("", "Offer of employment form", "Document checklist"), channel: fc.constantFrom("PDF_UPLOAD", "ONLINE", "PAPER", "NOT_NEEDED", null), online_only: fc.boolean() });
  let prop = "";
  try { fc.assert(fc.property(fc.array(kinds, { maxLength: 5 }), fc.nat(3), (forms, docs) => (rule(forms, docs).length === 1) === ((forms.length + docs > 0) && !forms.some((f) => (f.form_kind ?? "data_form") === "data_form" || (f.form_kind === "document" && f.title === "Offer of employment form") ? f.channel !== "NOT_NEEDED" : false))), { numRuns: 500 }); } catch (e) { prop = (e as Error).message.split("\n").slice(0, 3).join(" "); }
  ok("C5.1-A6 P-248 property (500 drafts): held exactly when it has lines and none is a filed form line (Not needed never counts)", !prop, prop || undefined);
  ok("C5.1-A7 P-248 (words): the form-line words say what to add: a PDF form, a portal-screen edition filed Online or an online-only form", /PDF form/.test(FORM_LINE_WORDS) && /portal-screen edition filed Online/.test(FORM_LINE_WORDS) && /online-only form/.test(FORM_LINE_WORDS) && /Find forms|Form library/.test(FORM_LINE_WORDS));

  // A document line through the screens' route: a new document type waits for a second person, who accepts it on To
  // review; the line is then added with it (C3.6, P-158).
  const name = `Proof of funds (C5.1 test, ${DATA})`;
  const line = { attachMode: "COMBINATION_MANDATORY", appliesToRoles: "each_applicant", providedBy: "client" };
  let r = await call("POST", `/combinations/${A}/requirements`, { ...line, documentTypeName: name }, AUTHOR);
  const pid = r.body?.proposalId;
  r = await call("POST", "/review/proposals/decide", { ids: [pid], action: "accept" }, APPROVER);
  const typeKey = r.body?.items?.[0]?.landedAs;
  r = await call("POST", `/combinations/${A}/requirements`, { ...line, documentTypeKey: typeKey }, AUTHOR);
  ok("setup: the author adds one document line (its new type accepted by a second person on To review)", r.status === 201 && sql(`select count(*) from document_requirement where combination_id='${A}'`) === "1", [r.status, words(r), typeKey]);

  let errs = await errorsOf(A);
  ok("C5.1-A8 P-248 fail: with documents and no form line, the draft lists one release-blocking 'No form line yet' error naming what to add, and not F8's 'Nothing to release yet'", formLineErr(errs).length === 1 && formLineErr(errs)[0].where === "Release" && !errs.some((p) => /^Nothing to release yet/.test(p.message)), errs.map((p) => p.message.slice(0, 90)).slice(0, 4));
  const tab = (await call("GET", `/combinations/${A}/review`)).body;
  ok("C5.1-A9 P-248: the Review and release tab reads the same line while it is configured", formLineErr((tab?.draft?.problems ?? []) as any[]).length === 1);
  const draft = async () => (await call("GET", "/draft", undefined, APPROVER)).body;
  let d = await draft();
  const rowA = (d?.rows ?? []).find((x: any) => x.combinationId === A);
  ok("C5.1-A10 P-248: the shared Release page lists it held back in the same words, first (the warning while it is configured)", !!rowA && rowA.held === true && NO_FORM.test(String(rowA.why)), rowA ?? (d?.rows ?? []).map((x: any) => x.label));

  r = await call("POST", `/combinations/${A}/submit`, {}, AUTHOR);
  ok("C5.1-A11 P-248 fail: Submit is refused (400) in the words that say what to add", r.status === 400 && /No form line yet/.test(words(r)) && /PDF form/.test(words(r)) && (r.body?.errors ?? []).some((e: any) => NO_FORM.test(String(e.message))), [r.status, words(r).slice(0, 160)]);
  r = await call("POST", `/combinations/${A}/approve`, {}, APPROVER);
  ok("C5.1-A12 P-248 fail: Approve and release is refused (409, 'Release refused') in the same words", r.status === 409 && /^Release refused/.test(words(r)) && /No form line yet/.test(words(r)), [r.status, words(r).slice(0, 160)]);
  // The Release page's Release: refused (409) when nothing else is ready; when something else is (the new document type,
  // approved by a second person, travels on its own), that goes out and this row is held back in the same words.
  d = await draft();
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, APPROVER);
  const named = r.status === 409 ? (r.body?.errors ?? []).some((e: any) => e.combination === rowA?.label && NO_FORM.test(String(e.message)))
    : r.status === 201 && !(r.body?.rows ?? []).some((x: any) => x.combinationId === A || x.label === rowA?.label) && (r.body?.held ?? []).some((h: any) => h.label === rowA?.label && NO_FORM.test(String(h.why)));
  ok("C5.1-A13 P-248 fail: the Release page's Release does not release it: refused (409) or held back, naming the missing form line", named, [r.status, words(r).slice(0, 120), (r.body?.held ?? []).map((h: any) => h.label)]);
  ok("C5.1-A14 P-248 fail: it was not released", released(A) === 0);

  // The screens a person sees, at 1440 px: the tab's warning with Add a form, Submit greyed, the Release page's held row.
  const W = await walker(`http://localhost:${T.PORT}`);
  try {
    mkdirSync(SHOT, { recursive: true });
    const p = await W.open(AUTHOR);
    await p.goto(`/c/${A}/review`); await W.settle(p, "Review and release");
    const box = p.locator("[data-no-form-line]");
    await box.waitFor({ timeout: 15_000 });
    const boxText = await box.innerText();
    ok("C5.1-A15 P-248 (screen): the Review and release tab shows 'No form line yet: this combination cannot be released' with what to add and Add a form", /No form line yet: this combination cannot be released/.test(boxText) && /portal-screen edition/.test(boxText) && (await box.getByRole("link", { name: "Add a form" }).count()) === 1, boxText.slice(0, 200));
    const listed = await p.locator("[data-problem]").allInnerTexts();
    ok("C5.1-A16 P-248 (screen): it is said once, not again in the validation list", !listed.some((t) => /No form line yet/.test(t)), listed.slice(0, 3));
    ok("C5.1-A17 P-248 (screen): Submit for review is greyed with 'Fix the problems first'", await p.getByRole("button", { name: /Submit for review/ }).isDisabled() && (await p.getByRole("button", { name: /Submit for review/ }).getAttribute("title")) === "Fix the problems first");
    await p.screenshot({ path: join(SHOT, `C5.1-${DATA}-review-warning-1440.png`), fullPage: false });
    const q = await W.open(APPROVER);
    await q.goto("/release"); await W.settle(q, "Release page");
    const heldRow = q.getByRole("row").filter({ hasText: String(rowA?.label ?? "§") });
    const heldText = await heldRow.first().innerText().catch(() => "");
    ok("C5.1-A18 P-248 (screen): the Release page's row says 'Held back: No form line yet: …'", /Held back: No form line yet/.test(heldText), heldText.slice(0, 200));
    await heldRow.first().scrollIntoViewIfNeeded().catch(() => undefined);
    await q.screenshot({ path: join(SHOT, `C5.1-${DATA}-release-held-1440.png`), fullPage: false });
    ok("C5.1-A19 (screen): no page error on either screen", !W.errors.length, W.errors.slice(0, 2));
  } finally { await W.close(); }

  // Each kind of form line clears it: a PDF line, then the same line filed Online (a portal-screen edition), on paper.
  r = await call("POST", `/combinations/${A}/forms`, { formKey: formA }, AUTHOR);
  errs = await errorsOf(A);
  ok(`C5.1-A20 P-248 pass: once a PDF form (${formA}) is added the 'No form line yet' error is gone`, r.status < 300 && formLineErr(errs).length === 0, [r.status, words(r)]);
  const channel = async (to: string, from: string) => call("PATCH", `/combinations/${A}/forms/${encodeURIComponent(formA)}/channel`, { channel: to, from }, AUTHOR);
  r = await channel("ONLINE", "PDF_UPLOAD");
  errs = await errorsOf(A);
  ok("C5.1-A21 P-248 pass: filed Online (a portal-screen edition, P-245) it still counts as the form line", r.status < 300 && formLineErr(errs).length === 0, [r.status, words(r).slice(0, 120)]);
  r = await channel("PAPER", "ONLINE");
  if (r.status < 300) ok("C5.1-A22 P-248 pass: filed on paper (a PDF form) it counts too", formLineErr(await errorsOf(A)).length === 0);
  else console.log(`NOTE  ${formA} is not accepted on paper for this account (${words(r).slice(0, 100)}): the paper case is the rule's above`);
  const now = sql(`select channel from combination_form where combination_id='${A}' and lineage_key='${formA}' order by version desc limit 1`);
  r = await channel("NOT_NEEDED", now);
  if (r.status < 300) ok("C5.1-A23 P-248 fail: marked Not needed (nothing filed) it no longer counts: the error is back", formLineErr(await errorsOf(A)).length === 1);
  else console.log(`NOTE  ${formA} cannot be marked Not needed for this account (${words(r).slice(0, 100)}): the Not needed case is the rule's above`);
  r = await call("DELETE", `/combinations/${A}/forms/${encodeURIComponent(formA)}`, { version: lineVersion(A, formA) }, AUTHOR);
  errs = await errorsOf(A);
  ok("C5.1-A24 P-248 fail: with the form removed again, the error is back (documents only never release)", r.status < 300 && formLineErr(errs).length === 1, [r.status, words(r).slice(0, 120)]);
  ok("C5.1: no model call (US$0)", T.spent() === spent0);

  // ---------------------------------------------------------------- A, second half: a document line (tech lead's ruling on #868)
  // P-248 is one rule: a release needs its form line and its document line. The combination here has forms and no
  // document line: on the checkpoint the Visitor visa as loaded (its forms, 0 documents, the case qa found); on the
  // fixture Super visa, given IMM 5257 through the Forms route (it starts empty, and Super visa files IMM 5257).
  const D = T.combo(FIXTURE ? "sv.super_visa" : "vv.single");
  if (FIXTURE) { r = await call("POST", `/combinations/${D}/forms`, { formKey: "IMM 5257" }, AUTHOR); if (r.status >= 300) console.log(`NOTE  setup: IMM 5257 was not added to Super visa (${r.status} ${words(r).slice(0, 100)})`); }
  ok(`setup (${DATA}): ${FIXTURE ? "Super visa" : "Visitor visa"} has form lines and no document line`, !!D && Number(sql(`select count(*) from combination_form where combination_id='${D}' and status<>'RETIRED'`)) > 0 && sql(`select count(*) from document_requirement where combination_id='${D}'`) === "0", D);
  const docRule = (forms: object[], docs: number) => documentLineProblem({ forms, document_requirements: Array(docs).fill({}) } as any);
  ok("C5.1-A25 P-248 fail (rule): forms and no document line hold the release with one error in the document-line words; with a document line, or with nothing at all (F8), none", docRule([{ form_kind: "data_form" }], 0).length === 1 && docRule([{ form_kind: "data_form" }], 0)[0].message === DOCUMENT_LINE_WORDS && docRule([{ form_kind: "data_form" }], 1).length === 0 && docRule([], 0).length === 0 && releaseLineProblems({ forms: [{ form_kind: "checklist" }], document_requirements: [] } as any).length === 2);
  ok("C5.1-A26 P-248 (words): the document-line words say what to add and where (a document the applicant provides, the Documents tab)", /^No document line yet: /.test(DOCUMENT_LINE_WORDS) && /Add at least one document/.test(DOCUMENT_LINE_WORDS) && /Documents tab/.test(DOCUMENT_LINE_WORDS));
  const docErr = (ps: any[]) => ps.filter((p) => NO_DOC.test(String(p.message)));
  errs = await errorsOf(D);
  ok("C5.1-A27 P-248 fail: its draft lists one release-blocking 'No document line yet' error, and no 'No form line yet'", docErr(errs).length === 1 && docErr(errs)[0].where === "Release" && formLineErr(errs).length === 0, errs.map((p) => p.message.slice(0, 80)).slice(0, 4));
  const rowD = ((await draft())?.rows ?? []).find((x: any) => x.combinationId === D);
  ok("C5.1-A28 P-248: the shared Release page holds it back in the same words, first", !!rowD && rowD.held === true && NO_DOC.test(String(rowD.why)), rowD ?? null);
  r = await call("POST", `/combinations/${D}/submit`, {}, AUTHOR);
  ok("C5.1-A29 P-248 fail: Submit is refused (400) and its list names the missing document line in words", r.status === 400 && (r.body?.errors ?? []).some((e: any) => NO_DOC.test(String(e.message))), [r.status, words(r).slice(0, 140)]);
  r = await call("POST", `/combinations/${D}/approve`, {}, APPROVER);
  ok("C5.1-A30 P-248 fail: Approve and release is refused (409, 'Release refused') and its list names it", r.status === 409 && /^Release refused/.test(words(r)) && (r.body?.errors ?? []).some((e: any) => NO_DOC.test(String(e.message))) && released(D) === 0, [r.status, words(r).slice(0, 140)]);
  const W2 = await walker(`http://localhost:${T.PORT}`);
  try {
    const p = await W2.open(AUTHOR);
    await p.goto(`/c/${D}/review`); await W2.settle(p, "Review and release (document line)");
    const box = p.locator("[data-no-document-line]");
    await box.waitFor({ timeout: 15_000 });
    const boxText = await box.innerText();
    ok("C5.1-A31 P-248 (screen): the Review and release tab shows 'No document line yet: this combination cannot be released' with Add a document, said once", /No document line yet: this combination cannot be released/.test(boxText) && (await box.getByRole("link", { name: "Add a document" }).count()) === 1 && !(await p.locator("[data-problem]").allInnerTexts()).some((t) => /No document line yet/.test(t)) && !W2.errors.length, boxText.slice(0, 200));
    await p.screenshot({ path: join(SHOT, `C5.1-${DATA}-review-no-document-1440.png`), fullPage: false });
  } finally { await W2.close(); }
  r = await call("POST", `/combinations/${D}/requirements`, { ...line, documentTypeKey: typeKey }, AUTHOR);
  errs = await errorsOf(D);
  ok("C5.1-A32 P-248 pass: once a document line is added the 'No document line yet' error is gone", r.status === 201 && docErr(errs).length === 0 && formLineErr(errs).length === 0, [r.status, words(r).slice(0, 120)]);
  ok("C5.1: no model call (US$0)", T.spent() === spent0);

  // ---------------------------------------------------------------- B. C5.1: submit, the expert's tick, a different person releases
  r = await call("POST", `/combinations/${A}/submit`, {}, REVIEWER);
  ok("C5.1-B1 fail: the content reviewer (the expert's duty) cannot submit: only the author submits (403)", r.status === 403, [r.status, words(r)]);
  r = await call("POST", `/combinations/${A}/submit`, {}, APPROVER);
  ok("C5.1-B2 fail: the approver cannot submit either (403)", r.status === 403, [r.status, words(r)]);
  r = await call("POST", `/combinations/${A}/approve`, {}, AUTHOR);
  ok("C5.1-B3 fail: the author cannot approve and release (403: the approver duty)", r.status === 403, [r.status, words(r)]);

  // The combination part B releases: the work permit on the fixture, after one draft change; on the checkpoint the first
  // with a clean draft (none until QA-144).
  let B = "";
  if (FIXTURE) {
    B = T.combo("wp.family");
    // A type the library has released (the new one above still waits for its second person, which would hold B).
    const usedKey = sql(`select document_type_key from document_requirement where combination_id='${B}' limit 1`);
    const libKey = sql(`select document_type_key from document_type where status='PUBLISHED' and document_type_key<>'${usedKey}' order by document_type_key limit 1`);
    r = await call("POST", `/combinations/${B}/requirements`, { ...line, documentTypeKey: libKey, appliesToRoles: "principal_applicant" }, AUTHOR);
    ok("setup: the author changes the work permit's draft (adds a document line with a library type)", r.status === 201, [r.status, words(r), libKey]);
    await sourceEveryNumber(T.PORT, B, { actor: AUTHOR });
  } else {
    // Only a draft whose one remaining problem is unsourced numbers gets its numbers answered (as the author would).
    for (const c of sql("select id from combination where retired_at is null order by combination_key").split("\n").filter(Boolean)) {
      if (!(await errorsOf(c)).every((p) => p.gate === "no-source")) continue;
      await sourceEveryNumber(T.PORT, c, { actor: AUTHOR });
      if (!(await errorsOf(c)).length) { B = c; break; }
    }
  }
  // Gate B counts a pack green in part only by named steps, never on exit 2: so on the checkpoint this is an honest FAIL
  // (red until QA-144 gives a checkpoint combination a clean draft), and the PR names the steps that run there.
  ok("C5.1-B4 pass: a combination is ready to submit and release (a form line, a document line, no other problem)", !!B, B ? undefined : "red until QA-144: no combination on the configured checkpoint has a draft without problems yet");
  if (!B) { T.done(); return; }
  const before = released(B);
  r = await call("POST", `/combinations/${B}/submit`, { note: "C5.1 acceptance" }, AUTHOR);
  ok("C5.1-B5 pass: the author submits it for review (201): it has a form line and a document line", r.status === 201, [r.status, words(r).slice(0, 160)]);
  const items = ((r.body?.changeSummary ?? []) as any[]).map((x) => `${x.kind}|${x.key}`);
  const smeItems = ((r.body?.changeSummary ?? []) as any[]).filter((x) => x.needs_sme).map((x) => `${x.kind}|${x.key}`);
  r = await call("POST", `/combinations/${B}/approve`, {}, APPROVER);
  ok("C5.1-B6 fail: before the expert's tick it is not released (409, the expert's sign-off named)", smeItems.length ? r.status === 409 && /SME sign-off/.test(words(r)) : true, [smeItems.length, r.status, words(r).slice(0, 120)]);
  r = await call("POST", `/combinations/${B}/signoff`, { items, action: "signed" }, AUTHOR);
  ok("C5.1-B7 fail: the author who submitted cannot tick their own submission (403)", r.status === 403, [r.status, words(r)]);
  r = await call("POST", `/combinations/${B}/signoff`, { items, action: "signed" }, REVIEWER);
  ok("C5.1-B8 pass: the content reviewer ticks the changes, the expert's ones included", r.status < 300, [r.status, words(r).slice(0, 120)]);
  r = await call("POST", `/combinations/${B}/approve`, {}, APPROVER);
  const rel = sql(`select version || '|' || submitter_id || '|' || approver_id from config_release where combination_id='${B}' order by version desc limit 1`);
  ok("C5.1-B9 pass: a different person (the Approver) approves and releases: a new version, submitted by the author, approved by the Approver", r.status === 201 && released(B) === before + 1 && rel === `${r.body?.version}|${AUTHOR}|${APPROVER}`, [r.status, words(r).slice(0, 160), rel]);
  const snap = (await call("GET", `/combinations/${B}/config?mode=published`)).body?.snapshot;
  ok("C5.1-B10 P-248 pass: what was released has a form line and a document line", (snap?.forms ?? []).some(isFormLine) && (snap?.document_requirements ?? []).length > 0, { forms: (snap?.forms ?? []).length, documents: (snap?.document_requirements ?? []).length });
  ok("C5.1: no model call (US$0)", T.spent() === spent0);
  T.done();
});
