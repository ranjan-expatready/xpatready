// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-1..BR-10, challenge B1, M1-M6, m1-m7; founder
// P-412). Three parts:
//   * runtime routes (simulated x-actor, as every case route): who answers for each person and their link
//     (GET …/people/privacy), Send and Resend (POST …/people/:subject/link), Take back (DELETE …/link), and the team's
//     "Keep private from the principal" tick by case staff with a reason (PUT …/people/:subject/private);
//   * /api/link/*: the adult's own routes with their own guard: x-actor is refused (400), the token travels in a POST
//     body (from the link's fragment), the session as a Bearer header; the session, its link and the person on the case
//     are checked again on every request; it reaches only that case and that person;
//   * the demo inbox by address (stand-in SI-20 for the team's email sending, AG-10): demo workspace only, 404 elsewhere.
// Tokens (32 random bytes) and codes (6 digits) are kept only as sha256; history names the masked address only, never a
// token, a code or a typed name. Every change and its history line are written in one transaction.
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Ip, Param, Post, Put, Query, UseGuards, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { z } from "zod";
import { problemFromZod } from "../../contracts/programs.ts";
import { caseName, MINOR } from "../../contracts/runtime.ts";
import { KeepPrivate, LINK_RULES, LINK_WORDS, LinkCode, LinkToken, SendLink, TakeBack, type LinkOpened, type LinkSession, type PeoplePrivacy, type PersonLinkState, type PersonPrivacy } from "../../contracts/person-link.ts";
import { caseView, OWN_LINK } from "../../engine/runtime/case.ts";
import { adultCheck, codeCheck, deadWords, ownerOf, linkState, maskAddress, normalAddress, normalCode, officerWords, overLimit, principalLinkWords, progressOf, resendKind, sendRefusal, serverTries, wrongWords, type LinkRow } from "../../engine/runtime/privacy.ts";
import { actorOf, CaseRead, Db, fail, isDemoWorkspace, OpenRead, RUNTIME_ACTORS, Workspace, type Actor } from "./core.ts";
import { Runtime, type Reached, type Writer } from "./runtime.ts";

type H = string | undefined;
type Tx = Prisma.TransactionClient;
const sha = (x: string) => createHash("sha256").update(x).digest("hex");
const short = (id: string) => id.slice(0, 8);
const DAY = 86_400_000;
/** Break m3 (QA-359): the principal's Resend of the firm's link sends it again at most once a minute. */
const RESEND_GAP_MS = 60_000;
const isStaff = (a: Actor) => (a.duties as readonly string[]).includes("case");
const nameOf = (id: string) => (id.startsWith("person:") ? "the person on their own link" : RUNTIME_ACTORS.find((a) => a.id === id)?.name ?? "someone at the firm");
const roleWords = (role: string) => role.replace(/_/g, " ");
/** Where a link opens: the token only in the fragment, which browsers never send to a server (challenge m1). */
export const LINK_PATH = "/link#t=";
function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error), HttpStatus.BAD_REQUEST);
  return r.data;
}
const problem = (status: number, title: string, detail: string, extra: Record<string, unknown> = {}): never => { throw new HttpException({ type: `https://expatready.local/problems/${title.toLowerCase().replace(/[^a-z]+/g, "-")}`, title, status, detail, ...extra }, status); };
const fieldError = (field: string, message: string): never => problem(400, "Some details need fixing", message, { errors: [{ field, message }] });
/** An audit line in the same transaction as the change it records (B145 lesson). */
const audit = (tx: Tx, workspaceId: string, actor: string, action: string, entityKey: string, summary: string) =>
  tx.auditEvent.create({ data: { workspaceId, actor, action, entity: "person link", entityKey, summary: summary.slice(0, 600) } });

/** A transaction that waits at most 5 s for a row lock; a wait that runs out, or two writes at the same moment, is a 409
 *  in words, never a bare 500 (B145 lesson). */
