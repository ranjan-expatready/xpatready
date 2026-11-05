// C11.15 form finder, "Choose the page and find again" (founder's test 5 Nov ~13:05 IST): on Super visa › Forms, choosing
// the offered page "Start Up Visa" (148 characters) and Saved or Rules only, Start showed "Too big: expected string to
// have <=120 characters": the dialog put the page address itself in the launch key (web/src/pages/workspace/finder.tsx),
// and the key is 8 to 120 characters (contracts/form-library.ts). Now the key holds a fixed-length fingerprint of the
// address (web/src/pages/workspace/find-key.ts). This check proves, on the loaded demo's Super visa: the exact 148-character address
// and one of over 300 each start (pass) where the old key is refused and starts nothing (fail); the same address twice is
// one run, two addresses are two runs; and the dialog never shows a validator's own message. Saved and Rules only: US$0,
// no model call, canada.ca is the recorded copies.
//   zsh studio/tools/isolated.sh forms_lpk 4451 start && tsx studio/tests/check_finder_long_page_key.ts 4451 xr_studio_forms_lpk
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { FIND_KEY_MAX, FIND_WORDS, findErrorWords, findRunKey } from "../web/src/pages/workspace/find-key.ts";

const PORT = Number(process.argv[2] ?? 4451), DB = process.argv[3] ?? "xr_studio_forms_lpk";
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
type Body = { id?: string; plan_sha256?: string; detail?: string; title?: string; errors?: { field: string; message: string }[]; run?: { id: string; status: string } | null; page_choice?: { candidates: { title: string; url: string }[] } | null };
type Res = { status: number; body: Body };
const call = async (method: string, path: string, body?: unknown): Promise<Res> => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": "user-A", "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: Body = {}; try { j = JSON.parse(t) as Body; } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** What web/src/lib/api.ts makes of a refusal: its detail as the message, its status, its body as the problem. */
const asApiError = (r: Res) => Object.assign(new Error(r.body.detail ?? `${r.status}`), { status: r.status, problem: r.body });
/** The key finder.tsx built before this fix, kept here to prove the server still refuses it. */
const oldKey = (dialog: string, mode: string, url: string) => `s5-${dialog}-${mode}-${url}`;

// The founder's page (the 4th Super visa offer) and a pasted canada.ca address of over 300 characters.
const START_UP = "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/applying-permanent-residence-start-visa.html";
const LONG = `https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/${"applying-permanent-residence-start-visa-".repeat(5)}guide.html`;

