// C6.9 part 1 (M3-D, concept screens/C6.9/concept.md BR-1…BR-6): an author saves a combination's eligibility gates as
// data on its draft (combination.eligibility); review and release carry them into snapshot.eligibility (engine/snapshot.ts,
// engine/validate.ts). Registered in features/eligibility.ts (P-214). No model call (US$0).
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Put } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { EligibilityGatesBody, type EligibilityGatesView } from "../../contracts/eligibility.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { checkGates, snapshotEligibility, type StoredEligibility } from "../../engine/eligibility-gates.ts";
import { ACTORS, actorOf, Audit, Db, fail, need, readerOf, type Actor } from "./core.ts";

/** B106 break M1: a comparison with an empty value ("is" nothing, "is one of" none) is met by no answer, so a gate with it
 *  gives Not met to everyone who answered and Not answered to everyone else, for ever. Refused on the gate's rule. */
export function emptyValues(tree: unknown): string[] {
  const out: string[] = [];
  const stack: unknown[] = [tree];
  while (stack.length) {
    const n = stack.pop() as { op?: string; field?: string; value?: unknown; args?: unknown[]; arg?: unknown } | null;
    if (!n || typeof n !== "object") continue;
    if (n.field && ["eq", "neq", "gt", "gte", "lt", "lte"].includes(n.op ?? "") && (n.value === "" || (typeof n.value === "string" && !n.value.trim()))) out.push(n.field);
    if (n.field && n.op === "in" && Array.isArray(n.value) && !n.value.some((v) => !(typeof v === "string" && !v.trim()))) out.push(n.field);
    if (Array.isArray(n.args)) stack.push(...n.args);
    if (n.arg) stack.push(n.arg);
  }
  return [...new Set(out)];
}

const nameOf = (id: string | null | undefined) => [...ACTORS].find((a) => a.id === id)?.name ?? (id ? "Someone else" : null);

@Injectable()
export class EligibilityGates {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  private async combination(id: string) {
    const c = await this.db.combination.findUnique({ where: { id } }).catch(() => null); // a malformed id is a 404 too
    if (!c) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return c!;
  }

  private view(e: StoredEligibility | null): EligibilityGatesView {
    return { gates: e?.gates ?? [], judgement: e?.judgement ?? [], disclaimer: e?.disclaimer ?? null, version: e?.version ?? 0, savedBy: nameOf(e?.by), savedAt: e?.at ?? null };
  }

  /** GET: the draft's gates, and what the newest release carries. */
  async get(id: string): Promise<EligibilityGatesView> {
    const c = await this.combination(id);
    const r = await this.db.configRelease.findFirst({ where: { combinationId: id }, orderBy: { version: "desc" }, select: { version: true, snapshot: true } });
    const rel = (r?.snapshot as { eligibility?: ReturnType<typeof snapshotEligibility> } | null)?.eligibility;
    return { ...this.view(c.eligibility as StoredEligibility | null), released: rel ? { ...rel, release: r!.version } : null };
  }

  /** PUT (BR-1, BR-2, BR-2a, BR-3): checked, stored at the version read, one audit row holding the list before it. */
  async put(actor: Actor, id: string, body: unknown): Promise<EligibilityGatesView> {
    need(actor, "author");
    const c = await this.combination(id);
    if (c.retiredAt) fail(`"${c.label}" is retired: its eligibility gates are not changed. Restore it on Structure first.`, HttpStatus.CONFLICT);
    const parsed = EligibilityGatesBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const [fields, derived] = await Promise.all([
      this.db.canonicalField.findMany({ where: { workspaceId: c.workspaceId }, select: { canonicalFieldKey: true, valueType: true, status: true } }),
      this.db.derivedField.findMany({ where: { workspaceId: c.workspaceId }, select: { derivedKey: true } }),
    ]);
    const checked = checkGates(b, new Map(fields.filter((f) => f.status !== "RETIRED").map((f) => [f.canonicalFieldKey, f.valueType])), new Set(derived.map((d) => d.derivedKey)));
    const empty = b.gates.flatMap((g, i) => emptyValues(g.condition).map((f) => ({ field: `gates.${i}.condition`, message: `The rule compares ${f} with an empty value, which no answer meets: give the value, or choose "is answered".` })));
    const errors = [...checked.errors, ...empty.filter((e) => !checked.errors.some((x) => x.field === e.field))];
    if (errors.length) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: errors.map((e) => e.message).join(" "), errors }, HttpStatus.BAD_REQUEST);
    const before = c.eligibility as StoredEligibility | null;
    const current = before?.version ?? 0;
    // BR-3: the first save needs no version; every later one names the version it read (checked after the fields, so
    // a refusal on a field is said first).
    if (before ? b.version !== current : b.version !== undefined && b.version !== 0) this.stale(before);
    const next: StoredEligibility = { gates: checked.gates, judgement: checked.judgement, disclaimer: checked.disclaimer, version: current + 1, by: actor.id, at: new Date().toISOString() };
    // The version is checked again in the write itself, so two saves at once cannot both pass.
    const done = await this.db.$executeRaw(Prisma.sql`UPDATE "combination" SET "eligibility" = ${JSON.stringify(next)}::jsonb WHERE "id" = ${id}::uuid AND COALESCE(("eligibility"->>'version')::int, 0) = ${current}`);
    if (!done) this.stale((await this.combination(id)).eligibility as StoredEligibility | null);
    await this.audit.log(c.workspaceId, actor.id, "updated", "eligibility", c.combinationKey, `${actor.name} saved the eligibility gates of "${c.label}": ${next.gates.length} gate${next.gates.length === 1 ? "" : "s"}, ${next.judgement.length} officer's judgement line${next.judgement.length === 1 ? "" : "s"}${next.disclaimer ? ", a disclaimer" : ""}`, { before, after: next, version: next.version }, c.id);
    return this.view(next);
  }

  /** 409 naming who saved last and when, with their version (STANDARDS §4). */
  private stale(e: StoredEligibility | null): never {
    const when = e?.at ? `at ${e.at.slice(11, 16)} UTC` : "a moment ago";
    throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed by someone else", status: 409, detail: e ? `${nameOf(e.by)} saved these eligibility gates ${when}. Reload their version, then make your change again.` : "Nobody has saved eligibility gates here yet: reload, then save without a version.", current: this.view(e) }, HttpStatus.CONFLICT);
  }
}

type H = string | undefined;
@Controller("api")
export class EligibilityGatesController {
  constructor(@Inject(EligibilityGates) private readonly g: EligibilityGates) {}
  @Get("combinations/:id/eligibility-gates") get(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.g.get(id); }
  @Put("combinations/:id/eligibility-gates") put(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.g.put(readerOf(a), id, b); }
}
