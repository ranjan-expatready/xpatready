// qa probe (underneath): every GET route under /runtime/cases/:id (from the controllers, client-get-routes.txt), as Client A
// (user-P) and with no persona, on the walk's case after Partner's privacy is on; prints any response carrying Partner's
// or the child of 19's private values. Also the same reads as the case officer, to prove the values exist.
//   node probe_c616_client_reads.mjs <port> <caseId> <routesFile> <value>...
import { readFileSync } from "node:fs";
const [port, id, file, ...values] = process.argv.slice(2);
const routes = readFileSync(file, "utf8").split("\n").filter(Boolean).filter((r) => !r.includes(":subject") && !r.includes(":form") && !r.includes(":copy") && !r.includes(":"+"doc"));
const hit = (t) => values.filter((v) => t.includes(v));
for (const r of routes) {
  const path = r.replace(":id", id); const res = {};
  for (const actor of ["user-P", "user-O"]) {
    const q = await fetch(`http://127.0.0.1:${port}/api/runtime/${path}`, { headers: { "x-actor": actor } }); const t = await q.text(); res[actor] = `${q.status}${hit(t).length ? " CARRIES " + hit(t).join(",") : ""}`;
  }
  for (const extra of r === "cases/:id/questionnaire" ? ["?mode=agent", "?mode=pqr"] : []) {
    const q = await fetch(`http://127.0.0.1:${port}/api/runtime/${path}${extra}`, { headers: { "x-actor": "user-P" } }); const t = await q.text(); res[`user-P${extra}`] = `${q.status}${hit(t).length ? " CARRIES " + hit(t).join(",") : ""}`;
  }
  console.log(`${r.padEnd(42)} ${JSON.stringify(res)}`);
}
