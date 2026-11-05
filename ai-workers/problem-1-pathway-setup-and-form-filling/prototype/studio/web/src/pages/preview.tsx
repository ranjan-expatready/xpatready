import * as React from "react";
import { ChevronDown, ChevronRight, Download, FileCheck2, RotateCcw } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill, Select, Stat, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ONLINE_LATER } from "../../../contracts/forms";
import { inSentence } from "../../../contracts/runtime";

const COV: Record<string, [string, string]> = {
  "confirmed fact": ["ok", "bg-ok"], "answered on screen": ["info", "bg-primary"], "document reading": ["ai", "bg-[#7c3aed]"], "client question": ["info", "bg-primary/50"],
  "client profile": ["neutral", "bg-text-muted/50"], "staff working view": ["neutral", "bg-text-muted/30"], unresolved: ["danger", "bg-danger"],
};
const APPLIES = (a: any) => (a === true ? <Pill tone="ok">Applies</Pill> : a === false ? <Pill>Does not apply</Pill> : <Pill tone="warn">Cannot tell yet</Pill>);
const TABS = [["questions", "Smart questionnaire (SQR)"], ["documents", "Document checklist"], ["forms", "Forms and coverage"], ["rules", "Rules and checks"]] as const;
const participantCountLabel = (role: string, label: string) => role === "spouse_or_partner" ? "Spouses or partners travelling" : role === "child" ? "Children travelling" : `${label} count`;

export function PreviewTab({ d }: { d: any }) {
  const id = d.combination.id;
  const hasRelease = d.releases.length > 0;
  const [mode, setMode] = React.useState<"draft" | "release">(hasRelease && !d.draft.changes.length ? "release" : "draft");
  const [profile, setProfile] = React.useState("client-a-family");
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [people, setPeople] = React.useState<Record<string, number>>({});
  const [tab, setTab] = React.useState<(typeof TABS)[number][0]>("questions");
  const qs = new URLSearchParams({ mode, profile, answers: JSON.stringify(answers), people: JSON.stringify(people) });
  const v = useApi<any>(["preview", id, mode, profile, answers, people], `/combinations/${id}/preview?${qs}`, { placeholderData: (p: any) => p });
  const answer = (about: string, fact: string, value: any) => setAnswers((a) => ({ ...a, [`${about}|${fact}`]: value }));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-border bg-surface-raised p-4 shadow-sm sm:grid-cols-2">
        <label className="min-w-0 text-xs">Configuration<Select className="mt-1 w-full" value={mode} onChange={(e) => setMode(e.target.value as any)}><option value="draft">Draft preview (not released)</option><option value="release" disabled={!hasRelease}>Released version {d.releases[0]?.version ?? ""}</option></Select></label>
        <label className="min-w-0 text-xs">Known facts<Select className="mt-1 w-full" value={profile} onChange={(e) => setProfile(e.target.value)}><option value="client-a-family">Client A family (existing sample record)</option><option value="none">No facts yet (a new, empty case)</option></Select></label>
        <div className="flex flex-wrap items-end gap-4 sm:col-span-2">
          {d.combination.participants.filter((p: any) => p.max > p.min || p.max > 1).map((p: any) => (
            <label key={p.role} className="text-xs">{participantCountLabel(p.role, p.label)}<Select className="mt-1 w-24" value={people[p.role] ?? p.preview ?? p.min} onChange={(e) => setPeople((x) => ({ ...x, [p.role]: Number(e.target.value) }))}>{Array.from({ length: p.max - p.min + 1 }, (_, i) => p.min + i).map((n) => <option key={n} value={n}>{n}</option>)}</Select></label>
          ))}
          {Object.keys(answers).length ? <Button size="sm" variant="ghost" onClick={() => setAnswers({})}><RotateCcw /> Clear {Object.keys(answers).length} on-screen answer{Object.keys(answers).length > 1 ? "s" : ""}</Button> : null}
          <div className="ml-auto text-right text-xs text-text-muted">{v.data ? <Pill tone={v.data.mode === "release" ? "ok" : "warn"}>{v.data.label}</Pill> : null}{v.isFetching ? <Spinner className="ml-2" label="Updating" /> : null}</div>
        </div>
      </div>
      {v.isError ? <Notice tone="danger" title="Preview failed">{(v.error as Error).message}</Notice> : null}
      {!v.data ? <Spinner label="Rendering" /> : <Rendered v={v.data} tab={tab} setTab={setTab} answer={answer} id={id} mode={mode} profile={profile} />}
    </div>
  );
}

