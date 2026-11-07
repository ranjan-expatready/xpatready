// A6 (B102, C6.4; product/screens/A6-age-on-application-date/concept.md): "Work it out instead". A fact a rule reads and
// the library lacks (C3.6's list) may be worked out from facts the library has, instead of being asked: a person's age
// in whole years from their date of birth on the case's application date. The key is the one the rule reads (never
// typed); the calculation is one the engine has a tested helper for (contracts/rules.ts CALCULATIONS); the dates are
// library date fields, the first about the same subject, the second about the case. It is written as a derived value
// with an audit line and reaches cases only in a release an Approver approves (the release check refuses a worked-out
// value whose dates are not asked: engine/validate.ts). No model call, US$0. How age counts is Sample (BR-7, AGENTS rule 4).
import { Body, Controller, Get, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
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
  plain: z.string({ error: "Say in words what the worked-out value is." }).trim().min(10, "Say in words what the worked-out value is (10 characters or more).").max(300, "Keep the words to 300 characters."),
}).strict();

type DateField = { key: string; label: string; subject: string };

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

  /** The choices the form offers: calculations in words, and the date fields per subject (BR-2 to BR-4). */
  async choices(id: string) {
    const c = await this.combination(id);
    const dates = await this.dates(c.workspaceId);
    return { calculations: offered().map((k) => ({ key: k, words: WORKED_OUT[k].words })), from: dates.filter((d) => d.subject !== "case"), on: dates.filter((d) => d.subject === "case") };
  }

  /** Works a fact a rule reads out of library dates (BR-1 to BR-6). */
  async add(actor: Actor, id: string, fact: string, body: unknown) {
    need(actor, "author"); // BR-6
    const extra = body && typeof body === "object" ? Object.keys(body).filter((k) => !(k in WorkOut.shape)) : [];
    if (extra.length) fail(`Send only how it is worked out, the two dates and the words (not ${extra.join(", ")}): the key is the one the rule reads, never typed.`);
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
    const missing = missingRuleFacts(rulesOf(snapshot), new Set(fields.map((f) => f.canonicalFieldKey)), new Set(derived.map((d) => d.derivedKey))).find((m) => m.fact === fact);
    if (!missing) fail(`No condition, rule or check of this combination reads ${fact}: a value is worked out only for a rule that needs it.`, HttpStatus.NOT_FOUND);
    // BR-5: never both asked and worked out.
    if (await this.db.proposalItem.findFirst({ where: { workspaceId: c.workspaceId, kind: "field", status: "waiting", work: { path: ["ruleFact"], equals: fact } }, select: { id: true } }))
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
    if (!on || on.subject !== calc!.onGroup) fail(`${b.on} is not a date about the case in the library: add the date about the case first (Add a fact a rule needs, for example "Application date"), then work this out.`);
    const words = b.plain;
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
  @Get("combinations/:id/rule-facts/worked-out") choices(@Headers("x-actor") a: string | undefined, @Param("id") id: string) { readerOf(a); return this.w.choices(id); }
  @Post("combinations/:id/rule-facts/:fact/worked-out") add(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Param("fact") fact: string, @Body() b: unknown) { return this.w.add(actorOf(a), id, fact, b); }
}
