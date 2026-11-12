// BK-3 PR 1 (P-447 (2), Bake plan row 3): one frame around every screen. Reads every <Route path> of web/src/App.tsx (the
// Studio, the adult's link page, the demo inbox) and web/src/runtime/cases.tsx (the case area, under /cases) and puts each
// through the frame's words (web/src/components/where.ts): every route has its own words (never "No such page"), and every
// route but an area's first page has Back to a route that exists. Also: App.tsx sends every route through the one Frame
// (no shell of its own), and no page draws a trail of its own beside the frame's line. A route added without words fails.
// Reads the source only: no server, no database, no model call (US$0). The browser walk is check_bk3_frame_browser.cjs.
//   tsx --tsconfig api/tsconfig.json tests/check_bk3_frame.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { backOf, whereFromAddress, type Area } from "../web/src/components/where.ts";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(STUDIO, "web/src");
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };
const read = (f: string) => readFileSync(join(WEB, f), "utf8");

const app = read("App.tsx"), cases = read("runtime/cases.tsx");
const paths = (src: string) => [...src.matchAll(/<Route (?:index |path="([^"]*)" )element=/g)].map((m) => m[1] ?? "");
const top = paths(app).filter((p) => p !== "*" && p !== "/cases/*");
const caseRoutes = paths(cases).filter((p) => p !== "*").map((p) => (p ? `/cases/${p}` : "/cases"));
ok("BK-3: the routes are found (Studio, link page, inbox and the case area)", top.length >= 25 && caseRoutes.length >= 8, { top: top.length, cases: caseRoutes.length });

/** A sample address for a route pattern: each :param becomes a value. */
const sample = (p: string) => p.replace(/:tab/, "forms").replace(/:[a-zA-Z]+/g, "x1");
/** Which frame area a route opens in, and as whom. */
const areaOf = (p: string): Area => (p === "/link" || p === "/inbox" ? "outside" : p.startsWith("/cases") ? "cases" : "studio");
// BK-3 PR 3: a client page's address, for a client, is refused with no Back (it is not a case of theirs, challenge M2).
const HOMES = new Set(["studio:/", "cases:/cases", "outside:/link", "client:/cases", "client:/cases/x1/questionnaire", "client:/cases/clients", "client:/cases/clients/x1"]);
/** Does an address open a route of the app (and not the not-found page)? */
const known = [...top, ...caseRoutes].map((p) => new RegExp(`^${p.replace(/:[a-zA-Z]+/g, "[^/]+")}$`));
const opens = (to: string) => known.some((r) => r.test(to.split(/[?#]/)[0]));

// The client too, on every case route (Client A can open any of them; only the questionnaire is theirs).
const all: [Area, string][] = [...top.map((p) => [areaOf(p), p] as [Area, string]), ...caseRoutes.map((p) => ["cases", p] as [Area, string]), ...caseRoutes.map((p) => ["client", p] as [Area, string])];
for (const [area, p] of all) {
  const addr = sample(p), w = whereFromAddress(area, addr), here = w.crumbs[w.crumbs.length - 1]?.label ?? "";
  ok(`BK-3 ${area} ${p}: the line names the place ("${w.crumbs.map((c) => c.label).join(" › ")}")`, w.crumbs.length > 0 && !!here && here !== "No such page", w);
  const back = backOf(w), home = HOMES.has(`${area}:${addr}`);
  if (home) ok(`BK-3 ${area} ${p}: an area's first page, no Back`, back === null, back);
  else ok(`BK-3 ${area} ${p}: Back goes one level up, to a route that exists (${back?.to})`, !!back && back.to !== addr && opens(back.to), back);
  for (const c of w.crumbs.filter((x) => x.to)) ok(`BK-3 ${area} ${p}: the crumb "${c.label}" opens a route that exists`, opens(c.to!), c.to);
}
// The other side: an address no route has says so, and still has Back to the area's first page.
for (const [area, addr, to] of [["studio", "/no-such-page", "/"], ["studio", "/library/nothing", "/"], ["cases", "/cases/x1/nothing", "/cases/x1"], ["cases", "/cases/clients/x1/nothing", "/cases/clients/x1"]] as [Area, string, string][]) {
  const w = whereFromAddress(area, addr);
  ok(`BK-3 fail side ${addr}: the line says "No such page" (the page's notice alone says "Page not found") and Back still leads out (${to})`, w.crumbs[w.crumbs.length - 1]?.label === "No such page" && backOf(w)?.to === to, w);
}

// BK-3 PR 3 (challenge M2): /cases/clients/... is a client page, never a case. opens() reads ":id" as any segment, so these
// rows assert the exact words and Back, and that no crumb or Back of a client page points at a case address.
const exact: [Area, string, string[], string | null][] = [
  ["cases", "/cases/clients", ["Cases", "Clients"], "/cases"],
  ["cases", "/cases/clients/user-P", ["Cases", "Client"], "/cases"],
  ["client", "/cases/clients", ["Your application"], null],
  ["client", "/cases/clients/user-P", ["Your application"], null],
];
for (const [area, addr, words, to] of exact) {
  const w = whereFromAddress(area, addr), back = backOf(w);
  ok(`BK-3 PR 3 ${area} ${addr}: the line reads "${words.join(" › ")}" and Back goes to ${to ?? "nowhere (no Back)"}`, JSON.stringify(w.crumbs.map((c) => c.label)) === JSON.stringify(words) && (back?.to ?? null) === to, { w, back });
  const links = [...w.crumbs.map((c) => c.to), back?.to].filter((x): x is string => !!x);
  ok(`BK-3 PR 3 ${area} ${addr}: no crumb or Back leads to a case address made of "clients"`, !links.some((x) => /^\/cases\/clients(\/(questionnaire|eligibility|review|representative-review|sheet))?$/.test(x) && x !== "/cases/clients/user-P"), links);
}

// One frame: each shell renders through Frame, and the old headers are gone.
ok("BK-3: App.tsx routes the case area, the link page and the inbox to components that use the Frame", /path="\/cases\/\*" element=\{<RuntimeApp \/>\}/.test(app) && /<Frame area="studio"/.test(app));
ok("BK-3: the case area renders through the Frame", /<Frame area=\{client \? "client" : "cases"\}/.test(cases));
ok("BK-3: the link page and the demo inbox render through the Frame", (read("runtime/link-page.tsx").match(/<Frame area="outside"/g) ?? []).length === 2);
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx$/.test(f)) files.push(p); } };
walk(WEB);
const headers = files.filter((f) => !f.endsWith("components/frame.tsx") && /<header className="sticky top-0/.test(readFileSync(f, "utf8"))).map((f) => relative(WEB, f));
ok("BK-3: no screen draws a header of its own (only the Frame's)", headers.length === 0, headers);
// A trail is a <nav> named Path, Breadcrumb or Where you are, or a <nav> with no name at all (the field page's was one).
const trails = files.filter((f) => !f.endsWith("components/frame.tsx") && /<nav(?! aria-label)[ >]|<nav aria-label="(Path|Breadcrumb|Where you are)"/.test(readFileSync(f, "utf8"))).map((f) => relative(WEB, f));
ok("BK-3: no page draws its own trail beside the frame's line (pages name their place with useWhere)", trails.length === 0, trails);
const toasters = files.filter((f) => !f.endsWith("components/frame.tsx") && /function Toaster\(/.test(readFileSync(f, "utf8"))).map((f) => relative(WEB, f));
ok("BK-3: one toast stack (the Frame's)", toasters.length === 0, toasters);

console.log(`${pass}/${pass + failed} passed`);
process.exit(failed ? 1 : 0);
