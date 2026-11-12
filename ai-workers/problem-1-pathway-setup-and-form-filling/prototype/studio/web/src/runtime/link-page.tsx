// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-4..BR-6, layout §4): the adult's own link, at
// /link, phone first (390 px). Outside the case area and its simulated people: it never sends x-actor. The token comes
// in the link's fragment (#t=…), is kept in sessionStorage and cleared from the address bar; opening the page sends
// nothing: the adult presses "Send me a code", types it, reads who sees their answers (wording Unconfirmed: no
// counsel), then answers their own parts with the client questionnaire's own screens (QuestionnaireIoContext). The
// application's shared answers are shown read-only. The demo inbox (/inbox, stand-in SI-20) stands in for email.
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Lock, LogOut, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Field, Input, Notice, Pill } from "@/components/ui/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposedStandIn } from "./privacy";
import { byPerson, QuestionnaireIoContext, shown, Sqr, type QuestionnaireIo, type View } from "./questionnaire";
import { Frame } from "@/components/frame"; // BK-3: one frame, the demo inbox included
import { LINK_RULES, LINK_WORDS, type LinkOpened, type LinkSession } from "../../../contracts/person-link";
import type { ViewQuestion } from "../../../contracts/runtime";

const TOKEN = "xr-link-token", SESSION = "xr-link-session", SENT = "xr-link-code-sent";
type Stored = Pick<LinkSession, "session" | "case_id" | "subject_id">;
const store = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* private window: the page still works until reload */ } },
  del: (k: string) => { try { sessionStorage.removeItem(k); } catch { /* nothing kept */ } },
};
const readStored = (): Stored | null => { try { const s = JSON.parse(store.get(SESSION) ?? "null") as Stored | null; return s?.session ? s : null; } catch { return null; } };

