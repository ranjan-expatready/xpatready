// Shared library › Forms (S4, P-123; walkthrough v2 S4): every IRCC form, guide and checklist stored once, in one list
// with type, used-by and status filters and a search (never groups). One way in: Upload PDF (many files; each runs on
// the shared run card, rules first). Every row: Replace with a new edition, Re-read with AI, See where it is used,
// Retire (kept for released versions), Delete (only when nothing uses it); a person approves retire and delete (P-116).
// Which forms a combination needs and what IRCC accepts are Sample until the immigration expert confirms. Checks below.
import { ACCOUNT_WORDS, CHANNEL_WORDS, CHANNELS, IRCC_ACCOUNTS } from "../../../contracts/forms";
import { normaliseCode } from "../../../contracts/form-library";
import * as React from "react";
import { Link } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FileUp, ListChecks, MoreHorizontal, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, queryClient, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { RunCard } from "@/components/run-card";
import { AiLaunchDialog } from "@/components/ai-launch";
import { DraftFields } from "@/components/draft-fields";
import { Tip, TipProvider } from "@/components/status";
import { Button, Dialog, Field, Input, Notice, Panel, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { BlockedLine, ImpactPanel, RowAction, useUndoToast } from "@/components/lifecycle";
import { ACTION_LABEL, RETURNED_LABEL, SAY, TIP, WAITING_LABEL, WHY } from "../../../contracts/lifecycle";
import { Skeleton } from "@/components/ui/skeleton";
import type { FieldMapState } from "../../../contracts/form-library";

type Row = { code: string; title: string; type: "form" | "guide" | "checklist"; edition: string | null; /** C3.12 (K3, QA-148): IRCC's month for the edition, printed on it, else its canada.ca page; never the file's date. */ published?: string | null; published_from?: "printed" | "canada_page" | null; published_state?: "date" | "none" | "not_a_month"; /** The PDF's own date (#313), shown apart as "File saved". */ file_date?: string | null; file_date_state?: FileDateState; canada_updated: string | null; accepts: string | null; accepts_basis: string | null; accepts_quote: string | null; accepts_waiting: boolean;
  /** C3.12: the field map of its current edition (contracts/form-library.ts fieldMapState). */
  field_map: FieldMapState;
  /** P-143 (C-3): one record per IRCC account (ANY: every account), each with its basis and IRCC's line. */
  accepts_accounts?: { account: string; account_words: string; channels: string[]; words: string; basis: string; quote: string | null; source_url: string | null }[];
  origin: string | null; downloaded_from: string | null; checked_at: string | null; form_page_url: string | null; fingerprint: string | null; attachment_id: string | null;
  used_by: { id: string; label: string; picked_by_ai: boolean; as_source?: boolean }[]; status: "ready" | "needs_ok" | "newer_file" | "no_file" | "online_only" | "retired"; listed_by_ircc?: boolean; newer_on_index?: boolean; lifecycle_waiting: "DELETE" | "RETIRE" | "RESTORE" | null; lifecycle_approved?: boolean; lifecycle_returned?: boolean; older_editions: { label: string; published?: string | null; published_from?: "printed" | "canada_page" | null; published_state?: "date" | "none" | "not_a_month"; file_date?: string | null; file_date_state?: FileDateState; kept_by: string }[]; action: { kind: "DELETE" | "RETIRE" | "RESTORE" | "WITHDRAW"; why: string | null; change_id: string | null } };
type List = { rows: Row[]; counts: Record<string, number>; combinations: { id: string; label: string }[]; sample_note: string; remembered_deletions?: { code: string; deleted_by: string; deleted_at: string }[] };
export type Uses = { label: string; released: boolean; retired: boolean; uses: { kind: string; label: string; href: string | null; blocks: boolean; why: string }[]; can: { delete: string | null; retire: string | null; restore: string | null }; pending: { id: string; action: string; by: string | null } | null; history: { at: string; by: string | null; what: string }[] };

const TYPE_WORD: Record<Row["type"], string> = { form: "Form", guide: "Guide", checklist: "Checklist" };
const ACCEPTS: Record<string, string> = { PDF: "PDF upload", ONLINE: "Online", PDF_OR_ONLINE: "PDF upload · Online", READ_BY_AI: "Not filed" };
/** Who said what IRCC accepts: AI read it on the IRCC page, or a person set it (a second person approved); Sample until the expert confirms. */
const BASIS: Record<string, { tag: string; tip: string }> = {
  AI_SAMPLE: { tag: "AI · Sample", tip: "AI read this from IRCC's own words on the page. Sample until the immigration expert confirms." },
  PERSON_SAMPLE: { tag: "Set by a person · Sample", tip: "A person set this and a second person approved it. Sample until the immigration expert confirms." },
  SAMPLE_FIXTURE: { tag: "Sample · canada.ca words", tip: "Loaded with the sample from IRCC's own sentence on this form's canada.ca page (no AI call). Sample until the immigration expert confirms." },
  EXPERT: { tag: "Confirmed by the expert", tip: "The immigration expert confirmed this." },
  FOUNDER_SAMPLE: { tag: "Founder P-171 · Sample", tip: "The founder's answer where IRCC's pages say nothing (P-171). No IRCC line to quote. Sample until the immigration expert confirms." },
};
/** A guide's date is canada.ca's own "Date modified" when the page prints one; otherwise when the studio read it. */
/** C3.12 (K3, QA-148): "Published" is IRCC's month for the edition: printed on the form, else its canada.ca page's "Last
 *  updated" (AGENTS rule 4), never the PDF file's own date; with neither, it says so and never guesses. */
const NO_PUBLISHED = { none: "No edition date printed on it or on canada.ca", not_a_month: "Its printed edition date is not a real month" } as const;
const publishedText = (d: string | null | undefined, s?: "date" | "none" | "not_a_month") => (d ? `Published ${d}` : NO_PUBLISHED[s === "not_a_month" ? "not_a_month" : "none"]);
const FROM: Record<"printed" | "canada_page", string> = { printed: "printed on the form", canada_page: "canada.ca page, Last updated" };
/** Review m1: the date itself never breaks at its hyphens; the words around it may wrap. */
const PublishedLine = ({ d, s }: { d: string | null | undefined; s?: "date" | "none" | "not_a_month" }) => (d ? <>Published <span className="whitespace-nowrap" data-published-date>{d}</span></> : <>{publishedText(d, s)}</>);
/** The PDF file's own date (#313; break 456fb7d0 M2: not read yet or unreadable is said as such, never as "no date"). */
type FileDateState = "date" | "none" | "unread" | "unreadable";
const FILE_NO_DATE: Record<FileDateState, string> = { date: "", none: "The PDF names no date of its own", unread: "The PDF's own date is not read yet", unreadable: "The PDF's own date could not be read" };
/** Review m3: said as what it is, the PDF's own date, and that it is not when IRCC published the edition. */
const fileDateText = (d: string | null | undefined, s: FileDateState | undefined) => (d ? `File saved ${d}: the PDF's own date, not when IRCC published it` : FILE_NO_DATE[s ?? "none"] || FILE_NO_DATE.none);
const editionText = (r: Row) => (r.type === "guide" ? (r.canada_updated ? `Updated on canada.ca ${r.canada_updated}` : r.checked_at ? `Read from canada.ca on ${new Date(r.checked_at).toISOString().slice(0, 10)}` : "Date not known") : r.edition ? r.edition.replace(`${r.code} `, "").replace(/[()]/g, "") : null);
const ACCEPTS_TIP = "What IRCC accepts for this form, for each IRCC account or for every account: Online, PDF upload, Paper, or Not needed (the account asks it itself; said for one account only). Guides and checklists are not filed: AI reads them. AI reads it from IRCC's page, the sample loads it with IRCC's own line from the page, or a person sets it with a second person's OK; Sample until the immigration expert confirms. Online filling needs the browser extension (later wave).";
const STATUS: Record<Row["status"], { word: string; tone: string; tip: string }> = {
  ready: { word: "Ready", tone: "ok", tip: "Its current edition is in the library and may be used by any combination." },
  needs_ok: { word: "Needs your OK", tone: "warn", tip: "A file of this form waits for a second person on To review (a hand upload, or a newer edition to review)." },
  newer_file: { word: "Newer file on canada.ca", tone: "warn", tip: "canada.ca now serves another file of the same printed edition. Combinations keep using the library's file until a person replaces it." },
  no_file: { word: "No file yet", tone: "neutral", tip: "No edition of this form is in the library yet: upload its PDF, or let the form finder download it from canada.ca." },
  online_only: { word: "Online only · no official PDF", tone: "neutral", tip: "This form is held only as its online version, with no official PDF: its questions come from IRCC's help pages or saved portal screens. No PDF is asked for." },
  retired: { word: "Retired", tone: "neutral", tip: "Hidden from pickers and AI; released versions and open cases keep it. Restore it to use it again." },
};
/** X5 (P-156 (1)): the words of a row filled from IRCC's forms list, beside the usual ones. */
const STATUS_INDEX: Record<"listed" | "newer", { word: string; tip: string }> = {
  listed: { word: "Listed by IRCC · no file yet", tip: "IRCC's forms list names this form; its PDF is not in the library yet. It is downloaded from canada.ca when a combination picks it, or you can upload it." },
  newer: { word: "Newer edition on canada.ca", tip: "IRCC's forms list shows a later date for this form than the library's file, since it was last checked. Combinations keep using the library's file: check it against canada.ca (⋯ › Replace with a new edition)." },
};
const ORIGIN: Record<string, string> = { DOWNLOADED: "Downloaded from canada.ca by the form finder", UPLOADED: "Uploaded by a person", SAMPLE: "Official copy loaded with the sample" };

export function FormsPage() {
  const actorId = useActorId();
  const session = useApi<{ actor?: { duties?: string[] } }>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const [type, setType] = React.useState(""), [usedBy, setUsedBy] = React.useState(""), [status, setStatus] = React.useState(""), [q, setQ] = React.useState("");
  // X5 review (86f9447c) M1, STANDARDS §9: the whole list is read once and filtered here, by the server's own rules
  // (form-library.ts list()), so a search keystroke or a chip press makes no request; the search term is deferred and the
  // table memoised, so typing stays under 200 ms with IRCC's ~240 listed forms in it.
  const lib = useApi<List>(["library-forms-list", actorId], "/library/forms/list", { placeholderData: (p) => p });
  const dq = React.useDeferredValue(q);
  const rows = React.useMemo(() => {
    const term = dq.trim().toLowerCase(), termCode = term ? normaliseCode(dq.trim()).toLowerCase() : "";
    return (lib.data?.rows ?? []).filter((r) => (!type || r.type === type) && (!usedBy || r.used_by.some((u) => u.id === usedBy)) && (!status || r.status === status)
      && (!term || r.code.toLowerCase().includes(term) || r.code.toLowerCase().includes(termCode) || r.title.toLowerCase().includes(term)));
  }, [lib.data, type, usedBy, status, dq]);
  // X5 review (5a5f0d16) M1, STANDARDS §9: at most PAGE rows are mounted at once (Show more adds the next PAGE), so widening
  // a filter back to the whole list stays under 200 ms; the count of every match is said beside the button.
  const PAGE = 50;
  // X5 break (57f7d79d) m12: the count starts again at PAGE in the same render as the filter change (an effect drew every
  // match first, then redrew at PAGE).
  const [limit, setLimit] = React.useState(PAGE);
  const viewKey = JSON.stringify([type, usedBy, status, dq]);
  const [limitKey, setLimitKey] = React.useState(viewKey);
  if (limitKey !== viewKey) { setLimitKey(viewKey); setLimit(PAGE); }
  const pageRows = React.useMemo(() => rows.slice(0, limit), [rows, limit]);
  // Review / break (0fc3f8a7) M7, WCAG 2.4.7: the focused row draws an outline inside its edges. The base sheet's unlayered
  // ":focus-visible { outline: none }" beats every layered utility (the app's focus is a ring), so the row's outline is
  // marked important; a ring (box-shadow) does not draw on a table row.
  // X5 review (57f7d79d) m1, WCAG 2.4.3: Show more moves focus to the first row it added (before: it stayed below the new
  // rows, or fell to the page when the button left). Review (310acb9c) 1 / break m16: to the row itself, not its number
  // button, so a second Enter does not open that row's drawer.
  const showMore = () => {
    const first = rows[pageRows.length]?.code; setLimit((n) => n + PAGE);
    if (first) setTimeout(() => document.querySelector<HTMLElement>(`tr[data-form="${CSS.escape(first)}"]`)?.focus(), 0);
  };
  const [opened, setOpened] = React.useState<Row | null>(null);
  // P-116 amended (28 Oct): the row's one written action is confirmed in the right panel (ImpactPanel), then the Undo toast.
  const [confirm, setConfirm] = React.useState<Row | null>(null);
  const [acting, setActing] = React.useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const undo = useUndoToast();
  const sendAction = async (r: Row, reason: string) => {
    const kind = r.action.kind, name = `${r.code} · ${r.title}`;
    setActing({ busy: true, error: null });
    try {
      if (kind === "WITHDRAW") { await api(`/library/changes/${r.action.change_id}/withdraw`, { method: "POST", json: { note: reason } }); undo.show(SAY.withdrawn(name)); }
      else {
        const c = await api<{ id: string }>(`/library/forms/${encodeURIComponent(r.code)}${kind === "DELETE" ? "" : `/${kind.toLowerCase()}`}`, { method: kind === "DELETE" ? "DELETE" : "POST", json: { reason } });
        undo.show(SAY.sent(kind, name), async () => { await api(`/library/changes/${c.id}/withdraw`, { method: "POST", json: { note: SAY.undone } }); await lib.refetch(); });
      }
      setConfirm(null); setActing({ busy: false, error: null });
      void queryClient.invalidateQueries({ queryKey: ["form-uses", r.code] }); await lib.refetch();
    } catch (e) { setActing({ busy: false, error: (e as Error).message }); }
  };
  const open = opened ? lib.data?.rows.find((r) => r.code === opened.code) ?? opened : null;
  // Review major 8: focus goes back to what opened the drawer (the number), never to the top of the page.
  const back = React.useRef<HTMLElement | null>(null);
  const setOpen = (r: Row | null) => {
    // Review (337cdfd5) 1 / break m21: a count still waiting on typing is said now, before the drawer hides the page from
    // screen readers (before: it landed behind the drawer and was never heard).
    if (r) { back.current = document.activeElement as HTMLElement | null; setSpoken(countText); setOpened(r); return; }
    const code = opened?.code; setOpened(null);
    setTimeout(() => (back.current?.isConnected ? back.current : document.querySelector<HTMLElement>(`tr[data-form="${CSS.escape(code ?? "")}"] button`))?.focus(), 0);
  };
  // Break minor: run cards stay while this tab is open (a reload or a visit elsewhere keeps them).
  const [runs, setRunsState] = React.useState<string[]>(() => { try { return JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]") as string[]; } catch { return []; } });
  const setRuns = (f: (r: string[]) => string[]) => setRunsState((r) => { const n = f(r); try { sessionStorage.setItem(RUNS_KEY, JSON.stringify(n)); } catch { /* storage blocked: cards last until reload */ } return n; });
  const c = lib.data?.counts ?? {};
  const chip = (active: boolean, label: string, n: number | undefined, on: () => void, tip: string) => (
    <Tip tip={tip}><button type="button" aria-pressed={active} onClick={on} className={`rounded-full border px-3 py-1 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${active ? "border-primary bg-primary/10 text-text-link" : "border-border text-text"}`}>{label}{n !== undefined ? <span className="ml-1 tabular-nums text-text-muted">{n}</span> : null}</button></Tip>
  );
  // Review (5a5f0d16) m4: read with the deferred term, so clearing a search never flashes "No forms yet".
  const filtered = !!(type || usedBy || status || dq.trim());
  // Review (0fc3f8a7) 2: the count is spoken once typing pauses (before: an update per keystroke or two); a chip or Show
  // more is spoken at once. Break (0fc3f8a7) m20: no count while the list could not be loaded (before: the old list's).
  const countText = lib.data && !lib.isError ? (rows.length ? `Showing ${pageRows.length} of ${rows.length} forms` : filtered ? "No form matches" : "") : "";
  const [spoken, setSpoken] = React.useState(countText);
  const spokenQ = React.useRef(dq), typedRef = React.useRef(false);
  React.useEffect(() => {
    // Review (337cdfd5) 2 / break m22: only the search box's own typing waits; Clear filters (which also empties the search)
    // is said at once.
    const typing = typedRef.current && spokenQ.current !== dq; spokenQ.current = dq; typedRef.current = false;
    if (!typing) { setSpoken(countText); return; }
    const t = setTimeout(() => setSpoken(countText), 700);
    return () => clearTimeout(t);
  }, [countText, dq]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the row callbacks only call state setters; the rows and the person are what change it
  const tableEl = React.useMemo(() => (
            <Table label="Table: Number, Title, Type, Edition, Field map, IRCC accepts, Used by, Status" headClass={[undefined, undefined, "hidden xl:table-cell", "hidden xl:table-cell", "hidden xl:table-cell"]} head={["Number", "Title", "Type", "Edition", "Field map", <Tip key="ia" tip={ACCEPTS_TIP}><span tabIndex={0} className="underline decoration-dotted rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">IRCC accepts</span></Tip>, "Used by", "Status", <span key="a" className="sr-only">Actions</span>]}>
              {pageRows.map((r) => (<React.Fragment key={r.code}>
                <tr data-form={r.code} tabIndex={-1} className={`focus-visible:outline-2! focus-visible:outline-solid! focus-visible:-outline-offset-2! focus-visible:outline-ring! ${r.status === "retired" ? "text-text-muted" : ""}`}>
                  <td className="whitespace-nowrap text-xs tabular-nums"><button type="button" className="rounded text-text-link underline-offset-2 hover:underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => setOpen(r)}>{r.code}</button></td>
                  <td className="min-w-32 max-w-56 break-words xl:max-w-80"><span className="line-clamp-2" title={r.title}>{r.title}</span>
                    <span className="mt-0.5 block text-xs text-text-muted xl:hidden">{TYPE_WORD[r.type]} · {editionText(r) ?? (r.status === "online_only" ? "online version only" : "no usable edition yet")}{r.type !== "guide" && r.edition ? <span data-published-short> · <PublishedLine d={r.published} s={r.published_state} /></span> : null}{r.type === "form" && r.edition ? <> · <Tip tip={r.field_map.tip}><span tabIndex={0} data-field-map-short={r.field_map.kind} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Field map: {r.field_map.words}</span></Tip></> : null}</span></td>
                  <td className="hidden xl:table-cell">{TYPE_WORD[r.type]}</td>
                  <td className="hidden xl:table-cell">{editionText(r) ?? <span className="text-text-muted">{r.status === "online_only" ? "online version only" : "no usable edition yet"}</span>}{r.type !== "guide" && r.edition ? <span data-published className="block text-xs text-text-muted"><PublishedLine d={r.published} s={r.published_state} /></span> : null}</td>
                  <td className="hidden xl:table-cell"><FieldMapCell fm={r.field_map} /></td>
                  <td className="max-w-36 xl:max-w-none"><AcceptsCell r={r} /></td>
                  <td className="max-w-48 xl:max-w-72">{r.used_by.length === 0 ? <span className="text-text-muted">Not used</span> : r.used_by.length === 1 ? <TrailText label={r.used_by[0].label} /> : <Tip tip={r.used_by.map((u) => u.label).join(", ")}>{/* DV-d1-1 (N8): a count a person trusts at a glance: a plain link-style button (opens where it is used), never a dotted line that reads as struck through */}<button type="button" data-used-by-count className="rounded text-text-link underline-offset-2 hover:underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => setOpen(r)}>{r.used_by.length} combinations</button></Tip>}</td>
                  <td><span className="inline-flex flex-wrap gap-1">{(() => { const ix = r.status === "no_file" && r.listed_by_ircc ? STATUS_INDEX.listed : r.status === "newer_file" && r.newer_on_index ? STATUS_INDEX.newer : null; return <Tip tip={ix?.tip ?? STATUS[r.status].tip}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-row-status={r.status}><Pill tone={STATUS[r.status].tone}>{ix?.word ?? STATUS[r.status].word}</Pill></span></Tip>; })()}{r.lifecycle_waiting && r.lifecycle_returned ? <Tip tip={TIP.returned}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="danger">{RETURNED_LABEL[r.lifecycle_waiting]}</Pill></span></Tip> : r.lifecycle_waiting ? <Tip tip={r.lifecycle_approved ? `Approved: the form is ${r.lifecycle_waiting === "RESTORE" ? "restored" : "retired"} with the next release (Release, on the combination's Review page).` : `A request to ${r.lifecycle_waiting.toLowerCase()} this form waits for a second person on To review.`}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="warn">{r.lifecycle_approved ? `${ACTION_LABEL[r.lifecycle_waiting]} approved` : WAITING_LABEL[r.lifecycle_waiting]}</Pill></span></Tip> : null}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <RowAction kind={r.action.kind} why={canAuthor ? r.action.why : WHY.author} canEdit={canAuthor} name={r.code} reasonId={`why-${r.code.replace(/\W+/g, "-")}`}
                        tip={r.action.kind === "DELETE" ? TIP.DELETE(0, false) : r.action.kind === "RETIRE" ? TIP.RETIRE(false) : r.action.kind === "RESTORE" ? TIP.RESTORE : TIP.WITHDRAW(r.code)}
                        editTip="Open the form: its definition, what IRCC accepts, where it is used and its history." onEdit={() => setOpen(r)} onAction={() => { setActing({ busy: false, error: null }); setConfirm(r); }} />
                      <RowActions row={r} canAuthor={canAuthor} onWhereUsed={() => setOpen(r)} />
                    </div>
                  </td>
                </tr>
                {/* The greyed action's reason, as visible text under its row (P-116 amended; aria-describedby on the action). */}
                {canAuthor && r.action.why ? <tr data-reason-for={r.code}><td colSpan={9} className="pt-0 text-right"><BlockedLine id={`why-${r.code.replace(/\W+/g, "-")}`} text={r.action.why} onWhere={() => setOpen(r)} className="ml-auto max-w-[40rem]" /></td></tr> : null}
              </React.Fragment>
              ))}
            </Table>
  ), [pageRows, canAuthor]);
  return (
    <TipProvider>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm text-text-muted">Shared library › Forms</p><h1 className="text-2xl font-bold tracking-tight">Forms</h1><p className="mt-1 text-sm text-text-muted">Every IRCC form, guide and checklist, stored once. Combinations pick from here by themselves.</p></div>
          {/* X5 review m6: the two ways forms come in, side by side. */}
          {canAuthor ? <span className="flex flex-wrap items-center gap-2"><FillFromIndexButton /><UploadButton onRuns={(ids) => setRuns((r) => [...ids, ...r].slice(0, 20))} /></span> : null}
        </div>
        {runs.length ? <div className="space-y-3">{runs.map((id) => <RunCard key={id} runId={id} onEnded={() => void queryClient.invalidateQueries({ queryKey: ["library-forms-list"] })} onDismiss={() => setRuns((r) => r.filter((x) => x !== id))} />)}</div> : null}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3" role="group" aria-label="Filters">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Type</span>
            {chip(!type, "All", c.all, () => setType(""), "Every form, guide and checklist in the library.")}
            {chip(type === "form", "Forms", c.form, () => setType("form"), "Forms a case files (PDF or online).")}
            {chip(type === "guide", "Guides", c.guide, () => setType("guide"), "IRCC guides: read by AI to find a combination's forms; never filled.")}
            {chip(type === "checklist", "Checklists", c.checklist, () => setType("checklist"), "IRCC document checklists: read by AI for the documents list; never filled.")}
          </div>
          <label className="flex items-center gap-2 text-sm"><span className="font-medium">Used by</span>
            <Select aria-label="Used by" value={usedBy} onChange={(e) => setUsedBy(e.target.value)} className="w-56"><option value="">Any combination</option>{(lib.data?.combinations ?? []).map((x) => { const { last, above } = nameFirst(x.label); return { id: x.id, text: above ? `${last} · ${above}` : last ?? x.label }; }).sort((a, b) => a.text.localeCompare(b.text)).map((x) => <option key={x.id} value={x.id}>{x.text}</option>)}</Select>
          </label>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Status</span>
            {chip(status === "needs_ok", "Needs your OK", c.needs_ok, () => setStatus(status === "needs_ok" ? "" : "needs_ok"), STATUS.needs_ok.tip)}
            {/* X5 (review 4, break m10): one word for both kinds of "newer" (a newer file, or a newer date on IRCC's list). */}
            {chip(status === "newer_file", "Newer on canada.ca", c.newer_file, () => setStatus(status === "newer_file" ? "" : "newer_file"), "canada.ca shows something newer than the library's file: another file of the same edition, or a newer date on IRCC's forms list. Combinations keep the library's file until a person checks it.")}
            {/* X5 break M5: after the fill most rows have no file yet; these two chips find the rest, or only those. */}
            {chip(status === "ready", "Ready", c.ready ?? 0, () => setStatus(status === "ready" ? "" : "ready"), STATUS.ready.tip)}
            {chip(status === "no_file", "No file yet", c.no_file ?? 0, () => setStatus(status === "no_file" ? "" : "no_file"), STATUS.no_file.tip)}
            {/* C11.11 (P-152): shown only when the library holds an online-only form. */}
            {c.online_only ? chip(status === "online_only", "Online only", c.online_only, () => setStatus(status === "online_only" ? "" : "online_only"), STATUS.online_only.tip) : null}
            {chip(status === "retired", "Retired", c.retired, () => setStatus(status === "retired" ? "" : "retired"), STATUS.retired.tip)}
          </div>
          <label className="relative ml-auto"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden /><Input type="search" aria-label="Search number or title" placeholder="Search number or title" value={q} maxLength={80} onChange={(e) => { typedRef.current = true; setQ(e.target.value); }} className="w-64 pl-8" /></label>
        </div>
        {lib.isLoading ? <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading forms">{/* DV-d1-2 (N8): a label needs a role (axe aria-prohibited-attr) */}{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          : lib.isError ? <Notice tone="danger" title="The forms could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void lib.refetch()}>Try again</Button>}>{(lib.error as Error).message}</Notice>
          : !rows.length ? (filtered
            ? <EmptyState title="No form matches" description="Nothing in the library matches these filters. Clear a filter or search for another number or title." action={<Button variant="secondary" onClick={() => { typedRef.current = false; setType(""); setUsedBy(""); setStatus(""); setQ(""); }}>Clear filters</Button>} />
            : <EmptyState title="No forms yet" description="Forms come in by themselves when a combination's setup starts: the form finder reads its IRCC page and downloads each form from canada.ca. You can also upload IRCC PDFs. Every form is stored once and used by any combination." />)
          : <>{tableEl}{rows.length > pageRows.length ? <p className="flex flex-wrap items-center gap-3 text-sm" data-show-more><span className="text-text-muted" aria-hidden>Showing {pageRows.length} of {rows.length} forms</span><Button size="sm" variant="secondary" onClick={showMore}>Show {Math.min(PAGE, rows.length - pageRows.length)} more forms</Button></p> : null}</>}
        {/* Review (310acb9c) 2 / break m17, WCAG 4.1.3: one status region, always on the page, says how many forms are shown
            (before: it lived in the pager, so the last Show more and a short filter were never spoken). */}
        <p className="sr-only" role="status" data-list-count data-shown={lib.isError ? 0 : pageRows.length}>{spoken}</p>
        {lib.data?.remembered_deletions?.length ? <RememberedDeletions items={lib.data.remembered_deletions} canAuthor={canAuthor} /> : null}
        <p className="text-xs text-text-muted">{lib.data?.sample_note}</p>
        {open ? <FormDrawer row={open} onClose={() => setOpen(null)} canAuthor={canAuthor} /> : null}
        {confirm ? <div className="xl:fixed xl:right-6 xl:top-20 xl:z-40 xl:w-[440px]"><ImpactPanel key={`impact-${confirm.code}`} kind={confirm.action.kind} name={`${confirm.code} · ${confirm.title}`}
          kept={confirm.action.kind === "RETIRE" ? confirm.used_by.map((u) => u.label) : undefined} takesEffect={confirm.action.kind === "RETIRE" || confirm.action.kind === "RESTORE" ? SAY.takesEffect("DELETE") : undefined} busy={acting.busy} error={acting.error}
          onCancel={() => { const code = confirm.code; setConfirm(null); setTimeout(() => document.querySelector<HTMLElement>(`tr[data-form="${CSS.escape(code)}"] [data-action]`)?.focus(), 0); }} onSend={(reason) => void sendAction(confirm, reason)} /></div> : null}
        {undo.node}
      </div>
    </TipProvider>
  );
}

const RUNS_KEY = "library-forms-runs";

/** A combination's trail with its name first (what tells them apart), the rest after it: "Visitor visa · Retail ›
 *  Temporary residence › Visitors" (P-104, QA-150). Used by the cell and the Used by filter alike. */
const nameFirst = (label: string) => { const parts = label.split(" › "), last = parts.pop(); return { last, above: parts.join(" › ") }; };
/** The cell: at most two lines (EXPERIENCE §1), the full trail in its tip and in "See where it is used"; a long unbroken
 *  name wraps inside the cell, never over Status (break m2). */
function TrailText({ label }: { label: string }) {
  const { last, above } = nameFirst(label);
  return <span data-trail className="line-clamp-2 [overflow-wrap:anywhere] xl:min-w-56" title={label}>{last}{above ? <span className="text-text-muted"> · {above}</span> : null}</span>;
}

/** The IRCC accepts cell: the value, then who said it (AI · Sample, a person · Sample, the expert); a change waiting shows. */
function AcceptsCell({ r }: { r: Row }) {
  const basis = r.accepts_basis ? BASIS[r.accepts_basis] : null;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      {r.accepts ? ACCEPTS[r.accepts] ?? r.accepts : <span className="text-text-muted">Not set yet</span>}
      {r.type === "form" && r.accepts && basis ? <Tip tip={basis.tip}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone={r.accepts_basis === "AI_SAMPLE" ? "ai" : "neutral"} className="max-w-full whitespace-normal">{basis.tag}</Pill></span></Tip> : null}
      {r.accepts_waiting ? <Tip tip="A change to what IRCC accepts waits for a second person on To review."><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="warn">Change waiting</Pill></span></Tip> : null}
    </span>
  );
}

/** A change asked from a dialog or the side panel: success as a toast, a refusal said once, on the form (not also a toast). */
function useAsk<R>(fn: () => Promise<R>, success: string, keys: unknown[][], onDone: () => void) {
  const toast = useToast();
  return useMutation<R, Error, void>({ mutationFn: fn, onSuccess: () => { for (const k of keys) void queryClient.invalidateQueries({ queryKey: k }); toast.push({ tone: "ok", text: success }); onDone(); } });
}

/** X5 slice c: the forms a second person approved deleting; fills leave them out until a person lists one again. */
function RememberedDeletions({ items, canAuthor }: { items: { code: string; deleted_by: string; deleted_at: string }[]; canAuthor: boolean }) {
  const [code, setCode] = React.useState<string | null>(null);
  const heading = React.useRef<HTMLHeadingElement | null>(null);
  // Review (00007dd0) 2, WCAG 2.4.3: after List again, focus goes to the next List again button, else to this heading (or,
  // when the section is gone, the Fill button), never to the page.
  const refocus = (after: string, tries = 40) => {
    const left = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-remembered-deletions] [data-list-again]")).filter((b) => b.dataset.listAgain !== after);
    const target = left[0] ?? heading.current ?? document.querySelector<HTMLElement>("[data-fill-index]");
    if (left.length || !document.querySelector(`[data-list-again="${CSS.escape(after)}"]`) || tries <= 0) { target?.focus(); return; }
    requestAnimationFrame(() => refocus(after, tries - 1));
  };
  const again = useAction((c: string) => api<{ message: string; code: string }>(`/library/forms/${encodeURIComponent(c)}/list-again`, { method: "POST" }), { success: (r) => r.message, invalidate: [["library-forms-list"]], onDone: (r) => { setCode(null); requestAnimationFrame(() => refocus(r.code)); } });
  return (
    <section aria-labelledby="deleted-forms" className="space-y-1 text-sm" data-remembered-deletions>
      <h2 id="deleted-forms" ref={heading} tabIndex={-1} className="font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">Deleted from the library ({items.length})</h2>
      <p className="text-text-muted">Fills from IRCC's forms list leave these out until someone lists one again.</p>
      <ul className="flex flex-wrap gap-2">{items.map((d) => (
        <li key={d.code} className="flex items-center gap-2 rounded border border-border px-2 py-1" data-deleted={d.code}>
          <span>{d.code}</span><span className="text-text-muted">deleted {d.deleted_at.slice(0, 10)}, approved by {d.deleted_by}</span>
          {canAuthor ? <Button size="sm" variant="secondary" busy={again.isPending && code === d.code} onClick={() => { setCode(d.code); again.mutate(d.code); }} aria-label={`List again: ${d.code}`} data-list-again={d.code}>List again</Button> : null}
        </li>))}</ul>
    </section>
  );
}

/** X5 (P-156 (1)): fills the library from IRCC's forms list once (US$0: no AI, no download); safe to press again. */
function FillFromIndexButton() {
  const ref = React.useRef<HTMLButtonElement | null>(null), inFlight = React.useRef(false); // review (86f9447c) m4: a double click sends one fill
  // X5 review m5 (WCAG 2.4.3): the busy button is disabled while it fills; focus goes back to it once it is enabled again.
  const refocus = (tries = 30) => { const el = ref.current; if (!el || tries <= 0) return; if (el.disabled) { requestAnimationFrame(() => refocus(tries - 1)); return; } el.focus(); };
  const fill = useAction(() => api<{ message: string }>("/library/forms/fill-from-index", { method: "POST" }), { success: (r) => r.message, invalidate: [["library-forms-list"]], onDone: () => requestAnimationFrame(() => refocus()) });
  return <Tip tip="Reads IRCC's forms and guides list into the library: every form number not in the library yet, listed with no file (forms deleted from the library are left out). No AI, no download, US$0. Forms already here keep their file."><span><Button ref={ref} variant="secondary" busy={fill.isPending} onClick={() => { if (inFlight.current) return; inFlight.current = true; fill.mutate(undefined, { onSettled: () => { inFlight.current = false; } }); }} data-fill-index><ListChecks /> Fill from IRCC's forms list</Button></span></Tip>;
}

/** One way in for a file: Upload PDF, many files at once; each file runs on its own card (rules first, AI only when they cannot). */
function UploadButton({ onRuns }: { onRuns: (ids: string[]) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const start = async (files: FileList) => {
    setError(null);
    const fd = new FormData(); for (const f of Array.from(files)) fd.append("files", f, f.name);
    try { const r = await api<{ runId: string; runIds?: string[]; refused?: { file: string; why: string }[] }>("/library/forms/upload", { method: "POST", body: fd }); onRuns(r.runIds ?? [r.runId]); void queryClient.invalidateQueries({ queryKey: ["runs-active"] }); if (r.refused?.length) setError(`Not uploaded: ${r.refused.map((x) => x.why).join(" ")}`); } catch (e) { setError((e as Error).message); }
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <Tip tip="Upload one or more IRCC PDFs. Rules check each file and read its number, edition and title (no AI when they can), compare it with canada.ca, then it joins the library, or waits for a second person unless it is the very file canada.ca links.">
        <Button onClick={() => input.current?.click()}><FileUp /> Upload PDF</Button>
      </Tip>
      <input ref={input} type="file" tabIndex={-1} multiple accept="application/pdf,.pdf" className="sr-only" aria-label="Choose PDFs to upload" onChange={(e) => { if (e.target.files?.length) void start(e.target.files); e.target.value = ""; }} />
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

/** The ⋯ menu on a row: P-123's other actions (Replace, Re-read with AI, Where used). Delete, Retire, Restore and Withdraw
 *  are the row's one written action (P-116 amended), not in this menu. */
function RowActions({ row, canAuthor, onWhereUsed }: { row: Row; canAuthor: boolean; onWhereUsed: () => void }) {
  const [reread, setReread] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const refocus = () => setTimeout(() => trigger.current?.focus(), 0);
  const check = useAction(() => api<{ message: string }>(`/library/forms/${encodeURIComponent(row.code)}/check-canada`, { method: "POST" }), { success: (r) => r.message, invalidate: [["library-forms-list"]] });
  const item = "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-surface";
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><Button ref={trigger} size="sm" variant="ghost" aria-label={`Actions for ${row.code}`}><MoreHorizontal /></Button></DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[300px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
            <DropdownMenu.Item className={item} disabled={!canAuthor || row.type === "guide" || row.status === "retired"} onSelect={() => check.mutate(undefined)}>Replace with a new edition…</DropdownMenu.Item>
            <DropdownMenu.Item className={item} disabled={!canAuthor || !row.attachment_id || row.type !== "form"} onSelect={() => setReread(true)}>Re-read with AI (shared fields and form fields)</DropdownMenu.Item>
            {/* C11.13 (P-138): Draft fields lives in the form's drawer, with its saved-or-not state and cost. */}
            <DropdownMenu.Item className={item} disabled={row.type !== "form" || !row.edition} onSelect={onWhereUsed}>Draft fields with AI…</DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={onWhereUsed}>See where it is used ({row.used_by.length})</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {reread && row.attachment_id ? <AiLaunchDialog scope={{ kind: "source", ids: [row.attachment_id], label: row.code }} onClose={() => { setReread(false); refocus(); }} initialMode="REPLAY" /> : null}
    </>
  );
}

export function UsesList({ uses }: { uses: Uses | undefined }) {
  if (!uses) return null;
  if (!uses.uses.length) return <p className="text-sm text-text-muted">Nothing uses it: no combination, release or waiting change.</p>;
  return <ul className="space-y-1 text-sm">{uses.uses.map((u, i) => <li key={i}>{u.href ? <Link className="text-text-link underline" to={u.href}>{u.label}</Link> : u.label} <span className="text-text-muted">· {u.why}</span></li>)}</ul>;
}

/** The row's drawer (EXPERIENCE §3 library list): Definition · What IRCC accepts · Where used · History. */
function FormDrawer({ row, onClose, canAuthor }: { row: Row; onClose: () => void; canAuthor: boolean }) {
  const uses = useApi<Uses>(["form-uses", row.code], `/library/forms/${encodeURIComponent(row.code)}/uses`);
  const when = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "never");
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`${row.code} · ${row.title}`} description={`${TYPE_WORD[row.type]}${row.edition ? ` · ${row.edition}` : ""}`} badge={<Pill tone={STATUS[row.status].tone}>{STATUS[row.status].word}</Pill>}>
      <section className="space-y-1 text-sm" aria-labelledby="fd-def"><h3 id="fd-def" className="font-semibold">Definition</h3>
        <p>{row.type === "guide" ? editionText(row) : <>Current edition: {row.edition ?? "none usable yet"}{row.canada_updated ? ` · canada.ca last updated ${row.canada_updated}` : ""}</>}</p>
        {row.type !== "guide" && row.edition ? <p data-published-panel>{row.published ? <>Published {row.published} <span className="text-text-muted">({FROM[row.published_from ?? "printed"]})</span></> : <span className="text-text-muted">{publishedText(null, row.published_state)}</span>}<span className="block text-xs text-text-muted" data-file-date>{fileDateText(row.file_date, row.file_date_state)}</span></p> : null}
        <p>{row.type === "guide" ? "Read from its canada.ca page" : row.origin ? ORIGIN[row.origin] ?? row.origin : "Where it came from is not recorded"}{row.downloaded_from && row.type !== "guide" ? <> · <a className="text-text-link underline" href={row.downloaded_from} target="_blank" rel="noreferrer">PDF link</a></> : null}</p>
        {row.form_page_url ? <p><a className="text-text-link underline" href={row.form_page_url} target="_blank" rel="noreferrer">{/\.pdf$/i.test(row.form_page_url) ? "Its file on IRCC's site (no form page)" : "Its page on canada.ca"}</a>{/\.pdf$/i.test(row.form_page_url) ? null : <> · checked {when(row.checked_at)}</>}</p> : <p className="text-text-muted">No canada.ca page recorded yet.</p>}
        {row.type === "form" ? <p data-field-map-panel={row.field_map.kind}>Field map: {row.field_map.words}<span className="block text-xs text-text-muted">{row.field_map.tip}</span></p> : null}
        {row.older_editions.map((e) => <p key={e.label} className="text-text-muted" data-kept-by><span className="font-medium text-text">Earlier edition {e.label.replace(`${row.code} `, "")}</span> · <span data-published-older>{e.published ? `published ${e.published} (${FROM[e.published_from ?? "printed"]})` : publishedText(null, e.published_state).replace(/^(N|I)/, (c) => c.toLowerCase())}</span>{e.file_date ? <> · file saved {e.file_date}</> : null} · {e.kept_by}</p>)}
        <details><summary className="cursor-pointer text-text-muted">Details</summary><p className="mono break-all text-xs">File fingerprint (SHA-256): {row.fingerprint ?? "none"}</p></details>
      </section>
      <section className="mt-4 space-y-2 text-sm" aria-labelledby="fd-acc"><h3 id="fd-acc" className="font-semibold">What IRCC accepts</h3>
        <AcceptsCell r={row} />
        {/* P-143 (C-3): one line per IRCC account with a record, "any account" otherwise; each with who said it and IRCC's words. */}
        {(row.accepts_accounts ?? []).length ? <ul className="space-y-1" data-accepts-accounts>{row.accepts_accounts!.map((a) => (
          <li key={a.account}><span className="font-medium">{a.account_words}:</span> {a.words} <span className="text-xs text-text-muted">· {BASIS[a.basis]?.tag ?? a.basis}</span>{a.quote ? <span className="block text-text-muted">{a.basis === "PERSON_SAMPLE" ? "" : "IRCC's words: "}“{a.quote}”</span> : null}</li>))}</ul>
          : row.accepts_quote ? <p className="text-text-muted">{row.accepts_basis === "PERSON_SAMPLE" ? "" : "IRCC's words: "}“{row.accepts_quote}”</p> : null}
        {row.type === "form" && canAuthor && !row.accepts_waiting && row.status !== "retired" ? <SetAccepts row={row} /> : null}
      </section>
      {row.type === "form" && row.edition ? <DraftFields code={row.code} canAuthor={canAuthor} /> : null}
      <section className="mt-4 space-y-1" aria-labelledby="fd-use"><h3 id="fd-use" className="text-sm font-semibold">Where it is used</h3>
        {uses.isLoading ? <p className="text-sm text-text-muted">Loading…</p> : <UsesList uses={uses.data} />}
        {row.used_by.some((u) => u.picked_by_ai) ? <p className="text-xs text-text-muted">Picked by AI on {row.used_by.filter((u) => u.picked_by_ai).map((u) => u.label).join(", ")} · Sample until the immigration expert signs it off at release review.</p> : null}
      </section>
      <section className="mt-4 space-y-1 text-sm" aria-labelledby="fd-his"><h3 id="fd-his" className="font-semibold">History</h3>
        {uses.data?.history.length ? <ul className="space-y-1">{uses.data.history.map((h, i) => <li key={i}><span className="text-text-muted">{when(h.at)} · {h.by ?? "The studio"}:</span> {h.what}</li>)}</ul> : <p className="text-text-muted">No changes recorded yet.</p>}
      </section>
      {!canAuthor ? <p className="mt-4 text-xs text-text-muted">Read-only: you do not hold the author duty.</p> : null}
    </Panel>
  );
}

/** C3.12: the field map of a form's current edition, in words, with what it means on hover or focus. */
function FieldMapCell({ fm }: { fm: FieldMapState }) {
  const muted = fm.kind === "not_filled" || fm.kind === "no_edition" || fm.kind === "none";
  return <Tip tip={fm.tip}><span tabIndex={0} data-field-map={fm.kind} className={`rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${muted ? "text-text-muted" : ""}`}>{fm.kind === "complete" ? <Pill tone="ok">{fm.words}</Pill> : fm.kind === "proposed" || fm.kind === "waiting" ? <Pill tone="warn">{fm.words}</Pill> : fm.words}</span></Tip>;
}

/** C11.18: set or correct what IRCC accepts, with the canada.ca line it comes from or a reason; a second person approves. */
function SetAccepts({ row }: { row: Row }) {
  const [open, setOpen] = React.useState(false);
  const [account, setAccount] = React.useState<string>("ANY");
  const has = (a: string) => row.accepts_accounts?.find((x) => x.account === a)?.channels ?? [];
  const [channels, setChannels] = React.useState<string[]>(has("ANY").length ? has("ANY") : ["PDF_UPLOAD"]);
  const toggle = (c: string) => setChannels((xs) => (c === "NOT_NEEDED" ? (xs.includes(c) ? [] : [c]) : xs.includes(c) ? xs.filter((x) => x !== c) : [...xs.filter((x) => x !== "NOT_NEEDED"), c]));
  const [quote, setQuote] = React.useState(""), [reason, setReason] = React.useState("");
  const go = useAsk(() => api(`/library/forms/${encodeURIComponent(row.code)}/accepts`, { method: "POST", json: { account, channels, ...(quote.trim() ? { quote: quote.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) } }), "Sent: it waits for a second person on To review", [["library-forms-list"], ["form-uses", row.code]], () => setOpen(false));
  // the outside check on #145: a form with no usable edition yet cannot take "what IRCC accepts" (the server answers "No edition yet"):
  // the drawer says what comes first instead of offering a step that fails.
  // Break / review (dc93b60f) m21, (e466adb1) m28: a form whose PDF is held says so, without promising an approval (a French
  // file, for one, can never be approved) (before: "Upload … first" beside "1
  // held file waiting for a person").
  if (!row.edition) return <p className="text-text-muted" data-accepts-needs-file>{row.status === "needs_ok" ? "Its PDF is held on To review: what IRCC accepts is set once an edition of it is approved." : "Upload or find its PDF first: what IRCC accepts is set on a form's current edition."}</p>;
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{row.accepts ? "Correct what IRCC accepts" : "Set what IRCC accepts"}</Button>;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Field label="For which IRCC account" hint="Any account, or the one account this applies to."><Select aria-label="For which IRCC account" value={account} onChange={(e) => { setAccount(e.target.value); setChannels(has(e.target.value).length ? has(e.target.value) : ["PDF_UPLOAD"]); }}>{[...IRCC_ACCOUNTS, "ANY"].map((a) => <option key={a} value={a}>{ACCOUNT_WORDS[a as "ANY"]}</option>)}</Select></Field>
      <fieldset className="space-y-1"><legend className="text-xs font-medium">IRCC accepts</legend>{CHANNELS.map((c) => { const off = c === "NOT_NEEDED" && account === "ANY";
        return <label key={c} className={`flex items-center gap-2 text-sm ${off ? "text-text-muted" : ""}`}><input type="checkbox" checked={channels.includes(c)} disabled={off} onChange={() => toggle(c)} />{CHANNEL_WORDS[c]}{off ? " (only for one account: the account that asks it itself)" : ""}</label>; })}</fieldset>
      <Field label="The canada.ca line it comes from" hint="Paste IRCC's own words, e.g. from the form's page or the guide."><Textarea aria-label="The canada.ca line it comes from" rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} /></Field>
      <Field label="Or: why (when there is no line to quote)"><Textarea aria-label="Or: why" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {go.error ? <p className="text-sm text-danger" role="alert">{(go.error as Error).message}</p> : null}
      <div className="flex gap-2"><Button size="sm" onClick={() => go.mutate()} busy={go.isPending}>Send for a second person</Button><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button></div>
      <p className="text-xs text-text-muted">A second person approves it on To review; it stays Sample until the immigration expert confirms.</p>
    </div>
  );
}
