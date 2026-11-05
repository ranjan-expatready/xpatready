// C11.6 How each form is filed, on the case (M3-B; r5c BR-8, §6; P-122, P-137, P-143; J7 2.3 and 5.2). The case page
// says which IRCC account the application goes through, read-only (set by the combination, never on the case), and,
// per person, each form's channel: it starts on the combination line's channel (the default the combination proposes),
// with what IRCC accepts for it on that account and the signature that follows. "Change channel" offers every way to
// file, the ones IRCC does not accept there greyed, with the Form library's record of why said once; Paper through an
// IRCC account asks for the accommodation reason (VV-R02, FQ-3). The server decides (PATCH /runtime/items/:id/channel):
// a refusal is shown on its field in its own words, a change made from an older read says Reload, and the dialog always
// works from the latest read of its item. Only this person's item changes; the combination's line stays as released.
// Every form number, channel and quote comes from the case's data (P-319).
import * as React from "react";
import { Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNEL_MEANS, CHANNEL_WORDS, CHANNELS, SIGNATURE_WORDS, type Channel, type Signature } from "../../../contracts/forms";
import { noRetryOnRefusal } from "./questionnaire";
import { useFirm } from "./team";

type ChannelItem = {
  id: string; kind: "form"; filing: string; subject: string; person: string; form: string;
  channel: Channel; line_channel: Channel; accepts: Channel[]; accepts_quote: string | null; signature: Signature;
  channel_changed: { by: string | null; at: string | null; reason: string | null } | null;
};
type Person = { subject: string; label: string; role: string; applies: boolean };
type View = { derived: boolean; why?: string; portal: string | null; portal_words: string | null; version: string; people: Person[];
  filings: { id: string; read_only?: boolean }[]; items: ({ kind: string } & Partial<ChannelItem>)[] };

