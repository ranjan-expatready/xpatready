// Case area (runtime lane, R1c): the firm's case officer and the client, outside the configuration studio. Routes under
// /cases: the officer's case list, one case (people + agent view), and the client's questionnaire (SQR, phone first).
// The people are simulated (demo chrome: the "Acting as" switch is not for porting); the server decides what each may do.
import * as React from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, UserPlus } from "lucide-react";
import { api, ApiError, getActor, personChosen, setActor, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Field, Input, Notice, Pill, Select, Table } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { casesLeaving, enterCasesAsStaff, Frame, leaveCasesAsStudio, PersonPicker, useWhere } from "@/components/frame"; // BK-3, BK-4a
import { CASE_OFFICER, isCasePerson, isClientPerson, isFirmStaff, PEOPLE as ALL_PEOPLE, personOf, STUDIO_AUTHOR } from "@/lib/simulated-people"; // BK-4a
import { caseWords, noRetryOnRefusal, Questionnaire, tabHash, toConfirmByTab, useCaseView, useCaseWhere, type CanAdd, type CaseInfo, type CasePerson } from "./questionnaire";
import { FormsPanel } from "./forms";
import { ItemChannels } from "./item-channels"; // C11.6
import { FindingsPanel } from "./findings";
import { ReviewPage } from "./review";
import { AnswerSheetPage } from "./answer-sheet"; // C7.3 (QA-317)
import { SubmissionPanel } from "./submission"; // C8.2
import { DocumentsPanel } from "./checklist"; // C6.4 (a)
import { CaseTeamChip, OpeningTeam, useFirm } from "./team";
import { EmployerLinkFor, EmployerLinkLine } from "./employer";
import { EarlierFactsCard } from "./earlier-facts";
import { EligibilityCard, EligibilityPage } from "./eligibility";
import { PeopleAndFilings } from "./filing-changes"; // C6.13
import { ReleaseNotice } from "./release-update"; // C9.5
import { EarlierStages, earlierOf, StageStrip } from "./stages"; // C6.17
import { OfficerPeoplePanel } from "./privacy"; // C6.16
import { RepresentativeReviewLatest, RepresentativeReviewPage } from "./representative-review"; // C8.3
import { CaseReadinessPill } from "./readiness-figure"; // C7.10
import { HandOff, handedFrom } from "./hand-off"; // BK-4c
import type { CaseListRow, OpenableRelease } from "../../../contracts/runtime";

/** Simulated case people (the firm and the clients of lib/simulated-people.ts, BK-4a); the picker is demo chrome. */
const PEOPLE = ALL_PEOPLE.filter((p) => isCasePerson(p.id));
const isOfficer = isFirmStaff;
const isClient = isClientPerson;
/** BK-3 PR 2: a link from the Studio into the case area acts as firm staff (the case officer unless already staff), as
 *  the case area's own "Product Studio →" acts as the Studio person. BK-4a: the frame's own "Cases (as Case officer) →". */
export const actAsCaseStaff = enterCasesAsStaff;
/** "Sponsor" → "sponsor"; an abbreviation in capitals ("IMM", "PR") keeps its case. */
const lower = (w: string) => w.replace(/\b([A-Z])([a-z])/g, (_, a: string, b: string) => a.toLowerCase() + b);
const ROLE: Record<string, string> = { case: "Application", principal: "Principal applicant", spouse_or_partner: "Spouse or partner", child: "Child" };
/** B115: a role the words above do not name (the sponsor) is shown in the release's own words. */
const roleOf = (p: CasePerson) => ROLE[p.role] ?? p.role_label ?? p.role.replace(/_/g, " ");

