// C6.14 (row B136; SA-1B-151 r1, §7; concept product/screens/B136/concept.md BR-1): "Who provides it when shared", inside
// the Documents tab drawer, next to the substitute sets. It shows the document type's default provider roles from the
// library (in order) and, for the author, proposes a new ordered list with a reason: a second person approves it on To
// review, and it goes out with each combination's next release. The roles count only on a line asked once for the
// application or once for the couple; the panel says whether this line is one. No AI (US$0).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi } from "@/lib/api";
import { Button, Notice, Select, Textarea } from "@/components/ui/controls";

type Role = { key: string; label: string };
type View = { key: string; name: string; uses: number; roles: Role[]; choices: Role[]; help: string;
  open: { id: string; status: "WAITING" | "RETURNED" | "APPROVED"; by: string; note: string | null; change: { after: string[] } } | null };
const OPEN_WORDS = { WAITING: "waits for a second person on To review", RETURNED: "was returned", APPROVED: "is approved and goes out with the next release" } as const;
/** The line's "whose document" values that make it one item for the application (engine SHARED_WHO). */
const SHARED = new Set(["case", "couple_once"]);

export function ProvidersSection({ typeKey, typeName, who, canAuthor }: { typeKey: string; typeName: string; who: string; canAuthor: boolean }) {
  const qc = useQueryClient();
  const q = useApi<View>(["document-providers", typeKey], `/library/document-types/${encodeURIComponent(typeKey)}/providers`);
  const [edit, setEdit] = React.useState<string[] | null>(null);
  const [add, setAdd] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [msg, setMsg] = React.useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const said = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (msg) said.current?.scrollIntoView({ block: "nearest" }); if (msg?.tone === "danger") said.current?.focus(); }, [msg]);
  const v = q.data;
  const label = (k: string) => v?.choices.find((c) => c.key === k)?.label ?? k;
  const move = (i: number, d: -1 | 1) => setEdit((e) => { const x = [...e!]; [x[i], x[i + d]] = [x[i + d], x[i]]; return x; });
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      await api(`/library/document-types/${encodeURIComponent(typeKey)}/providers`, { method: "POST", json: { roles: edit ?? [], reason } });
      setEdit(null); setMsg({ tone: "ok", text: "Sent: a second person approves it on To review; nothing changes before that." });
      await qc.invalidateQueries({ queryKey: ["document-providers", typeKey] });
    } catch (e) { setMsg({ tone: "danger", text: e instanceof ApiError ? e.message : "Something went wrong; nothing was saved." }); } finally { setBusy(false); }
  };
  return (
    <section aria-labelledby="dd-providers" className="space-y-2" data-drawer-providers>
      <h3 id="dd-providers" className="font-semibold">Who provides it when shared · from the library document type</h3>
      {q.isLoading ? <p className="text-text-muted">Loading…</p> : q.isError || !v ? <p className="text-danger">Could not be read: {q.error instanceof Error ? q.error.message : "try again"}.</p> : <>
        {v.roles.length ? <ol className="ml-5 list-decimal" data-providers-list>{v.roles.map((r) => <li key={r.key} data-provider-role={r.key}>{r.label}</li>)}</ol>
          : <p className="text-text-muted" data-providers-list>Not set: the person the item is for provides it.</p>}
        <p className="text-xs" data-providers-applies={SHARED.has(who) ? "yes" : "no"}>{SHARED.has(who) ? "This line is asked once, so a case names these providers on it." : "This line is asked of each person, so these roles do not apply to it (they apply where a line asks it once)."}</p>
        {v.open ? <p className="text-xs" data-providers-open>A change to {v.open.change.after.length ? v.open.change.after.join(", then ") : "no roles"} by {v.open.by} {OPEN_WORDS[v.open.status]}{v.open.note ? `: ${v.open.note}` : ""}. <Link className="text-text-link underline" to="/review">To review</Link></p> : null}
        <p className="text-xs text-text-muted">{v.help} For every combination that names {typeName} (used by {v.uses}). Sample until the immigration expert confirms.</p>
        {canAuthor && !edit ? <Button size="sm" variant="secondary" disabled={!!v.open && v.open.status !== "RETURNED"} onClick={() => { setEdit(v.roles.map((r) => r.key)); setReason(""); setMsg(null); }} data-providers-edit>{v.roles.length ? "Change who provides it…" : "Set who provides it…"}</Button> : null}
        {canAuthor && edit ? (
          <div className="space-y-2 rounded border border-border p-3" data-providers-editor>
            {edit.length ? <ol className="space-y-1">{edit.map((k, i) => (
              <li key={k} className="flex flex-wrap items-center gap-2" data-providers-editor-role={k}><span className="w-5 text-right text-xs text-text-muted">{i + 1}.</span><span className="min-w-40">{label(k)}</span>
                <Button size="sm" variant="ghost" disabled={i === 0} aria-label={`Move ${label(k)} up`} onClick={() => move(i, -1)}>Up</Button>
                <Button size="sm" variant="ghost" disabled={i === edit.length - 1} aria-label={`Move ${label(k)} down`} onClick={() => move(i, 1)}>Down</Button>
                <Button size="sm" variant="ghost" aria-label={`Remove ${label(k)}`} onClick={() => setEdit((e) => e!.filter((x) => x !== k))}>Remove</Button></li>))}</ol>
              : <p className="text-xs text-text-muted">No roles: the person the item is for provides it.</p>}
            {v.choices.some((c) => !edit.includes(c.key)) ? <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs">Add a role
                <Select aria-label="Add a role" value={add} onChange={(e) => setAdd(e.target.value)} className="mt-1 block"><option value="">Choose a role…</option>{v.choices.filter((c) => !edit.includes(c.key)).map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select>
              </label>
              <Button size="sm" variant="secondary" disabled={!add} onClick={() => { setEdit((e) => [...e!, add]); setAdd(""); }} data-providers-add>Add</Button></div> : null}
            <label className="block text-xs">Why it changes, for every combination
              <Textarea aria-label="Why who provides it changes" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1" data-providers-why />
            </label>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void send()} data-providers-send>Send for a second person</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEdit(null); setMsg(null); }}>Cancel</Button>
            </div>
          </div>) : null}
        {msg ? <div ref={said} tabIndex={-1} data-providers-said><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
      </>}
    </section>
  );
}
