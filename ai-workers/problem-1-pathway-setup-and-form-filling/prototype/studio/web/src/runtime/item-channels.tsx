// C11.6 How each form is filed, on the case (M3-B; r5c BR-8, §6; P-122, P-137, P-143; J7 2.3 and 5.2). The case page
// says which IRCC account the application goes through, read-only (set by the combination, never on the case), and,
// per person, each form's channel: it starts on the combination line's channel (the default the combination proposes),
// with what IRCC accepts for it on that account and the signature that follows. "Change channel" offers every way to
// file, the ones IRCC does not accept there greyed with the Form library's record of why; Paper through an IRCC account
// asks for the accommodation reason (VV-R02, FQ-3). The server decides (PATCH /runtime/items/:id/channel): a refusal is
// shown on its field in its own words, a change made from an older read says Reload. Only this person's item changes;
// the combination's line stays as released. Every form number, channel and quote comes from the case's data.
import * as React from "react";
import { Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Notice, Pill, Textarea } from "@/components/ui/controls";
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
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
/** Paper through an IRCC account is an accommodation (the server's rule, engine/runtime/prepare.ts channelChange). */
const paperNeedsReason = (to: Channel, portal: string | null) => to === "PAPER" && !!portal && portal !== "PAPER";

export function ItemChannels({ caseId }: { caseId: string }) {
  const actor = useActorId();
  const q = useApi<View>(["runtime", "view", caseId, "prepare", actor], `/runtime/cases/${caseId}/prepare`, { retry: noRetryOnRefusal });
  const firm = useFirm();
  const nameOf = (id: string | null) => firm.data?.users.find((u) => u.id === id)?.name ?? "the case team";
  const [editing, setEditing] = React.useState<ChannelItem | null>(null);
  const back = React.useRef<HTMLButtonElement | null>(null);
  const buttons = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const close = () => { const id = editing?.id; setEditing(null); requestAnimationFrame(() => (id ? buttons.current[id] : back.current)?.focus()); };
  const v = q.data;
  const forms = (v?.items ?? []).filter((i): i is ChannelItem => i.kind === "form" && !!i.form && !!i.channel);
  const readOnly = new Set((v?.filings ?? []).filter((f) => f.read_only).map((f) => f.id));
  const people = (v?.people ?? []).filter((p) => forms.some((f) => f.subject === p.subject));
  return (
    <section aria-labelledby="channels-h" className="rounded-xl border border-border bg-surface-raised" data-item-channels>
      <header className="space-y-1 border-b border-border px-4 py-3">
        <h2 id="channels-h" className="text-base font-semibold">How each form is filed</h2>
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
                    const fits = f.accepts.includes(f.channel), recorded = readOnly.has(f.filing);
                    return (
                      <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]" data-channel-item={f.id} data-form={f.form} data-channel={f.channel}>
                        <span className="mono font-semibold">{f.form}</span>
                        <Pill tone={fits ? "info" : "danger"}>{CHANNEL_WORDS[f.channel]}</Pill>
                        <span className="text-text-muted">{SIGNATURE_WORDS[f.signature] ?? f.signature}</span>
                        <span className="text-text-muted">IRCC accepts: {f.accepts.length ? words(f.accepts) : "nothing recorded yet"}</span>
                        <span className="flex-1" />
                        <Button ref={(b) => { buttons.current[f.id] = b; }} size="sm" variant="secondary" disabled={recorded} aria-describedby={recorded ? `ch-ro-${f.id}` : undefined}
                          aria-label={`Change how ${f.form} is filed for ${p.label}`} onClick={(e) => { back.current = e.currentTarget; setEditing(f); }}>Change channel</Button>
                        <p className="basis-full text-text-muted" data-channel-why>
                          {f.channel_changed ? <>Changed from {CHANNEL_WORDS[f.line_channel]} (the combination’s default) by {nameOf(f.channel_changed.by)}, {day(f.channel_changed.at)}{f.channel_changed.reason ? <>: “{f.channel_changed.reason}”</> : null}.</>
                            : <>The combination’s default.</>}
                          {!fits ? <span className="text-text-danger"> IRCC does not accept {CHANNEL_WORDS[f.channel]} for {f.form} here: choose a way it accepts.</span> : null}
                          {recorded ? <span id={`ch-ro-${f.id}`}> Submitted to IRCC: how it is filed no longer changes.</span> : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>}
      {editing && v ? <ChannelDialog caseId={caseId} item={editing} portal={v.portal} version={v.version} reload={() => q.refetch()} close={close} /> : null}
    </section>
  );
}

