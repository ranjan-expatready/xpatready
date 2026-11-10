// C8.3 The representative's review page (screens lane, B144; concept screens/B144/concept.md r2 §4, §5; P-406, P-412,
// P-155 (1)): /cases/:id/representative-review/:round, EXPERIENCE §3 "Change set". Left: each filing of the round with its
// own status, its forms (each with its state: To check · Checked · Changed since review · Approved · Approval withdrawn ·
// Not stamped: waits) and its checklist. Right: the selected form's facts as they read now, with before → after for what
// changed and who typed it. Footer: Send back (reasons) · Approve, or, after a later fact change, "Re-approve N changed
// forms" in one click (P-412 F1). Only the representative of record decides (P-412 F2): everyone else reads. The page
// keeps the facts hashes it loaded and sends them; a change meanwhile is a 409 with Reload, nothing stamped (M4). The
// server works everything out (api/src/review-rounds.ts); nothing is decided here. Legal points: Unconfirmed: no counsel.
import * as React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FormStamp, ReviewRound, ReviewRoundFiling } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";
import { FoldOut } from "@/components/fold-out";

const TONE: Record<FormStamp["state"], string> = { to_check: "neutral", checked: "info", changed_since_review: "warn", approved: "ok", approval_withdrawn: "warn", sent_back: "danger", not_stamped_waits: "neutral" };
const ROW_TONE: Record<ReviewRoundFiling["status"], string> = { sent: "neutral", under_review: "info", approved: "ok", sent_back: "danger" };
const STATE_TIPS: Record<FormStamp["state"], string> = {
  to_check: "Not checked yet in this round.", checked: "You marked this form checked in this round.",
  changed_since_review: "Its facts differ from the round before (or changed after this round was sent): check it again.",
  approved: "Approved, and nothing it reads has changed since.", approval_withdrawn: "Approved earlier; a fact on it changed since, so the representative checks it again.",
  sent_back: "Sent back to the case officer in this round.", not_stamped_waits: "Not stamped: waits for an answer that decides whether it applies.",
};
/** Dates in Toronto, the database's zone, as the server's words ("8 Nov") read them. */
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });
const value = (v: unknown): string => v === null || v === undefined || v === "" ? "no answer" : typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "object" ? Object.values(v as Record<string, unknown>).filter((x) => x !== null && x !== "").join(" ") : String(v);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());

