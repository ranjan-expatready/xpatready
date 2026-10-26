// The browser extension's API (forms lane F2b; P-90; plan §7 XT-1…XT-4, BR-15; Lead decision Q1; challenge M7).
//   Studio side (the simulated sign-in, x-actor): a one-time pairing code; the person's extension sessions; revoke.
//   Extension side (only its own token, never x-actor): exchange the code for a token; who am I; sign out; capture.
// The token is opaque (32 random bytes), kept only as its sha256, bound to the person, the firm (workspace), the
// modes their duties give (capture: the author duty, Sample; fill: the case duty) and the extension's fixed id, which
// every request's Origin must match. Codes are single-use, 5 minutes; tokens 8 hours (Sample). A code's first three
// characters find it; a wrong code with them counts against it in the database, and the fifth wrong try voids it
// (STANDARDS §8; review-2 Minor 1: never a per-address pause in memory, which a shared office address or a restart
// broke). A blind guess must hit an open code's three characters and then its other five (31^8 codes, 5 tries each),
// and every try to exchange a code is throttled in the database: 60 a minute per address, 600 for the whole server
// (review-3 Major 2: one client could otherwise sweep every selector and void the office's codes).
// Answers and tokens are never logged.
// The Studio's sign-in is the simulated x-actor header: pairing proves the flow, not the security (Scaffolding, P-33).
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Ip, Param, Post, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CODE_ALPHABET, EXTENSION_PUBLIC_KEY, FillPlanRequest, MODES, NewExtensionCapture, NewPairing, NewSession, PAIRING } from "../../contracts/extension.ts";
import type { CaptureInput, CaptureRecord } from "../../engine/capture.ts";
import { fillPlan, onlineMapOf, type FillPlan } from "../../engine/extension/fill.ts";
import { idLooksLikeClientDetail, screenDifference, screenIdentity } from "../../engine/extension/screens.ts";
import { noAnswers } from "../../engine/capture.ts";
import { problemFromZod } from "../../contracts/programs.ts";
import { portalLabel } from "../../contracts/forms.ts";
import { ACTORS, actorOf, Audit, bearerOf, Db, fail, need, RUNTIME_ACTORS, SOLUTION, Workspace, type Actor } from "./core.ts";
import { Runtime } from "./runtime.ts";
import { Forms } from "./forms.ts";

