// C7.8 Add a library form to one filing (screens lane, B141; SA-1B-177; concept revision 2 §4, §5). On Prepare
// application: a quiet "+ Add a form" after each filing's forms opens a side panel (EXPERIENCE §3): search the firm's
// library by number or title; each result says in words whether it fills from the case or is the blank official PDF, and
// a form that cannot be added is shown with why. Picking one shows its coverage on this case (or why it is blank), who it
// is for, how it is filed and signed, and an optional reason; "Add to <name>'s filing". The new row carries the tag
// "Added by the case officer" (who, when, why) and Remove (a reason is required). A blank one offers its download and the
// upload of its completed copy (the one upload; it is also the signed copy when it is signed, M5). US$0, no AI.
import * as React from "react";
import { Download, FileText, Info, Plus, Trash2, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, getActor, useApi, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill, Select, Textarea } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import type { AddableForm, AddableFormDetail, AddableList, CaseForm } from "../../../contracts/runtime";

const CHANNEL: Record<string, string> = { PDF_UPLOAD: "PDF upload", PAPER: "Paper" };
const day = (at: string) => new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const refresh = (qc: ReturnType<typeof useQueryClient>, caseId: string) => qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });

/** Focus `selector` as soon as it is in the page (the list reloads after a change), else `fallback` after 5 s. */
function focusWhenShown(selector: string, fallback: string) {
  const found = () => document.querySelector<HTMLElement>(selector);
  if (found()) { found()!.focus(); return; }
  const obs = new MutationObserver(() => { const el = found(); if (el) { obs.disconnect(); clearTimeout(t); el.focus(); } });
  obs.observe(document.body, { childList: true, subtree: true });
  const t = setTimeout(() => { obs.disconnect(); (found() ?? document.querySelector<HTMLElement>(fallback))?.focus(); }, 5000);
}

