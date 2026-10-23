// QA-4 (Major): every page address and every file download of the Studio must work wherever the copy lives. Today the
// server sends web/dist/index.html (res.sendFile) and stored files (res.download) with Express's default "ignore
// dot-folders" rule, so a copy under a dot-folder (every lane copy is under .claude/worktrees/) answers 404 "Not found"
// for /, /new, /c/<id>… (only /index.html opens) and for every source or filled-PDF download.
// FAILS today in any lane copy (passes in the main copy, whose path has no dot-folder); PASSES once main.ts sends the page
// regardless of the folder name. Run against a server started by tools/isolated.sh from the copy under test.
//   tsx studio/tests/qa/check_qa4_page_address.ts <port> [database, to also try one stored source file]
import { execFileSync } from "node:child_process";
const PORT = Number(process.argv[2] ?? 4470), DB = process.argv[3];
let fail = 0;
for (const path of ["/", "/new", "/releases", "/library/fields", "/c/00000000-0000-0000-0000-000000000000"]) {
  const r = await fetch(`http://localhost:${PORT}${path}`, { headers: { accept: "text/html" } });
  const t = await r.text();
  const good = r.status === 200 && /<div id="root">|<script type="module"/.test(t);
  if (!good) fail++;
  console.log(`${good ? "PASS" : "FAIL"}  QA-4: ${path} opens the app — ${r.status} ${t.slice(0, 80).replace(/\s+/g, " ")}`);
}
if (DB) {
  const id = execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", "select id from source_attachment order by created_at limit 1"], { encoding: "utf8" }).trim();
  const r = await fetch(`http://localhost:${PORT}/api/attachments/${id}/file`);
  const good = r.status === 200 && /pdf|html/.test(r.headers.get("content-type") ?? "");
  if (!good) fail++;
  console.log(`${good ? "PASS" : "FAIL"}  QA-4: a stored source file downloads — ${r.status} ${r.headers.get("content-type")}`);
}
const api = await fetch(`http://localhost:${PORT}/api/no-such-thing`);
console.log(`${api.status === 404 ? "PASS" : "FAIL"}  control: an unknown /api/ address still answers 404 (${api.status})`);
process.exit(fail || api.status !== 404 ? 1 : 0);
