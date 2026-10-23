import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, FolderPlus, Plus, Users } from "lucide-react";
import { api, useAction, useApi } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Textarea } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { ParticipantsEditor, roleSummary } from "@/components/participants";

export function ProgramsPage() {
  const tree = useApi<any>(["programs"], "/programs");
  const [create, setCreate] = React.useState<null | { kind: "PATHWAY" | "PROGRAM"; parentKey?: string }>(null);
  const [comp, setComp] = React.useState<null | { programKey: string; label: string }>(null);
  if (tree.isLoading) return <Spinner label="Loading programs" />;
  if (tree.isError) return <Notice tone="danger" title="Programs could not be loaded">{(tree.error as Error).message}</Notice>;
  const pathways = tree.data.pathways as any[];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Pathways and programs</h1><p className="mt-1 text-sm text-text-muted">Each composition (who applies together) gets one configuration: forms, document requirements, questions, rules and checks, drawn from the shared library and released as a version.</p></div>
        <Button onClick={() => setCreate({ kind: "PATHWAY" })}><FolderPlus /> New pathway</Button>
      </div>
      {!pathways.length ? (
        <EmptyState title="No pathways yet" description="Start from scratch with New pathway, or use Load sample inputs (top bar) to create the five sample programs and attach their official files through the normal upload path." action={<Button onClick={() => setCreate({ kind: "PATHWAY" })}><FolderPlus /> New pathway</Button>} />
      ) : pathways.map((pw) => (
        <section key={pw.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Pathway</p><h2 className="text-lg font-semibold">{pw.label}</h2>{pw.description ? <p className="text-sm text-text-muted">{pw.description}</p> : null}</div>
            <Button variant="secondary" onClick={() => setCreate({ kind: "PROGRAM", parentKey: pw.key })}><Plus /> New program</Button>
          </div>
          {!pw.programs.length ? <EmptyState title="No programs in this pathway" description="Add the first program, then its compositions." /> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            {pw.programs.map((p: any) => (
              <div key={p.key} className="min-w-0 rounded-xl border border-border bg-surface-raised shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0"><p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Program</p><h3 className="font-semibold">{p.label}</h3>{p.description ? <p className="mt-0.5 text-xs text-text-muted">{p.description}</p> : null}</div>
                  <Pill tone={p.source_basis === "ILLUSTRATIVE" ? "warn" : "info"}>{p.source_basis === "ILLUSTRATIVE" ? "Illustrative" : "Source-backed"}</Pill>
                </div>
                <ul className="divide-y divide-border">
                  {p.compositions.map((c: any) => (
                    <li key={c.id}>
                      <Link to={`/c/${c.id}`} aria-label={`${c.label}: ${c.release ? `released version ${c.release.version}` : "not released"}`} className="flex items-center gap-3 px-5 py-3 hover:bg-text/5">
                        <Users className="size-4 shrink-0 text-text-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{c.label}</p>
                          <p className="truncate text-xs text-text-muted">{roleSummary(c.participants)} · {c.forms} form{c.forms === 1 ? "" : "s"} · {c.attachments} source{c.attachments === 1 ? "" : "s"}</p>
                        </div>
                        {c.in_review ? <Pill tone="warn">In review</Pill> : null}
                        {c.release ? <Pill tone="ok" title={c.release.sha256}>Released v{c.release.version}</Pill> : <Pill>Not released</Pill>}
                        <ChevronRight className="size-4 text-text-muted" />
                      </Link>
                    </li>
                  ))}
                  {!p.compositions.length ? <li className="px-5 py-3 text-sm text-text-muted">No compositions yet.</li> : null}
                </ul>
                <div className="px-5 py-3"><Button size="sm" variant="ghost" onClick={() => setComp({ programKey: p.key, label: p.label })}><Plus /> New composition</Button></div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {create ? <NodeDialog {...create} onClose={() => setCreate(null)} pathways={pathways} /> : null}
      {comp ? <CompositionDialog {...comp} onClose={() => setComp(null)} /> : null}
    </div>
  );
}

function NodeDialog({ kind, parentKey, onClose, pathways }: { kind: "PATHWAY" | "PROGRAM"; parentKey?: string; onClose: () => void; pathways: any[] }) {
  const [label, setLabel] = React.useState(""), [description, setDescription] = React.useState(""), [basis, setBasis] = React.useState("SOURCE_BACKED"), [parent, setParent] = React.useState(parentKey ?? pathways[0]?.key ?? "");
  const save = useAction(() => api("/programs", { method: "POST", json: { kind, label, description, parentKey: kind === "PROGRAM" ? parent : undefined, sourceBasis: basis } }), { success: `${kind === "PATHWAY" ? "Pathway" : "Program"} created`, invalidate: [["programs"], ["session"]], onDone: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={kind === "PATHWAY" ? "New pathway" : "New program"} description={kind === "PATHWAY" ? "A broad route, for example temporary residence." : "A program within a pathway, for example a visitor visa."}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending} disabled={!label.trim()}>Create</Button></>}>
      <div className="space-y-4">
        {kind === "PROGRAM" ? <Field label="Pathway"><Select value={parent} onChange={(e) => setParent(e.target.value)}>{pathways.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</Select></Field> : null}
        <Field label="Name"><Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder={kind === "PATHWAY" ? "Temporary residence (Canada)" : "Study permit from outside Canada"} /></Field>
        <Field label="Description" hint="Optional; shown on the program card."><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        {kind === "PROGRAM" ? <Field label="Source basis" hint="Illustrative programs are labelled on every screen and in every release."><Select value={basis} onChange={(e) => setBasis(e.target.value)}><option value="SOURCE_BACKED">Source-backed: approved official sources will be attached</option><option value="ILLUSTRATIVE">Illustrative: not source-verified</option></Select></Field> : null}
      </div>
    </Dialog>
  );
}

function CompositionDialog({ programKey, label: programLabel, onClose }: { programKey: string; label: string; onClose: () => void }) {
  const nav = useNavigate();
  const [label, setLabel] = React.useState(""), [description, setDescription] = React.useState("");
  const [participants, setParticipants] = React.useState<any[]>([{ role: "principal", label: "Principal applicant", min: 1, max: 1, preview: 1, applies: true }]);
  const save = useAction(() => api("/compositions", { method: "POST", json: { programKey, label, description, participants } }), { success: "Composition created", invalidate: [["programs"]], onDone: (c: any) => { onClose(); nav(`/c/${c.id}`); } });
  return (
    <Dialog wide open onOpenChange={(o) => !o && onClose()} title="New composition" description={`Who applies together under ${programLabel}. The configuration is evaluated for each of these people.`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.mutate(undefined)} busy={save.isPending} disabled={!label.trim()}>Create composition</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus placeholder="Principal with accompanying partner" /></Field>
        <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <ParticipantsEditor value={participants} onChange={setParticipants} />
      </div>
    </Dialog>
  );
}
