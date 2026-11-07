// Forms channels and the shared-field library (forms lane; P-61, P-65, P-107). No AI anywhere in this file.
//   channels:   each line's channel (Online, PDF upload, Paper, Not needed) and signature (P-143, W1-10 slice 1), within
//               what IRCC accepts for the combination's IRCC account; the filing method is derived.
//               Online stays selectable and is filled by the browser extension in a later wave (P-102, P-107).
//   library:    aliases, answer lists and option maps, list purposes, and reviewed merges (P-65).
// W1-02 (P-102): portal capture, online versions and their screen maps, the portal choice and online drafting are parked
// with the browser extension on branch lead/parked-extension-2026-10-26; forms come in only as PDFs.
import { Body, Controller, Delete, Get, Headers, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post } from "@nestjs/common";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, type FormEdition } from "@prisma/client";
import { ACCOUNT_WORDS, CHANNEL_WORDS, SetAccount, SIGNATURE_FITS, SIGNATURE_WORDS, signatureFits, signatureMisfitWords, type Channel, type Signature, SetOptionMap, SetOptionMaps, type OptionMapGroup, type OptionMapsView, SetListPurpose, LIST_PURPOSES, LIST_OVERFLOWS, DecideMerge, LinkAnswerList, NewAlias, NewAnswerList, NewMerge, SetChannel } from "../../contracts/forms.ts";
import { acceptsOf, allowedChannels, channelProblems, channelsView, notAcceptedWords, notNeededWords } from "../../engine/channels.ts";
import { compareEditions } from "../../engine/programs.ts";
import { formCombinations } from "./where-used.ts";
import { asksMore, choiceRows, draftOptionMap, hasCodes, optionMapProblems, pdfOptions, printedNear, type FormOption, type ListValue, type OptionMap } from "../../engine/options.ts";
import { buildSnapshot, effective } from "../../engine/snapshot.ts";
import { normLabel } from "../../engine/twin.ts";
import { Sources } from "./sources.ts";
import { Intake } from "./intake.ts";
import { Checklists } from "./checklist.ts";
import { seedFormsStory } from "./forms-demo.ts";
import { noFreeAdd } from "./library-sources.ts";
import { ChangeSets } from "./change-sets.ts";
import type { ChangeItem } from "../../contracts/change-set.ts";
import { actorOf, ACTORS, Audit, Db, fail, need, revise, SOLUTION, strip, Workspace, type Actor } from "./core.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { mergeScopeRefusal } from "../../engine/field-scope.ts"; // C3.16
import type { z } from "zod";

const nameOf = (id: string) => ACTORS.find((a) => a.id === id)?.name ?? id;
const conflict = (msg: string) => fail(msg, HttpStatus.CONFLICT);
/** Channel saves are a few rows; the default 5 s is kept short on purpose but busy machines need room (23 Oct). */
const CHANNEL_TX = { timeout: 20_000, maxWait: 10_000 };
/** Two saves that both made a new version of a released line: the database keeps one; the other is a 409. */
const raced = (e: unknown): never => { if ((e as { code?: string } | null)?.code === "P2002") conflict("This line was changed at the same moment: refresh to see it."); throw e; };
type Versioned = { id: string; version: number; status: string };
type Library = Awaited<ReturnType<Forms["libraryRows"]>>;
type Delegate = Parameters<typeof revise>[0];
const json = (v: unknown) => v as Prisma.InputJsonValue;
/** A request body checked against its contract; a mismatch is a 400 Problem Details with field errors. */
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  // QA-27: a list where one set of details is expected is refused in plain words (text, numbers and broken JSON are
  // refused earlier, by the body parser).
  if (Array.isArray(input)) fail("Send the details as one JSON object, not a list.");
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}

