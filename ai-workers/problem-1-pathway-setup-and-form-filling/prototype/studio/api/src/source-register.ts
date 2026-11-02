// G1 (C5.4, P-240; concept screens/G1-source-register/concept.md v2 BR-3, BR-6..BR-11, §5, §6): the source register.
// GET /combinations/:id/sources lists every number the draft publishes with its state; PUT
// /combinations/:id/sources/:kind/:key writes one number's answer (author duty, optimistic version). The gate itself
// (draftSourceProblems) runs on the draft only, beside filingProblems in studio.problems() and programs.ts draftProblems,
// never on a released snapshot (challenge M1). Registered in features/source-register.ts (P-214). No model call (US$0).
import { Body, Controller, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post, Put } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { problemFromZod } from "../../contracts/programs.ts";
import { SourceBody, type SourceEntryView, type SourceNumberView, type SourcesView, NUMBER_STATES } from "../../contracts/sources.ts";
import { buildSnapshot, sourceEntryOf, type Snapshot } from "../../engine/snapshot.ts";
import { canonicalValue, SAMPLE_LOADER as SAMPLE_CREATOR, entryKey, entryOf, numberState, publishedNumbers, sourceProblems, type FeeLineInput, type PublishedNumber, type SourceProblem } from "../../engine/source-register.ts";
import { FEE_TABLE } from "../../engine/runtime/filings.ts";
import { ACTORS, Audit, Db, fail, isDemoWorkspace, need, readerOf, Workspace, type Actor } from "./core.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nameOf = (id: string) => (id === SAMPLE_CREATOR ? "The sample load" : [...ACTORS].find((a) => a.id === id)?.name ?? "Someone else");

/** A combination's fee lines from the fee table (BR-4; engine/runtime/filings.ts reads the same file) until R2 S7a. */
export function feeLinesOf(combinationKey: string): FeeLineInput[] {
  const c = FEE_TABLE.combinations && Object.hasOwn(FEE_TABLE.combinations, combinationKey) ? FEE_TABLE.combinations[combinationKey] : undefined;
  const lines = Array.isArray(FEE_TABLE.lines) ? (FEE_TABLE.lines as unknown as FeeLineInput[]) : [];
  return (c?.lines ?? []).map((k) => lines.find((l) => l?.key === k)).filter((l): l is FeeLineInput => !!l);
}
export const numbersOf = (s: Snapshot): PublishedNumber[] => publishedNumbers(s, { feeLines: feeLinesOf(s.combination.key) });

/** BR-7: the gate, on a draft only (a released snapshot is never re-judged). The entries are the draft's own frozen
 *  `sources` (read once per workspace in buildSnapshots), so the combination page, the catalogue and Submit agree. */
export function draftSourceProblems(s: Snapshot, demo: boolean): (SourceProblem & { gate: "no-source" })[] {
  if (s.mode !== "draft") return [];
  // gate: the shared refusal (api/src/refusal.ts) lists every one in errors[] with GATE_WORDS["no-source"].
  return sourceProblems(numbersOf(s), (s.sources ?? []).map(entryOf), { demo }).map((p) => ({ ...p, gate: "no-source" as const }));
}

type Row = Prisma.SourceEntryGetPayload<object>;
const view = (r: Row): SourceEntryView => {
  const e = sourceEntryOf(r);
  return { value: r.value, cited: e.cited ? { url: e.cited.url, page: e.cited.page ?? null, quote: e.cited.quote, date: e.cited.date } : null, none_published: e.none_published ?? null, sample: r.sample,
    version: r.version, created_by: r.createdBy, updated_by: r.updatedBy, updated_by_name: nameOf(r.updatedBy), updated_at: r.updatedAt.toISOString(), from_sample_load: r.createdBy === SAMPLE_CREATOR };
};

@Injectable()
export class SourceRegister {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  private async combination(id: string) {
    const c = UUID.test(id) ? await this.db.combination.findUnique({ where: { id } }) : null;
    if (!c || c.workspaceId !== (await this.ws.id())) fail("That combination does not exist (it may have been removed by a reset).", HttpStatus.NOT_FOUND);
    return c!;
  }

