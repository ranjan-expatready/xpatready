// QA scaffolding only (QA-4): the API refuses to send web/dist/index.html when the copy lives under a dot-folder
// (every lane worktree is under .claude/worktrees/), so every page address except /index.html answers 404.
// This proxy forwards everything to the real server unchanged and, only when the server answers 404 to a page address
// (a GET outside /api/ that asks for HTML), sends web/dist/index.html instead — what api/src/main.ts intends to do.
// It lets the qa lane walk and replay the exact commit while QA-4 is open; it is never part of the product.
//   node studio/tests/qa/page-proxy.mjs <listen port> <server port>
import { readFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

const [listen, upstream] = process.argv.slice(2).map(Number);
const INDEX = join(import.meta.dirname, "..", "..", "web", "dist", "index.html");
let fallbacks = 0;

http.createServer((req, res) => {
  const up = http.request({ host: "127.0.0.1", port: upstream, method: req.method, path: req.url, headers: req.headers }, (r) => {
    const page = req.method === "GET" && !req.url.startsWith("/api/") && (req.headers.accept ?? "").includes("text/html");
    if (r.statusCode === 404 && page) {
      r.resume(); fallbacks++;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-qa-page-proxy": String(fallbacks) });
      return res.end(readFileSync(INDEX));
    }
    res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502, { "content-type": "text/plain" }); res.end(`qa page proxy: server on ${upstream} not reachable (${e.message})`); });
  req.pipe(up);
}).listen(listen, "127.0.0.1", () => console.log(`qa page proxy http://localhost:${listen} → ${upstream}`));
