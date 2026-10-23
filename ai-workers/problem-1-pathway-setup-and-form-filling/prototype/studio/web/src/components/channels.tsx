// Screen 01 fix pass (P-74): the recent forms decisions made visible on the combination page, on the F1 back end
// (api/src/forms.ts, engine/channels.ts). C1.6 each form line's channel and the derived filing method, the author
// sets a line's channel; C1.7 the combination's portal and each line's default channel for it; C2.7 "Add an online
// form" from a saved blank portal page or the template, shown "Awaiting a second person" until approved (the review
// itself is Screen 02); C2.10 which source drafting reads for each form, with a per-form choice.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Upload } from "lucide-react";
import { CAPTURE_LIMITS, CHANNEL_WORDS, CHANNELS, DRAFT_FROM, DRAFT_FROM_WORDS, PORTALS, type Channel, type DraftFrom } from "../../../contracts/forms";
import type { CombinationSummary } from "../../../contracts/programs";
import { api, useApi, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";

const refresh = (qc: ReturnType<typeof useQueryClient>, id: string) => { for (const k of [["combination-summary", id], ["combination", id], ["catalogue"], ["draft"], ["drafting-sources", id], ["config", id]]) void qc.invalidateQueries({ queryKey: k }); };

/** The line under "Forms": the portal the filing goes through (the author chooses it) and the derived filing method. */
export function FilingLine({ id, sum, canAuthor }: { id: string; sum: CombinationSummary; canAuthor: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  // The chosen value shows at once and stays while it saves; the server's answer replaces it (or puts it back on error).
  const [value, setValue] = React.useState(sum.portal ?? "");
  React.useEffect(() => setValue(sum.portal ?? ""), [sum.portal]);
  const setPortal = async (portal: string) => {
    setBusy(true); setValue(portal);
    try { await api(`/combinations/${id}/portal`, { method: "PATCH", json: { portal: portal || null } }); toast.push({ tone: "ok", text: portal ? `Filed through the ${PORTALS.find((p) => p.key === portal)?.label}` : "Portal cleared" }); refresh(qc, id); }
    catch (e) { setValue(sum.portal ?? ""); toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" data-filing>
      <span><span className="text-text-muted">Filing: </span><b className="font-semibold">{sum.filing}</b></span>
      <span className="flex items-center gap-2">
        <label htmlFor={`portal-${id}`} className="text-text-muted">Portal</label>
        {canAuthor ? (
          <Select id={`portal-${id}`} className="h-8 w-auto" value={value} disabled={busy} onChange={(e) => void setPortal(e.target.value)}>
            <option value="">No portal yet</option>
            {PORTALS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        ) : <b id={`portal-${id}`} className="font-semibold">{sum.portalLabel ?? "No portal yet"}</b>}
      </span>
      <span className="text-[13px] text-text-muted">Sample portals until the immigration expert confirms where each program is filed.</span>
    </div>
  );
}

/** "Filed as" for one line: the author picks PDF upload, Online or Signed PDF upload; the default for this portal is marked. */
export function ChannelCell({ id, line, canAuthor }: { id: string; line: CombinationSummary["forms"][number]; canAuthor: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const [value, setValue] = React.useState<Channel>(line.channel);
  React.useEffect(() => setValue(line.channel), [line.channel]);
  const set = async (channel: Channel) => {
    setBusy(true); setValue(channel);
    try { await api(`/combinations/${id}/forms/${encodeURIComponent(line.code)}/channel`, { method: "PATCH", json: { channel } }); toast.push({ tone: "ok", text: `${line.code} filed as ${CHANNEL_WORDS[channel]}` }); refresh(qc, id); }
    catch (e) { setValue(line.channel); toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  };
  if (line.document) return <span className="text-text-muted">Checklist (not filed)</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {canAuthor ? (
        <Select aria-label={`How ${line.code} is filed`} className="h-8 w-auto" value={value} disabled={busy} onChange={(e) => void set(e.target.value as Channel)}>
          {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_WORDS[c]}{c === line.defaultChannel ? " (default)" : ""}</option>)}
        </Select>
      ) : <span>{line.channelWords}</span>}
      {line.signature ? <span className="text-[13px] text-text-muted">{line.signature}</span> : null}
    </div>
  );
}

/** Lines whose channel differs from the default for this portal (C1.7): one action applies the defaults; the author
 *  confirms per combination (the immigration expert confirms which forms are filed online). */
export function UseDefaults({ id, sum, canAuthor }: { id: string; sum: CombinationSummary; canAuthor: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const [busy, setBusy] = React.useState(false);
  const off = sum.forms.filter((f) => !f.document && f.channel !== f.defaultChannel);
  if (!off.length || !canAuthor) return null;
  const apply = async () => {
    setBusy(true);
    try { for (const f of off) await api(`/combinations/${id}/forms/${encodeURIComponent(f.code)}/channel`, { method: "PATCH", json: { channel: f.defaultChannel } }); toast.push({ tone: "ok", text: `Default channel used for ${off.map((f) => f.code).join(", ")}` }); refresh(qc, id); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm" data-use-defaults>
      <span>{off.map((f) => `${f.code}: default ${CHANNEL_WORDS[f.defaultChannel]}`).join(" · ")} {sum.portalLabel ? `(an approved online version from the ${sum.portalLabel} exists)` : ""}</span>
      <Button size="sm" variant="secondary" busy={busy} onClick={() => void apply()}>Use the default for {off.length} form{off.length === 1 ? "" : "s"}</Button>
    </p>
  );
}

/** Online forms added from this combination (C2.7), each with its status in plain words. */
export function OnlineForms({ sum }: { sum: CombinationSummary }) {
  if (!sum.onlineForms.length) return null;
  const tone = (s: string) => (s === "HELD" ? "warn" : s === "APPROVED" || s === "IN_LIBRARY" ? "ok" : s === "RETURNED" ? "danger" : "neutral");
  return (
    <div className="mt-4" data-online-forms>
      <h3 className="text-sm font-semibold">Online forms added here ({sum.onlineForms.length})</h3>
      <ul className="mt-1.5 space-y-1.5 text-sm">
        {sum.onlineForms.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-2">
            <span className="mono font-medium">{o.form}</span><span className="text-text-muted">{o.title} · {o.portalLabel}</span>
            <Pill tone={tone(o.status)}>{o.statusWords}</Pill>
            {o.status === "HELD" ? <span className="text-[13px] text-text-muted">Not used until a second person approves it.</span> : o.status === "RETURNED" && o.detail ? <span className="text-[13px] text-text-muted">{o.detail}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

type AddResult = { file: string; outcome: string; message: string };
/** "Add an online form" (C2.7): the portal, the form's code and title as the portal shows them, and its blank screens
 *  (saved pages, or the filled-in template). It is checked for answers, finished and held for a second person. */
export function AddOnlineFormPanel({ id, sum, codes, onClose }: { id: string; sum: CombinationSummary; codes: string[]; onClose: () => void }) {
  const qc = useQueryClient(); const toast = useToast();
  const [portal, setPortal] = React.useState(sum.portal ?? "");
  React.useEffect(() => { if (sum.portal) setPortal((p) => p || sum.portal!); }, [sum.portal]);
  const [form, setForm] = React.useState(codes[0] ?? "");
  const [title, setTitle] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<AddResult[] | null>(null);
  const [done, setDone] = React.useState<string | null>(null);
  const tooBig = files.find((f) => f.size > CAPTURE_LIMITS.fileMb * 1024 * 1024);
  const submit = async () => {
    setBusy(true); setErrors({}); setProblem(null); setResults(null);
    try {
      const c = await api<{ id: string }>("/captures", { method: "POST", json: { portal, form, title, combinationId: id } });
      const fd = new FormData(); for (const f of files) fd.append("files", f, f.name);
      const added = await api<{ results: AddResult[] }>(`/captures/${c.id}/screens`, { method: "POST", body: fd });
      setResults(added.results);
      if (added.results.some((r) => r.outcome === "added")) {
        const fin = await api<{ status: string; status_detail: string }>(`/captures/${c.id}/finish`, { method: "POST" });
        setDone(fin.status === "HELD" ? "Awaiting a second person: it is not used until someone other than you approves it." : fin.status_detail);
        toast.push({ tone: "ok", text: `${form} online form: ${fin.status === "HELD" ? "awaiting a second person" : "already in the library"}` });
      } else setProblem("No screen was added, so the online form was not finished. Save each screen from a blank application and try again.");
      refresh(qc, id);
    } catch (e) {
      const errs = ((e as { problem?: { errors?: { field: string; message: string }[] } }).problem?.errors ?? []);
      if (errs.length) setErrors(Object.fromEntries(errs.map((x) => [x.field.split(".")[0], x.message])));
      else setProblem((e as Error).message);
      refresh(qc, id);
    } finally { setBusy(false); }
  };
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title="Add an online form" description="Record the form as the portal shows it: its blank screens, never a client's answers. A second person approves it before it is used."
      footer={done ? <Button onClick={onClose}>Close</Button> : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={!portal || !form.trim() || title.trim().length < 3 || !files.length || !!tooBig} onClick={() => void submit()}><Upload /> Add and send for approval</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Portal" error={errors.portal} hint={sum.portal ? "This combination's portal" : "This combination has no portal yet: choose the one the form is filed through."}>
          <Select value={portal} onChange={(e) => setPortal(e.target.value)} aria-label="Portal"><option value="">Choose…</option>{PORTALS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select>
        </Field>
        <Field label="Form code" error={errors.form} hint="As IRCC numbers it, for example IMM 5257.">
          <Input aria-label="Form code" list={`codes-${id}`} value={form} onChange={(e) => setForm(e.target.value)} />
          <datalist id={`codes-${id}`}>{codes.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Title as the portal shows it" error={errors.title}><Input aria-label="Title as the portal shows it" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Blank screens" hint={<>Saved web pages of each blank screen (.html), in portal order, or the filled-in <a className="text-text-link underline" href="/api/capture-template.csv" download>spreadsheet template</a> (.csv). Up to {CAPTURE_LIMITS.files} files, {CAPTURE_LIMITS.fileMb} MB each.</>} error={tooBig ? `${tooBig.name} is over ${CAPTURE_LIMITS.fileMb} MB.` : undefined}>
          <input type="file" multiple accept=".html,.htm,.csv" aria-label="Choose blank screens" onChange={(e) => setFiles([...(e.target.files ?? [])])} className="text-sm" />
        </Field>
        {problem ? <Notice tone="danger" title="Not added">{problem}</Notice> : null}
        {results ? <ul aria-label="Screen results" className="space-y-1 text-sm">{results.map((r, i) => <li key={i} className="flex gap-2"><Pill tone={r.outcome === "added" ? "ok" : r.outcome === "duplicate" ? "neutral" : "danger"}>{r.outcome === "added" ? "Added" : r.outcome === "duplicate" ? "Already there" : "Refused"}</Pill><span><b className="font-medium">{r.file}</b>: {r.message}</span></li>)}</ul> : null}
        {done ? <Notice tone="ok" title={`${form} online form added`}>{done}</Notice> : null}
      </div>
    </Panel>
  );
}

type DraftingRow = { code: string; in_library: boolean; draft_from: DraftFrom; draft_from_words: string; pdf: { edition: string; mapped: number } | null; online: { edition: string; portal: string; mapped: number } | null; reads: string };
/** Sources tab (C2.10): for each form, which source drafting reads, with the author's per-form choice. */
export function DraftingSources({ id, canAuthor }: { id: string; canAuthor: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const d = useApi<{ portal: string | null; portal_label: string | null; forms: DraftingRow[] }>(["drafting-sources", id], `/combinations/${id}/drafting-sources`);
  const [busy, setBusy] = React.useState<string | null>(null);
  if (!d.data?.forms.length) return null;
  const set = async (code: string, draftFrom: DraftFrom) => {
    setBusy(code);
    try { await api(`/library/forms/${encodeURIComponent(code)}/draft-from`, { method: "PATCH", json: { draftFrom } }); toast.push({ tone: "ok", text: `${code}: drafting reads ${DRAFT_FROM_WORDS[draftFrom].toLowerCase()}` }); refresh(qc, id); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(null); }
  };
  return (
    <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby={`drafting-${id}`} data-drafting-sources>
      <h2 id={`drafting-${id}`} className="flex items-center gap-2 font-semibold"><Globe className="size-4 text-text-muted" aria-hidden />What drafting reads, per form</h2>
      <p className="mt-1 text-sm text-text-muted">By default the PDF version is read first and the online screens only for what differs. The choice belongs to the form, so it applies wherever the form is used.</p>
      <Table className="mt-3" dense head={["Form", "Drafting reads", "Choice"]}>
        {d.data.forms.map((f) => (
          <tr key={f.code}>
            <td className="mono font-medium">{f.code}</td>
            <td className="max-w-xl text-sm">{f.reads}</td>
            <td>{canAuthor && f.in_library ? (
              <Select aria-label={`What drafting reads for ${f.code}`} className="h-8 w-auto" value={f.draft_from} disabled={busy === f.code} onChange={(e) => void set(f.code, e.target.value as DraftFrom)}>
                {DRAFT_FROM.map((x) => <option key={x} value={x}>{x === "PDF_FIRST" ? "PDF first (default)" : "Online screens only"}</option>)}
              </Select>
            ) : <span className="text-sm text-text-muted">{f.in_library ? f.draft_from_words : "—"}</span>}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
