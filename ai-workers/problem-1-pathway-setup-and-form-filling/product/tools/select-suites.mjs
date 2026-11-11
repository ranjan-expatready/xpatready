#!/usr/bin/env node
// Picks the studio suites a change can affect (test-speed plan, founder 31 Oct: each pull request checks only the suites
// its files can affect; the full set runs nightly on main). Used by run-suites.sh --changed <base>..<head>:
//   git diff --name-only <base>...<head> | node product/tools/select-suites.mjs
// Prints one line per chosen suite, "<suite>\t<reason>", or a first line "ALL\t<reason>" when everything must run.
// The simple form of predictive test selection, kept conservative where it cannot see: what would run everything still
// does for ci.yml, package files, the scripts that run every suite, the schema and its migrations, api/src/main.ts,
// prototype/env/, official-sources/ and a code file outside prototype/ no rule covers.
//   * B121 (P-376 (4), (7)): any other file reaches the suites through a reference graph read from the files themselves
//     (no new dependency): X uses Y when X imports Y (import, export ... from, require, import()), when X's code names Y's
//     file name ("fill.py", "own-yes-no.json"), or when X's strings name Y's folder beside its parent ("p1", "inventory";
//     "samples" in a file under studio/). A change runs the suites that use it, transitively; on the way an API module
//     adds its endpoints' suites and a web file its pages' browser suites (the two rules below), and a script that runs
//     every suite (run-suites.sh, cloud-setup.sh, isolated.sh, start.sh, stop.sh, web-fresh.sh) runs everything. A folder
//     named only to fingerprint it (demo.ts's fp(...): reset proves it leaves them untouched) is not a use. Before B121
//     engine/, contracts/, prototype/p1, p2, p5, test helpers, samples/, acceptance/ and studio/tools/ ran everything:
//     22 of the last 60 PR checks took 10 min or more (P-376 (4)).
//   * a contract (contracts/*.ts) also runs check_contract_seams.ts; the schema runs check_prisma_schema.ts (fast checks
//     without a browser, P-376 (7));
//   * a changed check_* file runs itself (the three runtime R1 suites run together: they share one copy, in order);
//   * a web page or component: the routes it serves (App.tsx's router, through whatever imports it) and its own names,
//     looked up in the browser suites; no match, or a file the shell itself uses, runs every browser suite;
//   * an API module (api/src/**/*.ts): the endpoint paths of the module and of every module that imports it (in main.ts,
//     only the controllers that use it), looked up in the suites, plus the suites that import it; no match runs everything;
//     a web file that calls one of those endpoints adds its own browser suites (the web rule above);
//   * any changed file: the suites whose text names it (file name with extension: suites that read a source as text);
//   * a file under api/src or web/src: the suites that read every file of that folder (a readdirSync over it);
//   * always a fixed smoke set of fast suites along the main journey (structure, programs, start setup, the
//     combination workspace in a browser, engine, cases).
// Docs and images (.md, .txt, .png, .jpg, .gif, .webp, .svg, .pdf) and records outside prototype/ choose nothing, except
// (I1, 3 Nov) the .md files the app or a suite reads as data: the AI prompts (prototype/**/prompts/*.md), api/src/**/*.md
// (the features guide) and test fixtures, which go through the graph; and official-sources/ (the app reads its
// manifests and PDFs at start): all. Of product/tools/ only the files that decide how the suites run choose everything
// (run-suites.sh, this file, cloud-setup.sh, lane.sh, change-kind.sh, ci-memory.mjs); of .github/ only workflows/ci.yml.
// --direct (I1, a PR check that leaves the full set to the merge queue, P-291 (3)): never ALL and never "every browser
// suite"; a file that would choose everything chooses the suites that import it (through test helpers) or name it.
// --why: each chosen suite's reason names the chain of files by which it uses the change; SELECT_DEBUG=1 prints every
// use the graph follows (on stderr).
// --packs (D2, P-416, founder 8 Nov; gate B's set by diff): prints "<file>\t<chain>" for each file under studio/acceptance/
// or studio/tests/ that IS a changed file or reads one, through the same graph (imports, file names, folders), walked
// from each changed file (under prototype/ or official-sources/) to the files that use it. It walks through test helpers,
// acceptance/lib, engine/, contracts/, samples/ and fixtures; through an API module or a web file only by import edges
// (packs that import API code, e.g. C11.13's proposals.ts, read it; a pack that calls a route over HTTP does not), and
// never through main.ts, a suite or a script that runs every suite. A deleted file is seeded by the files whose text
// still names it (its graph edges are gone with it). gate-b.mjs reads the packs, and the set-up scripts their run lines
// name, from this list.
// Reads files only: no server, no database, no model call (US$0). Checks: product/tools/check-select-suites.sh.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, normalize, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const P = "ai-workers/problem-1-pathway-setup-and-form-filling", PR = `${P}/prototype`, S = `${PR}/studio`;
const SKIP = new Set(["check_catalogue_scale.cjs"]);   // as in run-suites.sh: not a regression suite
const SMOKE = ["check_engine.ts", "check_case_engine.ts", "check_w1_structure.ts", "check_screen01_api.ts", "check_w1_start_setup.ts", "check_dv_backbone_browser.cjs"];
const CONTRACT_CHECK = "check_contract_seams.ts", SCHEMA_CHECK = "check_prisma_schema.ts";   // B121, P-376 (7)
const RUNTIME_GROUP = ["check_runtime_r1c.cjs", "check_runtime_r1d.ts", "check_runtime_r1a.ts"];
const DOCS0 = /\.(md|txt|png|jpe?g|gif|webp|svg|pdf)$/i;
const DATA_MD = new RegExp(`^${P}/prototype/(.*/)?prompts/|^${P}/prototype/studio/(api/src|tests/fixtures)/`);
const DOCS = { test: (f) => DOCS0.test(f) && !DATA_MD.test(f) && !f.startsWith(`${P}/official-sources/`) || /^ai-workers\/[^/]+\/official-sources\/.*\.md$/i.test(f) };
const SUITE_TOOLS = /\/product\/tools\/(run-suites\.sh|select-suites\.mjs|cloud-setup\.sh|lane\.sh|change-kind\.sh|ci-memory\.mjs)$/;
const DIRECT = process.argv.includes("--direct"), WHY = process.argv.includes("--why");

