// Shared library › Forms (S4, P-123; walkthrough v2 S4): every IRCC form, guide and checklist stored once, in one list
// with type, used-by and status filters and a search (never groups). One way in: Upload PDF (many files; each runs on
// the shared run card, rules first). Every row: Replace with a new edition, Re-read with AI, See where it is used,
// Retire (kept for released versions), Delete (only when nothing uses it); a person approves retire and delete (P-116).
// Which forms a combination needs and what IRCC accepts are Sample until the immigration expert confirms. Checks below.
import * as React from "react";
import { Link } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FileUp, MoreHorizontal, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api, queryClient, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { RunCard } from "@/components/run-card";
import { AiLaunchDialog } from "@/components/ai-launch";
import { Tip, TipProvider } from "@/components/status";
import { Button, Dialog, Field, Input, Notice, Panel, Pill, Select, Table, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { BlockedLine, ImpactPanel, RowAction, useUndoToast } from "@/components/lifecycle";
import { ACTION_LABEL, RETURNED_LABEL, SAY, TIP, WAITING_LABEL, WHY } from "../../../contracts/lifecycle";
import { Skeleton } from "@/components/ui/skeleton";

type Row = { code: string; title: string; type: "form" | "guide" | "checklist"; edition: string | null; canada_updated: string | null; accepts: string | null; accepts_basis: string | null; accepts_quote: string | null; accepts_waiting: boolean;
  origin: string | null; downloaded_from: string | null; checked_at: string | null; form_page_url: string | null; fingerprint: string | null; attachment_id: string | null;
  used_by: { id: string; label: string; picked_by_ai: boolean; as_source?: boolean }[]; status: "ready" | "needs_ok" | "newer_file" | "no_file" | "retired"; lifecycle_waiting: "DELETE" | "RETIRE" | "RESTORE" | null; lifecycle_approved?: boolean; lifecycle_returned?: boolean; older_editions: { label: string; kept_by: string }[]; action: { kind: "DELETE" | "RETIRE" | "RESTORE" | "WITHDRAW"; why: string | null; change_id: string | null } };
type List = { rows: Row[]; counts: Record<string, number>; combinations: { id: string; label: string }[]; sample_note: string };
export type Uses = { label: string; released: boolean; retired: boolean; uses: { kind: string; label: string; href: string | null; blocks: boolean; why: string }[]; can: { delete: string | null; retire: string | null; restore: string | null }; pending: { id: string; action: string; by: string | null } | null; history: { at: string; by: string | null; what: string }[] };

const TYPE_WORD: Record<Row["type"], string> = { form: "Form", guide: "Guide", checklist: "Checklist" };
const ACCEPTS: Record<string, string> = { PDF: "PDF upload", ONLINE: "Online", PDF_OR_ONLINE: "PDF upload · Online", READ_BY_AI: "Not filed" };
/** Who said what IRCC accepts: AI read it on the IRCC page, or a person set it (a second person approved); Sample until the expert confirms. */
const BASIS: Record<string, { tag: string; tip: string }> = {
  AI_SAMPLE: { tag: "AI · Sample", tip: "AI read this from IRCC's own words on the page. Sample until the immigration expert confirms." },
  PERSON_SAMPLE: { tag: "Set by a person · Sample", tip: "A person set this and a second person approved it. Sample until the immigration expert confirms." },
  SAMPLE_FIXTURE: { tag: "Sample · canada.ca words", tip: "Loaded with the sample from IRCC's own sentence on this form's canada.ca page (no AI call). Sample until the immigration expert confirms." },
  EXPERT: { tag: "Confirmed by the expert", tip: "The immigration expert confirmed this." },
};
/** A guide's date is canada.ca's own "Date modified" when the page prints one; otherwise when the studio read it. */
const editionText = (r: Row) => (r.type === "guide" ? (r.canada_updated ? `Updated on canada.ca ${r.canada_updated}` : r.checked_at ? `Read from canada.ca on ${new Date(r.checked_at).toISOString().slice(0, 10)}` : "Date not known") : r.edition ? r.edition.replace(`${r.code} `, "").replace(/[()]/g, "") : null);
const ACCEPTS_TIP = "What IRCC accepts for this form: a PDF upload, an online form in the portal, or either. Guides and checklists are not filed: AI reads them. AI reads it from IRCC's page, the sample loads it with IRCC's own line from the page, or a person sets it with a second person's OK; Sample until the immigration expert confirms. Online filling needs the browser extension (later wave).";
const STATUS: Record<Row["status"], { word: string; tone: string; tip: string }> = {
  ready: { word: "Ready", tone: "ok", tip: "Its current edition is in the library and may be used by any combination." },
  needs_ok: { word: "Needs your OK", tone: "warn", tip: "A file of this form waits for a second person on To review (a hand upload, or a newer edition to review)." },
  newer_file: { word: "Newer file on canada.ca", tone: "warn", tip: "canada.ca now serves another file of the same printed edition. Combinations keep using the library's file until a person replaces it." },
  no_file: { word: "No file yet", tone: "neutral", tip: "No edition of this form is in the library yet: upload its PDF, or let the form finder download it from canada.ca." },
  retired: { word: "Retired", tone: "neutral", tip: "Hidden from pickers and AI; released versions and open cases keep it. Restore it to use it again." },
};
const ORIGIN: Record<string, string> = { DOWNLOADED: "Downloaded from canada.ca by the form finder", UPLOADED: "Uploaded by a person", SAMPLE: "Official copy loaded with the sample" };

export function FormsPage() {
  const actorId = useActorId();
  const session = useApi<{ actor?: { duties?: string[] } }>(["session", actorId], "/session");
  const canAuthor = (session.data?.actor?.duties ?? []).includes("author");
  const [type, setType] = React.useState(""), [usedBy, setUsedBy] = React.useState(""), [status, setStatus] = React.useState(""), [q, setQ] = React.useState("");
  const qs = new URLSearchParams(Object.entries({ type, usedBy, status, q: q.trim() }).filter(([, v]) => v)).toString();
  const lib = useApi<List>(["library-forms-list", actorId, qs], `/library/forms/list${qs ? `?${qs}` : ""}`, { placeholderData: (p) => p });
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
    if (r) { back.current = document.activeElement as HTMLElement | null; setOpened(r); return; }
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
  const filtered = !!(type || usedBy || status || q.trim());
  return (
    <TipProvider>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm text-text-muted">Shared library › Forms</p><h1 className="text-2xl font-bold tracking-tight">Forms</h1><p className="mt-1 text-sm text-text-muted">Every IRCC form, guide and checklist, stored once. Combinations pick from here by themselves.</p></div>
          {canAuthor ? <UploadButton onRuns={(ids) => setRuns((r) => [...ids, ...r].slice(0, 20))} /> : null}
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
            <Select aria-label="Used by" value={usedBy} onChange={(e) => setUsedBy(e.target.value)} className="w-56"><option value="">Any combination</option>{(lib.data?.combinations ?? []).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>
          </label>
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Status</span>
            {chip(status === "needs_ok", "Needs your OK", c.needs_ok, () => setStatus(status === "needs_ok" ? "" : "needs_ok"), STATUS.needs_ok.tip)}
            {chip(status === "newer_file", "Newer file on canada.ca", c.newer_file, () => setStatus(status === "newer_file" ? "" : "newer_file"), STATUS.newer_file.tip)}
            {chip(status === "retired", "Retired", c.retired, () => setStatus(status === "retired" ? "" : "retired"), STATUS.retired.tip)}
          </div>
          <label className="relative ml-auto"><Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" aria-hidden /><Input type="search" aria-label="Search number or title" placeholder="Search number or title" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} className="w-64 pl-8" /></label>
        </div>
        {lib.isLoading ? <div className="space-y-2" aria-label="Loading forms">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          : lib.isError ? <Notice tone="danger" title="The forms could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void lib.refetch()}>Try again</Button>}>{(lib.error as Error).message}</Notice>
          : !lib.data?.rows.length ? (filtered
            ? <EmptyState title="No form matches" description="Nothing in the library matches these filters. Clear a filter or search for another number or title." action={<Button variant="secondary" onClick={() => { setType(""); setUsedBy(""); setStatus(""); setQ(""); }}>Clear filters</Button>} />
            : <EmptyState title="No forms yet" description="Forms come in by themselves when a combination's setup starts: the form finder reads its IRCC page and downloads each form from canada.ca. You can also upload IRCC PDFs. Every form is stored once and used by any combination." />)
          : (
            <Table label="Table: Number, Title, Type, Edition, IRCC accepts, Used by, Status" headClass={[undefined, undefined, "hidden xl:table-cell", "hidden xl:table-cell"]} head={["Number", "Title", "Type", "Edition", <Tip key="ia" tip={ACCEPTS_TIP}><span tabIndex={0} className="underline decoration-dotted rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">IRCC accepts</span></Tip>, "Used by", "Status", <span key="a" className="sr-only">Actions</span>]}>
              {lib.data.rows.map((r) => (<React.Fragment key={r.code}>
                <tr data-form={r.code} className={r.status === "retired" ? "text-text-muted" : undefined}>
                  <td className="mono whitespace-nowrap"><button type="button" className="rounded text-text-link underline-offset-2 hover:underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={() => setOpen(r)}>{r.code}</button></td>
                  <td className="min-w-32 max-w-56 break-words xl:max-w-80"><span className="line-clamp-2" title={r.title}>{r.title}</span>
                    <span className="mt-0.5 block text-xs text-text-muted xl:hidden">{TYPE_WORD[r.type]} · {editionText(r) ?? "no usable edition yet"}</span></td>
                  <td className="hidden xl:table-cell">{TYPE_WORD[r.type]}</td>
                  <td className="hidden xl:table-cell">{editionText(r) ?? <span className="text-text-muted">no usable edition yet</span>}</td>
                  <td className="max-w-36 xl:max-w-none"><AcceptsCell r={r} /></td>
                  <td className="max-w-48 xl:max-w-72">{r.used_by.length === 0 ? <span className="text-text-muted">Not used</span> : r.used_by.length === 1 ? <TrailText label={r.used_by[0].label} /> : <Tip tip={r.used_by.map((u) => u.label).join(", ")}><span tabIndex={0} className="underline decoration-dotted rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">{r.used_by.length} combinations</span></Tip>}</td>
                  <td><span className="inline-flex flex-wrap gap-1"><Tip tip={STATUS[r.status].tip}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone={STATUS[r.status].tone}>{STATUS[r.status].word}</Pill></span></Tip>{r.lifecycle_waiting && r.lifecycle_returned ? <Tip tip={TIP.returned}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="danger">{RETURNED_LABEL[r.lifecycle_waiting]}</Pill></span></Tip> : r.lifecycle_waiting ? <Tip tip={r.lifecycle_approved ? `Approved: the form is ${r.lifecycle_waiting === "RESTORE" ? "restored" : "retired"} with the next release (Release, on the combination's Review page).` : `A request to ${r.lifecycle_waiting.toLowerCase()} this form waits for a second person on To review.`}><span tabIndex={0} className="rounded outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="warn">{r.lifecycle_approved ? `${ACTION_LABEL[r.lifecycle_waiting]} approved` : WAITING_LABEL[r.lifecycle_waiting]}</Pill></span></Tip> : null}</span></td>
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
                {canAuthor && r.action.why ? <tr data-reason-for={r.code}><td colSpan={8} className="pt-0 text-right"><BlockedLine id={`why-${r.code.replace(/\W+/g, "-")}`} text={r.action.why} onWhere={() => setOpen(r)} className="ml-auto max-w-[40rem]" /></td></tr> : null}
              </React.Fragment>
              ))}
            </Table>
          )}
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

/** A combination's trail, its last part first (what tells them apart), the rest muted: "With an LMIA · Work permit › Employer-specific". */
function TrailText({ label }: { label: string }) {
  const parts = label.split(" › "), last = parts.pop();
  return <span className="line-clamp-2" title={label}>{last}{parts.length ? <span className="text-text-muted"> · {parts.join(" › ")}</span> : null}</span>;
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

/** One way in: Upload PDF, many files at once; each file runs on its own card (rules first, AI only when they cannot). */
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
            <DropdownMenu.Item className={item} disabled={!canAuthor || !row.attachment_id || row.type !== "form"} onSelect={() => setReread(true)}>Re-read with AI (fields and boxes)</DropdownMenu.Item>
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
        <p>{row.type === "guide" ? "Read from its canada.ca page" : row.origin ? ORIGIN[row.origin] ?? row.origin : "Where it came from is not recorded"}{row.downloaded_from && row.type !== "guide" ? <> · <a className="text-text-link underline" href={row.downloaded_from} target="_blank" rel="noreferrer">PDF link</a></> : null}</p>
        {row.form_page_url ? <p><a className="text-text-link underline" href={row.form_page_url} target="_blank" rel="noreferrer">{/\.pdf$/i.test(row.form_page_url) ? "Its file on IRCC's site (no form page)" : "Its page on canada.ca"}</a>{/\.pdf$/i.test(row.form_page_url) ? null : <> · checked {when(row.checked_at)}</>}</p> : <p className="text-text-muted">No canada.ca page recorded yet.</p>}
        {row.older_editions.map((e) => <p key={e.label} className="text-text-muted" data-kept-by><span className="font-medium text-text">Earlier edition {e.label.replace(`${row.code} `, "")}</span> · {e.kept_by}</p>)}
        <details><summary className="cursor-pointer text-text-muted">Details</summary><p className="mono break-all text-xs">File fingerprint (SHA-256): {row.fingerprint ?? "none"}</p></details>
      </section>
      <section className="mt-4 space-y-2 text-sm" aria-labelledby="fd-acc"><h3 id="fd-acc" className="font-semibold">What IRCC accepts</h3>
        <AcceptsCell r={row} />
        {row.accepts_quote ? <p className="text-text-muted">{row.accepts_basis === "PERSON_SAMPLE" ? "" : "IRCC's words: "}“{row.accepts_quote}”</p> : null}
        {row.type === "form" && canAuthor && !row.accepts_waiting && row.status !== "retired" ? <SetAccepts row={row} /> : null}
      </section>
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

/** C11.18: set or correct what IRCC accepts, with the canada.ca line it comes from or a reason; a second person approves. */
function SetAccepts({ row }: { row: Row }) {
  const [open, setOpen] = React.useState(false);
  const [channels, setChannels] = React.useState(row.accepts && row.accepts !== "READ_BY_AI" ? row.accepts : "PDF");
  const [quote, setQuote] = React.useState(""), [reason, setReason] = React.useState("");
  const go = useAsk(() => api(`/library/forms/${encodeURIComponent(row.code)}/accepts`, { method: "POST", json: { channels, ...(quote.trim() ? { quote: quote.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}) } }), "Sent: it waits for a second person on To review", [["library-forms-list"], ["form-uses", row.code]], () => setOpen(false));
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{row.accepts ? "Correct what IRCC accepts" : "Set what IRCC accepts"}</Button>;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <Field label="IRCC accepts"><Select aria-label="IRCC accepts" value={channels} onChange={(e) => setChannels(e.target.value)}><option value="PDF">PDF upload</option><option value="ONLINE">Online</option><option value="PDF_OR_ONLINE">PDF upload · Online</option></Select></Field>
      <Field label="The canada.ca line it comes from" hint="Paste IRCC's own words, e.g. from the form's page or the guide."><Textarea aria-label="The canada.ca line it comes from" rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} /></Field>
      <Field label="Or: why (when there is no line to quote)"><Textarea aria-label="Or: why" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {go.error ? <p className="text-sm text-danger" role="alert">{(go.error as Error).message}</p> : null}
      <div className="flex gap-2"><Button size="sm" onClick={() => go.mutate()} busy={go.isPending}>Send for a second person</Button><Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button></div>
      <p className="text-xs text-text-muted">A second person approves it on To review; it stays Sample until the immigration expert confirms.</p>
    </div>
  );
}

export function ChecksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-bold tracking-tight">Checks</h1><p className="mt-1 text-sm text-text-muted">Field validation, consistency checks, document validity and AI review objectives.</p></div>
      <EmptyState title="Checks are set up on a later screen" description="This list is built with the shared-library screen (Screen 04). Combination rules and checks imported from the reviewed release are visible in each combination's full configuration." action={<Link className="text-sm text-text-link underline" to="/">Back to Immigration programs</Link>} />
    </div>
  );
}