export function RuntimeApp() {
  const actor = useActorId();
  // A browser with no person chosen that opens the case area acts as the case officer, as before (qa QA-35: the switch
  // re-renders this page itself; the person hook subscribes only after this effect). It is that browser's first person.
  // BK-4a BR-8 (P-456 (3), P-484): a person chosen on purpose who does not work on cases is never switched silently: the
  // page says so and offers one named button (it counts as a hand-off). BK-3 PR 2: not while a link is leaving for the
  // Studio as the Studio person (casesLeaving); arriving clears that.
  const [, switched] = React.useState(0);
  // Arriving clears the leaving mark and draws again, so Back into the case area shows BR-8's notice, never a blank page.
  React.useLayoutEffect(() => { if (casesLeaving()) { casesLeaving(true); switched((n) => n + 1); } }, []);
  React.useLayoutEffect(() => { if (!casesLeaving() && !personChosen() && !isCasePerson(getActor())) { setActor(CASE_OFFICER); switched((n) => n + 1); } }, [actor]);
  if (!isCasePerson(getActor())) return casesLeaving() || !personChosen() ? null : <NotACasePerson />;
  const client = isClient(actor);
  return (
    <Frame area={client ? "client" : "cases"} title={client ? "Your application" : "Cases"} home={client ? undefined : "/cases"} staff={!client}
      controls={<PersonPicker area={client ? "client" : "cases"} />}>
      <Routes>
        <Route index element={<CaseList />} />
        <Route path="clients" element={<Navigate to="/cases" replace />} />
        <Route path="clients/:clientKey" element={<ClientCasesPage />} />
        <Route path=":id" element={<CasePage />} />
        <Route path=":id/questionnaire" element={<ClientPage />} />
        <Route path=":id/eligibility" element={<EligibilityPage />} />
        <Route path=":id/review" element={<ReviewPage />} />
        <Route path=":id/representative-review" element={<RepresentativeReviewLatest />} />
        <Route path=":id/representative-review/:round" element={<RepresentativeReviewPage />} />
        <Route path=":id/sheet/:itemId" element={<AnswerSheetPage />} />
        <Route path="*" element={<Notice title="Page not found"><Link className="text-text-link underline" to="/cases">Back to cases</Link></Notice>} />
      </Routes>
    </Frame>
  );
}

/** BK-4a BR-8: a Studio person chosen on purpose who opens a case address (the Demo menu, a typed address, Back after
 *  leaving for the Studio). Cases are the firm's: one named button continues as the case officer, so the change of person
 *  is seen, never silent. */
function NotACasePerson() {
  const me = personOf(getActor());
  const officer = personOf(CASE_OFFICER)!;
  return (
    <Frame area="cases" title="Cases" home="/cases" staff controls={<PersonPicker area="cases" />}>
      <div className="mx-auto max-w-5xl space-y-4" data-not-case-person>
        <h1 className="text-2xl font-semibold">Cases</h1>
        <Notice title="Cases are worked by the firm" action={<Button size="sm" variant="secondary" onClick={() => setActor(CASE_OFFICER)} data-continue-as-officer>Continue as {officer.name} <ArrowRight /></Button>}>
          {me ? `${me.name} (simulated) works in Product Studio. ` : ""}A firm person opens and works cases.
        </Notice>
      </div>
    </Frame>
  );
}

// ------------------------------------------------------------------ officer: cases

type CaseRow = Omit<CaseListRow, "created_at"> & { created_at: string };

/** A24-2 (P-492, design §6): a case in a list: its case number, bold, with the firm's own reference under it when it gave
 *  one; the whole cell opens the case. The space between them keeps the link's name readable ("C-2026-00042 ABC-1"). */
function CaseCell({ c }: { c: Pick<CaseRow, "id" | "case_number" | "reference"> }) {
  return (
    <Link className="inline-flex min-h-6 flex-col justify-center text-text-link hover:underline" to={`/cases/${c.id}`} data-case-number={c.case_number}>
      <span className="font-semibold tabular-nums whitespace-nowrap">{c.case_number}</span>{c.reference ? <>{" "}<span className="text-[13px] text-text-muted [overflow-wrap:anywhere]" data-case-own-reference>{c.reference}</span></> : null}
    </Link>
  );
}
/** A24-2: the applications (filings) of the case's current stage; none before the case is prepared. */
const applicationsOf = (n: number) => n > 0 ? <span className="tabular-nums" data-case-filings={n}>{n}</span> : <span className="text-text-muted" data-case-filings={0} title="Applications appear once the case is prepared">None yet</span>;
const SEARCH_HELP = "Case number, your own reference, a person's name or an IRCC application number";

