import * as React from "react";
import { RunChip } from "@/components/run-card";
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Activity, BookOpen, Boxes, CheckSquare, ChevronDown, Database, FileStack, FileText, Inbox, Layers, ListTree, Moon, RotateCcw, Sparkles, Sun, Upload, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { api, ApiError, getActor, setActor, useAction, useActorId, useApi, useToast } from "@/lib/api";
import { Button, Dialog, Input, Notice, Pill, Table } from "@/components/ui/controls";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ProgramsPage } from "@/pages/programs";
import { ReleasePage } from "@/pages/release";
import { ChecksPage, FormsPage } from "@/pages/library-forms";
import { CombinationPage } from "@/pages/combination";
import { JobPage } from "@/pages/job";
import { FieldsPage, FieldPage, SectionsPage, DocumentTypesPage } from "@/pages/library";
import { ActivityPage, ReleasesPage } from "@/pages/history";
import { AiBatchPage, AiWorkPage } from "@/pages/ai";
import { ToReviewPage } from "@/pages/to-review";
import { StructurePage } from "@/pages/structure";
import { EditionImpactPage, HeldFilePage, LibraryChangePage, MergeReviewPage, FormFieldsPage } from "@/pages/review-items";
import { ChangeBatchPage, ProposalsPage } from "@/pages/proposals";
import { RuntimeApp } from "@/runtime/cases";

export default function App() {
  // The case area (runtime lane, R1c) has its own shell: firm and client pages, not the configuration studio.
  return <BrowserRouter><Routes><Route path="/cases/*" element={<RuntimeApp />} /><Route path="*" element={<Shell />} /></Routes></BrowserRouter>;
}

