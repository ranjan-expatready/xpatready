// Traceability and dependency graph (P-86): decision → capability → page → API route → code module → test, built from the
// repository itself on every run, never written by hand, so drift shows up as a gap instead of being missed.
//   node product/tools/graph.mjs            print the gaps and write product/qa/graph.json (gitignored)
//   node product/tools/graph.mjs --write    also rewrite product/qa/GRAPH.md (the qa lane's committed summary)
//   node product/tools/graph.mjs --check    exit 1 on a hard gap (a page calling an API route that does
//                                           not exist, a capability citing a decision that does not exist)
// Sources: DECISIONS.md, qa/CAPABILITIES.md, the studio's web pages (App.tsx routes, api(...) calls, imports), its API
// controllers (@Get/@Post...), its code imports (TypeScript parser) and its tests (call(...), fetch, goto, C-ids cited).
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { execSync } from "node:child_process";

const ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const P = join(ROOT, "ai-workers/problem-1-pathway-setup-and-form-filling");
const PH = join(P, "product"), STUDIO = join(P, "prototype/studio");
const ts = (await import(join(STUDIO, "node_modules/typescript/lib/typescript.js"))).default;
const rel = (f) => relative(STUDIO, f);
const walk = (d) => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => { const p = join(d, n); return n === "node_modules" ? [] : statSync(p).isDirectory() ? walk(p) : [p]; });
const code = (d) => walk(join(STUDIO, d)).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"));
const norm = (p) => p.replace(/\$\{[^}]*\}/g, ":p").replace(/\?.*$/, "").replace(/\/+$/, "") || "/";
const seg = (p) => norm(p).split("/").filter(Boolean);
const matches = (route, call) => { const a = seg(route), b = seg(call); return a.length === b.length && a.every((s, i) => s.startsWith(":") || b[i].startsWith(":") || s === b[i]); };

// Decisions and capabilities (the files the Lead and the qa lane keep).
const decisions = ["DECISIONS.md", "decisions/P-01-P-36-foundation.md", "decisions/P-37-P-42-journey.md", "decisions/P-43-P-47-journey-v3.md", "decisions/P-48-P-53-21-oct.md", "decisions/P-54-P-58-22-oct.md", "decisions/P-60-P-61-23-oct.md", "decisions/P-62-P-69-23-oct.md", "decisions/P-70-P-73-23-oct.md", "decisions/P-74-P-78.md", "decisions/P-79-P-83.md", "decisions/P-84-P-85.md", "decisions/P-86.md", "decisions/P-87-P-88.md", "decisions/P-92-P-95.md", "decisions/P-96-P-97.md"].flatMap((f) => [...readFileSync(join(PH, f), "utf8").matchAll(/^\| ~*(P-\d+[^|]*)\|/gm)].flatMap((m) => m[1].match(/P-\d+/g)));
const capabilities = readFileSync(join(PH, "qa/CAPABILITIES.md"), "utf8").split("\n").filter((l) => /^\| C\d+\.\d+ /.test(l)).map((l) => {
  const c = l.split("|").map((x) => x.trim());
  return { id: c[1], step: c[2], text: c[3], milestone: c[4], status: c[5], decisions: [...new Set(c[3].match(/P-\d+/g) ?? [])] };
});

