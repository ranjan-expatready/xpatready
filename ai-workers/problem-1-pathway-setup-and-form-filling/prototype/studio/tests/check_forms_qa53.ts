// QA-53 (STANDARDS §6 deny by default; C11.10): one shared guard on every Studio configuration read. Every GET route the
// API declares is found in the code itself (so a new route cannot slip past this check), then asked by nobody, an
// unknown name, the case officer and a client: a configuration read answers 401 to nobody and an unknown name, 403 to
// case people, and still answers the configuration author. The few reads that are not configuration reads are a
// reviewed list here: the runtime (case people's own routes, untouched), the releases Open a case lists and the activity
// feed (case reads), who-am-I and the three file links the browser opens without the person header (open). A route
// marked in the code but not on this list, or the other way round, fails the check. US$0, no model call.
//   zsh studio/tools/isolated.sh forms_qa53 4459 start && tsx studio/tests/check_forms_qa53.ts 4459 xr_studio_forms_qa53
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.argv[2] ?? 4459), DB = process.argv[3] ?? "xr_studio_forms_qa53";
const API = join(import.meta.dirname, "..", "api", "src");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const status = async (path: string, actor: string | null) => (await fetch(`http://localhost:${PORT}${path}`, { headers: actor ? { "x-actor": actor } : {} })).status;
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

/** Every GET route in api/src: its full path, and whether the code marks it (on the route or on its controller). */
function routes() {
  const out: { path: string; mark: "case" | "open" | null; file: string }[] = [];
  for (const f of readdirSync(API).filter((x) => x.endsWith(".ts"))) {
    const lines = readFileSync(join(API, f), "utf8").split("\n");
    let prefix = "", classMark: "case" | "open" | null = null, pending: "case" | "open" | null = null;
    for (const l of lines) {
      if (l.trim() === "@CaseRead()") { pending = "case"; continue; } // a controller-level mark, on its own line
      const c = /^@Controller\("([^"]*)"\)/.exec(l.trim());
      if (c) { prefix = c[1]; classMark = pending; pending = null; continue; }
      for (const g of l.matchAll(/(@CaseRead\(\)\s*|@OpenRead\([^)]*\)\s*)?@Get\("([^"]*)"\)/g)) {
        const mark = g[1] ? (g[1].startsWith("@CaseRead") ? "case" : "open") : classMark;
        out.push({ path: `/${prefix}/${g[2]}`.replace(/\/+/g, "/").replace(/\/$/, ""), mark, file: f });
      }
    }
  }
  return out;
}
const REVIEWED: Record<string, "case" | "open"> = {
  "/api/session": "open", "/api/attachments/:id/file": "open", "/api/intake/held/:id/file": "open", // QA-270: /api/artifacts/:id/file is a configuration read now
  "/api/releases": "case", "/api/activity": "case",
};

