// The panel's calls to the ExpatReady API (F2d; M7): the extension's own token only, kept in session storage (memory,
// gone when the browser closes; content scripts cannot read it at its default access level). Never a cookie, never
// x-actor. A 401 means the session ended: the panel goes back to "Connect".
declare const __XR_API__: string;
export const API = __XR_API__;
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
export const token = {
  async get(): Promise<string | null> { const r = await chrome.storage.session.get("token"); return (r.token as string | undefined) ?? null; },
  async set(t: string | null) { if (t) await chrome.storage.session.set({ token: t }); else await chrome.storage.session.remove("token"); },
};
export async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const t = auth ? await token.get() : null;
  const res = await fetch(`${API}/api/extension${path}`, { method, headers: { ...(t ? { authorization: `Bearer ${t}` } : {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), credentials: "omit" });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new ApiError(typeof data === "object" && data ? (data.detail ?? data.message ?? `Error ${res.status}`) : `The ExpatReady server answered ${res.status}.`, res.status);
  return data as T;
}