function CaseList() {
  const actor = useActorId();
  // BK-3 PR 2: "Open a case on Release N" on a released combination lands here as /cases?open=<combinationId>: the
  // dialog opens with that combination chosen; closing it drops the address's choice, so a reload does not reopen it.
  const [sp, setSp] = useSearchParams();
  const asked = sp.get("open");
  const [open, setOpen] = React.useState(!!asked);
  const close = () => { setOpen(false); if (sp.has("open")) setSp((p) => { const n = new URLSearchParams(p); n.delete("open"); return n; }, { replace: true }); };
  // A24-2 (P-492, design §6): search, kept in the address (?q=) so Back and a reload keep it; sent a moment after typing stops.
  const q = (sp.get("q") ?? "").trim();
  const [typed, setTyped] = React.useState(q);
  React.useEffect(() => {
    const t = setTimeout(() => setSp((p) => { const n = new URLSearchParams(p), w = typed.trim(); if (w) n.set("q", w); else n.delete("q"); return n; }, { replace: true }), 300);
    return () => clearTimeout(t);
  }, [typed, setSp]);
  const query = q ? `q=${encodeURIComponent(q)}&` : "";
  const cases = useApi<{ cases: CaseRow[]; next: string | null }>(["runtime", "cases", actor, q], `/runtime/cases${q ? `?${query.slice(0, -1)}` : ""}`, { retry: noRetryOnRefusal });
  // Later pages through the API's cursor, appended below the first (PR 10 review): page 1 stays live, later ones are kept.
  // BK-3 PR 3 (break M1, same on this list): later pages belong to the person they were loaded for (another firm after a
  // switch of "Acting as"); they are dropped, never shown beside the new person's page 1. A24-2: and to the search.
  const owner = `${actor}|${q}`;
  const [kept, setMore] = React.useState<{ owner: string; rows: CaseRow[]; next: string | null } | null>(null);
  const more = kept?.owner === owner ? kept : null;
  const [loading, setLoading] = React.useState(false);
  const next = more ? more.next : cases.data?.next ?? null;
  async function loadMore() {
    if (!next || loading) return;
    setLoading(true);
    try { const page = await api<{ cases: CaseRow[]; next: string | null }>(`/runtime/cases?${query}after=${encodeURIComponent(next)}`); setMore((m) => ({ owner, rows: [...(m?.owner === owner ? m.rows : []), ...page.cases], next: page.next })); } finally { setLoading(false); }
  }
  const rows = [...(cases.data?.cases ?? []), ...(more?.rows ?? [])].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  if (cases.isError && (cases.error as ApiError).status === 403) return <Notice title="Cases are for the case officer">Clients open their questionnaire from the link their officer sends; the case list is the firm's.</Notice>;
  const clear = () => { setTyped(""); setSp((p) => { const n = new URLSearchParams(p); n.delete("q"); return n; }, { replace: true }); };
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Cases</h1><p className="text-sm text-text-muted">Each case works from one released configuration, frozen when the case opens.</p></div>
        <Button onClick={() => setOpen(true)}><Plus aria-hidden />Open a case</Button>
      </div>
      <form role="search" className="max-w-md" onSubmit={(e) => e.preventDefault()}>
        <Field label="Search cases" hint={SEARCH_HELP}><Input type="search" value={typed} maxLength={80} onChange={(e) => setTyped(e.target.value)} placeholder="C-2026-00042" data-case-search /></Field>
      </form>
      {cases.isLoading ? <Skeleton className="h-40 w-full" /> : cases.isError ? <Notice tone="danger" title={q ? "The search could not be run" : "Cases could not be loaded"}>{cases.error instanceof ApiError ? cases.error.field("q") ?? cases.error.message : (cases.error as Error).message}</Notice>
        : !rows.length ? (q ? <Notice title={`No case matches "${q}"`} action={<Button size="sm" variant="secondary" onClick={clear}>Clear search</Button>}>Search looks at the {SEARCH_HELP[0].toLowerCase()}{SEARCH_HELP.slice(1)}.</Notice>
          : <Notice title="No cases yet">Open a case for a released combination; then add the family and send the client their questionnaire.</Notice>)
        : <Table head={["Case", "Client", "Applications", "Combination", "Status", "Opened"]} headClass={[undefined, undefined, undefined, "hidden md:table-cell", undefined, "hidden md:table-cell"]}>{rows.map((c) => (
          <tr key={c.id} data-case-row={c.case_number}>
            <td><CaseCell c={c} /></td>
            <td data-case-client-name>{c.client_name ?? <span className="text-text-muted">Not named yet</span>}</td>
            <td>{applicationsOf(c.filings)}</td>
            <td className="hidden md:table-cell">{c.combination}</td>
            <td><Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill></td>
            <td className="hidden whitespace-nowrap md:table-cell">{opened(c.created_at)}</td>
          </tr>))}</Table>}
      {rows.length ? <div className="flex items-center gap-3 text-[13px] text-text-muted"><span>{rows.length} case{rows.length === 1 ? "" : "s"} shown{q ? ` for "${q}"` : ""}</span>{next ? <Button size="sm" variant="secondary" busy={loading} onClick={() => void loadMore()}>Load more</Button> : null}</div> : null}
      {open ? <NewCaseDialog close={close} initial={asked} /> : null}
    </div>
  );
}

