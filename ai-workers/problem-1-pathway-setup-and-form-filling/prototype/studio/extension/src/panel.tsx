// The extension's side panel (F2d; concept §4–§5; EXPERIENCE §3 side panel): a pinned header (logo, mode, status), a
// scrolling body and one primary action in a pinned footer, from 320 px. Fill mode (the case duty): choose the case,
// person and form, then "Fill this screen" for the open portal screen, one screen per click. Capture mode (the capture
// duty): start a capture, "Capture this screen" for each screen in portal order after checking the texts it will send,
// then "Finish capture" (held for a second person). The mode switch shows only to a person given both duties. Every
// value of a plan lives in this page's memory only, and is dropped when the portal tab moves on, the panel closes or
// after 5 minutes (BR-13).
import { createRoot } from "react-dom/client";
import * as React from "react";
import RULES from "../../contracts/portal-reader-rules.json";
import { API, ApiError, call, token } from "./api.ts";
import type { Outcome, PlanInput } from "./filler.ts";
import type { ReaderResult, ReadScreen } from "./reader.ts";
import "./panel.css";

type Person = { id: string; name: string; role: string };
type Me = { person: Person; modes: ("capture" | "fill")[]; expires_at: string };
type CaseRow = { id: string; reference: string; release: string; people: { subject_id: string; label: string; role: string }[]; online_forms: string[] };
type Plan = { match: true; screen: string; inputs: (PlanInput & { why: string })[]; counts: Record<string, number>; message: string } | { match: false; reason: string; message: string; screen?: string; differences?: { input: string; change: string; approved_label: string | null }[]; task?: { times: number; message: string } | null };
type Task = { id: string; form: string; title: string | null; portal: string; portal_label: string; edition: string; screen: string; kind: string; differences: unknown[]; times: number };
type Summary = { screens: number; questions: number; version_screens: number; pdf_edition: string | null; unmatched_questions: number; matched_here: number; matched_kept: number; pdf_sections_not_seen: { group: string; label: string; questions: number; total: number }[] };
type Capture = { id: string; revision: number; status: string; status_detail: string; form: string; screens: { order: number; title: string; questions: number }[];
  /** F3 X1: the combination it was started for in the Studio. */ combination?: { id: string; label: string } | null; reused?: boolean; summary?: Summary };
/** A screen's identity as the Studio compares screens (engine/twin.ts screenIdentity): its heading, case and spacing aside. */
const ident = (title: string) => { const t = title.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "").toLowerCase(); return t.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || `screen:${t.trim()}`; };
const KIND: Record<string, string> = { text: "Text", textarea: "Text", select: "Choose one", radio: "Choose one", checkbox: "Tick box", date: "Date", email: "Email", tel: "Telephone", number: "Number", file: "File upload" };
/** F3 X5: what "Check before sending" shows for each question: its label, kind and choices, and any text that looks
 *  like a client's detail. PR #36 review: everything the screen sends is shown, so its element id, help text, format
 *  (length, pattern) and each choice's code are listed too. */
type Question = { label: string; kind: string; choices: string[]; details: string[]; bad: { text: string; what: string } | null };
const badOf = (texts: (string | undefined | null)[]) => { for (const t of texts) { if (!t) continue; const hit = CLIENT.find(([rx]) => rx.test(t)); if (hit) return { text: t, what: hit[1] }; } return null; };
const questionsOf = (s: ReadScreen): Question[] => [{ label: s.title, kind: "Screen title", choices: [], details: [], bad: badOf([s.title]) },
  ...s.inputs.map((i) => ({ label: i.group ? `${i.group} › ${i.label}` : i.label, kind: `${KIND[i.type] ?? i.type}${i.part ? ` (${i.part === "YYYY" ? "year" : i.part === "MM" ? "month" : "day"})` : ""}${i.required ? ", required" : ""}`,
    choices: (i.options ?? []).map((o) => (o.code && o.code !== o.label ? `${o.code} = ${o.label}` : o.label)),
    details: [`Element id: ${i.id}`, ...(i.help ? [`Help: ${i.help}`] : []), ...([i.min_length != null ? `at least ${i.min_length}` : "", i.max_length != null ? `at most ${i.max_length} characters` : "", i.pattern ? `pattern ${i.pattern}` : ""].filter(Boolean).length ? [`Format: ${[i.min_length != null ? `at least ${i.min_length}` : "", i.max_length != null ? `at most ${i.max_length} characters` : "", i.pattern ? `pattern ${i.pattern}` : ""].filter(Boolean).join(", ")}`] : [])],
    bad: badOf([i.label, i.group, i.help, i.id, i.pattern, ...(i.options ?? []).flatMap((o) => [o.label, o.code])]) }))];