/** A status chip with its tooltip, reached by keyboard too (BIC-14). */
function Chip({ tone, words, tip, data }: { tone: string; words: string; tip: string; data?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary" data-state-chip={data}><Pill tone={tone}>{words}</Pill></span></TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** /cases/:id/representative-review: the newest round, or the empty state that teaches "Send for review". */
export function RepresentativeReviewLatest() {
  const { id } = useParams(), nav = useNavigate();
  const list = useApi<{ rounds: { id: string }[] }>(["runtime", "reviews", id], `/runtime/cases/${id}/reviews`, { retry: noRetryOnRefusal });
  React.useEffect(() => { const r = list.data?.rounds[0]; if (r) nav(`/cases/${id}/representative-review/${r.id}`, { replace: true }); }, [list.data, id, nav]);
  if (list.isLoading || list.data?.rounds.length) return <div className="mx-auto max-w-6xl space-y-3"><Skeleton className="h-8 w-80" /><Skeleton className="h-64 w-full" /><span className="sr-only" role="status">Loading the review…</span></div>;
  return (
    <div className="mx-auto max-w-6xl space-y-4" data-review-empty>
      <Link to={`/cases/${id}`} className="inline-flex items-center gap-1 text-sm text-text-link hover:underline"><ArrowLeft className="size-4" aria-hidden />Back to the case</Link>
      <h1 className="text-2xl font-semibold">Representative's review</h1>
      {list.isError ? <Notice tone="danger" title="The review could not be loaded">{(list.error as Error).message}</Notice>
        : <Notice title="Nothing is sent for review yet">When the filings are prepared, the case officer presses <strong>Send for review</strong> at the head of Ready to file on the case page. The representative of record then checks each form here and approves it or sends it back with reasons.</Notice>}
    </div>
  );
}

export function RepresentativeReviewPage() {
  const { id, round } = useParams(), actor = useActorId(), qc = useQueryClient(), toast = useToast(), nav = useNavigate();
  const key = ["runtime", "review", round];
  const q = useApi<ReviewRound>(key, `/runtime/reviews/${round}`, { retry: noRetryOnRefusal });
  const v = q.data;
  // Review m7: "Open the review" on a filing names it (?filing=), so its own row is selected.
  const [search] = useSearchParams();
  const [filing, setFiling] = React.useState<string | null>(search.get("filing")), [item, setItem] = React.useState<string | null>(null);
  // M4: the facts hashes the page loaded, kept until the person presses Reload (never the live values of a refetch).
  const [loaded, setLoaded] = React.useState<Record<string, Record<string, string>> | null>(null);
  const [conflict, setConflict] = React.useState<string | null>(null);
  const [onlyChanged, setOnlyChanged] = React.useState(true);
  const [dialog, setDialog] = React.useState<"approve" | "back" | "reapprove" | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  // Break m5: closing a dialog (Escape, Cancel, Go back) gives the focus back to the button that opened it.
  const approveBtn = React.useRef<HTMLButtonElement>(null), backBtn = React.useRef<HTMLButtonElement>(null), reBtn = React.useRef<HTMLButtonElement>(null);
  const closeDialog = () => { const was = dialog; setDialog(null); setTimeout(() => focusLater(() => (was === "back" ? backBtn : was === "reapprove" ? reBtn : approveBtn).current), 0); };
  const capture = (r: ReviewRound) => setLoaded(Object.fromEntries(r.filings.map((f) => [f.filing, Object.fromEntries(f.forms.map((x) => [x.item, x.live_hash ?? "waits"]))])));
  React.useEffect(() => { if (v && !loaded) capture(v); }, [v, loaded]);
  React.useEffect(() => { setLoaded(null); setFiling(search.get("filing")); setItem(null); setConflict(null); }, [round, actor]); // eslint-disable-line react-hooks/exhaustive-deps
  const row = v?.filings.find((f) => f.filing === filing) ?? v?.filings[0] ?? null;
  const form = row?.forms.find((x) => x.item === item) ?? row?.forms.find((x) => x.state === "changed_since_review" || x.state === "approval_withdrawn") ?? row?.forms[0] ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  // The notice stays until the new facts and their hashes are in, so nothing is approved on the old ones meanwhile.
  const reload = async () => { const r = await q.refetch(); if (r.data) capture(r.data); setConflict(null); focusLater(() => heading.current); };
  // BR-3: the representative of record opens a filing by POST (the GET never does), once, when they look at it.
  const opening = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!v?.can_decide || !row || row.status !== "sent" || opening.current.has(`${v.id}|${row.filing}`)) return;
    opening.current.add(`${v.id}|${row.filing}`);
    void api(`/runtime/reviews/${v.id}/open`, { method: "POST", json: { filing: row.filing } }).then(() => refresh()).catch(() => undefined);
  }, [v?.id, v?.can_decide, row?.filing, row?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  const refused = (e: unknown) => { const a = e instanceof ApiError ? e : null; if (a?.status === 409 || a?.status === 403) { setConflict(a.message); setDialog(null); focusLater(() => heading.current); return true; } return false; };
  // Break M2: a box ticks the item of the filing it sits under, never the selected one.
  async function tick(filingId: string, k: string, ticked: boolean) {
    if (!v) return;
    try { await api(`/runtime/reviews/${v.id}/checks`, { method: "POST", json: { filing: filingId, item: k, ticked } }); await refresh(); }
    catch (e) { if (!refused(e)) toast.push({ tone: "danger", text: (e as Error).message }); }
  }
  /** P-412 one click; review M1: on a solo firm (or when the server asks for it) the self-review statement first. */
  async function reapprove(self?: boolean): Promise<string | null> {
    if (!v || !row) return null;
    try {
      const r = await api<{ words: string; round: { id: string } }>(`/runtime/reviews/${v.id}/reapprove`, { method: "POST", json: { filing: row.filing, form_hashes: loaded?.[row.filing] ?? {}, ...(self ? { self: true } : {}) } });
      toast.push({ tone: "ok", text: `Re-approved: ${r.words}` });
      setDialog(null);
      await qc.invalidateQueries({ queryKey: ["runtime"] });
      nav(`/cases/${id}/representative-review/${r.round.id}?filing=${row.filing}`);
      return null;
    } catch (e) {
      const a = e instanceof ApiError ? e : null;
      if (a?.field("self")) { setDialog("reapprove"); return a.field("self"); }
      if (!refused(e)) toast.push({ tone: "danger", text: (e as Error).message });
      return null;
    }
  }

  if (q.isLoading) return <div className="mx-auto max-w-6xl space-y-3" data-review-loading><Skeleton className="h-8 w-80" /><div className="grid gap-4 lg:grid-cols-[340px_1fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div><span className="sr-only" role="status">Loading the review…</span></div>;
  if (q.isError || !v) return <div className="mx-auto max-w-6xl space-y-3"><Link to={`/cases/${id}`} className="inline-flex items-center gap-1 text-sm text-text-link hover:underline"><ArrowLeft className="size-4" aria-hidden />Back to the case</Link><Notice tone="danger" title="This review could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error | undefined)?.message ?? "Not found."}</Notice></div>;
  const decidable = !!row && v.can_decide && row.status === "under_review";
  const reapprovable = !!row && v.can_decide && row.reapprovable;
  const changedForms = row?.forms.filter((x) => x.state === "approval_withdrawn") ?? [];
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-6xl space-y-4" data-review-page data-round={v.number}>
        <Link to={`/cases/${id}`} className="inline-flex items-center gap-1 text-sm text-text-link hover:underline"><ArrowLeft className="size-4" aria-hidden />Back to the case</Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">Representative's review · Round {v.number}</h1>
            <p className="text-sm text-text-muted">The representative of record checks each form and approves it or sends it back. {v.kind === "reapprove" ? "Re-approved after a change" : v.kind === "one_step" ? "Reviewed in one step from Ready to file" : `Sent by ${v.sent.name}`}, {when(v.sent.at)} · Representative of record: {v.representative.name ?? "none set"}.</p>
          </div>
          <label className="flex items-center gap-2 text-[13px]"><span className="text-text-muted">Round</span>
            <Select value={v.id} onChange={(e) => nav(`/cases/${id}/representative-review/${e.target.value}`)} aria-label="Choose a round" className="h-8 w-auto">
              {v.rounds.map((r) => <option key={r.id} value={r.id}>Round {r.number} · {new Date(r.at).toLocaleDateString("en-CA", { day: "numeric", month: "short", timeZone: "America/Toronto" })}</option>)}
            </Select>
          </label>
        </div>
        {!v.can_decide ? <Notice title="You can read this review" className="[overflow-wrap:anywhere]"><span data-read-only>{v.read_only_words}</span></Notice> : null}
        {conflict ? <div data-conflict><Notice tone="danger" title="Nothing was recorded" action={<Button size="sm" variant="secondary" onClick={() => void reload()}><RotateCcw aria-hidden />Reload</Button>}>{conflict}</Notice></div> : null}
        <div className="grid overflow-hidden rounded-xl border border-border bg-surface-raised lg:grid-cols-[340px_1fr]">
          <nav aria-label="Filings and forms in this round" className="border-b border-border lg:border-b-0 lg:border-r">
            {v.filings.map((f) => (
              <section key={f.filing} aria-labelledby={`rf-${f.filing}`} className="border-b border-border last:border-b-0" data-review-filing={f.filing} data-status={f.status}>
                <button type="button" id={`rf-${f.filing}`} onClick={() => { setFiling(f.filing); setItem(null); }} aria-current={row?.filing === f.filing ? "true" : undefined}
                  className={cn("flex w-full flex-wrap items-center gap-2 bg-surface px-3.5 py-2.5 text-left text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary", row?.filing === f.filing && "shadow-[inset_3px_0_0_var(--color-primary)]")}>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{f.label} · Round {f.filing_round}</span>
                  <Pill tone={ROW_TONE[f.status]} title={f.opened ? `Opened by ${f.opened.name}, ${when(f.opened.at)}` : "Not opened yet"}>{f.status_words}</Pill>
                </button>
                <ul className="divide-y divide-border">
                  {f.forms.map((x) => {
                    const mark = f.checks.find((k) => k.key === `form:${x.item}`);
                    return (
                      <li key={x.item} className={cn("flex items-center gap-2 px-3.5 py-2", row?.filing === f.filing && form?.item === x.item && "bg-primary/5 shadow-[inset_3px_0_0_var(--color-primary)]")} data-review-form={x.form} data-state={x.state}>
                        <button type="button" onClick={() => { setFiling(f.filing); setItem(x.item); }} className="min-w-0 flex-1 text-left text-[13px] outline-none focus-visible:underline [overflow-wrap:anywhere]" aria-label={`${x.form} · ${x.person}, ${x.state_words}`}>
                          {x.form} <span className="text-text-muted">· {x.person}</span>
                        </button>
                        <Chip tone={TONE[x.state]} words={x.state === "approved" ? "Approved" : x.state_words} tip={x.tooltip ?? STATE_TIPS[x.state]} data={x.state} />
                        {mark && v.can_decide && f.status === "under_review" ? (
                          <input type="checkbox" className="size-4" checked={!!mark.ticked} onChange={(e) => void tick(f.filing, mark.key, e.target.checked)} aria-label={`${x.form} for ${x.person} checked`} data-form-mark={x.form} />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-1 px-3.5 pb-3 pt-2" data-checklist>
                  <h3 className="text-[12px] font-semibold text-text-muted">Checklist · {f.label}</h3>
                  <ul>
                    {f.checks.filter((k) => k.source !== "form").map((k) => (
                      <li key={k.key} className="flex min-h-7 items-start gap-2 py-1 text-[13px]" data-check={k.key}>
                        <input type="checkbox" id={`ck-${f.filing}-${k.key}`} className="mt-0.5 size-4" checked={!!k.ticked} disabled={!v.can_decide || f.status !== "under_review"} onChange={(e) => void tick(f.filing, k.key, e.target.checked)} />
                        <label htmlFor={`ck-${f.filing}-${k.key}`} className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          {k.wording}
                          {k.key === "default:no_critical" && k.live_now ? <span className="text-text-muted"> (live: {String((k.live_now as { open: number }).open)})</span> : null}
                          {k.key === "default:documents" && k.live ? <span className="text-text-muted"> (when sent: {String((k.live as { verified: number }).verified)} of {String((k.live as { required: number }).required)})</span> : null}
                          {k.source === "program" ? <span className="text-text-muted"> · Sample</span> : null}
                          {k.ticked ? <span className="block text-[12px] text-text-muted">Ticked by {k.ticked.name}, {when(k.ticked.at)}</span> : null}
                        </label>
                      </li>
                    ))}
                  </ul>
                  {f.decided?.reasons?.length ? <div className="pt-1 text-[13px]" data-reasons><span className="font-semibold">Sent back: </span>{f.decided.reasons.map((r, i) => <span key={i} className="block [overflow-wrap:anywhere]">“{r.text}”</span>)}</div> : null}
                  {f.history.length > 1 ? <p className="pt-1 text-[12px] text-text-muted" data-history>Rounds of this filing: {f.history.map((h) => `${h.filing_round} ${h.status.replace("_", " ")}`).join(" · ")}</p> : null}
                </div>
              </section>
            ))}
          </nav>
          <section aria-labelledby="form-h" className="min-w-0 px-4 py-3.5 md:px-5" data-review-detail>
            {form && row ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="form-h" className="text-base font-semibold [overflow-wrap:anywhere]">{form.form} · {form.person}</h2>
                  <Chip tone={TONE[form.state]} words={form.state_words} tip={form.tooltip ?? STATE_TIPS[form.state]} data={form.state} />
                </div>
                {form.withdrawn_words ? <p className="text-[13px] text-text-warn" data-withdrawn>{form.withdrawn_words}</p> : null}
                <p className="text-[13px] text-text-muted">{form.waits ? "Not stamped: waits for an answer." : form.file.words}{form.channel === "ONLINE" ? " · Filed online" : ""}.
                  {form.file.sha256 ? <FoldOut className="inline" summaryClassName="ml-1 inline text-text-link" summary="Details"><span className="block break-all text-[12px]">File fingerprint: {form.file.sha256}</span></FoldOut> : null}</p>
                {form.changes.length ? (
                  <div data-changes>
                    <h3 className="text-[13px] font-semibold">{form.state === "approval_withdrawn" ? "Changed since it was approved" : "Changed since the round before"} · {plural(form.changes.length, "fact")}</h3>
                    <table className="mt-1 w-full text-[13px]"><thead><tr className="text-left text-[12px] text-text-muted"><th className="py-1 pr-2 font-medium">Fact</th><th className="py-1 pr-2 font-medium">Before → after</th><th className="py-1 font-medium">Typed by</th></tr></thead>
                      <tbody>{form.changes.map((x, i) => (
                        <tr key={i} className="border-t border-border align-top"><td className="py-1.5 pr-2 [overflow-wrap:anywhere]">{x.label} <span className="text-text-muted">· {x.person}</span></td>
                          <td className="py-1.5 pr-2 [overflow-wrap:anywhere]"><del className="text-text-danger">{x.was_words ?? value(x.was)}</del> → <ins className="font-semibold text-text-ok no-underline">{x.now_words ?? value(x.now)}</ins></td>
                          <td className="py-1.5 [overflow-wrap:anywhere]">{x.typed_by_name ?? "the firm record"}{x.typed_at ? `, ${new Date(x.typed_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", timeZone: "America/Toronto" })}` : ""}</td></tr>
                      ))}</tbody></table>
                  </div>
                ) : null}
                <div data-facts>
                  <div className="flex flex-wrap items-center gap-3"><h3 className="text-[13px] font-semibold">Facts on this form · {plural(form.facts.length, "fact")}</h3>
                    {form.changes.length ? <label className="flex items-center gap-1.5 text-[12px]"><input type="checkbox" className="size-4" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />Only changed facts</label> : null}</div>
                  {form.waits ? <p className="text-[13px] text-text-muted">This form waits for an answer that decides whether it applies; it is checked once it can start.</p>
                    : (form.changes.length && onlyChanged) ? <p className="text-[13px] text-text-muted">Showing only what changed (above). Untick "Only changed facts" to see every fact.</p>
                    : <table className="mt-1 w-full text-[13px]"><thead><tr className="text-left text-[12px] text-text-muted"><th className="py-1 pr-2 font-medium">Fact</th><th className="py-1 pr-2 font-medium">Value</th><th className="py-1 font-medium">Source</th></tr></thead>
                      <tbody>{form.facts.map((x, i) => (
                        <tr key={i} className="border-t border-border align-top"><td className="py-1.5 pr-2 [overflow-wrap:anywhere]">{x.label} <span className="text-text-muted">· {x.person}</span></td><td className="py-1.5 pr-2 [overflow-wrap:anywhere]">{x.value_words ?? value(x.value)}</td>
                          <td className="py-1.5 text-text-muted [overflow-wrap:anywhere]">{x.typed_by_name ? `Typed by ${x.typed_by_name}` : ""}{x.confirmed_by_name ? ` · confirmed by ${x.confirmed_by_name}` : ""}</td></tr>
                      ))}</tbody></table>}
                </div>
              </div>
            ) : <p className="text-sm text-text-muted">Choose a form on the left.</p>}
          </section>
        </div>
        {row && (decidable || reapprovable) && !conflict ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5" data-review-footer>
            {reapprovable ? (
              <>
                <p className="min-w-0 flex-1 text-[13px]" data-change-only>{row.label}: {plural(changedForms.length, "form")} changed since it was approved ({changedForms.map((x) => x.form).join(", ")}). Only {changedForms.length === 1 ? "that form is" : "those forms are"} checked again{changedForms.length < row.forms.filter((x) => !x.waits).length ? "; the other forms keep their approval" : ""}.</p>
                <Button ref={reBtn} onClick={() => (v.solo ? setDialog("reapprove") : void reapprove())} data-reapprove><Check aria-hidden />Re-approve {plural(changedForms.length, "changed form")}</Button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 text-[13px] text-text-muted" data-counts>{row.label}: {plural(row.unticked, "checklist item")} not ticked · {plural(row.changed, "form")} changed since review{row.open_critical.length ? ` · ${plural(row.open_critical.length, "open critical warning")} (passed with a reason on Ready to file)` : ""}</p>
                <Button ref={backBtn} variant="secondary" onClick={() => setDialog("back")} data-send-back>Send back…</Button>
                <Button ref={approveBtn} onClick={() => setDialog("approve")} data-approve><Check aria-hidden />Approve</Button>
              </>
            )}
          </div>
        ) : null}
        {row && dialog === "approve" ? <ApproveDialog v={v} row={row} hashes={loaded?.[row.filing] ?? {}} close={closeDialog} onRefused={refused} onDone={async (words) => { toast.push({ tone: "ok", text: words }); setDialog(null); await qc.invalidateQueries({ queryKey: ["runtime"] }); focusLater(() => heading.current); }} /> : null}
        {row && dialog === "back" ? <SendBackDialog v={v} row={row} hashes={loaded?.[row.filing] ?? {}} close={closeDialog} onRefused={refused} onDone={async () => { toast.push({ tone: "ok", text: `${row.label}: sent back to the case officer.` }); setDialog(null); await qc.invalidateQueries({ queryKey: ["runtime"] }); focusLater(() => heading.current); }} /> : null}
        {row && dialog === "reapprove" ? <ReapproveDialog row={row} count={changedForms.length} close={closeDialog} send={reapprove} /> : null}
      </div>
    </TooltipProvider>
  );
}

/** BR-4: the unticked items need one confirmation; a solo firm (or a filing the representative prepared) needs the
 *  self-review statement, as P-155 (1). */
function ApproveDialog({ v, row, hashes, close, onRefused, onDone }: { v: ReviewRound; row: ReviewRoundFiling; hashes: Record<string, string>; close: () => void; onRefused: (e: unknown) => boolean; onDone: (words: string) => Promise<void> }) {
  const unticked = row.checks.filter((k) => k.source !== "form" && !k.ticked);
  const [self, setSelf] = React.useState<boolean | null>(v.solo ? false : null), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ words: string }>(`/runtime/reviews/${v.id}/decision`, { method: "POST", json: { filing: row.filing, verdict: "approve", form_hashes: hashes, confirm_unticked: true, ...(self ? { self: true } : {}) } });
      await onDone(r.words);
    } catch (e) {
      const a = e instanceof ApiError ? e : null;
      if (a?.field("self")) { setSelf(false); setErr(a.field("self")); }
      else if (!onRefused(e)) setErr((e as Error).message);
    } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={unticked.length ? `Approve with ${plural(unticked.length, "item")} not ticked?` : `Approve ${row.label}?`}
      footer={<><Button variant="ghost" onClick={close}>Go back</Button><Button busy={busy} onClick={() => void go()} data-confirm-approve><Check aria-hidden />Approve</Button></>}>
      <div className="space-y-2 text-[13px]" data-approve-dialog>
        {unticked.length ? <><p>{unticked.length === 1 ? `"${unticked[0].wording}" is not ticked.` : `${unticked.length} checklist items are not ticked. Approve anyway? This is recorded.`}</p>
          {unticked.length > 1 ? <ul className="list-disc pl-5">{unticked.map((k) => <li key={k.key}>{k.wording}</li>)}</ul> : <p>This is recorded.</p>}</> : null}
        <p>Each form is stamped with the facts it read and its file. A form with no file for these facts yet (a barcode form not read back) is stamped with the validated copy read back next. A later change to a fact withdraws only the forms that read it.</p>
        {row.open_critical.length ? <Notice tone="warn" title={`${plural(row.open_critical.length, "open critical warning")}`}>They stay on Ready to file, passed there with a reason or fixed.</Notice> : null}
        {self !== null ? <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4" checked={self} onChange={(e) => setSelf(e.target.checked)} aria-invalid={err && self === false ? true : undefined} /><span>I prepared and reviewed this filing myself (logged as Self-reviewed).</span></label> : null}
        {err ? <p role="alert" className="text-text-danger">{err}</p> : null}
      </div>
    </Dialog>
  );
}

/** BR-5: at least one reason, optionally pinned to a form or a checklist item. */
function SendBackDialog({ v, row, hashes, close, onRefused, onDone }: { v: ReviewRound; row: ReviewRoundFiling; hashes: Record<string, string>; close: () => void; onRefused: (e: unknown) => boolean; onDone: () => Promise<void> }) {
  const [text, setText] = React.useState(""), [item, setItem] = React.useState(""), [check, setCheck] = React.useState(""), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  async function go() {
    setBusy(true); setErr(null);
    try { await api(`/runtime/reviews/${v.id}/decision`, { method: "POST", json: { filing: row.filing, verdict: "send_back", form_hashes: hashes, reasons: [{ text, ...(item ? { item } : {}), ...(check ? { check } : {}) }] } }); await onDone(); }
    catch (e) { const a = e instanceof ApiError ? e : null; if (a?.field("reasons")) setErr(a.field("reasons")); else if (!onRefused(e)) setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Send back ${row.label}`} guard
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => void go()} data-confirm-send-back>Send back</Button></>}>
      <div className="space-y-3" data-send-back-dialog>
        <Field label="What should change, and on which form?" error={err} hint="The case officer sees this on the filing. Up to 500 characters.">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="What should change, and on which form?" className="min-h-20" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pin to a form (optional)"><Select value={item} onChange={(e) => setItem(e.target.value)}><option value="">No form</option>{row.forms.map((x) => <option key={x.item} value={x.item}>{x.form} · {x.person}</option>)}</Select></Field>
          <Field label="Pin to a checklist item (optional)"><Select value={check} onChange={(e) => setCheck(e.target.value)}><option value="">No item</option>{row.checks.filter((k) => k.source !== "form").map((k) => <option key={k.key} value={k.key}>{k.wording}</option>)}</Select></Field>
        </div>
      </div>
    </Dialog>
  );
}

/** Review M1 (P-155 (1)): a solo firm's re-approve, and any the server says needs it, asks the self-review statement. */
function ReapproveDialog({ row, count, close, send }: { row: ReviewRoundFiling; count: number; close: () => void; send: (self?: boolean) => Promise<string | null> }) {
  const [self, setSelf] = React.useState(false), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  async function go() { setBusy(true); setErr(null); const e = await send(self); if (e) setErr(e); setBusy(false); }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Re-approve ${plural(count, "changed form")}?`}
      footer={<><Button variant="ghost" onClick={close}>Go back</Button><Button busy={busy} onClick={() => void go()} data-confirm-reapprove><Check aria-hidden />Re-approve</Button></>}>
      <div className="space-y-2 text-[13px]" data-reapprove-dialog>
        <p>{row.label}: only the {count === 1 ? "form" : "forms"} a change touched {count === 1 ? "is" : "are"} stamped again with today's facts.</p>
        <label className="flex items-start gap-2"><input type="checkbox" className="mt-0.5 size-4" checked={self} onChange={(e) => setSelf(e.target.checked)} aria-invalid={err ? true : undefined} data-self /><span>I prepared and reviewed this filing myself (logged as Self-reviewed).</span></label>
        {err ? <p role="alert" className="text-text-danger">{err}</p> : null}
      </div>
    </Dialog>
  );
}
