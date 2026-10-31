// F2 (forms lane, N8; P-156 (2), P-176, P-161 (3)): step 1 of the setup checklist, a combination's official page. Pure (no
// I/O). The rules propose from what is attached: the combination's IRCC apply page is an attached canada.ca "Web page".
// Exactly one such page: the configuration author confirms it (sure; the expert may too). None or several: the immigration
// expert chooses one (not sure), from the attached pages (an apply page or a guide page). Only the confirmation is stored
// (api/src/official-pages.ts); a confirmation whose page is no longer attached counts as none.
import type { OfficialPages } from "./setup-checklist.ts";
import type { ItemKind, Tier } from "../contracts/setup-checklist.ts";

/** What the rules match: an IRCC apply page (an application package or a forms-and-documents page): an official "Web
 *  page" that is not a single form's page. The official manifest labels each single-form page "<form> form page"
 *  (official-sources/ircc/manifest.json: 10 of its 12 web pages); N8 re-review M1: those are no apply page, so they are
 *  never the rules' match (an expert may still choose one). */
export const APPLY_PAGE_KINDS = ["Web page"] as const;
export const isFormPage = (s: Pick<PageSource, "title" | "file">) => /\bform page$/i.test(s.title.trim()) || /^page-imm/i.test(s.file);
/** What a person may choose as the official page: an apply page, or a guide's web page (kind Instructions, an HTML file;
 *  an office's PDF instructions are not a page). */
export const PAGE_KINDS = ["Web page", "Instructions"] as const;

export type PageSource = { id: string; kind: string; title: string; file: string };
export type PagesRecord = { attachmentId: string; confirmedBy: string; confirmedAs: Tier } | null;

export const isApplyPage = (s: Pick<PageSource, "kind" | "title" | "file">) => (APPLY_PAGE_KINDS as readonly string[]).includes(s.kind) && !isFormPage(s);
export const isPage = (s: Pick<PageSource, "kind" | "title" | "file">) => (APPLY_PAGE_KINDS as readonly string[]).includes(s.kind) || (s.kind === "Instructions" && /\.html?$/i.test(s.file));

/** A stored confirmation that still holds: its page is attached and, for the author's tier ("sure"), the rules still find
 *  exactly that one page (N8 break M2: a second apply page attached later makes it the expert's choice again). */
export function recordHolds(sources: PageSource[], record: PagesRecord): boolean {
  if (!record || !sources.some((s) => s.id === record.attachmentId && isPage(s))) return false;
  if (record.confirmedAs === "expert") return true;
  const matches = sources.filter(isApplyPage);
  return matches.length === 1 && matches[0].id === record.attachmentId;
}

/** Step 1's state for one combination: confirmed (a record that still holds), proposed (pages attached; `matches` apply
 *  pages found by the rules), or no record (no page attached yet). */
export function officialPagesFrom(sources: PageSource[], record: PagesRecord): OfficialPages {
  if (record && recordHolds(sources, record)) return { state: "confirmed", by: record.confirmedBy, as: record.confirmedAs };
  if (!sources.some(isPage)) return { state: "no_record" };
  return { state: "proposed", matches: sources.filter(isApplyPage).length };
}

/** The item a confirmation acts on (P-176): the rules' one match confirmed → `confirm_pages` on the author's tier; any
 *  other page, or a choice among none or several → `choose_pages` on the expert's tier. The API refuses with mayAct. */
export function confirmationOf(sources: PageSource[], attachmentId: string, record: PagesRecord = null): { kind: ItemKind; tier: Tier; matches: number } {
  const matches = sources.filter(isApplyPage);
  // N8 (F2 review M2, break M1): a choice the immigration expert made, still holding, is changed by the expert alone.
  if (record && record.confirmedAs === "expert" && recordHolds(sources, record)) return { kind: "choose_pages", tier: "expert", matches: matches.length };
  return matches.length === 1 && matches[0].id === attachmentId ? { kind: "confirm_pages", tier: "author", matches: 1 } : { kind: "choose_pages", tier: "expert", matches: matches.length };
}
