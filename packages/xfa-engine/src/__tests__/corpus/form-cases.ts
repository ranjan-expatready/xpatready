import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll } from 'vitest';
import { createFormRuntime } from '../../runtime/runtime.js';
import type { BarcodePayloads, FormRuntime, FormRuntimeOptions, HostIdentity, UnsupportedRecord, ValidateResult } from '../../runtime/options.js';
import type { PackFormDescriptor } from '../../runtime/pack.js';
import { applyFixture, loadFixture, loadPack } from '../fixtures/form-data/apply.js';
import { openXfaPdf, type XfaPdf } from '../../xfa-pdf.js';

// Set by scripts/run-corpus.mjs (absolute path). Importing this file without it must fail loudly.
const dir = process.env.XFA_CORPUS_DIR;
if (dir === undefined || dir === '') throw new Error('NOT EXECUTED: XFA_CORPUS_DIR is not set; run via `pnpm test:corpus`');

/** A neutral fixture identity: it names no real product (plan decision D3; the production value is owner decision O-1). */
export const TEST_HOST: HostIdentity = { name: 'TestHost', appType: 'TestApp', version: '1.0', variation: 'Test', platform: 'TestOS', language: 'XX' };

/** The injected wall clock of every session unless a test says otherwise: 2026-06-15T12:00:00Z. */
export const NOON_UTC = Date.UTC(2026, 5, 15, 12, 0, 0);

/** One way to break the filled fixture, and what the form must then say. */
export interface InvalidCase {
  readonly label: string;
  /** The field to overwrite after the fixture (SOM from the root subform). */
  readonly som: string;
  readonly value: string | number | null;
  /** SOM of the first missing field the form reports, from the root subform (indexes written only where not `[0]`). */
  readonly first: string;
  /** Text the form's own message for this failure contains. */
  readonly needles: readonly string[];
  /** False when the form's own validator reports the problem but still lets Validate pass (a defect of that form's script, reproduced as it is). */
  readonly blocks?: boolean;
}

/** What differs between the corpus forms, as data. Nothing here is engine behaviour. */
export interface FormCase {
  readonly file: string;
  readonly form: string;
  /** Strict mode fails a run on any member the engine does not model; false only where the form's own script reads a node its template lacks. */
  readonly strict: boolean;
  /** Members the form's own scripts reach that the engine does not model, after a complete Validate. */
  readonly unsupportedAfterValidate: readonly UnsupportedRecord[];
  /** First field the blank form reports. */
  readonly firstMissingBlank: string;
  /** The consent date field the form focuses when Validate completes, or undefined when the script's path names no node. */
  readonly consentDateField: string | undefined;
  /** What the form appends to the host identity when it writes its reader information. */
  readonly readerInfoSuffix: string;
  /** Length in characters of each barcode payload for the fixture, the noon clock and the neutral host identity. */
  readonly payloadLengths: readonly number[];
  readonly invalid: readonly InvalidCase[];
}

const COMMON_INVALID: readonly InvalidCase[] = [
  { label: 'a blank year of birth', som: 'Page1.PersonalDetails.DOBYear', value: '', first: 'Page1.PersonalDetails.DOBYear', needles: ['The following field must contain a value'] },
  { label: 'a year of birth before 1900', som: 'Page1.PersonalDetails.DOBYear', value: '1800', first: 'Page1.PersonalDetails.DOBYear', needles: ['Between 1900 - current year'] },
  { label: 'a year of birth in the future', som: 'Page1.PersonalDetails.DOBYear', value: '2090', first: 'Page1.PersonalDetails.DOBYear', needles: ['Between 1900 - current year', 'Must be less than or equal to today'] },
  {
    label: 'a telephone number that starts with 0',
    som: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
    value: '055',
    first: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
    needles: ["must not start with '0' or '1'"],
  },
  {
    label: 'a passport that expires in the past',
    som: 'Page2.MaritalStatus.SectionA.Passport.ExpiryDate',
    value: '2020-03-20',
    first: 'Page2.MaritalStatus.SectionA.Passport.ExpiryDate',
    needles: ["Must be greater than today's date"],
  },
  {
    label: 'a blank passport number',
    som: 'Page2.MaritalStatus.SectionA.Passport.PassportNum.PassportNum',
    value: '',
    first: 'Page2.MaritalStatus.SectionA.Passport.PassportNum.PassportNum',
    needles: ['The following field must contain a value'],
  },
];

