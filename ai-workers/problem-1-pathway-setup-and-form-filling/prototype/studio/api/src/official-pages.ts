// F2 (forms lane, N8; P-156 (2), P-176; setup checklist step 1): a combination's official page. GET answers the rules'
// proposal and the pages a person may choose; POST …/confirm stores who confirmed which page and on which tier, refused by
// the checklist's own duty rule (engine/setup-checklist.ts mayAct): the rules' one match is the author's (or the expert's),
// any other choice the immigration expert's alone. officialPagesOf is the one reader the checklist uses. US$0, no AI.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { confirmationOf, isApplyPage, isPage, officialPagesFrom, recordHolds, type PageSource } from "../../engine/official-pages.ts";
import { mayAct, type OfficialPages } from "../../engine/setup-checklist.ts";
import type { Tier } from "../../contracts/setup-checklist.ts";
import { Audit, Db, readerOf, Workspace, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

export const ConfirmPages = z.strictObject({ attachmentId: z.string({ error: "Choose the page to confirm." }).uuid("Choose one of this combination's pages.") }, { error: (i) => (i.code === "unrecognized_keys" ? "This confirmation carries a field the server does not know." : i.code === "invalid_type" ? "Send the page to confirm as { attachmentId }." : undefined) });

const sourceOf = (a: { id: string; kind: string; edition: string | null; fileName: string }): PageSource => ({ id: a.id, kind: a.kind, title: a.edition ?? a.fileName, file: a.fileName });

/** Step 1 for each combination, read from its attached pages and its stored confirmation (one query each). */
export async function officialPagesOf(db: Pick<Db, "sourceAttachment" | "officialPagesRecord">, ids: string[]): Promise<Map<string, OfficialPages>> {
  if (!ids.length) return new Map();
  const [atts, recs] = await Promise.all([
    db.sourceAttachment.findMany({ where: { combinationId: { in: ids }, kind: { in: ["Web page", "Instructions"] } }, select: { id: true, combinationId: true, kind: true, edition: true, fileName: true } }),
    db.officialPagesRecord.findMany({ where: { combinationId: { in: ids } } }),
  ]);
  const by = new Map<string, PageSource[]>();
  for (const a of atts) by.set(a.combinationId, [...(by.get(a.combinationId) ?? []), sourceOf(a)]);
  const rec = new Map(recs.map((r) => [r.combinationId, { attachmentId: r.attachmentId, confirmedBy: r.confirmedBy, confirmedAs: r.confirmedAs as Tier }]));
  return new Map(ids.map((id) => [id, officialPagesFrom(by.get(id) ?? [], rec.get(id) ?? null)]));
}

@Injectable()
export class OfficialPagesService {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Workspace) private readonly ws: Workspace) {}

  private async load(combinationId: string) {
    const workspaceId = await this.ws.id();
    const c = await this.db.combination.findFirst({ where: { id: combinationId, workspaceId }, select: { id: true, label: true, retiredAt: true, attachments: { select: { id: true, kind: true, edition: true, fileName: true }, orderBy: { createdAt: "asc" } } } });
    if (!c) throw problem(404, "Not found", "This combination no longer exists.");
    const sources = c.attachments.map(sourceOf).filter(isPage);
    const record = await this.db.officialPagesRecord.findUnique({ where: { combinationId } });
    return { workspaceId, c, sources, record };
  }

  /** GET: the step's state, the pages a person may choose (the rules' matches first) and the stored confirmation. */
  async get(combinationId: string) {
    const { sources, record } = await this.load(combinationId);
    const pages = officialPagesFrom(sources, record ? { attachmentId: record.attachmentId, confirmedBy: record.confirmedBy, confirmedAs: record.confirmedAs as Tier } : null);
    return { pages, candidates: [...sources.filter(isApplyPage), ...sources.filter((s) => !isApplyPage(s))].map((s) => ({ ...s, match: isApplyPage(s), confirmed: pages.state === "confirmed" && record?.attachmentId === s.id })), record: pages.state === "confirmed" ? record : null };
  }

  /** POST confirm: one page of this combination, by a person whose duty covers the item (P-176), stored with the tier. */
  async confirm(actor: Actor, combinationId: string, body: unknown) {
    const b = ConfirmPages.safeParse(body ?? {});
    if (!b.success) throw problem(400, "Not confirmed", b.error.issues[0]?.message ?? "Choose the page to confirm.");
    const { workspaceId, c, sources, record } = await this.load(combinationId);
    // N8 break m1: a retired combination is not set up any more, as every other write on it says.
    if (c.retiredAt) throw problem(409, "Retired", `"${c.label}" is retired: its official page is not changed. Restore it first.`);
    const page = sources.find((s) => s.id === b.data.attachmentId);
    if (!page) throw problem(400, "Not one of its pages", "That is not one of this combination's attached pages (an IRCC apply page or a guide page). Choose one of them.");
    const held = record ? { attachmentId: record.attachmentId, confirmedBy: record.confirmedBy, confirmedAs: record.confirmedAs as Tier } : null;
    const item = confirmationOf(sources, page.id, held);
    if (!mayAct({ kind: item.kind, tier: item.tier }, { id: actor.id, duties: actor.duties as readonly string[] })) {
      // N8 break m5: plain words, one reason, no decision codes.
      const why = held && held.confirmedAs === "expert" && recordHolds(sources, held) ? "The immigration expert chose this combination's official page, so only the immigration expert changes it."
        : item.matches === 1 ? "The rules found one apply page here and this is another page: choosing a different page is the immigration expert's call."
        : item.matches > 1 ? `The rules found ${item.matches} apply pages here: the immigration expert chooses one.`
        : item.tier === "expert" ? "The rules found no apply page here: the immigration expert chooses the page." : "The configuration author or the immigration expert confirms the official page.";
      throw problem(403, "Not yours to confirm", `${why} ${actor.name} (simulated) does not hold that duty.`);
    }
    // N8 break m2: the same page confirmed again by the same person on the same tier changes nothing and writes nothing.
    if (held && recordHolds(sources, held) && held.attachmentId === page.id && held.confirmedBy === actor.id && held.confirmedAs === item.tier) return { pages: { state: "confirmed" as const, by: held.confirmedBy, as: held.confirmedAs }, record, again: true };
    const data = { attachmentId: page.id, matches: item.matches, confirmedBy: actor.id, confirmedAs: item.tier, confirmedAt: new Date() };
    const saved = await this.db.officialPagesRecord.upsert({ where: { combinationId }, create: { workspaceId, combinationId, ...data }, update: data });
    // N8 break m3: a replaced confirmation is named (which page, who).
    const before = held ? sources.find((s) => s.id === held.attachmentId)?.title ?? "a page no longer attached" : null;
    await this.audit.log(workspaceId, actor.id, "confirmed", "official page", combinationId, `${actor.name} confirmed the official page of "${c.label}": ${page.title} (${item.tier === "author" ? "the rules found exactly this page; configuration author tier, sure" : `chosen by the immigration expert${item.matches === 1 ? " over the rules' one match" : item.matches ? ` among ${item.matches} matches` : "; the rules found no apply page"}; not sure`})${held ? `. It replaces ${before}, confirmed by ${held.confirmedBy} (${held.confirmedAs} tier)` : ""}`, { attachment_id: page.id, matches: item.matches, confirmed_as: item.tier, ...(held ? { replaced: held } : {}) }, combinationId);
    return { pages: { state: "confirmed" as const, by: saved.confirmedBy, as: saved.confirmedAs as Tier }, record: saved };
  }
}

@Controller("api")
export class OfficialPagesController {
  constructor(@Inject(OfficialPagesService) private readonly s: OfficialPagesService) {}
  @Get("combinations/:id/official-pages") get(@Param("id") id: string) { return this.s.get(id); }
  // N8 break m6: a case person gets the same "Not for case people" refusal as on reading the configuration.
  @Post("combinations/:id/official-pages/confirm") confirm(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.s.confirm(readerOf(a), id, b); }
}

