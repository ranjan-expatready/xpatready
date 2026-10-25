// The browser extension's API (forms lane F2b; P-90; plan §7 XT-1…XT-4, BR-15; Lead decision Q1; challenge M7).
//   Studio side (the simulated sign-in, x-actor): a one-time pairing code; the person's extension sessions; revoke.
//   Extension side (only its own token, never x-actor): exchange the code for a token; who am I; sign out; capture.
// The token is opaque (32 random bytes), kept only as its sha256, bound to the person, the firm (workspace), the
// modes their duties give (capture: the author duty, Sample; fill: the case duty) and the extension's fixed id, which
// every request's Origin must match. Codes are single-use, 5 minutes; tokens 8 hours (Sample); five wrong codes from
// one address in 5 minutes refuse further tries for 5 minutes (STANDARDS §8). Answers and tokens are never logged.
// The Studio's sign-in is the simulated x-actor header: pairing proves the flow, not the security (Scaffolding, P-33).
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpException, HttpStatus, Inject, Injectable, Ip, Param, Post } from "@nestjs/common";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CODE_ALPHABET, EXTENSION_PUBLIC_KEY, FillPlanRequest, MODES, NewExtensionCapture, NewPairing, NewSession, PAIRING } from "../../contracts/extension.ts";
import type { CaptureInput, CaptureRecord } from "../../engine/capture.ts";
import { fillPlan, onlineMapOf, type FillPlan } from "../../engine/extension/fill.ts";
import { screenDifference, screenIdentity } from "../../engine/extension/screens.ts";
import { noAnswers } from "../../engine/capture.ts";
import { problemFromZod } from "../../contracts/programs.ts";
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
  private wrong = new Map<string, number[]>();
  /** The wrong tries from one address within the window; a new one is added to the list as it is now (two requests at
   *  the same moment each count: never a list read before the other request's try was added). */
  private tries(ip: string) { const win = PAIRING.wrongWindowMinutes * 60_000; return (this.wrong.get(ip) ?? []).filter((t) => Date.now() - t < win); }
  private strike(ip: string) { this.wrong.set(ip, [...this.tries(ip), Date.now()]); }
  constructor(@Inject(Db) private readonly db: Db, @Inject(Workspace) private readonly ws: Workspace, @Inject(Audit) private readonly audit: Audit, @Inject(Forms) private readonly forms: Forms, @Inject(Runtime) private readonly runtime: Runtime) {}

  /** XT-1: a code for the signed-in Studio person, shown once, kept hashed. */
  async pair(actor: Actor, body: unknown) {
    parse(NewPairing, body);
    const modes = modesOf(actor);
    if (!modes.length) fail(`${actor.name} (simulated) holds neither the capture duty nor the case duty, so the extension has nothing to do for them.`, HttpStatus.FORBIDDEN);
    const workspaceId = await this.ws.id();
    const open = await this.db.extensionPairing.count({ where: { person: actor.id, usedAt: null, expiresAt: { gt: new Date() } } });
    if (open >= PAIRING.openCodes) fail(`${open} codes are still open: use one in the extension, or wait ${PAIRING.codeMinutes} minutes for them to end.`, HttpStatus.TOO_MANY_REQUESTS);
    const code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const expiresAt = new Date(Date.now() + PAIRING.codeMinutes * 60_000);
    await this.db.extensionPairing.create({ data: { workspaceId, person: actor.id, modes, codeHash: sha(code), expiresAt } });
    await this.audit.log(workspaceId, actor.id, "paired", "browser extension", null, `${actor.name} asked for a code to connect the browser extension (${modes.join(" and ")})`);
    return { code, expires_at: expiresAt.toISOString(), modes, message: `Connect the browser extension: enter this code in the extension within ${PAIRING.codeMinutes} minutes.` };
  }

  /** XT-2: the extension exchanges a code for its token (once). Five wrong codes from one address pause tries. */
  async session(body: unknown, origin: H, ip: string) {
    const now = Date.now();
    if (this.tries(ip).length >= PAIRING.wrongTries) fail(`Too many wrong codes: try again in ${PAIRING.wrongWindowMinutes} minutes, with a new code from the Studio.`, HttpStatus.TOO_MANY_REQUESTS);
    const b = parse(NewSession, body);
    if (b.extensionId !== EXTENSION_ID || origin !== EXTENSION_ORIGIN) unauthorized("This is not the ExpatReady extension the Studio knows.");
    const p = await this.db.extensionPairing.findUnique({ where: { codeHash: sha(b.code) } });
    if (!p || p.usedAt || p.expiresAt.getTime() <= now) { this.strike(ip); unauthorized("That code is wrong, already used or more than 5 minutes old: ask the Studio for a new one."); }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now + PAIRING.sessionHours * 3_600_000);
    // The code is spent under its own row: two exchanges at the same moment give one session (the other is refused).
    const s = await this.db.$transaction(async (tx) => {
      const used = await tx.extensionPairing.updateMany({ where: { id: p!.id, usedAt: null }, data: { usedAt: new Date() } });
      // Losing the race for a code is a used code: a wrong try like any other (the count does not depend on timing).
      if (!used.count) { this.strike(ip); unauthorized("That code was just used: ask the Studio for a new one."); }
      return tx.extensionSession.create({ data: { workspaceId: p!.workspaceId, person: p!.person, modes: p!.modes, extensionId: b.extensionId, tokenHash: sha(token), pairingId: p!.id, expiresAt } });
    });
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
    const rows = await this.db.extensionSession.findMany({ where: { person: actor.id }, orderBy: { createdAt: "desc" }, take: 20 });
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
  startCapture(sig: Signed, body: unknown) { return this.forms.createCapture(sig.actor, { ...parse(NewExtensionCapture, body), way: "extension" }); }
  async addScreen(sig: Signed, id: string, body: unknown) { await this.ownCapture(sig, id); return this.forms.addExtensionScreen(sig.actor, id, body); }
  async capture(sig: Signed, id: string) { await this.ownCapture(sig, id); return this.forms.capture(id); }
  async finish(sig: Signed, id: string) { await this.ownCapture(sig, id); return this.forms.finish(sig.actor, id); }

  /** Fill mode's choice of case: the workspace's open cases, newest first, with their people and the forms their
   *  pinned release files online (an officer reaches any case of the workspace, as in the Studio). */
  async cases(sig: Signed) {
    need(sig.actor, "case");
    const rows = await this.db.case.findMany({ where: { workspaceId: sig.workspaceId, status: "OPEN" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20,
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
      if (fits) newer = { edition: fits.editionLabel, message: `This case uses the version released on ${ed.capturedOn?.toISOString().slice(0, 10) ?? "an earlier day"}; the portal now shows ${fits.editionLabel}. Nothing was filled: fill this screen by hand.` };
      else task = await this.recapture(sig, ed.id, plan, map!.form_edition);
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
  private async recapture(sig: Signed, editionId: string, plan: Exclude<FillPlan, { match: true }>, editionLabel: string) {
    const kind = plan.reason === "changed" ? "changed" : "not_captured";
    const differences = plan.reason === "changed" ? plan.differences : [];
    const title = plan.reason === "changed" ? plan.screen : `(screen ${plan.screen_page})`;
    const open = await this.db.$queryRaw<{ n: bigint; combos: bigint }[]>`select count(distinct c.id) as n, count(distinct c.combination_id) as combos from runtime_case c join pack_work_pin p on p.case_id = c.id join config_release r on r.id = p.config_release_id
      where c.workspace_id = ${sig.workspaceId}::uuid and c.status = 'OPEN' and r.snapshot -> 'field_maps' @> ${JSON.stringify([{ form_edition: editionLabel }])}::jsonb`;
    const affected = { open_cases: Number(open[0]?.n ?? 0), combinations: Number(open[0]?.combos ?? 0) };
    const rows = await this.db.$queryRaw<{ id: string; times: number }[]>`insert into recapture_task (id, workspace_id, form_edition_id, screen_page, screen_title, kind, differences, affected, opened_by, updated_at)
      values (gen_random_uuid(), ${sig.workspaceId}::uuid, ${editionId}::uuid, ${plan.screen_page}, ${title}, ${kind}, ${JSON.stringify(differences)}::jsonb, ${JSON.stringify(affected)}::jsonb, ${sig.actor.id}, now())
      on conflict (form_edition_id, screen_page, kind) where status = 'OPEN'
      do update set times = recapture_task.times + 1, differences = excluded.differences, affected = excluded.affected, updated_at = now()
      returning id, times`;
    const t = rows[0];
    return { id: t.id, times: t.times, message: t.times > 1 ? `Re-capture needed was already open: updated (${t.times} times seen).` : "Re-capture needed is open for the content team." };
  }

  /** The content team's list (review duty): open tasks first, with the screens and changes to capture again. */
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
  @Post("captures") async start(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Body() b: unknown) { return this.x.startCapture(await this.x.signed(t, o, a, "capture"), b); }
  @Get("captures/:id") async capture(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string) { return this.x.capture(await this.x.signed(t, o, a, "capture"), id); }
  @Post("captures/:id/screens") async screen(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string, @Body() b: unknown) { return this.x.addScreen(await this.x.signed(t, o, a, "capture"), id, b); }
  @Get("cases") async cases(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H) { return this.x.cases(await this.x.signed(t, o, a, "fill")); }
  @Post("cases/:id/forms/:form/:subject/fill-plans") @HttpCode(200) async fill(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string, @Param("form") form: string, @Param("subject") subject: string, @Body() b: unknown) { return this.x.fillPlan(await this.x.signed(t, o, a, "fill"), id, form, subject, b); }
  @Get("recapture-tasks") tasks(@Headers("x-actor") a: H) { return this.x.tasks(actorOf(a)); }
  @Post("captures/:id/finish") @HttpCode(200) async finish(@Headers("authorization") t: H, @Headers("origin") o: H, @Headers("x-actor") a: H, @Param("id") id: string) { return this.x.finish(await this.x.signed(t, o, a, "capture"), id); }
}
