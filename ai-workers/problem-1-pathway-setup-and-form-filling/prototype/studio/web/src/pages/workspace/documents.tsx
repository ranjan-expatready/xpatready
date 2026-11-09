// W1-15 Questions and documents, slice 3 (runtime lane; board v2 frame 3, P-147; plan.md "Slice 3"): the Documents tab
// as "Documents each person gives". Person chips, All · Always · Only if, "Needs you", Find a document…; rows of five
// things (Document · Who · When · Supplies · Status) with a ⋯ menu whose greyed actions keep their reason as visible text;
// the side drawer with every parameter (who and when, alternatives, the facts it supplies about whom and whether each is
// taken out of the questionnaire, Copies · Translation · Validity window read-only Sample, IRCC's words, status). The
// lines and their supplies come from the engine (engine/sources.ts checklist), the same rules as the Questionnaires tab.
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus } from "lucide-react";
import type { ChecklistLineRow, ChecklistView } from "../../../../contracts/workspace";
import { api, ApiError, useActorId, useApi, useSessionView } from "@/lib/api";
import type { CombinationSummary } from "../../../../contracts/programs";
import { DoneSinceNotice, FOCUS_RING, useFocusItem } from "@/components/focus-item";
import { PartProblems } from "@/components/part-problems";
import { Button, Input, Notice, Panel, Pill, Table } from "@/components/ui/controls";
import { Tip } from "@/components/status";
import { useUndoToast } from "@/components/lifecycle";
import { useBulkLines } from "@/components/bulk-lines";
import { APPROVER_WORDS } from "../../../../contracts/lines-bulk";
import { OriginPill, RequirementDialog, RevCtx, whoLabel, useLibraryFields } from "@/pages/configuration";
import { RowMenu } from "@/pages/workspace/sources";
import { irccWords } from "../../../../contracts/workspace";
import { cn } from "@/lib/utils";
import { SuppliesPanel } from "@/pages/supplies-panel";
import { SetsSection } from "@/pages/sets-panel";
import { ProvidersSection } from "@/pages/providers-panel"; // C6.14

const SAY = {
  retire: "A checklist line is removed, not retired. Retire the document type in the library.",
  readOnly: "Read only: you do not hold the author duty.",
  first: "It is already first on this checklist.",
  last: "It is already last on this checklist.",
  notSet: "Not set · Sample: on the immigration expert's list (report D9).",
  automatic: (form: string) => `Follows the ${form} form line: change its channel or who signs it on the Forms tab.`,
};
type When = "all" | "always" | "onlyif" | "needs";

const aboutWords = (x: { about: string; aboutRole: string | null }, roles: ChecklistView["roles"]) =>
  x.about === "holder" ? "The holder" : x.about === "holder.spouse" ? (roles.find((r) => r.role === x.aboutRole)?.label ?? "The holder's spouse or partner") : "The holder's parents";
/** "9 facts · 2 about the spouse" (board v2 frame 3). */
const suppliesText = (l: ChecklistLineRow) => !l.supplies.length ? "none · filed as is" : `${l.supplies.length} fact${l.supplies.length === 1 ? "" : "s"}${l.aboutOthers ? ` · ${l.aboutOthers} about ${l.supplies.some((x) => x.about === "holder.parent") ? "the parents" : "the spouse"}` : ""}`;

