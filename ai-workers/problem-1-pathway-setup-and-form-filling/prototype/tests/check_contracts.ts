// Contract test (language-neutral contracts, run here with Node 24 + ajv). No AI call. Schema tests check
// shape only; the P2 runner policy is enforced and tested in p2/guard.ts and tests/check_p2_guard.ts.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { idempotencyKey, canRelease, staleSources } from "../contracts/rules.ts";

const P = join(import.meta.dirname, "..");
const read = (f: string) => JSON.parse(readFileSync(join(P, f), "utf8"));
const ajv = new Ajv({ allErrors: true });
for (const s of ["field-map-entry", "drafting-run", "release-record"]) ajv.addSchema(read(`contracts/${s}.v0.schema.json`));
const run = ajv.getSchema("https://expatready.local/contracts/drafting-run.v0.json")!;
const rel = ajv.getSchema("https://expatready.local/contracts/release-record.v0.json")!;
const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);

const valid = read("contracts/fixtures/drafting-run.valid.json");
t("valid drafting run accepted", run(valid) === true);
const leak = structuredClone(valid); leak.inputs.official_files.push({ file: "prototype/expected/slice-1-field-map.json", sha256: "a".repeat(64) });
t("answer key on the drafting input list is rejected (schema shape only; p2/guard.ts enforces)", run(leak) === false);
const noEvidence = structuredClone(valid); delete noEvidence.entries[0].evidence;
t("mapped entry without source evidence is rejected", run(noEvidence) === false);
const noRoute = structuredClone(valid); noRoute.settings.provider_route = "";
t("run without the AIW-D261 route is rejected (schema shape only; p2/guard.ts enforces)", run(noRoute) === false);
const noReason = structuredClone(valid); delete noReason.entries[1].unresolved_reason;
t("unresolved entry without a reason is rejected", run(noReason) === false);
const badStatus = structuredClone(valid); badStatus.status = "partly_ok";
t("unknown status is rejected", run(badStatus) === false);

const k1 = idempotencyKey(valid); const k2 = idempotencyKey(structuredClone(valid));
t("same inputs and settings give the same idempotency key (key computation only; store lookup S6/S7 not yet built)", k1 === k2);
const changed = structuredClone(valid); changed.inputs.official_files[0].sha256 = "b".repeat(64);
t("a changed source file gives a different key", idempotencyKey(changed) !== k1);

// D254: author or submitter never approves or publishes, the Platform Owner included. Demonstration users.
const A = { user_id: "user-A", role: "content_publisher" }, B = { user_id: "user-B", role: "content_publisher" }, C = { user_id: "user-C", role: "content_publisher" };
const PO = { user_id: "user-PO", role: "platform_owner" };
const H = "c".repeat(64);
const record = { configuration_sha256: H, revision: 1, source_files: valid.inputs.official_files, drafting_run_ids: ["run-0001-example"], author: A, submitter: B, approver: C, decisions: [], released_at: "2026-10-19T00:00:00Z" };
const refusedFor = (r: Parameters<typeof canRelease>[0], who: string) => { const c = canRelease(r, H); return !c.ok && c.reason.includes(who); };
t("release record shape accepted", rel(record) === true);
const noSubmitter: any = structuredClone(record); delete noSubmitter.submitter;
t("release record without a submitter is rejected", rel(noSubmitter) === false);
t("approval by a third person (author A, submitter B, approver C) accepted", canRelease(record, H).ok === true);
t("author approving refused (A, B, approver A)", refusedFor({ ...record, approver: A }, "the author"));
t("submitter approving refused (A, B, approver B)", refusedFor({ ...record, approver: B }, "the submitter"));
t("Platform Owner as author approving refused", refusedFor({ ...record, author: PO, approver: PO }, "the author"));
t("Platform Owner as submitter approving refused", refusedFor({ ...record, submitter: PO, approver: PO }, "the submitter"));
t("same person in two roles is still refused (author PO, approver PO as content publisher)", refusedFor({ ...record, author: PO, approver: { ...PO, role: "content_publisher" } }, "the author"));
t("Platform Owner as an uninvolved third person may approve", canRelease({ ...record, approver: PO }, H).ok === true);
t("submitter publishing refused even with a third-person approver", refusedFor({ ...record, publisher: B }, "publisher is the submitter"));
t("author publishing refused even with a third-person approver", refusedFor({ ...record, publisher: A }, "publisher is the author"));
t("approval of a different hash refused", canRelease(record, "d".repeat(64)).ok === false);
t("source change marks the release stale", staleSources(record.source_files, { "official-sources/ircc/forms/imm5707e.pdf": "e".repeat(64) }).length === 1);
t("unchanged sources keep the release current", staleSources(record.source_files, { "official-sources/ircc/forms/imm5707e.pdf": valid.inputs.official_files[0].sha256 }).length === 0);

// The answer key must point only at boxes that exist in the official form inventory.
const key = read("expected/slice-1-field-map.json");
const inv: Record<string, Set<string>> = {};
for (const f of ["imm5707e", "imm1295e"]) inv[f] = new Set(read(`p1/inventory/${f}.inventory.json`).fields.map((x: any) => x.data_path).filter(Boolean).map((p: string) => p.replace(/Child\[\*\]/, "Child[0]")));
let missing: string[] = [];
for (const i of key.instances) for (const e of i.entries) {
  const f = i.form === "IMM 5707" ? "imm5707e" : "imm1295e";
  if (!inv[f].has(e.data_path.replace(/Child\[\d+\]/, "Child[0]"))) missing.push(e.data_path);
}
t(`answer key boxes all exist in the form inventory (${missing.length} missing)`, missing.length === 0);

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
if (missing.length) console.log(missing.slice(0, 5));
process.exit(failed ? 1 : 0);