function Shell() {
  const actorId = useActorId();
  const session = useApi(["session", actorId], "/session");
  const loc = useLocation();
  // QA-54: a case person who opens a Studio address is told the page is not theirs, with the way to their cases.
  const me = session.data?.actor, casePerson = !!me && me.area !== "studio";
  // To review (P-79) shows what waits for the person acting.
  const queue = useApi<{ counts: { needs: number } }>(["review-queue", actorId, "count"], "/review-queue?filter=needs", { refetchInterval: 15_000 });
  const nav = [
    // P-125 (founder, 27 Oct): the menu in setup order: names first (the one place they enter), then the combinations,
    // then what waits for a second person.
    { to: "/structure", label: "Program structure", icon: ListTree },
    { to: "/", label: "Immigration programs", icon: Layers, match: (p: string) => p === "/" || p.startsWith("/c/") },
    { to: "/review", label: "To review", icon: Inbox, badge: queue.data?.counts.needs || undefined },
    { to: "/library/fields", label: "Fields", icon: Database },
    { to: "/library/sections", label: "Sections", icon: Boxes },
    { to: "/library/documents", label: "Document types", icon: FileStack },
    { to: "/library/forms", label: "Forms", icon: FileText },
    { to: "/library/checks", label: "Checks", icon: CheckSquare },
    { to: "/ai", label: "AI work", icon: Sparkles },
    { to: "/releases", label: "Releases", icon: BookOpen },
    { to: "/activity", label: "Activity", icon: Activity },
  ];
  // QA-80: the browser tab names the page ("<page> · Product Studio"), from the menu item the address belongs to.
  // A page reached from the draft bar, not the menu, names itself too (QA-80 retest: "/release" said "Product Studio" alone).
  const here = nav.find((n) => n.match ? n.match(loc.pathname) : loc.pathname.startsWith(n.to)) ?? (loc.pathname === "/release" ? { label: "Review and release" } : undefined);
  React.useEffect(() => { document.title = here ? `${here.label} · Product Studio` : "Product Studio"; }, [here?.label]);
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center gap-3 border-b border-border bg-surface-raised px-4">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="Product Studio home">
          {/* Team BrandLogo convention: the "-dark" artwork is brand blue for light surfaces; the plain one is white. */}
          <img src="/brand/expat-ready-notagline-dark.svg" alt="Expat Ready" className="h-6 dark:hidden" />
          <img src="/brand/expat-ready-notagline.svg" alt="Expat Ready" className="hidden h-6 dark:block" />
        </Link>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <div className="hidden shrink-0 leading-tight sm:block"><p className="text-sm font-semibold">Product Studio</p><p className="text-[11px] text-text-muted">Pathway Configurator</p></div>
        <Pill tone="warn" className="ml-1 hidden lg:inline-flex" title="Working prototype on a local demo database: no sign-in, simulated people, not production">Prototype · demo workspace</Pill>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <RunChip />
          <DemoControls loaded={!!session.data?.sampleLoaded} programsExist={(session.data?.counts?.programs ?? 0) > 0} />
          {/* QA-54: the list holds the Studio people; a case person who arrives here is shown too, so the header names them. */}
          <PersonaSwitch actors={casePerson ? [...(session.data?.actors ?? []), me] : session.data?.actors ?? []} />
          <ThemeToggle />
        </div>
      </header>
      {!casePerson && <DraftBar />}
      <div className="flex flex-1">
        {/* The menu column's white background and border run the full page height (S1-finish); the menu itself stays in view. */}
        <div className={cn("hidden w-56 shrink-0 border-r border-border bg-surface-raised", !casePerson && "md:block")} data-menu-column>
        <nav aria-label="Studio" className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col gap-0.5 p-3">
          <p className="px-2 pb-1 pt-2 text-xs font-medium text-text-muted">Configure</p>
          {nav.slice(0, 3).map((n) => <NavItem key={n.to} {...n} active={n.match ? n.match(loc.pathname) : undefined} />)}
          <p className="px-2 pb-1 pt-4 text-xs font-medium text-text-muted">Shared library</p>
          {nav.slice(3, 8).map((n) => <NavItem key={n.to} {...n} />)}
          <p className="px-2 pb-1 pt-4 text-xs font-medium text-text-muted">History</p>
          {nav.slice(8).map((n) => <NavItem key={n.to} {...n} />)}
          <div className="mt-auto rounded-lg border border-border bg-surface p-3 text-[11px] leading-relaxed text-text-muted">
            Simulated people; local PostgreSQL demo database. AI drafting uses the guarded prototype route (synthetic or public official inputs only). Not production.
          </div>
        </nav>
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
          {session.isError ? ((session.error as ApiError).status ?? 500) < 500
            ? <Notice tone="danger" title="The studio did not accept the simulated person">Pick a person under Simulated person, then reload this page. ({(session.error as Error).message})</Notice>
            : <Notice tone="danger" title="The studio server is not answering">Start it with studio/start.sh, then reload this page. ({(session.error as Error).message})</Notice>
            : !session.isPending && !session.data?.actor ? <Notice tone="danger" title="The studio answered without a person">Something between this page and the studio changed its answer. Reload this page; if it stays, restart the studio.</Notice> : null}
          {casePerson ? <Notice tone="warn" title="This page is for the configuration people" action={<Link className="whitespace-nowrap text-text-link underline" to="/cases">Open your cases</Link>}>{me.name} (simulated) works on cases. Programs, forms and rules are set up here by the configuration people; your work is in Cases.</Notice> : <Routes>
            <Route path="/" element={<ProgramsPage />} />
            <Route path="/review" element={<ToReviewPage />} />
            <Route path="/structure" element={<StructurePage />} />
            <Route path="/review/change/:id" element={<LibraryChangePage />} />
            <Route path="/review/proposals" element={<ProposalsPage />} />
            <Route path="/review/batch/:id" element={<ChangeBatchPage />} />
            <Route path="/review/merge/:id" element={<MergeReviewPage />} />
            <Route path="/review/held/:id" element={<HeldFilePage />} />
            <Route path="/review/edition/:id" element={<EditionImpactPage />} />
            <Route path="/review/form-fields/:id" element={<FormFieldsPage />} />
            <Route path="/c/:id" element={<CombinationPage />} />
            <Route path="/c/:id/:tab" element={<CombinationPage />} />
            <Route path="/c/:id/jobs/:jobId" element={<JobPage />} />
            <Route path="/library/fields" element={<FieldsPage />} />
            <Route path="/library/fields/:key" element={<FieldPage />} />
            <Route path="/library/sections" element={<SectionsPage />} />
            <Route path="/library/documents" element={<DocumentTypesPage />} />
            <Route path="/library/forms" element={<FormsPage />} />
            <Route path="/library/checks" element={<ChecksPage />} />
            <Route path="/release" element={<ReleasePage />} />
            <Route path="/ai" element={<AiWorkPage />} />
            <Route path="/ai/:batchId" element={<AiBatchPage />} />
            <Route path="/releases" element={<ReleasesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="*" element={<Notice title="Page not found"><Link className="text-text-link underline" to="/">Back to Immigration programs</Link></Notice>} />
          </Routes>}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

/** The shared draft (P-23): one line on every page with everyone's unreleased changes and the one way to release. */
function DraftBar() {
  const d = useApi<any>(["draft", "summary"], "/draft?summary=1", { refetchInterval: 15_000 }); // counts only (break m7)
  if (!d.data) return null;
  const x = d.data, rows = x.rows.length;
  // Short on purpose (early look item 6): what it is, how many, and the one way to release.
  return (
    <div className={cn("flex flex-wrap items-center gap-3 border-b px-4 py-1.5 text-[13px] md:px-6", x.changes ? "border-warn/30 bg-warn/10 text-text" : "border-border bg-surface text-text-muted")} role="status">
      {x.changes ? <span title={`One shared workspace draft across ${rows} combination${rows === 1 ? "" : "s"}. The release review lists each combination and its change count. Released content stays as approved until a new release.`}><b className="font-semibold">Draft</b> · {x.changes} change{x.changes === 1 ? "" : "s"} across {rows} combination{rows === 1 ? "" : "s"}</span>
        : <span>No unreleased changes.{x.last ? ` Firms use Release ${x.last.version}.` : ""}</span>}
      <span className="flex-1" />
      {x.changes ? <Link to="/release" className="font-semibold text-text-link underline-offset-2 hover:underline">Review and release ({x.changes})</Link> : null}
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active, badge }: { to: string; label: string; icon: any; active?: boolean; badge?: number }) {
  return (
    <NavLink to={to} end={to === "/"} className={({ isActive }) => cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-text-muted outline-none hover:bg-text/5 hover:text-text focus-visible:ring-[3px] focus-visible:ring-ring/50",(active ?? isActive) && "bg-primary/10 font-medium text-text-link")}>
      <Icon className="size-4" />{label}
      {badge ? <span className="ml-auto rounded-md bg-[#7c3aed]/12 px-1.5 text-[11px] font-semibold tabular-nums text-[#6d28d9] dark:text-[#c4b5fd]" aria-label={`${badge} waiting for you`}>{badge}</span> : null}
    </NavLink>
  );
}

function PersonaSwitch({ actors }: { actors: any[] }) {
  const id = useActorId();
  const qc = useToast();
  const me = actors.find((a) => a.id === id);
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1">
      <span className="hidden whitespace-nowrap text-[11px] text-text-muted lg:inline">Acting as</span>
      <select className="min-w-0 max-w-[13rem] truncate bg-transparent text-xs font-medium outline-none xl:max-w-[22rem]" value={id} onChange={(e) => { setActor(e.target.value); const a = actors.find((x) => x.id === e.target.value); qc.push({ tone: "info", text: `Now acting as ${a?.name} (simulated): ${a?.role}` }); }} aria-label="Simulated person">
        {/* QA-80: one name per person in the header; the staff role and duties are in the tip of "Simulated". */}
        {actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <Pill tone="neutral" title={me ? `${me.role}. Duties: ${me.duties.join(", ")}` : undefined}>Simulated</Pill>
    </label>
  );
}

function ThemeToggle() {
  const [t, setT] = React.useState(() => document.documentElement.dataset.theme ?? "light");
  return <Button variant="ghost" size="icon" aria-label={t === "dark" ? "Use the light theme" : "Use the dark theme"} onClick={() => { const n = t === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; try { localStorage.setItem("xr-theme", n); } catch { /* ignore */ } setT(n); }}>{t === "dark" ? <Sun /> : <Moon />}</Button>;
}

function DemoControls({ loaded, programsExist }: { loaded: boolean; programsExist: boolean }) {
  const [resetOpen, setResetOpen] = React.useState(false);
  const navTo = useNavigate();
  const [log, setLog] = React.useState<string[] | null>(null);
  const load = useAction(() => api("/demo/load", { method: "POST" }), { success: (r: any) => `Sample inputs loaded in ${r.seconds.toFixed(1)} s`, onDone: (r: any) => { setLog(r.log); navTo("/"); } });
  // Demo-only controls in one menu (P-35): scaffolding, never part of the product.
  const item = "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 outline-none data-[highlighted]:bg-text/5 data-[disabled]:cursor-default data-[disabled]:opacity-50";
  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><Button size="sm" variant="secondary" busy={load.isPending}>Demo <ChevronDown /></Button></DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-[260px] rounded-lg border border-border bg-surface-raised p-1 text-sm shadow-lg">
            <DropdownMenu.Item className={item} disabled={loaded || programsExist} onSelect={() => load.mutate(undefined)}><Upload className="size-4" />{loaded ? "Sample inputs loaded (reset to load again)" : programsExist ? "Load sample inputs (programs exist: reset first)" : "Load sample inputs"}</DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => setResetOpen(true)}><RotateCcw className="size-4" />Reset demo…</DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => navTo("/cases")}><FileText className="size-4" />Open the case area (runtime preview)</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
      <Dialog open={!!log} onOpenChange={() => setLog(null)} title="Sample inputs loaded" description="Every step used the same services as the screens. Nothing was approved, filled or AI-drafted by the loader." footer={<Button onClick={() => setLog(null)}>Continue</Button>}>
        <ul className="space-y-1 text-sm">{log?.map((l, i) => <li key={i} className={l.startsWith("  ") ? "pl-4 text-text-muted" : "font-medium"}>{l.trim()}</li>)}</ul>
      </Dialog>
    </div>
  );
}

