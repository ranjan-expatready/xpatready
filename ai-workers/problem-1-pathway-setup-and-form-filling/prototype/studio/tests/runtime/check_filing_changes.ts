// C6.13 checks (B135, screens lane): engine/runtime/filing-changes.ts, the rules of Make principal, Remove filing and Add
// filing back, and the client-person rule of engine/runtime/case.ts confirmation (BR-3b). Each rule has a passing and a
// failing case. No database, no server, no model call (US$0). Amounts come from the cited fee table (Sample, P-171).
//   tsx studio/tests/runtime/check_filing_changes.ts
import { applyChange, basisOf, clientPersonOf, diffFilings, everyoneFilesOwn, withClient, type ModeOf } from "../../engine/runtime/filing-changes.ts";
import { confirmation, type Participant } from "../../engine/runtime/case.ts";
import { deriveFilings } from "../../engine/runtime/filings.ts";
import type { CaseFilings } from "../../contracts/runtime.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { recorder } from "./api.ts";

const { ok, summary } = recorder();
const P = (id: string, role: Participant["role"], label: string, applies = true): Participant => ({ subjectId: id, role, label, applies });
const fam = (): Participant[] => [P("c", "case", "Case"), P("a", "principal", "Client A"), P("b", "spouse_or_partner", "Spouse A"), P("k1", "child", "Child A1"), P("k2", "child", "Child A2")];
const own: ModeOf = () => "files_own";
const o = { modeOf: own, combination: "Visitor visa", recorded: null };
const after = (r: ReturnType<typeof applyChange>) => ("after" in r ? r.after : null);
const refusal = (r: ReturnType<typeof applyChange>) => ("status" in r ? r : null);

// BR-0: only where every applying role files its own application.
ok("C6.13 BR-0 pass: Visitor visa (every role files own) allows the changes", everyoneFilesOwn(fam(), own));
const onPrincipal: ModeOf = (role) => (role === "child" ? "on_principal" : "files_own");
const r0 = refusal(applyChange("remove_filing", "b", fam(), { ...o, modeOf: onPrincipal }));
ok("C6.13 BR-0 fail: a release with people on the principal's application refuses in words (422)", r0?.status === 422 && /not worked out yet for Visitor visa/.test(r0.words), r0);

// BR-1: Remove filing stops the person's filing; they stay on the case.
const rm = after(applyChange("remove_filing", "b", fam(), o));
ok("C6.13 BR-1 pass: Remove filing sets the spouse not travelling and keeps everyone on the case", !!rm && rm.length === 5 && rm.find((p) => p.subjectId === "b")?.applies === false && rm.find((p) => p.subjectId === "b")?.role === "spouse_or_partner");
const rm2 = refusal(applyChange("remove_filing", "b", rm!, o));
ok("C6.13 BR-1 fail: removing a filing that is already removed is refused in words", rm2?.status === 422 && /not travelling/.test(rm2.words));
const back = after(applyChange("add_back", "b", rm!, o));
ok("C6.13 BR-1 pass: Add filing back makes the spouse travelling again", back?.find((p) => p.subjectId === "b")?.applies === true);
ok("C6.13 BR-1 fail: adding back a filing that exists is refused", refusal(applyChange("add_back", "b", fam(), o))?.status === 422);

// BR-2: the principal's filing is never removed.
const r2 = refusal(applyChange("remove_filing", "a", fam(), o));
ok("C6.13 BR-2 fail: removing the principal's filing → 422 \"Make someone else principal first\"", r2?.status === 422 && /^Make someone else principal first/.test(r2.words), r2);
ok("C6.13 BR-2 pass: a child's filing can be removed", !!after(applyChange("remove_filing", "k2", fam(), o)));

