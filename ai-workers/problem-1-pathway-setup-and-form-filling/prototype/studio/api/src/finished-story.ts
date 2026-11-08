// C10.2 The finished story (DEMO.md checkpoint 3, the M3 gate; P-93, P-322), phase 1: the Visitor visa family case taken
// from case opening to a recorded submission, then a thin second case left on release 1. Demo › Load the finished story
// (POST /api/demo/checkpoints/finished-story, a job: 202, then GET /api/demo/status) empties the demo, loads the
// configured checkpoint (C10.1) and runs two of its steps that only this load asks for (features/checkpoint/125, 200).
// Every write here goes through the product's own HTTP routes, as the person who would act: the case officer moves the
// case and prepares it, the client answers and re-confirms their own facts, the representative of record reviews each
// filing. No SQL write and no faked state, so the load is itself a walk of the journey (J7): a step a rule refuses stays
// where it is and the result says the rule's words and the open bug that holds it. Values come from
// samples/finished-story.json, all Sample. No model call (US$0).
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { STUDIO } from "./core.ts";

export type StorySample = {
  move_reason: string; answers: { facts: Record<string, unknown> };
  by_kind: { text: string; digits: string; yes_no: boolean; date: string; month: string; expiry: string; number: string; email: string; phone: unknown; address: unknown };
  on_behalf_reason: string; passport: { document_type: string; words: string }; signed_scan_words: string; review_note: string; pass_reason: string;
  record: { our_reference_prefix: string; application_number_prefix: string; uci_prefix: string; fee_receipt: string };
  thin_case: { reference: string; principal: string; client: string };
};
export const storySample = (): StorySample => JSON.parse(readFileSync(join(STUDIO, "samples", "finished-story.json"), "utf8"));

/** One stage of the story as the result and the Demo menu show it. */
export type StoryStage = { key: string; title: string; status: "done" | "partial" | "waiting"; shows: string; why: string | null };
type Reply = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- route answers are read loosely, as the acceptance helpers do
export type Routes = { call: (actor: string, method: string, path: string, body?: unknown) => Promise<Reply>; upload: (actor: string, path: string, file: Buffer, name: string) => Promise<Reply> };

