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

/** C7.7 part 2 (r5c BR-8, P-143, P-144, P-171 (1); SA-1B-31 "the barcode page is created only when a person clicks
 *  Validate"): a Paper line in the deliverables list. Its steps, in order: (a barcode form) Validate in Adobe, which adds
 *  the barcode page, and read the validated copy back · print, the barcode page on top · signed in pen by its signers ·
 *  mailed once the filing is Ready to file. A form that makes no barcode page has no Validate step and no barcode page.
 *  The state: Out of date when a fact changed after the validated copy was read back (BR-12, P-171 (1)); else To do
 *  while a fact is missing or (a barcode form) no validated copy is read back; In progress once it is read back for
 *  today's facts (the pen and the post are still to come). Never Ready here: printing, signing in pen and mailing are
 *  recorded by C8.1's Paper part, so those steps say `done: null` (not recorded yet). Readiness stays C7.6's. */
export type PaperValidated = { copy: string; at: string; current: boolean } | null;
/** Review M1 (part 2): the read-back a Paper line counts, by the copy view's and `lock`'s own rule (api/src/fill-case.ts
 *  copyOf): each copy is judged on its newest read-back only, which counts when the form's own Validate passed (QA-165);
 *  of the copies that count, the newest. A failed newer read-back of a copy is never passed over for an older one. */
export function readBackOf<R extends { copy: string; at: Date }>(reads: R[], passed: (r: R) => boolean): R | null {
  const newest = new Map<string, R>();
  for (const r of reads) { const n = newest.get(r.copy); if (!n || r.at > n.at) newest.set(r.copy, r); }
  return [...newest.values()].filter(passed).sort((a, b) => b.at.getTime() - a.at.getTime())[0] ?? null;
}
export type PaperStep = { key: "validate" | "print" | "sign_in_pen" | "mail"; words: string; done: boolean | null; neededBefore?: "filing" | "after_ready" };
export type PaperLine = { state: "to_do" | "in_progress" | "out_of_date"; reason: string; barcode_page: boolean; validated: PaperValidated; steps: PaperStep[] };
const SIGNER_WORDS: Record<string, string> = { person: "the person", parent: "a parent (for a child under 18)", principal: "the principal applicant", representative: "the representative" };
export function paperLine(form: string, opts: { barcode: boolean; missing: number; validated: PaperValidated; signers: string[]; lineOnline?: boolean }): PaperLine {
  const { barcode, missing, validated } = opts;
  const who = opts.signers.map((x) => SIGNER_WORDS[x] ?? x);
  const signedBy = who.length ? who.join(" and ") : "each person who signs it";
  const steps: PaperStep[] = [
    ...(barcode ? [{ key: "validate" as const, words: `Make the copy, press Validate in Adobe (this adds ${form}'s barcode page), save it and read the validated copy back here`, done: !!validated?.current, neededBefore: "filing" as const }] : []),
    { key: "print", words: barcode ? `Print the validated copy with its barcode page, the barcode page on top` : `Make the copy and print it (${form} makes no barcode page)`, done: null, neededBefore: "filing" },
    { key: "sign_in_pen", words: `Signed in pen by ${signedBy}`, done: null, neededBefore: "filing" },
    { key: "mail", words: "Mailed to IRCC once the filing is Ready to file", done: null, neededBefore: "after_ready" },
  ];
  // A form with no barcode page needs no read-back, so none is shown for it.
  const line = (state: PaperLine["state"], reason: string): PaperLine => ({ state, reason, barcode_page: barcode, validated: barcode ? validated : null, steps });
  if (barcode && validated && !validated.current) return line("out_of_date", `Out of date: a fact on ${form} changed after its validated copy was read back. Make a new copy, press Validate again (a new barcode page) and read it back before you print.`);
  // Review M2 (part 2): the copies follow the release line's channel (api/src/fill-case.ts channelIn): on a line released
  // as Online a copy is "not for filing" and its read-back is refused, so the case cannot hold a validated copy yet. Said,
  // never left as a To do that cannot be done (question for the tech lead in the PR).
  if (barcode && opts.lineOnline) return line("to_do", `${form} is released as an Online line, so its copy here is "Copy, not for filing" and cannot be validated and read back yet. Ask the Lead before filing it on paper.`);
  if (missing > 0) return line("to_do", `Waiting for ${missing} fact${missing === 1 ? "" : "s"} to answer or confirm.`);
  if (!barcode) return line("to_do", `Every fact it reads is confirmed. Make the copy, print it, have it signed in pen and mail it once the filing is Ready to file. ${form} makes no barcode page.`);
  if (!validated) return line("to_do", `Every fact it reads is confirmed. Make the copy, press Validate in Adobe (this adds the barcode page), save it and read the validated copy back here: IRCC returns a barcode form unprocessed without it.`);
  return line("in_progress", `Validated copy read back for today's facts (Adobe's Validate passed on it, which adds the barcode page). Print it with the barcode page on top, have it signed in pen, and mail it once the filing is Ready to file.`);
}

/** A form line as the release holds it (snapshot.forms). */
export type FormLine = { form_number: string; channel?: string; signature?: string; signed_by?: string; who?: string };
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
