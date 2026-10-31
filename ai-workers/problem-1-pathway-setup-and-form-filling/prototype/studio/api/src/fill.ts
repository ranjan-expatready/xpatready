// Supported actual-PDF proof from the stored configuration: the renderer says which boxes of a form a person's
// confirmed sample facts cover; the P5 transformation executor turns each value into the box's own format; the P5
// filler (p5/fill.py, E5 append-only writer) writes a copy of the official form and reads every value back, checks
// nothing else changed and that the IRCC signatures still verify. Only confirmed facts are written.
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { runTransform } from "../../../p5/transforms.ts";
import { codeForValue, hasCodes, labelForText, type ListValue, type OptionMap } from "../../engine/options.ts";
import { byAPerson, inFormFormat, personSteps } from "../../engine/form-steps.ts";
import type { BoxRow } from "../../engine/render.ts";
import type { Snapshot } from "../../engine/snapshot.ts";
import { Audit, Db, fail, PROTOTYPE, PY, ROOT, SOLUTION, VAR, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

/** One form filled from a coverage (which value each form field reads, and whether it is a confirmed fact): each value in
 *  the form field's own format or code, signatures and the oath never written, the official copy written append-only by
 *  p5/fill.py and read back. Shared by the configuration preview (sample facts) and a case (its confirmed answers,
 *  runtime lane S-11). Writes <dir>/<base>.pdf, .request.json and .report.json. */
export async function writeForm(snapshot: Snapshot, cov: { boxes: BoxRow[] }, form: string, dir: string, base: string, opts: { notForFiling?: boolean } = {}) {
  // F1: the PDF edition. A line filed Online is never filled as a PDF, even when the library also has its PDF (review 18);
  // online filling needs the browser extension (later wave, W1-02, P-102).
  const line = (snapshot.forms as { form_number: string; channel?: string }[]).find((f) => f.form_number === form);
  // C-4: a Not needed line is never filled. P-145: an Online line is filled only as a "Copy, not for filing" (a case copy).
  if (line?.channel === "NOT_NEEDED") fail(`${form} is Not needed here: the IRCC account asks it itself, so nothing is filled.`, HttpStatus.CONFLICT);
  if (line?.channel === "ONLINE" && !opts.notForFiling) fail(`${form} is filed Online here: it needs the browser extension (later wave), so the product does not fill it. File it as a PDF upload to fill its PDF.`, HttpStatus.CONFLICT);
  const map = snapshot.field_maps.find((m: { form_number: string; channel?: string }) => m.form_number === form && m.channel !== "ONLINE");
  if (!map?.official_file || !map.inventory_file) fail("This form's official file or form field list is not recorded; it cannot be filled.");
  type Entry = { data_path: string; fact?: string | null; option_map?: OptionMap | null };
  type Def = { id: string; answer_list?: { values: ListValue[] } };
  const entryOf = new Map<string, Entry>((map.entries as Entry[]).map((e) => [e.data_path, e]));
  const listOf = new Map<string, ListValue[]>((snapshot.canonical_fields as Def[]).flatMap((f) => (f.answer_list ? [[f.id, f.answer_list.values] as [string, ListValue[]]] : [])));
  const inv = JSON.parse(readFileSync(join(SOLUTION, map.inventory_file), "utf8"));
  const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
  const values: Record<string, string> = {};
  // F1 slice 2 (evidence lane F2, F3): a signature is never typed by the product; values go in the form's own format.
  const write = (path: string, v: string) => (values[path] = inFormFormat(box.get(path) ?? {}, v));
  // F1 slice 2 and 2b (evidence lane F2, F6): a signature or the oath block is never written, whatever is mapped to it.
  const boxes = cov.boxes.map((r: any) => {
    const person = byAPerson(inv.fields, box.get(r.box) ?? { data_path: r.box });
    if (person) return { ...r, result: "by a person", why: person };
    if (r.coverage !== "confirmed fact") return { ...r, result: "not written", why: r.coverage === "answered on screen" ? "answered on screen, not confirmed" : r.detail };
    // A form field on an answer list takes its own code from its option map (the team's ENUM map, onMissing REFUSE).
    const e = entryOf.get(r.box), list = e?.fact ? listOf.get(e.fact) : undefined;
    if (e?.option_map && list) { const code = codeForValue(r.value, e.option_map, list); if (code === null) return { ...r, result: "by hand", why: `"${r.value}" has no code in this form field's option map` }; write(r.box, code); return { ...r, result: "written", written: values[r.box] }; }
    // A text form field (no codes in its transform and no choices of its own) writes the value's label, never its key.
    const own = box.get(r.box) ?? {};
    const text = list && !hasCodes(r.transform) && !(Array.isArray(own.options_resolved) && own.options_resolved.length);
    const o = runTransform(r.transform ?? "as_is", text ? labelForText(r.value, list) : r.value, own);
    if (o.ok) { write(r.box, o.value); return { ...r, result: "written", written: values[r.box] }; }
    return { ...r, result: "hand" in o ? "by hand" : "blank", why: o.reason };
  });
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
    const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    const base = `${b.form.replace(/\s+/g, "")}-${b.person}-${stamp}`;
    const { boxes, values, steps, report, out } = await writeForm(snapshot, cov!, b.form, dir, base);
    const pdf = readFileSync(out);
    const art = await this.db.generatedArtifact.create({ data: { workspaceId: (await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } })).workspaceId, kind: "filled_pdf", path: out.replace(`${ROOT}/`, ""), sha256: sha(pdf), createdBy: actor.id,
      detail: { form: b.form, person: b.person, mode: view.mode, configuration_sha256: view.sha256, written: Object.keys(values).length, intact: report.intact, read_back_equal: report.read_back_equal, signatures: report.signatures, page_fields: report.page_fields, report_file: `${base}.report.json`, person_steps: steps } } });
    await this.audit.log(art.workspaceId, actor.id, "filled", "PDF", b.form, `${actor.name} filled ${b.form} for ${cov!.person_label} from confirmed sample facts: ${Object.keys(values).length} form fields written, read back ${report.read_back_equal}/${report.written}${report.page_fields?.form_kind === "static" ? (report.page_fields.shown_outside_adobe ? ", every value also shown outside Adobe" : `, ${report.page_fields.read_back_equal} of ${report.page_fields.requested} values shown outside Adobe (the others only in Adobe)`) : ""}, ${report.intact ? "intact" : "NOT intact"} (${view.label})`);
    return { artifact_id: art.id, label: view.label, configuration_sha256: view.sha256, form: b.form, person: b.person, person_label: cov!.person_label, report, boxes, person_steps: steps,
      counts: { written: boxes.filter((x: any) => x.result === "written").length, by_hand: boxes.filter((x: any) => x.result === "by hand").length, blank: boxes.filter((x: any) => x.result === "blank").length, not_written: boxes.filter((x: any) => x.result === "not written").length, by_a_person: boxes.filter((x: { result: string }) => x.result === "by a person").length } };
  }

  async artifact(id: string) {
    const a = await this.db.generatedArtifact.findUniqueOrThrow({ where: { id } });
    return { path: join(ROOT, a.path), name: a.path.split("/").pop()! };
  }
}
