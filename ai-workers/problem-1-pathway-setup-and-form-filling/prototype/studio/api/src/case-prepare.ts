// C6.12, C11.6 (M3-B, runtime lane; M3 case view r5c §6; P-122, P-135, P-137, P-171): a case's "Prepare application"
// view. Its filings, submission groups and items are derived from the pinned release and the case on every read and
// stored (tables filing, filing_applicant, submission_group, filing_item) so their ids stay when people change, a split
// stays split and a form keeps the channel the case officer chose. Fees are worked out per group on each read
// (engine/runtime/filings.ts). The case officer reads and changes it; a client and configuration people do not. Visitor
// visa only in this slice; other combinations answer "not derived yet". No model call (US$0). Readiness is C7.6's
// (engine/runtime/readiness.ts, M3-A3): the view leaves its slot and never decides it here.
// One implementation (#356 on #325's tables, migration 20261102030000): #325's guards are kept (the release must match
// its fingerprint, B2; a read with nothing new takes no transaction, B1; HEAD is refused, B4); a filing or item that
// stops applying keeps its row with active = false, so its id (and an item's chosen channel) come back with it.
import { Body, Controller, Get, Head, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { CHANNEL_WORDS } from "../../contracts/forms.ts";
import type { CaseFiling } from "../../contracts/runtime.ts";
import { acceptsOf } from "../../engine/channels.ts";
import { caseChecklist } from "../../engine/runtime/case-checklist.ts";
import { caseView, checkValue, knownOf } from "../../engine/runtime/case.ts";
import { ageOn, cad, deriveFilings, FAMILY_GROUP, feeRule } from "../../engine/runtime/filings.ts";
import { readiness as formReadiness } from "../../engine/runtime/forms.ts";
import { BIOMETRICS_STEP, channelChange, channelOf, prepareVersion, wantedItems, type FormLine } from "../../engine/runtime/prepare.ts";
import { render, type Role } from "../../engine/render.ts";
import { snapshotHash } from "../../engine/snapshot.ts";
import { actorOf, Audit, CaseRead, Db, fail, type Actor } from "./core.ts";
import { Runtime, type Reached } from "./runtime.ts";

type H = string | undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (id: string, what: string) => (UUID.test(id) ? id : fail(`No such ${what}.`, HttpStatus.NOT_FOUND));
const short = (id: string) => id.slice(0, 8);
const ROLE: Record<string, string> = { principal: "principal applicant", spouse_or_partner: "spouse or partner", child: "child" };
const parse = <S extends z.ZodType>(schema: S, input: unknown): z.infer<S> => { const r = schema.safeParse(input ?? {}); if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST); return r.data; };
const stale = (): never => { throw new HttpException({ type: "https://expatready.local/problems/stale", title: "Changed since you read it", status: 409, detail: "This application's filings or items changed since you read them. Reload, then make your change again." }, HttpStatus.CONFLICT); };
const refuse = (status: number, field: string, detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/validation", title: status === 422 ? "Not accepted" : "Some details need fixing", status, detail, errors: [{ field, message: detail }] }, status); };
const Version = z.union([z.string(), z.number()], { error: "Reload: the version you read is missing." });
// Break m2: a reason is plain text: no control characters (C0, C1), no hidden direction marks, separators or zero-width spaces.
const Reason = z.string().trim().max(400, "Keep the reason under 400 characters.").refine((x) => !/[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\u115f\u1160\u3164\uffa0]/.test(x) && !/[\ud800-\udfff]/u.test(x), "Write the reason as plain text: it holds a hidden or control character.")
  // Break r3 m1, m2: joiners that scripts and emoji need (U+200C, U+200D) are allowed; a reason must say something.
  .refine((x) => x === "" || /[\p{L}\p{N}]/u.test(x), "Write the reason in words: it holds no letter or digit.").optional();
const SplitBody = z.object({ filing: z.string({ error: "Choose the filing to split out." }), reason: Reason, version: Version });
const ChannelBody = z.object({ channel: z.unknown(), reason: Reason, version: Version });
const DOB = "person.date_of_birth";

type Item = Awaited<ReturnType<Db["filingItem"]["findMany"]>>[number];

@Injectable()
export class CasePrepare {
  constructor(@Inject(Runtime) private readonly r: Runtime, @Inject(Db) private readonly db: Db, @Inject(Audit) private readonly audit: Audit) {}

  async view(actor: Actor, caseId: string) {
    const c = await this.r.reach(actor, idOf(caseId, "case"), "officer");
    return this.build(actor, c);
  }

  /** Derives, stores what changed (under the case's row lock, so two reads never make two family groups), and answers. */
  private async build(actor: Actor, c: Reached) {
    const s = this.r.snapshotOf(c), pin = c.pins[0];
    // The release must describe the case's own combination (as case-filings.ts): never another combination's filings.
    const own = await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { combinationKey: true, portalKey: true } });
    if (!own || s?.combination?.key !== own.combinationKey) fail("This case's release does not describe the case's own combination; nothing was worked out. Ask the Lead.", HttpStatus.CONFLICT);
    // #325 break B2: a release row edited underneath its fingerprint is never stored from.
    if (snapshotHash(s) !== pin.release.sha256) fail("This case's release no longer matches its fingerprint (it was changed after release); nothing was prepared. Ask the Lead.", HttpStatus.CONFLICT);
    const people = this.r.peopleOf(c), today = new Date();
    const { answers, rows, groups: groupAnswers } = await this.r.state(c);
    // An answer its own checks reject never decides an age or a line (as the checklist, C6.4 B-M2).
    const clean = answers.filter((x) => checkValue(s, x.field, x.value, today).length === 0);
    const ages = new Map(people.filter((p) => p.role !== "case").map((p) => [p.subjectId, ageOn(clean.find((a) => a.subjectId === p.subjectId && a.field === DOB && !a.rowKey)?.value as string | undefined, today)]));
    // M3-0: the filing mode per role is the release's ("Who can be in this application"); a role it leaves out uses the default.
    const modes = new Map(((s.combination.participants ?? []) as { role: string; filingMode?: CaseFiling["mode"] }[]).filter((p) => p.filingMode).map((p) => [p.role, p.filingMode!]));
    const first = deriveFilings(own!.combinationKey, people, undefined, { ages, modes });
    if (!first.derived) return { case_id: c.id, reference: c.reference, release_version: pin.release.version, derived: false, why: first.why, portal: own!.portalKey ?? null, filings: [], groups: [], items: [], fees: [], readiness: [], stage1: [], version: "0" };

    // Items the release and the case give each filer (forms by who and minimum age, the checklist's documents, biometrics).
    const { known } = knownOf(s, people, clean, rows, today);
    const r = render(s, people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Role, label: p.label, applies: p.applies })), known, { today });
    const list = caseChecklist(s, own!.combinationKey, people, known, today);
    const docs = new Map(list.derived ? list.people.map((p) => [p.subject, p.lines]) : []);
    const filers = first.filings.map((f) => f.applicants[0].subject);
    const wanted = wantedItems(filers, r.forms as never, docs as never, feeRule(own!.combinationKey, "biometrics"), ages);

    // #325 break B1: a read with nothing new to store takes no lock; only a read with something to store takes the case's
    // row lock and, under it, reads the stored rows again before writing (only through tx). Break r3 M1: the three reads
    // are one snapshot (one repeatable-read batch on one connection, no lock), so groups, filings, items and the version
    // made from them always agree.
    const read = (q: Tx | Db) => [
      q.submissionGroup.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      q.filing.findMany({ where: { caseId: c.id } }),
      q.filingItem.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    ] as const;
    const sync = async (tx: Tx | Db, write: boolean) => {
      const [g0, filings0, items0] = write ? await Promise.all(read(tx)) : await this.db.$transaction([...read(this.db)], { isolationLevel: "RepeatableRead" });
      let groups = g0;
      const live = new Map(filings0.filter((f) => f.active).map((f) => [f.subjectId, f.id]));
      const wantKeys = new Set(wanted.filter((w) => live.has(w.subject)).map((w) => `${live.get(w.subject)}|${w.kind}|${w.key}|${w.subject}`));
      const has = new Set(items0.map((i) => `${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`));
      const changes = !groups.some((g) => g.kind === "FAMILY")
        || first.filings.some((f) => { const row = filings0.find((x) => x.subjectId === f.applicants[0].subject); return !row || !row.active || row.mode !== f.mode; })
        || filings0.some((x) => x.active && !filers.includes(x.subjectId))
        || [...wantKeys].some((k) => !has.has(k))
        || items0.some((i) => i.active !== wantKeys.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`));
      if (!changes) return { groups, filings: filings0.filter((f) => f.active).sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id.localeCompare(y.id)), items: items0.filter((i) => i.active) };
      if (!write) return null;
      let family = groups.find((g) => g.kind === "FAMILY");
      if (!family) { family = await tx.submissionGroup.create({ data: { workspaceId: c.workspaceId, caseId: c.id, kind: "FAMILY", createdBy: actor.id } }); groups = [family, ...groups]; }
      let filings = await tx.filing.findMany({ where: { caseId: c.id } });
      for (const f of first.filings) {
        const subject = f.applicants[0].subject, row = filings.find((x) => x.subjectId === subject);
        if (!row) await tx.filing.create({ data: { workspaceId: c.workspaceId, caseId: c.id, subjectId: subject, combinationKey: own!.combinationKey, mode: f.mode, submissionGroupId: family.id, applicants: { create: [{ subjectId: subject, role: f.applicants[0].role, mode: "applying" }] } } });
        else if (!row.active || row.mode !== f.mode) await tx.filing.update({ where: { id: row.id }, data: { active: true, mode: f.mode } });
      }
      for (const row of filings.filter((x) => x.active && !filers.includes(x.subjectId))) await tx.filing.update({ where: { id: row.id }, data: { active: false } });
      filings = await tx.filing.findMany({ where: { caseId: c.id, active: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const filingOf = new Map(filings.map((f) => [f.subjectId, f.id]));
      await tx.filingItem.createMany({ data: wanted.filter((w) => filingOf.has(w.subject)).map((w) => ({ workspaceId: c.workspaceId, caseId: c.id, filingId: filingOf.get(w.subject)!, subjectId: w.subject, kind: w.kind, itemKey: w.key })), skipDuplicates: true });
      let items = await tx.filingItem.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      const want = new Set(wanted.map((w) => `${filingOf.get(w.subject)}|${w.kind}|${w.key}|${w.subject}`));
      const gone = items.filter((i) => i.active && !want.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`)).map((i) => i.id);
      const back = items.filter((i) => !i.active && want.has(`${i.filingId}|${i.kind}|${i.itemKey}|${i.subjectId}`)).map((i) => i.id);
      if (gone.length) await tx.filingItem.updateMany({ where: { id: { in: gone } }, data: { active: false } });
      if (back.length) await tx.filingItem.updateMany({ where: { id: { in: back } }, data: { active: true } });
      if (gone.length || back.length) items = await tx.filingItem.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return { groups, filings, items: items.filter((i) => i.active) };
    };
    const stored = (await sync(this.db, false)) ?? await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      return (await sync(tx, true))!;
    }, { timeout: 15_000, maxWait: 10_000 });

    // Fees per stored group: a split filing is priced on its own.
    const groupOfSubject = new Map(stored.filings.map((f) => [f.subjectId, f.submissionGroupId]));
    const kindOf = new Map(stored.groups.map((g) => [g.id, g.kind === "FAMILY" ? "family" as const : "separate" as const]));
    const d = deriveFilings(own!.combinationKey, people, undefined, { ages, modes, groupOf: (subj) => groupOfSubject.get(subj) ?? FAMILY_GROUP, groupKind: (g) => kindOf.get(g) ?? "family" });
    if (!d.derived) fail("The filings could not be worked out.", HttpStatus.CONFLICT);
    const done = d as Extract<typeof d, { derived: true }>;
    const idOfFiling = new Map(stored.filings.map((f) => [`filing-${f.subjectId}`, f.id]));
    const fid = (x: string) => idOfFiling.get(x) ?? x;
    const filings = done.filings.map((f) => ({ id: fid(f.id), combination: f.combination, label: f.label, mode: f.mode, applicants: f.applicants.map((a) => ({ subject: a.subject, label: a.label, role: a.role, mode: f.mode })), group: f.group, status: f.status, number: f.number }));
    const groups = done.groups.map((g) => ({ ...g, filings: g.filings.map(fid), reason: stored.groups.find((x) => x.id === g.id)?.reason ?? null }));
    const fees = done.fees.map((f) => ({ filing: fid(f.filing), subject: stored.filings.find((x) => x.id === fid(f.filing))?.subjectId ?? null, payer: f.payer, key: f.line, line: f.label, amount: f.amount_cents / 100, amount_cents: f.amount_cents, amount_words: cad(f.amount_cents), exempt: f.exempt, reason: f.why, ...(f.waiting ? { waiting: f.waiting } : {}),
      source: (f.source ?? done.groups.find((g) => g.filings.includes(f.filing))?.totals.find((t) => t.line === f.line)?.source)?.url ?? "Sample", source_detail: f.source ?? done.groups.find((g) => g.filings.includes(f.filing))?.totals.find((t) => t.line === f.line)?.source ?? null }));

    // Items in the view: each with one state; a form with its channel, what IRCC accepts and the signature that follows.
    const view = caseView(s, people, answers, rows, "agent", today, groupAnswers);
    const accepts = await acceptsOf(this.db, c.workspaceId);
    const lines = new Map((s.forms as FormLine[]).map((l) => [l.form_number, l]));
    const label = new Map(people.map((p) => [p.subjectId, p.label]));
    const wantedOf = (i: Item) => wanted.find((w) => w.subject === i.subjectId && w.kind === i.kind && w.key === i.itemKey);
    const items = stored.items.map((i) => {
      const w = wantedOf(i), base = { id: i.id, kind: i.kind as "form" | "document" | "step", filing: i.filingId, subject: i.subjectId, person: label.get(i.subjectId) ?? "", version: i.version };
      if (i.kind === "form") {
        const ch = channelOf(lines.get(i.itemKey), accepts.get(i.itemKey), own!.portalKey, i.channel);
        const rd = formReadiness(view, i.itemKey, i.subjectId);
        const waits = w?.applies === "cannot_tell";
        return { ...base, form: i.itemKey, channel: ch.channel, line_channel: ch.line_channel, accepts: ch.accepts, accepts_quote: ch.accepts_basis?.quote ?? null, signature: ch.signature, signed_by: lines.get(i.itemKey)?.signed_by ?? null,
          channel_changed: i.channel ? { by: i.channelBy, at: i.channelAt?.toISOString() ?? null, reason: i.channelReason } : null,
          state: waits ? "cannot_start" : "to_do", reason: waits ? `Cannot start yet: waits for ${(w?.missing ?? []).length || "an"} answer${(w?.missing ?? []).length === 1 ? "" : "s"} that decide${(w?.missing ?? []).length === 1 ? "s" : ""} whether it applies.` : rd.missing.length ? `Waiting for ${rd.missing.length} fact${rd.missing.length === 1 ? "" : "s"} to answer or confirm.` : "Every fact it reads is confirmed." };
      }
      if (i.kind === "document") return { ...base, document_type: w?.document_type ?? i.itemKey, label: w?.label ?? i.itemKey, state: "to_do", reason: "Not requested yet (the checklist, C6.4)." };
      return { ...base, step: BIOMETRICS_STEP.label, neededBefore: "after_filing" as const, state: "cannot_start", reason: w?.applies === "cannot_tell" ? "Waits for the date of birth: no biometrics under 14 or over 79 (VV-R15)." : BIOMETRICS_STEP.after };
    });
    // Stage 1 (C7.7): the facts each filing's forms still wait for, counted before any item.
    const stage1 = filings.map((f) => { const mine = items.filter((i) => i.filing === f.id && i.kind === "form") as { form: string; subject: string }[]; const missing = new Set(mine.flatMap((i) => formReadiness(view, i.form, i.subject).missing.map((m) => `${m.about}|${m.fact}`))); return { filing: f.id, to_confirm: missing.size, confirmed: mine.length && !missing.size ? 1 : 0 }; });
    // C7.6 (M3-A3) fills this from engine/runtime/readiness.ts; until then each filing is not ready and says why.
    const readiness = filings.map((f) => ({ filing: f.id, ready: false, blocks: [] as { code: string; item?: string; words: string }[], warns: [] as { code: string; item?: string; words: string }[], built: false, why: "Ready to file is worked out by C7.6 (not built yet)." }));
    // Review r3 m1: the version from the very rows this view shows (never a later read), so a write from it is checked
    // against what the officer saw.
    const version = versionOf(stored.filings, stored.items);
    const peopleView = people.filter((p) => p.role !== "case").map((p) => { const f = filings.find((x) => x.applicants[0].subject === p.subjectId); const nf = done.not_filing.find((x) => x.subject === p.subjectId); return { subject: p.subjectId, label: p.label, role: p.role, applies: p.applies, age: ages.get(p.subjectId) ?? null, filing: f?.id ?? null, why: nf?.why ?? null }; });
    return { case_id: c.id, reference: c.reference, release_version: pin.release.version, derived: true, combination: own!.combinationKey, portal: own!.portalKey ?? null, portal_words: own!.portalKey ? `Filed through ${own!.portalKey === "APR_PORTAL" ? "APR Portal" : own!.portalKey}: set by the combination, not on the case` : null,
      // #325's list of people with no filing, each with the reason (kept for its readers and tests).
      not_filing: done.not_filing,
      people: peopleView, filings, groups, items, fees, stage1, readiness, currency: done.currency, basis: done.basis, version };
  }

  /** C6.12 (BR-16): split one filing out of a group, with a reason (the family maximum it loses is said first). The
   *  version, the group's size and the filing's place are all checked under the case's row lock (review M1, break M1):
   *  two splits from one read never both pass, so a family group is never emptied. */
  async split(actor: Actor, groupId: string, body: unknown) {
    const g = await this.db.submissionGroup.findUnique({ where: { id: idOf(groupId, "submission group") } });
    if (!g) fail("No such submission group.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, g!.caseId, "officer");
    const b = parse(SplitBody, body);
    const now = await this.build(actor, c);
    const group = now.groups.find((x) => x.id === g!.id);
    if (!b.reason) {
      const rules = ["visitor_visa", "biometrics"].map((k) => feeRule(now.combination ?? "", k)).filter((x) => !!x);
      refuse(400, "reason", `Give a reason to split this filing out: it is then priced on its own, and the family maximum (${rules.map((r) => `${r!.label} ${cad(r!.familyMaxCents)} for ${r!.familyFrom} or more`).join(", ")}) of ${group ? "this group" : "the family"} no longer covers it.`);
    }
    const moved = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) return "stale" as const;
      const members = await tx.filing.findMany({ where: { submissionGroupId: g!.id, active: true }, select: { id: true, subjectId: true } });
      const f = members.find((x) => x.id === b.filing);
      if (!f) return "not_in_group" as const;
      if (members.length < 2) return "alone" as const;
      const own = await tx.submissionGroup.create({ data: { workspaceId: c.workspaceId, caseId: c.id, kind: "SEPARATE", reason: b.reason!, createdBy: actor.id } });
      await tx.filing.update({ where: { id: f.id }, data: { submissionGroupId: own.id } });
      return f;
    });
    if (moved === "stale") stale();
    if (moved === "not_in_group") refuse(409, "filing", "That filing is not in this submission group (it may have been split out already). Reload.");
    if (moved === "alone") refuse(409, "filing", "A group of one has nothing to split.");
    const who = c.participants.find((p) => p.subjectId === (moved as { subjectId: string }).subjectId);
    // Review M2, break B1: the reason stays on the group row; the audit line says only that one was given.
    await this.audit.log(c.workspaceId, actor.id, "split", "submission group", g!.id, `${actor.name} split the ${ROLE[who?.role ?? ""] ?? "person"}'s filing out of the family submission group on case ${short(c.id)} (reason given)`);
    return this.build(actor, await this.r.reach(actor, c.id, "officer"));
  }

  /** C11.6: a form item's channel, inside what IRCC accepts for it on the combination's IRCC account. The same channel
   *  again changes nothing (break m1); the version is checked under the case's row lock. */
  async channel(actor: Actor, itemId: string, body: unknown) {
    const item = await this.db.filingItem.findUnique({ where: { id: idOf(itemId, "item") } });
    if (!item) fail("No such item.", HttpStatus.NOT_FOUND);
    const c = await this.r.reach(actor, item!.caseId, "officer");
    const b = parse(ChannelBody, body);
    if (item!.kind !== "form" || !item!.active) refuse(422, "channel", "Only a form on this application has a channel.");
    const accepts = await acceptsOf(this.db, c.workspaceId);
    const portal = (await this.db.combination.findUnique({ where: { id: c.combinationId }, select: { portalKey: true } }))?.portalKey ?? null;
    const ok = channelChange(item!.itemKey, b.channel, b.reason, accepts.get(item!.itemKey), portal);
    if (!ok.ok) refuse(ok.status, ok.field, ok.detail);
    const now = await this.build(actor, c);
    const before = (now.items.find((i) => i.id === item!.id) as { channel?: keyof typeof CHANNEL_WORDS } | undefined)?.channel ?? "PDF_UPLOAD";
    const to = (ok as { channel: keyof typeof CHANNEL_WORDS }).channel;
    const result = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
      if (String(b.version) !== await storedVersion(tx, c.id)) return "stale" as const;
      const row = await tx.filingItem.findUnique({ where: { id: item!.id } });
      if (!row || !row.active) return "stale" as const;
      if ((row.channel ?? before) === to) return "same" as const;
      await tx.filingItem.update({ where: { id: row.id }, data: { channel: to, channelReason: b.reason || null, channelBy: actor.id, channelAt: new Date(), version: row.version + 1 } });
      return "changed" as const;
    });
    if (result === "stale") stale();
    if (result === "changed") {
      const who = c.participants.find((p) => p.subjectId === item!.subjectId);
      // RT-17, review M2, break B1: the form, the person's role and the case; the reason stays on the item row only.
      await this.audit.log(c.workspaceId, actor.id, "changed", "item", item!.id, `${actor.name} changed how ${item!.itemKey} is filed for the ${ROLE[who?.role ?? ""] ?? "person"} on case ${short(c.id)}: from ${CHANNEL_WORDS[before]} to ${CHANNEL_WORDS[to]}${b.reason ? " (reason given)" : ""}`, { from: before, to, reason_given: !!b.reason });
    }
    const after = result === "same" ? now : await this.build(actor, await this.r.reach(actor, c.id, "officer"));
    return { item: after.items.find((i) => i.id === item!.id), version: after.version, changed: result === "changed" };
  }
}