/** A call to /api/link/*: its own session as a Bearer header, never the Studio's simulated person (challenge M2). */
async function linkApi<T = unknown>(path: string, init: { method?: string; json?: unknown } = {}, session?: string): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session}` } : {}) };
  const res = await fetch(`/api/link${path}`, { method: init.method ?? "GET", headers, body: init.json === undefined ? undefined : JSON.stringify(init.json), referrerPolicy: "no-referrer" });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new ApiError(typeof data === "object" && data?.detail ? data.detail : `${res.status} ${res.statusText}`, res.status, typeof data === "object" && data ? data : {});
  return data as T;
}
const cell = (q: ViewQuestion, row?: string) => (row ? q.rows.find((r) => r.row === row)?.answer ?? null : q.answer);
const linkIo = (session: string): QuestionnaireIo => ({
  mode: "link", viewKey: (id) => ["link", "view", id], freshKey: (id) => ["link", "view", id],
  put: (id, q, value, row) => linkApi(`/cases/${id}/people/${q.subjectId}/answers/${q.fact}`, { method: "PUT", json: { value, expectedId: cell(q, row)?.id ?? null, ...(row ? { row } : {}) } }, session),
  addRow: (id, subject, group) => linkApi(`/cases/${id}/people/${subject}/rows`, { method: "POST", json: { group } }, session),
  removeRow: (id, subject, row) => linkApi(`/cases/${id}/people/${subject}/rows/${row}`, { method: "DELETE" }, session),
  noneApply: (id, subject, group, body) => linkApi(`/cases/${id}/people/${subject}/groups/${group}/none-apply`, { method: "PUT", json: body }, session),
});

export function LinkApp() {
  // The token leaves the address bar at once (history, screenshots, a shared screen); it is kept for this tab only.
  const [token] = React.useState(() => {
    const m = /#t=([A-Za-z0-9_-]{43})/.exec(window.location.hash);
    if (m) { store.set(TOKEN, m[1]); store.del(SESSION); window.history.replaceState(null, "", "/link"); return m[1]; }
    return store.get(TOKEN);
  });
  const [stored, setStored] = React.useState<Stored | null>(readStored);
  const [ended, setEnded] = React.useState<string | null>(null);
  React.useEffect(() => { const m = document.createElement("meta"); m.name = "referrer"; m.content = "no-referrer"; document.head.appendChild(m); return () => m.remove(); }, []);
  const qc = useQueryClient();
  const end = React.useCallback((words: string | null) => { store.del(SESSION); setStored(null); setEnded(words); qc.removeQueries({ queryKey: ["link"] }); }, [qc]);
  return (
    <Frame area="outside" title="Your questions"
      controls={<span className="flex shrink-0 items-center gap-2">
        <ProposedStandIn today="you prove the email is yours with a link and a 6-digit code; staff and the principal are simulated people" later="the team's sign-in for adult family members (Release 2)" />
        {stored ? <Button size="sm" variant="ghost" aria-label="Sign out" onClick={async () => { await linkApi("/end", { method: "POST" }, stored.session).catch(() => null); end("You signed out. To come back, ask whoever sent your link to send it again."); }}><LogOut aria-hidden /><span className="hidden sm:inline">Sign out</span></Button> : null}
      </span>}>
      {stored ? <SessionArea stored={stored} onEnded={end} /> : <CodeStep token={token} ended={ended} onSession={(s) => { const v = { session: s.session, case_id: s.case_id, subject_id: s.subject_id }; store.set(SESSION, JSON.stringify(v)); setEnded(null); setStored(v); }} />}
    </Frame>
  );
}

/** "Check it's you": Send me a code (a button, never on opening), then the code, forgiving spaces and dashes. */
function CodeStep({ token, ended, onSession }: { token: string | null; ended: string | null; onSession: (s: LinkSession) => void }) {
  const opened = useQuery<LinkOpened>({ queryKey: ["link", "open", token], queryFn: () => linkApi<LinkOpened>("/open", { method: "POST", json: { token } }), enabled: !!token, retry: false, staleTime: Infinity });
  // Break m6: the code step survives a reload (this tab only), so a reload never costs another code.
  const [sent, setSent] = React.useState<string | null>(() => (token && store.get(SENT) === token ? "restored" : null));
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [dead, setDead] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"send" | "check" | null>(null);
  const summary = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (error) summary.current?.focus(); }, [error]);
  if (!token) return <Shell><Notice tone="danger" title="This link does not work">{LINK_WORDS.unknown}</Notice></Shell>;
  if (opened.isLoading) return <Shell><Skeleton className="h-8 w-2/3" /><Skeleton className="mt-3 h-24 w-full" /></Shell>;
  const why = dead ?? (opened.data?.state === "dead" ? opened.data.why : opened.isError ? (opened.error as Error).message : null);
  if (why) return <Shell><h1 className="text-2xl font-semibold">This link no longer works</h1><Notice tone="warn" className="mt-3">{why}</Notice></Shell>;
  const masked = opened.data?.state === "live" ? opened.data.email_masked : "";
  const fail = (e: unknown) => { if (e instanceof ApiError && (e.status === 410 || e.status === 404)) setDead(e.message); else setError(e instanceof ApiError ? e.field("code") ?? e.message : (e as Error).message); };
  async function send() { setBusy("send"); setError(null); try { await linkApi("/code/send", { method: "POST", json: { token } }); if (token) store.set(SENT, token); setSent(new Date().toISOString()); setCode(""); } catch (e) { fail(e); } setBusy(null); }
  async function check() {
    if (!code.trim()) { setError("Enter the 6-digit code from the email."); return; }
    setBusy("check"); setError(null);
    try { onSession(await linkApi<LinkSession>("/code", { method: "POST", json: { token, code } })); } catch (e) { fail(e); }
    setBusy(null);
  }
  return (
    <Shell>
      {ended ? <Notice tone="info" className="mb-4">{ended}</Notice> : null}
      {error ? <div ref={summary} tabIndex={-1} role="alert" aria-labelledby="code-problem" className="mb-4 rounded-lg border-2 border-danger bg-surface-raised p-4 outline-none"><p id="code-problem" className="font-semibold text-text-danger">There is a problem</p><a className="mt-1 block text-sm font-medium text-text-danger underline" href="#link-code" onClick={(e) => { e.preventDefault(); document.getElementById("link-code")?.focus(); }}>{error}</a></div> : null}
      <h1 className="text-2xl font-semibold">Check it's you</h1>
      {!sent ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-text-muted">We will send a 6-digit code to <b className="text-text">{masked}</b>. Opening this page sent nothing.</p>
          <Button className="h-11 w-full text-base" busy={busy === "send"} onClick={() => void send()}><Mail aria-hidden />Send me a code</Button>
        </div>
      ) : (
        <form className="mt-3 space-y-4" onSubmit={(e) => { e.preventDefault(); void check(); }} noValidate>
          <p className="text-sm text-text-muted">We sent a 6-digit code to <b className="text-text">{masked}</b>.</p>
          <Field label="Code (required)" hint={`The code works for ${LINK_RULES.codeMinutes} minutes. You can type it with spaces.`} error={error}>
            <Input id="link-code" inputMode="numeric" autoComplete="one-time-code" className="h-11 text-base tracking-widest" value={code} onChange={(e) => { setCode(e.target.value); setError(null); }} />
          </Field>
          <Button type="submit" className="h-11 w-full text-base" busy={busy === "check"}>Continue<ArrowRight aria-hidden /></Button>
          <Button type="button" variant="link" className="h-11 w-full" disabled={!!busy} onClick={() => void send()}>Send a new code</Button>
        </form>
      )}
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-xl">{children}</div>;

/** A live session: the consent card once (BR-6), then the person's own parts. A session that ended says why. */
function SessionArea({ stored, onEnded }: { stored: Stored; onEnded: (words: string | null) => void }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["link", "me", stored.session], queryFn: () => linkApi<{ person: string; case_reference: string | null; consent_needed: boolean; consent: string; consent_note: string }>("/me", {}, stored.session), retry: false });
  React.useEffect(() => { if (me.error instanceof ApiError && me.error.status === 401) onEnded(me.error.message); }, [me.error, onEnded]);
  const [busy, setBusy] = React.useState(false);
  if (me.isLoading || me.isError) return <Shell>{me.isError ? <Notice tone="danger" title="Your questions could not be loaded">{(me.error as Error).message}</Notice> : <><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-3 h-32 w-full" /></>}</Shell>;
  if (me.data!.consent_needed) return (
    <Shell>
      <h1 className="text-2xl font-semibold">Before you start</h1>
      <div className="mt-3 rounded-xl border border-border bg-surface-raised p-4">
        <p className="flex items-start gap-2 text-sm"><Lock className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />{me.data!.consent}</p>
        <Pill tone="warn" className="mt-3" title="The consent wording waits for counsel's review (SA-1B-269 rule 10).">{me.data!.consent_note}</Pill>
      </div>
      <Button className="mt-4 h-11 w-full text-base" busy={busy} onClick={async () => { setBusy(true); try { await linkApi("/consent", { method: "POST" }, stored.session); await qc.invalidateQueries({ queryKey: ["link", "me"] }); } catch (e) { if (e instanceof ApiError && e.status === 401) onEnded(e.message); } setBusy(false); }}>Continue to my questions<ArrowRight aria-hidden /></Button>
    </Shell>
  );
  return <LinkQuestionnaire stored={stored} onEnded={onEnded} />;
}

type LinkView = Omit<View, "case"> & { case: { id: string; reference: string; people: View["case"]["people"] }; own: string };
function LinkQuestionnaire({ stored, onEnded }: { stored: Stored; onEnded: (words: string | null) => void }) {
  const view = useQuery({ queryKey: ["link", "view", stored.case_id], queryFn: () => linkApi<LinkView>(`/cases/${stored.case_id}/people/${stored.subject_id}/questionnaire`, {}, stored.session), retry: false });
  React.useEffect(() => { if (view.error instanceof ApiError && view.error.status === 401) onEnded(view.error.message); }, [view.error, onEnded]);
  const io = React.useMemo(() => linkIo(stored.session), [stored.session]);
  const [params] = useSearchParams();
  if (view.isLoading) return <Shell><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-3 h-32 w-full" /></Shell>;
  if (view.isError) return <Shell><Notice tone="danger" title="Your questions could not be loaded">{(view.error as Error).message}</Notice></Shell>;
  const v = view.data!;
  // Their own parts, with the parts about their own parents and brothers and sisters (`<own>/parent_1`, B128, B155).
  const mine = (id: string) => id === v.own || id.startsWith(`${v.own}/`);
  const own = { ...v, sections: v.sections.filter((s) => mine(s.subjectId)), case: { ...v.case, case_number: "", status: "", combination_id: "", client: "", pin: { release_version: 0, sha256: "", pinned_at: "", revision: 0 } } } as View;
  const shared = v.sections.filter((s) => !mine(s.subjectId));
  return (
    <QuestionnaireIoContext.Provider value={io}>
      <Sqr view={byPerson(own)} />
      {params.get("part") === null && shared.length ? (
        <section aria-labelledby="shared" className="mx-auto mt-6 max-w-xl">
          <h2 id="shared" className="text-base font-semibold">About the application</h2>
          <p className="text-[13px] text-text-muted">Shared answers, read-only here. The person who started the application or the firm changes them.</p>
          <dl className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface-raised">
            {shared.flatMap((s) => s.questions.filter((q) => !q.hidden && !q.group)).map((q) => (
              <div key={`${q.subjectId}|${q.fact}`} className="flex flex-wrap gap-x-3 px-4 py-2 text-sm"><dt className="min-w-0 flex-1 text-text-muted">{q.label}</dt><dd className="font-medium [overflow-wrap:anywhere]">{q.answer ? shown(q, q.answer.value) || "—" : "Not answered yet"}</dd></div>
            ))}
          </dl>
        </section>
      ) : null}
    </QuestionnaireIoContext.Provider>
  );
}

/** The demo inbox by address (stand-in SI-20, Demo workspace only): what an email would carry, for the walk. */
export function DemoInbox() {
  const [params, setParams] = useSearchParams();
  const [address, setAddress] = React.useState(params.get("address") ?? "");
  const shownAddress = params.get("address");
  const q = useQuery({ queryKey: ["inbox", shownAddress], queryFn: () => api<{ messages: { id: string; kind: string; subject: string; body: string; link: string | null; created_at: string }[] }>(`/demo/inbox?address=${encodeURIComponent(shownAddress!)}`), enabled: !!shownAddress, retry: false, refetchInterval: 5000 });
  return (
    <Frame area="outside" title="Demo inbox">
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">Demo inbox</h1><ProposedStandIn today="links and codes go to this demo inbox by address (Demo workspace only)" later="the team's email sending (AG-10)" /></div>
      <p className="mt-1 text-sm text-text-muted">Demo chrome, not for porting: it stands in for a person's email.</p>
      <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setParams({ address }); }}>
        <Field className="flex-1" label="Email address"><Input type="email" value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Button type="submit" variant="secondary">Open</Button>
      </form>
      <ul className="mt-4 space-y-3">
        {q.isError ? <Notice tone="danger">{(q.error as Error).message}</Notice> : null}
        {shownAddress && q.data && !q.data.messages.length ? <Notice>No messages for this address.</Notice> : null}
        {(q.data?.messages ?? []).map((m) => (
          <li key={m.id} className="rounded-xl border border-border bg-surface-raised p-4 text-sm">
            <p className="font-semibold">{m.subject}</p>
            <p className="text-xs text-text-muted">{new Date(m.created_at).toLocaleString("en-GB")}</p>
            <p className="mt-2 whitespace-pre-line">{m.body.replace(/\/link#t=[A-Za-z0-9_-]{43}/, "(link below)")}</p>
            {m.link ? <a className="mt-2 inline-flex items-center gap-1 font-medium text-text-link underline" href={m.link}>Open your link<ArrowRight className="size-4" aria-hidden /></a> : null}
          </li>
        ))}
      </ul>
    </div>
    </Frame>
  );
}