function Rendered({ v, tab, setTab, answer, id, mode, profile }: { v: any; tab: string; setTab: (t: any) => void; answer: (a: string, f: string, x: any) => void; id: string; mode: string; profile: string }) {
  const s = v.summary;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Forms" value={s.forms_applying} sub={`${s.forms_undecided} undecided · ${s.forms_not_applying} not applying`} />
        <Stat label="Documents needed" value={s.documents_needed} sub={`${s.documents_undecided} depend on an answer`} />
        <Stat label="Questions to ask" value={s.questions_to_ask} sub={`${s.questions_answered} already known`} />
        <Stat label="Deciding questions" value={s.deciding_questions} sub="answers that change what applies" tone={s.deciding_questions ? "warn" : undefined} />
        <Stat label="Checks triggered" value={s.triggered_checks} sub="by the known facts" tone={s.triggered_checks ? "warn" : undefined} />
      </div>
      <div className="flex gap-1 border-b border-border">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("border-b-2 px-3 py-2 text-sm", tab === k ? "border-primary font-medium" : "border-transparent text-text-muted hover:text-text")}>{l}</button>)}</div>
      {tab === "questions" ? <Questions v={v} answer={answer} /> : tab === "documents" ? <Checklist v={v} answer={answer} /> : tab === "forms" ? <Forms v={v} id={id} mode={mode} profile={profile} /> : <RulesChecks v={v} />}
    </>
  );
}

function AnswerInput({ q, answer }: { q: any; answer: (a: string, f: string, x: any) => void }) {
  const [val, setVal] = React.useState("");
  const commit = (x: any) => answer(q.about, q.fact, x);
  if (q.value_type === "yes_no") return <Select className="h-8 w-28" defaultValue="" onChange={(e) => commit(e.target.value === "" ? "" : e.target.value === "true")} aria-label={`Answer for ${inSentence(q.about_label)}: ${q.label}`}><option value="">answer…</option><option value="true">Yes</option><option value="false">No</option></Select>;
  return <form onSubmit={(e) => { e.preventDefault(); commit(q.value_type === "number" ? Number(val) : val); }} className="flex gap-1"><Input className="h-8 w-40" type={q.value_type === "date" ? "date" : "text"} value={val} onChange={(e) => setVal(e.target.value)} placeholder="answer…" aria-label={`Answer for ${inSentence(q.about_label)}: ${q.label}`} /><Button size="sm" variant="secondary" type="submit">Set</Button></form>;
}

