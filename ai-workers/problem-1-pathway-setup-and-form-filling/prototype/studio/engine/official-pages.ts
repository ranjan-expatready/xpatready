// F2 (forms lane, N8; P-156 (2), P-176, P-161 (3)): step 1 of the setup checklist, a combination's official page. Pure (no
// I/O). The rules propose from what is attached: the combination's IRCC apply page is an attached canada.ca "Web page".
// Exactly one such page: the configuration author confirms it (sure; the expert may too). None or several: the immigration
// expert chooses one (not sure), from the attached pages (an apply page or a guide page). Only the confirmation is stored
// (api/src/official-pages.ts); a confirmation whose page is no longer attached counts as none.
import type { OfficialPages } from "./setup-checklist.ts";
import type { ItemKind, Tier } from "../contracts/setup-checklist.ts";

/** What the rules match: an IRCC apply page (application package or forms-and-documents page). */
export const APPLY_PAGE_KINDS = ["Web page"] as const;
/** What a person may choose as the official page: an apply page, or a guide's web page (kind Instructions, an HTML file;
 *  an office's PDF instructions are not a page). */
export const PAGE_KINDS = ["Web page", "Instructions"] as const;

export type PageSource = { id: string; kind: string; title: string; file: string };
export type PagesRecord = { attachmentId: string; confirmedBy: string; confirmedAs: Tier } | null;

export const isApplyPage = (s: Pick<PageSource, "kind">) => (APPLY_PAGE_KINDS as readonly string[]).includes(s.kind);
export const isPage = (s: Pick<PageSource, "kind" | "file">) => isApplyPage(s) || (s.kind === "Instructions" && /\.html?$/i.test(s.file));

/** Step 1's state for one combination: confirmed (its page still attached), proposed (pages attached; `matches` apply
 *  pages found by the rules), or no record (no page attached yet). */
export function officialPagesFrom(sources: PageSource[], record: PagesRecord): OfficialPages {
  if (record && sources.some((s) => s.id === record.attachmentId && isPage(s))) return { state: "confirmed", by: record.confirmedBy, as: record.confirmedAs };
  if (!sources.some(isPage)) return { state: "no_record" };
  return { state: "proposed", matches: sources.filter(isApplyPage).length };
}

/** The item a confirmation acts on (P-176): the rules' one match confirmed → `confirm_pages` on the author's tier; any
 *  other page, or a choice among none or several → `choose_pages` on the expert's tier. The API refuses with mayAct. */
export function confirmationOf(sources: PageSource[], attachmentId: string): { kind: ItemKind; tier: Tier; matches: number } {
  const matches = sources.filter(isApplyPage);
  return matches.length === 1 && matches[0].id === attachmentId ? { kind: "confirm_pages", tier: "author", matches: 1 } : { kind: "choose_pages", tier: "expert", matches: matches.length };
}
