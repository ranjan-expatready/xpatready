// B83 (QA-234, P-322; product/screens/B83-own-question-screen/concept.md): "Ask as its own question" through the screen, as a
// person does it on Visitor visa of the six: the Smart questionnaire's line, the Form fields page's section, its rules
// (BR-1 to BR-6, BR-9), keyboard, axe, 1440, 1024 and 400 px, and IMM 5257's three form fields asked with the Sample
// table's words, so the rest of the people's steps and C4.11's pack can follow on this copy. Route refusals and BR-10:
// tests/check_b52_own_yes_no.ts. Screenshots: product/screens/B83-own-question-screen/walk/. US$0, live AI off.
//   zsh studio/tools/isolated.sh b83 4443 start && node studio/tests/check_b83_own_question_screen_browser.cjs 4443 xr_studio_b83
const path = require("node:path"); const fs = require("node:fs"); const { execFileSync } = require("node:child_process");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_b83", BASE = `http://localhost:${PORT}`;
const STUDIO = path.join(__dirname, ".."), OUT = path.join(STUDIO, "..", "..", "product", "screens", "B83-own-question-screen", "walk");
const PROTO = path.join(STUDIO, "..");
const sql = (q) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const steps = (mode) => execFileSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["studio/tests/b83_six_steps.ts", String(PORT), DB, mode], { cwd: PROTO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C4.11 ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
const WORDS = [
  { box: "AliasNameIndicator", label: "Has used other name", meaning: "Whether the person has ever used any other name, such as a nickname, maiden name or alias (IMM 5257 p. 1, Question 2 A)." },
  { box: "natIDIndicator", label: "Has national ID", meaning: "Whether the person has a national identity document (IMM 5257 p. 2, National identity document, Question 1)." },
  { box: "usCardIndicator", label: "US permanent resident", meaning: "Whether the person is a lawful permanent resident of the United States with a valid alien registration card (green card) (IMM 5257 p. 2, US PR card, Question 1)." },
];
const WHY = "The form asks this Yes/No itself before its details (walk)";
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  console.log(steps("apply").trim().split("\n").pop().slice(0, 200));
  const vv = sql("select id from combination where combination_key = 'vv.single'");
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium/chrome-linux/chrome" } : {}) });
  const as = async (actor, width = 1440) => { const c = await b.newContext({ viewport: { width, height: 900 } }); c.setDefaultNavigationTimeout(180_000); await c.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, actor); return c.newPage(); };
  const page = await as("user-A");
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));

  // The way in: the Smart questionnaire's line, with the form number and the count from data.
  await page.goto(`${BASE}/c/${vv}/questionnaires`, { waitUntil: "networkidle" });
  const line = page.locator("[data-own-line]");
  await line.waitFor({ timeout: 60_000 });
  const lineText = await line.innerText();
  ok("line: the Smart questionnaire says which form works out how many Yes/No answers (form number and count from data)", /IMM 5257 works out 3 Yes\/No answers from other answers/.test(lineText), lineText);
  await line.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, "1-smart-questionnaire-line-1440.png") });
  const axeOf = async (p, what, scope) => { const r = await new AxeBuilder({ page: p }).include(scope).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze(); ok(`axe (WCAG 2.2 AA): ${what}`, r.violations.length === 0, r.violations.map((v) => v.id)); };
  await axeOf(page, "the Smart questionnaire's line", "[data-own-line]");
  const approver = await as("user-B");
  await approver.goto(`${BASE}/c/${vv}/questionnaires`, { waitUntil: "networkidle" });
  ok("line fail (BR-2): someone who is not the author is not sent there", (await approver.locator("[data-own-line]").count()) === 0);
  await line.getByRole("link").first().click();
  const section = page.locator("[data-own-questions]");
  await section.waitFor({ timeout: 60_000 });
  const edId = /form-fields\/([0-9a-f-]+)/.exec(page.url())?.[1];
  await page.waitForLoadState("networkidle");
  const landedOn = await page.waitForFunction(() => { const e = document.querySelector("[data-own-questions]"); if (!e || document.activeElement !== e) return false; const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < window.innerHeight; }, undefined, { timeout: 30_000 }).then(() => true, () => false);
  ok("line: its link lands on the section, in view with the keyboard there, past any long list of undecided form fields", landedOn);
  await page.screenshot({ path: path.join(OUT, "2-form-fields-section-1440.png") });

  // BR-1, BR-3: what is offered.
  const rows = section.locator("[data-own-row]");
  ok("BR-1 pass: the worked-out Yes/No form fields are listed with the form's words (5 on IMM 5257)", (await rows.count()) === 5 && /Do you have a national identity document\?/.test(await section.innerText()), await rows.count());
  const row = (box) => section.locator(`[data-own-row*="${box}"]`);
  ok("BR-1 fail: a form field that names no facts (Question 8 A) has no button, and says why", (await row("PCRIndicator").locator("[data-own-ask]").count()) === 0 && /cannot be checked/.test(await row("PCRIndicator").innerText()));
  ok("BR-1 fail: a plain form field is not listed", (await row("ServiceIn").count()) === 0);
  ok("BR-3 pass: Question 8 A shows its own question, never its neighbour's heading", /During the past 5 years/.test(await row("PCRIndicator").innerText()) && !/Date of birth/.test(await section.innerText()));
  ok("words: no key or data path on the main path", !/person\.[a-z_]+|form1\[/.test(await section.innerText()), (await section.innerText()).slice(0, 300));

  // BR-2: who may act.
  await approver.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "networkidle" });
  await approver.locator("[data-own-questions]").waitFor({ timeout: 60_000 });
  ok("BR-2 fail: the Approver reads the section, with no button and who acts", (await approver.locator("[data-own-ask], [data-own-undo]").count()) === 0 && /A configuration author asks these/.test(await approver.locator("[data-own-questions]").innerText()));
  await axeOf(approver, "the section read-only", "[data-own-questions]");

  // BR-6: "Why" starts empty, and a short one is refused on the form, with the keyboard there. By keyboard, as a person would.
  const ask = row(WORDS[0].box).locator("[data-own-ask]");
  await ask.focus(); await page.keyboard.press("Enter");
  const form = row(WORDS[0].box).locator("[data-own-form]");
  await form.waitFor();
  ok("BR-6 pass: \"Why\" starts empty and nothing is chosen for the person", (await form.getByLabel("Why", { exact: true }).inputValue()) === "");
  await form.getByRole("radio", { name: "Name a new one" }).focus(); await page.keyboard.press("Space");
  ok("prefill: the meaning starts from the form's own question", /^Whether: Have you ever used any other name/.test(await form.getByLabel("What it means").inputValue()), await form.getByLabel("What it means").inputValue());
  await form.getByLabel("Name", { exact: true }).focus(); await page.keyboard.type(WORDS[0].label);
  await form.getByLabel("What it means").fill(WORDS[0].meaning);
  await form.getByLabel("Why", { exact: true }).focus(); await page.keyboard.type("short");
  await form.getByRole("button", { name: /Ask it/ }).focus(); await page.keyboard.press("Enter");
  const err = form.locator("[data-own-error]");
  await err.waitFor();
  ok("BR-6 fail: a short reason is refused on the form, in words, with the keyboard on the message", /at least 8/.test(await err.innerText()) && (await page.evaluate(() => document.activeElement?.hasAttribute("data-own-error"))));
  await page.screenshot({ path: path.join(OUT, "3-open-with-error-1440.png") });
  const axeOpen = await new AxeBuilder({ page }).include("[data-own-questions]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  ok("axe (WCAG 2.2 AA): the section with a form open and an error", axeOpen.violations.length === 0, axeOpen.violations.map((v) => v.id));

  const save = async (r, w, why) => {
    const f = r.locator("[data-own-form]");
    if (why !== undefined) await f.getByLabel("Why", { exact: true }).fill(why);
    await f.getByRole("button", { name: /Ask it/ }).click();
    await Promise.race([r.locator("[data-own-asked]").waitFor({ timeout: 30_000 }), f.locator("[data-own-error]").waitFor({ timeout: 30_000 })]);
    // A busy Mac: Postgres answers "Interrupted system call" now and then (5 Nov), and the save rolls back: pressed again once.
    if (await f.locator("[data-own-error]").count() && /went wrong on the server/.test(await f.locator("[data-own-error]").innerText())) {
      await f.getByRole("button", { name: /Ask it/ }).click();
      await page.waitForTimeout(1000);
      await Promise.race([r.locator("[data-own-asked]").waitFor({ timeout: 30_000 }), f.locator("[data-own-error]").waitFor({ timeout: 30_000 })]);
    }
    if (await f.locator("[data-own-error]").count() && /is close to the library/.test(await f.locator("[data-own-error]").innerText())) {
      await f.getByLabel("Why it is not the same").fill("The form's own Yes/No question, not the detail it leads to (walk).");
      await f.getByRole("button", { name: /Ask it/ }).click();
      await r.locator("[data-own-asked]").waitFor({ timeout: 30_000 });
    }
    return w;
  };
  await save(row(WORDS[0].box), WORDS[0], WHY);
  await page.waitForLoadState("networkidle");
  ok("BR-4 pass: a new field is asked, and the row says a second person approves it, where, and that release is held until then", /Asked as "Has used other name"/.test(await row(WORDS[0].box).innerText()) && /second person approves it on To review; release is held until then/.test(await row(WORDS[0].box).innerText()));
  ok("review N2: the row's To review leads to the page that withdraws it", /\/review\/change\//.test((await row(WORDS[0].box).locator("[data-own-change]").getAttribute("href")) ?? ""));
  ok("BR-8 words: the section says a form field not asked holds nothing, and what holds release once one is", /A form field not asked holds nothing/.test(await section.innerText()) && /or release is held; a new field also holds release until a second person approves it/.test(await section.innerText()));
  await axeOf(page, "the section with a form field asked and waiting", "[data-own-questions]");
  const landed = await page.waitForFunction(() => document.activeElement?.hasAttribute("data-own-ask"), undefined, { timeout: 30_000 }).then(() => true, () => false);
  ok("after a save the keyboard lands on the next form field to ask", landed, await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 120)));
  ok("BR-9 toast: the save says what is next, that release is held until then (BR-8), and offers Undo", /Next: Smart questionnaire.*or release is held/.test(await page.locator("[data-undo-toast]").innerText()) && (await page.locator("[data-undo-toast] [data-undo]").count()) === 1);
  await page.screenshot({ path: path.join(OUT, "4-asked-with-undo-1440.png") });

  // BR-5: the same name.
  await row(WORDS[1].box).locator("[data-own-ask]").click();
  const f2 = row(WORDS[1].box).locator("[data-own-form]");
  await f2.waitFor();
  ok("BR-6 pass: after the first save the next form field starts with what this person typed", (await f2.getByLabel("Why", { exact: true }).inputValue()) === WHY);
  await f2.getByRole("radio", { name: "Name a new one" }).check();
  await f2.getByLabel("Name", { exact: true }).fill("HAS USED other name");
  ok("BR-5 fail: a name the library holds is caught as it is typed, offering that field", /already in the library/.test(await f2.locator("[data-own-twin]").innerText()));
  await f2.getByLabel("Name", { exact: true }).fill(WORDS[1].label);
  await f2.getByLabel("What it means").fill(WORDS[1].meaning);
  await save(row(WORDS[1].box), WORDS[1]);
  await page.waitForLoadState("networkidle");

  // BR-9: Undo on the row takes a new field back with it; asking again works.
  const key = sql(`select canonical_field_key from canonical_field where label = '${WORDS[1].label}'`);
  await row(WORDS[1].box).locator("[data-own-undo]").click();
  await row(WORDS[1].box).locator("[data-own-ask]").waitFor({ timeout: 30_000 });
  ok("BR-9 pass: Undo on the row puts it back to worked out and withdraws its new field", sql(`select count(*) from canonical_field where canonical_field_key = '${key}'`) === "0" && sql(`select status from library_change where key = '${key}'`) === "WITHDRAWN");
  ok("review F7: after Undo the keyboard is on that row's Ask button, not lost", await page.waitForFunction((b) => !!document.activeElement?.hasAttribute("data-own-ask") && !!document.activeElement?.closest(`[data-own-row*="${b}"]`), WORDS[1].box, { timeout: 10_000 }).then(() => true, () => false));
  ok("review F2: the row says what the undo came to", /Taken back.*Its new field was withdrawn/.test(await row(WORDS[1].box).locator("[data-own-said]").innerText()));
  await axeOf(page, "the section with an undo's words on the row", "[data-own-questions]");

  // Review F2, F5: the toast's Undo and a stale row say what happened, on the row, and the list refreshes. A throwaway new field.
  const api = async (method, p, body, actor = "user-A") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };
  const R = row(WORDS[1].box);
  const dp = await R.getAttribute("data-own-row");
  const askThrow = async (label) => {
    await R.locator("[data-own-ask]").click();
    const f = R.locator("[data-own-form]"); await f.waitFor();
    await f.getByRole("radio", { name: "Name a new one" }).check();
    await f.getByLabel("Name", { exact: true }).fill(label);
    await f.getByLabel("What it means").fill(`Whether ${label}: a B83 check, Sample.`);
    await save(R, null, WHY);
    await R.locator("[data-own-undo]").waitFor({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
  };
  const toastUndo = async () => { await page.locator("[data-undo-toast] [data-undo]").click(); await R.locator("[data-own-said]").waitFor({ timeout: 30_000 }); await R.locator("[data-own-ask]").waitFor({ timeout: 30_000 }); };
  await askThrow("B83 toast check");
  await toastUndo();
  ok("review F2 (a) taken back from the toast: the row says so, and the toast's words are not the only copy", /Taken back.*Its new field was withdrawn/.test(await R.locator("[data-own-said]").innerText()) && (await R.getAttribute("data-own-row")) === dp && (await R.locator("[data-own-ask]").count()) === 1, await R.innerText());
  ok("review F7: after the toast's Undo the keyboard is on that row's Ask button", await page.waitForFunction((b) => !!document.activeElement?.hasAttribute("data-own-ask") && !!document.activeElement?.closest(`[data-own-row*="${b}"]`), WORDS[1].box, { timeout: 10_000 }).then(() => true, () => false));
  await askThrow("B83 toast kept");
  const keptKey = sql("select canonical_field_key from canonical_field where label = 'B83 toast kept'"), keptChange = sql(`select id from library_change where key = '${keptKey}' and status = 'WAITING'`);
  const keptRule = await api("POST", `/combinations/${vv}/rules`, { condition: { subjectKind: "EACH_APPLICANT", op: "eq", field: keptKey, value: true }, whenPlain: "a rule that reads it (B83 walk)", thenPlain: "nothing, it is a walk check", forWhom: "each_applicant" });
  await toastUndo();
  ok("review F2 (b) kept: the row says the new field stays waiting and names what reads it, no key", keptRule.status < 300 && /stays waiting on To review, under Waiting for others: the rule "nothing, it is a walk check"/.test(await R.locator("[data-own-said]").innerText()) && !/person\.[a-z_]+/.test(await R.locator("[data-own-said]").innerText()), await R.locator("[data-own-said]").innerText());

  // The tech lead's ruling on breaker M5, on the screen: To review's withdraw names the reader before the press, goes ahead, says so.
  // Review N2: the Fields row is a second door to the same withdrawal: it names the reader before the press too.
  await page.goto(`${BASE}/library/fields`, { waitUntil: "networkidle" });
  await page.getByLabel("Search fields").fill("B83 toast kept");
  const door = page.locator(`tr[data-item="${keptKey}"] [data-action="WITHDRAW"]`);
  await door.waitFor({ timeout: 60_000 });
  await door.click();
  const doorPanel = page.locator(`[data-item-panel="${keptKey}"]`);
  await doorPanel.getByText(/It leaves the rule "nothing, it is a walk check"/).waitFor({ timeout: 30_000 }).catch(() => {});
  ok("review N2 fail test: the Fields row's Withdraw names the reader before the press, no key", /It leaves the rule "nothing, it is a walk check"/.test(await doorPanel.innerText()) && !/person\.[a-z_]+/.test(await doorPanel.innerText()), await doorPanel.innerText());
  await doorPanel.getByRole("button", { name: "Cancel" }).click();
  // Review N2: by clicks, as a person: undo's words say To review, and To review has the step.
  await page.goto(`${BASE}/review?f=waiting`, { waitUntil: "networkidle" });
  const step = page.locator(`[data-next] a[href*="/review/change/${keptChange}"]`).first();
  await step.waitFor({ timeout: 60_000 });
  ok("review N2 fail test: To review offers the author a step on their own waiting field, not \"No step for you\"", /Open or withdraw/.test(await step.innerText()), await step.innerText());
  await step.click();
  await page.getByRole("button", { name: "Withdraw it instead…" }).click();
  const named = page.locator("[data-withdraw-readers]");
  await named.waitFor({ timeout: 30_000 });
  ok("M5 ruling: To review's withdraw names the reader before the press, no key", /the rule "nothing, it is a walk check"/.test(await named.innerText()) && !/person\.[a-z_]+/.test(await named.innerText()), await named.innerText());
  await axeOf(page, "To review's withdraw with its reader named", "[data-withdraw]");
  await page.screenshot({ path: path.join(OUT, "7-withdraw-names-reader-1440.png") });
  await page.getByLabel("Why withdraw it").fill("A walk check of the words");
  await page.getByRole("button", { name: "Withdraw the new field" }).click();
  const afterWords = await page.getByText(/Still reading it/).first().innerText({ timeout: 15_000 }).catch(() => "");
  ok("M5 ruling: the withdraw's answer names the reader after the press too", /the rule "nothing, it is a walk check"/.test(afterWords), afterWords);
  await page.waitForURL(/\/review/, { timeout: 30_000 });
  let submitted = await api("POST", `/combinations/${vv}/submit`, { note: "B83 walk" });
  if (submitted.status >= 500) submitted = await api("POST", `/combinations/${vv}/submit`, { note: "B83 walk" }); // a busy Mac: Postgres "Interrupted system call" (4 Nov)
  const lines = (submitted.body?.errors ?? []).map((e) => e.message).join(" · ");
  ok("M5 ruling: Submit refuses by name while the rule reads the withdrawn field, no key", submitted.status >= 400 && /B83 toast kept/.test(lines) && /a new field that was withdrawn/.test(lines) && !/person\.b83/.test(`${lines} ${submitted.body?.detail}`), submitted);
  sql(`delete from predicate where combination_id = '${vv}' and predicate_json::text like '%${keptKey}%'`);
  await page.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "networkidle" });
  await section.waitFor({ timeout: 60_000 });

  await askThrow("B83 toast stale");
  const taken = await api("POST", `/editions/${edId}/form-fields/own-question/undo`, { dataPath: dp });
  await toastUndo();
  ok("review F2 (c) another tab undid first: the toast's Undo shows the refusal as an alert, and the row refreshes to Ask", taken.status < 300 && (await R.locator("[data-own-said][role=alert]").count()) === 1 && /nothing to take back/.test(await R.locator("[data-own-said]").innerText()) && (await R.locator("[data-own-ask]").count()) === 1, await R.innerText());
  await askThrow("B83 row stale");
  await api("POST", `/editions/${edId}/form-fields/own-question/undo`, { dataPath: dp });
  await R.locator("[data-own-undo]").click();
  await R.locator("[data-own-said][role=alert]").waitFor({ timeout: 30_000 });
  await R.locator("[data-own-ask]").waitFor({ timeout: 30_000 });
  ok("review F5: a stale row's Undo shows the refusal, and the row refreshes to Ask", /nothing to take back/.test(await R.locator("[data-own-said]").innerText()) && (await R.locator("[data-own-ask]").count()) === 1);
  await R.locator("[data-own-ask]").click();
  await R.locator("[data-own-form]").waitFor();
  const lib0 = (await api("GET", `/editions/${edId}/form-fields/own-questions`)).body.yes_no_fields.filter((f) => f.key.startsWith("person.")).sort((a, b) => a.key.localeCompare(b.key))[0]; // about a person, as this row is: any other is refused
  const other = await api("POST", `/editions/${edId}/form-fields/own-question`, { dataPath: dp, reason: WHY, field: lib0.key });
  await R.locator("[data-own-form]").getByLabel("Why", { exact: true }).fill(WHY);
  await R.locator("[data-own-form]").getByRole("radio", { name: "Name a new one" }).check();
  await R.locator("[data-own-form]").getByLabel("Name", { exact: true }).fill("B83 too late");
  await R.locator("[data-own-form]").getByRole("button", { name: /Ask it/ }).click();
  await R.locator("[data-own-said][role=alert]").waitFor({ timeout: 30_000 });
  ok("review F5: a refused save refreshes the list: the row now shows how it is asked, and the refusal stays on it, no key", other.status < 300 && /already asked/.test(await R.locator("[data-own-said]").innerText()) && (await R.locator("[data-own-asked]").count()) === 1 && !/person\.[a-z_]+|form1\[/.test(await R.innerText()), await R.innerText());
  await api("POST", `/editions/${edId}/form-fields/own-question/undo`, { dataPath: dp });
  await page.reload({ waitUntil: "networkidle" }); // the undo above came from another tab, as it were
  await section.waitFor({ timeout: 60_000 });
  // Review R1 on the screen: an approved change of a document's facts a withdrawal sent back tells the second person why.
  await askThrow("B83 came back");
  const backKey = sql("select canonical_field_key from canonical_field where label = 'B83 came back'");
  // The six holds no document type yet: one for this step alone, removed after it (the question list never sees it).
  const backDoc = "b83_walk_document";
  sql(`insert into document_type (id, workspace_id, document_type_key, name, category, version, status, origin, updated_by) values (gen_random_uuid(), (select workspace_id from combination where id = '${vv}'), '${backDoc}', 'B83 walk document', 'supporting', 1, 'PUBLISHED', 'HUMAN', 'user-A')`);
  const addFact = sql(`select canonical_field_key from canonical_field where group_key = 'person' and status in ('DRAFT','PUBLISHED') and canonical_field_key <> '${backKey}' and value_type not in ('yes_no','boolean') order by 1 limit 1`);
  const citeWalk = (fact) => ({ fact, about: "holder", source: "Test words (walk), page 1", quote: "Test: B83 walk, Sample", readOn: new Date().toISOString().slice(0, 10) });
  const backChange = await api("POST", `/library/document-types/${backDoc}/supplies`, { facts: [citeWalk(addFact), citeWalk(backKey)], reason: "A B83 walk of a document's facts." });
  await api("POST", `/library/changes/${backChange.body?.id}/approve`, { note: "Approved in the walk" }, "user-B");
  await api("POST", `/library/changes/${sql(`select id from library_change where key = '${backKey}' and status = 'WAITING'`)}/withdraw`, { note: "Withdrawn in the walk" });
  const reader = await as("user-B");
  await reader.goto(`${BASE}/review/change/${backChange.body?.id}`, { waitUntil: "networkidle" });
  const cameBack = reader.locator("[data-came-back]");
  await cameBack.waitFor({ timeout: 60_000 }).catch(() => {});
  ok("review R1 fail test: the second person's page says why it is back, no key", (await cameBack.count()) === 1 && /changed after it was proposed/.test(await cameBack.innerText()) && /"B83 came back" it named was withdrawn/.test(await cameBack.innerText()) && !/person\.[a-z_]+/.test(await cameBack.innerText()), { doc: backDoc, change: backChange.status, words: backChange.body?.detail, status: sql(`select status from library_change where id = ${backChange.body?.id ? `'${backChange.body.id}'` : "null"}`) });
  await axeOf(reader, "a change back for a second look", "[data-came-back]");
  await reader.close();
  await api("POST", `/library/changes/${backChange.body?.id}/withdraw`, { note: "Done with the walk" });
  sql(`delete from library_change where key = '${backDoc}'`); sql(`delete from document_type where document_type_key = '${backDoc}'`);
  await page.reload({ waitUntil: "networkidle" });
  await section.waitFor({ timeout: 60_000 });
  // Review F3 on the screen: what the route says of a question still placed reaches the row (the route's own test: check_b83_undo_withdraw).
  await page.reload({ waitUntil: "networkidle" });
  await section.waitFor({ timeout: 60_000 });
  await api("POST", `/editions/${edId}/form-fields/own-question`, { dataPath: dp, reason: WHY, field: lib0.key });
  await page.reload({ waitUntil: "networkidle" });
  await section.waitFor({ timeout: 60_000 });
  await page.route("**/form-fields/own-question/undo", async (rt) => { const r = await rt.fetch(); const j = await r.json(); await rt.fulfill({ response: r, json: { ...j, still_asked: '"A field" is still asked in "A section". If no other form needs it, remove it there on the Smart questionnaire tab.' } }); }, { times: 1 });
  await R.locator("[data-own-undo]").click();
  await R.locator("[data-own-said]").waitFor({ timeout: 30_000 });
  ok("review F3: undo's words on the row name the section still asking it and where to remove it", /still asked in "A section".*Smart questionnaire tab/.test(await R.locator("[data-own-said]").innerText()));
  await page.waitForLoadState("networkidle");

  // Review F9: neutral until the session is known. Review F1: the page's title only once it knows.
  const slow = await b.newContext({ viewport: { width: 1440, height: 900 } }); slow.setDefaultNavigationTimeout(180_000);
  await slow.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, "user-A");
  const held = await slow.newPage();
  let letGo; const gate = new Promise((r) => { letGo = r; });
  await held.route("**/api/session", async (rt) => { await gate; await rt.continue(); });
  await held.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "domcontentloaded" });
  await held.locator("[data-own-questions]").waitFor({ timeout: 60_000 });
  ok("review F9 fail test: the session not known yet, the author is not told \"A configuration author asks these\"", (await held.locator("[data-own-read-only]").count()) === 0);
  letGo();
  await held.locator("[data-own-ask]").first().waitFor({ timeout: 30_000 });
  ok("review F9 pass: the session known, the author's buttons come", (await held.locator("[data-own-read-only]").count()) === 0);
  await held.close();
  const failedSession = await slow.newPage();
  await failedSession.route("**/api/session", (rt) => rt.fulfill({ status: 500, json: { detail: "down" } }));
  await failedSession.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "domcontentloaded" });
  await failedSession.locator("[data-own-questions]").waitFor({ timeout: 60_000 });
  await failedSession.waitForTimeout(1500);
  ok("review F9 fail test: a failed session never says the author is someone else", (await failedSession.locator("[data-own-read-only]").count()) === 0);
  await failedSession.close();
  const title = (p) => p.locator("h1").first().innerText();
  const chips = async (p) => (await p.locator("main, body").first().innerText());
  const pend = await slow.newPage();
  let letFields; const fieldsGate = new Promise((r) => { letFields = r; });
  await pend.route(`**/api/editions/${edId}/form-fields`, async (rt) => { await fieldsGate; await rt.continue(); });
  await pend.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "domcontentloaded" });
  await pend.locator("h1").first().waitFor({ timeout: 30_000 });
  ok("review F1 fail test: while the form fields load the page says \"Form fields\" and no \"Decided\"", (await title(pend)) === "Form fields" && !/Decided/.test(await chips(pend)), await chips(pend));
  letFields();
  await pend.locator("h1", { hasText: "Form fields" }).waitFor();
  await pend.waitForFunction(() => /Form fields with no decision|Decided/.test(document.body.innerText), undefined, { timeout: 30_000 });
  ok("review F1 pass: with undecided form fields it says so once loaded", /no decision/.test(await title(pend)) && /Needs you/.test(await chips(pend)), await title(pend));
  await pend.close();
  const down = await slow.newPage();
  await down.route(`**/api/editions/${edId}/form-fields`, (rt) => rt.fulfill({ status: 500, json: { detail: "The form fields cannot be read just now." } }));
  await down.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "domcontentloaded" });
  await down.getByText("These form fields could not be opened").waitFor({ timeout: 30_000 });
  ok("review F1 fail test: an answer of 500 is the error state, never \"Decided\"", !/Decided/.test(await chips(down)));
  await axeOf(down, "the Form fields page's error state", "body");
  await down.close();
  const wrong = await slow.newPage();
  await wrong.goto(`${BASE}/review/form-fields/00000000-0000-0000-0000-000000000000`, { waitUntil: "domcontentloaded" });
  await wrong.getByText("These form fields could not be opened").waitFor({ timeout: 30_000 });
  ok("review F1 fail test: an edition that does not exist is the error state, never \"Decided\"", !/Decided/.test(await chips(wrong)));
  await wrong.close();
  const none = await slow.newPage();
  await none.route(`**/api/editions/${edId}/form-fields`, async (rt) => { const r = await rt.fetch(); const j = await r.json(); await rt.fulfill({ response: r, json: { ...j, fields: j.fields.filter((f) => f.outcome !== "unresolved" && !f.background) } }); });
  await none.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "domcontentloaded" });
  await none.getByText("Every form field of this edition has a decision.").waitFor({ timeout: 30_000 });
  ok("review F1 pass: nothing undecided says \"Decided\"", (await title(none)) === "Form fields" && /Decided/.test(await chips(none)));
  await none.close(); await slow.close();
  await page.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "networkidle" });
  await section.waitFor({ timeout: 60_000 });

  await row(WORDS[1].box).locator("[data-own-ask]").click();
  const f3 = row(WORDS[1].box).locator("[data-own-form]");
  await f3.waitFor();
  await f3.getByRole("radio", { name: "Name a new one" }).check();
  await f3.getByLabel("Name", { exact: true }).fill(WORDS[1].label);
  await f3.getByLabel("What it means").fill(WORDS[1].meaning);
  await save(row(WORDS[1].box), WORDS[1], WHY); // the page was opened again above, so "Why" starts empty
  await page.waitForLoadState("networkidle");
  await row(WORDS[2].box).locator("[data-own-ask]").click();
  const f4 = row(WORDS[2].box).locator("[data-own-form]");
  await f4.waitFor();
  await f4.getByRole("radio", { name: "Name a new one" }).check();
  await f4.getByLabel("Name", { exact: true }).fill(WORDS[2].label);
  await f4.getByLabel("What it means").fill(WORDS[2].meaning);
  await save(row(WORDS[2].box), WORDS[2], WHY);
  await page.waitForLoadState("networkidle");
  ok("the three form fields are asked through the screen", (await section.locator("[data-own-asked]").count()) === 3, await section.locator("[data-own-asked]").count());
  await page.screenshot({ path: path.join(OUT, "5-three-asked-1440.png"), fullPage: true });
  for (const [w, name] of [[1024, "1024"], [400, "400"]]) {
    const small = await as("user-A", w);
    await small.goto(`${BASE}/review/form-fields/${edId}`, { waitUntil: "networkidle" });
    await small.locator("[data-own-questions]").waitFor({ timeout: 60_000 });
    await small.locator("[data-own-questions]").scrollIntoViewIfNeeded();
    ok(`no sideways scroll at ${name} px`, !(await small.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
    await small.screenshot({ path: path.join(OUT, `6-section-${name}.png`) });
    await small.close();
  }
  await page.goto(`${BASE}/c/${vv}/questionnaires`, { waitUntil: "networkidle" });
  ok("line fail: nothing left to ask, so the line is gone", (await page.locator("[data-own-line]").count()) === 0);
  ok("no page errors", errors.length === 0, errors);
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