/** "+ Add a form" after one filing's forms. */
export function AddFormButton({ caseId, filing, owner, disabled }: { caseId: string; filing: string; owner: string; disabled?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const btn = React.useRef<HTMLButtonElement>(null);
  return (
    <li className="px-4 py-2" data-add-form={filing}>
      {/* r1c on #1248 (390 px): a long name wraps inside the button; the page never scrolls sideways. */}
      <Button ref={btn} size="sm" variant="ghost" className="h-auto min-h-8 max-w-full whitespace-normal py-1 text-left" disabled={!!disabled} title={disabled ?? undefined} onClick={() => setOpen(true)}><Plus aria-hidden /><span className="min-w-0 [overflow-wrap:anywhere]">Add a form to {owner}'s filing</span></Button>
      {disabled ? <span className="ml-2 text-[13px] text-text-muted">{disabled}</span> : null}
      {open ? <AddFormPanel caseId={caseId} filing={filing} owner={owner} close={() => setOpen(false)} returnFocus={() => btn.current} /> : null}
    </li>
  );
}

function AddFormPanel({ caseId, filing, owner, close, returnFocus }: { caseId: string; filing: string; owner: string; close: () => void; returnFocus: () => HTMLElement | null }) {
  const qc = useQueryClient(), toast = useToast();
  const [q, setQ] = React.useState(""), [term, setTerm] = React.useState("");
  const [subject, setSubject] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setTerm(q), 200); return () => clearTimeout(t); }, [q]);
  const list = useApi<AddableList>(["runtime", "addable", filing, term, subject ?? ""], `/runtime/filings/${filing}/addable-forms?q=${encodeURIComponent(term)}${subject ? `&subject=${subject}` : ""}`);
  // The list shown always matches what is typed now (the server's answer may be for the text of 200 ms ago), so Enter
  // never picks a form the person no longer sees.
  const words = q.trim().toLowerCase().replace(/\s+/g, " ");
  const forms = (list.data?.forms ?? []).filter((f) => !words || f.form.toLowerCase().includes(words) || f.form.toLowerCase().replace(/\s+/g, "").includes(words.replace(/\s+/g, "")) || f.title.toLowerCase().includes(words));
  const who = subject ?? list.data?.subject ?? null;
  const optionId = (f: AddableForm) => `addable-${f.form.replace(/\s+/g, "-")}`;
  function keys(e: React.KeyboardEvent) {
    if (!forms.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(forms.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter") { e.preventDefault(); const f = forms[active]; if (f) setPicked(f.form); }
  }
  return (
    <Panel open onOpenChange={(o) => { if (!o) close(); }} title={`Add a form to ${owner}'s filing`} returnFocus={returnFocus}
      description="Forms come from the firm's library. A form is added to this filing only, for one person on it; it is never added to the combination."
      footer={<Button variant="ghost" onClick={close}>Close</Button>}>
      <div className="space-y-4">
        {list.data && list.data.people.length > 1 ? (
          <Field label="For">
            <Select value={who ?? ""} onChange={(e) => { setSubject(e.target.value); setPicked(null); }}>
              {list.data.people.map((p) => <option key={p.subject} value={p.subject}>{p.label}</option>)}
            </Select>
          </Field>
        ) : null}
        <Field label="Search the library" hint="By form number or title. Arrow keys move through the results; Enter picks one.">
          <Input role="combobox" aria-expanded={forms.length > 0} aria-controls="addable-list" aria-activedescendant={forms[active] ? optionId(forms[active]) : undefined} value={q} placeholder="IMM 5532 or a title"
            onChange={(e) => { setQ(e.target.value); setActive(0); }} onKeyDown={keys} autoComplete="off" />
        </Field>
        {list.isLoading ? <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          : list.isError ? <Notice tone="danger" title="The library could not be read">{(list.error as Error).message}</Notice>
          : !forms.length ? <p className="text-sm text-text-muted" data-addable-empty>{list.data?.empty}</p>
          : <ul id="addable-list" role="listbox" aria-label="Library forms" className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {forms.map((f, i) => (
                <li key={f.form} id={optionId(f)} role="option" aria-selected={picked === f.form} aria-disabled={!!f.why_not || undefined} data-addable={f.form} data-kind={f.kind} data-refused={f.why_not?.code ?? undefined}
                  className={`px-3 py-2 text-sm ${i === active ? "bg-primary/8" : ""} ${f.why_not ? "text-text-muted" : "cursor-pointer hover:bg-text/5"}`}
                  onClick={() => { setActive(i); if (!f.why_not) setPicked(f.form); }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono font-medium">{f.form}</span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{f.title}</span>
                    {f.why_not ? <Pill tone="neutral">Not added</Pill> : <Pill tone={f.kind === "fills" ? "ok" : "info"}>{f.kind_words}</Pill>}
                  </div>
                  <p className="text-[12px] text-text-muted">{f.edition ?? "No current edition"}{f.why_not ? ` · ${f.why_not.words}` : f.blank_why ? ` · ${f.blank_why}` : ""}</p>
                </li>
              ))}
            </ul>}
        {picked && who ? <Picked key={`${picked}|${who}`} caseId={caseId} filing={filing} form={picked} subject={who} onAdded={async (person) => {
          toast.push({ tone: "ok", text: `${picked} added to ${person}'s filing.` }); await refresh(qc, caseId); close();
          // Review minor: after Add the focus goes to the new form's row once the list shows it (never a fixed timer that
          // races the reload); after 5 s without it, to this filing's "+ Add a form".
          focusWhenShown(`[data-row-form="${picked}|${who}"] h3`, `[data-add-form="${filing}"] button`);
        }} /> : null}
      </div>
    </Panel>
  );
}

/** The form picked: its coverage (or why it is blank), the channel and signature it takes, an optional reason, Add. */
function Picked({ caseId, filing, form, subject, onAdded }: { caseId: string; filing: string; form: string; subject: string; onAdded: (person: string) => Promise<void> }) {
  void caseId;
  const d = useApi<AddableFormDetail>(["runtime", "addable", filing, form, subject], `/runtime/filings/${filing}/addable-forms/${encodeURIComponent(form)}?subject=${subject}`);
  const [channel, setChannel] = React.useState<string | null>(null);
  const [signed, setSigned] = React.useState(true);
  const [signWhy, setSignWhy] = React.useState(""), [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false), [err, setErr] = React.useState<string | null>(null);
  if (d.isLoading) return <Skeleton className="h-32 w-full" />;
  if (d.isError) return <Notice tone="danger" title={`${form} could not be read`}>{(d.error as Error).message}</Notice>;
  const x = d.data!, ch = channel ?? x.channel, fixed = !!x.same_as;
  // C11.6's rule: Paper where the application is filed through an IRCC account is chosen with a reason; on Paper a form
  // is signed in pen (no switch).
  const paperWhy = ch === "PAPER" && x.channel !== "PAPER" && !fixed, pen = ch === "PAPER";
  async function add() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ person: string }>(`/runtime/filings/${filing}/form-additions`, { method: "POST", json: { form, subject, channel: ch, ...(signed || pen ? {} : { signature: "NONE", signature_reason: signWhy }), ...(reason.trim() ? { reason } : {}) } });
      await onAdded(r.person);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <section aria-label={`${form}, picked`} className="space-y-3 rounded-lg border border-border bg-surface px-3 py-3" data-picked={form}>
      <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]"><span className="mono">{x.form}</span> · {x.title}</h3><Pill tone={x.kind === "fills" ? "ok" : "info"}>{x.kind_words}</Pill></div>
      {x.why_not ? <Notice tone="warn" title="Not added">{x.why_not.words}</Notice> : null}
      {x.kind === "fills" && x.coverage ? (
        <div className="text-[13px]" data-coverage={`${x.coverage.fills}/${x.coverage.total}`}>
          <p><strong>{x.coverage.fills} of {x.coverage.total}</strong> form fields fill from this case's confirmed facts. Its filling is proven for this edition; a form field with no confirmed fact on this case stays blank and is listed.</p>
          <details className="mt-1"><summary className="cursor-pointer text-text-link">Not on file ({x.coverage.boxes.filter((b) => b.state === "not_on_file").length})</summary>
            <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5">{x.coverage.boxes.filter((b) => b.state === "not_on_file").map((b) => <li key={b.box} className="[overflow-wrap:anywhere]">{b.label}</li>)}</ul></details>
        </div>
      ) : x.kind === "blank" ? <p className="text-[13px]">Blank official PDF: download it, fill it by hand, upload the completed copy.{x.blank_why ? ` ${x.blank_why}` : ""}</p> : null}
      {x.same_as ? <p className="text-[13px] text-text-muted">{x.same_as.words}</p> : null}
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium">Filed as</legend>
        {x.channels.length ? x.channels.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm"><input type="radio" name={`ch-${form}`} value={c} checked={ch === c} disabled={fixed} onChange={() => setChannel(c)} />{CHANNEL[c] ?? c}{c === x.channel ? <span className="text-[12px] text-text-muted">(the default)</span> : null}</label>
        )) : null}
        <p className={`text-[12px] ${x.channels.length ? "text-text-muted" : "text-text-warn"}`}>{x.channel_why}</p>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-xs font-medium">Signature</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={signed || pen} disabled={fixed || pen} onChange={(e) => setSigned(e.target.checked)} />{pen ? "Signed in pen" : "Needs a signature"}{(signed || pen) && x.signers_words ? <span className="text-[12px] text-text-muted">({x.signers_words})</span> : null}</label>
        {!signed && !pen ? <Field label="Why it needs no signature" hint="Recorded with the form (required)."><Textarea value={signWhy} onChange={(e) => setSignWhy(e.target.value)} /></Field> : null}
      </fieldset>
      <Field label={paperWhy ? "Why it is filed on Paper (required)" : "Reason (optional)"} hint="Shown on the form's tag."><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
      {err ? <p role="alert" className="text-[13px] text-text-danger">{err}</p> : null}
      <Button busy={busy} disabled={!!x.why_not || !ch || (!signed && !pen && !signWhy.trim()) || (paperWhy && !reason.trim())} onClick={() => void add()}>Add to {x.person}'s filing</Button>
    </section>
  );
}

