// C7.6 Ready to file, by screens (runtime lane, M3 sprint row B2; prepare-tab concept r2 BR-8, BR-11; L-SA3 under
// P-315, P-237, P-238; P-155; QA-229): one panel per case, one block per filing, showing the server's readiness from
// GET /runtime/cases/:id/prepare and never working it out here. Lines are grouped by who owes them, in the server's own
// words, never a percentage. A warning is passed with a written reason (who and when are recorded by the server and
// shown); a block cannot be passed, only fixed. "Review the filing" is the representative of record's own (P-155): a
// case officer does not see it. "Ready to file" asks the server, which refuses (409) while anything stands and names
// the same lines. Types live here only (concept §2: never in studio/contracts/). Legal points: Unconfirmed: no counsel.
// C7.10 (B143, P-406 (2)): each filing's readiness figure sits above its lines (readiness-figure.tsx, from /prepare's
// `figures[]`, beside `readiness[]`); the lines themselves still carry no percentage.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Check, Send } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";
import { FigureRow, type Figure } from "./readiness-figure";
import { FoldOut } from "@/components/fold-out";
import { HandOff, handName } from "./hand-off"; // BK-4c
import { reviewRecordOf } from "../../../engine/runtime/preparers"; // BK-18 (QA-448): the record says who really acted

type Owes = "staff" | "representative" | "client" | "employer" | "ircc";
type Line = { code: string; key: string; item?: string; subject?: string; owes: Owes; words: string; unblocks: string; severity: "block" | "critical" | "warning" };
type Passed = Line & { reason: string; by: string; at: string };
type Readiness = { filing: string; ready: boolean; blocks: Line[]; warns: Line[]; passed: Passed[]; owes: Partial<Record<Owes, number>>;
  reviewed: { by: string; kind: string; licence_number: string | null; at: string } | null;
  /** BK-18 (QA-448): who the case's work record says prepared it (api/src/case-work.ts), earliest act first. */
  prepared_by?: string[]; facts_hash: string; representative: string | null };
type Filing = { id: string; label: string; status: string; read_only?: boolean };
type PrepareView = { derived: boolean; why?: string; filings: Filing[]; readiness?: Readiness[]; figures?: Figure[] };
type TeamView = { representative: { id: string; name: string } | null; officers: { id: string; name: string }[] };
/** A refusal from the server, shown under the filing until its lines change again (`key`: the open lines it was shown on). */
type Refusal = { title: string; detail: string; lines: string[]; key: string };
type OnRefused = (title: string, e: unknown) => Promise<void>;

/** The owners in the server's order (engine/runtime/readiness.ts ORDER), in people's words. */
const OWNERS: [Owes, string][] = [["staff", "The case team"], ["representative", "The representative of record"], ["client", "The client"], ["employer", "The employer"], ["ircc", "IRCC"]];
/** The filing's status words: the same as the Submission to IRCC panel's (submission.tsx), from /prepare's own status. */
const STATUS: Record<string, { words: string; tone: string; title: string }> = {
  not_started: { words: "Not started", tone: "neutral", title: "Not marked Ready to file yet" },
  ready_to_file: { words: "Ready to file", tone: "info", title: "Marked Ready to file: record the submission once IRCC acknowledges it" },
  submitted: { words: "Submitted", tone: "ok", title: "Recorded as submitted: read-only" },
};
const statusOf = (s: string) => STATUS[s] ?? { words: s.replace(/_/g, " "), tone: "neutral", title: "" };
/** A tag only where the server's words do not already say it: a block, and a plain warning (CRITICAL lines say "CRITICAL:"). */
const SEVERITY: Partial<Record<Line["severity"], { words: string; tone: string; title: string }>> = {
  block: { words: "Blocks: fix it", tone: "danger", title: "A block is never passed with a reason: fix it, then it is gone" },
  warning: { words: "Warning", tone: "neutral", title: "Fix it, or pass it with a written reason" },
};
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
/** The count line: what stands before Ready to file, as counts of the server's lines (never a percentage). */
const standing = (r: Readiness) => {
  const n = r.blocks.length, w = r.warns.length;
  return `${n ? plural(n, "block") : ""}${n && w ? " and " : ""}${w ? plural(w, "open warning") : ""} ${n + w === 1 ? "stands" : "stand"} before Ready to file.`;
};
const openKeyOf = (r: Readiness | undefined) => (r ? [...r.blocks, ...r.warns].map((l) => `${l.code}|${l.key}`).join("\n") : "");
const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());
/** The view's query key: the same as the Submission to IRCC panel's, so the case page reads /prepare once for both. */
const viewKey = (caseId: string) => ["runtime", "view", caseId, "prepare"];
/** C8.3 (B144): the case's review rounds (GET …/reviews), newest first; each filing's newest row links its review. */
type Rounds = { representative: string | null; rounds: { id: string; number: number; kind: string; filings: { filing: string; status: "sent" | "under_review" | "approved" | "sent_back"; filing_round: number }[] }[] };
type ReviewRow = { round: string; status: Rounds["rounds"][number]["filings"][number]["status"]; filing_round: number };
const REVIEW_WORDS: Record<ReviewRow["status"], { words: string; tone: string }> = { sent: { words: "Sent for review", tone: "neutral" }, under_review: { words: "Under review", tone: "info" }, approved: { words: "Approved", tone: "ok" }, sent_back: { words: "Sent back", tone: "danger" } };
const reviewOf = (r: Rounds | undefined, filing: string): ReviewRow | null => {
  let best: ReviewRow | null = null;
  for (const x of r?.rounds ?? []) for (const f of x.filings) if (f.filing === filing && (!best || f.filing_round > best.filing_round)) best = { round: x.id, status: f.status, filing_round: f.filing_round };
  return best;
};

