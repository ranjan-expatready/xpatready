// PF-25 (AG-4-16, AG-4-17, AG01-1): host routing. Every request is read by its Host before anything else answers it
// (before the static files and the single-page app's catch-all in main.ts):
//   * ExpatReady's own hosts (localhost, 127.0.0.1, app.expatready.com, …) → untouched, as before PF-25;
//   * a serving firm's address → its public paths only, with `req.publicFirm = { firmId }` (the id only, AG-4-17); any
//     other path there → the one plain not-found (the studio's own pages and API are never served on a firm's address);
//   * an address the firm gave up less than 90 days ago → 301 to the same path on its current address;
//   * any other address under a firm suffix → the one plain not-found, the same bytes and status a public page gives for
//     an unknown slug (`sendPublicNotFound`, which FO-3's pages use for theirs).
// Only the Host header is read: X-Forwarded-Host and any firm named in the path, query or headers are ignored, so firm
// A's address never serves firm B's page. Wildcard DNS and the certificate are PF-8's.
import type { WebAddresses } from "./service.ts";

type Req = { method: string; path: string; originalUrl?: string; url: string; protocol?: string; headers: Record<string, string | string[] | undefined>; publicFirm?: { firmId: string } };
type Res = { status(code: number): Res; setHeader(k: string, v: string): unknown; end(body?: string): unknown };
type Next = (err?: unknown) => void;

/** The paths a firm's address serves (FO-3's booking pages, the public API, the built page's own files). FO-2's web form
 *  and the portal add theirs here when they land. */
export const PUBLIC_PATHS: readonly RegExp[] = [/^\/book(\/|$)/, /^\/api\/public\//, /^\/(assets|brand|fonts)\//];
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

/** A dot segment, an encoded dot or slash, or a backslash: never a public page's path, so never a way around the list. */
const ODD_PATH = /\/\.\.?(\/|$|\?)|%2e|%2f|%5c|\\/i;
const first = (h: string | string[] | undefined) => (Array.isArray(h) ? h[0] : h);

/** The middleware. Never throws past itself: a failed lookup is a 500 through `next(err)`, never a page of the wrong firm. */
export function webAddressHost(addresses: Pick<WebAddresses, "resolveHost">) {
  return (req: Req, res: Res, next: Next) => {
    req.publicFirm = undefined;
    addresses.resolveHost(first(req.headers.host)).then((r) => {
      if (r.kind === "main") return next();
      if (r.kind === "firm") {
        if (!isPublicPath(req.path) || ODD_PATH.test(req.originalUrl ?? req.url)) return sendPublicNotFound(req, res);
        req.publicFirm = { firmId: r.firmId };
        return next();
      }
      if (r.kind === "redirect") {
        // Behind ExpatReady's load balancer the public suffix is always https; a person's own machine keeps its scheme.
        const scheme = r.suffix === "localhost" ? (req.protocol === "https" ? "https" : "http") : "https";
        res.status(301);
        res.setHeader("Location", `${scheme}://${r.address}.${r.suffix}${r.port ? `:${r.port}` : ""}${req.originalUrl ?? req.url}`);
        res.setHeader("Cache-Control", "no-store");
        return res.end();
      }
      return sendPublicNotFound(req, res);
    }, next);
  };
}

/** The firm a public route serves, or the plain not-found (the route was reached on ExpatReady's own host). */
export function publicFirmOf(req: { publicFirm?: { firmId: string } }): string | null {
  return req.publicFirm?.firmId ?? null;
}
