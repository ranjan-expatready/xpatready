// P3 review and release rules on the real live draft (reviewed-repairs configuration since the P2 response) (W1 5.1, 5.2, 5.3; D254). No AI call, no server.
import { Ajv } from "ajv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { approve, buildItems, configHash, readiness, refuseDecision, releasedConfig, type Decision } from "../p3/review.ts";

const P = join(import.meta.dirname, "..");
// Since the P2 response (P2-M2, P2-R2-M2) the review loads the reviewed-repairs configuration; counts are derived from it.
const config = JSON.parse(readFileSync(join(P, "p2", "config", "c1-draft-1-live-r2.json"), "utf8"));
const items = buildItems(config);
const byId = new Map(items.map((i) => [i.id, i]));
const results: [string, boolean][] = [];
const t = (name: string, pass: boolean) => results.push([name, pass]);
const at = "2026-10-20T00:00:00Z";
const ajv = new Ajv({ allErrors: true, strict: false });
const releaseContract = ajv.compile(JSON.parse(readFileSync(join(P, "contracts", "release-record.v0.schema.json"), "utf8")));

// Items: every draft item is reviewable, beside its source (5.1).
const mapEntries = config.field_maps.reduce((a: number, m: any) => a + m.entries.length, 0);
t(`every field-map entry is an item (${mapEntries}) and every canonical field, form, document, rule, calculation, section, placement and AI check too (${items.length})`,
  items.filter((i) => i.kind === "mapping").length === mapEntries && items.length === mapEntries + config.canonical_fields.length + config.forms.length + config.document_requirements.length + config.rules.length + config.derived_fields.length + config.sections.length + config.placements.length + config.checks.filter((c: any) => c.made_by === "ai_draft").length);
t("every item carries a source (file and snippet)", items.every((i) => i.source.file && typeof i.source.snippet === "string"));
t("a checklist-cited form shows its quote highlighted in the official text", items.filter((i) => i.kind === "form" && i.source.found).every((i) => /\[\[.+\]\]/s.test(i.source.snippet)));
t("item ids are unique (repeated draft entries get their own id and a duplicate flag)", new Set(items.map((i) => i.id)).size === items.length);
const draftCited = config.checks.filter((c: any) => c.made_by === "ai_draft" && String(c.source_file ?? "").startsWith("prototype/p2/runs/")).length;
t(`checks citing an earlier draft are flagged, not shown as official (${draftCited}, derived from the configuration; D21)`, draftCited > 0 && items.filter((i) => i.kind === "check" && /cites an earlier AI draft/.test(i.flags.join(" "))).length === draftCited);

// Decisions (5.1 r3, r5; 5.2).
const flaggedMapped = items.find((i) => i.kind === "mapping" && i.proposal.outcome === "mapped" && i.flags.length)!;
const clean = items.find((i) => i.kind === "mapping" && i.proposal.outcome === "mapped" && !i.flags.length)!;
const unres = items.find((i) => i.kind === "mapping" && i.proposal.outcome === "unresolved")!;
const withAlt = items.find((i) => i.alternatives.length)!;
const smeItem = items.find((i) => i.needs_sme)!;
t("a clean item can be approved without a reason", refuseDecision(byId, { item_id: clean.id, decision: "accepted", by: "user-A" }) === null);
t("a flagged item cannot be approved without a recorded reason", /needs a recorded reason/.test(refuseDecision(byId, { item_id: flaggedMapped.id, decision: "accepted", by: "user-A" }) ?? ""));
t("an unresolved box cannot be approved as mapped", /cannot be accepted as mapped/.test(refuseDecision(byId, { item_id: unres.id, decision: "accepted", by: "user-A", reason: "x" }) ?? ""));
t("a correction must pick another proposal: nobody types a mapping (5.1 r3)", /nobody types a mapping/.test(refuseDecision(byId, { item_id: clean.id, decision: "corrected", by: "user-A", reason: "x" }) ?? ""));
t("choosing another trial's proposal with a reason is accepted", refuseDecision(byId, { item_id: withAlt.id, decision: "corrected", by: "user-A", chosen: 0, reason: "the other trial reads the heading correctly" }) === null);
t("returning an item needs an instruction for the re-draft", /instruction/.test(refuseDecision(byId, { item_id: clean.id, decision: "returned", by: "user-A" }) ?? ""));
t("only the SME duty signs off rules, conditions and values (5.2, D254)", /SME duty/.test(refuseDecision(byId, { item_id: smeItem.id, decision: "sme_signed", by: "user-A" }) ?? "") && refuseDecision(byId, { item_id: smeItem.id, decision: "sme_signed", by: "user-C" }) === null);

