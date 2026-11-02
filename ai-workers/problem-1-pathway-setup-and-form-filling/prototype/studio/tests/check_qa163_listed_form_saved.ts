// QA-163 (forms; C11.7, C2.x field maps, C4.11; P-108, P-227): a form listed in a combination's configuration WITHOUT a
// field map is drafted like any other (Saved at US$0); one that HAS a field map is still skipped as before. After Demo ›
// Reset to the six, Visitor visa's IMM 5257 is listed (the form finder attached it) but its edition holds no field map:
// before the fix the plan skipped it ("already in this combination's configuration"), Draft with AI › Saved answered 400
// and C4.11 then 409 "no form fields mapped". A pass and a fail case per rule; Saved only, no live AI call (US$0, the
// shared spend ledger unchanged).
//   zsh studio/tools/isolated.sh qa163 4463 start && tsx studio/tests/check_qa163_listed_form_saved.ts 4463 xr_studio_qa163
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LEDGER_DIR } from "../../p2/policy.ts";
import { client, recorder } from "./runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4463), DB = process.argv[3] ?? "xr_studio_qa163";
const { call, sql, until } = client(PORT, DB);
const { ok, summary } = recorder();
const AUTHOR = "user-A";
const ledger = () => { const f = join(LEDGER_DIR, "spend.jsonl"); return existsSync(f) ? readFileSync(f, "utf8") : ""; };
type Target = { source: string; action: string; why: string; attachmentId: string };

