// QA-1 (Critical, C5.2): the shared Release page must not bypass submission and the expert's sign-off.
// Replayable check on its own isolated copy (qa lane: ports 4470–4479, databases xr_studio_qa_*). No browser, no model call.
// FAILS today (main d75602b2: POST /pack/release publishes a draft nobody submitted and records its author as submitter);
// PASSES once the shared release refuses unsubmitted or unsigned changes, as the per-combination release already does.
//   tsx studio/tests/qa/check_qa1_release_bypass.ts [port=4472]        (starts a fresh copy itself)
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4472), NAME = "qa_qa1", DB = `xr_studio_${NAME}`;
const STUDIO = join(import.meta.dirname, "..", "..");
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};

(async () => {
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "start", "ANTHROPIC_BASE_URL=http://127.0.0.1:9/qa-no-paid-ai"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  let r = await call("POST", "/demo/load");
  ok("setup: sample inputs load", r.status < 300, r.body?.seconds);
  const rows = (await call("GET", "/catalogue?pathway=INDIVIDUAL&filter=all")).body.rows as any[];
  const wp = rows.find((x) => x.nodeKey === "individual.work_permits.employer_specific.with_lmia");
  ok("setup: the work-permit row is Live (Release 1)", wp?.status === "READY" && wp?.release?.pack === 1, wp?.statusText);
  const types = (await call("GET", "/library/document-types")).body as any[];
  const have = new Set(((await call("GET", `/combinations/${wp.combinationId}/config?mode=draft`)).body.snapshot?.document_requirements ?? []).map((q: any) => q.document_type_key));
  const type = types.find((t) => !have.has(t.documentTypeKey)) ?? types[0];
  r = await call("POST", `/combinations/${wp.combinationId}/requirements`, { documentTypeKey: type.documentTypeKey, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant" });
  ok("setup: the author adds a document requirement to the draft (a change that needs the expert's sign-off)", r.status < 300, r.body?.detail ?? r.body?.lineageKey);
  const review = (await call("GET", `/combinations/${wp.combinationId}/review`)).body;
  const smeChanges = (review.draft?.changes ?? []).filter((c: any) => c.needs_sme).length;
  ok("setup: the draft holds at least one change that needs the SME duty, and nothing is submitted", smeChanges > 0 && review.submission?.status !== "SUBMITTED", { smeChanges, submission: review.submission?.status ?? null });

  r = await call("POST", `/combinations/${wp.combinationId}/approve`, undefined, "user-B");
  ok("control: the combination's own release refuses (nothing submitted)", r.status >= 400 && /submitted/i.test(r.body.detail ?? ""), r.body.detail);

  const d = (await call("GET", "/draft")).body;
  r = await call("POST", "/pack/release", { expectedChanges: d.changes }, "user-B");
  ok("QA-1: the shared release refuses a draft that was never submitted and whose expert changes are unsigned", r.status >= 400, { status: r.status, detail: r.body?.detail, pack: r.body?.pack });
  const rel = sql(`select coalesce(string_agg(version || ':' || coalesce(submitter_id,'-'), ','), '') from config_release where combination_id='${wp.combinationId}' and version > 1`);
  ok("QA-1: no new release of the row exists, and nobody is recorded as having submitted it", rel === "", rel || "none");

  console.log(`\n${pass} pass, ${fail} fail`);
  execFileSync("zsh", [join(STUDIO, "tools", "isolated.sh"), NAME, String(PORT), "stop"]);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
