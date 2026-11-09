// C6.19 (P-419; concept product/screens/C6.19/concept.md): "Facts from an earlier case" on the case page. A returning
// client's confirmed facts from their earlier case are shown, never copied until the officer ticks them and presses
// "Re-confirm and use" (BR-4); an expired value is flagged with its cited rule and cannot be ticked (BR-6). Every rule
// and word comes from the server (engine/runtime/earlier-facts.ts, api/src/earlier-facts.ts); this only shows them.
import * as React from "react";
import { History, RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip, TipProvider } from "@/components/status";
import { dateWords, valueWords } from "./employer";

type Source = { page: string; url: string; quote: string; recorded: string } | { sample: true; why: string };
type Expiry = { status: "expired" | "soon" | "unknown"; rule: string; words: string; blocks: boolean; date: string | null; source: Source };
type Fact = { fact: string; label: string; value: unknown; from_answer: string; confirmed_at: string; confirmed_by: string; state: "new" | "different"; current: { answer_id: string; value: unknown } | null; expiry: Expiry | null; problems: string[]; usable: boolean };
type Person = { subject_id: string; label: string; role: string; from_subject_id: string | null; from_label: string | null; facts: Fact[] };
type Earlier = { case_id: string; reference: string; combination: string; opened_at: string; people: Person[]; unmatched: { label: string; role: string }[] };
type View = { case_id: string; principal: string | null; today: string; earlier: Earlier[] };

const STATE: Record<Fact["state"], { tone: string; words: string; tip: string }> = {
  new: { tone: "info", words: "New", tip: "New: this case has no value yet." },
  different: { tone: "warn", words: "Different", tip: "Different: this case has its own value; tick to replace it with the earlier one." },
};
const key = (p: Person, f: Fact) => `${p.subject_id}|${f.fact}`;
const roleWords = (r: string) => r.replace(/_/g, " ");

function SourceLine({ s }: { s: Source }) {
  if ("sample" in s) return <span className="text-text-muted">{/^Sample\b/.test(s.why) ? s.why : `Sample rule: ${s.why}`}</span>;
  return <span className="text-text-muted">{s.page}, recorded {dateWords(s.recorded)}: <q>{s.quote}</q> <a className="text-text-link underline" href={s.url} target="_blank" rel="noreferrer">canada.ca</a></span>;
}

