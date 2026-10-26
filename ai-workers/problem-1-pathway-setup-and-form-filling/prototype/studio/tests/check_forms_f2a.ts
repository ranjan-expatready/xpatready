// F2a (forms lane, F2 plan §5 E-6, BR-1, BR-2; challenge M1): the two portal-screen readers agree. The saved-page reader
// (tools/read_portal_capture.py, Python) and the extension's reader of the live page (extension/src/reader.ts, in the
// browser) read every portal fixture; on the same screen made blank they must give the identical structure, refuse
// the same client details and not read the same custom controls. The extension's reader never reads an answer: a
// screen typed into in the browser reads exactly as the saved blank screen. Stop rule (plan §3 M1): if this check
// fails on a fixture, F2 stops and the Lead is told before any fill code. No server, no model call (US$0).
//   tsx studio/tests/check_forms_f2a.ts
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { build } from "vite";

const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal");
// P-98: the Sample APR-style screens too (labels named by aria-labelledby); their live-only pages (live-*) are checked
// in the browser by check_forms_apr.ts, since a saved page has no components, frames or layout.
const APR = join(STUDIO, "tests", "fixtures", "portal-apr");
const TMP = join(STUDIO, "var", "check-forms-f2a"); rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Read = { ok: boolean; screens?: { title: string; inputs: unknown[] }[]; refused?: { id: string | null; why: string }[]; error?: string };
const py = (file: string): Read => JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "read_portal_capture.py"), "page", file], { encoding: "utf8" }).trim().split("\n").pop()!);
const kind = (r: Read) => (r.ok ? "read" : r.refused ? "refused" : "not read");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The extension's reader as one script for a page (the same source the extension's build bundles). */
async function bundle(name: string, rules?: string) {
  const reader = join(STUDIO, "extension", "src", "reader.ts");
  await build({ configFile: false, logLevel: "silent", resolve: rules ? { alias: [{ find: /^.*portal-reader-rules\.json$/, replacement: rules }] } : undefined,
    build: { lib: { entry: reader, formats: ["iife"], name: "XrReader", fileName: () => `${name}.js` }, outDir: TMP, emptyOutDir: false, minify: false } });
  return join(TMP, `${name}.js`);
}
/** The same screen made blank: every answer the saved-page reader would refuse is removed, the structure kept. */
const blankHtml = (page: Page) => page.evaluate(() => {
  for (const i of Array.from(document.querySelectorAll("input"))) { if (["radio", "checkbox"].includes((i.getAttribute("type") ?? "").toLowerCase())) i.removeAttribute("checked"); else if (!["hidden", "submit", "button", "reset", "image"].includes((i.getAttribute("type") ?? "").toLowerCase())) i.removeAttribute("value"); }
  for (const o of Array.from(document.querySelectorAll("option"))) o.removeAttribute("selected");
  for (const t of Array.from(document.querySelectorAll("textarea"))) t.textContent = "";
  for (const e of Array.from(document.querySelectorAll("[contenteditable]"))) if ((e.getAttribute("contenteditable") || "true").toLowerCase() !== "false") e.textContent = "";
  for (const e of Array.from(document.querySelectorAll("[aria-checked],[aria-selected],[aria-pressed]"))) for (const a of ["aria-checked", "aria-selected", "aria-pressed"]) if (e.hasAttribute(a)) e.setAttribute(a, "false");
  for (const e of Array.from(document.querySelectorAll("[aria-valuenow],[aria-valuetext]"))) { e.removeAttribute("aria-valuenow"); e.removeAttribute("aria-valuetext"); }
  return `<!DOCTYPE html>\n${document.documentElement.outerHTML}`;
});

