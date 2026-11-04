// C3.4 (P-158, P-138, P-149, P-227; forms lane): a form edition's library masters drafted from the official file itself, as
// proposals in the one review queue. The RULES pass (no AI, US$0), which P-158 allows on its own:
// * an answer list comes only from a PDF box's choices (the form's own drop-down list, code and words as printed);
// * a section comes from the form's own parts (the PDF's subforms), naming the form fields it groups.
// The AI step (Live or Saved, nothing else; P-227) adds what the rules cannot read: a form edition's checks and the
// document types its boxes are copied from (MASTERS_FORM_AI), and the checks a combination's guide states (MASTERS_GUIDE_AI),
// each a draft round and a blind checker round on the shared step runner (rounds.ts), with the rules of
// engine/masters-ai.ts. Saved replays both rounds of one recorded run at US$0; Live runs only with the live switch (P-175),
// after its plan states the worst case (cost first). Once per edition (P-138): a second click returns the one draft.
// Every item is Sample until the immigration expert confirms (AGENTS rule 4); a second person approves it (P-120).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Body, Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Post } from "@nestjs/common";
import { normalizeLabel } from "../../contracts/programs.ts";
import { formMastersFromRounds, formShapeOk, guideMastersFromRounds, guideShapeOk, MASTERS_FORM_STEP, MASTERS_GUIDE_STEP, type FormAnswer, type GuideAnswer, type MRound } from "../../engine/masters-ai.ts";
import { editionContextKey, PRINTED_EDITION, replayPattern } from "../../engine/rounds.ts";
import { actorOf, Audit, Db, fail, need, SOLUTION, type Actor } from "./core.ts";
import { LIVE_WAITING, PqrDrafts } from "./pqr-drafts.ts";
import { identityKeyOf, insertProposals, QUEUE_TX, sameInLibrary, type NewProposal, type Work } from "./proposals.ts";
import { pairOf, roundBudgetUsd, RUNS, runTime, StepRunner, type AiStep, type RoundContext, type RoundOut } from "./rounds.ts";
import { aiLive, Sources } from "./sources.ts";

export const MASTERS_STEP = "masters_edition";
type InvField = { caption?: string | null; data_path?: string | null; section?: string | null; options_from?: string | null; options_resolved?: unknown; options?: unknown; presence?: string | null; heading?: string | null; ui?: string | null };
/** Review c34 M1: hidden boxes, barcodes and the form's machine parts are not a person's section. A part named by a
 *  number word (IMM 5475's "Five", "Seven") is a real part a person fills: it stays, for a person to rename (re-review M2). */
