// A6 (B102, C6.4; product/screens/A6-age-on-application-date/concept.md): "Work it out instead". A fact a rule reads and
// the library lacks (C3.6's list) may be worked out from facts the library has, instead of being asked: a person's age
// in whole years from their date of birth on the case's application date. The key is the one the rule reads (never
// typed); the calculation is one the engine has a tested helper for (contracts/rules.ts CALCULATIONS); the dates are
// library date fields asked in this combination's questionnaire, the first about the same subject, the second about the
// case (challenge M1: the route refuses dates that are not asked, since the release check does not). Its words are built
// by the server from the choices and name both dates, so the Approver's Review line says what the value really is
// (challenge M2). It is written as a derived value with an audit line and reaches cases only in a release an Approver
// approves. No model call, US$0. How age counts is Sample (BR-7, AGENTS rule 4).
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post, Query } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { CALCULATIONS } from "../../../contracts/rules.ts";
import { buildSnapshot } from "../../engine/snapshot.ts";
import { actorOf, Audit, Db, fail, need, readerOf, type Actor } from "./core.ts";
import { missingRuleFacts, rulesOf } from "./rule-facts.ts";

/** The calculations a person may choose, in words, and the subject group of the date each is worked out on (BR-2, BR-4).
 *  Only calculations the engine can work out are offered (CALCULATIONS), so a chosen one always runs on a case. */
export const WORKED_OUT: Record<string, { words: string; onGroup: string }> = {
  age_in_years: { words: "Age in whole years", onGroup: "case" },
};
const offered = () => Object.keys(WORKED_OUT).filter((k) => k in CALCULATIONS);

export const WorkOut = z.object({
  calculation: z.string({ error: "Choose how it is worked out." }).trim().min(1, "Choose how it is worked out."),
  from: z.string({ error: "Choose the date it is worked out from." }).trim().min(1, "Choose the date it is worked out from."),
  on: z.string({ error: "Choose the date it is worked out on." }).trim().min(1, "Choose the date it is worked out on."),
}).strict();

type DateField = { key: string; label: string; subject: string };

/** Review M1: an age is a number, so every test a rule makes on the fact must compare it with a number (lt, lte, gt, gte,
 *  eq, neq, in) or ask whether it is known (exists); a rule comparing it with words ("alone") could never hold. Pure:
 *  returns each test that does not fit, in words, so the screen and the route say the same. */
export function notNumberTests(trees: unknown[], fact: string): string[] {
  const out: string[] = [];
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const o = n as { op?: unknown; field?: unknown; value?: unknown; args?: unknown; arg?: unknown };
    if (o.field === fact) {
      const fits = o.op === "exists" || (["lt", "lte", "gt", "gte", "eq", "neq"].includes(String(o.op)) && num(o.value)) || (o.op === "in" && Array.isArray(o.value) && o.value.length > 0 && o.value.every(num));
      if (!fits) out.push(`${String(o.op)} ${JSON.stringify(o.value ?? null)}`);
    }
    (Array.isArray(o.args) ? o.args : []).forEach(walk); if (o.arg) walk(o.arg);
  };
  trees.forEach(walk);
  return out;
}

@Injectable()
export class WorkedOut {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async combination(id: string) {
    const c = await this.db.combination.findUnique({ where: { id }, select: { id: true, workspaceId: true, combinationKey: true } }).catch(() => null);
    if (!c) fail("This combination does not exist.", HttpStatus.NOT_FOUND);
    return c!;
  }

