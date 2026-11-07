// B121 (P-376 (7)): one fast seam check per contract (contracts/*.ts), without a server or a browser (US$0). A contract
// is a shape the API, the engine and the web app share, so for each one:
//   L  it loads on its own and every value it exports is defined (an import cycle between contracts shows here first);
//   P  it takes values only from zod and other contracts: type-only imports are free, but no server, engine or Node code
//      (the web app bundles every contract) and no file, network or environment access;
//   N  every name a consumer imports from it (api/src, engine, web/src, tests, tools, acceptance) is one it exports.
// A changed contract chooses this check (select-suites.mjs); the suites that use the contract still run too: this check
// finds a broken seam in seconds, it does not replace them. The rules' failing cases run first, on made-up files.
//   tsx studio/tests/check_contract_seams.ts
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${String(detail).slice(0, 400)}` : ""}`); };
const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

type Imp = { spec: string; names: string[]; typeOnly: boolean; star: boolean };
// The import statements of a file: what it takes, from where, and whether only as types.
function importsIn(src: string): Imp[] {
  const out: Imp[] = [];
  for (const m of code(src).matchAll(/(?:^|\n)\s*(import|export)\s+(type\s+)?([^;"'`]*?)\s+from\s+["']([^"']+)["']/g)) {
    const [, kw, ty, clause, spec] = m;
    if (kw === "export" && !/^\{|^\*/.test(clause.trim())) continue;   // "export const x = ... from" is not a re-export
    const star = /^\*/.test(clause.trim()) && !/\bas\b/.test(clause);
    const names: string[] = []; let allTypes = !!ty;
    const brace = clause.match(/\{([\s\S]*)\}/);
    if (brace) {
      const items = brace[1].split(",").map((s) => s.trim()).filter(Boolean);
      allTypes = allTypes || items.every((i) => /^type\s/.test(i));
      for (const i of items) names.push(i.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim());
    }
    const def = clause.replace(/\{[\s\S]*\}/, "").replace(/\*\s+as\s+\w+/, "").split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z_$][\w$]*$/.test(s) && s !== "type");
    if (kw === "import" && def.length) { names.push("default"); allTypes = !!ty; }
    if (/\*\s+as\s+\w+/.test(clause)) allTypes = !!ty;
    out.push({ spec, names, typeOnly: allTypes && !star, star });
  }
  // Side-effect imports and dynamic imports are values.
  for (const m of code(src).matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) out.push({ spec: m[1] ?? m[2], names: [], typeOnly: false, star: false });
  return out;
}
// The names a contract exports (values and types), following "export * from" between contracts.
function exportsOf(file: string, seen = new Set<string>()): { values: Set<string>; all: Set<string> } {
  const values = new Set<string>(), all = new Set<string>();
  if (seen.has(file)) return { values, all }; seen.add(file);
  const src = code(readFileSync(file, "utf8"));
  for (const m of src.matchAll(/\bexport\s+(?:declare\s+)?(?:async\s+)?(function\*?|const|let|var|class|enum|type|interface|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g)) {
    all.add(m[2]); if (!/^(type|interface)$/.test(m[1])) values.add(m[2]);
  }
  // "export const A = 1, B = 2": the later names of one declaration (commas outside brackets and strings).
  for (const m of src.matchAll(/\bexport\s+(?:const|let|var)\s+([^\n]*)/g)) {
    let depth = 0, q = "", seg = "";
    const segs: string[] = [];
    for (const ch of m[1]) {
      if (q) { if (ch === q) q = ""; seg += ch; continue; }
      if (ch === '"' || ch === "'" || ch === "`") { q = ch; seg += ch; continue; }
      if ("([{<".includes(ch)) depth++; else if (")]}".includes(ch) || (ch === ">" && !seg.endsWith("="))) depth--;
      if (ch === "," && depth === 0) { segs.push(seg); seg = ""; continue; }
      if (ch === ";" && depth === 0) break;
      seg += ch;
    }
    segs.push(seg);
    for (const sg of segs.slice(1)) { const n = sg.match(/^\s*([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=/)?.[1]; if (n) { all.add(n); values.add(n); } }
  }
  if (/\bexport\s+default\b/.test(src)) { all.add("default"); values.add("default"); }
  for (const m of src.matchAll(/\bexport\s+(type\s+)?\{([^}]*)\}(\s+from\s+["']([^"']+)["'])?/g)) {
    for (const i of m[2].split(",").map((s) => s.trim()).filter(Boolean)) {
      const name = i.replace(/^type\s+/, "").split(/\s+as\s+/).pop()!.trim();
      all.add(name); if (!m[1] && !/^type\s/.test(i)) values.add(name);
    }
  }
  for (const m of src.matchAll(/\bexport\s+\*\s+from\s+["']([^"']+)["']/g)) {
    const t = resolveSpec(file, m[1]); if (t) { const e = exportsOf(t, seen); e.values.forEach((v) => values.add(v)); e.all.forEach((v) => all.add(v)); }
  }
  return { values, all };
}
function resolveSpec(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base.replace(/\.js$/, "")}.ts`, `${base}/index.ts`]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}
const walk = (d: string): string[] => !existsSync(d) ? [] : readdirSync(d).flatMap((n) => {
  if (n === "node_modules" || n === "dist" || n === "var") return [];
  const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|cjs|mjs)$/.test(n) ? [p] : [];
});

// P: the problems of one contract's own imports and code.
const FORBIDDEN = [/\bprocess\.env\b/, /\brequire\s*\(/, /\breadFileSync\b|\bwriteFileSync\b/, /\bfetch\s*\(/];
function purity(file: string, contractsDir: string): string[] {
  const src = readFileSync(file, "utf8"), probs: string[] = [];
  for (const i of importsIn(src)) {
    if (i.typeOnly) continue;
    const t = resolveSpec(file, i.spec);
    if (i.spec === "zod") continue;
    if (t && dirname(t) === contractsDir) continue;
    probs.push(`takes values from ${i.spec}`);
  }
  for (const re of FORBIDDEN) if (re.test(code(src))) probs.push(`uses ${re.source.replace(/\\b|\\s\*\\\(|\\/g, "")}`);
  return probs;
}
// N: names consumers import from each contract that it does not export. consumers: files to read.
function missingNames(contracts: string[], consumers: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>(contracts.map((c) => [c, []]));
  const ex = new Map(contracts.map((c) => [c, exportsOf(c).all]));
  for (const f of consumers) {
    let src = ""; try { src = readFileSync(f, "utf8"); } catch { continue; }
    if (!src.includes("contracts")) continue;
    for (const i of importsIn(src)) {
      const t = resolveSpec(f, i.spec); if (!t || !ex.has(t)) continue;
      for (const n of i.names) if (!ex.get(t)!.has(n)) out.get(t)!.push(`${relative(STUDIO, f)} imports ${n}`);
    }
  }
  return out;
}

(async () => {
  // The failing cases first, on made-up files: each rule must catch its fault.
  {
    const root = mkdtempSync(join(tmpdir(), "b121-seams-")), cd = join(root, "contracts"); mkdirSync(cd); mkdirSync(join(root, "api"));
    writeFileSync(join(cd, "good.ts"), `import { z } from "zod";\nimport type { Other } from "../api/server.ts";\nexport const Good = 1;\nexport type G = Other;\nexport function words() { return "x"; }\n`);
    writeFileSync(join(cd, "bad.ts"), `import { readFileSync } from "node:fs";\nimport { helper } from "../api/server.ts";\nexport const Bad = process.env.X ?? helper;\n`);
    writeFileSync(join(root, "api", "server.ts"), `export const helper = 1;\nexport type Other = number;\n`);
    writeFileSync(join(root, "api", "uses.ts"), `import { Good, Gone, type G } from "../contracts/good.ts";\nimport { words } from "../contracts/good";\n`);
    ok("P fail: a contract taking values from Node and server code, or reading the environment, is caught", (() => { const p = purity(join(cd, "bad.ts"), cd); return p.some((x) => x.includes("node:fs")) && p.some((x) => x.includes("server.ts")) && p.some((x) => x.includes("process.env")); })(), purity(join(cd, "bad.ts"), cd));
    ok("P pass: zod, other contracts and type-only imports are free", purity(join(cd, "good.ts"), cd).length === 0, purity(join(cd, "good.ts"), cd));
    const miss = missingNames([join(cd, "good.ts")], [join(root, "api", "uses.ts")]).get(join(cd, "good.ts"))!;
    ok("N fail: a consumer importing a name the contract does not export (Gone) is caught, and only that one", miss.length === 1 && miss[0].endsWith("imports Gone"), miss);
    writeFileSync(join(cd, "cycle-a.ts"), `import { B } from "./cycle-b.ts";\nexport const A = B + 1;\n`);
    writeFileSync(join(cd, "cycle-b.ts"), `import { A } from "./cycle-a.ts";\nexport const B = A + 1;\n`);
    let loadErr = ""; try { await import(pathToFileURL(join(cd, "cycle-a.ts")).href); } catch (e) { loadErr = (e as Error).message; }
    ok("L fail: two contracts that need each other's values at load (a cycle) fail to load", loadErr !== "", "it loaded");
    rmSync(root, { recursive: true, force: true });
  }
  const CDIR = join(STUDIO, "contracts");
  const contracts = readdirSync(CDIR).filter((n) => n.endsWith(".ts")).map((n) => join(CDIR, n)).sort();
  ok(`there are contracts to check (${contracts.length})`, contracts.length >= 30, contracts.length);
  const consumers = [...["api/src", "engine", "web/src", "tests", "tools", "acceptance", "contracts"].flatMap((d) => walk(join(STUDIO, d))), ...walk(join(STUDIO, "..", "tests"))];
  const missing = missingNames(contracts, consumers);
  for (const c of contracts) {
    const name = `contracts/${relative(CDIR, c)}`;
    let mod: Record<string, unknown> | null = null, err = "";
    try { mod = await import(pathToFileURL(c).href); } catch (e) { err = (e as Error).message; }
    const { values } = exportsOf(c);
    const undef = mod ? [...values].filter((v) => !(v in mod!) || mod![v] === undefined) : [];
    ok(`L ${name}: loads on its own, its ${values.size} exported value(s) defined`, !!mod && undef.length === 0, err || undef.join(", "));
    const p = purity(c, CDIR);
    ok(`P ${name}: values only from zod and other contracts; no Node, file, network or environment access`, p.length === 0, p.join("; "));
    const m = missing.get(c)!;
    ok(`N ${name}: every name its consumers import is exported`, m.length === 0, m.slice(0, 5).join("; "));
  }
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
