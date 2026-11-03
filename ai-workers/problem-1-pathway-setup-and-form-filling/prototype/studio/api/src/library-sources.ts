// S6 Shared library, queue item (2a) (screens lane; P-158 delta items 1 and 6, C3.13, C3.15): every library item comes
// from a source, so the free adds answer 410; each item's sources ("From: IMM 1295 form field …", "checklist IMM 5488 …") and
// where it is used, read from the rows that already hold them (form field maps, checklist requirement quotes, the
// imported release); a versioned rename of a field's name or a section's title through the G-CORE door (rename-door.ts).
// The one door (every item a ProposalItem, a rule as a source) comes in S6 slice 1, on the forms lane's contract v2.
import { Body, Controller, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { current, fieldsOf } from "../../engine/where-used.ts";
import { actorOf, Audit, Db, need, readerOf, Workspace, type Actor } from "./core.ts";
import { itemCombinations, mappedBoxes, usedInBoth, usedInLabels } from "./where-used.ts";
import { renameAnswer, Renames } from "./rename-door.ts";

type H = string | undefined;
const problem = (status: number, title: string, detail: string) =>
  new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail }, status);

// P-158 item 1 (moved to its own file so the G-CORE door imports it without a cycle, B2).
export { noFreeAdd } from "./no-free-add.ts";

/** The URL word for each kind (`GET /library/:kind/:key/sources`). */
const KINDS = { fields: "field", sections: "section", "document-types": "document_type", "answer-lists": "answer_list" } as const;
type Kind = (typeof KINDS)[keyof typeof KINDS];
/** `ref` (UX-A part 4, EXPERIENCE §5): the internal reference behind the words (a release hash, AI run files, a form
 *  field's data path), shown only under Details (for admins). `text` and `quote` never carry one. */
export type SourceLine = { kind: "form_box" | "checklist" | "release" | "ai_run" | "forms" | "rule"; text: string; quote?: string | null; file?: string | null; ref?: string | null };
export type SourcesView = { kind: Kind; key: string; name: string; sources: SourceLine[]; unsourced: boolean; used_in: string[] };

/** "prototype/p1/inventory/imm5488e.text.inventory.json" → "IMM 5488"; any other file keeps its own name. */
const checklistName = (file: string) => {
  const m = /(imm|guide)[\s_-]?(\d{4})/i.exec(file);
  if (m) return `${m[1].toLowerCase() === "imm" ? "IMM" : "Guide"} ${m[2]}`;
  return (file.split("/").pop() ?? file).replace(/(\.text)?\.inventory\.json$|\.[a-z]+$/i, "").replace(/[-_]+/g, " ");
};
/** "the reviewed work-permit release 2c66472f3758; proposed by c1-fieldmap-…" → "From the reviewed work-permit release"
 *  and "proposed by AI"; the hash and the run files go to `ref` (UX-A part 4 review M1: no hash or run file on the main
 *  path). */
const HASH = /\s+[0-9a-f]{7,40}\b/gi;
export const releaseLine = (ref: string | null | undefined): SourceLine => {
  if (!ref) return { kind: "release", text: "From the imported release" };
  const [what, runs] = ref.split("; proposed by ");
  return { kind: "release", text: `From ${what.replace(HASH, "").trim()}`, quote: runs ? "proposed by AI" : null, ref };
};
/** "AI run <id>; accepted by user-A on the review queue (item …)" (or "replayed AI run …; decided by …", "rules run …")
 *  → who proposed it, in words; the run, the person's id and the item go to `ref`. */
export const proposalLine = (ref: string): SourceLine =>
  ({ kind: "ai_run", text: /^rules run /.test(ref) ? "From a rules proposal, accepted on To review" : `From ${/^replayed /.test(ref) ? "a saved AI answer" : "an AI proposal"}, accepted on To review`, ref });