(async () => {
  // ======================================================== the key, without a server
  const dialog = randomUUID();
  ok("C11.15 setup: the founder's address is the exact 148 characters; the pasted one is over 300", START_UP.length === 148 && LONG.length > 300, { startUp: START_UP.length, long: LONG.length });
  const k148 = await findRunKey(dialog, "replay", START_UP), k300 = await findRunKey(dialog, "replay", LONG), kNone = await findRunKey(dialog, "replay", undefined);
  ok("C11.15 pass: the key for the 148- and the 300-character address is within the server's 120 characters, and the same length as with no page (it does not grow with the address)", k148.length <= FIND_KEY_MAX && k300.length <= FIND_KEY_MAX && k148.length === k300.length && k300.length === kNone.length, { k148: k148.length, k300: k300.length, none: kNone.length });
  ok("C11.15 fail: the old key for the same addresses is over 120 characters (the cause of the founder's red line)", oldKey(dialog, "replay", START_UP).length > FIND_KEY_MAX && oldKey(dialog, "rules", LONG).length > FIND_KEY_MAX, { old148: oldKey(dialog, "replay", START_UP).length, old300: oldKey(dialog, "rules", LONG).length });
  ok("C11.15 pass: the same dialog, mode and address give the same key (one run however often Start is pressed)", (await findRunKey(dialog, "replay", START_UP)) === k148 && (await findRunKey(dialog, "replay", LONG)) === k300);
  const longer = `${LONG}x`, near = START_UP.replace("start-visa", "start-visb");
  ok("C11.15 fail: another address gives another key: one character longer, one character changed, or the 300-character one", (await findRunKey(dialog, "replay", longer)) !== k300 && (await findRunKey(dialog, "replay", near)) !== k148 && k148 !== k300);
  ok("C11.15 fail: another mode or another dialog gives another key for the same address", (await findRunKey(dialog, "rules", START_UP)) !== k148 && (await findRunKey(randomUUID(), "replay", START_UP)) !== k148);

  // ======================================================== the founder's state: Super visa waits for the page
  const reset = await call("POST", "/demo/reset", { confirm: "RESET" });
  const load = await call("POST", "/demo/load");
  ok("setup: the demo resets and the sample inputs load", reset.status < 300 && load.status === 201, { reset: reset.status, load: load.status });
  const sv = sql("select id from combination where combination_key='sv.super_visa'");
  const runs = () => Number(sql(`select count(*) from ai_batch where operation='find_forms' and scope_label like '${sv}|%'`));
  const ended = async (id: string) => { for (let i = 0; i < 120; i++) { const s = sql(`select status from ai_batch where id='${id}'`); if (!["QUEUED", "RUNNING"].includes(s)) return s; await sleep(500); } throw new Error(`run ${id} did not end within 60 s`); };
  const launch = async (mode: string, pageUrl: string | undefined, idempotencyKey: string) => {
    const plan = await call("POST", `/combinations/${sv}/forms/find/plan`, { mode, ...(pageUrl ? { pageUrl } : {}) });
    if (!plan.body.plan_sha256) throw new Error(`no plan: ${plan.status} ${plan.body.detail}`);
    return call("POST", `/combinations/${sv}/forms/find`, { mode, ...(pageUrl ? { pageUrl } : {}), planSha256: plan.body.plan_sha256, idempotencyKey });
  };
  const first = await launch("rules", undefined, `lpk-first-${randomUUID()}`);
  await ended(first.body.id ?? "");
  const latest = (await call("GET", `/combinations/${sv}/forms/find/latest`)).body;
  ok("setup: a rules-only find on Super visa waits for the application page and offers Start Up Visa among its pages (the founder's state)", latest.run?.status === "NEEDS_PERSON" && !!latest.page_choice?.candidates.some((c) => c.url === START_UP), latest.page_choice?.candidates.map((c) => c.title));

  // ======================================================== 148 characters, Saved and Rules only
  for (const mode of ["replay", "rules"]) {
    const before = runs();
    const refused = await launch(mode, START_UP, oldKey(dialog, mode, START_UP));
    ok(`C11.15 fail (${mode}): the old key with the 148-character address is refused (400) and starts nothing`, refused.status === 400 && runs() === before, { status: refused.status, detail: refused.body.detail });
    const said = findErrorWords(asApiError(refused));
    ok(`C11.15 fail (${mode}): that refusal reads, in the dialog, as what to do, never the validator's message`, said === FIND_WORDS.refused && !/Too big|expected string|characters/.test(said), said);
    const key = await findRunKey(dialog, mode, START_UP);
    const started = await launch(mode, START_UP, key);
    ok(`C11.15 pass (${mode}): the new key with the 148-character address starts one run`, started.status === 201 && !!started.body.id && runs() === before + 1, { status: started.status, detail: started.body.detail });
    const again = await launch(mode, START_UP, key);
    ok(`C11.15 pass (${mode}): the same address twice is one run (Start pressed again answers the same run)`, again.status === 201 && again.body.id === started.body.id && runs() === before + 1, { first: started.body.id, again: again.body.id });
    await ended(started.body.id ?? "");
  }

  // ======================================================== over 300 characters, pasted under "Another canada.ca page"
  const ids: string[] = [];
  for (const mode of ["replay", "rules"]) {
    const before = runs();
    const refused = await launch(mode, LONG, oldKey(dialog, mode, LONG));
    ok(`C11.15 fail (${mode}): the old key with the ${LONG.length}-character address is refused and starts nothing`, refused.status === 400 && runs() === before, { status: refused.status });
    const key = await findRunKey(dialog, mode, LONG);
    const started = await launch(mode, LONG, key);
    ok(`C11.15 pass (${mode}): the new key with the ${LONG.length}-character address starts one run`, started.status === 201 && !!started.body.id && runs() === before + 1, { status: started.status, detail: started.body.detail });
    const again = await launch(mode, LONG, key);
    ok(`C11.15 pass (${mode}): the same long address twice is one run`, again.body.id === started.body.id && runs() === before + 1);
    ids.push(started.body.id ?? "");
    await ended(started.body.id ?? "");
  }

  // ======================================================== two addresses are two runs
  const before = runs();
  const a = await launch("rules", START_UP, await findRunKey(dialog, "rules", START_UP));
  const b = await launch("rules", near, await findRunKey(dialog, "rules", near));
  ok("C11.15 fail: in one dialog, an address already started answers its own run; two addresses (one character apart) are two runs, never the first run again", a.status === 201 && b.status === 201 && !!b.body.id && b.body.id !== a.body.id && runs() === before + 1, { a: a.body.id, b: b.body.id, runs: runs() - before });
  await ended(b.body.id ?? "");
  ok("C11.15: each run reads the page it was started with (the long one's plan holds the whole address)", sql(`select plan->>'page_url' from ai_batch where id='${ids[1]}'`) === LONG && sql(`select plan->>'page_url' from ai_batch where id='${b.body.id}'`) === near);

  // ======================================================== the dialog's words for other refusals
  const other = await call("POST", `/combinations/${sv}/forms/find/plan`, { mode: "rules", pageUrl: "https://example.com/forms.html" });
  const otherSaid = findErrorWords(asApiError(other));
  ok("words pass: a page outside canada.ca keeps the server's own words, which say what to paste", other.status === 400 && /canada\.ca/.test(otherSaid) && otherSaid === other.body.detail, otherSaid);
  const garbled = await call("POST", `/combinations/${sv}/forms/find`, { mode: "rules", planSha256: "x".repeat(64), idempotencyKey: "short" });
  const garbledSaid = findErrorWords(asApiError(garbled));
  ok("words fail: a refusal naming a field a person never sets (the key) reads as what to do, never 'Too small' or a field name", garbled.status === 400 && garbledSaid === FIND_WORDS.refused && !/Too small|idempotency/i.test(garbledSaid), garbledSaid);
  const busy = Object.assign(new Error("The form finder is already running for this combination: watch it, or stop it first."), { status: 409, problem: {} });
  ok("words pass: a refusal the server wrote for a person (409 Already finding) is shown as written", findErrorWords(busy) === busy.message);
  ok("words fail: a server error, a lost connection and an answer with no words of its own each read as what to do", findErrorWords(Object.assign(new Error("Internal server error"), { status: 500 })) === FIND_WORDS.server && findErrorWords(new TypeError("Failed to fetch")) === FIND_WORDS.unreachable && findErrorWords(Object.assign(new Error("404 Not Found"), { status: 404 })) === FIND_WORDS.refused);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