const ROLE: Record<string, string> = { principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child" };
const words = (c: readonly string[]) => c.map((x) => CHANNEL_WORDS[x as Channel] ?? x).join(" · ");
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
/** Paper through an IRCC account is an accommodation (the server's rule, engine/runtime/prepare.ts channelChange). */
const paperNeedsReason = (to: Channel, portal: string | null) => to === "PAPER" && !!portal && portal !== "PAPER";
const formsOf = (v: View | undefined) => (v?.items ?? []).filter((i): i is ChannelItem => i.kind === "form" && !!i.form && !!i.channel);

export function ItemChannels({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<View>(["runtime", "view", caseId, "prepare", actor], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const firm = useFirm();
  const nameOf = (id: string | null) => firm.data?.users.find((u) => u.id === id)?.name ?? "the case team";
  const [editing, setEditing] = React.useState<string | null>(null);
  const buttons = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const heading = React.useRef<HTMLHeadingElement>(null);
  // Focus goes back to the row's button; when that button is now disabled (the filing was recorded meanwhile), to the heading.
  const close = () => { const id = editing; setEditing(null); requestAnimationFrame(() => { const b = id ? buttons.current[id] : null; (b && !b.disabled ? b : heading.current)?.focus(); }); };
  const v = q.data;
  const forms = formsOf(v);
  const readOnly = new Set((v?.filings ?? []).filter((f) => f.read_only).map((f) => f.id));
  const people = (v?.people ?? []).filter((p) => forms.some((f) => f.subject === p.subject));
  const open = forms.find((f) => f.id === editing);
  const [opening, setOpening] = React.useState<string | null>(null);
  // Review R2-M1: the dialog opens only on a fresh read of its item, so its first choice is what the case holds now.
  // The button stays enabled (aria-busy only) so it keeps the focus, and the dialog gives the focus back to it on close.
  async function openFresh(id: string) { if (opening) return; setOpening(id); try { await q.refetch(); } finally { setOpening(null); } setEditing(id); }
  // Review R2 n4: an item that leaves the view while its dialog is open closes the dialog properly.
  React.useEffect(() => { if (editing && v && !open) close(); }, [editing, v, open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section aria-labelledby="channels-h" className="rounded-xl border border-border bg-surface-raised" data-item-channels>
      <header className="space-y-1 border-b border-border px-4 py-3">
        <h2 id="channels-h" ref={heading} tabIndex={-1} className="text-base font-semibold outline-none">How each form is filed</h2>
        <p className="text-[13px] text-text-muted">Each form starts on its combination’s channel. Change one person’s form only to a way IRCC accepts; the combination stays as released.</p>
        {v?.portal_words ? <p className="flex items-center gap-1.5 text-[13px]" data-portal><Lock className="size-3.5 text-text-muted" aria-hidden /><span>{v.portal_words}</span></p> : null}
      </header>
      {q.isLoading ? <div className="p-4"><Skeleton className="h-16 w-full" /></div>
        : q.isError ? <div className="p-4"><Notice tone="danger" title="How each form is filed could not be loaded">{(q.error as Error).message}</Notice></div>
        : !v!.derived ? <p className="px-4 py-3 text-sm text-text-muted">{v!.why ?? "The filings are not worked out yet."}</p>
        : !forms.length ? <p className="px-4 py-3 text-sm text-text-muted">No form applies to anyone on this case yet.</p>
        : <div className="divide-y divide-border">
            {people.map((p) => (
              <div key={p.subject} className="px-4 py-3" data-channel-person={p.subject}>
                <h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{p.label} <span className="font-normal text-text-muted">· {ROLE[p.role] ?? p.role}</span></h3>
                <ul className="mt-2 space-y-2">
                  {forms.filter((f) => f.subject === p.subject).map((f) => {
                    const fits = f.accepts.includes(f.channel), recorded = readOnly.has(f.filing), onDefault = f.channel === f.line_channel;
                    return (
                      <li key={f.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]" data-channel-item={f.id} data-form={f.form} data-channel={f.channel}>
                        <span className="mono font-semibold">{f.form}</span>
                        <Pill tone={fits ? "info" : "danger"}><span className="sr-only">Channel: </span>{CHANNEL_WORDS[f.channel]}</Pill>
                        <span className="text-text-muted"><span className="sr-only">Signature: </span>{SIGNATURE_WORDS[f.signature] ?? f.signature}</span>
                        <span className="text-text-muted">IRCC accepts: {f.accepts.length ? words(f.accepts) : "nothing recorded yet"}</span>
                        <span className="flex-1" />
                        <Button ref={(b) => { buttons.current[f.id] = b; }} size="sm" variant="secondary" disabled={recorded} aria-busy={opening === f.id || undefined} aria-describedby={recorded ? `ch-ro-${f.id}` : undefined}
                          aria-label={`Change channel: ${f.form} for ${p.label}`} onClick={() => void openFresh(f.id)}>Change channel</Button>
                        <p className="min-w-0 basis-full text-text-muted [overflow-wrap:anywhere]" data-channel-why>
                          {onDefault || !f.channel_changed ? <>The combination’s default.</>
                            : <>Changed from {CHANNEL_WORDS[f.line_channel]} (the combination’s default) by {nameOf(f.channel_changed.by)} on {day(f.channel_changed.at)}{f.channel_changed.reason ? <>: “{f.channel_changed.reason}”</> : null}.</>}
                          {!fits ? <span className="text-text-danger" data-not-accepted> IRCC does not accept {CHANNEL_WORDS[f.channel]} for {f.form} here: choose a way it accepts.</span> : null}
                          {recorded ? <span id={`ch-ro-${f.id}`}> Submitted to IRCC: how it is filed no longer changes.</span> : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>}
      {editing && v && open ? <ChannelDialog key={editing} caseId={caseId} item={open} recorded={readOnly.has(open.filing)} portal={v.portal} version={v.version} reload={async () => (await q.refetch()).data?.version ?? v.version} close={close} /> : null}
    </section>
  );
}

type Errors = { channel?: string; reason?: string; refused?: { title: string; detail: string }; other?: string };

/** `item` is always the latest read (the parent passes it from its query), so after Reload the dialog compares against
 *  what the case holds now, not what it held when the dialog opened (break M2, review m6). */
function ChannelDialog({ caseId, item, recorded, portal, version, reload, close }: { caseId: string; item: ChannelItem; recorded: boolean; portal: string | null; version: string; reload: () => Promise<string>; close: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  // The version this dialog read (when it opened, or at its own Reload): a change made by anyone since is refused (409,
  // C11.6-11), even when a background refresh already shows it, so a choice is never saved over a change not yet seen.
  const [read, setRead] = React.useState(version);
  const [to, setTo] = React.useState<Channel>(item.channel);
  const saved = item.channel === "PAPER" ? item.channel_changed?.reason ?? "" : "";
  const [reason, setReason] = React.useState(saved);
  const [errors, setErrors] = React.useState<Errors>({});
  const [busy, setBusy] = React.useState(false);
  const reasonRef = React.useRef<HTMLInputElement>(null), chosenRef = React.useRef<HTMLInputElement>(null); // the chosen way
  const needsReason = paperNeedsReason(to, portal);
  const same = to === item.channel;
  const refusedNote = item.accepts.length ? `IRCC accepts ${item.form} here only as ${words(item.accepts)}` : `Nothing is recorded yet for what IRCC accepts for ${item.form} here`;
  async function save() {
    if (same || recorded) return;
    setBusy(true); setErrors({});
    try {
      // The reason goes only with Paper (break M1): a reason typed for Paper and left behind is never saved on another way.
      const r = await api<{ changed: boolean }>(`/runtime/items/${item.id}/channel`, { method: "PATCH", json: { channel: to, version: read, ...(to === "PAPER" ? { reason: reason.trim() } : {}) } });
      toast.push(r.changed ? { tone: "ok", text: `${item.form} for ${item.person} is now filed as ${CHANNEL_WORDS[to]}. The combination’s line is unchanged.` }
        : { tone: "info", text: `Nothing changed: ${item.form} for ${item.person} was already filed as ${CHANNEL_WORDS[to]}.` });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      close();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErrors({ refused: { title: e.problem.title ?? "Not saved", detail: e.message } });
      else if (e instanceof ApiError && (e.field("reason") || e.field("channel"))) {
        setErrors({ reason: e.field("reason") ?? undefined, channel: e.field("channel") ?? undefined });
        requestAnimationFrame(() => (e.field("reason") ? reasonRef.current : chosenRef.current)?.focus());
      } else setErrors({ other: (e as Error).message });
    } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Change how ${item.form} is filed`} guard initialFocus={() => chosenRef.current}
      description={<>For {item.person} only. The combination files it as {CHANNEL_WORDS[item.line_channel]}; its line stays as released.</>}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} disabled={same || recorded} aria-describedby={same ? "ch-same" : undefined} onClick={() => void save()}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }} data-channel-form>
        {errors.refused ? <Notice tone="warn" title={errors.refused.title} action={recorded ? undefined : <Button size="sm" variant="secondary" onClick={() => { void reload().then((v) => { setRead(v); setErrors({}); }); }}>Reload</Button>}>{errors.refused.detail}</Notice> : null}
        {recorded ? <Notice tone="info" title="Submitted to IRCC">How {item.form} is filed for {item.person} no longer changes.</Notice> : null}
        {errors.other ? <Notice tone="danger" title="Not saved">{errors.other}</Notice> : null}
        <fieldset className="space-y-2" aria-describedby={`ch-accepts-${item.id}${errors.channel ? " ch-refused" : ""}`}>
          <legend className="text-xs font-medium">How {item.form} is filed</legend>
          {CHANNELS.map((c) => {
            const accepted = item.accepts.includes(c), id = `ch-${item.id}-${c}`;
            return (
              <div key={c} className={`flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[13px] ${accepted ? "" : "text-text-muted"}`} data-option={c} data-accepted={accepted}>
                <input ref={c === to ? chosenRef : undefined} id={id} type="radio" name={`ch-${item.id}`} value={c} className="mt-0.5" checked={to === c} disabled={!accepted || recorded}
                  aria-describedby={`${id}-note`} onChange={() => { setTo(c); setErrors({}); }} />
                <div className="min-w-0">
                  <label htmlFor={id} className={`font-medium text-text ${accepted ? "cursor-pointer" : ""}`}>{CHANNEL_WORDS[c]}</label>
                  {c === item.line_channel ? <span className="text-text-muted"> · the combination’s default</span> : null}
                  {c === item.channel ? <span className="text-text-muted"> · filed this way now</span> : null}
                  <p id={`${id}-note`} className="text-text-muted">
                    {accepted ? CHANNEL_MEANS[c] : c === "NOT_NEEDED" ? "Not accepted here: the Form library does not record that the IRCC account asks this form itself." : "Not accepted here."}
                  </p>
                </div>
              </div>
            );
          })}
          <p id={`ch-accepts-${item.id}`} className="text-xs text-text-muted [overflow-wrap:anywhere]" data-accepts-record>
            {refusedNote}{item.accepts_quote ? <>. The Form library’s record: “{item.accepts_quote}”</> : null}.
          </p>
          {errors.channel ? <p id="ch-refused" role="alert" className="text-xs text-text-danger [overflow-wrap:anywhere]">{errors.channel}</p> : null}
        </fieldset>
        {to === "PAPER" && (needsReason || errors.reason) ? (
          <Field label="Why on paper" hint={same && saved ? "The reason given when it was moved to paper. To give another, move it to another way first." : "Paper is only for a person who cannot apply online, for example as an accommodation. It is kept with this form."} error={errors.reason ?? null}>
            <Input ref={reasonRef} value={reason} maxLength={400} readOnly={same} onChange={(e) => { setReason(e.target.value); setErrors({}); }} />
          </Field>
        ) : null}
        {same && !recorded ? <p id="ch-same" className="text-xs text-text-muted">Choose another way to file to save a change.</p> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
