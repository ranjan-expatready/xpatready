#!/usr/bin/env node
// Picks the studio suites a change can affect (test-speed plan, founder 31 Oct: each pull request checks only the suites
// its files can affect; the full set runs nightly on main). Used by run-suites.sh --changed <base>..<head>:
//   git diff --name-only <base>...<head> | node product/tools/select-suites.mjs
// Prints one line per chosen suite, "<suite>\t<reason>", or a first line "ALL\t<reason>" when everything must run.
// The simple form of predictive test selection, kept conservative: when in doubt, everything runs.
//   * shared files run everything: prisma/, contracts/, engine/, api/src/main.ts, package files, tools/, tests/ files that
//     are not check_*, prototype/p1, p2, p5, .github/, run-suites.sh (and this file), and any code file no rule covers;
//   * a changed check_* file runs itself (the three runtime R1 suites run together: they share one copy, in order);
//   * a web page or component: the routes it serves (App.tsx's router, through whatever imports it) and its own names,
//     looked up in the browser suites; no match, or a file the shell itself uses, runs every browser suite;
//   * an API module (api/src/<x>.ts): the endpoint paths of the module and of every module that imports it (in main.ts,
//     only the controllers that use it), looked up in the suites, plus the suites that import it; no match runs everything;
//     a web file that calls one of those endpoints adds its own browser suites (the web rule above);
//   * any changed file: the suites whose text names it (file name with extension: suites that read a source as text);
//   * a file under api/src or web/src: the suites that read every file of that folder (a readdirSync over it);
//   * always a fixed smoke set of fast suites along the main journey (structure, programs, start setup, the
//     combination workspace in a browser, engine, cases).
// Docs and images (.md, .txt, .png, .jpg, .gif, .webp, .svg, .pdf) and records outside prototype/ choose nothing, except
// (I1, 3 Nov) the .md files the app or a suite reads as data: the AI prompts (prototype/**/prompts/*.md), api/src/**/*.md
// (the features guide) and test fixtures; and official-sources/ (the app reads its manifests and PDFs at start): all.
// Of product/tools/ only the files that decide how the suites run choose everything (run-suites.sh, this file,
// cloud-setup.sh, lane.sh, change-kind.sh, ci-memory.mjs); of .github/ only workflows/ci.yml. Others (guards, reports) choose nothing.
// --direct (I1, a PR check that leaves the full set to the merge queue, P-291 (3)): never ALL and never "every browser
// suite"; a file that would choose everything chooses the suites that import it (through test helpers) or name it.
// Reads files only: no server, no database, no model call (US$0).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, normalize, relative } from "node:path";
import { execSync } from "node:child_process";

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const P = "ai-workers/problem-1-pathway-setup-and-form-filling", PR = `${P}/prototype`, S = `${PR}/studio`;
const SKIP = new Set(["check_catalogue_scale.cjs"]);   // as in run-suites.sh: not a regression suite
const SMOKE = ["check_engine.ts", "check_case_engine.ts", "check_w1_structure.ts", "check_screen01_api.ts", "check_w1_start_setup.ts", "check_dv_backbone_browser.cjs"];
const RUNTIME_GROUP = ["check_runtime_r1c.cjs", "check_runtime_r1d.ts", "check_runtime_r1a.ts"];
const DOCS0 = /\.(md|txt|png|jpe?g|gif|webp|svg|pdf)$/i;
const DATA_MD = new RegExp(`^${P}/prototype/(.*/)?prompts/|^${P}/prototype/studio/(api/src|tests/fixtures)/`);
const DOCS = { test: (f) => DOCS0.test(f) && !DATA_MD.test(f) && !f.startsWith(`${P}/official-sources/`) || /^ai-workers\/[^/]+\/official-sources\/.*\.md$/i.test(f) };
const SUITE_TOOLS = /\/product\/tools\/(run-suites\.sh|select-suites\.mjs|cloud-setup\.sh|lane\.sh|change-kind\.sh|ci-memory\.mjs)$/;
const DIRECT = process.argv.includes("--direct");