const EMAIL_PROBLEM = "Must contain one '@' and at least one '.'";

const CASES: readonly FormCase[] = [
  {
    file: 'imm1295e.pdf',
    form: 'imm1295',
    strict: false,
    unsupportedAfterValidate: [{ class: 'subform', member: 'C1CertificateIssueDate' }],
    firstMissingBlank: 'Page1.PersonalDetails.ServiceIn.ServiceIn',
    // Form defect: this form's Validate script focuses `Page4.Consent1.Signature.C1CertificateIssueDate`, a node its own template does not have.
    consentDateField: undefined,
    readerInfoSuffix: '.',
    payloadLengths: [168, 180, 106, 40, 219],
    invalid: [
      ...COMMON_INVALID.filter((c) => !c.label.includes('telephone')),
      // The form's own e-mail and telephone validators show their message but never record the field, so Validate still passes.
      { label: 'a malformed e-mail address', som: 'Page3.FaxEmail.Email', value: 'not-an-email', first: 'Page3.FaxEmail.Email', needles: [EMAIL_PROBLEM], blocks: false },
      {
        label: 'a telephone number that starts with 0 (the form lets it through)',
        som: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
        value: '055',
        first: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
        needles: ["must not start with '0' or '1'"],
        blocks: false,
      },
      { label: 'an offer number in the wrong shape', som: 'Page3.DetailsOfWorkCont.details.LMO.LMO', value: 'A12', first: 'Page3.DetailsOfWorkCont.details.LMO.LMO', needles: ['A9999999'] },
      {
        label: 'an end date before the start date',
        som: 'Page3.DetailsOfWorkCont.details.HowLongStudy.ToDate',
        value: '2034-12-01',
        first: 'Page3.DetailsOfWorkCont.details.HowLongStudy.ToDate',
        needles: ['To date must be greater than From Date'],
      },
      { label: 'an unanswered consent question', som: 'Page4.Consent0.Choice', value: null, first: 'Page4.Consent0.Choice.No', needles: ['The following field must contain a value'] },
    ],
  },
  {
    file: 'imm5257e.pdf',
    form: 'imm5257',
    strict: true,
    unsupportedAfterValidate: [],
    firstMissingBlank: 'Page1.PersonalDetails.ServiceIn.ServiceIn',
    consentDateField: 'Page3.Consent1.Signature.C1CertificateIssueDate',
    readerInfoSuffix: '',
    payloadLengths: [168, 180, 106, 40, 156],
    invalid: [
      ...COMMON_INVALID.filter((c) => !c.label.includes('telephone')),
      { label: 'a malformed e-mail address', som: 'Page2.ContactInformation.contact.FaxEmail.Email', value: 'not-an-email', first: 'Page2.ContactInformation.contact.FaxEmail.Email', needles: [EMAIL_PROBLEM] },
      {
        label: 'a telephone number that starts with 0',
        som: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
        value: '055',
        first: 'Page2.ContactInformation.contact.PhoneNumbers.Phone.NANumber.FirstThree',
        needles: ["must not start with '0' or '1'"],
      },
      {
        label: 'funds that are not a number',
        som: 'Page3.DetailsOfVisit.PurposeRow1.Funds.Funds',
        value: 'abc',
        first: 'Page3.DetailsOfVisit.PurposeRow1.Funds.Funds',
        needles: ['The following characters are invalid: a b c'],
      },
      {
        label: 'an end date before the start date',
        som: 'Page3.DetailsOfVisit.PurposeRow1.HowLongStay.ToDate',
        value: '2034-12-01',
        first: 'Page3.DetailsOfVisit.PurposeRow1.HowLongStay.ToDate',
        needles: ['To date must be greater than or equal to From Date'],
      },
      { label: 'an unanswered consent question', som: 'Page3.Consent1.Signature.Consent0.Choice', value: null, first: 'Page3.Consent1.Signature.Consent0.Choice.No', needles: ['The following field must contain a value'] },
    ],
  },
];

