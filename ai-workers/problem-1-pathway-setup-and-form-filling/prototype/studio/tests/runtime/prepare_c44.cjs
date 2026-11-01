// C4.4 suites prepare their own isolated copy (tech lead, 1 Nov: run-suites.sh runs only "isolated.sh <name> <port>
// start && tsx|node studio/tests/<file> <args>", so a setup step in a usage line never ran in a merge batch). Releases
// the Visitor visa (setup_visitor_visa.ts) when the copy has none, then adds the C4.4 Sample types and ticks
// (setup_c44_types.ts, idempotent). Plain CommonJS so both the TS and the browser suites can call it. No AI (US$0).
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const STUDIO = path.join(__dirname, "../..");
const TSX = path.join(STUDIO, "node_modules/.bin/tsx");
const PSQL = "/opt/homebrew/opt/postgresql@18/bin/psql";

/** Prepares the copy on `port` with database `db`; throws in words when a setup step fails. */
function prepareC44(port, db) {
  const sql = (q) => execFileSync(PSQL, [`postgresql://xr_studio@127.0.0.1:54329/${db}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const run = (script) => {
    try { execFileSync(TSX, ["--tsconfig", path.join(STUDIO, "api/tsconfig.json"), path.join(__dirname, script), String(port), db], { cwd: path.join(STUDIO, ".."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600000 }); }
    catch (e) { throw new Error(`${script} failed on ${db}: ${String(e.stdout ?? "").split("\n").filter((l) => /FAIL|STOP|Error/.test(l)).slice(0, 3).join(" | ") || e.message}`); }
  };
  const released = () => Number(sql("select count(*) from config_release r join combination c on c.id = r.combination_id where c.combination_key = 'vv.single'")) > 0;
  if (!released()) run("setup_visitor_visa.ts");
  if (!released()) throw new Error(`the Visitor visa is still not released on ${db}`);
  run("setup_c44_types.ts");
}
module.exports = { prepareC44 };
