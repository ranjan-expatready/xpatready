// Scaffolding (P-33; F2 plan §6b): a local stand-in for the IRCC portal, serving the F1 Sample portal screens
// (tests/fixtures/portal), the fill-only screens (tests/fixtures/portal-fill) and the Sample APR-style screens
// (tests/fixtures/portal-apr, P-98) on 127.0.0.1, so the browser extension's content script runs on them as on a portal
// page (the dev build's only extra host). Not a real IRCC or APR screen; nothing here is ever deployed. GET /<file>.html
// serves a screen; GET /apr-long-sNN.html (01–60) a generated screen of a long application; anything else is 404.
// With --tls <key> <cert> it serves https, so a test can map a made-up portal host to it (the founder's real APR host
// is given to the development build the same way, G3).
//   node studio/tests/fixtures/portal-server.mjs [port=4459] [--tls key.pem cert.pem]
import { createServer } from "node:http";
import { createServer as createTlsServer } from "node:https";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

const PORT = Number(process.argv[2] ?? 4459);
const tls = process.argv.indexOf("--tls");
const DIRS = [join(import.meta.dirname, "portal"), join(import.meta.dirname, "portal-fill"), join(import.meta.dirname, "portal-apr")];
/** Screen NN of a long Sample application (P-98 hardening: 30+ screens): three questions, ids unique to the screen. */
const long = (n) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Additional details ${n} - APR Portal</title></head><body><main><h1>Additional details, part ${n}</h1><form>`
  + `<label for="p${n}Place">Place visited (part ${n})</label><input type="text" id="p${n}Place" name="p${n}Place">`
  + `<label for="p${n}Reason">Reason for the visit (part ${n})</label><select id="p${n}Reason" name="p${n}Reason"><option value="">Select one</option><option value="WORK">Work</option><option value="STUDY">Study</option><option value="VISIT">Visit</option></select>`
  + `<fieldset><legend>Did you stay longer than six months? (part ${n})</legend><input type="radio" id="p${n}LongY" name="p${n}Long" value="Y"><label for="p${n}LongY">Yes</label><input type="radio" id="p${n}LongN" name="p${n}Long" value="N"><label for="p${n}LongN">No</label></fieldset>`
  + `<button type="submit">Save and continue</button></form></main></body></html>`;
const handle = (req, res) => {
  const name = basename(decodeURIComponent((req.url ?? "/").split("?")[0]));
  const nn = /^apr-long-s(\d\d)\.html$/.exec(name);
  if (req.method === "GET" && nn && Number(nn[1]) >= 1 && Number(nn[1]) <= 60) { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(long(nn[1])); return; }
  const file = /^[A-Za-z0-9._-]+\.html$/.test(name) ? DIRS.map((d) => join(d, name)).find((p) => existsSync(p)) : undefined;
  if (req.method !== "GET" || !file) { res.writeHead(404, { "content-type": "text/plain" }).end("not a Sample portal screen"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }).end(readFileSync(file));
};
(tls > 0 ? createTlsServer({ key: readFileSync(process.argv[tls + 1]), cert: readFileSync(process.argv[tls + 2]) }, handle) : createServer(handle))
  .listen(PORT, "127.0.0.1", () => console.log(`Sample portal screens on ${tls > 0 ? "https" : "http"}://127.0.0.1:${PORT}/`));
