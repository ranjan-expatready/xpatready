#!/usr/bin/env node
// Gate B (P-214 CI tooling; founder 4 Nov "Yes, as amended"; reports/bottleneck-audit-2026-11-03.md: 18 Works → Partial
// demotions in 3 days): a product PR may no longer merge silently with work that has not passed the test qa counts it by.
//   1. The PR names the capabilities it claims: C<n.n> in its title, or a "Capabilities:" line in its body, where a pack
//      that is green only in part names its steps: "Capabilities: C7.5 (steps 1-4, 10-14)". The check fails while a named
//      capability has an open Blocker, Critical or Major in qa/BUGS.md, unless the PR names that bug as the one it fixes
//      (QA-nnn in the title, or on a body line that says fixes, fixed or closes, or a "Fixes:" line).
//   2. Each named capability with an acceptance pack (prototype/studio/acceptance/<id>.test.ts and <id>-*.test.ts) runs
//      on a fresh isolated copy, US$0, live AI off, by its own documented run: on the demo data (Demo › Reset to the
//      six, POST /api/demo/reset-to-six as the author, then the pack) when its run is the pack alone; on its fixture
//      when its run line has setup steps (they build a combination from an empty workspace, which the six already
//      holds), and the result says so. Red fails the check: exit 0, or every named step PASS and none FAIL. Up to
//      GATE_B_JOBS packs (default 3) run side by side.
//   3. Skipped: notes and records PRs (KIND from change-kind.sh, as CI already sorts them), merge-queue batches (QUEUE),
//      and a PR that names no capability.
// Usage (CI, part 1, rules step): PR_TITLE, PR_BODY, KIND, QUEUE from the event; node product/tools/gate-b.mjs
//   node product/tools/gate-b.mjs --title "<t>" [--body-file <f>] [--kind code] [--bugs <BUGS.md>] [--no-packs] [--plan]
//   --no-packs: only part 1 (and the packs it would run); --plan: print each named pack's run and stop.
// Exit: 0 pass or skipped · 1 the gate refuses (the reasons are printed) · 2 the gate could not run.
import { readFileSync, readdirSync, existsSync, appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const P = resolve(HERE, ".."), PROTO = resolve(P, "../prototype"), S = join(PROTO, "studio");
const CAP = /\bC\d{1,2}\.\d{1,2}\b/g, BUG = /\bQA-\d+\b/g, GATING = new Set(["Blocker", "Critical", "Major"]);

/** What the PR claims: capability → named steps (null = the whole pack) and the bugs it says it fixes. */
export function claims(title = "", body = "") {
  const caps = new Map(), fixes = new Set();
  for (const id of title.match(CAP) ?? []) caps.set(id, null);
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^\W*capabilities\W*:\s*(.*)$/i);
    if (m) for (const c of m[1].matchAll(/\b(C\d{1,2}\.\d{1,2})\b(?:\s*\(\s*steps?\s+([^)]*)\))?/gi)) {
      const steps = c[2] ? expand(c[2]) : null;
      caps.set(c[1], steps ? [...new Set([...(caps.get(c[1]) ?? []), ...steps])] : caps.has(c[1]) ? caps.get(c[1]) : null);
    }
    if (/^\W*fix(es|ed)?\W*:|\b(fixes|fixed|closes|closed)\b/i.test(line)) for (const b of line.match(BUG) ?? []) fixes.add(b);
  }
  for (const b of title.match(BUG) ?? []) fixes.add(b);
  return { caps, fixes };
}
/** "1-4, 10, 6b, AT-3" → 1 2 3 4 10 6b AT-3 (a range only between two numbers). */
export function expand(list) {
  const out = [];
  for (const t of list.split(/[,;\s]+/).map((x) => x.trim().replace(/[…]/g, "-")).filter(Boolean)) {
    const r = t.match(/^(\d+)(?:-|\.\.\.?)(\d+)$/);
    if (r && +r[1] <= +r[2] && +r[2] - +r[1] < 100) for (let i = +r[1]; i <= +r[2]; i++) out.push(String(i));
    else out.push(t);
  }
  return out;
}
/** The open rows of qa/BUGS.md: id, severity (the first word after "Type ·"), capabilities (before the first "·"). */
export function openBugs(md) {
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!/^\|\s*QA-\d+\s*\|/.test(line)) continue;
    const col = line.split(/(?<!\\)\|/).map((c) => c.trim());
    const [id, kind, capCol] = [col[1], col[2].replace(/\*/g, ""), col[3] ?? ""], status = col[col.length - 2] ?? "";
    if (/^(closed|fixed and retested|retested|done|withdrawn)\b/i.test(status)) continue;
    const severity = kind.match(/·\s*(Blocker|Critical|Major|Minor)\b/)?.[1] ?? "unknown";
    const head = capCol.split("·")[0];
    const caps = [...(head.match(CAP) ?? []), ...[...head.matchAll(/\bC(\d{1,2})\.x\b/g)].map((m) => `C${m[1]}.x`)];
    rows.push({ id, severity, caps });
  }
  return rows;
}
const covers = (bugCap, id) => bugCap === id || (bugCap.endsWith(".x") && id.startsWith(bugCap.slice(0, -1)));
/** Part 1: the open Blocker, Critical or Major bugs on a named capability that the PR does not say it fixes. */
export function blockers(cl, bugs) {
  const out = [];
  for (const id of cl.caps.keys()) for (const b of bugs)
    if (GATING.has(b.severity) && b.caps.some((c) => covers(c, id)) && !cl.fixes.has(b.id)) out.push({ cap: id, bug: b.id, severity: b.severity });
  return out;
}
export const packsOf = (id, dir = join(S, "acceptance")) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f === `${id}.test.ts` || (f.startsWith(`${id}-`) && f.endsWith(".test.ts"))).sort() : [];

