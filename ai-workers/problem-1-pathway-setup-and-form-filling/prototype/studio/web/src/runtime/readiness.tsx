// C7.6 Ready to file, by screens (runtime lane, M3 sprint row B2; prepare-tab concept r2 BR-8, BR-11; L-SA3 under
// P-315, P-237, P-238; P-155; QA-229): one panel per case, one block per filing, showing the server's readiness from
// GET /runtime/cases/:id/prepare and never working it out here. Lines are grouped by who owes them, in the server's own
// words, never a percentage. A warning is passed with a written reason (who and when are recorded by the server and
// shown); a block cannot be passed, only fixed. "Review the filing" is the representative of record's own (P-155): a
// case officer does not see it. "Ready to file" asks the server, which refuses (409) while anything stands and names
// the same lines. Types live here only (concept §2: never in studio/contracts/). Legal points: Unconfirmed: no counsel.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Field, Notice, Pill, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";

type Owes = "staff" | "representative" | "client" | "employer" | "ircc";
type Line = { code: string; key: string; item?: string; subject?: string; owes: Owes; words: string; unblocks: string; severity: "block" | "critical" | "warning" };
type Passed = Line & { reason: string; by: string; at: string };
type Readiness = { filing: string; ready: boolean; blocks: Line[]; warns: Line[]; passed: Passed[]; owes: Partial<Record<Owes, number>>;
  reviewed: { by: string; kind: string; licence_number: string | null; at: string } | null; facts_hash: string; representative: string | null };
type Filing = { id: string; label: string; status: string; read_only?: boolean };
type PrepareView = { derived: boolean; why?: string; filings: Filing[]; readiness?: Readiness[] };
type TeamView = { representative: { id: string; name: string } | null; officers: { id: string; name: string }[] };
type NotReady = { detail: string; lines: string[] };

