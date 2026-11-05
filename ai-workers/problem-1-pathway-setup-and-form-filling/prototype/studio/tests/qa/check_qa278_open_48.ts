// QA-278 (C6.1): 48 distinct case opens at once must not answer 500. The refused opens must leave no pin or audit line.
// This is a hardening probe beyond #1121's deterministic 12/16-connection test; it is not a CI timing gate. US$0.
//   zsh studio/tools/isolated.sh qa_open48 4473 start && tsx studio/tests/qa/check_qa278_open_48.ts 4473 xr_studio_qa_open48
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { client, recorder } from "../runtime/api.ts";

const PORT = Number(process.argv[2] ?? 4473), DB = process.argv[3] ?? "xr_studio_qa_open48";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const STUDIO = join(import.meta.dirname, "..", ".."), run = Date.now().toString(36);

(async () => {
  const released = () => sql("select count(*) from config_release r join combination k on k.id = r.combination_id where k.combination_key='vv.single'") !== "0";
  if (!released()) {
    execFileSync(join(STUDIO, "node_modules", ".bin", "tsx"), ["--tsconfig", join(STUDIO, "api", "tsconfig.json"), join(STUDIO, "tests", "runtime", "setup_visitor_visa.ts"), String(PORT), DB], { stdio: ["ignore", "ignore", "inherit"], timeout: 600_000 });
    ok("QA-278 setup: Visitor visa is released by the product's setup steps", released());
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  const open = (i: number) => call("POST", "/runtime/cases", { combinationId: vv, reference: `QA278-${run}-${i}`, clientActor: "user-P", principal: { displayName: "Sample Client A" } }, "user-O");
  await open(-1);
  const before = { cases: Number(sql("select count(*) from pack_work_pin")), audit: Number(sql("select count(*) from audit_event where action='opened' and entity='case'")) };
  const answers = await Promise.all(Array.from({ length: 48 }, (_, i) => open(i)));
  const statuses = answers.reduce<Record<number, number>>((all, r) => ({ ...all, [r.status]: (all[r.status] ?? 0) + 1 }), {});
  const succeeded = answers.filter((r) => r.status === 201);
  ok("QA-278 fail (C6.1): all 48 distinct case opens answer 201, never a generic server error", succeeded.length === 48, { statuses, first_error: answers.find((r) => r.status !== 201)?.body });
  ok("QA-278 fail: every successful answer is a different case with its principal", new Set(succeeded.map((r) => r.body?.id)).size === succeeded.length && succeeded.every((r) => r.body?.people?.some((p: { role: string }) => p.role === "principal")), { answers: succeeded.length });
  const after = { cases: Number(sql("select count(*) from pack_work_pin")), audit: Number(sql("select count(*) from audit_event where action='opened' and entity='case'")) };
  ok("QA-278 fail (data): exactly one pin and one audit line per successful case; refused opens leave none", after.cases - before.cases === succeeded.length && after.audit - before.audit === succeeded.length, { before, after, succeeded: succeeded.length });
  process.exitCode = summary() ? 1 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
