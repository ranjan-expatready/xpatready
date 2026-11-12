// The extension's Manifest V3 (F2d; plan §7 security model, XT-7; P-90). Two builds: production names the exact portal
// hosts only (Sample until the immigration expert confirms the hosts from a real session);
// development names the local Sample portal screens instead. The API origin is built into the panel (CORS). The checks in productionProblems() run on
// every production build and in tests/check_forms_f2d.ts: they fail the dev manifest by design.
import { EXTENSION_PUBLIC_KEY } from "../contracts/extension.ts";
import HOSTS from "./hosts.json" with { type: "json" };

export type Manifest = { manifest_version: 3; name: string; version: string; description: string; key: string; minimum_chrome_version: string; permissions: string[]; host_permissions: string[];
  side_panel: { default_path: string }; background: { service_worker: string; type: "module" }; action: { default_title: string };
  content_scripts: { matches: string[]; js: string[]; run_at: string; all_frames: boolean; world: "ISOLATED" }[]; content_security_policy: { extension_pages: string }; icons?: Record<string, string> };

/** The development build's one portal, from what the founder pastes (P-98, G3): a bare host as the address bar shows
 *  it (apr.example.gc.ca → https://apr.example.gc.ca), an https origin, or the local Sample screens over http. Never a
 *  wildcard, a path, a port on a real host, or a guessed parent domain: the extension runs on that one host only. */
export function devPortalOrigin(input: string | undefined): string {
  const raw = (input ?? "").trim().replace(/\/+$/, "");
  const bad = (why: string): never => { throw new Error(`The portal "${raw}" cannot be used: ${why}. Paste only the host from the address bar, for example apr.example.gc.ca.`); };
  if (!raw) bad("no portal host was given");
  if (/[*<>\s]/.test(raw)) bad("a wildcard or a space would let the extension run on other sites");
  const u = (() => { try { return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; } })();
  if (!u || !u.hostname) return bad("it is not a web address");
  if (u.username || u.password || u.search || u.hash || u.pathname !== "/") bad("give the host only, without a path, a query or a sign-in");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
  if (local) { if (u.protocol !== "http:" && u.protocol !== "https:") bad("a local portal is served over http"); return u.origin; }
  if (u.protocol !== "https:") bad("a real portal is reached over https only");
  if (u.port) bad("a real portal has no port in its address");
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(u.hostname)) bad("it is not a full host name such as apr.example.gc.ca");
  return u.origin;
}

export function manifest(mode: "production" | "development", local?: { api: string; portal: string }): Manifest {
  const portal = mode === "production" ? HOSTS.portal_hosts.map((h) => `https://${h}/*`) : [`${devPortalOrigin(local!.portal)}/*`];
  return {
    manifest_version: 3, name: mode === "production" ? "ExpatReady portal assistant" : "ExpatReady portal assistant (development)", version: "0.1.0",
    description: "Captures a portal screen's structure and fills one screen from a case's confirmed facts, on a click. Never submits.",
    key: EXTENSION_PUBLIC_KEY, minimum_chrome_version: "116",
    // The API is not a host permission: the panel reaches it as a cross-origin client, so every request carries the
    // extension's Origin, which the API checks against the token's extension (CORS for that origin only, XT-3).
    permissions: ["sidePanel", "storage"], host_permissions: portal,
    side_panel: { default_path: "panel.html" }, background: { service_worker: "background.js", type: "module" }, action: { default_title: "Open the ExpatReady side panel" },
    // The isolated world, top frame only, on the portal hosts only; no externally_connectable (no page can message it).
    content_scripts: [{ matches: portal, js: ["content.js"], run_at: "document_idle", all_frames: false, world: "ISOLATED" }],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" },
  };
}

/** XT-7: what a production manifest must never hold. */
export function productionProblems(m: Manifest): string[] {
  const out: string[] = [];
  const hosts = [...m.host_permissions, ...m.content_scripts.flatMap((c) => c.matches)];
  if (JSON.stringify([...m.permissions].sort()) !== JSON.stringify(["sidePanel", "storage"])) out.push(`permissions are ${m.permissions.join(", ")}, not exactly sidePanel and storage`);
  const listed = new Set(HOSTS.portal_hosts.map((h) => `https://${h}/*`));
  for (const h of hosts) {
    // P-98: the production build runs on the listed portal hosts only; a host added by hand or by a build argument fails.
    if (!listed.has(h)) out.push(`${h} is not one of the portal hosts listed in extension/hosts.json`);
    if (/<all_urls>|^\*:|^https?:\/\/\*/.test(h) || /:\/\/[^/]*\*/.test(h)) out.push(`${h} is a wildcard host`);
    if (/localhost|127\.0\.0\.1|\[::1\]/.test(h)) out.push(`${h} is a local host`);
    if (!h.startsWith("https://")) out.push(`${h} is not https`);
  }
  if ("externally_connectable" in m) out.push("externally_connectable lets web pages message the extension");
  if (/unsafe-eval|unsafe-inline|wasm-unsafe-eval/.test(m.content_security_policy.extension_pages)) out.push("the content security policy allows eval or inline script");
  if (m.content_scripts.some((c) => c.all_frames || c.world !== "ISOLATED")) out.push("the content script runs outside the top frame's isolated world");
  if (!m.key) out.push("no key: the extension id would not be fixed");
  return out;
}
