// Outsider audit walk: every Wave 1 page as each role, at 1440 and 1024, with screenshots, axe, console errors and
// leak checks (ids, undefined, file paths, raw errors). Read-only: no clicks that change data except where noted.
const path = require("node:path"); const fs = require("node:fs");
const STUDIO = "/Users/ranjansingh/Desktop/Xpatready/.claude/worktrees/audit-outsider-0a5e67/ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio";
const { chromium } = require(STUDIO + "/node_modules/playwright");
const AxeBuilder = require(STUDIO + "/node_modules/@axe-core/playwright").default;
const BASE = "http://localhost:4495";
const SHOTS = process.argv[2]; fs.mkdirSync(SHOTS, { recursive: true });
const out = [];
const LEAKS = [[/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, "uuid"], [/\bundefined\b/, "undefined"], [/\bNaN\b/, "NaN"], [/\bnull\b/, "null"], [/\/Users\/|\.ts:\d|api\/src|node_modules/, "file path"], [/\bP-\d{2,3}\b/, "decision number"], [/sha256|[0-9a-f]{40,64}/i, "hash"], [/\bclaude-|sonnet|opus|haiku/i, "model name"], [/Internal server error|TypeError|Cannot read prop/i, "raw error"], [/\bbox(es)?\b/i, "word box"], [/canonical/i, "word canonical"], [/\bstream\b/i, "word stream"], [/[a-z]+_[a-z_]+\b(?![.(])/ , "snake_case key"]];
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p = await ctx.newPage(); let errs = [];
  p.on("pageerror", (e) => errs.push("pageerror " + e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  const api = async (pth, actor = "user-A") => { const r = await p.request.fetch(`${BASE}/api${pth}`, { headers: { "x-actor": actor } }); return r.json().catch(() => null); };
  const cat = await api("/catalogue?pathwayType=Individual");
  const flat = JSON.stringify(cat);
  const ids = {}; for (const m of flat.matchAll(/"id":"([0-9a-f-]{36})"[^{}]*?"(?:name|label|title)":"([^"]+)"/g)) ids[m[2]] = ids[m[2]] ?? m[1];
  fs.writeFileSync(path.join(SHOTS, "catalogue.json"), JSON.stringify(cat, null, 1).slice(0, 200000));
  const visitor = ids["Visitor visa"]; const lmia = ids["Employer-specific work permit"];
  console.log("ids", visitor, lmia);
  const pages = [
    ["user-A", "/", "programs"], ["user-A", "/structure", "structure"], ["user-A", "/review", "to-review"],
    ["user-A", `/c/${visitor}`, "visitor-overview"], ["user-A", `/c/${visitor}/forms`, "visitor-forms"],
    ["user-A", `/c/${visitor}/questionnaires`, "visitor-questionnaires"], ["user-A", `/c/${visitor}/documents`, "visitor-documents"],
    ["user-A", `/c/${visitor}/preview`, "visitor-preview"], ["user-A", `/c/${visitor}/review`, "visitor-review"],
    ["user-A", `/c/${lmia}`, "lmia-overview"], ["user-A", `/c/${lmia}/forms`, "lmia-forms"], ["user-A", `/c/${lmia}/questionnaires`, "lmia-questionnaires"],
    ["user-A", `/c/${lmia}/documents`, "lmia-documents"], ["user-A", `/c/${lmia}/preview`, "lmia-preview"], ["user-A", `/c/${lmia}/review`, "lmia-review"],
    ["user-A", "/library/forms", "library-forms"], ["user-A", "/library/fields", "library-fields"], ["user-A", "/library/sections", "library-sections"],
    ["user-A", "/library/documents", "library-documents"], ["user-A", "/library/checks", "library-checks"], ["user-A", "/release", "release"],
    ["user-A", "/releases", "releases"], ["user-A", "/ai", "ai-work"], ["user-A", "/activity", "activity"], ["user-A", "/new", "new-combination-old"],
    ["user-C", "/review", "reviewer-to-review"], ["user-C", `/c/${lmia}/review`, "reviewer-lmia-review"],
    ["user-B", "/review", "approver-to-review"], ["user-B", "/release", "approver-release"],
    ["user-O", "/cases", "officer-cases"], ["user-O", "/", "officer-config-home"], ["user-O", "/library/forms", "officer-library"],
    ["user-P", "/cases", "client-cases"], ["user-P", "/", "client-config-home"],
  ];
  for (const [actor, url, name] of pages) {
    errs = [];
    await p.goto(BASE + "/"); await p.evaluate((a) => localStorage.setItem("xr-actor", a), actor);
    const t0 = Date.now(); await p.goto(BASE + url, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForFunction(() => !/Loading/.test(document.querySelector("main")?.innerText ?? ""), null, { timeout: 20000 }).catch(() => {});
    const ms = Date.now() - t0;
    await p.screenshot({ path: path.join(SHOTS, `${name}-1440.png`), fullPage: true });
    const text = await p.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
    const leaks = LEAKS.filter(([re]) => re.test(text)).map(([re, l]) => `${l}: «${(text.match(re) || [""])[0].slice(0, 60)}»`);
    const ax = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze().catch((e) => ({ violations: [{ id: "axe-failed " + e.message, nodes: [] }] }));
    const axb = await new AxeBuilder({ page: p }).withTags(["best-practice"]).analyze().catch(() => ({ violations: [] }));
    await p.setViewportSize({ width: 1024, height: 768 }); await p.waitForTimeout(300);
    const side = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: path.join(SHOTS, `${name}-1024.png`) });
    await p.setViewportSize({ width: 1440, height: 900 });
    const rec = { actor, url, name, ms, errs, leaks, axe: ax.violations.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ") ?? ""}`), bestPractice: axb.violations.map((v) => `${v.id}(${v.nodes.length})`), sideways1024: side, text: text.slice(0, 1500) };
    out.push(rec); console.log(JSON.stringify({ ...rec, text: undefined }));
    fs.writeFileSync(path.join(SHOTS, `${name}.txt`), text);
  }
  fs.writeFileSync(path.join(SHOTS, "walk.json"), JSON.stringify(out, null, 1));
  await b.close();
})();
