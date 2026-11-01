// C3.4 (P-158, P-138, P-149; forms lane): a form edition's library masters drafted from the official file itself, as
// proposals in the one review queue. This first part is the RULES pass (no AI, US$0), which P-158 allows on its own:
// * an answer list comes only from a PDF box's choices (the form's own drop-down list, code and words as printed);
// * a section comes from the form's own parts (the PDF's subforms), naming the form fields it groups.
// Once per edition: a second click returns the edition's one draft. Form checks, document types and rules read from the
// guide need the AI step and its saved run (founder-approved live trial, P-131): "replay" and "live" say so (409).
// Every item is Sample until the immigration expert confirms (AGENTS rule 4); a second person approves it (P-120).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Headers, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { actorOf, Audit, Db, fail, need, SOLUTION, type Actor } from "./core.ts";
import { identityKeyOf, insertProposals, QUEUE_TX, sameInLibrary, type NewProposal, type Work } from "./proposals.ts";

export const MASTERS_STEP = "masters_edition";
type InvField = { caption?: string | null; data_path?: string | null; section?: string | null; options_from?: string | null; options_resolved?: unknown; presence?: string | null; heading?: string | null; ui?: string | null };
/** Review c34 M1: hidden boxes, barcodes and the form's machine parts are not a person's section. */
const hidden = (f: InvField) => /invisible|hidden/i.test(String(f.presence ?? "")) || /barcode/i.test(`${f.data_path ?? ""} ${f.caption ?? ""} ${f.ui ?? ""}`);
const MACHINE_PART = /^(#?subform\d*|text ?field\d*|header|buttons?( ?header)?|page\d*|one|two|three|four|five|six|seven|eight|nine|ten|fragment\d*|row\d*)$/i;

/** "MaritalStatusList" → "Marital status"; "PersonalDetails" → "Personal details". */
export function words(name: string): string {
  const w = name.replace(/List$/, "").replace(/[_\-.]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim().toLowerCase();
  return w ? w[0].toUpperCase() + w.slice(1) : name;
}
/** A value code as the contract wants it: lowercase letters, digits and _, starting with a letter. */
export function codeOf(label: string): string {
  const c = label.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return /^[a-z]/.test(c) ? c : `v_${c}`.slice(0, 61);
}
const caption = (f: InvField) => String(f.caption ?? "").replace(/^\*\s*/, "").trim();
/** The choices a PDF box offers, as printed: [[words, code], …] (the empty first row dropped). */
function choices(f: InvField): { label: string; code: string }[] {
  let raw = f.options_resolved;
  if (typeof raw === "string") { try { raw = JSON.parse(raw.replace(/'/g, '"')); } catch { return []; } }
  if (!Array.isArray(raw)) return [];
  const out: { label: string; code: string }[] = [], seen = new Set<string>();
  for (const row of raw) {
    const label = String(Array.isArray(row) ? row[0] ?? "" : row ?? "").trim();
    if (!label) continue;
    const code = codeOf(label);
    if (code.length < 1 || seen.has(code)) continue;
    seen.add(code); out.push({ label: label.slice(0, 200), code });
  }
  return out;
}

/** Pure: the answer lists and sections a form's inventory gives, by the rules alone (one list per distinct choice set). */
export function draftFromInventory(fields: InvField[]) {
  const lists = new Map<string, { label: string; values: { code: string; label: string }[]; quote: string; boxes: string[] }>();
  for (const f of fields) {
    const values = choices(f);
    if (!values.length || !f.data_path || hidden(f)) continue;
    const id = values.map((v) => v.code).sort().join(",");
    const from = String(f.options_from ?? "").match(/LOV\.([A-Za-z0-9_]+)/)?.[1];
    const prev = lists.get(id);
    if (prev) { prev.boxes.push(f.data_path); continue; }
    lists.set(id, { label: (from ? words(from) : caption(f) || "Choices").slice(0, 120), values, quote: caption(f) || values.map((v) => v.label).join(", "), boxes: [f.data_path] });
  }
  const sections = new Map<string, { label: string; fieldKeys: string[]; quote: string }>();
  for (const f of fields) {
    if (!f.data_path || !f.section || hidden(f)) continue;
    const part = f.section.split(".").slice(0, 2);
    if (part.length < 2 || MACHINE_PART.test(part[1].replace(/\[\d+\]$/, ""))) continue;
    const key = part.join(".");
    const s = sections.get(key) ?? { label: words(part[1]).slice(0, 120), fieldKeys: [], quote: caption(f) };
    if (s.fieldKeys.length < 400) s.fieldKeys.push(f.data_path.slice(0, 120));
    if (!s.quote) s.quote = caption(f);
    sections.set(key, s);
  }
  // One section per name (two pages with a part of the same name are one section of the form).
  const byName = new Map<string, { label: string; fieldKeys: string[]; quote: string }>();
  for (const s of sections.values()) { const n = byName.get(s.label); if (n) n.fieldKeys.push(...s.fieldKeys.slice(0, 400 - n.fieldKeys.length)); else byName.set(s.label, s); }
  // The quote is the form's printed words (a box caption in the part); a part with none is not proposed (P-170).
  return { lists: [...lists.values()], sections: [...byName.values()].filter((s) => s.fieldKeys.length && s.quote) };
}

@Injectable()
export class FormMasters {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  async draft(actor: Actor, attachmentId: string, body: { mode?: unknown }) {
    need(actor, "author");
    const mode = String(body?.mode ?? "rules");
    if (!["rules", "replay", "live"].includes(mode)) fail('Choose how to draft this form\'s masters: "rules" (no AI, US$0), "replay" (a saved AI run) or "live" (a paid AI call).');
    const a = await this.db.sourceAttachment.findUnique({ where: { id: attachmentId } }).catch(() => null);
    if (!a) fail("This source does not exist.", HttpStatus.NOT_FOUND);
    if (!a!.recognised || !a!.inventoryFile || a!.kind === "Document checklist") fail("Only a recognised official form that has been read is drafted into library masters (a checklist is drafted into document requirements).");
    if (mode !== "rules") fail(`No saved AI run drafts ${a!.edition ?? a!.fileName}'s form checks, document types or rules yet, so there is nothing to replay; a live run waits for the founder's OK on its cost. The rules pass ("rules", US$0) drafts its sections and answer lists now.`, HttpStatus.CONFLICT);
    const edition = (a!.edition ?? a!.fileName).slice(0, 60);
    let inv: { fields?: InvField[] };
    try { inv = JSON.parse(readFileSync(join(SOLUTION, a!.inventoryFile!), "utf8")); } catch { fail(`The reading of ${edition} is missing on this computer: read the form again.`, HttpStatus.CONFLICT); }
    const drafted = draftFromInventory(inv!.fields ?? []);
    // A list longer than the queue's 400 values (a city list) is not cut short: it is named for a person instead.
    const lists = drafted.lists.filter((l) => l.values.length <= 400), sections = drafted.sections;
    const tooLong = drafted.lists.filter((l) => l.values.length > 400).map((l) => `${l.label} (${l.values.length} choices)`);
    const source = (quote: string) => ({ file: a!.fileName.slice(0, 300), sha256: a!.sha256, edition: a!.edition?.slice(0, 60) ?? null, page: null, quote: quote.slice(0, 1000), quoteFound: true, rule: null });
    // P-138: one draft per edition, looked up and written under one lock, so two clicks at once share one job.
    const out = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`masters:${a!.workspaceId}:${edition}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { workspaceId: a!.workspaceId, kind: MASTERS_STEP, status: "COMPLETED", detail: { path: ["edition"], equals: edition } }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: 0 };
      const job = await tx.draftingJob.create({ data: { workspaceId: a!.workspaceId, combinationId: a!.combinationId, attachmentId: a!.id, kind: MASTERS_STEP, mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        message: `Rules pass on ${edition} (no AI, US$0): ${sections.length} sections from the form's parts and ${lists.length} answer lists from its drop-down boxes, proposed on To review.${tooLong.length ? ` Not proposed, too long for one list (a person adds it): ${tooLong.join(", ")}.` : ""} Form checks, document types and rules need the AI step.`.slice(0, 1000),
        detail: { operation: "draft_masters", edition, mode: "rules", sections: sections.length, answerLists: lists.length, tooLong } } });
      const items: (NewProposal & Work)[] = [];
      // The rules' own reading is shown as the draft round (the queue shows an item's content through its readings); it
      // is the saved reading of the PDF (the inventory file), US$0, and agreement stays "rules only" (no checker round).
      const rulesRead = (reading: string, payload: NewProposal["payload"]) => ({ draft: { reading: reading.slice(0, 300), payload, from: "replay" as const, runFile: a!.inventoryFile!.slice(0, 300), costUsd: 0 }, check: null });
      const base = { runId: job.id, step: MASTERS_STEP, scope: { formEdition: edition, combinationId: null }, landsOn: "library" as const, agreement: "rules_only" as const,
        confidence: "check" as const, origin: "rules" as const, relatesTo: null, revision: null, basis: "SAMPLE" as const };
      for (const l of lists) {
        const payload = { kind: "answer_list" as const, label: l.label, values: l.values };
        const twin = await sameInLibrary(tx, a!.workspaceId, payload);
        items.push({ ...base, kind: "answer_list", payload, rounds: rulesRead(`Rules read the choices of "${l.quote}": ${l.values.map((v) => v.label).join(", ")}`, payload), source: source(l.quote), reuse: twin ? { match: "reuse", existingKey: twin } : { match: "new", existingKey: null },
          rules: [{ rule: "from_pdf_box_choices", passed: true, why: null }], reason: `The choices of ${l.boxes.length} box${l.boxes.length === 1 ? "" : "es"} on ${edition}, as printed: check the list's name.`.slice(0, 500),
          identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, work: { boxes: l.boxes.slice(0, 50) } });
      }
      for (const s of sections) {
        const payload = { kind: "section" as const, label: s.label, aliases: [], fieldKeys: s.fieldKeys };
        const twin = await sameInLibrary(tx, a!.workspaceId, payload);
        items.push({ ...base, kind: "section", payload, rounds: rulesRead(`Rules read the form part "${s.label}": ${s.fieldKeys.length} form fields`, payload), source: source(s.quote), reuse: twin ? { match: "reuse", existingKey: twin } : { match: "new", existingKey: null },
          rules: [{ rule: "from_form_part", passed: true, why: null }], reason: `A part of ${edition} grouping ${s.fieldKeys.length} form fields: check its name.`.slice(0, 500),
          identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, work: {} });
      }
      await insertProposals(tx, a!.workspaceId, items);
      return { job, made: items.length };
    }, QUEUE_TX);
    if (out.made) await this.audit.log(a!.workspaceId, actor.id, "started", "masters draft", edition, `${actor.name} drafted ${edition}'s sections and answer lists by the rules (${out.made} proposals, no AI, US$0)`, undefined, a!.combinationId);
    // The queue group these proposals wait in (review-proposals.ts groupOf), so the panel opens this edition's group (review Minor 1).
    return { ...out.job, proposals: out.made, group: `edition:${edition}` };
  }
}

@Controller("api")
export class FormMastersController {
  constructor(@Inject(FormMasters) private readonly m: FormMasters) {}
  @Post("attachments/:id/draft-masters") draft(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.m.draft(actorOf(a), id, (b ?? {}) as { mode?: unknown }); }
}
