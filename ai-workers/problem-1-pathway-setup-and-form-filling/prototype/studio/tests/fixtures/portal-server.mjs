// Scaffolding (P-33; F2 plan §6b): a local stand-in for the IRCC portal, serving the F1 Sample portal screens
// (tests/fixtures/portal) and the fill-only screens (tests/fixtures/portal-fill) over HTTP on 127.0.0.1, so the browser
// extension's content script runs on them as on a portal page (the dev build's only extra host). Not a real IRCC
// screen; nothing here is ever deployed. GET /<file>.html serves a screen; anything else is 404.
//   node studio/tests/fixtures/portal-server.mjs [port=4459]
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PORT = Number(process.argv[2] ?? 4459);
const DIRS = [join(import.meta.dirname, "portal"), join(import.meta.dirname, "portal-fill")];
createServer((req, res) => {
  const name = basename(decodeURIComponent((req.url ?? "/").split("?")[0]));
  const file = /^[A-Za-z0-9._-]+\.html$/.test(name) ? DIRS.map((d) => join(d, name)).find((p) => existsSync(p)) : undefined;
  if (req.method !== "GET" || !file) { res.writeHead(404, { "content-type": "text/plain" }).end("not a Sample portal screen"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log(`Sample portal screens on http://127.0.0.1:${PORT}/`));