const present = new Set(readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')));

/** The cases whose blank form is in the corpus directory. */
export const FORM_CASES: readonly FormCase[] = CASES.filter((c) => present.has(c.file));
if (FORM_CASES.length === 0) throw new Error(`NOT EXECUTED: none of ${CASES.map((c) => c.file).join(', ')} is in ${dir}`);

/** `Page1.PersonalDetails.DOBYear` as the engine writes it: `xfa[0].form[0].form1[0].Page1[0].PersonalDetails[0].DOBYear[0]`. */
export function canonicalSom(short: string): string {
  const segments = short.split('.').map((s) => (/\[\d+\]$/.test(s) ? s : `${s}[0]`));
  return `xfa[0].form[0].form1[0].${segments.join('.')}`;
}

const opened = new Map<string, Promise<XfaPdf>>();

/** The blank corpus form, opened once per file. */
export function corpusPdf(file: string): Promise<XfaPdf> {
  let pdf = opened.get(file);
  if (pdf === undefined) {
    pdf = openXfaPdf(new Uint8Array(readFileSync(join(dir ?? '', file))));
    opened.set(file, pdf);
  }
  return pdf;
}

const runtimes: FormRuntime[] = [];
afterAll(() => {
  for (const rt of runtimes.splice(0)) rt.dispose();
});

export interface SessionOptions {
  readonly clock?: number;
  readonly timezone?: string;
  readonly host?: HostIdentity;
  readonly messageBoxResult?: FormRuntimeOptions['messageBoxResult'];
  /** Edit the fixture before it is applied (the table of invalid values uses this). */
  readonly afterFixture?: (runtime: FormRuntime) => void;
}

export interface Session {
  readonly runtime: FormRuntime;
  readonly pack: PackFormDescriptor;
}

/** A loaded runtime over the blank form: injected neutral identity and clock, UTC unless told otherwise. */
export async function blankSession(c: FormCase, options: SessionOptions = {}): Promise<Session> {
  const pdf = await corpusPdf(c.file);
  const now = options.clock ?? NOON_UTC;
  const runtime = await createFormRuntime(pdf, {
    host: options.host ?? TEST_HOST,
    clock: { now: () => now },
    strict: c.strict,
    ...(options.timezone === undefined ? {} : { timezone: options.timezone }),
    ...(options.messageBoxResult === undefined ? {} : { messageBoxResult: options.messageBoxResult }),
  });
  runtimes.push(runtime);
  runtime.load();
  return { runtime, pack: loadPack(c.form) };
}

export interface Outcome {
  readonly session: Session;
  readonly validated: ValidateResult;
  readonly encoded: BarcodePayloads;
}

/** Fixture applied, Validate clicked, preSave run: everything a save does, in order. */
export async function filledOutcome(c: FormCase, options: SessionOptions = {}): Promise<Outcome> {
  const session = await blankSession(c, options);
  applyFixture(session.runtime, loadFixture(c.form));
  options.afterFixture?.(session.runtime);
  const validated = session.runtime.validate(session.pack);
  const encoded = session.runtime.encodeBarcodes(session.pack);
  return { session, validated, encoded };
}

/** Everything a run exposes as data, for a byte-for-byte comparison of two runs. */
export function snapshotOf(outcome: Outcome): string {
  const { runtime } = outcome.session;
  return JSON.stringify({ validated: outcome.validated, encoded: outcome.encoded, messages: runtime.messages, focus: runtime.focus, console: runtime.console, unsupported: runtime.unsupported });
}
