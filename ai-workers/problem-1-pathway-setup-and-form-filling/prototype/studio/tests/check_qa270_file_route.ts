// QA-270, file half (C4.6): Preview's filled PDF, GET /artifacts/:id/file, is read like Preview that made it. The studio's
// people download it; nobody, an unknown name, a client and any firm's staff are refused (401, 403) and get no PDF bytes.
// On main bf12209f1 the route was open: 200 and the PDF to each of them. No browser, no AI, US$0.
//   zsh studio/tools/isolated.sh qa270_file 4444 start && tsx studio/tests/check_qa270_file_route.ts 4444 xr_studio_qa270_file
import { execFileSync } from "node:child_process";

const PORT = Number(process.argv[2]), DB = process.argv[3];
if (!PORT || !/^xr_studio_(?!demo)/.test(DB ?? "")) { console.error("usage: <port> <isolated database>"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${!c && detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`); };
const sql = (q: string) => execFileSync("psql", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "-d", DB, "-Atc", q], { encoding: "utf8" }).trim();
const api = (path: string, init: RequestInit = {}) => fetch(`http://localhost:${PORT}/api${path}`, init);
/** The file as a person opens it: status, whether PDF bytes came back, and the refusal's words. */
async function open(id: string, who: string | null) {
  const r = await api(`/artifacts/${id}/file`, who === null ? {} : { headers: { "x-actor": who } });
  const b = Buffer.from(await r.arrayBuffer());
  let detail = ""; try { detail = JSON.parse(b.toString("utf8")).detail ?? ""; } catch { /* PDF bytes */ }
  return { status: r.status, pdf: b.subarray(0, 5).toString("latin1") === "%PDF-", bytes: b.length, attachment: /attachment/.test(r.headers.get("content-disposition") ?? ""), detail };
}

await api("/demo/reset", { method: "POST", headers: { "content-type": "application/json", "x-actor": "user-A" }, body: JSON.stringify({ confirm: "RESET" }) });
const load = await api("/demo/load", { method: "POST", headers: { "x-actor": "user-A" } });
if (load.status >= 300) { console.error("STOP  the fixture did not load", load.status); process.exit(2); }
const wp = sql("select id from combination where combination_key = 'wp.family' and retired_at is null limit 1");
const filled = await (await api(`/combinations/${wp}/fill`, { method: "POST", headers: { "content-type": "application/json", "x-actor": "user-A" }, body: JSON.stringify({ form: "IMM 1295", person: "principal", mode: "draft" }) })).json();
const art = filled?.artifact_id as string | undefined;
if (!art) { console.error("STOP  the author's fill saved no artifact", JSON.stringify(filled).slice(0, 300)); process.exit(2); }

for (const [who, label] of [["user-A", "the configuration author, who filled it"], ["user-C", "the content reviewer"], ["user-B", "the approver"]] as const) {
  const r = await open(art, who);
  ok(`QA-270 pass (C4.6): ${label} downloads the filled PDF (200, PDF bytes, as a download)`, r.status === 200 && r.pdf && r.attachment && r.bytes > 100000, r);
}
for (const [who, label, want] of [[null, "no person", 401], ["nobody", "an unknown name", 401], ["user-P", "a client", 403], ["user-Q", "another client", 403], ["user-S", "another firm's representative", 403], ["user-R", "the firm's own representative", 403], ["user-T", "the firm's second representative", 403], ["user-O", "a case officer", 403]] as const) {
  const r = await open(art, who);
  ok(`QA-270 fail (C4.6): ${label} is refused the filled PDF by its file address (${want}), no PDF bytes, in words`, r.status === want && !r.pdf && r.detail.length > 10, r);
}
// The refusal is the guard's, not a missing file: an unknown id is still 404 for the author, and refused before any read for a client.
const unknown = "00000000-0000-4000-8000-000000000000";
ok("QA-270 control: an unknown filled PDF is 404 for the author", (await open(unknown, "user-A")).status === 404);
ok("QA-270 fail: a client cannot tell a real filled PDF from an unknown one (403 both)", (await open(unknown, "user-P")).status === 403);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
