// P4 change test: a one-setting configuration change, reviewed and released through the real P3 screen,
// changes the generated views with no change to the view code. Drives http://localhost:4318 (p3/server.ts
// --config p4/drafts/c1-draft-2.json --previous p3/releases/c1-v1 --port 4318) with clicks in Chrome
// (Playwright, E7), releases c1-v2, runs p4/generate.ts on v1 and v2, compares them and takes screenshots.
// Evidence goes to p4/evidence/. Needs a fresh run: no p3/releases/c1-v2 and no decisions or submission yet
// in p3/state/c1-draft-2 (the server creates the empty folder when it starts).
//   node p4/check_p4_change.cjs
const path = require('node:path'); const fs = require('node:fs'); const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require('/Users/ranjansingh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL = 'http://localhost:4318/';
const P = path.join(__dirname, '..');
const REL = path.join(P, 'p3', 'releases'), OUTV = path.join(__dirname, 'out');
const OUT = path.join(__dirname, 'evidence'); fs.mkdirSync(OUT, { recursive: true });
const FACT = 'case.service_language', ABOUT = 'The application (once per case)', ITEM = `place:${FACT}`, GROUP = 'Placements and collected-from';
const log = []; const step = (name, ok, detail) => { log.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`); };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Every path where two JSON values differ (arrays of objects compared by position).
function diff(a, b, at = '', out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${at}${Array.isArray(a) ? `[${k}]` : `.${k}`}`, out);
    return out;
  }
  out.push({ path: at, from: a, to: b }); return out;
}
// Views keyed by what they show, so an added block does not shift every later position.
function keyed(v) {
  const m = new Map();
  for (const b of v.pqr.blocks) for (const q of b.questions) m.set(`pqr|${q.about}|${q.fact}`, { block: b.block, ...q });
  for (const a of Object.keys(v.sqr)) {
    for (const p of v.sqr[a].people) for (const b of p.blocks) for (const q of b.questions) m.set(`sqr:${a}|${q.about}|${q.fact}`, { block: b.block, ...q });
    m.set(`sqr:${a}|forms`, v.sqr[a].forms); m.set(`sqr:${a}|counts`, v.sqr[a].counts);
  }
  for (const s of v.staff) for (const f of s.facts) m.set(`staff|${f.fact}`, { section: s.section, ...f });
  v.hand_route.forEach((h, i) => m.set(`hand|${i}`, h));
  m.set('pqr|count', v.pqr.count); m.set('pqr|gates', v.pqr.gates); m.set('unplaced', v.unplaced_facts);
  m.set('generated_from', v.generated_from);
  return m;
}

