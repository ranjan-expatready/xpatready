// C6.5 part 2b: the "Fill this from documents" drawer, walked in a browser (concept
// product/screens/C6.5-documents-drawer/concept-draft.md, approved by the tech lead on #1369 after its challenge).
// Continues the pack at C6.5-24 (C6.5-21 to -23 are the correction counts, part 2c). Each check compares the screen with
// the API's own answer for the same case in the same step (the server decides every rule: differs, left_why,
// needs_look), so it holds on the configured checkpoint and on the fixture. Each rule has a pass and a fail.
// Synthetic Sample documents only (P-133). No model call, no live read (US$0).
//   zsh studio/tools/isolated.sh c65s 4440 start && tsx studio/acceptance/C6.5-screen.test.ts 4440 xr_studio_c65s
import type { Page } from "playwright";
import { CLIENT, FAMILY, FIXED, OFFICER, PORT, agent, answer, call, main, needVisitorVisa, ok, openCase, sql } from "./lib/m3.ts";
import { letterPdf, passportPdf, textPdf, upload } from "./lib/fixtures.ts";
import { walker } from "./lib/browser.ts";

type Prop = { id: string; fact: string; label: string; value: unknown; review: string; state: string; differs: boolean; left_why: string | null; needs_look: boolean; source: { document: string } };
type Sec = { section: string; subjectId: string; questions: { fact: string }[] };
const BASE = `http://127.0.0.1:${PORT}`;
const lineIdOf = (subject: string, fact: string) => `a-${subject}-${fact.replace(/[^a-z0-9_]/gi, "-")}`;

