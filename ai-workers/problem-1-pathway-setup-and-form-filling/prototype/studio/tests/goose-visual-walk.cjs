// goose visual walk — manual/human-style pass over the merged app (main a21b15d) on :4470.
// Screenshots at 1440x900, fullPage where a list is long. Actor = user-A (author).
const path = require("node:path");
const { chromium } = require(process.cwd() + "/node_modules/playwright");
const OUT = path.join(process.cwd(), "..", "..", "product", "qa", "reports", "2026-10-25-goose-visual");
const BASE = "http://localhost:4470";

(async () => {
  const fs = require("node:fs");
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch {} });
  const shot = async (n, full = false) => { await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full }); };
  const go = async (u, n, full = false, wait = 700) => { await p.goto(BASE + u, { waitUntil: "networkidle" }); await p.waitForTimeout(wait); await shot(n, full); };
  const err = (e) => { console.error("ERR", e.message); };

  // 1. Programs catalogue (Screen 01)
  await go("/", "01-programs", true);
  // 2. Visitor visa combination (in setup) — Screen 03
  await go("/c/73f0c8c2-65fc-46df-a099-bd3835fcf625", "02-combo-visitor-overview", true);
  await p.goto(BASE + "/c/73f0c8c2-65fc-46df-a099-bd3835fcf625/sources", { waitUntil: "networkidle" }); await p.waitForTimeout(700); await shot("03-combo-visitor-sources", true);
  // 3. LMIA combination (Live · Release 1) — Screen 03 rich
  await go("/c/ab801bad-2339-4c84-a946-667a4c992c63", "04-combo-lmia-overview", true);
  await p.goto(BASE + "/c/ab801bad-2339-4c84-a946-667a4c992c63/configuration", { waitUntil: "networkidle" }); await p.waitForTimeout(900); await shot("05-combo-lmia-configuration", true);
  // 4. Shared library (Screen 04)
  await go("/library/fields", "06-library-fields", true);
  await go("/library/sections", "07-library-sections", true);
  await go("/library/documents", "08-library-documents", true);
  await go("/library/forms", "09-library-forms", true);
  await go("/library/checks", "10-library-checks", true);
  // 5. AI work (Screen 02)
  await go("/ai", "11-ai-work", true);
  // 6. Review & release + history
  await go("/release", "12-release", true);
  await go("/releases", "13-releases", true);
  await go("/activity", "14-activity", true);
  // 7. Runtime case area (R1 slice)
  await go("/cases", "15-cases", true);

  console.log("done. shots in", OUT);
  await b.close();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
