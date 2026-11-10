// qa API probes for C7.5 (capability round, 9 Nov), on the pack's case (c75-pack-case's packLikeCase) on whatever data the
// copy holds; replay only, never a live request (US$0). Each line prints what the API answered.
//   tsx --tsconfig studio/api/tsconfig.json probe_c75_api.ts <port> <db>   (run from prototype/, STUDIO=<studio>)
const S = process.env.STUDIO!;
const m3 = await import(`${S}/acceptance/lib/m3.ts`);
const { packLikeCase } = await import(`${S}/tests/fixtures/c75-made-up-run.ts`);
const { call, sql, OFFICER, CLIENT } = m3;
const say = (k: string, v: unknown) => console.log(`[${k}] ${typeof v === "string" ? v : JSON.stringify(v)}`.slice(0, 700));
const { c, P } = await packLikeCase();
const plan = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P }, OFFICER);
say("plan", { status: plan.status, replay: plan.body?.replay_available, live_allowed: plan.body?.live_allowed, sha: plan.body?.plan_sha256?.slice(0, 12) });
const spend0 = sql("select count(*) from ai_batch");
say("client plan", (await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P }, CLIENT)).status);
say("client replay", (await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay", planSha256: plan.body?.plan_sha256 }, CLIENT)).status);
const live = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "live", planSha256: plan.body?.plan_sha256 }, OFFICER);
say("live on a live-off copy (refused, nothing launched)", { status: live.status, detail: live.body?.detail ?? live.body?.message });
const stale = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay", planSha256: "0".repeat(64) }, OFFICER);
say("replay with a stale plan checksum", { status: stale.status, detail: stale.body?.detail ?? stale.body?.message });
// Two replays at once: no duplicate findings.
const body = { forms: ["IMM 5257"], subject: P, mode: "replay", planSha256: plan.body?.plan_sha256 };
const [r1, r2] = await Promise.all([call("POST", `/runtime/cases/${c.id}/review-runs`, body, OFFICER), call("POST", `/runtime/cases/${c.id}/review-runs`, body, OFFICER)]);
say("two replays at once", { a: r1.status, b: r2.status, a_cost: r1.body?.cost_usd, b_detail: r2.body?.detail ?? r2.body?.note });
const ai = async () => ((await call("GET", `/runtime/cases/${c.id}/findings?source=ai`, undefined, OFFICER)).body?.findings ?? []) as { id: string; severity: string; state: string; field?: string }[];
let fs = await ai();
say("AI findings after two concurrent replays", { n: fs.length, distinct_fields: new Set(fs.map((f) => f.field)).size });
const r3 = await call("POST", `/runtime/cases/${c.id}/review-runs`, body, OFFICER);
fs = await ai();
say("third replay (sequential)", { status: r3.status, note: r3.body?.note, n_after: fs.length });
say("model calls made (ai_batch rows added)", sql("select count(*) from ai_batch") - spend0);
// Reasons on a finding's move.
const f0 = fs[0], f1 = fs[1], f2 = fs[2];
for (const [label, reason] of [["empty", ""], ["two letters", "ok"], ["three dots (no words)", "..."], ["three zero-width spaces + 'a'", "​​​a"], ["three dashes", "---"]] as const) {
  const r = await call("POST", `/runtime/findings/${f0.id}/acknowledge`, { reason }, OFFICER);
  say(`acknowledge with reason ${label}`, { status: r.status, detail: r.body?.detail ?? r.body?.message ?? r.body?.state });
  if (r.status < 300) break;
}
say("finding after the probes", (await ai()).find((x) => x.id === f0.id));
say("client acknowledges", (await call("POST", `/runtime/findings/${f1.id}/acknowledge`, { reason: "Client tries (Sample)" }, CLIENT)).status);
const w = await call("POST", `/runtime/findings/${f1.id}/waive`, { reason: "Waive a non-critical (Sample)" }, OFFICER);
say(`waive a ${f1.severity} finding`, { status: w.status, detail: w.body?.detail ?? w.body?.message });
const d1 = await call("POST", `/runtime/findings/${f2.id}/dismiss`, { reason: "Does not apply (Sample)" }, OFFICER);
const d2 = await call("POST", `/runtime/findings/${f2.id}/dismiss`, { reason: "Does not apply (Sample)" }, OFFICER);
say("dismiss twice", { first: d1.status, second: d2.status, detail: d2.body?.detail ?? d2.body?.message });
const r4 = await call("POST", `/runtime/cases/${c.id}/review-runs`, body, OFFICER);
const after = await ai();
say("replay after a dismiss: the dismissed finding stays dismissed, nothing re-added", { status: r4.status, note: r4.body?.note, n: after.length, f2: after.find((x) => x.id === f2.id)?.state ?? "(not listed)" });
// Audit: who and when, and no reason or value text in the activity log.
const act = (await call("GET", `/activity?limit=50`, undefined, "user-A")).body;
const lines = JSON.stringify(act ?? "").slice(0, 100000);
say("activity mentions finding moves", /finding/i.test(lines));
say("activity carries the reason text", /Does not apply \(Sample\)/.test(lines));
