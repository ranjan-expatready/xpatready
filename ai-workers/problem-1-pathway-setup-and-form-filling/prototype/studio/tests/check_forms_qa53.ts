// QA-53 (STANDARDS §6 deny by default; C11.10): one shared guard on every Studio configuration read. Every GET route the
// API declares is found in the code itself (so a new route cannot slip past this check), then asked by nobody, an
// unknown name, the case officer and a client: a configuration read answers 401 to nobody and an unknown name, 403 to
// case people, and still answers the configuration author. The few reads that are not configuration reads are a
// reviewed list here: the runtime (case people's own routes, untouched), the releases Open a case lists and the activity
// feed (case reads), who-am-I and the three file links the browser opens without the person header (open). A route
// marked in the code but not on this list, or the other way round, fails the check. C6.16: the routes with a guard of
// their own (an adult's own link, /api/link/*, and the demo inbox) are a second reviewed list, OWN_GUARD; for each, its
// own guard is asked here (never data to nobody or to a simulated person). US$0, no model call.
//   zsh studio/tools/isolated.sh forms_qa53 4459 start && tsx studio/tests/check_forms_qa53.ts 4459 xr_studio_forms_qa53
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { planted, tsFiles } from "./lib/ts-files.ts";
import { PLATFORM_PATH } from "../api/src/platform/identity/keys.ts";

