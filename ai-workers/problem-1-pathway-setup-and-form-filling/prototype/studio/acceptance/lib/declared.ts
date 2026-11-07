// Helpers for the packs on declared answers (C6.3, C6.6; row B150, P-242, P-411): the configured checkpoint loaded through
// the Demo menu's own route when it is not there yet, and a real copy of a form read back by fact (what the filler was
// asked to write, never the draft alone). US$0, no model call.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR, call, generateCopy, ok, sql } from "./m3.ts";

/** The repository root: a copy's path is kept relative to it (api/src/core.ts ROOT). */
const REPO = join(import.meta.dirname, "..", "..", "..", "..", "..", "..");

/** Visitors › Visitor visa on the configured checkpoint (P-322): loaded on a blank copy when it is not released yet. */
export async function checkpointVisitorVisa(): Promise<string> {
  const released = () => sql("select count(*) from config_release r join combination c on c.id=r.combination_id where c.combination_key='vv.single'") !== "0";
  if (!released()) {
    await call("POST", "/demo/reset", { confirm: "RESET" }, AUTHOR);
    const l = await call("POST", "/demo/load", { sample: "configured" }, AUTHOR);
    ok("setup: Demo › Load the configured checkpoint", l.status === 201 || l.status === 200, l.status);
  }
  const vv = sql("select id from combination where combination_key='vv.single'");
  ok("setup: Visitors › Visitor visa is released on the checkpoint", released() && !!vv);
  if (!vv) process.exit(2);
  return vv;
}

export type Written = { id: string | null; of: (fact: string) => string; why: (fact: string) => string };
/** A real copy of the form for one person: what the filler was asked to write into each form field (the copy's request
 *  file beside the PDF, as check_runtime_r1d.ts reads it), by fact ("" when none of its fields is written), and why. */
export async function written(caseId: string, form: string, subject: string): Promise<Written> {
  const id = await generateCopy(caseId, form, subject);
  const raw = id ? sql(`select json_build_object('path', path, 'result', result_json)::text from form_instance where id='${id}' and status='GENERATED'`) : null;
  const row = raw ? JSON.parse(raw) as { path: string; result: { boxes: { box: string; fact: string | null; result: string; why?: string | null; row?: number | null }[] } } : null;
  const request = row ? join(REPO, row.path.replace(/\.pdf$/, ".request.json")) : "";
  const values = (row && existsSync(request) ? JSON.parse(readFileSync(request, "utf8")).values : {}) as Record<string, string>;
  // A fact can fill more than one form field of a form (IMM 5257 has the spouse's family name in its marital status part
  // too): every first-row field of the fact, the written values joined with " | " in form order.
  const own = (fact: string) => (row?.result.boxes ?? []).filter((b) => b.fact === fact && (b.row === null || b.row === undefined || b.row === 0));
  return { id: row ? id : null, of: (fact) => own(fact).filter((b) => b.result === "written").map((b) => values[b.box] ?? "").join(" | "), why: (fact) => own(fact).map((b) => b.why ?? b.result).join(" | ") || "(no form field)" };
}
