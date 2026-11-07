// C3.6 (P-158 (5)): "Add the fact this rule needs". Lists the facts this combination's conditions, rules and checks read
// that no form asks and the library lacks; for each, a person names the rule, gives the fact's name, meaning and answer
// type, and the rules write one proposal to To review › Proposals (no AI, US$0). The key is the one the rule reads.
import * as React from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, useSessionView } from "@/lib/api";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/controls";

type RuleRef = { kind: string; key: string; sentence: string };
type RuleFact = { fact: string; rules: { kind: string; key: string; sentence: string }[]; waitingProposal: string | null };
const TYPE_WORDS: Record<string, string> = { text: "Text", yes_no: "Yes or no", date: "Date", code: "A list to choose from", multi_choice: "Several from a list", country: "Country", address: "Address in parts", number: "Number", phone: "Phone", email: "Email" };

/** C3.6 (Lead, 2 Nov): a choice fact carries its answer values, one per line; the codes are built on the server. */
const CHOICE = new Set(["code", "multi_choice"]);
const valuesOf = (t: string, text: string) => (CHOICE.has(t) ? { values: text.split("\n").map((v) => v.trim()).filter(Boolean) } : {});
function ValuesField({ valueType, text, onChange }: { valueType: string; text: string; onChange: (t: string) => void }) {
  if (!CHOICE.has(valueType)) return null;
  return <Field label="Answer values, one per line" className="sm:col-span-2"><Textarea data-answer-values rows={4} value={text} maxLength={90000} onChange={(e) => onChange(e.target.value)} placeholder={"Both parents\nOne parent\nAnother adult\nAlone"} /></Field>;
}

export function RuleFacts({ combinationId }: { combinationId: string }) {
  const q = useQuery<{ facts: RuleFact[]; types: string[]; rules?: RuleRef[]; subjects?: string[] }>({ queryKey: ["rule-facts", combinationId], queryFn: () => api(`/combinations/${combinationId}/rule-facts`) });
  const { canAuthor } = useSessionView();
  const facts = q.data?.facts ?? [], rules = q.data?.rules ?? [];
  if (!facts.length && !(canAuthor && rules.length)) return null;
  return (
    <section aria-labelledby="rf-h" className="space-y-2 rounded-lg border border-border p-3" data-rule-facts>
      <h3 id="rf-h" className="text-sm font-semibold">Facts a rule needs that no form asks{facts.length ? ` · ${facts.length}` : ""}</h3>
      <p className="text-xs text-text-muted">A fact enters the library only from a source. These are read by a rule here but are not in the library yet: name the rule, say what the fact means, and it goes to To review as a proposal (no AI, US$0). Sample until the immigration expert confirms.</p>
      {facts.length ? <ul className="space-y-2">{facts.map((f) => <FactRow key={f.fact} combinationId={combinationId} f={f} types={q.data?.types ?? []} canAuthor={canAuthor} />)}</ul> : null}
      {canAuthor && rules.length ? <NewFact combinationId={combinationId} rules={rules} types={q.data?.types ?? []} subjects={q.data?.subjects ?? ["person"]} /> : null}
    </section>
  );
}