// API routes from the controllers.
const routes = [];
for (const f of code("api/src")) {
  // A file may hold several controllers: each route takes the prefix of the nearest @Controller above it.
  const src = readFileSync(f, "utf8"); const ctl = [...src.matchAll(/@Controller\("([^"]*)"\)/g)].map((m) => [m.index, m[1].replace(/^api\/?/, "")]);
  for (const m of src.matchAll(/@(Get|Post|Put|Patch|Delete)\("([^"]*)"\)/g)) {
    const base = (ctl.filter(([i]) => i < m.index).pop() ?? [0, ""])[1];
    routes.push({ method: m[1].toUpperCase(), path: "/" + [base, m[2]].filter(Boolean).join("/"), file: rel(f) });
  }
}
const findRoute = (method, path) => routes.find((r) => r.method === method && matches(r.path, path));

// Code imports (TypeScript parser: comments and strings are not imports).
const modules = [...code("api/src"), ...code("engine"), ...code("contracts"), ...code("web/src")];
const imports = new Map();
for (const f of modules) {
  const info = ts.preProcessFile(readFileSync(f, "utf8"), true, true);
  imports.set(rel(f), info.importedFiles.map((i) => i.fileName).filter((n) => n.startsWith(".") || n.startsWith("@/")).map((n) => {
    const b = (n.startsWith("@/") ? join(STUDIO, "web/src", n.slice(2)) : resolve(dirname(f), n)).replace(/\.js$/, ""); return [b + ".ts", b + ".tsx", join(b, "index.ts"), join(b, "index.tsx"), b].find(existsSync);
  }).filter(Boolean).map(rel));
}
const importedBy = new Map(); for (const [f, l] of imports) for (const t of l) importedBy.set(t, [...(importedBy.get(t) ?? []), f]);
const reach = (f, seen = new Set()) => { if (seen.has(f)) return seen; seen.add(f); for (const t of imports.get(f) ?? []) reach(t, seen); return seen; };

// Web pages: App.tsx routes → page component file → every API call reachable through its imports.
const app = readFileSync(join(STUDIO, "web/src/App.tsx"), "utf8");
const compFile = {}; for (const m of app.matchAll(/import\s+(?:\{([^}]*)\}|(\w+))\s+from\s+"((?:\.|@\/)[^"]+)"/g)) for (const n of (m[1] ?? m[2]).split(",").map((s) => s.trim().split(" as ").pop()).filter(Boolean)) compFile[n] = m[3].replace(/^@\//, "./");
// The method is a literal, or chosen at run time ("b.on ? \"POST\" : \"DELETE\""): every method named counts.
const methodsOf = (init) => { const m = (init ?? "").match(/method:\s*([^,}]*)/); return m ? [...m[1].matchAll(/"(GET|POST|PUT|PATCH|DELETE)"/gi)].map((x) => x[1].toUpperCase()) : ["GET"]; };
const webCalls = (f) => [...readFileSync(join(STUDIO, f), "utf8").matchAll(/\bapi(?:<[^>]*>)?\(\s*(["`])([^"`]+)\1\s*(?:,\s*\{([^}]{0,200}))?/g)].flatMap((m) => methodsOf(m[3]).map((method) => ({ method, path: m[2], file: f })));
// File level: a page file that holds several pages (library.tsx) counts its calls for each of them.
const pages = [...app.matchAll(/<Route path="([^"*]+)" element=\{<(\w+)/g)].filter((m) => compFile[m[2]]).map((m) => {
  const file = rel([resolve(STUDIO, "web/src", compFile[m[2]]) + ".tsx", resolve(STUDIO, "web/src", compFile[m[2]]) + ".ts"].find(existsSync) ?? "");
  const calls = [...reach(file)].filter((f) => f.startsWith("web/")).flatMap(webCalls);
  return { path: m[1], component: m[2], file, calls };
});
const allWebCalls = code("web/src").map(rel).flatMap(webCalls);

// Tests: API calls, browser visits and capability ids they cite.
const tests = walk(join(STUDIO, "tests")).filter((f) => /check_[^/]*\.(ts|cjs)$/.test(f)).map((f) => {
  const src = readFileSync(f, "utf8");
  return { file: rel(f),
    calls: [...src.matchAll(/\bcall\(\s*"(\w+)",\s*[`"]([^`"]+)/g)].map((m) => ({ method: m[1], path: m[2] })),
    visits: [...src.matchAll(/goto\(\s*`\$\{\w+\}([^`]*)`/g)].map((m) => norm(m[1])).concat(/goto\(\s*\w+\s*\)/.test(src) ? ["/"] : []),
    caps: [...new Set(src.match(/\bC\d+\.\d+\b/g) ?? [])] };
});
const visited = new Set(tests.flatMap((t) => t.visits));
const pageVisited = (pg) => [...visited].some((v) => matches(pg.path.replace("*", ""), v));
for (const r of routes) {
  r.testedBy = tests.filter((t) => t.calls.some((c) => c.method === r.method && matches(r.path, c.path))).map((t) => t.file);
  r.pages = pages.filter((pg) => pg.calls.some((c) => c.method === r.method && matches(r.path, c.path))).map((pg) => pg.path);
  r.viaBrowser = r.pages.some((p) => pageVisited(pages.find((pg) => pg.path === p)));
  r.webUse = allWebCalls.some((c) => c.method === r.method && matches(r.path, c.path));
}
for (const c of capabilities) c.tests = tests.filter((t) => t.caps.includes(c.id)).map((t) => t.file);

// Gaps. Hard ones fail --check; the rest are findings for the Lead and the qa lane to explain or close.
const gaps = {
  "G1 web calls an API route that does not exist (hard)": allWebCalls.filter((c) => !findRoute(c.method, c.path)).map((c) => `${c.method} ${norm(c.path)} — ${c.file}`),
  "G2 capability cites a decision that does not exist (hard)": capabilities.flatMap((c) => c.decisions.filter((d) => !decisions.includes(d)).map((d) => `${c.id} cites ${d}`)),
  "G3 API route no test reaches (no API call, no browser-visited page uses it)": routes.filter((r) => !r.testedBy.length && !r.viaBrowser).map((r) => `${r.method} ${r.path} — ${r.file}${r.webUse ? "" : " (no page uses it either)"}`),
  "G4 page no browser test visits": pages.filter((pg) => !pageVisited(pg)).map((pg) => `${pg.path} (${pg.component})`),
  "G5 capability marked Works that no test names (evidence is qa notes only)": capabilities.filter((c) => /^Works/.test(c.status) && !c.tests.length).map((c) => `${c.id} ${c.text.slice(0, 70)}`),
  "G6 module nothing imports (dead-code candidate)": [...imports.keys()].filter((f) => !importedBy.has(f) && !/(^|\/)(main\.tsx?|App\.tsx|env\.d\.ts)$/.test(f) && !tests.some((t) => readFileSync(join(STUDIO, t.file), "utf8").includes(f.replace(/\.tsx?$/, "").split("/").pop()))).map((f) => f),
};
const hard = gaps["G1 web calls an API route that does not exist (hard)"].length + gaps["G2 capability cites a decision that does not exist (hard)"].length;

// Report.
const cnt = (s) => capabilities.filter((c) => c.status.startsWith(s)).length;
const md = [
  "# Graph — decisions, capabilities, pages, API, code and tests (generated)", "",
  `Generated by \`product/tools/graph.mjs\` (P-86) from commit ${execSync("git rev-parse --short HEAD").toString().trim()}. Do not edit by hand: change the sources and run it again. Full graph: \`qa/graph.json\`.`, "",
  `**Size:** ${decisions.length} decisions · ${capabilities.length} capabilities (${cnt("Works")} Works, ${cnt("Partial")} Partial, ${cnt("Not built")} Not built) · ${pages.length} pages · ${routes.length} API routes · ${modules.length} code modules · ${tests.length} test suites.`, "",
  "## Gaps", "",
  ...Object.entries(gaps).flatMap(([k, v]) => [`### ${k}: ${v.length}`, ...v.slice(0, 7).map((x) => `- ${x}`), ...(v.length > 7 ? [`- … ${v.length - 7} more in qa/graph.json`] : []), ""]),
  "## Pages → API routes they call", "", "| Page | Component | API routes | Visited by a browser test |", "|---|---|---|---|",
  ...pages.map((pg) => `| \`${pg.path}\` | ${pg.component} | ${[...new Set(pg.calls.map((c) => `${c.method} ${norm(c.path)}`))].length} | ${pageVisited(pg) ? "yes" : "**no**"} |`), "",
  "## Capabilities → tests that name them", "",
  `Named by a test: ${capabilities.filter((c) => c.tests.length).map((c) => `${c.id} (${c.tests.length})`).join(", ") || "none"}.`, "",
  `Built (Works or Partial) but named by no test: ${capabilities.filter((c) => /^(Works|Partial)/.test(c.status) && !c.tests.length).map((c) => c.id).join(", ") || "none"}.`, "",
  "Tests name a capability by its id (for example `C1.6`) in a check's label; that is how a claim becomes machine-checked. Per-capability detail: `qa/graph.json`.",
].join("\n");
if (process.argv.includes("--write")) writeFileSync(join(PH, "qa/GRAPH.md"), md + "\n");
writeFileSync(join(PH, "qa/graph.json"), JSON.stringify({ decisions, capabilities, pages, routes, imports: Object.fromEntries(imports), tests, gaps }, null, 1) + "\n");
console.log(Object.entries(gaps).map(([k, v]) => `${k.split(" ")[0]} ${v.length}`).join(" · ") + " — details: product/qa/graph.json" + (process.argv.includes("--write") ? ", product/qa/GRAPH.md" : ""));
for (const [k, v] of Object.entries(gaps)) if (k.includes("(hard)")) for (const x of v) console.log(`${k.split(" ")[0]}: ${x}`);
if (process.argv.includes("--check") && hard) { console.log(`graph: ${hard} hard gap(s) — see G1/G2 in product/qa/GRAPH.md`); process.exit(1); }