function NewCaseDialog({ close, initial, client }: { close: () => void; initial?: string | null; /** BK-3 PR 3 (challenge M1): the client page's client, chosen. */ client?: string }) {
  // QA-38: a case opens on the combination's newest release, so the list names that one (the server's rule).
  // V3 B1 (P-297 (3)): the server says which of them a case can open on (the same startable check as opening one);
  // the others are named apart, with the reason, and never offered.
  const releases = useApi<OpenableRelease[]>(["runtime", "openable"], "/runtime/openable");
  const nav = useNavigate();
  // BK-3 PR 2 (review m2): opened from /cases?open=<id>, the list's address loses that choice before the case opens, so
  // browser Back from the new case returns to the list, not to the dialog again.
  const [sp] = useSearchParams();
  const key = React.useMemo(() => crypto.randomUUID(), []);
  // Break m2: a body that is not a list (a proxy's HTML page) reads as "could not load", never a blank app.
  const rows = Array.isArray(releases.data) ? releases.data : [];
  const loadFailed = releases.isError || (releases.isSuccess && !Array.isArray(releases.data));
  const combos = rows.filter((r) => r.startable);
  const notReady = rows.filter((r) => !r.startable);
  const [f, setF] = React.useState({ combinationId: initial ?? "", reference: "", principal: "", clientActor: client ?? "user-P" });
  // A24-2 (P-492, design §6): the case number the firm gives next, read without taking it; the opening takes the real one.
  const actor = useActorId();
  const nextNumber = useApi<{ case_number: string }>(["runtime", "next-case-number", actor], "/runtime/next-case-number", { retry: false });
  const firm = useFirm();
  const [team, setTeam] = React.useState<{ representative: string; officer: string }>({ representative: "", officer: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  // Review M1 (d7b9b80f): the choice is read against the list now offered, so what the select shows is what is sent
  // (after a reload drops the chosen release, the first offered one is both shown and sent).
  const chosen = combos.some((c) => c.combination_id === f.combinationId) ? f.combinationId : combos[0]?.combination_id;
  // C6.17 (BR-3): a later stage of a route records its earlier stages ("Done before we started").
  const chosenRelease = combos.find((c) => c.combination_id === chosen);
  // BK-3 PR 2: the combination asked for from the Studio, when no case can open on it now, is said, never swapped silently.
  const askedOff = initial && f.combinationId === initial && releases.isSuccess && !loadFailed && !combos.some((c) => c.combination_id === initial) ? notReady.find((r) => r.combination_id === initial) ?? null : undefined;
  const [earlier, setEarlier] = React.useState<Parameters<typeof EarlierStages>[0]["value"]>({});
  const earlierBody = earlierOf(chosenRelease, earlier);
  const create = useAction(() => api<CaseInfo>("/runtime/cases", { method: "POST", json: { combinationId: chosen, ...(earlierBody ? { earlier: earlierBody } : {}), ...(f.reference.trim() ? { reference: f.reference } : {}), clientActor: f.clientActor, principal: { displayName: f.principal }, ...(team.representative ? { representative: team.representative } : {}), ...(team.officer ? { caseOfficers: [team.officer] } : {}), idempotencyKey: key } }), { success: (c) => `Case ${c.case_number} opened`, invalidate: [["runtime"]], onDone: (c) => { if (sp.has("open")) nav("/cases", { replace: true }); nav(`/cases/${c.id}`); } });
  // Break m1: a 409 (the release stopped being ready while the dialog was open) reloads the list, so it is not offered again.
  const submit = () => create.mutate(undefined, { onError: (e) => { if (e instanceof ApiError && e.status === 409) void releases.refetch(); const p = e instanceof ApiError ? e.problem.errors ?? [] : []; setErrors(Object.fromEntries(p.flatMap((x) => [[x.field.split(".")[0], x.message], [x.field, x.message]]))); } });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }} title="Open a case" description="The case works from the combination's latest release, frozen now: a later release never changes it." guard
      footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button busy={create.isPending} disabled={!combos.length} title={!combos.length && !releases.isLoading && !loadFailed ? (notReady.length ? "No released combination is ready for new cases yet" : "Nothing is released yet") : undefined} onClick={submit}>Open case</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (combos.length) submit(); }}>
        {askedOff !== undefined ? <div data-asked-off><Notice tone="warn" title={askedOff ? `"${askedOff.combination}" is not ready for new cases` : "That combination has no release a case can open on"}>{combos.length ? "Choose another released combination below, or ask the people who set it up." : "Ask the people who set it up."}</Notice></div> : null}
        {releases.isLoading ? <Skeleton className="h-9 w-full" /> : loadFailed ? <Notice tone="warn" title="Could not load the released combinations">{releases.error instanceof Error ? releases.error.message : "Close this and try again."}</Notice> : !combos.length ? (notReady.length ? null : <Notice tone="warn" title="Nothing is released yet">A case opens only on a released combination.</Notice>) : (
          <Field label="Combination (released)" error={errors.combinationId}>
            <Select value={chosen} onChange={(e) => setF({ ...f, combinationId: e.target.value })}>{combos.map((c) => <option key={c.combination_id} value={c.combination_id}>{c.combination} · release {c.version}</option>)}</Select>
          </Field>
        )}
        <EarlierStages release={chosenRelease} value={earlier} onChange={setEarlier} errors={errors} />
        {notReady.length ? (
          <Notice tone="warn" title={combos.length ? "Released, not ready for new cases" : "No released combination is ready for new cases yet"}>
            <ul className="space-y-1 [overflow-wrap:anywhere]" data-testid="not-ready-for-cases">{notReady.map((r) => <li key={r.combination_id}><span className="font-medium">{r.combination} · release {r.version}</span>: {r.why}</li>)}</ul>
          </Notice>
        ) : null}
        {/* A24-2 (P-492, CS-7): every case gets a case number when it opens; the firm's own reference is optional. */}
        <div className="flex flex-col gap-1" data-next-case-number={nextNumber.data?.case_number ?? ""}>
          <p className="text-xs font-medium text-text">Case number</p>
          <p className="text-sm">Given when you open{nextNumber.data?.case_number ? <span className="text-text-muted"> ({nextNumber.data.case_number} next)</span> : null}</p>
        </div>
        <Field label="Your own reference (optional)" hint="Your firm's reference, if you use one: 3 to 80 characters, not shaped like a case number" error={errors.reference}><Input value={f.reference} onChange={(e) => { setF({ ...f, reference: e.target.value }); if (errors.reference) setErrors(({ reference: _r, ...rest }) => rest); }} /></Field>
        <Field label="Principal applicant's name" hint="Shown to the client as written; Sample names only in the prototype" error={errors.principal}><Input value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field>
        <Field label="Client login that answers" error={errors.clientActor}><Select value={f.clientActor} onChange={(e) => setF({ ...f, clientActor: e.target.value })}><option value="user-P">Client A (simulated)</option><option value="user-Q">Client B (simulated)</option></Select></Field>
        <OpeningTeam firm={firm} value={team} onChange={setTeam} errors={errors} />
        {combos.length ? <EmployerLinkFor combinationId={chosen} /> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

// ------------------------------------------------------------------ officer: one client (BK-3 PR 3)

type ClientCaseRow = CaseRow;
const opened = (at: string) => new Date(at).toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
/** Break m4: the case page's role words (ROLE); another role in words, capitalised as there ("Sponsor"). */
const personLine = (p: { label: string; role: string }) => { const r = ROLE[p.role] ?? p.role.replace(/_/g, " "); return `${p.label} · ${r.charAt(0).toUpperCase()}${r.slice(1)}`; };

/** BK-3 PR 3 (P-447 (2), concept screens/BK-3-client-page): the client's cases at the viewer's firm, linked both ways with
 *  each case. A client is the simulated login that answers a case (no client record yet: M4). One read per page view
 *  (`?client=`, challenge B1); links here never change the simulated person; the one next step opens a case for them. */
function ClientCasesPage() {
  const { clientKey = "" } = useParams();
  const actor = useActorId();
  const who = PEOPLE.find((p) => p.id === clientKey && isClient(p.id));
  const staff = isOfficer(actor);
  // Break m3: the firm's name is read only for a page that shows it (same cache key as useFirm), never for a refusal.
  const firm = useApi<{ name: string }>(["runtime", "firm", actor], who && staff ? "/runtime/firm" : null, { retry: false });
  const q = `/runtime/cases?client=${encodeURIComponent(clientKey)}&take=100`;
  const cases = useApi<{ cases: ClientCaseRow[]; next: string | null }>(["runtime", "cases", "client", clientKey, actor], who && staff ? q : null, { retry: noRetryOnRefusal });
  // Break M1: later pages belong to the person and client they were loaded for; after a switch of "Acting as" (another
  // firm) or of client they are dropped, never shown beside the new page 1.
  const owner = `${actor}|${clientKey}`;
  const [kept, setMore] = React.useState<{ owner: string; rows: ClientCaseRow[]; next: string | null } | null>(null);
  const more = kept?.owner === owner ? kept : null;
  const [loading, setLoading] = React.useState(false);
  const [moreError, setMoreError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  useWhere(who && staff ? [{ label: "Cases", to: "/cases" }, { label: who.name }] : null);
  if (!staff) return <Notice title="This page is for the firm's staff">Clients open their questionnaire from the link their officer sends. Choose a firm person under Acting as to see this client's cases.</Notice>; {/* BK-4a (P-484, BR-1): points at the one picker */}
  if (!who) return <Notice title="No such client"><Link className="text-text-link underline" to="/cases">Back to cases</Link></Notice>;
  const next = more ? more.next : cases.data?.next ?? null;
  async function loadMore() {
    if (!next || loading) return;
    setLoading(true);
    setMoreError(null);
    // Break m1: a failed page says so, never an uncaught error.
    try { const page = await api<{ cases: ClientCaseRow[]; next: string | null }>(`${q}&after=${encodeURIComponent(next)}`); if (!Array.isArray(page?.cases)) throw new Error("The answer was not a list of cases."); setMore((m) => ({ owner, rows: [...(m?.owner === owner ? m.rows : []), ...page.cases], next: page.next })); }
    catch (e) { setMoreError(e instanceof Error ? e.message : "Try again."); } finally { setLoading(false); }
  }
  // Break m2: an answer that is not a list (a proxy's page) reads as "could not load", never "no cases".
  const badBody = cases.isSuccess && !Array.isArray(cases.data?.cases);
  const rows = [...(badBody ? [] : cases.data?.cases ?? []), ...(more?.rows ?? [])].filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i);
  const firmName = firm.data?.name ?? "your firm";
  return (
    <div className="mx-auto max-w-5xl space-y-4" data-client-page={clientKey}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0"><h1 className="text-2xl font-semibold">{who.name}</h1>
          <p className="text-sm text-text-muted" data-client-line>Simulated client login: the prototype has no client records yet{cases.data && !badBody ? ` · ${rows.length} case${rows.length === 1 ? "" : "s"} shown at ${firmName}` : ""}</p></div>
        <Button onClick={() => setOpen(true)} data-client-open-case><Plus aria-hidden />Open a case for {who.name}</Button>
      </div>
      {cases.isLoading ? <Skeleton className="h-40 w-full" /> : cases.isError || badBody ? <Notice tone="danger" title="This client's cases could not be loaded" action={<Button size="sm" variant="secondary" busy={cases.isFetching} onClick={() => void cases.refetch()}>Try again</Button>}>{badBody ? "The answer was not a list of cases. Reload to try again." : (cases.error as Error).message}</Notice>
        : !rows.length ? <Notice title={`${who.name} has no cases at ${firmName} yet`}>Open a case for them; it lists here.</Notice>
        : <>
          {/* At phone width one card per case (the table would break the names letter by letter); the table from 640 px. */}
          <ul className="space-y-3 sm:hidden" aria-label={`${who.name}'s cases`}>{rows.map((c) => (
            <li key={c.id} data-client-case={caseWords(c)} className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm">
              <div className="flex items-start justify-between gap-3"><CaseCell c={c} /><Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill></div>
              <p className="text-text-muted">{c.combination} · opened {opened(c.created_at)}</p>
              {c.people?.length ? <ul className="mt-1.5 space-y-0.5">{c.people.map((p, i) => <li key={i}>{personLine(p)}</li>)}</ul> : <p className="mt-1.5 text-text-muted">No one added yet</p>}
            </li>))}</ul>
          <Table className="hidden sm:block" label={`${who.name}'s cases`} head={["Case", "Combination", "People", "Status", "Opened"]}>{rows.map((c) => (
          <tr key={c.id} data-client-case={caseWords(c)}>
            <td><CaseCell c={c} /></td>
            <td>{c.combination}</td>
            <td>{c.people?.length ? <ul className="space-y-0.5">{c.people.map((p, i) => <li key={i}>{personLine(p)}</li>)}</ul> : <span className="text-text-muted">No one added yet</span>}</td>
            <td><Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill></td>
            <td className="whitespace-nowrap">{opened(c.created_at)}</td>
          </tr>))}</Table>
        </>}
      {moreError ? <Notice tone="danger" title="More cases could not be loaded">{moreError}</Notice> : null}
      {next && !badBody ? <div className="flex items-center gap-3 text-[13px] text-text-muted"><span>More of {who.name}'s cases</span><Button size="sm" variant="secondary" busy={loading} onClick={() => void loadMore()}>Load more</Button></div> : null}
      {open ? <NewCaseDialog close={() => setOpen(false)} client={who.id} /> : null}
    </div>
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
  // BK-4c (break M1, BR-2): a review round waiting means the representative is next, not the client (same query as Ready to file).
  const rounds = useApi<{ rounds: { number: number; filings: { status: string }[] }[] }>(["runtime", "reviews", id], isOfficer(actor) ? `/runtime/cases/${id}/reviews` : null, { retry: noRetryOnRefusal });
  const inReview = (rounds.data?.rounds ?? []).filter((x) => x.filings.some((f) => f.status === "sent" || f.status === "under_review")).sort((a, b) => b.number - a.number)[0];
  // K13 (break m7): "Answer in the Agent view" (eligibility) lands on the Agent view, not the top of the case page.
  const { hash } = useLocation(), loaded = !!view.data;
  useWhere(view.data ? [{ label: "Cases", to: "/cases" }, { label: caseWords(view.data.case) }] : null); // BK-3: the frame's line names the case
  React.useEffect(() => { if (loaded && hash === "#agent-view") document.getElementById("agent-view")?.scrollIntoView({ block: "start" }); }, [loaded, hash]);
  // Review m4: a client who pressed Back after a hand-off returns to their questionnaire with its hand back.
  if (!isOfficer(actor)) { const from = handedFrom(id!); return <Notice title="This page is for the case officer">As a client, open <Link className="text-text-link underline" to={`/cases/${id}/questionnaire${from ? `?from=${encodeURIComponent(from)}` : ""}`}>your Client questionnaire</Link>.</Notice>; }
  if (view.isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-24 w-full" /></div>;
  if (view.isError) return <Notice tone="danger" title="This case could not be opened">{(view.error as Error).message}</Notice>;
  const v = view.data!, c = v.case, people = c.people.filter((p) => p.role !== "case");
  const client = PEOPLE.find((p) => p.id === c.client);
  // QA-417 (P-497; P-72 and P-78 kept): the household's "to confirm" names the people's tabs it sits in, each a link.
  // Re-review m3: each "·" stays with its link (nowrap), and the line breaks at the space between them.
  const confirmTabs = toConfirmByTab(v).filter((t) => t.n > 0);
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold [overflow-wrap:anywhere]"><span data-case-number-h className="tabular-nums">{c.case_number}</span>{c.reference ? <span className="text-lg font-normal text-text-muted" data-case-own-reference>{c.reference}</span> : null}<Pill>{c.status === "OPEN" ? "Open" : c.status}</Pill><ReleasePill c={c} /></h1>
          <div className="mt-1 empty:hidden"><CaseReadinessPill caseId={c.id} /></div>
          {/* BK-3 PR 3 (P-447 (2)): the case names its client and opens their page; the person acting stays the same. */}
          <p className="mt-1 text-sm text-text-muted">Client: <Link to={`/cases/clients/${encodeURIComponent(c.client)}`} data-case-client className="inline-flex min-h-6 items-center font-medium text-text-link hover:underline">{client?.name ?? "the client"}</Link></p>
          {c.team ? <CaseTeamChip caseId={c.id} line={c.team} /> : null}
          {c.employer_link ? <div className="mt-1"><EmployerLinkLine link={c.employer_link} caseId={c.id} /></div> : null}
          <p className="mt-1 text-sm text-text-muted">{v.summary.questions} questions for this household · {v.summary.answered} answered · <span data-household-to-confirm={v.summary.answered - v.summary.confirmed}>{v.summary.answered - v.summary.confirmed} to confirm</span> · {v.summary.missing} required not answered · {v.summary.not_asked} questions of the release not asked here (no form of this case reads them)</p>
          {confirmTabs.length ? <p className="mt-1 text-sm text-text-muted" data-household-tabs>To confirm, in the Agent view: {confirmTabs.map((t, i) => <React.Fragment key={t.id}>{i ? " " : ""}<span className="whitespace-nowrap">{i ? "· " : ""}<a href={tabHash(t.id)} data-household-tab={t.id} className="inline-flex min-h-6 items-center whitespace-normal font-medium text-text-link hover:underline">{t.label} ({t.n})</a></span></React.Fragment>)}</p> : null}
        </div>
        <div className="rounded-lg border border-border bg-surface-raised p-3 text-sm">
          <p className="font-medium">Client questionnaire</p>
          {/* BK-4c (BR-2, BR-4, BR-7): the questionnaire is the case's own client's; the hand-off carries who hands back (?from=). */}
          {/* Break M1 (BR-2): "Next: <client>" only while the client owes required answers and no review round waits; every
              required question answered: where it stands, and the client may still check; a round waiting: no button here
              (Ready to file hands to the representative). */}
          {client && inReview ? <p className="mt-1.5 text-[13px] text-text-muted" data-client-card="in-review">{client.name} answers on their phone, for everyone travelling. Round {inReview.number} is with the representative of record now.</p>
            : client ? <HandOff className="mt-1.5" to={c.client} go={`/cases/${c.id}/questionnaire?from=${encodeURIComponent(actor)}`} handsCase={{ caseId: c.id, from: actor }} data="client"
              {...(v.summary.missing === 0 && v.summary.answered > 0 ? { line: <>{client.name} has answered every required question and can still check the answers.</> } : { next: <>{client.name} answers on their phone, for everyone travelling.</> })} />
            : <p className="text-xs text-text-muted">The client answers on their phone, for everyone travelling.</p>}
        </div>
      </div>
      <StageStrip caseId={c.id} />
      <ReleaseNotice caseId={c.id} />
      {/* C6.13 (B135): people with their filings, Make principal, Remove filing and Add filing back. */}
      <PeopleAndFilings caseId={c.id} people={c.people} canAdd={c.can_add ?? []} onAdd={setAdding} roleOf={roleOf} nameOf={nameOf} />
      {/* C6.19: a returning client's confirmed facts from an earlier case, re-confirmed before use. */}
      <EarlierFactsCard caseId={c.id} />
      <DocumentsPanel caseId={c.id} caseSubject={c.people.find((p) => p.role === "case")?.subject_id ?? ""} nameOf={nameOf} />
      <EligibilityCard caseId={c.id} people={c.people} />
      <ItemChannels caseId={c.id} />
      <FormsPanel caseId={c.id} />
      <FindingsPanel caseId={c.id} people={c.people} openLink={`/cases/${c.id}/review`} />
      <SubmissionPanel caseId={c.id} />
      {/* C6.16: who answers for each person and their own links, next to the Agent view where their answers are (placed
          below the case panels so its late load never moves them: check_c69_page_browser's focus check). */}
      <OfficerPeoplePanel caseId={c.id} />
      <div id="agent-view" className="scroll-mt-4 space-y-3"><h2 id="agent-view-h" className="text-base font-semibold" data-agent-view-h>Agent view</h2>
      <Questionnaire caseId={c.id} mode="agent" /></div>
      {adding ? <AddPersonDialog caseId={c.id} line={adding} close={() => setAdding(null)} /> : null}
    </div>
  );
}

/** The case's release; BK-3 PR 2 (qa baseline dead end 2): it opens the combination's set-up in the Studio, acting as
 *  the Studio person as "Product Studio →" does. The case stays on its frozen release whatever the Studio shows. */
function ReleasePill({ c }: { c: CaseInfo }) {
  const when = new Date(c.pin.pinned_at).toLocaleString("en-CA");
  const label = c.release?.label ?? `Release ${c.pin.release_version}`;
  const frozen = c.pin.revision > 1 ? `Moved to this release on ${when}; a later release never changes this case until someone moves it` : `Frozen when the case opened (${when}); a later release never changes this case until someone moves it`;
  return (
    // BK-4a (review M2, BR-1): the pill says on screen who you become in the Studio, and its name starts with those words.
    <Link to={`/c/${c.combination_id}`} onClick={leaveCasesAsStudio} data-case-release aria-label={`${label} (as ${personOf(STUDIO_AUTHOR)!.name}): open its set-up in Product Studio`} title={`${frozen}. Opens its set-up in Product Studio as the ${personOf(STUDIO_AUTHOR)!.name} (simulated).`}
      className="inline-flex min-h-6 items-center rounded-md outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-primary/40"><Pill tone="info">{label}<span className="font-normal" data-case-release-person> (as {personOf(STUDIO_AUTHOR)!.name})</span><ArrowRight className="size-3" aria-hidden /></Pill></Link>
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
  useCaseWhere(id!, "Client questionnaire", !isClient(actor)); // BK-3: staff see the case's reference; the client's line is their own
  // BK-4c: "Act as Client A" was a literal id; the hand-off goes to this case's own client (Client B's case: Client B).
  const view = useApi<{ case: { client: string } }>(["runtime", "view", id, "agent", actor], !isClient(actor) && isFirmStaff(actor) ? `/runtime/cases/${id}/questionnaire?mode=agent` : null, { retry: noRetryOnRefusal });
  if (!isClient(actor)) return (
    <Notice title="This is the Client questionnaire">
      As the case officer, review and change answers on <Link className="text-text-link underline" to={`/cases/${id}`}>the case page</Link>.
      {view.data ? <HandOff className="mt-2" to={view.data.case.client} go={`/cases/${id}/questionnaire?from=${encodeURIComponent(actor)}`} handsCase={{ caseId: id!, from: actor }} next={<>{personOf(view.data.case.client)?.name ?? "The client"} answers this questionnaire.</>} data="client" /> : null}
    </Notice>
  );
  return <Questionnaire caseId={id!} mode="sqr" />;
}