export function EarlierFactsCard({ caseId }: { caseId: string }) {
  const q = useApi<View>(["runtime", "view", caseId, "earlier-facts"], `/runtime/cases/${caseId}/earlier-facts`);
  const qc = useQueryClient(), toast = useToast();
  const [pick, setPick] = React.useState<string | null>(null), [ticked, setTicked] = React.useState<string[]>([]);
  const [problem, setProblem] = React.useState<{ title: string; text: string; reload: boolean } | null>(null), [busy, setBusy] = React.useState(false);
  const list = q.data?.earlier ?? [];
  if (q.isLoading) return <div className="rounded-xl border border-border bg-surface-raised p-4"><Skeleton className="h-16 w-full" /></div>;
  if (q.isError) return <Notice tone="danger" title="Facts from an earlier case could not be read">{(q.error as Error).message}</Notice>;
  if (!list.length) return null; // BR-1: no earlier case of this client, so no card
  const chosen = list.find((e) => e.case_id === (pick ?? list[0].case_id))!;
  const offered = chosen.people.flatMap((p) => p.facts.map((f) => ({ p, f })));
  const take = offered.filter(({ p, f }) => f.usable && ticked.includes(key(p, f)));
  const submit = async () => {
    if (!take.length || busy) return;
    setProblem(null); setBusy(true);
    try {
      const r = await api<{ message: string }>(`/runtime/cases/${caseId}/earlier-facts`, { method: "POST", json: { earlierCase: chosen.case_id, take: take.map(({ p, f }) => ({ subject_id: p.subject_id, fact: f.fact, from: f.from_answer })), seen: Object.fromEntries(take.map(({ p, f }) => [key(p, f), f.current?.answer_id ?? null])) } });
      toast.push({ tone: "ok", text: r.message });
      setTicked([]);
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
    } catch (e) {
      const conflict = e instanceof ApiError && e.status === 409;
      setProblem({ title: conflict && /Changed since you looked/.test((e as Error).message) ? "Changed since you looked" : "Nothing was copied", text: (e as Error).message, reload: conflict });
    } finally { setBusy(false); }
  };
  const reload = async () => { setProblem(null); setTicked([]); await q.refetch(); };
  return (
    <TipProvider>
    <section aria-labelledby="earlier-facts-h" className="rounded-xl border border-border bg-surface-raised" data-earlier-facts>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 id="earlier-facts-h" className="flex items-center gap-2 text-base font-semibold"><History className="size-4" aria-hidden />Facts from an earlier case</h2>
        <p className="text-[13px] text-text-muted">{q.data!.principal} has {list.length === 1 ? "an earlier case" : `${list.length} earlier cases`} with this firm. Nothing is copied until you tick a fact and re-confirm it; the earlier case never changes.</p>
      </header>
      <div className="space-y-4 p-4">
        {list.length > 1 ? <fieldset><legend className="text-sm font-medium">Earlier case</legend>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">{list.map((e) => <label key={e.case_id} className="flex items-center gap-2 text-sm"><input type="radio" name="earlier-case" checked={chosen.case_id === e.case_id} onChange={() => { setPick(e.case_id); setTicked([]); setProblem(null); }} />{e.reference} · {e.combination}</label>)}</div></fieldset>
          : <p className="text-sm"><span className="font-medium">{chosen.reference}</span> · {chosen.combination} · opened {dateWords(chosen.opened_at)}</p>}
        {chosen.people.map((p) => (
          <div key={p.subject_id} data-person={p.subject_id}>
            <h3 className="text-sm font-medium">{p.label} <span className="font-normal text-text-muted">({roleWords(p.role)}){p.from_label ? ` · matched to ${p.from_label} on ${chosen.reference}` : ""}</span></h3>
            {!p.from_subject_id ? <p className="mt-1 text-xs text-text-muted">No one with this role and name on {chosen.reference}, so nothing is offered for {p.label}.</p>
              : !p.facts.length ? <p className="mt-1 text-xs text-text-muted">Nothing to offer: this case already has the same values, or the earlier case has no confirmed fact this case asks.</p>
              : <div className="mt-2 overflow-x-auto"><table className="w-full min-w-[46rem] table-fixed text-sm">
                <colgroup><col className="w-8" /><col className="w-52" /><col className="w-36" /><col className="w-28" /><col className="w-36" /><col /></colgroup>
                <thead><tr className="border-b border-border text-left text-xs text-text-muted"><th className="w-8 py-1.5 font-medium"><span className="sr-only">Use</span></th><th className="py-1.5 font-medium">Fact</th><th className="py-1.5 font-medium">Earlier value</th><th className="py-1.5 font-medium">Confirmed there</th><th className="py-1.5 font-medium">This case</th><th className="py-1.5 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-border">{p.facts.map((f) => {
                  const id = `ef-${p.subject_id}-${f.fact}`;
                  return <tr key={f.fact} data-fact={f.fact} data-state={f.state} data-expiry={f.expiry?.status ?? ""} className="align-top">
                    <td className="py-2"><input id={id} type="checkbox" disabled={!f.usable} aria-describedby={f.usable ? undefined : `${id}-why`} checked={f.usable && ticked.includes(key(p, f))} onChange={(e) => setTicked((t) => e.target.checked ? [...t, key(p, f)] : t.filter((x) => x !== key(p, f)))} /></td>
                    <td className="py-2 pr-3"><label htmlFor={id} className="text-text-muted">{f.label}</label></td>
                    <td className="py-2 pr-3 [overflow-wrap:anywhere]">{valueWords(f.value)}</td>
                    <td className="whitespace-nowrap py-2 pr-2 text-xs text-text-muted">{dateWords(f.confirmed_at)}</td>
                    <td className="py-2 pr-3 text-text-muted [overflow-wrap:anywhere]">{f.current ? valueWords(f.current.value) : "Not answered yet"}</td>
                    <td className="space-y-1 py-2">
                      <div className="flex flex-wrap gap-1"><Tip tip={STATE[f.state].tip}><button type="button" className="rounded-sm focus-visible:outline focus-visible:outline-2"><Pill tone={STATE[f.state].tone}>{STATE[f.state].words}</Pill></button></Tip>
                        {f.expiry ? <Tip tip={f.expiry.words}><button type="button" className="rounded-sm focus-visible:outline focus-visible:outline-2"><Pill tone={f.expiry.blocks ? "danger" : "warn"}>{f.expiry.blocks ? "Expired" : f.expiry.status === "soon" ? "Expires soon" : "Expiry not known"}</Pill></button></Tip> : null}</div>
                      {f.expiry ? <p id={`${id}-why`} className="text-xs">{f.expiry.words} <SourceLine s={f.expiry.source} /></p>
                        : f.problems.length ? <p id={`${id}-why`} className="text-xs text-danger">{f.problems[0]}</p> : null}
                    </td>
                  </tr>;
                })}</tbody>
              </table></div>}
          </div>
        ))}
        {chosen.unmatched.length ? <p className="text-xs text-text-muted">Also on {chosen.reference}: {chosen.unmatched.map((u) => `${u.label} (${roleWords(u.role)})`).join(", ")}. Add them to this case with the same role and name to bring their facts.</p> : null}
        {problem ? <Notice tone="danger" title={problem.title}><p>{problem.text}</p>{problem.reload ? <Button className="mt-2" size="sm" variant="secondary" onClick={() => void reload()}><RotateCw aria-hidden />Reload</Button> : null}</Notice> : null}
        {offered.length ? <div className="flex items-center justify-end gap-3"><p className="text-xs text-text-muted">{take.length ? `${take.length} ticked: copied onto this case with the status each had there, re-confirmed by you now.` : "Tick each fact the client says is still true."}</p>
          <Button busy={busy} disabled={!take.length} onClick={() => void submit()} data-reconfirm>Re-confirm and use{take.length ? ` (${take.length})` : ""}</Button></div> : null}
      </div>
    </section>
    </TipProvider>
  );
}