(async () => {
  const ledger0 = ledger();
  let r = await call("POST", "/demo/reset-to-six", { confirm: "RESET" }, AUTHOR);
  if (r.status >= 300) { console.error("STOP  Reset to the six failed", r.status, r.body); process.exit(2); }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const att = sql(`select id from source_attachment where combination_id='${vv}' and edition like 'IMM 5257 (%' and kind='Form'`);
  const edition = sql("select e.id from form_edition e join gov_form_def g on g.id=e.gov_form_def_id where g.form_key='IMM 5257' and e.channel='PDF'");
  const maps = () => Number(sql(`select count(*) from form_field_map where form_edition_id='${edition}'`));
  ok("C11.7 setup: after Reset to the six, IMM 5257 is listed on Visitor visa and its edition holds no field map", !!vv && !!att && sql(`select count(*) from combination_form where combination_id='${vv}' and lineage_key='IMM 5257' and status<>'RETIRED'`) !== "0" && maps() === 0, { vv, att, maps: maps() });

  // Rule 1, pass: the reset's own Saved replay (P-108, the six with replayed AI) now drafts the listed IMM 5257 too.
  const resetJob = sql(`select id||'|'||mode||'|'||status||'|'||coalesce(cost_usd::text,'null') from drafting_job where attachment_id='${att}' and kind='field_map' order by started_at limit 1`);
  ok("C11.7 QA-163 rule 1 pass: Reset to the six drafts the listed IMM 5257 from its Saved answer (REPLAY, completed, US$0)", /\|REPLAY\|COMPLETED\|0$/.test(resetJob), resetJob);

  // Rule 1, pass: Draft with AI › Saved on it is planned as the saved answer and starts (was 400).
  r = await call("POST", "/ai/plan", { scope: { kind: "source", ids: [att] }, mode: "REPLAY", draftAgain: true }, AUTHOR);
  const t1 = (r.body?.targets ?? [])[0] as Target | undefined;
  ok("C2.12 QA-163 rule 1 pass: the plan for IMM 5257 (listed, no field map) is the Saved answer, US$0", r.status < 300 && t1?.action === "reuse_saved_output" && r.body.totals.worst_usd === 0, t1 ?? r.body);
  r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, AUTHOR);
  const jobId: string | undefined = r.body?.id;
  ok("C2.12 QA-163 rule 1 pass: Draft with AI › Saved on IMM 5257 starts (201), not 400 \"already in this combination's configuration\"", r.status === 201 && !!jobId, { status: r.status, body: r.status === 201 ? r.body?.mode : r.body });
  await until(async () => ["COMPLETED", "FAILED", "BLOCKED"].includes((await call("GET", `/jobs/${jobId}`)).body?.status), 180_000);
  const job = (await call("GET", `/jobs/${jobId}`)).body;
  ok("C2.12 QA-163 rule 1 pass: it completes from the Saved answer: mode REPLAY, US$0, proposals to decide", job?.status === "COMPLETED" && job?.mode === "REPLAY" && Number(job?.costUsd ?? 0) === 0 && (job?.items ?? []).length > 0, { status: job?.status, mode: job?.mode, cost: job?.costUsd, items: (job?.items ?? []).length });
  ok("C2.12 P-227: no live AI call: no LIVE step, and the shared spend ledger is unchanged", sql("select count(*) from drafting_job where mode='LIVE'") === "0" && ledger() === ledger0);

  // C4.11 before the field map is applied: the refusal stands while nothing is mapped (the rule's fail case).
  r = await call("POST", `/combinations/${vv}/draft-qd/plan`, { mode: "rules" }, AUTHOR);
  ok("C4.11 fail: with no field map yet: still 409 \"no form fields mapped\"", r.status === 409 && /no form fields mapped/.test(JSON.stringify(r.body)), { status: r.status });

  // A person decides the proposals and applies them (Review AI proposals), as the screens do.
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "REUSE" }, AUTHOR);
  await call("POST", `/jobs/${jobId}/accept-clean`, { outcome: "NEW" }, AUTHOR);
  for (const i of (await call("GET", `/jobs/${jobId}`)).body.items.filter((x: { decision: string }) => x.decision === "PENDING")) {
    const x = await call("POST", `/jobs/${jobId}/items/${i.id}`, { decision: "ACCEPTED", note: "QA-163 check: accepted as shown (Sample)." }, AUTHOR);
    if (x.status >= 300) ok(`decision on ${i.proposedKey}`, false, x.body);
  }
  r = await call("POST", `/jobs/${jobId}/apply`, {}, AUTHOR);
  ok("C2.12: the decided IMM 5257 field map is applied to the draft", r.status < 300 && maps() > 0, r.status < 300 ? { maps: maps() } : r.body);

  // C4.11 after: it proceeds past "no form fields mapped".
  r = await call("POST", `/combinations/${vv}/draft-qd/plan`, { mode: "rules" }, AUTHOR);
  ok("C4.11 pass: it proceeds past \"no form fields mapped\" on Visitor visa", r.status < 300 && !/no form fields mapped/.test(JSON.stringify(r.body)), { status: r.status, body: r.status < 300 ? undefined : r.body });

  // Rule 2: a listed form that HAS a field map is still skipped, as before (the pass and the refusal).
  r = await call("POST", "/ai/plan", { scope: { kind: "combination", ids: [vv] }, mode: "REPLAY" }, AUTHOR);
  const t2 = ((r.body?.targets ?? []) as Target[]).find((t) => t.attachmentId === att);
  ok("C2.12 QA-163 rule 2 (skip kept): once mapped, IMM 5257 is skipped as already in the configuration", t2?.action === "skip" && /already in this combination's configuration/.test(t2.why), t2);
  r = await call("POST", `/attachments/${att}/draft`, { mode: "replay" }, AUTHOR);
  ok("C2.12 QA-163 rule 2 fail: Draft with AI › Saved on the mapped IMM 5257 is refused 400 with the same words", r.status === 400 && /IMM 5257 is already in this combination's configuration/.test(JSON.stringify(r.body)), { status: r.status, body: r.body?.detail });
  ok("P-227: still no live AI call at the end; ledger unchanged", sql("select count(*) from drafting_job where mode='LIVE'") === "0" && ledger() === ledger0);

  process.exit(summary() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
