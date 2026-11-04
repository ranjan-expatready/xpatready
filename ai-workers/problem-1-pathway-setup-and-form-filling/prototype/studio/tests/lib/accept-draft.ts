// (P-214 debug note: this file is scaffolding only; see the qa193 order row.)
// Test scaffolding (P-33), never product code: decides a field-map draft's clean proposals one by one, as a person would
// on the form-field page. Suites used the page's bulk accept as a shortcut for this; since C3.2 (P-121, P-296 (1)) the bulk
// accept takes only High exact reuse matches, and a saved one-round draft has none. Each decision here is the single
// Accept (POST /jobs/:id/items/:item), so every rule still runs, and it records the same field the bulk accept did
// (REUSE: the library field it matched; NEW: its own new field). REUSE: every waiting exact reuse match. NEW: every
// waiting new definition no library field could fit (one that could fit needs a reason: BR-7, left to the suite).
import type { Res } from "../runtime/api.ts";

type Call = (method: string, path: string, body?: unknown, actor?: string) => Promise<Res>;
type Item = { id: string; outcome: string; decision: string; candidates?: { score: number }[] | null };

/** Accepts the waiting clean proposals of the given kinds one by one; returns how many it accepted. A refusal stops it. */
export async function acceptCleanOneByOne(call: Call, jobId: string, outcomes: ("REUSE" | "NEW")[], actor?: string): Promise<number> {
  const items = ((await (actor ? call("GET", `/jobs/${jobId}`, undefined, actor) : call("GET", `/jobs/${jobId}`))).body?.items ?? []) as Item[];
  const clean = items.filter((i) => i.decision === "PENDING" && outcomes.includes(i.outcome as "REUSE" | "NEW") && (i.outcome === "REUSE" || !(i.candidates ?? []).some((c) => c.score >= 0.55)));
  for (const i of clean) {
    const body = { decision: "ACCEPTED" };
    const r = await (actor ? call("POST", `/jobs/${jobId}/items/${i.id}`, body, actor) : call("POST", `/jobs/${jobId}/items/${i.id}`, body));
    if (r.status >= 300) throw new Error(`accepting ${i.id} one by one was refused (${r.status}): ${JSON.stringify(r.body).slice(0, 200)}`);
  }
  return clean.length;
}