const FIX = "Fix: open a blank application with no client's details, go to this screen and capture it again. Nothing was sent.";
const CLIENT = RULES.client_data.map((c) => [new RegExp(c.pattern), c.what] as const);
const PLAN_MINUTES = 5; // Sample (BR-13)
/** The portals as contracts/forms.ts lists them (kept here so the panel does not bundle the request contracts); P-98:
 *  the APR Portal first and chosen. */
const PORTALS = [["apr_portal", "APR Portal (Authorized Paid Representatives)"], ["ircc_portal", "IRCC Portal"], ["rep_pr_portal", "Representative Permanent Residence Portal"], ["lmia_online", "LMIA Online"]] as const;

// ─── the portal tab: the active tab of the window the person works in, else the portal tab they used last
async function portalTab(): Promise<chrome.tabs.Tab | null> {
  const hosts = (chrome.runtime.getManifest().content_scripts ?? []).flatMap((c) => c.matches ?? []);
  if (!hosts.length) return null;
  // The panel's own window first (review m9: never another window's portal tab), else the portal tab used last.
  const own = await chrome.windows.getCurrent().then((w) => chrome.tabs.query({ url: hosts, windowId: w.id })).catch(() => [] as chrome.tabs.Tab[]);
  const tabs = own.length ? own : await chrome.tabs.query({ url: hosts });
  return tabs.find((t) => t.active) ?? [...tabs].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0] ?? null;
}
async function ask<T>(msg: unknown, tabId?: number): Promise<{ tabId: number; answer: T }> {
  const id = tabId ?? (await portalTab())?.id;
  if (!id) throw new ApiError("Not a portal page: open the portal screen in a tab of this browser, then try again.", 0);
  try { return { tabId: id, answer: await chrome.tabs.sendMessage(id, msg) as T }; } catch { throw new ApiError("Not a portal page the extension can read: reload the portal screen, then try again.", 0); }
}

