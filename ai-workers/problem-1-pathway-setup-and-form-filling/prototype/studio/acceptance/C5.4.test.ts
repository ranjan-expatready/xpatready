// C5.4 acceptance (qa/CAPABILITIES.md C5.4; P-240, P-279; G1 concept screens/G1-source-register/concept.md): "A release
// is refused while any published number has neither a source-register entry nor 'None published – set by ExpatReady';
// the refusal names each item; cut-off and in-force dates count as published numbers that need a source." Written 3 Nov
// (F6, P-290) when the release with its sources became reachable from the Demo menu on the six (the re-test of 1a79dbf9
// found it only on the suites' fixture, which the menu never loads).
// As a person: Demo › Reset to the six, then Demo › Start With an LMIA from its reviewed release, which loads the reviewed
// setup as a draft (P-322: it releases nothing), lands on With an LMIA – inside Canada's Review and release tab:
// "Numbers without a source (n)", grouped by item, each with Add source, and Submit is held. Underneath: Submit is
// refused naming every item; once every number has its official source or "None published" (test words, through the
// API as the Source panel saves them), its "no source" problems are gone and Submit goes through; the SME signs and a
// different person approves Release 1. QA-214 (tech lead, P-294): c1-v3 is an outside-Canada release, so the
// combination stays Sample and Release 1 is a Demo release, its field maps' missing answer-key tests only warn (C5.5).
// P-322: C6.1 and other later steps count on the configured checkpoint, not here.
// A screenshot of the tab goes to studio/var/acceptance/C5.4-six-review-1440.png (the one committed for the PR is
// product/screens/G1-source-register/screenshots/c54-six-review-1440.png).
// No model call (US$0). Exit 0 = all pass, 1 = a failure, 2 = setup missing.
//   zsh studio/tools/isolated.sh accept 4476 start && tsx studio/acceptance/C5.4.test.ts 4476 xr_studio_accept
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { sourceEveryNumber } from "../tests/fixtures/source-every-number.cjs";
import { APPROVER, AUTHOR, REVIEWER, pack2, run } from "./lib/pack2.ts";
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
  ok("C5.4 pass (P-322, QA-214): the dialog says plainly it loads the outside-Canada release c1-v3 as a Sample draft, names its one shortcut and that the release needs its sources", /outside-Canada release c1-v3 as a Sample draft/i.test(says) && /answer its sources to release it/i.test(says) && /applied for from outside Canada/.test(says) && /not the inside-Canada combination's own source-backed setup/.test(says) && /One shortcut: its shared library items .* already in the library/.test(says) && /approved and released only through those steps/.test(says), says.slice(0, 300));
  const packsBefore = sql("select count(*) from pack_version");
  await start.getByRole("button", { name: /Load as a draft/ }).click();
  const sr = await started;
  ok("C5.4 pass: the Demo menu starts With an LMIA – inside Canada from its reviewed release (2xx)", sr.status() < 300, sr.status());
  ok("C5.4 data (P-322): the control releases nothing; With an LMIA has no release and no submission yet, and no new pack version", sql(`select count(*) from config_release where combination_id='${lmia}'`) === "0" && sql(`select count(*) from review_submission where combination_id='${lmia}'`) === "0" && sql("select count(*) from pack_version") === packsBefore, { packsBefore });
  const basis = sql(`select source_basis||' | '||coalesce(basis_note,'') from combination where id='${lmia}'`);
  ok("C5.4 data (QA-214): the inside-Canada combination stays Sample and says its setup is the outside-Canada release c1-v3", basis.startsWith("ILLUSTRATIVE | Sample: from the outside-Canada release c1-v3"), basis.slice(0, 160));
  const audit = sql(`select summary from audit_event where combination_id='${lmia}' and entity='reviewed release' order by at desc limit 1`);
  ok("C5.4 data (QA-214): the audit line says it is the outside-Canada release, as a Sample draft", /outside-Canada release c1-v3.*Sample draft, not its source-backed setup/.test(audit), audit.slice(0, 200));
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
  r = await call("POST", `/combinations/${lmia}/approve`, {}, APPROVER);
  ok("C5.4 fail: the release is refused too (409)", r.status === 409, words(r).slice(0, 160));
  r = await call("POST", "/demo/release-with-sources", {}, AUTHOR);
  ok("C5.4 fail: the demo control runs once (409 once the reviewed setup is the draft, in words)", r.status === 409 && /already has the reviewed setup as its draft/.test(words(r)), words(r));
  r = await call("POST", "/demo/release-with-sources", {}, APPROVER);
  ok("C5.4 fail: only the author runs the demo control (403)", r.status === 403, r.status);

  // ---------------------------------------------------------------- every number answered: it goes through
  const all = await sourceEveryNumber(T.PORT, lmia, { actor: AUTHOR });
  ok("setup: every number gets its answer through the API, as the Source panel saves it (\"None published\", test words)", all.held_back === 0 && all.written >= heldN, all);
  await p.reload(); await p.locator("[data-sources-all-set]").waitFor({ timeout: 30_000 });
  ok("C5.4 pass: the tab then says every published number has its answer", /Every published number has its answer/.test(await p.locator("[data-sources-all-set]").innerText()));
  const problems = ((await call("GET", `/combinations/${lmia}`)).body?.draft?.problems ?? []) as any[];
  const noSource = problems.filter((x) => x.gate === "no-source" || /no source entry/i.test(String(x.message ?? "")));
  const keyWarn = problems.filter((x) => x.where === "Tests");
  ok("C5.4 pass: once all are answered, no \"Numbers without a source\" problem is left; the field maps' missing answer-key tests only warn (a Sample combination, C5.5)", noSource.length === 0 && keyWarn.length > 0 && keyWarn.every((x) => x.level === "warning"), { noSource: noSource.length, tests: keyWarn.map((x) => `${x.item}: ${x.level}`) });
  r = await call("POST", `/combinations/${lmia}/submit`, { note: "C5.4 acceptance: every number answered" }, AUTHOR);
  ok("C5.4 pass: Submit goes through once every number is answered", r.status < 300, words(r).slice(0, 200));
  const items = ((r.body?.changeSummary ?? []) as any[]).map((c) => `${c.kind}|${c.key}`);
  const signed = await call("POST", `/combinations/${lmia}/signoff`, { items, action: "signed", note: "C5.4 acceptance: signed as the SME (test)" }, REVIEWER);
  ok("setup: the content reviewer (SME duty) signs every change", items.length > 0 && signed.status < 300, { items: items.length, status: signed.status, said: words(signed).slice(0, 160) });
  r = await call("POST", `/combinations/${lmia}/approve`, {}, APPROVER);
  ok("C5.4 pass: the approver releases it: Release 1", r.status < 300 && r.body?.version === 1, words(r).slice(0, 200) || r.body?.version);
  const frozen = Number(sql(`select jsonb_array_length(coalesce(snapshot->'sources','[]'::jsonb)) from config_release where combination_id='${lmia}' and version=1`) || 0);
  ok("C5.4 data: Release 1 carries its numbers' sources frozen in it", frozen >= heldN, { frozen, held: heldN });
  const who = sql(`select submitter_id||' '||approver_id from config_release where combination_id='${lmia}' and version=1`);
  const signers = sql(`select string_agg(distinct s.actor_id, ',') from review_signoff s join review_submission u on u.id=s.submission_id where u.combination_id='${lmia}' and s.action='signed'`);
  ok("C5.4 data (P-322): Release 1 came through the product's steps: submitted by the author, signed by the SME, approved by a different person", who === "user-A user-B" && signers === "user-C", { who, signers });
  const rel = ((await call("GET", `/combinations/${lmia}`)).body?.releases ?? []) as any[];
  ok("C5.4 data (QA-214): Release 1 reads as a Demo release, never as this combination's source-backed setup", rel.length === 1 && rel[0].demo === true && /Illustrative/.test(String(rel[0].basis ?? "")), rel.map((x) => ({ v: x.version, demo: x.demo, basis: String(x.basis ?? "").slice(0, 80) })));
  ok("C5.4 data: no page error", W.errors.length === 0, W.errors.slice(0, 3));
  await W.close();
  T.done();
});
