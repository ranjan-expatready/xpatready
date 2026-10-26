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
import { ApiError, call, token } from "./api.ts";
import type { Outcome, PlanInput } from "./filler.ts";
import type { ReaderResult, ReadScreen } from "./reader.ts";
import "./panel.css";

type Person = { id: string; name: string; role: string };
type Me = { person: Person; modes: ("capture" | "fill")[]; expires_at: string };
type CaseRow = { id: string; reference: string; release: string; people: { subject_id: string; label: string; role: string }[]; online_forms: string[] };
type Plan = { match: true; screen: string; inputs: (PlanInput & { why: string })[]; counts: Record<string, number>; message: string } | { match: false; reason: string; message: string; screen?: string; differences?: { input: string; change: string; approved_label: string | null }[]; task?: { times: number; message: string } | null };
type Capture = { id: string; revision: number; status: string; status_detail: string; form: string; screens: { order: number; title: string; questions: number }[] };
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
      {me && <footer className="border-t border-border bg-surface-raised px-3 py-2 text-right"><button onClick={signOut} className="text-xs text-text-link underline">Sign out of the extension</button></footer>}
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
function FillMode({ onError, clearError }: { onError: (e: unknown) => void; clearError: () => void }) {
  const [cases, setCases] = React.useState<CaseRow[] | null>(null);
  const [pick, setPick] = React.useState<{ caseId: string; subject: string; form: string }>({ caseId: "", subject: "", form: "" });
  const [planTab, setPlanTab] = React.useState<number | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null), [outcomes, setOutcomes] = React.useState<Outcome[] | null>(null), [busy, setBusy] = React.useState(false);
  const [find, setFind] = React.useState("");
  // Any open case can be found by its reference (the 50 newest are listed without a search).
  React.useEffect(() => { const t = setTimeout(() => { void call<CaseRow[]>("GET", `/cases${find.trim() ? `?q=${encodeURIComponent(find.trim())}` : ""}`).then(setCases).catch(onError); }, find ? 300 : 0); return () => clearTimeout(t); }, [find]);
  // BR-13: the plan and its values are dropped when the portal tab moves on, and after 5 minutes.
  React.useEffect(() => {
    if (!plan) return;
    const drop = () => { setPlan(null); setOutcomes(null); };
    const t = setTimeout(drop, PLAN_MINUTES * 60_000);
    const moved = (id: number, info: { url?: string; status?: string }) => { if (id === planTab && (info.url || info.status === "loading")) drop(); };
    const closed = (id: number) => { if (id === planTab) drop(); };
    chrome.tabs.onRemoved.addListener(closed);
    chrome.tabs.onUpdated.addListener(moved);
    return () => { clearTimeout(t); chrome.tabs.onUpdated.removeListener(moved); chrome.tabs.onRemoved.removeListener(closed); };
  }, [plan, planTab]);
  const c = cases?.find((x) => x.id === pick.caseId);
  const fill = async () => {
    setBusy(true); clearError(); setPlan(null); setOutcomes(null);
    try {
      const { tabId, answer: read } = await ask<ReaderResult>({ kind: "read" });
      if (!read.ok) throw new ApiError("error" in read ? `This screen could not be read: ${read.error}.` : "This screen could not be read without reading an answer: nothing was sent.", 0);
      const p = await call<Plan>("POST", `/cases/${pick.caseId}/forms/${encodeURIComponent(pick.form)}/${pick.subject}/fill-plans`, { screen: read.screens[0] });
      setPlanTab(tabId); setPlan(p);
      // The same tab that was read is the one filled (never another portal tab that became active meanwhile).
      if (p.match) {
        const done = (await ask<Outcome[] | { moved: true }>({ kind: "fill", inputs: p.inputs, expect: read.screens[0] }, tabId)).answer;
        if (!Array.isArray(done)) { setPlan(null); throw new ApiError("The portal moved to another screen before filling. Nothing was filled: fill this screen again.", 0); }
        setOutcomes(done);
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
        <ul className="divide-y divide-border rounded-md border border-border bg-surface-raised">
          {outcomes.map((o) => { const p = plan.inputs.find((x) => x.id === o.id); return (
            <li key={o.id} className="p-2 text-sm"><p className="font-medium">{o.label}</p>
              <p className={`text-xs ${o.outcome === "filled" ? "text-text-ok" : o.outcome === "not_accepted" ? "text-text-danger" : "text-text-muted"}`}>
                {o.outcome === "filled" ? (p?.why ?? "Filled") : o.outcome === "not_accepted" ? "Not accepted by the screen: enter it yourself." : o.outcome === "left_alone" ? "Already answered on the screen: left as it is." : p?.why ?? "Not filled."}</p></li>); })}
        </ul>
      </section>}
      <Pinned><Button primary onClick={fill} disabled={busy || !pick.caseId || !pick.form || !pick.subject} className="w-full">{busy ? "Filling…" : plan && !plan.match ? "Check this screen again" : "Fill this screen"}</Button></Pinned>
    </div>
  );
}