export function DocumentsTab({ id }: { id: string }) {
  const [sp, setSp] = useSearchParams();
  const qc = useQueryClient();
  const me = useActorId();
  const { canAuthor } = useSessionView();
  const v = useQuery<ChecklistView, ApiError>({ queryKey: ["checklist", id], queryFn: () => api<ChecklistView>(`/combinations/${id}/checklist`) });
  const cfg = useApi<any>(["config", id, "draft"], `/combinations/${id}/config?mode=draft`);
  const fields = useLibraryFields();
  const undoToast = useUndoToast();
  // X2b (C1.5): copy a line to other combinations, remove it from them, or copy lines here from another combination.
  const bulk = useBulkLines(id);
  const [when, setWhen] = React.useState<When>("all");
  const [find, setFind] = React.useState("");
  const [shown, setShown] = React.useState<string | null>(null);
  const [supplies, setSupplies] = React.useState<string | null>(null); // C4.5: the document type whose facts are being changed
  const [edit, setEdit] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  // X1 (slice C2): a ?focus= link from the setup checklist lands on its place here (documents:lines, documents:problems).
  // Review M2 (C11.10): a released version's documents:problems is drawn from the summary; wait for it (as Questionnaires).
  const sumForFocus = useApi<CombinationSummary>(["combination-summary", id], `/combinations/${id}/summary`);
  const doneSince = useFocusItem(v.data && sumForFocus.data ? [] : undefined, (k) => k.startsWith("documents:") || k === "questions_documents:problems");
  const refresh = () => { for (const k of [["checklist", id], ["config", id], ["combination", id], ["combination-summary", id], ["fact-sources", id], ["preview"], ["draft"]]) void qc.invalidateQueries({ queryKey: k }); };
  if (v.isPending) return <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" aria-busy="true"><span className="sr-only" role="status">Loading each person's checklist</span></div>;
  if (v.error) return <Notice tone="danger" title="The checklists could not be loaded">{v.error.message} <button type="button" className="font-medium text-text-link underline" onClick={() => void v.refetch()}>Retry</button></Notice>;
  const roles = v.data.roles;
  const role = roles.find((r) => r.role === sp.get("role")) ?? roles[0];
  const reqOf = (lineage: string) => (cfg.data?.snapshot?.document_requirements ?? []).find((r: any) => r.lineage === lineage);
  const addButton = canAuthor ? <><Button size="sm" onClick={() => setEdit({})} data-add-document><Plus /> Add a document</Button><Button size="sm" variant="secondary" onClick={bulk.openFrom} data-copy-from-open><Copy /> Copy a line from another combination</Button></> : null;
  if (!role) return (
    <section className={cn("rounded-xl border border-border bg-surface-raised p-5", FOCUS_RING)} data-documents-empty data-focus="documents:lines">
      <DoneSinceNotice shown={doneSince} />
      <h2 className="font-semibold">No documents yet</h2>
      <p className="mt-1 text-sm text-text-muted">Draft them from IRCC's checklist, or add one.</p>
      <div className="mt-3 flex flex-wrap gap-2">{addButton}</div>{bulk.node}
      {edit ? <RevCtx.Provider value={cfg.data?.revisions ?? {}}><RequirementDialog id={id} r={edit} fields={fields} onClose={() => setEdit(null)} onSaved={refresh} /></RevCtx.Provider> : null}
    </section>
  );
  const needs = new Map<string, string>();
  for (const l of role.lines) { const p = v.data.problems.find((x) => l.supplies.some((f) => f.fact === x.item && (x.role === f.aboutRole)) && /document|passport|certificate|checklist/i.test(x.message)); if (p) needs.set(l.lineage, p.message); }
  const keep = (l: ChecklistLineRow) => (when === "all" || (when === "always" ? l.base : when === "onlyif" ? !l.base : needs.has(l.lineage))) && (!find.trim() || `${l.document.name} ${l.alternatives.map((a) => a.name).join(" ")}`.toLowerCase().includes(find.trim().toLowerCase()));
  const lines = role.lines.filter(keep);
  const move = async (l: ChecklistLineRow, direction: "up" | "down") => {
    setError(null);
    try { await api(`/combinations/${id}/checklist/move`, { method: "POST", json: { lineage: l.lineage, role: role.role, direction } }); refresh(); undoToast.show(`"${l.document.name}" moved ${direction} in ${role.label}'s checklist`); }
    catch (e) { setError((e as Error).message); }
  };
  const remove = async (l: ChecklistLineRow) => {
    setError(null);
    try {
      await api(`/combinations/${id}/requirements/${encodeURIComponent(l.lineage)}`, { method: "PATCH", json: { retire: true } });
      refresh();
      const out = l.supplies.filter((x) => x.takenOut).length;
      undoToast.show(`"${l.document.name}" removed from the checklist${out ? `: ${out} fact${out === 1 ? "" : "s"} move to the client questionnaire` : ""}`, async () => { await api(`/combinations/${id}/checklist/undo-remove`, { method: "POST", json: { lineage: l.lineage } }); refresh(); });
    } catch (e) { setError((e as Error).message); }
  };
  const menu = (l: ChecklistLineRow, i: number) => l.automatic ? (
    // C3.11: a signed scan is changed only on its form line.
    <RowMenu name={l.document.name} items={[
      { label: "Open details", onSelect: () => setShown(l.lineage) },
      { label: "Move up", why: SAY.automatic(l.automatic.form) },
      { label: "Remove from checklist", why: SAY.automatic(l.automatic.form) },
      { label: "Open the Forms tab", href: `/c/${id}/forms` },
    ]} />
  ) : (
    <RowMenu name={l.document.name} items={[
      { label: "Open details", onSelect: () => setShown(l.lineage) },
      { label: "Move up", why: !canAuthor ? SAY.readOnly : i === 0 ? SAY.first : null, onSelect: () => void move(l, "up") },
      { label: "Move down", why: !canAuthor ? SAY.readOnly : i === role.lines.length - 1 || role.lines[i + 1]?.automatic ? SAY.last : null, onSelect: () => void move(l, "down") },
      { label: "Copy to other combinations…", why: !canAuthor ? SAY.readOnly : null, onSelect: () => bulk.open({ kind: "document", key: l.lineage, short: l.document.name }, "add") },
      { label: "Remove from other combinations…", why: !canAuthor ? SAY.readOnly : null, onSelect: () => bulk.open({ kind: "document", key: l.lineage, short: l.document.name }, "remove") },
      { label: "Remove from checklist", why: !canAuthor ? SAY.readOnly : null, onSelect: () => void remove(l) },
      { label: "Change the document type in the library…", href: `/library/documents` },
      { label: "Retire", why: SAY.retire },
    ]} />
  );
  const chip = (w: When, label: string) => (
    <button key={w} type="button" aria-pressed={when === w} data-when-chip={w} onClick={() => setWhen(when === w && w !== "all" ? "all" : w)}
      className={cn("min-h-8 rounded-full border px-3 py-0.5 text-sm", when === w ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5", w === "needs" && needs.size ? "text-text-danger" : "")}>{label}</button>
  );
  const open = role.lines.find((l) => l.lineage === shown);
  return (
    <RevCtx.Provider value={cfg.data?.revisions ?? {}}>
      <section aria-labelledby="docs-head" className={cn("space-y-4", FOCUS_RING)} data-documents data-focus="documents:lines">
        <DoneSinceNotice shown={doneSince} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="docs-head" className="font-semibold">Documents each person gives</h2>
          <span className="flex flex-wrap items-center gap-2"><Input aria-label="Find a document" placeholder="Find a document…" className="h-8 w-56" value={find} onChange={(e) => setFind(e.target.value)} />{addButton}</span>
        </div>
        <div role="group" aria-label="Person" className="flex flex-wrap gap-1.5">
          {roles.map((r) => <button key={r.role} type="button" aria-pressed={r.role === role.role} data-doc-role-chip={r.role} onClick={() => { const n = new URLSearchParams(sp); n.set("role", r.role); setSp(n, { replace: true }); }}
            className={cn("min-h-9 rounded-full border px-3 py-1 text-sm", r.role === role.role ? "border-primary bg-primary/10 font-medium text-text-link" : "border-border bg-surface-raised text-text-muted hover:bg-text/5")}>{r.label} · {r.lines.length}</button>)}
        </div>
        <div role="group" aria-label="When it is needed" className="flex flex-wrap gap-1.5">
          {chip("all", "All")}{chip("always", `Always ${role.lines.filter((l) => l.base).length}`)}{chip("onlyif", `Only if ${role.lines.filter((l) => !l.base).length}`)}{chip("needs", `Needs you · ${needs.size}`)}
        </div>
        <PartProblems id={id} part="documents" />
        {error ? <Notice tone="warn" title="Not changed" action={<Button size="sm" variant="ghost" onClick={() => setError(null)}>Dismiss</Button>}><span data-documents-error>{error}</span></Notice> : null}
        {undoToast.link ? <p className="text-xs text-text-muted" data-undo-note>Last change on this tab{undoToast.link}</p> : null}
        {bulk.note}
        <p className="text-sm text-text-muted">A document that supplies facts takes those questions out of the client questionnaire: Preview shows it, and "Try it missing" there shows them asked instead. At a case this comes with the document reader (M3); until then a case asks them.</p>
        <p className="text-xs text-text-muted" data-doc-order-note>Order: Move up or Move down in a line's ⋯ menu. A line given by several people (Each applicant) keeps one place: its order applies to everyone on this list.</p>
        {lines.length ? (
          <Table dense head={["Document", "Who", "When", "Supplies", "Status", <span key="a" className="sr-only">Actions</span>]} label={`${role.label}'s checklist`}>
            {lines.map((l) => (
              <tr key={l.lineage} data-doc-line={l.lineage}>
                <td className="max-w-sm"><button type="button" className="text-left font-medium hover:text-text-link hover:underline" aria-label={`Details of: ${l.document.name}`} onClick={() => setShown(l.lineage)}>{l.document.name}</button>{l.alternatives.length ? <span className="block text-xs text-text-muted" data-doc-alternatives>or {l.alternatives.map((a) => a.name).join(" · or ")}</span> : null}{l.automatic ? <span className="block text-xs text-text-muted" data-doc-reason>{l.automatic.reason}</span> : null}</td>
                <td className="text-xs">{whoLabel(l.who)}</td>
                <td className="max-w-56 text-xs">{l.base ? "Always" : <span title={l.when}>{l.when.length > 70 ? `${l.when.slice(0, 70)}…` : l.when}</span>}</td>
                <td className="text-xs"><Tip tip={l.supplies.length ? l.supplies.map((x) => x.label).join(" · ") : "It supplies no answer: filed as is."} focusable><span className="cursor-help underline decoration-dotted underline-offset-4" data-doc-supplies>{suppliesText(l)}</span></Tip></td>
                <td>{l.automatic ? <span data-doc-status="automatic"><Pill tone="neutral" title={SAY.automatic(l.automatic.form)}>Added by the form line</Pill></span> : needs.has(l.lineage) ? <span data-doc-status="check"><Pill tone="danger" title={needs.get(l.lineage)}>Release check</Pill></span> : <span data-doc-status={l.status.toLowerCase()}>{l.status === "PUBLISHED" ? <Pill tone="ok">Released</Pill> : <OriginPill origin={l.origin} status={l.status} />}</span>}</td>
                <td className="w-10">{menu(l, role.lines.indexOf(l))}</td>
              </tr>
            ))}
          </Table>
        ) : <p className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-text-muted" data-documents-none>{find || when !== "all" ? "No document matches." : `${role.label} gives no documents for this combination.`}</p>}
        {v.data.removed.length ? (
          <div className="rounded-xl border border-border bg-surface-raised p-4" data-removed-docs>
            <p className="font-medium">Removed in this draft</p>
            <ul className="mt-1 space-y-1 text-sm">{v.data.removed.map((r) => <li key={r.lineage} className="flex flex-wrap items-center gap-2"><span>{r.document} · {whoLabel(r.who)}</span><span className="text-xs text-text-muted">goes with the next release; open cases keep it</span>{canAuthor && r.by === me ? <Button size="sm" variant="ghost" onClick={async () => { try { await api(`/combinations/${id}/checklist/undo-remove`, { method: "POST", json: { lineage: r.lineage } }); refresh(); } catch (e) { setError((e as Error).message); } }}>Add back</Button> : <span className="text-xs text-text-muted">Only the person who removed it can add it back.</span>}</li>)}</ul>
          </div>
        ) : null}
        <p className="text-xs text-text-muted">{v.data.basis}.</p>
        {!canAuthor ? <p className="text-xs text-text-muted" data-approver-copies>{APPROVER_WORDS}</p> : null}
        {open ? <DocumentDrawer combinationId={id} revision={cfg.data?.revisions?.[`requirement:${open.lineage}`]} line={open} roles={roles} roleLabel={role.label} canAuthor={canAuthor} onClose={() => setShown(null)} onEdit={() => { const r = reqOf(open.lineage); if (r) { setShown(null); setEdit(r); } }} onRemove={() => { setShown(null); void remove(open); }} onSupplies={() => { setShown(null); setSupplies(open.document.key); }} /> : null}
        {supplies ? <SuppliesPanel typeKey={supplies} combinationId={id} open onClose={() => setSupplies(null)} onSaved={refresh} /> : null}
        {edit ? <RequirementDialog id={id} r={edit} fields={fields} onClose={() => setEdit(null)} onSaved={refresh} /> : null}
        {undoToast.node}{bulk.node}
      </section>
    </RevCtx.Provider>
  );
}

/** Every parameter of one checklist line (board v2 frame 3): who and when, alternatives, the facts it supplies about whom
 *  and whether each is taken out of the questionnaire; Copies, Translation, Validity window read-only (P-147 Q3). */
function DocumentDrawer({ combinationId, revision, line, roles, roleLabel, canAuthor, onClose, onEdit, onRemove, onSupplies }: { combinationId: string; revision?: string; line: ChecklistLineRow; roles: ChecklistView["roles"]; roleLabel: string; canAuthor: boolean; onClose: () => void; onEdit: () => void; onRemove: () => void; onSupplies: () => void }) {
  const index = (roles.find((r) => r.role === line.role)?.lines ?? []).findIndex((l) => l.lineage === line.lineage);
  const total = roles.find((r) => r.role === line.role)?.lines.length ?? 0;
  if (line.automatic) return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={line.document.name} description={`${roleLabel}'s checklist · ${index + 1} of ${total}`} badge={<Pill tone="neutral">Added by the form line</Pill>}
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-3 text-sm" data-doc-drawer data-doc-drawer-automatic>
        <p data-drawer-reason>{line.automatic.reason}</p>
        <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1"><dt className="text-text-muted">Who</dt><dd>{whoLabel(line.who)}</dd><dt className="text-text-muted">When</dt><dd>{line.base ? "Always" : `Only if: ${line.when}`}</dd><dt className="text-text-muted">Supplies</dt><dd>None: filed as is.</dd></dl>
        <p className="text-xs text-text-muted">{SAY.automatic(line.automatic.form)} Filed another way, this line goes away at once. Sample until the immigration expert confirms.</p>
      </div>
    </Panel>
  );
  return (
    <Panel open onOpenChange={(o) => !o && onClose()} title={line.document.name} description={`${roleLabel}'s checklist · ${index + 1} of ${total}`} badge={line.status === "PUBLISHED" ? <Pill tone="ok">Released</Pill> : <OriginPill origin={line.origin} status={line.status} />}
      footer={canAuthor ? <><Button variant="ghost" onClick={onRemove} data-drawer-remove>Remove from checklist</Button><Button onClick={onEdit} data-drawer-edit>Edit</Button></> : <><span className="text-xs text-text-muted">{SAY.readOnly}</span><Button variant="ghost" onClick={onClose}>Close</Button></>}>
      <div className="space-y-4 text-sm" data-doc-drawer>
        <p className="text-xs text-text-muted">{line.status === "PUBLISHED" ? "Released · changes go out with the next release" : "In this draft · goes out with the next release"}</p>
        <section aria-labelledby="dd-who" className="space-y-1"><h3 id="dd-who" className="font-semibold">Who and when</h3>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1"><dt className="text-text-muted">Who</dt><dd>{whoLabel(line.who)}</dd><dt className="text-text-muted">When</dt><dd>{line.base ? "Always" : `Only if: ${line.when}`}</dd><dt className="text-text-muted">Provided by</dt><dd>{line.providedBy === "client" ? "The client" : line.providedBy === "agent" ? "The firm" : line.providedBy.replace(/_/g, " ")}</dd></dl>
        </section>
        <section aria-labelledby="dd-alt" className="space-y-1"><h3 id="dd-alt" className="font-semibold">Alternatives · any one counts</h3>
          {line.alternatives.length ? <>
            <p data-drawer-alternatives>{line.alternatives.map((a) => a.name).join(" · or ")}</p>
            <p className="text-xs text-text-muted">The facts read are this line's document's; when an alternative is given, the client is asked what it does not supply.</p>
          </> : <p className="text-text-muted" data-drawer-alternatives>None yet: set one in Edit.</p>}
        </section>
        <SetsSection typeKey={line.document.key} typeName={line.document.name} combinationId={combinationId} lineage={line.lineage} revision={revision} setName={line.setName ?? null} canAuthor={canAuthor} />
        <ProvidersSection typeKey={line.document.key} typeName={line.document.name} who={line.who} canAuthor={canAuthor} />
        <section aria-labelledby="dd-facts" className="space-y-1"><h3 id="dd-facts" className="font-semibold">Facts it supplies · {line.supplies.length} · from the library document type</h3>
          {line.supplies.length ? (
            <Table dense head={["Fact", "About whom", "Taken out of the questionnaire"]} label="Facts it supplies">
              {line.supplies.map((x) => <tr key={`${x.about}|${x.fact}`} data-supplied-fact={x.fact}><td>{x.label}</td><td className="text-xs">{aboutWords(x, roles)}</td><td className="text-xs" data-taken-out={x.takenOut ? "yes" : "no"}>{x.takenOut ? "Yes" : <span className="text-text-muted">No · {x.about === "holder" ? "asked of the client (another source is set)" : "the other person's own source applies"}</span>}</td></tr>)}
            </Table>
          ) : <p className="text-text-muted">None: it is filed as is.</p>}
          <p className="text-xs text-text-muted">What it supplies, and about whom, is set on the library document type for every combination; a second person approves.</p>
          {canAuthor ? <Button size="sm" variant="secondary" onClick={onSupplies} data-drawer-supplies>Change the facts it supplies…</Button> : null}
        </section>
        <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1" data-doc-not-built>
          <dt className="text-text-muted">Copies</dt><dd className="text-xs">{SAY.notSet}</dd>
          <dt className="text-text-muted">Translation</dt><dd className="text-xs">{SAY.notSet}</dd>
          <dt className="text-text-muted">Validity window</dt><dd className="text-xs">{SAY.notSet}</dd>
          <dt className="text-text-muted">IRCC's words</dt><dd className="text-xs">{line.quote ? `"${irccWords(line.quote)}"` : "No source quote."} <span className="text-text-muted">Sample</span></dd>
        </dl>
      </div>
    </Panel>
  );
}
