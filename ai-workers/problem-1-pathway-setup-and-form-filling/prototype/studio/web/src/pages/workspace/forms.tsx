// S5 Forms tab (W1-08, walkthrough v2 S5), slice 1: the combination's form lines with who fills each, from what age,
// only if (a rule, or words with no rule yet: M1), how it is filed by default within what IRCC accepts, and who signs.
// A row opens a 560 px drawer to change them. "Add a form from the library" picks only forms the library holds (P-118 Q2:
// forms enter only through the Form library); below, each form is read and matched to shared fields. Finding, replacing
// and redoing forms with AI come with the form finder (slice 3, forms lane endpoints).
import * as React from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CHANNEL_WORDS, type Channel } from "../../../../contracts/forms";
import { SIGNED_BY, type WorkspaceFormLine } from "../../../../contracts/workspace";
import { api, ApiError, useSessionView, useToast } from "@/lib/api";
import { Button, Field, Input, Notice, Panel, Pill, Select, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { ConditionBuilder } from "@/components/conditions";
import { Tip } from "@/components/status";
import { useLibraryFields, WHO, whoLabel } from "@/pages/configuration";
import { ReadingSection } from "@/pages/sources";
import { FormPicker } from "@/components/forms";
import { useApi } from "@/lib/api";
import { ChannelCell } from "@/components/channels";
/** The fields of a summary line that ChannelCell reads. */
type ChannelLine = CombinationSummary["forms"][number];
import type { CombinationSummary, CombinationView } from "../../../../contracts/programs";

/** m3 (P-113): Online is a real way for portal-only forms; the product fills it in a later wave. */
const ONLINE_WORDS = "Online: the case officer types it into the portal from the answer sheet (P-113); the browser extension fills it in a later wave.";
const TIPS = {
  who: "Whose form it is: one copy for each person it names. A minimum age leaves out anyone younger.",
  onlyIf: "When the form is needed. A rule is checked on every case; words alone cannot be checked, so a case cannot tell until a rule is built.",
  filed: "How new cases file this form unless the case officer changes it. Only ways IRCC accepts are offered (Form library; Sample until the immigration expert confirms).",
  signed: "Who signs the form. Sample until the immigration expert confirms.",
  library: "The edition this combination uses and how many of its form fields are matched to shared fields.",
};

export function FormsTab({ id, lines, filing, filingDetail, problems }: { id: string; lines: WorkspaceFormLine[]; filing: string; filingDetail: string; problems: { level: "error" | "warning"; item: string; message: string }[] }) {
  const { canAuthor, known } = useSessionView();
  const [open, setOpen] = React.useState<WorkspaceFormLine | null>(null);
  const [adding, setAdding] = React.useState(false);
  const d = useApi<CombinationView>(["combination", id], `/combinations/${id}`);
  const noRule = lines.filter((l) => l.onlyIf.kind === "words_only");
  const add = canAuthor ? <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus /> Add a form from the library</Button> : null;
  const picker = adding ? <Panel open onOpenChange={(o) => !o && setAdding(false)} title="Add a form from the library" description="Only forms already in the Form library. A new form enters there first (upload, or the form finder)." footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Close</Button><Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></>}><FormPicker combinationId={id} have={lines.map((l) => l.code)} /></Panel> : null;
  const reading = d.data ? <ReadingSection d={d.data} /> : null;
  // Break m4 (Screen 01): an author never sees the channels as read-only words while the session loads.
  if (!known) return <Spinner label="Loading forms" />;
  if (!lines.length) return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-raised p-5" data-forms-empty>
        <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-semibold">No forms yet</h2>{add}</div>
        <p className="mt-1 text-sm text-text-muted">Forms come from the <Link className="text-text-link underline" to="/library/forms">Form library</Link>. Add one here; when the form finder arrives, AI finds this combination's forms and attaches them by itself.</p>
      </div>
      {reading}{picker}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" data-filing><span className="text-text-muted">Filing: </span><b className="font-semibold" title={filingDetail !== filing ? filingDetail : undefined}>{filing}</b>{filingDetail !== filing ? <span className="sr-only"> ({filingDetail})</span> : null} <span className="text-text-muted">· {lines.length} form{lines.length === 1 ? "" : "s"} · Sample until the immigration expert confirms</span></p>
        <span className="flex items-center gap-3">{add}<Link className="text-sm text-text-link underline" to="/library/forms">Open the Form library</Link></span>
      </div>
      {noRule.length ? <Notice tone="warn" title={`${noRule.length} condition${noRule.length === 1 ? " is" : "s are"} in words only`}>A case cannot tell whom {noRule.map((l) => l.code).join(", ")} {noRule.length === 1 ? "applies" : "apply"} to until the words are turned into a rule. Release waits for it. Open the form to build the rule.</Notice> : null}
      <Table head={["Form", "Why it is here (IRCC's words)", <Head key="w" tip={TIPS.who}>Who fills it</Head>, <Head key="o" tip={TIPS.onlyIf}>Only if</Head>, <Head key="f" tip={TIPS.filed}>Filed as by default</Head>, <Head key="s" tip={TIPS.signed}>Signed by</Head>, <Head key="l" tip={TIPS.library}>In the library</Head>, ""]}>
        {lines.map((l) => (
          <tr key={l.line} data-line={l.code}>
            <td><span className="mono font-medium">{l.code}</span><br /><span className="text-xs text-text-muted">{l.title}</span></td>
            <td className="max-w-56 text-xs text-text-muted">{l.quote ? `"${l.quote.slice(0, 120)}${l.quote.length > 120 ? "…" : ""}"` : "Added by a person"}</td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">Checklist · not filed</span> : <>{whoLabel(l.who)}{l.minAge ? <span className="text-text-muted"> · {l.minAge}+</span> : null}</>}</td>
            <td className="max-w-56 text-xs"><OnlyIfCell l={l} /></td>
            <td className="text-sm">{l.document ? <span className="text-text-muted">—</span> : <><ChannelCell id={id} line={{ code: l.code, channel: l.channel as Channel, channelWords: l.channelWords, signature: l.signature, document: l.document } as ChannelLine} canAuthor={canAuthor} />{l.channel === "ONLINE" ? <p className="text-xs text-text-muted" data-online-words>Answer sheet in portal order (P-113)</p> : null}</>}</td>
            <td className="text-xs">{l.document ? "—" : l.signedBy ? l.signedByLabel : <span className="text-text-muted">Not set</span>}</td>
            <td className="text-xs">{l.edition ?? <span className="text-text-muted">No edition read yet</span>}{l.document ? null : <><br /><span className="text-text-muted">{l.boxes} form fields matched</span></>}</td>
            <td>{canAuthor ? <Button size="sm" variant="ghost" aria-label={`Change ${l.code}`} onClick={() => setOpen(l)}><Pencil /> Change</Button> : null}</td>
          </tr>
        ))}
      </Table>
      {problems.length ? <ul className="space-y-1 text-sm" aria-label="Filing problems">{problems.map((x, i) => <li key={i} className="flex gap-2"><Pill tone={x.level === "error" ? "danger" : "warn"}>{x.level === "error" ? "Blocks release" : "Warning"}</Pill>{x.message}</li>)}</ul> : null}
      {open ? <LineDrawer id={id} l={open} onClose={() => setOpen(null)} /> : null}
      <div className="pt-2">{reading}</div>
      {picker}
    </div>
  );
}

