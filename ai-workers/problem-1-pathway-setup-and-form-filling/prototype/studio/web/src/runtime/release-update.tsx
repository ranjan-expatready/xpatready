// C9.5 Adopt a published update on an open case (B145; board screens/B145/design/draft-release-update.html). Under the
// case header, a notice says a newer release of the case's combination is out and that the case stays on its release
// until someone moves it; "What changes for this case" opens a side panel (560 px, sections not tabs) with what the new
// release would change for this client, per person (old → new), and what it would do to the work already done, in the
// groups the server sorted it into; one reason, pre-filled; one button that names the action. "Not now" stores nothing.
// After a move, Prepare application shows what the move did (MovedGroups) until the officer has made each copy again.
// Every word, form and count comes from GET /runtime/cases/:id/release-update; the server decides who may move (P-319).
import * as React from "react";
import { Info, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Field, Notice, Panel, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip, TipProvider } from "@/components/status";
import type { ReleaseChangeLine, ReleaseEffectLine, ReleaseLastMove, ReleaseMoved, ReleaseUpdate } from "../../../contracts/runtime";
import { noRetryOnRefusal } from "./questionnaire";

type Effects = ReleaseUpdate["effects"];
type View = ReleaseUpdate & { last_move: ReleaseLastMove | null };

const RELEASE_TIP = "A release is a frozen set of the combination's forms, documents and questions. A case keeps its release until someone moves it, so nothing changes under your client.";
/** The work groups, in the board's order, with what each counts and its tooltip (concept §5). */
export const GROUPS: { key: keyof Omit<Effects, "unchanged">; title: string; tip: string }[] = [
  { key: "fill_again", title: "To fill again", tip: "This draft was made on the earlier release and its form changed. Press Fill (Generate a new copy) to make it on the new release; the old copy stays in the history." },
  { key: "filed_another_way", title: "Filed another way now", tip: "The new release files this form differently (its channel or how it is signed); the copy you have is kept but is not what you file." },
  { key: "no_longer_required", title: "No longer required", tip: "The new release no longer asks for this form or document. Its copies, scans and uploads are kept and listed, never deleted." },
  { key: "withdrawn", title: "Approval withdrawn", tip: "The representative reviews this filing again, because what it files changed." },
  { key: "kept_out_of_date", title: "Stays as it is, marked out of date", tip: "Signed, validated or filed items are never changed; they are marked out of date with the reason." },
];
const CHANGE_GROUPS: { key: keyof ReleaseUpdate["changes"]; title: string; none: string }[] = [
  { key: "forms", title: "Forms", none: "No form changes for this case." }, { key: "documents", title: "Documents", none: "No document line changes." },
  { key: "questions", title: "Questions", none: "No question changes." }, { key: "eligibility", title: "Eligibility", none: "No eligibility rule changes." },
];
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const LONG = 6;

export function useReleaseUpdate(caseId: string) {
  const actor = useActorId();
  return useApi<View>(["runtime", "view", caseId, "release-update", actor], `/runtime/cases/${caseId}/release-update`, { retry: noRetryOnRefusal });
}

/** The notice under the case header (nothing on the newest release, or while it loads: the header never jumps). */
export function ReleaseNotice({ caseId }: { caseId: string }) {
  const q = useReleaseUpdate(caseId);
  const [open, setOpen] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement>(null);
  const v = q.data;
  // Review m8 (round 1): the notice's place is held while the list is read, so the page does not jump when it appears.
  if (q.isLoading) return <Skeleton className="h-[46px] w-full rounded-lg" aria-hidden data-release-notice-loading />;
  if (!v?.target) return null;
  return (
    <TipProvider>
      <Notice tone="info" className="py-2.5" action={<Button ref={opener} size="sm" variant="secondary" data-release-open onClick={() => setOpen(true)}>What changes for this case</Button>}>
        <p className="text-text" data-release-notice>
          <span className="font-semibold">{v.target.label} of {v.combination} is out</span>{v.target.demo ? <> <Pill tone="warn" title="Sample content released as a Demo release: never a real publish (G3)">Demo release</Pill></> : null} (released {day(v.target.released_at)}). This case stays on {v.current.label} until you move it.{" "}
          <Tip tip={RELEASE_TIP}><button type="button" className="inline-flex translate-y-0.5 rounded-sm text-text-muted outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="What a release is"><Info className="size-3.5" aria-hidden /></button></Tip>
        </p>
      </Notice>
      {open ? <ReleasePanel caseId={caseId} close={() => setOpen(false)} returnFocus={() => opener.current} /> : null}
    </TipProvider>
  );
}

function Rows<T>({ rows, render, name }: { rows: T[]; render: (r: T, i: number) => React.ReactNode; name: string }) {
  const [all, setAll] = React.useState(false);
  const shown = all ? rows : rows.slice(0, LONG);
  return (<>
    <ul className="divide-y divide-border rounded-lg border border-border">{shown.map(render)}</ul>
    {rows.length > LONG ? <button type="button" className="mt-1 text-[13px] font-medium text-text-link hover:underline" onClick={() => setAll(!all)} aria-expanded={all}>{all ? `Show the first ${LONG}` : `Show all ${rows.length} ${name}`}</button> : null}
  </>);
}

