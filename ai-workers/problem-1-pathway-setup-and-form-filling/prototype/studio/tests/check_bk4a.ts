// BK-4a (P-447 (2), P-456 (3), P-484; product/screens/BK-4-sign-in-hand-offs/concept.md §8): sign in by role, one person
// picker. Reads the source only: no server, no database, no model call (US$0). The browser walk is check_bk4a_browser.cjs.
// (1) The web's list of simulated people (web/src/lib/simulated-people.ts) is the server's (api/src/core.ts ACTORS +
//     RUNTIME_ACTORS): same ids, names, roles and duties; a list that drifts fails (fail side: a changed copy is caught).
// (2) One picker: the only "Simulated person" select is the frame's; the Studio's old PersonaSwitch is gone.
// (3) BR-1: in web/src a person changes only at the known places (sign-in, picker, the two frame links, the case area's
//     first person and its BR-8 button, and BK-4c's one hand-off button, runtime/hand-off.tsx); nothing else writes
//     xr-actor. A new call site fails until it is listed here with its reason.
// (4) BK-4a's own scope (concept §8, side by side with 4b and 4c): no "switch to" words in the frame, the Studio shell,
//     the sign-in page or the case area's file.
// (5) The sign-in page's address has its "where am I" words and is a first page; BR-6 and BR-8 are wired.
//   tsx --tsconfig api/tsconfig.json tests/check_bk4a.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PEOPLE, FIRST_FOUR, homeOf } from "../web/src/lib/simulated-people.ts";
import { backOf, whereFromAddress } from "../web/src/components/where.ts";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(STUDIO, "web/src");
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };
const read = (f: string) => readFileSync(join(WEB, f), "utf8");

