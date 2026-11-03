// C11.13 in the browser, as the Approver (the second person), at 1440 and 400 px (forms lane; P-120: "a near duplicate
// needs a one-line reason, shown to the second person at release"): a field added close to "Family Name" with its
// reason shows, on Review and release, under "Library changes waiting for a second person" with what it is close to
// (name and key) and why it is not the same; the decision page shows the same line; once the Approver approves it there,
// Review and release lists it as "Will be released" with the line. Sample inputs; no AI call (US$0); axe on each page.
//   zsh studio/tools/isolated.sh c1113_nearui 4483 start && node studio/tests/check_c1113_near_release_browser.cjs 4483
const fs = require("node:fs");
const { chromium } = require("../node_modules/playwright");
const AxeBuilder = require("../node_modules/@axe-core/playwright").default;
const PORT = Number(process.argv[2] ?? 4483), BASE = `http://localhost:${PORT}`;
const REASON = "The name given at birth, which can differ from the family name used now.";
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).replace(/\s+/g, " ").slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ headless: true, ...(process.platform === "darwin" ? { channel: "chrome" } : fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: "/opt/pw-browsers/chromium" } : {}) });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": init.actor ?? "user-A", "content-type": "application/json" }, data: init.data, timeout: init.timeout ?? 30000 }); let body = null; try { body = await r.json(); } catch { /* not JSON */ } return { status: r.status(), body }; };
  const axe = async (name) => { const v = (await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations; step(`axe: ${name} has no WCAG A/AA violation`, !v.length, v.map((x) => `${x.id} (${x.nodes.length})`).join(", ")); };
  const fits = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const go = async (u) => { await p.goto(`${BASE}${u}`); await p.waitForLoadState("networkidle"); await p.locator("main h1").first().waitFor({ timeout: 30000 }); };
  try {
    await p.goto(BASE);
    const loaded = await api("/demo/load", { method: "POST", timeout: 180000 });
    step("setup: sample inputs loaded", loaded.status === 201, [loaded.status, loaded.body?.detail]);
    // A rule to name (the add names the rule that needs the fact): the sample's first, else none, so the check says so.
    const combos = (await api("/library/reuse/fields")).body.combinations;
    let at = null;
    for (const c of combos) { const f = (await api(`/combinations/${c.id}/config?mode=draft`)).body; const r = (f?.snapshot?.rules ?? [])[0]; if (r) { at = { combo: c.id, rule: r.key ?? r.id }; break; } }
    step("setup: a combination with a rule to name", !!at, JSON.stringify(at));
    const add = await api(`/combinations/${at.combo}/rules/${encodeURIComponent(at.rule)}/fact`, { method: "POST", data: { label: "Family Name at birth", meaning: "The family name this person was given at birth (Sample).", valueType: "text", subject: "person", nearReason: REASON } });
    const acc = await api("/review/proposals/decide", { method: "POST", actor: "user-C", data: { ids: [add.body?.proposalId], action: "accept" } });
    step("setup: an author proposes it with its reason; a person accepts it on To review", add.status === 201 && acc.status < 300, [add.status, add.body?.detail, acc.status]);
    await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-B"); } catch { /* ignore */ } });

    for (const [w, h] of [[1440, 900], [400, 860]]) {
      await p.setViewportSize({ width: w, height: h });
      await go("/release");
      const waiting = p.locator("[data-library-waiting]");
      const row = waiting.locator("tr[data-waiting]").filter({ hasText: "Family Name at birth" });
      step(`C11.13 P-120 (${w}): Review and release lists it under "Library changes waiting for a second person"`, (await waiting.getByRole("heading", { name: "Library changes waiting for a second person" }).count()) === 1 && (await row.count()) === 1, await waiting.count());
      const line = row.locator("[data-near]");
      const text = (await line.count()) ? await line.innerText() : "";
      step(`C11.13 P-120 pass (${w}): its row says what it is close to (name and key) and why it is not the same`, /Close to the library's "Family Name"/.test(text) && text.includes("person.family_name") && text.includes(`Why it is not the same: ${REASON}`), text);
      step(`C11.13 fail (${w}): it reads "Waiting for a second person", never "Will be released"`, /Waiting for a second person/.test(await row.innerText()) && !/Will be released/.test(await row.innerText()));
      step(`C11.13 (${w}): the reason is said once (not again in the change's own words)`, ((await row.innerText()).match(new RegExp(REASON.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length === 1);
      step(`layout (${w}): no horizontal page scroll`, await fits());
      if (w === 1440) await axe("Review and release with a waiting near duplicate");
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    const batches = (await api("/review/changes?group=batch", { actor: "user-B" })).body.batches;
    const batch = batches.find((x) => x.items.some((i) => i.label === "Family Name at birth"));
    await go(`/review/batch/${batch.id}`);
    const bline = p.locator("tr", { hasText: "Family Name at birth" }).locator("[data-near]");
    step("C11.13 P-120 pass: the decision page the Approver approves shows the same near line", (await bline.count()) === 1 && (await bline.innerText()).includes(REASON) && (await bline.innerText()).includes("person.family_name"), (await bline.count()) ? await bline.innerText() : "none");
    await axe("the decision page with a near duplicate");
    await p.getByRole("button", { name: /^Approve/ }).click();
    await p.waitForURL(/\/review$/, { timeout: 30000 });
    await go("/release");
    const rel = p.locator("section[aria-labelledby='lib-changes'] tr[data-library-change]").filter({ hasText: "Family Name at birth" });
    step("C11.13 P-120 pass: once approved, Review and release lists it as Will be released, still with the near line and reason", (await rel.count()) === 1 && /Will be released/.test(await rel.innerText()) && (await rel.innerText()).includes(REASON), (await rel.count()) ? await rel.innerText() : "none");
    step("C11.13 fail: once approved it is no longer under waiting", (await p.locator("[data-library-waiting] tr", { hasText: "Family Name at birth" }).count()) === 0);
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step("ran to the end", false, e.stack); }
  await b.close();
  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
