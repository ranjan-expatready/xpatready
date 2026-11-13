// PF-1 (P-558, P-559; contracts §0.1, §5.1): modules add their own pages without editing App.tsx. web/src/modules.tsx
// gathers web/src/modules/*/routes.tsx into the routes App.tsx renders ahead of its catch-all. This suite builds the web
// app (vite build, ~1 s each, into temporary folders: web/dist is never touched) and opens the builds in a browser
// against an isolated copy's API (each page request served from the build under test, /api from the copy):
//   1 a default build ships no fixture (folders starting with "_"); a build with VITE_MODULE_FIXTURES=1 has it;
//   2 the fixture's page opens at its path, and two more modules' pages beside it (pass);
//   3 /, /sign-in and /cases (and /link, /inbox) open exactly as in a build with no module (same address, title,
//     heading, no page error);
//   4 fail: two modules claiming one path, and a module claiming an App.tsx route (/sign-in, under /cases/*, /link,
//     /inbox, the shell's /start, and /c/new under /c/:id) stop the app, the message naming both sides;
//   5 fail: a routes.tsx without `export const routes` stops `vite build` with the file's name;
//   6 APP_ROUTES in modules.tsx equals every <Route path> in App.tsx (but the catch-alls), so a new App.tsx route is
//     guarded too; App.tsx renders {moduleRoutes} once, ahead of its top-level catch-all.
// Temporary module folders (web/src/modules/_pf1_*) are removed at the end, pass or fail. Screenshots:
// product/screens/PF-1/screenshots/. US$0, no model.
//   zsh studio/tools/isolated.sh pf1 4517 start && tsx studio/tests/check_pf1_module_routes.ts 4517
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { chromium, type Browser } from "playwright";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const PORT = Number(process.argv[2] ?? 4517), BASE = `http://localhost:${PORT}`;
const STUDIO = join(import.meta.dirname, ".."), WEB = join(STUDIO, "web"), MODS = join(WEB, "src", "modules");
const SHOTS = join(STUDIO, "..", "..", "product", "screens", "PF-1", "screenshots"); mkdirSync(SHOTS, { recursive: true });
const TMP = mkdtempSync(join(tmpdir(), "pf1-"));
const VITE = join(STUDIO, "node_modules", ".bin", "vite");

/** A temporary module folder web/src/modules/_pf1_<name>/routes.tsx (a fixture: only fixture builds read it). */
const temp: string[] = [];
function tempModule(name: string, source: string) { const d = join(MODS, `_pf1_${name}`); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "routes.tsx"), source); temp.push(d); }
const pageModule = (paths: string[], words: string) => `import type { ModuleRoute } from "@/modules";\nconst Page = () => <main><h1>${words}</h1></main>;\nexport const routes: ModuleRoute[] = [${paths.map((p) => `{ path: ${JSON.stringify(p)}, element: <Page /> }`).join(", ")}];\n`;
function clearTemp() { for (const d of temp.splice(0)) rmSync(d, { recursive: true, force: true }); }

/** vite build into a temporary folder; fixtures: VITE_MODULE_FIXTURES=1. */
function build(name: string, fixtures: boolean) {
  const out = join(TMP, name);
  const r = spawnSync(VITE, ["build", "--outDir", out, "--emptyOutDir"], { cwd: WEB, encoding: "utf8", env: { ...process.env, VITE_MODULE_FIXTURES: fixtures ? "1" : "" } });
  return { out, status: r.status, log: `${r.stdout}\n${r.stderr}` };
}
const jsOf = (out: string) => readdirSync(join(out, "assets")).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(out, "assets", f), "utf8")).join("\n");

const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };
type Seen = { path: string; title: string; h1: string; errors: string[] };
/** Opens BASE+path with every non-/api request answered from the build `out` (the SPA's index.html for addresses). */
async function open(browser: Browser, out: string, path: string, shot?: string): Promise<Seen> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* none */ } });
  await ctx.route(`${BASE}/**`, async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.startsWith("/api/")) return route.continue();
    const f = join(out, u.pathname);
    const file = u.pathname !== "/" && existsSync(f) && statSync(f).isFile() ? f : join(out, "index.html");
    await route.fulfill({ status: 200, body: readFileSync(file), headers: { "content-type": TYPES[extname(file)] ?? "application/octet-stream" } });
  });
  const page = await ctx.newPage(), errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  if (shot) await page.screenshot({ path: join(SHOTS, shot) });
  const seen = { path: new URL(page.url()).pathname, title: await page.title(), h1: (await page.locator("h1").count()) ? ((await page.locator("h1").first().textContent()) ?? "").trim() : "", errors };
  await ctx.close();
  return seen;
}