@Injectable()
export class Forms {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(ChangeSets) private readonly sets: ChangeSets) {}

  private editionView(e: FormEdition) { return { id: e.id, label: e.editionLabel, channel: e.channel, fingerprint: e.sha256, questions: e.dataBoundBoxes }; }

  /** A PDF edition by id; an online version (parked with the browser extension, on an older database) is not found. */
  private async pdfEdition(id: string) {
    const ed = await this.db.formEdition.findUniqueOrThrow({ where: { id } });
    if (ed.channel === "ONLINE") fail("This form edition is not in the library (online versions are parked with the browser extension).", HttpStatus.NOT_FOUND);
    return ed;
  }

  // ───────────────────────────────────────────────────────────── library rows
  private async libraryRows(workspaceId: string, db: Pick<Db, "canonicalField"> = this.db) {
    const rows = await db.canonicalField.findMany({ where: { workspaceId }, orderBy: { version: "desc" } });
    const newest = new Map<string, (typeof rows)[number]>(); for (const r of rows) if (!newest.has(r.canonicalFieldKey)) newest.set(r.canonicalFieldKey, r);
    return [...newest.values()];
  }

  /** The library field (other than `except`) that already answers to this label: an alias or its own name. */
  private namedBy(rows: Library, label: string, except: string) {
    const k = normLabel(label);
    // QA-219: its name as shown (a rename's label) counts too, not only the key's words.
    return rows.find((r) => r.canonicalFieldKey !== except && !r.mergedIntoKey && r.status !== "RETIRED" && (r.aliases.some((a) => normLabel(a) === k) || normLabel(r.canonicalFieldKey.split(".").slice(1).join(" ").replace(/_/g, " ")) === k || (!!r.labelChecked && !!r.label && normLabel(r.label) === k)));
  }
  /** QA-219: a library field in words for a refusal a person reads on its page: its confirmed name, else its key's words. */
  private shown(rows: Library, key: string) {
    const r = rows.find((x) => x.canonicalFieldKey === key), w = (key.split(".").pop() ?? key).replace(/_/g, " ");
    return (r?.labelChecked && r.label) || w.charAt(0).toUpperCase() + w.slice(1);
  }

  async editions(formKey: string) {
    const workspaceId = await this.ws.id();
    const def = await this.db.govFormDef.findUnique({ where: { workspaceId_formKey: { workspaceId, formKey } }, include: { editions: { include: { _count: { select: { maps: true } } } } } });
    if (!def) fail(`${formKey} is not in the library.`, HttpStatus.NOT_FOUND);
    return def!.editions.filter((e) => e.channel !== "ONLINE").map((e) => ({ ...this.editionView(e), mapped: e._count.maps }));
  }

  async setChannel(actor: Actor, combinationId: string, lineKey: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetChannel, body);
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    await this.db.$transaction((tx) => this.channelOf(tx, c, lineKey, b, actor), CHANNEL_TX).catch(raced);
    return this.channels(combinationId);
  }

  /** One line's channel and signature (P-143), claimed on what the screen showed. A checklist is not filed, so it has
   *  neither. C-2: the signature fits the channel; a channel change keeps a signature that still fits, else takes the
   *  channel's default. C-3, C-4: only a way IRCC accepts for the form's current edition and the combination's account. */
  private async channelOf(tx: Prisma.TransactionClient, c: { id: string; workspaceId: string; label: string; portalKey: string | null }, lineKey: string, b: { channel: Channel; signature?: Signature; from?: Channel; fromSignature?: Signature }, actor: Actor) {
    const rows = await tx.combinationForm.findMany({ where: { combinationId: c.id, lineageKey: lineKey }, include: { form: { select: { formKind: true, editions: { include: { accepts: true } } } } } });
    // Break m7: an unknown key is not echoed back at any length.
    if (!rows.length) fail(`${lineKey.length > 40 ? `${lineKey.slice(0, 40)}…` : lineKey} is not a form of this combination.`, HttpStatus.NOT_FOUND);
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (newest.status === "RETIRED") fail(`${lineKey} was removed from this combination.`, HttpStatus.NOT_FOUND);
    if (newest.form.formKind !== "data_form") fail(`${lineKey} is a checklist: it is not filed, so it has no channel.`);
    if (b.from && newest.channel !== b.from) conflict(`${lineKey} was changed to ${CHANNEL_WORDS[newest.channel]} while you were choosing. Your choice was not saved; check it and choose again.`);
    if (b.fromSignature && newest.signature !== b.fromSignature) conflict(`${lineKey}'s signature was changed to ${SIGNATURE_WORDS[newest.signature].toLowerCase()} while you were choosing. Your choice was not saved; check it and choose again.`);
    const channel = b.channel;
    const signature: Signature = b.signature ?? (signatureFits(channel, newest.signature) ? newest.signature : SIGNATURE_FITS[channel][0]);
    if (newest.channel === channel && newest.signature === signature) return;
    if (!signatureFits(channel, signature)) fail(signatureMisfitWords(lineKey, channel, signature));
    if (newest.channel !== channel) {
      const current = newest.form.editions.filter((e) => e.channel !== "ONLINE").sort(compareEditions).at(-1);
      const records = current?.accepts.map((a) => ({ account: a.account, channels: a.channels as Channel[], basis: a.basis, quote: a.quote }));
      const { channels, record } = allowedChannels(records, c.portalKey);
      if (channel === "NOT_NEEDED" && !channels.includes("NOT_NEEDED")) fail(notNeededWords(lineKey, c.portalKey));
      if (record && !channels.includes(channel)) fail(notAcceptedWords(lineKey, channel, record));
    }
    if (newest.status === "DRAFT") { const n = await tx.combinationForm.updateMany({ where: { id: newest.id, channel: newest.channel, signature: newest.signature }, data: { channel, signature, origin: "HUMAN", updatedBy: actor.id } }); if (!n.count) conflict(`${lineKey} was changed at the same moment: refresh to see it.`); }
    else await revise(tx.combinationForm, rows.map(({ form, ...r }) => { void form; return r; }), { channel, signature }, actor.id, strip);
    const was = `${CHANNEL_WORDS[newest.channel]}, ${SIGNATURE_WORDS[newest.signature].toLowerCase()}`, now = `${CHANNEL_WORDS[channel]}, ${SIGNATURE_WORDS[signature].toLowerCase()}`;
    await this.audit.log(c.workspaceId, actor.id, "changed", "form line", lineKey, `${actor.name} set how ${lineKey} is filed in "${c.label}": ${was} → ${now}`, undefined, c.id);
  }

  /** Plan §8 Q1 (P-143): the IRCC account the combination files through; what IRCC accepts is then read for it (C-3).
   *  Lines already saved are not changed: a line the account no longer accepts shows as a problem until it is chosen again. */
  async setAccount(actor: Actor, combinationId: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetAccount, body);
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    if (c.retiredAt) fail(`"${c.label}" is retired.`, HttpStatus.CONFLICT);
    const w = (a: string | null) => (a ? ACCOUNT_WORDS[a as "ANY"] ?? a : "not set");
    // Break M3: saved only over the account the person saw, so of two saves at once one is refused and the history is right.
    if (c.portalKey !== b.from) conflict(`The IRCC account of "${c.label}" was changed to ${w(c.portalKey)} while you were choosing. Your choice was not saved; check it and choose again.`);
    if (c.portalKey === b.account) return this.channels(combinationId);
    const n = await this.db.combination.updateMany({ where: { id: combinationId, portalKey: b.from, retiredAt: null }, data: { portalKey: b.account } });
    if (!n.count) conflict(`The IRCC account of "${c.label}" was changed at the same moment: refresh to see it.`);
    await this.audit.log(c.workspaceId, actor.id, "changed", "combination", c.combinationKey, `${actor.name} set the IRCC account of "${c.label}": ${w(b.from)} → ${w(b.account)}`, undefined, c.id);
    return this.channels(combinationId);
  }

  async channels(combinationId: string) {
    const c = await this.db.combination.findUniqueOrThrow({ where: { id: combinationId } });
    const { snapshot } = await buildSnapshot(this.db, c.workspaceId, combinationId, "draft");
    return { ...channelsView(snapshot), problems: channelProblems(snapshot, await acceptsOf(this.db, c.workspaceId)) };
  }

  // ───────────────────────────────────────────────────────────── library: aliases, answer lists, option maps (P-65)
  async addAlias(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parse(NewAlias, body);
    const workspaceId = await this.ws.id();
    const k = normLabel(b.alias);
    if (!/[\p{L}\p{N}]/u.test(k)) fail("A name needs letters or digits.");
    // QA-219 break m5: a name shaped like a field key is a key, not a name a form's wording uses.
    if (/^[a-z]+\.[a-z0-9_]+$/.test(b.alias.trim())) fail("Use words a form uses (for example \"Second phone number\"), not a field key.");
    // Read and written under a row lock: aliases added at the same moment are all kept (break m8). QA-219 break M1: one
    // lock per workspace for names, so the same name added to two fields at the same moment is kept on one only.
    const u = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`field-names:${workspaceId}`}))`;
      const rows = await this.libraryRows(workspaceId, tx);
      const f = rows.find((r) => r.canonicalFieldKey === key);
      if (f?.mergedIntoKey) conflict(`This field was merged into "${this.shown(rows, f.mergedIntoKey)}": add the name there.`);
      if (!f || f.status === "RETIRED") fail("This field is not in the library (it may have been removed since the page was opened).", HttpStatus.NOT_FOUND);
      await tx.$queryRaw`SELECT id FROM canonical_field WHERE id = ${f!.id}::uuid FOR UPDATE`;
      const other = this.namedBy(await this.libraryRows(workspaceId, tx), b.alias, key);
      if (other) conflict(`"${b.alias}" already names the field "${this.shown(rows, other.canonicalFieldKey)}": one name points to one shared field. If the two mean the same, merge them instead.`);
      const now = await tx.canonicalField.findUniqueOrThrow({ where: { id: f!.id } });
      if (now.aliases.some((a) => normLabel(a) === k)) return null;
      return tx.canonicalField.update({ where: { id: f!.id }, data: { aliases: [...now.aliases, b.alias] } });
    });
    if (!u) return { key, aliases: (await this.libraryRows(workspaceId)).find((r) => r.canonicalFieldKey === key)!.aliases };
    await this.audit.log(workspaceId, actor.id, "added", "alias", key, `${actor.name} added "${b.alias}" as a label of ${key}`);
    return { key, aliases: u.aliases };
  }

  async answerLists() {
    const workspaceId = await this.ws.id();
    const rows = await this.db.answerList.findMany({ where: { workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } });
    return effective(rows, (l) => l.answerListKey, "draft").map((l) => ({ key: l.answerListKey, label: l.label, version: l.version, status: l.status, basis: l.sourceBasis, values: l.values.map((v) => ({ key: v.valueKey, label: v.label })) }));
  }

  async createAnswerList(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewAnswerList, body);
    const workspaceId = await this.ws.id();
    if (await this.db.answerList.findFirst({ where: { workspaceId, answerListKey: b.key } })) conflict(`An answer list ${b.key} already exists.`);
    const keys = b.values.map((v) => v.key); if (new Set(keys).size !== keys.length) fail("Each value key appears once.");
    const labels = b.values.map((v) => normLabel(v.label)); if (new Set(labels).size !== labels.length) fail("Each value's label appears once (\"Female\" and \"female\" are the same label).");
    await this.db.answerList.create({ data: { workspaceId, answerListKey: b.key, version: 1, status: "DRAFT", label: b.label, origin: "HUMAN", updatedBy: actor.id, values: { create: b.values.map((v, i) => ({ valueKey: v.key, label: v.label, sortOrder: i + 1 })) } } });
    await this.audit.log(workspaceId, actor.id, "created", "answer list", b.key, `${actor.name} created the answer list ${b.key} (${b.values.length} values; Sample until the immigration expert confirms)`);
    return (await this.answerLists()).find((l) => l.key === b.key);
  }

  async linkAnswerList(actor: Actor, key: string, body: unknown) {
    need(actor, "author");
    const b = parse(LinkAnswerList, body);
    const workspaceId = await this.ws.id();
    if (!(await this.db.answerList.findFirst({ where: { workspaceId, answerListKey: b.list } }))) fail(`There is no answer list ${b.list}.`, HttpStatus.NOT_FOUND);
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (!newest || newest.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
    if (newest.mergedIntoKey) conflict(`${key} was merged into ${newest.mergedIntoKey}: give the list to that field.`);
    // A free-text field stays free text (break m10): only a choice field takes an answer list.
    if (!["code", "country", "yes_no", "multi_choice"].includes(newest.valueType)) fail(`${key} holds ${newest.valueType === "text" ? "free text" : `a ${newest.valueType}`}; only a choice field (a code, a country, yes/no or multi choice) takes an answer list.`);
    await revise(this.db.canonicalField, rows, { answerListKey: b.list, dataType: "ENUM" }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "changed", "field", key, `${actor.name} gave ${key} the answer list ${b.list}`);
    return { key, answer_list: b.list };
  }

  /** Takes a field off its answer list (a list linked by mistake must not block release for good; review 1). The
   *  form fields fill as before, from their own code lists; their option maps stay for a later link. */
  async unlinkAnswerList(actor: Actor, key: string) {
    need(actor, "author");
    const workspaceId = await this.ws.id();
    const rows = await this.db.canonicalField.findMany({ where: { workspaceId, canonicalFieldKey: key } });
    const newest = [...rows].sort((x, y) => y.version - x.version)[0];
    if (!newest || newest.status === "RETIRED") fail(`${key} is not in the library.`, HttpStatus.NOT_FOUND);
    if (!newest.answerListKey) return { key, answer_list: null };
    await revise(this.db.canonicalField, rows, { answerListKey: null }, actor.id, strip);
    await this.audit.log(workspaceId, actor.id, "changed", "field", key, `${actor.name} took ${key} off the answer list ${newest.answerListKey}`);
    return { key, answer_list: null };
  }

  /** Drafts the option maps of one PDF edition for every mapped form field whose shared field has an
   *  answer list, without AI. A published row gets a new draft version; released content is untouched. */
  async draftOptionMaps(actor: Actor, editionId: string) {
    need(actor, "author");
    const ed = await this.pdfEdition(editionId);
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const lists = new Map(effective(await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } }), (l) => l.answerListKey, "draft").map((l) => [l.answerListKey, l]));
    const all = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } });
    const optionsOf = this.formOptions(ed, effective(all, (x) => x.dataPath, "draft"));
    const out: ({ form_field: string; caption: string | null; fact: string | null; list: string } & ReturnType<typeof draftOptionMap>)[] = [];
    for (const m of effective(all, (x) => x.dataPath, "draft")) {
      const list = m.outcome === "mapped" && m.canonicalFieldKey ? lists.get(lib.get(m.canonicalFieldKey)?.answerListKey ?? "") : undefined;
      const opts = optionsOf.get(m.dataPath);
      if (!list || !opts?.length) continue;
      const d = draftOptionMap(list.values.map((v) => ({ key: v.valueKey, label: v.label })), opts, m.optionMap as OptionMap | null); // B81 (challenge M6): a person's marks and codes survive a new draft
      if (JSON.stringify(m.optionMap) !== JSON.stringify(d.optionMap)) await revise(this.db.formFieldMap, all.filter((x) => x.dataPath === m.dataPath), { optionMap: json(d.optionMap) }, actor.id, strip);
      out.push({ form_field: m.dataPath, caption: m.caption, fact: m.canonicalFieldKey, list: list.answerListKey, ...d });
    }
    await this.audit.log(ed.workspaceId, actor.id, "drafted", "option maps", ed.editionLabel, `${actor.name} drafted ${out.length} option map${out.length === 1 ? "" : "s"} of ${ed.editionLabel} without AI (${out.filter((o) => o.unmatched.length).length} with values left for a person)`);
    return { edition: ed.editionLabel, channel: ed.channel, option_maps: out };
  }

  /** B81: the option-map step of one PDF edition for a person: every form field on an answer list with its own printed
   *  choices, grouped when they print the same choices and read the same list. Reads only: an unsaved group shows what the
   *  rules suggest, and nothing is written until a person saves. */
  async optionMapsView(editionId: string): Promise<OptionMapsView> {
    const ed = await this.pdfEdition(editionId);
    const lib = new Map((await this.libraryRows(ed.workspaceId)).map((r) => [r.canonicalFieldKey, r]));
    const lists = new Map(effective(await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId }, include: { values: { orderBy: { sortOrder: "asc" } } } }), (l) => l.answerListKey, "draft").map((l) => [l.answerListKey, l]));
    const maps = effective(await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id } }), (x) => x.dataPath, "draft");
    const optionsOf = this.formOptions(ed, maps);
    const groups = new Map<string, OptionMapGroup>(), revisionRows = new Map<string, RevisionRow[]>(), partOf = this.formParts(ed);
    for (const m of maps) {
      const list = m.outcome === "mapped" && m.canonicalFieldKey ? lists.get(lib.get(m.canonicalFieldKey)?.answerListKey ?? "") : undefined;
      const choices = optionsOf.get(m.dataPath);
      if (!list || !choices?.length) continue;
      const listed = list.values.map((v) => ({ key: v.valueKey, label: v.label })), saved = m.optionMap as OptionMap | null;
      const { values, problems } = choiceRows(listed, saved, choices, hasCodes(m.transform));
      const key = JSON.stringify([list.answerListKey, m.canonicalFieldKey, choices, values, !!saved, problems]); // the same problems, or they read apart
      const g = groups.get(key) ?? { list: list.answerListKey, list_label: list.label ?? null, fact: m.canonicalFieldKey!, revision: "", form_fields: [], choices, saved: !!saved, values, problems };
      g.form_fields.push({ data_path: m.dataPath, caption: m.caption, person: m.person, row: m.row, part: printedPart(partOf.get(m.dataPath)) });
      revisionRows.set(key, [...(revisionRows.get(key) ?? []), m]);
      groups.set(key, g);
    }
    for (const [key, g] of groups) g.revision = optionMapRevision(revisionRows.get(key)!);
    const def = await this.db.govFormDef.findUnique({ where: { id: ed.govFormDefId }, select: { formKey: true } });
    return { edition: ed.editionLabel, edition_id: ed.id, combinations: def ? (await formCombinations(this.db, ed.workspaceId, def.formKey)).map((c) => c.label).sort() : [], groups: [...groups.values()] };
  }

  /** What one form field's option map is checked against: its answer list and its own printed codes. */
  private async optionMapTarget(ed: { id: string; workspaceId: string; inventoryFile: string | null }, dataPath: string) {
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath } });
    const m = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!m || m.outcome !== "mapped" || !m.canonicalFieldKey) fail("That form field is not mapped to a shared field.", HttpStatus.NOT_FOUND);
    const field = (await this.libraryRows(ed.workspaceId)).find((r) => r.canonicalFieldKey === m!.canonicalFieldKey);
    const list = field?.answerListKey ? effective(await this.db.answerList.findMany({ where: { workspaceId: ed.workspaceId, answerListKey: field.answerListKey }, include: { values: true } }), (l) => l.answerListKey, "draft")[0] : null;
    if (!list) fail(`${m!.canonicalFieldKey} has no answer list.`, HttpStatus.CONFLICT);
    return { rows, m: m!, list: list!, options: this.formOptions(ed, [m!]).get(dataPath) ?? [] };
  }

  /** Why these choices cannot be saved on this form field: every value on its answer list, every code among its printed
   *  codes, one value per code (B81: the form prints one choice for one answer; a value it does not print is marked, not
   *  given the nearest code), and a mark only on a value the form prints nothing for. */
  private optionMapRefusals(list: { answerListKey: string; values: { valueKey: string; label: string }[] }, options: FormOption[], b: { map: Record<string, string>; unused: string[]; notOnForm: string[] }) {
    const codes = options.map((o) => o.code), values = new Map(list.values.map((v) => [v.valueKey, v.label]));
    const bad = [...[...Object.keys(b.map), ...b.notOnForm].filter((k) => !values.has(k)).map((k) => `"${k}" is not on the answer list ${list.answerListKey}`), ...[...Object.values(b.map), ...b.unused].filter((c) => !codes.includes(c)).map((c) => `"${c}" is not one of this form field's codes`)];
    if (new Set(Object.values(b.map)).size !== Object.values(b.map).length) bad.push("two values share one code");
    const asks = (v: ListValue) => `"${v.label}" is on this form as ${printedNear(v, options).map((o) => `"${o.label}"`).join(" and ")}: which one holds is a further fact the answer does not say, so the immigration expert decides. Until then decide this form field "filled by hand" on To review`;
    for (const k of Object.keys(b.map).filter((x) => values.has(x))) { const v = { key: k, label: values.get(k)! }; if (asksMore(v, options)) bad.push(asks(v)); }
    for (const k of b.notOnForm.filter((x) => values.has(x))) {
      const v = { key: k, label: values.get(k)! }, near = printedNear(v, options);
      if (Object.hasOwn(b.map, k)) bad.push(`"${v.label}" cannot have a code and be marked not on this form`);
      else if (!options.length) bad.push(`"${v.label}" cannot be marked not on this form: this form field's printed choices were not read`);
      else if (asksMore(v, options)) bad.push(asks(v));
      else if (near.length) bad.push(`"${v.label}" is on this form: it prints ${near.map((o) => `"${o.label}"`).join(" and ")}`);
    }
    return bad;
  }

  /** B81 (challenge M4, review M6, break M1, M2; STANDARDS §4): one save at a time and never over someone else's unseen. The
   *  form fields' rows are locked first, so a second save waits, then reads what the first wrote and is refused. */
  private async writeOptionMaps(tx: Prisma.TransactionClient, ed: { id: string }, dataPaths: string[], optionMap: object, baseRevision: string | undefined, actor: Actor, needsRevision: (now: RevisionRow[]) => boolean) {
    await tx.$queryRaw`SELECT id FROM form_field_map WHERE form_edition_id = ${ed.id}::uuid AND data_path = ANY(${dataPaths}) ORDER BY id FOR UPDATE`;
    const all = await tx.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath: { in: dataPaths } } });
    const now = effective(all, (x) => x.dataPath, "draft");
    if ((baseRevision !== undefined || needsRevision(now)) && baseRevision !== optionMapRevision(now)) {
      const last = [...now].sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime())[0];
      fail(`${nameOf(last.updatedBy)} changed these choices since you opened them (at ${last.updatedAt.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST). Nothing was saved. Look at them again, then save.`, HttpStatus.CONFLICT);
    }
    for (const p of dataPaths) await revise(tx.formFieldMap, all.filter((x) => x.dataPath === p), { optionMap: json(optionMap) }, actor.id, strip);
  }

  /** A person sets or corrects one form field's option map (the drafted one left a value or a code open). Every value
   *  must be on the field's answer list and every code among the form field's own choices. */
  async setOptionMap(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const b0 = parse(SetOptionMap, body), b = { ...b0, notOnForm: [...new Set(b0.notOnForm)] }, dataPath = b.dataPath;
    const ed = await this.pdfEdition(editionId);
    const { m, list, options } = await this.optionMapTarget(ed, dataPath);
    const bad = this.optionMapRefusals(list, options, b);
    if (bad.length) fail(`${bad.join("; ")}.`);
    const optionMap = { map: b.map, unused: b.unused, codes: options.map((o) => o.code), ...(b.notOnForm.length ? { notOnForm: b.notOnForm, printed: options } : {}) };
    // Break M2: this field's other route. A person's marks are never overwritten unseen; a save with no marks to lose needs no revision (the API's older callers).
    await this.db.$transaction((tx) => this.writeOptionMaps(tx, ed, [dataPath], optionMap, b.baseRevision, actor, (now) => !!(now[0]?.optionMap as OptionMap | null)?.notOnForm?.length), CHANNEL_TX);
    await this.audit.log(ed.workspaceId, actor.id, "changed", "option map", dataPath, `${actor.name} set the option map of ${m.caption ?? dataPath} on ${ed.editionLabel} (${Object.keys(b.map).length} values${b.notOnForm.length ? `; not on this form: ${labelsOf(list, b.notOnForm)}` : ""})`);
    return { form_field: dataPath, option_map: optionMap };
  }

  /** B81: the same choices saved on every form field of one group, all or none: each must read the same answer list and
   *  print the same codes, so a mark never lands on a form field that prints the value. Codes no value fills are unused. */
  async setOptionMaps(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const b0 = parse(SetOptionMaps, body), b = { ...b0, notOnForm: [...new Set(b0.notOnForm)] }, ed = await this.pdfEdition(editionId), dataPaths = [...new Set(b.dataPaths)];
    const targets: Awaited<ReturnType<Forms["optionMapTarget"]>>[] = [];
    for (const p of dataPaths) targets.push(await this.optionMapTarget(ed, p)); // one at a time: a group can be large
    const same = (t: (typeof targets)[number]) => JSON.stringify([t.list.answerListKey, t.options]) === JSON.stringify([targets[0].list.answerListKey, targets[0].options]);
    if (!targets.every(same)) fail("These form fields do not print the same choices or read the same answer list: save them apart.", HttpStatus.CONFLICT);
    const codes = targets[0].options.map((o) => o.code), used = new Set(Object.values(b.map));
    const optionMap = { map: b.map, unused: codes.filter((c) => !used.has(c)), codes, ...(b.notOnForm.length ? { notOnForm: b.notOnForm, printed: targets[0].options } : {}) };
    const bad = this.optionMapRefusals(targets[0].list, targets[0].options, { ...b, unused: optionMap.unused });
    if (bad.length) fail(`${bad.join("; ")}.`);
    await this.db.$transaction((tx) => this.writeOptionMaps(tx, ed, dataPaths, optionMap, b.baseRevision, actor, () => true), CHANNEL_TX);
    await this.audit.log(ed.workspaceId, actor.id, "changed", "option map", targets[0].list.answerListKey, `${actor.name} set the choices of ${dataPaths.length} form field${dataPaths.length === 1 ? "" : "s"} on ${ed.editionLabel} (${targets[0].list.label}: ${Object.keys(b.map).length} answers${b.notOnForm.length ? `; not on this form: ${labelsOf(targets[0].list, b.notOnForm)}` : ""})`);
    return { form_fields: dataPaths, option_map: optionMap };
  }

  /** F1-P (Screen 02 Q3): a person sets what a list on a form holds and what happens to rows the form has no room
   *  for. Only a row-level map (one of a repeating group's rows) has a purpose; a published row gets a new draft. */
  async setListPurpose(actor: Actor, editionId: string, body: unknown) {
    need(actor, "author");
    const b = parse(SetListPurpose, body), dataPath = b.dataPath;
    const ed = await this.pdfEdition(editionId);
    const rows = await this.db.formFieldMap.findMany({ where: { formEditionId: ed.id, dataPath } });
    const m = effective(rows, (x) => x.dataPath, "draft")[0];
    if (!m) fail("That form field is not on this form's field map.", HttpStatus.NOT_FOUND);
    if (m!.outcome !== "mapped" || m!.row == null) fail(`${m!.caption ?? dataPath} is not one row of a list on the form: only a list's rows have a purpose.`, HttpStatus.UNPROCESSABLE_ENTITY);
    const purpose = { kind: b.kind, overflow: b.overflow };
    if (JSON.stringify(m!.listPurpose) !== JSON.stringify(purpose)) await revise(this.db.formFieldMap, rows, { listPurpose: json(purpose) }, actor.id, strip);
    const words = `${LIST_PURPOSES.find((p) => p.key === b.kind)!.label}; ${LIST_OVERFLOWS.find((o) => o.key === b.overflow)!.label.toLowerCase()}`;
    await this.audit.log(ed.workspaceId, actor.id, "changed", "list purpose", dataPath, `${actor.name} set the list purpose of ${m!.caption ?? dataPath} on ${ed.editionLabel} (${words})`);
    return { form_field: dataPath, list_purpose: purpose, words };
  }

  /** A PDF form field's own choices: from its inventory (resolved options), else from its field map's code list
   *  ("code_list:… (Married=5, …)"), as the filler reads them (review 1). */
  private formOptions(ed: { inventoryFile: string | null }, maps: { dataPath: string; transform: string | null }[]) {
    const out = new Map<string, FormOption[]>();
    if (!ed.inventoryFile) return out;
    const inv = JSON.parse(readFileSync(join(SOLUTION, ed.inventoryFile), "utf8")) as { fields?: { data_path?: string; options_resolved?: [string, string][] | null; options?: unknown; ui?: string | null }[] };
    const box = new Map((inv.fields ?? []).filter((f) => f.data_path).map((f) => [f.data_path!, f]));
    for (const m of maps) { const o = pdfOptions(box.get(m.dataPath) ?? {}, m.transform); if (o.length) out.set(m.dataPath, o); }
    return out;
  }

  /** B81: each form field's part as the form prints it, so a person can tell identical captions apart. */
  private formParts(ed: { inventoryFile: string | null }) {
    if (!ed.inventoryFile) return new Map<string, string>();
    const inv = JSON.parse(readFileSync(join(SOLUTION, ed.inventoryFile), "utf8")) as { fields?: { data_path?: string; heading?: string | null }[] };
    return new Map((inv.fields ?? []).filter((f) => f.data_path && f.heading).map((f) => [f.data_path!, f.heading!]));
  }

  // ───────────────────────────────────────────────────────────── reviewed merges (P-65)
  async merges() { const workspaceId = await this.ws.id(); return this.db.fieldMerge.findMany({ where: { workspaceId }, orderBy: { proposedAt: "desc" } }); }

  async proposeMerge(actor: Actor, body: unknown) {
    need(actor, "author");
    const b = parse(NewMerge, body);
    if (b.keep === b.merge) fail("Choose two different fields.");
    // QA-219 break m10: the reason is read by the second person, so it is said in words.
    if (b.reason.replace(/[^\p{L}\p{N}]/gu, "").length < 10) fail("Say why the two fields mean the same in words (at least 10 letters or digits).");
    const workspaceId = await this.ws.id();
    const rows = await this.libraryRows(workspaceId);
    const keep = rows.find((r) => r.canonicalFieldKey === b.keep), merge = rows.find((r) => r.canonicalFieldKey === b.merge);
    for (const [k, r] of [[b.keep, keep], [b.merge, merge]] as const) if (!r || r.status === "RETIRED" || r.mergedIntoKey) fail(`"${this.shown(rows, k)}" is not an active field of the library (retired or merged since).`, HttpStatus.NOT_FOUND);
    if (keep!.valueType !== merge!.valueType) conflict(`"${this.shown(rows, b.keep)}" and "${this.shown(rows, b.merge)}" take different kinds of answer (${keep!.valueType.replace(/_/g, " ")}, ${merge!.valueType.replace(/_/g, " ")}): fields of different kinds are not the same meaning.`);
    { const no = mergeScopeRefusal(this.shown(rows, b.keep), keep!.scope, this.shown(rows, b.merge), merge!.scope); if (no) conflict(no); } // C3.16 (break 1 on #1054): one scope per field
    // One pending merge per field (break M5): a chain or a cycle of merges waits until the first is decided.
    const pending = await this.db.fieldMerge.findFirst({ where: { workspaceId, status: "PROPOSED", OR: [{ keepKey: { in: [b.keep, b.merge] } }, { mergeKey: { in: [b.keep, b.merge] } }] } });
    // QA-219: said in the fields' names (the field page shows it on the control).
    if (pending) conflict(pending.keepKey === b.keep && pending.mergeKey === b.merge ? "This merge is already waiting for a second person." : `"${this.shown(rows, [b.keep, b.merge].find((k) => k === pending.keepKey || k === pending.mergeKey)!)}" is already in a merge waiting for a second person ("${this.shown(rows, pending.mergeKey)}" into "${this.shown(rows, pending.keepKey)}"): that one is decided first.`);
    // G-CORE B2 (BR-1, BR-2): through the change-set door: the fixed rules check (both fields active, same kind of answer
    // and the same answer list, every condition the swap rewrites still sound, no new loop) refuses in words, nothing
    // written; a stale preview answers "look again". A merge always waits for a second person (BR-4).
    const items: ChangeItem[] = [{ action: "merge", kind: "field", key: b.merge, into: b.keep }];
    const r = await this.sets.guard(items, "person", b.expected, workspaceId);
    let m;
    try {
      m = await this.db.$transaction(async (tx) => {
        const fm = await tx.fieldMerge.create({ data: { workspaceId, keepKey: b.keep, mergeKey: b.merge, reason: b.reason, status: "PROPOSED", proposedBy: actor.id } });
        await this.sets.record(tx, workspaceId, actor.id, items, "person", r, "waiting", { fieldMergeId: fm.id });
        return fm;
      });
    } catch (e) { if ((e as { code?: string }).code === "P2002") conflict(`"${this.shown(rows, b.merge)}" is already in a merge waiting for a second person (proposed at the same moment).`); throw e; }
    await this.audit.log(workspaceId, actor.id, "proposed", "field merge", b.merge, `${actor.name} proposed merging ${b.merge} into ${b.keep}: ${b.reason}`);
    return m;
  }

  /** A different person approves: one id survives; the other becomes its alias and redirects; draft mappings,
   *  placements, conditions and document supplies move to the surviving id (published rows get new draft versions);
   *  frozen releases are not touched. */
  async approveMerge(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(DecideMerge, body);
    const m = await this.db.fieldMerge.findUniqueOrThrow({ where: { id } });
    if (m.status !== "PROPOSED") conflict(`This merge is already ${m.status.toLowerCase()}.`);
    if (m.proposedBy === actor.id) fail("A different person approves a merge (P-15, P-65).", HttpStatus.FORBIDDEN);
    const ws = m.workspaceId, from = m.mergeKey, to = m.keepKey;
    // G-CORE B2 (BR-2): the fixed rules check runs again at approval; a change that fails is refused in words, and a
    // stale preview answers "look again"; nothing moves. (Run before the transaction: it reads every combination's draft.)
    const items: ChangeItem[] = [{ action: "merge", kind: "field", key: from, into: to }];
    // A field retired or merged since the proposal keeps its own words (review 7, break M5), before the full check.
    const newest = async (k: string) => this.db.canonicalField.findFirst({ where: { workspaceId: ws, canonicalFieldKey: k }, orderBy: { version: "desc" } });
    const named = await this.libraryRows(ws);
    for (const k of [to, from]) { const f = await newest(k); if (!f || f.status === "RETIRED" || f.mergedIntoKey) conflict(`"${this.shown(named, k)}" was ${f?.mergedIntoKey ? `merged into "${this.shown(named, f.mergedIntoKey)}"` : "retired"} after this merge was proposed: nothing was changed; reject this merge.`); }
    const checked = await this.sets.guard(items, "person", b.expected, ws);
    const swap = <T>(j: T): T => (j == null ? j : (JSON.parse(JSON.stringify(j).split(`"field":"${from}"`).join(`"field":"${to}"`)) as T));
    const reads = (j: unknown) => !!j && JSON.stringify(j).includes(`"field":"${from}"`);
    const moved: Record<string, number> = {}; const touched = new Set<string>();
    const bump = (k: string, n = 1) => { moved[k] = (moved[k] ?? 0) + n; };
    await this.db.$transaction(async (tx) => {
      const claimed = await tx.fieldMerge.updateMany({ where: { id, status: "PROPOSED" }, data: { status: "APPLIED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: b.note ?? null } });
      if (!claimed.count) conflict("This merge was decided at the same moment.");
      const fields = await tx.canonicalField.findMany({ where: { workspaceId: ws, canonicalFieldKey: { in: [from, to] } }, orderBy: { version: "desc" } });
      const keep = fields.find((f) => f.canonicalFieldKey === to)!, gone = fields.find((f) => f.canonicalFieldKey === from)!;
      // Checked again now (review 7, break M5): both fields still active, or the merge is refused and nothing moves.
      { const no = keep && gone ? mergeScopeRefusal(this.shown(named, to), keep.scope, this.shown(named, from), gone.scope) : null; if (no) conflict(no); } // C3.16: checked again at approval
      for (const [k, f] of [[to, keep], [from, gone]] as const) if (!f || f.status === "RETIRED" || f.mergedIntoKey) conflict(`"${this.shown(named, k)}" was ${f?.mergedIntoKey ? `merged into "${this.shown(named, f.mergedIntoKey)}"` : "retired"} after this merge was proposed: nothing was changed; reject this merge.`);
      // QA-219 break M3: the field that goes away keeps its name too, as a name of the field that stays (so it is not free
      // for a third field), beside its key that redirects and its own other names.
      const own = normLabel(this.shown(named, to)), seen = new Set<string>([own]);
      const names = [...keep.aliases, from, this.shown(named, from), ...gone.aliases].filter((a) => { const n = normLabel(a); if (seen.has(n)) return false; seen.add(n); return true; });
      await tx.canonicalField.update({ where: { id: keep.id }, data: { aliases: names } });
      // QA-219 break M2: a field merged into this one before now redirects to the field that stays (one hop, never a chain).
      await tx.canonicalField.updateMany({ where: { workspaceId: ws, mergedIntoKey: from }, data: { mergedIntoKey: to } });
      if (gone.status === "DRAFT") await tx.canonicalField.update({ where: { id: gone.id }, data: { status: "RETIRED", mergedIntoKey: to, updatedBy: actor.id } });
      else await tx.canonicalField.create({ data: { ...strip(gone), version: gone.version + 1, status: "RETIRED", supersedesId: gone.id, mergedIntoKey: to, updatedBy: actor.id } as Prisma.CanonicalFieldUncheckedCreateInput });
      // Each versioned lineage is moved once, on its newest row (a published row gets a new draft version).
      const moveLineages = async <R extends Versioned>(label: string, delegate: Delegate, rows: R[], keyOf: (r: R) => string, changes: (r: R) => Record<string, unknown>, combOf?: (r: R) => string | null) => {
        const by = new Map<string, R[]>(); for (const r of rows) by.set(keyOf(r), [...(by.get(keyOf(r)) ?? []), r]);
        for (const list of by.values()) { const newest = [...list].sort((x, y) => y.version - x.version)[0]; if (newest.status === "RETIRED") continue; await revise(delegate, list, changes(newest), actor.id, strip); bump(label); const c = combOf?.(newest); if (c) touched.add(c); }
      };
      const maps = await tx.formFieldMap.findMany({ where: { workspaceId: ws } });
      const mapLineages = new Set(maps.filter((r) => r.canonicalFieldKey === from).map((r) => `${r.formEditionId}|${r.dataPath}`));
      await moveLineages("form fields", tx.formFieldMap, maps.filter((r) => mapLineages.has(`${r.formEditionId}|${r.dataPath}`)), (r) => `${r.formEditionId}|${r.dataPath}`, (r) => (r.canonicalFieldKey === from ? { canonicalFieldKey: to } : {}));
      const qs = await tx.sectionQuestion.findMany({ where: { workspaceId: ws } });
      const qLineages = new Set(qs.filter((q) => q.canonicalFieldKey === from || reads(q.predicateJson)).map((q) => q.lineageKey));
      await moveLineages("question placements", tx.sectionQuestion, qs.filter((q) => qLineages.has(q.lineageKey)), (q) => q.lineageKey, (q) => ({ ...(q.canonicalFieldKey === from ? { canonicalFieldKey: to } : {}), ...(reads(q.predicateJson) ? { predicateJson: swap(q.predicateJson) } : {}) }));
      const moveConditions = async <R extends Versioned & { combinationId: string; predicateJson: Prisma.JsonValue }>(label: string, delegate: Delegate, rows: R[], keyOf: (r: R) => string) => {
        const hit = new Set(rows.filter((r) => reads(r.predicateJson)).map(keyOf));
        await moveLineages(label, delegate, rows.filter((r) => hit.has(keyOf(r))), keyOf, (r) => ({ predicateJson: swap(r.predicateJson) }), (r) => r.combinationId);
      };
      await moveConditions("form conditions", tx.combinationForm, await tx.combinationForm.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.lineageKey}`);
      await moveConditions("document conditions", tx.documentRequirement, await tx.documentRequirement.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.lineageKey}`);
      await moveConditions("rules", tx.predicate, await tx.predicate.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.predicateKey}`);
      await moveConditions("checks", tx.check, await tx.check.findMany({ where: { workspaceId: ws } }), (r) => `${r.combinationId}|${r.checkKey}`);
      const types = await tx.documentType.findMany({ where: { workspaceId: ws } });
      const tHit = new Set(types.filter((t) => t.suppliesFacts.includes(from)).map((t) => t.documentTypeKey));
      // QA-256 (B112): whom each fact is about moves with the fact, or a fact about a spouse would read as the holder's own.
      // A document that supplies both, about different people, would make one fact about two people: the merge's check says
      // so before (engine/change-set.ts); this is its guard for a change that lands in between. Refused, nothing moved.
      await moveLineages("document supplies", tx.documentType, types.filter((t) => tHit.has(t.documentTypeKey)), (t) => t.documentTypeKey, (t) => {
        if (!t.suppliesFacts.includes(from)) return { suppliesFacts: t.suppliesFacts };
        const about = { ...((t.suppliesAbout ?? {}) as Record<string, string>) }, whom = about[from] ?? "holder";
        if (t.suppliesFacts.includes(to) && (about[to] ?? "holder") !== whom) conflict(`${t.name} supplies both of these fields, about different people, so merging them would lose whom one is about. Change what it supplies first, then merge. Nothing was merged.`);
        delete about[from];
        if (whom !== "holder") about[to] = whom;
        return { suppliesFacts: [...new Set(t.suppliesFacts.map((f: string) => (f === from ? to : f)))], suppliesAbout: Object.keys(about).length ? (about as Prisma.InputJsonValue) : Prisma.DbNull };
      });
      for (const d of await tx.derivedField.findMany({ where: { workspaceId: ws } })) if (d.inputs.includes(from) || d.reference === from) { await tx.derivedField.update({ where: { id: d.id }, data: { inputs: d.inputs.map((i) => (i === from ? to : i)), reference: d.reference === from ? to : d.reference } }); bump("derived definitions"); }
      const facts = await tx.sampleFact.updateMany({ where: { workspaceId: ws, canonicalFieldKey: from }, data: { canonicalFieldKey: to } }); if (facts.count) bump("sample facts (scaffolding)", facts.count);
      for (const f of await tx.combinationForm.findMany({ where: { workspaceId: ws }, select: { combinationId: true, form: { select: { editions: { select: { id: true } } } } } })) if (f.form.editions.some((e) => [...mapLineages].some((k) => k.startsWith(`${e.id}|`)))) touched.add(f.combinationId);
      await tx.fieldMerge.update({ where: { id }, data: { moved: moved as Prisma.InputJsonValue } });
      // BR-5: its change set is applied (a merge proposed before B2 gets one now, made by its proposer).
      const set = await tx.changeSet.updateMany({ where: { fieldMergeId: id, status: "waiting" }, data: { status: "applied", fingerprint: checked.fingerprint } });
      if (!set.count) await this.sets.record(tx, ws, m.proposedBy, items, "person", checked, "applied", { fieldMergeId: id });
    });
    for (const c of touched) await this.audit.log(ws, actor.id, "merged", "field", from, `${actor.name} approved merging ${from} into ${to} (proposed by ${nameOf(m.proposedBy)}): this combination's draft now reads ${to}`, { moved }, c);
    await this.audit.log(ws, actor.id, "merged", "field", from, `${actor.name} approved merging ${from} into ${to} (proposed by ${nameOf(m.proposedBy)}): ${Object.entries(moved).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing else read it"}; ${from} now redirects to ${to}; releases untouched`, { moved });
    return { ...(await this.db.fieldMerge.findUniqueOrThrow({ where: { id } })), combinations: touched.size };
  }

  async rejectMerge(actor: Actor, id: string, body: unknown) {
    need(actor, "review");
    const b = parse(DecideMerge, body);
    const m = await this.db.fieldMerge.findUniqueOrThrow({ where: { id } });
    if (m.status !== "PROPOSED") conflict(`This merge is already ${m.status.toLowerCase()}.`);
    if (m.proposedBy === actor.id) fail("A different person decides a merge.", HttpStatus.FORBIDDEN);
    const u = await this.db.$transaction(async (tx) => {
      const u = await tx.fieldMerge.update({ where: { id }, data: { status: "REJECTED", decidedBy: actor.id, decidedAt: new Date(), decisionNote: b.note ?? null } });
      await tx.changeSet.updateMany({ where: { fieldMergeId: id, status: "waiting" }, data: { status: "undone" } }); // G-CORE B2 review M1: ended, not applied
      return u;
    });
    await this.audit.log(m.workspaceId, actor.id, "rejected", "field merge", m.mergeKey, `${actor.name} rejected merging ${m.mergeKey} into ${m.keepKey}${b.note ? `: ${b.note}` : ""}`);
    return u;
  }
}

type H = string | undefined;

/** A printed heading without its long instructions ("SECTION B - CHILDREN (Include ALL …)" → "SECTION B - CHILDREN"). */
const printedPart = (h: string | undefined) => (h ? h.split(/\s*\(/)[0].trim() || null : null);
const labelsOf = (list: { values: { valueKey: string; label: string }[] }, keys: string[]) => keys.map((k) => list.values.find((v) => v.valueKey === k)?.label ?? k).join(", ");
type RevisionRow = { dataPath: string; version: number; optionMap: unknown; updatedAt: Date };
/** B81 (challenge M4): what a person saw of a group of form fields: a save against anything else is refused. */
function optionMapRevision(rows: RevisionRow[]) {
  return createHash("sha256").update(JSON.stringify([...rows].sort((x, y) => x.dataPath.localeCompare(y.dataPath)).map((m) => [m.dataPath, m.version, m.updatedAt.toISOString(), m.optionMap]))).digest("hex").slice(0, 16);
}

@Controller("api")
export class FormsController {
  constructor(@Inject(Forms) private readonly f: Forms, @Inject(Db) private readonly db: Db, @Inject(Intake) private readonly intake: Intake, @Inject(Sources) private readonly sources: Sources, @Inject(Checklists) private readonly checklists: Checklists) {}
  /** P-93: the forms lane's part of the demo story (DEMO.md rows 1 and 7), for the runtime lane's seed. */
  @Post("demo/forms-story") story(@Headers("x-actor") a: H, @Body() b: { combinationId?: string } | undefined) {
    return seedFormsStory({ db: this.db, intake: this.intake, sources: this.sources, checklists: this.checklists }, actorOf(a), String(b?.combinationId ?? ""));
  }
  @Get("library/forms/:code/editions") editions(@Param("code") code: string) { return this.f.editions(code); }
  @Post("editions/:id/option-maps/draft") optionMaps(@Headers("x-actor") a: H, @Param("id") id: string) { return this.f.draftOptionMaps(actorOf(a), id); }
  @Get("editions/:id/option-maps") optionMapsView(@Param("id") id: string) { return this.f.optionMapsView(id); }
  @Patch("editions/:id/option-maps") setOptionMap(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setOptionMap(actorOf(a), id, b); }
  @Patch("editions/:id/option-maps/group") setOptionMaps(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setOptionMaps(actorOf(a), id, b); }
  @Patch("editions/:id/list-purposes") setListPurpose(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setListPurpose(actorOf(a), id, b); }
  @Get("combinations/:id/channels") channels(@Param("id") id: string) { return this.f.channels(id); }
  @Patch("combinations/:id/account") account(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.setAccount(actorOf(a), id, b); }
  @Patch("combinations/:id/forms/:line/channel") channel(@Headers("x-actor") a: H, @Param("id") id: string, @Param("line") l: string, @Body() b: unknown) { return this.f.setChannel(actorOf(a), id, l, b); }
  @Post("library/fields/:key/aliases") alias(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.addAlias(actorOf(a), k, b); }
  @Post("library/fields/:key/answer-list") link(@Headers("x-actor") a: H, @Param("key") k: string, @Body() b: unknown) { return this.f.linkAnswerList(actorOf(a), k, b); }
  @Delete("library/fields/:key/answer-list") unlink(@Headers("x-actor") a: H, @Param("key") k: string) { return this.f.unlinkAnswerList(actorOf(a), k); }
  @Get("library/answer-lists") lists() { return this.f.answerLists(); }
  @Post("library/answer-lists") addList(@Headers("x-actor") a: H) { actorOf(a); return noFreeAdd("answer_list"); } // P-158 note b: only from a source (410)
  @Get("library/merges") merges() { return this.f.merges(); }
  @Post("library/merges") propose(@Headers("x-actor") a: H, @Body() b: unknown) { return this.f.proposeMerge(actorOf(a), b); }
  @Post("library/merges/:id/approve") approveMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.approveMerge(actorOf(a), id, b); }
  @Post("library/merges/:id/reject") rejectMerge(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.f.rejectMerge(actorOf(a), id, b); }
}