/** A pack's documented run, from its header: the isolated.sh line and the tsx lines that follow it (continuations
 *  joined, split on && and ;). The copy's start and stop are the gate's; each tsx step keeps its own folder (a path
 *  that starts with studio/ runs from prototype/, else from studio/), the documented port and database become the
 *  gate's, and an optional [argument] is dropped. A pack on the M3 helpers (acceptance/lib/m3.ts) with no setup line
 *  gets the M3 setup its helpers need (tests/runtime/setup_visitor_visa.ts, then acceptance/lib/setup_vv_m3.ts). */
export function runPlan(file, text) {
  const head = [];
  for (const l of text.split(/\r?\n/)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/\s?/, "").trim()); }
  const isCmd = (t) => /^(zsh\s.*isolated\.sh|tsx\s|\.\/node_modules\/\.bin\/tsx\s|node\s|&&)/.test(t);
  let i = head.findIndex((t) => /isolated\.sh\s+\S+\s+\d+\s+start/.test(t));
  if (i < 0) i = head.findIndex((t) => isCmd(t) && t.includes(`acceptance/${file}`));
  if (i < 0) return { error: `no run line in its header (want "zsh studio/tools/isolated.sh <name> <port> start && tsx studio/acceptance/${file} <port> <db>")` };
  // One command per line, or continued with a trailing \ or &&; a trailing "(note)" after a command is a remark.
  let block = "";
  for (let j = i; j < head.length; j++) {
    const t = head[j].replace(/\s+\((?![^)]*\.(ts|cjs|mjs)\b).*$/, "");
    const continued = /(\\|&&)$/.test(block.trim());
    if (j > i && !isCmd(t) && !continued) break;
    block += (j > i && !continued ? " ; " : " ") + t;
  }
  block = block.replace(/\\\s*/g, " ");
  let port = null, db = null; const steps = [];
  for (const piece of block.split(/\s*(?:&&|;)\s*/).map((x) => x.trim()).filter(Boolean)) {
    const iso = piece.match(/isolated\.sh\s+(\S+)\s+(\d+)\s+(start|stop)/);
    if (iso) { port ??= iso[2]; db ??= `xr_studio_${iso[1]}`; continue; }
    const tok = piece.split(/\s+/);
    if (!/^(tsx|\.\/node_modules\/\.bin\/tsx|node)$/.test(tok[0])) return { error: `a run step the gate cannot read: "${piece}"` };
    const script = tok.find((x) => /\.(ts|cjs|mjs)$/.test(x) && !x.endsWith("tsconfig.json"));
    if (!script) return { error: `a run step without a script: "${piece}"` };
    const fromProto = script.startsWith("studio/");
    if (port === null) { const k = tok.indexOf(script); if (/^\d+$/.test(tok[k + 1] ?? "")) port = tok[k + 1]; }
    if (db === null) db = tok.find((x) => /^xr_studio_\w+$/.test(x)) ?? null;
    steps.push({ cwd: fromProto ? "prototype" : "studio", tool: tok[0] === "node" ? "node" : "tsx", args: tok.slice(1).filter((x) => !/^\[.*\]$/.test(x)), script });
  }
  if (!steps.some((s) => s.script.endsWith(`acceptance/${file}`))) return { error: `its run line does not run acceptance/${file}` };
  if (/from\s+["']\.\/lib\/m3\.ts["']/.test(text) && steps.length === 1)
    steps.unshift(
      { cwd: "prototype", tool: "tsx", args: ["studio/tests/runtime/setup_visitor_visa.ts", "PORT", "DB"], script: "studio/tests/runtime/setup_visitor_visa.ts" },
      { cwd: "prototype", tool: "tsx", args: ["studio/acceptance/lib/setup_vv_m3.ts", "PORT", "DB"], script: "studio/acceptance/lib/setup_vv_m3.ts" });
  for (const s of steps) s.args = s.args.map((a) => (a === port || a === "PORT" ? "{PORT}" : a === db || a === "DB" ? "{DB}" : a));
  return { steps };
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Did the named steps pass? A step passes on a PASS line labelled "<id>-<step>" or "<id> <step>" and no FAIL line. */
export function stepsVerdict(id, steps, out) {
  const missing = [];
  for (const s of steps) {
    const re = (w) => new RegExp(`^${w}\\s+${esc(id)}[- ]${esc(s)}(?![0-9A-Za-z])`, "m");
    if (!re("PASS").test(out) || re("FAIL").test(out)) missing.push(s);
  }
  return missing;
}

function cleanEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/_LIVE$/.test(k) || k === "ANTHROPIC_API_KEY") delete env[k];   // US$0, live AI off
  const node = resolve(P, "../../../.tools/node-v24.21.0/bin");
  if (existsSync(node)) env.PATH = `${node}:/opt/homebrew/opt/postgresql@18/bin:${env.PATH}`;
  return env;
}
async function resetToSix(port) {
  const r = await fetch(`http://127.0.0.1:${port}/api/demo/reset-to-six`, { method: "POST", headers: { "content-type": "application/json", "x-actor": "user-A" }, body: JSON.stringify({ confirm: "RESET" }) });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, detail: body?.detail ?? body?.message ?? "" };
}
/** A child process as a promise (packs run side by side, each on its own copy). */
function sh(bin, args, opts, ms) {
  return new Promise((done) => {
    const c = spawn(bin, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", timer = setTimeout(() => { out += `\n(stopped after ${ms / 1000} s)`; c.kill("SIGKILL"); }, ms);
    c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (out += d));
    c.on("error", (e) => { clearTimeout(timer); done({ status: 127, out: out + e.message }); });
    c.on("close", (code) => { clearTimeout(timer); done({ status: code ?? 1, out }); });
  });
}
/** Part 2: one pack on a fresh copy. A pack whose run has no setup lines runs on the six (Demo › Reset to the six
 *  first); a pack whose run line builds its own data (setup_visitor_visa and the like make a combination from an empty
 *  workspace, which the six already holds) runs on its documented blank copy, and the result says "fixture, not the
 *  six". Returns { log, why }: why is null when it passed. */