function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const status = useApi(["demo-status", open], open ? "/demo/status" : null);
  const [confirm, setConfirm] = React.useState("");
  const [result, setResult] = React.useState<any>(null);
  const nav = useNavigate();
  const reset = useAction(() => api("/demo/reset", { method: "POST", json: { confirm } }), { success: "Demo reset", invalidate: [[]], onDone: (r) => { setResult(r); setConfirm(""); nav("/"); } });
  const s = status.data?.scope;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setResult(null); }} wide title={result ? "Demo reset" : "Reset the demo workspace?"} description="Removes everything the disposable demo workspace created. Keeps the engine, official originals, fixtures, AI run records, the spend ledger and review evidence."
      footer={result ? <Button onClick={() => onOpenChange(false)}>Close</Button> : <><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" disabled={confirm !== "RESET"} busy={reset.isPending} onClick={() => reset.mutate(undefined)}><RotateCcw /> Reset demo</Button></>}>
      {result ? (
        <div className="space-y-3">
          <Notice tone={result.preserved_unchanged ? "ok" : "danger"} title={`${result.removed_rows} rows and ${result.removed_files} working files removed in ${result.seconds.toFixed(1)} s`}>{result.remaining_rows === 0 ? `The new workspace keeps only its ${result.remaining_built_in} built-in person roles.` : `${result.remaining_rows} rows remain in the new workspace, besides its ${result.remaining_built_in} built-in person roles.`} Preserved evidence {result.preserved_unchanged ? "is byte-identical before and after (fingerprints below)" : "CHANGED: investigate before continuing"}.</Notice>
          <Preserved list={result.preserved} />
        </div>
      ) : status.isLoading ? <Spinner label="Counting" /> : s ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{Object.entries<number>(s.rows).filter(([, v]) => v > 0).map(([k, v]) => <div key={k} className="flex justify-between border-b border-border py-1"><span className="text-text-muted">{k}</span><span className="font-medium">{v}</span></div>)}</div>
          {s.total_rows === 0 ? <Notice title="The workspace is already empty">Nothing to remove. Its {s.built_in_rows} built-in person roles stay.</Notice> : null}
          <p className="text-sm">Working files: <b>{s.files}</b> ({Math.round(s.bytes / 1024)} KB) in <span className="mono">{s.folder}</span>. Generated scripts: {s.generated_scripts}.</p>
          <div><p className="mb-1 text-xs font-medium">Kept, and checked unchanged after the reset</p><Preserved list={status.data.preserved} /></div>
          <label className="block text-sm">Type <b>RESET</b> to confirm<Input className="mt-1 w-48" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type RESET to confirm" /></label>
        </div>
      ) : null}
    </Dialog>
  );
}

function Preserved({ list }: { list: any[] }) {
  return <Table dense head={["Kept", "Files", "Fingerprint (SHA-256)"]}>{list.map((p) => <tr key={p.label}><td>{p.label}</td><td>{p.files}</td><td className="mono">{p.sha256.slice(0, 16)}…</td></tr>)}</Table>;
}

function Toaster() {
  const t = useToast();
  return (
    <div data-toaster className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      {t.list.map((x) => (
        <div key={x.id} className={cn("pointer-events-auto flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface-raised px-4 py-3 text-sm shadow-lg", x.tone === "ok" ? "border-l-ok" : x.tone === "danger" ? "border-l-danger" : "border-l-primary")}>
          <p className="flex-1">{x.text}</p><button className="text-text-muted" aria-label="Dismiss" onClick={() => t.drop(x.id)}><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}
export { getActor };
