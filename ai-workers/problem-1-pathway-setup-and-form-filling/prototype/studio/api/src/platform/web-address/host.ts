// PF-25 (AG-4-16, AG-4-17, AG01-1): host routing. Every request is read by its Host before anything else answers it
// (before the static files and the single-page app's catch-all in main.ts):
//   * ExpatReady's own hosts (localhost, 127.0.0.1, app.expatready.com, …) → untouched, as before PF-25;
//   * a serving firm's address → only the public routes registered for it (`registerPublicPath`), with
//     `req.publicFirm = { firmId }` (the id only, AG-4-17); every other path there → the one plain not-found, so the
//     studio's own pages, files and API are never served on a firm's address (review M1). PF-25 registers
//     /api/public/site; FO-3w registers its booking pages and their files, FO-2 its web form, the portal its own;
//   * an address the firm gave up less than 90 days ago → 301 to the same path and query on its current address;
//   * any other host under a firm suffix → the one plain not-found, the same bytes and status a public route gives for
//     an unknown slug (`sendPublicNotFound`, which FO-3's routes use for theirs).
// Only the Host header is read: X-Forwarded-Host and any firm named in the path, query or headers are ignored, so firm
// A's address never serves firm B's page. Wildcard DNS and the certificate are PF-8's.
import { readHost } from "./rules.ts";
import type { WebAddresses } from "./service.ts";

type Req = { method: string; path: string; originalUrl?: string; url: string; rawHeaders?: string[]; protocol?: string; headers: Record<string, string | string[] | undefined>; publicFirm?: { firmId: string } };
type Res = { status(code: number): Res; setHeader(k: string, v: string): unknown; end(body?: string): unknown };
type Next = (err?: unknown) => void;

const PUBLIC_PATHS: RegExp[] = [/^\/api\/public\/site$/];
/** Adds a path a firm's address serves (a whole-path pattern, anchored both ends). Called once at start-up by the
 *  module that owns the route (FO-3w's booking pages, FO-2's form, the portal). */
export function registerPublicPath(pattern: RegExp): void {
  if (!pattern.source.startsWith("^") || !pattern.source.endsWith("$")) throw new Error(`PF-25: a public path must be anchored at both ends (${pattern})`);
  if (!PUBLIC_PATHS.some((p) => p.source === pattern.source)) PUBLIC_PATHS.push(pattern);
}
export const isPublicPath = (path: string) => PUBLIC_PATHS.some((re) => re.test(path));

const NOT_FOUND_TEXT = "This page is not available.";
/** The one not-found of the public side (AG-4-17 r3): an unknown address, an unknown or inactive slug, a firm that is not
 *  serving all give these exact bytes and 404. A path under /api/ gets the JSON form, any other the page. */
export const PUBLIC_NOT_FOUND_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Not available</title></head><body style="font-family:system-ui,sans-serif;margin:4rem auto;max-width:32rem;padding:0 1rem;color:#1f2937"><h1 style="font-size:1.5rem">${NOT_FOUND_TEXT}</h1><p>Check the address, or contact the firm that sent it to you.</p></body></html>`;
export const PUBLIC_NOT_FOUND_JSON = JSON.stringify({ type: "https://expatready.local/problems/not-found", title: "Not found", status: 404, detail: NOT_FOUND_TEXT });

export function sendPublicNotFound(req: Pick<Req, "path">, res: Res): void {
  const api = req.path.startsWith("/api/");
  res.status(404);
  res.setHeader("Content-Type", api ? "application/problem+json; charset=utf-8" : "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(api ? PUBLIC_NOT_FOUND_JSON : PUBLIC_NOT_FOUND_HTML);
}

const first = (h: string | string[] | undefined) => (Array.isArray(h) ? h[0] : h);
/** In the path (never the query: break M1): a dot segment, an encoded dot, slash or backslash, a backslash, a `;`
 *  parameter or an empty segment — never a public route's path, so never a way around the list. */
const ODD_PATH = /\/\.\.?(\/|$)|%2e|%2f|%5c|\\|;|\/\//i;

/** The request's own path and query, whatever form the request line took (an absolute URI keeps only its path and
 *  query: break m2). */
function pathAndQuery(req: Req): { pathname: string; tail: string } {
  const raw = req.originalUrl ?? req.url;
  const q = raw.indexOf("?");
  let pathname = q < 0 ? raw : raw.slice(0, q);
  const search = q < 0 ? "" : raw.slice(q);
  if (!pathname.startsWith("/")) { try { pathname = new URL(raw).pathname; } catch { pathname = "/"; } }
  return { pathname, tail: `${pathname}${search}` };
}

/** The middleware. A failed lookup is a 500 through `next(err)`, never a page of the wrong firm. */
export function webAddressHost(addresses: Pick<WebAddresses, "resolveHost">) {
  return (req: Req, res: Res, next: Next) => {
    req.publicFirm = undefined;
    // Two Host headers, either naming a firm's address: refused, never routed by the first (break N6).
    const hosts = (req.rawHeaders ?? []).filter((_, i, a) => i % 2 === 1 && a[i - 1].toLowerCase() === "host");
    if (hosts.length > 1 && hosts.some((h) => readHost(h).kind !== "main")) return sendPublicNotFound(req, res);
    addresses.resolveHost(first(req.headers.host)).then((r) => {
      if (r.kind === "main") return next();
      if (r.kind === "firm") {
        // An absolute-form request line (never sent by a browser) is refused on a firm's address: the app routes its raw
        // target, which this check could not see as the same path (break N1).
        const { pathname } = pathAndQuery(req);
        if (!(req.originalUrl ?? req.url).startsWith("/") || ODD_PATH.test(pathname) || !isPublicPath(pathname)) return sendPublicNotFound(req, res);
        req.publicFirm = { firmId: r.firmId };
        return next();
      }
      if (r.kind === "redirect") {
        // Behind ExpatReady's load balancer the public suffix is always https; a person's own machine keeps its scheme.
        const scheme = r.suffix === "localhost" ? (req.protocol === "https" ? "https" : "http") : "https";
        res.status(301);
        res.setHeader("Location", `${scheme}://${r.address}.${r.suffix}${r.port ? `:${r.port}` : ""}${pathAndQuery(req).tail}`);
        res.setHeader("Cache-Control", "no-store");
        return res.end();
      }
      return sendPublicNotFound(req, res);
    }).catch(next);
  };
}

/** The firm a public route serves, or null (the route was reached on ExpatReady's own host). */
export function publicFirmOf(req: { publicFirm?: { firmId: string } }): string | null {
  return req.publicFirm?.firmId ?? null;
}
