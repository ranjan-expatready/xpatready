// QA-78 (free part, runtime lane): the Forms tab's finder strip on a combination whose forms came without an AI find.
// A combination whose forms came without an AI find (the sample setup or by hand) says how many forms it
// has, never "No form find yet" (with no forms and no find the find is still offered:
// check_w1_start_setup_browser item 5). US$0: no AI call.
//   zsh studio/tools/isolated.sh runtime_qa78 4431 start && node studio/tests/check_qa78_words_browser.cjs 4431
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4431);
const BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || detail === undefined ? "" : ` — ${String(detail).slice(0, 260)}`}`); };
const api = async (url, init = {}) => { const r = await fetch(`${BASE}/api${url}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", ...(init.data ? { "content-type": "application/json" } : {}) }, body: init.data ? JSON.stringify(init.data) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null }; };

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    const rows = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows;
    const withForms = [];
    for (const r of rows.filter((x) => x.combinationId)) if (((await api(`/combinations/${r.combinationId}/attachments`)).body ?? []).length) withForms.push(r);
    step("setup: the sample has a combination with forms", withForms.length > 0, rows.length);

    // Pass: forms on the line, no find run → the count, not "No form find yet".
    const sv = withForms.find((x) => x.nodeKey === "individual.visitors.super_visa") ?? withForms[0];
    await p.goto(`${BASE}/c/${sv.combinationId}/forms`);
    const finder = p.locator("[data-finder]");
    await finder.waitFor({ state: "visible", timeout: 15000 });
    await p.waitForFunction(() => /[Oo]n this combination|AI found|No form find yet|Waiting for you/.test(document.querySelector("[data-finder]")?.textContent ?? ""), undefined, { timeout: 15000 });
    const text = await finder.innerText();
    step("QA-78 pass: forms added without an AI find show their count and how they came", /On this combination: \d+ forms?( · \d+ set up)?/.test(text) /* UX-A part 1: the one forms words */ && /Added without an AI find/.test(text), text.slice(0, 200));
    step("QA-78 fail-guard: no \"No form find yet\" above attached forms", !/No form find yet/.test(text), text.slice(0, 200));

    // The other way (no forms, no find → "No form find yet" and the one Find button) is check_w1_start_setup_browser's item 5.
  } catch (e) { step("no unexpected error", false, e.stack); } finally { await browser.close(); }
  console.log(`\nQA-78 words: ${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})();
