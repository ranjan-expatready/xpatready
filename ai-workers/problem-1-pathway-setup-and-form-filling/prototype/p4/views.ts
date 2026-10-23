// P4 generated views (W1 3.7: "Rules, not AI: assembling the views is a fixed projection"). Pure functions:
// released configuration in, three view definitions out. Nothing here knows any form, field or section by
// name; a configuration change changes the views with no code change.
//   PQR view: the client blocks of the prospect and lead tiers (6.1, 3.7 r1).
//   SQR: per answering person, every client fact the forms read, asked once, minus what the PQR already asked
//        (shown pre-filled), minus what staff or a profile record supply (never asked), with documents as the
//        first source where a verified document supplies the fact (3.7 r2, r3, r4; 7.2 r1, r3, r5).
//   Staff working view: the full set, every tier, by library section and person (3.7, 8.1 r1, r12).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PROTOTYPE = join(import.meta.dirname, "..");
const CLIENT = "client_questionnaire", DOC = "verified_document";
const NEVER_ASKED = new Set(["staff_working_view", "profile_record", "existing_record"]);
const ONCE_PER_CASE = "The application (once per case)";

/** Who answers in a filing with a principal applicant and an accompanying partner who also applies. */
export const ANSWERERS = ["principal", "partner"] as const;
type Answerer = (typeof ANSWERERS)[number];
const OTHER: Record<Answerer, Answerer> = { principal: "partner", partner: "principal" };
const NAME: Record<string, string> = { principal: "Principal applicant", partner: "Spouse or partner (also applying)" };

/** Which answering people a form is completed for, from its released 'who'. */
function formFor(who: string): Answerer[] {
  switch (who) {
    case "each_applicant": case "each_person": case "each_adult_18_plus": return ["principal", "partner"];
    case "principal_applicant": case "couple_once": return ["principal"];
    case "spouse_or_partner": return ["partner"];
    default: return [];
  }
}

/** The person a box is about, for a form completed for `subject`, and who is asked for it. */
function aboutWhom(person: string, subject: Answerer): { about: string; askedOf: Answerer | null } {
  switch (person) {
    case "form_subject": return { about: NAME[subject], askedOf: subject };
    case "subject_spouse_or_partner": return { about: NAME[OTHER[subject]], askedOf: OTHER[subject] };
    case "subject_parent_1": case "subject_parent_2": return { about: `${NAME[subject]}: parents (each parent)`, askedOf: subject };
    case "subject_sibling": return { about: `${NAME[subject]}: brothers and sisters (each)`, askedOf: subject };
    case "subject_child": return { about: "Children (each child)", askedOf: "principal" }; // a child's questions go to the parent (3.7 example)
    case "representative": return { about: "Representative", askedOf: null }; // a profile record, never a client
    default: return { about: ONCE_PER_CASE, askedOf: "principal" };
  }
}

function inventories() {
  const dir = join(PROTOTYPE, "p1", "inventory");
  const bySha = new Map<string, Map<string, any>>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".inventory.json") && !x.includes(".text."))) {
    const inv = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (inv.summary?.sha256) bySha.set(inv.summary.sha256, new Map((inv.fields ?? []).filter((x: any) => x.data_path).map((x: any) => [x.data_path, x])));
  }
  return bySha;
}

/** Whether a box holds the fact's own value. A box holding a value derived from the fact (a yes/no "is there
 *  any…", a tick for "calling code is 1") or one part of it (an address's country, a phone number's area code) does not, so
 *  it lends the question neither its answer list nor its character limit. */
const holdsValue = (box: any, transform: unknown) => box.ui !== "checkButton" && !/\bderive|_part:/.test(String(transform ?? ""));

/** The answers a box offers, as a client would see them. Inventories keep choices in three shapes: a choice
 *  list's [labels, values]; a radio group's or a looked-up list's [label, value] pairs; a tick box's [on, off].
 *  (Found in P4: the first views read every shape as the first, showing "*No, N" or "1, 0" as answers and no
 *  country lists, and gave a whole address the postal code's 10-character limit.) */
function choices(box: any): string[] {
  const pairs = box.options_resolved ?? (box.ui === "exclGroup" ? box.options : null);
  const labels: unknown[] = pairs ? pairs.map((o: any) => o?.[0]) : ((box.options ?? [])[0] ?? []);
  return labels.map((s) => String(s ?? "").replace(/^\s*\*\s*/, "").trim()).filter(Boolean);
}

