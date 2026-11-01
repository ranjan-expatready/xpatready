// C6.12 /prepare checks (M3-B2, runtime lane): engine/runtime/prepare.ts on a small synthetic release. formItems: which
// forms each applying person files, with the line's channel and signature; prepareView: the stored rows and derived fee
// lines in the M3-CONTRACT shape. Each rule has a passing and a failing case. No database, no server, no model (US$0).
//   tsx studio/tests/check_vv_prepare.ts
import type { Known } from "../engine/render.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { deriveFilings } from "../engine/runtime/filings.ts";
import { formItems, prepareView, type StoredFiling, type StoredItem } from "../engine/runtime/prepare.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const TODAY = new Date("2026-11-01T12:00:00Z");
const S = {
  combination: { key: "vv.single" }, canonical_fields: [{ id: "person.date_of_birth", value_type: "date" }, { id: "case.purpose", value_type: "code" }], derived_fields: [], field_maps: [], placements: [], checks: [], document_requirements: [], document_types: [], rules: [], sections: [],
  forms: [
    { form_number: "IMM 5257", who: "each_applicant", status: "always", channel: "PDF_UPLOAD", signature: "TYPED_NAME" },
    { form_number: "IMM 5707", who: "each_applicant", status: "always", channel: "ONLINE", min_age: 18 },
    { form_number: "IMM 5476", who: "case", status: "conditional", condition: { subjectKind: "CASE", op: "eq", field: "case.purpose", value: "family" }, condition_plain: "a representative is used" },
  ],
} as unknown as Snapshot;
const P = (id: string, role: Participant["role"], applies = true): Participant => ({ subjectId: id, role, label: `Client ${id}`, applies });
const people = [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner"), P("C", "child")];
const known = (pairs: Record<string, unknown>): Known => new Map(Object.entries(pairs).map(([k, value]) => [k, { value, status: "answered" as const, source: "test" }]));
const adults = { "A|person.date_of_birth": "1980-05-01", "B|person.date_of_birth": "1982-02-02", "C|person.date_of_birth": "2015-03-03" };
const has = (n: ReturnType<typeof formItems>, form: string, who: string) => n.find((x) => x.form === form && x.subject === who);

{
  const n = formItems(S, people, known(adults), TODAY);
  ok("C6.12 items pass: every applying person files their own IMM 5257, on the line's channel and signature", ["A", "B", "C"].every((w) => has(n, "IMM 5257", w)?.applies === true && has(n, "IMM 5257", w)?.channel === "PDF_UPLOAD" && has(n, "IMM 5257", w)?.signature === "TYPED_NAME"));
  ok("C6.12 items pass: IMM 5707 for the adults, Online", has(n, "IMM 5707", "A")?.channel === "ONLINE" && !!has(n, "IMM 5707", "B"));
  ok("C6.12 items (fail): the 11-year-old has no IMM 5707 (from 18)", !has(n, "IMM 5707", "C"));
  ok("C6.12 items: a case form whose condition is unanswered waits, on the principal's filing", has(n, "IMM 5476", "A")?.applies === "cannot_tell" && !has(n, "IMM 5476", "B"));
  ok("C6.12 items (fail): a case form whose condition does not hold is not filed", !has(formItems(S, people, known({ ...adults, "case|case.purpose": "tourism" }), TODAY), "IMM 5476", "A"));
  const noDob = formItems(S, people, known({}), TODAY);
  ok("C6.12 items: with no birth date, IMM 5707 waits for it instead of being left out", has(noDob, "IMM 5707", "C")?.applies === "cannot_tell");
  const out = formItems(S, [P("case", "case"), P("A", "principal"), P("B", "spouse_or_partner", false)], known(adults), TODAY);
  ok("C6.12 items (fail): a person not applying files nothing", !out.some((x) => x.subject === "B") && out.some((x) => x.subject === "A"));
}
{
  const d = deriveFilings("vv.single", people) as Extract<ReturnType<typeof deriveFilings>, { derived: true }>;
  const filings: StoredFiling[] = ["A", "B", "C"].map((s, i) => ({ id: `F${i}`, subjectId: s, submissionGroupId: "G", combinationKey: "vv.single", mode: "files_own", status: "NOT_STARTED", applicationNumber: null, active: true, applicants: [{ subjectId: s, role: ["principal", "spouse_or_partner", "child"][i], mode: "applying" }] }));
  const needs = formItems(S, people, known(adults), TODAY);
  const items: StoredItem[] = needs.map((n, i) => ({ id: `I${i}`, filingId: filings.find((f) => f.subjectId === n.subject)!.id, kind: "form", formKey: n.form, subjectId: n.subject, channel: n.channel, channelReason: null, active: true, version: 1 }));
  items.push({ id: "Iold", filingId: "F0", kind: "form", formKey: "IMM 0000", subjectId: "A", channel: "PAPER", channelReason: null, active: false, version: 1 });
  const v = prepareView({ derived: d, portal: "APR_PORTAL", filings, groups: [{ id: "G", kind: "family" }], items, needs, accepts: () => undefined, labels: new Map([["A", "Client A"]]) });
  ok("C6.12 view pass: filings carry the stored ids, one family group with all three", v.filings.map((f) => f.id).join() === "F0,F1,F2" && v.groups.length === 1 && v.groups[0].filings.length === 3 && v.groups[0].splittable);
  ok("C6.12 view pass: fee lines name the stored filing ids, in CAD, and add up to the group's total", v.fees.every((f) => ["F0", "F1", "F2"].includes(f.filing)) && v.fees.reduce((t, f) => t + f.amount_cents, 0) === d.groups[0].total_cents && v.fees.every((f) => f.amount === f.amount_cents / 100));
  ok("C6.12 view (fail): an inactive item is not shown", !v.items.some((i) => i.id === "Iold"));
  ok("C6.12 view: the portal is shown and read-only; with no IRCC record the channels offered are Online, PDF upload and Paper", v.portal === "APR_PORTAL" && v.portal_read_only === true && v.items.every((i) => i.accepts.join() === "ONLINE,PDF_UPLOAD,PAPER"));
  const changed = prepareView({ derived: d, portal: null, filings, groups: [{ id: "G", kind: "family" }], items: items.map((i) => i.id === "I0" ? { ...i, channel: "PAPER" as const, version: 2 } : i), needs, accepts: () => undefined, labels: new Map() });
  ok("C6.12 view: the signature follows the item's own channel (Paper: signed in pen), not the line's", changed.items.find((i) => i.id === "I0")?.signature === "PEN");
  ok("C6.12 view (fail): a changed item changes the version (409 for anyone holding the old one)", changed.version !== v.version && prepareView({ derived: d, portal: "APR_PORTAL", filings, groups: [{ id: "G", kind: "family" }], items, needs, accepts: () => undefined, labels: new Map([["A", "Client A"]]) }).version === v.version);
  const one = prepareView({ derived: d, portal: null, filings: filings.map((f) => f.id === "F2" ? { ...f, active: false } : f), groups: [{ id: "G", kind: "family" }], items, needs, accepts: () => undefined, labels: new Map() });
  ok("C6.12 view (fail): an inactive filing and its items are not shown", one.filings.length === 2 && !one.items.some((i) => i.filing === "F2"));
  ok("C6.12 view: what is not built yet is said, not hidden", v.not_built.some((x) => /split/.test(x)) && v.not_built.some((x) => /biometrics age/.test(x)));
}

process.exitCode = summary() ? 1 : 0;
