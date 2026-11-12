// BK-4b (concept BK-4 rev 2 §8, challenge M5; P-484): the Studio's own guard, scoped to web/src/pages/ (4a guards the
// frame and the header, 4c runtime/; the last of the three to merge adds the whole-web/src check). Reads the source only:
//   1. no page tells the walker to switch person by hand ("switch to …", case-insensitive): each became a hand-off;
//   2. no page writes the person itself: a page changes it only through a hand-off (components/hand-off.tsx calls the
//      one setActor of lib/api.ts) or the case area's own helpers (actAsCaseStaff, leaveCasesAsStudio), never
//      setActor( or the stored key "xr-actor";
//   3. the hand-off picks its person from data (holderOf over the session's people), never a literal person id;
//   4. the six places the concept names carry a hand-off (review.tsx, release.tsx, review-items.tsx).
// No server, no database, no model call (US$0). The browser walk is check_bk4b_handoffs_browser.cjs.
//   tsx --tsconfig api/tsconfig.json tests/check_bk4b_handoffs.ts
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "web/src");
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };
const read = (f: string) => readFileSync(join(WEB, f), "utf8");
const pages = (dir = "pages"): string[] => readdirSync(join(WEB, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? pages(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []);
const files = pages();
ok("BK-4b: the pages are found", files.length >= 20, files.length);

/** Lines of a file with a match, comments dropped (a comment may say what used to be there). */
const hits = (f: string, re: RegExp) => read(f).split("\n").map((l, i) => ({ l: l.replace(/^\s*\/\/.*$/, "").replace(/\/\*.*?\*\//g, ""), n: i + 1 })).filter((x) => re.test(x.l)).map((x) => `${f}:${x.n}`);
const switchWords = files.flatMap((f) => hits(f, /switch to\b/i));
ok("BK-4b BR-1: no page tells the walker to switch person by hand (\"switch to …\")", switchWords.length === 0, switchWords);
// Pages that may change the person themselves, at most this many times each, with the reason. Not a hand-off: the
// person is chosen on purpose there (the other two ways BR-1 allows, the sign-in page and its stand-in).
const PAGE_WRITES_ALLOWED: Record<string, number> = {
  // pages/start.tsx: none since BK-5 PR 2 ("Sign in as the Configuration author" links to /sign-in).
  "pages/sign-in.tsx": 1, // BK-4a (#1580, P-484): signing in on a role card (check_bk4a.ts ALLOWED); none until #1580 merges
};
const writes = files.flatMap((f) => hits(f, /\bsetActor\(|["']xr-actor["']/));
const overOf = (ws: string[]) => Object.entries(ws.reduce<Record<string, number>>((m, h) => { const f = h.replace(/:\d+$/, ""); m[f] = (m[f] ?? 0) + 1; return m; }, {})).filter(([f, n]) => n > (PAGE_WRITES_ALLOWED[f] ?? 0));
const over = overOf(writes);
ok("BK-4b BR-1: no page writes the person itself (setActor( or \"xr-actor\"), besides the listed sign-in places", over.length === 0, { over, writes });
ok("BK-4b BR-1 (fail): a planted second write on the start page, and one on review.tsx, are each caught", overOf([...writes, "pages/start.tsx:999"]).length === 1 && overOf([...writes, "pages/review.tsx:1"]).length === 1);
const literal = files.flatMap((f) => hits(f, /<(?:Decide)?HandOff\b.*\buser-[A-Z]\b/));
ok("BK-4b BR-3: no hand-off names a literal person id", literal.length === 0, literal);

// The fail side of 1 and 2: the same checks catch a planted sentence and a planted write.
const planted = ["Switch to the Approver (simulated) to release.", "switch to the Content reviewer", "onClick={() => setActor(\"user-B\")}", "localStorage.setItem('xr-actor', id)"];
ok("BK-4b BR-1 (fail): the checks catch each planted sentence or write", planted.every((s) => /switch to\b/i.test(s) || /\bsetActor\(|["']xr-actor["']/.test(s)));

const hand = read("components/hand-off.tsx");
ok("BK-4b BR-7: the hand-off is a button that calls the one setActor, then moves", /<Button[^>]*type="button"[^>]*onClick=\{go\}/.test(hand) && /setActor\(to\.id\)/.test(hand) && /import \{ setActor \} from "@\/lib\/api"/.test(hand) && !/<Link\b/.test(hand));
ok("BK-4b BR-3: the hand-off's person comes from the session's people by duty (holderOf)", /export function holderOf\(people[^)]*duty/.test(hand) && !/user-[A-Z]/.test(hand));
ok("BK-4b: the hand-off keeps no person state and posts no toast (the frame's notice is BK-4a's)", !/useState|useToast|localStorage/.test(hand));

const review = read("pages/review.tsx"), release = read("pages/release.tsx"), items = read("pages/review-items.tsx");
ok("BK-4b BR-2: the Review tab hands to the expert, the approver, back to the author, and opens a case", ['id="content-reviewer"', 'id="approver"', 'id="author"', 'id="open-case"', "data-handoff-open-case"].every((s) => review.includes(s)));
ok("BK-4b BR-3: the expert and the approver are never the submitter", /holderOf\(people, "sme", \[latest\.submittedBy\]\)/.test(review) && /holderOf\(people, "approve", \[latest\.submittedBy\]\)/.test(review));
ok("BK-4b: the open-case hand-off acts through the case area's own helper", /act=\{\(\) => actAsCaseStaff\(\)\}/.test(review));
ok("BK-4b BR-3: the Release page hands the release to the approve duty", /holderOf\(session\.data\.actors, "approve", \[actorId\]\)/.test(release));
const decide = [...items.matchAll(/<DecideHandOff me=\{me\} duty="(sme|review)"(?: proposer=\{([^}]+)\})?/g)].map((m) => `${m[1]}:${m[2] ?? "-"}`);
ok("BK-4b BR-3: the To review pages hand each decision to its duty, never to its proposer (5 places)", decide.length === 5 && decide.includes("sme:x.proposed_by_id") && decide.filter((d) => d === "review:x.proposed_by_id").length === 2 && decide.includes("review:h.uploadedBy") && decide.includes("review:-"), decide);
ok("BK-4b BR-3: the item's hand-off leaves out its proposer and the person asking", /holderOf\(me\.people, duty, \[proposer, me\.id\]\)/.test(items));

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
