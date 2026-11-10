// qa (9 Nov, C7.5 capability round; QA-365, Bug · Minor): a finding's reason (acknowledge, dismiss, waive) is accepted
// with no words: "..." is three characters after trimming, so contracts/findings.ts FindingReason takes it. The same
// finding passed on Ready to file needs "at least 5 characters, with words" (engine/runtime/readiness.ts passRefusal), and
// P-71 asks for a recorded reason. Fails today; passes when a reason with no letter or digit is refused on its field.
// The pack's case (tests/fixtures/c75-made-up-run.ts packLikeCase) and its saved review replayed at US$0; on the fixture
// (setup_visitor_visa.ts, then lib/setup_vv_m3.ts) or the configured checkpoint. No model call.
//   zsh studio/tools/isolated.sh qa_reason 4474 start && tsx studio/tests/runtime/setup_visitor_visa.ts 4474 xr_studio_qa_reason \
//     && tsx studio/acceptance/lib/setup_vv_m3.ts 4474 xr_studio_qa_reason \
//     && tsx --tsconfig studio/api/tsconfig.json studio/tests/qa/check_qa365_finding_reason_words.ts 4474 xr_studio_qa_reason
import { OFFICER, call, main, ok, sql } from "../../acceptance/lib/m3.ts";
import { packLikeCase } from "../fixtures/c75-made-up-run.ts";

await main("QA-365", "a finding's reason needs words", async () => {
  const { c, P } = await packLikeCase();
  const spend0 = sql("select count(*) from ai_batch");
  const plan = await call("POST", `/runtime/cases/${c.id}/review-runs/plan`, { forms: ["IMM 5257"], subject: P }, OFFICER);
  const run = await call("POST", `/runtime/cases/${c.id}/review-runs`, { forms: ["IMM 5257"], subject: P, mode: "replay", planSha256: plan.body?.plan_sha256 }, OFFICER);
  const fs = ((await call("GET", `/runtime/cases/${c.id}/findings?source=ai`, undefined, OFFICER)).body?.findings ?? []) as { id: string; state: string }[];
  ok("QA-365 setup: the saved review replays at US$0 with findings to decide", run.status === 201 && fs.length >= 3 && sql("select count(*) from ai_batch") === spend0, { run: run.status, n: fs.length });
  const dots = await call("POST", `/runtime/findings/${fs[0]?.id}/acknowledge`, { reason: "..." }, OFFICER);
  ok("QA-365 fail: acknowledging with the reason \"...\" (no words) is refused on the reason field, the finding stays open", dots.status >= 400 && dots.status < 500, { status: dots.status, body: dots.body });
  const dashes = await call("POST", `/runtime/findings/${fs[1]?.id}/dismiss`, { reason: "---" }, OFFICER);
  ok("QA-365 fail: dismissing with the reason \"---\" (no words) is refused", dashes.status >= 400 && dashes.status < 500, { status: dashes.status, body: dashes.body });
  const words = await call("POST", `/runtime/findings/${fs[2]?.id}/acknowledge`, { reason: "Checked against the passport (Sample)" }, OFFICER);
  ok("QA-365 pass: a reason in words is accepted", words.status === 200, { status: words.status });
});
