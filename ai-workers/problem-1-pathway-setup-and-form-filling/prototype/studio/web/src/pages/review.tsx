import * as React from "react";
import { fmtWhen } from "@/components/status";
import { CheckCircle2, CornerUpLeft, Rocket, Send } from "lucide-react";
import { api, useAction, useActorId, useApi } from "@/lib/api";
import { Button, Notice, Pill, Table, Textarea } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { irccWords } from "../../../contracts/workspace";
import { problemWords } from "../../../contracts/programs";
import { roleKeysInWords } from "@/pages/job";
import { fieldName } from "@/pages/library";

/** The simulated person's name for an id the server stores (QA-10: never "user-A" on screen). */
export const nameOf = (actors: { id: string; name: string }[] | undefined, id: string | null | undefined) => actors?.find((a) => a.id === id)?.name ?? id ?? "";
/** QA-73: the engine's part names in the words the pages use (the stored codes stay as they are). */
// QA-73 (F8): the Item column names each item in a few words; a long label (a calculation's whole definition, up to about
// 260 characters) moves to the cell's tip, and the short name comes from the item's key.
const ITEM_MAX = 60;
const itemName = (c: { key: string; label?: string | null }) => { const l = c.label ? roleKeysInWords(c.label) : ""; return l && l.length <= ITEM_MAX ? l : fieldName(c.key); };
const itemTip = (c: { key: string; label?: string | null }) => { const l = c.label ? roleKeysInWords(c.label) : ""; return l && l.length > ITEM_MAX ? l : c.key; };
const KIND_WORD: Record<string, string> = { "Derived definition": "Calculated answer", "Derived fields": "Calculated answers" };
// QA-73: a message that already starts with its form or item says it once ("IMM 1295: 37 rows", not "IMM 1295: IMM 1295: …").
const problemLine = (p: any) => p.where === "Derived fields" ? `${p.label ? roleKeysInWords(p.label) : "A calculation"}: this calculation is not checked by a test yet; it is shown, never used to decide.`
  : String(p.message ?? "").startsWith(`${p.label ?? p.item}:`) ? p.message : problemWords(p);

