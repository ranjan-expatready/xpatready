// Fence probe for the scoring set: run by run.sh under exactly the same conditions as the scorer. Every attempt
// below must be refused; the result is written to results/guard-check.json and run.sh stops if any succeeds.
//   node probe.mjs <out.json> <real file to read> <real path to write>
import { execFileSync } from "node:child_process";
import dns from "node:dns/promises";
import { readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";

const [out, realRead, realWrite] = process.argv.slice(2);
const tries = {
  "fetch to the AI provider": () => fetch("https://api.anthropic.com/v1/messages"),
  "https request": () => http.request("http://example.com"),
  "raw socket": () => net.connect(443, "api.anthropic.com"),
  "dns lookup": () => dns.lookup("api.anthropic.com"),
  "API key in the environment": () => { if (Object.keys(process.env).some((k) => /ANTHROPIC|API_KEY|OPENAI/i.test(k))) return "present"; throw new Error("absent"); },
  "read outside the copy (key file location)": () => readFileSync(realRead),
  "write into the real project folder": () => writeFileSync(realWrite, "x"),
  "start a child process": () => execFileSync("/usr/bin/true"),
};
const results = {};
for (const [name, f] of Object.entries(tries)) {
  try { const r = f(); if (r?.then) await r; results[name] = { refused: false }; }
  catch (e) { results[name] = { refused: true, why: String(e.code ?? e.message).slice(0, 120) }; }
}
const ok = Object.values(results).every((r) => r.refused);
writeFileSync(out, JSON.stringify({ note: "Each attempt was made under the scorer's own conditions and must be refused.", all_refused: ok, attempts: results }, null, 1) + "\n");
console.log(`guard: ${Object.values(results).filter((r) => r.refused).length}/${Object.keys(results).length} refused`);
process.exit(ok ? 0 : 1);
