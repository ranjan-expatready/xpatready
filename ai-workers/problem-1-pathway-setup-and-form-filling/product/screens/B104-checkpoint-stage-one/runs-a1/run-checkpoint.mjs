#!/usr/bin/env node
// qa milestone M3 (cloud, 5 Nov): each M3 pack ALONE on Demo › Load the configured checkpoint (P-322, P-344 (2)).
// Per pack: a fresh isolated copy (tools/isolated.sh), POST /api/demo/reset then /api/demo/load {sample:"configured"}
// as the author (user-A), then the pack with no fixture setup, then the copy is stopped and its database dropped.
// Live AI off (cleanEnv drops every API key and sets AI live off), US$0. Never port 4400.
//   node run-checkpoint.mjs <round-name> <base-port> <jobs> <out-dir> [pack ...]
import { spawn, spawnSync } from "node:child_process";
import { request } from "node:http";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const S = process.env.STUDIO, PROTO = resolve(S, "..");
const [round, basePort, jobs, out, ...packs] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const env = { ...process.env };
// As gate B's cleanEnv: every *_LIVE switch and every AI key removed (never set, so nothing reads "off" as on).
for (const k of Object.keys(env)) if (/_LIVE$|ANTHROPIC|OPENAI|_API_KEY/i.test(k)) delete env[k];

function post(port, path, body, ms) {
  return new Promise((done) => {
    const data = JSON.stringify(body);
    const rq = request({ host: "127.0.0.1", port: Number(port), path, method: "POST", timeout: ms, headers: { "content-type": "application/json", "x-actor": "user-A", "content-length": Buffer.byteLength(data) } }, (r) => {
      let t = ""; r.setEncoding("utf8"); r.on("data", (c) => (t += c)); r.on("end", () => done({ ok: (r.statusCode ?? 0) < 300, status: r.statusCode, body: t.slice(0, 2000) }));
    });
    rq.on("timeout", () => rq.destroy(new Error(`no answer in ${ms / 1000} s`)));
    rq.on("error", (e) => done({ ok: false, status: 0, body: e.message }));
    rq.end(data);
  });
}
function sh(bin, args, opts, ms) {
  return new Promise((done) => {
    const c = spawn(bin, args, { ...opts, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let o = ""; const timer = setTimeout(() => { o += `\n(stopped after ${ms / 1000} s)`; try { process.kill(-c.pid, "SIGKILL"); } catch {} }, ms);
    c.stdout.on("data", (d) => (o += d)); c.stderr.on("data", (d) => (o += d));
    c.on("close", (code) => { clearTimeout(timer); done({ status: code, out: o }); });
  });
}
async function one(pack, slot) {
  const name = `${round}${slot}`, port = String(Number(basePort) + slot), db = `xr_studio_${name}`, t0 = Date.now();
  if (port === "4400") throw new Error("never the demo");
  const iso = (what) => sh("zsh", [join(S, "tools/isolated.sh"), name, port, what], { cwd: S, env }, 300_000);
  let line;
  const up = await iso("start");
  try {
    if (up.status !== 0) { line = `${pack}: copy did not start: ${up.out.slice(-300)}`; return line; }
    // DATA=six: Demo › Reset to the six (gate B's demo data for M2 packs); else the configured checkpoint.
    const blank = process.env.DATA === "six" ? { ok: true } : await post(port, "/api/demo/reset", { confirm: "RESET" }, 300_000);
    const load = process.env.DATA === "six" ? await post(port, "/api/demo/reset-to-six", { confirm: "RESET" }, 1_200_000) : blank.ok ? await post(port, "/api/demo/load", { sample: "configured" }, 1_200_000) : blank;
    const tLoad = Date.now();
    writeFileSync(join(out, `${pack}.load.json`), load.body);
    if (!load.ok) { line = `${pack}: checkpoint load refused ${load.status} ${load.body.slice(0, 300)}`; return line; }
    const args = [join(S, "acceptance", `${pack}.test.ts`), port, db];
    const r = await sh(join(S, "node_modules/.bin/tsx"), args, { cwd: PROTO, env }, 900_000);
    writeFileSync(join(out, `${pack}.out.txt`), r.out);
    const pass = (r.out.match(/^PASS\s/gm) ?? []).length, fail = (r.out.match(/^FAIL\s/gm) ?? []).length, held = (r.out.match(/^HELD\s/gm) ?? []).length;
    line = `${pack}: exit ${r.status} · PASS ${pass} · FAIL ${fail}${held ? ` · HELD ${held}` : ""} (load ${Math.round((tLoad - t0) / 1000)} s, run ${Math.round((Date.now() - tLoad) / 1000)} s)`;
    return line;
  } finally {
    await iso("stop");
    spawnSync("dropdb", ["-h", "127.0.0.1", "-p", "54329", "-U", "xr_studio", "--if-exists", db], { env });
    rmSync(join(S, "var", `isolated-${name}`), { recursive: true, force: true });
    console.log(line); writeFileSync(join(out, `${pack}.line.txt`), (line ?? "") + "\n");
  }
}
const queue = [...packs];
await Promise.all(Array.from({ length: Number(jobs) }, async (_, slot) => { while (queue.length) await one(queue.shift(), slot); }));
