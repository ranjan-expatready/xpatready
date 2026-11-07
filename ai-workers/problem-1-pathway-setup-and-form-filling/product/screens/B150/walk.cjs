// Usage: node product/screens/B150/walk.cjs <port> <screenshot dir> <vv.single combination id>   (a copy on the configured checkpoint)
// B150 walk by screens on the configured checkpoint (qa's L-SA6 steps 1-9, #1241), 1440 px, with 1024 for the words.
const { chromium } = require(require("node:path").join(__dirname, "..", "..", "..", "prototype", "studio", "node_modules", "playwright"));
const PORT = process.argv[2], BASE = `http://localhost:${PORT}`, OUT = process.argv[3];
const call = async (m, u, b, a) => { const r = await fetch(`${BASE}/api${u}`, { method: m, headers: { "x-actor": a, ...(b ? { "content-type": "application/json" } : {}) }, body: b ? JSON.stringify(b) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };
const log = (s, ok, d) => console.log(`${ok ? "PASS" : "FAIL"}  ${s}${d ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`);
(async () => {
  const comb = { id: process.argv[4] };
  const firm = (await call("GET", "/runtime/firm", undefined, "user-O")).body;
  const r = await call("POST", "/runtime/cases", { combinationId: comb.id, reference: `WALK-B150-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Walk A" }, representative: firm.default_representative, caseOfficers: ["user-O"] }, "user-O");
  const id = r.body.id; const P = r.body.people.find((p) => p.role === "principal").subject_id;
  const sp = (await call("POST", `/runtime/cases/${id}/people`, { role: "spouse_or_partner", displayName: "Sample Walk Spouse" }, "user-O")).body.subject_id;
  for (const s of [P, sp]) await call("PUT", `/runtime/cases/${id}/answers/${s}/person.date_of_birth`, { value: s === P ? "1985-03-02" : "1987-06-09", expectedId: null }, "user-O");
  log("setup: a Visitor visa case with Sample Walk A and an adult spouse (opened by the officer, dates of birth by the officer)", !!id && !!sp, r.status);
  const browser = await chromium.launch({ channel: "chrome" });
  const page = async (actor, width) => { const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 }); await ctx.addInitScript((a) => localStorage.setItem("xr-actor", a), actor); return ctx.newPage(); };
  const idle = (p) => p.waitForLoadState("networkidle");
  const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); };
  // 1. Client A answers the family name and given names, for themself and for the spouse.
  const c = await page("user-P", 1440);
  await c.goto(`${BASE}/cases/${id}/questionnaire`); await idle(c);
  await c.getByRole("region", { name: "About Sample Walk A" }).getByRole("button", { name: /Personal details/ }).click(); await idle(c);
  await c.getByLabel(/family name/i).first().fill("WALKFAM"); await c.getByLabel(/given name/i).first().fill("WALKGIVEN");
  await c.getByRole("button", { name: "Save and come back later" }).click(); await idle(c);
  await c.getByRole("region", { name: "About Sample Walk Spouse" }).getByRole("button", { name: /Personal details/ }).click(); await idle(c);
  await c.getByLabel(/family name/i).first().fill("WALKSPOUSE");
  await c.getByRole("button", { name: "Save and come back later" }).click(); await idle(c);
  await c.getByRole("region", { name: "About Sample Walk Spouse" }).getByRole("button", { name: /Personal details/ }).click(); await idle(c);
  const shown = await c.getByText(/Answered by the principal for Sample Walk Spouse: declared, it fills/).waitFor({ timeout: 10000 }).then(() => true, () => false);
  log("1. client, the spouse's part after saving says \"Answered by the principal for Sample Walk Spouse: declared, it fills Sample Walk Spouse's forms now\"", shown);
  await shot(c, "1-client-answering-for-spouse-1440");
  // 2-3. The officer's case page: Agent view rows and the Prepare application card.
  const o = await page("user-O", 1440);
  await o.goto(`${BASE}/cases/${id}`); await idle(o);
  await o.getByRole("tab", { name: /^Sample Walk A/ }).click();
  const row = o.locator("[id^='a-']").filter({ hasText: "WALKFAM" }).first();
  const rowText = await row.innerText();
  log("3. Agent view: the client's own family name reads \"WALKFAM · Declared · questionnaire · Client A\", never \"Counts as confirmed\"", /Declared/.test(rowText) && !/Counts as confirmed/.test(rowText) && /questionnaire · Client A/.test(rowText), rowText.replace(/\n/g, " · "));
  await row.scrollIntoViewIfNeeded(); await shot(o, "3-agent-view-declared-1440");
  await o.getByRole("tab", { name: /^Sample Walk Spouse/ }).click();
  const srow = o.locator("[id^='a-']").filter({ hasText: "WALKSPOUSE" }).first();
  log("3b. Agent view: the spouse's family name reads \"Answered by the principal for Sample Walk Spouse\"", /Answered by the principal for Sample Walk Spouse/.test(await srow.innerText()), (await srow.innerText()).replace(/\n/g, " · "));
  await srow.scrollIntoViewIfNeeded(); await shot(o, "3b-agent-view-by-principal-1440");
  const forms = o.locator("section", { has: o.getByRole("heading", { name: "Prepare application", exact: true }) });
  await forms.scrollIntoViewIfNeeded();
  const sch1 = forms.getByRole("listitem").filter({ has: o.getByRole("heading", { name: /IMM 5257 SCH1 for Sample Walk A/ }) });
  const cardWords = await forms.locator("header").innerText(), sch1Words = await sch1.innerText();
  log("4. Prepare application: \"The forms to file, filled from declared and confirmed answers.\" and Schedule 1 \"Declared or confirmed answers for N of M form fields\"", /filled from declared and confirmed answers/.test(cardWords) && /Declared or confirmed answers for \d+ of \d+ form fields/.test(sch1Words), sch1Words.split("\n").find((l) => /answers for/.test(l)));
  const n0 = Number(/answers for (\d+) of/.exec(sch1Words)?.[1]);
  await sch1.scrollIntoViewIfNeeded(); await shot(o, "4-prepare-application-1440");
  // 5. Generate a copy of Schedule 1 by screen.
  await sch1.getByRole("button", { name: "Generate a copy" }).click();
  await sch1.getByText("Generated", { exact: true }).waitFor({ timeout: 90000 });
  const list = (await call("GET", `/runtime/cases/${id}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257 SCH1" && f.subject_id === P);
  log("5. Generate a copy of IMM 5257 SCH1: generated, written count as the card said", list.copies[0].status === "GENERATED" && list.copies[0].counts.written >= n0, { card: n0, counts: list.copies[0].counts });
  await shot(o, "5-sch1-generated-1440");
  // 8. The officer corrects the client's family name by screen.
  await o.getByRole("tab", { name: /^Sample Walk A/ }).click();
  await o.getByRole("button", { name: /^Edit .*family name/i }).first().click();
  const dlg = o.getByRole("dialog");
  log("8a. the edit dialog shows \"Now: WALKFAM (Declared: the client's own answer; it fills the forms now)\"", /Now: WALKFAM \(Declared: the client's own answer; it fills the forms now\)/.test(await dlg.innerText()), (await dlg.innerText()).split("\n").find((l) => /^Now:/.test(l)));
  await shot(o, "8a-edit-dialog-1440");
  await dlg.getByRole("textbox").first().fill("OFFICERFAM"); await dlg.getByRole("button", { name: "Save" }).click(); await dlg.waitFor({ state: "detached" }); await idle(o);
  const frow = o.locator("[id^='a-']").filter({ hasText: "OFFICERFAM" }).first();
  log("8b. the corrected row reads \"OFFICERFAM · Entered by staff · to confirm · Agent view · Case officer\"", /Entered by staff · to confirm/.test(await frow.innerText()) && /Agent view · Case officer/.test(await frow.innerText()), (await frow.innerText()).replace(/\n/g, " · "));
  await frow.scrollIntoViewIfNeeded(); await shot(o, "8b-agent-view-entered-by-staff-1440");
  // 9. The box stays filled: the card's count is unchanged, a new copy writes OFFICERFAM.
  await forms.scrollIntoViewIfNeeded();
  const n1 = Number(/answers for (\d+) of/.exec(await sch1.innerText())?.[1]);
  log("9a. Schedule 1 still says the same number of declared or confirmed answers (the correction never empties the box)", n1 === n0, { before: n0, after: n1 });
  log("9b. the earlier copy reads Out of date", /Out of date/.test(await sch1.innerText()));
  await sch1.getByRole("button", { name: "Generate a new copy" }).click();
  await o.waitForTimeout(500); await sch1.getByText("Generated", { exact: true }).first().waitFor({ timeout: 90000 });
  const l2 = (await call("GET", `/runtime/cases/${id}/forms`, undefined, "user-O")).body.forms.find((f) => f.form === "IMM 5257 SCH1" && f.subject_id === P);
  log("9c. the new copy writes as many form fields as the first (the family name is written, now OFFICERFAM)", l2.copies[0].counts.written === list.copies[0].counts.written, { first: list.copies[0].counts, second: l2.copies[0].counts });
  await shot(o, "9-sch1-new-copy-1440");
  // The words at 1024.
  const o2 = await page("user-O", 1024);
  await o2.goto(`${BASE}/cases/${id}`); await idle(o2);
  await o2.getByRole("tab", { name: /^Sample Walk Spouse/ }).click();
  const txt = await o2.locator("main").innerText();
  log("1024 px: the spouse's rows read \"Answered by the principal for Sample Walk Spouse\"; the card reads \"filled from declared and confirmed answers\"; no sideways scroll", /Answered by the principal for Sample Walk Spouse/.test(txt) && /filled from declared and confirmed answers/.test(txt) && !(await o2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await o2.locator("[id^='a-']").filter({ hasText: "WALKSPOUSE" }).first().scrollIntoViewIfNeeded(); await shot(o2, "10-agent-view-spouse-1024");
  await o2.locator("section", { has: o2.getByRole("heading", { name: "Prepare application", exact: true }) }).scrollIntoViewIfNeeded(); await shot(o2, "10b-prepare-application-1024");
  await browser.close();
  console.log(`case ${id}`);
})().catch((e) => { console.log("FAIL  walk crashed:", e.message.split("\n")[0]); process.exit(1); });