function ChannelDialog({ caseId, item, portal, version, reload, close }: { caseId: string; item: ChannelItem; portal: string | null; version: string; reload: () => unknown; close: () => void }) {
  const qc = useQueryClient(), toast = useToast();
  const [to, setTo] = React.useState<Channel>(item.channel);
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<{ channel?: string; reason?: string; stale?: string; other?: string }>({});
  const [busy, setBusy] = React.useState(false);
  const reasonRef = React.useRef<HTMLTextAreaElement>(null), firstRef = React.useRef<HTMLInputElement>(null); // the chosen way
  const needsReason = paperNeedsReason(to, portal);
  async function save() {
    if (to === item.channel) { close(); return; }
    setBusy(true); setErrors({});
    try {
      await api(`/runtime/items/${item.id}/channel`, { method: "PATCH", json: { channel: to, version, ...(needsReason || reason.trim() ? { reason: reason.trim() } : {}) } });
      toast.push({ tone: "ok", text: `${item.form} for ${item.person} is now filed as ${CHANNEL_WORDS[to]}. The combination’s line is unchanged.` });
      await qc.invalidateQueries({ queryKey: ["runtime", "view", caseId] });
      close();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setErrors({ stale: e.message });
      else if (e instanceof ApiError && (e.field("reason") || e.field("channel"))) {
        setErrors({ reason: e.field("reason") ?? undefined, channel: e.field("channel") ?? undefined });
        requestAnimationFrame(() => (e.field("reason") ? reasonRef.current : firstRef.current)?.focus());
      } else setErrors({ other: (e as Error).message });
    } finally { setBusy(false); }
  }
  const legend = `How ${item.form} is filed`;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Change how ${item.form} is filed`} guard initialFocus={() => firstRef.current}
      description={<>For {item.person} only. The combination files it as {CHANNEL_WORDS[item.line_channel]}; its line stays as released.</>}
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={busy} onClick={() => void save()}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }} data-channel-form>
        {errors.stale ? <Notice tone="warn" title="Changed since you read it" action={<Button size="sm" variant="secondary" onClick={() => { void reload(); setErrors({}); }}>Reload</Button>}>{errors.stale}</Notice> : null}
        {errors.other ? <Notice tone="danger" title="Not saved">{errors.other}</Notice> : null}
        <fieldset className="space-y-2" aria-describedby={errors.channel ? "ch-refused" : undefined}>
          <legend className="text-xs font-medium">{legend}</legend>
          {CHANNELS.map((c) => {
            const accepted = item.accepts.includes(c), id = `ch-${item.id}-${c}`;
            return (
              <label key={c} htmlFor={id} className={`flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-[13px] ${accepted ? "cursor-pointer" : "text-text-muted"}`} data-option={c} data-accepted={accepted}>
                <input ref={c === to ? firstRef : undefined} id={id} type="radio" name={`ch-${item.id}`} value={c} className="mt-0.5" checked={to === c} disabled={!accepted}
                  aria-describedby={`${id}-note`} onChange={() => { setTo(c); setErrors({}); }} />
                <span>
                  <span className="font-medium text-text">{CHANNEL_WORDS[c]}</span>{c === item.line_channel ? <span className="text-text-muted"> · the combination’s default</span> : null}
                  <span id={`${id}-note`} className="block text-text-muted">
                    {accepted ? CHANNEL_MEANS[c] : <>IRCC does not accept it here: the Form library records {item.accepts.length ? words(item.accepts) : "no way"} for {item.form}{item.accepts_quote ? <> (“{item.accepts_quote}”)</> : null}.</>}
                  </span>
                </span>
              </label>
            );
          })}
          {errors.channel ? <p id="ch-refused" role="alert" className="text-xs text-text-danger">{errors.channel}</p> : null}
        </fieldset>
        {needsReason || errors.reason ? (
          <Field label="Why on paper" hint="Paper is only for a person who cannot apply online, for example as an accommodation. It is kept with this form." error={errors.reason ?? null}>
            <Textarea ref={reasonRef} value={reason} maxLength={400} rows={2} onChange={(e) => { setReason(e.target.value); setErrors({}); }} />
          </Field>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