function FactRow({ combinationId, f, types, canAuthor }: { combinationId: string; f: RuleFact; types: string[]; canAuthor: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  const [rule, setRule] = React.useState(f.rules[0]?.key ?? ""), [label, setLabel] = React.useState(""), [meaning, setMeaning] = React.useState(""), [valueType, setType] = React.useState(""), [valuesText, setValues] = React.useState("");
  const [work, setWork] = React.useState(false);
  const id = `rf-${f.fact.replace(/[^a-z0-9]+/g, "-")}`;
  const add = async () => {
    setBusy(true); setErr(null);
    try { await api(`/combinations/${combinationId}/rule-facts`, { method: "POST", json: { fact: f.fact, rule, label, meaning, valueType, ...valuesOf(valueType, valuesText) } }); setOpen(false); await qc.invalidateQueries({ queryKey: ["rule-facts", combinationId] }); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-rule-fact="${f.fact}"] a`)?.focus()); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <li className="space-y-1 rounded-md border border-border p-2 text-sm" data-rule-fact={f.fact}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-words"><span className="font-medium">{f.rules[0]?.sentence}</span>{f.rules.length > 1 ? <span className="text-text-muted"> (and {f.rules.length - 1} more)</span> : null}<span className="block break-all text-xs text-text-muted">reads {f.fact}</span></span>
        {f.waitingProposal ? <Link className="text-xs text-text-link underline" to="/review/proposals">Proposed: waits on To review › Proposals</Link>
          : !canAuthor ? <span className="text-xs text-text-muted">The configuration author adds it</span>
          : <span className="flex flex-wrap gap-1.5"><Button size="sm" variant="secondary" aria-expanded={open} aria-controls={id} onClick={() => { setOpen((o) => !o); setWork(false); }}>Add the fact this rule needs</Button>
            <Button size="sm" variant="ghost" aria-expanded={work} aria-controls={`${id}-wo`} onClick={() => { setWork((o) => !o); setOpen(false); }} data-work-out={f.fact}>Work it out instead</Button></span>}
      </div>
      {work && !f.waitingProposal ? <WorkOut id={`${id}-wo`} combinationId={combinationId} fact={f.fact} /> : null}
      {open && !f.waitingProposal ? (
        <div id={id} className="grid gap-2 pt-1 sm:grid-cols-2">
          {f.rules.length > 1 ? <Field label="The rule that needs it"><Select value={rule} onChange={(e) => setRule(e.target.value)}>{f.rules.map((r) => <option key={r.key} value={r.key}>{r.sentence}</option>)}</Select></Field> : null}
          <Field label="Name a person reads"><Input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="Answer type"><Select value={valueType} onChange={(e) => setType(e.target.value)}><option value="">Choose…</option>{types.map((t) => <option key={t} value={t}>{TYPE_WORDS[t] ?? t}</option>)}</Select></Field>
          <Field label="What it means" className="sm:col-span-2"><Input value={meaning} maxLength={500} onChange={(e) => setMeaning(e.target.value)} /></Field>
          <ValuesField valueType={valueType} text={valuesText} onChange={setValues} />
          <div className="sm:col-span-2"><Button size="sm" busy={busy} onClick={() => void add()}>Propose it · US$0</Button></div>
          {err ? <p role="alert" className="text-sm text-text-danger sm:col-span-2">{err}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

type WorkChoices = { calculations: { key: string; words: string }[]; from: { key: string; label: string; subject: string }[]; on: { key: string; label: string }[] };
/** B102 (A6, concept screens/A6-age-on-application-date): a fact a rule reads is worked out from library dates instead of
 *  asked (a person's age in whole years from the date of birth on the application date). The choices and every refusal
 *  are the server's (api/src/worked-out.ts); the key is the one the rule reads. */
function WorkOut({ id, combinationId, fact }: { id: string; combinationId: string; fact: string }) {
  const qc = useQueryClient();
  const q = useQuery<WorkChoices>({ queryKey: ["rule-facts", combinationId, "worked-out"], queryFn: () => api(`/combinations/${combinationId}/rule-facts/worked-out`) });
  const subject = fact.split(".")[0];
  const from = (q.data?.from ?? []).filter((d) => d.subject === subject), on = q.data?.on ?? [];
  const [calc, setCalc] = React.useState(""), [fromKey, setFrom] = React.useState(""), [onKey, setOn] = React.useState(""), [plain, setPlain] = React.useState(""), [touched, setTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  // Defaults from what the library holds: the first calculation, a date of birth about the same subject, an application date.
  const c = calc || q.data?.calculations[0]?.key || "", fk = fromKey || from.find((d) => /birth/i.test(d.key))?.key || "", ok = onKey || on.find((d) => /application/i.test(d.key))?.key || "";
  const onLabel = on.find((d) => d.key === ok)?.label;
  const words = touched ? plain : c === "age_in_years" && onLabel ? `The person's age in whole years on the ${onLabel.toLowerCase()}.` : plain;
  const save = async () => {
    setBusy(true); setErr(null);
    try { await api(`/combinations/${combinationId}/rule-facts/${encodeURIComponent(fact)}/worked-out`, { method: "POST", json: { calculation: c, from: fk, on: ok, plain: words } }); await qc.invalidateQueries({ queryKey: ["rule-facts", combinationId] }); }
    catch (e) { setErr((e as Error).message); requestAnimationFrame(() => document.getElementById(`${id}-err`)?.focus()); } finally { setBusy(false); }
  };
  if (q.isLoading) return <p id={id} className="text-xs text-text-muted">Loading the dates the library holds…</p>;
  if (q.isError) return <p id={id} role="alert" className="text-sm text-text-danger">{(q.error as Error).message}</p>;
  return (
    <div id={id} className="grid gap-2 pt-1 sm:grid-cols-2" data-work-out-form={fact}>
      <p className="text-xs text-text-muted sm:col-span-2">Worked out from answers the case already has, never asked. It reaches cases with the next approved release (no AI, US$0; Sample).</p>
      <Field label="Worked out as"><Select value={c} onChange={(e) => setCalc(e.target.value)}>{(q.data?.calculations ?? []).map((x) => <option key={x.key} value={x.key}>{x.words}</option>)}</Select></Field>
      <Field label="From"><Select value={fk} onChange={(e) => setFrom(e.target.value)}><option value="">Choose a date…</option>{from.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select></Field>
      <Field label="On">{on.length ? <Select value={ok} onChange={(e) => setOn(e.target.value)}><option value="">Choose a date about the case…</option>{on.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Select>
        : <p className="text-xs text-text-warn" data-no-case-date>No date about the case in the library yet: add it first with "Add a fact a rule needs" below (for example "Application date", about the case, a date).</p>}</Field>
      <Field label="In words"><Input value={words} maxLength={300} onChange={(e) => { setTouched(true); setPlain(e.target.value); }} /></Field>
      <div className="sm:col-span-2"><Button size="sm" busy={busy} disabled={!on.length} onClick={() => void save()}>Work it out · US$0</Button></div>
      {err ? <p id={`${id}-err`} tabIndex={-1} role="alert" className="text-sm text-text-danger sm:col-span-2">{err}</p> : null}
    </div>
  );
}

const SUBJECT_WORDS: Record<string, string> = { person: "A person in the application", case: "The case", application: "The application", sponsor: "The sponsor", employer: "The employer" };

/** C3.6 (Day-0 acceptance): name a rule and say the new fact in words; the system builds the key (never typed). */
function NewFact({ combinationId, rules, types, subjects }: { combinationId: string; rules: RuleRef[]; types: string[]; subjects: string[] }) {
  const [open, setOpen] = React.useState(false), [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null), [done, setDone] = React.useState<string | null>(null);
  const [rule, setRule] = React.useState(rules[0]?.key ?? ""), [label, setLabel] = React.useState(""), [meaning, setMeaning] = React.useState(""), [valueType, setType] = React.useState(""), [valuesText, setValues] = React.useState(""), [subject, setSubject] = React.useState(subjects[0] ?? "person"), [nearReason, setNear] = React.useState("");
  const [near, setNearAsked] = React.useState(false);
  const add = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ key: string }>(`/combinations/${combinationId}/rules/${encodeURIComponent(rule)}/fact`, { method: "POST", json: { label, meaning, valueType, subject, ...valuesOf(valueType, valuesText), ...(near && nearReason.trim() ? { nearReason } : {}) } });
      setDone(`Proposed (key ${r.key} when accepted as it stands): it waits on To review › Proposals (not meaning-checked; a second person approves it).`); setOpen(false); setLabel(""); setMeaning(""); setNear(""); setNearAsked(false);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-new-fact-done] a")?.focus());
    } catch (e) { const m = (e as Error).message; setErr(m); const isNear = /is close to/.test(m); if (isNear) setNearAsked(true);
      // m2 (review c36 r2): focus goes to the reason field when it is asked for, else to the message.
      requestAnimationFrame(() => (isNear ? document.querySelector<HTMLElement>("[data-near-reason]") : document.getElementById("rf-new-err"))?.focus()); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2 border-t border-border pt-2 text-sm" data-new-fact>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-text-muted">A rule here needs a fact the library doesn't have? Name the rule and say the fact in words.</span>
        <Button size="sm" variant="secondary" aria-expanded={open} aria-controls="rf-new" onClick={() => { setOpen((o) => !o); setDone(null); }}>Add a fact a rule needs</Button>
      </div>
      {done ? <p className="text-xs" data-new-fact-done role="status">{done} <Link className="text-text-link underline" to="/review/proposals">Open Proposals</Link></p> : null}
      {open ? (
        <div id="rf-new" className="grid gap-2 sm:grid-cols-2">
          <Field label="The rule that needs it" className="sm:col-span-2"><Select value={rule} onChange={(e) => setRule(e.target.value)}>{rules.map((r) => <option key={`${r.kind}:${r.key}`} value={r.key}>{r.sentence}</option>)}</Select></Field>
          <Field label="Name a person reads"><Input value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field label="About whom"><Select value={subject} onChange={(e) => setSubject(e.target.value)}>{subjects.map((s) => <option key={s} value={s}>{SUBJECT_WORDS[s] ?? s}</option>)}</Select></Field>
          <Field label="Answer type"><Select value={valueType} onChange={(e) => setType(e.target.value)}><option value="">Choose…</option>{types.map((t) => <option key={t} value={t}>{TYPE_WORDS[t] ?? t}</option>)}</Select></Field>
          <Field label="What it means"><Input value={meaning} maxLength={500} onChange={(e) => setMeaning(e.target.value)} /></Field>
          <ValuesField valueType={valueType} text={valuesText} onChange={setValues} />
          {near ? <Field label="Why it is not the same as the close field" className="sm:col-span-2"><Input data-near-reason value={nearReason} maxLength={300} onChange={(e) => setNear(e.target.value)} /></Field> : null}
          <div className="sm:col-span-2"><Button size="sm" busy={busy} onClick={() => void add()}>Propose it · US$0</Button></div>
          {err ? <p id="rf-new-err" tabIndex={-1} role="alert" className="text-sm text-text-danger sm:col-span-2">{err}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
