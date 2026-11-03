// C6.12 /prepare checks (M3-B2, runtime lane; #325's, kept on the unified engine of #356): engine/runtime/prepare.ts on a small synthetic release. formItems: which
// forms each applying person files, with the line's channel and signature; prepareView: the stored rows and derived fee
// lines in the M3-CONTRACT shape. Each rule has a passing and a failing case. No database, no server, no model (US$0).
//   tsx studio/tests/check_vv_prepare_store.ts
import type { Known } from "../engine/render.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { render, type Person } from "../engine/render.ts";
import { channelOf, paperLine, prepareVersion, readBackOf, wantedItems, type FormLine } from "../engine/runtime/prepare.ts";
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

// C7.7 part 2 (r5c BR-8, P-144, P-171 (1), SA-1B-31): a Paper line in the deliverables list, with its barcode page.
{
  const V = (current: boolean) => ({ copy: "copy-1", at: "2026-11-03T10:00:00Z", current });
  const bar = (o: Partial<Parameters<typeof paperLine>[1]> = {}) => paperLine("IMM 5257", { barcode: true, missing: 0, validated: null, signers: ["person"], ...o });
  const plain = (o: Partial<Parameters<typeof paperLine>[1]> = {}) => paperLine("IMM 5476", { barcode: false, missing: 0, validated: null, signers: ["person", "representative"], ...o });
  const keys = (l: ReturnType<typeof paperLine>) => l.steps.map((x) => x.key).join(",");
  ok("C7.7 Paper (pass): a barcode form's Paper line lists its barcode page and its steps in order: Validate (adds the barcode page), print with the barcode page on top, signed in pen, mailed",
    bar().barcode_page === true && keys(bar()) === "validate,print,sign_in_pen,mail" && /Validate in Adobe.*barcode page/.test(bar().steps[0].words) && /barcode page on top/.test(bar().steps[1].words), bar().steps);
  ok("C7.7 Paper (fail): a form that makes no barcode page has no barcode page and no Validate step, and says so",
    plain().barcode_page === false && keys(plain()) === "print,sign_in_pen,mail" && /makes no barcode page/.test(plain().steps[0].words) && /makes no barcode page/.test(plain().reason), plain());
  ok("C7.7 Paper (pass): with every fact confirmed and no validated copy read back, a barcode form is To do and says to Validate in Adobe and read it back",
    bar().state === "to_do" && /Validate in Adobe/.test(bar().reason) && /read the validated copy back/.test(bar().reason) && bar().steps[0].done === false, bar());
  ok("C7.7 Paper (fail): once a validated copy is read back for today's facts it is no longer To do: In progress, its Validate step done, with the pen and the post still to come",
    bar({ validated: V(true) }).state === "in_progress" && bar({ validated: V(true) }).steps[0].done === true && /barcode page on top/.test(bar({ validated: V(true) }).reason) && /pen/.test(bar({ validated: V(true) }).reason), bar({ validated: V(true) }));
  ok("C7.7 Paper (pass, P-171 (1)): a fact changed after the validated copy was read back makes the line Out of date, naming a new Validate (even while that fact waits for confirming)",
    bar({ validated: V(false) }).state === "out_of_date" && /Validate again/.test(bar({ validated: V(false) }).reason) && bar({ validated: V(false), missing: 2 }).state === "out_of_date" && bar({ validated: V(false) }).steps[0].done === false, bar({ validated: V(false) }));
  ok("C7.7 Paper (fail): a current validated copy is never Out of date, and a form with no barcode page is never Out of date from a read-back",
    bar({ validated: V(true) }).state !== "out_of_date" && plain({ validated: V(false) }).state === "to_do" && plain({ validated: V(false) }).validated === null);
  ok("C7.7 Paper (pass): a fact still to answer or confirm keeps the line To do, waiting for it (only confirmed facts fill forms, P-72)",
    bar({ missing: 3 }).state === "to_do" && /Waiting for 3 facts/.test(bar({ missing: 3 }).reason) && /Waiting for 1 fact to/.test(plain({ missing: 1 }).reason));
  ok("C7.7 Paper (fail): with nothing missing the line does not say it waits for facts", !/Waiting for/.test(bar().reason) && !/Waiting for/.test(plain().reason));
  const all = [bar(), bar({ validated: V(true) }), bar({ validated: V(false) }), bar({ missing: 1 }), plain(), plain({ validated: V(true) })];
  ok("C7.7 Paper (pass): mailing comes after Ready to file; printing, the pen and the post are not recorded here yet (done: null, C8.1's Paper part)",
    all.every((l) => l.steps.find((x) => x.key === "mail")?.neededBefore === "after_ready" && l.steps.filter((x) => x.key !== "validate").every((x) => x.done === null)));
  ok("C7.7 Paper (fail): a Paper line is never Ready or Done in the list before it is signed in pen (readiness stays C7.6's)", all.every((l) => !["ready", "done"].includes(l.state)), all.map((l) => l.state));
  ok("C7.7 Paper (pass): the pen step names who signs (a parent for a child under 18; the person and the representative)",
    /a parent \(for a child under 18\)/.test(bar({ signers: ["parent"] }).steps[2].words) && /the person and the representative/.test(plain().steps[1].words));
  ok("C7.7 Paper (fail): with no signer worked out the pen step never names a person it does not know", bar({ signers: [] }).steps[2].words === "Signed in pen by each person who signs it");
  // Review M1 (part 2): the read-back that counts, by the copy view's rule (each copy on its newest read-back; QA-165).
  const at = (h: number) => new Date(Date.UTC(2026, 10, 3, h));
  const R = (copy: string, h: number, passed: boolean) => ({ copy, at: at(h), passed });
  const pick = (rs: ReturnType<typeof R>[]) => readBackOf(rs, (r) => r.passed);
  ok("C7.7 Paper (pass): of several copies, the newest copy whose own newest read-back passed counts (an older copy's or an older read-back does not)",
    pick([R("A", 9, true), R("B", 11, true), R("A", 10, true)])?.copy === "B" && pick([R("A", 9, true), R("A", 12, true), R("B", 11, true)])?.at.getTime() === at(12).getTime());
  ok("C7.7 Paper (fail): a copy whose newest read-back did not pass its form's own Validate never falls back to that copy's older passing one (the copy view and lock refuse it too)",
    pick([R("A", 9, true), R("A", 10, false)]) === null && pick([R("A", 9, true), R("A", 10, false), R("B", 8, true)])?.copy === "B" && pick([]) === null);
  // Review M2 (part 2): a barcode form released as an Online line has no read-back on the case (its copy is not for filing).
  ok("C7.7 Paper (pass): a barcode form moved to Paper from a line released Online says it cannot be validated and read back yet, and asks the Lead (never an endless To do)",
    bar({ lineOnline: true }).state === "to_do" && /released as an Online line/.test(bar({ lineOnline: true }).reason) && /Ask the Lead/.test(bar({ lineOnline: true }).reason));
  ok("C7.7 Paper (fail): a barcode form released as a PDF upload or Paper line keeps the Validate words, and a form with no barcode page is not affected",
    !/released as an Online line/.test(bar({ lineOnline: false }).reason) && /Validate in Adobe/.test(bar().reason) && !/released as an Online line/.test(plain({ lineOnline: true }).reason));
}

process.exitCode = summary() ? 1 : 0;
