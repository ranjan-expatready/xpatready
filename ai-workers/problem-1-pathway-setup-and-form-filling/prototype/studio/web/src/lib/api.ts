// Calls to the studio API. The simulated persona travels as x-actor on every request; the server decides what that
// persona may do (duties) and refuses the rest with a plain reason, which screens show as feedback.
import { QueryClient, useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import * as React from "react";
import type { SessionView } from "../../../contracts/programs";

// BK-4a (concept §3, P-484): `actor` is the one "current person" of the app. Only setActor changes it; the frame's notice
// names every change ("Now: <name> (simulated)"). A browser with no stored person acts as the Configuration author, as
// before BK-4 (P-484 (3): the sign-in page is a page, not a gate); `chosen` tells that apart from a person picked on purpose.
const stored = (() => { try { return localStorage.getItem("xr-actor"); } catch { return null; } })();
let actor = stored ?? "user-A";
let chosen = stored !== null;
const listeners = new Set<() => void>();
export const getActor = () => actor;
/** Was the current person chosen (signed in, picked, handed over), not the default of a browser with no stored person? */
export const personChosen = () => chosen;
export function setActor(a: string) { actor = a; chosen = true; try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } listeners.forEach((l) => l()); }
/** BK-4a: hear every change of person (the frame's one notice); returns the way to stop listening. */
export function onActorChange(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function useActorId() { const [, force] = React.useState(0); React.useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []); return actor; }

/** A refused request, from the server's Problem Details: a plain reason, and field errors to show on their fields. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly problem: { title?: string; errors?: { field: string; message: string }[]; existing?: any; existingId?: string } = {}) { super(message); }
  field(name: string) { return this.problem.errors?.find((e) => e.field === name)?.message ?? null; }
}
export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "x-actor": actor, ...(init.headers as any) };
  let body = init.body;
  if (init.json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(init.json); }
  const res = await fetch(`/api${path}`, { ...init, headers, body });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new ApiError(typeof data === "object" && (data?.detail || data?.message) ? (data.detail ?? (Array.isArray(data.message) ? data.message.join("; ") : data.message)) : `${res.status} ${res.statusText}`, res.status, typeof data === "object" && data ? data : {});
  return data as T;
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 2_000, refetchOnWindowFocus: false } } });
export function useApi<T = any>(key: unknown[], path: string | null, opts: Partial<UseQueryOptions<T>> = {}) {
  return useQuery<T>({ queryKey: key, queryFn: () => api<T>(path!), enabled: !!path, ...opts });
}
/** Who the simulated person is, for pages that show author-only things (QA-22; break m1, m3): `known` once the session
 *  answered or failed, or after 4 s without an answer, so a hung request never hides the page; `failed` when it is known
 *  but there is no person (an error or an empty answer), so pages use neutral words, not the non-author's. */
export function useSessionView() {
  const actorId = useActorId();
  const session = useApi<SessionView>(["session", actorId], "/session");
  const [late, setLate] = React.useState(false);
  React.useEffect(() => { setLate(false); const t = setTimeout(() => setLate(true), 4000); return () => clearTimeout(t); }, [actorId]);
  const known = session.isError || !session.isPending || late;
  const failed = known && !session.data?.actor;
  return { session, known, failed, canAuthor: (session.data?.actor?.duties ?? []).includes("author") };
}
export function useAction<V = any, R = any>(fn: (v: V) => Promise<R>, opts: { success?: string | ((r: R) => string); invalidate?: unknown[][]; onDone?: (r: R) => void } = {}) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<R, Error, V>({
    mutationFn: fn,
    onSuccess: (r) => { for (const k of opts.invalidate ?? [[]]) void qc.invalidateQueries({ queryKey: k }); if (opts.success) toast.push({ tone: "ok", text: typeof opts.success === "function" ? opts.success(r) : opts.success }); opts.onDone?.(r); },
    onError: (e) => toast.push({ tone: "danger", text: e.message }),
  });
}

// ------------------------------------------------------------------ toasts
type Toast = { id: number; tone: "ok" | "danger" | "info"; text: string };
const ToastCtx = React.createContext<{ push: (t: Omit<Toast, "id">) => void; list: Toast[]; drop: (id: number) => void } | null>(null);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<Toast[]>([]);
  const drop = React.useCallback((id: number) => setList((l) => l.filter((t) => t.id !== id)), []);
  const push = React.useCallback((t: Omit<Toast, "id">) => { const id = Date.now() + Math.random(); setList((l) => [...l.slice(-3), { ...t, id }]); setTimeout(() => drop(id), t.tone === "danger" ? 9000 : 4500); }, [drop]);
  return React.createElement(ToastCtx.Provider, { value: { push, list, drop } }, children);
}
export const useToast = () => React.useContext(ToastCtx)!;