const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
try {
  // 6 APP_ROUTES and App.tsx's routes agree; the hook is one expression ahead of the top-level catch-all.
  const app = readFileSync(join(WEB, "src", "App.tsx"), "utf8"), mod = readFileSync(join(WEB, "src", "modules.tsx"), "utf8");
  const appPaths = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");
  const listed = [...(mod.match(/APP_ROUTES = \[([\s\S]*?)\] as const/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  ok("PF-1: APP_ROUTES in modules.tsx = every <Route path> in App.tsx but the catch-alls", appPaths.length > 20 && JSON.stringify([...appPaths].sort()) === JSON.stringify([...listed].sort()), { onlyApp: appPaths.filter((p) => !listed.includes(p)), onlyList: listed.filter((p) => !appPaths.includes(p)) });
  ok("PF-1: App.tsx renders {moduleRoutes} once, just ahead of its top-level catch-all", (app.match(/\{moduleRoutes\}/g) ?? []).length === 1 && /\{moduleRoutes\}<Route path="\*" element=\{<KnownPerson><Shell \/><\/KnownPerson>\} \/><\/Routes>/.test(app));

  // 1 default build: no fixture shipped; fixture build: the fixture is in.
  const plain = build("plain", false);
  ok("PF-1: a default vite build passes", plain.status === 0, plain.status === 0 ? undefined : plain.log.slice(-600));
  ok("PF-1: a default build ships no fixture module (web/src/modules/_example)", plain.status === 0 && !jsOf(plain.out).includes("Example module"));
  tempModule("one", pageModule(["/pf1-one"], "Module one page"));
  tempModule("two", pageModule(["/pf1-two/*"], "Module two page"));
  const fx = build("fixtures", true);
  ok("PF-1: a fixture build (VITE_MODULE_FIXTURES=1) passes and has the fixture", fx.status === 0 && jsOf(fx.out).includes("Example module"), fx.status === 0 ? undefined : fx.log.slice(-600));
  clearTemp();

  // 2 the fixture's page and two more modules open at their paths (pass).
  const ex = await open(browser, fx.out, "/_example/pf-1", "pf1-example-module-1440.png");
  ok("PF-1: the fixture's page opens at /_example/pf-1 (no App.tsx change beyond the one line)", ex.path === "/_example/pf-1" && ex.h1 === "Example module" && ex.errors.length === 0, ex);
  const one = await open(browser, fx.out, "/pf1-one"), two = await open(browser, fx.out, "/pf1-two/any/where");
  ok("PF-1: two more modules' pages open beside it (/pf1-one, /pf1-two/*)", one.h1 === "Module one page" && two.h1 === "Module two page" && !one.errors.length && !two.errors.length, { one, two });
  const plainEx = await open(browser, plain.out, "/_example/pf-1");
  ok("PF-1: in a default build the fixture's path falls to the shell, not the fixture", plainEx.h1 !== "Example module" && plainEx.errors.length === 0, plainEx);

  // 3 every existing route opens as before: the same address, title and heading as a build with no module.
  for (const path of ["/", "/sign-in", "/cases", "/link", "/inbox"]) {
    const before = await open(browser, plain.out, path), after = await open(browser, fx.out, path, `pf1-existing${path === "/" ? "-home" : path.replace(/\//g, "-")}-1440.png`);
    ok(`PF-1: ${path} opens as before with modules present`, before.errors.length === 0 && JSON.stringify(after) === JSON.stringify(before) && (before.h1 !== "" || before.title !== ""), { before, after });
  }

  // 4 fail: clashes stop the app, naming both sides.
  tempModule("dup_a", pageModule(["/pf1-dup"], "A")); tempModule("dup_b", pageModule(["/pf1-dup"], "B"));
  const dup = build("dup", true); clearTemp();
  const dupSeen = await open(browser, dup.out, "/pf1-dup", "pf1-clash-two-modules-1440.png");
  ok("PF-1: two modules claiming /pf1-dup stop the app with both names", dupSeen.errors.some((e) => e.includes('modules "_pf1_dup_a" and "_pf1_dup_b" both claim /pf1-dup')) && dupSeen.h1 === "", dupSeen.errors);
  const claims: [string, string][] = [["/sign-in", "/sign-in"], ["/cases/new", "/cases/*"], ["/link", "/link"], ["/inbox", "/inbox"], ["/start", "/start"], ["/c/new", "/c/:id"]];
  tempModule("app", pageModule(claims.map((c) => c[0]), "Clash"));
  const clash = build("clash", true); clearTemp();
  const clashSeen = await open(browser, clash.out, "/sign-in");
  for (const [mine, theirs] of claims) ok(`PF-1: a module claiming ${mine} stops the app, naming the module and App.tsx's ${theirs}`, clashSeen.errors.some((e) => e.includes(`module "_pf1_app" claims ${mine}, which App.tsx already routes (${theirs})`)), clashSeen.errors);
  ok("PF-1: with a clash nothing renders (not the sign-in page, not the module)", clashSeen.h1 === "", clashSeen.h1);
  tempModule("all", pageModule(["/*"], "All"));
  const all = build("all", true); clearTemp();
  const allSeen = await open(browser, all.out, "/pf1-anything");
  ok("PF-1: a module claiming the catch-all (/*) stops the app", allSeen.errors.some((e) => e.includes('module "_pf1_all" claims /*: a module never takes "/" or the catch-all')), allSeen.errors);

  // 5 fail: a routes.tsx without `routes` stops vite build with its file name.
  tempModule("bad", "export const pages = [];\n");
  const bad = build("bad", true); clearTemp();
  ok("PF-1: a routes.tsx without `export const routes` stops vite build, naming the file", bad.status !== 0 && bad.log.includes("_pf1_bad/routes.tsx") && /routes/.test(bad.log) && /Missing export|MISSING_EXPORT|not exported/i.test(bad.log), { status: bad.status, log: bad.log.slice(-400) });
} finally {
  clearTemp();
  await browser.close();
  rmSync(TMP, { recursive: true, force: true });
}
process.exit(summary() ? 1 : 0);