// ─── capture mode
function CaptureMode({ onError, clearError }: { onError: (e: unknown) => void; clearError: () => void }) {
  const [cap, setCap] = React.useState<Capture | null>(null), [meta, setMeta] = React.useState({ portal: PORTALS[0][0] as string, form: "", title: "", applicationType: "" });
  const [check, setCheck] = React.useState<{ screen: ReadScreen; tabId: number; texts: { text: string; what: string | null }[] } | null>(null), [note, setNote] = React.useState<{ tone: "ok" | "warn" | "danger"; text: string } | null>(null), [busy, setBusy] = React.useState(false);
  const start = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); clearError(); try { setCap(await call<Capture>("POST", "/captures", { portal: meta.portal, form: meta.form, title: meta.title, ...(meta.applicationType ? { applicationType: meta.applicationType } : {}) })); } catch (err) { onError(err); } finally { setBusy(false); } };
  // BR-3: every text the screen would send is listed first; a text that looks like a client's detail refuses the screen.
  const read = async () => {
    setBusy(true); clearError(); setNote(null);
    try {
      const { tabId, answer: r } = await ask<ReaderResult>({ kind: "read" });
      if (!r.ok) { setCheck(null); setNote({ tone: "danger", text: "refused" in r ? `Refused: ${r.refused[0].why}. Nothing was sent.` : `Not read: ${r.error}. Nothing was sent.` }); return; }
      const s = r.screens[0];
      const texts = [s.title, ...s.inputs.flatMap((i) => [i.label, i.group, i.help, ...(i.options ?? []).map((o) => o.label)])].filter((t): t is string => !!t);
      setCheck({ screen: s, tabId, texts: [...new Set(texts)].map((text) => ({ text, what: CLIENT.find(([rx]) => rx.test(text))?.[1] ?? null })) });
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
  // PR #27: a capture the second person returned goes on here: remove the screens that are wrong, capture them again, finish.
  const remove = async (order: number) => { if (!cap) return; setBusy(true); clearError(); try { setCap(await call<Capture>("DELETE", `/captures/${cap.id}/screens/${order}`)); setNote({ tone: "ok", text: `Screen ${order} removed: capture it again in the portal.` }); } catch (e) { onError(e); } finally { setBusy(false); } };
  // Review Major 1: a capture left open (the panel was closed or reloaded) is offered again, never lost.
  const [open, setOpen] = React.useState<Capture[] | null>(null);
  React.useEffect(() => { if (!cap) void call<Capture[]>("GET", "/captures").then(setOpen).catch(onError); }, [cap]);
  const finish = async () => { if (!cap) return; setBusy(true); try { setCap(await call<Capture>("POST", `/captures/${cap.id}/finish`)); setNote(null); } catch (e) { onError(e); } finally { setBusy(false); } };
  if (!cap) return (
    <form onSubmit={start} className="space-y-3">
      {open?.length ? <section aria-label="Captures to continue" className="space-y-2">
        <p className="text-sm font-semibold">Continue a capture</p>
        {open.map((o) => <Button key={o.id} type="button" onClick={() => { void call<Capture>("GET", `/captures/${o.id}`).then((fresh) => { setCap(fresh); setNote(null); }).catch(onError); }} className="w-full">{o.status === "RETURNED" ? `Returned to you: ${o.form} · ${o.screens.length} screen${o.screens.length === 1 ? "" : "s"}` : `Continue ${o.form} · ${o.screens.length} screen${o.screens.length === 1 ? "" : "s"} so far`}</Button>)}
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
      {note && <Note tone={note.tone}>{note.text}</Note>}
      {check && <section aria-label="Check before sending" className="space-y-2 rounded-md border border-border bg-surface-raised p-2">
        <p className="text-sm font-semibold">Check before sending: these texts go to ExpatReady</p>
        <ul tabIndex={0} aria-label="Texts this screen sends" className="max-h-60 space-y-1 overflow-y-auto text-xs">{check.texts.map((t, i) => <li key={i} className={t.what ? "font-semibold text-text-danger" : ""}>{t.text}{t.what ? ` — looks like ${t.what}` : ""}</li>)}</ul>
        {check.texts.some((t) => t.what)
          ? <Note tone="danger">{`Refused: this text looks like a client's detail (${check.texts.find((t) => t.what)!.what}). Nothing was sent.`}</Note>
          : <Button primary onClick={send} disabled={busy} className="w-full">Send this screen</Button>}
      </section>}
      {!done && !check && <Pinned><Button primary onClick={read} disabled={busy} className="w-full">Capture this screen</Button></Pinned>}
      {/* A returned capture is finished again only after a change (remove a wrong screen or capture one). */}
      {!done && <Button onClick={finish} disabled={busy || !cap.screens.length || returned} className="w-full">Finish capture</Button>}
      {done && <Pinned><Button primary onClick={() => { setCap(null); setNote(null); }} className="w-full">Start another capture</Button></Pinned>}
      {!done && cap.screens.length > 0 && <ol aria-label="Screens captured" className="list-decimal space-y-1 pl-5 text-xs text-text-muted">{cap.screens.map((s) => <li key={s.order}><span className="inline-flex w-full items-center gap-2"><span className="flex-1">{s.title} · {s.questions} questions</span>
        <button type="button" onClick={() => void remove(s.order)} disabled={busy} aria-label={`Remove screen ${s.order}, ${s.title}`} className="inline-flex min-h-6 min-w-6 items-center px-1 text-text-link underline">Remove</button></span></li>)}</ol>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Panel />);