function Questions({ v, answer }: { v: any; answer: (a: string, f: string, x: any) => void }) {
  const [person, setPerson] = React.useState<string>("all");
  const [scope, setScope] = React.useState<"client" | "all">("client");
  const qs = (v.questions as any[]).filter((q) => (person === "all" || q.about === person || q.about.startsWith(`${person}/`)) && (scope === "all" || q.collected_from === "client_questionnaire"));
  const deciding = qs.filter((q) => q.decides.length && q.status !== "confirmed" && q.status !== "answered");
  const sections = [...new Set(qs.map((q) => q.section_title))];
  const [open, setOpen] = React.useState<string | null>(null);
  const [allDeciding, setAllDeciding] = React.useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-60" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Whose questions">{[{ id: "all", label: "Everyone" }, ...v.people].map((p: any) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select>
        <Select className="w-72" value={scope} onChange={(e) => setScope(e.target.value as any)} aria-label="Which questions"><option value="client">Client questionnaire only</option><option value="all">Also staff, profile and document fields</option></Select>
        <p className="text-xs text-text-muted">{qs.length} items. Answers typed here change the preview only; they are not saved.</p>
      </div>
      {deciding.length ? (
        <div className="rounded-xl border border-warn/50 bg-surface-raised p-4">
          <p className="font-medium">Answers that decide what applies ({deciding.length})</p>
          <p className="text-xs text-text-muted">Until these are answered some forms or documents show "cannot tell yet". A question can exist only to drive a rule.</p>
          <div className="mt-2 divide-y divide-border">{deciding.slice(0, allDeciding ? undefined : 12).map((q) => <div key={`${q.about}|${q.fact}`} className="flex flex-wrap items-center justify-between gap-2 py-2"><div className="min-w-0"><p className="text-sm">{q.label} <span className="text-xs text-text-muted">· {q.about_label}</span>{q.rule_only ? <Pill tone="warn" className="ml-1" title="No PDF form field reads it; it only drives a condition">rule only</Pill> : null}</p><p className="text-xs text-text-muted">{q.decides.slice(0, 2).join("; ")}</p></div><AnswerInput q={q} answer={answer} /></div>)}</div>
          {deciding.length > 12 ? <Button size="sm" variant="ghost" className="mt-1" onClick={() => setAllDeciding(!allDeciding)}>{allDeciding ? "Show fewer" : `Show all ${deciding.length}`}</Button> : null}
        </div>
      ) : null}
      {sections.map((sec) => { const list = qs.filter((q) => q.section_title === sec); const todo = list.filter((q) => q.status === "needs an answer" || q.status === "may be needed").length; const isOpen = open === sec; return (
        <div key={sec} className="rounded-xl border border-border bg-surface-raised">
          <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : sec)} aria-expanded={isOpen}><span className="flex items-center gap-2">{isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}<span className="font-medium">{sec}</span></span><span className="flex gap-1"><Pill>{list.length} items</Pill>{todo ? <Pill tone="warn">{todo} to ask</Pill> : <Pill tone="ok">complete</Pill>}</span></button>
          {isOpen ? <Table dense className="rounded-none border-x-0 border-b-0" head={["Question", "About", "Status", "Value or why"]}>{list.map((q) => <tr key={`${q.about}|${q.fact}`}><td className="max-w-md"><p>{q.label}</p><p className="mono text-text-muted">{q.fact}{q.rows.length ? ` · rows ${q.rows.map((r: number) => r + 1).join(", ")}` : ""}</p></td><td className="text-xs">{q.about_label}</td><td><StatusQ s={q.status} /></td><td className="max-w-md text-xs">{q.value !== undefined ? <b>{typeof q.value === "object" ? JSON.stringify(q.value) : String(q.value)}</b> : q.status === "needs an answer" || q.status === "may be needed" ? <AnswerInput q={q} answer={answer} /> : null}<p className="text-text-muted">{q.why}</p></td></tr>)}</Table> : null}
        </div>); })}
      {!qs.length ? <Notice>No questions for this selection.</Notice> : null}
    </div>
  );
}
function StatusQ({ s }: { s: string }) { const t: Record<string, string> = { confirmed: "ok", answered: "info", "needs an answer": "warn", "may be needed": "neutral", "hidden by a condition": "neutral" }; return <Pill tone={t[s]}>{s}</Pill>; }

function Checklist({ v }: { v: any; answer: any }) {
  const rows = v.checklist as any[];
  return (
    <Table head={["Document", "Whose", "Status", "Why"]}>
      {rows.map((r, i) => <tr key={i}><td className="max-w-sm"><p className="font-medium">{r.requirement}</p><Pill>{r.base_or_conditional}</Pill>{r.origin === "HUMAN" ? <Pill tone="info" className="ml-1">edited by a person</Pill> : r.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI-proposed</Pill> : null}{r.item_status === "DRAFT" ? <Pill tone="warn" className="ml-1">draft</Pill> : null}</td><td className="text-xs">{r.person_label}</td><td><Pill tone={r.status === "Needed" ? "warn" : r.status === "Not needed" ? "neutral" : "info"}>{r.status}</Pill></td><td className="max-w-lg text-xs">{r.why}{r.missing.length ? <p className="text-text-warn">waiting for: {r.missing.join(", ")}</p> : null}{r.source_quote ? <p className="mt-1 text-text-muted">"{r.source_quote.slice(0, 140)}{r.source_quote.length > 140 ? "…" : ""}"</p> : <p className="mt-1 text-text-warn">no source quote</p>}</td></tr>)}
      {!rows.length ? <tr><td colSpan={4} className="text-text-muted">No document requirements configured.</td></tr> : null}
    </Table>
  );
}