(async () => {
  const ST = path.join(P, 'p3', 'state', 'c1-draft-2');
  if (fs.existsSync(path.join(REL, 'c1-v2')) || ['decisions.jsonl', 'submission.json'].some((f) => fs.existsSync(path.join(ST, f)))) {
    console.error('not a fresh run: p3/releases/c1-v2, or decisions or a submission in p3/state/c1-draft-2, already exist'); process.exit(2);
  }
  const v1rel = read(path.join(REL, 'c1-v1', 'release.json')), v1cfg = read(path.join(REL, 'c1-v1', 'configuration.json'));
  // Counts come from release c1-v1 itself, not from an earlier run (re-derived after the P2 response regeneration).
  const N = v1rel.decisions.length, HAND = v1cfg.field_maps.flatMap((m) => m.entries).filter((e) => e.decision === 'left_unresolved').length;
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const settle = async () => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(60); };
  const shot = async (n, q = p) => q.screenshot({ path: path.join(OUT, n), fullPage: false });
  const as = async (u) => { await p.selectOption('#actor', u); await settle(); };
  const toast = async () => (await p.textContent('#toast')).trim();
  const state = async () => (await (await p.request.get(URL + 'api/state')).json());

  // 1. The screen opens with every unchanged item reused and one item open.
  await p.goto(URL); await settle();
  const s0 = await state();
  const open = s0.items.filter((i) => !i.decision);
  step('the screen loads draft 2 against release c1-v1', (await p.textContent('#cfg')).includes(`${N - 1} unchanged since c1-v1, reused without review`), await p.textContent('#cfg'));
  step(`${N} items: ${N - 1} reused with their c1-v1 decision, one open`, s0.items.length === N && open.length === 1 && open[0].id === ITEM, open.map((i) => i.id).join(', '));
  step(`reused SME sign-offs carried over (${s0.readiness.counts.sme_signed} of ${s0.readiness.counts.sme_needed})`, s0.readiness.counts.sme_signed === s0.readiness.counts.sme_needed && s0.readiness.counts.sme_needed > 0, JSON.stringify(s0.readiness.counts));
  step(`the ${HAND} hand-route boxes keep their v1 decision (left unresolved), not "accepted"`, HAND > 0 && s0.items.filter((i) => i.kind === 'mapping' && i.decision?.decision === 'left_unresolved' && i.decision.by === 'reused:c1-v1').length === HAND);
  step('not ready: the one open item blocks publishing', !s0.readiness.ready && s0.readiness.blockers.join(' ').includes('1 items have no decision'), s0.readiness.blockers.join('; '));
  await p.click(`#groups button[data-g="${GROUP}"]`); await settle();
  await p.click('.chip[data-filter="undecided"]'); await settle();
  const card = p.locator(`.item[data-id="${ITEM}"]`);
  step('the open item is the service-language placement, shown with tier prospect', (await card.count()) === 1 && (await card.textContent()).includes('prospect'));
  await card.scrollIntoViewIfNeeded(); await shot('01-review-one-open.png');

  // 2. A approves it with a reason and submits; B approves; release c1-v2.
  await as('user-A');
  await card.locator('input').fill('ask the service language in the PQR: it is known at enquiry and the IMM 1295 reads it');
  await card.locator('button[data-act="accepted"]').click(); await settle();
  step('A approves the changed placement with a recorded reason', (await toast()) === 'Recorded', await toast());
  await p.click('.chip[data-filter="all"]'); await settle();
  await p.locator(`.item[data-id="${ITEM}"]`).scrollIntoViewIfNeeded(); await shot('02-change-approved.png');
  const s1 = await state();
  step('ready once the one item is decided', s1.readiness.ready, s1.readiness.blockers.join('; '));
  await p.click('#submit'); await settle();
  step('A submits version 2 (hash frozen)', (await p.textContent('#relmsg')).includes('Submitted version 2'), await p.textContent('#relmsg'));
  await p.click('#approve'); await settle();
  step('A cannot approve its own submission (D254)', (await p.textContent('#relmsg')).includes('self-approval refused'), await p.textContent('#relmsg'));
  // Writing a 990-item release takes longer than the network-idle wait: wait for the message to change (run 1).
  const before = await p.textContent('#relmsg');
  await as('user-B'); await p.click('#approve');
  await p.waitForFunction((t) => document.querySelector('#relmsg').textContent !== t, before, { timeout: 30000 }).catch(() => {}); await settle();
  const msg = await p.textContent('#relmsg');
  step('B approves the submitted hash: version 2 published', msg.includes('Published version 2'), msg);
  await p.locator('#releases').scrollIntoViewIfNeeded(); await shot('03-v2-published.png');

  // 3. The release: supersedes v1, one item at version 2, everything else as released in v1.
  const dir2 = path.join(REL, 'c1-v2');
  const rel2 = read(path.join(dir2, 'release.json')), cfg2 = read(path.join(dir2, 'configuration.json')), files2 = read(path.join(dir2, 'files.json'));
  step('release c1-v2 supersedes c1-v1 by its hash', rel2.supersedes === v1rel.configuration_sha256 && rel2.revision === 2, rel2.supersedes);
  step('release record: author A, submitter A, approver B', rel2.author.user_id === 'user-A' && rel2.submitter.user_id === 'user-A' && rel2.approver.user_id === 'user-B');
  step('files.json hash matches configuration.json', files2.configuration_file_sha256 === sha(fs.readFileSync(path.join(dir2, 'configuration.json'))));
  const versions = [];
  for (const k of ['forms', 'document_requirements', 'rules', 'sections', 'placements', 'canonical_fields', 'derived_fields', 'checks']) for (const x of cfg2[k] ?? []) versions.push([`${k}:${x.fact ?? x.id ?? x.form_number ?? x.document_type ?? ''}`, x.item_version]);
  for (const m of cfg2.field_maps) for (const e of m.entries) versions.push([`map:${e.data_path}`, e.item_version]);
  const at2 = versions.filter(([, v]) => v === 2);
  step(`the service-language placement is at item_version 2; all ${versions.length - 1} other items stay at 1`, at2.length === 1 && at2[0][0] === `placements:${FACT}` && versions.every(([k, v]) => v === (k === `placements:${FACT}` ? 2 : 1)), at2.map((x) => x[0]).join(', '));
  const cdiff = diff(v1cfg, cfg2);
  const expected = new Set(['.configuration_version', '.review.decisions']);
  const pIdx = v1cfg.placements.findIndex((x) => x.fact === FACT);
  expected.add(`.placements[${pIdx}].tier`); expected.add(`.placements[${pIdx}].item_version`);
  step('configuration v1 → v2: only the version label, the review count, and that placement\'s tier and item version differ', cdiff.every((d) => expected.has(d.path)) && cdiff.length === 4, cdiff.map((d) => `${d.path}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`).join('; '));
  step(`the ${HAND} hand-route boxes are released as they were in v1`, cfg2.field_maps.flatMap((m) => m.entries).filter((e) => e.decision === 'left_unresolved').length === HAND);

  // 4. Generate the views for both releases with the same code, and compare.
  const v1stored = fs.readFileSync(path.join(OUTV, 'c1-v1', 'views.json'), 'utf8');
  const gen = (d) => JSON.parse(execFileSync(process.execPath, [path.join(__dirname, 'generate.ts'), d], { cwd: P, encoding: 'utf8' }));
  const g1 = gen('p3/releases/c1-v1'), g2 = gen('p3/releases/c1-v2');
  const j1 = read(path.join(OUTV, 'c1-v1', 'views.json')), j2 = read(path.join(OUTV, 'c1-v2', 'views.json'));
  step('regenerating v1 reproduces the stored v1 views byte for byte', fs.readFileSync(path.join(OUTV, 'c1-v1', 'views.json'), 'utf8') === v1stored);
  step('the view code SHA-256 is identical for v1 and v2 (no code change)', j1.view_code_sha256 === j2.view_code_sha256 && g1.view_code_sha256 === g2.view_code_sha256, j2.view_code_sha256);
  const k1 = keyed(j1.views), k2 = keyed(j2.views);
  const changes = [...new Set([...k1.keys(), ...k2.keys()])].filter((k) => JSON.stringify(k1.get(k)) !== JSON.stringify(k2.get(k)))
    .map((k) => ({ key: k, fields: k1.has(k) && k2.has(k) ? diff(k1.get(k), k2.get(k)).map((d) => ({ field: d.path, from: d.from, to: d.to })) : k1.has(k) ? 'removed' : 'added' }));
  const ch = Object.fromEntries(changes.map((c) => [c.key, c.fields]));
  const pqrQ = k2.get(`pqr|${ABOUT}|${FACT}`);
  step('the service language is newly in the PQR, in its own block, asked', ch[`pqr|${ABOUT}|${FACT}`] === 'added' && pqrQ.status === 'asked' && pqrQ.block === 'Application details' && j2.views.pqr.count === j1.views.pqr.count + 1, `${j1.views.pqr.count} → ${j2.views.pqr.count}`);
  const sq = ch[`sqr:principal|${ABOUT}|${FACT}`];
  step('in the principal\'s SQR it is pre-filled from the PQR instead of asked (tier shown as prospect)', Array.isArray(sq) && sq.length === 2 && sq.some((d) => d.field === '.status' && d.from === 'asked' && d.to === 'pre-filled from the PQR') && sq.some((d) => d.field === '.tier' && d.from === 'case' && d.to === 'prospect'), JSON.stringify(sq));
  const c1 = j1.views.sqr.principal.counts, c2 = j2.views.sqr.principal.counts;
  step('principal SQR counts: one fewer asked, one more pre-filled, documents unchanged', c2.asked === c1.asked - 1 && c2.prefilled === c1.prefilled + 1 && c2.from_documents === c1.from_documents, `${JSON.stringify(c1)} → ${JSON.stringify(c2)}`);
  const st = ch[`staff|${FACT}`];
  step('in the staff working view its tier reads prospect', Array.isArray(st) && st.length === 1 && st[0].field === '.tier' && st[0].from === 'case' && st[0].to === 'prospect', JSON.stringify(st));
  // The service language is placed once per case: asked once, about the application, though both applicants' IMM 1295
  // read it since D20; the partner's SQR does not ask it, so it does not change there.
  const allowed = new Set([`pqr|${ABOUT}|${FACT}`, `sqr:principal|${ABOUT}|${FACT}`, 'sqr:principal|counts', 'pqr|count', `staff|${FACT}`, 'generated_from']);
  step('nothing else in any view changed (partner SQR, hand route, every other question and fact identical)', changes.every((c) => allowed.has(c.key)) && changes.length === allowed.size, changes.map((c) => c.key).join(', '));
  const gf = ch.generated_from;
  step('the views name the release they came from (c1-v1 → c1-v2)', Array.isArray(gf) && gf.length === 1 && gf[0].to === 'c1-v2', JSON.stringify(gf));
  // Pages: only the header line naming the release differs on the partner's page.
  const sub = (f, d) => fs.readFileSync(path.join(OUTV, d, f), 'utf8').replace(/<p class="sub">[^<]*<\/p>/, '');
  const pages = ['index.html', 'pqr.html', 'sqr-principal.html', 'sqr-partner.html', 'staff.html'].map((f) => [f, sub(f, 'c1-v1') === sub(f, 'c1-v2')]);
  step('pages: the partner\'s SQR is identical apart from the release line; the overview, PQR, principal SQR and staff pages change', pages.find(([f]) => f === 'sqr-partner.html')[1] && pages.filter(([, same]) => !same).length === 4, JSON.stringify(pages));

  // 5. Screenshots of the generated pages (desktop, phone, dark) and layout checks.
  const view = async (d, f, name, opts = {}) => {
    const c = await b.newContext({ viewport: { width: opts.w ?? 1280, height: 900 }, colorScheme: opts.scheme ?? 'light' }); const q = await c.newPage(); q.on('pageerror', (e) => errs.push(e.message));
    await q.goto('file://' + path.join(OUTV, d, f)); await q.waitForLoadState('load');
    if (opts.find) {
      const el = q.locator('.q, tr', { hasText: opts.find }).first();
      if (opts.open) await el.locator('summary').click().catch(() => {});
      await el.scrollIntoViewIfNeeded(); await q.evaluate(() => scrollBy(0, -120));
    }
    const wide = await q.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1);
    const table = await q.evaluate(() => { const t = document.querySelector('.tablewrap table'); return t ? t.offsetWidth : null; });
    await q.evaluate(() => document.fonts.ready);
    const kit = await q.evaluate(() => ({ logo: [...document.images].some((i) => i.alt === 'Expat Ready' && i.complete && i.naturalWidth > 0), fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')))] }));
    const seen = opts.find ? await q.locator('.q, tr', { hasText: opts.find }).first().textContent() : '';
    await shot(name, q); await c.close(); return { wide, seen, table, kit };
  };
  const LBL = 'Official language (English or French)';
  await view('c1-v1', 'pqr.html', '04-pqr-v1.png');
  const pv2 = await view('c1-v2', 'pqr.html', '05-pqr-v2.png', { find: LBL, open: true });
  step('PQR v2 page shows the service-language question', pv2.seen.includes('Why this is asked'));
  const sv2 = await view('c1-v2', 'sqr-principal.html', '06-sqr-principal-v2.png', { find: LBL });
  step('principal SQR v2 page shows it tagged "pre-filled from the PQR"', sv2.seen.includes('pre-filled from the PQR'));
  const tv2 = await view('c1-v2', 'staff.html', '07-staff-v2.png', { find: FACT });
  step('staff view v2 shows the fact in tier prospect', /prospect/.test(tv2.seen), tv2.seen.slice(0, 160));
  const ph = await view('c1-v2', 'pqr.html', '08-pqr-v2-phone.png', { w: 375, find: LBL });
  const phs = await view('c1-v2', 'staff.html', '09-staff-v2-phone.png', { w: 375, find: FACT });
  step('no sideways page scroll at 375px (PQR and staff view; wide tables scroll inside their box)', !ph.wide && !phs.wide);
  step('at 375px the staff table keeps readable columns (at least 720px wide, scrolling inside its box; run 4 found it squeezed)', phs.table >= 720, `table ${phs.table}px`);
  const dk = await view('c1-v2', 'sqr-principal.html', '10-sqr-principal-v2-dark.png', { scheme: 'dark', find: LBL });
  step('dark scheme renders without sideways scroll', !dk.wide);
  const kits = [pv2, sv2, tv2, ph, phs, dk].map((r) => r.kit);
  step('every page uses the Expat Ready kit: logo shown, Inter and Proxima Nova loaded (AIW-D265)', kits.every((k) => k.logo && k.fonts.includes('Inter Variable') && k.fonts.includes('Proxima')), JSON.stringify(kits[0]));
  step('no page errors', errs.length === 0, errs.join(' | '));

  const result = { at: new Date().toISOString(), url: URL, release: { version: 2, configuration_sha256: rel2.configuration_sha256, supersedes: rel2.supersedes }, view_code_sha256: j2.view_code_sha256, configuration_diff: cdiff, view_changes: changes, pages_identical_apart_from_release_line: Object.fromEntries(pages), steps: log };
  fs.writeFileSync(path.join(OUT, 'change-run.json'), JSON.stringify(result, null, 1) + '\n');
  const failed = log.filter((x) => !x.ok).length;
  console.log(`${log.length - failed}/${log.length} passed`);
  await b.close(); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
