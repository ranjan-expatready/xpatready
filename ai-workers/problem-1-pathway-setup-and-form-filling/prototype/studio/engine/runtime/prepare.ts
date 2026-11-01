// C6.12, C11.6 (M3-B, runtime lane; M3 case view r5c §6 "items", BR-8, BR-10; P-122, P-137, P-143): the items of a
// case's "Prepare application" view and the rule for a form's channel on the case. Pure: no database, no clock (today is
// passed in); api/src/case-prepare.ts stores the items so their ids and the officer's channel stay.
//   * Items per filing, one kind each: a form the release's line gives the person (its "who" and minimum age, render.ts),
//     a document the person's checklist needs (C6.4), and an IRCC step (biometrics, for each person who gives them,
//     after filing: VV-R15, VV-R17).
//   * A form item starts on its combination line's channel; the case officer may pick another only inside what the Form
//     library records IRCC accepts for that form on the combination's IRCC account (engine/channels.ts allowedChannels),
//     and Paper only with a written accommodation reason when the combination files through an IRCC account (VV-R02:
//     "You must apply online", FQ-3). The portal is the combination's and never changes on a case.
//   * Readiness of a filing is C7.6's (engine/runtime/readiness.ts, M3-A3): this file never decides it.
// tests/check_vv_prepare.ts.
import { createHash } from "node:crypto";
import { CHANNEL_WORDS, CHANNELS, SIGNATURE_FITS, signatureFits, type Channel, type Signature } from "../../contracts/forms.ts";
import { allowedChannels, lineOf, notAcceptedWords, notNeededWords, type AcceptRecord } from "../channels.ts";
import { ageCheck, type FeeRule } from "./filings.ts";

export type ItemKind = "form" | "document" | "step";
/** What an item is, before it is stored: `key` is the form number, the document type key or the step key. */
export type WantedItem = { subject: string; kind: ItemKind; key: string; label: string; applies: true | "cannot_tell"; missing?: string[]; document_type?: string; neededBefore?: "after_filing" };
type FormRow = { form: string; person: string; form_kind?: string; applies: boolean | "cannot_tell"; missing?: string[] };
type DocLine = { document: { key: string; name: string }; document_type: string; label: string };

/** BIOMETRICS: the IRCC step a person who gives biometrics has, after filing (VV-R17: "Wait for your biometrics
 *  instruction letter"). */
export const BIOMETRICS_STEP = { key: "biometrics", label: "Give biometrics", after: "IRCC's biometrics instruction letter comes after you apply (VV-R17): book and give them then." } as const;

/** The items each filer should have now, from the release's forms per person (render), each person's needed documents
 *  (the checklist's `lines`) and the biometrics rule with each person's age. A form that does not apply is left out; one
 *  that cannot be told yet (its condition or the age waits for an answer) is kept, so it says what it waits for. */
export function wantedItems(filers: string[], forms: FormRow[], docs: Map<string, DocLine[]>, biometrics: FeeRule | undefined, ages: Map<string, number | null>): WantedItem[] {
  const out: WantedItem[] = [];
  for (const subject of filers) {
    for (const f of forms.filter((x) => x.person === subject && (x.form_kind ?? "data_form") === "data_form" && x.applies !== false))
      out.push({ subject, kind: "form", key: f.form, label: f.form, applies: f.applies === true ? true : "cannot_tell", ...(f.applies === "cannot_tell" ? { missing: f.missing ?? [] } : {}) });
    for (const d of docs.get(subject) ?? []) if (!out.some((x) => x.subject === subject && x.kind === "document" && x.key === d.document.key))
      out.push({ subject, kind: "document", key: d.document.key, label: d.label, document_type: d.document_type, applies: true });
    const bio = biometrics ? ageCheck(biometrics, ages.get(subject)) : { pays: false as const, why: "" };
    if ("pays" in bio && bio.pays) out.push({ subject, kind: "step", key: BIOMETRICS_STEP.key, label: BIOMETRICS_STEP.label, applies: true, neededBefore: "after_filing" });
    // Review m2: with no date of birth yet the step is kept, waiting for it, so the person is never silently left out.
    else if ("waits" in bio) out.push({ subject, kind: "step", key: BIOMETRICS_STEP.key, label: BIOMETRICS_STEP.label, applies: "cannot_tell", missing: ["person.date_of_birth"], neededBefore: "after_filing" });
  }
  return out;
}

