// The extension's Manifest V3 (F2d; plan §7 security model, XT-7; P-90). Two builds: production names the exact portal
// hosts only (Sample until the immigration expert confirms the hosts from a real session);
// development names the local Sample portal screens instead. The API origin is built into the panel (CORS). The checks in productionProblems() run on
// every production build and in tests/check_forms_f2d.ts: they fail the dev manifest by design.
import { EXTENSION_PUBLIC_KEY } from "../contracts/extension.ts";
import HOSTS from "./hosts.json" with { type: "json" };

export type Manifest = { manifest_version: 3; name: string; version: string; description: string; key: string; minimum_chrome_version: string; permissions: string[]; host_permissions: string[];
  side_panel: { default_path: string }; background: { service_worker: string; type: "module" }; action: { default_title: string };
  content_scripts: { matches: string[]; js: string[]; run_at: string; all_frames: boolean; world: "ISOLATED" }[]; content_security_policy: { extension_pages: string }; icons?: Record<string, string> };

export function manifest(mode: "production" | "development", local?: { api: string; portal: string }): Manifest {
  const portal = mode === "production" ? HOSTS.portal_hosts.map((h) => `https://${h}/*`) : [`${local!.portal}/*`];
  return {
    manifest_version: 3, name: mode === "production" ? "ExpatReady portal assistant" : "ExpatReady portal assistant (development, Sample)", version: "0.1.0",
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
  for (const h of hosts) {
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