await main("C6.5", "The Fill this from documents drawer (screen, 1440 px; US$0)", async () => {
  const vv = needVisitorVisa();
  const c = await openCase(vv, FAMILY);
  const P = c.subjects["Sample Client A"], S = c.subjects["Sample Spouse A"];
  const secs = ((await agent(c.id))?.sections ?? []) as Sec[];
  const passSec = secs.find((s) => s.subjectId === P && s.questions.some((q) => q.fact === "person.passport_number"))!.section;
  const visit = secs.find((s) => s.questions.some((q) => q.fact === "case.visit_contact_name"))!.section;
  const lineOf = async (who: string) => (((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === who)?.lines ?? []).find((x: { label: string }) => /passport/i.test(x.label) && !/absent|parent/i.test(x.label))?.id as string;
  const pass = { surname: "SAMPLED", given: "CLIENT A", number: "SAMPLEP12", nationality: "IND", dob: FAMILY[0].dob!, sex: "X" as const, expiry: FIXED.expiry };
  // A typed name that differs (the officer's where the release lets only staff type it, as pack step C6.5-9b), set before the read.
  await answer(c.id, P, "person.family_name", "SAMPLEDE", OFFICER);
  const up = await upload(PORT, `/runtime/checklist-lines/${await lineOf(P)}/documents`, passportPdf(pass), "sample-passport.pdf", OFFICER);
  const doc = up.body?.document?.id as string;
  await upload(PORT, `/runtime/checklist-lines/${await lineOf(S)}/documents`, passportPdf({ ...pass, surname: "SAMPLES", number: "SAMPLES34", dob: FAMILY[1].dob! }, true), "spouse-bad.pdf", OFFICER);
  const spend0 = sql("select count(*) from ai_batch");
  const proposals = async (who = P) => ((await call("GET", `/runtime/cases/${c.id}/proposals?subject=${who}`, undefined, OFFICER)).body?.proposals ?? []) as Prop[];

  const w = await walker(BASE);
  try {
    const page = await w.open(OFFICER, 1440);
    const drawer = page.locator("[data-documents-drawer]");
    const openDrawer = async (who: string, section: string, fact: string) => {
      await page.goto(`/cases/${c.id}#${lineIdOf(who, fact)}`); await w.settle(page, "the case page");
      await page.locator(`#s-${who}-${section} [data-fill-from-documents]`).click();
      await drawer.waitFor({ timeout: 30_000 }); await w.settle(page, "the drawer");
    };
    // ---- BR-1 where it opens (staff only)
    await page.goto(`/cases/${c.id}#${lineIdOf(P, "person.passport_number")}`); await w.settle(page, "the case page");
    const buttons = await page.locator("[data-fill-from-documents]").count();
    const client = await w.open(CLIENT, 1440); await client.goto(`/cases/${c.id}/questionnaire`); await w.settle(client, "the client's questionnaire");
    ok("C6.5-24 pass (BR-1, P-134 D4): the case officer's Agent view has \"Fill this from documents\" on its sections", buttons > 0, buttons);
    ok("C6.5-24 fail (BR-1): the client's questionnaire has no such button (staff only)", (await client.locator("[data-fill-from-documents]").count()) === 0);
    // ---- BR-2/3/4 read, one block, collapse
    await openDrawer(P, passSec, "person.passport_number");
    const api = (await proposals()).filter((p) => p.source.document === doc);
    const collapsedApi = api.filter((p) => p.review === "collapsed" && !p.differs && !p.left_why).map((p) => p.fact).sort();
    const collapsedText = (await drawer.locator(`[data-document-block="${doc}"] [data-collapsed] summary`).textContent()) ?? "";
    const collapsedFacts = (await drawer.locator(`[data-document-block="${doc}"] [data-collapsed-value]`).evaluateAll((e) => e.map((x) => x.getAttribute("data-collapsed-value")))).sort();
    ok("C6.5-25 pass (BR-2, BR-3): the drawer reads the passport into one block with its file and reader, and no model call is made", (await drawer.locator(`[data-document-block="${doc}"]`).count()) === 1 && /coded lines: rules, no AI/.test(await drawer.innerText()) && sql("select count(*) from ai_batch") === spend0);
    ok("C6.5-26 pass (BR-4, P-243): the values backed by passed check digits are one collapsed line, the same ones the API collapses", collapsedApi.length === 3 && JSON.stringify(collapsedFacts) === JSON.stringify(collapsedApi) && /^3 values checked by the passport's check digits/.test(collapsedText), { collapsedApi, collapsedFacts, collapsedText });
    // ---- BR-5/6/8 ticks only where the server says a look is needed; differences and left values before the click
    const tickFacts = (await drawer.locator(`[data-document-block="${doc}"] [data-tick]`).evaluateAll((e) => e.map((x) => x.getAttribute("data-tick")))).sort();
    ok("C6.5-27 pass (BR-5, L-SA9): a tick sits on each value the server marks as needing a look, and on no other", JSON.stringify(tickFacts) === JSON.stringify(api.filter((p) => p.needs_look).map((p) => p.fact).sort()), { tickFacts, needs: api.filter((p) => p.needs_look).map((p) => p.fact) });
    const differsShown = await drawer.locator(`[data-document-block="${doc}"] [data-value="person.family_name"] [data-differs]`).count();
    const leftShown = await drawer.locator(`[data-document-block="${doc}"] [data-left-why]`).allTextContents();
    ok("C6.5-27 fail (BR-6, BR-8): the differing name and each value left for a person show before the click, with no tick", differsShown === 1 && !tickFacts.includes("person.family_name") && api.filter((p) => p.left_why).every((p) => leftShown.includes(p.left_why!)) && api.filter((p) => p.left_why).every((p) => !tickFacts.includes(p.fact)), { differsShown, leftShown });
    if (process.env.C65_SHOTS) await page.screenshot({ path: `${process.env.C65_SHOTS}/drawer-review-1440.png` });
    // ---- Confirm & use held by ticks, never by a difference
    const use = drawer.locator(`[data-document-block="${doc}"] [data-confirm-and-use]`);
    const heldFirst = tickFacts.length ? await use.isDisabled() : true;
    ok("C6.5-28 fail (BR-5, L-SA9): Confirm & use waits while a value needing a look is not ticked, and says how many are left", heldFirst && (!tickFacts.length || /Tick or correct each value first: \d+ left/.test(await drawer.innerText())), { heldFirst, ticks: tickFacts.length });
    for (const f of tickFacts) await drawer.locator(`[data-document-block="${doc}"] [data-tick="${f}"]`).check();
    const enabled = await use.isEnabled();
    await use.click(); await drawer.locator(`[data-document-block="${doc}"] [data-confirmed]`).waitFor({ timeout: 20_000 });
    const confirmedBy = sql(`select confirmed_by from document_review where document_id='${doc}'`);
    ok("C6.5-28 pass (BR-5, BR-9, P-242): once ticked, one click uses the document (a difference never holds it); the drawer says who and when, in IST", enabled && confirmedBy === OFFICER && /Confirmed and used by .+ IST/.test(await drawer.locator(`[data-document-block="${doc}"] [data-confirmed]`).innerText()), confirmedBy);
    // ---- BR-10 resolve in place, with a reason
    const resolve = drawer.locator(`[data-resolve-check="person.family_name"]`);
    await resolve.waitFor({ timeout: 20_000 });
    await resolve.getByRole("button", { name: "Save" }).click();
    await resolve.locator("[role=alert]").waitFor({ timeout: 10_000 });
    ok("C6.5-29 fail (BR-10, C6.5-14): resolving without a reason shows the server's words on the field, and the check stays open", /reason/i.test(await resolve.locator("[role=alert]").innerText()) && sql(`select count(*) from answer_check where subject_id='${P}' and fact='person.family_name' and state='open'`) === "1");
    await resolve.getByLabel("Keep the document's value").check();
    await resolve.getByLabel("Reason (required)").fill("Matches the passport page (Sample)");
    await resolve.getByRole("button", { name: "Save" }).click();
    await resolve.waitFor({ state: "detached", timeout: 20_000 });
    ok("C6.5-29 pass (BR-10): with a reason the check is resolved in the drawer, keeping the document's value", sql(`select state || '|' || kept from answer_check where subject_id='${P}' and fact='person.family_name' order by opened_at desc limit 1`) === "resolved|document"
      && sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.family_name' and superseded_by_id is null`) === "SAMPLED");
    // ---- BR-8/11 answer in place what the document cannot give (a country given only as a code)
    const left = (await proposals()).find((p) => p.source.document === doc && p.fact === "person.citizenship" && p.left_why);
    if (left) {
      await drawer.locator(`[data-document-block="${doc}"] [data-value="person.citizenship"] [data-answer-in-place="person.citizenship"]`).click();
      const form = drawer.locator(`[data-in-place-form="person.citizenship"]`);
      const field = form.locator("input, select").first();
      if ((await field.evaluate((e) => e.tagName)) === "SELECT") await field.selectOption({ label: "India" }); else await field.fill("India");
      await form.getByRole("button", { name: "Save" }).click(); await form.waitFor({ state: "detached", timeout: 20_000 });
    }
    ok("C6.5-30 pass (BR-8, BR-11): a value the passport cannot give is answered in the drawer, with the question's own field, and fills at once", !!left && sql(`select lower(value_json #>> '{}') from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.citizenship' and superseded_by_id is null`) === "india", left);
    ok("C6.5-30 fail (BR-8): answering it in place opens no check", sql(`select count(*) from answer_check where subject_id='${P}' and fact='person.citizenship'`) === "0");
    // ---- BR-12 mark checked where it adds evidence (break M2 on c5415ebff)
    const mark = drawer.locator(`[data-document-block="${doc}"] [data-mark-checked="person.citizenship"]`);
    await mark.waitFor({ timeout: 20_000 }); // the drawer reloads after the save; the mark appears with the new answer
    const markShown = await mark.count();
    if (markShown) { await mark.click(); await drawer.locator(`[data-document-block="${doc}"] [data-mark-checked="person.citizenship"]`).waitFor({ state: "detached", timeout: 20_000 }); }
    ok("C6.5-30b pass (BR-12, P-142 D3): a value the passport could not give, once answered, is marked checked against the passport from the drawer", markShown === 1 && sql(`select status || '|' || coalesce(source_json->'checked_against'->>'document','') from client_canonical_answer where subject_id='${P}' and canonical_field_key='person.citizenship' and superseded_by_id is null`) === `VERIFIED|${doc}`, markShown);
    ok("C6.5-30b fail (BR-12): a value used from the passport (already checked by its use) offers no mark", (await drawer.locator(`[data-document-block="${doc}"] [data-mark-checked="person.passport_number"]`).count()) === 0);
    // ---- break m4: Escape inside an in-place form closes that form, not the drawer
    const other = drawer.locator(`[data-document-block="${doc}"] [data-answer-in-place="person.passport_country_of_issue"]`);
    if (await other.count()) { await other.click(); await drawer.locator(`[data-in-place-form="person.passport_country_of_issue"]`).waitFor({ timeout: 10_000 }); await page.keyboard.press("Escape"); }
    ok("C6.5-30c fail (break m4): Escape inside an open answer closes that answer only; the drawer stays open", (await drawer.locator("[data-in-place-form]").count()) === 0 && (await drawer.count()) === 1);
    // ---- BR-3 open the stored file (staff only)
    const fileAs = (p: Page, actor: string) => p.evaluate(async ([d, a]) => { const r = await fetch(`/api/runtime/documents/${d}/file`, { headers: { "x-actor": a } }); return { status: r.status, size: (await r.arrayBuffer()).byteLength }; }, [doc, actor] as const);
    const [mine, theirs] = [await fileAs(page, OFFICER), await fileAs(client, CLIENT)];
    ok("C6.5-31 pass (BR-3): \"Open\" fetches the stored passport for the case officer, its own bytes", (await drawer.locator(`[data-document-block="${doc}"] [data-open-file]`).count()) === 1 && mine.status === 200 && String(mine.size) === sql(`select size_bytes from case_document where id='${doc}'`), mine);
    ok("C6.5-31 fail (BR-3): the client cannot open it (403)", theirs.status === 403, theirs);
    // ---- BR-4 fail: a failed check digit collapses nothing
    await page.keyboard.press("Escape");
    await openDrawer(S, passSec, "person.passport_number");
    const spouseText = await drawer.innerText();
    ok("C6.5-32 fail (BR-4, P-243): on a passport whose check digit failed nothing is collapsed and the number is \"could not read\"", (await drawer.locator("[data-collapsed]").count()) === 0 && (await drawer.locator("[data-could-not-read]").count()) > 0 && /one failed/.test(spouseText));
    // ---- BR-2 letters: the cost first, never a live read
    await page.keyboard.press("Escape");
    await upload(PORT, `/runtime/cases/${c.id}/documents`, textPdf(["SYNTHETIC SPECIMEN - MADE-UP TEST DOCUMENT - NOT VALID", "Letter of invitation (Sample), a copy with no saved read"]), "sample-letter-of-invitation.pdf", OFFICER, { subjectId: c.caseSubject, documentType: "letter_of_invitation" });
    await openDrawer(c.caseSubject, visit, "case.visit_purpose");
    const card = drawer.locator("[data-cost-card]");
    ok("C6.5-33 pass (BR-2, P-110): a letter shows its cost card (usual and at most) before any read", (await card.count()) === 1 && /about US\$\d+\.\d\d, at most US\$\d+\.\d\d/.test(await card.innerText()));
    ok("C6.5-33 fail (BR-2, P-175): with no saved read there is no read button at all, nothing is read and nothing is spent", (await card.getByRole("button").count()) === 0 && (await card.locator("[data-no-saved-read]").count()) === 1 && sql(`select count(*) from document_review r join case_document d on d.id = r.document_id where d.subject_id='${c.caseSubject}'`) === "0" && sql("select count(*) from ai_batch") === spend0);
    // ---- break M1 on c5415ebff: a file replaced while the drawer is open; the server's words are shown, nothing written
    await page.keyboard.press("Escape");
    const K = c.subjects["Sample Child A2"];
    const kLine = await lineOf(K);
    const kDoc = (await upload(PORT, `/runtime/checklist-lines/${kLine}/documents`, passportPdf({ ...pass, surname: "SAMPLEK", given: "CHILD A", number: "SAMPLEK56", dob: FAMILY[3].dob! }), "child.pdf", OFFICER)).body?.document?.id as string;
    await openDrawer(K, passSec, "person.passport_number");
    for (const f of await drawer.locator(`[data-document-block="${kDoc}"] [data-tick]`).evaluateAll((e) => e.map((x) => x.getAttribute("data-tick")))) await drawer.locator(`[data-document-block="${kDoc}"] [data-tick="${f}"]`).check();
    await upload(PORT, `/runtime/checklist-lines/${kLine}/documents`, passportPdf({ ...pass, surname: "SAMPLEK", given: "CHILD A", number: "SAMPLEK57", dob: FAMILY[3].dob! }), "child-new.pdf", CLIENT);
    await drawer.locator(`[data-document-block="${kDoc}"] [data-confirm-and-use]`).click();
    await drawer.locator("[data-drawer-notice]").waitFor({ timeout: 20_000 });
    ok("C6.5-28b fail (break M1): when the file was replaced meanwhile, Confirm & use shows the server's words at the drawer's top and writes nothing", /newer file/i.test(await drawer.locator("[data-drawer-notice]").innerText()) && sql(`select coalesce(confirmed_by,'') from document_review where document_id='${kDoc}'`) === "", await drawer.locator("[data-drawer-notice]").innerText());
    // ---- Review M2 on c5415ebff: the concept's remaining test pairs, on Child A1 (keyboard only) and the spouse
    await page.keyboard.press("Escape");
    const K1 = c.subjects["Sample Child A1"];
    const k1Doc = (await upload(PORT, `/runtime/checklist-lines/${await lineOf(K1)}/documents`, passportPdf({ ...pass, surname: "SAMPLEK", given: "CHILD B", number: "SAMPLEK58", dob: FAMILY[2].dob! }), "child-b.pdf", OFFICER)).body?.document?.id as string;
    await page.goto(`/cases/${c.id}#${lineIdOf(K1, "person.passport_number")}`); await w.settle(page, "the case page");
    await page.locator(`#s-${K1}-${passSec} [data-fill-from-documents]`).focus(); await page.keyboard.press("Enter");
    await drawer.waitFor({ timeout: 30_000 }); await w.settle(page, "the drawer");
    const k1 = drawer.locator(`[data-document-block="${k1Doc}"]`);
    // A stale answer: the officer corrects the given names in place while another tab saves another value first.
    await k1.locator(`[data-answer-in-place="person.given_names"]`).click();
    const gForm = k1.locator(`[data-in-place-form="person.given_names"]`);
    await gForm.locator("input").first().fill("CHILD BB");
    await answer(c.id, K1, "person.given_names", "CHILD BX", OFFICER);
    await gForm.getByRole("button", { name: "Save" }).click();
    await gForm.getByText(/changed|someone/i).first().waitFor({ timeout: 15_000 });
    ok("C6.5-36 fail (BR-11): \"Correct it\" over an answer another tab changed first is refused in the server's words (409), and the other answer stays", sql(`select value_json #>> '{}' from client_canonical_answer where subject_id='${K1}' and canonical_field_key='person.given_names' and superseded_by_id is null`) === "CHILD BX");
    await page.keyboard.press("Escape"); // closes the answer only (break m4)
    await k1.locator(`[data-value="person.given_names"] [data-differs]`).waitFor({ timeout: 15_000 });
    // Keyboard only: tick each value that needs a look with Space, then Confirm & use with Enter.
    for (const f of await k1.locator("[data-tick]").evaluateAll((e) => e.map((x) => x.getAttribute("data-tick")))) { await k1.locator(`[data-tick="${f}"]`).focus(); await page.keyboard.press("Space"); }
    await k1.locator("[data-confirm-and-use]").focus(); await page.keyboard.press("Enter");
    await k1.locator("[data-confirmed]").waitFor({ timeout: 20_000 });
    ok("C6.5-37 pass (EXPERIENCE §6 BIC-20): the drawer opens, ticks and uses a document by keyboard alone, and focus lands on the confirmed line", sql(`select confirmed_by from document_review where document_id='${k1Doc}'`) === OFFICER && await page.evaluate(() => document.activeElement?.hasAttribute("data-confirmed") ?? false), { confirmedBy: sql(`select confirmed_by from document_review where document_id='${k1Doc}'`), focus: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)) });
    // The corrected value opened its check with "Keep the current answer" chosen; no mark while it is open.
    const kResolve = drawer.locator(`[data-resolve-check="person.given_names"]`);
    await kResolve.waitFor({ timeout: 20_000 });
    ok("C6.5-38 pass (BR-11): a corrected value opens its check at Confirm & use with \"Keep the current answer\" already chosen", await kResolve.getByLabel("Keep the current answer").isChecked());
    ok("C6.5-38 fail (BR-12): while its check is open the value offers no \"Mark checked\" (the server would refuse it, 409 open_checks)", (await k1.locator(`[data-mark-checked="person.given_names"]`).count()) === 0);
    await kResolve.getByLabel("Reason (required)").fill("The client's renewed passport spells it so (Sample)");
    await kResolve.getByRole("button", { name: "Save" }).click(); await kResolve.waitFor({ state: "detached", timeout: 20_000 });
    // Lead 36 on #1369 (follow-up row): an answer kept over the document's value differs from it, so it is never marked
    // checked against it; the row says it was kept, and the server refuses the mark without opening a second check.
    await k1.locator(`[data-row-state="resolved"] [data-kept-answer]`).first().waitFor({ timeout: 20_000 });
    const kMarkShown = await k1.locator(`[data-mark-checked="person.given_names"]`).count();
    const kRefused = await call("POST", `/runtime/cases/${c.id}/answers/${K1}/person.given_names/checked-against-document`, { document: k1Doc }, OFFICER);
    ok("C6.5-39 fail (BR-12 as ruled by Lead 36): an answer kept over the passport by a resolved check shows \"Check resolved\" and \"kept over the document\", offers no mark, and the server refuses one (409 kept_over_document) without a second check", kMarkShown === 0 && /Check resolved/.test(await k1.innerText())
      && kRefused.status === 409 && kRefused.body?.code === "kept_over_document" && sql(`select count(*) from answer_check where subject_id='${K1}' and fact='person.given_names'`) === "1"
      && sql(`select status || '|' || (value_json #>> '{}') from client_canonical_answer where subject_id='${K1}' and canonical_field_key='person.given_names' and superseded_by_id is null`) !== `VERIFIED|CHILD BX`, { kMarkShown, kRefused: kRefused.body });
    // Review n4 on f9bea4a3b: an answer typed after that resolve was never kept over the passport: its row offers the mark
    // again, and the server opens a check for the new difference, which the drawer then shows.
    await answer(c.id, K1, "person.given_names", "CHILD BV", OFFICER);
    await page.keyboard.press("Escape"); await drawer.waitFor({ state: "detached", timeout: 15_000 });
    await page.reload(); await w.settle(page, "the case page"); // the answer was saved elsewhere: the officer comes back to the page
    await openDrawer(K1, passSec, "person.passport_number");
    const kNewMark = k1.locator(`[data-mark-checked="person.given_names"]`);
    await kNewMark.waitFor({ timeout: 20_000 });
    const keptWordsAfter = await k1.locator(`[data-row-state="resolved"] [data-kept-answer]`).count();
    await kNewMark.click();
    await drawer.locator(`[data-resolve-check="person.given_names"]`).waitFor({ timeout: 20_000 });
    ok("C6.5-39b pass (review n4): an answer typed after the resolve is not \"kept over the document\": the row offers the mark, and clicking it opens a check for the new difference (shown in the drawer), never VERIFIED", keptWordsAfter === 0
      && sql(`select count(*) from answer_check where subject_id='${K1}' and fact='person.given_names' and state='open'`) === "1"
      && sql(`select status || '|' || (value_json #>> '{}') from client_canonical_answer where subject_id='${K1}' and canonical_field_key='person.given_names' and superseded_by_id is null`) === "DECLARED|CHILD BV", { keptWordsAfter });
    const kOpen = sql(`select id from answer_check where subject_id='${K1}' and fact='person.given_names' and state='open'`);
    await call("POST", `/runtime/checks/${kOpen}/resolve`, { keep: "document", reason: "The passport reads it so (Sample)" }, OFFICER); // leaves the case as the next steps expect
    // A second tab confirmed first: the click shows who and when, in IST.
    await page.keyboard.press("Escape");
    const sDoc = (await upload(PORT, `/runtime/checklist-lines/${await lineOf(S)}/documents`, passportPdf({ ...pass, surname: "SAMPLES", given: "SPOUSE A", number: "SAMPLES35", dob: FAMILY[1].dob! }), "spouse-good.pdf", OFFICER)).body?.document?.id as string;
    await openDrawer(S, passSec, "person.passport_number");
    await drawer.locator(`[data-document-block="${sDoc}"] [data-confirm-and-use]`).waitFor({ timeout: 20_000 });
    const sLook = (await proposals(S)).filter((p) => p.source.document === sDoc && p.needs_look).map((p) => p.id);
    for (const f of await drawer.locator(`[data-document-block="${sDoc}"] [data-tick]`).evaluateAll((e) => e.map((x) => x.getAttribute("data-tick")))) await drawer.locator(`[data-document-block="${sDoc}"] [data-tick="${f}"]`).check();
    await call("POST", `/runtime/cases/${c.id}/documents/${sDoc}/confirm-and-use`, { subjectId: S, checked: sLook }, OFFICER);
    await drawer.locator(`[data-document-block="${sDoc}"] [data-confirm-and-use]`).click();
    await drawer.locator("[data-drawer-notice]").waitFor({ timeout: 20_000 });
    ok("C6.5-40 fail (BR-9): when another tab confirmed the document first, the click shows who confirmed it and when, in IST, and writes nothing more", /already confirmed and used by .+ IST/i.test(await drawer.locator("[data-drawer-notice]").innerText()) && sql(`select count(*) from document_review where document_id='${sDoc}' and confirmed_by is not null`) === "1", await drawer.locator("[data-drawer-notice]").innerText());
    // BR-13: proof of funds is never "read by a person" (only identity documents about this person are).
    await page.keyboard.press("Escape");
    const funds = (((await call("GET", `/runtime/cases/${c.id}/checklist`, undefined, OFFICER)).body?.people ?? []).find((x: { subject: string }) => x.subject === P)?.lines ?? []).find((x: { label: string }) => /financial|funds/i.test(x.label))?.id;
    if (funds) await upload(PORT, `/runtime/checklist-lines/${funds}/documents`, letterPdf(), "funds.pdf", OFFICER);
    await openDrawer(P, passSec, "person.passport_number");
    ok("C6.5-41 fail (BR-13): proof of funds is never listed as read by a person (only identity documents about this person are; this release has no national ID line to show the pass)", !!funds && !(await drawer.locator("[data-read-by-person]").allTextContents()).some((t) => /financial|funds/i.test(t)));
    // ---- BR-14 plain words
    await page.keyboard.press("Escape");
    await openDrawer(P, passSec, "person.passport_number");
    const words = await drawer.innerText();
    ok("C6.5-34 fail (BR-14): the drawer shows no fact keys, decision numbers, file paths or model names", !/\b(person|case)\.[a-z_]+\b|\bP-\d{2,3}\b|\.ts\b|\bclaude-|FQ-\d+/.test(words), words.match(/\b(person|case)\.[a-z_]+\b|\bP-\d{2,3}\b|\.ts\b|\bclaude-|FQ-\d+/g));
    // ---- keyboard and screen sizes
    await page.keyboard.press("Escape");
    await drawer.waitFor({ state: "detached", timeout: 10_000 });
    const back = await page.evaluate(() => document.activeElement?.getAttribute("data-fill-from-documents"));
    ok("C6.5-35 pass: Escape closes the drawer and returns focus to the button that opened it", back === passSec, back);
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    const axe: Record<number, string[]> = {}, fits: Record<number, boolean> = {};
    for (const width of [1440, 1024, 400]) {
      await page.setViewportSize({ width, height: 900 });
      await openDrawer(P, passSec, "person.passport_number");
      axe[width] = (await new AxeBuilder({ page }).include("[role=dialog]").withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => `${v.id} (${v.nodes.length})`);
      fits[width] = await page.evaluate(() => { const d = document.querySelector("[role=dialog]") as HTMLElement | null; return !!d && d.scrollWidth <= d.clientWidth + 1; });
      if (width === 1440 && process.env.C65_SHOTS) await page.screenshot({ path: `${process.env.C65_SHOTS}/drawer-1440.png` });
      await page.keyboard.press("Escape"); await drawer.waitFor({ state: "detached", timeout: 10_000 });
    }
    ok("C6.5-35 fail: no accessibility violation in the drawer at 1440, 1024 or 400 px, and no sideways scroll in it", Object.values(axe).every((v) => v.length === 0) && Object.values(fits).every(Boolean), { axe, fits });
    ok("C6.5-35 page errors: none while walking", w.errors.length === 0, w.errors);
  } finally { await w.close(); }
});
