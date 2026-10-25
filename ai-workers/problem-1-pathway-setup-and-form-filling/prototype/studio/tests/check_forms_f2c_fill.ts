// F2c (forms lane, F2 plan §7 BR-6, BR-11, BR-12; challenge M6): the extension's writer on an open portal screen, in
// Chromium on the Sample fixtures. One click fills the plan's empty inputs through each input's own setter and events,
// reads each value back ("Not accepted by the screen" when the page refuses it), leaves an input that already holds an
// answer alone, never touches a hidden or password input and never submits, clicks or saves. No server, no model call.
//   tsx studio/tests/check_forms_f2c_fill.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { build } from "vite";

const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures");
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const TMP = join(STUDIO, "var", "check-forms-f2c-fill"); rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 260)}` : ""}`); };
type Outcome = { id: string; outcome: string; reason?: string };
const PLAN = [
  { id: "familyName", type: "text", label: "Family name", value: "SAMPLE", status: "fill" },
  { id: "givenNames", type: "text", label: "Given name(s)", value: null, status: "not_confirmed" },
  { id: "uci", type: "text", label: "UCI", value: null, status: "you_answer" },
  { id: "sex", type: "select", label: "Sex", value: "ANOTHER", status: "fill" },
  { id: "dobYear", type: "text", label: "Year", value: "1990", status: "fill" },
  { id: "dobMonth", type: "select", label: "Month", value: "05", status: "fill" },
  { id: "dobDay", type: "text", label: "Day", value: "17", status: "fill" },
  { id: "birthCity", type: "text", label: "City or town", value: "Sample City", status: "fill" },
  { id: "birthCountry", type: "select", label: "Country or territory", value: "IND", status: "fill" },
  { id: "_csrf", type: "text", label: "hidden", value: "x", status: "fill" },
  { id: "notOnThisScreen", type: "text", label: "gone", value: "x", status: "fill" },
];