(async () => {
  const script = await bundle("reader");
  const browser = await chromium.launch({ channel: "chrome", headless: true }); // as the other browser checks (the cloud image links its Chromium there)
  const page = await browser.newPage();
  const ext = async (file: string, script_ = script): Promise<Read> => {
    await page.goto(`file://${file}`); await page.addScriptTag({ path: script_ });
    return page.evaluate(() => (window as unknown as { XrReader: { readScreen: (d: Document) => Read } }).XrReader.readScreen(document));
  };

  // ──────────────────────────────────────────── C2.9 BR-2: every fixture, both readers
  const files = [...readdirSync(FIX).filter((f) => f.endsWith(".html")).sort().map((f) => [FIX, f]), ...readdirSync(APR).filter((f) => /^apr-.*\.html$/.test(f)).sort().map((f) => [APR, f])];
  for (const [dir, f] of files) {
    const e = await ext(join(dir, f));
    const blank = join(TMP, `blank-${f}`); writeFileSync(blank, await blankHtml(page));
    const p = py(blank), pFile = py(join(dir, f));
    const agree = kind(e) === kind(p) && (!e.ok || same(e.screens, p.screens));
    ok(`C2.9: BR-2 ${f}: the extension's reading equals the saved-page reader's reading of the same screen made blank (${kind(e)})`, agree, agree ? (e.ok ? `${e.screens![0].inputs.length} inputs` : e.error ?? e.refused?.[0]?.why) : { extension: e, saved_page: p });
    if (pFile.ok) ok(`C2.9: BR-2 ${f}: a blank screen read from the saved file and from the page give the same structure`, same(pFile.screens, p.screens));
    else ok(`C2.9: BR-1 ${f}: the saved-page reader refuses or does not read it (${pFile.refused?.[0]?.why ?? pFile.error}); the extension never gives a structure holding an answer`, !e.ok || !JSON.stringify(e).includes("SAMPLE"), e.ok ? "read, no answer in it" : e.error ?? e.refused?.[0]?.why);
  }

  // P-98: a question named by aria-labelledby takes the words it points to in both readers, never the element id.
  const named = (r: Read) => (r.screens?.[0]?.inputs as { id: string; label: string }[] | undefined)?.find((i) => i.id === "familyName")?.label;
  const aprS2 = join(APR, "apr-vv-s02-personal.html"), aprE = await ext(aprS2), aprP = py(aprS2);
  ok("C2.9: P-98 an APR question named by aria-labelledby reads its words in both readers", named(aprE) === "Family name (as shown on your passport or travel document)" && named(aprP) === named(aprE), { extension: named(aprE), saved_page: named(aprP) });
  writeFileSync(join(TMP, "no-labelledby.html"), readFileSync(aprS2, "utf8").replace(/ aria-labelledby="[^"]*"/g, ""));
  const plain = await ext(join(TMP, "no-labelledby.html"));
  ok("C2.9: P-98 fail: the same screen without aria-labelledby leaves the UCI with no label, so the live reader says \"not read\" (never \"uci\" sent as a question)", !plain.ok && /no label the reader can find \(uci/.test(plain.error ?? ""), plain.error ?? plain.ok);

  // ──────────────────────────────────────────── C2.9 BR-1: a screen typed into in the browser reads as the blank screen
  const s1 = join(FIX, "imm5257-online-s1-personal.html");
  await page.goto(`file://${s1}`);
  await page.fill("#familyName", "SAMPLE-PERSON"); await page.fill("#givenNames", "SAMPLE"); await page.fill("#uci", "12345678");
  await page.selectOption("#sex", "FEMALE"); await page.fill("#dobYear", "1990"); await page.selectOption("#dobMonth", "05"); await page.selectOption("#birthCountry", "IND");
  await page.addScriptTag({ path: script });
  const typed: Read = await page.evaluate(() => (window as unknown as { XrReader: { readScreen: (d: Document) => Read } }).XrReader.readScreen(document));
  ok("C2.9: BR-1 s1 typed into (a name, a UCI, a date, three choices): the extension reads the same structure as the saved blank s1, and no answer", typed.ok && same(typed.screens, py(s1).screens) && !/SAMPLE|12345678|1990/.test(JSON.stringify(typed)), typed.ok ? "same" : typed);
  // Passed as text: tsx names inner functions with a helper that does not exist in the page.
  const spied = await page.evaluate(`(() => {
    let reads = 0;
    for (const [proto, prop] of [[HTMLInputElement.prototype, "value"], [HTMLInputElement.prototype, "checked"], [HTMLSelectElement.prototype, "value"], [HTMLSelectElement.prototype, "selectedIndex"], [HTMLOptionElement.prototype, "selected"], [HTMLTextAreaElement.prototype, "value"]]) {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      Object.defineProperty(proto, prop, { ...d, get() { reads++; return d.get.call(this); } });
    }
    XrReader.readScreen(document);
    return reads;
  })()`) as number;
  ok("C2.9: BR-1 the extension's reader never reads value, checked, selected or selectedIndex (spied: 0 reads)", spied === 0, spied);

  // ──────────────────────────────────────────── C2.9 BR-2 fail: a rule changed on one side only is caught
  const rules = JSON.parse(readFileSync(join(STUDIO, "contracts", "portal-reader-rules.json"), "utf8"));
  const drifted = join(TMP, "drifted-rules.json"); writeFileSync(drifted, JSON.stringify({ ...rules, client_data: rules.client_data.slice(0, 2) }));
  const driftScript = await bundle("reader-drifted", drifted);
  const passport = join(FIX, "hostile-option-passport.html");
  const d = await ext(passport, driftScript), p = py(passport);
  ok("C2.9: BR-2 fail: an extension built with one client-detail rule fewer reads a screen the saved-page reader refuses (the check above would fail)", d.ok && !p.ok, { drifted: kind(d), saved_page: kind(p) });
  const pySrc = readFileSync(join(STUDIO, "tools", "read_portal_capture.py"), "utf8"), tsSrc = readFileSync(join(STUDIO, "extension", "src", "reader.ts"), "utf8");
  ok("C2.9: BR-2 both readers take their rules from the one file (no second copy of a pattern)", /portal-reader-rules\.json/.test(pySrc) && /portal-reader-rules\.json/.test(tsSrc) && !/A-Z\]\{1,2\}/.test(pySrc) && !/A-Z\]\{1,2\}/.test(tsSrc));

  await browser.close();
  cpSync(join(TMP, "reader.js"), join(TMP, "reader-last.js"));
  writeFileSync(join(TMP, "check_forms_f2a.json"), JSON.stringify({ pass, fail, log }, null, 1));
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