async function runPack(id, file, wanted, n) {
  const plan = runPlan(file, readFileSync(join(S, "acceptance", file), "utf8"));
  if (plan.error) return { log: [], why: `${file}: ${plan.error}` };
  // CI's part 1 runs it before its suites, on ports no suite uses; on a Mac copy, GATE_B_PORT / GATE_B_NAME pick the
  // builder's own ports and database prefix (WAY-OF-WORKING: never :4400).
  const name = `${process.env.GATE_B_NAME ?? "gateb"}${n}`, port = String(Number(process.env.GATE_B_PORT ?? 4590) + n), db = `xr_studio_${name}`, env = cleanEnv(), t0 = Date.now();
  if (port === "4400") return { log: [], why: `${file}: port 4400 is the demo; the gate never runs there` };
  const onSix = plan.steps.length === 1, where = onSix ? "on the six" : "on its fixture (its run line has setup steps), not the six", log = [];
  const iso = (what) => sh("zsh", [join(S, "tools/isolated.sh"), name, port, what], { cwd: S, env }, 300_000);
  const up = await iso("start"), tUp = Date.now();
  if (up.status !== 0) return { log, why: `${file}: isolated copy ${name} did not start (exit ${up.status}): ${up.out.trim().split("\n").slice(-2).join(" ")}` };
  try {
    if (onSix) {
      const six = await resetToSix(port).catch((e) => ({ ok: false, status: 0, detail: e.message }));
      if (!six.ok) return { log, why: `${file}: Demo › Reset to the six refused (${six.status}) ${six.detail}` };
    }
    const tSix = Date.now();
    let out = "", last = null;
    for (const s of plan.steps) {
      const bin = s.tool === "node" ? "node" : join(S, "node_modules/.bin/tsx");
      const args = s.args.map((a) => a.replace("{PORT}", port).replace("{DB}", db));
      const r = await sh(bin, args, { cwd: s.cwd === "prototype" ? PROTO : S, env }, 900_000);
      if (s.script.endsWith(`acceptance/${file}`)) { out = r.out; last = r.status; }
      else log.push(`    setup ${s.script}: exit ${r.status}${r.status ? ` (${r.out.trim().split("\n").pop()})` : ""}`);
    }
    const sec = (a, b) => Math.round((b - a) / 1000), tail = out.trim().split("\n").pop();
    log.push(`    ${file} ${where}: exit ${last}, ${tail} (${sec(t0, Date.now())} s: copy ${sec(t0, tUp)}${onSix ? `, Reset to the six ${sec(tUp, tSix)}` : ""}, run ${sec(tSix, Date.now())})`);
    if (wanted) {
      const missing = stepsVerdict(id, wanted, out);
      return { log, why: missing.length ? `${file}: named steps not green ${where}: ${missing.map((s) => `${id}-${s}`).join(", ")}${fails(out)}` : null };
    }
    return { log, why: last === 0 ? null : `${file}: exit ${last} ${where} (${tail})${fails(out)}` };
  } finally { await iso("stop"); }
}
const fails = (out) => { const f = out.split("\n").filter((l) => /^FAIL\s/.test(l)).slice(0, 5); return f.length ? `; first FAIL lines: ${f.map((l) => l.slice(0, 160)).join(" | ")}` : ""; };

