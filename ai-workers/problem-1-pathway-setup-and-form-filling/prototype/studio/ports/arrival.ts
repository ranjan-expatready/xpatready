// FO-3 (rows rev 16, P-599; contracts §2.2 and §7 §2.2; AG-4-19, AG-4-22, AG-02 AG-2-10, AG-2-26): the arrival port.
// A booking by a person runs front office's arrival path (FO-2 implements it in api/src/front-office/sales/; this file is
// its only creator). The path is keyed `booking:<booking id>`, so a repeat makes one person and one lead; a booker with an
// open prospect makes no new lead; the person's only open prospect moves forward to Consult with the cause "consult
// booked", never backward, and several open prospects move none. The consent the booker ticked (the firm's own sentence,
// AG-4-19 rules 2-3, 6) travels with it and the path records it in the consent store (PF-19a's ConsentPort).
// It runs inside the booking's own transaction (`tx`), so a failed arrival rolls the booking back.
// This folder imports only zod and its own files (case-side contract v0.1 §1 rule 3).
import { z } from "zod";
import { FirmId } from "./audit.ts";

const Uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "a uuid");
const Name = z.string().trim().min(1).max(100).refine((s) => !/[\u0000-\u001f\u007f]/.test(s), "no control characters");

/** The person as the booker typed them (AG-4-14 rule 1: first name, last name and email always; phone in phone mode,
 *  AG-4-11 rule 1, in +<country><number> form). */
export const ArrivalPerson = z.strictObject({
  givenNames: Name,
  familyName: Name,
  email: z.email().max(254).transform((e) => e.trim().toLowerCase()),
  phone: z.string().regex(/^\+[1-9][0-9]{6,14}$/, "a phone number in +<country><number> form").optional(),
});
export type ArrivalPerson = z.input<typeof ArrivalPerson>;

/** The consent tick (AG-4-19): the wording version the booker saw (the firm's own sentence) and when they ticked it. */
export const ArrivalConsent = z.strictObject({
  wordingId: Uuid,
  givenAt: z.coerce.date().refine((d) => Number.isFinite(d.getTime()), "a time"),
});
export type ArrivalConsent = z.input<typeof ArrivalConsent>;

export const BookingArrival = z.strictObject({
  firmId: FirmId,
  person: ArrivalPerson,
  consent: ArrivalConsent,
  /** The booking that brought the person; the arrival key is `booking:<bookingId>`. */
  bookingId: Uuid,
});
export type BookingArrival = z.input<typeof BookingArrival>;

/** What the booking keeps: the person, and the open prospect the booking belongs to (absent for a new lead or when the
 *  person has several open prospects). */
export const ArrivalResult = z.strictObject({ personId: Uuid, prospectId: Uuid.optional() });
export type ArrivalResult = z.infer<typeof ArrivalResult>;

/** The firm's consent sentence shown beside the booking form's tick (AG-4-19 rule 2): the wording version's id and text. */
export const ConsentWording = z.strictObject({ wordingId: Uuid, text: z.string().min(1).max(2000) });
export type ConsentWording = z.infer<typeof ConsentWording>;

export const arrivalKey = (bookingId: string) => `booking:${bookingId.toLowerCase()}`;

export interface ArrivalPort<Tx = unknown> {
  /** Runs the arrival path for a booking inside `tx` (door BOOKING, key `booking:<bookingId>`). Idempotent by key. */
  bookingArrived(tx: Tx, arrival: BookingArrival): Promise<ArrivalResult>;
  /** The consent sentence the firm's booking form shows now, or null when the firm has none (the public form then takes
   *  no booking: a booking always carries the person's consent). */
  bookingConsentWording(tx: Tx, firmId: string): Promise<ConsentWording | null>;
}

// ------------------------------------------------------------------------------------------------------------- the fake
/** One arrival as the fake saw it. */
export type FakeArrivalCall = z.output<typeof BookingArrival> & { key: string; result: ArrivalResult; newLead: boolean };
export type FakeProspect = { id: string; personId: string; firmId: string; stage: string; open: boolean; causes: string[] };
export type FakeArrival = ArrivalPort<unknown> & {
  readonly calls: ReadonlyArray<FakeArrivalCall>;
  /** People by firm and email (lower case). */
  readonly people: ReadonlyMap<string, string>;
  readonly prospects: ReadonlyArray<FakeProspect>;
  /** Leads made, one per new arrival (person id). */
  readonly leads: ReadonlyArray<{ firmId: string; personId: string; key: string }>;
  /** Gives a person (by email) an open prospect at `stage` (a test's starting point). */
  addProspect(firmId: string, email: string, stage: string, open?: boolean): FakeProspect;
  /** Drops what was recorded under `tx` (a rolled-back transaction). */
  discard(tx: unknown): void;
};

