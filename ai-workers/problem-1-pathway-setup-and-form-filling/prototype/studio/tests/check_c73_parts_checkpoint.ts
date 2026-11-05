// C7.3 on the configured checkpoint (P-322; review M1–M3 on #1075): an Online form's answer sheet is laid out from the
// form's own parts as its case's release froze them, in the order the form's field list prints them. Pass and fail per
// rule: the form's order, not the alphabet (M1); a part with no name at release keeps its key, title and tick when a
// person names it on To review after the release (M2, M3: released means frozen); nothing it grouped moves to "Other
// questions". Runs on a copy with the configured checkpoint loaded. US$0, no live AI.
//   zsh studio/tools/isolated.sh runtime_c73p 4435 start && curl -s -XPOST localhost:4435/api/demo/reset -H 'x-actor: user-A' -H 'content-type: application/json' -d '{"confirm":"RESET"}' && curl -s -XPOST localhost:4435/api/demo/load -H 'x-actor: user-A' -H 'content-type: application/json' -d '{"sample":"configured"}' >/dev/null && tsx studio/tests/check_c73_parts_checkpoint.ts 4435 xr_studio_runtime_c73p
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OFFICER, call, fillEverything, itemsOf, needVisitorVisa, ok, openCase, prepare, rec, sql, yearsAgo } from "../acceptance/lib/m3.ts";

type Section = { key: string; title: string; named?: false; version: string; entered: { by: string } | null; out_of_date: boolean; answers: { fact: string }[]; waiting: unknown[] };
type Sheet = { order_basis: string; sections: Section[] };
const SOLUTION = join(import.meta.dirname, "..", "..", "..");

const vv = needVisitorVisa();
const c = await openCase(vv, [{ role: "principal", name: "Sample Client A", dob: yearsAgo(40) }, { role: "spouse_or_partner", name: "Sample Spouse A", dob: yearsAgo(38) }]);
const P = c.subjects["Sample Client A"];
/** The officer files a form Online on the case (C11.6), then reads its sheet. */
async function online(form: string): Promise<string> {
  const p = (await prepare(c.id)).p;
  const it = itemsOf(p, P, form)[0];
  if (it && it.channel !== "ONLINE") {
    const r = await call("PATCH", `/runtime/items/${it.id}/channel`, { channel: "ONLINE", version: p?.version }, OFFICER);
    if (r.status !== 200) { console.log(`STOP  setup: ${form} could not be filed Online (C11.6): ${r.status}`); process.exit(2); }
  }
  if (!it) { console.log(`STOP  setup: no ${form} item for the principal on this release`); process.exit(2); }
  return it.id;
}
const sheet = async (id: string) => (await call("GET", `/runtime/items/${id}/answer-sheet`, undefined, OFFICER)).body as Sheet;
const fieldList = (form: string) => {
  const m = JSON.parse(sql(`select json_agg(m)::text from config_release r join pack_work_pin w on w.config_release_id = r.id, jsonb_array_elements(r.snapshot->'field_maps') m where w.case_id = '${c.id}' and m->>'form_number' = '${form}'`) ?? "[]")[0] as { form_edition: string; inventory_file: string };
  const at = new Map((JSON.parse(readFileSync(join(SOLUTION, m.inventory_file), "utf8")) as { fields: { data_path?: string | null }[] }).fields.map((f) => f.data_path).filter((x): x is string => !!x).map((k, i) => [k, i] as const));
  return { edition: m.form_edition, at };
};

