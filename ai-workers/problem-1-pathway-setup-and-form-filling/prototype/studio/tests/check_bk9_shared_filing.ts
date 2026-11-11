// BK-9 checks (P-448, Bake plan row 23; P-319, P-425): changes to a family's shared filing (people on the principal's
// application) are worked out on every pathway, never refused for the combination. Each rule has a passing and a failing
// case: Remove filing and Add filing back for a person on the principal's application, Make principal moving the shared
// application to the new principal (said as one application that moves, never as one that stops and another that starts),
// the co-filed application never removed alone (its mode, release data), and Visitor visa (everyone files their own)
// unchanged. Modes are made up per role, so no combination key decides anything. No database, no server, no model call.
//   tsx studio/tests/check_bk9_shared_filing.ts
import { applyChange, diffFilings, type ModeOf } from "../engine/runtime/filing-changes.ts";
import type { Participant } from "../engine/runtime/case.ts";
import { deriveFilings } from "../engine/runtime/filings.ts";
import type { CaseFilings } from "../contracts/runtime.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const P = (id: string, role: Participant["role"], label: string, applies = true): Participant => ({ subjectId: id, role, label, applies });
const fam = (): Participant[] => [P("c", "case", "Case"), P("a", "principal", "Client A"), P("b", "spouse_or_partner", "Spouse A"), P("k", "child", "Child A1")];
const KEY = "x.shared";
/** A release where the spouse and the child are on the principal's application (a shared filing). */
const SHARED = new Map([["principal", "files_own"], ["spouse_or_partner", "on_principal"], ["child", "on_principal"]]);
const modeOf: ModeOf = (role) => SHARED.get(role) ?? null;
const o = { modeOf, combination: "Sample pathway", recorded: null };
const after = (r: ReturnType<typeof applyChange>) => ("after" in r ? r.after : null);
const refusal = (r: ReturnType<typeof applyChange>) => ("status" in r ? r : null);
type D = Extract<CaseFilings, { derived: true }>;
const derive = (ps: Participant[], modes = SHARED) => deriveFilings(KEY, ps, undefined, { modes: modes as never }) as D;

// (1) Remove filing and Add filing back for a person on the principal's application.
{
  const rm = applyChange("remove_filing", "k", fam(), o);
  ok("C6.13 BK-9: remove pass: a child on the principal's application can be taken off it (not refused for the pathway)", !!after(rm) && after(rm)!.find((p) => p.subjectId === "k")?.applies === false, refusal(rm));
  const before = derive(fam()), then = derive(after(rm)!);
  const kOn = (f: D) => f.filings[0].applicants.find((x) => x.subject === "k")?.mode;
  ok("C6.13 BK-9: remove pass: one shared application stays; the child is on it declared only, not applying (C11.12)", before.filings.length === 1 && then.filings.length === 1 && kOn(before) === "applying" && kOn(then) === "declared_only", then.filings);
  const d = diffFilings(before, then, fam());
  ok("C6.13 BK-9: remove pass: the preview says the child stays on the principal's application, declared only; nothing stops", d.lines.some((l) => l.person === "a" && l.words.includes("Child A1 is declared on this filing only (not travelling)")) && !d.lines.some((l) => l.words.some((w) => /stops/.test(w))), d.lines);
  const dBack = diffFilings(then, before, fam());
  ok("C6.13 BK-9: add back pass: the preview says the child applies on it again", dBack.lines.some((l) => l.person === "a" && l.words.includes("Child A1 applies on this filing again")), dBack.lines);
  const back = applyChange("add_back", "k", after(rm)!, o);
  ok("C6.13 BK-9: add back pass: the child goes back on the principal's application, applying", after(back)?.find((p) => p.subjectId === "k")?.applies === true && kOn(derive(after(back)!)) === "applying");
  ok("C6.13 BK-9: remove fail: the principal's own application is still never removed", /^Make someone else principal first/.test(refusal(applyChange("remove_filing", "a", fam(), o))?.words ?? ""));
}

