// Test scaffolding (P-33), never product code and never the sample load: makes a draft's answer-key tests ready for a
// real release (G2, C5.5) through the API only, as the author and the immigration expert would on Tests. For each form
// map the gate lists as missing or not signed, it writes a key for a made-up family whose expected values are what the
// map writes for that family today, has the expert sign it and runs it. The product never fills expected values from a
// run (G4 concept §4): only suites that need "a release", and not the gate itself, use this. The gate's own suites prove
// pass and fail with hand-written values (tests/check_g2_answer_key_gate*.ts, the E1 key of tests/g4_e1_key.ts).
// G1's sourceEveryNumber is to join this file (the tech lead on #568: one shared helper).
import type { Res } from "../runtime/api.ts";
import { sample } from "../g4_e1_key.ts";

type Call = (method: string, path: string, body?: unknown, actor?: string | null) => Promise<Res>;
type Line = { person: string; target: string; got: string; pass: boolean };

/** The made-up family the helper writes once per copy: evidence lane E1's household (Sample; never a client), whose
 *  many facts let most forms apply. */
export const HELPER_FAMILY = (key: string) => ({ ...sample, key, label: "Release helper: E1 household (Sample)" });
const PRINCIPAL = (sample.people as { id: string; role: string }[]).find((p) => p.role === "principal")!.id;

/** Every gated, untested or unsigned field map of the combination gets a signed, passing key. Returns what it did,
 *  per form, and why a form could not be made ready (a form that does not apply to the family, for instance). */
export async function passEveryAnswerKey(call: Call, combinationId: string, o: { author?: string; expert?: string; familyKey?: string } = {}) {
  const author = o.author ?? "user-A", expert = o.expert ?? "user-C", familyKey = o.familyKey ?? "release-helper";
  const fams = (await call("GET", "/answer-keys/families", undefined, author)).body?.families ?? [];
  let fam = fams.find((f: { key: string }) => f.key === familyKey);
  if (!fam) { const made = await call("POST", "/answer-keys/families", HELPER_FAMILY(familyKey), author); if (made.status !== 201) return { ready: [], failed: [{ form: "", why: `family: ${made.status} ${JSON.stringify(made.body).slice(0, 200)}` }] }; fam = made.body; }
  const view = (await call("GET", `/combinations/${combinationId}`, undefined, author)).body;
  const items = (view?.draft?.answer_keys?.items ?? []) as { item_kind: string; item_ref: string; edition: string | null; result: string; keys: { key_id: string; state: string }[] }[];
  const ready: string[] = [], failed: { form: string; why: string }[] = [];
  for (const it of items.filter((x) => x.item_kind === "field_map" && ["no_test", "unsigned", "not_run", "failed"].includes(x.result))) {
    let id = it.keys[0]?.key_id as string | undefined;
    if (!id) {
      // A first value for one box the map writes, so the key is accepted; the run then says what every box gets.
      const boxes = (await call("GET", `/combinations/${combinationId}/answer-keys/boxes?form=${encodeURIComponent(it.item_ref)}`, undefined, author)).body?.boxes ?? [];
      const first = boxes.find((b: { whose: string }) => b.whose === "form_subject") ?? boxes[0];
      if (!first) { failed.push({ form: it.item_ref, why: "no box to expect" }); continue; }
      const k = await call("POST", `/combinations/${combinationId}/answer-keys`, { family_id: fam.id, item_kind: "field_map", item_ref: it.item_ref, expected: { edition: it.edition, people: { [PRINCIPAL]: { [first.data_path]: "" } } } }, author);
      if (k.status !== 201) { failed.push({ form: it.item_ref, why: `key: ${k.status} ${JSON.stringify(k.body?.detail ?? k.body).slice(0, 200)}` }); continue; }
      id = k.body.id;
    }
    const r = await call("POST", `/answer-keys/${id}/run`, undefined, author);
    const lines = (r.body?.lines ?? []) as Line[];
    const people: Record<string, Record<string, string>> = {};
    for (const l of lines) if (l.person && l.target.includes("[") && l.got !== "") (people[l.person] ??= {})[l.target] = l.got;
    if (!Object.keys(people).length) { failed.push({ form: it.item_ref, why: `the form writes nothing for the family (${lines.find((l) => !l.pass)?.target ?? "no line"})` }); continue; }
    const cur = (await call("GET", `/answer-keys/${id}`, undefined, author)).body;
    const put = await call("PUT", `/answer-keys/${id}`, { expected: { edition: it.edition, people }, version: cur.version, ...(cur.state === "SIGNED" ? { reason: "Release helper: the map changed" } : {}) }, author);
    if (put.status !== 200) { failed.push({ form: it.item_ref, why: `update: ${put.status} ${JSON.stringify(put.body?.detail ?? put.body).slice(0, 200)}` }); continue; }
    const again = await call("POST", `/answer-keys/${id}/run`, undefined, author);
    if (again.body?.result !== "PASSED") { failed.push({ form: it.item_ref, why: `run: ${again.body?.result} ${JSON.stringify((again.body?.lines ?? []).find((l: Line) => !l.pass) ?? {}).slice(0, 200)}` }); continue; }
    const sign = await call("POST", `/answer-keys/${id}/sign`, { version: put.body.version }, expert);
    if (sign.status !== 200) { failed.push({ form: it.item_ref, why: `sign: ${sign.status} ${JSON.stringify(sign.body?.detail ?? sign.body).slice(0, 200)}` }); continue; }
    ready.push(it.item_ref);
  }
  return { ready, failed };
}