export type Question = {
  fact: string; label: string; section: string; about: string; tier: string; collected_from: string; repeats: string;
  status: "asked" | "pre-filled from the PQR" | "from an uploaded document; asked only if it is missing";
  used_by: { form: string; box: string; caption: string; condition?: string }[];
  allowed_values: string[]; shortest_limit: { chars: number; form: string } | null; asked_because: string;
};

export function buildViews(config: any) {
  const inv = inventories();
  const field = new Map<string, any>((config.canonical_fields ?? []).map((f: any) => [f.id, f]));
  const place = new Map<string, any>((config.placements ?? []).map((p: any) => [p.fact, p]));
  const section = new Map<string, any>((config.sections ?? []).map((s: any) => [s.id, s]));
  const formOf = (edition: string) => (config.forms ?? []).find((f: any) => edition.startsWith(`${f.form_number} `));
  const label = (fact: string) => field.get(fact)?.meaning ?? fact;

  // Every (answerer, about, fact) a released form reads, with the boxes that read it.
  const reads = new Map<string, { askedOf: Answerer; about: string; fact: string; used_by: Question["used_by"]; options: Set<string>; limits: { chars: number; form: string }[] }>();
  const unplaced = new Set<string>(); const handRoute: { form: string; box: string; caption: string; reason: string }[] = [];
  const staffOnly = new Map<string, Set<string>>();
  const formsReading = new Map<string, Set<string>>(); // every form that reads a fact, client-asked or not
  for (const m of config.field_maps ?? []) {
    const form = formOf(m.form_edition);
    const boxes = inv.get(m.form_sha256) ?? new Map();
    const subjects = form && form.status !== "dismissed" ? formFor(form.who) : [];
    for (const e of m.entries) {
      const box = boxes.get(e.data_path) ?? {};
      if (e.outcome === "unresolved") { handRoute.push({ form: m.form_edition, box: e.data_path, caption: box.caption ?? "", reason: e.unresolved_reason ?? "" }); continue; }
      if (e.outcome !== "mapped" || !e.fact) continue;
      if (!place.has(e.fact)) unplaced.add(e.fact);
      if (subjects.length) formsReading.set(e.fact, (formsReading.get(e.fact) ?? new Set()).add(m.form_edition));
      for (const subject of subjects) {
        // A fact the configuration places once per case is asked once, of the principal, about the application,
        // whichever applicant's form reads it (3.7 r4). Found on the regeneration: with IMM 1295 for each applicant
        // (D20) the partner was asked the case's service language again.
        const w0 = aboutWhom(e.person, subject);
        const w = w0.askedOf && place.get(e.fact)?.repeats === "once_per_case" ? { about: ONCE_PER_CASE, askedOf: "principal" as Answerer } : w0;
        if (!w.askedOf) { staffOnly.set(e.fact, (staffOnly.get(e.fact) ?? new Set()).add(w.about)); continue; }
        const k = `${w.askedOf}|${w.about}|${e.fact}`;
        const r = reads.get(k) ?? { askedOf: w.askedOf, about: w.about, fact: e.fact, used_by: [] as Question["used_by"], options: new Set<string>(), limits: [] as { chars: number; form: string }[] };
        if (!r.used_by.some((u) => u.form === m.form_edition && u.box === e.data_path)) r.used_by.push({ form: m.form_edition, box: e.data_path, caption: box.caption ?? "", ...(form?.status === "conditional" && form.condition_plain ? { condition: form.condition_plain } : {}) });
        if (holdsValue(box, e.transform)) {
          for (const o of choices(box)) if (![...r.options].some((x) => x.toLowerCase() === o.toLowerCase())) r.options.add(o);
          if (box.max_chars) r.limits.push({ chars: box.max_chars, form: m.form_edition });
        }
        reads.set(k, r);
      }
    }
  }

  const question = (r: any, status: Question["status"]): Question => {
    const p = place.get(r.fact) ?? {};
    const limit = r.limits.sort((a: any, b: any) => a.chars - b.chars)[0] ?? null;
    return {
      fact: r.fact, label: label(r.fact), section: section.get(p.section_id)?.title ?? p.section_id ?? "(not placed)", about: r.about, tier: p.tier ?? "", collected_from: p.collected_from ?? "", repeats: p.repeats ?? "",
      status, used_by: r.used_by, allowed_values: [...r.options], shortest_limit: limit,
      asked_because: `${r.used_by.length === 1 ? "one box reads it" : `${r.used_by.length} boxes read it`}: ${[...new Set(r.used_by.map((u: any) => u.form))].join(", ")}`,
    };
  };
  const clientFact = (fact: string) => place.get(fact)?.collected_from === CLIENT || place.get(fact)?.collected_from === DOC;
  const prospect = (fact: string) => ["lead", "prospect"].includes(place.get(fact)?.tier);

  // PQR: the prospect- and lead-tier client facts about the prospect (the principal) and the application,
  // in blocks by section. A relative's facts are not PQR questions (found when the first views were checked:
  // the parents' and children's marital status had been marked pre-filled).
  const PQR_ABOUT = new Set([NAME.principal, ONCE_PER_CASE]);
  const pqrQs = [...reads.values()].filter((r) => r.askedOf === "principal" && PQR_ABOUT.has(r.about) && place.get(r.fact)?.collected_from === CLIENT && prospect(r.fact)).map((r) => question(r, "asked"));
  const blocks = (qs: Question[]) => [...new Set(qs.map((q) => q.section))].map((s) => ({ block: s, questions: qs.filter((q) => q.section === s) }));
  const pqrKeys = new Set(pqrQs.map((q) => `${q.about}|${q.fact}`));

  // SQR per answering person: fewest questions; nothing asked twice; never a staff or profile fact.
  const sqr = Object.fromEntries(ANSWERERS.map((a) => {
    const qs = [...reads.values()].filter((r) => r.askedOf === a && clientFact(r.fact)).map((r) =>
      question(r, place.get(r.fact)?.collected_from === DOC ? "from an uploaded document; asked only if it is missing" : pqrKeys.has(`${r.about}|${r.fact}`) ? "pre-filled from the PQR" : "asked"));
    const byAbout = [...new Set(qs.map((q) => q.about))].map((about) => ({ about, blocks: blocks(qs.filter((q) => q.about === about)) }));
    return [a, { answerer: NAME[a], forms: (config.forms ?? []).filter((f: any) => f.status !== "dismissed" && formFor(f.who).includes(a)).map((f: any) => ({ form: f.form_number, status: f.status, shown_when: f.condition_plain ?? null })), people: byAbout, counts: { asked: qs.filter((q) => q.status === "asked").length, prefilled: qs.filter((q) => q.status === "pre-filled from the PQR").length, from_documents: qs.filter((q) => q.status.startsWith("from an uploaded")).length } }];
  }));

  // Staff working view: every placed fact, by library section, with where it comes from and what reads it.
  const readers = formsReading;
  const checksOn = new Map<string, string[]>();
  for (const c of config.checks ?? []) for (const f of c.inputs ?? []) checksOn.set(f, [...(checksOn.get(f) ?? []), c.id]);
  const aboutOf = new Map<string, Set<string>>();
  for (const r of reads.values()) aboutOf.set(r.fact, (aboutOf.get(r.fact) ?? new Set()).add(r.about));
  for (const [f, s] of staffOnly) for (const x of s) aboutOf.set(f, (aboutOf.get(f) ?? new Set()).add(x));
  const staff = (config.sections ?? []).map((s: any) => ({
    section: s.title,
    facts: (config.placements ?? []).filter((p: any) => p.section_id === s.id).map((p: any) => ({
      fact: p.fact, label: label(p.fact), tier: p.tier, collected_from: p.collected_from, client_visible: p.client_visible, repeats: p.repeats,
      never_asked_of_client: NEVER_ASKED.has(p.collected_from), about: [...(aboutOf.get(p.fact) ?? [])], read_by_forms: [...(readers.get(p.fact) ?? [])], checks: (checksOn.get(p.fact) ?? []).length,
    })),
  })).filter((s: any) => s.facts.length);

  return {
    generated_from: { configuration_version: config.configuration_version, status: config.status },
    pqr: { blocks: blocks(pqrQs), gates: (config.gates ?? []).length ? config.gates : "no indicative eligibility gates in this configuration (activity 3.6 not drafted in P2)", count: pqrQs.length },
    sqr, staff, hand_route: handRoute, unplaced_facts: [...unplaced],
  };
}