// (2) Make principal on a shared filing: the one application moves to the new principal.
{
  const mp = applyChange("make_principal", "b", fam(), o);
  const a2 = after(mp);
  ok("C6.13 BK-9: make principal pass: the spouse on the principal's application becomes principal (not refused for the pathway)", !!a2 && a2.find((p) => p.subjectId === "b")?.role === "principal" && a2.find((p) => p.subjectId === "a")?.role === "spouse_or_partner", refusal(mp));
  const before = derive(fam()), then = derive(a2!);
  ok("C6.13 BK-9: make principal pass: still one shared application, now the spouse's, with everyone on it", then.filings.length === 1 && then.filings[0].owner?.subject === "b" && ["a", "b", "k"].every((s) => then.filings[0].applicants.some((x) => x.subject === s)), then.filings);
  const d = diffFilings(before, then, fam());
  const words = d.lines.flatMap((l) => l.words.map((w) => `${l.label}: ${w}`));
  ok("C6.13 BK-9: make principal pass: the preview says the shared application moves to the spouse, as one application", words.some((w) => /^Spouse A: The family's application is now Spouse A's \(the same application/.test(w)) && words.some((w) => /^Client A: Now on Spouse A's application/.test(w)), words);
  ok("C6.13 BK-9: make principal fail: it never says an application stops or starts", !words.some((w) => /stops|starts again/.test(w)), words);
  ok("C6.13 BK-9: make principal pass (walk finding): the former principal's line says whose application they are on now", d.lines.find((l) => l.person === "a")?.on === "Spouse A" && !d.lines.find((l) => l.person === "b")?.on, d.lines);
  ok("C6.13 BK-9: make principal fail: a child still cannot swap with a parent", /child of the principal/.test(refusal(applyChange("make_principal", "k", fam(), o))?.words ?? ""));
}

// (3) A co-filed application (sent together with the principal's) is never removed alone: its mode says so.
{
  const co: ModeOf = (role) => (role === "sponsor" ? "co_files" : role === "principal" ? "files_own" : "on_principal");
  // Review M2: the product stores a sponsor as not travelling (applies false): the rule holds for that state too.
  const people = [P("c", "case", "Case"), P("a", "principal", "Client A"), P("s", "sponsor", "Sponsor A", false), P("k", "child", "Child A1")];
  const r = refusal(applyChange("remove_filing", "s", people, { ...o, modeOf: co }));
  ok("C6.13 BK-9: co-filed fail: the sponsor's co-filed application is not removed alone, said in words (422)", r?.status === 422 && /sent together with the principal's application/.test(r.words), r);
  const r2 = refusal(applyChange("add_back", "s", people, { ...o, modeOf: co }));
  ok("C6.13 BK-9: co-filed fail (review M2): nor \"added back\" (it was never removed: the sponsor is stored not travelling)", r2?.status === 422 && /sent together with the principal's application/.test(r2.words), r2);
  ok("C6.13 BK-9: co-filed pass: a child on the principal's application of the same release can be taken off it", !!after(applyChange("remove_filing", "k", people, { ...o, modeOf: co })));
}

// (4) Everyone filing their own (as the Visitor visa): unchanged.
{
  const own: ModeOf = () => "files_own";
  const OWN = new Map([["principal", "files_own"], ["spouse_or_partner", "files_own"], ["child", "files_own"]]);
  const mp = after(applyChange("make_principal", "b", fam(), { ...o, modeOf: own }))!;
  const d = diffFilings(derive(fam(), OWN), derive(mp, OWN), fam());
  ok("C6.13 BK-9: own filings pass: Make principal swaps roles; each keeps their own application, nothing moves", derive(mp, OWN).filings.length === 3 && !d.lines.some((l) => l.words.some((w) => /family's application|stops|starts again/.test(w))), d.lines);
  const rm = after(applyChange("remove_filing", "k", fam(), { ...o, modeOf: own }))!;
  const d2 = diffFilings(derive(fam(), OWN), derive(rm, OWN), fam());
  ok("C6.13 BK-9: own filings fail (walk finding): no line is said to be on someone else's application", !d2.lines.some((l) => l.on));
  ok("C6.13 BK-9: own filings fail: removing the child's own filing still says it stops", d2.lines.some((l) => l.person === "k" && l.words.includes("Their own filing stops (not travelling)")), d2.lines);
}

process.exitCode = summary() ? 1 : 0;
