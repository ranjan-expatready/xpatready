// C5.4 acceptance (qa/CAPABILITIES.md C5.4; P-240, P-279; G1 concept screens/G1-source-register/concept.md): "A release
// is refused while any published number has neither a source-register entry nor 'None published – set by ExpatReady';
// the refusal names each item; cut-off and in-force dates count as published numbers that need a source." Written 3 Nov
// (F6, P-290) when the release with its sources became reachable from the Demo menu on the six (the re-test of 1a79dbf9
// found it only on the suites' fixture, which the menu never loads).
// As a person: Demo › Reset to the six, then Demo › Start With an LMIA from its reviewed release, which loads the reviewed
// setup as a draft (P-322: it releases nothing), lands on With an LMIA – inside Canada's Review and release tab:
// "Numbers without a source (n)", grouped by item, each with Add source, and Submit is held. Underneath: Submit is
// refused naming every item; a Sample answer is refused on this source-backed combination; once every number has its
// official source or "None published" (test words, through the API as the Source panel saves them), its "no source"
// problems are gone and Submit is no longer refused for them, while C5.5's answer-key gate still refuses it, one line
// per new field map (a first source-backed release needs tests the immigration expert signs; A3, P-322: no Release 1
// here, release-step evidence is on the configured checkpoint).
// A screenshot of the tab goes to studio/var/acceptance/C5.4-six-review-1440.png (the one committed for the PR is
// product/screens/G1-source-register/screenshots/c54-six-review-1440.png).
// No model call (US$0). Exit 0 = all pass, 1 = a failure, 2 = setup missing.
//   zsh studio/tools/isolated.sh accept 4476 start && tsx studio/acceptance/C5.4.test.ts 4476 xr_studio_accept
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { sourceEveryNumber } from "../tests/fixtures/source-every-number.cjs";
import { APPROVER, AUTHOR, pack2, run } from "./lib/pack2.ts";
import { walker } from "./lib/browser.ts";

const T = pack2("C5.4");
const { call, sql, ok, words } = T;
const SHOT = join(import.meta.dirname, "..", "var", "acceptance"); // a run never rewrites the committed screenshot (review m5)

