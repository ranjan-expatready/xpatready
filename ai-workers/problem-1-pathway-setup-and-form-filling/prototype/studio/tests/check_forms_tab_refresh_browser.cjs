// The combination's Forms tab keeps asking the studio while an AI field-map draft is settling (#143 review, Major): the
// server marks the job COMPLETED a moment before it marks the form DRAFTED (two writes), and a fetch that lands between
// them used to show no running job, so the tab stopped asking and "Review AI proposals" never appeared until a reload
// (reproduced on a 2-CPU machine; check_studio_browser named it). This check makes that in-between answer happen every
// time: the first answer that shows the job finished has the form put back to READ, as the real gap does. A saved AI
// answer (replay): no model call, US$0.
//   zsh studio/tools/isolated.sh screens_refresh 4448 start && node studio/tests/check_forms_tab_refresh_browser.cjs 4448
const { chromium } = require("../node_modules/playwright");
const PORT = Number(process.argv[2] ?? 4448);
const BASE = `http://localhost:${PORT}`;
let fail = 0, pass = 0;
const step = (name, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${String(detail).slice(0, 260)}` : ""}`); };

(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  const api = async (pth, init = {}) => { const r = await p.request.fetch(`${BASE}/api${pth}`, { method: init.method ?? "GET", headers: { "x-actor": "user-A", "content-type": "application/json", connection: "close" }, data: init.data, timeout: 180000 }); return { status: r.status(), body: await r.json().catch(() => null) }; };
  try {
    await p.goto(BASE); await p.evaluate(() => { try { localStorage.setItem("xr-actor", "user-A"); } catch { /* ignore */ } });
    await api("/demo/reset", { method: "POST", data: { confirm: "RESET" } });
    step("setup: sample inputs loaded", (await api("/demo/load", { method: "POST" })).status === 201);
    const sv = (await api("/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows.find((x) => x.nodeKey === "individual.visitors.super_visa");
    const att = (await api(`/combinations/${sv.combinationId}/attachments`)).body.find((a) => /^IMM 5257 \(/.test(a.edition ?? ""));
    const run = ((await api(`/attachments/${att.id}/draft-options`)).body.saved_runs ?? []).find((x) => x.valid);
    step("setup: Super visa's IMM 5257 has a saved AI answer to replay", !!att && !!run, att?.status);

    // The in-between answer, once: the first combination answer that shows this form's field-map job finished says the
    // form is still READ (as a fetch between the server's two writes does).
    let rewritten = 0;
    await p.route(new RegExp(`/api/combinations/${sv.combinationId}$`), async (route) => {
      const r = await route.fetch(); const j = await r.json();
      const job = (j.jobs ?? []).find((x) => x.attachmentId === att.id && x.kind === "field_map");
      const a = (j.attachments ?? []).find((x) => x.id === att.id);
      if (!rewritten && job?.status === "COMPLETED" && a) { a.status = "READ"; rewritten++; }
      await route.fulfill({ response: r, json: j });
    });

    await p.goto(`${BASE}/c/${sv.combinationId}/forms`); await p.waitForLoadState("networkidle");
    const started = await api(`/attachments/${att.id}/draft`, { method: "POST", data: { mode: "replay", runFile: run.file } });
    step("setup: the replay started", started.status < 300, started.status);
    // The tab learns of the job the way the Draft dialog tells it: its combination is fetched again.
    await p.reload(); await p.waitForLoadState("networkidle");
    for (let i = 0; i < 60 && !rewritten; i++) await p.waitForTimeout(500);
    step("setup: the tab received the in-between answer (job finished, form still READ)", rewritten === 1, rewritten);

    const link = p.getByRole("row", { name: /IMM 5257/ }).getByRole("link", { name: "Review AI proposals" });
    const shown = await link.first().waitFor({ timeout: 20000 }).then(() => true, () => false);
    step("#143 review fail case: after the in-between answer the tab keeps asking, and \"Review AI proposals\" appears without a reload", shown);
    step("no page error", !errs.length, errs.join(" | "));
  } catch (e) { step(`unexpected ${e.message.split("\n")[0]}`, false); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
