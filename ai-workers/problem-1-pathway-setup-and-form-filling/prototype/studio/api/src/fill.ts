// Supported actual-PDF proof from the stored configuration: the renderer says which boxes of a form a person's
// confirmed sample facts cover; the P5 transformation executor turns each value into the box's own format; the P5
// filler (p5/fill.py, E5 append-only writer) writes a copy of the official form and reads every value back, checks
// nothing else changed and that the IRCC signatures still verify. Only confirmed facts are written.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { formValues } from "../../engine/form-values.ts";
import { dependentListsFor } from "../../engine/field-format.ts";
import { personSteps } from "../../engine/form-steps.ts";
import type { BoxRow } from "../../engine/render.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { pdfMapInUse } from "../../engine/programs.ts";
import { Audit, Db, fail, PROTOTYPE, PY, ROOT, SOLUTION, VAR, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** One form filled from a coverage (which value each form field reads, and whether it is a confirmed fact): each value in
 *  the form field's own format or code, signatures and the oath never written, the official copy written append-only by
 *  p5/fill.py and read back. Shared by the configuration preview (sample facts) and a case (its confirmed answers,
 *  runtime lane S-11). Writes <dir>/<base>.pdf, .request.json and .report.json. */
/** A form's field list named by a release (`inventory_file`), read only from inside the solution folder and only as a
 *  .json file (Devin on #592: a release is data, so a "../" path must never reach another file). Null when it is not. */
export function solutionFile(rel: string | null | undefined): string | null {
  if (!rel || !/\.json$/i.test(rel)) return null;
  // Break m-5 on #592: the real path, links followed, must stay inside the solution folder (a committed link may point out).
  const root = realpathSync(SOLUTION), abs = resolve(SOLUTION, rel);
  let real: string; try { real = realpathSync(abs); } catch { return null; }
  return real.startsWith(`${root}${sep}`) && !real.split(sep).includes("node_modules") ? real : null;
}

export async function writeForm(snapshot: Snapshot, cov: { boxes: BoxRow[] }, form: string, dir: string, base: string, opts: { notForFiling?: boolean; channel?: string } = {}) {
  // F1: the PDF edition. A line filed Online is never filled as a PDF, even when the library also has its PDF (review 18);
  // online filling needs the browser extension (later wave, W1-02, P-102).
  const line = (snapshot.forms as { form_number: string; channel?: string }[]).find((f) => f.form_number === form);
  // C-4: a Not needed line is never filled. P-145: an Online line is filled only as a "Copy, not for filing" (a case copy).
  // C11.6: on a case, the channel the person's form item was moved to (inside what IRCC accepts) replaces the line's.
  const channel = opts.channel ?? line?.channel;
  if (channel === "NOT_NEEDED") fail(`${form} is Not needed here: the IRCC account asks it itself, so nothing is filled.`, HttpStatus.CONFLICT);
  if (channel === "ONLINE" && !opts.notForFiling) fail(`${form} is filed Online here: it needs the browser extension (later wave), so the product does not fill it. File it as a PDF upload to fill its PDF.`, HttpStatus.CONFLICT);
  // P-32: the edition in use (the newest mapped PDF edition), never the first the snapshot lists (its oldest).
  const map = pdfMapInUse(snapshot.field_maps, form);
  // Breaker m2 (edition in use): the words name the edition in use, so a newer edition missing its file is said so.
  const ed = map?.form_edition ? ` (${map.form_edition}, the edition in use)` : "";
  if (!map?.official_file || !map.inventory_file) fail(`This form's official file or form field list${ed} is not recorded; it cannot be filled.`);
  const invFile = solutionFile(map.inventory_file);
  if (!invFile) fail(`This form's form field list${ed} is not in the product's own files; it cannot be filled.`);
  const inv = JSON.parse(readFileSync(invFile!, "utf8"));
  inv.dependent_lists = dependentListsFor(map.inventory_file); // BK-26: lists the form fills from another box's answer
  const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
  // G4 (C5.7): the value step is engine code (engine/form-values.ts), shared with the answer-key runner.
  const { boxes, values } = formValues(snapshot, map, inv, cov.boxes);
  // F1 slice 2 (evidence lane F1, F2, F4): what a person does on the filled PDF before the form's own Validate passes.
  const steps = personSteps(inv.fields, values, inv.groups ?? []);
  const out = join(dir, `${base}.pdf`), req = join(dir, `${base}.request.json`);
  // F1 slice 2b (evidence lane F5): each box's page field (its SOM name) gets the same value; on a static form the filler
  // sets it with its appearance, so the file shows its values outside Adobe. A dynamic form has none: nothing is set.
  const page_fields = Object.fromEntries(Object.entries(values).flatMap(([p, v]) => (box.get(p)?.som ? [[box.get(p).som, v]] : [])));
  writeFileSync(req, JSON.stringify({ form_file: map.official_file, values, page_fields, out }, null, 1));
  let report: any;
  try { const { stdout } = await run(PY, ["-I", join(PROTOTYPE, "p5", "fill.py"), req], { cwd: ROOT, timeout: 180_000, maxBuffer: 20 * 1024 * 1024 }); report = JSON.parse(stdout.trim().split("\n").pop()!); }
  catch (e) { fail(`The filler failed: ${(e as Error).message.slice(0, 300)}`, HttpStatus.UNPROCESSABLE_ENTITY); }
  writeFileSync(join(dir, `${base}.report.json`), JSON.stringify(report, null, 1));
  return { boxes, values, steps, report, out, reportFile: `${base}.report.json` };
}

@Injectable()
export class Fill {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio, @Inject(Audit) private readonly audit: Audit) {}

  async fill(actor: Actor, combinationId: string, body: { form: string; person: string; mode?: "draft" | "release"; profile?: string }) {
    // QA-47: a missing form or person is a 400 naming the field, never a 404 about "undefined".
    const b = (body && typeof body === "object" ? body : {}) as typeof body;
    const errors = [!(typeof b.form === "string" && b.form.trim()) ? { field: "form", message: "Choose the form to fill." } : null, !(typeof b.person === "string" && b.person.trim()) ? { field: "person", message: "Choose the person the form is for." } : null].filter(Boolean) as { field: string; message: string }[];
    if (errors.length) throw new HttpException({ type: "https://expatready.local/problems/validation", title: "Some details need fixing", status: 400, detail: errors.map((e) => e.message).join(" "), errors }, HttpStatus.BAD_REQUEST);
    const view = await this.studio.preview(combinationId, { mode: b.mode ?? "release", profile: b.profile ?? "client-a-family" });
    const cov = view.coverage.find((c: any) => c.form === b.form && c.person === b.person);
    if (!cov) fail(`${b.form} does not apply to that person in this ${view.mode === "release" ? "release" : "draft"}.`, HttpStatus.NOT_FOUND);
    const snapshot: any = view.mode === "release" ? (await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" } }))!.snapshot : (await this.studio.config(combinationId, "draft")).snapshot;
    const dir = join(VAR("demo"), "outputs"); mkdirSync(dir, { recursive: true });
    // QA-275 (C4.6): each fill has its own file, named by the id of the artifact row that records it (chosen here, before
    // the file is written), so two fills of one form and person in the same minute never share a path and a row always
    // serves the bytes it recorded. The time (to the second, UTC) stays in the name for a person reading the folder.
    const id = randomUUID(), stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 17);
    const base = `${b.form.replace(/\s+/g, "")}-${b.person}-${stamp}-${id}`;
    const { boxes, values, steps, report, out } = await writeForm(snapshot, cov!, b.form, dir, base);
    const pdf = readFileSync(out);
    const art = await this.db.generatedArtifact.create({ data: { id, workspaceId: (await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } })).workspaceId, kind: "filled_pdf", path: out.replace(`${ROOT}/`, ""), sha256: sha(pdf), createdBy: actor.id,
      detail: { form: b.form, person: b.person, mode: view.mode, configuration_sha256: view.sha256, written: Object.keys(values).length, intact: report.intact, read_back_equal: report.read_back_equal, signatures: report.signatures, page_fields: report.page_fields, report_file: `${base}.report.json`, person_steps: steps } } });
    await this.audit.log(art.workspaceId, actor.id, "filled", "PDF", b.form, `${actor.name} filled ${b.form} for ${cov!.person_label} from confirmed sample facts: ${Object.keys(values).length} form fields written, read back ${report.read_back_equal}/${report.written}${report.page_fields?.form_kind === "static" ? (report.page_fields.shown_outside_adobe ? ", every value also shown outside Adobe" : `, ${report.page_fields.read_back_equal} of ${report.page_fields.requested} values shown outside Adobe (the others only in Adobe)`) : ""}, ${report.intact ? "intact" : "NOT intact"} (${view.label})`);
    return { artifact_id: art.id, label: view.label, configuration_sha256: view.sha256, form: b.form, person: b.person, person_label: cov!.person_label, report, boxes, person_steps: steps,
      counts: { written: boxes.filter((x: any) => x.result === "written").length, by_hand: boxes.filter((x: any) => x.result === "by hand").length, not_on_form: boxes.filter((x: { result: string }) => x.result === "not on this form").length, blank: boxes.filter((x: any) => x.result === "blank").length, not_written: boxes.filter((x: any) => x.result === "not written").length, by_a_person: boxes.filter((x: { result: string }) => x.result === "by a person").length } };
  }

  async artifact(id: string) {
    const a = await this.db.generatedArtifact.findUniqueOrThrow({ where: { id } });
    // QA-275: the file on disk carries the row's whole id; the name a person saves carries its first 8 characters, as a
    // case copy's does (`short`). A file made before QA-275 (named by the minute) keeps its own name.
    return { path: join(ROOT, a.path), name: a.path.split("/").pop()!.replace(/-([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/, "-$1.pdf") };
  }
}