/** A column heading with its tooltip (EXPERIENCE: a tooltip on every column that needs one). */
function Head({ tip, children }: { tip: string; children: React.ReactNode }) {
  return <Tip tip={tip} focusable><span className="cursor-help underline decoration-dotted decoration-text-muted underline-offset-4">{children}</span></Tip>;
}

function OnlyIfCell({ l }: { l: WorkspaceFormLine }) {
  if (l.onlyIf.kind === "always") return <Pill tone="ok">Always</Pill>;
  if (l.onlyIf.kind === "words_only") return <span data-no-rule><Pill tone="warn">No rule yet</Pill><br /><span className="text-text-muted">{l.onlyIf.words || "Only if (no words)"}</span></span>;
  return <span>{l.onlyIf.words || "Conditional (a rule)"}</span>;
}

/** The line drawer: who, minimum age, only if (rule builder and words), filed as within what IRCC accepts, signed by. */
function LineDrawer({ id, l, onClose }: { id: string; l: WorkspaceFormLine; onClose: () => void }) {
  const qc = useQueryClient(); const toast = useToast();
  const fields = useLibraryFields();
  const [who, setWho] = React.useState(l.who);
  const [minAge, setMinAge] = React.useState(l.minAge ? String(l.minAge) : "");
  const [mode, setMode] = React.useState<"always" | "only_if">(l.onlyIf.kind === "always" ? "always" : "only_if");
  const [cond, setCond] = React.useState<any>(l.condition);
  const [words, setWords] = React.useState(l.onlyIf.kind === "always" ? "" : l.onlyIf.words);
  const [channel, setChannel] = React.useState<Channel>(l.channel as Channel);
  const [signedBy, setSignedBy] = React.useState(l.signedBy ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const refresh = () => { for (const k of [["combination", id], ["combination-summary", id], ["config", id], ["catalogue"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const age = minAge.trim() === "" ? null : Number(minAge);
      await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}`, { method: "PATCH", json: {
        who, minAge: age, signedBy: signedBy || null, baseRevision: l.revision || undefined,
        attachMode: mode === "always" ? "COMBINATION_MANDATORY" : "ANSWER_CONDITIONAL",
        ...(mode === "only_if" ? (cond ? { condition: cond, conditionPlain: words } : { conditionPlain: words }) : {}),
      } });
      if (channel !== l.channel) await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}/channel`, { method: "PATCH", json: { channel, from: l.channel } });
      toast.push({ tone: "ok", text: `${l.code} saved to the draft` }); refresh(); onClose();
    } catch (e) {
      const err = e as ApiError;
      const fe: Record<string, string> = {};
      for (const x of err.problem?.errors ?? []) fe[x.field] = x.message;
      if (Object.keys(fe).length) setErrors(fe); else toast.push({ tone: "danger", text: err.message });
      if (err.status === 409) refresh();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await api(`/combinations/${id}/forms/${encodeURIComponent(l.code)}`, { method: "PATCH", json: { retire: true, baseRevision: l.revision || undefined } }); toast.push({ tone: "ok", text: `${l.code} removed from this combination; it stays in the Form library` }); refresh(); onClose(); }
    catch (e) { toast.push({ tone: "danger", text: (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={`${l.code} · ${l.title}`} description={l.edition ? `Edition ${l.edition} · ${l.boxes} form fields matched` : "No edition read yet"}
      badge={l.origin === "AI_PROPOSAL" ? <Pill tone="ai">Picked by AI · Sample</Pill> : null}
      footer={<><Button variant="ghost" className="text-text-danger" onClick={() => void remove()} disabled={busy}><Trash2 /> Remove from this combination</Button><span className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => void save()} busy={busy}>Save to draft</Button></span></>}>
      <div className="space-y-5">
        {l.quote ? <p className="rounded-lg bg-surface px-3 py-2 text-xs text-text-muted">IRCC's words: "{l.quote}"</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who fills it" hint="One copy for each person it names." error={errors.who}><Select value={who} onChange={(e) => setWho(e.target.value)}>{WHO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Field>
          <Field label="From age (optional)" hint="Leave empty for any age. Sample." error={errors.minAge}><Input inputMode="numeric" value={minAge} onChange={(e) => setMinAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} placeholder="Any age" /></Field>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-xs font-medium">Only if</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="onlyif" checked={mode === "always"} onChange={() => setMode("always")} aria-label="Always" /> Always</label>
            <label className="flex items-center gap-2"><input type="radio" name="onlyif" checked={mode === "only_if"} onChange={() => setMode("only_if")} aria-label="Only if" /> Only if…</label>
          </div>
          {mode === "only_if" ? <>
            <Field label="In plain words" hint="Shown to staff and clients as the reason." error={errors.conditionPlain}><Input value={words} onChange={(e) => setWords(e.target.value)} placeholder="Is in a common-law union" /></Field>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs text-text-muted">{cond ? "The rule a case checks:" : "No rule yet: a case cannot tell whom this form applies to, and release waits for a rule. Build it here."}</p>
              <ConditionBuilder value={cond} onChange={setCond} fields={fields.list} />
            </div>
          </> : null}
        </fieldset>
        {!l.document ? <div className="grid grid-cols-2 gap-3">
          <Field label="Filed as by default" hint={channel === "ONLINE" ? ONLINE_WORDS : l.acceptedBasis}><Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>{(["PDF_UPLOAD", "SIGNED_PDF_UPLOAD", "ONLINE"] as Channel[]).map((c) => <option key={c} value={c} disabled={!l.accepted.includes(c)}>{CHANNEL_WORDS[c]}{l.accepted.includes(c) ? "" : " (IRCC does not accept it)"}</option>)}</Select></Field>
          <Field label="Signed by" hint="Sample until the immigration expert confirms." error={errors.signedBy}><Select value={signedBy} onChange={(e) => setSignedBy(e.target.value)}><option value="">Not set</option>{SIGNED_BY.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
        </div> : null}
      </div>
    </Panel>
  );
}