function ChangeRow({ l }: { l: ReleaseChangeLine }) {
  return (
    <li className="flex flex-col gap-0.5 px-3 py-2 text-[13px]" data-change-line>
      <div className="flex flex-wrap items-center gap-2"><span className="min-w-0 font-medium [overflow-wrap:anywhere]">{l.what}</span><Pill>{l.kind}</Pill></div>
      {l.who.length ? <p className="text-text-muted">For {l.who.join(", ")}</p> : null}
      <p className="text-text-muted"><span>{l.before}</span> <span aria-hidden>→</span><span className="sr-only">becomes</span> <span className="text-text">{l.after}</span></p>
    </li>
  );
}

function EffectRow({ l, fill }: { l: ReleaseEffectLine; fill?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2 text-[13px]" data-effect-line={l.id}>
      <div className="min-w-0"><p><span className="font-medium">{l.what}</span> · {l.who}</p><p className="text-text-muted">{l.why}</p></div>{fill}
    </li>
  );
}

/** The work groups (before the move in the panel, after it in Prepare): each with its count, what it counts, its tooltip. */
export function EffectGroups({ effects, fill, empty }: { effects: Effects; fill?: (l: ReleaseEffectLine) => React.ReactNode; empty?: boolean }) {
  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const rows = effects[g.key];
        if (!rows.length && !empty) return null;
        return (
          <div key={g.key} data-effect-group={g.key} data-count={rows.length}>
            <h4 className="mb-1 flex items-center gap-2 text-[13px] font-semibold">
              {g.title}
              <Tip focusable tip={g.tip}><span className="inline-flex rounded-md bg-text/8 px-1.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${rows.length} ${rows.length === 1 ? "item" : "items"}`}>{rows.length}</span></Tip>
            </h4>
            {rows.length ? <Rows rows={rows} name="items" render={(l) => <EffectRow key={`${g.key}|${l.id}`} l={l} fill={l.fillable ? fill?.(l) : undefined} />} />
              : <p className="text-[13px] text-text-muted">None on this case.</p>}
          </div>
        );
      })}
      {effects.unchanged.count ? <p className="text-[13px] text-text-muted" data-effect-group="unchanged" data-count={effects.unchanged.count}>No change: {effects.unchanged.words}</p> : null}
    </div>
  );
}

