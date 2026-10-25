// Screen 03 Overview tab (S1): what is missing with its next step, held files, the four counts, the people, the sources
// with when each was read, and the released versions. The forms moved to the Forms tab; the Links card comes with S3.
// One request: GET /combinations/:id/workspace?tab=overview.
import * as React from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { sharedStep, type CombinationSummary, type CombinationView, type HeldFile, type ParticipantLine } from "../../../../contracts/programs";
import { fmtWhen } from "@/components/status";
import { ModePill, StatusPill } from "@/pages/combination";
import { ParticipantsEditor } from "@/components/participants";
import { api, useAction, useSessionView } from "@/lib/api";
import { Button, Dialog, Stat, Table } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

export function OverviewTab({ d, sum, show }: { d: CombinationView; sum: CombinationSummary; show: string | null }) {
  const [edit, setEdit] = React.useState(false);
  const { canAuthor } = useSessionView();
  const k = d.draft.counts;
  const errors = d.draft.problems.filter((p) => p.level === "error").length, warnings = d.draft.problems.length - errors;
  const row = sum.row;
  const missing = row && row.status !== "READY" ? row.missing : [];
  const held: HeldFile[] = sum.held ?? [];
  const missingRef = React.useRef<HTMLElement>(null), heldRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => { const el = show === "missing" ? missingRef.current : show === "held" ? heldRef.current : null; el?.scrollIntoView({ block: "center" }); el?.focus({ preventScroll: true }); }, [show]);
  const id = d.combination.id;
  const online = sum.forms.filter((f) => !f.document && f.channel === "ONLINE").length, signed = sum.forms.filter((f) => f.channel === "SIGNED_PDF_UPLOAD").length;
  return (
    <div className="space-y-5">
      {missing.length ? (
        <section ref={missingRef} tabIndex={-1} aria-labelledby="ov-missing" className={cn("rounded-xl border border-danger/30 bg-danger/5 p-4 outline-none", show === "missing" && "ring-[3px] ring-danger/30")}>
          <h2 id="ov-missing" className="font-semibold">{row?.release ? `Why firms cannot use it (${missing.length})` : `Missing before firms can use it (${missing.length})`}</h2>
          <ul className="mt-2 space-y-1 text-sm">{missing.map((m, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />{TAB_FOR[m.code] ? <Link className="hover:underline" to={`/c/${id}/${TAB_FOR[m.code][0]}`} title={TAB_FOR[m.code][1]}>{m.text}</Link> : <span>{m.text}</span>}</li>)}</ul>
          {sharedStep(missing) ? <p className="mt-2 text-sm" data-shared-step>Next step for all of these: <b className="font-semibold">{sharedStep(missing)}</b>.</p> : null}
        </section>
      ) : null}
      {held.length ? (
        <section ref={heldRef} tabIndex={-1} aria-labelledby="ov-held" className={cn("rounded-xl border border-warn/40 bg-warn/10 p-4 outline-none", show === "held" && "ring-[3px] ring-warn/40")}>
          <h2 id="ov-held" className="font-semibold">Held for a person ({held.length})</h2>
          <ul className="mt-2 space-y-1.5 text-sm">{held.map((h) => <li key={h.id}><b className="font-semibold">{h.edition ?? h.code ?? h.file}</b> · {HELD_WORD[h.outcome ?? ""] ?? "Held for a person"} <span className="text-text-muted">({h.reason}; file {h.file})</span></li>)}</ul>
          <p className="mt-2 text-xs text-text-muted">Held files are not in the library and not used by this combination. A person reviews what changed before a new edition is used.</p>
        </section>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Forms" value={<Link className="hover:underline" to={`/c/${id}/forms`}>{k.forms}</Link>} sub={sum.forms.length ? `${online} online · ${signed} signed PDF upload${signed === 1 ? "" : "s"} · ${k.map_boxes} mapped form fields` : "No forms yet. Add them on Forms."} />
        {/* The row's own count (BR-10), so the tile never contradicts the missing list; the words say what it counts. */}
        <Stat label="Questions" value={row?.counts?.questions ?? 0} sub={`questions across all people (each person role counted) · ${k.sections} sections · ${k.fields} fields`} />
        <Stat label="Documents" value={k.document_requirements} sub="base and conditional requirements" />
        {/* Only this combination's own problems (Lead check item 3), each listed on Review and release. */}
        <Stat label="Rules and checks" value={`${k.rules} · ${k.checks}`} tone={errors ? "danger" : undefined}
          sub={errors || warnings ? <Link className="text-text-link underline" to={`/c/${id}/review`}>{errors ? `${errors} problem${errors === 1 ? "" : "s"} to fix` : `${warnings} warning${warnings === 1 ? "" : "s"}`}: see them</Link> : "no problems"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-people">
          <div className="flex items-center justify-between"><h2 id="ov-people" className="font-semibold">People in this combination</h2>{canAuthor ? <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil /> Edit</Button> : null}</div>
          <Table className="mt-3" dense head={["Person role", "Number", "Files own application"]}>{d.combination.participants.map((p, i) => <tr key={i}><td>{p.label}</td><td>{p.min === p.max ? p.min : `${p.min} to ${p.max}`}</td><td>{p.applies === false ? "No" : "Yes"}</td></tr>)}</Table>
          <p className="mt-2 text-xs text-text-muted">See what each person gets on <Link className="text-text-link underline" to={`/c/${id}/preview`}>Preview by person</Link>.</p>
          {edit ? <EditPeople d={d} onClose={() => setEdit(false)} /> : null}
        </section>
        <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-sources">
          <h2 id="ov-sources" className="font-semibold">Sources</h2>
          {!sum.sources.length ? <p className="mt-2 text-sm text-text-muted">No official sources yet. Upload the IRCC forms and the document checklist this application uses on <Link className="text-text-link underline" to={`/c/${id}/sources`}>Sources</Link>.</p> : (
            <Table className="mt-3" dense head={["Source", "Status", "Added"]}>{sum.sources.map((x) => <tr key={x.id}><td className="max-w-64 truncate" title={x.name}>{x.name}</td><td className="text-xs">{SOURCE_WORD[x.status] ?? x.status.toLowerCase().replace(/_/g, " ")}</td><td className="whitespace-nowrap text-xs">{fmtWhen(String(x.at))}</td></tr>)}</Table>
          )}
          <p className="mt-2 text-xs text-text-muted">Adding or replacing a source is reviewed before anything changes. <Link className="text-text-link underline" to={`/c/${id}/sources`}>Open Sources</Link></p>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-releases">
        <h2 id="ov-releases" className="font-semibold">Released versions</h2>
        {!d.releases.length ? <p className="mt-2 text-sm text-text-muted">Nothing released yet. Case work only ever uses a released version; drafts are previews.</p> : (
          <Table className="mt-3" dense head={["Release", "Released", "Approved by", "Basis"]}>{d.releases.map((r) => <tr key={r.id}><td><span className="font-medium">Release {r.release}</span>{r.status === "SUPERSEDED" ? <span className="ml-1 text-xs text-text-muted">superseded</span> : null}</td><td>{fmtWhen(r.released_at)}</td><td>{r.approver}</td><td className="max-w-72 text-xs text-text-muted">{r.basis}</td></tr>)}</Table>
        )}
      </section>
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-sm" aria-labelledby="ov-steps">
        <h2 id="ov-steps" className="font-semibold">Recent steps</h2>
        {!d.jobs.length ? <p className="mt-2 text-sm text-text-muted">No reading or AI steps yet.</p> : (
          <Table className="mt-3" dense head={["Step", "Mode", "Status", "Result", "Started"]}>{d.jobs.slice(0, 8).map((j) => <tr key={j.id}><td>{j.kind === "field_map" ? "AI field-map draft" : "Read form"}</td><td><ModePill mode={j.mode} /></td><td><StatusPill status={j.status} /></td><td className="max-w-xl text-xs text-text-muted">{j.message}</td><td className="whitespace-nowrap text-xs">{fmtWhen(j.startedAt)}</td></tr>)}</Table>
        )}
      </section>
    </div>
  );
}

/** Where each missing item is fixed (concept §4: the missing list links to the tab). */
const TAB_FOR: Record<string, [string, string]> = { no_forms: ["forms", "Add forms"], form_without_edition: ["forms", "Open Forms"], filing_problem: ["forms", "Open Forms"], role_without_questions: ["sqr", "Open SQR"], rule_problem: ["review", "Open Review and release"] };
const SOURCE_WORD: Record<string, string> = { RECOGNISED: "recognised, not read yet", READ: "read", READ_FAILED: "could not be read", DRAFTED: "drafted by AI, to review", IN_LIBRARY: "already in the library", HELD: "held for a person" };

function EditPeople({ d, onClose }: { d: CombinationView; onClose: () => void }) {
  const [v, setV] = React.useState<ParticipantLine[]>(d.combination.participants);
  const save = useAction(() => api(`/combinations/${d.combination.id}`, { method: "PATCH", json: { participants: v } }), { success: "People updated", invalidate: [["combination", d.combination.id], ["preview"]], onDone: onClose });
  return <Dialog wide open onOpenChange={(o) => !o && onClose()} title="People in this combination" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending}>Save</Button></>}><ParticipantsEditor value={v} onChange={setV} /></Dialog>;
}

/** Plain words for a held file (review #3, #5). */
const HELD_WORD: Record<string, string> = { new_edition_held: "New edition: impact review needed", older_edition_held: "Older edition: not used", held: "Held for a person" };
