// W1-10 challenge A3 (Lead Q-L2) and P-149 (contract v2, Lead 29 Oct; screens plan-p149.md §C): the review-queue item
// contract (contracts/proposal-item.ts) parses one example of every kind and refuses what it must, with a pass and a fail
// check per v2 piece. Proves the schema only: S6 slice 1 and W1-10 slice 2 are its first users.
// No server, no database, NO model call (US$0). Example values are Sample.
//   cd prototype/studio && npx tsx tests/check_forms_proposal_contract.ts
// (by hand: tsx --tsconfig studio/api/tsconfig.json …, as run-suites.sh does)
import { PROPOSAL_KINDS, ProposalItem, type ProposalPayload } from "../contracts/proposal-item.ts";

let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`); };
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const examples = [{ facts: { "person.marital_status": "common_law" }, expected: true, confirmedBy: null }, { facts: { "person.marital_status": "single" }, expected: false, confirmedBy: null }];
const cond = { sentence: "If the applicant is in a common-law union", tree: { field: "person.marital_status", op: "eq", value: "common_law" }, sharedConditionKey: null, examples };
const payloads: ProposalPayload[] = [
  { kind: "field", label: "Date of birth", aliases: ["DOB"], meaning: "The person's date of birth as on the passport.", valueType: "date", subject: "principal_applicant", formBox: { form: "IMM 5257", edition: "09-2023", box: "1.4" } },
  { kind: "answer_list", label: "Marital status", values: [{ code: "single", label: "Single" }, { code: "married", label: "Married" }, { code: "common_law", label: "Common-law" }] },
  { kind: "section", label: "Personal details", aliases: ["About you"], fieldKeys: ["person.date_of_birth"] },
  { kind: "document_type", name: "Passport", proves: "Identity and citizenship", category: "identity", suppliesFacts: ["person.date_of_birth"], readerKind: "coded_lines", identityDocument: true },
  { kind: "form_check", sentence: "The passport expiry is after the date of birth", tree: {}, reads: ["passport.expiry"], examples },
  { kind: "person_role", label: "Dependent child", meaning: "A child under 22 who comes with the applicant.", mayBeApplicant: false, takesPartInCase: true },
  { kind: "condition", target: { kind: "form_line", key: "IMM 5409" }, roles: ["principal_applicant"], condition: cond },
  { kind: "requirement_line", documentType: "Marriage certificate", roles: ["principal_applicant", "spouse_or_partner"], always: false, condition: cond, alternativeGroup: null },
  { kind: "cross_check", sentence: "A spouse is listed when the marital status is Married", tree: {}, reads: ["person.marital_status", "spouse.listed"], severity: "warn", examples },
  { kind: "comes_from", factKey: "person.date_of_birth", role: "principal_applicant", from: "document", documentType: "Passport" },
  { kind: "pqr_pick", factKey: "person.country_of_citizenship", role: "principal_applicant", reason: "The guide's eligibility section tests it." },
];
const item = (payload: ProposalPayload, over: Record<string, unknown> = {}) => ({
  id: id(1), kind: payload.kind, runId: id(2), step: "documents", scope: { formEdition: null, combinationId: id(3) }, landsOn: "combination", reuse: { match: "new", existingKey: null }, payload,
  source: { file: "prototype/p1/inventory/imm5484e.text.inventory.json", sha256: "a".repeat(64), edition: "05-2026", page: 1, quote: "Marriage certificate, if applicable", quoteFound: true, rule: null },
  rounds: { draft: null, check: null }, rules: [{ rule: "quote found", passed: true, why: null }], agreement: "agreed", confidence: "ready", reason: null, origin: "ai",
  identity: { key: `${payload.kind}:example`, near: [], nearReason: null }, relatesTo: null, revision: null,
  status: "waiting", decision: null, basis: "SAMPLE", ...over,
});
const parses = (v: unknown) => ProposalItem.safeParse(v).success;

// --- v1, kept
ok("A3 pass: the contract names 11 kinds, and an example of each parses", PROPOSAL_KINDS.length === 11 && payloads.every((p) => parses(item(p))) && new Set(payloads.map((p) => p.kind)).size === 11, payloads.filter((p) => !parses(item(p))).map((p) => p.kind));
ok("A3 pass: an item keeps both rounds' readings", parses(item(payloads[7], { rounds: { draft: { reading: "only if common-law", payload: payloads[7], from: "replay", runFile: "prototype/p2/runs/x.json", costUsd: 0 }, check: { reading: "only if common-law", payload: payloads[7], from: "replay", runFile: "prototype/p2/runs/y.json", costUsd: 0 } } })));
const refused: [string, unknown][] = [
  ["an unknown kind", { ...item(payloads[0]), kind: "form_channel" }],
  ["a fourth confidence word", item(payloads[0], { confidence: "high" })],
  ["an extra field (strict)", { ...item(payloads[0]), extra: 1 }],
  ["a requirement line for no one", item({ ...payloads[7], roles: [] } as ProposalPayload)],
  ["a cross-answer check that reads one fact", item({ ...payloads[8], reads: ["person.marital_status"] } as ProposalPayload)],
  ["a cross-answer check that blocks", item({ ...payloads[8], severity: "block" } as unknown as ProposalPayload)],
  ["a source without a fingerprint", item(payloads[0], { source: { file: "x", sha256: "nope", edition: null, page: null, quote: "q", quoteFound: true } })],
  ["a reader kind outside P-133's four", item({ ...payloads[3], readerKind: "ai_vision" } as unknown as ProposalPayload)],
  ["an item whose payload is of another kind", { ...item(payloads[0]), kind: "section" }],
];
const accepted = refused.filter(([, v]) => parses(v)).map(([w]) => w);
ok("A3 fail: the contract refuses an unknown kind, a fourth confidence word, extra fields, a line for no one, a one-fact or blocking cross check, a source with no fingerprint, a fifth reader kind and a payload of another kind", accepted.length === 0, accepted);
ok("P-134 (rules, not schema): an identity document read as a letter parses, so the queue can show the refusal as Decide", parses(item({ ...payloads[3], readerKind: "letter_or_record" } as ProposalPayload)));

// --- P-154 (founder, 29 Oct): a fact comes from a Document, the Client or the Case officer; "agent" is retired
ok("P-154 pass: a fact may come from the case officer", parses(item({ ...payloads[9], from: "case_officer", documentType: null } as ProposalPayload)));
ok("P-154 fail: the retired role word \"agent\" is refused", !parses(item({ ...payloads[9], from: "agent", documentType: null } as unknown as ProposalPayload)));

// --- v2 (P-149)
ok("P-158 (1) pass: AI and rules items parse, each naming the run that made it", parses(item(payloads[0], { origin: "rules", agreement: "rules_only" })) && parses(item(payloads[0])));
ok("P-158 (1) fail: nothing enters by hand: a person's Add (origin person, add reason, no run) is refused, and so is an item with no run",
  !parses(item(payloads[0], { origin: "person", runId: null, step: "add", source: null, agreement: "rules_only" })) && !parses(item(payloads[0], { origin: "person" })) && !parses(item(payloads[0], { addReason: "The form asks it" })) && !parses(item(payloads[0], { runId: null })) && !parses(item(payloads[0], { origin: "import" })));
const src = (rule: unknown) => item(payloads[0], { source: { file: "x", sha256: "a".repeat(64), edition: null, page: null, quote: "q", quoteFound: true, rule } });
ok("P-158 (5) pass: a source names the rule that needs the fact (its key and sentence), or none", parses(src({ key: "rule.spouse_listed", sentence: "A spouse is listed when the applicant is married." })) && parses(src(null)));
ok("P-158 (5) fail: a rule reference without its sentence, with an empty key or with other fields is refused; a source must say rule (null when none)",
  !parses(src({ key: "rule.x" })) && !parses(src({ key: "", sentence: "A sentence here." })) && !parses(src({ key: "k", sentence: "A sentence here.", why: "x" })) && !parses(item(payloads[0], { source: { file: "x", sha256: "a".repeat(64), edition: null, page: null, quote: "q", quoteFound: true } })));
ok("P-149 (2) pass: an item carries its identity key; a near match parses with the reason why it is not the same", parses(item(payloads[0], { identity: { key: "field:date of birth|principal_applicant|date", near: ["person.birth_date"], nearReason: "That one is the date of entry, not of birth." } })));
ok("P-149 (2) fail: an item without an identity, or a near match without a reason, is refused", !parses({ ...item(payloads[0]), identity: undefined }) && !parses(item(payloads[0], { identity: { key: "k", near: ["person.birth_date"], nearReason: null } })));
ok("Lead 29 Oct pass: an answer list's identity is its set of value codes; a field and a section carry their synonyms", parses(item(payloads[1])) && (payloads[1] as { values: { code: string }[] }).values.every((v) => /^[a-z]/.test(v.code)) && parses(item(payloads[0])) && parses(item(payloads[2])));
ok("Lead 29 Oct fail: an answer list of labels only (no codes), or a code in capitals, is refused", !parses(item({ kind: "answer_list", label: "Marital status", choices: ["Single", "Married"] } as unknown as ProposalPayload)) && !parses(item({ kind: "answer_list", label: "x", values: [{ code: "Single", label: "Single" }] } as unknown as ProposalPayload)));
ok("P-149 placement pass: an item relates to the item it follows from", parses(item(payloads[9], { relatesTo: id(7) })));
ok("P-149 placement fail: relatesTo is an item id, not free text", !parses(item(payloads[9], { relatesTo: "the date of birth field" })));
const rev = (m: Record<string, unknown>) => ({ ofKey: "person.date_of_birth", fromVersion: 2, meaningChange: m });
ok("P-149 (3)(4) pass: an edit names the item and version it changes; a meaning change says what happens to its users; a forced yes stays yes", parses(item(payloads[0], { revision: rev({ answer: false, forced: false, usersLine: null }) })) && parses(item(payloads[0], { revision: rev({ answer: true, forced: true, usersLine: "3 combinations and 12 open cases read it; they move to version 3 at their next release." }) })));
ok("P-149 (4) fail: a forced change answered no, or a yes without the users line, or version 0, is refused", !parses(item(payloads[0], { revision: rev({ answer: false, forced: true, usersLine: null }) })) && !parses(item(payloads[0], { revision: rev({ answer: true, forced: false, usersLine: null }) })) && !parses(item(payloads[0], { revision: { ofKey: "k", fromVersion: 0, meaningChange: { answer: false, forced: false, usersLine: null } } })));
ok("P-149 (2) pass: a document type carries what it proves (its identity with the name)", parses(item(payloads[3])));
ok("P-149 (2) fail: a document type without what it proves is refused", !parses(item({ ...payloads[3], proves: undefined } as unknown as ProposalPayload)) && !parses(item({ ...payloads[3], proves: "" } as ProposalPayload)));
ok("P-149 (5) pass: a condition, a form check and a cross check carry example cases (facts and expected outcome), unconfirmed until the expert confirms", parses(item(payloads[6])) && parses(item(payloads[4])) && parses(item(payloads[8])) && parses(item(payloads[8], { payload: { ...payloads[8], examples: [{ ...examples[0], confirmedBy: "user-E" }] } })));
const badEx = (e: unknown) => item({ ...payloads[8], examples: e } as unknown as ProposalPayload);
ok("P-149 (5) fail: an example without its expected outcome, with extra keys, or more than five is refused, and a form check without its examples field is refused", !parses(badEx([{ facts: {}, confirmedBy: null }])) && !parses(badEx([{ ...examples[0], note: "x" }])) && !parses(badEx(Array(6).fill(examples[0]))) && !parses(item({ ...payloads[4], examples: undefined } as unknown as ProposalPayload)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
