// Screen 03 Forms tab (S1): the filing method and portal strip, then one row per form line — Form · Who and copies · Only
// if · Channel and signature (Screen 01's cell shows the signature under the channel) · Version and field map — and the line panel (560 px) for who, copies, minimum age, only if
// and who signs. Channels, the portal, "Add an online form" and the defaults are Screen 01's components, reused as they
// are (concept §2, Lead 25 Oct). One request: GET /combinations/:id/workspace?tab=forms.
import * as React from "react";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { SIGNED_BY, type WorkspaceFormLine } from "../../../../contracts/workspace";
import type { CombinationSummary } from "../../../../contracts/programs";
import { AddFormPanel } from "@/components/forms";
import { AddOnlineFormPanel, ChannelCell, FilingLine, OnlineForms, UseDefaults } from "@/components/channels";
import { ConditionBuilder } from "@/components/conditions";
import { useLibraryFields, whoLabel } from "@/pages/configuration";
import { api, ApiError, useSessionView, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { useQueryClient } from "@tanstack/react-query";

const WHO = ["each_applicant", "principal_applicant", "spouse_or_partner", "couple_once", "each_dependent_child", "each_person", "case", "representative"];

export function FormsTab({ id, label, sum, lines }: { id: string; label: string; sum: CombinationSummary; lines: WorkspaceFormLine[] }) {
  const { known, canAuthor } = useSessionView();
  const [adding, setAdding] = React.useState(false), [addingOnline, setAddingOnline] = React.useState(false);
  const [resume, setResume] = React.useState<CombinationSummary["onlineForms"][number] | undefined>(undefined);
  const [editing, setEditing] = React.useState<string | null>(null);
  const opener = React.useRef<HTMLElement | null>(null);
  const lineCodes = new Set(sum.forms.map((f) => f.code));
  const pending = (sum.row?.forms ?? []).filter((f) => !f.document && !lineCodes.has(f.code));
  const open = (code: string) => { opener.current = document.activeElement as HTMLElement | null; setEditing(code); };
  const close = () => { setEditing(null); requestAnimationFrame(() => opener.current?.focus()); };
  const line = lines.find((l) => l.code === editing);
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="fm-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="fm-h" className="font-semibold">Forms</h2>
          {canAuthor ? <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setAddingOnline(true)}><Globe /> Add an online form</Button><Button size="sm" onClick={() => setAdding(true)}><Plus /> Add form</Button></div> : null}
        </div>
        {known ? <FilingLine id={id} sum={sum} canAuthor={canAuthor} /> : null}
        {!(lines.length + pending.length) ? <p className="mt-3 text-sm text-text-muted">No forms yet. Add the forms this application files: pick them from the library or upload the IRCC PDFs. Each line then says who files it and how (PDF upload, online, or a signed PDF upload).</p> : (
          <Table className="mt-3" dense head={["Form", "Who and copies", "Only if", "Channel and signature", "Version and field map", <span key="a" className="sr-only">Actions</span>]}>
            {lines.map((f) => (
              <tr key={f.code} data-line={f.code}>
                <td className="max-w-64"><span className="mono font-medium">{f.code}</span> <span className="block truncate text-text-muted" title={f.title}>{f.title}</span>{f.status === "DRAFT" ? <Pill tone="warn" className="mt-0.5">Draft change</Pill> : null}</td>
                <td className="text-xs">{whoLabel(f.who)}{f.copies > 1 ? ` · ${f.copies} copies` : ""}{f.minAge ? ` · from age ${f.minAge}` : ""}<br /><span className="text-text-muted">Signed by: {f.signedBy ? f.signedByLabel : "not set"}</span></td>
                <td className="max-w-48 text-xs">{f.when === "always" ? "Always" : `Only if ${f.when}`}</td>
                <td>{known ? <ChannelCell id={id} line={f} canAuthor={canAuthor} /> : f.channelWords}</td>
                <td className="text-xs">{f.document ? "checklist" : f.edition ?? (f.channel === "ONLINE" ? "no online version mapped" : "none mapped")}<br /><span className="text-text-muted">{f.document ? "" : `${f.boxes} form fields mapped`}</span></td>
                <td>{canAuthor ? <Button size="sm" variant="ghost" onClick={() => open(f.code)} aria-label={`Edit the ${f.code} line`}><Pencil /> Edit</Button> : null}</td>
              </tr>
            ))}
            {pending.map((f) => <tr key={f.code}><td><span className="mono font-medium">{f.code}</span></td><td colSpan={5} className="text-xs text-text-muted">{f.inLibrary ? "Attached as a source. Its form fields are already mapped in the library, so it is added without AI." : "Attached as a source. Its form fields are not mapped yet; AI drafts them."}</td></tr>)}
          </Table>
        )}
        <UseDefaults id={id} sum={sum} canAuthor={canAuthor} />
        {sum.channelProblems.length ? <ul className="mt-3 space-y-1 text-sm" aria-label="Filing problems">{sum.channelProblems.map((p, i) => <li key={i} className="flex gap-2"><Pill tone={p.level === "error" ? "danger" : "warn"}>{p.level === "error" ? "Blocks release" : "Warning"}</Pill>{p.message}</li>)}</ul> : null}
        <OnlineForms id={id} sum={sum} canAuthor={canAuthor} onContinue={(o) => { setResume(o); setAddingOnline(true); }} />
        <p className="mt-3 text-xs text-text-muted">A signed PDF upload line also needs its signed copy in Documents. What each person of a Sample family gets is on Preview by person.</p>
      </section>
      {adding ? <AddFormPanel combinationId={id} label={label} have={sum.forms.map((f) => f.code)} onClose={() => setAdding(false)} /> : null}
      {addingOnline ? <AddOnlineFormPanel key={resume?.id ?? "new"} resume={resume} id={id} sum={sum} codes={[...new Set([...sum.forms.filter((f) => !f.document).map((f) => f.code), ...pending.map((f) => f.code)])]} onClose={() => { setAddingOnline(false); setResume(undefined); }} /> : null}
      {line ? <LinePanel key={`${line.code}|${line.revision}`} id={id} line={line} portal={sum.portalLabel} onClose={close} /> : null}
    </div>
  );
}

