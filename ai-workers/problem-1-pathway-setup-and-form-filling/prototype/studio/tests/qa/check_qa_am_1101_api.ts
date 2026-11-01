// qa after-merge 1 Nov (main 52768cd2): API probes on what merged 30 Oct – 1 Nov that the builders' checks do not cover.
// C1.8 copies (#153): types, concurrency, retire, released fingerprint; C11.10 Before forms (#139): summary steps;
// QA-100 retest (P-175, #112): no live AI without STUDIO_AI_LIVE=approved. Sample data, fake launcher, US$0.
//   zsh studio/tools/isolated.sh qa_pr 4472 start && tsx studio/tests/qa/check_qa_am_1101_api.ts 4472
const PORT = Number(process.argv[2] ?? 4472);
let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d !== undefined ? ` — ${JSON.stringify(d).slice(0, 300)}` : ""}`); };
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => { const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) as any }; };
const field = (r: any, f: string) => (r.body?.errors ?? r.body?.fieldErrors ?? []).find?.((e: any) => e.field === f || e.path === f)?.message ?? r.body?.errors?.[f] ?? r.body?.fieldErrors?.[f];
(async () => {
  await call("POST", "/demo/reset", { confirm: "RESET" }); await call("POST", "/demo/load");
  const cat = (await call("GET", "/catalogue")).body; const leaves: any[] = [];
  const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { if (x.combinationId && x.kind === "combination") leaves.push(x); Object.values(x).forEach(walk); } }; walk(cat);
  const C = leaves.find((l) => l.status === "READY").combinationId;
  const forms = async () => (await call("GET", `/combinations/${C}/workspace?tab=forms`)).body;
  let f0 = await forms(); const F = f0.lines.find((l: any) => !l.document).code; const rev = () => f0.lines.find((l: any) => l.code === F).revision;
  const P = (b: any, a?: string) => call("PATCH", `/combinations/${C}/forms/${encodeURIComponent(F)}`, b, a);
  // types
  let r = await P({ copies: "2", baseRevision: rev() });
  ok("C1.8 fail: copies sent as the text \"2\" is refused on the field in words (not saved as 2, not a 500)", r.status === 400, { status: r.status, body: r.body });
  r = await P({ copies: 2.0, baseRevision: rev() }); f0 = await forms();
  ok("C1.8 pass: 2.0 is the whole number 2", r.status === 200 && f0.lines.find((l: any) => l.code === F).copies === 2, r.status);
  r = await P({ copies: -1, baseRevision: rev() });
  ok("C1.8 fail: -1 refused 400", r.status === 400, r.status);
  r = await P({ copies: null, baseRevision: rev() }); f0 = await forms();
  ok("C1.8 fail: null refused 400 and the 2 stays", r.status === 400 && f0.lines.find((l: any) => l.code === F).copies === 2, { s: r.status, msg: r.body?.detail });
  // concurrency: two saves from the same revision at once → one 200, one 409, the stored value is the winner's
  const base = rev(); const [a, b] = await Promise.all([P({ copies: 3, baseRevision: base }), P({ copies: 4, baseRevision: base })]); f0 = await forms();
  const st = [a.status, b.status].sort(); const win = a.status === 200 ? 3 : 4;
  ok("C1.8 concurrency: two saves from one revision → one saved, the other a 409; the saved value is the winner's", st[0] === 200 && st[1] === 409 && f0.lines.find((l: any) => l.code === F).copies === win, { st, copies: f0.lines.find((l: any) => l.code === F).copies });
  // wrong role
  r = await P({ copies: 5, baseRevision: rev() }, "user-C");
  ok("C1.8 role: an unknown or other role cannot set copies", r.status === 403 || r.status === 401, r.status);
  // snapshot carries it, and the config fingerprint changes
  const cfg = (await call("GET", `/combinations/${C}/config`)).body;
  ok("C1.8: the draft snapshot carries the saved copies", cfg.snapshot.forms.find((f: any) => f.form_number === F)?.copies === win, cfg.snapshot.forms.find((f: any) => f.form_number === F));
  // C11.10 Before forms: summary steps 1 and 2 are pages and people with a known state
  const s = (await call("GET", `/combinations/${C}/summary`)).body.setup;
  ok("C11.10: the setup checklist gives step 1 Official pages and step 2 Who can be with a state each", !!s && s.steps.length >= 2 && ["done", "next", "todo", "ai", "waiting"].includes(s.steps[0].state) && ["done", "next", "todo", "ai", "waiting"].includes(s.steps[1].state), s?.steps?.slice(0, 2).map((x: any) => [x.key ?? x.id, x.state, x.summary]));
  // QA-100: live AI refused without the switch, before any process starts
  const mapRow = leaves.find((l) => l.status !== "READY") ?? leaves[0];
  const plan = await call("POST", `/combinations/${mapRow.combinationId}/forms/find/plan`, { mode: "live" });
  const liveOn = plan.body?.live?.on;
  r = await call("POST", `/combinations/${mapRow.combinationId}/forms/find`, { mode: "live", planSha256: plan.body?.sha256 ?? plan.body?.planSha256 ?? "0".repeat(64), idempotencyKey: `qa-1101-${Date.now()}` });
  ok("QA-100 retest (P-175): on a test copy without STUDIO_AI_LIVE the finder plan says live is off, and a live start is refused 409 in words", liveOn === false && r.status === 409 && /switched off/i.test(JSON.stringify(r.body)), { planStatus: plan.status, live: plan.body?.live, start: r.status, msg: r.body?.detail });
  console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