/** A form field in words: its caption, or that it has none (UX-A part 4 n3: never `form field ""`); the data path to `ref`. */
export const boxLine = (prefix: string, edition: string, b: { caption: string | null; dataPath: string }): SourceLine => {
  const cap = (b.caption ?? "").replace(/^\*/, "").trim();
  return { kind: "form_box", text: cap ? `${prefix} ${edition} form field "${cap}"` : `${prefix} ${edition} form field with no label on the form`, ref: cap ? null : b.dataPath };
};
const LIVE = ["PUBLISHED", "DRAFT", "RETIRED"] as const;
/** PR #96 finding (a) (newest version only, while draft or published) and the fields a condition reads: one copy, in the
 *  where-used service (SH2, engine/where-used.ts). */
export { current };

@Injectable()
export class LibrarySources {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Renames) private readonly renames: Renames) {}

  /** Every source of every item of one kind (one read per table, so a list page gets them in one call). */
  async all(kind: Kind, workspaceId: string): Promise<Map<string, SourceLine[]>> {
    const out = new Map<string, SourceLine[]>();
    // PR #96 finding (c): two lines with the same words but different quotes (two lines of one checklist) both stay.
    // UX-A part 4: lines with the same words are one line; their references (Details) are kept together.
    const add = (key: string, l: SourceLine) => { const a = out.get(key) ?? []; const same = a.find((x) => x.text === l.text && (x.quote ?? null) === (l.quote ?? null)); if (!same) a.push(l); else if (l.ref && !(same.ref ?? "").split("\n").includes(l.ref)) same.ref = same.ref ? `${same.ref}\n${l.ref}` : l.ref; out.set(key, a); };
    if (kind === "field" || kind === "answer_list" || kind === "section") {
      const boxes = await mappedBoxes(this.db, workspaceId);
      const fields = await this.db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
      const latest = new Map<string, (typeof fields)[number]>(); for (const f of fields) if (!latest.has(f.canonicalFieldKey)) latest.set(f.canonicalFieldKey, f);
      if (kind === "field") {
        for (const b of boxes) add(b.canonicalFieldKey!, { ...boxLine("From:", b.edition.editionLabel, b), quote: b.evidenceQuote });
        // C3.6 (P-158 (5), plan §6): a fact added for a rule says "Needed by rule …", the rule's key and its sentence.
        for (const f of latest.values()) if (f.sourceRef) add(f.canonicalFieldKey, /^Needed by (Rule|Check|Form condition|Question condition|Document condition) /.test(f.sourceRef) ? { kind: "rule", text: f.sourceRef.split(/; (?:rules|AI) run /)[0] } : f.origin === "AI_PROPOSAL" ? proposalLine(f.sourceRef) : releaseLine(f.sourceRef));
      } else if (kind === "answer_list") {
        for (const b of boxes) { const list = latest.get(b.canonicalFieldKey!)?.answerListKey; if (list) add(list, boxLine("Choices of:", b.edition.editionLabel, b)); }
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

  /** Combinations each item is used in, by label (C3.13 where used). */
  async usedIn(kind: Kind, workspaceId: string): Promise<Map<string, string[]>> {
    return usedInLabels(this.db, workspaceId, kind); // SH2b review m2: one id-to-label mapping, in the service
  }

  /** C3.13: both at once (a list page's usedBy count and its Used in labels, one read). */
  async usedInBoth(kind: Kind, workspaceId: string) {
    return usedInBoth(this.db, workspaceId, kind);
  }

  /** C11.9: the same read by combination id (the lifecycle guard links each use and knows a retired combination). */
  async usedInIds(kind: Kind, workspaceId: string): Promise<Map<string, Set<string>>> {
    return itemCombinations(this.db, workspaceId, kind); // SH2: the one where-used service (P-258)
  }

  /** C3.13 (Screen 04 BR-4, P-37): with a combination chosen, each library item it uses is "Reused" (it was in the library
   *  before this combination: another combination brought it in) or "New here" (this combination brought it in), with
   *  the totals. The combination that brought an item in is the one its first ADD library change names (every way into
   *  the library writes one with the combination it came from: an AI proposal, a document type named on a checklist
   *  line); that record never changes, so a release or an edit elsewhere never flips the mark (review c313 M1, M2). An
   *  item with no such record (loaded with the sample setup's release) was brought in by the first of its combinations
   *  to be released, then the first created. Only items in the library count (review c313 M3: values a rule calculates
   *  are not fields). Without a combination: the combinations to choose from, each with how many items it uses. */
  async reuse(kindWord: string, combination: string | undefined) {
    const kind = (KINDS as Record<string, Kind>)[kindWord];
    if (!kind) throw problem(404, "Not found", `There is no library list "${kindWord}": use fields, sections, document-types or answer-lists.`);
    const workspaceId = await this.ws.id();
    const [combos, usedAll, inLibrary] = await Promise.all([
      this.db.combination.findMany({ where: { workspaceId }, select: { id: true, combinationKey: true, label: true, createdAt: true } }),
      this.usedInIds(kind, workspaceId),
      this.keysOf(kind, workspaceId),
    ]);
    const used = new Map([...usedAll].filter(([k]) => inLibrary.has(k)));
    const uses = (id: string) => [...used.values()].filter((s) => s.has(id)).length;
    const combinations = combos.map((c) => ({ id: c.id, key: c.combinationKey, label: c.label, uses: uses(c.id) })).sort((a, b) => a.label.localeCompare(b.label));
    if (combination === undefined || combination === "") return { combinations, combination: null };
    const chosen = combos.find((c) => c.id === combination || c.combinationKey === combination);
    if (!chosen) throw problem(404, "Not found", "That combination is not in this workspace. Choose one from the list.");
    const mine = [...used].filter(([, s]) => s.has(chosen.id)).map(([k]) => k);
    const [adds, releases] = await Promise.all([
      this.db.libraryChange.findMany({ where: { workspaceId, kind, action: "ADD", key: { in: mine }, combinationId: { not: null } }, orderBy: { proposedAt: "asc" }, select: { key: true, combinationId: true } }),
      this.db.configRelease.groupBy({ by: ["combinationId"], where: { workspaceId }, _min: { releasedAt: true } }),
    ]);
    const addedBy = new Map<string, string>(); for (const a of adds) if (!addedBy.has(a.key) && combos.some((c) => c.id === a.combinationId)) addedBy.set(a.key, a.combinationId!);
    const released = new Map(releases.map((r) => [r.combinationId, r._min.releasedAt?.getTime() ?? Infinity]));
    const rank = (id: string) => { const c = combos.find((x) => x.id === id)!; return [released.get(id) ?? Infinity, c.createdAt.getTime(), c.combinationKey] as const; };
    const before = (a: string, b: string) => { const [x, y] = [rank(a), rank(b)]; return x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2]; };
    const items: Record<string, { in_combination: "REUSED" | "NEW"; brought_in_by: string }> = {};
    for (const key of mine) {
      const first = addedBy.get(key) ?? [...used.get(key)!].reduce((a, b) => (before(b, a) ? b : a));
      items[key] = { in_combination: first === chosen.id ? "NEW" : "REUSED", brought_in_by: combos.find((c) => c.id === first)!.label };
    }
    const all = Object.values(items), reused = all.filter((x) => x.in_combination === "REUSED").length;
    return { combinations, combination: { id: chosen.id, key: chosen.combinationKey, label: chosen.label }, total: all.length, reused, new: all.length - reused, items };
  }

  /** The keys of one kind's items in the library (any version), so a list's counts count only what the list shows. */
  private async keysOf(kind: Kind, workspaceId: string): Promise<Set<string>> {
    if (kind === "field") return new Set((await this.db.canonicalField.findMany({ where: { workspaceId }, distinct: ["canonicalFieldKey"], select: { canonicalFieldKey: true } })).map((r) => r.canonicalFieldKey));
    if (kind === "section") return new Set((await this.db.logicalSection.findMany({ where: { workspaceId }, distinct: ["sectionKey"], select: { sectionKey: true } })).map((r) => r.sectionKey));
    if (kind === "document_type") return new Set((await this.db.documentType.findMany({ where: { workspaceId }, distinct: ["documentTypeKey"], select: { documentTypeKey: true } })).map((r) => r.documentTypeKey));
    return new Set((await this.db.answerList.findMany({ where: { workspaceId }, distinct: ["answerListKey"], select: { answerListKey: true } })).map((r) => r.answerListKey));
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

  /** C3.15 through the G-CORE door (B2, P-266, P-96): an author renames a shared field. The door runs the fixed rules
   *  check (the exact duplicate in its own group among them, BR-7; the database index backs it) and its tier: direct
   *  (a new draft version, logged) or, when a released combination uses it, a second person on To review. */
  async renameField(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parseName(body);
    const workspaceId = await this.ws.id();
    const newest = await this.db.canonicalField.findFirst({ where: { workspaceId, canonicalFieldKey: key }, orderBy: { version: "desc" } });
    if (!newest) throw problem(404, "Not found", `${key} is not in the shared library.`);
    // C11.9 review Ma2: a retired field is restored before it is renamed (said in words, not "not found").
    if (newest.status === "RETIRED") throw problem(409, "Retired", `The field "${(newest.labelChecked && newest.label) || key}" is retired: it takes no new use or change. Restore it in Shared library › Fields first, or choose another.`);
    if (newest.mergedIntoKey) throw problem(409, "Merged", `${key} was merged into ${newest.mergedIntoKey}: rename that field instead.`);
    return this.renames.rename(actor, "field", key, b.name, b.expected);
  }

  /** C3.15 for sections, through the same door: a versioned title change; another section's title is refused. */
  async renameSection(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parseName(body);
    const workspaceId = await this.ws.id();
    const newest = await this.db.logicalSection.findFirst({ where: { workspaceId, sectionKey: key }, orderBy: { version: "desc" } });
    if (!newest) throw problem(404, "Not found", `There is no section ${key}.`);
    if (newest.status === "RETIRED") throw problem(409, "Retired", `The section "${newest.title}" is retired: it takes no new use or change. Restore it in Shared library › Sections first.`); // C11.9
    return this.renames.rename(actor, "section", key, b.name, b.expected);
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
      out.push({ id: `rule:${r.id}`, kind: "rule", kind_word: RULE_KIND.rule, when: r.whenPlain, then: r.thenPlain, lives_on: { combination: c, section: null, tab: "questionnaires", tab_word: "Smart questionnaire (SQR) tab" }, used_in: c ? [c] : [], reads: reads(r.predicateJson), source: r.sourceQuote, unsourced: !r.sourceQuote, origin: r.origin, status: status(r) });
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

// G-CORE B2 (BR-3): `expected` is the fingerprint of the preview the person looked at; a stale one answers "look again".
const NameBody = z.object({ name: z.string({ error: "Give the new name." }).trim().min(2, "A name has at least two characters.").max(80, "Keep the name under 80 characters."), expected: z.string().max(64).nullish() });
const parseName = (body: unknown) => { const r = NameBody.safeParse(body); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };

@Controller("api")
export class LibrarySourcesController {
  constructor(@Inject(LibrarySources) private readonly s: LibrarySources) {}
  @Get("library/reuse/:kind") reuse(@Headers("x-actor") a: H, @Param("kind") kind: string, @Query("combination") combination?: string) { readerOf(a); return this.s.reuse(kind, combination); }
  @Get("library/:kind/:key/sources") sources(@Param("kind") kind: string, @Param("key") key: string) { return this.s.sources(kind, key); }
  // G-CORE B2: 200 when the rename applied now, 202 when it waits for a second person (P-266).
  @Patch("library/fields/:key/name") async renameField(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown, @Res({ passthrough: true }) res: Response) { return renameAnswer(res, await this.s.renameField(actorOf(a), key, b)); }
  @Patch("library/sections/:key") async renameSection(@Headers("x-actor") a: H, @Param("key") key: string, @Body() b: unknown, @Res({ passthrough: true }) res: Response) { return renameAnswer(res, await this.s.renameSection(actorOf(a), key, b)); }
  @Get("library/checks") checks(@Headers("x-actor") a: H) { readerOf(a); return this.s.checks(); }
  @Get("library/rules") rules(@Headers("x-actor") a: H) { readerOf(a); return this.s.rules(); }
}