type H = string | undefined;
type Mode = (typeof MODES)[number];
/** Chrome's id of an extension: the first 128 bits of the sha256 of its public key, written with the letters a–p. */
export const extensionIdOf = (keyB64: string) => [...createHash("sha256").update(Buffer.from(keyB64, "base64")).digest("hex").slice(0, 32)].map((h) => String.fromCharCode(97 + parseInt(h, 16))).join("");
export const EXTENSION_ID = process.env.STUDIO_EXTENSION_ID || extensionIdOf(EXTENSION_PUBLIC_KEY);
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}`;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const unauthorized = (detail: string): never => { throw new HttpException({ type: "https://expatready.local/problems/extension-sign-in", title: "Sign in again", status: 401, detail }, HttpStatus.UNAUTHORIZED); };
const parse = <T>(schema: { safeParse: (b: unknown) => { success: true; data: T } | { success: false; error: unknown } }, body: unknown): T => {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new HttpException(problemFromZod(r.error as never), HttpStatus.BAD_REQUEST);
  return r.data;
};
/** The modes a person's duties give: capture for the author duty (the capture duty, Sample), fill for the case duty. */
export const modesOf = (a: Actor): Mode[] => [...((a.duties as readonly string[]).includes("author") ? ["capture" as const] : []), ...((a.duties as readonly string[]).includes("case") ? ["fill" as const] : [])];
export type Signed = { actor: Actor; modes: Mode[]; sessionId: string; workspaceId: string };

@Injectable()
export class Extension {
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Forms) private readonly forms: Forms, @Inject(Runtime) private readonly runtime: Runtime) {}

  /** XT-1: a code for the signed-in Studio person, shown once, kept hashed. */
  async pair(actor: Actor, body: unknown) {
    parse(NewPairing, body);
    const modes = modesOf(actor);
    if (!modes.length) fail(`${actor.name} (simulated) holds neither the capture duty nor the case duty, so the extension has nothing to do for them.`, HttpStatus.FORBIDDEN);
    const workspaceId = await this.ws.id();
    const live = { usedAt: null, voidedAt: null, expiresAt: { gt: new Date() } };
    const open = await this.db.extensionPairing.count({ where: { person: actor.id, ...live } });
    if (open >= PAIRING.openCodes) fail(`${open} codes are still open: use one in the extension, or wait ${PAIRING.codeMinutes} minutes for them to end.`, HttpStatus.TOO_MANY_REQUESTS);
    // Three characters no open code starts with, when there are any (so one person's typing never counts against another's code).
    let code = "";
    for (let n = 0; n < 5 && !code; n++) {
      const c = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
      if (n === 4 || !(await this.db.extensionPairing.count({ where: { selector: c.slice(0, PAIRING.selector), ...live } }))) code = c;
    }
    const expiresAt = new Date(Date.now() + PAIRING.codeMinutes * 60_000);
    await this.db.extensionPairing.create({ data: { workspaceId, person: actor.id, modes, codeHash: sha(code), selector: code.slice(0, PAIRING.selector), expiresAt } });
    await this.audit.log(workspaceId, actor.id, "paired", "browser extension", null, `${actor.name} asked for a code to connect the browser extension (${modes.join(" and ")})`);
    return { code, expires_at: expiresAt.toISOString(), modes, message: `Connect the browser extension: enter this code in the extension within ${PAIRING.codeMinutes} minutes.` };
  }

  /** XT-2: the extension exchanges a code for its token (once). The fifth wrong try against a code voids it. */
  async session(body: unknown, origin: H, ip: string) {
    const now = Date.now();
    // Who is asking first (break m2: a request from elsewhere never spends a code's tries).
    const b = parse(NewSession, body);
    if (b.extensionId !== EXTENSION_ID || origin !== EXTENSION_ORIGIN) unauthorized("This is not the ExpatReady extension the Studio knows.");
    // Every try is written before it is counted, so tries sent at the same moment each see the others (break M1); a right
    // code takes its own try back. Old tries are cleared as new ones come.
    const address = (ip || "unknown").slice(0, 64);
    const [mine] = await this.db.$queryRaw<{ id: bigint }[]>`insert into extension_code_try (address) values (${address}) returning id`;
    await this.db.$executeRaw`delete from extension_code_try where at < now() - interval '10 minutes'`;
    // The server total counts at most an address's own limit from each address: one address over its limit is refused on
    // its own and never pauses every colleague (review-4 Major 1).
    const [n] = await this.db.$queryRaw<{ here: bigint; all: bigint }[]>`select coalesce(sum(c) filter (where address = ${address}), 0) as here, coalesce(sum(least(c, ${PAIRING.triesPerAddress})), 0) as all
      from (select address, count(*) as c from extension_code_try where at > now() - interval '1 minute' group by address) t`;
    if (Number(n.here) > PAIRING.triesPerAddress) fail("Too many tries from this network in the last minute: wait a minute, then enter the code again.", HttpStatus.TOO_MANY_REQUESTS);
    if (Number(n.all) > PAIRING.triesPerServer) fail("Too many tries to connect an extension in the last minute: wait a minute, then enter the code again.", HttpStatus.TOO_MANY_REQUESTS);
    const p = await this.db.extensionPairing.findUnique({ where: { codeHash: sha(b.code) } });
    if (!p || p.usedAt || p.voidedAt || p.expiresAt.getTime() <= now) {
      // A wrong code counts against every open code it could have meant (same first three characters), in one statement
      // each, so tries sent at the same moment are all counted (break M1) and a restart forgets none.
      const hit = await this.db.$queryRaw<{ id: string; person: string; workspace_id: string; voided: boolean }[]>`update extension_pairing
        set wrong_tries = wrong_tries + 1, voided_at = case when wrong_tries + 1 >= ${PAIRING.wrongTries} then now() else voided_at end
        where selector = ${b.code.slice(0, PAIRING.selector)} and used_at is null and voided_at is null and expires_at > now() and code_hash <> ${sha(b.code)}
        returning id, person, workspace_id, voided_at is not null as voided`;
      for (const v of hit.filter((x) => x.voided)) await this.audit.log(v.workspace_id, v.person, "voided", "browser extension", null, `A browser extension code of ${actorOf(v.person).name} stopped working after ${PAIRING.wrongTries} wrong tries`);
      if (p?.voidedAt || hit.some((x) => x.voided)) unauthorized(`That code stopped working after ${PAIRING.wrongTries} wrong tries: ask the Studio for a new one.`);
      unauthorized(`That code is wrong, already used or more than 5 minutes old: check it, or ask the Studio for a new one. A code stops working after ${PAIRING.wrongTries} wrong tries.`);
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now + PAIRING.sessionHours * 3_600_000);
    // The code is spent under its own row: two exchanges at the same moment give one session (the other is refused).
    const s = await this.db.$transaction(async (tx) => {
      // Not voided meanwhile: the fifth wrong try and the right code sent at the same moment cannot both win.
      const used = await tx.extensionPairing.updateMany({ where: { id: p!.id, usedAt: null, voidedAt: null }, data: { usedAt: new Date() } });
      if (!used.count) unauthorized("That code was just used or stopped working: ask the Studio for a new one.");
      return tx.extensionSession.create({ data: { workspaceId: p!.workspaceId, person: p!.person, modes: p!.modes, extensionId: b.extensionId, tokenHash: sha(token), pairingId: p!.id, expiresAt } });
    });
    await this.db.$executeRaw`delete from extension_code_try where id = ${mine.id}`;
    const actor = actorOf(s.person);
    await this.audit.log(s.workspaceId, s.person, "connected", "browser extension", null, `${actor.name} connected the browser extension (${s.modes.join(" and ")}; until ${expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC)`);
    return { token, expires_at: expiresAt.toISOString(), modes: s.modes, person: { id: actor.id, name: actor.name, role: actor.role } };
  }

  /** XT-2/XT-3: the person an extension request stands for. Only the token; its session must be live, from the fixed
   *  extension's origin, and hold the mode the route needs. */
  async signed(auth: H, origin: H, xActor: H, mode?: Mode): Promise<Signed> {
    const token = bearerOf(auth);
    if (!token) unauthorized(xActor ? "The extension's routes take only the extension's own sign-in, never the Studio's." : "Connect the browser extension first: enter a code from the Studio.");
    if (origin !== EXTENSION_ORIGIN) unauthorized("This request did not come from the ExpatReady extension.");
    const s = await this.db.extensionSession.findUnique({ where: { tokenHash: sha(token!) } });
    if (!s || s.revokedAt || s.expiresAt.getTime() <= Date.now() || `chrome-extension://${s.extensionId}` !== origin) unauthorized("The extension's session ended: connect it again with a new code from the Studio.");
    const actor = [...ACTORS, ...RUNTIME_ACTORS].find((x) => x.id === s!.person);
    if (!actor) unauthorized("The person this session was for is not known any more.");
    // The duty is checked again on every request: a session never outlives the duty it was given for.
    const modes = (s!.modes as Mode[]).filter((m) => modesOf(actor!).includes(m));
    if (mode && !modes.includes(mode)) fail(mode === "capture" ? `${actor!.name} (simulated) is not given the capture duty: the extension cannot capture screens for them.` : `${actor!.name} (simulated) is not given the case duty: the extension cannot fill screens for them.`, HttpStatus.FORBIDDEN);
    return { actor: actor!, modes, sessionId: s!.id, workspaceId: s!.workspaceId };
  }

  async me(sig: Signed) {
    const s = await this.db.extensionSession.findUniqueOrThrow({ where: { id: sig.sessionId } });
    return { person: { id: sig.actor.id, name: sig.actor.name, role: sig.actor.role }, modes: sig.modes, expires_at: s.expiresAt.toISOString() };
  }
  async signOut(sig: Signed) {
    await this.db.extensionSession.update({ where: { id: sig.sessionId }, data: { revokedAt: new Date() } });
    await this.audit.log(sig.workspaceId, sig.actor.id, "disconnected", "browser extension", null, `${sig.actor.name} signed the browser extension out`);
  }
  /** The Studio person's own sessions (never another person's), newest first. */
  async sessions(actor: Actor) {
    // Every live session (break m3: an older live one could not be seen or disconnected), then the 20 newest ended ones.
    const live = await this.db.extensionSession.findMany({ where: { person: actor.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    const ended = await this.db.extensionSession.findMany({ where: { person: actor.id, OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: new Date() } }] }, orderBy: { createdAt: "desc" }, take: 20 });
    const rows = [...live, ...ended];
    const now = Date.now();
    return rows.map((s) => ({ id: s.id, modes: s.modes, created_at: s.createdAt.toISOString(), expires_at: s.expiresAt.toISOString(), state: s.revokedAt ? "signed out" : s.expiresAt.getTime() <= now ? "ended" : "connected" }));
  }
  async revoke(actor: Actor, id: string) {
    const r = await this.db.extensionSession.updateMany({ where: { id, person: actor.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!r.count) fail("No connected extension session of yours has that id.", HttpStatus.NOT_FOUND);
    await this.audit.log(await this.ws.id(), actor.id, "disconnected", "browser extension", null, `${actor.name} disconnected a browser extension session from the Studio`);
  }

  // ─── capture (BR-4, BR-15): the Studio's capture flow, for the token's person, extension captures only
  async ownCapture(sig: Signed, id: string) {
    const c = await this.db.portalCapture.findFirst({ where: { id, workspaceId: sig.workspaceId, way: "extension", capturedBy: sig.actor.id } });
    if (!c) fail("No capture of yours with that id was started in the extension.", HttpStatus.NOT_FOUND);
    return c!;
  }
  /** Review Major 1: the person's own extension captures still open (or returned to them), newest first, so a panel that
   *  was closed or reloaded continues one instead of losing it. */
  async openCaptures(sig: Signed) {
    const rows = await this.db.portalCapture.findMany({ where: { workspaceId: sig.workspaceId, way: "extension", capturedBy: sig.actor.id, status: { in: ["OPEN", "RETURNED"] } }, orderBy: { createdAt: "desc" }, take: 20 });
    // F3 X1: a capture started in the Studio for a combination is listed first.
    return Promise.all([...rows.filter((c) => c.combinationId), ...rows.filter((c) => !c.combinationId)].map((c) => this.forms.capture(c.id)));
  }
  startCapture(sig: Signed, body: unknown) { return this.forms.createCapture(sig.actor, { ...parse(NewExtensionCapture, body), way: "extension" }); }
  async addScreen(sig: Signed, id: string, body: unknown) { await this.ownCapture(sig, id); return this.forms.addExtensionScreen(sig.actor, id, body); }
  async capture(sig: Signed, id: string) { await this.ownCapture(sig, id); return this.forms.capture(id); }
  /** PR #27: a returned (or open) capture goes on in the panel: a wrong screen is removed there, then captured again. */
  async removeScreen(sig: Signed, id: string, order: number, revision: string | undefined) {
    // Break (26 Oct): the panel names a screen by its place, so it must say which version of the list it saw.
    if (!/^\d+$/.test(revision ?? "")) fail("Send the capture's revision you were shown, so the screen you meant is the one removed.");
    await this.ownCapture(sig, id); return this.forms.removeScreen(sig.actor, id, order, Number(revision));
  }
  async finish(sig: Signed, id: string) { await this.ownCapture(sig, id); return this.forms.finish(sig.actor, id); }

  /** Fill mode's choice of case: the workspace's open cases, newest first, with their people and the forms their
   *  pinned release files online (an officer reaches any case of the workspace, as in the Studio). */
  async cases(sig: Signed, q?: string) {
    need(sig.actor, "case");
    // Break M4: any open case can be found by its reference (the 50 newest without a search).
    const find = (q ?? "").trim().slice(0, 80);
    const rows = await this.db.case.findMany({ where: { workspaceId: sig.workspaceId, status: "OPEN", ...(find ? { reference: { contains: find, mode: "insensitive" } } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50,
      include: { combination: { select: { label: true } }, pins: { include: { release: { select: { version: true, snapshot: true } } } }, participants: { orderBy: { order: "asc" }, include: { subject: { select: { label: true } } } } } });
    return rows.map((c) => {
      const s = c.pins[0]?.release.snapshot as unknown as { forms: { form_number: string; channel?: string }[]; field_maps: { form_number: string; channel?: string }[] } | undefined;
      const online = (s?.forms ?? []).filter((f) => f.channel === "ONLINE" && (s?.field_maps ?? []).some((m) => m.form_number === f.form_number && m.channel === "ONLINE")).map((f) => f.form_number);
      return { id: c.id, reference: c.reference, release: `${c.combination.label} · release ${c.pins[0]?.release.version ?? "?"}`, online_forms: [...new Set(online)],
        people: c.participants.filter((p) => p.role !== "case").map((p) => ({ subject_id: p.subjectId, label: p.subject.label, role: p.role })) };
    });
  }

  // ─── fill (BR-7…BR-13, BR-15): one screen of one case's online form, from its pinned release only (M2)
  async fillPlan(sig: Signed, caseId: string, form: string, subjectId: string, body: unknown) {
    const answers = noAnswers((body as { screen?: unknown } | null)?.screen ?? {});
    if (answers.length) fail(`Refused: the screen carried an answer (${answers.slice(0, 3).join(", ")}). The extension sends the screen's structure only; nothing was kept.`);
    const live = parse(FillPlanRequest, body).screen as { title: string; inputs: CaptureInput[] };
    const c = await this.runtime.reach(sig.actor, caseId, "officer");
    const s = this.runtime.snapshotOf(c), people = this.runtime.peopleOf(c);
    if (!people.some((p) => p.subjectId === subjectId && p.role !== "case")) fail("That person is not on this case.", HttpStatus.NOT_FOUND);
    const map = onlineMapOf<{ form_number: string; form_edition: string; inventory_file: string }>(s, form);
    if (!map) fail(`${form} is not filed online in the release this case works from: fill it as a PDF from the case.`, HttpStatus.CONFLICT);
    const twin = (JSON.parse(readFileSync(join(SOLUTION, map!.inventory_file), "utf8")) as { record: CaptureRecord }).record;
    const st = await this.runtime.state(c);
    const plan = fillPlan(s, twin, form, subjectId, people, st.answers, st.rows, live);
    const ed = await this.db.formEdition.findFirst({ where: { workspaceId: c.workspaceId, editionLabel: map!.form_edition } });
    let task: { id: string; times: number; message: string } | null = null, newer: { edition: string; message: string } | null = null;
    if (!plan.match && ed) {
      // M2: when the library already has a newer approved version that matches this screen, the re-capture is done;
      // this case keeps its release ("released means frozen"), so the screen is filled by hand and no task opens.
      const later = await this.db.formEdition.findMany({ where: { workspaceId: c.workspaceId, govFormDefId: ed.govFormDefId, channel: "ONLINE", portalKey: ed.portalKey, capturedOn: { gte: ed.capturedOn ?? new Date(0) }, id: { not: ed.id } }, orderBy: { capturedOn: "desc" } });
      const fits = later.find((v) => { if (!v.inventoryFile) return false; const r = (JSON.parse(readFileSync(join(SOLUTION, v.inventoryFile), "utf8")) as { record: CaptureRecord }).record; const sc = r.screens.find((x) => screenIdentity(x.title) === screenIdentity(live.title)); return !!sc && screenDifference(sc, live).length === 0; });
      if (fits) newer = { edition: fits.editionLabel, message: `This case uses the release of ${c.pins[0].release.releasedAt.toISOString().slice(0, 10)}, made before the portal changed; the portal now shows ${fits.editionLabel}. Nothing was filled: fill this screen by hand.` };
      else task = await this.recapture(sig, ed.id, plan, map!.form_edition, live.inputs.map((i) => i.id));
    }
    const counts = plan.match ? plan.counts : null;
    await this.audit.log(c.workspaceId, sig.actor.id, plan.match ? "planned" : "refused", "screen fill", form, plan.match
      ? `${sig.actor.name} asked the extension to fill "${plan.screen}" of ${form} for case ${caseId.slice(0, 8)}: ${counts!.fill} to fill, ${plan.inputs.length - counts!.fill} not (counts only)`
      : `${sig.actor.name}'s screen of ${form} for case ${caseId.slice(0, 8)} ${plan.reason === "not_captured" ? "is not in the approved version" : "differs from the approved version"}: nothing filled${task ? ", re-capture task open" : newer ? ", a newer version matches (fill by hand)" : ""}`);
    if (!plan.match) return { ...plan, task, newer, message: newer ? newer.message : plan.reason === "not_captured" ? "This screen is not in the approved version. Nothing was filled. Capture needed is open for the content team." : "This screen looks different from the approved version. Nothing was filled. Re-capture needed is open for the content team." };
    return { ...plan, message: `${counts!.fill} to fill on this screen${plan.inputs.length - counts!.fill ? ` · ${plan.inputs.length - counts!.fill} need you` : ""}.` };
  }

  /** XT-6: one open task per online version, screen and kind; a second mismatch updates the same row (the partial
   *  unique index decides between two at the same moment). Only input ids, kinds of change, option codes and the
   *  approved labels are kept: never the live page's text (M5). */
  private async recapture(sig: Signed, editionId: string, plan: Exclude<FillPlan, { match: true }>, editionLabel: string, liveIds: string[]) {
    const kind = plan.reason === "changed" ? "changed" : "not_captured";
    // For a screen the version does not have: its element ids (the page's code, not a client's text) say what to capture.
    // PR #27: a live element id that looks like a client's detail (an email address, a long number, a passport-like code)
    // is dropped: it is the page's code, but a page can build it from what was typed.
    const differences = plan.reason === "changed" ? plan.differences : liveIds.filter((i) => !idLooksLikeClientDetail(i)).slice(0, 200).map((input) => ({ input, change: "added", approved_label: null }));
    // Break M2: a changed screen is the approved one (its approved heading and identity are kept); a screen the version
    // does not have is known only by the live page, whose heading can hold a client's details, so it is kept as a
    // checksum of that heading and named in words, never in the page's own text (M5).
    const page = plan.reason === "changed" ? plan.screen_page : `unknown-${sha(plan.screen_page).slice(0, 16)}`;
    const title = plan.reason === "changed" ? plan.screen : "A screen that is not in the approved version";
    if (kind === "not_captured") {
      // One fill token cannot flood the content team: at most 10 open "Capture needed" tasks per online version.
      const open = await this.db.recaptureTask.count({ where: { formEditionId: editionId, kind, status: "OPEN" } });
      const same = await this.db.recaptureTask.findFirst({ where: { formEditionId: editionId, kind, status: "OPEN", screenPage: page } });
      if (open >= 10 && !same) return { id: "", times: 0, message: "10 screens of this form are already waiting to be captured; the content team sees them first." };
    }
    const open = await this.db.$queryRaw<{ n: bigint; combos: bigint }[]>`select count(distinct c.id) as n, count(distinct c.combination_id) as combos from runtime_case c join pack_work_pin p on p.case_id = c.id join config_release r on r.id = p.config_release_id
      where c.workspace_id = ${sig.workspaceId}::uuid and c.status = 'OPEN' and r.snapshot -> 'field_maps' @> ${JSON.stringify([{ form_edition: editionLabel }])}::jsonb`;
    const affected = { open_cases: Number(open[0]?.n ?? 0), combinations: Number(open[0]?.combos ?? 0) };
    const rows = await this.db.$queryRaw<{ id: string; times: number }[]>`insert into recapture_task (id, workspace_id, form_edition_id, screen_page, screen_title, kind, differences, affected, opened_by, updated_at)
      values (gen_random_uuid(), ${sig.workspaceId}::uuid, ${editionId}::uuid, ${page}, ${title}, ${kind}, ${JSON.stringify(differences)}::jsonb, ${JSON.stringify(affected)}::jsonb, ${sig.actor.id}, now())
      on conflict (form_edition_id, screen_page, kind) where status = 'OPEN'
      do update set times = recapture_task.times + 1, differences = excluded.differences, affected = excluded.affected, updated_at = now()
      returning id, times`;
    const t = rows[0];
    return { id: t.id, times: t.times, message: t.times > 1 ? `Re-capture needed was already open: updated (${t.times} times seen).` : "Re-capture needed is open for the content team." };
  }

  /** The content team's list (review duty): open tasks first, with the screens and changes to capture again. */
  /** F3 D8, X8: the open re-capture tasks, for a person capturing in the extension (capture token): which form, portal
   *  and screen, and what changed; never the cases they affect (STANDARDS §5: a capture token sees no client). */
  async captureTasks(sig: Signed) {
    const rows = await this.db.recaptureTask.findMany({ where: { workspaceId: sig.workspaceId, status: "OPEN" }, include: { edition: { select: { editionLabel: true, portalKey: true, form: { select: { formKey: true, displayName: true } } } } }, orderBy: { updatedAt: "desc" }, take: 50 });
    // Break m6: no element id reaches a capture token (a page can build one from what was typed): each difference is
    // the approved question's label and what changed; a screen the version lacks is counted, not listed.
    const words = (d: unknown) => (Array.isArray(d) ? d : []).map((x: { approved_label?: string | null; change?: string }) => ({ question: x.approved_label ?? null, change: x.change ?? "changed" }));
    return rows.map((t) => ({ id: t.id, form: t.edition.form.formKey, title: t.edition.form.displayName, portal: t.edition.portalKey, portal_label: portalLabel(t.edition.portalKey), edition: t.edition.editionLabel, screen: t.screenTitle, kind: t.kind,
      differences: t.kind === "changed" ? words(t.differences).filter((x) => x.question) : [], new_questions: t.kind === "changed" ? 0 : (Array.isArray(t.differences) ? t.differences.length : 0), times: t.times }));
  }
  async tasks(actor: Actor) {
    need(actor, "review");
    const rows = await this.db.recaptureTask.findMany({ where: { workspaceId: await this.ws.id() }, include: { edition: { select: { editionLabel: true } } }, orderBy: [{ status: "desc" }, { updatedAt: "desc" }], take: 100 });
    return rows.map((t) => ({ id: t.id, edition: t.edition.editionLabel, screen: t.screenTitle, screen_page: t.screenPage, kind: t.kind, status: t.status, differences: t.differences, affected: t.affected, times: t.times, opened_at: t.openedAt.toISOString(), updated_at: t.updatedAt.toISOString(), closed_by: t.closedBy }));
  }
}

@Controller("api/extension")
export class ExtensionController {
  constructor(@Inject(Extension) private readonly x: Extension) {}
  // Studio (x-actor)
  @Post("pairings") pair(@Headers("x-actor") a: H, @Body() b: unknown) { return this.x.pair(actorOf(a), b); }
  @Get("sessions") sessions(@Headers("x-actor") a: H) { return this.x.sessions(actorOf(a)); }
  @Delete("sessions/:id") @HttpCode(204) async revoke(@Headers("x-actor") a: H, @Param("id") id: string) { await this.x.revoke(actorOf(a), id); }
  // Extension (its token only)
  @Post("sessions") session(@Body() b: unknown, @Headers("origin") o: H, @Ip() ip: string) { return this.x.session(b, o, ip); }
  @Get("session") async me(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H) { return this.x.me(await this.x.signed(t, o, a)); }
  @Delete("session") @HttpCode(204) async signOut(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H) { await this.x.signOut(await this.x.signed(t, o, a)); }
  @Post("captures") async start(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Body() b: unknown, @Res({ passthrough: true }) res: Response) { const r = await this.x.startCapture(await this.x.signed(t, o, a, "capture"), b); res.status(r.reused ? 200 : 201); return r; }
  @Get("captures") async captures(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H) { return this.x.openCaptures(await this.x.signed(t, o, a, "capture")); }
  @Get("captures/:id") async capture(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string) { return this.x.capture(await this.x.signed(t, o, a, "capture"), id); }
  @Delete("captures/:id/screens/:order") async removeScreen(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string, @Param("order") n: string, @Query("revision") rev?: string) { return this.x.removeScreen(await this.x.signed(t, o, a, "capture"), id, Number(n), rev); }
  @Post("captures/:id/screens") async screen(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.addScreen(await this.x.signed(t, o, a, "capture"), id, b); }
  @Get("cases") async cases(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Query("q") q?: string) { return this.x.cases(await this.x.signed(t, o, a, "fill"), q); }
  @Post("cases/:id/forms/:form/:subject/fill-plans") @HttpCode(200) async fill(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Param("subject") subject: string, @Body() b: unknown) { return this.x.fillPlan(await this.x.signed(t, o, a, "fill"), id, form, subject, b); }
  @Get("recapture-tasks") tasks(@Headers("x-actor") a: H) { return this.x.tasks(actorOf(a)); }
  @Get("capture/recapture-tasks") async captureTasks(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H) { return this.x.captureTasks(await this.x.signed(t, o, a, "capture")); }
  @Post("captures/:id/finish") @HttpCode(200) async finish(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string) { return this.x.finish(await this.x.signed(t, o, a, "capture"), id); }
}
