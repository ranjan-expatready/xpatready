// C3.6 (P-158 (5)): "Add the fact this rule needs". Lists the facts this combination's conditions, rules and checks read
// that no form asks and the library lacks; for each, a person names the rule, gives the fact's name, meaning and answer
// type, and the rules write one proposal to To review › Proposals (no AI, US$0). The key is the one the rule reads.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useSessionView } from "@/lib/api";
import { Button, Field, Input, Select } from "@/components/ui/controls";

type RuleFact = { fact: string; rules: { kind: string; key: string; sentence: string }[]; waitingProposal: string | null };
const TYPE_WORDS: Record<string, string> = { text: "Text", yes_no: "Yes or no", date: "Date", code: "A list to choose from", country: "Country", address: "Address in parts", number: "Number", phone: "Phone", email: "Email" };

export function RuleFacts({ combinationId }: { combinationId: string }) {
  const q = useQuery<{ facts: RuleFact[]; types: string[] }>({ queryKey: ["rule-facts", combinationId], queryFn: () => api(`/combinations/${combinationId}/rule-facts`) });
  const { canAuthor } = useSessionView();
  const facts = q.data?.facts ?? [];
  if (!facts.length) return null;
  return (
    <section aria-labelledby="rf-h" className="space-y-2 rounded-lg border border-border p-3" data-rule-facts>
      <h3 id="rf-h" className="text-sm font-semibold">Facts a rule needs that no form asks · {facts.length}</h3>
      <p className="text-xs text-text-muted">A fact enters the library only from a source. These are read by a rule here but are not in the library yet: name the rule, say what the fact means, and it goes to To review as a proposal (no AI, US$0). Sample until the immigration expert confirms.</p>
      <ul className="space-y-2">{facts.map((f) => <FactRow key={f.fact} combinationId={combinationId} f={f} types={q.data?.types ?? []} canAuthor={canAuthor} />)}</ul>
    </section>
  );
}

function FactRow({ combinationId, f, types, canAuthor }: { combinationId: string; f: RuleFact; types: string[]; canAuthor: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  const [rule, setRule] = React.useState(f.rules[0]?.key ?? ""), [label, setLabel] = React.useState(""), [meaning, setMeaning] = React.useState(""), [valueType, setType] = React.useState("");
  const id = `rf-${f.fact.replace(/[^a-z0-9]+/g, "-")}`;
  const add = async () => {
    setBusy(true); setErr(null);
    try { await api(`/combinations/${combinationId}/rule-facts`, { method: "POST", json: { fact: f.fact, rule, label, meaning, valueType } }); setOpen(false); await qc.invalidateQueries({ queryKey: ["rule-facts", combinationId] }); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-rule-fact="${f.fact}"] a`)?.focus()); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <li className="space-y-1 rounded-md border border-border p-2 text-sm" data-rule-fact={f.fact}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-words"><span className="font-medium">{f.rules[0]?.sentence}</span>{f.rules.length > 1 ? <span className="text-text-muted"> (and {f.rules.length - 1} more)</span> : null}<span className="block break-all text-xs text-text-muted">reads {f.fact}</span></span>
        {f.waitingProposal ? <Link className="text-xs text-text-link underline" to="/review/proposals">Proposed: waits on To review › Proposals</Link>
          : !canAuthor ? <span className="text-xs text-text-muted">The configuration author adds it</span>
          : <Button size="sm" variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>Add the fact this rule needs</Button>}
      </div>
      {open && !f.waitingProposal ? (
        <div id={id} className="grid gap-2 pt-1 sm:grid-cols-2">
          {f.rules.length > 1 ? <Field label="The rule that needs it"><Select value={rule} onChange={(e) => setRule(e.target.value)}>{f.rules.map((r) => <option key={r.key} value={r.key}>{r.sentence}</option>)}</Select></Field> : null}
          <Field label="Name a person reads"><Input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Answer type"><Select value={valueType} onChange={(e) => setType(e.target.value)}><option value="">Choose…</option>{types.map((t) => <option key={t} value={t}>{TYPE_WORDS[t] ?? t}</option>)}</Select></Field>
          <Field label="What it means" className="sm:col-span-2"><Input value={meaning} maxLength={500} onChange={(e) => setMeaning(e.target.value)} /></Field>
          <div className="sm:col-span-2"><Button size="sm" busy={busy} onClick={() => void add()}>Propose it · US$0</Button></div>
          {err ? <p role="alert" className="text-sm text-text-danger sm:col-span-2">{err}</p> : null}
        </div>
      ) : null}
    </li>
  );
}