const hidden = (f: InvField) => /invisible|hidden/i.test(String(f.presence ?? "")) || /barcode/i.test(`${f.data_path ?? ""} ${f.caption ?? ""} ${f.ui ?? ""}`);
const MACHINE_PART = /^(#?subform\d*|text ?field\d*|header|buttons?( ?header)?|page\d*|fragment\d*|row\d*)$/i;

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

/** P-296 (3): a box's choices as the AI reads them, [words, code] each, by the shape its box kind is stored in (every
 *  committed inventory, review round 2 M1): `options_resolved` is always [words, code] rows; a Yes/No group's `options`
 *  too (IMM 5257's 21 carry only these, spelled "* Yes", "*Yes" or "Yes"); a drop-down's `options` is two columns, the
 *  words then the codes. A check box's `options` are its on/off states, never words: "check_box". Rows without words
 *  are left out; any other shape gives no choices (the box is not guarded). */
export function printedChoices(f: InvField): [string, string][] | "check_box" {
  const parse = (raw: unknown): unknown => { if (typeof raw !== "string") return raw; try { return JSON.parse(raw.replace(/'/g, '"')); } catch { return null; } };
  const strs = (r: unknown): r is string[] => Array.isArray(r) && r.every((x) => typeof x === "string");
  const rows = (raw: unknown) => (Array.isArray(raw) && raw.length && raw.every((r) => strs(r) && r.length === 2) ? (raw as [string, string][]).filter(([w]) => w.trim() !== "") : null);
  const resolved = rows(parse(f.options_resolved));
  if (resolved?.length) return resolved;
  if (f.ui === "checkButton") return "check_box";
  const o = parse(f.options);
  if (f.ui === "exclGroup") return rows(o) ?? [];
  if (f.ui === "choiceList" && Array.isArray(o) && o.length === 2 && strs(o[0]) && strs(o[1]) && o[0].length === o[1].length)
    return o[0].map((w, i) => [w, o[1][i]] as [string, string]).filter(([w]) => w.trim() !== "");
  return [];
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

/** C3.4 AI step over one form edition: its checks and the document types its boxes are copied from (a draft and a blind
 *  checker round over the form's box inventory, read from the official PDF). Keyed by the edition (engine/rounds.ts
 *  editionContextKey): every combination that uses the edition reuses its one Saved result. */
export const MASTERS_FORM_AI: AiStep = {
  kind: MASTERS_FORM_STEP, jobBase: "studio-masters-form", configurationVersion: "c34-masters-form",
  // P-296 (3): v2 prompts give the exact tree shape with a worked example (the v1 checker wrote its own shapes), and the
  // output limit is 16,000: IMM 5257's v1 draft stopped at 8,000 after 15 of its checks (#669). v1 runs are never replayed.
  template: "masters-form.v2.md", check: "masters-form-check.v2.md", schema: "masters-form-output.v1.schema.json", effort: "low", max_output_tokens: 16000,
  shapeOk: formShapeOk,
  words: {
    noSaved: "No saved AI answer drafts this form edition's checks and document types yet: it is recorded once in an approved Live run. The rules pass (US$0) drafts its sections and answer lists now.",
    badSaved: "The saved AI answer could not be read, so it is not used.",
    nothingUsed: "Nothing of it is proposed.",
  },
};
/** C3.4 AI step over a combination's guide: the checks it states (a draft and a blind checker round over its text). */
export const MASTERS_GUIDE_AI: AiStep = {
  kind: MASTERS_GUIDE_STEP, jobBase: "studio-masters-guide", configurationVersion: "c34-masters-guide",
  // P-296 (3): v2 prompts with the worked tree example (v1's trees were not in the 11-operator shape, #669). Its v1
  // rounds used 1,918 and 1,291 output tokens, so 6,000 stays.
  template: "masters-guide.v2.md", check: "masters-guide-check.v2.md", schema: "masters-guide-output.v1.schema.json", effort: "low", max_output_tokens: 6000,
  shapeOk: guideShapeOk,
  words: {
    noSaved: "No saved AI answer drafts this guide's checks for this combination yet: it is recorded once in an approved Live run.",
    badSaved: "The saved AI answer could not be read, so it is not used.",
    nothingUsed: "Nothing of it is proposed.",
  },
};
const PRINTED = PRINTED_EDITION;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");
const round2 = (n: number) => Math.round(n * 100) / 100;
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status);
const NOTHING_CHARGED = /[,:;]? *(so )?nothing (was|is) (sent and nothing was )?charged\.?/i;
/** An AI draft still RUNNING this long after it started is taken as stopped (a server restart; C4.7 break B3). Two rounds
 *  of two attempts at 300 000 ms each, plus their stub passes, fit inside it (review minor 1: 15 minutes did not). */
const RUNNING_FOR_MS = 30 * 60_000;

type Attachment = { id: string; workspaceId: string; combinationId: string; kind: string; fileName: string; sha256: string; recognised: boolean; edition: string | null; inventoryFile: string | null };
/** What one AI draft reads: a form edition (its inventory) or a combination's guide (its text). */
type Target = { kind: "form"; step: AiStep; a: Attachment; edition: string; contextKey: string; trail: string; input: { file: string; sha256: string }; chars: number; fields: InvField[]; group: string }
  | { kind: "guide"; step: AiStep; a: Attachment; combination: { id: string; workspaceId: string; label: string; combinationKey: string }; code: string; text: string; contextKey: string; trail: string; input: { file: string; sha256: string }; chars: number; group: string };
type SavedState = { available: boolean; why: string | null; files: string[] };

@Injectable()
export class FormMasters {
  private readonly runner: StepRunner;
  constructor(@Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit, @Inject(Sources) private readonly sources: Sources, @Inject(PqrDrafts) private readonly pqr: PqrDrafts) { this.runner = new StepRunner(sources); }

  private async attachment(id: string): Promise<Attachment> {
    const a = /^[0-9a-f-]{36}$/i.test(id) ? await this.db.sourceAttachment.findUnique({ where: { id } }).catch(() => null) : null;
    if (!a) fail("This source does not exist.", HttpStatus.NOT_FOUND);
    return a!;
  }
  private readInventory(a: Attachment, edition: string): { fields?: InvField[] } {
    try { return JSON.parse(readFileSync(join(SOLUTION, a.inventoryFile!), "utf8")); } catch { return fail(`The reading of ${edition} is missing on this computer: read the form again.`, HttpStatus.CONFLICT); }
  }

  /** What the AI step reads for this source: a read official form edition, or the combination's guide; anything else is refused. */
  async target(a: Attachment): Promise<Target> {
    const guide = await this.db.formEdition.findFirst({ where: { workspaceId: a.workspaceId, sha256: a.sha256, form: { formKind: "guide" } }, include: { form: true } });
    if (guide) {
      const c = await this.db.combination.findUnique({ where: { id: a.combinationId } });
      if (!c || c.retiredAt) fail("This guide's combination is retired or gone: restore it on Structure first.", HttpStatus.CONFLICT);
      const g = await this.pqr.guide(c!);
      if (g.code !== guide.form.formKey || !g.input) fail(`${guide.form.formKey} is not among the official files the AI may read for "${c!.label}", so its checks are not drafted here.`, HttpStatus.CONFLICT);
      return { kind: "guide", step: MASTERS_GUIDE_AI, a, combination: c!, code: g.code, text: g.text, contextKey: c!.combinationKey, trail: g.trail, input: g.input!, chars: g.text.length, group: `combination:${c!.id}` };
    }
    if (!a.recognised || !a.inventoryFile || a.kind === "Document checklist") fail("Only a recognised official form that has been read, or the combination's guide, is drafted into library masters (a checklist is drafted into document requirements).");
    const printed = (a.edition ?? a.fileName).slice(0, 60), m = PRINTED.exec(printed);
    if (!m) fail(`${printed} has no printed form number and edition, so its AI draft cannot be kept for every combination that uses it.`, HttpStatus.CONFLICT);
    let bytes: Buffer; try { bytes = readFileSync(join(SOLUTION, a.inventoryFile!)); } catch { return fail(`The reading of ${printed} is missing on this computer: read the form again.`, HttpStatus.CONFLICT); }
    const fields = (JSON.parse(bytes.toString("utf8")) as { fields?: InvField[] }).fields ?? [];
    return { kind: "form", step: MASTERS_FORM_AI, a, edition: printed, contextKey: editionContextKey(m![1], m![2]), trail: printed, input: { file: a.inventoryFile!, sha256: sha(bytes) }, chars: bytes.length, fields, group: `edition:${printed}` };
  }

  /** Both saved rounds of ONE recorded run (C4.7 break B1): the newest usable checker round, then the draft of the same run. */
  private async savedRounds<T>(t: Target): Promise<{ d: RoundOut<T>; k: RoundOut<T> | null }> {
    const ctx: RoundContext = { trail: t.trail, contextKey: t.contextKey, inputs: [t.input], mode: "replay", wanted: async () => true };
    const k = await this.runner.round<T>(t.step, true, ctx);
    if (!k.ok) return { d: k, k: null };
    // Break B1: the draft of the same run is the one recorded after the checker round before it (of any outcome) and
    // before this checker: the paid runner records a run's draft, then its checker.
    const stem = pairOf(t.step, true, k.runFile), before = runTime(k.runFile);
    const after = (existsSync(RUNS) ? readdirSync(RUNS) : []).filter((f) => replayPattern(t.step.jobBase, true).test(f) && pairOf(t.step, true, f) === stem && runTime(f) < before).map(runTime).sort().pop() ?? "";
    const d = await this.runner.round<T>(t.step, false, { ...ctx, replayPair: stem, replayWindow: { after, before } });
    return { d: d.ok ? d : { ok: false, costUsd: 0, reason: "The newest saved checker reading has no first reading from the same run, so it is not used." }, k };
  }
  async saved(t: Target): Promise<SavedState> {
    const { d, k } = await this.savedRounds(t);
    return d.ok && k?.ok ? { available: true, why: null, files: [d.runFile, k.runFile] } : { available: false, why: (!d.ok ? d.reason : null) ?? t.step.words.noSaved, files: [] };
  }
  /** The most the two Live rounds can reserve (the launcher's own per-round budgets). */
  worstUsd(t: Target) { return round2(roundBudgetUsd(t.step, false, [t.input], t.chars) + roundBudgetUsd(t.step, true, [t.input], t.chars)); }

  /** What an AI draft of this source would run, and the most it can cost, said before anything runs (P-227: Live or Saved). */
  async plan(attachmentId: string, body: { mode?: unknown }) {
    const mode = String(body?.mode ?? "");
    if (!["replay", "live"].includes(mode)) throw problem(400, "Check the request", "Choose Live or Saved.", { errors: [{ field: "mode", message: "Choose Live or Saved." }] });
    if (mode === "live" && !aiLive()) throw problem(409, "AI now is not approved yet", LIVE_WAITING);
    const t = await this.target(await this.attachment(attachmentId));
    const saved = await this.saved(t);
    const worst = mode === "live" ? this.worstUsd(t) : 0;
    const what = t.kind === "form" ? `${t.edition}'s checks and the document types its boxes are copied from` : `the checks ${t.code} states for "${t.combination.label}"`;
    return { mode, source: { id: t.a.id, kind: t.kind, title: t.kind === "form" ? t.edition : t.code, file: t.input.file }, what,
      steps: [{ n: 1, label: "Read the source (rules)", uses_ai: false }, { n: 2, label: "AI drafts each item with the source's own words", uses_ai: true }, { n: 3, label: "A second AI round drafts them without seeing the first answer", uses_ai: true },
        { n: 4, label: "Rules keep items whose words are in the source, whose condition is in the 11 operators and whose examples hold; Ready when both rounds agree", uses_ai: false }],
      totals: { worst_usd: worst, remaining_usd: this.sources.ledger().remaining_usd }, live: { approved: aiLive(), why: aiLive() ? null : LIVE_WAITING }, saved,
      note: mode === "replay" ? "Saved: both AI rounds of one earlier Live run for this exact source and prompt, replayed through the same steps (US$0)." : "Two AI rounds read the source; an item is Ready only when both give it.",
      plan_sha256: sha(JSON.stringify({ id: t.a.id, mode, input: t.input.sha256, worst, ...(mode === "replay" ? { saved: saved.files } : {}) })) };
  }

  async draft(actor: Actor, attachmentId: string, body: { mode?: unknown; planSha256?: unknown }) {
    need(actor, "author");
    const mode = String(body?.mode ?? "rules");
    if (!["rules", "replay", "live"].includes(mode)) fail('Choose how to draft this form\'s masters: "rules" (no AI, US$0), "replay" (Saved: a recorded AI run, US$0) or "live" (a paid AI call).');
    if (mode !== "rules") return this.aiDraft(actor, attachmentId, mode as "replay" | "live", body?.planSha256);
    const a = await this.attachment(attachmentId);
    if (!a.recognised || !a.inventoryFile || a.kind === "Document checklist") fail("Only a recognised official form that has been read is drafted into library masters (a checklist is drafted into document requirements).");
    const edition = (a.edition ?? a.fileName).slice(0, 60);
    const inv = this.readInventory(a, edition);
    // P-138: one draft per edition, looked up and written under one lock, so two clicks at once share one job.
    const out = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`masters:${a.workspaceId}:${edition}`}))`;
      const open = await tx.draftingJob.findFirst({ where: { workspaceId: a.workspaceId, kind: MASTERS_STEP, status: "COMPLETED", detail: { path: ["edition"], equals: edition } }, orderBy: { startedAt: "desc" } });
      if (open) return { job: open, made: 0 };
      const drafted = this.rulesDraft(inv.fields ?? []);
      const job = await tx.draftingJob.create({ data: { workspaceId: a.workspaceId, combinationId: a.combinationId, attachmentId: a.id, kind: MASTERS_STEP, mode: "LOCAL", status: "COMPLETED", costUsd: 0, startedBy: actor.id, finishedAt: new Date(),
        message: `Rules pass on ${edition} (no AI, US$0): ${drafted.sections.length} sections from the form's parts and ${drafted.lists.length} answer lists from its drop-down boxes, proposed on To review.${drafted.tooLong.length ? ` Not proposed, too long for one list (a person adds it): ${drafted.tooLong.join(", ")}.` : ""} Form checks and document types need the AI step (Live or Saved).`.slice(0, 1000),
        detail: { operation: "draft_masters", edition, mode: "rules", sections: drafted.sections.length, answerLists: drafted.lists.length, tooLong: drafted.tooLong } } });
      const items = await this.rulesItems(tx, a, edition, drafted, job.id);
      await insertProposals(tx, a.workspaceId, items);
      return { job, made: items.length };
    }, QUEUE_TX);
    if (out.made) await this.audit.log(a.workspaceId, actor.id, "started", "masters draft", edition, `${actor.name} drafted ${edition}'s sections and answer lists by the rules (${out.made} proposals, no AI, US$0)`, undefined, a.combinationId);
    // The queue group these proposals wait in (review-proposals.ts groupOf), so the panel opens this edition's group (review Minor 1).
    return { ...out.job, proposals: out.made, group: `edition:${edition}` };
  }

  /** The rules' sections and answer lists of an edition. A list longer than the queue's 400 values (a city list) is not cut short: it is named for a person instead. */
  private rulesDraft(fields: InvField[]) {
    const drafted = draftFromInventory(fields);
    return { lists: drafted.lists.filter((l) => l.values.length <= 400), sections: drafted.sections, tooLong: drafted.lists.filter((l) => l.values.length > 400).map((l) => `${l.label} (${l.values.length} choices)`) };
  }
  /** The rules pass's proposals (sections and answer lists), for the rules pass or the first AI draft of an edition. */
  private async rulesItems(tx: Parameters<Parameters<Db["$transaction"]>[0]>[0], a: Attachment, edition: string, drafted: ReturnType<FormMasters["rulesDraft"]>, runId: string) {
    const { lists, sections } = drafted;
    const source = (quote: string) => ({ file: a.fileName.slice(0, 300), sha256: a.sha256, edition: a.edition?.slice(0, 60) ?? null, page: null, quote: quote.slice(0, 1000), quoteFound: true, rule: null });
    const items: (NewProposal & Work)[] = [];
    // The rules' own reading is shown as the draft round (the queue shows an item's content through its readings); it
    // is the saved reading of the PDF (the inventory file), US$0, and agreement stays "rules only" (no checker round).
    const rulesRead = (reading: string, payload: NewProposal["payload"]) => ({ draft: { reading: reading.slice(0, 300), payload, from: "replay" as const, runFile: a.inventoryFile!.slice(0, 300), costUsd: 0 }, check: null });
    const base = { runId, step: MASTERS_STEP, scope: { formEdition: edition, combinationId: null }, landsOn: "library" as const, agreement: "rules_only" as const,
      confidence: "check" as const, origin: "rules" as const, relatesTo: null, revision: null, basis: "SAMPLE" as const };
    for (const l of lists) {
      const payload = { kind: "answer_list" as const, label: l.label, values: l.values };
      const twin = await sameInLibrary(tx, a.workspaceId, payload);
      items.push({ ...base, kind: "answer_list", payload, rounds: rulesRead(`Rules read the choices of "${l.quote}": ${l.values.map((v) => v.label).join(", ")}`, payload), source: source(l.quote), reuse: twin ? { match: "reuse", existingKey: twin } : { match: "new", existingKey: null },
        rules: [{ rule: "from_pdf_box_choices", passed: true, why: null }], reason: `The choices of ${l.boxes.length} box${l.boxes.length === 1 ? "" : "es"} on ${edition}, as printed: check the list's name.`.slice(0, 500),
        identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, work: { boxes: l.boxes.slice(0, 50) } });
    }
    for (const s of sections) {
      const payload = { kind: "section" as const, label: s.label, aliases: [], fieldKeys: s.fieldKeys };
      const twin = await sameInLibrary(tx, a.workspaceId, payload);
      items.push({ ...base, kind: "section", payload, rounds: rulesRead(`Rules read the form part "${s.label}": ${s.fieldKeys.length} form fields`, payload), source: source(s.quote), reuse: twin ? { match: "reuse", existingKey: twin } : { match: "new", existingKey: null },
        rules: [{ rule: "from_form_part", passed: true, why: null }], reason: `A part of ${edition} grouping ${s.fieldKeys.length} form fields: check its name.`.slice(0, 500),
        identity: { key: identityKeyOf(payload, ""), near: [], nearReason: null }, work: {} });
    }
    return items;
  }

  /** The AI step (Live or Saved), once per form edition or per combination's guide (P-138). */
  private async aiDraft(actor: Actor, attachmentId: string, mode: "replay" | "live", planSha256: unknown) {
    // P-175: Live is refused at US$0 before anything is read while the live switch is off.
    if (mode === "live" && !aiLive()) throw problem(409, "AI now is not approved yet", LIVE_WAITING);
    const plan = await this.plan(attachmentId, { mode });
    const t = await this.target(await this.attachment(attachmentId));
    if (mode === "replay" && !plan.saved.available) throw problem(409, "No saved result yet", plan.saved.why ?? t.step.words.noSaved, { plan });
    if (mode === "live") {
      if (planSha256 !== plan.plan_sha256) throw problem(409, "Look at the plan again", "The source or the cost changed since you looked, or no plan was looked at: check the plan (its worst case) before a Live run.", { plan });
      if (plan.totals.worst_usd > plan.totals.remaining_usd + 1e-9) throw problem(409, "Over the spending cap", `Not started: the worst case (US$${plan.totals.worst_usd.toFixed(2)}) is above what is left of the AI spending cap (US$${plan.totals.remaining_usd.toFixed(2)}). Nothing was started.`);
    }
    const ws = t.a.workspaceId, combinationId = t.kind === "guide" ? t.combination.id : t.a.combinationId;
    const once = t.kind === "form" ? { context: t.contextKey } : { context: `guide:${t.combination.id}:${t.code}` };
    const isAi = [{ detail: { path: ["ai"], equals: true } }, { detail: { path: ["context"], equals: once.context } }];
    const usableDone = [...isAi, { detail: { path: ["usable"], equals: true } }];
    // One AI draft per edition (or per combination's guide), looked up and started under one lock: a second click returns
    // the one draft; one running now refuses a second (never two paid runs side by side).
    const started = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`masters_ai:${ws}:${once.context}`}))`;
      const done = await tx.draftingJob.findFirst({ where: { workspaceId: ws, kind: MASTERS_STEP, status: "COMPLETED", AND: usableDone }, orderBy: { startedAt: "desc" } });
      if (done) return { done };
      const going = await tx.draftingJob.findFirst({ where: { workspaceId: ws, kind: MASTERS_STEP, status: "RUNNING", startedAt: { gte: new Date(Date.now() - RUNNING_FOR_MS) }, AND: isAi }, select: { id: true } });
      if (going) throw problem(409, "Already drafting", "This source is already being drafted with AI. Wait for that run to end, then look at To review.", { runId: going.id });
      return { job: await tx.draftingJob.create({ data: { workspaceId: ws, combinationId, attachmentId: t.a.id, kind: MASTERS_STEP, mode: mode === "live" ? "LIVE" : "REPLAY", status: "RUNNING", startedBy: actor.id,
        message: `Drafting ${t.kind === "form" ? `${t.edition}'s checks and document types` : `the checks of ${t.code}`} with AI`, detail: { operation: "draft_masters", ai: true, mode, ...once, ...(t.kind === "form" ? { source: t.edition } : { guide: t.code }) } } }) };
    });
    if ("done" in started) return { ...started.done!, proposals: 0, group: t.group, already: true };
    const job = started.job!;
    // Review M1: what the rounds cost and recorded, kept outside the try, so whatever throws after a paid round still
    // records its cost and run files (and a later Saved can replay them); a job that completed is never demoted.
    let paid = { usd: 0, runFiles: [] as string[] }, completed = false;
    try {
      const fail0 = { ok: false as const, costUsd: 0, reason: "The AI step stopped on this computer, so nothing of it is used." };
      let d: RoundOut<FormAnswer | GuideAnswer>, k: RoundOut<FormAnswer | GuideAnswer> | null;
      if (mode === "replay") ({ d, k } = await this.savedRounds<FormAnswer | GuideAnswer>(t).catch((e) => { console.warn(`masters ${job.id}:`, String(e).slice(0, 400)); return { d: fail0, k: null }; }));
      else {
        const ctx: RoundContext = { trail: t.trail, contextKey: t.contextKey, inputs: [t.input], mode, wanted: async () => true, batchId: job.id };
        const safe = async (isCheck: boolean): Promise<RoundOut<FormAnswer | GuideAnswer>> => { try { return await this.runner.round(t.step, isCheck, ctx); } catch (e) { console.warn(`masters ${job.id}:`, String(e).slice(0, 400)); return fail0; } };
        d = await safe(false); k = d.ok ? await safe(true) : null;
      }
      const usd = round2(d.costUsd + (k?.costUsd ?? 0));
      const runFiles = [d.ok ? d.runFile : null, k?.ok ? k.runFile : null].filter((x): x is string => !!x);
      paid = { usd, runFiles };
      if (!d.ok || !k?.ok) {
        let note = (!d.ok ? d.reason : k && !k.ok ? `The first AI round ran, but the checker round did not: ${k.reason.charAt(0).toLowerCase()}${k.reason.slice(1)}` : null) ?? "The AI step did not finish.";
        // C4.7 break B2: a round that ran stays charged; the note never says "nothing was charged" then.
        if (usd > 0) note = `${note.replace(NOTHING_CHARGED, "").replace(/\.?$/, ".")} This run cost US$${usd.toFixed(2)} (counted); nothing of it is used.`;
        const cancelled = [d, k].some((x) => !!x && !x.ok && !!x.cancelled);
        // P-227: a failed Live run offers Saved when a Saved result exists; a failed Saved run never does.
        const offerSaved = mode === "live" && !cancelled && (await this.saved(t)).available;
        if (offerSaved) note = `${note.replace(/\.?$/, ".")} A Saved result exists for this source: use Saved (US$0).`;
        const ended = await this.db.draftingJob.update({ where: { id: job.id }, data: { status: cancelled ? "CANCELLED" : "FAILED", costUsd: usd, finishedAt: new Date(), runFile: runFiles[0] ?? null, message: note.slice(0, 1000), detail: { ...(job.detail as object), run_files: runFiles } } });
        return { ...ended, proposals: 0, group: t.group, usd, offer_saved: offerSaved };
      }
      const rounds = { draft: this.mround(d), check: this.mround(k) };
      const res = t.kind === "form"
        ? formMastersFromRounds(rounds as { draft: MRound<FormAnswer>; check: MRound<FormAnswer> }, { file: t.a.fileName, sha256: t.a.sha256, edition: t.edition, printed: t.edition, boxes: t.fields.filter((f) => f.data_path && !hidden(f)).map((f) => ({ path: f.data_path!, words: [f.caption, f.heading].filter(Boolean).join(" \n "), choices: printedChoices(f) })) }, { runId: job.id })
        : guideMastersFromRounds(rounds as { draft: MRound<GuideAnswer>; check: MRound<GuideAnswer> }, { file: t.input.file, sha256: t.input.sha256, text: t.text, code: t.code }, await this.libraryFacts(ws), { runId: job.id, combinationId: t.combination.id });
      const from = d.from === "live" || k.from === "live" ? "live" : "replay";
      const out = await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`masters:${ws}:${t.kind === "form" ? t.edition : once.context}`}))`;
        // The first AI draft of an edition also carries the rules' sections and answer lists, unless the rules pass ran before (P-138: one draft).
        const rulesDone = t.kind === "form" ? !!(await tx.draftingJob.findFirst({ where: { workspaceId: ws, kind: MASTERS_STEP, status: "COMPLETED", detail: { path: ["edition"], equals: t.edition } }, select: { id: true } })) : true;
        const rules = t.kind === "form" && !rulesDone ? this.rulesDraft(t.fields) : null;
        const items: (NewProposal & Work)[] = rules && t.kind === "form" ? await this.rulesItems(tx, t.a, t.edition, rules, job.id) : [];
        for (const x of res.items) {
          // A library kind's identity is its kind's rule (proposals.ts identityKeyOf); a document type a live library type
          // already names is proposed as a reuse of it (P-120), never as a second item of the same name.
          const identity = { ...x.identity, key: identityKeyOf(x.payload, x.identity.key) };
          const twin = x.payload.kind === "document_type" ? await this.typeNamed(tx, ws, x.payload.name) : null;
          items.push({ ...x, identity, reuse: twin ? { match: "reuse", existingKey: twin } : x.reuse });
        }
        await insertProposals(tx, ws, items);
        const counts = Object.fromEntries(["section", "answer_list", "form_check", "cross_check", "document_type"].map((kd) => [kd, items.filter((i) => i.kind === kd).length]));
        const note = `${from === "live" ? "Live" : "Saved"} AI draft of ${t.kind === "form" ? t.edition : `${t.code} for "${t.combination.label}"`} (US$${usd.toFixed(2)}): ${items.length} proposal${items.length === 1 ? "" : "s"} for To review${res.dropped.length ? `, ${res.dropped.length} left out with the reason` : ""}${res.unresolved.length ? `, ${res.unresolved.length} passage${res.unresolved.length === 1 ? "" : "s"} the AI could not turn into an item` : ""}. Sample until the immigration expert confirms.`;
        // Break B2: a draft with no usable AI item is not "the one draft" of its source (usable: false), so a later
        // Saved result or a new Live run (its cost shown first) can still draft it; its words say so.
        const usable = res.items.length > 0;
        const ended = await tx.draftingJob.update({ where: { id: job.id }, data: { status: "COMPLETED", costUsd: usd, finishedAt: new Date(), runFile: runFiles[0] ?? null,
          message: (usable ? note : `${note} No AI item was usable, so this source can be drafted again.`).slice(0, 1000),
          detail: { ...(job.detail as object), usable, ...(rules && t.kind === "form" ? { edition: t.edition, sections: rules.sections.length, answerLists: rules.lists.length, tooLong: rules.tooLong } : {}), from, counts, dropped: res.dropped.slice(0, 100), unresolved: res.unresolved.slice(0, 100), run_files: runFiles } } });
        return { job: ended, made: items.length };
      }, QUEUE_TX);
      completed = true;
      // The audit line is not part of the money path: its failure is logged, never turned into a failed paid run.
      await this.audit.log(ws, actor.id, "proposed", "masters draft", t.kind === "form" ? t.edition : t.code, `${actor.name} drafted ${t.kind === "form" ? `${t.edition}'s masters` : `${t.code}'s checks`} with AI (${from === "live" ? "Live" : "Saved"}, US$${usd.toFixed(2)}): ${out.made} to review`, { runId: job.id, mode, run_files: runFiles }, combinationId).catch((x) => console.warn(`masters ${job.id}: audit not written:`, String(x).slice(0, 200)));
      return { ...out.job, proposals: out.made, group: t.group, usd, from };
    } catch (e) {
      if (completed) throw e;
      // Whatever stops this draft ends its job as FAILED, so "Already drafting" never blocks the source for a run that is gone.
      const cost = paid.usd > 0 ? ` This run cost US$${paid.usd.toFixed(2)} (counted)${paid.runFiles.length === 2 ? "; its recorded answers can be used with Saved (US$0)" : ""}.` : "";
      await this.db.draftingJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), costUsd: paid.usd, runFile: paid.runFiles[0] ?? null,
        message: `This draft stopped on this computer before it ended; nothing of it is proposed.${cost}`, detail: { ...(job.detail as object), run_files: paid.runFiles } } }).catch((x) => console.warn(`masters ${job.id}: could not end the job:`, String(x).slice(0, 200)));
      throw e;
    }
  }

  private mround<T>(r: RoundOut<T> & { ok: true }): MRound<T> { return { output: r.output, from: r.from, runFile: r.runFile, costUsd: r.costUsd }; }
  /** The library's questions a guide check may read, by key and the names they go by. */
  private async libraryFacts(ws: string) {
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId: ws, status: { in: ["DRAFT", "PUBLISHED"] }, mergedIntoKey: null }, select: { canonicalFieldKey: true, label: true, aliases: true } });
    return rows.map((r) => ({ key: r.canonicalFieldKey, names: [r.label ?? "", ...r.aliases].filter(Boolean) }));
  }
  /** A live library document type of exactly this name (the acceptance's "no new item has a live item's name", P-120). */
  private async typeNamed(tx: Parameters<Parameters<Db["$transaction"]>[0]>[0], ws: string, name: string) {
    const rows = await tx.documentType.findMany({ where: { workspaceId: ws, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { documentTypeKey: true, name: true } });
    return rows.find((r) => normalizeLabel(r.name) === normalizeLabel(name))?.documentTypeKey ?? null;
  }
}

@Controller("api")
export class FormMastersController {
  constructor(@Inject(FormMasters) private readonly m: FormMasters) {}
  // Break minor: the plan names source files, run files and the AI cap, so only those who may draft read it.
  @Post("attachments/:id/draft-masters/plan") @HttpCode(200) plan(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { need(actorOf(a), "author"); return this.m.plan(id, (b ?? {}) as { mode?: unknown }); }
  @Post("attachments/:id/draft-masters") draft(@Headers("x-actor") a: string | undefined, @Param("id") id: string, @Body() b: unknown) { return this.m.draft(actorOf(a), id, (b ?? {}) as { mode?: unknown; planSha256?: unknown }); }
}