/** The owners in the server's order (engine/runtime/readiness.ts ORDER), in people's words. */
const OWNERS: [Owes, string][] = [["staff", "The case team"], ["representative", "The representative of record"], ["client", "The client"], ["employer", "The employer"], ["ircc", "IRCC"]];
/** The filing's status words: the same as the Submission to IRCC panel's (submission.tsx), from /prepare's own status. */
const STATUS: Record<string, { words: string; tone: string }> = { not_started: { words: "Not started", tone: "neutral" }, ready_to_file: { words: "Ready to file", tone: "info" }, submitted: { words: "Submitted", tone: "ok" } };
const statusOf = (s: string) => STATUS[s.toLowerCase()] ?? { words: s.toLowerCase().replace(/_/g, " "), tone: "neutral" };
const SEVERITY: Record<Line["severity"], { words: string; tone: string }> = { block: { words: "Blocks: fix it", tone: "danger" }, critical: { words: "Critical warning", tone: "warn" }, warning: { words: "Warning", tone: "neutral" } };
const when = (at: string) => new Date(at).toLocaleString("en-CA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
/** The count line: what stands before Ready to file, as counts of the server's lines (never a percentage). */
const standing = (r: Readiness) => {
  const n = r.blocks.length, w = r.warns.length;
  return `${n ? plural(n, "block") : ""}${n && w ? " and " : ""}${w ? plural(w, "open warning") : ""} ${n + w === 1 ? "stands" : "stand"} before Ready to file.`;
};
const focusLater = (el: () => HTMLElement | null | undefined) => requestAnimationFrame(() => el()?.focus());

/** Every filing's readiness on one case. Under the case view's query key, so any answer change re-reads it. */
export function ReadinessPanel({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<PrepareView>(["runtime", "view", caseId, "prepare", actor], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const team = useApi<TeamView>(["runtime", "team", caseId], `/runtime/cases/${caseId}/team`, { retry: noRetryOnRefusal });
  const firm = useFirm();
  const nameOf = (id: string) => (team.data?.representative?.id === id ? team.data.representative.name : null) ?? team.data?.officers.find((o) => o.id === id)?.name ?? firm.data?.users.find((u) => u.id === id)?.name ?? id;
  const v = q.data;
  return (
    <section aria-labelledby="readiness-h" className="rounded-xl border border-border bg-surface-raised" data-readiness>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="readiness-h" tabIndex={-1} className="text-base font-semibold outline-none">Ready to file</h2>
        <p className="min-w-0 flex-1 text-[13px] text-text-muted">What stands before each filing is Ready to file, by who owes it. Only a barcode form without its validated copy read back blocks; every other line is fixed, or passed with a written reason.</p>
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /><span className="sr-only" role="status">Loading what stands before Ready to file…</span></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="Readiness could not be loaded" action={<Button size="sm" variant="secondary" onClick={() => void q.refetch()}>Retry</Button>}>{(q.error as Error).message}</Notice></div>
        : !v!.derived ? <p className="px-4 py-3 text-sm text-text-muted">{v!.why ?? "No filings are worked out for this case yet."}</p>
        : !v!.filings.length ? <p className="px-4 py-3 text-sm text-text-muted">No filings on this case yet.</p>
        : <div className="divide-y divide-border">{v!.filings.map((f) => {
            const r = v!.readiness?.find((x) => x.filing === f.id);
            return <FilingReadiness key={f.id} caseId={caseId} f={f} r={r} actor={actor} nameOf={nameOf} officers={team.data?.officers.map((o) => o.name) ?? []} />;
          })}</div>}
    </section>
  );
}

function FilingReadiness({ caseId, f, r, actor, nameOf, officers }: { caseId: string; f: Filing; r: Readiness | undefined; actor: string; nameOf: (id: string) => string; officers: string[] }) {
  const qc = useQueryClient(), toast = useToast();
  const heading = React.useRef<HTMLHeadingElement>(null);
  const [notReady, setNotReady] = React.useState<NotReady | null>(null);
  const [marking, setMarking] = React.useState(false);
  // /prepare says a derived status as stored (NOT_STARTED) and a marked one in lower case (ready_to_file): one spelling here.
  const st = f.status.toLowerCase(), s = statusOf(st), open = st !== "submitted" && !f.read_only;
  const refresh = () => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
  // The refusal names the lines open when it was given: once they change (a pass, a review, a fix) it is gone, never left
  // listing lines that are passed now.
  const openKey = r ? [...r.blocks, ...r.warns].map((l) => `${l.code}|${l.key}`).join("\n") : "";
  React.useEffect(() => { setNotReady(null); }, [openKey]);
  async function ready() {
    setMarking(true); setNotReady(null);
    try {
      await api(`/runtime/filings/${f.id}/ready`, { method: "POST", json: {} });
      toast.push({ tone: "ok", text: `${f.label}: Ready to file` });
      await refresh(); focusLater(() => heading.current);
    } catch (e) {
      const p = (e instanceof ApiError ? e.problem : {}) as { blocks?: Line[]; warns?: Line[] };
      if (e instanceof ApiError && e.status === 409) setNotReady({ detail: e.message, lines: [...(p.blocks ?? []), ...(p.warns ?? [])].map((l) => l.words) });
      else toast.push({ tone: "danger", text: (e as Error).message });
      await refresh();
    } finally { setMarking(false); }
  }
  if (!r) return (
    <article className="px-4 py-3" data-readiness-filing={f.id} data-status={st}>
      <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{f.label}</h3>
      <p className="text-[13px] text-text-muted">This filing's readiness could not be worked out (it is not on the application now).</p>
    </article>
  );
  const lines = [...r.blocks, ...r.warns];
  const isRep = !!r.representative && r.representative === actor;
  const reviewOpen = r.warns.some((w) => w.code === "representative_review");
  return (
    <article aria-labelledby={`rd-${f.id}`} className="space-y-3 px-4 py-3" data-readiness-filing={f.id} data-status={st} data-ready={r.ready ? "yes" : "no"}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 ref={heading} id={`rd-${f.id}`} tabIndex={-1} className="min-w-0 text-sm font-semibold outline-none [overflow-wrap:anywhere]">{f.label}</h3>
        <Pill tone={s.tone}>{s.words}</Pill>
        <span className="flex-1" />
        {open && isRep && reviewOpen ? <ReviewButton caseId={caseId} f={f} r={r} /> : null}
        {open && st !== "ready_to_file" ? <Button size="sm" busy={marking} onClick={() => void ready()} data-mark-ready>Ready to file</Button> : null}
      </div>
      <p className="text-[13px] text-text-muted" data-standing>
        {st === "submitted" ? "Recorded as submitted: its review and warnings are closed (correct the record in Submission to IRCC)."
          : st === "ready_to_file" ? "Ready to file. Record the submission below once IRCC acknowledges it."
          : lines.length ? standing(r) : "Nothing stands before Ready to file."}
      </p>
      {notReady ? (
        <div data-not-ready>
          <Notice tone="danger" title="Not ready to file">
            <p>{notReady.detail}</p>
            {notReady.lines.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5">{notReady.lines.map((w, i) => <li key={i} className="[overflow-wrap:anywhere]">{w}</li>)}</ul> : null}
          </Notice>
        </div>
      ) : null}
      {st !== "submitted" && lines.length ? OWNERS.filter(([o]) => lines.some((l) => l.owes === o)).map(([o, words]) => {
        const mine = lines.filter((l) => l.owes === o);
        return (
          <div key={o} data-owes={o}>
            <h4 className="text-[13px] font-semibold">{words} <span className="font-normal text-text-muted">· {plural(mine.length, "line")}</span></h4>
            <ul className="mt-1 space-y-2">{mine.map((l) => <OpenLine key={`${l.code}|${l.key}`} caseId={caseId} f={f} l={l} canPass={open} onPassed={() => focusLater(() => heading.current)} />)}</ul>
          </div>
        );
      }) : null}
      {r.reviewed ? (
        <p className="text-[13px]" data-reviewed={r.reviewed.kind}>
          <span className="text-text-muted">Prepared by · Reviewed by: </span>{officers.length ? officers.join(", ") : "the case team"} · {r.reviewed.kind === "self_reviewed" ? "Self-reviewed by " : ""}{nameOf(r.reviewed.by)}{r.reviewed.licence_number ? ` (licence ${r.reviewed.licence_number})` : ""}, {when(r.reviewed.at)}
        </p>
      ) : null}
      {r.passed.length ? (
        <details className="text-[13px]" open={st !== "submitted"} data-passed>
          <summary className="flex min-h-6 cursor-pointer items-center text-text-link">Passed with a reason ({r.passed.length})</summary>
          <ul className="mt-1 space-y-1.5 pl-1">{r.passed.map((p) => (
            <li key={`${p.code}|${p.key}`} className="[overflow-wrap:anywhere]" data-passed-line={p.key} data-code={p.code}>
              <span className="text-text-muted">{p.words}</span>
              <span className="block">“{p.reason}” <span className="text-text-muted">— passed by {nameOf(p.by)}, {when(p.at)}</span></span>
            </li>
          ))}</ul>
        </details>
      ) : null}
    </article>
  );
}

/** One open block or warning: the server's words; a warning is passed with a written reason, a block never. */
function OpenLine({ caseId, f, l, canPass, onPassed }: { caseId: string; f: Filing; l: Line; canPass: boolean; onPassed: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  const [passing, setPassing] = React.useState(false), [reason, setReason] = React.useState(""), [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<{ reason?: string; form?: string }>({});
  const opener = React.useRef<HTMLButtonElement>(null), box = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (passing) box.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }, [passing]);
  const cancel = () => { setPassing(false); setReason(""); setErr({}); focusLater(() => opener.current); };
  async function pass(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr({});
    try {
      await api(`/runtime/filings/${f.id}/warnings/${encodeURIComponent(l.code)}/pass`, { method: "POST", json: { reason, key: l.key } });
      toast.push({ tone: "ok", text: "Passed with your reason: who and when are recorded." });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }); onPassed();
    } catch (x) {
      const field = x instanceof ApiError ? x.field("reason") : null;
      setErr(field ? { reason: field } : { form: (x as Error).message });
      if (x instanceof ApiError && x.status === 409) void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      focusLater(() => box.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]'));
    } finally { setBusy(false); }
  }
  const sev = SEVERITY[l.severity];
  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2" data-line={l.key} data-code={l.code} data-severity={l.severity}>
      <div className="flex flex-wrap items-start gap-2">
        <Pill tone={sev.tone}>{sev.words}</Pill>
        <span className="min-w-0 flex-1 text-[13px] [overflow-wrap:anywhere]" data-words>{l.words}</span>
        {canPass && l.severity !== "block" && !passing ? <Button ref={opener} size="sm" variant="secondary" onClick={() => setPassing(true)} aria-label={`Pass with a reason: ${l.words}`}>Pass with a reason…</Button> : null}
      </div>
      {passing ? (
        <form ref={box} onSubmit={(e) => void pass(e)} className="mt-2 space-y-2" aria-label="Pass this warning with a reason" data-pass-form>
          <Field label="Why is this passed?" hint="Kept with the filing, with your name and the time." error={err.reason ?? null}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={400} className="min-h-16" />
          </Field>
          {err.form ? <p role="alert" className="text-xs text-text-danger [overflow-wrap:anywhere]">{err.form}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" busy={busy}>Pass</Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
          </div>
        </form>
      ) : null}
    </li>
  );
}

/** The representative of record's review (P-155): of the facts in the view they read (facts_hash). When they prepared
 *  the filing themself, the server asks them to confirm it is self-reviewed; the box appears then. */
function ReviewButton({ caseId, f, r }: { caseId: string; f: Filing; r: Readiness }) {
  const qc = useQueryClient(), toast = useToast();
  const [open, setOpen] = React.useState(false), [note, setNote] = React.useState(""), [self, setSelf] = React.useState<boolean | null>(null), [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<{ note?: string; self?: string; form?: string }>({});
  const opener = React.useRef<HTMLButtonElement>(null), box = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => { if (open) box.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }, [open]);
  const cancel = () => { setOpen(false); setNote(""); setSelf(null); setErr({}); focusLater(() => opener.current); };
  async function review(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr({});
    try {
      const done = await api<{ words: string }>(`/runtime/filings/${f.id}/review`, { method: "POST", json: { facts_hash: r.facts_hash, ...(note.trim() ? { note } : {}), ...(self ? { self: true } : {}) } });
      toast.push({ tone: "ok", text: done.words });
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      focusLater(() => document.getElementById(`rd-${f.id}`));
    } catch (x) {
      const a = x instanceof ApiError ? x : null;
      if (a?.field("self")) setSelf(false);
      setErr({ note: a?.field("note") ?? undefined, self: a?.field("self") ?? undefined, form: a?.field("note") || a?.field("self") ? undefined : (x as Error).message });
      if (a?.status === 409) void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      focusLater(() => box.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]'));
    } finally { setBusy(false); }
  }
  if (!open) return <Button ref={opener} size="sm" variant="secondary" onClick={() => setOpen(true)} data-review-filing>Review the filing</Button>;
  return (
    <form ref={box} onSubmit={(e) => void review(e)} className="basis-full space-y-2 rounded-lg border border-border bg-surface px-3 py-2" aria-label={`Review ${f.label}`} data-review-form>
      <p className="text-[13px]">You review this filing as the representative of record, for its facts as they are now. A later change reopens the review.</p>
      <Field label="Note (optional)" error={err.note ?? null}><Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} className="min-h-16" /></Field>
      {self !== null ? (
        <label className="flex items-start gap-2 text-[13px]">
          <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} aria-invalid={err.self ? true : undefined} aria-describedby={err.self ? `self-${f.id}` : undefined} className="mt-0.5 size-4" />
          <span>I prepared and reviewed this filing myself (logged as Self-reviewed).{err.self ? <span id={`self-${f.id}`} role="alert" className="block text-xs text-text-danger">{err.self}</span> : null}</span>
        </label>
      ) : null}
      {err.form ? <p role="alert" className="text-xs text-text-danger [overflow-wrap:anywhere]">{err.form}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" busy={busy}><Check aria-hidden />Confirm the review</Button>
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
      </div>
    </form>
  );
}
