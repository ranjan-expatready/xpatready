// Calls to the studio API. The simulated persona travels as x-actor on every request; the server decides what that
// persona may do (duties) and refuses the rest with a plain reason, which screens show as feedback.
import { QueryClient, useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import * as React from "react";

let actor = (() => { try { return localStorage.getItem("xr-actor") ?? "user-A"; } catch { return "user-A"; } })();
const listeners = new Set<() => void>();
export const getActor = () => actor;
export function setActor(a: string) { actor = a; try { localStorage.setItem("xr-actor", a); } catch { /* private window */ } listeners.forEach((l) => l()); }
export function useActorId() { const [, force] = React.useState(0); React.useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []); return actor; }

export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { "x-actor": actor, ...(init.headers as any) };
  let body = init.body;
  if (init.json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(init.json); }
  const res = await fetch(`/api${path}`, { ...init, headers, body });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new ApiError(typeof data === "object" && data?.message ? (Array.isArray(data.message) ? data.message.join("; ") : data.message) : `${res.status} ${res.statusText}`, res.status);
  return data as T;
}

export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 2_000, refetchOnWindowFocus: false } } });
export function useApi<T = any>(key: unknown[], path: string | null, opts: Partial<UseQueryOptions<T>> = {}) {
  return useQuery<T>({ queryKey: key, queryFn: () => api<T>(path!), enabled: !!path, ...opts });
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