const read = (f) => { try { return readFileSync(join(ROOT, f), "utf8"); } catch { return ""; } };
const ls = (d, re) => existsSync(join(ROOT, d)) ? readdirSync(join(ROOT, d)).filter((n) => re.test(n)).map((n) => `${d}/${n}`) : [];
const walk = (d) => !existsSync(join(ROOT, d)) ? [] : readdirSync(join(ROOT, d)).flatMap((n) => {
  const p = `${d}/${n}`; return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// Relative imports and requires of a file, resolved to repository paths ("@/x" is web/src/x).
function importsOf(f) {
  const out = new Set(), src = read(f);
  for (const m of src.matchAll(/(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g)) {
    let spec = m[1], base;
    if (spec.startsWith("@/")) base = `${S}/web/src/${spec.slice(2)}`;
    else if (spec.startsWith(".")) base = normalize(join(dirname(f), spec));
    else continue;
    for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.cjs`, `${base}.mjs`, `${base}/index.tsx`, `${base}/index.ts`]) {
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
  if (!rel.startsWith("src/") || /^src\/(App\.tsx|main\.tsx|env\.d\.ts|lib\/|styles\/)/.test(rel) || !/\.(tsx?)$/.test(rel)) return { browser: `${rel}: shared by every page` };
  const reach = importers(f, webFiles, new Set([APP]));
  const names = new Set(), shell = [];
  for (const x of reach) for (const n of appImports.get(x) ?? []) (appRoutes.some((r) => r.el === n) ? names.add(n) : shell.push(n));
  if (shell.length) return { browser: `${rel}: used by the shell around every page (${shell.slice(0, 3).join(", ")})` };
  const routes = appRoutes.filter((r) => names.has(r.el)).map((r) => r.path);
  const pats = routes.map((r) => [r, pathPattern(r)]).filter(([, p]) => p);
  // A route too general to look up ("/", the Immigration programs home) cannot be matched to suites: every browser suite.
  const general = routes.find((r) => !pathPattern(r));
  const own = exportedNames(f);
  const out = new Map();
  for (const n of browser) {
    const t = text.get(n);
    // A page address follows the server's address or opens a string (`${BASE}/structure`, "/review"); never /api/...
    const r = pats.find(([, p]) => new RegExp(`(?<=[}"'\`0-9])/${p}`).test(t));
    const c = own.find((x) => new RegExp(`\\b${x}\\b`).test(t));
    if (r) out.set(n, `${rel} serves ${r[0]}`); else if (c) out.set(n, `${rel}: names ${c}`);
  }
  if (general) return { browser: `${rel} serves ${general}, too general to look up`, picks: out };
  if (!out.size) return { browser: `${rel}: ${routes.length ? `no browser suite opens ${routes.join(", ")}` : "no route found"}` };
  return { picks: out };
}

// ---- api: endpoints of a module and of what imports it
const apiFiles = ls(`${S}/api/src`, /\.ts$/), MAIN = `${S}/api/src/main.ts`;
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
function apiPick(f) {
  const rel = f.slice(`${S}/`.length);
  if (!existsSync(join(ROOT, f))) return { all: `${rel}: removed or renamed` };
  const reach = importers(f, apiFiles, new Set([MAIN]));
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
    const ctrls = body.split(/(?=@Controller\()/), outside = ctrls[0] + ctrls.slice(1).map((c) => c.replace(/^@Controller[\s\S]*?\n\}\n/, "")).join("");
    const n0 = usedOf(own)(outside);
    if (n0) return { all: `${rel}: main.ts uses ${n0} outside its controllers` };
    for (const c of ctrls.slice(1)) {
      const block = c.match(/^@Controller[\s\S]*?\n\}\n/)?.[0] ?? c;
      if (used(block)) for (const e of endpoints(block)) eps.add(e);
    }
  }
  const pats = [...eps].map((e) => [e, pathPattern(e)]).filter(([, p]) => p);
  const out = new Map();
  for (const [n, t] of text) {
    const e = pats.find(([, p]) => new RegExp(`/${p}`).test(t));
    if (e) out.set(n, `${rel}: calls /${e[0]}`);
  }
  for (const n of suitesImporting([...reach].filter((x) => x !== MAIN))) if (!out.has(n)) out.set(n, `${rel}: imported by the suite`);
  // The pages that call these endpoints: their browser suites too (a double-click guard is tested through the page).
  let browserWhy;
  for (const w of webFiles) {
    const e = pats.find(([, p]) => new RegExp(`/${p}`).test(read(w)));
    if (!e) continue;
    const wp = webPick(w), wrel = w.slice(`${S}/`.length);
    if (wp.browser && !browserWhy) browserWhy = `${rel}: /${e[0]} is called by ${wrel} (${wp.browser})`;
    for (const [n] of wp.picks ?? []) if (!out.has(n)) out.set(n, `${rel}: /${e[0]} is called by ${wrel}`);
  }
  if (!out.size && !browserWhy) return { all: `${rel}: no suite calls its ${eps.size} endpoint(s) or imports it` };
  return { picks: out, browser: browserWhy };
}

// ---- one changed file
function pick(f) {
  if (DOCS.test(f)) return {};
  if (f === ".github/workflows/ci.yml" || f === ".nvmrc" || /(^|\/)package(-lock)?\.json$/.test(f)) return { all: `${f}: shared` };
  if (/^\.github\//.test(f)) return {};   // other workflows (nightly, demo) do not change a pull request's check
  if (f.startsWith(`${P}/product/tools/`)) return SUITE_TOOLS.test(f) ? { all: `${f.slice(P.length + 1)}: decides how the suites run` } : {};
  if (f.startsWith(`${P}/official-sources/`)) return { all: `${f.slice(P.length + 1)}: official sources (the app reads them)` };
  if (!f.startsWith(`${PR}/`)) return {};   // records, boards, official sources: the fast checks cover them
  const r = f.slice(PR.length + 1);
  if (/^(p1|p2|p5|contracts|env)\//.test(r)) return { all: `prototype/${r.split("/")[0]}/ (shared)` };
  if (r.startsWith("tests/")) {
    const n = basename(r);
    if (/^check_/.test(n)) return suites.has(n) && suites.get(n) === f ? { picks: new Map([[n, "changed"]]) } : {};
    return { all: `prototype/${r}: a test helper (shared)` };
  }
  if (!r.startsWith("studio/")) return { all: `prototype/${r}: no rule covers it` };
  const s = r.slice("studio/".length);
  if (/^(prisma\/|contracts\/|engine\/|tools\/|api\/src\/main\.ts$|api\/tsconfig\.json$|prisma\.config\.ts$|start\.sh$|stop\.sh$)/.test(s)) return { all: `${s}: shared` };
  if (s.startsWith("tests/")) {
    const n = basename(s);
    if (/^check_/.test(n)) return suites.has(n) && suites.get(n) === f ? { picks: new Map([[n, "changed"]]) } : {};
    return { all: `${s}: a test helper, not check_* (shared)` };
  }
  if (/^api\/src\/[^/]+\.ts$/.test(s)) return apiPick(f);
  if (s.startsWith("web/")) return webPick(f);
  return { all: `${s}: no rule covers it` };
}

const changed = readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
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
if (alls.length) { console.log(`ALL\t${alls[0]}${alls.length > 1 ? ` (+${alls.length - 1} more)` : ""}`); process.exit(0); }
if (browserWhy.length) for (const n of browser) add(n, `every browser suite: ${browserWhy[0]}${browserWhy.length > 1 ? ` (+${browserWhy.length - 1} more)` : ""}`);
if (RUNTIME_GROUP.some((n) => why.has(n))) for (const n of RUNTIME_GROUP) if (!why.has(n) && suites.has(n)) add(n, "runtime R1 suites run together (one copy, in order)");
for (const n of SMOKE) if (suites.has(n)) add(n, "smoke");
for (const n of suites.keys()) if (why.has(n)) {
  const r = why.get(n); console.log(`${n}\t${r.slice(0, 2).join("; ")}${r.length > 2 ? ` (+${r.length - 2} more)` : ""}`);
}