// ─── small parts, on the team's tokens
const Button = ({ primary, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) =>
  <button {...p} className={`inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium disabled:opacity-50 ${primary ? "bg-primary text-primary-contrast" : "border border-border-strong bg-surface-raised text-text"} ${p.className ?? ""}`} />;
const Note = ({ tone = "info", title, children }: { tone?: "info" | "danger" | "ok" | "warn"; title?: string; children?: React.ReactNode }) =>
  <div role={tone === "danger" ? "alert" : "status"} className={`rounded-md border p-3 text-sm ${tone === "danger" ? "border-danger text-text-danger" : tone === "ok" ? "border-ok text-text-ok" : tone === "warn" ? "border-warn text-text-warn" : "border-border text-text"}`}>
    {title && <p className="font-semibold">{title}</p>}{children && <div className={title ? "mt-1" : ""}>{children}</div>}
  </div>;
const Field = ({ label, children }: { label: string; children: React.ReactElement<{ id?: string }> }) => {
  const id = React.useId();
  return <label htmlFor={id} className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{React.cloneElement(children, { id })}</label>;
};
/** The mode's one primary action, pinned to the bottom of the panel while its results scroll (EXPERIENCE §3). */
const Pinned = ({ children }: { children: React.ReactNode }) => <div className="sticky bottom-0 z-10 -mx-3 border-t border-border bg-surface px-3 py-2">{children}</div>;
const input = "min-h-9 w-full rounded-md border border-border-strong bg-surface-raised px-2 text-sm text-text";

function Panel() {
  const [me, setMe] = React.useState<Me | null | undefined>(undefined);
  const [mode, setMode] = React.useState<"fill" | "capture">("fill");
  const [error, setError] = React.useState<string | null>(null);
  const fail = async (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { await token.set(null); setMe(null); setError(e.message); return; }
    setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
  };
  React.useEffect(() => { void (async () => { if (!(await token.get())) { setMe(null); return; } try { const m = await call<Me>("GET", "/session"); setMe(m); setMode(m.modes.includes("fill") ? "fill" : "capture"); } catch (e) { await fail(e); setMe(null); } })(); }, []);
  const signOut = async () => { try { await call("DELETE", "/session"); } catch { /* ended already */ } await token.set(null); setMe(null); setError(null); };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-surface-raised px-3 py-2">
        <img src="./brand/expat-ready-notagline-dark.svg" alt="Expat Ready" className="h-5" />
        <span className="ml-auto truncate text-xs text-text-muted" aria-live="polite">{me === undefined ? "Loading…" : me ? `${me.person.name} · ${mode === "fill" ? "Fill" : "Capture"}` : "Not connected"}</span>
      </header>
      {me && me.modes.length > 1 && (
        <div role="tablist" aria-label="Mode" className="flex border-b border-border bg-surface-raised">
          {(["fill", "capture"] as const).map((m) => <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex-1 py-2 text-sm ${mode === m ? "border-b-2 border-primary font-semibold" : "text-text-muted"}`}>{m === "fill" ? "Fill" : "Capture"}</button>)}
        </div>
      )}
      <main className="flex-1 space-y-3 overflow-y-auto p-3">
        {error && <Note tone="danger">{error}</Note>}
        {me === undefined ? <p className="text-sm text-text-muted">Loading…</p>
          : me === null ? <Connect onDone={(m) => { setMe(m); setMode(m.modes.includes("fill") ? "fill" : "capture"); setError(null); }} onError={setError} />
          : mode === "fill" ? <FillMode onError={fail} clearError={() => setError(null)} /> : <CaptureMode onError={fail} clearError={() => setError(null)} />}
      </main>
      {me && <footer className="flex items-center gap-2 border-t border-border bg-surface-raised px-3 py-2"><span className="text-xs text-text-muted">Connected until {new Date(me.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><button onClick={signOut} className="ml-auto text-xs text-text-link underline">Sign out of the extension</button></footer>}
    </div>
  );
}

function Connect({ onDone, onError }: { onDone: (m: Me) => void; onError: (m: string | null) => void }) {
  const [code, setCode] = React.useState(""), [busy, setBusy] = React.useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); onError(null);
    try {
      const r = await call<{ token: string; person: Person; modes: Me["modes"]; expires_at: string }>("POST", "/sessions", { code, extensionId: chrome.runtime.id }, false);
      await token.set(r.token); onDone({ person: r.person, modes: r.modes, expires_at: r.expires_at });
    } catch (err) { onError(err instanceof Error ? err.message : "That did not work. Try again."); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={go} className="space-y-3">
      <Note title="Connect the browser extension">In the ExpatReady Studio, open <em>Browser extension</em> and choose <em>Get a code</em>. Enter the code here within 5 minutes.</Note>
      <Field label="Code from the Studio"><input className={`${input} font-mono uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value)} maxLength={8} autoComplete="off" spellCheck={false} /></Field>
      <Button primary type="submit" disabled={busy || code.trim().length !== 8} className="w-full">{busy ? "Connecting…" : "Connect"}</Button>
    </form>
  );
}

// ─── fill mode
/** F3 X9: the three groups of a fill's results, in the order a person deals with them. */
const GROUPS = [{ key: "filled", label: "Filled" }, { key: "confirm", label: "Confirm in the case first" }, { key: "screen", label: "You answer on screen" }] as const;
const groupOf = (o: Outcome, p: { status: string } | undefined) => o.outcome === "filled" ? "filled" : p && ["not_confirmed", "no_answer"].includes(p.status) ? "confirm" : "screen";
function FillMode({ onError, clearError }: { onError: (e: unknown) => void; clearError: () => void }) {
  const [cases, setCases] = React.useState<CaseRow[] | null>(null);
  const [pick, setPick] = React.useState<{ caseId: string; subject: string; form: string }>({ caseId: "", subject: "", form: "" });
  const [planTab, setPlanTab] = React.useState<number | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null), [outcomes, setOutcomes] = React.useState<Outcome[] | null>(null), [busy, setBusy] = React.useState(false);
  const [find, setFind] = React.useState("");
  // F3 X10: "Undo this fill" clears what this fill wrote and nobody changed; gone once the portal moves on.
  const [undone, setUndone] = React.useState<{ cleared: number; kept: number } | null>(null);
  const [filledScreen, setFilledScreen] = React.useState<ReadScreen | null>(null);
  // Break M1: Undo is for the screen that was filled; when the portal shows another screen in place (no new page),
  // nothing is cleared and Undo goes.
  const undo = async () => {
    if (planTab === null || !filledScreen) return; setBusy(true);
    try {
      const r = (await ask<{ cleared: number; kept: number } | { moved: true }>({ kind: "undo", expect: filledScreen }, planTab)).answer;
      if ("moved" in r) { setPlan(null); setOutcomes(null); setFilledScreen(null); throw new ApiError("The portal shows another screen now: nothing was cleared. Undo works only on the screen that was filled.", 0); }
      setUndone(r);
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  // Any open case can be found by its reference (the 50 newest are listed without a search).
  React.useEffect(() => { const t = setTimeout(() => { void call<CaseRow[]>("GET", `/cases${find.trim() ? `?q=${encodeURIComponent(find.trim())}` : ""}`).then(setCases).catch(onError); }, find ? 300 : 0); return () => clearTimeout(t); }, [find]);
  // BR-13: the plan and its values are dropped when the portal tab moves on, and after 5 minutes.
  React.useEffect(() => {
    if (!plan) return;
    const drop = () => { setPlan(null); setOutcomes(null); setUndone(null); };
    const t = setTimeout(drop, PLAN_MINUTES * 60_000);
    const moved = (id: number, info: { url?: string; status?: string }) => { if (id === planTab && (info.url || info.status === "loading")) drop(); };
    const closed = (id: number) => { if (id === planTab) drop(); };
    chrome.tabs.onRemoved.addListener(closed);
    chrome.tabs.onUpdated.addListener(moved);
    return () => { clearTimeout(t); chrome.tabs.onUpdated.removeListener(moved); chrome.tabs.onRemoved.removeListener(closed); };
  }, [plan, planTab]);
  const c = cases?.find((x) => x.id === pick.caseId);
  const fill = async () => {
    setBusy(true); clearError(); setPlan(null); setOutcomes(null); setUndone(null);
    try {
      const { tabId, answer: read } = await ask<ReaderResult>({ kind: "read" });
      if (!read.ok) throw new ApiError("error" in read ? `This screen could not be read: ${read.error}.` : "This screen could not be read without reading an answer: nothing was sent.", 0);
      const p = await call<Plan>("POST", `/cases/${pick.caseId}/forms/${encodeURIComponent(pick.form)}/${pick.subject}/fill-plans`, { screen: read.screens[0] });
      setPlanTab(tabId); setPlan(p);
      // The same tab that was read is the one filled (never another portal tab that became active meanwhile).
      if (p.match) {
        const done = (await ask<Outcome[] | { moved: true }>({ kind: "fill", inputs: p.inputs, expect: read.screens[0] }, tabId)).answer;
        if (!Array.isArray(done)) { setPlan(null); throw new ApiError("The portal moved to another screen before filling. Nothing was filled: fill this screen again.", 0); }
        setOutcomes(done); setFilledScreen(read.screens[0]);
      }
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  if (!cases) return <p className="text-sm text-text-muted">Loading your cases…</p>;
  if (!cases.length && !find) return <Note title="No case to fill yet">Open a case in the Studio whose release files a form online; it appears here.</Note>;
  const filled = outcomes?.filter((o) => o.outcome === "filled").length ?? 0;
  return (
    <div className="space-y-3">
      <Field label="Search by reference"><input className={input} value={find} onChange={(e) => setFind(e.target.value)} type="search" autoComplete="off" /></Field>
      {find && !cases.length && <p className="text-xs text-text-muted">No open case has that reference.</p>}
      <Field label="Case"><select className={input} value={pick.caseId} onChange={(e) => { const x = cases.find((k) => k.id === e.target.value); setPick({ caseId: e.target.value, subject: x?.people.find((p) => p.role === "principal")?.subject_id ?? "", form: x?.online_forms[0] ?? "" }); setPlan(null); setOutcomes(null); }}>
        <option value="">Choose a case</option>{cases.map((k) => <option key={k.id} value={k.id}>{k.reference} · {k.release}</option>)}</select></Field>
      {c && <>
        <Field label="Person"><select className={input} value={pick.subject} onChange={(e) => setPick({ ...pick, subject: e.target.value })}>{c.people.filter((p) => p.role !== "case").map((p) => <option key={p.subject_id} value={p.subject_id}>{p.label}</option>)}</select></Field>
        {c.online_forms.length ? <Field label="Online form"><select className={input} value={pick.form} onChange={(e) => setPick({ ...pick, form: e.target.value })}>{c.online_forms.map((f) => <option key={f}>{f}</option>)}</select></Field>
          : <Note tone="warn">This case's release files no form online: its forms are PDF copies in the Studio.</Note>}
      </>}
      <p className="text-xs text-text-muted">Fills the open portal screen only, from the case's confirmed answers. It never clicks Next, Save or Submit.</p>
      {plan && !plan.match && <Note tone="warn" title={plan.reason === "not_captured" ? "Screen not captured yet" : "This screen looks different"}>
        <p>{plan.message}</p>
        {/* Lead note 25 Oct: say what to do instead (nothing on this screen is filled until it is re-captured or matches). */}
        <p className="mt-2 font-medium">Enter this screen's answers yourself, from the case in the Studio. When the screen is captured again, check it again here.</p>
        {plan.differences?.length ? <ul className="mt-2 list-disc pl-5">{plan.differences.map((d, i) => <li key={i}>{d.approved_label ?? d.input}: {d.change === "reworded" ? "reworded" : d.change === "options" ? "choices changed" : d.change}</li>)}</ul> : null}
        {plan.task && plan.task.times > 1 && <p className="mt-2 text-xs">{plan.task.message}</p>}
      </Note>}
      {plan?.match && outcomes && <section aria-label="What was filled" className="space-y-2">
        <Note tone={outcomes.some((o) => o.outcome === "not_accepted") ? "warn" : "ok"} title={`Filled ${filled} of ${outcomes.length}${outcomes.length - filled ? ` · ${outcomes.length - filled} need${outcomes.length - filled === 1 ? "s" : ""} you` : ""}`}>{plan.screen}</Note>
        {/* F3 X9: grouped by what the person does next, each with its source; an unconfirmed answer links to the case. */}
        {GROUPS.map((g) => { const rows = outcomes.filter((o) => groupOf(o, plan.inputs.find((x) => x.id === o.id)) === g.key); return rows.length ? (
          <div key={g.key} role="group" aria-label={g.label}><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">{g.label} ({rows.length})</p>
            <ul className="divide-y divide-border rounded-md border border-border bg-surface-raised">
              {rows.map((o) => { const p = plan.inputs.find((x) => x.id === o.id); return (
                <li key={o.id} className="p-2 text-sm"><p className="font-medium">{o.label}</p>
                  <p className={`text-xs ${o.outcome === "filled" ? "text-text-ok" : o.outcome === "not_accepted" ? "text-text-danger" : "text-text-muted"}`}>
                    {o.outcome === "filled" ? (p?.why ?? "Filled") : o.outcome === "not_accepted" ? "Not accepted by the screen: enter it yourself." : o.outcome === "left_alone" ? "Already answered on the screen: left as it is." : p?.why ?? "Not filled."}</p>
                  {g.key === "confirm" && <a className="text-xs text-text-link underline" href={`${API}/cases/${pick.caseId}`} target="_blank" rel="noreferrer">Open the case to confirm it</a>}</li>); })}
            </ul></div>) : null; })}
        {filled > 0 && !undone && <Button onClick={undo} disabled={busy} className="w-full">Undo this fill</Button>}
        {undone && <Note tone="ok">{`Cleared ${undone.cleared} value${undone.cleared === 1 ? "" : "s"} this fill wrote${undone.kept ? `; ${undone.kept} you changed since ${undone.kept === 1 ? "stays" : "stay"} as you left ${undone.kept === 1 ? "it" : "them"}` : ""}.`}</Note>}
      </section>}
      <Pinned><Button primary onClick={fill} disabled={busy || !pick.caseId || !pick.form || !pick.subject} className="w-full">{busy ? "Filling…" : plan && !plan.match ? "Check this screen again" : "Fill this screen"}</Button></Pinned>
    </div>
  );
}

// ─── capture mode
function CaptureMode({ onError, clearError }: { onError: (e: unknown) => void; clearError: () => void }) {
  const [cap, setCap] = React.useState<Capture | null>(null), [meta, setMeta] = React.useState({ portal: PORTALS[0][0] as string, form: "", title: "", applicationType: "" });
  const [check, setCheck] = React.useState<{ screen: ReadScreen; tabId: number; questions: Question[] } | null>(null), [note, setNote] = React.useState<{ tone: "info" | "ok" | "warn" | "danger"; text: string } | null>(null), [busy, setBusy] = React.useState(false);
  const start = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); clearError();
    try {
      const c = await call<Capture>("POST", "/captures", { portal: meta.portal, form: meta.form, title: meta.title, ...(meta.applicationType ? { applicationType: meta.applicationType } : {}) });
      setCap(c);
      // F3 D6: one open capture per person, form and portal: a second start continues the one already open.
      if (c.reused) setNote({ tone: "warn", text: c.status === "HELD" ? `${c.form} on this portal is held for a second person: a new capture starts once they approve or return it (or once you withdraw it in the Studio). Nothing new was started.` : `You already have this capture open${c.combination ? ` (started in the Studio for ${c.combination.label})` : ""}: continuing it, ${c.screens.length} screen${c.screens.length === 1 ? "" : "s"} so far. Nothing new was started.` });
    } catch (err) { onError(err); } finally { setBusy(false); }
  };
  // BR-3: every text the screen would send is listed first; a text that looks like a client's detail refuses the screen.
  const read = async () => {
    setBusy(true); clearError(); setNote(null);
    try {
      const { tabId, answer: r } = await ask<ReaderResult>({ kind: "read" });
      if (!r.ok) { setCheck(null); setNote({ tone: "danger", text: "refused" in r ? `Refused: ${r.refused[0].why}. ${FIX}` : `Not read: ${r.error}. Nothing was sent.` }); return; }
      const s = r.screens[0];
      // F3 X3: a screen already in this capture says so before anything is checked or sent.
      const n = cap?.screens.find((x) => ident(x.title) === ident(s.title))?.order;
      if (n) { setCheck(null); setPrompt({ title: s.title, n }); return; }
      setCheck({ screen: s, tabId, questions: questionsOf(s) });
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!cap || !check) return; setBusy(true);
    try {
      const r = await call<{ capture: Capture; result: { outcome: string; message: string } }>("POST", `/captures/${cap.id}/screens`, { screen: check.screen, revision: cap.revision });
      setCap(r.capture); setCheck(null); setNote({ tone: r.result.outcome === "added" ? "ok" : "warn", text: r.result.outcome === "added" ? r.result.message : r.result.message });
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  // PR #27: the list checked is the screen that was read; when the portal tab moves on (Next, Back, a reload) it is
  // dropped, so "Send this screen" can never send a screen that is no longer the one open.
  React.useEffect(() => {
    if (!check) return;
    const moved = (id: number, info: { url?: string; status?: string }) => { if (id === check.tabId && (info.url || info.status === "loading")) { setCheck(null); setNote({ tone: "warn", text: "The portal moved to another screen: nothing was sent. Capture the screen that is open now." }); } };
    const closed = (id: number) => { if (id === check.tabId) setCheck(null); };
    chrome.tabs.onUpdated.addListener(moved); chrome.tabs.onRemoved.addListener(closed);
    return () => { chrome.tabs.onUpdated.removeListener(moved); chrome.tabs.onRemoved.removeListener(closed); };
  }, [check]);
  // F3 X3: on each new portal page the panel names the screen and says whether it is new or already captured. The
  // screen is read on this computer only: nothing is sent until the person checks it and chooses Send.
  const [prompt, setPrompt] = React.useState<{ title: string; n: number | null } | null>(null);
  const live = !!cap && ["OPEN", "RETURNED"].includes(cap.status);
  const titles = cap?.screens.map((x) => `${x.order}:${x.title}`).join("|") ?? "";
  React.useEffect(() => {
    if (!live) { setPrompt(null); return; }
    let gone = false;
    const look = async (tabId?: number) => {
      try {
        const { answer: r } = await ask<ReaderResult>({ kind: "read" }, tabId);
        const title = r.ok ? r.screens[0].title : "title" in r ? r.title : null;
        if (!gone) setPrompt(title ? { title, n: cap!.screens.find((x) => ident(x.title) === ident(title))?.order ?? null } : null);
      } catch { if (!gone) setPrompt(null); }
    };
    void look();
    const loaded = (id: number, info: { status?: string }) => { if (info.status === "complete") void portalTab().then((t) => { if (t?.id === id) void look(id); }); };
    chrome.tabs.onUpdated.addListener(loaded);
    return () => { gone = true; chrome.tabs.onUpdated.removeListener(loaded); };
  }, [live, cap?.id, titles]);
  // PR #27: a capture the second person returned goes on here: remove the screens that are wrong, capture them again, finish.
  const remove = async (order: number) => { if (!cap) return; setBusy(true); clearError(); try { setCap(await call<Capture>("DELETE", `/captures/${cap.id}/screens/${order}?revision=${cap.revision}`)); setNote({ tone: "ok", text: `Screen ${order} removed: capture it again in the portal.` }); } catch (e) { onError(e); } finally { setBusy(false); } };
  // Review Major 1: a capture left open (the panel was closed or reloaded) is offered again, never lost.
  const [open, setOpen] = React.useState<Capture[] | null>(null);
  // F3 X8: screens that changed on the portal and must be captured again (no case is shown to a capture token).
  const [tasks, setTasks] = React.useState<Task[] | null>(null);
  React.useEffect(() => { if (!cap) { void call<Capture[]>("GET", "/captures").then(setOpen).catch(onError); void call<Task[]>("GET", "/capture/recapture-tasks").then(setTasks).catch(onError); } }, [cap]);
  const again = async (t: Task) => {
    setBusy(true); clearError();
    try {
      const c = await call<Capture>("POST", "/captures", { portal: t.portal, form: t.form, title: t.title ?? t.form });
      setCap(c);
      const there = t.kind === "changed" ? c.screens.find((x) => ident(x.title) === ident(t.screen)) : undefined;
      setNote(there ? { tone: "warn", text: `"${t.screen}" is already in this capture (screen ${there.order}): remove it below, then capture it again in the ${t.portal_label}.` }
        : { tone: "info", text: t.kind === "changed" ? `Go to "${t.screen}" in the ${t.portal_label} and capture it again; ${c.reused ? "this continues your open capture of " + t.form : "a second person approves it"}.` : `Go to the ${t.form} screen the approved version does not have, in the ${t.portal_label}, and capture it; ${c.reused ? "this continues your open capture of " + t.form : "a second person approves it"}.` });
    } catch (e) { onError(e); } finally { setBusy(false); }
  };
  const finish = async () => { if (!cap) return; setBusy(true); try { setCap(await call<Capture>("POST", `/captures/${cap.id}/finish`)); setNote(null); } catch (e) { onError(e); } finally { setBusy(false); } };
  if (!cap) return (
    <form onSubmit={start} className="space-y-3">
      {tasks?.length ? <section aria-label="Screens to capture again" className="space-y-2">
        <p className="text-sm font-semibold">Screens to capture again</p>
        {tasks.map((t) => <div key={t.id} className="space-y-1"><Button type="button" onClick={() => void again(t)} disabled={busy} className="w-full">{t.kind === "changed" ? `Capture ${t.screen} again · ${t.form}` : `Capture the new screen · ${t.form}`}</Button>
          <p className="text-xs text-text-muted">{`${t.portal_label}: ${t.kind === "changed" ? `${t.differences.length} question${t.differences.length === 1 ? "" : "s"} changed` : "a screen the approved version does not have"}${t.times > 1 ? ` · seen ${t.times} times` : ""}`}</p></div>)}
      </section> : null}
      {open?.length ? <section aria-label="Captures to continue" className="space-y-2">
        <p className="text-sm font-semibold">Continue a capture</p>
        {open.map((o) => <Button key={o.id} type="button" onClick={() => { void call<Capture>("GET", `/captures/${o.id}`).then((fresh) => { setCap(fresh); setNote(null); }).catch(onError); }} className="w-full">{o.status === "RETURNED" ? `Returned to you: ${o.form} · ${o.screens.length} screen${o.screens.length === 1 ? "" : "s"}` : o.combination ? `Started in the Studio · ${o.combination.label}: ${o.form} · ${o.screens.length} screen${o.screens.length === 1 ? "" : "s"} so far` : `Continue ${o.form} · ${o.screens.length} screen${o.screens.length === 1 ? "" : "s"} so far`}</Button>)}
        <p className="pt-2 text-sm font-semibold">Or start a new capture</p>
      </section> : null}
      <Note>Capture records each portal screen's structure in portal order, never an answer. A second person approves it before anything uses it.</Note>
      <Field label="Portal"><select className={input} value={meta.portal} onChange={(e) => setMeta({ ...meta, portal: e.target.value })}>{PORTALS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="Form code"><input className={input} value={meta.form} onChange={(e) => setMeta({ ...meta, form: e.target.value })} placeholder="IMM 5257" /></Field>
      <Field label="Title as the portal shows it"><input className={input} value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
      <Field label="Application type (optional)"><input className={input} value={meta.applicationType} onChange={(e) => setMeta({ ...meta, applicationType: e.target.value })} /></Field>
      <Button primary type="submit" disabled={busy || meta.form.trim().length < 2 || meta.title.trim().length < 3} className="w-full">Start capture</Button>
    </form>
  );
  const done = !["OPEN", "RETURNED"].includes(cap.status), returned = cap.status === "RETURNED";
  return (
    <div className="space-y-3">
      {/* Review m2: once finished, the record holds the version's screens too (Q2), so the count is not "captured" any more. */}
      <Note tone={done ? "ok" : returned ? "warn" : "info"} title={done ? `${cap.form} · ${cap.status === "HELD" ? "held for a second person" : cap.status === "APPROVED" ? "approved" : cap.status === "ABANDONED" ? "abandoned" : "already in the library"}` : returned ? `${cap.form} · returned to you` : `${cap.form} · ${cap.screens.length} screen${cap.screens.length === 1 ? "" : "s"} captured`}>{done || returned ? cap.status_detail : "Go to each screen in portal order and capture it."}</Note>
      {cap.combination && <p className="text-xs text-text-muted">Started in the Studio · {cap.combination.label}</p>}
      {note && <Note tone={note.tone}>{note.text}</Note>}
      {!done && !check && prompt && (prompt.n
        ? <Note title={`Already captured: ${prompt.title}`}>{`It is screen ${prompt.n}. Nothing was sent; go on to the next screen in the portal.`}</Note>
        : <Note title={`New screen: ${prompt.title}`}>Capture this screen when it is the next one in portal order. Nothing is sent until you check it.</Note>)}
      {check && <section aria-label="Check before sending" className="space-y-2 rounded-md border border-border bg-surface-raised p-2">
        <p className="text-sm font-semibold">Check before sending: {check.questions.length - 1} question{check.questions.length === 2 ? "" : "s"} go to ExpatReady, as structure only</p>
        <ul tabIndex={0} aria-label="Questions this screen sends" className="max-h-60 divide-y divide-border overflow-y-auto text-xs">{check.questions.map((q, i) => (
          <li key={i} className={`py-1 ${q.bad ? "text-text-danger" : ""}`}><p className={q.bad ? "font-semibold" : "font-medium text-text"}>{q.label}</p>
            <p className="text-text-muted">{q.kind}{q.choices.length ? `: ${q.choices.join(" · ")}` : ""}</p>
            {q.details.map((d, k) => <p key={k} className="break-all text-text-muted">{d}</p>)}
            {q.bad && <p className="font-semibold">{`"${q.bad.text}" looks like ${q.bad.what}`}</p>}</li>))}</ul>
        {check.questions.some((q) => q.bad)
          ? <Note tone="danger">{`Refused: "${check.questions.find((q) => q.bad)!.label}" shows a text that looks like ${check.questions.find((q) => q.bad)!.bad!.what}. ${FIX}`}</Note>
          : <Button primary onClick={send} disabled={busy} className="w-full">Send this screen</Button>}
      </section>}
      {done && cap.summary && <section aria-label="Capture summary" className="space-y-2 rounded-md border border-border bg-surface-raised p-2 text-sm">
        <p className="font-semibold">{`${cap.summary.screens} screen${cap.summary.screens === 1 ? "" : "s"} captured · ${cap.summary.questions} question${cap.summary.questions === 1 ? "" : "s"}`}{cap.summary.version_screens > cap.summary.screens ? ` (the version holds ${cap.summary.version_screens} screens)` : ""}</p>
        {cap.status === "HELD" && <p>A second person approves it in the Studio before anything uses it.</p>}
        {cap.summary.pdf_sections_not_seen.length
          ? <div><p className="font-medium">{cap.summary.version_screens > cap.summary.screens
                ? `PDF form fields no question of the version matches yet (${cap.summary.pdf_edition}; its ${cap.summary.version_screens} screens: ${cap.summary.screens} captured now, ${cap.summary.version_screens - cap.summary.screens} kept from the approved version):`
                : `PDF form fields no captured question matches yet (${cap.summary.pdf_edition}):`}</p>
              {cap.summary.version_screens > cap.summary.screens && <p className="text-xs">{`Matched by the screens captured now: ${cap.summary.matched_here} form field${cap.summary.matched_here === 1 ? "" : "s"}; only by the screens kept from the approved version: ${cap.summary.matched_kept}.`}</p>}
              <ul className="list-disc pl-5">{cap.summary.pdf_sections_not_seen.map((x) => <li key={x.group}>{x.questions === x.total ? `${x.label}: none of its ${x.total} form field${x.total === 1 ? "" : "s"}` : `${x.label}: ${x.questions} of ${x.total} form fields`}</li>)}</ul>
              {cap.summary.unmatched_questions > 0 && <p className="text-xs">{`${cap.summary.unmatched_questions} question${cap.summary.unmatched_questions === 1 ? "" : "s"} on the captured screens ${cap.summary.unmatched_questions === 1 ? "is" : "are"} not matched yet: a person maps ${cap.summary.unmatched_questions === 1 ? "it" : "them"} on the screen map after approval, which can cover these form fields.`}</p>}
              <p className="text-xs text-text-muted">The rest belong to a screen that appears only after some answers, or a question the portal asks differently. Capture that screen later, or mark the section asked differently on the screen map.</p></div>
          : cap.summary.pdf_edition ? <p>Every form field of {cap.summary.pdf_edition} matches a captured question.</p> : null}
        <a className="text-text-link underline" href={`${API}/review/capture/${cap.id}`} target="_blank" rel="noreferrer">Open it in the Studio</a>
      </section>}
      {!done && !check && <Pinned><Button primary onClick={read} disabled={busy} className="w-full">Capture this screen</Button></Pinned>}
      {/* A returned capture is finished again only after a change (remove a wrong screen or capture one). */}
      {!done && <Button onClick={finish} disabled={busy || !cap.screens.length || returned} aria-describedby={returned ? "finish-why" : undefined} className="w-full">Finish capture</Button>}
      {returned && <p id="finish-why" className="text-xs text-text-muted">Remove a screen that is wrong and capture it again; then Finish sends the capture to the second person again.</p>}
      {done && <Pinned><Button primary onClick={() => { setCap(null); setNote(null); }} className="w-full">Start another capture</Button></Pinned>}
      {!done && cap.screens.length > 0 && <ol aria-label="Screens captured" className="list-decimal space-y-1 pl-5 text-xs text-text-muted">{cap.screens.map((s) => <li key={s.order}><span className="inline-flex w-full items-center gap-2"><span className="flex-1">{s.title} · {s.questions} question{s.questions === 1 ? "" : "s"}</span>
        <button type="button" onClick={() => void remove(s.order)} disabled={busy} aria-label={`Remove screen ${s.order}, ${s.title}`} className="inline-flex min-h-6 min-w-6 items-center px-1 text-text-link underline">Remove</button></span></li>)}</ol>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Panel />);
