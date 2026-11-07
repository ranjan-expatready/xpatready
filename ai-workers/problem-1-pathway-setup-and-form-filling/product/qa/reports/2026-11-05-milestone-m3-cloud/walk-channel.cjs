// qa M3 (cloud, 5 Nov, after #1056): J7 2.3 and 5.2 on screen at 1440 px on the checkpoint family case from walk-1440.cjs.
// Reads the "how each form is filed" panel, opens Change channel on IMM 5476 and on IMM 5257 for the principal, and
// records what is offered and greyed. Saves nothing: every dialog is cancelled. node walk-channel.cjs <out dir>
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const out = process.argv[2]; const { caseUrl } = JSON.parse(fs.readFileSync(path.join(out, "walk.json"), "utf8"));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  await p.goto(caseUrl); await p.evaluate(() => localStorage.setItem("xr-actor", "user-O")); await p.goto(caseUrl); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
  const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
  const res = { filedThrough: (t.match(/Filed through[^.]{0,80}/) ?? [null])[0], changeButtons: await p.getByRole("button", { name: /Change channel/ }).count(), dialogs: [] };
  const i = t.search(/How each form is filed|Filed through/); res.panel = i >= 0 ? t.slice(i, i + 1500) : null;
  const btns = p.getByRole("button", { name: /Change channel/ });
  for (let k = 0; k < Math.min(await btns.count(), 2); k++) {
    await btns.nth(k).scrollIntoViewIfNeeded(); await btns.nth(k).click();
    const d = p.getByRole("dialog"); await d.waitFor({ timeout: 10000 });
    res.dialogs.push((await d.innerText()).replace(/\s+/g, " ").slice(0, 900));
    await p.screenshot({ path: path.join(out, `5-2-change-channel-${k + 1}.png`) });
    await d.getByRole("button", { name: "Cancel" }).click(); await d.waitFor({ state: "detached" }).catch(() => {});
  }
  res.errs = errs; fs.writeFileSync(path.join(out, "channel-walk.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();
})().catch((e) => { console.error("STOPPED", e.message); process.exit(1); });
