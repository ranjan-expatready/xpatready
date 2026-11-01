// S6 Shared library, queue item (2a) (screens lane; P-158 delta items 1 and 6, C3.13, C3.15): every library item comes
// from a source, so the free adds answer 410; each item's sources ("From: IMM 1295 form field …", "checklist IMM 5488 …") and
// where it is used, read from the rows that already hold them (form field maps, checklist requirement quotes, the
// imported release); a direct, versioned rename of a field's name or a section's title with the exact-duplicate check.
// The one door (every item a ProposalItem, a rule as a source) comes in S6 slice 1, on the forms lane's contract v2.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch } from "@nestjs/common";
import { z } from "zod";
import { normalizeLabel, problemFromZod } from "../../contracts/programs.ts";
import { newestEdition } from "../../engine/programs.ts";
import { actorOf, Audit, Db, need, readerOf, revise, strip, Workspace, type Actor } from "./core.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

/** P-158 item 1: nothing is added to the library by hand; the 410 says where the item comes from instead. */
const FROM: Record<string, string> = {
  field: "A field comes from a form field (add the form under Forms and confirm what the AI read), a checklist line, or a rule that needs it.",
  section: "Sections are proposed from the forms' own parts and confirmed on To review.",
  answer_list: "An answer list comes from a form field's own choices or an IRCC code list.",
};
export const noFreeAdd = (kind: keyof typeof FROM): never => {
  throw new HttpException({ type: "https://expatready.local/problems/no-free-add", title: "Not added by hand", status: HttpStatus.GONE, detail: `Nothing is added to the shared library by hand. ${FROM[kind]}` }, HttpStatus.GONE);
};

/** The URL word for each kind (`GET /library/:kind/:key/sources`). */
const KINDS = { fields: "field", sections: "section", "document-types": "document_type", "answer-lists": "answer_list" } as const;
type Kind = (typeof KINDS)[keyof typeof KINDS];
export type SourceLine = { kind: "form_box" | "checklist" | "release" | "ai_run" | "forms" | "rule"; text: string; quote?: string | null; file?: string | null };
export type SourcesView = { kind: Kind; key: string; name: string; sources: SourceLine[]; unsourced: boolean; used_in: string[] };

/** "prototype/p1/inventory/imm5488e.text.inventory.json" → "IMM 5488"; any other file keeps its own name. */
const checklistName = (file: string) => {
  const m = /(imm|guide)[\s_-]?(\d{4})/i.exec(file);
  if (m) return `${m[1].toLowerCase() === "imm" ? "IMM" : "Guide"} ${m[2]}`;
  return (file.split("/").pop() ?? file).replace(/(\.text)?\.inventory\.json$|\.[a-z]+$/i, "").replace(/[-_]+/g, " ");
};
/** "the reviewed … release 2c66…; proposed by c1-fieldmap-…" → the release in words, the AI runs as its small print. */
const releaseLine = (ref: string | null | undefined): SourceLine => {
  if (!ref) return { kind: "release", text: "From the imported release" };
  const [what, runs] = ref.split("; proposed by ");
  return { kind: "release", text: `From ${what}`, quote: runs ? `proposed by AI runs ${runs}` : null };
};
/** PR #96 finding (a): only each row's newest version counts (a replaced form mapping or checklist line is no longer a
 *  source or a use), and only while that version is a draft or published (a retired newest one hides the older ones). */