  /** §6 GET: every number the draft publishes, its state and its entry; one query for the entries. */
  async list(id: string, only?: { kind: string; key: string }): Promise<SourcesView> {
    const c = await this.combination(id);
    const [{ snapshot }, rows, demo] = await Promise.all([buildSnapshot(this.db, c.workspaceId, id, "draft"), this.db.sourceEntry.findMany({ where: { workspaceId: c.workspaceId, itemKey: { startsWith: `${c.combinationKey}/` } } }), Promise.resolve(isDemoWorkspace())]);
    const byKey = new Map(rows.map((r) => [entryKey(sourceEntryOf(r)), r]));
    const all = numbersOf(snapshot);
    const numbers: SourceNumberView[] = all.filter((n) => !only || (n.kind === only.kind && n.key === only.key)).map((n) => {
      const r = byKey.get(entryKey(n)), st = numberState(n, r ? sourceEntryOf(r) : undefined, demo);
      return { kind: n.kind, key: n.key, address: n.address, value: n.value, item: n.item, item_words: n.item_words, words: n.words, where: n.where, state: st.state, passes: st.passes, entry: r ? view(r) : null };
    });
    const used = new Set(all.map(entryKey));
    const unused = rows.filter((r) => !used.has(entryKey(sourceEntryOf(r))) && (!only || (r.itemKind === only.kind && r.itemKey === only.key))).map((r) => ({ kind: r.itemKind, key: r.itemKey, address: r.valuePath, value: r.value }));
    const counts = Object.fromEntries(NUMBER_STATES.map((s) => [s, numbers.filter((n) => n.state === s).length])) as SourcesView["counts"];
    counts.total = numbers.length; counts.held_back = numbers.filter((n) => !n.passes).length;
    return { combination: { id: c.id, key: c.combinationKey, label: c.label }, demo_workspace: demo, numbers, unused, counts };
  }

  /** A key in the address may leave out its combination ("R-01" for "wp.family/R-01"). */
  private fullKey(c: { combinationKey: string }, key: string) { return key.startsWith(`${c.combinationKey}/`) ? key : `${c.combinationKey}/${key}`; }
  async item(id: string, kind: string, key: string) {
    const c = await this.combination(id);
    return this.list(id, { kind, key: this.fullKey(c, key) });
  }

  /** §6 PUT (BR-3, BR-6, BR-11): 200 with version+1 · 400 per field · 403 without the author duty · 404 no such number ·
   *  409 an old version or a value that moved. Audit "source entry added" / "source entry changed". */
  async save(actor: Actor, id: string, kind: string, rawKey: string, body: unknown): Promise<SourceNumberView> {
    if (!(actor.duties as readonly string[]).includes("author")) throw new HttpException({ type: "https://expatready.local/problems/forbidden", title: "Read only", status: 403, detail: "Only the configuration author adds sources." }, HttpStatus.FORBIDDEN);
    const parsed = SourceBody.safeParse(body ?? {});
    if (!parsed.success) throw new HttpException(problemFromZod(parsed.error), HttpStatus.BAD_REQUEST);
    const b = parsed.data;
    const c = await this.combination(id);
    if (c.retiredAt) fail(`"${c.label}" is retired: its sources are not changed. Restore it on Structure first.`, HttpStatus.CONFLICT);
    const key = this.fullKey(c, rawKey);
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, id, "draft");
    const n = numbersOf(snapshot).find((x) => x.kind === kind && x.key === key && x.address === b.address);
    if (!n) fail("This item has no such published number (it may have changed: reload).", HttpStatus.NOT_FOUND);
    if (n!.sourced_by) fail(`${n!.item_words}: ${n!.words} is already cited by its own record (${n!.sourced_by === "fee_table" ? "the fee table" : "its validity rule's own source"}); it needs no entry.`, HttpStatus.CONFLICT);
    if (canonicalValue(b.value) !== n!.value) throw new HttpException({ type: "https://expatready.local/problems/stale", title: "The number moved", status: 409, detail: `${n!.item_words}: the number is now ${n!.value}, not ${canonicalValue(b.value)}. Reload, check its source, then save again.`, value: n!.value }, HttpStatus.CONFLICT);
    const where = { workspaceId_itemKind_itemKey_valuePath: { workspaceId: c.workspaceId, itemKind: kind, itemKey: key, valuePath: b.address } };
    const answer = b.cited
      ? { citationUrl: b.cited.url, citationPage: b.cited.page?.trim() || null, citationQuote: b.cited.quote, citationDate: new Date(`${b.cited.date}T00:00:00Z`), nonePublished: false, nonePublishedReason: null, sample: false }
      : { citationUrl: null, citationPage: null, citationQuote: null, citationDate: null, nonePublished: true, nonePublishedReason: b.none_published!.reason, sample: false };
    const conflict = async () => {
      const now = await this.db.sourceEntry.findUnique({ where });
      const at = now ? `${nameOf(now.updatedBy)}, ${now.updatedAt.toISOString().slice(11, 16)} UTC` : "it was removed";
      throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed by someone else", status: 409, detail: `Someone else saved this source while you had it open (${at}). Reload theirs, or keep yours and save again.`, version: now?.version ?? 0 }, HttpStatus.CONFLICT);
    };
    const existing = await this.db.sourceEntry.findUnique({ where });
    let row: Row;
    if (!existing) {
      if (b.version !== 0) return conflict();
      try { row = await this.db.sourceEntry.create({ data: { workspaceId: c.workspaceId, itemKind: kind, itemKey: key, valuePath: b.address, value: n!.value, ...answer, version: 1, createdBy: actor.id, updatedBy: actor.id } }); }
      catch (e) { if ((e as { code?: string }).code === "P2002") return conflict(); throw e; }
    } else {
      if (b.version !== existing.version) return conflict();
      const done = await this.db.sourceEntry.updateMany({ where: { id: existing.id, version: existing.version }, data: { value: n!.value, ...answer, version: { increment: 1 }, updatedBy: actor.id } });
      if (!done.count) return conflict();
      row = (await this.db.sourceEntry.findUnique({ where: { id: existing.id } }))!;
    }
    const words = b.cited ? `Official source (${b.cited.url})` : "None published – set by ExpatReady";
    await this.audit.log(c.workspaceId, actor.id, existing ? "changed" : "added", "source entry", `${key}|${b.address}`, `${actor.name} ${existing ? "changed" : "added"} the source of ${n!.item_words}: ${n!.words}: ${words}`, { kind, key, address: b.address, value: n!.value, version: row.version }, c.id);
    const demo = isDemoWorkspace();
    const st = numberState(n!, sourceEntryOf(row), demo);
    return { kind: n!.kind, key: n!.key, address: n!.address, value: n!.value, item: n!.item, item_words: n!.item_words, words: n!.words, where: n!.where, state: st.state, passes: st.passes, entry: view(row) };
  }

  /** POST /combinations/:id/sources/sample (a Demo menu control, like POST /demo/forms-story): the demo seed's Sample
   *  answers for a Sample combination's unanswered numbers. The author, in the demo workspace, on a Sample combination
   *  only; never a real answer. */
  async sample(actor: Actor, id: string) {
    need(actor, "author");
    const c = await this.combination(id);
    if (!isDemoWorkspace()) fail("Sample answers exist only in the demo workspace. Add the official source, or mark 'None published – set by ExpatReady'.", HttpStatus.CONFLICT);
    if (c.sourceBasis !== "ILLUSTRATIVE") fail(`"${c.label}" is source-backed, not Sample: give each number its official source, or mark 'None published – set by ExpatReady'.`, HttpStatus.CONFLICT);
    const written = await seedSampleSources(this.db, id);
    if (written) await this.audit.log(c.workspaceId, actor.id, "added", "source entry", c.combinationKey, `${actor.name} answered ${written} number${written === 1 ? "" : "s"} of "${c.label}" with Sample sources (demo workspace only)`, { written }, c.id);
    return { written, sources: await this.list(id) };
  }
}


