// C11.5 checks (runtime lane, M3-A2; P-106, BR-13, stand-in SI-10): Retail and Corporate stay apart at runtime. A case
// may rely on an employer case only when its combination is Retail and its released forms read employer facts
// ("organisation." facts). Every rule with a passing and a failing case: the pure rule (engine/runtime/employer.ts, no
// server) and the API on an isolated copy where setup_visitor_visa.ts released the Visitor visa (vv.single). Sample data;
// no model call (US$0).
//   zsh studio/tools/isolated.sh runtime_m3a2 4437 start && tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/setup_visitor_visa.ts 4437 xr_studio_runtime_m3a2
//   tsx --tsconfig studio/api/tsconfig.json studio/tests/runtime/check_c115_employer.ts 4437 xr_studio_runtime_m3a2
import { employerFacts, employerLinkOffer } from "../../engine/runtime/employer.ts";
import { client, recorder } from "./api.ts";

const PORT = Number(process.argv[2] ?? 4437), DB = process.argv[3] ?? "xr_studio_runtime_m3a2";
const { call, sql } = client(PORT, DB);
const { ok, summary } = recorder();
const REP = "user-R", OFFICER = "user-O", SOLO = "user-S", CLIENT = "user-P", AUTHOR = "user-A";
const run = Date.now().toString(36);

const maps = (...facts: (string | null)[]) => [{ form: "IMM 0000", entries: facts.map((fact, i) => ({ field: `f${i}`, outcome: fact ? "mapped" : "unmapped", fact })) }];
const snap = (label: string, client_type: string | null, field_maps: unknown) => ({ combination: { label, client_type }, field_maps });

function pure() {
  const vv = employerLinkOffer(snap("Visitor visa", "INDIVIDUAL", maps("person.family_name", "passport.number", null)));
  ok("C11.5 fail: a Retail combination whose forms read no employer facts offers no employer case link", !vv.offered && vv.facts.length === 0);
  ok("C11.5: the reason is the board's words (frame 1)", vv.reason === "Not offered: the Visitor visa has no employer facts.", vv.reason);
  const wp = employerLinkOffer(snap("Employer-specific work permit", "INDIVIDUAL", maps("organisation.name", "organisation.address", "organisation.name", "person.family_name")));
  ok("C11.5: a Retail combination whose forms read employer facts offers the link, counting only the facts it reads (review m2)", wp.offered && wp.reason === "Offered: the Employer-specific work permit forms read 2 employer facts; you can copy them from an employer case.", wp.reason);
  ok("C11.5: the employer facts are listed once each, sorted", JSON.stringify(wp.facts) === JSON.stringify(["organisation.address", "organisation.name"]), wp.facts);
  const corp = employerLinkOffer(snap("LMIA", "CORPORATE", maps("organisation.name")));
  ok("C11.5 fail: a Corporate combination never links to another employer case, even when it reads employer facts", !corp.offered && /Corporate case/.test(corp.reason), corp.reason);
  ok("C11.5 fail: an unmapped line or a fact that only starts like one is not an employer fact", employerFacts(snap("x", "INDIVIDUAL", [{ entries: [{ outcome: "unmapped", fact: "organisation.name" }, { outcome: "mapped", fact: "person.organisation_name" }] }])).length === 0);
  ok("C11.5 fail: a release with no field maps offers no link", !employerLinkOffer(snap("x", "INDIVIDUAL", undefined)).offered);
  ok("C11.5: a combination without a Pathway type (old release) is treated as Retail", employerLinkOffer(snap("x", null, maps("organisation.name"))).offered);
  // (E1, tech lead on #1632): the copy is written on the principal, so only boxes on forms whose line "who" reaches the
  // principal count (R2). The lines' "who" values are the releases' own (samples/wave1.json, samples/programs.json).
  const filed = (label: string, lines: { form: string; who: string; facts: string[] }[]) => ({ combination: { label, client_type: "INDIVIDUAL" },
    forms: lines.map((l) => ({ form_number: l.form, who: l.who })),
    field_maps: lines.map((l) => ({ form_number: l.form, entries: l.facts.map((fact, i) => ({ field: `f${i}`, outcome: "mapped", fact, person: "form_subject" })) })) });
  const lmia = employerLinkOffer(filed("Employer-specific work permit (With an LMIA)", [{ form: "imm5710e", who: "each_applicant", facts: ["organisation.employer_name", "organisation.employer_address", "person.family_name"] }]));
  ok("C11.5 (E1): With an LMIA, IMM 5710 (each applicant, so the principal files it) is still offered, with its 2 employer facts", lmia.offered && JSON.stringify(lmia.facts) === JSON.stringify(["organisation.employer_address", "organisation.employer_name"]), lmia);
  const sp = employerLinkOffer(filed("Study permit (Outside Canada)", [{ form: "imm1294e", who: "principal_and_children_when", facts: ["person.family_name"] }, { form: "imm1295e", who: "spouse_or_partner", facts: ["organisation.name", "organisation.address"] }]));
  ok("C11.5 fail (E1): the Study permit is not offered: its only employer boxes are on IMM 1295, which the spouse files (spouse_or_partner), not the principal", !sp.offered && sp.facts.length === 0 && sp.reason === "Not offered: the Study permit (Outside Canada) has no employer facts.", sp);
  const both = filed("x", [{ form: "a", who: "spouse_or_partner", facts: ["organisation.name"] }, { form: "b", who: "principal_applicant", facts: ["organisation.address"] }]);
  ok("C11.5 (E1): on a release where both file, only the principal's form's employer facts count", JSON.stringify(employerFacts(both)) === JSON.stringify(["organisation.address"]), employerFacts(both));
}

