// C3.10 acceptance (qa/CAPABILITIES.md C3.10; P-63; PRODUCT.md §4 words: "Form field · Field map (P-63) | Not: box, box
// map"): "Every screen and message says form field, shared field and field map; never box." Written 3 Nov (F6, P-290)
// from the row: until then C3.10 named no check (qa walks only).
// Part 1, screens: every studio page and each combination's tabs on the six (as a person loads them from the Demo menu),
// as the configuration author at 1440 px: the text a person reads (with button names, tooltips and placeholders) never
// says box, boxes, box map or canonical; the screens say "form field", "shared field" and "field map".
// "Search box", "check box" and "tick the box" (a control, not a form field) are not this rule.
// Part 2, messages: every message the API, the engine and the web app can show is read from the source (string literals
// and on-screen text that read as words): none says box, boxes, box map or canonical in the form-field sense. A hit names
// its file and line. A drop-down, a tick box or a number field on the official PDF is a form field too (PRODUCT §4: "a
// fillable spot on a PDF"), so "its drop-down boxes" or "its boxes are mandatory" counts; a control of our own screens
// ("search box", "tick the box" for a declaration) does not.
// No model call (US$0). Exit 0 = all pass, 1 = a failure, 2 = setup missing.
//   zsh studio/tools/isolated.sh accept 4475 start && tsx studio/acceptance/C3.10.test.ts 4475 xr_studio_accept
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { TABS } from "../contracts/workspace.ts";
import { AUTHOR, pack2, run } from "./lib/pack2.ts";
import { walker } from "./lib/browser.ts";

const T = pack2("C3.10");
const { call, sql, ok } = T;
/** The form-field sense: box, boxes, box map, canonical; not a search box, a check box or "tick the box" (a control). */
const BAD = /(?<!\b(?:search|check|text|dialog|combo|list|select|input|tick the)[ -])\b(box(?:es)?|box maps?|canonical)\b/i;
const badIn = (s: string) => s.split(/\n+/).map((l) => l.trim()).filter((l) => BAD.test(l));

run(async () => {
  await T.ready();
  const STUDIO = join(import.meta.dirname, "..");
  // ---------------------------------------------------------------- part 1: screens
  const combos = ["vv.single", "wp.lmia_inside", "fs.spouse"].map((k) => ({ key: k, id: T.combo(k) })).filter((c) => c.id);
  ok("setup: three combinations of the six are loaded (Visitor visa, With an LMIA – inside Canada, Spouse)", combos.length === 3, combos.map((c) => c.key));
  const field = sql("select canonical_field_key from canonical_field order by canonical_field_key limit 1");
  const pages = ["/", "/structure", "/review", "/review/proposals", "/library/forms", "/library/fields", ...(field ? [`/library/fields/${encodeURIComponent(field)}`] : []), "/library/sections", "/library/checks", "/library/documents", "/library/rules", "/release", "/releases", "/ai", "/activity",
    ...combos.flatMap((c) => TABS.map((t) => `/c/${c.id}/${t.key}`))];
  const W = await walker(`http://localhost:${T.PORT}`);
  const p = await W.open(AUTHOR);
  const hits: string[] = [], said = new Map<string, string>();
  for (const url of pages) {
    await p.goto(url);
    await W.settle(p, url);
    const words = await W.text(p);
    said.set(url, words);
    for (const h of badIn(words)) hits.push(`${url}: ${h.slice(0, 120)}`);
  }
  ok(`C3.10 pass: ${pages.length} pages read (${pages.length - combos.length * TABS.length} studio pages, ${combos.length} combinations × ${TABS.length} tabs), none blank`, [...said.values()].every((w) => w.trim().length > 40), [...said.entries()].filter(([, w]) => w.trim().length <= 40).map(([u]) => u));
  ok("C3.10 pass: no page says box, boxes, box map or canonical (form-field sense)", hits.length === 0, { count: hits.length, first: hits.slice(0, 6) });
  // PRODUCT §4: the library master is a "Field"; "shared field" is what fills a form field (the field map's words).
  const all = [...said.values()].join("\n"), where = (re: RegExp) => [...said.entries()].filter(([, w]) => re.test(w)).map(([u]) => u).slice(0, 3);
  ok("C3.10 pass: the screens say \"form field\"", /form fields?\b/i.test(all), where(/form fields?\b/i));
  ok("C3.10 pass: the screens say \"shared field\"", /shared fields?\b/i.test(all), where(/shared fields?\b/i));
  ok("C3.10 pass: the screens say \"field map\"", /field maps?\b/i.test(all), where(/field maps?\b/i));
  ok("C3.10 data: no page error while walking", W.errors.length === 0, W.errors.slice(0, 3));
  await W.close();

  // ---------------------------------------------------------------- part 2: messages (read from the source)
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const f = join(d, n); return statSync(f).isDirectory() ? walk(f) : /\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n) ? [f] : []; });
  const msgHits: string[] = [];
  for (const dir of ["api/src", "engine", "contracts", "web/src"]) for (const f of walk(join(STUDIO, dir))) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\*|\/\*|\/\/)/.test(line)) return; // comments
      const code = line.replace(/\s\/\/ .*$/, "");
      const texts = [...code.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`|>([^<>{}\n]+)</g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\$\{[^}]*\}/g, "X"))
        .filter((s) => /[A-Za-z]{2,} [A-Za-z]{2,} [A-Za-z]{2,}/.test(s) && !/[;=]>|\)\)|\bconst\b|\breturn\b/.test(s)); // words a person reads, not code
      for (const s of texts) if (BAD.test(s)) msgHits.push(`${relative(STUDIO, f)}:${i + 1}: ${s.trim().slice(0, 110)}`);
    });
  }
  ok("C3.10 pass: no message the API, the engine or the web app can show says box, boxes, box map or canonical", msgHits.length === 0, { count: msgHits.length, all: msgHits });
  if (msgHits.length) for (const h of msgHits) console.log(`      ${h}`);
  T.done();
});
