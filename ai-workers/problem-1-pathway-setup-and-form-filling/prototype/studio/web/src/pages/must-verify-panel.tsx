// C7.9 (row B142 = L-SA8; P-242; SA-1B-1 rule 9): "Must verify before filing" on a library field's page. It shows the
// flag and the rule in words; the author proposes it on or off with a reason, and only the immigration expert approves
// it on To review (never the proposer); it goes out with the next release. No AI (US$0).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useApi } from "@/lib/api";
import { Button, Notice, Pill, Textarea } from "@/components/ui/controls";

type View = { key: string; name: string; on: boolean; rule: string; open: { id: string; status: "WAITING" | "RETURNED" | "APPROVED"; by: string; reason: string; note: string | null; on: boolean } | null };
const OPEN_WORDS = { WAITING: "waits for the immigration expert on To review", RETURNED: "was returned", APPROVED: "is approved and goes out with the next release" } as const;

export function MustVerifySection({ fieldKey, canAuthor }: { fieldKey: string; canAuthor: boolean }) {
  const qc = useQueryClient();
  const q = useApi<View>(["must-verify", fieldKey], `/library/fields/${encodeURIComponent(fieldKey)}/must-verify`);
  const [asking, setAsking] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [msg, setMsg] = React.useState<{ tone: "ok" | "danger"; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const said = React.useRef<HTMLDivElement>(null), box = React.useRef<HTMLTextAreaElement>(null), opener = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (asking) box.current?.focus(); }, [asking]); // break F7: the reason box takes focus
  React.useEffect(() => { if (msg) said.current?.scrollIntoView({ block: "nearest" }); if (msg?.tone === "danger") said.current?.focus(); }, [msg]);
  const v = q.data;
  const send = async () => {
    setBusy(true); setMsg(null);
    try {
      await api(`/library/fields/${encodeURIComponent(fieldKey)}/must-verify`, { method: "POST", json: { on: !v!.on, reason } });
      setAsking(false); setReason("");
      setMsg({ tone: "ok", text: "Sent: the immigration expert approves it on To review; nothing changes before that." });
      await qc.invalidateQueries({ queryKey: ["must-verify", fieldKey] });
    } catch (e) { setMsg({ tone: "danger", text: e instanceof ApiError ? e.message : "Something went wrong; nothing was saved." }); } finally { setBusy(false); }
  };
  return (
    <section data-must-verify className="space-y-2 rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="mv-h">
      <h2 id="mv-h" className="font-semibold">Must verify before filing</h2>
      {q.isLoading ? <p className="text-text-muted">Loading…</p> : q.isError || !v ? <p className="text-danger">It could not be read: {q.error instanceof Error ? q.error.message : "try again"}.</p> : <>
        <p data-must-verify-state>{v.on ? <Pill tone="warn">Must verify before filing</Pill> : <Pill tone="neutral">Not marked</Pill>}</p>
        <p className="text-xs text-text-muted">{v.rule} Sample until the immigration expert confirms which fields.</p>
        {v.open ? <p className="text-xs" data-must-verify-open>A change to {v.open.on ? "mark it" : "unmark it"} by {v.open.by} {OPEN_WORDS[v.open.status]}{v.open.note ? `: ${v.open.note}` : ""}. <Link className="text-text-link underline" to={`/review/change/${v.open.id}`}>Open it</Link></p> : null}
        {canAuthor && !asking && !v.open ? <Button ref={opener} size="sm" variant="secondary" onClick={() => { setAsking(true); setMsg(null); }} data-must-verify-ask>{v.on ? "Propose: no longer must verify…" : "Propose: must verify before filing…"}</Button> : null}
        {canAuthor && v.open ? <p className="text-xs text-text-muted" data-must-verify-first>{v.open.status === "RETURNED" ? "To propose it again, its proposer first withdraws the returned change (Open it, then Withdraw it)." : v.open.status === "APPROVED" ? "It goes out with the next release; to change it before then, its proposer withdraws it (Open it)." : "One change at a time: it is decided first, or its proposer withdraws it (Open it)."}</p> : null}
        {canAuthor && asking ? (
          <div className="space-y-2" data-must-verify-form onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setAsking(false); setMsg(null); requestAnimationFrame(() => opener.current?.focus()); } }}>
            <label className="block text-xs">Why, for every combination that asks it
              <Textarea ref={box} aria-label="Why the flag changes" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="mt-1" />
            </label>
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={send} data-must-verify-send>Send to the immigration expert</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAsking(false); setMsg(null); requestAnimationFrame(() => opener.current?.focus()); }}>Cancel</Button>
            </div>
          </div>) : null}
        {msg ? <div ref={said} tabIndex={-1}><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
      </>}
    </section>
  );
}
