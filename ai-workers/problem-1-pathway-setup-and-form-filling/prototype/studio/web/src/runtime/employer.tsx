// C11.5 + C1.3 (P-106, BR-13 as ruled on #1051; stand-in SI-10; concept product/screens/C1.3-employer-link r2):
// "Relies on an employer case", offered only when a Retail combination's released forms read employer facts. On the
// case, staff pick the employer case and its facts are copied in once (never a live link). The words and every rule
// come from the server (engine/runtime/employer.ts, api/src/employer-link.ts); this only shows them.
import * as React from "react";
import { Building2, Info, RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi, useToast } from "@/lib/api";
import { Button, Notice, Panel, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tip, TipProvider } from "@/components/status";
import { StandIn } from "@/components/stand-in";

export type Linked = { from_case: string; to_case: string; label: string; kind: string; status: string; created_by: string; created_at: string; facts: string[] };
export type EmployerLink = { offered: boolean; reason: string; facts: string[]; linked?: Linked | null };
type FactLine = { fact: string; label: string; value: unknown; on: "principal" | "case"; subject_id: string; state: "new" | "same" | "different"; current: { answer_id: string; value: unknown } | null; problems: string[] };
type EmployerCases = { case_id: string; principal: string; offer: EmployerLink; stand_in: { id: `SI-${number}`; words: string }; linked: Linked | null; employer_cases: { key: string; label: string; facts: FactLine[] }[] };

const TIP = "Only for employer-specific work permits. Picks the employer case this worker's case relies on and copies the employer's name, address and LMIA or offer number into it once.";
const SI10 = { today: "one Sample employer case per firm; its facts are copied once.", later: "the team's AG-17 Corporate cases and LMIA." };
/** The date in the firm's time zone, as the server words it in its refusals (review m1: one link, one date). */
export const dateWords = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Toronto" });

/** A value as a person reads it: an address in its parts joined, anything else as text. */
export function valueWords(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v !== "object") return String(v);
  const a = v as Record<string, unknown>;
  const street = [a.apt_unit, a.street_number, a.street_name].filter(Boolean).join(" ");
  const parts = [street, a.city, [a.province, a.postal_code].filter(Boolean).join(" "), typeof a.country === "string" ? a.country.charAt(0).toUpperCase() + a.country.slice(1) : null].filter((x) => typeof x === "string" && x.trim());
  return parts.length ? parts.join(", ") : JSON.stringify(v);
}

export function EmployerLinkLine({ link, loading, error, caseId }: { link?: EmployerLink; loading?: boolean; error?: string; caseId?: string }) {
  const [open, setOpen] = React.useState(false), [focusLinked, setFocusLinked] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement>(null), linkedLine = React.useRef<HTMLParagraphElement>(null);
  const linked = link?.linked ?? null;
  // Review M1 (WCAG 2.4.3): once linked, the button that opened the drawer is gone; focus moves to the linked line.
  React.useEffect(() => { if (focusLinked && linked) { linkedLine.current?.focus(); setFocusLinked(false); } }, [focusLinked, linked]);
  return (
    <TipProvider>
    <div className="text-sm" data-testid="employer-link">
      <p className="flex flex-wrap items-center gap-1 font-medium">Relies on an employer case<Tip tip={TIP}><button type="button" aria-label="About: relies on an employer case" className="inline-flex rounded-sm text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Info className="size-3.5" aria-hidden /></button></Tip>
        {caseId && (link?.offered || linked) ? <StandIn id="SI-10" today={SI10.today} later={SI10.later} /> : null}</p>
      {loading ? <Skeleton className="mt-1 h-4 w-2/3" /> : error ? <p className="text-xs text-danger">{error}</p>
        : linked ? <p ref={linkedLine} tabIndex={-1} className="rounded-sm text-xs text-text-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" data-testid="employer-linked"><span className="font-medium text-text">{linked.label}</span> · {linked.facts.length ? `facts copied ${dateWords(linked.created_at)}; later changes there are not copied` : `linked ${dateWords(linked.created_at)}; nothing was copied (this case kept its own values)`}</p>
        : link ? <p className="text-xs text-text-muted">{link.reason}</p> : null}
      {caseId && link?.offered && !linked ? <Button ref={opener} className="mt-1.5" size="sm" variant="secondary" onClick={() => setOpen(true)}><Building2 aria-hidden />Choose employer case…</Button> : null}
      {open && caseId ? <EmployerCaseDrawer caseId={caseId} close={() => setOpen(false)} onLinked={() => setFocusLinked(true)} returnFocus={() => (opener.current?.isConnected ? opener.current : linkedLine.current)} /> : null}
    </div>
    </TipProvider>
  );
}

/** The "Open a case" line for the chosen combination (its newest release). */
export function EmployerLinkFor({ combinationId }: { combinationId?: string }) {
  const q = useApi<EmployerLink>(["runtime", "employer-link", combinationId ?? ""], combinationId ? `/runtime/combinations/${combinationId}/employer-link` : null);
  if (!combinationId) return null;
  return <EmployerLinkLine link={q.data} loading={q.isLoading} error={q.isError ? (q.error as Error).message : undefined} />;
}

const STATE: Record<FactLine["state"], { tone: string; words: string }> = { new: { tone: "info", words: "New" }, same: { tone: "ok", words: "Same as on this case" }, different: { tone: "warn", words: "Different" } };

/** Drawer (Side panel, EXPERIENCE §3): pick the employer case, see per fact what happens (New · Same · Different),
 *  choose for each Different whether to use the employer case's value, then copy once. */