export function ReviewTab({ d }: { d: any }) {
  const id = d.combination.id;
  const actorId = useActorId();
  const r = useApi<any>(["review", id, actorId], `/combinations/${id}/review`);
  const session = useApi<any>(["session", actorId], "/session");
  const [note, setNote] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [allProblems, setAllProblems] = React.useState(false);
  const [allChanges, setAllChanges] = React.useState(false);
  const inv = [["review", id], ["combination", id], ["programs"], ["preview"], ["config", id]];
  const submit = useAction(() => api(`/combinations/${id}/submit`, { method: "POST", json: { note } }), { success: "Submitted for review", invalidate: inv, onDone: () => setNote("") });
  const sign = useAction((b: any) => api(`/combinations/${id}/signoff`, { method: "POST", json: b }), { success: (x: any) => "Recorded", invalidate: inv, onDone: () => { setPicked(new Set()); setNote(""); } });
  const approve = useAction(() => api(`/combinations/${id}/approve`, { method: "POST" }), { success: (x: any) => `Released version ${x.version}`, invalidate: inv });
  // S5 m7 (P-123, AGENTS rule 4): the second person sees which forms AI picked, with IRCC's words, and confirms they apply.
  const cfg = useApi<{ snapshot: { forms: { form_number: string; title: string; origin?: string; source_quote?: string | null }[] } }>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  const aiPicked = (cfg.data?.snapshot.forms ?? []).filter((f) => f.origin === "AI_PROPOSAL" || f.origin === "AI_FOUND");
  if (r.isLoading || !session.data) return <Spinner label="Loading review" />;
  const v = r.data;
  const me = session.data.actor;
  const sub = v.submission?.status === "SUBMITTED" ? v.submission : null;
  const changes: any[] = sub ? sub.changeSummary : v.draft.changes;
  const signed = new Map<string, any>((v.signoffs ?? []).map((s: any) => [s.itemRef, s]));
  const errors = v.draft.problems.filter((p: any) => p.level === "error"), warnings = v.draft.problems.filter((p: any) => p.level === "warning");
  const ref = (c: any) => `${c.kind}|${c.key}`;
  const needSme = changes.filter((c) => c.needs_sme), unsignedSme = needSme.filter((c) => !signed.has(ref(c)));
  const can = (duty: string) => me.duties.includes(duty);
  return (
    <div className="space-y-4">
      {aiPicked.length ? (
        <Notice tone="ai" title={`Forms AI picked (${aiPicked.length}): confirm they apply before release`}>
          <ul className="mt-1 space-y-1" data-ai-picked>{aiPicked.map((f) => <li key={f.form_number}><span className="mono font-medium">{f.form_number}</span> {f.title}{f.source_quote ? <span className="text-text-muted"> · IRCC's words: "{irccWords(f.source_quote)!.slice(0, 140)}"</span> : null}</li>)}</ul>
          <p className="mt-1 text-xs">Which forms apply is Sample until the immigration expert confirms it here.</p>
        </Notice>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <StepCard n={1} title="Author submits" done={!!sub} who="Configuration author (only the author submits)" text={sub ? `Submitted by ${nameOf(session.data.actors, sub.submittedBy)}, ${fmtWhen(sub.submittedAt)}${sub.stale ? ": the draft changed afterwards, submit again" : ""}` : `${v.draft.changes.length} draft change${v.draft.changes.length === 1 ? "" : "s"}; ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix`} />
        <StepCard n={2} title="The immigration expert signs the content" done={!!sub && !unsignedSme.length} who="Content reviewer (the immigration expert's sign-off)" text={sub ? `${needSme.length - unsignedSme.length} of ${needSme.length} rule, document, check or AI-proposed changes signed` : "Rules, document requirements, checks and AI proposals need the immigration expert's sign-off"} />
        <StepCard n={3} title="A second person releases" done={false} who="Approver (never the author or submitter)" text={v.releases[0] ? `Last released: version ${v.releases[0].version}, in Release ${v.releases[0].release}, by ${v.releases[0].approver}` : "Nothing released yet"} />
      </div>
      <Notice tone="info" title={`You are acting as ${me.name} (simulated): ${me.role}`}>Duties: {me.duties.join(", ")}. The server enforces them: an author or submitter can never approve, and a draft changed after submission cannot be released.</Notice>
      {errors.length || warnings.length ? (
        <div className="rounded-xl border border-border bg-surface-raised p-4">
          <p className="font-medium">Validation of the draft</p>
          <p className="mt-1 text-xs text-text-muted">{errors.length} error{errors.length === 1 ? "" : "s"} (block submission) · {warnings.length} warning{warnings.length === 1 ? "" : "s"} (shown and recorded)</p>
          <ul className="mt-2 space-y-1 text-sm">{[...errors, ...warnings].slice(0, allProblems ? undefined : 8).map((p: any, i: number) => <li key={i} className="flex gap-2"><Pill tone={p.level === "error" ? "danger" : "warn"}>{p.level}</Pill><span data-problem><b>{KIND_WORD[p.where] ?? p.where}</b> · {problemLine(p)}</span></li>)}</ul>
          {errors.length + warnings.length > 8 ? <Button size="sm" variant="ghost" className="mt-1" onClick={() => setAllProblems(!allProblems)}>{allProblems ? "Show fewer" : `Show all ${errors.length + warnings.length}`}</Button> : null}
        </div>
      ) : <Notice tone="ok" title="The draft passes validation" />}
      <div className="rounded-xl border border-border bg-surface-raised">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="font-medium">{sub ? "Submitted changes" : "Changes in the draft"} compared with {v.releases[0] ? `released version ${v.releases[0].version}` : "nothing released"} ({changes.length})</p>
          {sub && (can("sme") || can("review")) ? <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPicked(new Set(changes.filter((c) => !signed.has(ref(c)) && (!c.needs_sme || can("sme"))).map(ref)))}>Select all I can sign</Button><Button size="sm" onClick={() => sign.mutate({ items: [...picked], action: "signed" })} disabled={!picked.size} busy={sign.isPending}><CheckCircle2 /> Sign {picked.size || ""}</Button></div> : null}
        </div>
        {!changes.length ? <p className="px-4 py-6 text-sm text-text-muted">{v.releases[0] ? "The draft is identical to the released version." : "Nothing configured yet."}</p> : (
          <Table className="rounded-none border-0" dense head={["", "Kind", "Item", "Change", "Origin", "Needs", "Signed"]}>
            {changes.slice(0, allChanges ? undefined : 25).map((c) => { const s = signed.get(ref(c)); return (
              <tr key={ref(c)}>
                <td>{sub && !s ? <input type="checkbox" aria-label={`Select ${c.label || c.key}`} checked={picked.has(ref(c))} disabled={c.needs_sme && !can("sme")} onChange={(e) => setPicked((p) => { const n = new Set(p); e.target.checked ? n.add(ref(c)) : n.delete(ref(c)); return n; })} /> : null}</td>
                <td className="text-xs">{KIND_WORD[c.kind] ?? c.kind}</td><td className="max-w-md text-xs" title={itemTip(c)} data-item-cell>{itemName(c)}</td>
                <td><Pill tone={c.change === "added" ? "info" : c.change === "removed" ? "danger" : "warn"}>{c.change}</Pill></td>
                <td>{c.origin === "AI_PROPOSAL" ? <Pill tone="ai">AI-proposed</Pill> : c.origin === "HUMAN" ? <Pill tone="info">person</Pill> : <Pill>{c.origin ?? "—"}</Pill>}</td>
                <td className="text-xs">{c.needs_sme ? "Immigration expert" : "Review"}</td>
                <td className="text-xs">{s ? <Pill tone={s.action === "signed" ? "ok" : "warn"}>{s.action} by {nameOf(session.data.actors, s.actorId)}</Pill> : sub ? "—" : ""}</td>
              </tr>); })}
          </Table>
        )}
        {changes.length > 25 ? <div className="border-t border-border px-4 py-2"><Button size="sm" variant="ghost" onClick={() => setAllChanges(!allChanges)}>{allChanges ? "Show fewer" : `Show all ${changes.length} changes`}</Button><span className="ml-2 text-xs text-text-muted">{Object.entries(changes.reduce((a: any, c: any) => { a[c.kind] = (a[c.kind] ?? 0) + 1; return a; }, {})).map(([k, n]) => `${n} ${(KIND_WORD[k] ?? k).toLowerCase()}`).join(" · ")}</span></div> : null}
      </div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-raised p-4">
        <label className="min-w-80 flex-1 text-xs">Note (optional for submit and sign; required to return)<Textarea className="mt-1 min-h-14" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <Button variant="secondary" onClick={() => submit.mutate(undefined)} busy={submit.isPending} disabled={!can("review") || !v.draft.changes.length || (!!sub && !sub.stale) || !!errors.length} title={!can("review") ? "Needs the review duty" : errors.length ? "Fix the problems first" : ""}><Send /> {sub?.stale ? "Submit again" : "Submit for review"}</Button>
        {sub ? <Button variant="ghost" onClick={() => sign.mutate({ items: picked.size ? [...picked] : changes.map(ref).slice(0, 1), action: "returned", note })} disabled={!can("review") || !note.trim()} busy={sign.isPending}><CornerUpLeft /> Return to author</Button> : null}
        <Button onClick={() => approve.mutate(undefined)} busy={approve.isPending} disabled={!sub || !can("approve")} title={!can("approve") ? "Only the approver duty can release" : ""}><Rocket /> Approve and release</Button>
      </div>
      {v.releases.length ? (
        <div><p className="mb-2 font-medium">Released versions</p><Table dense head={["Version", "Author / submitter / approver", "Released", "Basis"]}>{v.releases.map((x: any) => <tr key={x.id}><td title={`Fingerprint (SHA-256): ${x.sha256}`}>v{x.version} <span className="text-xs text-text-muted">· Release {x.release}</span> {x.status === "SUPERSEDED" ? <Pill>superseded</Pill> : <Pill tone="ok">current</Pill>}</td><td className="text-xs">{String(x.author ?? "").split(",").map((a: string) => nameOf(session.data.actors, a)).join(", ")} / {nameOf(session.data.actors, x.submitter)} / {nameOf(session.data.actors, x.approver)}</td><td className="whitespace-nowrap text-xs">{fmtWhen(x.released_at)}</td><td className="max-w-md text-xs text-text-muted">{x.basis}</td></tr>)}</Table></div>
      ) : null}
    </div>
  );
}

function StepCard({ n, title, who, text, done }: { n: number; title: string; who: string; text: string; done: boolean }) {
  return (
    <div className={`rounded-xl border bg-surface-raised p-4 shadow-sm ${done ? "border-ok/50" : "border-border"}`}>
      <div className="flex items-center gap-2"><span className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-ok text-white" : "bg-surface text-text-muted"}`}>{done ? "✓" : n}</span><p className="font-medium">{title}</p></div>
      <p className="mt-1 text-xs text-text-muted">{who}</p><p className="mt-2 text-sm">{text}</p>
    </div>
  );
}
