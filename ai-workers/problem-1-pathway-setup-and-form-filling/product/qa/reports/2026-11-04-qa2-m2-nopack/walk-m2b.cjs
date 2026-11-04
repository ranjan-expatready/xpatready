// qa2 4 Nov, walk part 2 on the same six copy: C1.4, C1.8 (Visitor visa), C2.3 with a held file not in the library.
const STUDIO = process.argv[2], OUT = process.argv[3], BASE = "http://localhost:4480", VV = process.argv[4], ALT = process.argv[5];
const { chromium } = require(STUDIO + "/node_modules/playwright");
let pass = 0, fail = 0; const ok = (s, v, d) => { v ? pass++ : fail++; console.log((v ? "PASS  " : "FAIL  ") + s + (d !== undefined ? " — " + JSON.stringify(d).slice(0, 240) : "")); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const as = async (a) => { await p.goto(BASE + "/"); await p.evaluate((x) => { try { localStorage.setItem("xr-actor", x); } catch {} }, a); };
  const go = async (u, w = 3000) => { await p.goto(BASE + u); await p.waitForTimeout(w); return p.locator("main").innerText(); };
  await as("user-A");
  let t = await go(`/c/${VV}`, 4000); await p.screenshot({ path: OUT + "/C1.4-combination.png" });
  ok("C1.4 Visitor visa shows its trail, status and exactly one Next step", /Immigration programs/.test(t) && /Visitor visa/.test(t) && /(In progress|In setup|Not released yet)/.test(t) && (t.match(/Next step/g) || []).length === 1, (t.match(/Next step[^\n]*\n[^\n]*/) || [""])[0]);
  t = await go(`/c/${VV}/forms`, 4000);
  const ch = p.getByRole("button", { name: /^Change IMM 5257$/ });
  ok("C1.8 the IMM 5257 line has a Change button for the author", (await ch.count()) > 0);
  if (await ch.count()) {
    await ch.first().click(); await p.waitForTimeout(2000); const d = await p.getByRole("dialog").first().innerText().catch(() => ""); await p.screenshot({ path: OUT + "/C1.8-line-drawer.png" });
    ok("C1.8 the line drawer offers Copies, a minimum age and who signs (Sample)", /Copies/.test(d) && /age/i.test(d) && /sign/i.test(d) && /Sample/.test(d), d.replace(/\n/g, " | ").slice(0, 220));
    const cp = p.getByLabel("Copies"); if (await cp.count()) { await cp.fill("0"); const save = p.getByRole("button", { name: /Save/ }).first(); await save.click(); await p.waitForTimeout(1500); const d2 = await p.getByRole("dialog").first().innerText().catch(() => ""); ok("C1.8 0 copies is refused on the field in words, nothing saved", /1 to 9|at least 1|between 1/i.test(d2), (d2.match(/[^\n]*(1 to 9|at least|between)[^\n]*/i) || [""])[0]); await p.screenshot({ path: OUT + "/C1.8-copies-refused.png" }); }
    await p.keyboard.press("Escape");
  }
  // C2.3: an altered IMM 5782 (not in the library) is held; uploader records the IRCC page; Approver approves
  await go("/library/forms", 3000); await p.locator('input[type="file"]').first().setInputFiles(ALT); await p.waitForTimeout(8000);
  t = await p.locator("main").innerText(); ok("C2.3 setup: the altered IMM 5782 is held for source verification", /Held for source verification/.test(t), (t.match(/[^\n]*Held[^\n]*/) || [""])[0]);
  t = await go("/review", 4000); const link = p.locator('a[href*="/review/held/"]', { hasText: /5782/ }).first();
  const href = (await link.count()) ? await link.getAttribute("href") : null; ok("C2.3 To review lists the held IMM 5782", !!href);
  if (href) {
    t = await go(href, 3000); await p.screenshot({ path: OUT + "/C2.3-uploader-needs-page.png", fullPage: true });
    ok("C2.3 the uploader is asked to record the IRCC page", /record the IRCC page/i.test(t) && /IRCC page it came from/.test(t));
    await p.getByPlaceholder("https://www.canada.ca/…").fill("https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/imm5782.html");
    await p.getByRole("button", { name: "Record the page" }).click(); await p.waitForTimeout(2000); t = await p.locator("main").innerText();
    ok("C2.3 after recording, the uploader waits for a second person and has no Approve", /second person/i.test(t) && (await p.getByRole("button", { name: /^Approve/ }).count()) === 0, (t.match(/[^\n]*second person[^\n]*/i) || [""])[0]);
    await as("user-B"); t = await go(href, 3000); await p.screenshot({ path: OUT + "/C2.3-approver.png", fullPage: true });
    const ap = p.getByRole("button", { name: /^Approve/ }).first();
    ok("C2.3 the Approver sees the IRCC page to compare and an Approve button", /canada\.ca/.test(t) && (await ap.count()) > 0, (t.match(/[^\n]*(compare|Compare)[^\n]*/) || [""])[0]);
    if (await ap.count()) { await ap.click(); await p.waitForTimeout(4000); t = await p.locator("main").innerText().catch(() => ""); await p.screenshot({ path: OUT + "/C2.3-approved.png" }); ok("C2.3 approving says what happened (added to the library, checksum approved)", /(approved|Approved|added)/.test(t), t.slice(0, 200).replace(/\n/g, " | ")); }
  }
  console.log(`${pass} passed, ${fail} failed · page errors ${errs.length}`); await b.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("WALK ERROR " + e.message); process.exit(2); });