const LIVE = ["PUBLISHED", "DRAFT", "RETIRED"] as const;
const current = <T extends { version: number; status: string }>(rows: T[], idOf: (r: T) => string): T[] => {
  const top = new Map<string, T>(); for (const r of rows) { const k = idOf(r), t = top.get(k); if (!t || r.version > t.version) top.set(k, r); }
  return [...top.values()].filter((r) => r.status === "PUBLISHED" || r.status === "DRAFT");
};
/** The shared fields a condition reads (the engine's own reading, engine/validate.ts). */
const fieldsOf = (c: unknown) => (c ? [...JSON.stringify(c).matchAll(/"field":"([^"]+)"/g)].map((m) => m[1]) : []);

@Injectable()
export class LibrarySources {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit) {}

  /** Every source of every item of one kind (one read per table, so a list page gets them in one call). */
  async all(kind: Kind, workspaceId: string): Promise<Map<string, SourceLine[]>> {
    const out = new Map<string, SourceLine[]>();
    // PR #96 finding (c): two lines with the same words but different quotes (two lines of one checklist) both stay.
    const add = (key: string, l: SourceLine) => { const a = out.get(key) ?? []; if (!a.some((x) => x.text === l.text && (x.quote ?? null) === (l.quote ?? null))) a.push(l); out.set(key, a); };
    if (kind === "field" || kind === "answer_list" || kind === "section") {
      const boxes = await this.mappedBoxes(workspaceId);
      const fields = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
      const latest = new Map<string, (typeof fields)[number]>(); for (const f of fields) if (!latest.has(f.canonicalFieldKey)) latest.set(f.canonicalFieldKey, f);
      if (kind === "field") {
        for (const b of boxes) add(b.canonicalFieldKey!, { kind: "form_box", text: `From: ${b.edition.editionLabel} form field "${(b.caption ?? b.dataPath).replace(/^\*/, "").trim()}"`, quote: b.evidenceQuote });
        // C3.6 (P-158 (5), plan §6): a fact added for a rule says "Needed by rule …", the rule's key and its sentence.
        for (const f of latest.values()) if (f.sourceRef) add(f.canonicalFieldKey, /^Needed by (Rule|Check|Form condition|Question condition|Document condition) /.test(f.sourceRef) ? { kind: "rule", text: f.sourceRef.split(/; (?:rules|AI) run /)[0] } : f.origin === "AI_PROPOSAL" ? { kind: "ai_run", text: `From the ${f.sourceRef}` } : releaseLine(f.sourceRef));
      } else if (kind === "answer_list") {
        for (const b of boxes) { const list = latest.get(b.canonicalFieldKey!)?.answerListKey; if (list) add(list, { kind: "form_box", text: `Choices of: ${b.edition.editionLabel} form field "${(b.caption ?? b.dataPath).replace(/^\*/, "").trim()}"` }); }
      } else {
        // A section's questions read form boxes: until sections are proposed from the forms' parts (S6 slice 2), those
        // forms are its evidence, beside the release it came with.
        const forms = new Map<string, Set<string>>();
        const editionOf = new Map<string, string[]>(); for (const b of boxes) { const a = editionOf.get(b.canonicalFieldKey!) ?? []; a.push(b.edition.editionLabel.replace(/ \(.*$/, "")); editionOf.set(b.canonicalFieldKey!, a); }
        for (const q of await this.db.sectionQuestion.findMany({ where: { workspaceId } })) for (const e of editionOf.get(q.canonicalFieldKey) ?? []) { const s = forms.get(q.sectionKey) ?? new Set(); s.add(e); forms.set(q.sectionKey, s); }
        for (const [k, s] of forms) add(k, { kind: "forms", text: `Its questions read form fields on ${[...s].sort().join(", ")}` });
        const secs = await this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
        const seen = new Set<string>();
        for (const s of secs) if (!seen.has(s.sectionKey) && seen.add(s.sectionKey) && s.origin === "IMPORTED_RELEASE") add(s.sectionKey, releaseLine(null));
      }
    } else {
      for (const r of current(await this.db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, orderBy: { lineageKey: "asc" } }), (r) => `${r.combinationId}|${r.lineageKey}`))
        if (r.sourceFile || r.sourceQuote) add(r.documentTypeKey, { kind: "checklist", text: `From: checklist ${r.sourceFile ? checklistName(r.sourceFile) : "(file not recorded)"}`, quote: r.sourceQuote, file: r.sourceFile });
    }
    return out;
  }

  /** The current mapped form fields (PR #96 finding (a): the newest version per edition and data path, so a mapping
   *  replaced by a newer one, or by one that maps nothing, no longer counts). */
  private async mappedBoxes(workspaceId: string) {
    const rows = await this.db.formFieldMap.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, include: { edition: true }, orderBy: [{ formEditionId: "asc" }, { dataPath: "asc" }] });
    return current(rows, (b) => `${b.formEditionId}|${b.dataPath}`).filter((b) => b.outcome === "mapped" && b.canonicalFieldKey);
  }

  /** Combinations each item is used in, by label (C3.13 where used). */
  async usedIn(kind: Kind, workspaceId: string): Promise<Map<string, string[]>> {
    const label = new Map((await this.db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true } })).map((c) => [c.id, c.label]));
    const out = new Map<string, Set<string>>();
    const add = (key: string, combinationId: string) => { const l = label.get(combinationId); if (!l) return; const s = out.get(key) ?? new Set(); s.add(l); out.set(key, s); };
    if (kind === "section") for (const s of await this.db.sqrSectionSelection.findMany({ where: { workspaceId } })) add(s.sectionKey, s.combinationId);
    else if (kind === "document_type") for (const r of current(await this.db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }), (r) => `${r.combinationId}|${r.lineageKey}`)) add(r.documentTypeKey, r.combinationId);
    else {
      // A field is used where a combination's form reads it, and (PR #96 finding (b)) where its rules, document lines,
      // form conditions and checks read it, or its questionnaire asks it (a question in a section the combination
      // selects, or that question's condition). An answer list is used where one of its fields is.
      const uses: [string, string][] = [];
      const [boxes, lines, rules, docs, checks, questions, picks] = await Promise.all([
        this.mappedBoxes(workspaceId),
        this.db.combinationForm.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
        this.db.predicate.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
        this.db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
        this.db.check.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
        this.db.sectionQuestion.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
        this.db.sqrSectionSelection.findMany({ where: { workspaceId } }),
      ]);
      const formLines = current(lines, (l) => `${l.combinationId}|${l.lineageKey}`);
      const combosOf = new Map<string, string[]>(); for (const l of formLines) combosOf.set(l.govFormDefId, [...(combosOf.get(l.govFormDefId) ?? []), l.combinationId]);
      // PR #108 minor (a): a combination fills its form's current edition (per channel: the newest one mapped; a newer
      // edition not mapped yet leaves the older in use), so a field mapped only on a superseded edition is not used there.
      const chan = (e: (typeof boxes)[number]["edition"]) => `${e.govFormDefId}|${e.channel}`;
      const editions = [...new Map(boxes.map((b) => [b.edition.id, b.edition])).values()];
      const currentOf = new Map<string, string>(); for (const k of new Set(editions.map(chan))) currentOf.set(k, newestEdition(editions.filter((e) => chan(e) === k))!.id);
      for (const b of boxes) if (currentOf.get(chan(b.edition)) === b.edition.id) for (const c of combosOf.get(b.edition.govFormDefId) ?? []) uses.push([b.canonicalFieldKey!, c]);
      for (const l of formLines) for (const f of fieldsOf(l.predicateJson)) uses.push([f, l.combinationId]);
      for (const r of current(rules, (r) => `${r.combinationId}|${r.predicateKey}`)) for (const f of fieldsOf(r.predicateJson)) uses.push([f, r.combinationId]);
      for (const d of current(docs, (d) => `${d.combinationId}|${d.lineageKey}`)) for (const f of fieldsOf(d.predicateJson)) uses.push([f, d.combinationId]);
      for (const k of current(checks, (k) => `${k.combinationId}|${k.checkKey}`)) for (const f of fieldsOf(k.predicateJson)) uses.push([f, k.combinationId]);
      const combosOfSection = new Map<string, string[]>(); for (const p of picks) combosOfSection.set(p.sectionKey, [...(combosOfSection.get(p.sectionKey) ?? []), p.combinationId]);
      for (const q of current(questions, (q) => q.lineageKey)) for (const f of [q.canonicalFieldKey, ...fieldsOf(q.predicateJson)]) for (const c of combosOfSection.get(q.sectionKey) ?? []) uses.push([f, c]);
      const listOf = new Map<string, string | null>();
      if (kind === "answer_list") for (const f of await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "asc" } })) listOf.set(f.canonicalFieldKey, f.answerListKey);
      for (const [f, c] of uses) { const key = kind === "field" ? f : listOf.get(f); if (key) add(key, c); }
    }
    return new Map([...out].map(([k, s]) => [k, [...s].sort()]));
  }

  async sources(kindWord: string, key: string): Promise<SourcesView> {
    const kind = (KINDS as Record<string, Kind>)[kindWord];
    if (!kind) throw problem(404, "Not found", `There is no library list "${kindWord}": use fields, sections, document-types or answer-lists.`);
    const workspaceId = await this.ws.id();
    const name = await this.nameOf(kind, workspaceId, key);
    if (name === null) throw problem(404, "Not found", `${key} is not in the shared library.`);
    const sources = (await this.all(kind, workspaceId)).get(key) ?? [];
    return { kind, key, name, sources, unsourced: !sources.length, used_in: (await this.usedIn(kind, workspaceId)).get(key) ?? [] };
  }

  private async nameOf(kind: Kind, workspaceId: string, key: string): Promise<string | null> {
    if (kind === "field") { const f = await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } }); return f ? (f.labelChecked && f.label) || key : null; }
    if (kind === "section") return (await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: key }, orderBy: { version: "desc" } }))?.title ?? null;
    if (kind === "document_type") return (await this.db.documentType.findFirst({ where: { workspaceId, documentTypeKey: key }, orderBy: { version: "desc" } }))?.name ?? null;
    return (await this.db.answerList.findFirst({ where: { workspaceId, answerListKey: key }, orderBy: { version: "desc" } }))?.label ?? null;
  }

  /** C3.15: an author renames a shared field directly (a new draft version, no second person), never onto another
   *  field's name or label in the same group (BR-7, the exact-duplicate check; the database index backs it). */
  async renameField(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parseName(body);
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (!newest || newest.status === "RETIRED") throw problem(404, "Not found", `${key} is not in the shared library.`);
    if (newest.mergedIntoKey) throw problem(409, "Merged", `${key} was merged into ${newest.mergedIntoKey}: rename that field instead.`);
    const group = newest.groupKey ?? key.split(".")[0], want = normalizeLabel(b.name);
    const twins = await this.db.canonicalField.findMany({ where: { workspaceId, groupKey: group, canonicalFieldKey: { not: key }, mergedIntoKey: null, status: { in: ["DRAFT", "PUBLISHED"] } }, select: { canonicalFieldKey: true, label: true, aliases: true } });
    const twin = twins.find((t) => [t.label ?? "", ...t.aliases].some((x) => normalizeLabel(x) === want));
    if (twin) throw problem(409, "Same name", `"${b.name}" is already the name of ${twin.label ?? twin.canonicalFieldKey} in this group. If they mean the same, merge them; otherwise choose another name.`);
    const old = (newest.labelChecked && newest.label) || key;
    try {
      const { row } = await revise(this.db.canonicalField, rows, { label: b.name, groupKey: group, labelChecked: true }, actor.id, strip);
      await this.audit.log(workspaceId, actor.id, "renamed", "field", key, `${actor.name} renamed field ${key} from "${old}" to "${b.name}" (draft v${row.version})`);
      return { key, name: b.name, version: row.version, status: row.status };
    } catch (e) {
      if (/canonical_field_name_unique|Unique constraint/.test(String(e))) throw problem(409, "Same name", `"${b.name}" is already a field's name in this group.`);
      throw e;
    }
  }

  /** C3.15 for sections: a direct, versioned title change; another section's title is refused. */
  async renameSection(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parseName(body);
    const workspaceId = await this.ws.id();
    const all = await this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
    const rows = all.filter((s) => s.sectionKey === key);
    if (!rows.length) throw problem(404, "Not found", `There is no section ${key}.`);
    const latest = new Map<string, string>(); for (const s of all) if (!latest.has(s.sectionKey)) latest.set(s.sectionKey, s.title);
    const twin = [...latest].find(([k, t]) => k !== key && normalizeLabel(t) === normalizeLabel(b.name));
    if (twin) throw problem(409, "Same name", `There is already a section called "${twin[1]}". Use that one, or choose another title.`);
    const old = latest.get(key);
    const { row } = await revise(this.db.logicalSection, rows, { title: b.name }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "renamed", "section", key, `${actor.name} renamed section "${old}" to "${b.name}" (draft v${row.version})`);
    return { key, name: b.name, version: row.version, status: row.status };
  }

  /** The names of the shared fields a list reads ("Family name"; null when the name was never confirmed: the screen
   *  derives one from the key). */
  private async fieldNames(workspaceId: string): Promise<Map<string, string | null>> {
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { canonicalFieldKey: true, label: true, labelChecked: true } });
    const out = new Map<string, string | null>(); for (const r of rows) if (!out.has(r.canonicalFieldKey)) out.set(r.canonicalFieldKey, (r.labelChecked && r.label) || null);
    return out;
  }

  /** C3.14 (Screen 04 BR-15, RULES-MODEL §7, P-37): the Checks list, read-only. One row per check across combinations
   *  (its newest draft or published version in each), with its kind, what it is about, the fields it reads, whether it
   *  stops or warns, where it is used, its source (a check with none is flagged) and its origin. Nothing is authored
   *  here (P-28): checks are proposed on To review and set per combination. */
  async checks() {
    const workspaceId = await this.ws.id();
    const [rows, combos, names] = await Promise.all([
      this.db.check.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
      this.db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, combinationKey: true } }),
      this.fieldNames(workspaceId),
    ]);
    const cur = current(rows, (k) => `${k.combinationId}|${k.checkKey}`);
    const byKey = new Map<string, typeof cur>(); for (const k of cur) byKey.set(k.checkKey, [...(byKey.get(k.checkKey) ?? []), k]);
    const label = new Map(combos.map((c) => [c.id, c]));
    const out = [...byKey].map(([key, ks]) => {
      // Review c314 M1: each combination keeps its own values (effect, message, source, origin); the row says when they differ.
      const per = ks.filter((x) => label.has(x.combinationId)).map((x) => { const c = label.get(x.combinationId)!; return { combination: { id: c.id, key: c.combinationKey, label: c.label }, serious: x.severity === "block", message: x.message, source: x.sourceQuote ?? null, unsourced: !x.sourceQuote, sample: x.illustrative, origin: x.origin, status: x.status }; }).sort((a, b) => a.combination.label.localeCompare(b.combination.label));
      const same = (f: (x: (typeof per)[number]) => unknown) => new Set(per.map((x) => JSON.stringify(f(x)))).size <= 1;
      const differs = !(same((x) => x.serious) && same((x) => x.message) && same((x) => x.source) && same((x) => x.origin) && same((x) => x.sample));
      const k = ks[0], one = per[0];
      const reads = [...new Set(ks.flatMap((x) => fieldsOf(x.predicateJson)))];
      const kind = CHECK_TIER[k.checkGroup] ?? "other";
      return { key, kind, kind_word: TIER_WORD[kind], group: k.checkGroup, group_word: GROUP_WORD[k.checkGroup] ?? k.checkGroup.replace(/_/g, " "), about: k.appliesTo, reads: reads.map((f) => ({ key: f, name: names.get(f) ?? null })), used_in: per.map((x) => x.combination), differs, per_combination: per,
        // The shared values, only when every combination holds the same (otherwise null: the screen says "Differs by combination").
        message: differs ? null : one?.message ?? null, serious: differs ? null : one?.serious ?? null, source: differs ? null : one?.source ?? null, unsourced: differs ? null : one?.unsourced ?? true, sample: per.some((x) => x.sample), origin: differs ? null : one?.origin ?? null, status: per.some((x) => x.status === "DRAFT") ? "DRAFT" : one?.status ?? "PUBLISHED" };
    });
    return out.sort((a, b) => a.kind_word.localeCompare(b.kind_word) || a.group_word.localeCompare(b.group_word) || a.key.localeCompare(b.key));
  }

  /** C3.14 (P-37, RULES-MODEL §2, Screen 04 view 10): Shared library › Rules, read-only. Every rule in one place as a
   *  sentence (when …, then …) with where it lives (the combination and its tab, where it is changed), the fields it
   *  reads, its source (none flagged) and origin: a combination's rules, the conditions on its form lines and its
   *  checklist lines, and the conditions on questions (used by every combination that picks the section). */
  async rules() {
    const workspaceId = await this.ws.id();
    const [preds, forms, docs, questions, picks, combos, names, types, sections] = await Promise.all([
      this.db.predicate.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
      this.db.combinationForm.findMany({ where: { workspaceId, status: { in: [...LIVE] } }, include: { form: { select: { formKey: true } } } }),
      this.db.documentRequirement.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
      this.db.sectionQuestion.findMany({ where: { workspaceId, status: { in: [...LIVE] } } }),
      this.db.sqrSectionSelection.findMany({ where: { workspaceId } }),
      this.db.combination.findMany({ where: { workspaceId }, select: { id: true, label: true, combinationKey: true } }),
      this.fieldNames(workspaceId),
      this.db.documentType.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { documentTypeKey: true, name: true } }),
      this.db.logicalSection.findMany({ where: { workspaceId }, orderBy: { version: "desc" }, select: { sectionKey: true, title: true } }),
    ]);
    const combo = new Map(combos.map((c) => [c.id, { id: c.id, key: c.combinationKey, label: c.label }]));
    const typeName = new Map<string, string>(); for (const t of types) if (!typeName.has(t.documentTypeKey)) typeName.set(t.documentTypeKey, t.name);
    const sectionTitle = new Map<string, string>(); for (const t of sections) if (!sectionTitle.has(t.sectionKey)) sectionTitle.set(t.sectionKey, t.title);
    const reads = (c: unknown) => [...new Set(fieldsOf(c))].map((f) => ({ key: f, name: names.get(f) ?? null }));
    const status = (x: { status: string }) => x.status;
    type Row = { id: string; kind: "rule" | "form_line" | "checklist_line" | "question"; kind_word: string; when: string | null; then: string; lives_on: { combination: { id: string; key: string; label: string } | null; section: string | null; tab: string; tab_word: string }; used_in: { id: string; key: string; label: string }[]; reads: { key: string; name: string | null }[]; source: string | null; unsourced: boolean; origin: string; status: string };
    const out: Row[] = [];
    for (const r of current(preds, (r) => `${r.combinationId}|${r.predicateKey}`)) {
      const c = combo.get(r.combinationId) ?? null;
      out.push({ id: `rule:${r.id}`, kind: "rule", kind_word: RULE_KIND.rule, when: r.whenPlain, then: r.thenPlain, lives_on: { combination: c, section: null, tab: "questionnaires", tab_word: "Questionnaires tab" }, used_in: c ? [c] : [], reads: reads(r.predicateJson), source: r.sourceQuote, unsourced: !r.sourceQuote, origin: r.origin, status: status(r) });
    }
    for (const l of current(forms, (l) => `${l.combinationId}|${l.lineageKey}`).filter((l) => l.predicateJson || l.conditionPlain)) {
      const c = combo.get(l.combinationId) ?? null;
      out.push({ id: `form_line:${l.id}`, kind: "form_line", kind_word: RULE_KIND.form_line, when: l.conditionPlain, then: `${l.form.formKey} is needed`, lives_on: { combination: c, section: null, tab: "forms", tab_word: "Forms tab" }, used_in: c ? [c] : [], reads: reads(l.predicateJson), source: l.sourceQuote, unsourced: !l.sourceQuote, origin: l.origin, status: status(l) });
    }
    for (const d of current(docs, (d) => `${d.combinationId}|${d.lineageKey}`).filter((d) => d.predicateJson || d.conditionPlain)) {
      const c = combo.get(d.combinationId) ?? null;
      out.push({ id: `checklist_line:${d.id}`, kind: "checklist_line", kind_word: RULE_KIND.checklist_line, when: d.conditionPlain, then: `${typeName.get(d.documentTypeKey) ?? d.documentTypeKey} is needed`, lives_on: { combination: c, section: null, tab: "documents", tab_word: "Documents tab" }, used_in: c ? [c] : [], reads: reads(d.predicateJson), source: d.sourceQuote, unsourced: !d.sourceQuote, origin: d.origin, status: status(d) });
    }
    const pickedBy = new Map<string, string[]>(); for (const p of picks) pickedBy.set(p.sectionKey, [...(pickedBy.get(p.sectionKey) ?? []), p.combinationId]);
    for (const q of current(questions, (q) => q.lineageKey).filter((q) => q.predicateJson || q.conditionPlain)) {
      const used = (pickedBy.get(q.sectionKey) ?? []).map((id) => combo.get(id)).filter((c): c is NonNullable<typeof c> => !!c).sort((a, b) => a.label.localeCompare(b.label));
      out.push({ id: `question:${q.id}`, kind: "question", kind_word: RULE_KIND.question, when: q.conditionPlain, then: `Ask ${names.get(q.canonicalFieldKey) ?? fieldWord(q.canonicalFieldKey)}${q.conditionEffect === "HIDE" ? " (hidden when this holds)" : q.conditionEffect === "OPTIONAL" ? " (optional when this holds)" : ""}`, lives_on: { combination: null, section: sectionTitle.get(q.sectionKey) ?? q.sectionKey, tab: "questionnaires", tab_word: "the section's question" }, used_in: used, reads: reads(q.predicateJson), source: null, unsourced: true, origin: q.origin, status: status(q) });
    }
    const order = { rule: 0, form_line: 1, checklist_line: 2, question: 3 } as const;
    return out.sort((a, b) => order[a.kind] - order[b.kind] || (a.lives_on.combination?.label ?? "").localeCompare(b.lives_on.combination?.label ?? "") || a.then.localeCompare(b.then));
  }
}