const app = await online("IMM 5257");
await fillEverything(c.id);
// M1: the form's own order. Each section's first form field, by the form's field list, comes after the one before.
{
  const s = await sheet(app), { edition, at } = fieldList("IMM 5257");
  const firstOf = (title: string) => {
    const keys = JSON.parse(sql(`select coalesce(json_agg(p.payload->'fieldKeys'), '[]')::text from proposal_item p where p.kind = 'section' and p.form_edition = '${edition}' and (p.payload->>'label' = '${title.replace(/'/g, "''")}' or p.decided_key in (select section_key from logical_section where title = '${title.replace(/'/g, "''")}'))`) ?? "[]").flat() as string[];
    return Math.min(...keys.map((k) => at.get(k) ?? Number.MAX_SAFE_INTEGER));
  };
  const firsts = s.sections.filter((x) => x.title !== "Other questions").map((x) => firstOf(x.title));
  ok("C7.3 (review M1): the sheet's sections follow the order the form's field list prints them", s.order_basis === "form_parts" && firsts.length > 3 && firsts.every((n, i) => n < Number.MAX_SAFE_INTEGER && (i === 0 || n > firsts[i - 1])), { titles: s.sections.map((x) => x.title), firsts });
  // The bug it guards against: the snapshot's field map is sorted by data path, so its order is the alphabet's.
  const byPath = (title: string) => { const k = JSON.parse(sql(`select coalesce(json_agg(p.payload->'fieldKeys'), '[]')::text from proposal_item p where p.kind = 'section' and p.form_edition = '${edition}' and (p.payload->>'label' = '${title.replace(/'/g, "''")}' or p.decided_key in (select section_key from logical_section where title = '${title.replace(/'/g, "''")}'))`) ?? "[]").flat() as string[]; return [...k].sort()[0] ?? ""; };
  const titles = s.sections.filter((x) => x.title !== "Other questions").map((x) => x.title);
  const alphabet = [...titles].sort((a, b) => byPath(a).localeCompare(byPath(b)));
  ok("C7.3 (review M1, fail): where the data paths' alphabet orders the parts otherwise, the sheet does not follow it", JSON.stringify(alphabet) !== JSON.stringify(titles), { alphabet, titles });
}

// M2, M3: a part with no name at release, named on To review after it.
const sch = await online("IMM 5257 SCH1");
const before = await sheet(sch);
// A part still waiting on To review now (on a copy used before, an earlier run named one: it is not taken again).
const waitingId = (title: string) => sql(`select id from proposal_item where kind = 'section' and status = 'waiting' and payload->>'label' = '${title.replace(/'/g, "''")}' limit 1`) || null;
const part = before.sections.find((x) => x.named === false && (x.answers.length || x.waiting.length) && !!waitingId(x.title));
ok("C7.3: a part with no name at release is on the sheet, marked not named", !!part, before.sections.map((x) => `${x.title}${x.named === false ? " (not named)" : ""}`));
if (part) {
  const tick = await call("POST", `/runtime/items/${sch}/screens/${part.key}/entered`, { version: part.version }, OFFICER);
  ok("C7.3: a part with no name can be ticked as entered (its key holds for the release's life)", tick.status === 201, tick.body);
  const id = waitingId(part.title);
  const keys = JSON.parse(sql(`select (payload->'fieldKeys')::text from proposal_item where id = '${id}'`) ?? "[]");
  const named = await call("POST", "/review/proposals/decide", { ids: [id], action: "edit", reason: "Named after the release (C7.3 check)", payload: { kind: "section", label: `Named after the release ${Date.now().toString(36)}`, aliases: [], fieldKeys: keys } }, "user-C");
  if (named.status >= 300) { console.log(`STOP  setup: naming the part on To review was refused: ${named.status} ${JSON.stringify(named.body).slice(0, 200)}`); process.exit(2); }
  const after = await sheet(sch), same = after.sections.find((x) => x.key === part.key);
  ok("C7.3 (review M3): naming a part after the release leaves its released case's sheet as released: same key, same title", !!same && same.title === part.title && after.sections.map((x) => x.key).join() === before.sections.map((x) => x.key).join(), after.sections.map((x) => `${x.key}=${x.title}`));
  ok("C7.3 (review M2, M3, fail): its tick is kept and it is not Out of date: nothing moved to \"Other questions\"", same?.entered?.by === OFFICER && same.out_of_date === false && !after.sections.some((x) => x.title === "Other questions" && x.answers.length > (before.sections.find((y) => y.title === "Other questions")?.answers.length ?? 0)));
}
process.exitCode = rec.summary() ? 1 : 0;