// A complete, valid review: A decides every item, C signs off, A submits, B approves.
function fullReview(): Decision[] {
  const ds: Decision[] = [];
  for (const i of items) {
    if (i.id === withAlt.id) ds.push({ item_id: i.id, decision: "corrected", by: "user-A", at, chosen: 0, reason: "chosen from another trial" });
    else if (i.kind === "mapping" && i.proposal.outcome === "unresolved") ds.push({ item_id: i.id, decision: "left_unresolved", by: "user-A", at, reason: "no case fact; completed by hand" });
    else ds.push({ item_id: i.id, decision: "accepted", by: "user-A", at, ...(i.flags.length ? { reason: "checked against the official source" } : {}) });
    if (i.needs_sme) ds.push({ item_id: i.id, decision: "sme_signed", by: "user-C", at });
  }
  return ds;
}
const ds = fullReview();
t("every recorded decision in the full review passes validation", ds.every((d) => refuseDecision(byId, d) === null));
t("nothing decided: not ready, with the reasons named", (() => { const r = readiness(items, []); return !r.ready && r.blockers.some((b) => /no decision/.test(b)) && r.blockers.some((b) => /SME/.test(b)); })());
t("all decided but without SME sign-offs: not ready (5.2 r2)", !readiness(items, ds.filter((d) => d.decision !== "sme_signed")).ready);
t("all decided and signed off: ready", readiness(items, ds).ready);
const released = releasedConfig(config, items, ds, 1);
const hash = configHash(released);
t("the released configuration is deterministic: the same decisions give the same hash", configHash(releasedConfig(config, items, ds, 1)) === hash);
const sub = (by: string, decisions = ds) => ({ hash: configHash(releasedConfig(config, items, decisions, 1)), by, at });
const go = (approver: string, submission: any, decisions = ds) => approve({ config, items, decisions, submission, approver, version: 1, sourceFiles: config.sources });
t("the author cannot approve (5.3 a1)", /author/.test((go("user-A", sub("user-C")) as any).reason ?? ""));
t("the submitter cannot approve", /submitter/.test((go("user-C", sub("user-C")) as any).reason ?? ""));
t("the Platform Owner who submitted cannot approve (5.3 r2)", /submitter/.test((go("user-PO", sub("user-PO")) as any).reason ?? ""));
const later = [...ds, { item_id: clean.id, decision: "returned", by: "user-A", at, instruction: "re-check the heading" } as Decision];
t("a returned item holds publishing (4.4, 5.1 a2)", /returned/.test((go("user-B", sub("user-A"), later) as any).reason ?? ""));
const changed = [...ds, { item_id: clean.id, decision: "left_unresolved", by: "user-A", at, reason: "changed after submission" } as Decision];
t("a draft changed after submission cannot reuse the approval (5.3 a2)", /stale approval/.test((go("user-B", sub("user-A"), changed) as any).reason ?? ""));
const editing = [...ds, { item_id: clean.id, decision: "accepted", by: "user-B", at } as Decision];
t("an approver who recorded review decisions is refused: the approver never edits (5.3)", /never edits/.test((go("user-B", sub("user-A", editing), editing) as any).reason ?? ""));
const ok = go("user-B", sub("user-A")) as any;
t("a second person approves the submitted hash: release written", ok.ok === true && ok.hash === hash);
t("the release record meets the release-record contract", releaseContract(ok.record) === true);
t("the record names author A, submitter A, approver B and every decision", ok.record.author.user_id === "user-A" && ok.record.submitter.user_id === "user-A" && ok.record.approver.user_id === "user-B" && ok.record.decisions.length === items.length);
const rel = ok.released;
const corrected = rel.field_maps.flatMap((m: any) => m.entries).find((e: any) => e.decision === "corrected");
t("the released configuration is versioned and released, every item at version 1", rel.status === "released" && rel.configuration_version === "c1-v1" && rel.field_maps.every((m: any) => m.entries.every((e: any) => e.item_version === 1)) && rel.forms.every((f: any) => f.item_version === 1));
t("a corrected entry carries the chosen proposal, and its field is in the released library", !!corrected && (corrected.outcome !== "mapped" || rel.canonical_fields.some((f: any) => f.id === corrected.fact)));
t("boxes kept unresolved are released as a hand route with the reason", rel.field_maps.flatMap((m: any) => m.entries).filter((e: any) => e.decision === "left_unresolved").every((e: any) => /^hand route:/.test(e.unresolved_reason)));

for (const [n, p] of results) console.log(`${p ? "PASS" : "FAIL"}  ${n}`);
const failed = results.filter(([, p]) => !p).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
