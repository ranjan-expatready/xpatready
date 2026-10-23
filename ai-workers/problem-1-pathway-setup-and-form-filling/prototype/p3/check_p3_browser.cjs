// P3 browser run: drives the real review screen (http://localhost:4317, p3/server.ts running) through a whole
// review and release with clicks, as the simulated users, and records every refusal and the release.
// Screenshots and a step log go to p3/evidence/. Uses the existing Playwright + Google Chrome (E7).
//   node p3/check_p3_browser.cjs
const path = require('node:path'); const fs = require('node:fs');
const { chromium } = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL = 'http://localhost:4317/';
const OUT = path.join(__dirname, 'evidence'); fs.mkdirSync(OUT, { recursive: true });
const log = []; const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 160)}` : ''}`); };

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const settle = async () => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(60); };
  const shot = async (n) => p.screenshot({ path: path.join(OUT, n), fullPage: false });
  const as = async (u) => { await p.selectOption('#actor', u); await settle(); };
  const group = async (g) => { await p.click(`#groups button[data-g="${g}"]`); await settle(); };
  const filter = async (f) => { await p.click(`.chip[data-filter="${f}"]`); await settle(); };
  const toast = async () => (await p.textContent('#toast')).trim();
  // Wait for THIS action's own message: an earlier bulk message ("Approved 43 of 43") can still be showing
  // (found on the regeneration run, 20 Oct: the loop read the previous group's message and stopped early).
  const recorded = async () => { await p.waitForFunction(() => document.querySelector('#toast').textContent.trim() === 'Recorded', null, { timeout: 5000 }).catch(() => {}); return (await toast()) === 'Recorded'; };
  const clearToast = async () => p.evaluate(() => { document.querySelector('#toast').textContent = ''; });
  const state = async () => (await (await p.request.get(URL + 'api/state')).json());

  await p.goto(URL); await settle();
  step('screen loads with the AI-drafting label and the readiness blockers', (await p.textContent('#label')).includes('prototype-only exception') && (await p.textContent('#ready')).includes('have no decision'));
  await shot('01-start-desktop.png');

  // Submitting before every item is decided and signed off is refused.
  await as('user-A'); await p.click('#submit'); await settle();
  step('submit refused while items are undecided (5.1 ready, 5.2 r2)', (await p.textContent('#relmsg')).includes('not ready'), await p.textContent('#relmsg'));
  await shot('02-submit-refused-not-ready.png');

  // A correction picks another trial's proposal; without a reason it is refused.
  const corr = 'map:IMM 1295 (09-2023):form1[0].Page1[0].PersonalDetails[0].CurrentCOR[0].Row2[0].Country[0]:0';
  await group('Field map · IMM 1295 (09-2023)'); await filter('attention');
  const card = p.locator(`.item[data-id="${corr}"]`);
  await card.locator('button[data-act="corrected"]').first().click(); await settle();
  step('a correction without a reason is refused', (await toast()).includes('Refused'), await toast());
  await card.locator('input').fill('the box is the current country of residence; another trial read it from the section heading');
  await card.locator('button[data-act="corrected"]').first().click(); await settle();
  step('choosing another trial\'s proposal with a reason is recorded (5.1 r3)', (await toast()) === 'Recorded');
  await filter('all'); await p.locator(`.item[data-id="${corr}"]`).scrollIntoViewIfNeeded(); await shot('03-correction-recorded.png'); await filter('attention');

  // An unresolved box offers no Approve: keep it unresolved (hand route) or return it.
  const s0 = await state();
  const unres = s0.items.find((i) => i.kind === 'mapping' && i.proposal.outcome === 'unresolved' && i.group === 'Field map · IMM 1295 (09-2023)' && !i.decision);
  step('an unresolved box shows no Approve button', (await p.locator(`.item[data-id="${unres.id}"] button[data-act="accepted"]`).count()) === 0);

  // Review every group: flagged items one by one with a reason, then the unflagged ones in one action.
  const groups = [...new Set(s0.items.map((i) => i.group))];
  let clicks = 0;
  for (const g of groups) {
    await group(g); await filter('attention');
    let last = null;
    for (;;) {
      const s = await state();
      const next = s.items.find((i) => i.group === g && !i.decision && i.flags.length);
      if (!next) break;
      if (next.id === last) { step(`decision on ${next.id} was not recorded`, false); break; }
      last = next.id; await clearToast();
      const c = p.locator(`.item[data-id="${next.id}"]`);
      const unresolvedBox = next.kind === 'mapping' && next.proposal.outcome === 'unresolved';
      await c.locator('input').fill(unresolvedBox ? 'no case fact a firm holds for this box; completed by hand from the case' : 'checked against the official source shown; the draft\'s reading stands');
      await c.locator(`button[data-act="${unresolvedBox ? 'left_unresolved' : 'accepted'}"]`).click(); await settle(); clicks++;
      if (!(await recorded())) { step(`decision on ${next.id}`, false, await toast()); break; }
    }
    await p.click('#bulk'); await settle(); clicks++;
  }
  const s1 = await state();
  step(`every item decided through the screen (${clicks} clicks; one decision per item)`, s1.readiness.counts.decided === s1.readiness.counts.items, `${s1.readiness.counts.decided}/${s1.readiness.counts.items}`);
  step('still not ready: rules, conditions and values need the SME (5.2 r2)', !s1.readiness.ready && s1.readiness.blockers.some((x) => x.includes('SME')));

  // The author cannot sign off as SME; the SME-duty publisher can.
  const smeItem = s1.items.find((i) => i.needs_sme && !i.sme);
  await group(smeItem.group); await filter('attention');
  step('the author sees no SME sign-off button', (await p.locator(`.item[data-id="${smeItem.id}"] button[data-act="sme_signed"]`).count()) === 0);
  await as('user-C');
  for (const g of groups) {
    await group(g); await filter('attention');
    let lastSme = null;
    for (;;) {
      const s = await state(); const next = s.items.find((i) => i.group === g && i.needs_sme && !i.sme);
      if (!next) break;
      if (next.id === lastSme) { step(`SME sign-off on ${next.id} was not recorded`, false); break; }
      lastSme = next.id; await clearToast();
      await p.locator(`.item[data-id="${next.id}"] button[data-act="sme_signed"]`).click(); await settle();
      if (!(await recorded())) { step(`SME sign-off on ${next.id}`, false, await toast()); break; }
    }
  }
  const s2 = await state();
  step('every rule, condition and value signed off by the SME duty; ready', s2.readiness.ready && s2.readiness.counts.sme_signed === s2.readiness.counts.sme_needed, JSON.stringify(s2.readiness.counts));
  await group('Conditional rules'); await filter('all'); await shot('04-sme-signed-ready.png');

  // Approval before submission, by the author, and after a change are all refused.
  await as('user-B'); await p.click('#approve'); await settle();
  step('approve refused before submission', (await p.textContent('#relmsg')).includes('not submitted'), await p.textContent('#relmsg'));
  await as('user-A'); await p.click('#submit'); await settle();
  step('author submits the frozen configuration (hash shown)', (await p.textContent('#relmsg')).includes('Submitted version 1'), await p.textContent('#relmsg'));
  await p.locator('#relmsg').scrollIntoViewIfNeeded(); await shot('05-submitted.png');
  await p.click('#approve'); await settle();
  step('the author cannot approve (5.3 a1, D254)', (await p.textContent('#relmsg')).includes('self-approval refused: approver is the author'), await p.textContent('#relmsg'));
  await shot('06-author-approve-refused.png');
  await group('Field map · IMM 1295 (09-2023)'); await filter('all');
  const c2 = p.locator(`.item[data-id="${corr}"]`);
  await c2.locator('input').fill('reverted: confirm the residence country with the client first');
  await c2.locator('button[data-act="left_unresolved"]').click(); await settle();
  await as('user-B'); await p.click('#approve'); await settle();
  step('a change after submission makes the approval stale (5.3 a2)', (await p.textContent('#relmsg')).includes('stale approval'), await p.textContent('#relmsg'));
  await p.locator('#relmsg').scrollIntoViewIfNeeded(); await shot('07-stale-approval-refused.png');

  // Re-submit, then the second person approves and publishes.
  await as('user-A'); await p.click('#submit'); await settle();
  await as('user-B'); await p.click('#approve'); await settle();
  const msg = await p.textContent('#relmsg');
  step('the second person approves the re-submitted hash: version 1 published', msg.includes('Published version 1'), msg);
  await p.locator('#releases').scrollIntoViewIfNeeded(); await shot('08-published.png');
  const rel = JSON.parse(fs.readFileSync(path.join(__dirname, 'releases', 'c1-v1', 'release.json'), 'utf8'));
  step('release record names author A, submitter A, approver B', rel.author.user_id === 'user-A' && rel.submitter.user_id === 'user-A' && rel.approver.user_id === 'user-B', rel.configuration_sha256);

  // Layout: phone width, dark, keyboard focus.
  for (const [w, scheme, name] of [[375, 'light', '09-phone-light.png'], [1440, 'dark', '10-desktop-dark.png']]) {
    const c = await b.newContext({ viewport: { width: w, height: 860 }, colorScheme: scheme }); const q = await c.newPage(); q.on('pageerror', (e) => errs.push(e.message));
    await q.goto(URL); await q.waitForLoadState('networkidle');
    const wide = await q.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1);
    step(`no sideways page scroll at ${w}px ${scheme}`, !wide);
    await q.screenshot({ path: path.join(OUT, name) }); await c.close();
  }
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  const focus = await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return { tag: e.tagName, outline: s.outlineStyle, ring: s.outlineWidth }; });
  step('keyboard focus reaches the controls and shows a visible outline', focus.tag !== 'BODY' && focus.outline !== 'none', JSON.stringify(focus));
  step('no page errors', errs.length === 0, errs.join(' | '));
  fs.writeFileSync(path.join(OUT, 'browser-run.json'), JSON.stringify({ at: new Date().toISOString(), url: URL, steps: log }, null, 1) + '\n');
  const failed = log.filter((x) => !x.ok).length;
  console.log(`${log.length - failed}/${log.length} passed`);
  await b.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
