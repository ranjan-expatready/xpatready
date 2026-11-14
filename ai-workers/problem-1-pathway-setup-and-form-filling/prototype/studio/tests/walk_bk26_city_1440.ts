// BK-26 walk, by screens at 1440 px, as the officer does it: the Study permit's Sample case (made by BK-13's replay on
// this copy: run tests/check_bk13_zero_code_run.ts first), the student's Paper IMM 1294. (1) The copy lists no form field
// to write by hand for the study's city and nothing "not on this form": the city (question 1 d, a list the form fills from the
// province) is written from the form's own list. (2) The officer changes the school's city to one that is not in the
// province's list (MONTREAL, with ON) on the officer's own routes, and generates a copy again with the button: the copy
// says, in words, that the answer is not on this form and nothing is written. Axe and no sideways scroll on each state.
// Sample people, made up; US$0 (live AI off).
//   zsh studio/tools/isolated.sh forms_bk26 4461 start && tsx studio/tests/check_bk13_zero_code_run.ts 4461 xr_studio_forms_bk26 \
//     && tsx studio/tests/walk_bk26_city_1440.ts 4461 xr_studio_forms_bk26 [shots folder]
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2]), DB = process.argv[3], SHOTS = process.argv[4] ?? null;
if (!PORT || PORT === 4400 || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port of an isolated copy, never 4400> <its database> [shots folder]"); process.exit(2); }
const STUDIO = join(import.meta.dirname, "..");
const BREW = "/opt/homebrew/opt/postgresql@18/bin/psql", PSQL = process.env.PSQL || (existsSync(BREW) ? BREW : "psql");
const sql = (q: string) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const { call } = client(PORT, DB);
const { ok, summary } = recorder();
const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");
const OFFICER = "user-O", T = { timeout: 60_000 };
const ref = (JSON.parse(readFileSync(join(STUDIO, "samples", "sample-cases.json"), "utf8")).cases["sp.outside"] as { reference: string }).reference;
const caseId = sql(`select id from runtime_case where reference='${ref}' order by created_at desc limit 1`);
if (!caseId) { console.error(`no Sample case ${ref} on this copy: run tests/check_bk13_zero_code_run.ts first`); process.exit(2); }
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((a) => { localStorage.setItem("xr-actor", a); }, OFFICER);
  const r: Page = await ctx.newPage();
  const errors: string[] = [];
  r.on("pageerror", (e) => errors.push(e.message));
  let n = 0;
  const shot = async (name: string) => { if (SHOTS) await r.screenshot({ path: join(SHOTS, `${String(++n).padStart(2, "0")}-${name}-1440.png`), fullPage: false }); };
  const axe = async (name: string) => {
    const a = await new AxeBuilder({ page: r }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    ok(`BK-26 axe: ${name} has no WCAG A/AA violation`, a.violations.length === 0, a.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`).join(" | "));
    ok(`BK-26: ${name} has no sideways scroll at 1440 px`, !(await r.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  };
  const row = () => r.locator("li").filter({ has: r.getByRole("heading", { name: /^IMM 1294 for Student A/ }) }).first();

  // (1) The copy BK-13 made: the city is not among the form fields to write by hand, and nothing is refused.
  await r.goto(`http://localhost:${PORT}/cases/${caseId}`);
  await row().waitFor(T); await row().scrollIntoViewIfNeeded();
  const text1 = (await row().innerText()).replace(/\s+/g, " ");
  const byHand1 = /To write by hand in Adobe: ([^]*?)(?:\.\s|$)/.exec(text1)?.[1] ?? "";
  ok(`BK-26: the student's IMM 1294 copy leaves the city to nobody: not in "To write by hand" (${byHand1.slice(0, 160) || "none"}), nothing "not on this form" (${/Copy of [^·]+·[^·]*form fields written[^·]*/.exec(text1)?.[0] ?? "no copy line"})`,
    /form fields written/.test(text1) && !/City\/Town/i.test(byHand1) && !/Not on this form/.test(text1), text1.slice(0, 600));
  await shot("student-imm1294-city-written"); await axe("the case page with the written copy");

  // (2) The officer changes the school's city to one outside ON's list, confirms, and generates a copy again.
  type Sec = { subjectId: string; section: string; questions: { fact: string; answer?: { id?: string; value?: unknown } | null }[] };
  const view = async () => ((await call("GET", `/runtime/cases/${caseId}/questionnaire?mode=agent`, undefined, OFFICER)).body?.sections ?? []) as Sec[];
  const sec = (await view()).find((s) => s.questions.some((q) => q.fact === "case.school_address"));
  const now = sec?.questions.find((q) => q.fact === "case.school_address")?.answer;
  const put = sec ? await call("PUT", `/runtime/cases/${caseId}/answers/${sec.subjectId}/case.school_address`, { value: { ...(now?.value as object), city: "MONTREAL" }, expectedId: now?.id ?? null }, OFFICER) : { status: 0, body: null };
  const after = (await view()).find((s) => s.section === sec?.section && s.subjectId === sec?.subjectId);
  const seen = (after?.questions ?? []).map((q) => q.answer?.id).filter((x): x is string => !!x);
  const conf = sec ? await call("POST", `/runtime/cases/${caseId}/sections/${sec.section}/confirm`, { subjectId: sec.subjectId, seen }, OFFICER) : { status: 0 };
  ok("BK-26 setup: the officer answers the school's city MONTREAL (province still ON) and confirms the section", put.status < 300 && conf.status < 300, { put: put.status, body: JSON.stringify(put.body).slice(0, 200), conf: conf.status });
  await r.reload(); await row().waitFor(T); await row().scrollIntoViewIfNeeded();
  await row().getByRole("button", { name: /Generate a (new )?copy|Generate again/ }).first().click(T);
  const refused = row().locator("[data-not-on-form]");
  await refused.waitFor(T).catch(() => null);
  const text2 = (await refused.innerText().catch(() => "")).replace(/\s+/g, " ");
  ok(`BK-26: the new copy refuses the city in words and writes nothing ("${text2.slice(0, 260)}")`,
    /"MONTREAL" is not in the form's own list of choices for "Province" ON/.test(text2) && /nothing is written/.test(text2), text2);
  await refused.scrollIntoViewIfNeeded().catch(() => null);
  await shot("student-imm1294-city-refused"); await axe("the case page with the refused city");
  ok("BK-26: no page error on the walk", errors.length === 0, errors);
} finally { await browser.close(); }
process.exit(summary() ? 1 : 0);
