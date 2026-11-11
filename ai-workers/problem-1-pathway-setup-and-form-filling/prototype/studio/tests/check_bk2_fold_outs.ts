// BK-2 (P-447 (2), Bake plan row 2): every fold-out of the web app shows the same arrow, pointing right when closed and down
// when open, so a person sees there is more inside. One shared piece, web/src/components/fold-out.tsx: FoldOut (native
// <details>/<summary>) and FoldArrow (for a fold-out opened by its own button, which carries aria-expanded). This scan
// fails when a fold-out is added without it: a raw <details>/<summary> anywhere else in web/src, an element with
// aria-expanded and no FoldArrow that is not a listed non-fold-out (a combobox, a button that opens a form), or a
// hand-drawn chevron (an open/closed pair, or one turned by a class). A listed exception that is gone fails too, so the
// list stays true. What a code search cannot see: a toggle with neither aria-expanded nor a chevron (a bare
// `onClick={() => setOpen(!open)}` around plain text); the reviewer reads for those, and the browser check
// (check_bk2_fold_outs_browser.cjs) sweeps the set-up screens. Reads the source only: no server, no database, no
// model call (US$0).
//   tsx --tsconfig api/tsconfig.json tests/check_bk2_fold_outs.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const STUDIO = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(STUDIO, "web/src");
const SHARED = "components/fold-out.tsx";
let pass = 0, failed = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { if (cond) pass++; else failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`); };

/** Elements with aria-expanded that are not fold-outs: each named by its file and a piece of its line, with the reason. */
export const NOT_FOLD_OUTS: { file: string; on: string; why: string }[] = [
  { file: "components/add-to-structure.tsx", on: 'role="combobox"', why: "a combobox: aria-expanded tells that its list of choices is showing" },
  { file: "runtime/add-form.tsx", on: 'role="combobox"', why: "a combobox: aria-expanded tells that its list of choices is showing" },
  { file: "components/own-questions.tsx", on: "data-own-ask", why: "an action: opens the form to ask the field as its own question" },
  { file: "components/rule-facts.tsx", on: ">Add the fact this rule needs<", why: "an action: opens the form to add a fact" },
  { file: "components/rule-facts.tsx", on: ">Work it out instead<", why: "an action: opens the form to work the fact out" },
  { file: "components/rule-facts.tsx", on: ">Add a fact a rule needs<", why: "an action: opens the form to add a fact" },
  { file: "pages/job.tsx", on: "data-accept", why: "an action: Accept, or opens the reason form for a near match" },
  { file: "pages/job.tsx", on: ">Decide<", why: "an action: opens the decision form for one form field" },
  { file: "runtime/release-update.tsx", on: "Show the first", why: "a longer list (show all n / show the first n), like the other show-all buttons, not a fold-out section" },
];

/** Code on one line, comments left out. */
export const codeOf = (line: string) => /^\s*(\*|\/\*|\/\/)/.test(line) ? "" : line.replace(/\s\/\/ .*$/, "");
/** A raw native fold-out outside the shared piece. */
export const RAW = /<(details|summary)(\s|>|$)/;
/** An open/closed pair of chevrons drawn by hand instead of FoldArrow. */
export const HAND_ARROW = /<Chevron(Down|Right|Up)\b[^>]*\/>\s*\)?\s*:\s*\(?\s*<Chevron(Down|Right|Up)\b|<Chevron(Down|Right|Up)\b[^>]*\brotate-/;
/** The element that carries aria-expanded on line i: from its own `<` to its closing tag (or the end of a
 *  self-closing tag), at most six lines; its children are inside, the next element is not. */
export function elementAt(lines: string[], i: number): string {
  const code = codeOf(lines[i]), at = code.search(/\baria-expanded=/);
  const text = code.slice(Math.max(0, code.lastIndexOf("<", at))) + "\n" + lines.slice(i + 1, i + 6).map(codeOf).join("\n");
  const close = text.match(/<\/(button|Button|summary|a)>/);
  if (close?.index !== undefined) return text.slice(0, close.index + close[0].length);
  const self = text.indexOf("/>");
  return self >= 0 ? text.slice(0, self) : text;
}
/** The element shows FoldArrow among its own children. */
export const hasArrow = (lines: string[], i: number) => /<FoldArrow\b/.test(elementAt(lines, i));

// The rules themselves, on lines the scan must and must not catch.
ok("BK-2 fail: a raw <details> is caught", RAW.test(codeOf(`<details className="mt-1"><summary>More</summary></details>`)));
ok("BK-2 pass: the word details in a comment or a data attribute is not a fold-out", !RAW.test(codeOf(`// a native <details> drawer`)) && !RAW.test(codeOf(`<div data-details-open>`)));
ok("BK-2 fail: a hand-drawn chevron pair is caught", HAND_ARROW.test(`{open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}`) && HAND_ARROW.test(`{c ? (open ? <ChevronDown /> : <ChevronRight />) : null}`));
ok("BK-2 pass: one chevron in a breadcrumb or a Next button is not a fold-out", !HAND_ARROW.test(`<Link to="/ai">AI work</Link><ChevronRight className="size-3" /><span>`));
ok("BK-2 fail: aria-expanded without FoldArrow is caught", !hasArrow([`<button aria-expanded={open} onClick={t}>`, `<span>Section</span>`, `</button>`], 0));
ok("BK-2 pass: aria-expanded with FoldArrow among its children", hasArrow([`<button aria-expanded={open} onClick={t}>`, `<FoldArrow open={open} /><span>Section</span>`], 0));
ok("BK-2 fail (review m1): a <details> whose attributes start on the next line is caught", RAW.test(codeOf(`      <details`)) && RAW.test(codeOf(`<summary`)));
ok("BK-2 fail (review m2): one chevron turned by a class is caught", HAND_ARROW.test(`<ChevronRight className={cn("size-4", open && "rotate-90")} />`));
ok("BK-2 fail (review m3): a FoldArrow of the next element does not count for a bare button", !hasArrow([`<button aria-expanded={open} onClick={t}>More</button>`, `<button aria-expanded={o2} onClick={u}><FoldArrow open={o2} />Other</button>`], 0));
ok("BK-2 fail (review m3): an exception's words elsewhere on the line do not excuse another button", !elementAt([`<p>Show the first 5</p><button aria-expanded={open} onClick={t}>More</button>`], 0).includes("Show the first"));

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.tsx?$/.test(n) ? [f] : []; });
const raw: string[] = [], hand: string[] = [], noArrow: string[] = [], used = new Set<number>();
let foldOuts = 0, arrows = 0;
for (const f of walk(WEB)) {
  const rel = relative(WEB, f).split("\\").join("/");
  if (rel === SHARED) continue;
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    const code = codeOf(line), at = `${rel}:${i + 1}`;
    foldOuts += (code.match(/<FoldOut\b/g) ?? []).length;
    arrows += (code.match(/<FoldArrow\b/g) ?? []).length;
    if (RAW.test(code)) raw.push(at);
    if (HAND_ARROW.test(code)) hand.push(at);
    if (/\baria-expanded=/.test(code) && !hasArrow(lines, i)) {
      const el = elementAt(lines, i);
      const k = NOT_FOLD_OUTS.findIndex((x) => x.file === rel && el.includes(x.on));
      if (k >= 0) used.add(k); else noArrow.push(`${at}: ${code.trim().slice(0, 120)}`);
    }
  });
}
const shared = readFileSync(join(WEB, SHARED), "utf8"), css = readFileSync(join(WEB, "styles/index.css"), "utf8");
ok("BK-2 pass: the shared fold-out is native <details>/<summary> with the arrow, which turns down while open", /<details data-fold\b/.test(shared) && /<summary\b[^>]*><FoldArrow\b/.test(shared) && /details\[data-fold\]\[open\] > summary > \[data-fold-arrow\] \{ rotate: 90deg; \}/.test(css) && /details\[data-fold\] > summary \{ list-style: none; \}/.test(css));
ok("BK-2 pass: no raw <details> or <summary> outside the shared fold-out", raw.length === 0, raw);
ok("BK-2 pass: no hand-drawn open/closed chevrons (fold-outs opened by a button use FoldArrow)", hand.length === 0, hand);
ok("BK-2 pass: every element with aria-expanded shows FoldArrow or is a listed non-fold-out", noArrow.length === 0, noArrow);
const stale = NOT_FOLD_OUTS.filter((_, k) => !used.has(k)).map((x) => `${x.file} ${x.on}`);
ok("BK-2 pass: every listed non-fold-out is still there (the list stays true)", stale.length === 0, stale);
ok("BK-2 pass: the 31 native fold-outs counted on main (8fc65d0b9) all use the shared piece", foldOuts >= 31, { foldOuts });
console.log(`      FoldOut ${foldOuts} · FoldArrow ${arrows} · listed non-fold-outs ${NOT_FOLD_OUTS.length}`);
console.log(`${pass}/${pass + failed} passed`);
process.exit(failed ? 1 : 0);
