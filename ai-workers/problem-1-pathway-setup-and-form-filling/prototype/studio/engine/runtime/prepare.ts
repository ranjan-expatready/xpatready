// C6.12 /prepare (M3-B2, runtime lane; r5c BR-1, BR-8, BR-16, BR-18, contract §6): the pure parts of a case's prepare
// view. formItems: which form each person files (the release's form lines × the case's answers, as Preview and the
// Forms tab work them out), with the combination line's channel and signature as the item's default. prepareView: the
// stored filings, groups and items with the derived fee lines, in the M3-CONTRACT shape. No database, no clock; the API
// (api/src/case-prepare.ts) stores the rows so each keeps its id. Tests: tests/check_vv_prepare.ts.
import type { Channel, Signature } from "../../contracts/forms.ts";
import type { CaseFilings } from "../../contracts/runtime.ts";
import { allowedChannels, lineOf, type AcceptRecord } from "../channels.ts";
import { render, type Known, type Person } from "../render.ts";
import type { Snapshot } from "../snapshot.ts";
import type { Participant } from "./case.ts";

export type FormNeed = { form: string; subject: string; applies: true | "cannot_tell"; why: string; channel: Channel; signature: Signature };

/** The forms each applying person files: a form line that applies to them (or cannot tell yet: it stays on the list,
 *  waiting for the answer). A case-level form ("case") is the principal's. Not-applying people file nothing (C6.12). */
export function formItems(s: Snapshot, people: Participant[], known: Known, today: Date): FormNeed[] {
  const persons: Person[] = people.filter((p) => p.role !== "case").map((p) => ({ id: p.subjectId, role: p.role as Person["role"], label: p.label, applies: p.applies }));
  const principal = persons.find((p) => p.role === "principal")?.id;
  const applying = new Set(persons.filter((p) => p.applies).map((p) => p.id));
  const lines = new Map((s.forms as { form_number: string; channel?: string; signature?: string }[]).map((f) => [f.form_number, lineOf(f)]));
  const out = new Map<string, FormNeed>();
  for (const f of render(s, persons, known, { today }).forms as { form: string; person: string; applies: boolean | "cannot_tell"; why: string; form_kind: string }[]) {
    const subject = f.person === "case" ? principal : f.person;
    if (!subject || !applying.has(subject) || f.applies === false || f.form_kind === "document") continue;
    const line = lines.get(f.form) ?? lineOf({});
    const k = `${f.form}|${subject}`;
    if (!out.has(k) || f.applies === true) out.set(k, { form: f.form, subject, applies: f.applies, why: f.why, channel: line.channel, signature: line.signature });
  }
  return [...out.values()].sort((a, b) => a.subject.localeCompare(b.subject) || a.form.localeCompare(b.form));
}

export type StoredFiling = { id: string; subjectId: string; submissionGroupId: string; combinationKey: string; mode: string; status: string; applicationNumber: string | null; active: boolean;
  applicants: { subjectId: string; role: string; mode: string }[] };
export type StoredGroup = { id: string; kind: string };
export type StoredItem = { id: string; filingId: string; kind: string; formKey: string; subjectId: string; channel: Channel; channelReason: string | null; active: boolean; version: number };

export type PrepareItem = { id: string; kind: "form"; form: string; filing: string; subject: string; channel: Channel; channel_reason: string | null; accepts: Channel[]; accepts_basis: AcceptRecord | null;
  signature: Signature; state: "to_do" | "waiting"; reason: string; version: number };
export type PrepareFee = { filing: string; subject: string; payer: string; line: string; label: string; amount: number; amount_cents: number; exempt: boolean; reason: string; source: string };
export type Prepare = {
  derived: true; combination: string; portal: string | null; portal_read_only: true; version: string;
  stage1: never[]; readiness: never[];
  filings: { id: string; combination: string; label: string; applicants: { subject: string; role: string; mode: string }[]; group: string; status: string; number: string | null }[];
  groups: { id: string; kind: string; filings: string[]; splittable: boolean; label: string; why: string; total_cents: number }[];
  items: PrepareItem[]; fees: PrepareFee[]; not_filing: { subject: string; label: string; role: string; why: string }[]; basis: string; not_built: string[];
};

