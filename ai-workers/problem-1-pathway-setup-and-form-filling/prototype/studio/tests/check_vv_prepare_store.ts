// C6.12 /prepare checks (M3-B2, runtime lane; #325's, kept on the unified engine of #356): engine/runtime/prepare.ts on a small synthetic release. formItems: which
// forms each applying person files, with the line's channel and signature; prepareView: the stored rows and derived fee
// lines in the M3-CONTRACT shape. Each rule has a passing and a failing case. No database, no server, no model (US$0).
//   tsx studio/tests/check_vv_prepare.ts
import type { Known } from "../engine/render.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { render, type Person } from "../engine/render.ts";
import { channelOf, prepareVersion, wantedItems, type FormLine } from "../engine/runtime/prepare.ts";
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
/** #325's formItems on the unified engine: the release's forms per applying person (render), as wantedItems keeps them
 *  (a case form is the principal's; one that cannot be told yet waits), with the line's channel and signature. */
function formItems(s: Snapshot, ps: Participant[], k: Known, today: Date) {
  const persons: Person[] = ps.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const principal = persons.find((p) => p.role === "principal")?.id;
  const forms = (render(s, persons, k, { today }).forms as { form: string; person: string; applies: boolean | "cannot_tell"; form_kind?: string }[]).map((f) => ({ ...f, person: f.person === "case" ? principal ?? f.person : f.person }));
  const filers = persons.filter((p) => p.applies).map((p) => p.id);
  return wantedItems(filers, forms as never, new Map(), undefined, new Map()).filter((w) => w.kind === "form").map((w) => {
    const ch = channelOf((s.forms as FormLine[]).find((f) => f.form_number === w.key), undefined, null, null);
    return { form: w.key, subject: w.subject, applies: w.applies, channel: ch.channel, signature: ch.signature };
  });
}
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
  // #325's view checks, on the unified engine (#356): the view itself is assembled from the stored rows in
  // api/src/case-prepare.ts and checked through the API (check_vv_prepare_store_api.ts: stored ids, inactive filings and
  // items hidden, fee lines). Here, the pure parts: the signature follows the item's channel, and the version moves.
  const line = (S.forms as FormLine[]).find((f) => f.form_number === "IMM 5257");
  ok("C6.12 view: the signature follows the item's own channel (Paper: signed in pen), not the line's", channelOf(line, undefined, null, "PAPER").signature === "PEN" && channelOf(line, undefined, null, null).signature === "TYPED_NAME");
  ok("C6.12 view: with no IRCC record the channels offered are Online, PDF upload and Paper", ["ONLINE", "PDF_UPLOAD", "PAPER"].every((c) => channelOf(line, undefined, "APR_PORTAL", null).accepts.includes(c as never)));
  const groups = [{ id: "G", filings: ["F0", "F1", "F2"] }], its = [{ id: "I0", channel: null, version: 1 }, { id: "I1", channel: null, version: 1 }];
  const v0 = prepareVersion(groups, its);
  ok("C6.12 view (fail): a changed item changes the version (409 for anyone holding the old one)", prepareVersion(groups, its.map((x) => x.id === "I0" ? { ...x, channel: "PAPER", version: 2 } : x)) !== v0 && prepareVersion(groups, its) === v0);
  ok("C6.12 view (fail): a filing leaving the group changes the version", prepareVersion([{ id: "G", filings: ["F0", "F1"] }, { id: "G2", filings: ["F2"] }], its) !== v0);
}

process.exitCode = summary() ? 1 : 0;