// BR-3: Make principal swaps the principal with the spouse or partner only.
const mp = applyChange("make_principal", "b", fam(), o);
const mpa = after(mp);
ok("C6.13 BR-3 pass: Make principal swaps the two roles and names the former principal", !!mpa && mpa.find((p) => p.subjectId === "b")?.role === "principal" && mpa.find((p) => p.subjectId === "a")?.role === "spouse_or_partner" && "other" in mp && mp.other === "a" && mpa.filter((p) => p.role === "principal").length === 1);
const r3 = refusal(applyChange("make_principal", "k1", fam(), o));
ok("C6.13 BR-3 fail: a child cannot swap with a parent (422, with the way out)", r3?.status === 422 && /child of the principal/.test(r3.words) && /open a case for them/.test(r3.words), r3);
const r3b = refusal(applyChange("make_principal", "b", rm!, o));
ok("C6.13 BR-3 fail: a person not travelling is not made principal (422, add their filing back first)", r3b?.status === 422 && /Add Spouse A's filing back first/.test(r3b.words));
ok("C6.13 BR-3 fail: no such person → 404", refusal(applyChange("make_principal", "zz", fam(), o))?.status === 404);

// BR-7: nothing changes once a filing is recorded.
const r7 = refusal(applyChange("remove_filing", "b", fam(), { ...o, recorded: { name: "Client A", on: "2026-11-03", number: "V312345678" } }));
ok("C6.13 BR-7 fail: with a recorded filing every change is refused, naming it, the date and the case's lifecycle (409)", r7?.status === 409 && /Client A's application was recorded as submitted to IRCC on 2026-11-03 \(V312345678\)/.test(r7.words) && /case's lifecycle/.test(r7.words), r7);

// BR-3b: the client stays the same person after Make principal.
ok("C6.13 BR-3b pass: no change → the client is the principal", clientPersonOf(fam(), []) === "a");
ok("C6.13 BR-3b pass: after a swap → the client is the former principal of the first Make principal",
  clientPersonOf(mpa!, [{ kind: "make_principal", subject: "b", other: "a", at: "2026-11-07T10:00:00Z" }, { kind: "make_principal", subject: "a", other: "b", at: "2026-11-07T11:00:00Z" }]) === "a");
const snap = { placements: [{ fact: "person.family_name", section_id: "s1", repeats: "no", collected_from: "client_questionnaire" }], canonical_fields: [{ id: "person.family_name", value_type: "text" }] } as unknown as Snapshot;
const ans = (subjectId: string) => ({ id: subjectId, subjectId, field: "person.family_name", rowKey: null, value: "SAMPLE", status: "DECLARED" as const, channel: "questionnaire", actor: "client-1", at: "2026-11-07T00:00:00Z" });
const people2 = withClient(mpa!, "a"), today = new Date("2026-11-07T00:00:00Z");
const confA = confirmation(snap, ans("a"), people2.find((p) => p.subjectId === "a"), "1986-01-01", today);
const confB = confirmation(snap, ans("b"), people2.find((p) => p.subjectId === "b"), "1988-01-01", today);
const plainB = confirmation(snap, ans("b"), fam().find((p) => p.subjectId === "b"), "1988-01-01", today);
const plainA = confirmation(snap, ans("a"), fam().find((p) => p.subjectId === "a"), "1986-01-01", today);
ok("C6.13 BR-3b pass: the former principal's own answers stay confirmed after the swap (they are the client)", plainA.confirmed && confA.confirmed, { plainA, confA });
ok("C6.13 BR-3b fail: the new principal's answers, typed by the client, do not become confirmed by the swap", !plainB.confirmed && !confB.confirmed && /client/.test(confB.why), { plainB, confB });

// BR-4, BR-5: the dependants are named, from the same derivation (Visitor visa: biometrics capped for 3 eligible).
type D = Extract<CaseFilings, { derived: true }>;
const people = fam();
const ages = new Map([["a", 40], ["b", 38], ["k1", 10], ["k2", 15]] as [string, number | null][]);
const derive = (ps: Participant[]) => deriveFilings("vv.single", ps, undefined, { ages }) as D;
const before = derive(people), then = derive(rm!);
const diff = diffFilings(before, then, people);
const by = (s: string) => diff.lines.find((l) => l.person === s)?.words.join(" | ") ?? "";
ok("C6.13 BR-4 pass: removing the spouse's filing names Client A's filing (biometrics: family maximum → own CAD 85) and Child A2's",
  /Biometrics.*→ CAD 85/i.test(by("a")) && /Biometrics.*covered by the family maximum → CAD 85/i.test(by("k2")) && /stops/.test(by("b")), diff.lines);
ok("C6.13 BR-4 pass: totals CAD 570 → CAD 470 (visa 4 × 100 → 3 × 100; biometrics 170 → 2 × 85)", diff.totals.before_cents === 57000 && diff.totals.after_cents === 47000, diff.totals);
ok("C6.13 BR-4 fail: a person whose filing does not change is not named (Child A1, 10, no biometrics)", !diff.lines.some((l) => l.person === "k1"), diff.lines);
const swap = diffFilings(before, derive(mpa!), people);
ok("C6.13 BR-4 pass: Make principal moves the capped biometrics to the new principal's filing", /Biometrics( fee)?: covered by the family maximum → CAD 170/i.test(swap.lines.find((l) => l.person === "b")?.words.join(" ") ?? "") && /Biometrics( fee)?: CAD 170 → covered by the family maximum/i.test(swap.lines.find((l) => l.person === "a")?.words.join(" ") ?? ""), swap.lines);

// BR-8: the basis follows the preview's own result.
ok("C6.13 BR-8 pass: the same preview gives the same basis", basisOf({ x: 1, y: [2] }) === basisOf({ x: 1, y: [2] }));
ok("C6.13 BR-8 fail: a different preview (another amount) gives another basis", basisOf({ t: 57000 }) !== basisOf({ t: 56999 }));

summary("C6.13 filing changes (engine)");
