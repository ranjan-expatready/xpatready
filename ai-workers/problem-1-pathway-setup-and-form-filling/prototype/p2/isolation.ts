// Isolation check run INSIDE the drafting process (draft.ts) and by the paid caller (runner.ts). It asks
// Node's permission model what this process may do, rather than trusting how the process was started:
// a process that can read the answer key or the family values, write outside the spend ledger, start
// other processes, or is not the one drafting entry script, is refused before any prompt exists.
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { PolicyRefusal } from "./guard.ts";
import { DRAFT_ENTRY, FORBIDDEN, LEDGER_DIR, OFFICIAL, PROTOTYPE, SOLUTION } from "./policy.ts";

export type IsolationReport = {
  permission_model: boolean;
  entry_script: string | null;
  entry_is_draft_ts: boolean;
  forbidden_readable: string[];
  official_readable: boolean;
  writable_outside_ledger: string[];
  ledger_writable: boolean;
  child_process_allowed: boolean;
  worker_allowed: boolean;
};

type Permission = { has(scope: string, reference?: string): boolean };

export function isolationReport(): IsolationReport {
  const perm = (process as unknown as { permission?: Permission }).permission;
  let entry: string | null = null;
  try { entry = process.argv[1] ? realpathSync(process.argv[1]) : null; } catch { entry = null; }
  if (!perm) {
    return { permission_model: false, entry_script: entry, entry_is_draft_ts: entry === DRAFT_ENTRY, forbidden_readable: FORBIDDEN, official_readable: true,
      writable_outside_ledger: [PROTOTYPE], ledger_writable: true, child_process_allowed: true, worker_allowed: true };
  }
  // Places a drafting process must never write: the prototype's records, evidence and the solution folder.
  const mustNotWrite = [join(PROTOTYPE, "trace.csv"), join(PROTOTYPE, "expected"), join(PROTOTYPE, "p2", "runs"), join(PROTOTYPE, "p2", "prompts"), join(PROTOTYPE, "p2", "jobs"), join(PROTOTYPE, "p2", "screening"), SOLUTION];
  return {
    permission_model: true,
    entry_script: entry,
    entry_is_draft_ts: entry === DRAFT_ENTRY,
    forbidden_readable: FORBIDDEN.filter((f) => perm.has("fs.read", f)),
    official_readable: perm.has("fs.read", OFFICIAL),
    writable_outside_ledger: mustNotWrite.filter((f) => perm.has("fs.write", f)),
    ledger_writable: perm.has("fs.write", LEDGER_DIR),
    child_process_allowed: perm.has("child"),
    worker_allowed: perm.has("worker"),
  };
}

/** Refuses unless this process is the drafting entry script running under the Node permission model
 *  with exactly the drafting allowances (isolatedNodeArgs in guard.ts). */
export function assertIsolated(): IsolationReport {
  const r = isolationReport();
  const fail = (m: string): never => { throw new PolicyRefusal(`not an isolated drafting process: ${m}`); };
  if (!r.permission_model) fail("Node permission model is not active");
  if (!r.entry_is_draft_ts) fail(`entry script is ${r.entry_script}, not p2/draft.ts`);
  if (r.forbidden_readable.length) fail(`can read ${r.forbidden_readable.join(", ")}`);
  if (r.writable_outside_ledger.length) fail(`can write ${r.writable_outside_ledger.join(", ")}`);
  if (!r.ledger_writable) fail("cannot write the experiment ledger");
  if (!r.official_readable) fail("cannot read the official files");
  if (r.child_process_allowed || r.worker_allowed) fail("may start other processes or workers");
  return r;
}