/** The prepare view from the stored rows and the derived fees (deriveFilings keys its lines by person: `filing-<subject>`). */
export function prepareView(o: { derived: Extract<CaseFilings, { derived: true }>; portal: string | null; filings: StoredFiling[]; groups: StoredGroup[]; items: StoredItem[]; needs: FormNeed[];
  accepts: (form: string) => AcceptRecord[] | undefined; labels: Map<string, string> }): Prepare {
  const active = o.filings.filter((f) => f.active), bySubject = new Map(active.map((f) => [f.subjectId, f]));
  const idOf = (derivedId: string) => bySubject.get(derivedId.replace(/^filing-/, ""))?.id ?? derivedId;
  const need = new Map(o.needs.map((n) => [`${n.form}|${n.subject}`, n]));
  const label = (s: string) => o.labels.get(s) ?? s;
  const items: PrepareItem[] = o.items.filter((i) => i.active && active.some((f) => f.id === i.filingId)).map((i) => {
    const n = need.get(`${i.formKey}|${i.subjectId}`);
    const allowed = allowedChannels(o.accepts(i.formKey), o.portal);
    // The signature follows the item's channel (edition × channel, P-143): the line's when the channel is the line's.
    const sig = n && n.channel === i.channel ? n.signature : lineOf({ channel: i.channel }).signature;
    return { id: i.id, kind: "form" as const, form: i.formKey, filing: i.filingId, subject: i.subjectId, channel: i.channel, channel_reason: i.channelReason, accepts: allowed.channels, accepts_basis: allowed.record,
      signature: sig, state: (n?.applies === true ? "to_do" : "waiting") as PrepareItem["state"], reason: n ? (n.applies === true ? `${i.formKey} for ${label(i.subjectId)}: ${n.why}.` : `${i.formKey} for ${label(i.subjectId)} waits for an answer: ${n.why}.`) : `${i.formKey}.`, version: i.version };
  }).sort((a, b) => a.filing.localeCompare(b.filing) || a.form.localeCompare(b.form));
  const fees: PrepareFee[] = o.derived.fees.map((f) => {
    const src = o.derived.groups[0]?.totals.find((t) => t.line === f.line)?.source;
    return { filing: idOf(f.filing), subject: f.filing.replace(/^filing-/, ""), payer: f.payer, line: f.label, label: f.label, amount: f.amount_cents / 100, amount_cents: f.amount_cents, exempt: f.exempt, reason: f.why,
      source: src ? `${src.page}, ${src.url} (read ${src.read}): "${src.quote}". ${src.checked}` : "Sample" };
  });
  const filings = active.map((f) => ({ id: f.id, combination: f.combinationKey, label: o.derived.filings.find((d) => d.applicants[0].subject === f.subjectId)?.label ?? f.id,
    applicants: f.applicants.map((a) => ({ subject: a.subjectId, role: a.role, mode: f.mode })), group: f.submissionGroupId, status: f.status, number: f.applicationNumber }));
  const groups = o.groups.map((g) => {
    const ids = filings.filter((f) => f.group === g.id).map((f) => f.id), d = o.derived.groups[0];
    return { id: g.id, kind: g.kind, filings: ids, splittable: ids.length > 1, label: d?.label ?? "", why: d?.why ?? "", total_cents: d?.total_cents ?? 0 };
  }).filter((g) => g.filings.length);
  const body = { filings, groups, items: items.map((i) => [i.id, i.channel, i.version, i.state]), fees: fees.map((f) => [f.filing, f.line, f.amount_cents, f.exempt]) };
  return { derived: true, combination: o.derived.combination, portal: o.portal, portal_read_only: true, version: hash(JSON.stringify(body)), stage1: [], readiness: [],
    filings, groups, items, fees, not_filing: o.derived.not_filing, basis: o.derived.basis,
    not_built: ["splitting a group (BR-16)", "biometrics age exemptions (VV-R15)", "document and step items (C6.4 storage, C7.7)", "stage 1 and readiness (C7.6)", "filing modes from configuration (M3-0)"] };
}

/** A short, stable fingerprint (FNV-1a, 64 bits as hex): the view's version for "changed since you looked" (409). */
function hash(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return h.toString(16).padStart(16, "0");
}
