// B148 (P-236, P-316 (1), P-408; C6.9): the case check says P-236's words. No file in web/src shows the page's words
// from before P-236 ("Eligibility (staff only)", "Likely / Possibly / Not eligible"), comments included, and the words
// a person reads come from one place (contracts/case-check-words.ts): the page, the A4 dialog, the answer-key editor,
// the API's history lines and the engine's change summary. Pure: reads files and calls pure functions; no server.
//   tsx studio/tests/check_b148_words.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { CASE_CHECK, OUTCOME_WORDS, outcomeWord } from "../contracts/case-check-words.ts";
import { eligibilityChanges, snapshotEligibility } from "../engine/eligibility-gates.ts";

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  C6.9: ${n}${!c && d !== undefined ? ` — ${JSON.stringify(d)}` : ""}`); };
const ROOT = join(import.meta.dirname, "..");

/** The page's words before P-236. "Eligibility rules" (the A4 rules an author writes, AG-03's gates) is not one. */
const OLD: RegExp[] = [/\blikely eligible\b/i, /\bpossibly eligible\b/i, /\bnot eligible\b/i, /\beligibility\s*\(staff only\)/i, /\bopen eligibility\b/i,
  /\beligibility checks?\b/i, /\beligibility checked\b/i, /\bruns eligibility\b/i, /\bLikely\b/, /\bPossibly\b/,
  // Review m2: the page's old title ("Eligibility · reference") and trail ("› Eligibility", a JSX text of its own).
  /\bEligibility\s*·/, />\s*Eligibility\s*</, /›\s*Eligibility\b/];
/** The one place the words "not eligible" mean something else: the AI launch's count of sources AI does not draft
 *  (api/src/ai.ts action not_eligible; not C6.9's outcome). Named here so any other hit fails. */
const ELSEWHERE = [{ file: "web/src/components/ai-launch.tsx", line: /<Count n=\{p\.totals\.not_eligible\} l="not eligible" \/>/ }];

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css|html)$/.test(f) ? [p] : []; });
const web = files(join(ROOT, "web/src"));
const hits = web.flatMap((p) => readFileSync(p, "utf8").split("\n").flatMap((line, i) => {
  const file = relative(ROOT, p);
  if (ELSEWHERE.some((e) => e.file === file && e.line.test(line))) return [];
  // `not_eligible` and `NOT_ELIGIBLE` are AG-03's codes (stored runs, gates' whenNotMet), never shown as words.
  const text = line.replace(/\b[A-Za-z]*_[A-Za-z_]+\b/g, "");
  return OLD.filter((re) => re.test(text)).map((re) => `${file}:${i + 1} ${re}`);
}));
ok(`pass: no word from before P-236 in web/src (${web.length} files read)`, web.length > 50 && hits.length === 0, hits);
// The scan finds an old word when there is one (so a pass above means something).
ok("fail: the scan catches each old word", ["Likely eligible", "Possibly", "If not met: Not eligible", "Eligibility (staff only)", "Open eligibility", "Run eligibility check", "Eligibility · {c.reference}", '<span className="text-text">Eligibility</span>'].every((w) => OLD.some((re) => re.test(w))));
ok("fail: the A4 rules' own name is not an old word (\"Eligibility rules (staff check)\")", !OLD.some((re) => re.test("Eligibility rules (staff check)")));

ok("pass: the page is \"Case check from confirmed facts\" (P-236)", CASE_CHECK === "Case check from confirmed facts");
ok("pass: the three outcomes are Qualifies · Can't tell yet · Does not qualify", outcomeWord("LIKELY_ELIGIBLE") === "Qualifies" && outcomeWord("POSSIBLY_ELIGIBLE") === "Can't tell yet" && outcomeWord("NOT_ELIGIBLE") === "Does not qualify");
ok("fail: an unknown code is shown as it is, never guessed (and never an object's own key such as 'constructor')", outcomeWord("SOMETHING") === "SOMETHING" && outcomeWord("constructor") === "constructor");

// The page and the dialogs read the words from the one file.
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const page = read("web/src/runtime/eligibility.tsx");
ok("pass: the page's title, card and trail read CASE_CHECK; its outcomes read OUTCOME_WORDS", /\{CASE_CHECK\} · \{caseWords\(c\)\}/.test(page) && /\{CASE_CHECK\} \(staff only\)/.test(page) && /OUTCOME_WORDS\.LIKELY_ELIGIBLE\}\$\{restingWords\(n\)\}/.test(page) && /OUTCOME_WORDS\.NOT_ELIGIBLE\} on this application's rules as written/.test(page));
ok("pass: the A4 dialog's \"If not met\" choices read Does not qualify and Can't tell yet", /not_eligible: OUTCOME_WORDS\.NOT_ELIGIBLE, needs_review: `The representative reviews it \(\$\{OUTCOME_WORDS\.POSSIBLY_ELIGIBLE\}\)`/.test(read("web/src/components/eligibility-gates-editor.tsx")));
ok("pass: the answer-key editor's outcome choices are the page's words", /OUTCOME_WORDS: Record<Outcome, string> = CASE_CHECK_WORDS/.test(read("web/src/components/answer-key-editors.tsx")) && Object.values(OUTCOME_WORDS).includes("Qualifies"));

// The API's history lines (api/src/assessments.ts) say the words, not the codes.
const api = read("api/src/assessments.ts");
ok("pass: the API's history lines name the case check and the outcome in words", /ran the \$\{CASE_CHECK_SHORT\} on case[^`]*: \$\{outcomeWord\(result\.outcome\)\}`/.test(api) && /overrode the \$\{CASE_CHECK_SHORT\} result "\$\{outcomeWord\(b\.fromOutcome\)\}"/.test(api));
ok("fail: no history line lower-cases an outcome code any more (\"likely eligible\")", !/outcome\.toLowerCase\(\)|fromOutcome\.toLowerCase\(\)|eligibility (check|result)/.test(api));

// The engine's change summary for the expert (a gate's "when not met" changed) says Does not qualify.
const g = { key: "x.g", label: "G", condition: { subjectKind: "PERSON", op: "exists", field: "person.x" } };
const lines = eligibilityChanges(snapshotEligibility({ gates: [g], judgement: [], disclaimer: null } as never), snapshotEligibility({ gates: [{ ...g, whenNotMet: "needs_review" }], judgement: [], disclaimer: null } as never));
ok("pass: the change summary reads 'when not met: the representative reviews it; was: does not qualify'", lines.length === 1 && /when not met: the representative reviews it; was: does not qualify\)/.test(lines[0].label), lines);
const added = eligibilityChanges(undefined as never, snapshotEligibility({ gates: [{ ...g, whenNotMet: "needs_review" }], judgement: [], disclaimer: null } as never));
ok("pass: an added review gate reads '(never Does not qualify on its own)'", added.some((l) => /never Does not qualify on its own/.test(l.label)), added);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