/** The pipeline's stage order (FO-1a's seeded Individual stages; a move to CONSULT is forward from the earlier ones). */
export const STAGE_ORDER = ["NEW", "ENGAGED", "CONSULT", "RETAINER", "WON"] as const;

/** The fake (AG-2-10, AG-2-26, as FO-2 will implement it): a new email makes a person and a lead; a person with exactly
 *  one open prospect makes no lead and the prospect moves to CONSULT with the cause "consult booked" when it is before
 *  CONSULT; several open prospects move none. Repeats of one key return the first result. `failOn` throws (the booking's
 *  transaction then rolls back); `wording` is the firm's consent sentence (null = none). */
export function fakeArrival(opts: { wording?: ConsentWording | null; failOn?: (a: z.output<typeof BookingArrival>) => boolean } = {}): FakeArrival {
  const calls: (FakeArrivalCall & { tx: unknown })[] = [];
  const people = new Map<string, string>(), prospects: (FakeProspect & { tx?: unknown })[] = [], leads: { firmId: string; personId: string; key: string; tx: unknown }[] = [];
  const wording = opts.wording === undefined ? { wordingId: "00000000-0000-4000-8000-00000000c0de", text: "I agree that the firm may use these details to arrange and hold my consultation (Sample wording)." } : opts.wording;
  const pkey = (firmId: string, email: string) => `${firmId.toLowerCase()}|${email.toLowerCase()}`;
  const fake: FakeArrival = {
    async bookingArrived(tx, arrival) {
      const a = BookingArrival.parse(arrival);
      const key = arrivalKey(a.bookingId);
      const seen = calls.find((c) => c.key === key && c.firmId.toLowerCase() === a.firmId.toLowerCase());
      if (seen) return seen.result;
      if (opts.failOn?.(a)) throw new Error(`forced arrival failure: ${key}`);
      const k = pkey(a.firmId, a.person.email);
      let personId = people.get(k), newLead = false;
      if (!personId) { personId = crypto.randomUUID(); people.set(k, personId); }
      const open = prospects.filter((p) => p.personId === personId && p.open);
      let prospectId: string | undefined;
      if (open.length === 1) {
        prospectId = open[0].id;
        if (STAGE_ORDER.indexOf(open[0].stage as (typeof STAGE_ORDER)[number]) < STAGE_ORDER.indexOf("CONSULT")) { open[0].stage = "CONSULT"; open[0].causes.push("consult booked"); }
      } else if (open.length === 0) { newLead = true; leads.push({ firmId: a.firmId.toLowerCase(), personId, key, tx }); }
      const result = ArrivalResult.parse({ personId, prospectId });
      calls.push({ ...a, key, result, newLead, tx });
      return result;
    },
    async bookingConsentWording() { return wording; },
    get calls() { return calls.map(({ tx: _tx, ...c }) => c); },
    get people() { return new Map(people); },
    get prospects() { return prospects.map(({ tx: _tx, ...p }) => ({ ...p, causes: [...p.causes] })); },
    get leads() { return leads.map(({ tx: _tx, ...l }) => l); },
    addProspect(firmId, email, stage, open = true) {
      const k = pkey(firmId, email);
      let personId = people.get(k);
      if (!personId) { personId = crypto.randomUUID(); people.set(k, personId); }
      const p = { id: crypto.randomUUID(), personId, firmId: firmId.toLowerCase(), stage, open, causes: [] as string[] };
      prospects.push(p);
      return { ...p };
    },
    discard(tx) {
      for (let i = calls.length - 1; i >= 0; i--) if (calls[i].tx === tx) calls.splice(i, 1);
      for (let i = leads.length - 1; i >= 0; i--) if (leads[i].tx === tx) leads.splice(i, 1);
    },
  };
  return fake;
}
