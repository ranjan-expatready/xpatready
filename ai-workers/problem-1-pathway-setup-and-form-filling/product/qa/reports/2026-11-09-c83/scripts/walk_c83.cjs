// C8.3 gate A walk by screens, 1024 px, headless Playwright, one stage per call (the copy lives across calls on its
// --ttl). Presses only what a person sees; page words are written to ../walk-log.txt and screenshots to ..
//   node walk_c83.cjs <port> <stage> '<setup json>'
const fs = require("node:fs"), path = require("node:path");
const { chromium } = require("playwright");
const [PORT, STAGE, J] = [process.argv[2], process.argv[3], process.argv[4]];
const d = JSON.parse(J), BASE = `http://localhost:${PORT}`, OUT = path.resolve(__dirname, "..");
const log = (s) => { fs.appendFileSync(path.join(OUT, "walk-log.txt"), s + "\n"); console.log(s); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1024, height: 800 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  const as = async (who) => { await p.goto(`${BASE}/`); await p.evaluate((a) => localStorage.setItem("xr-actor", a), who); };
  const shot = async (n, full = false) => p.screenshot({ path: path.join(OUT, `${n}.png`), fullPage: full });
  const words = async (loc, label) => log(`--- ${label}\n${(await loc.innerText()).slice(0, 2500)}`);
  log(`\n===== stage ${STAGE} ${new Date().toISOString()}`);
  try {
    await require(`./stage_${STAGE}.cjs`)({ p, d, BASE, as, shot, words, log });
  } catch (x) { log(`STOPPED: ${x.message.split("\n")[0]}`); await shot(`zz-stopped-${STAGE}`, true); }
  log(`page errors: ${JSON.stringify(errors)}`);
  await b.close();
})();
