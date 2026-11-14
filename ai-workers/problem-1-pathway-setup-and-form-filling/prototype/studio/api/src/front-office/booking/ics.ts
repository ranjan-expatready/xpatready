// FO-3 (contracts §0.3 CalendarInvitePort, §7 §2.2; AG-4-32, AG-4-57, BR-9; RFC 5545 and RFC 5546 iTIP): the calendar
// invite a booking's emails carry. Our own small writer (PF-2's gate: no library for ~80 lines): one VEVENT per booking,
// UID stable for the booking's whole life, SEQUENCE = the booking's `sequence` (the database raises it on every change),
// METHOD:REQUEST for a booking or a change and METHOD:CANCEL (STATUS:CANCELLED) for a cancellation, so a calendar
// replaces or removes the one event it already has. Times in UTC (the `Z` form), lines folded at 75 octets, text escaped.
// It carries no answers the person typed (AG-4-32 rule 4): the type's name, the firm, the way to meet and the link only.
export type InviteMethod = "REQUEST" | "CANCEL";
export type Invite = {
  bookingId: string;
  sequence: number;
  method: InviteMethod;
  startsAt: Date;
  endsAt: Date;
  /** When this version was written (DTSTAMP). */
  stamp: Date;
  summary: string;
  description: string;
  location?: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
};

/** The booking's UID: the same in every version of its invite. */
export const inviteUid = (bookingId: string) => `${bookingId.toLowerCase()}@booking.expatready.com`;

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
/** RFC 5545 §3.3.11 TEXT: backslash, semicolon, comma and newline escaped; other control characters dropped. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
/** A parameter value (CN): quoted, with no double quote, control character or line break inside. */
const param = (s: string) => `"${s.replace(/["\u0000-\u001f\u007f]/g, "")}"`;
const mailto = (email: string) => `mailto:${email.replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, "")}`;

/** RFC 5545 §3.1: a content line longer than 75 octets continues on the next line after CRLF and one space; a UTF-8
 *  character is never split. */
export function fold(line: string): string {
  const out: string[] = [];
  let cur = "", size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    if (size + n > (out.length ? 74 : 75)) { out.push(cur); cur = ""; size = 0; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function bookingIcs(i: Invite): string {
  if (!Number.isInteger(i.sequence) || i.sequence < 0) throw new RangeError("bookingIcs: SEQUENCE is a whole number from 0");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Expat Ready//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${i.method}`,
    "BEGIN:VEVENT",
    `UID:${inviteUid(i.bookingId)}`,
    `SEQUENCE:${i.sequence}`,
    `DTSTAMP:${utc(i.stamp)}`,
    `DTSTART:${utc(i.startsAt)}`,
    `DTEND:${utc(i.endsAt)}`,
    `SUMMARY:${text(i.summary)}`,
    `DESCRIPTION:${text(i.description)}`,
    ...(i.location ? [`LOCATION:${text(i.location)}`] : []),
    `ORGANIZER;CN=${param(i.organizer.name)}:${mailto(i.organizer.email)}`,
    `ATTENDEE;CN=${param(i.attendee.name)};ROLE=REQ-PARTICIPANT;RSVP=FALSE:${mailto(i.attendee.email)}`,
    `STATUS:${i.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