/** The tag on a form the case officer added: "Added by the case officer" ⓘ (who, when, why), and Remove with a reason. */
export function AddedTag({ caseId, f, recorded }: { caseId: string; f: CaseForm; recorded?: boolean }) {
  const qc = useQueryClient(), toast = useToast();
  const [removing, setRemoving] = React.useState(false), [why, setWhy] = React.useState(""), [busy, setBusy] = React.useState(false);
  const a = f.added;
  if (!a) return null; // breaker B1: a row whose form the release now holds is the release's, with no tag
  const tip = `Added by ${a.by_name ?? "a member of the firm"} on ${day(a.at)}${a.reason ? `: ${a.reason}` : ""}. ${a.edition}. Not part of the combination.`;
  async function remove() {
    setBusy(true);
    try {
      await api(`/runtime/form-additions/${a!.id}/remove`, { method: "POST", json: { reason: why } }); toast.push({ tone: "ok", text: `${f.form} removed from ${f.person}'s filing (kept in the record).` });
      await refresh(qc, caseId);
      // Breaker m4: the row is gone, so the focus goes to the forms' heading, never the page.
      document.getElementById("forms-h")?.focus();
    }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-added={a.kind}>
      <Pill tone="neutral">{a.tag}<button type="button" className="inline-flex rounded outline-none focus-visible:ring-2 focus-visible:ring-ring" title={tip} aria-label={`About this form: ${tip}`} onClick={() => toast.push({ tone: "info", text: tip })}><Info className="size-3" aria-hidden /></button></Pill>
      {a.newer_edition ? <Pill tone="info" title={a.newer_edition}>A newer edition exists</Pill> : null}
      {!recorded && !removing ? <Button size="sm" variant="ghost" onClick={() => setRemoving(true)}><Trash2 aria-hidden />Remove from this filing</Button> : null}
      {removing ? (
        <span role="group" aria-label={`Remove ${f.form}`} className="inline-flex flex-wrap items-center gap-2 text-[13px]">
          <Input aria-label="Why it is removed (required)" placeholder="Why it is removed (required)" value={why} onChange={(e) => setWhy(e.target.value)} className="h-8 w-64" autoFocus />
          <Button size="sm" variant="destructive" busy={busy} disabled={!why.trim()} onClick={() => void remove()}>Remove {f.form}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setRemoving(false); setWhy(""); }}>Cancel</Button>
        </span>
      ) : null}
    </span>
  );
}