/** Every filing's readiness on one case. Under the case view's query key, so any answer change re-reads it. */
export function ReadinessPanel({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<PrepareView>(viewKey(caseId), `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal });
  const firm = useFirm();
  const rounds = useApi<Rounds>(["runtime", "reviews", caseId], `/runtime/cases/${caseId}/reviews`, { retry: noRetryOnRefusal });
  const [sending, setSending] = React.useState(false);
  const nameOf = (id: string) => (team.data?.representative?.id === id ? team.data.representative.name : null) ?? team.data?.officers.find((o) => o.id === id)?.name ?? firm.data?.users.find((u) => u.id === id)?.name ?? id;
  const v = q.data;
  // BK-4c (BR-2, BR-3, BR-4): while a round waits for the representative of record and that is someone else, hand it to
  // them, on that round. Computed from the rounds, so it shows after a reload too; on a solo firm (the representative is
  // the one acting) there is none ("Review now" already opens the review).
  const rep = rounds.data?.representative ?? null;
  const waiting = (rounds.data?.rounds ?? []).filter((x) => x.filings.some((f) => f.status === "sent" || f.status === "under_review")).sort((a, b) => b.number - a.number)[0];
  const handTo = rep && rep !== actor && waiting ? rep : null;
  return (
    <section aria-labelledby="readiness-h" className="rounded-xl border border-border bg-surface-raised" data-readiness>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="readiness-h" tabIndex={-1} className="text-base font-semibold outline-none">Ready to file</h2>
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">What stands before each filing is Ready to file, by who owes it. Only a barcode form without its validated copy read back, or a document its release says can never be waived, blocks; every other line is fixed, or passed with a written reason.</p>
        {v?.derived && v.filings.length ? <Button size="sm" variant="secondary" onClick={() => setSending(true)} data-send-for-review title="Send for review: the representative of record checks each form and approves it or sends it back."><Send aria-hidden />{firm.data?.solo && rounds.data?.representative === actor ? "Review now" : "Send for review"}</Button> : null}
      </header>
      {handTo && waiting ? <HandOff className="border-b border-border px-4 py-2.5" to={handTo} go={`/cases/${caseId}/representative-review/${waiting.id}`} done={`Sent for review (round ${waiting.number})`} next={<>{handName(handTo) ?? nameOf(handTo)} checks each form and approves it or sends it back.</>} data="representative" /> : null}
      {sending && v ? <SendForReviewDialog caseId={caseId} filings={v.filings} readiness={v.readiness ?? []} rounds={rounds.data} now={!!firm.data?.solo && rounds.data?.representative === actor} close={() => setSending(false)} /> : null}
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /><span className="sr-only" role="status">Loading what stands before Ready to file…</span></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="Readiness could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error).message}</Notice></div>
        : !v!.derived ? <p className="px-4 py-3 text-sm text-text-muted">{v!.why ?? "No filings are worked out for this case yet."}</p>
        : !v!.filings.length ? <p className="px-4 py-3 text-sm text-text-muted">No filings on this case yet.</p>
        : <div className="divide-y divide-border">{v!.filings.map((f) => {
            const r = v!.readiness?.find((x) => x.filing === f.id);
            return <FilingReadiness key={f.id} caseId={caseId} f={f} r={r} g={v!.figures?.find((x) => x.filing === f.id)} actor={actor} nameOf={nameOf} review={reviewOf(rounds.data, f.id)} />;
          })}</div>}
    </section>
  );
}

function FilingReadiness({ caseId, f, r, g, actor, nameOf, review }: { caseId: string; f: Filing; r: Readiness | undefined; g?: Figure; actor: string; nameOf: (id: string) => string; review: ReviewRow | null }) {
  const qc = useQueryClient(), toast = useToast();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const [refusal, setRefusal] = React.useState<Refusal | null>(null);
  const [marking, setMarking] = React.useState(false);
  // /prepare says a derived status as stored (NOT_STARTED) and a marked one in lower case (ready_to_file): one spelling here.
  const st = f.status.toLowerCase(), s = statusOf(st), open = st !== "submitted" && !f.read_only;
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  // A refusal stays while the lines it was shown on are open (break F1: a stale tab's refusal is read again after the
  // refresh, never wiped by it); a later change (a pass, a review, a fix) takes it away.
  const openKey = openKeyOf(r);
  React.useEffect(() => { setRefusal((x) => (x && x.key !== openKey ? null : x)); }, [openKey]);
  /** BR-11: any refusal not about one field is shown with the server's own words under the filing, after the view is read
   *  again (a 403 or 409 means the screen was out of date), and the focus goes to the filing's heading (breaks F3, F4, F5). */
  const refused: OnRefused = async (title, e) => {
    const p = (e instanceof ApiError ? e.problem : {}) as { blocks?: Line[]; warns?: Line[] };
    await refresh();
    const now = qc.getQueryData<PrepareView>(viewKey(caseId))?.readiness?.find((x) => x.filing === f.id);
    setRefusal({ title, detail: (e as Error).message, lines: [...(p.blocks ?? []), ...(p.warns ?? [])].map((l) => l.words), key: openKeyOf(now) });
    focusLater(() => heading.current);
  };
  async function ready() {
    setMarking(true); setRefusal(null);
    try {
      await api(`/runtime/filings/${f.id}/ready`, { method: "POST", json: {} });
      toast.push({ tone: "ok", text: `${f.label}: Ready to file` });
      await refresh(); focusLater(() => heading.current);
    } catch (e) { await refused("Not ready to file", e); }
    finally { setMarking(false); }
  }
  if (!r) return (
    <article className="px-4 py-3" data-readiness-filing={f.id} data-status={st}>
      <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{f.label}</h3>
      <p className="text-[13px] text-text-muted">This filing's readiness could not be worked out (it is not on the application now).</p>
    </article>
  );
  const lines = [...r.blocks, ...r.warns];
  // P-155: the representative of record's own; shown while the filing has no current review (break F6: also when someone
  // passed the review warning with a reason, since the representative may still review it).
  // C8.3: a filing sent for review and not decided is decided on the Review page (the server refuses the one-step route).
  const inRound = !!review && (review.status === "sent" || review.status === "under_review");
  const canReview = open && !!r.representative && r.representative === actor && !r.reviewed && !inRound;
  // P-412 F1: an approval a later change withdrew reads so here too (the same rule: C7.6's review line is open again).
  const withdrawn = review?.status === "approved" && !r.reviewed;
  return (
    <article aria-labelledby={`rd-${f.id}`} className="space-y-3 px-4 py-3" data-readiness-filing={f.id} data-status={st} data-ready={r.ready ? "yes" : "no"}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 ref={heading} id={`rd-${f.id}`} tabIndex={-1} className="min-w-0 text-sm font-semibold outline-none [overflow-wrap:anywhere]">{f.label}</h3>
        <Pill tone={s.tone} title={s.title}>{s.words}</Pill>
        <span className="flex-1" />
        {review ? <span className="flex items-center gap-1.5" data-review-link={review.status}>{withdrawn
          ? <Pill tone="warn" title="Approved earlier; a fact on it changed since, so the representative checks it again.">Approval withdrawn</Pill>
          : <Pill tone={REVIEW_WORDS[review.status].tone} title={`Round ${review.filing_round} of this filing's review`}>{REVIEW_WORDS[review.status].words}</Pill>}<Link className="text-[13px] text-text-link hover:underline" to={`/cases/${caseId}/representative-review/${review.round}?filing=${f.id}`}>Open the review</Link></span> : null}
        {canReview ? <ReviewButton f={f} r={r} onRefused={refused} onDone={() => { setRefusal(null); void refresh().then(() => focusLater(() => heading.current)); }} /> : null}
        {open && st !== "ready_to_file" ? <Button size="sm" busy={marking} onClick={() => void ready()} data-mark-ready>Ready to file</Button> : null}
      </div>
      {g && st !== "submitted" && !g.submitted ? <FigureRow g={g} /> : null}
      <p className="text-[13px] text-text-muted" data-standing>
        {st === "submitted" ? "Recorded as submitted: its review and warnings are closed (correct the record in Submission to IRCC)."
          : st === "ready_to_file" ? "Ready to file. Record the submission below once IRCC acknowledges it."
          : lines.length ? standing(r) : "Nothing stands before Ready to file."}
      </p>
      {refusal ? (
        <div data-refusal data-not-ready={refusal.title === "Not ready to file" ? "" : undefined}>
          <Notice tone="danger" title={refusal.title}>
            <p className="[overflow-wrap:anywhere]">{refusal.detail}</p>
            {refusal.lines.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5">{refusal.lines.map((w, i) => <li key={i} className="[overflow-wrap:anywhere]">{w}</li>)}</ul> : null}
          </Notice>
        </div>
      ) : null}
      {st !== "submitted" && lines.length ? OWNERS.filter(([o]) => lines.some((l) => l.owes === o)).map(([o, words]) => {
        const mine = lines.filter((l) => l.owes === o);
        return (
          <div key={o} data-owes={o}>
            <h4 className="text-[13px] font-semibold">{words} <span className="font-normal text-text-muted">· {plural(mine.length, "line")}</span></h4>
            <ul className="mt-1 space-y-2">{mine.map((l) => <OpenLine key={`${l.code}|${l.key}`} caseId={caseId} f={f} l={l} canPass={open} onRefused={refused} onPassed={() => { setRefusal(null); focusLater(() => heading.current); }} />)}</ul>
          </div>
        );
      }) : null}
      {r.reviewed ? <RecordLine r={r} reviewed={r.reviewed} nameOf={nameOf} /> : null}
      {r.passed.length ? (
        <FoldOut className="text-[13px]" open={st !== "submitted"} data-passed summaryClassName="flex min-h-6 items-center text-text-link" summary={<>Passed with a reason ({r.passed.length})</>}>
          <ul className="mt-1 space-y-1.5 pl-1">{r.passed.map((p) => (
            <li key={`${p.code}|${p.key}`} className="[overflow-wrap:anywhere]" data-passed-line={p.key} data-code={p.code}>
              <span className="text-text-muted">{p.words}</span>
              <span className="block">“{p.reason}” <span className="text-text-muted">— passed by {nameOf(p.by)}, {when(p.at)}</span></span>
            </li>
          ))}</ul>
        </FoldOut>
      ) : null}
    </article>
  );
}

/** BK-18 (QA-448, P-525 (1), P-510 (4), P-154): the filing's professional record — who prepared it and who reviewed it,
 *  from who really acted (the case's own work record, `prepared_by`), never from who is named on the case team. One
 *  person who prepared it and reviewed it alone reads "Self-reviewed" with their name, licence number and time (P-154
 *  allows it); a case officer who did nothing is never named, and a second person's review is never shown for a review
 *  one person made. Nobody recorded as having prepared it is said plainly, never guessed. */
function RecordLine({ r, reviewed, nameOf }: { r: Readiness; reviewed: NonNullable<Readiness["reviewed"]>; nameOf: (id: string) => string }) {
  const rec = reviewRecordOf({ preparers: r.prepared_by ?? [], reviewedBy: reviewed.by, kind: reviewed.kind });
  const who = `${nameOf(reviewed.by)}${reviewed.licence_number ? ` (licence ${reviewed.licence_number})` : ""}`;
  return (
    <p className="text-[13px]" data-reviewed={reviewed.kind} data-record={rec.self ? "self-reviewed" : "two-people"}>
      <span className="text-text-muted">Prepared by · Reviewed by: </span>
      {rec.self ? `Self-reviewed by ${who}` : `${rec.preparedBy.length ? rec.preparedBy.map(nameOf).join(", ") : "not recorded"} · ${who}`}, {when(reviewed.at)}
    </p>
  );
}

/** One open block or warning: the server's words; a warning is passed with a written reason, a block never. */
function OpenLine({ caseId, f, l, canPass, onRefused, onPassed }: { caseId: string; f: Filing; l: Line; canPass: boolean; onRefused: OnRefused; onPassed: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  const [passing, setPassing] = React.useState(false), [reason, setReason] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const opener = React.useRef<HTMLButtonElement>(null), box = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (passing) box.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }, [passing]);
  const cancel = () => { setPassing(false); setReason(""); setErr(null); focusLater(() => opener.current); };
  async function pass(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await api(`/runtime/filings/${f.id}/warnings/${encodeURIComponent(l.code)}/pass`, { method: "POST", json: { reason, key: l.key } });
      toast.push({ tone: "ok", text: "Passed with your reason: who and when are recorded." });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); onPassed();
    } catch (x) {
      const field = x instanceof ApiError ? x.field("reason") : null;
      if (field) { setErr(field); focusLater(() => box.current?.querySelector<HTMLElement>('[aria-invalid="true"]')); }
      // Not about the reason (passed meanwhile, no longer allowed): shown under the filing, which outlives this line.
      else { setPassing(false); await onRefused("Not passed", x); }
    } finally { setBusy(false); }
  }
  const sev = SEVERITY[l.severity];
  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2" data-line={l.key} data-code={l.code} data-severity={l.severity}>
      <div className="flex flex-wrap items-start gap-2">
        {sev ? <Pill tone={sev.tone} title={sev.title}>{sev.words}</Pill> : null}
        <span className="min-w-0 flex-1 text-[13px] [overflow-wrap:anywhere]" data-words>{l.words}</span>
        {canPass && l.severity !== "block" && !passing ? <Button ref={opener} size="sm" variant="secondary" onClick={() => setPassing(true)} aria-label={`Pass with a reason: ${l.words}`}>Pass with a reason…</Button> : null}
      </div>
      {passing ? (
        <form ref={box} onSubmit={(e) => void pass(e)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } }} className="mt-2 space-y-2" aria-label="Pass this warning with a reason" data-pass-form>
          <Field label="Why is this passed?" hint="Kept with the filing, with your name and the time. Up to 300 characters." error={err}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="min-h-16" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" busy={busy}>Pass</Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