/** Scaffolding (P-33, concept §6 M4; tech lead on #558): the demo seed answers each number of a Sample combination's
 *  draft that has no answer with a Sample entry (no citation, not None published; reviewer MJ-1 on #569), written by the
 *  sample loader, so a Sample release still goes through in the demo workspace as a Demo release. Never on a
 *  source-backed combination. Returns how many entries it wrote. */
export async function seedSampleSources(db: Db, combinationId: string): Promise<number> {
  const c = await db.combination.findUniqueOrThrow({ where: { id: combinationId } });
  if (c.sourceBasis !== "ILLUSTRATIVE") return 0;
  const { snapshot } = await buildSnapshot(db, c.workspaceId, combinationId, "draft");
  const held = sourceProblems(numbersOf(snapshot), (snapshot.sources ?? []).map(entryOf)).filter((p) => p.state === "missing");
  if (!held.length) return 0;
  const made = await db.sourceEntry.createMany({ skipDuplicates: true, data: held.map((p) => ({ workspaceId: c.workspaceId, itemKind: p.kind, itemKey: p.key, valuePath: p.address, value: p.value, sample: true, createdBy: SAMPLE_CREATOR, updatedBy: SAMPLE_CREATOR })) });
  return made.count;
}

type H = string | undefined;
@Controller("api")
export class SourceRegisterController {
  constructor(@Inject(SourceRegister) private readonly s: SourceRegister) {}
  @Get("combinations/:id/sources") list(@Headers("x-actor") a: H, @Param("id") id: string) { readerOf(a); return this.s.list(id); }
  @Get("combinations/:id/sources/:kind/:key") item(@Headers("x-actor") a: H, @Param("id") id: string, @Param("kind") kind: string, @Param("key") key: string) { readerOf(a); return this.s.item(id, kind, key); }
  @Post("combinations/:id/sources/sample") @HttpCode(200) sample(@Headers("x-actor") a: H, @Param("id") id: string) { return this.s.sample(readerOf(a), id); }
  @Put("combinations/:id/sources/:kind/:key") save(@Headers("x-actor") a: H, @Param("id") id: string, @Param("kind") kind: string, @Param("key") key: string, @Body() b: unknown) { return this.s.save(readerOf(a), id, kind, key, b); }
}