function ReleasePanel({ caseId, close, returnFocus }: { caseId: string; close: () => void; returnFocus: () => HTMLElement | null }) {
  const q = useReleaseUpdate(caseId);
  const qc = useQueryClient(), toast = useToast();
  const v = q.data;
  const [reason, setReason] = React.useState(v?.reason_default ?? "Adopting the current release");
  const [error, setError] = React.useState<string | null>(null);
  const [problem, setProblem] = React.useState<{ kind: "refused" | "conflict"; words: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const refused = v?.refused ? v.refused.reason : problem?.kind === "refused" ? problem.words : null;
  async function move() {
    if (!v?.target) return;
    setBusy(true); setError(null); setProblem(null);
    try {
      const r = await api<ReleaseMoved>(`/runtime/cases/${caseId}/release-update`, { method: "POST", json: { target_version: v.target.version, from_revision: v.current.revision, reason } });
      toast.push({ tone: "ok", text: `${r.words} See them in Prepare application.` });
      await qc.invalidateQueries({ queryKey: ["runtime"] });
      close();
      requestAnimationFrame(() => document.getElementById("release-moved-h")?.focus());
    } catch (e) {
      // Review F1 (round 1): every 409 reads the list again behind the panel (the case, its notice and Prepare); a stale
      // read or a case already moved to the newest release is the conflict state, any other 409 a named refusal.
      const code = e instanceof ApiError ? (e.problem as { code?: string }).code : undefined;
      if (e instanceof ApiError && e.status === 400) setError(e.field("reason") ?? e.message);
      else if (e instanceof ApiError && e.status === 409) {
        setProblem(code === "stale" || code === "newest" || /read the list again/i.test(e.message) ? { kind: "conflict", words: e.message } : { kind: "refused", words: e.message });
        void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      } else setProblem({ kind: "refused", words: (e as Error).message });
    } finally { setBusy(false); }
  }
  const footer = (
    <div className="flex w-full flex-col gap-2">
      <Field label="Reason (kept with the move)" hint="Pre-filled; change it if there is a better reason. 3 to 500 characters." error={error}>
        <Textarea rows={2} value={reason} maxLength={500} disabled={!v?.can_move} onChange={(e) => { setReason(e.target.value); setError(null); }} data-release-reason />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={close} data-release-later>Not now</Button>
        {v?.can_move ? <Button busy={busy} disabled={!v?.target || !!refused || problem?.kind === "conflict"} onClick={() => void move()} data-release-move>Move this case to {v?.target?.label ?? "the new release"}</Button>
          : <p className="text-[13px] text-text-muted">Only case staff move a case.</p>}
      </div>
    </div>
  );
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} returnFocus={returnFocus} title="What changes for this case"
      description={v?.target ? `${v.current.label} → ${v.target.label} of ${v.combination}${v.target.demo ? " (a Demo release)" : ""}. Nothing changes until you move.` : "Reading the releases…"} footer={footer}>
      <div className="space-y-5" data-release-panel>
        {q.isLoading ? <div className="space-y-2" data-release-loading><Skeleton className="h-5 w-1/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          : q.isError ? <Notice tone="danger" title="The list could not be worked out">{(q.error as Error).message}</Notice>
          : !v?.target ? <>
            {problem?.kind === "conflict" ? <Notice tone="warn" title="Nothing was changed" className="mb-3"><span data-release-conflict>This case was moved while you read the list: it is on {v?.current.label} now.</span></Notice> : null}
            <Notice tone="ok" title="This case is on the newest release">Nothing to move to.</Notice></> : <>
          {refused ? <Notice tone="danger" title="Nothing was changed"><span data-release-refused>{refused}</span></Notice> : null}
          {problem?.kind === "conflict" ? <Notice tone="warn" title="Nothing was changed" action={<Button size="sm" variant="secondary" onClick={() => { setProblem(null); void q.refetch(); }} data-release-reread><RefreshCw aria-hidden />Read the list again</Button>}>
            <span data-release-conflict>This case or its release changed while you read the list.</span></Notice> : null}
          <section aria-labelledby="ru-changes" className="space-y-3">
            <h3 id="ru-changes" className="text-sm font-semibold">What changes</h3>
            {CHANGE_GROUPS.map((g) => (
              <div key={g.key} data-change-group={g.key} data-count={v.changes[g.key].length}>
                <h4 className="mb-1 text-[13px] font-semibold">{g.title} <span className="font-normal text-text-muted">· {v.changes[g.key].length} {v.changes[g.key].length === 1 ? "change" : "changes"}</span></h4>
                {v.changes[g.key].length ? <Rows rows={v.changes[g.key]} name={g.title.toLowerCase()} render={(l, i) => <ChangeRow key={`${g.key}|${i}`} l={l} />} />
                  : <p className="text-[13px] text-text-muted">{g.none}</p>}
              </div>
            ))}
            <p className="text-[13px] text-text-muted" data-release-fees><span className="font-semibold text-text">Fees</span> · {v.fees}</p>
          </section>
          <section aria-labelledby="ru-work" className="space-y-2">
            <h3 id="ru-work" className="text-sm font-semibold">What happens to work already done</h3>
            <p className="text-[13px] text-text-muted">Counts are pieces of work (a copy, a signed scan, an entered form, an upload, a review). The move fills nothing: you press Fill on each form to fill again.</p>
            <EffectGroups effects={v.effects} empty />
          </section>
        </>}
      </div>
    </Panel>
  );
}

/** After a move, in Prepare application: what the move did that still waits, in the same groups; Fill on a form to fill
 *  again makes its copy on the new release (the server's generate route, as the forms list below). */
export function MovedGroups({ caseId }: { caseId: string }) {
  const q = useReleaseUpdate(caseId);
  const qc = useQueryClient(), toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const m = q.data?.last_move;
  if (!m || GROUPS.every((g) => !m.effects[g.key].length)) return null;
  async function fill(l: ReleaseEffectLine) {
    const x = l.form && l.subject ? { form: l.form, subject: l.subject } : null;
    if (!x) return;
    setBusy(l.id);
    try {
      await api(`/runtime/cases/${caseId}/forms/${encodeURIComponent(x.form)}/${x.subject}/generate`, { method: "POST", json: { idempotencyKey: crypto.randomUUID() } });
      toast.push({ tone: "info", text: `A new copy of ${x.form} for ${l.who} is being made on ${m!.to.label}.` });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
    } catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    finally { setBusy(null); }
  }
  return (
    <TipProvider>
      <section aria-labelledby="release-moved-h" className="border-b border-border bg-surface px-4 py-3" data-release-moved>
        <h3 id="release-moved-h" tabIndex={-1} className="text-sm font-semibold outline-none">Moved to {m.to.label} on {day(m.at)}</h3>
        <p className="mb-2 text-[13px] text-text-muted">From {m.from.label}{m.reason ? ` · reason: ${m.reason}` : ""}. Nothing finished was changed. A form leaves this list once you make its copy on {m.to.label}; the other lines stay as the record of what the move did.</p>
        <EffectGroups effects={m.effects} fill={(l) => l.form && l.subject ? <Button size="sm" variant="secondary" busy={busy === l.id} onClick={() => void fill(l)} data-release-fill={l.id} aria-label={`Fill ${l.form} for ${l.who} on ${m!.to.label}`}>Fill</Button> : null} />
      </section>
    </TipProvider>
  );
}
