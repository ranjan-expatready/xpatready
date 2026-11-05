#!/usr/bin/env node
// route-has-screen.mjs (founder approved 5 Nov, P-348; QA-234): an acceptance pack may build its world by calling routes,
// but a person has only the screens. Every mutating route (POST, PUT, PATCH, DELETE) that an acceptance pack's set-up
// (prototype/studio/acceptance/lib/, the shared steps that build a pack's world) calls must have a caller in the web app (prototype/studio/web/src), or a line in route-has-screen-allow.txt that gives the reason.
// Plain Node, no package (STANDARDS §1), no app, no database; reads files only, runs in well under a second.
//   node product/tools/route-has-screen.mjs            check; exit 0 = every route has a screen or a reason, 1 = misses
//   node product/tools/route-has-screen.mjs --list     also print every route the packs call and where its screen calls it
//   node product/tools/route-has-screen.mjs --list --all   read every pack file, not only the set-up (never fails)
//   node product/tools/route-has-screen.mjs --self-test   prove the check fails on a new route with no screen (CI runs it)
// How a route is matched: the API's own decorators (@Controller + @Post/@Put/@Patch/@Delete in api/src) give the routes;
// a pack's call("POST", `/x/${id}/y`) and a screen's api(`/x/${id}/y`, { method: "POST" }) are both read with every
// ${...} as "any one part of the path" (a template that starts with ${...} may stand for several), so a URL built from
// variables still counts as a caller. A screen's call counts for a method only when that method is named near it
// (method: "POST", or a choice such as b.on ? "POST" : "DELETE"); with no method named it is a GET.
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ALLOW_DEFAULT = join(HERE, "route-has-screen-allow.txt");
const STUDIO_DEFAULT = join(HERE, "..", "..", "prototype", "studio");
const MUTATING = ["POST", "PUT", "PATCH", "DELETE"];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(p);
  }
  return out;
};

/** A URL as written ("/a/${id}/b?x=1") → its parts, each a literal, "*" (any one part) or a pattern ("v${n}"); lead = it
 *  starts with ${...} (that may stand for several parts); tail = it ends with two or more ${...} in a row, as in
 *  `/nodes/${key}${kind === "DELETE" ? "" : `/${kind}`}`, so the last may stand for one part or more. */
