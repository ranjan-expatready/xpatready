// Screen 01 fix pass (P-74): the forms decisions made visible on the combination page, on the F1 back end
// (api/src/forms.ts, engine/channels.ts). C1.6 each form line's channel and the derived filing method; the author sets a
// line's channel. W1-02 (P-102, P-107): Online stays a choice and says it needs the browser extension (later wave); the
// portal choice, "Add an online form" and what drafting reads online are parked with the extension.
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CHANNEL_MEANS, CHANNEL_WORDS, CHANNELS, ONLINE_LATER, SIGNATURE_WORDS, type Channel, type Signature } from "../../../contracts/forms";
import type { CombinationSummary } from "../../../contracts/programs";
import { api, useToast } from "@/lib/api";
import { Select } from "@/components/ui/controls";

const refresh = (qc: ReturnType<typeof useQueryClient>, id: string) => { for (const k of [["combination-summary", id], ["combination", id], ["catalogue"], ["draft"], ["config", id]]) void qc.invalidateQueries({ queryKey: k }); };

/** A select that saves what is picked (break K1): a mouse pick saves at once; arrow keys only move the choice, saved
 *  after a pause or when focus leaves, so one key press is not one save. It stays enabled while saving, so focus stays
 *  on it. Saves run one at a time, each from the last saved value (the server's version check); a refusal puts the
 *  saved value back. */
function usePick<T extends string>(saved: T, save: (v: T, from: T) => Promise<boolean>) {
  const [value, setValue] = React.useState<T>(saved);
  const last = React.useRef(saved), key = React.useRef(false), running = React.useRef(false), pending = React.useRef<T | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => { last.current = saved; if (!running.current && pending.current === null) setValue(saved); }, [saved]);
  React.useEffect(() => () => clearTimeout(timer.current), []);
  const flush = async () => {
    clearTimeout(timer.current);
    if (running.current || pending.current === null) return;
    const v = pending.current; pending.current = null;
    if (v === last.current) return;
    running.current = true;
    const ok = await save(v, last.current).catch(() => false);
    running.current = false;
    if (ok) last.current = v; else if (pending.current === null) setValue(last.current);
    if (pending.current !== null) void flush();
  };
  return {
    value, onKeyDown: () => { key.current = true; }, onPointerDown: () => { key.current = false; }, onBlur: () => { key.current = false; void flush(); },
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value as T; setValue(v); pending.current = v;
      if (key.current) { clearTimeout(timer.current); timer.current = setTimeout(() => void flush(), 800); } else void flush();
    },
  };
}

/** The line under "Forms": the derived filing method. */
export function FilingLine({ sum }: { sum: CombinationSummary }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" data-filing>
      <span title={sum.filingDetail !== sum.filing ? sum.filingDetail : undefined}><span className="text-text-muted">Filing: </span><b className="font-semibold">{sum.filing}</b>{sum.filingDetail !== sum.filing && sum.forms.length ? <span className="sr-only"> ({sum.filingDetail})</span> : null}</span>
    </div>
  );
}

/** One channel as the Forms tab offers it (P-143, C-3, C-4): refused ones stay in the list, greyed, with the reason. */
export type ChannelOption = { channel: string; words: string; ok: boolean; why: string | null };
/** "Filed as" for one line: the author picks Online, PDF upload, Paper or Not needed (P-143), only what IRCC accepts for
 *  the combination's IRCC account (P-107: Online is allowed and says it needs the browser extension, later wave). */
export function ChannelCell({ id, line, canAuthor, options }: { id: string; line: CombinationSummary["forms"][number]; canAuthor: boolean; options?: ChannelOption[] }) {
  const qc = useQueryClient(); const toast = useToast();
  const pick = usePick<Channel>(line.channel, async (channel, from) => {
    try { await api(`/combinations/${id}/forms/${encodeURIComponent(line.code)}/channel`, { method: "PATCH", json: { channel, from } }); toast.push({ tone: "ok", text: `${line.code} filed as ${CHANNEL_WORDS[channel]}` }); refresh(qc, id); return true; }
    catch (e) { refresh(qc, id); toast.push({ tone: "danger", text: (e as Error).message }); return false; }
  });
  if (line.document) return <span className="text-text-muted">Checklist (not filed)</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {canAuthor ? (
        <Select aria-label={`How ${line.code} is filed`} title="How this form reaches IRCC: online in the account's own screens, as a PDF upload, on paper, or not at all when the account asks it itself" className="h-8 w-auto" {...pick}>
          {CHANNELS.map((c) => { const o = options?.find((x) => x.channel === c); const off = !!o && !o.ok && c !== line.channel;
            return <option key={c} value={c} disabled={off} title={o?.why ?? CHANNEL_MEANS[c]}>{CHANNEL_WORDS[c]}{c === "ONLINE" ? " (later wave)" : ""}{off ? " (IRCC does not accept it)" : ""}</option>; })}
        </Select>
      ) : <span>{line.channelWords}</span>}
      {line.channel === "ONLINE" ? <span className="text-xs text-text-muted" data-online-later>{ONLINE_LATER}</span> : line.channel === "NOT_NEEDED" ? <span className="text-xs text-text-muted" data-not-needed>{CHANNEL_MEANS.NOT_NEEDED}</span> : null}
      {options?.find((o) => o.channel === line.channel && !o.ok)?.why ? <span className="text-xs text-danger" role="note">{options.find((o) => o.channel === line.channel)!.why}</span> : null}
    </div>
  );
}

/** P-143 (C-2): how one line is signed, from the signatures that fit its channel; saved with the channel it fits. */
export function SignatureCell({ id, code, channel, signature, signatures, canAuthor }: { id: string; code: string; channel: Channel; signature: Signature; signatures: { kind: string; words: string }[]; canAuthor: boolean }) {
  const qc = useQueryClient(); const toast = useToast();
  const pick = usePick<Signature>(signature, async (to, from) => {
    try { await api(`/combinations/${id}/forms/${encodeURIComponent(code)}/channel`, { method: "PATCH", json: { channel, signature: to, from: channel, fromSignature: from } }); toast.push({ tone: "ok", text: `${code}: ${SIGNATURE_WORDS[to].toLowerCase()}` }); refresh(qc, id); return true; }
    catch (e) { refresh(qc, id); toast.push({ tone: "danger", text: (e as Error).message }); return false; }
  });
  if (!canAuthor || signatures.length < 2) return <span className="text-sm" data-signature>{SIGNATURE_WORDS[signature]}</span>;
  return (
    <Select aria-label={`How ${code} is signed`} title="How this form is signed. Only signatures that fit the way it is filed are offered (Sample until the immigration expert confirms)." className="h-8 w-auto" {...pick}>
      {signatures.map((x) => <option key={x.kind} value={x.kind}>{x.words}</option>)}
    </Select>
  );
}