run(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  if (!served) { console.error(`STOP  no studio answers on port ${T.PORT}`); process.exit(2); }
  const W = await walker(`http://localhost:${T.PORT}`);
  const p = await W.open(AUTHOR);
  const demo = async (name: RegExp) => {
    await p.getByRole("button", { name: /^Demo/ }).click();
    const it = p.getByRole("menuitem", { name });
    await it.waitFor({ timeout: 10_000 });
    await it.click();
  };

  // ---------------------------------------------------------------- Demo › Reset to the six (through the menu)
  await p.goto("/"); await W.settle(p, "home");
  await demo(/Reset to the six/);
  const six = p.getByRole("dialog", { name: /Reset to the six\?/ });
  await six.waitFor({ timeout: 10_000 });
  await six.getByLabel(/Type RESET/).fill("RESET");
  const reset = p.waitForResponse((r) => r.url().endsWith("/api/demo/reset-to-six") && r.request().method() === "POST", { timeout: 180_000 });
  await six.getByRole("button", { name: /Reset to the six/ }).click();
  const rr = await reset;
  ok("setup: Demo › Reset to the six runs from the menu (2xx)", rr.status() < 300, rr.status());
  const done = p.getByRole("dialog", { name: /Reset to the six: done/ });
  await done.waitFor({ timeout: 30_000 });
  await done.getByRole("button", { name: /Continue/ }).click();
  const lmia = sql("select id from combination where combination_key='wp.lmia_inside'");
  ok("setup: the six are loaded, With an LMIA – inside Canada among them, with no release yet", !!lmia && sql(`select count(*) from config_release where combination_id='${lmia}'`) === "0", lmia);

  // ---------------------------------------------------------------- Demo › Start With an LMIA from its reviewed release
  await demo(/Start With an LMIA from its reviewed release/);
  const start = p.getByRole("dialog", { name: /Start With an LMIA from its reviewed release\?/ });
  await start.waitFor({ timeout: 10_000 });
  const started = p.waitForResponse((r) => r.url().endsWith("/api/demo/release-with-sources"), { timeout: 120_000 });
  const says = await start.innerText();
  ok("C5.4 pass (P-322): the dialog says plainly it loads a draft and its sources and answer-key tests must be answered to release it", /as a draft/i.test(says) && /answer its sources and its answer-key tests to release it/i.test(says) && /Nothing is approved or released here/.test(says), says.slice(0, 200));
  await start.getByRole("button", { name: /Load as a draft/ }).click();
  const sr = await started;
  ok("C5.4 pass: the Demo menu starts With an LMIA – inside Canada from its reviewed release (2xx)", sr.status() < 300, sr.status());
  ok("C5.4 data (P-322): the control releases nothing; With an LMIA has no release and no submission yet", sql(`select count(*) from config_release where combination_id='${lmia}'`) === "0" && sql(`select count(*) from review_submission where combination_id='${lmia}'`) === "0");
  await p.waitForURL(new RegExp(`/c/${lmia}/review$`), { timeout: 15_000 });
  const block = p.locator("[data-unsourced]");
  await block.waitFor({ timeout: 30_000 });
  await W.settle(p, "Review and release");
  const src = (await call("GET", `/combinations/${lmia}/sources`)).body;
  const heldN = Number(src?.counts?.held_back ?? 0);
  ok("C5.4 pass: it lands on the Review and release tab, which shows \"Numbers without a source (n)\" with n the numbers held back", heldN > 0 && (await block.getByRole("heading", { name: `Numbers without a source (${heldN})` }).count()) === 1, { held: heldN, heading: await block.locator("h2").innerText() });
  const items = await block.locator("[data-unsourced-item]").count(), adds = await block.getByRole("button", { name: /^Add source:/ }).count();
  ok("C5.4 pass: the numbers are grouped by item, each with Add source", items > 1 && adds > 0, { items, addSource: adds });
  const dates = ((src?.numbers ?? []) as any[]).filter((n) => !n.passes && /\d{4}-\d{2}-\d{2}/.test(String(n.value)));
  ok("C5.4 pass (P-279): a cut-off date is one of the numbers that need a source", dates.length > 0 && (await block.innerText()).includes(String(dates[0]?.words ?? "§")), dates.slice(0, 2).map((n) => n.words));
  mkdirSync(SHOT, { recursive: true });
  await block.scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(SHOT, "C5.4-six-review-1440.png") });

  // ---------------------------------------------------------------- the gate: Submit on the draft (no release yet)
  ok("C5.4 pass: the block says the numbers block submission and release", (await block.getAttribute("data-blocking")) === "true" && /block submission and release/i.test(await block.innerText()), await block.locator("p").first().innerText());
  const submitBtn = p.getByRole("button", { name: /^Submit/ }).first();
  ok("C5.4 pass: Submit is not offered while numbers have no source (disabled)", (await submitBtn.count()) === 0 || (await submitBtn.isDisabled()), (await submitBtn.count()) ? "shown" : "absent");
  let r = await call("POST", `/combinations/${lmia}/submit`, { note: "C5.4 acceptance" }, AUTHOR);
  const errs = ((r.body?.errors ?? []) as any[]).filter((e) => /no source entry/i.test(String(e.message ?? "")));
  ok("C5.4 fail: Submit is refused while numbers have no source, saying how many, in words", r.status === 400 && new RegExp(`${heldN} numbers? ha(s|ve) no source entry`).test(words(r)), words(r).slice(0, 200));
  ok("C5.4 fail: the refusal names each held number with its item (one error line each)", errs.length === heldN && errs.every((e) => String(e.message).length > 20), { lines: errs.length, held: heldN, first: errs[0]?.message?.slice(0, 120) });
  r = await call("POST", `/combinations/${lmia}/sources/sample`, {}, AUTHOR);
  ok("C5.4 fail: a Sample answer is refused on this source-backed combination (409, in words)", r.status === 409 && /source-backed|official source/i.test(words(r)), words(r));
  r = await call("POST", `/combinations/${lmia}/approve`, {}, APPROVER);
  ok("C5.4 fail: the release is refused too (409)", r.status === 409, words(r).slice(0, 160));
  r = await call("POST", "/demo/release-with-sources", {}, AUTHOR);
  ok("C5.4 fail: the demo control runs once (409 once the reviewed setup is the draft, in words)", r.status === 409 && /already has the reviewed setup as its draft/.test(words(r)), words(r));
  r = await call("POST", "/demo/release-with-sources", {}, APPROVER);
  ok("C5.4 fail: only the author runs the demo control (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- every number answered: C5.4's own problem is gone
  // A3 (tech lead, 4 Nov, P-322): C5.4's evidence stands on its own. The release is still held, by C5.5's answer-key
  // gate (a first, source-backed release: each new field map needs a test the immigration expert signs), so no Release 1
  // here; release-step evidence is on the configured checkpoint.
  const all = await sourceEveryNumber(T.PORT, lmia, { actor: AUTHOR });
  ok("setup: every number gets its answer through the API, as the Source panel saves it (\"None published\", test words)", all.held_back === 0 && all.written >= heldN, all);
  await p.reload(); await p.locator("[data-sources-all-set]").waitFor({ timeout: 30_000 });
  ok("C5.4 pass: the tab then says every published number has its answer", /Every published number has its answer/.test(await p.locator("[data-sources-all-set]").innerText()));
  const draft = (await call("GET", `/combinations/${lmia}`)).body?.draft;
  const problems = (draft?.problems ?? []) as any[];
  const noSource = problems.filter((x) => x.gate === "no-source" || /no source entry/i.test(String(x.message ?? "")));
  const tests = problems.filter((x) => x.where === "Tests" && x.level === "error");
  ok("C5.4 pass: once all are answered, no \"Numbers without a source\" problem is left, while C5.5's answer-key problems remain", noSource.length === 0 && tests.length > 0, { noSource: noSource.length, tests: tests.map((x) => x.item) });
  r = await call("POST", `/combinations/${lmia}/submit`, { note: "C5.4 acceptance: every number answered" }, AUTHOR);
  const lines = ((r.body?.errors ?? []) as any[]);
  const keyLines = lines.filter((e) => e.where === "Tests");
  ok("C5.4 pass: Submit is no longer refused for sources (no error line says \"no source entry\")", r.status === 400 && !lines.some((e) => /no source entry/i.test(String(e.message ?? ""))), words(r).slice(0, 200));
  ok("C5.5 (the next gate, real): Submit is refused by the answer-key gate, one line per field map, each naming its form", keyLines.length === tests.length && keyLines.every((e) => /field map/.test(String(e.message ?? "")) && (e.forms ?? []).length === 1), keyLines.map((e) => `${e.item}: ${String(e.message).slice(0, 80)}`));
  r = await call("POST", `/combinations/${lmia}/approve`, {}, APPROVER);
  ok("C5.4 data (P-322): the approver cannot release it either (409), and nothing is released", r.status === 409 && sql(`select count(*) from config_release where combination_id='${lmia}'`) === "0", words(r).slice(0, 160));
  ok("C5.4 data: no page error", W.errors.length === 0, W.errors.slice(0, 3));
  await W.close();
  T.done();
});