async function inTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.$transaction(async (tx) => { await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`; return fn(tx); }, { timeout: 15_000, maxWait: 10_000 });
  } catch (e) {
    if (e instanceof HttpException) throw e;
    const code = (e as { code?: string }).code, msg = String((e as Error).message ?? "");
    if (code === "P2028" || /lock timeout|could not obtain lock|deadlock detected|could not serialize/i.test(msg)) problem(409, "Busy", "Someone else is changing this person's link at the same moment. Nothing was changed: try again.");
    if (code === "P2002") problem(409, "Changed at the same moment", "Someone sent or changed this person's link at the same moment. Nothing was changed: refresh to see the link now.");
    throw e;
  }
}

type LinkRec = Prisma.PersonLinkGetPayload<object>;
const rowOf = (l: LinkRec, newer?: Date | null): LinkRow => ({ sentAt: l.sentAt, expiresAt: l.expiresAt, acceptedAt: l.acceptedAt, voidedAt: l.voidedAt, voidWhy: l.voidWhy, newerSentAt: newer ?? null });

@Injectable()
export class PersonLinks {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Runtime) private readonly r: Runtime, @Inject(Workspace) private readonly ws: Workspace) {}

  private personOf(c: Reached, subjectId: string) {
    const p = c.participants.find((x) => x.subjectId === subjectId && x.role !== "case");
    if (!p) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    return p!;
  }
  private async birthOf(subjectId: string) {
    return (await this.db.clientCanonicalAnswer.findFirst({ where: { subjectId, canonicalFieldKey: MINOR.birthDateField, rowKey: null, supersededById: null }, select: { valueJson: true } }))?.valueJson;
  }
  private linkState(l: LinkRec, all: LinkRec[], now: Date, label: string): PersonLinkState {
    const row = rowOf(l, all.find((x) => x.id === l.supersededById)?.sentAt), state = linkState(row, now);
    return { state, email_masked: l.addressMasked, given_by: nameOf(l.addressGivenBy), sent_at: l.sentAt.toISOString(), accepted_at: l.acceptedAt?.toISOString() ?? null, expires_at: l.expiresAt.toISOString(), why: deadWords(row, now),
      ended_at: l.voidedAt?.toISOString() ?? null, principal_words: principalLinkWords(state, l.voidedAt ?? (state === "expired" ? l.expiresAt : null), label) };
  }
  /** BR-1 with review M1: who may have their own link, deciding "the principal" by the case's client person (C6.13). */
  private adultOf(c: Reached, p: Reached["participants"][number], birth: unknown, now: Date) {
    return adultCheck({ role: p.role, label: p.subject.label, isClient: p.subjectId === this.r.clientSubjectOf(c) }, birth, now);
  }

  /** GET …/people/privacy: who answers for each person, their link and, for a private adult, progress only (BR-7).
   *  Staff and the case's client; a GET writes nothing. */
  async people(actor: Actor, caseId: string): Promise<PeoplePrivacy> {
    const c = await this.r.reach(actor, caseId, "read");
    const staff = isStaff(actor), now = new Date();
    const st = await this.r.state(c);
    // Review m1: counted exactly as the client's questionnaire counts it (their relatives' parts are theirs).
    const full = caseView(this.r.snapshotOf(c), this.r.peopleOf(c), st.answers, st.rows, "sqr", now, st.groups, { background: this.r.backgroundOf(c) });
    const links = await this.db.personLink.findMany({ where: { caseId: c.id }, orderBy: [{ sentAt: "desc" }, { id: "desc" }] });
    const principal = nameOf(c.clientActorId);
    const people = c.participants.filter((p) => p.role !== "case").map((p): PersonPrivacy => {
      const birth = st.answers.find((a) => a.subjectId === p.subjectId && a.field === MINOR.birthDateField && !a.rowKey)?.value;
      const adult = this.adultOf(c, p, birth, now), isClient = p.subjectId === this.r.clientSubjectOf(c);
      const mine = links.filter((l) => l.subjectId === p.subjectId), newest = mine[0] ?? null, accepted = mine.find((l) => l.acceptedAt) ?? null;
      const link = newest ? this.linkState(newest, links, now, p.subject.label) : null;
      const live = !!link && (link.state === "sent" || link.state === "accepted" || link.state === "expired") && !newest!.voidedAt;
      const progress = p.keepPrivate || link ? progressOf(full.sections.filter((x) => ownerOf(x.subjectId) === p.subjectId)) : null;
      return {
        subject_id: p.subjectId, label: p.subject.label, role: p.role, is_client: isClient, adult: adult.ok, why_not: adult.ok ? null : adult.why,
        // Break M1: who ticked it and why are staff's (the case history); the client reads that it is on, and since when.
        private: { on: p.keepPrivate, at: p.privateAt?.toISOString() ?? null, by: staff && p.privateBy ? nameOf(p.privateBy) : null, why: staff ? p.privateWhy : null },
        link, kept_masked: accepted?.addressMasked ?? null, progress,
        resend: newest ? { to_masked: newest.addressMasked, kind: resendKind({ sender: staff ? "staff" : "client", kept: accepted?.address ?? null, newest, now }) } : null,
        words: officerWords({ label: p.subject.label, principal, adult: adult.ok, keepPrivate: p.keepPrivate, privateAt: p.privateAt, link: newest ? { ...rowOf(newest), masked: newest.addressMasked, givenBy: nameOf(newest.addressGivenBy) } : null, acceptedOn: accepted ? { masked: accepted.addressMasked, givenBy: nameOf(accepted.addressGivenBy) } : null, now }),
        can: { send: adult.ok && (staff || !accepted), resend_kept: adult.ok && !!accepted && resendKind({ sender: staff ? "staff" : "client", kept: accepted?.address ?? null, newest, now }) !== "firm", send_new: staff && adult.ok && !!accepted, take_back: live, tick: staff && adult.ok && !p.keepPrivate },
      };
    });
    return { case_id: c.id, principal, people };
  }

  /** POST …/people/:subject/link: Send or Resend (BR-1, BR-3, BR-4). The principal or case staff. Returns the person's
   *  line, never the token or the code. A resend supersedes the person's open link and ends its sessions, except the
   *  client's Resend of a link staff sent to a new address, which sends that same link again (QA-359, P-441). */
  async send(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "answer");
    const b = parse(SendLink, body);
    const p = this.personOf(c, subjectId), label = p.subject.label, now = new Date();
    const adult = this.adultOf(c, p, await this.birthOf(subjectId), now);
    if (!adult.ok) problem(409, "Not possible now", adult.why);
    // Resend without an address: the newest link's address, for everyone. For the client once accepted that is the kept
    // address, or the one staff set after it (QA-359, P-441, F12 (b): never back to the address the client first gave).
    const typed = b.address ?? (await this.db.personLink.findFirst({ where: { subjectId }, orderBy: [{ sentAt: "desc" }, { id: "desc" }], select: { address: true } }))?.address;
    if (!typed) fieldError("address", "Enter their email address.");
    const address = normalAddress(typed!);
    if (!address) fieldError("address", "Enter an email address like name@example.com.");
    if (!isDemoWorkspace()) problem(409, "Not possible now", "Sending email is not built in this workspace: the demo workspace's inbox stands in for it (stand-in SI-20). Nothing was sent.");
    const replay = async () => {
      const same = b.idempotencyKey ? await this.db.personLink.findFirst({ where: { caseId: c.id, sendKey: b.idempotencyKey } }) : null;
      if (!same) return null;
      if (same.subjectId !== subjectId || same.address !== address) problem(409, "Not possible now", "This key was already used to send a different link; nothing was sent. Use a new key.");
      return { ...(await this.lineOf(actor, caseId, subjectId)), created: false };
    };
    const earlier = await replay();
    if (earlier) return earlier;
    const token = randomBytes(32).toString("base64url"), id = randomUUID(), masked = maskAddress(address!);
    let again = false;
    try {
      await inTx(this.db, async (tx) => {
        again = false;
        // One send at a time per case (break m1: two people are never given one address at the same moment), then per person.
        await tx.$queryRaw`SELECT id FROM runtime_case WHERE id = ${c.id}::uuid FOR NO KEY UPDATE`;
        await tx.$queryRaw`SELECT id FROM case_participant WHERE subject_id = ${subjectId}::uuid FOR UPDATE`;
        // Break m1, m2 (QA-359): the working link's own row too, so a right or fifth wrong code at that moment (which
        // update this row) is either seen here or waits for this send; never a copy of a link that just changed.
        await tx.$queryRaw`SELECT id FROM person_link WHERE subject_id = ${subjectId}::uuid AND voided_at IS NULL FOR UPDATE`;
        const mine = await tx.personLink.findMany({ where: { subjectId }, orderBy: [{ sentAt: "desc" }, { id: "desc" }] });
        const kept = mine.find((l) => l.acceptedAt)?.address ?? null, sender = isStaff(actor) ? "staff" : "client";
        const others = (await tx.personLink.findMany({ where: { caseId: c.id, subjectId: { not: subjectId }, OR: [{ voidedAt: null }, { acceptedAt: { not: null } }] }, select: { address: true } })).map((x) => x.address);
        const no = sendRefusal({ sender, label, address: address!, kept, current: mine[0]?.address ?? null, others });
        if (no) problem(no.status, no.status === 403 ? "Not allowed" : "Not possible now", no.why);
        const open = mine.find((l) => !l.voidedAt), kind = resendKind({ sender, kept, newest: mine[0] ?? null, now });
        // Break M1 (QA-359): once the link staff sent to a new address no longer works, only the firm sends a new one.
        if (kind === "firm") problem(409, "Not possible now", `The firm's link to ${mine[0]!.addressMasked} no longer works. Only the firm can send ${label} a new one.`);
        if (open && kind === "same") {
          // QA-359 (P-441): staff sent this accepted adult's link to a new address; the client's Resend sends the same
          // email again to that address and the link keeps working (no new token: the demo inbox holds the email as sent,
          // stand-in SI-20). Pressed again within a minute (or the same idempotency key), nothing more is sent (break m3).
          const sent = await tx.demoMessage.findMany({ where: { linkId: open.id, kind: "link" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 2 }), email = sent[0];
          if (!email) problem(409, "Not possible now", `The firm's email to ${open.addressMasked} cannot be sent again. Ask the firm to send it.`);
          again = true;
          // The first email is the firm's own; only a copy sent again within the minute holds the next one back.
          if (sent.length > 1 && now.getTime() - email!.createdAt.getTime() < RESEND_GAP_MS) return;
          await tx.demoMessage.create({ data: { workspaceId: c.workspaceId, linkId: open.id, address: open.address, kind: "link", subject: email!.subject, body: email!.body, expiresAt: open.expiresAt } });
          await audit(tx, c.workspaceId, actor.id, "resent", subjectId, `${actor.name} sent the same link again to the ${roleWords(p.role)} on case ${short(c.id)}, to ${open.addressMasked} (address given by ${nameOf(open.addressGivenBy)}); it still works`);
          return;
        }
        // Break M2 (QA-359): a Resend (no address typed) to the newest link's address keeps who gave that address.
        const givenBy = !b.address && mine[0]?.address === address ? mine[0].addressGivenBy : actor.id;
        if (open) await this.kill(tx, open.id, "superseded", actor.id, null, now);
        await tx.personLink.create({ data: { id, workspaceId: c.workspaceId, caseId: c.id, subjectId, address: address!, addressMasked: masked, addressGivenBy: givenBy, tokenHash: sha(token), sentBy: actor.id, sentAt: now, expiresAt: new Date(now.getTime() + LINK_RULES.linkDays * DAY), sendKey: b.idempotencyKey ?? null } });
        if (open) await tx.personLink.update({ where: { id: open.id }, data: { supersededById: id } });
        await tx.demoMessage.create({ data: { workspaceId: c.workspaceId, linkId: id, address: address!, kind: "link", subject: "Answer your own questions for your application (Sample)",
          body: `You were asked to answer your own questions for an application a firm is handling.\nOpen your link: ${LINK_PATH}${token}\nOpening it sends nothing: press "Send me a code" there. It works for ${LINK_RULES.linkDays} days.`, expiresAt: new Date(now.getTime() + LINK_RULES.linkDays * DAY) } });
        await audit(tx, c.workspaceId, actor.id, open ? "resent" : "sent", subjectId, `${actor.name} ${open ? "sent a new link (the earlier one no longer works)" : "sent a link"} to the ${roleWords(p.role)} on case ${short(c.id)}, to ${masked} (address given by ${nameOf(givenBy)})`);
      });
    } catch (e) {
      if (e instanceof HttpException && e.getStatus() === 409 && b.idempotencyKey) { const same = await replay(); if (same) return same; }
      throw e;
    }
    return { ...(await this.lineOf(actor, caseId, subjectId)), created: !again };
  }

  /** A link dies (taken back, superseded, locked): its sessions end and its demo messages go, in the caller's transaction. */
  private async kill(tx: Tx, linkId: string, why: "taken_back" | "superseded" | "locked" | "not_adult", by: string, reason: string | null, now: Date) {
    const n = await tx.personLink.updateMany({ where: { id: linkId, voidedAt: null }, data: { voidedAt: now, voidWhy: why, voidedBy: by, voidReason: reason, codeHash: null, codeExpiresAt: null } });
    await tx.personLinkSession.updateMany({ where: { linkId, revokedAt: null }, data: { revokedAt: now } });
    await tx.demoMessage.deleteMany({ where: { linkId } });
    return n.count === 1;
  }

  /** DELETE …/people/:subject/link: Take back (BR-8). The principal or staff (staff say why). The link and its sessions
   *  die at once; the privacy setting stays as it is. */
  async takeBack(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "answer");
    const b = parse(TakeBack, body);
    const p = this.personOf(c, subjectId), now = new Date();
    if (isStaff(actor) && !b.reason) fieldError("reason", "Say why the link is taken back (at least 5 characters).");
    await inTx(this.db, async (tx) => {
      await tx.$queryRaw`SELECT id FROM case_participant WHERE subject_id = ${subjectId}::uuid FOR UPDATE`;
      const open = await tx.personLink.findFirst({ where: { subjectId, voidedAt: null } });
      if (!open) problem(409, "Not possible now", `There is no working link to take back for ${p.subject.label}.`);
      await this.kill(tx, open!.id, "taken_back", actor.id, b.reason ?? null, now);
      await audit(tx, c.workspaceId, actor.id, "took back", subjectId, `${actor.name} took back the link of the ${roleWords(p.role)} on case ${short(c.id)} (sent to ${open!.addressMasked})${b.reason ? `: ${b.reason}` : ""}; ${p.keepPrivate ? "their answers stay private" : "nothing was private yet"}`);
    });
    return this.lineOf(actor, caseId, subjectId);
  }

  /** PUT …/people/:subject/private: the team's tick "Keep private from the principal" (AG-7-107, Q71), case staff only,
   *  with a reason; adults only; it stays on (no untick in M3, P-412). Ticking again changes nothing. */
  async tick(actor: Actor, caseId: string, subjectId: string, body: unknown) {
    const c = await this.r.reach(actor, caseId, "officer");
    const b = parse(KeepPrivate, body);
    const p = this.personOf(c, subjectId), now = new Date();
    const adult = this.adultOf(c, p, await this.birthOf(subjectId), now);
    if (!adult.ok) problem(409, "Not possible now", adult.why);
    const changed = await inTx(this.db, async (tx) => {
      const n = await tx.caseParticipant.updateMany({ where: { subjectId, keepPrivate: false }, data: { keepPrivate: true, privateAt: now, privateBy: actor.id, privateWhy: b.reason } });
      if (n.count) await audit(tx, c.workspaceId, actor.id, "kept private", subjectId, `${actor.name} ticked "Keep private from the principal" for the ${roleWords(p.role)} on case ${short(c.id)}: ${b.reason}`);
      return n.count === 1;
    });
    return { ...(await this.lineOf(actor, caseId, subjectId)), changed };
  }

  private async lineOf(actor: Actor, caseId: string, subjectId: string) {
    return (await this.people(actor, caseId)).people.find((x) => x.subject_id === subjectId)!;
  }

  // ------------------------------------------------------------------ the adult's own link (/api/link/*)

  private async linkByToken(body: unknown) {
    const r = LinkToken.safeParse(body ?? {});
    const l = r.success ? await this.db.personLink.findUnique({ where: { tokenHash: sha(r.data.token) } }) : null;
    if (!l || l.workspaceId !== await this.ws.id()) problem(404, "Not found", LINK_WORDS.unknown);
    return l!;
  }
  /** Break M2: whether the person is still someone who may have their own link, read now (BR-1: an adult other than the
   *  case's client, from their current date of birth). A link to someone who is not dies the next time it is used. */
  private async stillAdult(l: LinkRec) {
    const c = await this.r.reachByLink(l.caseId), p = c.participants.find((x) => x.subjectId === l.subjectId);
    return !!p && this.adultOf(c, p, await this.birthOf(l.subjectId), new Date()).ok;
  }
  /** A live link, or 410 with why it died (naming no person). A link to someone who is no longer an adult on the case
   *  dies here, with its reason in the history (break M2: privacy never switches on for a child). */
  private async liveLink(l: LinkRec, now: Date) {
    const newer = l.supersededById ? (await this.db.personLink.findUnique({ where: { id: l.supersededById }, select: { sentAt: true } }))?.sentAt : null;
    const dead = deadWords(rowOf(l, newer), now);
    if (dead) problem(410, "This link no longer works", dead);
    if (!await this.db.caseParticipant.count({ where: { subjectId: l.subjectId, caseId: l.caseId } })) problem(410, "This link no longer works", LINK_WORDS.unknown);
    if (!await this.stillAdult(l)) {
      await inTx(this.db, async (tx) => {
        if (await this.kill(tx, l.id, "not_adult", `person:${l.subjectId}`, null, now)) await audit(tx, l.workspaceId, `person:${l.subjectId}`, "ended", l.subjectId, `The link sent to ${l.addressMasked} on case ${short(l.caseId)} ended: the person cannot have their own link now (under ${MINOR.underAge} or no date of birth, Sample)`);
      });
      problem(410, "This link no longer works", LINK_WORDS.notAdult);
    }
    return l;
  }

  /** POST /api/link/open: what the link shows before its code. Opening it sends nothing and writes nothing (challenge m1). */
  async open(body: unknown): Promise<LinkOpened> {
    const l = await this.linkByToken(body), now = new Date();
    const newer = l.supersededById ? (await this.db.personLink.findUnique({ where: { id: l.supersededById }, select: { sentAt: true } }))?.sentAt : null;
    const dead = deadWords(rowOf(l, newer), now) ?? (await this.stillAdult(l) ? null : LINK_WORDS.notAdult); // read only: it dies when used
    return dead ? { state: "dead", why: dead } : { state: "live", email_masked: l.addressMasked, accepted: !!l.acceptedAt };
  }

  /** POST /api/link/code/send: "Send me a code" (a button, never on opening). A new 6-digit code replaces the last one. */
  async sendCode(body: unknown) {
    const now = new Date(), l = await this.liveLink(await this.linkByToken(body), now);
    if (!isDemoWorkspace()) problem(409, "Not possible now", "Sending email is not built in this workspace: the demo workspace's inbox stands in for it (stand-in SI-20). Nothing was sent.");
    // Every send is written before it is counted, so sends at the same moment each see the others.
    await this.db.personLinkTry.create({ data: { kind: "code_sent", address: l.address } });
    const [n] = await this.db.$queryRaw<{ c: bigint }[]>`select count(*) as c from person_link_try where kind = 'code_sent' and address = ${l.address} and at > now() - make_interval(mins => ${LINK_RULES.codesWindowMinutes})`;
    const over = overLimit({ kind: "code_sent", sentToAddress: Number(n.c) });
    if (over) problem(429, "Too many", over);
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0"), expires = new Date(now.getTime() + LINK_RULES.codeMinutes * 60_000);
    await inTx(this.db, async (tx) => {
      const ok = await tx.personLink.updateMany({ where: { id: l.id, voidedAt: null }, data: { codeHash: sha(code), codeExpiresAt: expires } });
      if (!ok.count) problem(410, "This link no longer works", "This link stopped working a moment ago. Ask whoever sent it for a new one.");
      await tx.demoMessage.deleteMany({ where: { linkId: l.id, kind: "code" } });
      await tx.demoMessage.create({ data: { workspaceId: l.workspaceId, linkId: l.id, address: l.address, kind: "code", subject: "Your code (Sample)", body: `Your code is ${code.slice(0, 3)} ${code.slice(3)}. It works for ${LINK_RULES.codeMinutes} minutes. If you did not ask for it, you can ignore this email.`, expiresAt: expires } });
      await audit(tx, l.workspaceId, `person:${l.subjectId}`, "code sent", l.subjectId, `A code was sent to ${l.addressMasked} for the link on case ${short(l.caseId)}`);
    });
    await this.db.$executeRaw`delete from person_link_try where at < now() - interval '1 hour'`;
    return { sent: true, email_masked: l.addressMasked, expires_at: expires.toISOString() };
  }

  /** POST /api/link/code: the code typed (BR-4). Wrong: a try counted (the fifth locks the link). Expired: said so (not a
   *  try). Right, once: the link is accepted, privacy switches on at the first right code (P-412), a session starts. */
  async verify(body: unknown, ip: string): Promise<LinkSession> {
    const now = new Date(), b = parse(LinkCode, body);
    const network = (ip || "unknown").slice(0, 64);
    // Break m2: a source already over its own limit is refused before its try is written, and the server's count takes
    // at most each source's own limit, so one source never locks every other adult out of the code step.
    const counts = async () => (await this.db.$queryRaw<{ address: string; c: bigint }[]>`select address, count(*) as c from person_link_try where kind = 'code_try' and at > now() - interval '1 minute' group by address`).map((x) => ({ address: x.address, tries: Number(x.c) }));
    const before = await counts();
    const mine = () => before.find((x) => x.address === network)?.tries ?? 0;
    if (overLimit({ kind: "code_try", fromNetwork: mine() + 1, onServer: 0 })) problem(429, "Too many", overLimit({ kind: "code_try", fromNetwork: mine() + 1, onServer: 0 })!);
    await this.db.personLinkTry.create({ data: { kind: "code_try", address: network } });
    const now2 = await counts();
    const over = overLimit({ kind: "code_try", fromNetwork: now2.find((x) => x.address === network)?.tries ?? 1, onServer: serverTries(now2) });
    if (over) problem(429, "Too many", over);
    const code = normalCode(b.code);
    if (!code) fieldError("code", "Enter the 6-digit code from the email, like 123 456.");
    const l = await this.liveLink(await this.linkByToken({ token: b.token }), now);
    const check = codeCheck(l, sha(code!), now);
    if (check === "none") fieldError("code", "No code is waiting for this link (it was used, or none was sent). Press Send me a code.");
    if (check === "expired") fieldError("code", `That code has expired: a code works for ${LINK_RULES.codeMinutes} minutes. Press Send a new code.`);
    if (check === "wrong") {
      const hit = await inTx(this.db, async (tx) => {
        // Counted in one statement, so wrong codes sent at the same moment are all counted (as the removed pairing).
        const [w] = await tx.$queryRaw<{ wrong_tries: number; locked: boolean }[]>`update person_link set wrong_tries = wrong_tries + 1,
          voided_at = case when wrong_tries + 1 >= ${LINK_RULES.wrongTries} then now() else voided_at end, void_why = case when wrong_tries + 1 >= ${LINK_RULES.wrongTries} then 'locked' else void_why end,
          voided_by = case when wrong_tries + 1 >= ${LINK_RULES.wrongTries} then ${`person:${l.subjectId}`} else voided_by end
          where id = ${l.id}::uuid and voided_at is null returning wrong_tries, voided_at is not null as locked`;
        if (!w) return null;
        await audit(tx, l.workspaceId, `person:${l.subjectId}`, "wrong code", l.subjectId, `A wrong code was typed on the link sent to ${l.addressMasked} on case ${short(l.caseId)} (${w.wrong_tries} of ${LINK_RULES.wrongTries})`);
        if (w.locked) {
          await this.kill(tx, l.id, "locked", `person:${l.subjectId}`, null, now); // sessions end, messages go (already voided above)
          await audit(tx, l.workspaceId, `person:${l.subjectId}`, "locked", l.subjectId, `The link sent to ${l.addressMasked} on case ${short(l.caseId)} stopped working after ${LINK_RULES.wrongTries} wrong codes`);
        }
        return w;
      });
      if (!hit || hit.locked) problem(410, "This link no longer works", LINK_WORDS.locked);
      fieldError("code", wrongWords(hit!.wrong_tries));
    }
    const token = randomBytes(32).toString("base64url"), expires = new Date(now.getTime() + LINK_RULES.sessionHours * 3_600_000);
    const out = await inTx(this.db, async (tx) => {
      // The code is spent under its own row: two right codes at the same moment give one session (the other is refused).
      const spent = await tx.personLink.updateMany({ where: { id: l.id, codeHash: sha(code!), voidedAt: null, codeExpiresAt: { gt: now } }, data: { codeHash: null, codeExpiresAt: null } });
      if (!spent.count) problem(409, "Already used", "That code was just used, or the link stopped working a moment ago. Press Send me a code for a new one.");
      const first = (await tx.personLink.updateMany({ where: { id: l.id, acceptedAt: null }, data: { acceptedAt: now } })).count === 1;
      const who = await tx.caseParticipant.findFirst({ where: { subjectId: l.subjectId, caseId: l.caseId }, select: { role: true } });
      const priv = await tx.caseParticipant.updateMany({ where: { subjectId: l.subjectId, keepPrivate: false }, data: { keepPrivate: true, privateAt: now, privateBy: `person:${l.subjectId}`, privateWhy: "Switched on when the person first entered the right code on their own link." } });
      await tx.personLinkSession.create({ data: { linkId: l.id, tokenHash: sha(token), expiresAt: expires } });
      // Break M4 (challenge M6): at the right code every message of the link goes, the link email too, so the inbox holds
      // nothing to mint a new code from; the person comes back through Resend to the kept address.
      await tx.demoMessage.deleteMany({ where: { linkId: l.id } });
      const role = roleWords(who?.role ?? "person");
      if (first) await audit(tx, l.workspaceId, `person:${l.subjectId}`, "accepted", l.subjectId, `The ${role} on case ${short(l.caseId)} entered the right code on the link sent to ${l.addressMasked}: it is accepted`);
      if (priv.count) await audit(tx, l.workspaceId, `person:${l.subjectId}`, "kept private", l.subjectId, `The answers of the ${role} on case ${short(l.caseId)} are now kept private from the principal (switched on at their first right code)`);
      if (!first) await audit(tx, l.workspaceId, `person:${l.subjectId}`, "signed in", l.subjectId, `The ${role} on case ${short(l.caseId)} came back on their link (${l.addressMasked}) with a new code`);
      return { consent_needed: !l.consentedAt };
    });
    return { session: token, expires_at: expires.toISOString(), case_id: l.caseId, subject_id: l.subjectId, consent_needed: out.consent_needed };
  }

  /** Every session request (challenge M2): the session is live, its link is live, the person is still on the case. */
  async signed(auth: H) {
    const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(auth ?? "");
    if (!m) problem(401, "Session ended", LINK_WORDS.sessionEnded);
    const s = await this.db.personLinkSession.findUnique({ where: { tokenHash: sha(m![1]) }, include: { link: true } });
    const now = new Date();
    if (!s || s.revokedAt || s.expiresAt.getTime() <= now.getTime() || s.link.workspaceId !== await this.ws.id()) problem(401, "Session ended", s?.link.voidedAt ? (deadWords(rowOf(s.link), now) ?? LINK_WORDS.sessionEnded) : LINK_WORDS.sessionEnded);
    const dead = deadWords(rowOf(s!.link), now);
    if (dead) problem(401, "Session ended", dead);
    const p = await this.db.caseParticipant.findFirst({ where: { subjectId: s!.link.subjectId, caseId: s!.link.caseId }, include: { subject: true } });
    if (!p) problem(401, "Session ended", LINK_WORDS.unknown);
    if (!await this.stillAdult(s!.link)) problem(401, "Session ended", LINK_WORDS.notAdult); // break M2 (read only here)
    return { session: s!, link: s!.link, person: p! };
  }
  /** The case and person a session reaches: another case is not found (404), another person refused (403); answers wait
   *  for the consent card (BR-6). */
  private async scoped(auth: H, caseId: string, subjectId: string, needConsent = true) {
    const sig = await this.signed(auth);
    if (caseId !== sig.link.caseId) fail("No such case.", HttpStatus.NOT_FOUND);
    if (ownerOf(subjectId) !== sig.link.subjectId) fail("Your link is for your own questions only.", HttpStatus.FORBIDDEN); // their parents' parts too (B128)
    if (needConsent && !sig.link.consentedAt) problem(403, "Read this first", "Read who sees your answers first (Before you start), then continue to your questions.");
    const c = await this.r.reachByLink(caseId);
    const own = sig.link.subjectId; // the person the link is for (a relative's part is theirs: `<own>/parent_1`)
    const w: Writer = { id: `person:${own}`, name: `The ${roleWords(sig.person.role)} (own link)`, officer: false, channel: OWN_LINK, own };
    return { ...sig, c, w };
  }

  async me(auth: H) {
    const { link, person, session } = await this.signed(auth);
    const c = await this.db.case.findUnique({ where: { id: link.caseId }, select: { reference: true, caseNumber: true } });
    return { case_id: link.caseId, subject_id: link.subjectId, person: person.subject.label, case_reference: c ? caseName(c) : null, email_masked: link.addressMasked,
      consent_needed: !link.consentedAt, consent: LINK_WORDS.consent, consent_note: LINK_WORDS.consentNote, expires_at: session.expiresAt.toISOString() };
  }
  async consent(auth: H) {
    const { link, person } = await this.signed(auth);
    await inTx(this.db, async (tx) => {
      const n = await tx.personLink.updateMany({ where: { id: link.id, consentedAt: null }, data: { consentedAt: new Date() } });
      if (n.count) await audit(tx, link.workspaceId, `person:${link.subjectId}`, "consent", link.subjectId, `The ${roleWords(person.role)} on case ${short(link.caseId)} read who sees their answers and continued (wording Unconfirmed: no counsel)`);
    });
    return { consent_needed: false };
  }
  async end(auth: H) {
    const { session } = await this.signed(auth);
    await this.db.personLinkSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { ended: true };
  }
  async questionnaire(auth: H, caseId: string, subjectId: string) {
    const { c, link } = await this.scoped(auth, caseId, subjectId);
    return this.r.linkView(c, link.subjectId);
  }
  async answer(auth: H, caseId: string, subjectId: string, field: string, body: unknown) {
    const { c, w } = await this.scoped(auth, caseId, subjectId);
    return this.r.saveAnswer(c, w, subjectId, field, body, () => this.r.linkView(c, w.own!));
  }
  async addRow(auth: H, caseId: string, subjectId: string, body: unknown) {
    const { c, w } = await this.scoped(auth, caseId, subjectId);
    return this.r.saveRow(c, w, subjectId, body);
  }
  async removeRow(auth: H, caseId: string, subjectId: string, row: string) {
    const { c, w } = await this.scoped(auth, caseId, subjectId);
    return this.r.dropRow(c, w, subjectId, row);
  }
  async noneApply(auth: H, caseId: string, subjectId: string, group: string, body: unknown) {
    const { c, w } = await this.scoped(auth, caseId, subjectId);
    return this.r.saveNoneApply(c, w, subjectId, group, body, () => this.r.linkView(c, w.own!));
  }

  /** GET /api/demo/inbox?address=: the email stand-in (SI-20). Demo workspace only (404 elsewhere); messages not yet
   *  expired, newest first. Reads only: an expired message is left out, never deleted here. */
  async inbox(address: H, xActor: H) {
    if (!isDemoWorkspace()) fail("Not found.", HttpStatus.NOT_FOUND);
    // Break M4: a client's own pages and API persona never open a mailbox (SI-21: privacy holds on Client A's persona).
    if ([...RUNTIME_ACTORS].some((a) => a.id === xActor && (a.duties as readonly string[]).includes("answer"))) problem(403, "Not for clients", LINK_WORDS.inboxClient);
    const a = normalAddress(address ?? "");
    if (!a) fieldError("address", "Enter an email address like name@example.com.");
    const rows = await this.db.demoMessage.findMany({ where: { address: a!, workspaceId: await this.ws.id(), expiresAt: { gt: new Date() } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 });
    return { address: a, stand_in: "SI-20", messages: rows.map((m) => ({ id: m.id, kind: m.kind, subject: m.subject, body: m.body, link: m.kind === "link" ? (/\/link#t=[A-Za-z0-9_-]{43}/.exec(m.body)?.[0] ?? null) : null, created_at: m.createdAt.toISOString(), expires_at: m.expiresAt.toISOString() })) };
  }
}

/** The adult's routes take only their own session, never a simulated person (challenge M2); answers are never cached
 *  and the page sends no referrer (challenge m1). */
@Injectable()
export class LinkOnlyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const http = ctx.switchToHttp(), req = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const res = http.getResponse<{ setHeader: (k: string, v: string) => void }>();
    res.setHeader("Referrer-Policy", "no-referrer"); res.setHeader("Cache-Control", "no-store");
    if (req.headers["x-actor"] !== undefined) problem(400, "Not for simulated people", LINK_WORDS.xActor);
    return true;
  }
}

@CaseRead()
@Controller("api/runtime")
export class PersonLinksController {
  constructor(@Inject(PersonLinks) private readonly x: PersonLinks) {}
  @Get("cases/:id/people/privacy") people(@Headers("x-actor") a: H, @Param("id") id: string) { return this.x.people(actorOf(a), id); }
  @Post("cases/:id/people/:subject/link") send(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.x.send(actorOf(a), id, s, b); }
  @Delete("cases/:id/people/:subject/link") takeBack(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.x.takeBack(actorOf(a), id, s, b); }
  @Put("cases/:id/people/:subject/private") tick(@Headers("x-actor") a: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.x.tick(actorOf(a), id, s, b); }
}

@OpenRead("the adult's own link: its own guard and session (LinkOnlyGuard, PersonLinks.signed)")
@UseGuards(LinkOnlyGuard)
@Controller("api/link")
export class LinkController {
  constructor(@Inject(PersonLinks) private readonly x: PersonLinks) {}
  @Post("open") @HttpCode(200) open(@Body() b: unknown) { return this.x.open(b); }
  @Post("code/send") @HttpCode(200) sendCode(@Body() b: unknown) { return this.x.sendCode(b); }
  @Post("code") @HttpCode(200) verify(@Body() b: unknown, @Ip() ip: string) { return this.x.verify(b, ip); }
  @Get("me") me(@Headers("authorization") t: H) { return this.x.me(t); }
  @Post("consent") @HttpCode(200) consent(@Headers("authorization") t: H) { return this.x.consent(t); }
  @Post("end") @HttpCode(200) end(@Headers("authorization") t: H) { return this.x.end(t); }
  @Get("cases/:id/people/:subject/questionnaire") questionnaire(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string) { return this.x.questionnaire(t, id, s); }
  @Put("cases/:id/people/:subject/answers/:field") answer(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("field") f: string, @Body() b: unknown) { return this.x.answer(t, id, s, f, b); }
  @Post("cases/:id/people/:subject/rows") addRow(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Body() b: unknown) { return this.x.addRow(t, id, s, b); }
  @Delete("cases/:id/people/:subject/rows/:row") removeRow(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("row") r: string) { return this.x.removeRow(t, id, s, r); }
  @Put("cases/:id/people/:subject/groups/:group/none-apply") noneApply(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("group") g: string, @Body() b: unknown) { return this.x.noneApply(t, id, s, g, b); }
  // B128, B155: a relative of the person (`<subject>/parent_1`, `<subject>/sibling`), as the runtime routes name them.
  @Put("cases/:id/people/:subject/:relation/answers/:field") relativeAnswer(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("field") f: string, @Body() b: unknown) { return this.x.answer(t, id, `${s}/${r}`, f, b); }
  @Post("cases/:id/people/:subject/:relation/rows") relativeAddRow(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Body() b: unknown) { return this.x.addRow(t, id, `${s}/${r}`, b); }
  @Delete("cases/:id/people/:subject/:relation/rows/:row") relativeRemoveRow(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("row") x: string) { return this.x.removeRow(t, id, `${s}/${r}`, x); }
  @Put("cases/:id/people/:subject/:relation/groups/:group/none-apply") relativeNoneApply(@Headers("authorization") t: H, @Param("id") id: string, @Param("subject") s: string, @Param("relation") r: string, @Param("group") g: string, @Body() b: unknown) { return this.x.noneApply(t, id, `${s}/${r}`, g, b); }
}

@OpenRead("the demo inbox by address (stand-in SI-20): demo workspace only, 404 elsewhere")
@Controller("api/demo")
export class DemoInboxController {
  constructor(@Inject(PersonLinks) private readonly x: PersonLinks) {}
  @Get("inbox") inbox(@Query("address") address: H, @Headers("x-actor") a: H) { return this.x.inbox(address, a); }
}