function EmployerCaseDrawer({ caseId, close, onLinked, returnFocus }: { caseId: string; close: () => void; onLinked: () => void; returnFocus: () => HTMLElement | null }) {
  const q = useApi<EmployerCases>(["runtime", "employer-cases", caseId], `/runtime/cases/${caseId}/employer-cases`);
  const qc = useQueryClient(), toast = useToast();
  const [pick, setPick] = React.useState<string | null>(null), [replace, setReplace] = React.useState<string[]>([]);
  const [problem, setProblem] = React.useState<{ title: string; text: string; reload: boolean } | null>(null), [busy, setBusy] = React.useState(false);
  const list = q.data?.employer_cases ?? [], already = q.data?.linked ?? null;
  const chosen = list.find((e) => e.key === (pick ?? list[0]?.key));
  const writes = chosen ? chosen.facts.filter((f) => f.state === "new" || (f.state === "different" && replace.includes(f.fact))).length : 0;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] }), q.refetch()]);
  // One message per outcome (review m3): the refusal stays in the drawer, never also in a toast over its button.
  const submit = async () => {
    if (!chosen || busy) return;
    setProblem(null); setBusy(true);
    try {
      const r = await api<{ message: string }>(`/runtime/cases/${caseId}/employer-link`, { method: "POST", json: { employerCase: chosen.key, seen: Object.fromEntries(chosen.facts.map((f) => [f.fact, f.current?.answer_id ?? null])), replace } });
      toast.push({ tone: "ok", text: r.message });
      onLinked();
      void qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      close();
    } catch (e) {
      const conflict = e instanceof ApiError && e.status === 409;
      setProblem({ title: conflict && /Changed since you looked/.test((e as Error).message) ? "Changed since you looked" : "Not copied", text: (e as Error).message, reload: conflict });
    } finally { setBusy(false); }
  };
  const reload = async () => { setProblem(null); setReplace([]); await refresh(); };
  const primary = writes ? `Copy ${writes} fact${writes === 1 ? "" : "s"}` : "Link without copying";
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} returnFocus={returnFocus} title="Rely on an employer case" badge={<StandIn id="SI-10" today={SI10.today} later={SI10.later} />}
      description="The employer's facts this worker's forms read are copied once, now. Later changes on the employer case are not copied; edit a copied value on this case."
      footer={already ? <><span /><Button onClick={close}>Close</Button></> : <><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} disabled={!chosen || q.isLoading} onClick={() => void submit()}>{primary}</Button></>}>
      {q.isLoading ? <div className="space-y-2"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <Notice tone="danger" title="The employer cases could not be read">{(q.error as Error).message}</Notice>
        : already ? <Notice title="This case already relies on an employer case">{already.label}, linked {dateWords(already.created_at)}. Its facts were copied then; edit a copied value on this case.</Notice>
        : !list.length ? <Notice title="Your firm has no employer case yet">Today the demo has one Sample employer case per firm.</Notice>
        : <div className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium">Employer case</legend>
            <div className="mt-1.5 space-y-1">
              {list.map((e) => <label key={e.key} className="flex items-center gap-2 text-sm"><input type="radio" name="employer-case" checked={chosen?.key === e.key} onChange={() => { setPick(e.key); setReplace([]); setProblem(null); }} />{e.label}</label>)}
            </div>
          </fieldset>
          {chosen ? <section aria-labelledby="carried">
            <h3 id="carried" className="text-sm font-medium">Copied to {q.data!.principal}'s case once, now (the forms read {chosen.facts.length === 1 ? "this one" : `these ${chosen.facts.length}`})</h3>
            {chosen.facts.length ? <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {chosen.facts.map((f) => <li key={f.fact} className="space-y-1 px-3 py-2 text-sm" data-fact={f.fact} data-state={f.state}>
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1"><span className="w-36 shrink-0 text-text-muted">{f.label}</span><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{valueWords(f.value)}</span><Pill tone={STATE[f.state].tone}>{STATE[f.state].words}</Pill></div>
                {f.state === "different" ? <div className="ml-0 space-y-1 sm:ml-[9.75rem]"><p className="text-xs text-text-muted">On this case: <span className="text-text">{valueWords(f.current?.value)}</span>. It is kept unless you tick:</p>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={replace.includes(f.fact)} onChange={(e) => setReplace((r) => e.target.checked ? [...r, f.fact] : r.filter((x) => x !== f.fact))} />Use the employer case's value</label></div> : null}
                {f.problems.length ? <p className="text-xs text-danger">{f.problems[0]}</p> : null}
              </li>)}
            </ul> : <p className="mt-1 text-xs text-text-muted">This employer case holds none of the facts this worker's forms read.</p>}
            {chosen.facts.length && !writes ? <p className="mt-2 text-xs text-text-muted">{chosen.facts.some((f) => f.state === "different") ? "Nothing will be copied: you keep this case's own values. The link cannot be ended later, so tick a value now if the employer case's is right." : "Nothing needs copying: this case already has these values."}</p> : null}
          </section> : null}
          {problem ? <Notice tone="danger" title={problem.title}><p>{problem.text}</p>{problem.reload ? <Button className="mt-2" size="sm" variant="secondary" onClick={() => void reload()}><RotateCw aria-hidden />Reload</Button> : null}</Notice> : null}
        </div>}
    </Panel>
  );
}

/** The questionnaire's source label for a copied answer, shown beside its status, never instead of it (review m2). */
export const LINKED_FILE = "linked_file";
export function EmployerCaseSource({ at, label }: { at: string; label?: string | null }) {
  const words = `Copied from ${label ?? "the employer case this case relies on"} on ${dateWords(at)}. Changes there are not copied; edit it here if it is wrong.`;
  return <TipProvider><Tip tip={words}><button type="button" aria-label={`Source: employer case. ${words}`} className="inline-flex rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"><Pill tone="neutral"><Building2 className="size-3" aria-hidden />Employer case</Pill></button></Tip></TipProvider>;
}
