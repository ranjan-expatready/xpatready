// QA-16 (Gap, Minor; P-63 plain words for forms): "box" and "box map" are retired on screens. Lists every visible
// string in the web app and every API message (what reaches a screen) that still says box / boxes / data boxes.
// Static check, no server. Code names (variables, keys, the "Boxes" icon, checkbox) are not counted.
// FAILS today (main 65826022); PASSES when no screen text or message says "box".
//   tsx studio/tests/qa/check_qa16_box_words.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const STUDIO = join(import.meta.dirname, "..", "..");
const files = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mts)$/.test(n) ? [p] : []; });
const WORD = /\b(data )?box(es| maps?)?\b/i;
// Visible text: JSX text between tags, or a quoted string / template literal that reads as words (has a space).
const PIECES = /(>[^<>{}]*<)|("[^"\n]*")|('[^'\n]*')|(`[^`]*`)/g;
const hits: string[] = [];
for (const f of [...files(join(STUDIO, "web", "src")), ...files(join(STUDIO, "api", "src"))]) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (/^\s*(\/\/|\*|import )/.test(line)) return;
    for (const m of line.matchAll(PIECES)) {
      const t = m[0];
      if (!/\s/.test(t) || /checkbox|className|lucide/i.test(t)) continue;
      if (WORD.test(t.replace(/\$\{[^}]*\}/g, ""))) { hits.push(`${relative(STUDIO, f)}:${i + 1}  ${t.slice(0, 110)}`); break; }
    }
  });
}
for (const h of hits) console.log(`      ${h}`);
const web = hits.filter((h) => h.startsWith("web/")).length, api = hits.length - web;
console.log(`${hits.length ? "FAIL" : "PASS"}  QA-16: no screen text or API message says "box" (P-63) — ${web} in the web app, ${api} in API messages`);
process.exit(hits.length ? 1 : 0);