const PORT = Number(process.argv[2] ?? 4459), DB = process.argv[3] ?? "xr_studio_forms_qa53";
const API = join(import.meta.dirname, "..", "api", "src");
let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 400)}` : ""}`); };
const status = async (path: string, actor: string | null) => (await fetch(`http://localhost:${PORT}${path}`, { headers: actor ? { "x-actor": actor } : {} })).status;
// QA-53k: the firm copy starts and stops without blocking the event loop. execFileSync held the loop about 5.6 s while the
// copy takes to start, so the main copy's idle keep-alive socket was closed by the server unseen and the next request
// on it failed with "SocketError: other side closed" (3 hits in 6 h, #2069). spawn lets undici see the close in time.
const runAsync = (cmd: string, args: string[], timeout: number) => new Promise<void>((resolve, reject) => {
  const c = spawn(cmd, args, { stdio: "ignore", timeout });
  c.on("error", reject);
  c.on("exit", (code, signal) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.slice(1, 4).join(" ")} ended with ${code ?? signal}`))));
});
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8" }).trim();

/** Every GET route in api/src (B120: its subfolders too): its full path, and whether the code marks it (on the route or
 *  on its controller). */
function routes(dir = API) {
  const out: { path: string; mark: "case" | "open" | null; file: string; keys: boolean }[] = [];
  for (const f of tsFiles(dir)) {
    const lines = readFileSync(join(dir, f), "utf8").split("\n");
    let prefix = "", classMark: "case" | "open" | null = null, pending: "case" | "open" | null = null;
    for (const l of lines) {
      if (l.trim() === "@CaseRead()") { pending = "case"; continue; } // a controller-level mark, on its own line
      if (/^@OpenRead\(.*\)$/.test(l.trim())) { pending = "open"; continue; } // C6.16: a controller-level open mark
      const c = /^@Controller\("([^"]*)"\)/.exec(l.trim());
      if (c) { prefix = c[1]; classMark = pending; pending = null; continue; }
      for (const g of l.matchAll(/(@CaseRead\(\)\s*|@OpenRead\([^)]*\)\s*)?@Get\("([^"]*)"\)/g)) {
        const mark = g[1] ? (g[1].startsWith("@CaseRead") ? "case" : "open") : classMark;
        out.push({ path: `/${prefix}/${g[2]}`.replace(/\/+/g, "/").replace(/\/$/, ""), mark, file: f, keys: /@PermissionKeys\(/.test(l) });
      }
    }
  }
  return out;
}
const REVIEWED: Record<string, "case" | "open"> = {
  "/api/session": "open", "/api/attachments/:id/file": "open", "/api/intake/held/:id/file": "open", // QA-270: /api/artifacts/:id/file is a configuration read now
  "/api/releases": "case", "/api/activity": "case",
  "/api/health": "open", // M1: is this copy well (database, disk, fill queue, commit); no case or person data
  "/api/public/forms/:token": "open", // FO-2: a firm's public enquiry form (contracts §0.6): its words and a fresh stamp only
  "/api/public/embed/form.js": "open", // FO-4b: the embed script a firm's own site loads (one fixed file, no firm or person data)
  "/api/public/invitations/:token": "open", // PF-4b: an invitation's state (its 256-bit token is the key)
  "/api/public/plans": "open", // PF-5: the public pricing page (contracts §0.6): plans, prices and terms, no firm or person data
  "/api/public/unsubscribe/:token": "open", // PF-19b part 2: the one-click unsubscribe page (its sealed token is the key; changes nothing)
};
/** FO-2: public doors that take a write from anyone (contracts §0.6): no person to name; an unknown token answers 404. */
const PUBLIC_WRITES = ["/api/public/forms/:token/submissions", "/api/public/invitations/:token/accept", "/api/public/messages/ses-notices", "/api/public/unsubscribe/:token"];   // PF-19b part 2: one-click unsubscribe (unknown token 404) and SNS notices (signature checked first, else 400; asked in check_pf19b2_ses.ts)   // PF-4b: accept answers 410 to an unknown token (asked in its own suite)
/** PF-5 (contracts §0.6): the public sign-up doors name nobody by design (no account exists yet); each is asked below:
 *  an empty body is refused (400) or the door is shut on a copy without sign-up set up (503), never a 2xx. */
const PUBLIC_DOOR_WRITES = ["/api/public/signup", "/api/public/signup/verify", "/api/hooks/stripe"];   // PF-5 part 2: Stripe's webhook (signature first: 400, or 503 not set up)
/** C6.16 (B138): reads open to the shared guard because they have a guard of their own, each asked below.
 *  /api/link/*: an adult's own link (stand-in SI-21): a Bearer session from the link's code, x-actor refused (400),
 *  no session 401 (person-link.ts LinkOnlyGuard and PersonLinks.signed). /api/demo/inbox: the email stand-in SI-20,
 *  the demo workspace only (404 elsewhere) and never for a client persona (403). PF-19b: /api/demo/platform-inbox, the
 *  platform's local email adapter (demo-inbox.ts), the same guard. */
const OWN_GUARD: Record<string, "link" | "inbox"> = {
  "/api/link/me": "link", "/api/link/cases/:id/people/:subject/questionnaire": "link", "/api/demo/inbox": "inbox",
  "/api/demo/platform-inbox": "inbox",
};
/** PF-4t (Lead 50 on #1775, Lead B's pattern): routes under /api/platform/ and /api/front-office/ belong to the platform
 *  guard (PF-4: a staff session, never x-actor; core.ts leaves these paths to it). They leave the configuration-read
 *  (QA-53) and person-naming (QA-65) rules and are asked instead: no session 401, x-actor alone (author, officer, client)
 *  401, never data. The exemption is exactly PF-4's PLATFORM_PATH, pinned here so a widening fails. */
const PLATFORM_SOURCE = "^\\/api\\/(platform|front-office)(\\/|$)", PLATFORM_FLAGS = "i";
const exactPlatformPath = (re: RegExp) => re.source === PLATFORM_SOURCE && re.flags === PLATFORM_FLAGS;
const isPlatform = (path: string) => PLATFORM_PATH.test(path);
/** PF-4f m2: the sign-in doors (@StaffSignIn: no session yet) are a reviewed list, each with the exact status it answers
 *  here (m1). This copy starts without PLATFORM_IDENTITY (the usage line), so the local stand-in's door refuses every
 *  caller with 403 LOCAL_SIGN_IN_OFF (service.ts localSignIn). A new door fails the list check until reviewed. */
const DOORS: Record<string, number> = { "POST /api/platform/session/local": 403, "POST /api/platform/session/callback": 401 };   // PF-4b: no code → 401
/** A platform answer that gives something away: not 401 (a sign-in door: not its exact status in DOORS, so a 2xx, 404
 *  or 5xx is caught), or a body with more than a problem's own fields. */
const PROBLEM_FIELDS = new Set(["type", "title", "status", "detail", "message", "code"]);
const platformWrong = (r: { status: number; body: unknown }, door?: number) => r.status !== (door ?? 401)
  || (typeof r.body === "object" && r.body !== null && Object.keys(r.body).some((k) => !PROBLEM_FIELDS.has(k)));
/** C6.16: the writes of the adult's own link, named by their Bearer session (never x-actor), each asked below. */
const OWN_GUARD_WRITES = ["/api/link/open", "/api/link/code/send", "/api/link/code", "/api/link/consent", "/api/link/end",
  "/api/link/cases/:id/people/:subject/answers/:field", "/api/link/cases/:id/people/:subject/rows", "/api/link/cases/:id/people/:subject/rows/:row",
  "/api/link/cases/:id/people/:subject/groups/:group/none-apply", "/api/link/cases/:id/people/:subject/:relation/answers/:field", "/api/link/cases/:id/people/:subject/:relation/rows",
  "/api/link/cases/:id/people/:subject/:relation/rows/:row", "/api/link/cases/:id/people/:subject/:relation/groups/:group/none-apply"];

(async () => {
  const r = await fetch(`http://localhost:${PORT}/api/demo/load`, { method: "POST", headers: { "x-actor": "user-A" } });
  ok("setup: the demo loads", r.status < 300, r.status);
  const vv = sql(`select id from combination where label = 'Visitor visa' limit 1`);
  const fill = (p: string) => p.replace(/:id\b/g, p.startsWith("/api/combinations/") ? vv : "00000000-0000-4000-8000-000000000000").replace(/:key\b/g, "individual.visitors").replace(/:code\b/g, encodeURIComponent("IMM 5257"));

  const all = routes();
  const declared = tsFiles(API).reduce((n, f) => n + (readFileSync(join(API, f), "utf8").match(/@Get\("/g) ?? []).length, 0);
  ok("QA-53: the check reads every GET route the code declares (none left unseen)", all.length === declared && declared > 40, { found: all.length, declared });
  const marked = all.filter((x) => x.mark && !x.path.startsWith("/api/runtime/") && !(x.path in OWN_GUARD && x.mark === "open")).map((x) => `${x.path} ${x.mark}`).sort();
  const reviewed = Object.entries(REVIEWED).map(([p, m]) => `${p} ${m}`).sort();
  ok("C6.16: the reads with a guard of their own are exactly OWN_GUARD, each marked open in the code (a new one fails here until reviewed)", JSON.stringify(all.filter((x) => x.path in OWN_GUARD).map((x) => `${x.path} ${x.mark}`).sort()) === JSON.stringify(Object.keys(OWN_GUARD).map((p) => `${p} open`).sort()), all.filter((x) => x.path.startsWith("/api/link/") || x.path.startsWith("/api/demo/")));
  ok("QA-53: the reads that are not configuration reads are exactly the reviewed list (runtime aside): a new exception fails here until reviewed", JSON.stringify(marked) === JSON.stringify(reviewed), { marked, reviewed });
  ok("QA-53: every runtime route is a case read (the guard leaves case people's own routes untouched)", all.filter((x) => x.path.startsWith("/api/runtime/")).every((x) => x.mark === "case") && all.some((x) => x.path.startsWith("/api/runtime/")));

  // Pass and fail per configuration read: nobody 401, an unknown name 401, officer 403, client 403; the author is answered.
  const guarded = all.filter((x) => !x.mark && !isPlatform(x.path));

  // C6.16: each OWN_GUARD read's own guard. The link's reads: nobody 401 (no session); a simulated person, known or not,
  // 400 (x-actor refused); a made-up session 401; never data. The inbox: a client persona 403; an address that is not
  // one 400; outside the demo workspace 404 (a second copy started here with STUDIO_WORKSPACE_KEY=firm).
  const linkStatus = async (path: string, actor: string | null, bearer: string | null) => (await fetch(`http://localhost:${PORT}${path}`, { headers: { ...(actor ? { "x-actor": actor } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) } })).status;
  const wrongOwn: string[] = [];
  for (const [p, kind] of Object.entries(OWN_GUARD)) {
    const path = fill(p).replace(/:subject\b/g, "00000000-0000-4000-8000-000000000000");
    if (kind === "link") {
      const s = { none: await linkStatus(path, null, null), madeUp: await linkStatus(path, null, "A".repeat(43)), officer: await linkStatus(path, "user-O", null), client: await linkStatus(path, "user-P", "A".repeat(43)), author: await linkStatus(path, "user-A", null) };
      if (s.none !== 401 || s.madeUp !== 401 || s.officer !== 400 || s.client !== 400 || s.author !== 400) wrongOwn.push(`${p} ${JSON.stringify(s)}`);
    } else {
      const s = { client: await linkStatus(`${path}?address=x%40example.com`, "user-P", null), notAnAddress: await linkStatus(`${path}?address=nobody`, null, null), bearer: await linkStatus(`${path}?address=x%40example.com`, null, "A".repeat(43)) };
      if (s.client !== 403 || s.notAnAddress !== 400 || s.bearer !== 403) wrongOwn.push(`${p} ${JSON.stringify(s)}`);
    }
  }
  ok(`C6.16 fail: each read with a guard of its own (${Object.keys(OWN_GUARD).length}) refuses by that guard: the link's nobody or a made-up session 401, any simulated person 400; the inbox a client 403, a Bearer 403`, wrongOwn.length === 0, wrongOwn);
  const firm = await (async () => {
    const name = `${DB.replace(/^xr_studio_/, "")}_firm`.slice(0, 40), port = PORT + 1;
    try {
      await runAsync("zsh", [join(import.meta.dirname, "..", "tools", "isolated.sh"), name, String(port), "start", "--ttl", "10", "STUDIO_WORKSPACE_KEY=firm"], 180_000);
      return { inbox: (await fetch(`http://localhost:${port}/api/demo/inbox?address=x%40example.com`)).status, platformInbox: (await fetch(`http://localhost:${port}/api/demo/platform-inbox?address=x%40example.com`)).status };
    } catch (e) { return { error: (e as Error).message.split("\n")[0] }; } finally { await runAsync("zsh", [join(import.meta.dirname, "..", "tools", "isolated.sh"), name, String(port), "stop"], 120_000).catch(() => { /* reported above */ }); }
  })();
  ok("C6.16 fail: the demo inboxes (the case side's and PF-19b's platform inbox) are not found outside the demo workspace (a firm workspace answers 404)", firm.inbox === 404 && firm.platformInbox === 404, firm);
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
  // B120: api/src's subfolders too.
  const writes = (dir: string) => {
    const configPosts: string[] = [], unnamed: string[] = [], ownWrites: string[] = [], publicWrites: string[] = [], doorWrites: string[] = [], platformWrites: { path: string; method: string; door: boolean }[] = [];
    for (const f of tsFiles(dir)) {
      const text = readFileSync(join(dir, f), "utf8"), lines = text.split("\n");
      // The controller each line belongs to (C6.16: person-link.ts holds three, so the file's first is not every route's).
      let prefix = "";
      lines.forEach((l, i) => {
        prefix = /^@Controller\("([^"]*)"\)/.exec(l.trim())?.[1] ?? prefix;
        for (const m of l.matchAll(/(@ConfigRead\(\)\s*)?@(Post|Put|Patch|Delete)\("([^"]*)"\)/g)) {
          const path = `/${prefix}/${m[3]}`.replace(/\/+/g, "/");
          if (m[1]) configPosts.push(path);
          else if (OWN_GUARD_WRITES.includes(path.replace(/\/$/, ""))) ownWrites.push(path.replace(/\/$/, ""));
          else if (PUBLIC_DOOR_WRITES.includes(path.replace(/\/$/, ""))) doorWrites.push(path.replace(/\/$/, ""));
          else if (PUBLIC_WRITES.includes(path)) publicWrites.push(path);
          else if (isPlatform(path)) platformWrites.push({ path: path.replace(/\/$/, ""), method: m[2].toUpperCase(), door: /@StaffSignIn\(/.test(l) });
          // CS-C1a (#1818): a case write behind PF-4's guard names its person by the staff session (staffOf), not x-actor.
          else if (!/x-actor|actorOf|readerOf|staffOf\(/.test(lines.slice(i, i + 3).join(" "))) unnamed.push(`${f}: ${path}`);
        }
      });
    }
    return { configPosts, unnamed, ownWrites, publicWrites, doorWrites, platformWrites };
  };
  const { configPosts, unnamed, ownWrites, publicWrites, doorWrites, platformWrites } = writes(API);
  const plantedDir = planted({ "features/checkpoint/999-planted.ts": '@Controller("api")\nexport class P {\n  @Get("planted/read") read() {}\n  @Post("planted/write")\n  write() {}\n}\n' });
  ok("QA-53 fail (B120): a GET route planted in a subfolder is found", routes(plantedDir).map((x) => x.path).join() === "/api/planted/read");
  ok("QA-65 fail (B120): a write planted in a subfolder that names nobody is caught", writes(plantedDir).unnamed.join() === "features/checkpoint/999-planted.ts: /api/planted/write");
  // C6.16: a /api/link/* route with no guard of its own is never let through: unmarked, it is a configuration read asked
  // like every other; marked open but not on OWN_GUARD, the reviewed-list check fails; a write not on OWN_GUARD_WRITES
  // that names nobody is caught; and a second controller's routes keep their own prefix.
  const plantedLink = planted({ "planted-link.ts": '@Controller("api/runtime")\nexport class A {\n  @Post("named")\n  named(@Headers("x-actor") a: H) {}\n}\n@OpenRead("planted")\n@Controller("api/link")\nexport class B {\n  @Get("sneaky") sneaky() {}\n  @Post("sneaky-write")\n  w() {}\n}\n@Controller("api/link")\nexport class C {\n  @Get("bare") bare() {}\n}\n' });
  const pl = routes(plantedLink), pw = writes(plantedLink);
  ok("C6.16 fail: a planted /api/link/* GET with no mark is a configuration read (asked 401/403 like any other), and one marked open but not on OWN_GUARD is caught by the reviewed list", pl.find((x) => x.path === "/api/link/bare")?.mark === null && pl.find((x) => x.path === "/api/link/sneaky")?.mark === "open" && !("/api/link/sneaky" in OWN_GUARD), pl);
  ok("C6.16 fail: a planted /api/link/* write not on OWN_GUARD_WRITES that names nobody is caught, under its own controller's prefix", pw.unnamed.join() === "planted-link.ts: /api/link/sneaky-write" && pw.ownWrites.length === 0, pw);
  ok("C6.16: the link's own writes in the code are exactly OWN_GUARD_WRITES", JSON.stringify([...ownWrites].sort()) === JSON.stringify([...OWN_GUARD_WRITES].sort()), { ownWrites });
  const postStatus = async (path: string, actor: string | null, bearer: string | null, method = "POST") => (await fetch(`http://localhost:${PORT}${path}`, { method, headers: { "content-type": "application/json", ...(actor ? { "x-actor": actor } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, body: method === "DELETE" ? undefined : JSON.stringify({ token: "B".repeat(43), code: "123456", value: "x", expectedId: null, group: "g", noneApply: true }) })).status;
  const wrongWrite: string[] = [];
  for (const w of OWN_GUARD_WRITES) {
    const method = /rows\/:row$/.test(w) ? "DELETE" : /answers|none-apply/.test(w) ? "PUT" : "POST";
    const path = fill(w).replace(/:subject\b/g, "00000000-0000-4000-8000-000000000000").replace(/:relation\b/g, "parent_1").replace(/:field\b/g, "person.family_name").replace(/:row\b/g, "00000000-0000-4000-8000-000000000000").replace(/:group\b/g, "g");
    const session = !/\/link\/(open|code\/send|code)$/.test(w);
    const s = { actor: await postStatus(path, "user-P", null, method), none: await postStatus(path, null, null, method) };
    // With x-actor: always 400. With nobody: a session route 401; the token routes refuse the made-up token (404 in words).
    if (s.actor !== 400 || s.none !== (session ? 401 : 404)) wrongWrite.push(`${w} ${JSON.stringify(s)}`);
  }
  ok(`C6.16 fail: each write of the adult's own link (${OWN_GUARD_WRITES.length}) refuses a simulated person (400) and, with no session or a made-up token, answers 401 or 404, never a change`, wrongWrite.length === 0, wrongWrite);
  ok("QA-65: the configuration reads made by POST are exactly the reviewed three (finder plan, AI plan, condition check)", JSON.stringify(configPosts.sort()) === JSON.stringify(["/api/ai/plan", "/api/combinations/:id/forms/find/plan", "/api/conditions/check"]), configPosts);
  ok("QA-65: every other write names its person (none answers nobody by default)", unnamed.length === 0, unnamed);
  const doorAnswers = await Promise.all(PUBLIC_DOOR_WRITES.map(async (w) => `${w} ${await post(w, null, {})}`));
  ok("PF-5: the public sign-up doors in the code are exactly PUBLIC_DOOR_WRITES, and each refuses an empty body (400) or is shut (503), never a 2xx",
    JSON.stringify([...doorWrites].sort()) === JSON.stringify([...PUBLIC_DOOR_WRITES].sort()) && doorAnswers.every((a) => / (400|503)$/.test(a)), { doorWrites, doorAnswers });
  ok("FO-2: the public writes are exactly PUBLIC_WRITES, and one with an unknown token answers nobody 404 (no change)", JSON.stringify(publicWrites.sort()) === JSON.stringify(PUBLIC_WRITES) && await postStatus(`/api/public/forms/${"x".repeat(30)}/submissions`, null, null) === 404, publicWrites);

  // PF-4t: the platform guard's routes, asked (Lead 50 on #1775).
  ok("PF-4t: the exemption is exactly PF-4's PLATFORM_PATH (source and flags pinned)", exactPlatformPath(PLATFORM_PATH), { source: PLATFORM_PATH.source, flags: PLATFORM_PATH.flags });
  ok("PF-4t fail: a widened PLATFORM_PATH fails the pin (/api/ alone, no boundary, another flag)", !exactPlatformPath(/^\/api\//i) && !exactPlatformPath(/^\/api\/(platform|front-office)/i) && !exactPlatformPath(/^\/api\/(platform|front-office)(\/|$)/gi));
  const platformReads = all.filter((x) => isPlatform(x.path));
  const ask = async (path: string, method: string, actor: string | null) => {
    const r = await fetch(`http://localhost:${PORT}${path}`, { method, headers: { "content-type": "application/json", ...(actor ? { "x-actor": actor } : {}) }, body: method === "GET" ? undefined : "{}" });
    const text = await r.text(); let body: unknown = text; try { body = JSON.parse(text); } catch { /* text */ }
    return { status: r.status, body };
  };
  const wrongPlatform: string[] = [];
  for (const r of [...platformReads.map((x) => ({ path: x.path, method: "GET", door: false })), ...platformWrites]) {
    const path = r.path.replace(/:id\b/g, "00000000-0000-4000-8000-000000000000");
    const door = r.door ? DOORS[`${r.method} ${r.path}`] ?? -1 : undefined; // an unreviewed door has no status: always caught
    for (const actor of [null, "user-A", "user-O", "user-P"]) { const a = await ask(path, r.method, actor); if (platformWrong(a, door)) wrongPlatform.push(`${r.method} ${r.path} as ${actor ?? "nobody"}: ${a.status} ${JSON.stringify(a.body).slice(0, 80)}`); }
  }
  ok(`PF-4t: the platform guard's routes (${platformReads.length} reads, ${platformWrites.length} writes) answer nobody and x-actor alone 401 (a sign-in door: its exact status in DOORS), never data`,
    platformReads.length >= 2 && platformWrites.length >= 8 && wrongPlatform.length === 0, wrongPlatform);
  // CS-C1s part 2 (#2169): a runtime read that declares permission keys is marked a case read, but ConfigReadGuard leaves
  // it to PF-4's guard (a staff session only), so it is asked here like a platform route: x-actor never opens it.
  const keyedRuntime = all.filter((x) => x.path.startsWith("/api/runtime/") && x.keys), wrongKeyed: string[] = [];
  for (const r of keyedRuntime) for (const actor of [null, "user-Z", "user-A", "user-O", "user-P"]) { const a = await ask(fill(r.path), "GET", actor); if (platformWrong(a)) wrongKeyed.push(`${r.path} as ${actor ?? "nobody"}: ${a.status} ${JSON.stringify(a.body).slice(0, 80)}`); }
  ok(`CS-C1s fail: each runtime read behind PF-4's guard (${keyedRuntime.length}) answers nobody, an unknown name and x-actor alone (author, officer, client) 401, never data`,
    keyedRuntime.some((x) => x.path === "/api/runtime/cases/:id/decisions") && wrongKeyed.length === 0, wrongKeyed);
  ok("PF-4t fail: a seeded platform route answering 200 to x-actor alone, or 401 with data, is caught", platformWrong({ status: 200, body: { firmId: "x" } }) && platformWrong({ status: 401, body: { detail: "no", staffId: "x" } }) && platformWrong({ status: 200, body: { token: "t" } }, 403) && !platformWrong({ status: 401, body: { type: "t", title: "t", status: 401, detail: "d", code: "NOT_SIGNED_IN" } }));
  // PF-4f (PF-4t round 2 Minors m1, m2; Lead B rows rev 16.8).
  const doorsOf = (ws: { path: string; method: string; door: boolean }[]) => ws.filter((w) => w.door).map((w) => `${w.method} ${w.path}`).sort();
  ok("PF-4f m1 pass: a sign-in door answering its exact status (403 LOCAL_SIGN_IN_OFF, a problem's own fields) is not caught",
    !platformWrong({ status: 403, body: { type: "t", title: "Not available", status: 403, detail: "d", code: "LOCAL_SIGN_IN_OFF" } }, DOORS["POST /api/platform/session/local"]));
  ok("PF-4f m1 fail: a sign-in door answering 404, 500, 401 or 400 instead of its exact status is caught (status < 400 let 404 and 5xx pass)",
    [404, 500, 503, 401, 400].every((st) => platformWrong({ status: st, body: { type: "t", title: "t", status: st, detail: "d" } }, DOORS["POST /api/platform/session/local"])));
  ok("PF-4f m2 pass: the sign-in doors in the code are exactly the reviewed list [\"POST /api/platform/session/local\"]",
    JSON.stringify(doorsOf(platformWrites)) === JSON.stringify(Object.keys(DOORS).sort()) && JSON.stringify(Object.keys(DOORS)) === JSON.stringify(["POST /api/platform/session/local", "POST /api/platform/session/callback"]), doorsOf(platformWrites));
  // Review m-1: a door the line scan cannot see (@StaffSignIn on its own line, or on a GET) is still counted here: every
  // @StaffSignIn( mark in api/src (keys.ts, where it is defined and documented, aside) must be a door the scan found.
  const doorMarks = (dir: string) => tsFiles(dir).filter((f) => f !== "platform/identity/keys.ts").reduce((n, f) => n + (readFileSync(join(dir, f), "utf8").match(/@StaffSignIn\(/g) ?? []).length, 0);
  ok("PF-4f m2 pass: every @StaffSignIn mark in the code is a door the scan found (as many marks as reviewed doors)", doorMarks(API) === Object.keys(DOORS).length && doorMarks(API) === doorsOf(platformWrites).length, { marks: doorMarks(API), doors: doorsOf(platformWrites) });
  const plantedHidden = planted({ "platform/planted-hidden.ts": '@Controller("api/platform")\nexport class H {\n  @Post("session/local") @StaffSignIn("door")\n  local() {}\n  @StaffSignIn("own line")\n  @Post("session/own-line")\n  ownLine() {}\n  @Get("session/read") @StaffSignIn("a GET door")\n  read() {}\n}\n' });
  ok("PF-4f m2 fail: a door the line scan misses (@StaffSignIn on its own line, a GET door) fails the mark count", doorMarks(plantedHidden) === 3 && doorsOf(writes(plantedHidden).platformWrites).length === 1, { marks: doorMarks(plantedHidden), doors: doorsOf(writes(plantedHidden).platformWrites) });
  const plantedDoor = planted({ "platform/planted-door.ts": '@Controller("api/platform")\nexport class D {\n  @Post("session/local") @StaffSignIn("door")\n  local() {}\n  @Post("session/other") @StaffSignIn("an added door")\n  other() {}\n}\n' });
  ok("PF-4f m2 fail: an added door (a planted second @StaffSignIn route) fails the list check", JSON.stringify(doorsOf(writes(plantedDoor).platformWrites)) !== JSON.stringify(Object.keys(DOORS).sort()) && doorsOf(writes(plantedDoor).platformWrites).join() === "POST /api/platform/session/local,POST /api/platform/session/other", doorsOf(writes(plantedDoor).platformWrites));
  const plantedNear = planted({ "planted-near.ts": '@Controller("api")\nexport class N {\n  @Get("platformx/read") read() {}\n  @Post("platformx/write")\n  write() {}\n}\n' });
  ok("PF-4t pass/fail: a route outside PLATFORM_PATH (/api/platformx/…) keeps the QA-53 and QA-65 rules (a configuration read; a write naming nobody is caught)",
    routes(plantedNear).every((x) => !x.mark && !isPlatform(x.path)) && writes(plantedNear).unnamed.join() === "planted-near.ts: /api/platformx/write" && writes(plantedNear).platformWrites.length === 0);
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