  /** The library's live date fields (newest version of each, never a retired one), with their names. */
  private async dates(workspaceId: string): Promise<DateField[]> {
    const all = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "asc" }, select: { canonicalFieldKey: true, valueType: true, status: true, label: true } });
    const newest = new Map(all.map((f) => [f.canonicalFieldKey, f]));
    return [...newest.values()].filter((f) => f.valueType === "date" && (f.status === "DRAFT" || f.status === "PUBLISHED"))
      .map((f) => ({ key: f.canonicalFieldKey, label: f.label?.trim() || f.canonicalFieldKey.split(".").pop()!.replace(/_/g, " "), subject: f.canonicalFieldKey.split(".")[0] }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /** The choices the form offers: calculations in words, and the date fields per subject (BR-2 to BR-4); with `fact`, also
   *  whether its rules read it as a number (review M1), so the form is offered only where it fits. */
  async choices(id: string, fact?: string) {
    const c = await this.combination(id);
    const dates = await this.dates(c.workspaceId);
    let fits: { ok: boolean; why: string | null } | undefined;
    if (fact) {
      const { snapshot } = await buildSnapshot(this.db, c.workspaceId, c.id, "draft");
      const bad = notNumberTests(rulesOf(snapshot).map((r) => r.tree), fact);
      fits = bad.length ? { ok: false, why: `Not offered: a rule here compares ${fact} with words (${bad.slice(0, 3).join("; ")}), and a worked-out age is a number. Add the fact this rule needs instead.` } : { ok: true, why: null };
    }
    return { calculations: offered().map((k) => ({ key: k, words: WORKED_OUT[k].words })), from: dates.filter((d) => d.subject !== "case"), on: dates.filter((d) => d.subject === "case"), ...(fits ? { fits } : {}) };
  }

  /** Works a fact a rule reads out of library dates (BR-1 to BR-6). */
  async add(actor: Actor, id: string, fact: string, body: unknown) {
    need(actor, "author"); // BR-6
    const extra = body && typeof body === "object" ? Object.keys(body).filter((k) => !(k in WorkOut.shape)) : [];
    if (extra.length) fail(`Send only how it is worked out and the two dates (not ${extra.join(", ")}): the key is the one the rule reads, never typed, and the words are built from the choices.`);
    const parsed = WorkOut.safeParse(body ?? {});
    if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Choose how it is worked out, from which date and on which date.");
    const b = parsed.data!;
    const c = await this.combination(id);
    const [{ snapshot }, fields, derived, dates] = await Promise.all([
      buildSnapshot(this.db, c.workspaceId, c.id, "draft"),
      this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true } }),
      this.db.derivedField.findMany({ where: { workspaceId: c.workspaceId }, select: { derivedKey: true } }),
      this.dates(c.workspaceId),
    ]);
    // BR-1: only a fact a rule of this combination reads, neither in the library nor already worked out.
    if (derived.some((d) => d.derivedKey === fact)) fail(`${fact} is already worked out: the rules read it as it is.`, HttpStatus.CONFLICT);
    if (fields.some((f) => f.canonicalFieldKey === fact)) fail(`${fact} is already in the library: it is asked, so it is not worked out.`, HttpStatus.CONFLICT);
    // Break mi1: a retired field keeps its key, as C3.6 refuses it.
    if (await this.db.canonicalField.findFirst({ where: { workspaceId: c.workspaceId, canonicalFieldKey: fact, status: "RETIRED" }, select: { id: true } }))
      fail(`${fact} is a retired library field: restore it in Shared library › Fields, and the rule can read it again.`, HttpStatus.CONFLICT);
    // Break mi3: a fact key is one group and one name (person.age_years), as the library builds them.
    if (!/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(fact)) fail(`The rule reads "${fact}", which is not a fact key (group.name): correct the rule first.`);
    const missing = missingRuleFacts(rulesOf(snapshot), new Set(fields.map((f) => f.canonicalFieldKey)), new Set(derived.map((d) => d.derivedKey))).find((m) => m.fact === fact);
    if (!missing) fail(`No condition, rule or check of this combination reads ${fact}: a value is worked out only for a rule that needs it.`, HttpStatus.NOT_FOUND);
    // Review M1: every test on the fact compares a number (an age is a number).
    const bad = notNumberTests(rulesOf(snapshot).map((r) => r.tree), fact);
    if (bad.length) fail(`A rule here compares ${fact} with words (${bad.slice(0, 3).join("; ")}), and a worked-out age is a number: add the fact this rule needs instead.`);
    // BR-5: never both asked and worked out.
    // Challenge m2: a proposal made by name (C3.6's add by a rule's key) carries the key it would land as in keyPreview.
    if (await this.db.proposalItem.findFirst({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", OR: [{ work: { path: ["ruleFact"], equals: fact } }, { work: { path: ["keyPreview"], equals: fact } }] }, select: { id: true } }))
      fail(`A proposal to ask ${fact} is waiting on To review › Proposals: decide it there first (a fact is asked or worked out, not both).`, HttpStatus.CONFLICT);
    // BR-2: a calculation the engine works out.
    const calc = WORKED_OUT[b.calculation];
    if (!calc || !offered().includes(b.calculation)) fail(`"${b.calculation}" is not a calculation the product works out: choose ${offered().map((k) => `"${WORKED_OUT[k].words}"`).join(" or ")}.`);
    // BR-3: from a date about the same subject as the fact.
    const subject = fact.split(".")[0];
    const from = dates.find((d) => d.key === b.from);
    if (!from) fail(`${b.from} is not a date in the library: choose a date the library holds (for an age, the date of birth).`);
    if (from!.subject !== subject) fail(`${from!.label} is about the ${from!.subject}, not the ${subject}: ${fact} is worked out from a date about the ${subject}.`);
    // BR-4: on a date asked once per case.
    const on = dates.find((d) => d.key === b.on);
    if (on && on.key === from!.key) fail(`${on.label} is the date it is worked out from: choose another date to work it out on.`); // break mi2
    if (!on || on.subject !== calc!.onGroup) fail(`${b.on} is not a date about the case in the library: add the date about the case first (Add a fact a rule needs, for example "Application date"), then work this out.`);
    // Challenge M1: both dates are asked by a question, so a case can answer them. One this combination does not show yet
    // is pulled into its questionnaire with the worked-out value (engine/snapshot.ts: a derived value's inputs and
    // reference travel with it), so a placement anywhere in the library counts.
    const placedKeys = new Set((await this.db.sectionQuestion.findMany({ where: { workspaceId: c.workspaceId, canonicalFieldKey: { in: [from!.key, on!.key] }, status: { not: "RETIRED" } }, select: { canonicalFieldKey: true } })).map((q) => q.canonicalFieldKey));
    for (const d of [from!, on!]) if (!placedKeys.has(d.key)) fail(`${d.label} is in the library but no questionnaire asks it: place it first (Shared library › Fields › ${d.label}), so a case can answer it.`);
    // Challenge M2: the words are built from the choices and name both dates.
    const words = `${calc!.words} from ${from!.label}, on ${on!.label}.`;
    try {
      await this.db.derivedField.create({ data: { workspaceId: c.workspaceId, derivedKey: fact, calculation: b.calculation, inputs: [from!.key], reference: on!.key, plain: words, executable: true } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail(`${fact} is already worked out: the rules read it as it is.`, HttpStatus.CONFLICT);
      throw e;
    }
    await this.audit.log(c.workspaceId, actor.id, "added", "worked-out value", fact, `${actor.name} worked out ${fact} as "${words}" (${calc!.words} from ${from!.label}, on ${on!.label}) for ${missing!.rules[0].sentence.split(":")[0]} (Sample; reaches cases in the next approved release)`, { calculation: b.calculation, from: from!.key, on: on!.key }, c.id);
    return { fact, calculation: b.calculation, calculation_words: calc!.words, from: from!.key, on: on!.key, plain: words, rule: { key: missing!.rules[0].key, sentence: missing!.rules[0].sentence } };
  }
}

@Controller("api")
export class WorkedOutController {
  constructor(@Inject(WorkedOut) private readonly w: WorkedOut) {}
  @Get("combinations/:id/rule-facts/worked-out") choices(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Query("fact") fact?: string) { readerOf(a); return this.w.choices(id, typeof fact === "string" && fact ? fact.slice(0, 200) : undefined); }
  @Post("combinations/:id/rule-facts/:fact/worked-out") add(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("fact") fact: string, @Body() b: unknown) { return this.w.add(actorOf(a), id, fact, b); }
}
