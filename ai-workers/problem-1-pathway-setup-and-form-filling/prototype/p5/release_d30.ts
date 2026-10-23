// P5 entry: review and release draft 3 (the D30 re-scope) through the P3 server's own API, the same validation
// the review screen uses (the screen itself was exercised in P3/P4). Only items that changed since c1-v2 reopen;
// every reopened item is decided with the D30 reason, the SME duty signs off reopened rules/conditions/values,
// author A submits, B approves. Needs the server: node p3/server.ts --config p5/drafts/c1-draft-3.json
// --previous p3/releases/c1-v2 --port 4319, and a fresh state (no p3/releases/c1-v3).
//   node p5/release_d30.ts      writes p5/evidence/release-d30.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const URL = "http://localhost:4319/";
const PROTOTYPE = join(import.meta.dirname, "..");
const api = async (path: string, body?: unknown) => (await fetch(URL + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {})).json();
const steps: { name: string; ok: boolean; detail?: string }[] = [];
const step = (name: string, ok: boolean, detail?: string) => { steps.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail.slice(0, 200)}` : ""}`); };
const REASON = "D30: each applicant's own work details and permit type (IMM 1295 'My occupation in Canada will be'; guide 5487 'Each person must meet the requirements')";

const s0 = await api("api/state");
const open = s0.items.filter((i: any) => !i.decision);
const reused = s0.items.filter((i: any) => i.decision?.by === "reused:c1-v2");
step(`draft 3 against c1-v2: ${open.length} changed items reopen, ${reused.length} reused with their c1-v2 decision`, open.length > 0 && open.length + reused.length === s0.items.length && open.every((i: any) => /person\.(work_permit_type|is_employer_specific_work_permit|intended_|lmia_or_offer_number|caregiver_)/.test(JSON.stringify(i.proposal))), open.map((i: any) => i.id).slice(0, 6).join(", "));
const self = await api("api/decide", { item_ids: open.map((i: any) => i.id), decision: "accepted", by: "user-A", reason: REASON });
const unresolvedOpen = open.filter((i: any) => i.kind === "mapping" && i.proposal.outcome === "unresolved");
step("every reopened item is decided with the D30 reason (author A)", self.recorded === open.length - unresolvedOpen.length, JSON.stringify(self.results.filter((r: any) => !r.ok).slice(0, 2)));
const s1 = await api("api/state");
const sme = s1.items.filter((i: any) => i.needs_sme && !i.sme);
const signed = sme.length ? await api("api/decide", { item_ids: sme.map((i: any) => i.id), decision: "sme_signed", by: "user-C" }) : { recorded: 0 };
step(`the SME duty signs off the reopened rules, conditions and values (${sme.length})`, signed.recorded === sme.length);
const s2 = await api("api/state");
step("ready to submit", s2.readiness.ready === true, JSON.stringify(s2.readiness.blockers));
const sub = await api("api/submit", { by: "user-A" });
step("author A submits", sub.ok === true, JSON.stringify(sub).slice(0, 160));
const selfApprove = await api("api/approve", { by: "user-A" });
step("the author cannot approve (D254)", selfApprove.ok === false && /author/.test(selfApprove.reason ?? ""), selfApprove.reason);
const rel = await api("api/approve", { by: "user-B" });
step("B approves: release c1-v3 published", rel.ok === true && rel.version === 3, JSON.stringify(rel));
const r3 = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", "c1-v3", "release.json"), "utf8"));
const c3 = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", "c1-v3", "configuration.json"), "utf8"));
const v2 = JSON.parse(readFileSync(join(PROTOTYPE, "p3", "releases", "c1-v2", "release.json"), "utf8"));
step("c1-v3 supersedes c1-v2 by its hash", r3.supersedes === v2.configuration_sha256 && r3.revision === 3);
// Structured references only (fact, field, inputs, ids); prose inside AI-drafted text may still name an old id.
const review = JSON.parse(readFileSync(join(PROTOTYPE, "p2", "field-review.c1.json"), "utf8"));
const oldIds = Object.keys(review.rescopes[0].ids);
const refs: string[] = []; const walk = (o: any, k = ""): void => { if (Array.isArray(o)) o.forEach((v) => (typeof v === "string" && k === "inputs" && oldIds.includes(v) ? refs.push(v) : walk(v, k))); else if (o && typeof o === "object") for (const [kk, v] of Object.entries(o)) { if (["fact", "field", "reference", "id"].includes(kk) && oldIds.includes(v as string)) refs.push(v as string); else walk(v, kk); } };
walk(c3);
step(`the released c1-v3 holds no structured reference to any of the ${oldIds.length} re-scoped case ids`, refs.length === 0, refs.join(", "));
mkdirSync(join(PROTOTYPE, "p5", "evidence"), { recursive: true });
writeFileSync(join(PROTOTYPE, "p5", "evidence", "release-d30.json"), JSON.stringify({ at: new Date().toISOString(), release: { version: 3, configuration_sha256: r3.configuration_sha256, supersedes: r3.supersedes }, reopened: open.length, reused: reused.length, sme_signed: sme.length, steps }, null, 1) + "\n");
const failed = steps.filter((s) => !s.ok).length;
console.log(`${steps.length - failed}/${steps.length} passed`);
process.exit(failed ? 1 : 0);