/** A form line as the release holds it (snapshot.forms). */
export type FormLine = { form_number: string; channel?: string; signature?: string; signed_by?: string };
/** A form item's channel today (the officer's choice, else the line's), the channels IRCC accepts for it on the account,
 *  and the signature that follows edition × channel: the line's when it fits the channel, else the channel's first. */
export function channelOf(line: FormLine | undefined, records: AcceptRecord[] | undefined, account: string | null | undefined, chosen: string | null | undefined): { channel: Channel; line_channel: Channel; accepts: Channel[]; accepts_basis: AcceptRecord | null; signature: Signature } {
  const l = lineOf(line ?? {});
  const channel = (chosen as Channel | null | undefined) ?? l.channel;
  const { channels, record } = allowedChannels(records, account);
  return { channel, line_channel: l.channel, accepts: channels, accepts_basis: record, signature: signatureFits(channel, l.signature) ? l.signature : SIGNATURE_FITS[channel][0] };
}

export const CHANNEL_CHOICES = `Choose ${CHANNELS.map((c) => CHANNEL_WORDS[c]).join(", ").replace(/, ([^,]+)$/, " or $1")}.`;
/** C11.6: whether a form item may move to `want`: 400 for an unknown channel or Paper without a reason where an IRCC
 *  account files online, 422 outside what IRCC accepts (IRCC's own line quoted when the record has one). */
export function channelChange(form: string, want: unknown, reason: string | null | undefined, records: AcceptRecord[] | undefined, account: string | null | undefined): { ok: true; channel: Channel } | { ok: false; status: 400 | 422; field: string; detail: string } {
  if (typeof want !== "string") return { ok: false, status: 400, field: "channel", detail: `Send one way to file, as text. ${CHANNEL_CHOICES}` };
  if (!(CHANNELS as readonly string[]).includes(want)) return { ok: false, status: 400, field: "channel", detail: `"${want.slice(0, 20)}" is not a way to file. ${CHANNEL_CHOICES}` };
  const channel = want as Channel;
  const { channels, record } = allowedChannels(records, account);
  if (channel === "NOT_NEEDED" && !channels.includes("NOT_NEEDED")) return { ok: false, status: 422, field: "channel", detail: notNeededWords(form, account) };
  if (!channels.includes(channel)) {
    const quote = record?.quote ? ` IRCC's line: "${record.quote}"${record.source_url ? ` (${record.source_url})` : ""}.` : "";
    return { ok: false, status: 422, field: "channel", detail: `${notAcceptedWords(form, channel, record ?? { account: account ?? "ANY", channels, basis: "", quote: null })}${quote}` };
  }
  // VV-R02 ("You must apply online"; paper only if you cannot), FQ-3: Paper through an IRCC account is an accommodation.
  if (channel === "PAPER" && account && account !== "PAPER" && !(reason ?? "").trim()) return { ok: false, status: 400, field: "reason", detail: `Paper is for a person who cannot apply online (an accommodation, IRCC: "You must apply online"). Give the reason for ${form} on paper.` };
  return { ok: true, channel };
}

/** The view's version: changes whenever a group, a filing's group or an item's channel changes, so a write made from an
 *  older read is refused (409, Reload). */
export function prepareVersion(groups: { id: string; filings: string[] }[], items: { id: string; channel?: string | null; version: number }[]): string {
  return createHash("sha256").update(JSON.stringify([groups.map((g) => [g.id, [...g.filings].sort()] as const).sort((a, b) => a[0].localeCompare(b[0])), items.map((i) => [i.id, i.channel ?? null, i.version]).sort()])).digest("hex").slice(0, 16);
}