// (1) The server's people, read from core.ts's source (importing it would start Prisma).
type Row = { id: string; name: string; role: string; duties: string[] };
const core = readFileSync(join(STUDIO, "api/src/core.ts"), "utf8");
const block = (name: string) => { const m = core.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`)); return m ? m[1] : ""; };
const rowsOf = (src: string): Row[] => [...src.matchAll(/\{ id: "([^"]+)", persona: "[^"]+", name: "([^"]+)", role: "([^"]+)", duties: \[([^\]]*)\]/g)]
  .map((m) => ({ id: m[1], name: m[2], role: m[3], duties: [...m[4].matchAll(/"([^"]+)"/g)].map((d) => d[1]) }));
const server = [...rowsOf(block("ACTORS")), ...rowsOf(block("RUNTIME_ACTORS"))];
const web: Row[] = PEOPLE.map((p) => ({ id: p.id, name: p.name, role: p.role, duties: [...p.duties] }));
const differ = (a: Row[], b: Row[]) => {
  const key = (r: Row) => JSON.stringify([r.id, r.name, r.role, r.duties]);
  const A = new Set(a.map(key)), B = new Set(b.map(key));
  return [...a.filter((r) => !B.has(key(r))).map((r) => `web only: ${key(r)}`), ...b.filter((r) => !A.has(key(r))).map((r) => `server only: ${key(r)}`)];
};
ok("BK-4a (1): the server's people are found in core.ts (3 Studio + 6 case people)", server.length === 9, server.map((r) => r.id));
ok("BK-4a (1): the web's list of simulated people is the server's (ids, names, roles, duties)", differ(web, server).length === 0, differ(web, server));
const drifted = web.map((r) => (r.id === "user-B" ? { ...r, name: "Second approver" } : r));
ok("BK-4a (1) fail side: a list whose name drifted from the server's is caught", differ(drifted, server).length === 2, differ(drifted, server));
ok("BK-4a: four people on the sign-in page, the first of each stage (author, approver, case officer, representative)", JSON.stringify(FIRST_FOUR) === JSON.stringify(["user-A", "user-B", "user-O", "user-R"]));
ok("BK-4a: a Studio person's first page is the programs; firm and clients start at the case list", homeOf("user-B") === "/" && homeOf("user-R") === "/cases" && homeOf("user-P") === "/cases");

// (2) One picker.
const files: string[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p); } };
walk(WEB);
const pickers = files.filter((f) => /aria-label="Simulated person"/.test(readFileSync(f, "utf8"))).map((f) => relative(WEB, f));
ok("BK-4a (2): one person picker, in the frame (both areas use it)", JSON.stringify(pickers) === JSON.stringify(["components/frame.tsx"]), pickers);
ok("BK-4a (2): the Studio and the case area both render the frame's PersonPicker", /<PersonPicker area="studio" \/>/.test(read("App.tsx")) && /<PersonPicker area=\{client \? "client" : "cases"\} \/>/.test(read("runtime/cases.tsx")));
ok("BK-4a (2): the Studio's old PersonaSwitch is gone", !/function PersonaSwitch/.test(read("App.tsx")));

// (3) Every place a person changes, with its reason (BR-1).
const ALLOWED: Record<string, number> = {
  "components/frame.tsx": 3, // leaveCasesAsStudio and enterCasesAsStaff (the frame links that name the person, P-484 (4)); the picker
  "runtime/cases.tsx": 2, // the first person of a browser with none (BR-6/BR-8); BR-8's "Continue as Case officer"
  "runtime/hand-off.tsx": 1, // BK-4c: the case area's hand-off button (to the case's client, back to the firm, to the representative)
  "pages/sign-in.tsx": 1, // signing in
  // pages/start.tsx: none since BK-5 PR 2 (its "Sign in as the Configuration author" is a link to the sign-in page).
  "components/hand-off.tsx": 2, // BK-4b's HandOff button (#1582, reviewed): its one call, plus its doc comment "default setActor(to.id)"
  "lib/api.ts": 0, // defines setActor
};
const sites: Record<string, number> = {};
for (const f of files) { const r = relative(WEB, f), n = (readFileSync(f, "utf8").match(/\bsetActor\(/g) ?? []).length - (r === "lib/api.ts" ? 1 : 0); if (n > 0) sites[r] = n; }
const extra = Object.entries(sites).filter(([f, n]) => (ALLOWED[f] ?? 0) !== n);
ok("BR-1: a person changes only at the listed places (sign-in, picker, frame links, the case area's first person and BR-8, BK-4c's hand-off button)", extra.length === 0, { sites, allowed: ALLOWED });
// Break m6: the helpers that change the person count too (a call site is a person change the check must see).
const HELPERS_ALLOWED: Record<string, number> = {
  "components/frame.tsx": 2, // the frame's other-area link: leaveCasesAsStudio or enterCasesAsStaff, by area (it names the person)
  "runtime/cases.tsx": 1, // the case's release pill (names "as Configuration author")
  "pages/combination.tsx": 1, // BK-3 PR 2's "Open a case on Release N": BK-4b names the person on it (concept §5)
  "pages/start.tsx": 1, // BK-5's first-run card "Open the family case (as Case officer)" (the link names its person)
  "components/demo-finished-story.tsx": 2, // the finished story's "Open the family case" and "Open the case left on release 1", each "(as Case officer)"
  "pages/review.tsx": 1, // BK-4b's "Open a case on Release N (as Case officer)" hand-off on the Review tab (#1582, reviewed; the label names the person)
};
const HELPER = /\b(actAsCaseStaff|enterCasesAsStaff|leaveCasesAsStudio)\b/g;
const helperUse: Record<string, number> = {};
for (const f of files) {
  const r = relative(WEB, f);
  // Uses only: not an import line, not where a helper is defined (export function …, export const … = …).
  const n = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*import /.test(l) && !/export (function|const) (actAsCaseStaff|enterCasesAsStaff|leaveCasesAsStudio)\b/.test(l)).reduce((a, l) => a + (l.match(HELPER) ?? []).length, 0);
  if (n) helperUse[r] = n;
}
const helperExtra = Object.entries(helperUse).filter(([f, n]) => (HELPERS_ALLOWED[f] ?? 0) !== n);
ok("BR-1: every use of the person-changing helpers is listed (frame link, release pill, Open a case)", helperExtra.length === 0, { helperUse, allowed: HELPERS_ALLOWED });
const writers = files.filter((f) => !f.endsWith("lib/api.ts") && /localStorage\.setItem\(\s*["']xr-actor/.test(readFileSync(f, "utf8"))).map((f) => relative(WEB, f));
ok("BR-1: nothing but lib/api.ts writes the stored person", writers.length === 0, writers);
ok("BR-1 fail side: a new setActor call in a page would be caught", (() => { const s = { ...sites, "pages/review.tsx": 1 }; return Object.entries(s).some(([f, n]) => (ALLOWED[f] ?? 0) !== n); })());
ok("BR-1: every change of person is said once by the frame's notice, mounted once outside the routes", /<BrowserRouter><PersonNotice \/>/.test(read("App.tsx")) && /Now: \$\{p\.name\} \(simulated\)/.test(read("components/frame.tsx")));

// (4) BK-4a's own scope: no "switch to" words left in its files (4b and 4c guard theirs; the last to merge checks web/src).
for (const f of ["App.tsx", "components/frame.tsx", "pages/sign-in.tsx", "runtime/cases.tsx"]) ok(`BK-4a (4): no "switch to" words in ${f}`, !/switch to/i.test(read(f)), (read(f).match(/.{0,40}switch to.{0,40}/i) ?? [])[0]);

// (5) The sign-in page, BR-6 and BR-8.
const w = whereFromAddress("outside", "/sign-in");
ok("BK-4a (5): the sign-in page names itself and is a first page (no Back)", w.crumbs.map((c) => c.label).join(" › ") === "Sign in" && backOf(w) === null, w);
ok("BK-4a (5): /sign-in is a route of the app, outside both areas", /<Route path="\/sign-in" element=\{<SignInPage \/>\} \/>/.test(read("App.tsx")) && /<Frame area="outside"/.test(read("pages/sign-in.tsx")));
ok("BR-6: a chosen person this workspace does not know is sent to the sign-in page; Studio and case routes are guarded", /personChosen\(\) && !personOf\(id\) \? <Navigate to="\/sign-in\?unknown=1"/.test(read("App.tsx")) && (read("App.tsx").match(/<KnownPerson>/g) ?? []).length === 2);
ok("BR-6: a browser with no stored person is the Configuration author, as before (a page, not a gate, P-484 (3))", /let actor = stored \?\? "user-A";/.test(read("lib/api.ts")) && /let chosen = stored !== null;/.test(read("lib/api.ts")));
ok("BR-8: the case area switches silently only a browser with no person chosen; a chosen Studio person gets the notice and one named button", /!casesLeaving\(\) && !personChosen\(\) && !isCasePerson\(getActor\(\)\)/.test(read("runtime/cases.tsx")) && /<NotACasePerson \/>/.test(read("runtime/cases.tsx")) && /Continue as \{officer\.name\}/.test(read("runtime/cases.tsx")));

console.log(`\n${pass}/${pass + failed} passed`);
process.exit(failed ? 1 : 0);