/** A blank official PDF: download it, fill it by hand, upload the completed copy (the one upload). */
export function BlankRow({ caseId, f, recorded }: { caseId: string; f: CaseForm; recorded?: boolean }) {
  const qc = useQueryClient(), toast = useToast();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const b = f.blank!;
  async function download() {
    try {
      const r = await fetch(b.download, { headers: { "x-actor": getActor() } });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.detail ?? `${r.status} ${r.statusText}`);
      const url = URL.createObjectURL(await r.blob()), el = document.createElement("a");
      el.href = url; el.download = /filename="?([^";]+)/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "blank.pdf"; el.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.push({ tone: "danger", text: `The blank PDF could not be downloaded: ${(e as Error).message}` }); }
  }
  async function send(file: File) {
    setBusy(true);
    try {
      // The form's item is made by the first Prepare read after it was added; read it there when this list has none yet.
      const item = b.item ?? (await api<{ items: { id: string; blank?: { addition: string } }[] }>(`/runtime/cases/${caseId}/prepare`)).items.find((i) => i.blank?.addition === b.addition)?.id;
      if (!item) throw new Error("This form is not on the filing's list yet: reload the page and try again.");
      const fd = new FormData(); fd.append("file", file, file.name); await api(`/runtime/items/${item}/signed-scan`, { method: "POST", body: fd }); toast.push({ tone: "ok", text: `${f.form}: completed copy uploaded.` }); await refresh(qc, caseId); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <li className="space-y-2 px-4 py-3" data-blank-form={f.form} data-row-form={`${f.form}|${f.subject_id}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FileText className="size-4 text-text-muted" aria-hidden />
        <h3 tabIndex={-1} className="min-w-0 text-sm font-semibold">{f.form} <span className="font-normal text-text-muted">for</span> <span className="[overflow-wrap:anywhere]">{f.person}</span></h3>
        <Pill tone="info">Blank official PDF</Pill>
        {b.completed ? <Pill tone="ok">Completed copy uploaded {day(b.completed.at)}</Pill> : <Pill tone="warn">Completed copy to upload</Pill>}
        <AddedTag caseId={caseId} f={f} recorded={recorded} />
        <span className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => void download()}><Download aria-hidden />Download the blank PDF</Button>
        {!recorded ? <>
          <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" aria-label={`Completed copy of ${f.form}`} onChange={(e) => { const x = e.target.files?.[0]; if (x) void send(x); }} />
          <Button size="sm" variant={b.completed ? "secondary" : "default"} busy={busy} onClick={() => input.current?.click()}><Upload aria-hidden />{b.completed ? "Upload a new completed copy" : "Upload the completed copy"}</Button>
        </> : null}
      </div>
      <p className="text-[13px] text-text-muted [overflow-wrap:anywhere]">{f.title}. Fill it by hand{f.channel === "PAPER" ? ", sign it in pen" : ", have it signed"} and upload the completed copy: that one upload is the copy filed. Nothing on it is filled from the case.</p>
    </li>
  );
}