const texts = new Map();
const read = (f) => { if (!texts.has(f)) { let t = ""; try { t = readFileSync(join(ROOT, f), "utf8"); } catch {} texts.set(f, t); } return texts.get(f); };
const ls = (d, re) => existsSync(join(ROOT, d)) ? readdirSync(join(ROOT, d)).filter((n) => re.test(n)).map((n) => `${d}/${n}`) : [];
const walk = (d) => !existsSync(join(ROOT, d)) ? [] : readdirSync(join(ROOT, d)).flatMap((n) => {
  const p = `${d}/${n}`; return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Pattern tests, remembered by (pattern, text name): the same routes and endpoints are looked up for many changed files.
// A path pattern starts with a literal segment: a text without "/<segment>" cannot match and is not searched.
const res = new Map(), hitMemo = new Map();
const hit = (src, key, t) => {
  const k = `${src}\0${key}`; let v = hitMemo.get(k);
  if (v === undefined) {
    const lit = src.match(/^(?:\(\?<=[^)]*\))?\/([A-Za-z0-9_-]+)/)?.[1];
    v = lit !== undefined && !t.includes(`/${lit}`) ? false : (res.get(src) ?? res.set(src, new RegExp(src)).get(src)).test(t);
    hitMemo.set(k, v);
  }
  return v;
};

// The suites run-suites.sh runs, by the name its summary uses (file names are unique across the three folders).
const suites = new Map();   // name -> path
for (const f of [...ls(`${S}/tests`, /^check_.*\.(ts|cjs)$/), ...ls(`${S}/tests/runtime`, /^check_.*\.(ts|cjs)$/),
  ...["check_p2_guard.ts", "check_p2_launch.ts"].map((n) => `${PR}/tests/${n}`).filter((f) => existsSync(join(ROOT, f)))]) {
  if (!SKIP.has(basename(f))) suites.set(basename(f), f);
}
const text = new Map([...suites].map(([n, f]) => [n, read(f)]));
const codeTexts = new Map();   // a suite's text without its comments (a // after ":" or a quote is a URL or a string)
const codeText = (n) => codeTexts.get(n) ?? codeTexts.set(n, text.get(n).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1")).get(n);
const browser = [...suites.keys()].filter((n) => /playwright|chromium/.test(text.get(n)));
// Suites that read every file of a source folder (the deny-by-default route check, the stand-in and words scans).
const scanners = (re) => [...suites.keys()].filter((n) => /readdirSync|globSync/.test(text.get(n)) && re.test(text.get(n)));
const apiScanners = scanners(/["'`]api["'`]|api\/src/), webScanners = scanners(/["'`]web["'`]|web\/src/);

// Relative imports and requires of a file, resolved to repository paths ("@/x" is web/src/x; "./x.js" may be x.ts).
const importsMemo = new Map();
function importsOf(f) {
  if (importsMemo.has(f)) return importsMemo.get(f);
  const out = new Set(), src = read(f); importsMemo.set(f, out);
  for (const m of src.matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)) {
    let spec = m[1], base;
    if (spec.startsWith("@/")) base = `${S}/web/src/${spec.slice(2)}`;
    else if (spec.startsWith(".")) base = normalize(join(dirname(f), spec));
    else continue;
    const js = base.replace(/\.js$/, "");
    for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.cjs`, `${base}.mjs`, `${base}/index.tsx`, `${base}/index.ts`, `${js}.ts`, `${js}.tsx`]) {
      if (existsSync(join(ROOT, c)) && statSync(join(ROOT, c)).isFile()) { out.add(c); break; }
    }
  }
  return out;
}
// Everything that imports f, directly or through other files of the set (f included); stop: files not walked through.
function importers(f, files, stop = new Set()) {
  const graph = new Map(files.map((x) => [x, importsOf(x)])), seen = new Set([f]), todo = [f];
  while (todo.length) {
    const g = todo.pop();
    for (const [x, deps] of graph) if (deps.has(g) && !seen.has(x)) { seen.add(x); if (!stop.has(x)) todo.push(x); }
  }
  return seen;
}
// The suites whose own file, or a test helper it loads (seed_proposals.ts, runtime/api.ts, ...), imports one of targets.
const testFiles = [...walk(`${S}/tests`), ...walk(`${PR}/tests`)].filter((f) => /\.(ts|cjs|mjs|js)$/.test(f) && !f.includes("/fixtures/"));
function suitesImporting(targets) {
  const hit = new Set();
  for (const t of targets) for (const x of importers(t, [...new Set([...testFiles, ...targets])])) if (suites.has(basename(x)) && suites.get(basename(x)) === x) hit.add(basename(x));
  return hit;
}
// A route or endpoint path as a pattern: a ":param" segment matches one segment (a word, a number or a template
// \${...}); the path ends there (a query or a closing quote may follow), so /c/:id does not stand for /c/:id/forms.
function pathPattern(path) {
  const segs = path.replace(/^\/+|\/+$|\/\*$/g, "").split("/").filter(Boolean);
  if (!segs.length || segs[0].startsWith(":") || segs[0] === "*") return null;   // "/" or ":id" alone: too general to look up
  return segs.map((s) => s.startsWith(":") ? "(?:\\$\\{[^}\\n]*\\}|[A-Za-z0-9_.~%-]+)" : esc(s)).join("/") + "(?![A-Za-z0-9_/-])";
}
// The suites that call an endpoint (its path pattern), remembered.
const SETUP_SHARE = 1 / 3, callerMemo = new Map();
const callers = (p) => callerMemo.get(p) ?? callerMemo.set(p, [...text].filter(([n, t]) => hit(`/${p}`, n, t)).map(([n]) => n)).get(p);
const exportedNames = (f) => [...read(f).matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/g)].map((m) => m[1]);

// ---- web: App.tsx's routes and the names it takes from each file
const APP = `${S}/web/src/App.tsx`, appSrc = read(APP);
const appRoutes = [...appSrc.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([A-Z][A-Za-z0-9_]*)/g)].map((m) => ({ path: m[1], el: m[2] }));
const appImports = new Map();   // file -> names App.tsx imports from it
for (const m of appSrc.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"(@\/[^"]+)"/g)) {
  const f = [...importsOf(APP)].find((x) => x.startsWith(`${S}/web/src/${m[2].slice(2)}.`) || x.startsWith(`${S}/web/src/${m[2].slice(2)}/index.`));
  if (f) appImports.set(f, m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()).filter(Boolean));
}
const webFiles = walk(`${S}/web/src`).filter((f) => /\.(tsx?|mjs)$/.test(f));
function webPick(f) {
  const rel = f.slice(`${S}/web/`.length);
  if (!rel.startsWith("src/") || /^src\/(App\.tsx|main\.tsx|env\.d\.ts|lib\/|styles\/)/.test(rel) || !/\.(tsx?)$/.test(rel)) return { browser: `${rel}: shared by every page`, shell: true };
  const reach = importers(f, webFiles, new Set([APP]));
  const names = new Set(), shell = [];
  for (const x of reach) for (const n of appImports.get(x) ?? []) (appRoutes.some((r) => r.el === n) ? names.add(n) : shell.push(n));
  if (shell.length) return { browser: `${rel}: used by the shell around every page (${shell.slice(0, 3).join(", ")})`, shell: true };
  const routes = appRoutes.filter((r) => names.has(r.el)).map((r) => r.path);
  const pats = routes.map((r) => [r, pathPattern(r)]).filter(([, p]) => p);
  // A route too general to look up ("/", the Immigration programs home) cannot be matched to suites: every browser suite.
  const general = routes.find((r) => !pathPattern(r));
  const own = exportedNames(f);
  const out = new Map();
  for (const n of browser) {
    const t = text.get(n);
    // A page address follows the server's address or opens a string (`${BASE}/structure`, "/review"); never /api/...
    const r = pats.find(([, p]) => hit(`(?<=[}"'\`0-9])/${p}`, n, t));
    const c = own.find((x) => hit(`\\b${x}\\b`, n, t));
    if (r) out.set(n, `${rel} serves ${r[0]}`); else if (c) out.set(n, `${rel}: names ${c}`);
  }
  if (general) return { browser: `${rel} serves ${general}, too general to look up`, picks: out, home: general === "/" };
  if (!out.size) return { browser: `${rel}: ${routes.length ? `no browser suite opens ${routes.join(", ")}` : "no route found"}` };
  return { picks: out };
}

// ---- api: endpoints of a module and of what imports it
const apiFiles = walk(`${S}/api/src`).filter((f) => /\.ts$/.test(f)), MAIN = `${S}/api/src/main.ts`;
function endpoints(src) {
  const out = [];
  // Each controller's prefix ("api", "api/runtime", "api/demo") applies to the endpoints after it; "api/" is dropped,
  // since suites call some endpoints through helpers that add it.
  const parts = src.split(/(?=@Controller\()/);
  for (const part of parts) {
    const pre = (part.match(/^@Controller\("([^"]*)"\)/)?.[1] ?? "").replace(/^api\/?/, "");
    if (!part.startsWith("@Controller(")) continue;
    for (const m of part.matchAll(/@(?:Get|Post|Put|Patch|Delete)\("([^"]*)"\)/g)) out.push([pre, m[1]].filter(Boolean).join("/"));
  }
  return out;
}
// seeds: the files the change reaches that API modules (or main.ts) import (B121: f itself for an API module).
function apiPick(f, seeds = [f]) {
  const rel = f.startsWith(`${S}/`) ? f.slice(`${S}/`.length) : f.slice(PR.length + 1);
  if (seeds.length === 1 && seeds[0] === f && !existsSync(join(ROOT, f))) return { all: `${rel}: removed or renamed` };
  const reach = new Set(), viaGraph = !(seeds.length === 1 && seeds[0] === f);
  for (const sd of seeds) for (const x of importers(sd, apiFiles, new Set([MAIN]))) reach.add(x);
  const eps = new Set();
  for (const x of reach) if (x !== MAIN) for (const e of endpoints(read(x))) eps.add(e);
  if (reach.has(MAIN)) {
    // main.ts: only its controllers that use a name taken from the changed module or from a module that imports it.
    // Its own code outside the controllers (the error filter, start-up) runs for every request: a name it takes from the
    // changed module itself runs everything. Comments, imports and the @Module list (registration only) are not uses.
    const msrc = read(MAIN).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1"), names = [], own = [];
    for (const m of msrc.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+"\.\/([^"]+)"/g)) {
      const from = normalize(join(dirname(MAIN), m[2])), list = m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()).filter(Boolean);
      if (reach.has(from)) names.push(...list);
      if (from === f) own.push(...list);
    }
    const usedOf = (ns) => (s) => ns.find((n) => new RegExp(`\\b${esc(n)}\\b`).test(s)), used = usedOf(names);
    const body = msrc.split("\n").filter((l) => !/^import\s|^@Module\(/.test(l)).join("\n")
      .replace(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g, (q) => /^["']/.test(q) ? '""' : q.replace(/\$\{([^}]*)\}|[^]/g, (m, e) => e === undefined ? "" : ` ${e} `));   // words in strings are not uses; ${...} code is
    // The text before the first controller is ctrls[0] (empty when the file starts with one).
    const ctrls = [...(body.startsWith("@Controller(") ? [""] : []), ...body.split(/(?=@Controller\()/)], outside = ctrls[0] + ctrls.slice(1).map((c) => c.replace(/^@Controller[\s\S]*?\n\}\n/, "")).join("");
    const n0 = usedOf(own)(outside);
    if (n0) return { all: `${rel}: main.ts uses ${n0} outside its controllers` };
    // B121 review M1: the paths come from the text with its strings (the blanked one has @Post("") only).
    const rawText = msrc.split("\n").filter((l) => !/^import\s|^@Module\(/.test(l)).join("\n");
    const raw = [...(rawText.startsWith("@Controller(") ? [""] : []), ...rawText.split(/(?=@Controller\()/)];
    ctrls.slice(1).forEach((c, i) => {
      const block = c.match(/^@Controller[\s\S]*?\n\}\n/)?.[0] ?? c, rawBlock = raw[i + 1]?.match(/^@Controller[\s\S]*?\n\}\n/)?.[0] ?? raw[i + 1] ?? "";
      if (used(block)) for (const e of endpoints(rawBlock)) eps.add(e);
    });
  }
  const pats = [...eps].map((e) => [e, pathPattern(e)]).filter(([, p]) => p);
  const out = new Map();
  // B121: a set-up endpoint (more than a third of the suites call it: /demo/load, /demo/reset) chooses its own suites,
  // those whose file name has one of its words (check_s7_load.ts, check_s7_reset.ts, check_forms_demo.ts); the smoke set
  // loads and resets on every run, and the merge queue runs every suite.
  const live = [];
  for (const [e, p] of pats) {
    const c = callers(p);
    if (c.length <= suites.size * SETUP_SHARE) { live.push([e, p]); continue; }
    const words = e.split("/").filter((w) => !w.startsWith(":") && w.length >= 4);
    for (const n of c) if (!out.has(n) && words.some((w) => n.includes(w))) out.set(n, `${rel}: calls /${e} (a set-up endpoint ${c.length} suites call; its own suite)`);
  }
  for (const [n, t] of text) {
    if (out.has(n)) continue;
    const e = live.find(([, p]) => hit(`/${p}`, n, t));
    if (e) out.set(n, `${rel}: calls /${e[0]}`);
  }
  for (const n of suitesImporting([...reach].filter((x) => x !== MAIN))) if (!out.has(n)) out.set(n, `${rel}: imported by the suite`);
  // The pages that call these endpoints: their browser suites too (a double-click guard is tested through the page).
  // B121: for a change that reaches the module through the graph (engine/, contracts/, data), the shell around every page
  // (App.tsx's Demo menu) or the home page "/" calling one of its endpoints is not every browser suite: a call made on
  // every page load is opened by the smoke set's browser suite. A change to the module that declares the endpoint, or to
  // the shell or home page itself, still runs every browser suite (review M2: the Demo menu's suites test it by clicks).
  let browserWhy;
  for (const w of webFiles) {
    const e = live.find(([, p]) => hit(`/${p}`, w, read(w)));
    if (!e) continue;
    const wp = webMemo(w), wrel = w.slice(`${S}/`.length);
    if (wp.browser && !((wp.shell || wp.home) && viaGraph) && !browserWhy) browserWhy = `${rel}: /${e[0]} is called by ${wrel} (${wp.browser})`;
    for (const [n] of wp.picks ?? []) if (!out.has(n)) out.set(n, `${rel}: /${e[0]} is called by ${wrel}`);
  }
  if (!out.size && !browserWhy) return { all: `${rel}: no suite calls its ${eps.size} endpoint(s) or imports it` };
  return { picks: out, browser: browserWhy };
}

// ---- the reference graph (B121, P-376 (4)): who uses a file, read from the files themselves (no new dependency).
// The texts read: tracked and new files under prototype/ (code, and JSON up to 256 KB) and the scripts that run every
// suite. Three kinds of use: imports (importsOf), a file name in the code ("fill.py"), and a folder named in strings
// beside its parent ("p1", "inventory"; or by a file inside the parent: "samples" in studio/api/src/x.ts).
const RUNNERS = new Set([`${P}/product/tools/run-suites.sh`, `${P}/product/tools/cloud-setup.sh`, `${S}/tools/isolated.sh`, `${S}/start.sh`, `${S}/stop.sh`, `${S}/tools/web-fresh.sh`]);
const CODE = /\.(ts|tsx|cjs|mjs|js)$/, SCAN = /\.(ts|tsx|cjs|mjs|js|py|sh|zsh|json)$/;
// A line that only fingerprints folders (demo.ts preserved(): reset must leave them as they were) reads no file's meaning.
const FINGERPRINT_ONLY = /\bfp\(\s*["']/;
const R1_SETUP = `${S}/tests/runtime/setup_visitor_visa.ts`;
// Comments out, strings kept (review m1: "expected/*.v2.json" in a string is no comment start). A quote ends at its line's
// end unless it is a backtick, so a regular expression holding a lone quote keeps at most a line's comments (more uses,
// never fewer).
function stripComments(t) {
  let out = "", q = "", i = 0;
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (q) { out += c; if (c === "\\") { out += n ?? ""; i += 2; continue; } if (c === q || (c === "\n" && q !== "`")) q = ""; i++; continue; }
    if (c === "/" && n === "*") { const e = t.indexOf("*/", i + 2); i = e < 0 ? t.length : e + 2; continue; }
    if (c === "/" && n === "/" && !/[:"'`\\]$/.test(out)) { while (i < t.length && t[i] !== "\n") i++; continue; }
    if (c === '"' || c === "'" || c === "`") q = c;
    out += c; i++;
  }
  return out;
}
let G = null;
function graph() {
  if (G) return G;
  let files = [];
  try { files = execSync(`git ls-files -c -o --exclude-standard -- "${PR}"`, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20 }).split("\n"); } catch { return (G = { failed: true }); }
  // tsconfig and package files list folders for the compiler and npm, which is no use of the files in them (they run
  // everything when they change).
  files = [...new Set([...files.filter((f) => f && !/\/(node_modules|dist|var)\//.test(f) && SCAN.test(f) && !/(^|\/)(tsconfig[^/]*|package(-lock)?)\.json$/.test(f)), ...RUNNERS])];
  const users = new Map(), names = new Map(), segs = new Map(), segOf = new Map();
  const put = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
  for (const x of files) {
    if (/\.json$/.test(x)) { try { if (statSync(join(ROOT, x)).size > 256 << 10) continue; } catch { continue; } }
    let t = read(x);
    if (CODE.test(x)) {
      for (const d of importsOf(x)) put(users, d, x);
      t = stripComments(t);
    } else if (/\.(py|sh|zsh)$/.test(x)) {
      t = t.replace(/(^|\s)#.*$/gm, "$1");
      // review m2: "import xfa_inventory as X", "from read_validated import f": a module beside it.
      if (/\.py$/.test(x)) for (const m of t.matchAll(/^\s*(?:from\s+([A-Za-z_]\w*)\s+import|import\s+([A-Za-z_]\w*))/gm)) {
        const d = `${dirname(x)}/${m[1] ?? m[2]}.py`; if (existsSync(join(ROOT, d))) put(users, d, x);
      }
    }
    // Import paths are imports (above), not folder uses ("../engine/x.ts" does not read every file in engine/).
    t = t.split("\n").filter((l) => !FINGERPRINT_ONLY.test(l)).join("\n").replace(/((?:from|import|require)\s*\(?\s*)["'][^"'\n]+["']/g, "$1");
    for (const w of t.split(/[^A-Za-z0-9_.-]+/)) { const n = w.replace(/^\.+|\.+$/g, ""); if (n.includes(".")) put(names, n, x); }
    // A folder is used only by a file that lists folders (readdirSync, globSync, walk, under) or builds a file name in
    // one (a template string, \`p1/inventory/${f}.json\`); a file that names its files one by one uses only those.
    const mine = new Set(), lists = /\b(readdirSync|readdir|opendirSync|globSync|glob|walk|under|listdir|os\.walk|iterdir|rglob)\s*\(/.test(t);
    for (const m of t.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`([^`]*)`/g)) {
      const str = m[1] ?? m[2] ?? m[3] ?? "", dyn = m[3] !== undefined && /\$\{/.test(str);
      for (const g of str.split(/\/|\$\{[^}]*\}/)) if (/^[A-Za-z0-9_.-]+$/.test(g)) { mine.add(g); if (lists || dyn) put(segs, g, x); }
    }
    segOf.set(x, mine);
  }
  return (G = { users, names, segs, segOf });
}
// The files that use y directly (y itself not included), each with how: "import", "name" or "folder".
function usersOf(y) {
  const { users, names, segs, segOf } = graph(), out = new Map();
  for (const x of users.get(y) ?? []) out.set(x, "import");
  // A JSON file runs nothing: it uses another data file it names (a job's prompt), never code it mentions (a saved AI
  // run quoting a source file, the explicit-any baseline listing every file).
  const data = !/\.(ts|tsx|cjs|mjs|js|py|sh|zsh)$/.test(y), can = (x) => data || !/\.json$/.test(x);
  for (const x of names.get(basename(y)) ?? []) if (!out.has(x) && can(x)) out.set(x, "name");
  const d = dirname(y), c = basename(d), b = basename(dirname(d)), up = `${dirname(d)}/`;
  // Listing a folder of code is a check reading the code (a suite or test helper scanning api/src), never the app
  // running it: code reached through a folder only by files under tests/.
  const lister = (x) => data || x.startsWith(`${S}/tests/`) || x.startsWith(`${PR}/tests/`);
  for (const x of segs.get(c) ?? []) if (!out.has(x) && can(x) && lister(x) && (segOf.get(x)?.has(b) || x.startsWith(up))) out.set(x, "folder");
  out.delete(y); return out;
}
const short = (f) => f.startsWith(`${S}/`) ? f.slice(`${S}/`.length) : f.startsWith(`${PR}/`) ? `prototype/${f.slice(PR.length + 1)}` : f.startsWith(`${P}/`) ? f.slice(P.length + 1) : f;
// What a changed file reaches: the suites that use it, the API modules and web files on the way (their own rules then
// choose their suites), or everything when a script that runs every suite uses it.
function graphPick(f) {
  if (graph().failed) return { all: `${short(f)}: the file list (git ls-files) could not be read` };
  const rel = short(f), via = new Map([[f, null]]), todo = [f], out = new Map(), api = [], web = [];
  const chain = (x) => { const c = []; for (let y = x; y; y = via.get(y)) c.push(basename(y)); return c.reverse().join(" → "); };
  while (todo.length) {
    const y = todo.shift();
    for (const [x, how] of usersOf(y)) {
      // A script that runs every suite and lists a folder (run-suites.sh's tests/check_*) runs the suites in it, not
      // the folder's other files: only its imports and the files it names make it a use.
      if (via.has(x) || (RUNNERS.has(x) && how === "folder")) continue;
      via.set(x, y);
      if (process.env.SELECT_DEBUG) console.error(`${short(y)} <- ${short(x)} (${how})`);   // every use followed, on stderr
      if (RUNNERS.has(x)) return { all: `${rel}: used by ${short(x)}, which runs every suite (${chain(x)})` };
      // The runtime R1 suites' shared set-up (run-suites.sh runs it before them): those three suites.
      if (x === R1_SETUP) { out.set(RUNTIME_GROUP[2], `uses ${rel} through ${basename(x)} (the R1 set-up)`); continue; }
      // A suite is where a chain ends: run-suites.sh names the suites it runs, which is not a use of what they test.
      if (suites.get(basename(x)) === x) { out.set(basename(x), WHY ? `uses ${chain(x)}` : `uses ${rel}${via.get(x) === f ? "" : ` (through ${basename(via.get(x))})`}`); continue; }
      if (x === MAIN) continue;   // main.ts: apiPick reads which of its controllers use the change
      if (x.startsWith(`${S}/api/src/`) && CODE.test(x)) { api.push(x); continue; }
      if (x.startsWith(`${S}/web/`)) { web.push(x); continue; }
      todo.push(x);
    }
  }
  let browser;
  if (api.length || via.has(MAIN)) {
    const seeds = [...api, ...[...via.keys()].filter((x) => importsOf(MAIN).has(x))];
    const p = apiPick(f, seeds);
    if (p.all) return { all: `${rel}: through ${api.map((x) => basename(x)).slice(0, 3).join(", ")}: ${p.all.replace(/^[^:]*: /, "")}` };
    for (const [n, r] of p.picks ?? []) if (!out.has(n)) out.set(n, r);
    browser = p.browser;
  }
  for (const w of web) {
    const p = webMemo(w);
    if (p.browser && !browser) browser = `${rel}: used by ${short(w)} (${p.browser})`;
    for (const [n, r] of p.picks ?? []) if (!out.has(n)) out.set(n, `${rel}: used by ${short(w)}; ${r}`);
  }
  return { picks: out, browser };
}
const webMemos = new Map();
const webMemo = (w) => webMemos.get(w) ?? webMemos.set(w, existsSync(join(ROOT, w)) ? webPick(w) : { browser: `${short(w)}: removed` }).get(w);

// ---- one changed file
function pick(f) {
  if (DOCS.test(f)) return {};
  if (f === ".github/workflows/ci.yml" || f === ".nvmrc" || /(^|\/)package(-lock)?\.json$/.test(f)) return { all: `${f}: shared` };
  if (/^\.github\//.test(f)) return {};   // other workflows (nightly, demo) do not change a pull request's check
  if (f.startsWith(`${P}/product/tools/`)) return SUITE_TOOLS.test(f) ? { all: `${f.slice(P.length + 1)}: decides how the suites run` } : {};
  if (f.startsWith(`${P}/official-sources/`)) return { all: `${f.slice(P.length + 1)}: official sources (the app reads them)` };
  if (!f.startsWith(`${PR}/`)) return {};   // records, boards, official sources: the fast checks cover them
  const r = f.slice(PR.length + 1), st = r.startsWith("studio/") ? r.slice("studio/".length) : null;
  if (r.startsWith("env/")) return { all: "prototype/env/: the packages and Python helpers every copy installs" };
  if (RUNNERS.has(f)) return { all: `${st}: runs every suite` };
  // The schema and its migrations shape every copy's database; main.ts's start-up and error filter run on every request.
  if (st !== null && /^prisma\//.test(st)) return { all: `${st}: shared`, picks: new Map(suites.has(SCHEMA_CHECK) ? [[SCHEMA_CHECK, `${st}: the schema's check (P-376 (7))`]] : []) };
  if (st !== null && /^(api\/src\/main\.ts$|api\/tsconfig\.json$|prisma\.config\.ts$)/.test(st)) return { all: `${st}: shared` };
  // B120's step folders (api/src/features/<dir>/: the checkpoint, the placement passes) are loaded by listing the folder
  // (features.ts featureSteps), not by an import the graph can follow, and they run inside the checkpoint that most set-up
  // suites load: every file there, helpers included, runs everything, as before B121 (re-review after #1158, Major).
  if (st !== null && /^api\/src\/features\/[^/]+\/.+\.ts$/.test(st)) return { all: `${st}: a step folder the app loads by listing it` };
  if (st !== null && /^api\/src\/.+\.ts$/.test(st)) return apiPick(f);
  if (st !== null && st.startsWith("web/")) return webPick(f);
  // Everything else (B121): engine/, contracts/, prototype/p1, p2, p5, samples/, acceptance/, tests/ helpers and
  // fixtures, studio/tools/, a suite itself: the files that use it, through the graph.
  const n = basename(r);
  // A suite is run, never read: files that name it (run-suites.sh, records quoting it) do not use it.
  if (suites.get(n) === f) return { picks: new Map([[n, "changed"], ...[...suitesImporting([f])].filter((x) => x !== n).map((x) => [x, `imports ${n}`])]) };
  const g = graphPick(f);
  if (g.all) return g;
  if (st !== null && /^contracts\/[^/]+\.ts$/.test(st) && suites.has(CONTRACT_CHECK)) g.picks.set(CONTRACT_CHECK, `${st}: a contract, its seam check (P-376 (7))`);
  return g;
}

const changed = readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
if (process.argv.includes("--packs")) {   // D2: the acceptance and test files that are, or read, a changed file
  if (graph().failed) { console.error("select-suites --packs: the file list (git ls-files) could not be read"); process.exit(2); }
  const via = new Map(), todo = [];
  // Files under prototype/ (pick()'s own scope) and official-sources/ (acceptance/lib/pack2.ts reads the IRCC manifest);
  // records, product/tools/ and workflows are read by no pack.
  // Data files count too (Devin on #1337: C4.5 reads prototype/expected/source-text/*.txt); images and PDFs under
  // prototype/ are seeded as well, and simply reach nothing when no file reads them.
  const seedable = (f) => f.startsWith(`${PR}/`) || (f.startsWith(`${P}/official-sources/`) && !DOCS.test(f));
  let tf = null;   // the code files under acceptance/ and tests/, listed once
  const testFiles = () => tf ??= (() => { try { return execSync(`git ls-files -c -- "${S}/acceptance" "${S}/tests" "${PR}/tests"`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter((x) => x && CODE.test(x)); } catch { return []; } })();
  const testFile = (x) => x.startsWith(`${S}/acceptance/`) || x.startsWith(`${S}/tests/`) || x.startsWith(`${PR}/tests/`);
  // A data file's folder is read by a pack or test whose code (comments stripped) names its last two folders, each as a
  // quoted string of its own (join(…, "expected", "source-text", …)). Folder names inside longer paths, in run lines or
  // import paths ("studio/tools/isolated.sh", "./lib/m3.ts", "tests/fixtures/x.json"), are no read (review round 4).
  // Markdown never takes this rule: a note is read only by its file name, as before.
  const folderReaders = (f) => { if (/\.md$/i.test(f)) return [];
    const c = basename(dirname(f)), b = basename(dirname(dirname(f))), q = (w) => new RegExp(`["'\`]${esc(w)}["'\`]`);
    return testFiles().filter((x) => { const t = stripComments(read(x)); return q(c).test(t) && q(b).test(t); }); };
  for (const f of changed) if (seedable(f) && !via.has(f)) { via.set(f, null); todo.push(f); }
  const chain = (x) => { const c = []; for (let y = x; y; y = via.get(y)) c.push(basename(y)); return c.reverse().join(" ← "); };
  const stop = (x) => RUNNERS.has(x) || x === MAIN || suites.get(basename(x)) === x;
  const appCode = (x) => (x.startsWith(`${S}/api/src/`) && CODE.test(x)) || x.startsWith(`${S}/web/`);
  // (4a, P-446, 10 Nov): the gates and every other checkpoint step reach the app only when a pack loads the configured
  // checkpoint (POST /demo/load {sample: "configured"} runs api/src/features/checkpoint/*; "six" runs none of them), a
  // read over HTTP that the import edges below never see (#1450 broke C6.19's pack after approval). Such a file, changed
  // (a step, checkpoint*.ts, demo.ts, a gate file or the gate code), seeds every pack, test or helper whose code (comments
  // stripped) loads the configured checkpoint; the walk then adds the packs importing such a helper (lib/declared.ts).
  // Its chain says "(configured checkpoint, changed)", and gate-b.mjs then adds the rows scored on the checkpoint too.
  // A step or checkpoint*.ts reached on the walk seeds the same packs ("(configured checkpoint)", no rows) only from a
  // changed data file (samples/routes.json ← routes-data.ts ← 115-routes.ts) or by a file-name edge: never from changed
  // code through imports (the steps import the hubs core.ts, studio.ts, forms.ts, runtime.ts, features.ts, so nearly any
  // API change would fire: review of #1504 round 2), never demo.ts on the walk, never past a folder edge (the graph's
  // guess: sources.ts names studio/tools, which would pull any-baseline.json).
  const CHECKPOINT = new RegExp(`^${esc(S)}/(api/src/features/checkpoint/|api/src/demo\\.ts$|api/src/checkpoint[^/]*\\.ts$|samples/form-field-gates\\.json$|api/src/(features/)?form-field-(gates|condition)\\.ts$|engine/form-field-condition\\.ts$)`);
  const LOADS = /sample\s*:\s*["'`]configured["'`]/;
  let cpSeeded = false; const loose = new Set();   // reached through a folder edge on its chain (the graph's guess): never fires
  const DEMO = `${S}/api/src/demo.ts`, rootOf = (y) => { while (via.get(y)) y = via.get(y); return y; };
  const checkpointSeed = (y, walked) => {
    if (cpSeeded === "changed" || (cpSeeded && walked) || !CHECKPOINT.test(y) || (walked && y === DEMO)) return;
    cpSeeded = walked ? "walk" : "changed";
    const tag = `${y} (configured checkpoint${walked ? "" : ", changed"})`; via.set(tag, via.get(y));
    for (const x of testFiles()) if (!via.has(x) && LOADS.test(stripComments(read(x)))) { via.set(x, tag); if (!stop(x)) todo.push(x); }
  };
  for (const f of changed) if (via.has(f)) checkpointSeed(f);
  // A deleted file: the files that still name it (by file name, or by its stem in an import path) use it.
  // An import path that ends in its stem is an import edge (so a deleted API or web module is still followed; review m1).
  const named = (f) => { const b = basename(f), stem = b.replace(/\.[^.]+$/, ""), imp = new RegExp(`/${esc(stem)}(?:\\.(?:js|ts|tsx|cjs|mjs))?["']`), nm = new RegExp(`(?<![A-Za-z0-9_.-])${esc(b)}(?![A-Za-z0-9_-])`);
    let files = []; try { files = execSync(`git ls-files -c -- "${PR}"`, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20 }).split("\n").filter((x) => x && CODE.test(x)); } catch { return new Map(); }
    return new Map(files.map((x) => [x, imp.test(read(x)) ? "import" : nm.test(read(x)) ? "name" : null]).filter(([, how]) => how)); };
  while (todo.length) {
    const y = todo.shift();
    // --assume-deleted (its own check only): the seeds read as deleted, without touching the tree.
    const gone = !existsSync(join(ROOT, y)) || (process.argv.includes("--assume-deleted") && via.get(y) === null);
    const users = gone ? named(y) : usersOf(y);
    if (via.get(y) === null && !CODE.test(y)) for (const x of folderReaders(y)) if (!users.has(x)) users.set(x, "folder");
    for (const [x, how] of users) {
      if (via.has(x) || (RUNNERS.has(x) && how === "folder")) continue;
      // Through API and web code only by imports: a file that names an endpoint's module or lists its folder is no read.
      // ... except a pack or test that reads the app file as text (Devin on #1337: C2.12 and C11.1 read App.tsx's routes).
      if (appCode(y) && how !== "import" && !testFile(x)) continue;
      via.set(x, y);
      if (how === "folder" || loose.has(y)) loose.add(x); else if (how === "name" || !CODE.test(rootOf(y))) checkpointSeed(x, true);
      if (!stop(x)) todo.push(x);
    }
  }
  for (const x of via.keys()) if (x.startsWith(`${S}/acceptance/`) || x.startsWith(`${S}/tests/`)) console.log(`${x}\t${chain(x)}`);
  // B178 (#1567): never process.exit() after printing. On POSIX Node writes stdout to a pipe asynchronously, so exit can
  // drop the tail on a slow reader (gate B lost C7.5.test.ts, line 421 of 447). Set the code and let the output drain.
  process.exitCode = 0;
} else {
const why = new Map(), alls = [], browserWhy = [];
const add = (n, r) => { if (!why.has(n)) why.set(n, []); if (!why.get(n).includes(r)) why.get(n).push(r); };
for (const f of changed) {
  const p = pick(f);
  if (DIRECT && (p.all || p.browser)) {
    // --direct: what would run everything runs only the suites that import this file (through test helpers) or name it.
    if (existsSync(join(ROOT, f))) for (const n of suitesImporting([f])) if (suites.get(n) !== f) add(n, `imports ${basename(f)} (direct)`);
    for (const [n, r] of p.picks ?? []) add(n, r);
    if (!DOCS.test(f)) { const name = basename(f), named = new RegExp(`(?<![A-Za-z0-9_.-])${esc(name)}(?![A-Za-z0-9_-])`);
      for (const [n, t] of text) if (suites.get(n) !== f && named.test(t)) add(n, `names ${name}`); }
    continue;
  }
  if (p.all) alls.push(p.all);
  if (p.browser) browserWhy.push(p.browser);
  for (const [n, r] of p.picks ?? []) add(n, r);
  if (DOCS.test(f)) {
    // A record a suite reads as data (check_stand_ins.ts reads product/STAND-INS.md): named in the suite's code, not
    // only in a comment, it chooses that suite (I1 review). Other docs choose nothing.
    // The name must be a quoted string in the code and its folder's name must appear there too (README.md, notes.md).
    if (/\.md$/i.test(f)) { const named = new RegExp(`["'\`/]${esc(basename(f))}["'\`]`), dir = new RegExp(`["'\`/]${esc(basename(dirname(f)))}["'\`/]`);
      for (const [n] of text) { const c = codeText(n); if (named.test(c) && dir.test(c)) add(n, `reads ${basename(dirname(f))}/${basename(f)}`); } }
    continue;
  }
  // A suite that reads a source file as text names it; one that reads a whole folder reads every file in it.
  const name = basename(f), named = new RegExp(`(?<![A-Za-z0-9_.-])${esc(name)}(?![A-Za-z0-9_-])`);
  for (const [n, t] of text) if (suites.get(n) !== f && named.test(t)) add(n, `names ${name}`);
  if (f.startsWith(`${S}/api/src/`)) for (const n of apiScanners) add(n, "reads every file in api/src");
  if (f.startsWith(`${S}/web/src/`)) for (const n of webScanners) add(n, "reads every file in web/src");
}
if (alls.length) console.log(`ALL\t${alls[0]}${alls.length > 1 ? ` (+${alls.length - 1} more)` : ""}`);   // B178: no exit
else {
if (browserWhy.length) for (const n of browser) add(n, `every browser suite: ${browserWhy[0]}${browserWhy.length > 1 ? ` (+${browserWhy.length - 1} more)` : ""}`);
if (RUNTIME_GROUP.some((n) => why.has(n))) for (const n of RUNTIME_GROUP) if (!why.has(n) && suites.has(n)) add(n, "runtime R1 suites run together (one copy, in order)");
for (const n of SMOKE) if (suites.has(n)) add(n, "smoke");
for (const n of suites.keys()) if (why.has(n)) {
  const r = why.get(n); console.log(`${n}\t${r.slice(0, 2).join("; ")}${r.length > 2 ? ` (+${r.length - 2} more)` : ""}`);
}
}   // else: not ALL (B178)
}   // else: not --packs (B178)