function Forms({ v, id, mode, profile }: { v: any; id: string; mode: string; profile: string }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any>(null);
  const fill = useAction((b: any) => api(`/combinations/${id}/fill`, { method: "POST", json: { ...b, mode, profile } }), { success: (r: any) => `${r.form} filled: ${r.report.read_back_equal}/${r.report.written} values read back, ${r.report.intact ? "file intact" : "NOT intact"}`, onDone: setResult });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs">{Object.entries(COV).map(([k, [, bar]]) => <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-sm", bar)} />{k}</span>)}</div>
      {v.forms.map((f: any) => { const c = v.coverage.find((x: any) => x.form === f.form && x.person === f.person); const key = `${f.form}|${f.person}`; const total = c ? c.boxes.length : 0; return (
        <div key={key} className="rounded-xl border border-border bg-surface-raised">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key} disabled={!c}>{c ? (open === key ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />) : <span className="size-4" />}<span><span className="font-medium">{f.form}</span> <span className="text-xs text-text-muted">{f.title} · {f.person_label}</span></span></button>
            {APPLIES(f.applies)}
            <span className="max-w-sm truncate text-xs text-text-muted" title={f.why}>{f.why}{f.missing.length ? ` (waiting for ${f.missing.join(", ")})` : ""}</span>
            {c && total ? <div className="flex h-2 w-48 overflow-hidden rounded-full bg-surface" title={Object.entries(c.counts).map(([k, n]) => `${k}: ${n}`).join(" · ")}>{Object.entries(COV).map(([k, [, bar]]) => (c.counts[k] ? <span key={k} className={bar} style={{ width: `${(100 * c.counts[k]) / total}%` }} /> : null))}</div> : null}
            {c && c.edition && (v.online_forms ?? []).includes(f.form) ? <span className="text-xs text-text-muted" data-online-later title="This form is filed Online: the product fills it once the browser extension returns. File it as a PDF upload to fill its PDF.">{ONLINE_LATER}</span> : c && c.edition ? <Button size="sm" variant="secondary" onClick={() => fill.mutate({ form: f.form, person: f.person })} busy={fill.isPending && fill.variables?.form === f.form && fill.variables?.person === f.person} disabled={!c.counts["confirmed fact"]} title="Writes confirmed facts into a copy of the official PDF and reads them back"><FileCheck2 /> Fill PDF from confirmed facts</Button> : f.form_kind === "document" ? <Pill>document, not filled</Pill> : null}
          </div>
          {open === key && c ? (
            <div className="border-t border-border px-4 py-3">
              <p className="mb-2 text-xs text-text-muted">{c.edition}: {c.mapped} mapped form fields, {c.unresolved_boxes} form fields unresolved in the map. {Object.entries(c.counts).map(([k, n]) => `${n} ${k}`).join(" · ")}</p>
              <Table dense head={["Form field", "Field", "Whose value", "Comes from", "Detail"]}>{c.boxes.slice(0, 400).map((b: any) => <tr key={b.box + (b.row ?? "")}><td className="max-w-56 text-xs">{b.caption || <span className="mono">{b.box.split(".").slice(-2).join(".")}</span>}</td><td className="mono max-w-56 text-xs">{b.fact ?? "—"}{b.origin === "AI_PROPOSAL" ? <Pill tone="ai" className="ml-1">AI</Pill> : null}</td><td className="text-xs">{b.about_label}</td><td><Pill tone={COV[b.coverage]?.[0]}>{b.coverage}</Pill></td><td className="max-w-md text-xs text-text-muted">{b.value !== undefined ? <b className="text-text">{typeof b.value === "object" ? JSON.stringify(b.value) : String(b.value)} </b> : null}{b.detail}</td></tr>)}</Table>
            </div>
          ) : null}
        </div>); })}
      {result ? <FillResult r={result} onClose={() => setResult(null)} /> : null}
    </div>
  );
}