async function api() {
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: the Visitor visa is released on this copy", !!vv && sql(`select count(*) from config_release where combination_id='${vv}'`) !== "0");
  const r = await call("GET", `/runtime/combinations/${vv}/employer-link`, undefined, OFFICER);
  ok("C11.5 fail: \"Open a case\" on the Visitor visa says the employer case link is not offered, with the reason", r.status === 200 && r.body.offered === false && r.body.reason === "Not offered: the Visitor visa has no employer facts." && r.body.release_version >= 1, r.body);
  ok("C11.5: the solo firm's person reads the same rule", (await call("GET", `/runtime/combinations/${vv}/employer-link`, undefined, SOLO)).body.offered === false);
  ok("C11.5 fail: a client cannot read it (staff only)", (await call("GET", `/runtime/combinations/${vv}/employer-link`, undefined, CLIENT)).status === 403);
  ok("C11.5 fail: a configuration person cannot read it", (await call("GET", `/runtime/combinations/${vv}/employer-link`, undefined, AUTHOR)).status === 403);
  ok("C11.5 fail: an unknown combination is not found", (await call("GET", `/runtime/combinations/00000000-0000-4000-8000-000000000000/employer-link`, undefined, OFFICER)).status === 404);
  ok("C11.5 fail: a malformed id is not found, never a server error", (await call("GET", `/runtime/combinations/not-an-id/employer-link`, undefined, OFFICER)).status === 404);
  const unreleased = sql("select c.id from combination c where c.workspace_id=(select workspace_id from combination where id='" + vv + "') and not exists (select 1 from config_release r where r.combination_id=c.id) limit 1");
  if (unreleased) {
    const u = await call("GET", `/runtime/combinations/${unreleased}/employer-link`, undefined, OFFICER);
    ok("C11.5 fail: a combination with no release answers 409 with the opening words", u.status === 409 && /no released version yet/.test(JSON.stringify(u.body)), u.body);
  }
  const opened = await call("POST", "/runtime/cases", { combinationId: vv, reference: `C115-${run}`, clientActor: CLIENT, principal: { displayName: "Client A" } }, REP);
  ok("setup: a Visitor visa case opens", opened.status === 201 || opened.status === 200, opened.body);
  ok("C11.5 fail: the case says it relies on no employer case, read from its pinned release", opened.body?.employer_link?.offered === false && opened.body.employer_link.reason === "Not offered: the Visitor visa has no employer facts.", opened.body?.employer_link);
  const got = await call("GET", `/runtime/cases/${opened.body.id}`, undefined, OFFICER);
  ok("C11.5: reading the case again gives the same answer", JSON.stringify(got.body.employer_link) === JSON.stringify(opened.body.employer_link));
  const asClient = await call("GET", `/runtime/cases/${opened.body.id}`, undefined, CLIENT);
  ok("C11.5 fail: the client reads their case without the employer line (staff only, review m3)", asClient.status === 200 && !("employer_link" in asClient.body), Object.keys(asClient.body ?? {}));
}

pure();
await api();
process.exit(summary() ? 1 : 0);
