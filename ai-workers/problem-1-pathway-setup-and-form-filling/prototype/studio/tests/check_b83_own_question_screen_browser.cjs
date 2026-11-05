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
  const as = async (actor, width = 1440) => { const c = await b.newContext({ viewport: { width, height: 900 } }); await c.addInitScript((a) => { try { localStorage.setItem("xr-actor", a); } catch { /* blocked */ } }, actor); return c.newPage(); };
  const page = await as("user-A");
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));

  // The way in: the Smart questionnaire's line, with the form number and the count from data.
  await page.goto(`${BASE}/c/${vv}/questionnaires`, { waitUntil: "networkidle" });
  const line = page.locator("[data-own-line]");
  await line.waitFor({ timeout: 60_000 });
  const lineText = await line.innerText();
  ok("line: the Smart questionnaire says which form works out how many Yes/No answers (form number and count from data)", /IMM 5257 works out 3 Yes\/No answers from other answers/.test(lineText), lineText);
  await page.screenshot({ path: path.join(OUT, "1-smart-questionnaire-line-1440.png") });
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
    if (await f.locator("[data-own-error]").count() && /is close to the library/.test(await f.locator("[data-own-error]").innerText())) {
      await f.getByLabel("Why it is not the same").fill("The form's own Yes/No question, not the detail it leads to (walk).");
      await f.getByRole("button", { name: /Ask it/ }).click();
      await r.locator("[data-own-asked]").waitFor({ timeout: 30_000 });
    }
    return w;
  };
  await save(row(WORDS[0].box), WORDS[0], WHY);
  await page.waitForLoadState("networkidle");
  ok("BR-4 pass: a new field is asked, and the row says a second person approves it, with the way there", /Asked as "Has used other name"/.test(await row(WORDS[0].box).innerText()) && /second person approves it on To review/.test(await row(WORDS[0].box).innerText()));
  const landed = await page.waitForFunction(() => document.activeElement?.hasAttribute("data-own-ask"), undefined, { timeout: 30_000 }).then(() => true, () => false);
  ok("after a save the keyboard lands on the next form field to ask", landed, await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 120)));
  ok("BR-9 toast: the save says what is next and offers Undo", /Next: Smart questionnaire/.test(await page.locator("[data-undo-toast]").innerText()) && (await page.locator("[data-undo-toast] [data-undo]").count()) === 1);
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
  await row(WORDS[1].box).locator("[data-own-ask]").click();
  const f3 = row(WORDS[1].box).locator("[data-own-form]");
  await f3.waitFor();
  await f3.getByRole("radio", { name: "Name a new one" }).check();
  await f3.getByLabel("Name", { exact: true }).fill(WORDS[1].label);
  await f3.getByLabel("What it means").fill(WORDS[1].meaning);
  await save(row(WORDS[1].box), WORDS[1]);
  await page.waitForLoadState("networkidle");
  await row(WORDS[2].box).locator("[data-own-ask]").click();
  const f4 = row(WORDS[2].box).locator("[data-own-form]");
  await f4.waitFor();
  await f4.getByRole("radio", { name: "Name a new one" }).check();
  await f4.getByLabel("Name", { exact: true }).fill(WORDS[2].label);
  await f4.getByLabel("What it means").fill(WORDS[2].meaning);
  await save(row(WORDS[2].box), WORDS[2]);
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