(async () => {
  const r = await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" } });
  ok("setup: the demo loads", r.status < 300, r.status);
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);
  const fill = (p: string) => p.replace(/:id\b/g, p.startsWith("/api/combinations/") ? vv : "00000000-0000-4000-8000-000000000000").replace(/:key\b/g, "individual.visitors").replace(/:code\b/g, encodeURIComponent("IMM 5257"));

  const all = routes();
  const declared = readdirSync(API).filter((x) => x.endsWith(".ts")).reduce((n, f) => n + (readFileSync(join(API, f), "utf8").match(/@Get\("/g) ?? []).length, 0);
  ok("QA-53: the check reads every GET route the code declares (none left unseen)", all.length === declared && declared > 40, { found: all.length, declared });
  const marked = all.filter((x) => x.mark && !x.path.startsWith("/api/runtime/")).map((x) => `${x.path} ${x.mark}`).sort();
  const reviewed = Object.entries(REVIEWED).map(([p, m]) => `${p} ${m}`).sort();
  ok("QA-53: the reads that are not configuration reads are exactly the reviewed list (runtime aside): a new exception fails here until reviewed", JSON.stringify(marked) === JSON.stringify(reviewed), { marked, reviewed });
  ok("QA-53: every runtime route is a case read (the guard leaves case people's own routes untouched)", all.filter((x) => x.path.startsWith("/api/runtime/")).every((x) => x.mark === "case") && all.some((x) => x.path.startsWith("/api/runtime/")));

  // Pass and fail per configuration read: nobody 401, an unknown name 401, officer 403, client 403; the author is answered.
  const guarded = all.filter((x) => !x.mark);
  const wrong: string[] = [];
  for (const g of guarded) {
    const path = fill(g.path) + (g.path === "/api/catalogue" || g.path === "/api/path-options" ? "?pathway=INDIVIDUAL" : g.path === "/api/structure" ? "?pathwayType=INDIVIDUAL" : "");
    const s = { none: await status(path, null), unknown: await status(path, "user-Z"), officer: await status(path, "user-O"), client: await status(path, "user-P"), author: await status(path, "user-A") };
    if (s.none !== 401 || s.unknown !== 401 || s.officer !== 403 || s.client !== 403 || s.author === 401 || s.author === 403) wrong.push(`${g.path} ${JSON.stringify(s)}`);
  }
  ok(`QA-53 fail: every configuration read (${guarded.length}) refuses nobody and an unknown name (401) and case people (403)`, guarded.length > 30 && wrong.length === 0, wrong);
  const qa = ["/api/combinations/:id", "/api/combinations/:id/config", "/api/combinations/:id/review", "/api/combinations/:id/preview", "/api/combinations/:id/attachments", "/api/library/fields", "/api/library/forms", "/api/library/sections", "/api/library/document-types", "/api/library/changes", "/api/masters", "/api/official-library", "/api/intake/held", "/api/ai/batches", "/api/ledger", "/api/review-queue", "/api/draft"];
  const notOk: string[] = [];
  for (const q of qa) { const s = await status(fill(q), "user-A"); if (s !== 200) notOk.push(`${q} ${s}`); }
  ok("QA-53 pass: the 17 reads QA named still answer the configuration author (200)", notOk.length === 0 && qa.every((q) => guarded.some((g) => g.path === q)), notOk);
  const refusal = await fetch(`http://localhost:${PORT}/api/ledger`, { headers: { "x-actor": "user-O" } });
  const body = await refusal.json() as { title?: string; detail?: string };
  ok("QA-53: the refusal is a Problem Details in plain words (the AI spend ledger, as the case officer)", refusal.status === 403 && /works on cases/.test(body.detail ?? "") && /problem/.test(refusal.headers.get("content-type") ?? "json"), body);
  ok("QA-53: a request with no person is told to choose one (401, in words)", /Choose a simulated person/.test(((await (await fetch(`http://localhost:${PORT}/api/ledger`)).json()) as { detail?: string }).detail ?? ""));

  // The reads that stay as they were
  const caseReads = { officerCases: await status("/api/runtime/cases", "user-O"), officerReleases: await status("/api/releases", "user-O"), clientCases: await fetch(`http://localhost:${PORT}/api/runtime/cases`, { headers: { "x-actor": "user-P" } }).then(async (x) => ({ status: x.status, detail: String(((await x.json()) as { detail?: unknown }).detail ?? "") })) };
  ok("QA-53 pass: case people's own reads are untouched (the officer lists cases and the releases Open a case offers; the runtime keeps its own rule for a client)", caseReads.officerCases === 200 && caseReads.officerReleases === 200 && !/works on cases/.test(caseReads.clientCases.detail), caseReads); // a client's refusal there is the runtime's own rule, never the guard's
  ok("QA-53 pass: who-am-I answers a case person too (the runtime asks it first)", await status("/api/session", "user-O") === 200 && await status("/api/session", "user-P") === 200);
  ok("QA-53 pass: the activity feed keeps its own rule (officer yes, client no)", await status("/api/activity", "user-O") === 200 && await status("/api/activity", "user-P") === 403);
  ok("QA-53: a file link the browser opens needs no person header (an unknown file is 404, never 401)", await status("/api/attachments/00000000-0000-4000-8000-000000000000/file", null) === 404 || await status("/api/attachments/00000000-0000-4000-8000-000000000000/file", null) === 400);
  ok("QA-53: writes keep their own duty checks (a client cannot load the demo: 403)", (await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-P" } })).status === 403);

  // QA-65 (qa after-merge on #69): a case read still needs a known person, and a configuration read made by POST (a plan or
  // a check) is guarded like a GET. The POST reads are found in the code (@ConfigRead), and every other write names its person.
  const post = async (path: string, actor: string | null, body: unknown) => (await fetch(`http://localhost:${PORT}${path}`, { method: "POST", headers: { "content-type": "application/json", ...(actor ? { "x-actor": actor } : {}) }, body: JSON.stringify(body) })).status;
  const configPosts: string[] = [], unnamed: string[] = [];
  for (const f of readdirSync(API).filter((x) => x.endsWith(".ts"))) {
    const text = readFileSync(join(API, f), "utf8"), lines = text.split("\n"), prefix = /@Controller\("([^"]*)"\)/.exec(text)?.[1] ?? "";
    lines.forEach((l, i) => {
      for (const m of l.matchAll(/(@ConfigRead\(\)\s*)?@(Post|Put|Patch|Delete)\("([^"]*)"\)/g)) {
        const path = `/${prefix}/${m[3]}`.replace(/\/+/g, "/");
        if (m[1]) configPosts.push(path);
        else if (!/x-actor|actorOf|readerOf/.test(lines.slice(i, i + 3).join(" "))) unnamed.push(`${f}: ${path}`);
      }
    });
  }
  ok("QA-65: the configuration reads made by POST are exactly the reviewed three (finder plan, AI plan, condition check)", JSON.stringify(configPosts.sort()) === JSON.stringify(["/api/ai/plan", "/api/combinations/:id/forms/find/plan", "/api/conditions/check"]), configPosts);
  ok("QA-65: every other write names its person (none answers nobody by default)", unnamed.length === 0, unnamed);
  const bodies: Record<string, unknown> = { "/api/ai/plan": { scope: vv, mode: "stub" }, "/api/combinations/:id/forms/find/plan": { mode: "rules" }, "/api/conditions/check": { condition: "", answers: {} } };
  const wrongPost: string[] = [];
  for (const cp of configPosts) {
    const path = fill(cp), b = bodies[cp];
    const s = { none: await post(path, null, b), unknown: await post(path, "user-Z", b), officer: await post(path, "user-O", b), client: await post(path, "user-P", b), author: await post(path, "user-A", b) };
    if (s.none !== 401 || s.unknown !== 401 || s.officer !== 403 || s.client !== 403 || s.author === 401 || s.author === 403) wrongPost.push(`${cp} ${JSON.stringify(s)}`);
  }
  ok("QA-65 fail: each POST configuration read refuses nobody and an unknown name (401) and case people (403); pass: the author is answered", configPosts.length === 3 && wrongPost.length === 0, wrongPost);
  ok("QA-65 fail: the releases list (a case read) refuses nobody and an unknown name (401)", await status("/api/releases", null) === 401 && await status("/api/releases", "user-Z") === 401);
  ok("QA-65 pass: the releases list still answers the case officer and the author (200)", await status("/api/releases", "user-O") === 200 && await status("/api/releases", "user-A") === 200);
  ok("QA-65 fail: a runtime read (case read) refuses nobody (401); pass: the officer is answered", await status("/api/runtime/cases", null) === 401 && await status("/api/runtime/cases", "user-O") === 200);
  ok("QA-65: the chain is closed: nobody gets no attachment ids from the AI plan (401)", await post("/api/ai/plan", null, { scope: vv, mode: "stub" }) === 401);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${(e as Error).stack}`); process.exit(1); });