function parts(url) {
  let u = url.replace(PLACE, "\u0000");
  const lead = u.startsWith("\u0000");
  u = u.replace(/[?#].*$/, "").replace(/^\/?api(?=\/)/, "");
  const raw = u.split("/").filter((s) => s !== "");
  const tail = raw.length > 1 && /^\u0000{2,}$/.test(raw[raw.length - 1]);
  const esc = (x) => x.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
  return { lead, tail, segs: raw.map((s) => (/^\u0000+$/.test(s) ? "*" : s.includes("\u0000") ? new RegExp("^" + s.split("\u0000").map(esc).join("[^/]+") + "$") : s)) };
}
const isLit = (s) => typeof s === "string" && s !== "*";
const segOk = (want, got) => want.startsWith(":") || got === "*" || (got instanceof RegExp ? got.test(want) : got === want);
/** Does a written URL (parts) match a route path (":id" parts)? A leading ${...} may stand for any number of parts. */
function matches(route, url) {
  const r = route.split("/").filter(Boolean);
  const { lead, segs } = url;
  const literal = segs.filter(isLit);
  if (lead) {
    // "${base}/approve": the written parts after the first are the route's last parts; the first may cover several.
    const tail = segs.slice(1);
    if (!literal.length || tail.length > r.length) return false;
    const off = r.length - tail.length;
    return tail.every((s, i) => segOk(r[off + i], s));
  }
  if (url.tail) return r.length >= segs.length && segs.every((s, i) => segOk(r[i], s));
  return r.length === segs.length && segs.every((s, i) => segOk(r[i], s));
}

/** Every mutating route in api/src, read from the decorators: [{ method, path, file, line }]. */
function apiRoutes(studio) {
  const out = [];
  for (const f of walk(join(studio, "api", "src"))) {
    const text = readFileSync(f, "utf8");
    let prefix = "";
    const re = /@(Controller|Post|Put|Patch|Delete|Get)\(\s*(?:["'`]([^"'`]*)["'`])?/g;
    for (const m of text.matchAll(re)) {
      if (m[1] === "Controller") { prefix = (m[2] ?? "").replace(/^\/|\/$/g, ""); continue; }
      const method = m[1].toUpperCase();
      if (!MUTATING.includes(method)) continue;
      const full = "/" + [prefix, (m[2] ?? "").replace(/^\/|\/$/g, "")].filter(Boolean).join("/");
      out.push({ method, path: full.replace(/^\/api(?=\/|$)/, "") || "/", file: relative(studio, f), line: text.slice(0, m.index).split("\n").length });
    }
  }
  return out;
}

// A ${...} may hold braces and a nested template two levels deep; a template's ${...} is read before its plain characters.
const PLACE_SRC = String.raw`\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}`;
const PLACE = new RegExp(PLACE_SRC, "g");
const LIT = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:` + PLACE_SRC + String.raw`|\\.|[^\`\\])*\`)`;
const unquote = (s) => s.slice(1, -1);

/** Every mutating call the packs' set-up makes: call("POST", "/x" | `/x/${id}` | name), name = a const in the file.
 *  The set-up is acceptance/lib/ (pack1, pack2, m3, fixtures, setup_vv_m3: the steps that build a pack's world); with
 *  all = true, every pack file too (the route a pack tests may be the capability itself; --all reports it, never fails). */
function packCalls(studio, all = false) {
  const out = [];
  for (const f of walk(join(studio, "acceptance", all ? "" : "lib"))) {
    const text = readFileSync(f, "utf8");
    const consts = new Map([...text.matchAll(new RegExp(String.raw`(?:const|let)\s+(\w+)\s*=\s*` + LIT, "g"))].map((m) => [m[1], unquote(m[2])]));
    // call("POST", url ...): a fetch(url, { method: "POST", headers }) is not a pack call and is left out.
    const re = new RegExp(String.raw`\(\s*["'](POST|PUT|PATCH|DELETE)["']\s*,\s*(?:` + LIT + String.raw`|(\w+)\b)`, "g");
    for (const m of text.matchAll(re)) {
      const url = m[2] !== undefined ? unquote(m[2]) : consts.get(m[3]);
      const line = text.slice(0, m.index).split("\n").length;
      out.push({ method: m[1], url: url ?? null, name: m[3], file: relative(studio, f), line });
    }
  }
  return out;
}

/** The methods a call names: from a point to the end of its line, stopping where the next call starts (one line can hold
 *  two calls; they do not lend each other a method). `method: isNew ? "POST" : "PATCH"` names both. */
function methodsAfter(text, at) {
  const eol = text.indexOf("\n", at);
  let rest = text.slice(at, eol < 0 ? undefined : eol);
  const next = rest.search(/\b(?:api|fetch|useApi|useAction)\s*(?:<[^()]*>)?\(/);
  if (next >= 0) rest = rest.slice(0, next);
  const methods = new Set();
  if (/method\s*:/.test(rest)) for (const x of rest.matchAll(/["'](POST|PUT|PATCH|DELETE)["']/g)) methods.add(x[1]);
  return methods;
}

/** Every URL a screen calls, with the methods named next to it: [{ url (parts), methods: Set, file, line }].
 *  Two dynamic shapes are followed inside one file: a URL helper used at the start of a template
 *  (const path = (k) => `/library/${list}/${k}`; api(`${path(key)}/approve`, ...)), and a URL kept in a name first
 *  (const redoPath = `/x/${id}/redo`; ... api(redoPath, { method: "POST" })). */
function webCalls(studio) {
  const out = [];
  for (const f of walk(join(studio, "web", "src"))) {
    const text = readFileSync(f, "utf8");
    const helpers = new Map([...text.matchAll(new RegExp(String.raw`(?:const|let)\s+(\w+)\s*=\s*(?:\([^()]*\)|\w+)\s*=>\s*` + LIT, "g"))].map((m) => [m[1], unquote(m[2])]));
    for (const m of text.matchAll(new RegExp(LIT, "g"))) {
      let raw = unquote(m[0]);
      const h = raw.match(/^\$\{\s*(\w+)\s*(?:\([^()]*\))?\s*\}/);
      if (h && helpers.has(h[1]) && helpers.get(h[1]) !== raw) raw = helpers.get(h[1]) + raw.slice(h[0].length);
      if (!/^(\/|\$\{)/.test(raw) || raw.length < 2) continue;
      const p = parts(raw);
      if (!p.segs.some(isLit)) continue;
      const at = m.index + m[0].length, line = text.slice(0, m.index).split("\n").length;
      const methods = methodsAfter(text, at);
      // Kept in a name first: the methods named where that name is called.
      const before = text.slice(text.lastIndexOf("\n", m.index) + 1, m.index);
      const kept = before.match(/(?:const|let)\s+(\w+)\s*=\s*(?:[^;=]*\?\s*)?$/);
      if (kept) for (const u of text.matchAll(new RegExp(String.raw`\b(?:api|fetch)\s*(?:<[^()]*>)?\(\s*` + kept[1] + String.raw`\b`, "g"))) for (const x of methodsAfter(text, u.index + u[0].length)) methods.add(x);
      out.push({ raw, url: p, methods, file: relative(studio, f), line });
    }
  }
  return out;
}

/** The allow-list: "METHOD /path  # reason (QA number or row)"; a line without a reason does not count. */
function readAllow(file) {
  const rows = [], bad = [];
  let text = "";
  try { text = readFileSync(file, "utf8"); } catch { return { rows, bad }; }
  text.split("\n").forEach((l, i) => {
    const s = l.trim();
    if (!s || s.startsWith("#")) return;
    const m = s.match(/^(POST|PUT|PATCH|DELETE)\s+(\/\S*)\s+#\s*(.*\S)\s*$/);
    if (!m || !/\b(QA-\d+|B\d+[a-z]?|C\d+\.\d+|P-\d+)\b/.test(m[3])) bad.push({ line: i + 1, text: s });
    else rows.push({ method: m[1], path: m[2], why: m[3], line: i + 1 });
  });
  return { rows, bad };
}

export function check({ studio = STUDIO_DEFAULT, allow = ALLOW_DEFAULT, all = false } = {}) {
  const routes = apiRoutes(studio);
  const calls = packCalls(studio, all);
  const web = webCalls(studio);
  const { rows: allowed, bad } = readAllow(allow);
  const used = new Map(); // "METHOD path" → { route, from: [pack calls] }
  const unknown = [];
  for (const c of calls) {
    if (c.url === null) { unknown.push({ ...c, why: `its URL is the variable ${c.name}, which this check cannot read` }); continue; }
    const p = parts(c.url);
    const hit = routes.filter((r) => r.method === c.method && matches(r.path, p));
    // The most specific route wins (literal parts beat :params), as the router does.
    const score = (r) => r.path.split("/").filter((s) => s && !s.startsWith(":")).length;
    const best = hit.sort((a, b) => score(b) - score(a))[0];
    if (!best) { unknown.push({ ...c, why: "no API route has this method and path" }); continue; }
    const k = `${best.method} ${best.path}`;
    if (!used.has(k)) used.set(k, { route: best, from: [] });
    used.get(k).from.push(c);
  }
  const results = [...used.values()].map(({ route, from }) => {
    const screens = web.filter((w) => w.methods.has(route.method) && matches(route.path, w.url));
    const allow = allowed.find((a) => a.method === route.method && a.path === route.path);
    return { route, from, screens, allow };
  }).sort((a, b) => a.route.path.localeCompare(b.route.path) || a.route.method.localeCompare(b.route.method));
  const misses = results.filter((r) => !r.screens.length && !r.allow);
  const stale = allowed.filter((a) => { const r = results.find((x) => x.route.method === a.method && x.route.path === a.path); return !r || r.screens.length; });
  return { routes, results, misses, stale, bad, unknown };
}

function report(res, list) {
  const lines = [];
  const { results, misses, stale, bad } = res;
  if (list) for (const r of results) {
    const where = r.screens.length ? `screen: ${r.screens[0].file}:${r.screens[0].line}` : r.allow ? `allowed: ${r.allow.why}` : "NO SCREEN";
    lines.push(`${r.route.method.padEnd(6)} ${r.route.path}  (${r.from.length} pack call${r.from.length > 1 ? "s" : ""}) → ${where}`);
  }
  lines.push(`route-has-screen: ${results.length} mutating routes called by the acceptance packs' set-up (acceptance/lib); ${results.filter((r) => r.screens.length).length} have a screen, ${results.filter((r) => !r.screens.length && r.allow).length} are allowed with a reason, ${misses.length} ${misses.length === 1 ? "has" : "have"} neither.`);
  for (const m of misses) {
    const f = m.from[0];
    lines.push("", `MISSING SCREEN: ${m.route.method} ${m.route.path} (${m.route.file}:${m.route.line})`,
      `  An acceptance pack's set-up calls it (${f.file}:${f.line}${m.from.length > 1 ? ` and ${m.from.length - 1} more` : ""}), but no screen in prototype/studio/web/src does,`,
      `  so a person cannot do this step. Do one of these:`,
      `   1. give it a screen: a button or form in web/src that calls api(\`${m.route.path.replace(/:(\w+)/g, "${$1}")}\`, { method: "${m.route.method}", ... }); or`,
      `   2. if a person truly never needs it (set-up only, or a screen is planned), add one line to product/tools/route-has-screen-allow.txt:`,
      `        ${m.route.method} ${m.route.path}  # why, with its QA number or backlog row (for example QA-234 or B82)`);
  }
  for (const s of stale) lines.push("", `ALLOW-LIST LINE NOT NEEDED (line ${s.line}): ${s.method} ${s.path} — it now has a screen, or no pack calls it. Remove the line.`);
  for (const b of bad) lines.push("", `ALLOW-LIST LINE NOT READ (line ${b.line}): "${b.text}" — write "METHOD /path  # reason" and name a QA number or row (QA-234, B82, C4.11, P-348).`);
  return lines.join("\n");
}

function selfTest() {
  // A copy of the three folders the check reads, then a new pack call to a new route with no screen: it must fail, an
  // allow-list line must make it pass, and a screen calling it must make it pass without the line.
  const real = check();
  const dir = mkdtempSync(join(tmpdir(), "route-has-screen-"));
  const studio = join(dir, "studio"), allow = join(dir, "allow.txt");
  let failed = 0;
  const expect = (what, good) => { console.log(`${good ? "ok  " : "FAIL"} self-test: ${what}`); if (!good) failed++; };
  try {
    for (const d of ["api/src", "acceptance", "web/src"]) cpSync(join(STUDIO_DEFAULT, d), join(studio, d), { recursive: true });
    writeFileSync(allow, readFileSync(ALLOW_DEFAULT, "utf8"));
    expect("main with the allow-list has no miss", real.misses.length === 0 && real.bad.length === 0 && real.stale.length === 0);
    writeFileSync(join(studio, "api/src/zz-self-test.ts"), `@Controller("api")\nexport class Z {\n  @Post("self-test/:id/tick") tick() {}\n}\n`);
    writeFileSync(join(studio, "acceptance/lib/zz-self-test.ts"), "await call(\"POST\", `/self-test/${id}/tick`, {}, AUTHOR);\n");
    let r = check({ studio, allow });
    expect("a new route a pack calls with no screen and no allow-list line fails", r.misses.length === 1 && r.misses[0].route.path === "/self-test/:id/tick" && /MISSING SCREEN: POST \/self-test\/:id\/tick/.test(report(r)));
    writeFileSync(allow, readFileSync(allow, "utf8") + "\nPOST /self-test/:id/tick  # no reason\n");
    r = check({ studio, allow });
    expect("an allow-list line with no QA number or row is not read", r.misses.length === 1 && r.bad.length === 1);
    writeFileSync(allow, readFileSync(ALLOW_DEFAULT, "utf8") + "\nPOST /self-test/:id/tick  # set-up only, QA-999\n");
    r = check({ studio, allow });
    expect("an allow-list line with a reason makes it pass", r.misses.length === 0 && r.bad.length === 0);
    writeFileSync(allow, readFileSync(ALLOW_DEFAULT, "utf8"));
    mkdirSync(join(studio, "web/src/zz"), { recursive: true });
    writeFileSync(join(studio, "web/src/zz/tick.tsx"), "const go = (id: string) => api(`/self-test/${id}/tick`, { method: \"POST\" });\n");
    r = check({ studio, allow });
    expect("a screen calling it with a template-string URL makes it pass", r.misses.length === 0);
    writeFileSync(join(studio, "web/src/zz/tick.tsx"), "const look = (id: string) => api(`/self-test/${id}/tick`);\n");
    r = check({ studio, allow });
    expect("a screen that only reads (GET) the same path does not count", r.misses.length === 1);
    writeFileSync(join(studio, "web/src/zz/tick.tsx"), "const p = (id: string) => `/self-test/${id}`;\nconst go = (id: string, k: string) => api(`${p(id)}/${k}`, { method: \"POST\" });\n");
    r = check({ studio, allow });
    expect("a screen calling it through a URL helper (`${path(id)}/${kind}`) makes it pass", r.misses.length === 0);
    writeFileSync(join(studio, "web/src/zz/tick.tsx"), "const go = (x: string) => api(`${x}/${x}`, { method: \"POST\" });\n");
    r = check({ studio, allow });
    expect("a URL with no fixed part at all does not count as a caller of every route", r.misses.length === 1);
    writeFileSync(allow, readFileSync(ALLOW_DEFAULT, "utf8") + "\nPOST /no-such/route  # QA-999\n");
    r = check({ studio, allow });
    expect("an allow-list line no pack's set-up needs is reported", r.stale.length === 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return failed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const t0 = Date.now();
  if (process.argv.includes("--self-test")) {
    const failed = selfTest();
    console.log(`route-has-screen self-test: ${failed ? `${failed} failed` : "all passed"} (${Date.now() - t0} ms)`);
    process.exit(failed ? 1 : 0);
  }
  const all = process.argv.includes("--all");
  const res = check({ all });
  console.log(report(res, process.argv.includes("--list")));
  if (all) { console.log("(--all: every pack file, not only the set-up; for reading, never a failure)"); process.exit(0); }
  if (res.unknown.length && process.argv.includes("--list")) for (const u of res.unknown) console.log(`note: ${u.file}:${u.line} ${u.method} ${u.url ?? ""} not checked: ${u.why}`);
  console.log(`(${Date.now() - t0} ms)`);
  process.exit(res.misses.length || res.bad.length || res.stale.length ? 1 : 0);
}
