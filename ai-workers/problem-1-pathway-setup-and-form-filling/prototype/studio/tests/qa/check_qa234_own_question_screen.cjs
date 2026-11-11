// qa (11 Nov, Lead 15's retest list on #1532; main fbfb263c7): QA-234 retest, qa's own check. On Visitor visa of the six
// (maps applied by the people's steps, B83's helper), a person reaches "Ask as its own question" by screens only: the
// Smart questionnaire tab's line → To review › Form fields #own-questions → a worked-out Yes/No → Ask as its own question
// → an empty Why is refused on the form, in words → with a Why, "Ask it · US$0" marks the row asked (a second person
// approves; release held) and the API and the activity record agree. Found on main adc904436 (5 Nov): no screen offered
// it. Passes when the screen exists. US$0, live AI off.
//   zsh tools/isolated.sh qa_234 4475 start && (cd .. && studio/node_modules/.bin/tsx studio/tests/b83_six_steps.ts 4475 xr_studio_qa_234 apply) \
//     && node tests/qa/check_qa234_own_question_screen.cjs 4475
const fs = require("fs"); const { chromium } = require("playwright");
const port = process.argv[2]; if (!port || port === "4400") { console.log("usage: <port of an isolated copy>, never 4400"); process.exit(2); }
const base = `http://localhost:${port}`;
let failed = 0; const ok = (n, c, d) => { if (!c) failed++; console.log(`${c ? "PASS" : "FAIL"} ${n}${!c && d !== undefined ? `: ${JSON.stringify(d).slice(0, 400)}` : ""}`); };
(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.statSync("/opt/pw-browsers/chromium", { throwIfNoEntry: false })?.isFile() ? { executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] } : {}) });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); await ctx.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.setDefaultTimeout(20000);
  await p.goto(base + "/"); await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /^(Resume setup|Open): Visitor visa$/ }).first().click(); await p.waitForLoadState("networkidle");
  await p.getByRole("tab", { name: /Smart questionnaire/ }).click(); await p.waitForTimeout(2000);
  const line = p.locator("[data-own-line]");
  ok("QA-234a the Smart questionnaire tab says which form works out Yes/No answers, with a way there", await line.getByRole("link").count() > 0, await line.innerText().catch(() => "no line"));
  await line.getByRole("link").first().click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2000);
  const sec = p.locator("[data-own-questions]");
  ok("QA-234b To review › Form fields shows the worked-out Yes/No form fields", /#own-questions$/.test(p.url()) && await sec.count() === 1, p.url());
  const row = sec.locator("li").filter({ has: p.getByRole("button", { name: /Ask as its own question/ }) }).first();
  const question = (await row.innerText()).split("\n")[0];
  await row.getByRole("button", { name: /Ask as its own question/ }).click();
  const f = row.locator("[data-own-form]");
  await f.getByRole("radio", { name: "Name a new one" }).check(); await f.getByRole("textbox", { name: "Name" }).fill(`QA check ${Date.now().toString(36)}`);
  await f.getByRole("textbox", { name: "Why" }).fill(""); await f.getByRole("button", { name: /Ask it/ }).click(); await p.waitForTimeout(1200);
  ok("QA-234c an empty Why is refused on the form, in words", /at least|Say why/i.test(await f.locator("[data-own-error]").innerText().catch(() => "")));
  await f.getByRole("textbox", { name: "Why" }).fill("The form asks this Yes/No itself before its details (qa check)");
  await f.getByRole("button", { name: /Ask it/ }).click(); await p.waitForTimeout(2500); await p.waitForLoadState("networkidle");
  const after = (await sec.locator("li").filter({ hasText: question.slice(0, 40) }).first().innerText()).replace(/\s+/g, " ");
  ok("QA-234d the row reads asked, waiting for a second person, with Undo", /Asked as/.test(after) && /second person/.test(after) && /Undo/.test(after), after.slice(0, 200));
  const ed = new URL(p.url()).pathname.split("/").pop();
  const view = await (await fetch(`${base}/api/editions/${ed}/form-fields/own-questions`, { headers: { "x-actor": "user-A" } })).json();
  const asked = (view.fields ?? []).filter((r) => r.asked && question.includes(String(r.question).slice(0, 30)));
  ok("QA-234e underneath: the API marks that form field asked", asked.length === 1, (view.fields ?? []).map((r) => [r.question?.slice(0, 30), r.asked]));
  ok("QA-234 no page error", errs.length === 0, errs);
  await b.close(); console.log(failed ? `${failed} failed` : "all passed"); process.exit(failed ? 1 : 0);
})();