/** The representative of record's review (P-155): of the facts they read when they opened it (`read`, break F2: a
 *  refusal closes the form, so a second press never sends facts read in the background). When they prepared the filing
 *  themself, the server asks them to confirm it is self-reviewed; the box appears then. */
function ReviewButton({ f, r, onRefused, onDone }: { f: Filing; r: Readiness; onRefused: OnRefused; onDone: () => void }) {
  const toast = useToast();
  const [pinRead, setPinRead] = React.useState<number | undefined>(undefined); // C9.5 (break m10): the pin revision this review reads
  const [read, setRead] = React.useState<string | null>(null), [note, setNote] = React.useState(""), [self, setSelf] = React.useState<boolean | null>(null), [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<{ note?: string; self?: string }>({});
  const opener = React.useRef<HTMLButtonElement>(null), box = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (read) box.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }, [read]);
  const close = () => { setRead(null); setNote(""); setSelf(null); setErr({}); };
  const cancel = () => { close(); focusLater(() => opener.current); };
  async function review(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr({});
    try {
      const done = await api<{ words: string }>(`/runtime/filings/${f.id}/review`, { method: "POST", json: { facts_hash: read, ...(pinRead !== undefined ? { pin_revision: pinRead } : {}), ...(note.trim() ? { note } : {}), ...(self ? { self: true } : {}) } });
      toast.push({ tone: "ok", text: done.words });
      close(); onDone();
    } catch (x) {
      const a = x instanceof ApiError ? x : null;
      if (a?.field("note") || a?.field("self")) {
        if (a.field("self")) setSelf(false);
        setErr({ note: a.field("note") ?? undefined, self: a.field("self") ?? undefined });
        focusLater(() => box.current?.querySelector<HTMLElement>('[aria-invalid="true"]'));
      } else { close(); await onRefused("Not reviewed", x); }
    } finally { setBusy(false); }
  }
  if (!read) return <Button ref={opener} size="sm" variant="secondary" onClick={() => { setRead(r.facts_hash); setPinRead((r as { pin_revision?: number }).pin_revision); }} data-review-filing>Review the filing</Button>;
  return (
    <form ref={box} onSubmit={(e) => void review(e)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); cancel(); } }} className="basis-full space-y-2 rounded-lg border border-border bg-surface px-3 py-2" aria-label={`Review ${f.label}`} data-review-form>
      <p className="text-[13px]">You review this filing as the representative of record, for its facts as they are on this page now. A later change reopens the review.</p>
      <Field label="Note (optional)" hint="Up to 400 characters." error={err.note ?? null}><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} className="min-h-16" /></Field>
      {self !== null ? (
        <label className="flex items-start gap-2 text-[13px]">
          <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} aria-invalid={err.self ? true : undefined} aria-describedby={err.self ? `self-${f.id}` : undefined} className="mt-0.5 size-4" />
          <span>I prepared and reviewed this filing myself (logged as Self-reviewed).{err.self ? <span id={`self-${f.id}`} role="alert" className="block text-xs text-text-danger">{err.self}</span> : null}</span>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" busy={busy}><Check aria-hidden />Confirm the review</Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** C8.3 (BR-1): "Send for review" at the head of the panel: the filings, ticked by default when nothing blocks them and
 *  they are not in an open round, each with its open warnings counted; one button. On a solo firm the representative of
 *  record's "Review now" sends and opens the review in one step (m3). */
function SendForReviewDialog({ caseId, filings, readiness, rounds, now, close }: { caseId: string; filings: Filing[]; readiness: Readiness[]; rounds: Rounds | undefined; now: boolean; close: () => void }) {
  const qc = useQueryClient(), toast = useToast(), nav = useNavigate();
  const rowOf = (id: string) => reviewOf(rounds, id);
  const closed = (f: Filing) => f.status.toLowerCase() === "submitted" || f.read_only || (() => { const x = rowOf(f.id); return !!x && (x.status === "sent" || x.status === "under_review"); })();
  // Break B1: a filing whose approval still counts is not ticked by default (sending it again withdraws that approval).
  const [ticked, setTicked] = React.useState<string[]>(() => filings.filter((f) => !closed(f) && !(readiness.find((r) => r.filing === f.id)?.blocks.length) && !readiness.find((r) => r.filing === f.id)?.reviewed).map((f) => f.id));
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  async function send() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ id: string; number: number }>(`/runtime/cases/${caseId}/reviews`, { method: "POST", json: { filings: ticked, ...(now ? { now: true } : {}) } });
      toast.push({ tone: "ok", text: now ? "Review opened." : `Sent for review (round ${r.number}): the representative of record checks each form.` });
      await qc.invalidateQueries({ queryKey: ["runtime"] });
      close();
      if (now) nav(`/cases/${caseId}/representative-review/${r.id}`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={now ? "Review now" : "Send for review"} description="Send for review: the representative of record checks each form and approves it or sends it back."
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} disabled={!ticked.length} onClick={() => void send()} data-confirm-send>{now ? `Review ${plural(ticked.length, "filing")} now` : `Send ${plural(ticked.length, "filing")} for review`}</Button></>}>
      <ul className="space-y-1.5" data-send-dialog>
        {filings.map((f) => {
          const rd = readiness.find((r) => r.filing === f.id), x = rowOf(f.id), shut = closed(f), warns = rd?.warns.length ?? 0, blocks = rd?.blocks.length ?? 0;
          return (
            <li key={f.id} className="flex items-start gap-2 text-[13px]" data-send-filing={f.id}>
              <input type="checkbox" id={`send-${f.id}`} className="mt-0.5 size-4" disabled={shut} checked={ticked.includes(f.id)} onChange={(e) => setTicked((t) => (e.target.checked ? [...t, f.id] : t.filter((y) => y !== f.id)))} />
              <label htmlFor={`send-${f.id}`} className="min-w-0 flex-1 [overflow-wrap:anywhere]">{f.label}
                <span className="block text-[12px] text-text-muted">{shut ? (x && (x.status === "sent" || x.status === "under_review") ? "Already sent for review: open that review." : "Recorded as submitted: its review is closed.")
                  : `${rd?.reviewed ? "Approved: sending it again withdraws the approval · " : ""}${blocks ? `Blocked: ${plural(blocks, "block")} · ` : ""}${warns ? plural(warns, "open warning") : "No open warning"}`}</span></label>
            </li>
          );
        })}
      </ul>
      {err ? <p role="alert" className="mt-2 text-[13px] text-text-danger">{err}</p> : null}
    </Dialog>
  );
}
