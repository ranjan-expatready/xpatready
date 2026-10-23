// Supported actual-PDF proof from the stored configuration: the renderer says which boxes of a form a person's
// confirmed sample facts cover; the P5 transformation executor turns each value into the box's own format; the P5
// filler (p5/fill.py, E5 append-only writer) writes a copy of the official form and reads every value back, checks
// nothing else changed and that the IRCC signatures still verify. Only confirmed facts are written.
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { runTransform } from "../../../p5/transforms.ts";
import { Audit, Db, fail, PROTOTYPE, PY, ROOT, SOLUTION, VAR, type Actor } from "./core.ts";
import { Studio } from "./studio.ts";

const run = promisify(execFile);
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

@Injectable()
export class Fill {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Studio) private readonly studio: Studio, @Inject(Audit) private readonly audit: Audit) {}

  async fill(actor: Actor, combinationId: string, b: { form: string; person: string; mode?: "draft" | "release"; profile?: string }) {
    const view = await this.studio.preview(combinationId, { mode: b.mode ?? "release", profile: b.profile ?? "client-a-family" });
    const cov = view.coverage.find((c: any) => c.form === b.form && c.person === b.person);
    if (!cov) fail(`${b.form} does not apply to that person in this ${view.mode === "release" ? "release" : "draft"}.`, HttpStatus.NOT_FOUND);
    const snapshot: any = view.mode === "release" ? (await this.db.configRelease.findFirst({ where: { combinationId }, orderBy: { version: "desc" } }))!.snapshot : (await this.studio.config(combinationId, "draft")).snapshot;
    const map = snapshot.field_maps.find((m: any) => m.form_number === b.form);
    if (!map?.official_file || !map.inventory_file) fail("This form's official file or box inventory is not recorded; it cannot be filled.");
    const inv = JSON.parse(readFileSync(join(SOLUTION, map.inventory_file), "utf8"));
    const box = new Map<string, any>(inv.fields.filter((x: any) => x.data_path).map((x: any) => [x.data_path, x]));
    const values: Record<string, string> = {};
    const boxes = cov!.boxes.map((r: any) => {
      if (r.coverage !== "confirmed fact") return { ...r, result: "not written", why: r.coverage === "answered on screen" ? "answered on screen, not confirmed" : r.detail };
      const o = runTransform(r.transform ?? "as_is", r.value, box.get(r.box) ?? {});
      if (o.ok) { values[r.box] = o.value; return { ...r, result: "written", written: o.value }; }
      return { ...r, result: "hand" in o ? "by hand" : "blank", why: o.reason };
    });
    const dir = join(VAR("demo"), "outputs"); mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    const base = `${b.form.replace(/\s+/g, "")}-${b.person}-${stamp}`;
    const out = join(dir, `${base}.pdf`), req = join(dir, `${base}.request.json`);
    writeFileSync(req, JSON.stringify({ form_file: map.official_file, values, out }, null, 1));
    let report: any;
    try { const { stdout } = await run(PY, ["-I", join(PROTOTYPE, "p5", "fill.py"), req], { cwd: ROOT, timeout: 180_000, maxBuffer: 20 * 1024 * 1024 }); report = JSON.parse(stdout.trim().split("\n").pop()!); }
    catch (e) { fail(`The filler failed: ${(e as Error).message.slice(0, 300)}`, HttpStatus.UNPROCESSABLE_ENTITY); }
    writeFileSync(join(dir, `${base}.report.json`), JSON.stringify(report, null, 1));
    const pdf = readFileSync(out);
    const art = await this.db.generatedArtifact.create({ data: { workspaceId: (await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } })).workspaceId, kind: "filled_pdf", path: out.replace(`${ROOT}/`, ""), sha256: sha(pdf), createdBy: actor.id,
      detail: { form: b.form, person: b.person, mode: view.mode, configuration_sha256: view.sha256, written: Object.keys(values).length, intact: report.intact, read_back_equal: report.read_back_equal, signatures: report.signatures, report_file: `${base}.report.json` } } });
    await this.audit.log(art.workspaceId, actor.id, "filled", "PDF", b.form, `${actor.name} filled ${b.form} for ${cov!.person_label} from confirmed sample facts: ${Object.keys(values).length} boxes written, read back ${report.read_back_equal}/${report.written}, ${report.intact ? "intact" : "NOT intact"} (${view.label})`);
    return { artifact_id: art.id, label: view.label, configuration_sha256: view.sha256, form: b.form, person: b.person, person_label: cov!.person_label, report, boxes,
      counts: { written: boxes.filter((x: any) => x.result === "written").length, by_hand: boxes.filter((x: any) => x.result === "by hand").length, blank: boxes.filter((x: any) => x.result === "blank").length, not_written: boxes.filter((x: any) => x.result === "not written").length } };
  }

  async artifact(id: string) {
    const a = await this.db.generatedArtifact.findUniqueOrThrow({ where: { id } });
    return { path: join(ROOT, a.path), name: a.path.split("/").pop()! };
  }
}