async function main(argv) {
  const opt = { title: process.env.PR_TITLE ?? "", body: process.env.PR_BODY ?? "", kind: process.env.KIND ?? "code", queue: process.env.QUEUE === "true", bugs: join(P, "qa/BUGS.md"), packs: true, plan: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (argv[i + 1] === undefined) throw new Error(`${a} wants a value`); return argv[++i]; };
    if (a === "--title") opt.title = v(); else if (a === "--body-file") opt.body = readFileSync(v(), "utf8"); else if (a === "--body") opt.body = v();
    else if (a === "--kind") opt.kind = v(); else if (a === "--bugs") opt.bugs = v(); else if (a === "--no-packs") opt.packs = false; else if (a === "--plan") opt.plan = true;
    else throw new Error(`unknown option ${a}`);
  }
  const say = (s) => { console.log(s); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, s + "\n"); };
  if (opt.kind !== "code") { say(`Gate B: skipped (${opt.kind} change).`); return 0; }
  if (opt.queue) { say("Gate B: skipped (merge-queue batch; each PR passed it on its own)."); return 0; }
  const cl = claims(opt.title, opt.body);
  if (!cl.caps.size) { say("Gate B: skipped (the PR names no capability: C<n.n> in its title or a \"Capabilities:\" line)."); return 0; }
  const named = [...cl.caps].map(([id, st]) => (st ? `${id} (steps ${st.join(", ")})` : id)).join(", ");
  say(`Gate B: the PR claims ${named}${cl.fixes.size ? `; says it fixes ${[...cl.fixes].join(", ")}` : ""}.`);
  const reasons = blockers(cl, openBugs(readFileSync(opt.bugs, "utf8"))).map((b) => `${b.cap} has an open ${b.severity}, ${b.bug}, in qa/BUGS.md: fix it in this PR and name it (a "Fixes: ${b.bug}" line), or do not claim ${b.cap}`);
  const runs = [...cl.caps].flatMap(([id, st]) => packsOf(id).map((f) => ({ id, f, st })));
  say(`  packs: ${runs.length ? runs.map((r) => r.f).join(", ") : "none for the named capabilities"}`);
  if (opt.plan) { for (const r of runs) console.log(r.f, JSON.stringify(runPlan(r.f, readFileSync(join(S, "acceptance", r.f), "utf8")))); return 0; }
  if (opt.packs) {   // at most GATE_B_JOBS packs at once (default 3), each on its own copy and port
    const jobs = Math.max(1, Number(process.env.GATE_B_JOBS ?? 3)), results = new Array(runs.length), t0 = Date.now();
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, runs.length) }, async () => {
      for (let k = next++; k < runs.length; k = next++) results[k] = await runPack(runs[k].id, runs[k].f, runs[k].st, k);
    }));
    for (const r of results) { for (const l of r.log) say(l); if (r.why) reasons.push(r.why); }
    if (runs.length) say(`  packs took ${Math.round((Date.now() - t0) / 1000)} s in all`);
  }
  if (reasons.length) { say("Gate B refuses:"); for (const r of reasons) say(`  * ${r}`); return 1; }
  say("Gate B: passed."); return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(`Gate B could not run: ${e.message}`); process.exit(2); });