/** The app's own routes on this server (STUDIO_PORT, as main.ts listens), called as a simulated person (x-actor). */
export function routesAt(port = Number(process.env.STUDIO_PORT ?? 4400)): Routes {
  const call = (actor: string, method: string, path: string, body?: unknown) => new Promise<Reply>((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body));
    const req = request({ host: "127.0.0.1", port, path: `/api${path}`, method, agent: false, headers: { "x-actor": actor, "content-type": "application/json", ...(data ? { "content-length": data.length } : {}) } }, (res) => {
      const chunks: Buffer[] = []; res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => { const t = Buffer.concat(chunks).toString("utf8"); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ } resolve({ status: res.statusCode ?? 0, body: j }); });
    });
    req.on("error", reject); if (data) req.write(data); req.end();
  });
  const upload = async (actor: string, path: string, file: Buffer, name: string) => {
    const fd = new FormData(); fd.append("file", new Blob([new Uint8Array(file)], { type: "application/pdf" }), name);
    const res = await fetch(`http://127.0.0.1:${port}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { call, upload };
}

/** A refusal in the route's own words (its problem detail). */
const words = (r: Reply) => String(r.body?.detail ?? [r.body?.message].flat().join("; ") ?? `HTTP ${r.status}`).slice(0, 300);
class Stop extends Error {}
const must = (r: Reply, what: string) => { if (r.status >= 300) throw new Stop(`${what}: ${words(r)}`); return r.body; };
/** A synthetic one-page PDF standing in for a scan, its own words saying what it is (Sample, never real). */
const specimen = (text: string) => Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`, "latin1");

/** The open bugs and rules a stage of this story waits on, named in its words (never faked around). */
export const HELD = {
  sheet: "QA-165 (1): the answer sheet keeps waiting on IMM 5257's Yes/No gates (other names, national identity document, US PR card) and on facts the case holds as rows or as \"none apply\", and release 2 never asks the visit contact (case.visit_contact_*), so the Online item cannot read Done",
  family: "QA-153: IMM 5645's parents and brothers and sisters are not asked, so their boxes stay empty on the copy",
  validate: "Validate is a person's step in Adobe Reader (P-46, P-171): never simulated, so a barcode PDF waits for a person",
} as const;

type Q = { subjectId: string; fact: string; value_type: string; collected_from: string; required: boolean; hidden: boolean; shape: { datePrecision: string; phone: boolean }; options: { key: string }[] | null; answer: { id: string; confirmed: boolean; awaits_client?: boolean } | null; rows: { row: string; answer: { id: string; confirmed?: boolean; awaits_client?: boolean } | null }[] };
type Section = { subjectId: string; section: string; questions: Q[]; group: { required: boolean; rows: number; none_apply: { id: string } | null } | null };
type Person = { subject: string; label: string; role: string; age: number | null; applies: boolean };

/** Takes the family case (opened on release 1 by the configured checkpoint) to a recorded submission on release 2. */
export async function finishFamilyCase(r: Routes, caseId: string, s: StorySample = storySample()): Promise<{ stages: StoryStage[]; release: number | null; recorded: number }> {
  const stages: StoryStage[] = [];
  const kase = must(await r.call("user-O", "GET", `/runtime/cases/${caseId}`), "Read the case");
  const officer: string = kase.team?.officers?.[0]?.id ?? "user-O", rep: string | null = kase.team?.representative?.id ?? null, client: string = kase.client ?? "user-P";
  const get = async (path: string, who = officer) => must(await r.call(who, "GET", path), `Read ${path.split("/").slice(-1)[0]}`);
  const prepare = () => get(`/runtime/cases/${caseId}/prepare`);
  let stopped: string | null = null, release: number | null = null, recorded = 0;
  const stage = async (key: string, title: string, f: () => Promise<Omit<StoryStage, "key" | "title">>) => {
    if (stopped) { stages.push({ key, title, status: "waiting", shows: "Not reached", why: `Waits for "${stopped}".` }); return; }
    try { stages.push({ key, title, ...(await f()) }); }
    catch (e) { if (!(e instanceof Stop)) throw e; stages.push({ key, title, status: "waiting", shows: "Stopped here", why: e.message }); stopped = title; }
  };

  // C9.5: the case officer adopts the newer release with a reason (one new pin revision; work already done is kept).
  await stage("move", "The family case moves to release 2 (C9.5)", async () => {
    const view = await get(`/runtime/cases/${caseId}/release-update`);
    if (!view.target) { release = view.current?.version ?? null; if ((release ?? 0) < 2) throw new Stop(`No newer release to move to: ${view.combination} is on ${view.current?.label} (release 2 is row 9 of the configured checkpoint)`); return { status: "done", shows: `Already on ${view.current.label}`, why: null }; }
    const moved = must(await r.call(officer, "POST", `/runtime/cases/${caseId}/release-update`, { target_version: view.target.version, from_revision: view.current.revision, reason: s.move_reason }), "Move to the newer release");
    release = moved.version;
    return { status: "done", shows: `The case officer moved the case from ${moved.from.label} to ${moved.label} (release ${moved.version}) with a reason. ${moved.words}`, why: null };
  });

  // C6.1–C6.3, C6.18: each fact the new release asks is answered by its person: the client for themselves and the minor
  // (P-78), the case officer on another adult's behalf with a reason, then the client re-confirms; the officer confirms
  // each section.
  const byKind: string[] = [];
  await stage("facts", "Facts answered and confirmed by the right people (C6.1–C6.3, C6.18)", async () => {
    const people = new Map<string, Person>(((await prepare()).people as Person[]).map((p) => [p.subject, p]));
    const valueOf = (q: Q): unknown => {
      if (q.fact in s.answers.facts) return s.answers.facts[q.fact];
      byKind.push(q.fact);
      const k = s.by_kind;
      return q.options?.length ? q.options[0].key : q.shape.phone ? k.phone : q.value_type === "yes_no" ? k.yes_no : /expiry/.test(q.fact) ? k.expiry
        : q.value_type === "date" ? (q.shape.datePrecision === "month" ? k.month : k.date) : q.value_type === "number" ? k.number : q.value_type === "address" ? k.address : /email/.test(q.fact) ? k.email : k.text;
    };
    let answered = 0, byClient = 0, onBehalf = 0, reconfirmed = 0, confirmed = 0;
    const put = async (q: Q, value: unknown, row: string | null) => {
      const p = people.get(q.subjectId.split("/")[0]), own = q.collected_from === "client_questionnaire";
      const asClient = own && (!p || p.role === "principal" || (p.age ?? 0) < 18), behalf = own && !asClient;
      const body = { value, expectedId: row ? null : q.answer?.id ?? null, ...(row ? { row } : {}), ...(behalf ? { onBehalfOf: q.subjectId, reason: s.on_behalf_reason } : {}) };
      const path = `/runtime/cases/${caseId}/answers/${q.subjectId}/${q.fact}`;
      let a = await r.call(asClient ? client : officer, "PUT", path, body);
      // A text Sample the release's own checks refuse (a UCI is digits only) is given again as digits, once.
      if (a.status < 300 && value === s.by_kind.text && (a.body?.answer?.problems ?? []).length) a = await r.call(asClient ? client : officer, "PUT", path, { ...body, value: s.by_kind.digits, expectedId: row ? null : a.body?.answer?.id ?? null });
      if (a.status >= 300) throw new Stop(`${q.fact} for ${p?.label ?? "the application"}: ${words(a)}`);
      answered++; if (asClient) byClient++; if (behalf) onBehalf++;
    };
    for (let pass = 0; pass < 4; pass++) {
      const forms = (await get(`/runtime/cases/${caseId}/forms`)).forms as { applies: boolean; readiness: { ready: boolean } }[];
      if (pass > 0 && forms.every((f) => !f.applies || f.readiness.ready)) break;
      const v = await get(`/runtime/cases/${caseId}/questionnaire?mode=agent`) as { sections: Section[] };
      for (const sec of v.sections) for (const q of sec.questions.filter((x) => x.required && !x.hidden)) {
        if (q.fact === "person.date_of_birth" && !q.subjectId.includes("/")) continue; // set when the person was added
        if (sec.group) { for (const row of q.rows.filter((x) => !x.answer)) await put(q, valueOf(q), row.row); }
        else if (!q.answer) await put(q, valueOf(q), null);
      }
      for (const sec of v.sections.filter((x) => x.group?.required && x.group.rows === 0 && !x.group.none_apply))
        must(await r.call(officer, "PUT", `/runtime/cases/${caseId}/groups/${sec.subjectId}/${sec.section}/none-apply`, { noneApply: true, expectedId: null }), `"None apply" on ${sec.section}`);
      const after = await get(`/runtime/cases/${caseId}/questionnaire?mode=agent`) as { sections: Section[] };
      for (const q of after.sections.flatMap((x) => x.questions)) for (const a of [q.answer, ...q.rows.map((x) => x.answer)]) if (a?.awaits_client) { must(await r.call(client, "POST", `/runtime/cases/${caseId}/answers/${a.id}/reconfirm`, {}), "The client re-confirms an answer the officer entered"); reconfirmed++; }
      for (const sec of after.sections) {
        const seen = [...sec.questions.flatMap((q) => [q.answer?.id, ...q.rows.map((x) => x.answer?.id)]), sec.group?.none_apply?.id].filter(Boolean);
        if (!seen.length || sec.questions.every((q) => (!q.answer || q.answer.confirmed) && q.rows.every((x) => !x.answer || x.answer.confirmed))) continue;
        must(await r.call(officer, "POST", `/runtime/cases/${caseId}/sections/${sec.section}/confirm`, { subjectId: sec.subjectId, seen }), `Confirm the section ${sec.section}`); confirmed++;
      }
    }
    const left = ((await get(`/runtime/cases/${caseId}/forms`)).forms as { form: string; person: string; applies: boolean; readiness: { ready: boolean; missing: { label: string }[] } }[]).filter((f) => f.applies && !f.readiness.ready);
    const said = `${answered} answer${answered === 1 ? "" : "s"} typed (${byClient} by the client, ${onBehalf} by the case officer on an adult's behalf with a reason, ${answered - byClient - onBehalf} by the case officer), ${reconfirmed} re-confirmed by the client, ${confirmed} section${confirmed === 1 ? "" : "s"} confirmed by the case officer${byKind.length ? `; Sample values by kind of answer for ${[...new Set(byKind)].join(", ")}` : ""}`;
    if (left.length) throw new Stop(`Still not ready after ${said}: ${left.slice(0, 3).map((f) => `${f.form} for ${f.person} (${f.readiness.missing.slice(0, 2).map((m) => m.label).join(", ")})`).join("; ")}`);
    return { status: "done", shows: `Every form of release 2 reads ready for every person: ${said}.`, why: null };
  });

  type Item = { id: string; kind: string; form?: string; subject: string; channel?: string; signature?: string; state: string; reason?: string; document_type?: string };
  // C7.3, C7.1, C7.7: the Online form's answer sheet, section by section "Entered in the portal"; a copy of each PDF form.
  await stage("forms", "Forms filled and the IMM 5257 Online answer sheet entered (C7.1, C7.3, C7.7)", async () => {
    let p = await prepare();
    let ticked = 0, copies = 0;
    const online = (p.items as Item[]).filter((i) => i.kind === "form" && i.channel === "ONLINE");
    for (const i of online) {
      const sheet = await get(`/runtime/items/${i.id}/answer-sheet`);
      for (const sec of sheet.sections as { key: string; version: string; entered: unknown; out_of_date: boolean }[]) {
        if (sec.entered && !sec.out_of_date) continue;
        must(await r.call(officer, "POST", `/runtime/items/${i.id}/screens/${sec.key}/entered`, { version: sec.version }), `Tick "Entered in the portal" on ${i.form}`); ticked++;
      }
    }
    for (const i of (p.items as Item[]).filter((x) => x.kind === "form" && x.channel !== "ONLINE" && x.signature !== "HAND_SCANNED")) if (await copyOf(r, officer, caseId, i)) copies++;
    p = await prepare();
    const notDone = (p.items as Item[]).filter((i) => i.kind === "form" && i.channel === "ONLINE" && i.state !== "done");
    const toValidate = (p.items as Item[]).filter((i) => i.kind === "form" && /Validate/.test(i.reason ?? ""));
    const forms = [...new Set((p.items as Item[]).filter((i) => i.kind === "form" && i.channel !== "ONLINE").map((i) => i.form))];
    const why = [notDone.length ? `${notDone.length} of ${online.length} Online IMM 5257 items stay To do: ${HELD.sheet}.` : "", toValidate.length ? `${toValidate.length} barcode PDF${toValidate.length === 1 ? "" : "s"} not read back: ${HELD.validate}.` : "", forms.includes("IMM 5645") ? `${HELD.family}.` : ""].filter(Boolean).join(" ");
    return { status: notDone.length || toValidate.length ? "partial" : "done", shows: `${online.length} Online IMM 5257 answer sheet${online.length === 1 ? "" : "s"}, ${ticked} section${ticked === 1 ? "" : "s"} ticked "Entered in the portal" by the case officer; ${copies} PDF cop${copies === 1 ? "y" : "ies"} filled from the confirmed facts (${forms.join(", ")})`, why: why || null };
  });

  // C8.1: IMM 5476 printed, signed by hand, its scan uploaded, in that order.
  await stage("signed", "IMM 5476 printed, signed by hand and its scan uploaded (C8.1)", async () => {
    const items = ((await prepare()).items as Item[]).filter((i) => i.kind === "form" && i.signature === "HAND_SCANNED");
    for (const i of items.filter((x) => !["ready", "done"].includes(x.state))) {
      const copy = await copyOf(r, officer, caseId, i);
      must(await r.call(officer, "POST", `/runtime/items/${i.id}/sign-steps/print`, { copy }), `Print ${i.form}`);
      must(await r.call(officer, "POST", `/runtime/items/${i.id}/sign-steps/signed`, {}), `Mark ${i.form} signed`);
      must(await r.upload(officer, `/runtime/items/${i.id}/signed-scan`, specimen(`${s.signed_scan_words}: ${i.form}`), `${(i.form ?? "form").replace(/\s/g, "")}-signed-sample.pdf`), `Upload the signed scan of ${i.form}`);
    }
    const after = ((await prepare()).items as Item[]).filter((i) => i.kind === "form" && i.signature === "HAND_SCANNED");
    const ready = after.filter((i) => ["ready", "done"].includes(i.state)).length;
    return { status: ready === after.length && after.length ? "done" : "partial", shows: `${ready} of ${after.length} IMM 5476 copies printed, signed and their scans uploaded (synthetic scans, Sample)`, why: ready === after.length ? null : after.filter((i) => !["ready", "done"].includes(i.state)).map((i) => i.reason).join(" ") };
  });

  // C6.4: each person's checklist; the passport page requested and received for everyone (a synthetic specimen).
  await stage("documents", "Documents: each person's checklist, passports received (C6.4)", async () => {
    let received = 0;
    const cl = await get(`/runtime/cases/${caseId}/checklist`);
    for (const person of cl.people as { label: string; lines: { id: string; document_type: string; state: string }[] }[])
      for (const l of person.lines.filter((x) => x.document_type === s.passport.document_type && x.state !== "received")) {
        if (l.state === "not_requested") must(await r.call(officer, "POST", `/runtime/checklist-lines/${l.id}/request`, {}), `Request ${person.label}'s passport page`);
        must(await r.upload(officer, `/runtime/checklist-lines/${l.id}/documents`, specimen(`${s.passport.words}: ${person.label}`), "passport-page-sample.pdf"), `Upload ${person.label}'s passport page`);
        received++;
      }
    const after = (await get(`/runtime/cases/${caseId}/checklist`)).people as { lines: { state: string }[] }[];
    const lines = after.flatMap((x) => x.lines), got = lines.filter((l) => l.state === "received").length;
    return { status: "done", shows: `${after.length} people's checklists, ${lines.length} lines; ${got} received (${received} passport pages uploaded now, synthetic, Sample); the rest stay Not requested and are passed with a reason on each filing`, why: null };
  });

  // C7.6: the representative of record reviews each filing; the case officer passes the remaining warnings with a
  // reason and presses Ready to file.
  await stage("ready", "Every filing reaches Ready to file (C7.6, C7.7)", async () => {
    if (!rep) throw new Stop("The case has no representative of record to review its filings");
    const pin = (await get(`/runtime/cases/${caseId}`)).pin?.revision;
    for (const f of (await prepare()).filings as { id: string; label: string; status: string }[]) {
      if (f.status === "ready_to_file") continue;
      const rd = ((await prepare()).readiness as { filing: string; facts_hash?: string; blocks: { words: string }[] }[]).find((x) => x.filing === f.id);
      if (rd?.blocks.length) throw new Stop(`${f.label}: ${rd.blocks.map((b) => b.words).join(" ")}`);
      must(await r.call(rep, "POST", `/runtime/filings/${f.id}/review`, { note: s.review_note, facts_hash: rd?.facts_hash, pin_revision: pin }), `The representative reviews ${f.label}`);
      const warns = (((await prepare()).readiness as { filing: string; warns: { code: string }[] }[]).find((x) => x.filing === f.id)?.warns ?? []).map((w) => w.code);
      for (const code of [...new Set(warns)]) must(await r.call(officer, "POST", `/runtime/filings/${f.id}/warnings/${code}/pass`, { reason: s.pass_reason }), `Pass the warning ${code} on ${f.label}`);
      must(await r.call(officer, "POST", `/runtime/filings/${f.id}/ready`, {}), `Ready to file: ${f.label}`);
    }
    const filings = (await prepare()).filings as { status: string }[], ready = filings.filter((f) => f.status === "ready_to_file").length;
    return { status: ready === filings.length ? "done" : "partial", shows: `${ready} of ${filings.length} filings Ready to file: each reviewed by the representative of record, its open warnings (documents not collected) passed by the case officer with a reason`, why: null };
  });

  // C8.2 (BR-11): one "Record the submission" records the whole submission group: the family's filings go together.
  await stage("record", "The submission is recorded: portal, our reference, a Sample application number and a Sample UCI (C8.2)", async () => {
    const p = await prepare(), today: string = (await get(`/runtime/cases/${caseId}/checklist`)).today;
    const group = (p.groups as { id: string; filings: string[] }[])[0];
    const subjectOf = (id: string) => (p.filings as { id: string; applicants: { subject: string }[] }[]).find((f) => f.id === id)!.applicants[0].subject;
    const k = s.record;
    const done = must(await r.call(officer, "PATCH", `/runtime/groups/${group.id}/record`, {
      filings: group.filings.map((id, n) => ({ filing: id, our_reference: `${k.our_reference_prefix}-${n + 1}`, submitted_on: today, application_number: `${k.application_number_prefix}${n + 1}`, fee_receipt: k.fee_receipt })),
      ucis: group.filings.map((id, n) => ({ subject: subjectOf(id), uci: `${k.uci_prefix}${n + 1}` })), version: p.version }), "Record the submission");
    recorded = (done.recorded ?? []).length;
    return { status: "done", shows: `${recorded} filings recorded as submitted through ${p.portal_words ?? p.portal} on ${today}, one action for the family's submission group (BR-11): each with our reference, its own Sample application number and each person's Sample UCI; the filings are read-only now`, why: null };
  });
  return { stages, release, recorded };
}

/** A copy of one form for one person (C7.1), filled from the case's confirmed facts; waits for it, like a person would. */
async function copyOf(r: Routes, officer: string, caseId: string, i: { form?: string; subject: string }): Promise<string | null> {
  const key = `finished-story-${i.form}-${i.subject}`.replace(/[^A-Za-z0-9-]/g, "-").slice(0, 80);
  const made = await r.call(officer, "POST", `/runtime/cases/${caseId}/forms/${encodeURIComponent(i.form ?? "")}/${i.subject}/generate`, { idempotencyKey: key });
  const id: string | undefined = made.body?.id;
  if (!id) throw new Stop(`Fill ${i.form}: ${words(made)}`);
  for (const until = Date.now() + 90_000; Date.now() < until;) {
    const st = (await r.call(officer, "GET", `/runtime/form-copies/${id}`)).body?.status;
    if (st === "GENERATED") return id;
    if (st === "FAILED") throw new Stop(`Fill ${i.form}: the copy failed`);
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Stop(`Fill ${i.form}: still filling after 90 s`);
}

/** C10.2 row 16: the thin second case, opened on release 1 by the case officer (before release 2 goes out). */
export async function openThinCase(r: Routes, combinationId: string, s: StorySample = storySample()): Promise<{ caseId: string | null; release: number | null; why: string | null }> {
  const t = s.thin_case;
  const made = await r.call("user-O", "POST", "/runtime/cases", { combinationId, reference: t.reference, clientActor: t.client, principal: { displayName: t.principal }, idempotencyKey: "sample-vv-thin-1" });
  return made.status < 300 ? { caseId: made.body?.id ?? null, release: made.body?.pin?.release_version ?? null, why: null } : { caseId: null, release: null, why: words(made) };
}
