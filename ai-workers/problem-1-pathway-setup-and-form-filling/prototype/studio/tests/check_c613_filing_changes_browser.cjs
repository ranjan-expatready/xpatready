// C6.13 Filing changes by screens (B135; concept screens/B135/concept.md r2): a person's walk at 1440 px on a Visitor visa
// family case: the People and filings table, the principal's refused Remove (in words, before any click), a child's
// refused Make principal, Remove filing with the other filings named and a reason, Undo, then Make principal. Writes
// screenshots to the folder given (product/screens/B135/screenshots). When the copy has no Visitor visa combination it
// sets one up as acceptance/C6.13.test.ts says (setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts), so
// run-suites can run it on a fresh copy (CI shard 3 on #1242, 8 Nov: run plain, it read a database that did not exist).
// No model call (US$0).
//   zsh studio/tools/isolated.sh screens_c613w 4443 start && node studio/tests/check_c613_filing_changes_browser.cjs 4443 xr_studio_screens_c613w [screenshot-dir]
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("../node_modules/playwright");

const { execFileSync, spawnSync } = require("node:child_process");
const STUDIO = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] ?? 4443), DB = process.argv[3] ?? "xr_studio_screens_c613w", BASE = `http://localhost:${PORT}`, SHOTS = process.argv[4] ?? null;
const PSQL = process.env.PSQL || (fs.existsSync("/opt/homebrew/opt/postgresql@18/bin/psql") ? "/opt/homebrew/opt/postgresql@18/bin/psql" : "psql");
const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const T = { timeout: 15000 };
let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail).slice(0, 400)}`}`); } };
const call = async (method, p, body, actor = "user-O") => { const r = await fetch(`${BASE}/api${p}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const yearsAgo = (y) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); return d.toISOString().slice(0, 10); };

(async () => {
  // The released Visitor visa combination and a family case, through the same routes the screens call.
  // A fresh copy (run-suites, CI): set up the Visitor visa release first, as the C6.13 pack's run line says.
  if (sql("select count(*) from combination where combination_key='vv.single'") === "0") {
    const tsx = (f) => { const r = spawnSync(path.join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", path.join(STUDIO, "api", "tsconfig.json"), path.join(STUDIO, f), String(PORT), DB], { encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 }); return `${f}: exit ${r.status}, ${String(r.stdout ?? "").trim().split("\n").pop()}`; };
    const done = [tsx("tests/runtime/setup_visitor_visa.ts"), tsx("acceptance/lib/setup_vv_m3.ts")];
    ok("setup: a fresh copy gets the released Visitor visa combination", sql("select count(*) from combination where combination_key='vv.single'") !== "0", done);
  }
  const combinationId = sql("select id from combination where combination_key='vv.single'");
  const firm = (await call("GET", "/runtime/firm")).body;
  const rep = (firm?.users ?? []).find((u) => (u.duties ?? []).includes("represent"))?.id ?? null;
  const open = await call("POST", "/runtime/cases", { combinationId, reference: `WALK-C613-${Date.now().toString(36)}`, clientActor: "user-P", principal: { displayName: "Sample Client A" }, ...(rep ? { representative: rep } : {}), caseOfficers: ["user-O"] });
  const id = open.body?.id;
  ok("setup: a Visitor visa case opens", open.status === 201 || open.status === 200, open.body);
  const subjects = {};
  for (const [role, name, age] of [["spouse_or_partner", "Sample Spouse A", 38], ["child", "Sample Child A1", 10], ["child", "Sample Child A2", 15]]) {
    const a = await call("POST", `/runtime/cases/${id}/people`, { role, displayName: name });
    subjects[name] = a.body?.subject_id;
    await call("PUT", `/runtime/cases/${id}/answers/${a.body?.subject_id}/person.date_of_birth`, { value: yearsAgo(age), expectedId: null });
  }
  const principal = (open.body?.people ?? []).find((p) => p.role === "principal")?.subject_id;
  await call("PUT", `/runtime/cases/${id}/answers/${principal}/person.date_of_birth`, { value: yearsAgo(40), expectedId: null });

  const browser = await chromium.launch({ headless: true, ...(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  await ctx.addInitScript(() => { localStorage.setItem("xr-actor", "user-O"); });
  const p = await ctx.newPage();
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false }); } };
  try {
    await p.goto(`${BASE}/cases/${id}`);
    const section = p.locator("section[data-people-filings]");
    await section.getByRole("heading", { name: "People and filings" }).waitFor(T);
    await section.locator("tr", { hasText: "Sample Child A2" }).getByText("Own application").waitFor(T);
    await section.scrollIntoViewIfNeeded();
    ok("C6.13 walk 1 pass: People and filings lists four people, each with their own application and its status", (await section.locator("tbody tr").count()) === 4 && (await section.getByText("Own application").count()) === 4);
    await shot("01-people-and-filings");

    await section.getByRole("button", { name: "Actions for Sample Client A" }).click();
    const menuA = p.getByRole("menu");
    ok("C6.13 walk 2 fail (BR-2): the principal's Remove filing is refused in words before any click", await menuA.getByText("Refused: make someone else principal first.").isVisible() && (await menuA.locator("[data-action=remove-filing][aria-disabled=true]").count()) === 1);
    await shot("02-principal-menu-refused");
    await p.keyboard.press("Escape");
    await section.getByRole("button", { name: "Actions for Sample Child A1" }).click();
    ok("C6.13 walk 3 fail (BR-3): a child's Make principal is refused in words", await p.getByRole("menu").getByText(/a child cannot swap with a parent\. To make Sample Child A1 the principal applicant, open a case for them/).isVisible());
    await p.keyboard.press("Escape");

    await section.getByRole("button", { name: "Actions for Sample Spouse A" }).click();
    await p.getByRole("menu").getByText("Remove filing…").click();
    const dlg = p.getByRole("dialog");
    await dlg.locator("[data-dependants]").waitFor(T);
    const dtext = await dlg.innerText();
    ok("C6.13 walk 4 pass (BR-4): the dialog asks \"Remove Sample Spouse A's filing?\" and names the two other filings that change, with the totals",
      /Remove Sample Spouse A's filing\?/.test(dtext) && /2 other filings depend on this one and change/.test(dtext) && /Sample Client A's filing/.test(dtext) && /Sample Child A2's filing/.test(dtext) && /CAD 570 → CAD 470/.test(dtext), dtext);
    await shot("03-remove-dialog");
    await dlg.getByRole("button", { name: "Remove filing" }).click();
    ok("C6.13 walk 5 fail (BR-6): no reason → the field says so, nothing changes", await dlg.getByText("Write a reason: it is kept with the change.").isVisible());
    await dlg.locator("[data-change-reason-input]").fill("Added by mistake (Sample)");
    await dlg.getByRole("button", { name: "Remove filing" }).click();
    await section.locator("[data-change-done]").waitFor(T);
    const row = section.locator("tr", { hasText: "Sample Spouse A" });
    await row.getByText(/Removed .* by .*Added by mistake \(Sample\)/).waitFor(T);
    ok("C6.13 walk 6 pass (BR-1, BR-6): the spouse stays on the case with no filing, and the reason shows on their row", /No filing: not travelling/.test(await row.innerText()));
    ok("C6.13 walk 6a pass (review M4): after the change, focus is back on the person's row (its menu button)", await p.evaluate(() => !!document.activeElement?.closest("[data-person-row]") && document.activeElement?.hasAttribute("data-person-menu")));
    await shot("04-removed-with-undo");

    await section.locator("[data-undo]").click();
    await dlg.locator("[data-change-reason-input]").waitFor(T);
    ok("C6.13 walk 7 pass (BR-11): Undo opens Add filing back with the reason \"Undo: …\"", /Add Sample Spouse A's filing back\?/.test(await dlg.innerText()) && (await dlg.locator("[data-change-reason-input]").inputValue()) === "Undo: Added by mistake (Sample)");
    await dlg.getByRole("button", { name: "Add filing back" }).click();
    await row.getByText("Own application").waitFor(T);

    // Review M3, break M3: the case changes while the dialog is open (a child's date of birth): the apply is refused and
    // the dialog says so, and keeps saying so after it shows the new preview; nothing changes until a second press.
    await section.getByRole("button", { name: "Actions for Sample Child A2" }).click();
    await p.getByRole("menu").getByText("Remove filing…").click();
    await dlg.locator("[data-change-reason-input]").waitFor(T);
    const before = (await call("GET", `/runtime/cases/${id}/questionnaire?mode=agent`)).body;
    const dobQ = (before?.sections ?? []).flatMap((x) => x.questions).find((q) => q.subjectId === subjects["Sample Child A2"] && q.fact === "person.date_of_birth");
    await call("PUT", `/runtime/cases/${id}/answers/${subjects["Sample Child A2"]}/person.date_of_birth`, { value: yearsAgo(13), expectedId: dobQ?.answer?.id ?? null });
    await dlg.locator("[data-change-reason-input]").fill("Added by mistake (Sample)");
    await dlg.getByRole("button", { name: "Remove filing" }).click();
    await dlg.getByText("Changed since you opened this", { exact: true }).waitFor(T);
    await p.waitForTimeout(800);
    ok("C6.13 walk 7a fail (BR-8): a change made meanwhile is refused and the dialog says so, after showing the new preview; the filing is still there",
      await dlg.getByText("Changed since you opened this", { exact: true }).isVisible() && /What changes now is shown below/.test(await dlg.innerText()) && /Own application/.test(await section.locator("tr", { hasText: "Sample Child A2" }).innerText()));
    await shot("04b-changed-since-you-opened");
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await p.waitForTimeout(400);
    ok("C6.13 walk 7b pass (review M4): Cancel puts focus back on that person's row", await p.evaluate(() => document.activeElement?.closest("[data-person-row]")?.textContent?.includes("Sample Child A2") === true));
    await section.getByRole("button", { name: "Actions for Sample Spouse A" }).click();
    await p.getByRole("menu").getByText("Make principal…").click();
    await dlg.locator("[data-change-filing]").first().waitFor(T);
    const mtext = await dlg.innerText();
    ok("C6.13 walk 8 pass (BR-3, BR-3b, BR-4): Make principal names the swap, that the client stays the same person, the capped fee moving and who signs for the children",
      /Make Sample Spouse A the principal applicant\?/.test(mtext) && /client who answers the questionnaire stays the same person/.test(mtext) && /Signed for as their parent by Sample Spouse A/.test(mtext), mtext);
    await shot("05-make-principal-dialog");
    await dlg.locator("[data-change-reason-input]").fill("The spouse holds the job offer (Sample)");
    await dlg.getByRole("button", { name: "Make principal" }).click();
    await section.locator("tr", { hasText: "Sample Spouse A" }).getByText("Principal applicant").waitFor(T);
    ok("C6.13 walk 9 pass: the roles are swapped on the table, with the reason", /Spouse or partner/.test(await section.locator("tr", { hasText: "Sample Client A" }).innerText()) && /Made principal .*The spouse holds the job offer/.test(await section.locator("tr", { hasText: "Sample Spouse A" }).innerText()));
    await shot("06-after-make-principal");
  } catch (e) { ok(`the walk ran to its end (${e.message.split("\n")[0]})`, false); await shot("99-error"); }
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exitCode = fail ? 1 : 0;
})();
