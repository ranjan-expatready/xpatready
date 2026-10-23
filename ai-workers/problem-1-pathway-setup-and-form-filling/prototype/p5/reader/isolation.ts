// Isolation check run INSIDE the reader process: asks Node's permission model what this process may do. A process
// that can read the answer keys, the family values or the case store, write outside the experiment ledger, start
// other processes, or is not the reader entry script, is refused before any request exists.
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { PolicyRefusal } from "../../p2/guard.ts";
import { DOCS_DIR, FORBIDDEN, LEDGER_DIR, PROTOTYPE, READ_ENTRY } from "./policy.ts";

type Permission = { has(scope: string, reference?: string): boolean };
export type ReaderIsolation = { permission_model: boolean; entry_is_read_ts: boolean; forbidden_readable: string[]; docs_readable: boolean; writable_outside_ledger: string[]; ledger_writable: boolean; child_process_allowed: boolean; worker_allowed: boolean };

export function readerIsolation(): ReaderIsolation {
  const perm = (process as unknown as { permission?: Permission }).permission;
  let entry: string | null = null;
  try { entry = process.argv[1] ? realpathSync(process.argv[1]) : null; } catch { entry = null; }
  if (!perm) return { permission_model: false, entry_is_read_ts: entry === READ_ENTRY, forbidden_readable: FORBIDDEN, docs_readable: true, writable_outside_ledger: [PROTOTYPE], ledger_writable: true, child_process_allowed: true, worker_allowed: true };
  const mustNotWrite = [join(PROTOTYPE, "expected"), join(PROTOTYPE, "p5"), join(PROTOTYPE, "trace.csv"), DOCS_DIR];
  return {
    permission_model: true, entry_is_read_ts: entry === READ_ENTRY,
    forbidden_readable: FORBIDDEN.filter((f) => perm.has("fs.read", f)), docs_readable: perm.has("fs.read", DOCS_DIR),
    writable_outside_ledger: mustNotWrite.filter((f) => perm.has("fs.write", f)), ledger_writable: perm.has("fs.write", LEDGER_DIR),
    child_process_allowed: perm.has("child"), worker_allowed: perm.has("worker"),
  };
}

export function assertReaderIsolated(): ReaderIsolation {
  const r = readerIsolation();
  const fail = (m: string): never => { throw new PolicyRefusal(`not an isolated reader process: ${m}`); };
  if (!r.permission_model) fail("Node permission model is not active");
  if (!r.entry_is_read_ts) fail("entry script is not p5/reader/read.ts");
  if (r.forbidden_readable.length) fail(`can read ${r.forbidden_readable.join(", ")}`);
  if (r.writable_outside_ledger.length) fail(`can write ${r.writable_outside_ledger.join(", ")}`);
  if (!r.ledger_writable) fail("cannot write the experiment ledger");
  if (!r.docs_readable) fail("cannot read the synthetic documents");
  if (r.child_process_allowed || r.worker_allowed) fail("may start other processes or workers");
  return r;
}
