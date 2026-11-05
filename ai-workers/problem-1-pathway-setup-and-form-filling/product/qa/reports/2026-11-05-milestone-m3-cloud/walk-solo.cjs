// qa M3 (cloud, 5 Nov): the filled solo case (walk-filled.mts) read on screen at 1440 px, as the case officer and then
// as the representative of record: what a person sees and can press for J7 Stages 5-7. Presses nothing priced.
// node walk-solo.cjs <port> <case id> <out dir>
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const [port, id, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  const res = {};
  for (const actor of ["user-O", "user-R"]) {
    await p.goto(`http://127.0.0.1:${port}/cases`); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor);
    await p.goto(`http://127.0.0.1:${port}/cases/${id}`); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(out, `solo-${actor}.png`), fullPage: true });
    const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
    fs.writeFileSync(path.join(out, `solo-${actor}.txt`), t);
    const btns = await p.getByRole("button").allInnerTexts();
    res[actor] = { buttons: [...new Set(btns.map((x) => x.trim()).filter(Boolean))], has: Object.fromEntries(["Ready to file", "Pass", "Review the filing", "Reviewed by", "Upload the validated copy", "Printed", "Signed by hand", "Upload the signed scan", "Uploaded to IRCC", "Change channel", "Answer sheet", "Entered in the portal", "Download PDF copy", "Filed through", "Fee", "CAD", "Documents", "Out of date", "Record the submission"].map((k) => [k, t.includes(k)])) };
  }
  fs.writeFileSync(path.join(out, "solo-walk.json"), JSON.stringify({ res, errs }, null, 1)); console.log(JSON.stringify({ res, errs }, null, 1)); await b.close();
})();