(async () => {
  await build({ configFile: false, logLevel: "silent", build: { lib: { entry: join(STUDIO, "extension", "src", "filler.ts"), formats: ["iife"], name: "XrFill", fileName: () => "filler.js" }, outDir: TMP, emptyOutDir: false, minify: false } });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  // Spies, set before the page's own scripts run: any submit, requestSubmit, button click or navigation is counted.
  await page.addInitScript(`window.__spy = { submit: 0, request: 0, clicks: 0, events: 0 };
    HTMLFormElement.prototype.submit = function () { window.__spy.submit++; };
    const rs = HTMLFormElement.prototype.requestSubmit; HTMLFormElement.prototype.requestSubmit = function () { window.__spy.request++; };
    const ck = HTMLElement.prototype.click; HTMLElement.prototype.click = function () { window.__spy.clicks++; return ck.call(this); };
    document.addEventListener("submit", (e) => { window.__spy.events++; e.preventDefault(); }, true);`);
  const fill = async (file: string, plan = PLAN, before?: (p: typeof page) => Promise<void>) => {
    await page.goto(`file://${join(FIX, file)}`); if (before) await before(page);
    await page.addScriptTag({ path: join(TMP, "filler.js") });
    return page.evaluate((p) => (window as unknown as { XrFill: { fillScreen: (d: Document, p: unknown) => Outcome[] } }).XrFill.fillScreen(document, p), plan);
  };
  const of = (out: Outcome[], id: string) => out.find((x) => x.id === id)!;

  let out = await fill("portal/imm5257-online-s1-personal.html");
  const values = await page.evaluate(() => Object.fromEntries(["familyName", "givenNames", "uci", "sex", "dobYear", "dobMonth", "dobDay", "birthCity", "birthCountry"].map((id) => [id, (document.getElementById(id) as HTMLInputElement).value])));
  ok("C7.4: BR-6 one click fills the plan's empty inputs on the screen, each read back equal", ["familyName", "sex", "dobYear", "dobMonth", "dobDay", "birthCity", "birthCountry"].every((id) => of(out, id).outcome === "filled") && values.familyName === "SAMPLE" && values.sex === "ANOTHER" && values.dobMonth === "05" && values.birthCountry === "IND", values);
  ok("C7.4: BR-8 BR-9 fail: inputs the plan does not fill stay empty (not confirmed, you answer on screen)", of(out, "givenNames").outcome === "not_filled" && of(out, "uci").outcome === "not_filled" && values.givenNames === "" && values.uci === "", [of(out, "givenNames"), of(out, "uci")]);
  ok("C7.4: BR-6 fail: a hidden input and an input not on the screen are never written", of(out, "_csrf").outcome === "not_filled" && of(out, "notOnThisScreen").outcome === "not_filled" && (await page.evaluate(() => (document.querySelector("input[name=_csrf]") as HTMLInputElement).value)) !== "x");
  const spy = await page.evaluate(() => (window as unknown as { __spy: Record<string, number> }).__spy);
  ok("C7.4: BR-6 nothing is submitted, requested, clicked or saved (spied: all 0)", Object.values(spy).every((n) => n === 0), spy);
  ok("C7.4: the input and change events a person's typing fires reach the page (its own checks run)", await page.evaluate(() => { let n = 0; const el = document.getElementById("givenNames")!; el.addEventListener("input", () => n++); el.addEventListener("change", () => n++); return (window as unknown as { XrFill: { fillScreen: (d: Document, p: unknown) => unknown } }).XrFill.fillScreen(document, [{ id: "givenNames", type: "text", label: "g", value: "X", status: "fill" }]) && n; }) === 2);

  out = await fill("portal/imm5257-online-s1-personal.html", PLAN, async (p) => { await p.fill("#familyName", "ALREADY-TYPED"); await p.selectOption("#sex", "MALE"); });
  ok("C7.4: BR-12 an input that already holds an answer is left alone and listed; the others are filled", of(out, "familyName").outcome === "left_alone" && of(out, "sex").outcome === "left_alone" && of(out, "dobYear").outcome === "filled" && (await page.inputValue("#familyName")) === "ALREADY-TYPED" && (await page.inputValue("#sex")) === "MALE", [of(out, "familyName"), of(out, "sex")]);
  out = await fill("portal/blank-placeholder-selected.html", [{ id: "language", type: "select", label: "Language of correspondence", value: "FR", status: "fill" }]);
  ok("C7.4: M6 a select on its placeholder (\"Please select…\" with the value -1, marked selected) counts as empty and is filled", out[0].outcome === "filled" && (await page.inputValue("#language")) === "FR", out);
  out = await fill("portal/blank-placeholder-selected.html", [{ id: "language", type: "select", label: "Language of correspondence", value: "FR", status: "fill" }], async (p) => { await p.selectOption("#language", "EN"); });
  ok("C7.4: M6 fail: the same select on a real choice is left alone", out[0].outcome === "left_alone" && (await page.inputValue("#language")) === "EN", out);

  out = await fill("portal-fill/imm5257-online-s1-rejects-code.html");
  ok("C7.4: BR-11 a value the screen does not keep is \"not accepted by the screen\" (read back differs); the others are filled", of(out, "sex").outcome === "not_accepted" && of(out, "birthCountry").outcome === "filled" && of(out, "familyName").outcome === "filled", [of(out, "sex"), of(out, "birthCountry")]);
  out = await fill("portal-fill/imm5257-online-s1-rejects-code.html", PLAN.map((p) => (p.id === "birthCountry" ? { ...p, value: "PHL" } : p)));
  ok("C7.4: BR-11 fail: a code the page clears on change is never reported filled", of(out, "birthCountry").outcome === "not_accepted", of(out, "birthCountry"));
  const s2 = await page.evaluate(() => (window as unknown as { __submitted?: number }).__submitted ?? 0);
  ok("C7.4: BR-6 the screen's own submit handler never ran", s2 === 0, s2);

  // ──────────────────────────────────────────── CHECK fixes (break M3, m4, m5, B2)
  out = await fill("portal-fill/s1-ambiguous-names.html", [{ id: "familyName", type: "text", label: "Family name", value: "SAMPLE", status: "fill" }, { id: "givenNames", type: "text", label: "Given name(s)", value: "GIVEN", status: "fill" }, { id: "dobDay", type: "text", label: "Day", value: "17", status: "fill" }]);
  const amb = await page.evaluate(() => ({ search: (document.getElementById("q") as HTMLInputElement).value, family: (document.querySelector("#application [name=familyName]") as HTMLInputElement).value, given: (document.querySelector("#application [name=givenNames]") as HTMLInputElement).value, day: (document.getElementById("dobDay") as HTMLInputElement).value }));
  ok("C7.4: break M3 the value goes into the input the reader read, never a search box of the same name", of(out, "familyName").outcome === "filled" && amb.family === "SAMPLE" && amb.search === "", amb);
  ok("C7.4: break m4 a div carrying the id is not the input: the input of that name is filled (not \"already answered\")", of(out, "givenNames").outcome === "filled" && amb.given === "GIVEN", of(out, "givenNames"));
  ok("C7.4: break m5 fail: an input the page hides is not filled", of(out, "dobDay").outcome === "not_filled" && amb.day === "", of(out, "dobDay"));
  out = await fill("portal/imm5257-online-s1-personal.html", [{ id: "sex", type: "text", label: "Sex", value: "FEMALE", status: "fill" }, { id: "familyName", type: "select", label: "Family name", value: "X", status: "fill" }]);
  ok("C7.4: plan §7 (review m9) fail: an element of another kind than the twin recorded (a select for a text, a text for a select) is never written", out.every((o) => o.outcome === "not_filled" && o.reason === "not_the_same_kind_of_input") && (await page.inputValue("#familyName")) === "" && (await page.inputValue("#sex")) === "", out);
  // B2: the screen read before the plan (here: what the saved-page reader gives, which the extension's reader equals,
  // check_forms_f2a.ts) against the page open now.
  const readPy = (f: string) => JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "read_portal_capture.py"), "page", join(FIX, "portal", f)], { encoding: "utf8" }).trim().split("\n").pop()!).screens[0];
  await page.goto(`file://${join(FIX, "portal", "imm5257-online-s1-personal.html")}`); await page.addScriptTag({ path: join(TMP, "filler.js") });
  const check = (expect: unknown) => page.evaluate((e) => (window as unknown as { XrFill: { sameScreen: (d: Document, x: unknown) => boolean } }).XrFill.sameScreen(document, e), expect);
  ok("C7.4: break B2 the page is still the screen the plan was made for: filling goes ahead", await check(readPy("imm5257-online-s1-personal.html")));
  ok("C7.4: break B2 fail: the person moved to another screen (the spouse's) or the screen changed: nothing is filled", !(await check(readPy("imm5257-online-s4-spouse.html"))) && !(await check(readPy("imm5257-online-s1-personal-reworded.html"))));
  await browser.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
