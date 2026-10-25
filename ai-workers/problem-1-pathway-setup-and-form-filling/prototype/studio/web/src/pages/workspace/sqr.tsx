// Screen 03 SQR tab (S2, concept §4): person-role chips with counts; needed-fact coverage with what blocks release (BR-7);
// the library sections as rows that open to their questions (asked as · filled by · needed by · rule); and, on the right,
// the phone view of what that person is asked. "Filled by" is the placement's source, read-only here (S2 FIX: a change
// goes through the shared library as an approved change); the where-used count stays. Rules are the library's,
// read-only here (BR-8). One request per view:
// GET /combinations/:id/workspace?tab=sqr&role=.
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { FILLED_BY, type WorkspaceView } from "../../../../contracts/workspace";
import { PreviewQuestions } from "@/runtime/questionnaire";
import { api, ApiError, useSessionView, useToast } from "@/lib/api";
import { Button, Field, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

type Sqr = Extract<WorkspaceView, { tab: "sqr" }>;
type Q = NonNullable<Sqr["sqr"]>["sections"][number]["questions"][number];
const chip = (on: boolean) => cn("min-h-9 rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5");

export function SqrTab({ id, v }: { id: string; v: Sqr }) {
  const [sp, setSp] = useSearchParams();
  const { canAuthor } = useSessionView();
  const qc = useQueryClient(), toast = useToast();
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(v.sqr?.sections.filter((x) => x.questions.length).slice(0, 1).map((x) => x.id) ?? []));
  const [add, setAdd] = React.useState(""), [busy, setBusy] = React.useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["combination", id] }), qc.invalidateQueries({ queryKey: ["config", id] })]);
  async function section(key: string, on: boolean) {
    setBusy(true);
    try { await api(`/combinations/${id}/sections/${key}`, { method: on ? "POST" : "DELETE" }); toast.push({ tone: "ok", text: on ? "Section added to the questionnaire (draft)" : "Section removed from the questionnaire (draft)" }); setAdd(""); await refresh(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); }
    setBusy(false);
  }
  const addRow = canAuthor ? (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Add a library section" className="w-80"><Select value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Choose a section</option>{v.available.map((x) => <option key={x.key} value={x.key}>{x.title}</option>)}</Select></Field>
      <Button variant="secondary" disabled={!add} busy={busy} onClick={() => void section(add, true)}><Plus /> Add section</Button>
    </div>
  ) : null;
  if (!v.sqr) return <div className="space-y-3 rounded-xl border border-border bg-surface-raised p-5"><h2 className="font-semibold">No questionnaire yet</h2><p className="text-sm text-text-muted">{v.empty}</p>{addRow}</div>;
  const s = v.sqr;
  const roleLabel = s.roles.find((r) => r.role === s.role)?.label ?? s.role;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">Person role</span>
        <div role="group" aria-label="Person role" className="flex flex-wrap gap-1.5">
          {s.roles.map((r) => <button key={r.role} type="button" aria-pressed={r.role === s.role} className={chip(r.role === s.role)} onClick={() => { const n = new URLSearchParams(sp); n.set("role", r.role); setSp(n, { replace: true }); }}>{r.label} · {r.questions} question{r.questions === 1 ? "" : "s"}{r.gaps ? <span className="ml-1 text-text-danger">· {r.gaps} not asked</span> : null}</button>)}
        </div>
      </div>
      <section aria-labelledby="sqr-cov" className={cn("rounded-xl border p-4", s.coverage.gaps.length ? "border-danger/30 bg-danger/5" : "border-border bg-surface-raised")}>
        <h2 id="sqr-cov" className="font-semibold">Needed facts for {roleLabel}: {s.coverage.needed}</h2>
        <p className="mt-1 text-sm"><span>{s.coverage.client} the client answers</span> · <span>{s.coverage.officer} the case officer fills</span> · <span className={s.coverage.gaps.length ? "font-medium text-text-danger" : undefined}>{s.coverage.gaps.length} nobody is asked for</span></p>
        {s.coverage.gaps.length ? (
          <>
            <p className="mt-2 text-sm font-medium">Release is blocked until every needed fact is asked, filled by the case officer, or comes from a linked case.</p>
            <ul className="mt-1 space-y-1 text-sm" aria-label="Facts nobody is asked for">{s.coverage.gaps.map((g) => <li key={`${g.role}|${g.fact}`} className="flex gap-2"><Pill tone="danger">Blocks release</Pill><span><span className="mono">{g.fact}</span> · needed by {g.forms.join(", ")} ({g.boxes} form field{g.boxes === 1 ? "" : "s"}) · <Link className="text-text-link underline" to={`/library/fields/${encodeURIComponent(g.fact)}`}>Place it in a section</Link></span></li>)}</ul>
          </>
        ) : <p className="mt-1 text-xs text-text-muted">Every fact a form needs for this person is asked or filled by the case officer.</p>}
      </section>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          {addRow}
          {s.sections.map((x) => {
            const isOpen = open.has(x.id);
            return (
              <section key={x.id} className="overflow-hidden rounded-xl border border-border bg-surface-raised" aria-labelledby={`sec-${x.id}`}>
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen} aria-controls={`secq-${x.id}`} onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(x.id)) n.delete(x.id); else n.add(x.id); return n; })}>
                    {isOpen ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
                    <span id={`sec-${x.id}`} className="font-medium">{x.title}</span>
                    <span className="text-xs text-text-muted">{x.questions.length} question{x.questions.length === 1 ? "" : "s"} for {roleLabel}</span>
                    {!x.selected ? <Pill tone="info" title="Not one of this combination's sections: a case still asks these because a form needs them">Asked because a form needs it</Pill> : null}
                  </button>
                  {canAuthor && x.selected ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void section(x.id, false)}>Remove section</Button> : null}
                </div>
                {isOpen ? (
                  <div id={`secq-${x.id}`} className="border-t border-border">
                    {!x.questions.length ? <p className="px-4 py-3 text-sm text-text-muted">This section asks {roleLabel} nothing: no form needs these facts for this person.</p> : (
                      <Table dense head={["Question", "Asked as", "Filled by", "Needed by", "Rule"]}>
                        {x.questions.map((q) => (
                          <tr key={q.fact} data-fact={q.fact}>
                            <td className="max-w-56"><span className="font-medium">{q.label}</span>{q.required ? null : <span className="text-text-muted"> (optional)</span>}{q.group ? <span className="text-xs text-text-muted"> · each entry</span> : null}</td>
                            <td className="max-w-56 text-xs">{q.asked_as ?? <span className="text-text-muted">uses the field's meaning</span>}</td>
                            <td className="text-xs">
                              {FILLED_BY[q.filled_by]}
                              <span className="mt-0.5 block text-[11px] text-text-muted">{q.client_only ? "stays with the client" : `Changes go through the shared library${q.where_used ? ` · used in ${q.where_used} combination${q.where_used === 1 ? "" : "s"}` : ""}`}</span>
                            </td>
                            <td className="text-xs">{q.needed_by.length ? q.needed_by.join(", ") : <span className="text-text-muted">decides what applies</span>}</td>
                            <td className="max-w-48 text-xs">{q.rule ? <>{q.rule} · <Link className="text-text-link underline" to={`/library/fields/${encodeURIComponent(q.fact)}`}>Open in the library</Link></> : <span className="text-text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
          {s.not_asked ? <p className="text-xs text-text-muted">{s.not_asked} placed question{s.not_asked === 1 ? " is" : "s are"} not asked of the largest Sample family: no form reads them and they decide nothing.</p> : null}
        </div>
        <aside aria-label={`What ${roleLabel} sees`} className="space-y-2 xl:sticky xl:top-4">
          <h2 className="text-sm font-semibold">What {roleLabel} sees</h2>
          <div className="max-h-[80vh] overflow-y-auto rounded-[1.75rem] border-8 border-text/80 bg-surface p-3">{v.phone ? <PreviewQuestions view={v.phone} person={s.person} /> : null}</div>
          <p className="text-center text-xs text-text-muted">The shared questionnaire renderer, Sample family, nothing saved.</p>
        </aside>
      </div>
    </div>
  );
}