/** C3.14 (challenge M8, accepted by the Lead): the kind of a check, from a written mapping of its stored group onto
 *  RULES-MODEL §7's kinds; a group that does not map cleanly shows "Other". Official rules mix document, form and
 *  answer checks, so they stay Other until each check carries its kind. Field validation lives on the field (tier 1);
 *  AI review objectives are not built yet (no screen creates them). */
const CHECK_TIER: Record<string, "consistency" | "document_validity"> = { cross_record: "consistency", read_back: "consistency", readiness_warning: "document_validity" };
const TIER_WORD: Record<string, string> = { field_validation: "Field validation", consistency: "Consistency", document_validity: "Document validity", ai_review: "AI review", other: "Other" };
const GROUP_WORD: Record<string, string> = { official_rule: "Official rule", readiness_warning: "Readiness warning", cross_record: "Answers compared", read_back: "Read back from the filled form" };
const fieldWord = (key: string) => { const w = (key.split(".").pop() ?? key).replace(/_/g, " "); return w.charAt(0).toUpperCase() + w.slice(1); };
const RULE_KIND = { rule: "Rule", form_line: "Condition on a form", checklist_line: "Condition on a document", question: "Condition on a question" } as const;

const NameBody = z.object({ name: z.string({ error: "Give the new name." }).trim().min(2, "A name has at least two characters.").max(80, "Keep the name under 80 characters.") });
const parseName = (body: unknown) => { const r = NameBody.safeParse(body); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };

@Controller("api")
export class LibrarySourcesController {
  constructor(@Inject(LibrarySources) private readonly s: LibrarySources) {}
  @Get("library/:kind/:key/sources") sources(@Param("kind") kind: string, @Param("key") key: string) { return this.s.sources(kind, key); }
  @Patch("library/fields/:key/name") renameField(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.renameField(actorOf(a), key, b); }
  @Patch("library/sections/:key") renameSection(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown) { return this.s.renameSection(actorOf(a), key, b); }
  @Get("library/checks") checks(@Headers("x-actor") a: H) { readerOf(a); return this.s.checks(); }
  @Get("library/rules") rules(@Headers("x-actor") a: H) { readerOf(a); return this.s.rules(); }
}
