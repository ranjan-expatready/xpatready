// S2 (SA-1B-174, P-65 (a); forms lane): a form's fill trial counts for exactly one form edition and one version of its
// field map. The evidence lane's record (evidence-lane/E1/<form>/STATUS.md) says whether the trial passed; the register
// samples/fill-trials.json says which edition (the official file's SHA-256) and which field map (map_version) it was
// run on. A new edition, or a changed map, is "Checked copy, not for filing" until its own trial is recorded and passes.
// The E1 trials of 23 Oct ran P1's values through p5/fill.py, not through the studio's field map, so their map version
// is not recorded (map_version null): they count for their edition only. A trial recorded from now on names the map
// version it ran on, and counts only while the map is unchanged (S2, Lead's call in #458).
// Pure apart from reading those two files; no decorators, so a check loads it directly.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { PROTOTYPE, STUDIO } from "./core.ts";

/** One map entry as the snapshot carries it (engine/snapshot.ts field_maps[].entries). */
export type MapEntry = { data_path: string; fact?: string | null; outcome?: string | null; person?: string | null; row?: number | null; transform?: string | null; condition?: unknown; option_map?: unknown };
/** One form edition's field map as the snapshot carries it. */
export type EditionMap = { form_number: string; form_edition?: string | null; form_sha256?: string | null; entries: MapEntry[] };
/** One recorded trial: the edition and map it ran on, and where its verdict is written. */
export type TrialRecord = { form: string; edition: string; form_sha256: string; map_version: string | null; status_file: string; recorded_on: string; note?: string };

/** What a filled box depends on, in a stable order: the version of the map a trial ran on. Row bookkeeping (an entry's
 *  item version, captions, confidence, the AI's quote) does not change what is written, so it is left out. */
export function mapVersion(entries: MapEntry[]): string {
  const rows = entries.map((e) => [e.data_path, e.fact ?? null, e.outcome ?? null, e.person ?? null, e.row ?? null, e.transform ?? null, e.condition ?? null, e.option_map ?? null])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])) || String(a[3]).localeCompare(String(b[3])) || Number(a[4] ?? 0) - Number(b[4] ?? 0));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex").slice(0, 16);
}

export const TRIALS_FILE = join(STUDIO, "samples", "fill-trials.json");
export const readTrials = (file = TRIALS_FILE): TrialRecord[] => { try { return (JSON.parse(readFileSync(file, "utf8")) as { trials?: TrialRecord[] }).trials ?? []; } catch { return []; } };

/** The verdict in an evidence record: "Passes …" or "The product's part passes …", never "… does not pass …". */
export function verdictPasses(statusText: string): boolean {
  const verdict = /## Verdict[^\n]*\n+\*\*([^*]+)\*\*/.exec(statusText)?.[1] ?? "";
  // "Passes in Adobe … does not pass from the product's file alone" (IMM 1344) is not a pass of the product's file.
  return (/^Passes\b/.test(verdict) || /^The product's part passes\b/.test(verdict)) && !/\bdoes not pass\b/.test(verdict);
}

export type TrialAnswer = { passed: boolean; why: string | null; record: TrialRecord | null };
export const TRIAL_WORDS = {
  noEdition: (form: string) => `${form}: this copy's form edition is not known, so its filling is not proven: for checking only, not for filing.`,
  none: (form: string, edition: string) => `${form}: no fill trial is recorded for edition ${edition}, so this copy is for checking only, not for filing.`,
  otherMap: (form: string, edition: string, on: string) => `${form}: the fill trial of edition ${edition} (${on}) ran on an earlier version of its field map; the map has changed since, so this copy is for checking only, not for filing until a new trial passes.`,
  notPassed: (form: string, edition: string) => `${form}: the fill trial of edition ${edition} did not pass from the product's file, so this copy is for checking only, not for filing.`,
};

/** Whether a form's filling is proven for this edition and this field map (P-65 (a), SA-1B-174). */
export function trialFor(m: EditionMap | null | undefined, trials: TrialRecord[] = readTrials(), readStatus = (f: string) => readFileSync(join(PROTOTYPE, "..", f), "utf8")): TrialAnswer {
  const form = m?.form_number ?? "This form";
  if (!m?.form_sha256) return { passed: false, why: TRIAL_WORDS.noEdition(form), record: null };
  const edition = m.form_edition ?? m.form_sha256.slice(0, 12);
  const mine = trials.filter((t) => t.form === m.form_number && t.form_sha256 === m.form_sha256);
  if (!mine.length) return { passed: false, why: TRIAL_WORDS.none(form, edition), record: null };
  const version = mapVersion(m.entries);
  // A record with its map version counts only for that map; one without (the E1 trials) counts for its edition.
  const same = mine.find((t) => t.map_version === version) ?? mine.find((t) => t.map_version === null);
  if (!same) return { passed: false, why: TRIAL_WORDS.otherMap(form, edition, mine[mine.length - 1].recorded_on), record: mine[mine.length - 1] };
  let text = ""; try { text = readStatus(same.status_file); } catch { /* no record: not proven */ }
  return verdictPasses(text) ? { passed: true, why: null, record: same } : { passed: false, why: TRIAL_WORDS.notPassed(form, edition), record: same };
}
