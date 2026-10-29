// W1-10 challenge A3 (Lead Q-L2): the review-queue item contract PROPOSAL (contracts/proposal-item.ts) parses one example
// of every kind and refuses what it must. Proves the schema only: no code reads or writes it until the Lead approves it.
// No server, no database, NO model call (US$0). Example values are Sample.
//   cd prototype/studio && npx tsx tests/check_forms_proposal_contract.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { PROPOSAL_KINDS, ProposalItem, type ProposalPayload } from "../contracts/proposal-item.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cond = { sentence: "If the applicant is in a common-law union", tree: { field: "person.marital_status", op: "eq", value: "common_law" }, sharedConditionKey: null };
const payloads: ProposalPayload[] = [
  { kind: "field", label: "Date of birth", meaning: "The person's date of birth as on the passport.", valueType: "date", subject: "principal_applicant", formBox: { form: "IMM 5257", edition: "09-2023", box: "1.4" } },
  { kind: "answer_list", label: "Marital status", choices: ["Single", "Married", "Common-law"] },
  { kind: "section", label: "Personal details", fieldKeys: ["person.date_of_birth"] },
  { kind: "document_type", name: "Passport", category: "identity", suppliesFacts: ["person.date_of_birth"], readerKind: "coded_lines", identityDocument: true },
  { kind: "form_check", sentence: "The passport expiry is after the date of birth", tree: {}, reads: ["passport.expiry"] },
  { kind: "person_role", label: "Dependent child", meaning: "A child under 22 who comes with the applicant.", mayBeApplicant: false, takesPartInCase: true },
  { kind: "condition", target: { kind: "form_line", key: "IMM 5409" }, roles: ["principal_applicant"], condition: cond },
  { kind: "requirement_line", documentType: "Marriage certificate", roles: ["principal_applicant", "spouse_or_partner"], always: false, condition: cond, alternativeGroup: null },
  { kind: "cross_check", sentence: "A spouse is listed when the marital status is Married", tree: {}, reads: ["person.marital_status", "spouse.listed"], severity: "warn" },
  { kind: "comes_from", factKey: "person.date_of_birth", role: "principal_applicant", from: "document", documentType: "Passport" },
  { kind: "pqr_pick", factKey: "person.country_of_citizenship", role: "principal_applicant", reason: "The guide's eligibility section tests it." },
];
const item = (payload: ProposalPayload, over: Record<string, unknown> = {}) => ({
  id: id(1), kind: payload.kind, runId: id(2), step: "documents", scope: { formEdition: null, combinationId: id(3) }, landsOn: "combination", reuse: { match: "new", existingKey: null }, payload,
  source: { file: "prototype/p1/inventory/imm5484e.text.inventory.json", sha256: "a".repeat(64), edition: "05-2026", page: 1, quote: "Marriage certificate, if applicable", quoteFound: true },
  rounds: { draft: null, check: null }, rules: [{ rule: "quote found", passed: true, why: null }], agreement: "agreed", confidence: "ready", reason: null, origin: "ai", status: "waiting", decision: null, basis: "SAMPLE", ...over,
});

ok("A3 pass: the contract names 11 kinds, and an example of each parses", PROPOSAL_KINDS.length === 11 && payloads.every((p) => ProposalItem.safeParse(item(p)).success) && new Set(payloads.map((p) => p.kind)).size === 11, payloads.filter((p) => !ProposalItem.safeParse(item(p)).success).map((p) => p.kind));
ok("A3 pass: an item keeps both rounds' readings", ProposalItem.safeParse(item(payloads[7], { rounds: { draft: { reading: "only if common-law", payload: payloads[7], from: "replay", runFile: "prototype/p2/runs/x.json", costUsd: 0 }, check: { reading: "only if common-law", payload: payloads[7], from: "replay", runFile: "prototype/p2/runs/y.json", costUsd: 0 } } })).success);
const refused: [string, unknown][] = [
  ["an unknown kind", { ...item(payloads[0]), kind: "form_channel" }],
  ["a fourth confidence word", item(payloads[0], { confidence: "high" })],
  ["an extra field (strict)", { ...item(payloads[0]), extra: 1 }],
  ["a requirement line for no one", item({ ...payloads[7], roles: [] } as ProposalPayload)],
  ["a cross-answer check that reads one fact", item({ ...payloads[8], reads: ["person.marital_status"] } as ProposalPayload)],
  ["a cross-answer check that blocks", item({ ...payloads[8], severity: "block" } as unknown as ProposalPayload)],
  ["a source without a fingerprint", item(payloads[0], { source: { file: "x", sha256: "nope", edition: null, page: null, quote: "q", quoteFound: true } })],
  ["a reader kind outside P-133's four", item({ ...payloads[3], readerKind: "ai_vision" } as unknown as ProposalPayload)],
];
const accepted = refused.filter(([, v]) => ProposalItem.safeParse(v).success).map(([w]) => w);
ok("A3 fail: the contract refuses an unknown kind, a fourth confidence word, extra fields, a line for no one, a one-fact or blocking cross check, a source with no fingerprint and a fifth reader kind", accepted.length === 0, accepted);
ok("P-149 pass: one door: an item made by a person through the one Add parses, as do AI and rules items", ["ai", "rules", "person"].every((o) => ProposalItem.safeParse(item(payloads[0], { origin: o })).success));
ok("P-149 fail: an item names who made it; no other origin is accepted", !ProposalItem.safeParse(item(payloads[0], { origin: "import" })).success && !ProposalItem.safeParse({ ...item(payloads[0]), origin: undefined }).success);
ok("P-134 (rules, not schema): an identity document read as a letter parses, so the queue can show the refusal as Decide", ProposalItem.safeParse(item({ ...payloads[3], readerKind: "letter_or_record" } as ProposalPayload)).success);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