type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
/** The view's version from the stored rows (the groups holding a current filing, and the current items), so a write
 *  checks it under the case's row lock exactly as the view computed it. */
async function storedVersion(tx: Tx | Db, caseId: string) {
  const [filings, items] = await Promise.all([
    tx.filing.findMany({ where: { caseId, active: true }, select: { id: true, submissionGroupId: true } }),
    tx.filingItem.findMany({ where: { caseId, active: true }, select: { id: true, channel: true, version: true } }),
  ]);
  return versionOf(filings, items);
}
/** The version of a set of current filings and items (the same rule for the view and for a write's check). */
function versionOf(filings: { id: string; submissionGroupId: string }[], items: { id: string; channel?: string | null; version: number }[]) {
  const groups = [...new Set(filings.map((f) => f.submissionGroupId))].map((id) => ({ id, filings: filings.filter((f) => f.submissionGroupId === id).map((f) => f.id) }));
  return prepareVersion(groups, items);
}

@CaseRead()
@Controller("api/runtime")
export class CasePrepareController {
  constructor(@Inject(CasePrepare) private readonly p: CasePrepare) {}
  // #325 break B4: HEAD would run the GET handler and store rows; it is refused (405), never answered from a write.
  @Head("cases/:id/prepare") head() { fail("HEAD is not offered on /prepare: use GET.", HttpStatus.METHOD_NOT_ALLOWED); }
  @Get("cases/:id/prepare") view(@Headers("x-actor") a: H, @Param("id") id: string) { return this.p.view(actorOf(a), id); }
  @Post("groups/:gid/split") @HttpCode(HttpStatus.OK) split(@Headers("x-actor") a: H, @Param("gid") gid: string, @Body() b: unknown) { return this.p.split(actorOf(a), gid, b); }
  @Patch("items/:id/channel") channel(@Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.p.channel(actorOf(a), id, b); }
}

