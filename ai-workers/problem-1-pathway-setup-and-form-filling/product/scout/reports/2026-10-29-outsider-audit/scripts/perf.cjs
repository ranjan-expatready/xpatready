// First view timing of Immigration programs and Program structure (STANDARDS §9: < 1 s), 3 cold loads each.
const STUDIO = "/Users/ranjansingh/Desktop/Xpatready/.claude/worktrees/audit-outsider-0a5e67/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio";
const { chromium } = require(STUDIO + "/node_modules/playwright");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  for (const [url, done] of [["/", "combinations shown"], ["/structure", "Expand all"], ["/library/forms", "Number"]]) {
    const times = [];
    for (let i = 0; i < 3; i++) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
      await p.addInitScript(() => localStorage.setItem("xr-actor", "user-A"));
      let reqs = 0; p.on("request", (r) => { if (r.url().includes("/api/")) reqs++; });
      const t0 = Date.now(); await p.goto("http://localhost:4495" + url);
      await p.waitForFunction((d) => document.body.innerText.includes(d) && !/Loading/.test(document.querySelector("main")?.innerText ?? ""), done, { timeout: 30000 }).catch(() => {});
      times.push(`${Date.now() - t0}ms/${reqs}req`); await ctx.close();
    }
    console.log(url, times.join(" "));
  }
  await b.close();
})();
