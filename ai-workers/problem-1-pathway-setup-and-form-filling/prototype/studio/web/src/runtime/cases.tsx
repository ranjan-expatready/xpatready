// Case area (runtime lane, R1c): the firm's case officer and the client, outside the configuration studio. Routes under
// /cases: the officer's case list, one case (people + agent view), and the client's questionnaire (SQR, phone first).
// The people are simulated (demo chrome: the "Acting as" switch is not for porting); the server decides what each may do.
import * as React from "react";
import { Link, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Plus, UserPlus, X } from "lucide-react";
import { api, ApiError, getActor, setActor, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { noRetryOnRefusal, Questionnaire, useCaseView, type CanAdd, type CaseInfo, type CasePerson } from "./questionnaire";
import { FormsPanel } from "./forms";
import { ItemChannels } from "./item-channels"; // C11.6
import { FindingsPanel } from "./findings";
import { ReviewPage } from "./review";
import { AnswerSheetPage } from "./answer-sheet"; // C7.3 (QA-317)
import { SubmissionPanel } from "./submission"; // C8.2
import { DocumentsPanel } from "./checklist"; // C6.4 (a)
import { CaseTeamChip, OpeningTeam, useFirm } from "./team";
import { EmployerLinkFor, EmployerLinkLine } from "./employer";
import { EligibilityCard, EligibilityPage } from "./eligibility";
import { PeopleAndFilings } from "./filing-changes"; // C6.13
import { ReleaseNotice } from "./release-update"; // C9.5
import type { OpenableRelease } from "../../../contracts/runtime";

/** Simulated case people (api/src/core.ts RUNTIME_ACTORS); the switch is demo chrome. */
const PEOPLE = [
  { id: "user-O", name: "Case officer", role: "Sample firm" },
  { id: "user-R", name: "Representative", role: "Sample firm · firm admin" },
  { id: "user-T", name: "Second representative", role: "Sample firm" },
  { id: "user-S", name: "Solo representative", role: "Sample solo firm" },
  { id: "user-P", name: "Client A", role: "Client" },
  { id: "user-Q", name: "Client B", role: "Client" },
] as const;
const STAFF = new Set(["user-O", "user-R", "user-T", "user-S"]);
const isOfficer = (id: string) => STAFF.has(id);
const isClient = (id: string) => id === "user-P" || id === "user-Q";
/** "Sponsor" → "sponsor"; an abbreviation in capitals ("IMM", "PR") keeps its case. */
const lower = (w: string) => w.replace(/\b([A-Z])([a-z])/g, (_, a: string, b: string) => a.toLowerCase() + b);
const ROLE: Record<string, string> = { case: "Application", principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child" };
/** B115: a role the words above do not name (the sponsor) is shown in the release's own words. */
const roleOf = (p: CasePerson) => ROLE[p.role] ?? p.role_label ?? p.role.replace(/_/g, " ");

export function RuntimeApp() {
  const actor = useActorId();
  // Arriving from the studio as a configuration person: act as the case officer (configuration people reach no case).
  // The switch re-renders this page itself (qa QA-35): the person hook subscribes only after this effect, so its
  // notice of the switch would be lost and the page would stay blank.
  const [, switched] = React.useState(0);
  React.useLayoutEffect(() => { if (!PEOPLE.some((p) => p.id === getActor())) { setActor("user-O"); switched((n) => n + 1); } }, [actor]);
  if (!PEOPLE.some((p) => p.id === getActor())) return null;
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-3 border-b border-border bg-surface-raised px-4">
        <Link to={isClient(actor) ? "#" : "/cases"} className="flex shrink-0 items-center" aria-label="Cases home">
          <img src="/brand/expat-ready-notagline-dark.svg" alt="Expat Ready" className="h-6 dark:hidden" />
          <img src="/brand/expat-ready-notagline.svg" alt="Expat Ready" className="hidden h-6 dark:block" />
        </Link>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <p className="hidden text-sm font-semibold sm:block">{isClient(actor) ? "Your application" : "Cases"}</p>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-warn bg-surface px-2 py-1" title="Simulated people for the prototype: not part of the product">
            <span className="hidden whitespace-nowrap text-[11px] text-text-muted md:inline">Acting as (simulated)</span>
            <select className="min-w-0 bg-transparent text-xs font-medium" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Simulated person">
              {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
            </select>
          </label>
          <Link to="/" onClick={() => setActor("user-A")} className="hidden whitespace-nowrap text-xs text-text-link hover:underline md:inline">Product Studio</Link>
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
        <Routes>
          <Route index element={<CaseList />} />
          <Route path=":id" element={<CasePage />} />
          <Route path=":id/questionnaire" element={<ClientPage />} />
          <Route path=":id/eligibility" element={<EligibilityPage />} />
          <Route path=":id/review" element={<ReviewPage />} />
          <Route path=":id/sheet/:itemId" element={<AnswerSheetPage />} />
          <Route path="*" element={<Notice title="Page not found"><Link className="text-text-link underline" to="/cases">Back to cases</Link></Notice>} />
        </Routes>
      </main>
      <Toaster />
    </div>
  );
}

// ------------------------------------------------------------------ officer: cases

type CaseRow = { id: string; reference: string; combination: string; status: string; created_at: string };

function CaseList() {
  const actor = useActorId();
  const cases = useApi<{ cases: CaseRow[]; next: string | null }>(["runtime", "cases", actor], "/runtime/cases", { retry: noRetryOnRefusal });
  const [open, setOpen] = React.useState(false);
  // Later pages through the API's cursor, appended below the first (PR 10 review): page 1 stays live, later ones are kept.
  const [more, setMore] = React.useState<{ rows: CaseRow[]; next: string | null } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const next = more ? more.next : cases.data?.next ?? null;
  async function loadMore() {
    if (!next || loading) return;
    setLoading(true);
    try { const page = await api<{ cases: CaseRow[]; next: string | null }>(`/runtime/cases?after=${encodeURIComponent(next)}`); setMore((m) => ({ rows: [...(m?.rows ?? []), ...page.cases], next: page.next })); } finally { setLoading(false); }
  }
  const rows = [...(cases.data?.cases ?? []), ...(more?.rows ?? [])].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  if (cases.isError && (cases.error as ApiError).status === 403) return <Notice title="Cases are for the case officer">Clients open their questionnaire from the link their officer sends. Switch to the case officer to see the cases.</Notice>;
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Cases</h1><p className="text-sm text-text-muted">Each case works from one released configuration, frozen when the case opens.</p></div>
        <Button onClick={() => setOpen(true)}><Plus aria-hidden />Open a case</Button>
      </div>
      {cases.isLoading ? <Skeleton className="h-40 w-full" /> : cases.isError ? <Notice tone="danger" title="Cases could not be loaded">{(cases.error as Error).message}</Notice>
        : !rows.length ? <Notice title="No cases yet">Open a case for a released combination; then add the family and send the client their questionnaire.</Notice>
        : <Table head={["Reference", "Combination", "Status", "Opened"]}>{rows.map((c) => <tr key={c.id}><td><Link className="font-medium text-text-link hover:underline" to={`/cases/${c.id}`}>{c.reference}</Link></td><td>{c.combination}</td><td><Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill></td><td>{new Date(c.created_at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" })}</td></tr>)}</Table>}
      {rows.length ? <div className="flex items-center gap-3 text-[13px] text-text-muted"><span>{rows.length} case{rows.length === 1 ? "" : "s"} shown</span>{next ? <Button size="sm" variant="secondary" busy={loading} onClick={() => void loadMore()}>Load more</Button> : null}</div> : null}
      {open ? <NewCaseDialog close={() => setOpen(false)} /> : null}
    </div>
  );
}

function NewCaseDialog({ close }: { close: () => void }) {
  // QA-38: a case opens on the combination's newest release, so the list names that one (the server's rule).
  // V3 B1 (P-297 (3)): the server says which of them a case can open on (the same startable check as opening one);
  // the others are named apart, with the reason, and never offered.
  const releases = useApi<OpenableRelease[]>(["runtime", "openable"], "/runtime/openable");
  const nav = useNavigate();
  const key = React.useMemo(() => crypto.randomUUID(), []);
  // Break m2: a body that is not a list (a proxy's HTML page) reads as "could not load", never a blank app.
  const rows = Array.isArray(releases.data) ? releases.data : [];
  const loadFailed = releases.isError || (releases.isSuccess && !Array.isArray(releases.data));
  const combos = rows.filter((r) => r.startable);
  const notReady = rows.filter((r) => !r.startable);
  const [f, setF] = React.useState({ combinationId: "", reference: "", principal: "", clientActor: "user-P" });
  const firm = useFirm();
  const [team, setTeam] = React.useState<{ representative: string; officer: string }>({ representative: "", officer: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  // Review M1 (d7b9b80f): the choice is read against the list now offered, so what the select shows is what is sent
  // (after a reload drops the chosen release, the first offered one is both shown and sent).
  const chosen = combos.some((c) => c.combination_id === f.combinationId) ? f.combinationId : combos[0]?.combination_id;
  const create = useAction(() => api<CaseInfo>("/runtime/cases", { method: "POST", json: { combinationId: chosen, reference: f.reference, clientActor: f.clientActor, principal: { displayName: f.principal }, ...(team.representative ? { representative: team.representative } : {}), ...(team.officer ? { caseOfficers: [team.officer] } : {}), idempotencyKey: key } }), { success: "Case opened", invalidate: [["runtime"]], onDone: (c) => nav(`/cases/${c.id}`) });
  // Break m1: a 409 (the release stopped being ready while the dialog was open) reloads the list, so it is not offered again.
  const submit = () => create.mutate(undefined, { onError: (e) => { if (e instanceof ApiError && e.status === 409) void releases.refetch(); const p = e instanceof ApiError ? e.problem.errors ?? [] : []; setErrors(Object.fromEntries(p.map((x) => [x.field.split(".")[0], x.message]))); } });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title="Open a case" description="The case works from the combination's latest release, frozen now: a later release never changes it." guard
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={create.isPending} disabled={!combos.length} title={!combos.length && !releases.isLoading && !loadFailed ? (notReady.length ? "No released combination is ready for new cases yet" : "Nothing is released yet") : undefined} onClick={submit}>Open case</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (combos.length) submit(); }}>
        {releases.isLoading ? <Skeleton className="h-9 w-full" /> : loadFailed ? <Notice tone="warn" title="Could not load the released combinations">{releases.error instanceof Error ? releases.error.message : "Close this and try again."}</Notice> : !combos.length ? (notReady.length ? null : <Notice tone="warn" title="Nothing is released yet">A case opens only on a released combination.</Notice>) : (
          <Field label="Combination (released)" error={errors.combinationId}>
            <Select value={chosen} onChange={(e) => setF({ ...f, combinationId: e.target.value })}>{combos.map((c) => <option key={c.combination_id} value={c.combination_id}>{c.combination} · release {c.version}</option>)}</Select>
          </Field>
        )}
        {notReady.length ? (
          <Notice tone="warn" title={combos.length ? "Released, not ready for new cases" : "No released combination is ready for new cases yet"}>
            <ul className="space-y-1 [overflow-wrap:anywhere]" data-testid="not-ready-for-cases">{notReady.map((r) => <li key={r.combination_id}><span className="font-medium">{r.combination} · release {r.version}</span>: {r.why}</li>)}</ul>
          </Notice>
        ) : null}
        <Field label="Case reference" hint="Your firm's reference, at least 3 characters" error={errors.reference}><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
        <Field label="Principal applicant's name" hint="Shown to the client as written; Sample names only in the prototype" error={errors.principal}><Input value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field>
        <Field label="Client login that answers" error={errors.clientActor}><Select value={f.clientActor} onChange={(e) => setF({ ...f, clientActor: e.target.value })}><option value="user-P">Client A (simulated)</option><option value="user-Q">Client B (simulated)</option></Select></Field>
        <OpeningTeam firm={firm} value={team} onChange={setTeam} errors={errors} />
        {combos.length ? <EmployerLinkFor combinationId={chosen} /> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ officer: one case

function CasePage() {
  const { id } = useParams();
  const actor = useActorId();
  const view = useCaseView(id!, "agent");
  const firm = useFirm();
  // C6.4 (a), challenge r2 m5: a person's name, never their id (the firm's people, then the simulated clients).
  const nameOf = React.useCallback((who: string) => firm.data?.users.find((u) => u.id === who)?.name ?? PEOPLE.find((p) => p.id === who)?.name ?? "someone at the firm", [firm.data]);
  const [adding, setAdding] = React.useState<CanAdd | null>(null);
  // K13 (break m7): "Answer in the Agent view" (eligibility) lands on the Agent view, not the top of the case page.
  const { hash } = useLocation(), loaded = !!view.data;
  React.useEffect(() => { if (loaded && hash === "#agent-view") document.getElementById("agent-view")?.scrollIntoView({ block: "start" }); }, [loaded, hash]);
  if (!isOfficer(actor)) return <Notice title="This page is for the case officer">As a client, open <Link className="text-text-link underline" to={`/cases/${id}/questionnaire`}>your Client questionnaire</Link>.</Notice>;
  if (view.isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-24 w-full" /></div>;
  if (view.isError) return <Notice tone="danger" title="This case could not be opened">{(view.error as Error).message}</Notice>;
  const v = view.data!, c = v.case, people = c.people.filter((p) => p.role !== "case");
  const client = PEOPLE.find((p) => p.id === c.client);
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <nav aria-label="Path" className="flex items-center gap-1 text-[13px] text-text-muted"><Link to="/cases" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft className="size-3.5" aria-hidden />Cases</Link><span aria-hidden>›</span><span className="text-text">{c.reference}</span></nav>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold [overflow-wrap:anywhere]">{c.reference}<Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill><Pill tone="info" title={c.pin.revision > 1 ? `Moved to this release on ${new Date(c.pin.pinned_at).toLocaleString("en-CA")}; a later release never changes this case until someone moves it` : `Frozen when the case opened (${new Date(c.pin.pinned_at).toLocaleString("en-CA")}); a later release never changes this case until someone moves it`}>{c.release?.label ?? `Release ${c.pin.release_version}`}</Pill></h1>
          {c.team ? <CaseTeamChip caseId={c.id} line={c.team} /> : null}
          {c.employer_link ? <div className="mt-1"><EmployerLinkLine link={c.employer_link} caseId={c.id} /></div> : null}
          <p className="mt-1 text-sm text-text-muted">{v.summary.questions} questions for this household · {v.summary.answered} answered · {v.summary.answered - v.summary.confirmed} to confirm · {v.summary.missing} required not answered · {v.summary.not_asked} questions of the release not asked here (no form of this case reads them)</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
          <p className="font-medium">Client questionnaire</p>
          <p className="text-xs text-text-muted">{client?.name ?? "The client"} answers on their phone, for everyone travelling.</p>
          <Link to={`/cases/${c.id}/questionnaire`} onClick={() => setActor(c.client)} className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-text-link hover:underline">Open it as {client?.name ?? "the client"} (simulated)<ExternalLink className="size-3.5" aria-hidden /></Link>
        </div>
      </div>
      <ReleaseNotice caseId={c.id} />
      {/* C6.13 (B135): people with their filings, Make principal, Remove filing and Add filing back. */}
      <PeopleAndFilings caseId={c.id} people={c.people} canAdd={c.can_add ?? []} onAdd={setAdding} roleOf={roleOf} nameOf={nameOf} />
      <DocumentsPanel caseId={c.id} caseSubject={c.people.find((p) => p.role === "case")?.subject_id ?? ""} nameOf={nameOf} />
      <EligibilityCard caseId={c.id} people={c.people} />
      <ItemChannels caseId={c.id} />
      <FormsPanel caseId={c.id} />
      <FindingsPanel caseId={c.id} people={c.people} openLink={`/cases/${c.id}/review`} />
      <SubmissionPanel caseId={c.id} />
      <div id="agent-view" className="scroll-mt-4 space-y-3"><h2 id="agent-view-h" className="text-base font-semibold" data-agent-view-h>Agent view</h2>
      <Questionnaire caseId={c.id} mode="agent" /></div>
      {adding ? <AddPersonDialog caseId={c.id} line={adding} close={() => setAdding(null)} /> : null}
    </div>
  );
}

function AddPersonDialog({ caseId, line, close }: { caseId: string; line: CanAdd; close: () => void }) {
  const role = line.role;
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const key = React.useMemo(() => crypto.randomUUID(), []); // one person per dialog, however often Add is pressed (QA-28)
  const add = useAction(() => api(`/runtime/cases/${caseId}/people`, { method: "POST", json: { role, displayName: name, idempotencyKey: key } }), { success: `${line.label} added: their questions are now asked`, invalidate: [["runtime"]], onDone: close });
  const submit = () => add.mutate(undefined, { onError: (e) => setError(e instanceof ApiError ? e.field("displayName") ?? e.message : e.message) });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title={`Add ${/^[aeiou]/i.test(line.label) ? "an" : "a"} ${lower(line.label)}`} description="Within the limits of this case's release. Their questions are added to the Client questionnaire at once."
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={add.isPending} onClick={submit}>Add</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Field label="Name" hint="Sample names only in the prototype" error={error}><Input value={name} onChange={(e) => { setName(e.target.value); setError(null); }} autoFocus /></Field>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ client: the questionnaire

function ClientPage() {
  const { id } = useParams();
  const actor = useActorId();
  if (!isClient(actor)) return (
    <Notice title="This is the Client questionnaire" action={<Button size="sm" variant="secondary" onClick={() => setActor("user-P")}>Act as Client A</Button>}>
      As the case officer, review and change answers on <Link className="text-text-link underline" to={`/cases/${id}`}>the case page</Link>.
    </Notice>
  );
  return <Questionnaire caseId={id!} mode="sqr" />;
}

function Toaster() {
  const t = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:left-auto sm:w-96" aria-live="polite">
      {t.list.map((x) => (
        <div key={x.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface-raised px-4 py-3 text-sm shadow-lg", x.tone === "ok" ? "border-l-ok" : x.tone === "danger" ? "border-l-danger" : "border-l-primary")}>
          <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">{x.text}</p><button className="shrink-0 text-text-muted" aria-label="Dismiss" onClick={() => t.drop(x.id)}><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}