function FillResult({ r, onClose }: { r: any; onClose: () => void }) {
  const rep = r.report;
  const ok = rep.intact;
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title={`${r.form} for ${r.person_label}: filled and checked`} description={`${r.label} · configuration ${r.configuration_sha256.slice(0, 12)} · only confirmed facts are written`} footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button asChild><a href={`/api/artifacts/${r.artifact_id}/file`}><Download /> Download the checked PDF</a></Button></>}>
      <div className="space-y-3">
        <Notice tone={ok ? "ok" : "danger"} title={ok ? "The file is intact and every written value reads back" : "The file did not pass every check"}>Written {rep.written} values; read back equal {rep.read_back_equal}; other form data changed: {rep.other_data_leaves_changed ? "yes" : "none"}; original bytes kept: {rep.original_bytes_kept ? "yes" : "no"}; IRCC signatures: {Object.entries(rep.signatures ?? {}).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}; PDF syntax errors: {rep.poppler_syntax_errors}.</Notice>
        <div className="grid grid-cols-4 gap-3"><Stat label="Written" value={r.counts.written} tone="ok" /><Stat label="By hand" value={r.counts.by_hand} sub="format not executable" tone={r.counts.by_hand ? "warn" : undefined} /><Stat label="Blank" value={r.counts.blank} /><Stat label="Not written" value={r.counts.not_written} sub="no confirmed fact yet" /></div>
        <Table dense head={["Form field", "Field", "Result", "Value or reason"]}>{r.boxes.filter((b: any) => b.result !== "not written").slice(0, 120).map((b: any) => <tr key={b.box + (b.row ?? "")}><td className="max-w-56 text-xs">{b.caption || b.box.split(".").slice(-2).join(".")}</td><td className="mono text-xs">{b.fact}</td><td><Pill tone={b.result === "written" ? "ok" : b.result === "by hand" || b.result === "not on this form" ? "warn" : "neutral"}>{b.result}</Pill></td><td className="text-xs">{b.written ?? b.why}</td></tr>)}</Table>
        <p className="text-xs text-text-muted">Government acceptance is never proven by this check; validation in Adobe and barcode behaviour were shown separately in P1 for IMM 1295.</p>
      </div>
    </Dialog>
  );
}

function RulesChecks({ v }: { v: any }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div><p className="mb-2 font-medium">Rules ({v.rules.length})</p><Table dense head={["Rule", "Result"]}>{v.rules.map((r: any) => <tr key={r.id}><td className="max-w-sm text-xs">{r.then}<p className="text-text-muted">{r.when_plain}</p></td><td className="text-xs">{r.results.map((x: any) => <div key={x.person} className="flex items-center gap-1">{x.person_label}: {x.applies === true ? <Pill tone="ok">yes</Pill> : x.applies === false ? <Pill>no</Pill> : <Pill tone="warn">cannot tell</Pill>}</div>)}</td></tr>)}</Table></div>
      <div><p className="mb-2 font-medium">Checks triggered by the known facts ({v.checks.length})</p>{v.checks.length ? <Table dense head={["Check", "For", "Severity", "Message"]}>{v.checks.map((c: any, i: number) => <tr key={i}><td className="mono text-xs">{c.id}</td><td className="text-xs">{c.person_label}</td><td><Pill tone={c.severity === "block" ? "danger" : "warn"}>{c.severity}</Pill></td><td className="max-w-md text-xs">{c.message}</td></tr>)}</Table> : <Notice>No check fires on the known facts.</Notice>}</div>
    </div>
  );
}