/** The form line panel: who (the library's default, changed for this combination only), copies, minimum age, only if and
 *  who signs. A save names the revision it opened; someone else's newer save is refused (409) and shown, never lost. */
function LinePanel({ id, line, portal, onClose }: { id: string; line: WorkspaceFormLine; portal: string | null; onClose: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  const fields = useLibraryFields();
  const [who, setWho] = React.useState(line.who), [copies, setCopies] = React.useState(String(line.copies)), [minAge, setMinAge] = React.useState(line.minAge ? String(line.minAge) : "");
  const [signedBy, setSignedBy] = React.useState(line.signedBy ?? ""), [mode, setMode] = React.useState(line.when === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL");
  const [cond, setCond] = React.useState<unknown>(null), [plain, setPlain] = React.useState(line.when === "always" ? "" : line.when);
  const [errors, setErrors] = React.useState<Record<string, string>>({}), [conflict, setConflict] = React.useState<string | null>(null), [busy, setBusy] = React.useState(false);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["combination", id] }), qc.invalidateQueries({ queryKey: ["combination-summary", id] }), qc.invalidateQueries({ queryKey: ["config", id] })]);
  const num = (v: string) => (v.trim() === "" ? null : /^\d+$/.test(v.trim()) ? Number(v.trim()) : NaN);
  async function save(body: Record<string, unknown>, done: string) {
    setBusy(true); setErrors({}); setConflict(null);
    try {
      await api(`/combinations/${id}/forms/${encodeURIComponent(line.line)}`, { method: "PATCH", json: { ...body, baseRevision: line.revision } });
      toast.push({ tone: "ok", text: done }); await refresh(); onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message);
      else if (e instanceof ApiError && e.problem.errors?.length) setErrors(Object.fromEntries(e.problem.errors.map((x) => [x.field, x.message])));
      else toast.push({ tone: "danger", text: (e as Error).message });
    }
    setBusy(false);
  }
  const submit = () => {
    const c = num(copies), m = num(minAge);
    const local: Record<string, string> = {};
    if (c === null || Number.isNaN(c)) local.copies = "Copies is a whole number from 1 to 9.";
    if (Number.isNaN(m)) local.minAge = "Minimum age is a whole number from 1 to 99, or empty.";
    if (mode === "ANSWER_CONDITIONAL" && !cond && line.when === "always") local.condition = "Build the condition, or choose Always.";
    if (Object.keys(local).length) { setErrors(local); (document.querySelector(`[data-field="${Object.keys(local)[0]}"]`) as HTMLElement | null)?.focus(); return; }
    const initial = line.when === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL";
    const when = mode === initial && !cond ? {} : { attachMode: mode, ...(mode === "ANSWER_CONDITIONAL" ? { condition: cond, conditionPlain: plain } : {}) };
    void save({ who, copies: c, minAge: m, signedBy: signedBy || null, ...when }, `${line.code} line saved to the draft`);
  };
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`${line.code} · form line`} description={`${line.title} · in the library; this line says who files it and how`}
      footer={<><Button variant="destructive" onClick={() => void save({ retire: true }, `${line.code} removed from the draft`)} disabled={busy}><Trash2 /> Remove</Button><span className="flex-1" /><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} busy={busy}>Save line</Button></>}>
      <div className="space-y-4">
        {conflict ? <Notice tone="warn" title="Someone else saved this line while you were editing" action={<Button size="sm" variant="secondary" onClick={() => void refresh().then(onClose)}>Reload their version</Button>}>{conflict}</Notice> : null}
        <Field label="Who files it" hint="The library's default; a change here applies to this combination only.">
          <Select data-field="who" value={who} onChange={(e) => setWho(e.target.value)}>{WHO.map((w) => <option key={w} value={w}>{whoLabel(w)}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Copies" hint="For each person it names." error={errors.copies}><Input data-field="copies" inputMode="numeric" value={copies} onChange={(e) => setCopies(e.target.value)} aria-invalid={!!errors.copies || undefined} /></Field>
          <Field label="Minimum age" hint="Empty: any age." error={errors.minAge}><Input data-field="minAge" inputMode="numeric" placeholder="None" value={minAge} onChange={(e) => setMinAge(e.target.value)} aria-invalid={!!errors.minAge || undefined} /></Field>
        </div>
        <Field label="Only if" error={errors.condition}>
          <Select data-field="condition" value={mode} onChange={(e) => setMode(e.target.value)}><option value="COMBINATION_MANDATORY">Always, for this combination</option><option value="ANSWER_CONDITIONAL">Only when a condition is true</option></Select>
        </Field>
        {mode === "ANSWER_CONDITIONAL" ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            {line.when !== "always" ? <p className="text-xs text-text-muted">Now: only if {line.when}. Build a new condition below to replace it, or leave it as it is.</p> : null}
            <ConditionBuilder value={cond} onChange={setCond} fields={fields.list} />
            <Field label="In plain words" hint="Shown to staff and clients as the reason."><Input value={plain} onChange={(e) => setPlain(e.target.value)} /></Field>
          </div>
        ) : null}
        <Field label="Channel" hint={line.channel === "ONLINE" ? `Online: filed in the ${portal ?? "portal chosen above"}. ${line.signature ?? ""}` : line.signature ?? undefined}>
          <p className="text-sm">{line.channelWords} <span className="text-xs text-text-muted">· change it in the Channel column</span></p>
        </Field>
        <Field label="Signed by" hint="Sample list until the immigration expert confirms it. How it is signed comes from the channel." error={errors.signedBy}>
          <Select data-field="signedBy" value={signedBy} onChange={(e) => setSignedBy(e.target.value)}><option value="">Not set</option>{SIGNED_BY.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select>
        </Field>
        <Field label="Field map"><p className="text-sm">{line.document ? "A checklist: no form fields." : `${line.edition ?? "No version mapped"} · ${line.boxes} form fields mapped`}</p></Field>
      </div>
    </Panel>
  );
}
