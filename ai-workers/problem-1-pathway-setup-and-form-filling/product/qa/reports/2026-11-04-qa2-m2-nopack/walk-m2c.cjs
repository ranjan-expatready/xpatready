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
  let t = "";
  t = await go("/review", 4000); await p.screenshot({ path: OUT + "/C2.3-to-review.png", fullPage: true });
  const href = "/review/held/" + process.argv[6]; ok("C2.3 To review lists a held file (any link to it)", (await p.locator('a[href*="/review/held/"]').count()) > 0, (t.match(/[^\n]*(Held|held)[^\n]*/) || [""])[0]);
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
