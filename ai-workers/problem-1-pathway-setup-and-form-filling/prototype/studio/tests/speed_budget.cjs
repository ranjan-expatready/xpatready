// P-184 (founder, 30 Oct): speed checks are reported, not failed, when the Mac is busy. One helper for every suite with
// a speed budget (STANDARDS §9: first view < 1 s, an in-page change < 200 ms). The budgets never change. When the
// one-minute load is at or below the number of cores, the budget is judged and a miss fails the run as before; above
// it, the step passes as "not judged: machine busy" and prints the time and the load, so nothing is hidden. The busy
// Mac runs CI, the lanes' suites and the lanes themselves at once: r1c missed 5 of 5 at load 8–18 on 8 cores while the
// same views take 58–280 ms when it is quieter (runtime lane, 30 Oct).
const os = require("node:os");

/** The machine now: one-minute load against the core count. */
function machine() { const load = os.loadavg()[0], cores = os.cpus().length; return { load, cores, busy: load > cores }; }

/** A speed step: { label, ok, detail } for the suite's own step()/ok(). within: the measure met its budget; detail: the
 *  measured times. env is for the helper's own check only (check_speed_budget.ts); suites leave it out. */
function speed(label, within, detail, env = machine()) {
  const at = `load ${env.load.toFixed(1)} on ${env.cores} cores`;
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  if (env.busy) return { label: `${label} — not judged: machine busy (${at})`, ok: true, detail: `${text} · ${at}` };
  return { label, ok: !!within, detail: `${text} · ${at}` };
}

module.exports = { machine, speed };
