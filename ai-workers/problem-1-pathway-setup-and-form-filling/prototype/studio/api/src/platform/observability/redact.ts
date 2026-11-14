// PF-23 (SA-11 BR-16, SA-11-37, SA11-D13; NFR5-14 "PII redaction at the logger"): the redaction step every log line
// passes through. Personal data of clients and staff is never written to a system log: entries carry record ids and
// rule names only. Two passes:
//  * by name: a field whose name says it holds personal data or a secret (email, phone, names, document numbers,
//    tokens, Authorization, cookies, message bodies, subjects, attachment names, …) is replaced by "[redacted]";
//  * by pattern, in any text left: email addresses, bearer and basic credentials, JWTs, phone-like and document-like
//    numbers, query-string values and key=value secrets are replaced by a marker naming what was there.
// An error keeps its class, its code and its stack frames, never its message: a message can quote any value (a name in
// "No client Jane Doe", a duplicate email from the database), and a name cannot be found by pattern.
// Never throws: a value that cannot be read becomes a marker.

/** Field names (compared lower case, letters only, last dotted part) whose values never reach a log. */
export const PERSONAL_FIELDS = new Set([
  "email", "emails", "emailaddress", "phone", "phones", "phonenumber", "mobile", "telephone", "telephonenumber", "tel", "fax", "faxnumber",
  "name", "names", "firstname", "lastname", "givenname", "givennames", "familyname", "surname", "fullname", "displayname", "middlename", "clientname", "staffname", "contactname",
  "documentnumber", "passportnumber", "passport", "uci", "sin", "ssn", "dob", "dateofbirth", "birthdate",
  "address", "street", "streetname", "postalcode", "zip",
  "token", "accesstoken", "refreshtoken", "idtoken", "apikey", "password", "passphrase", "secret", "clientsecret", "authorization", "cookie", "cookies", "setcookie", "xactor",
  "body", "text", "html", "subject", "attachments", "attachment", "attachmentname", "attachmentnames", "filename", "originalname",
  "to", "cc", "bcc", "from", "replyto", "recipient", "recipients", "sender",
]);

const keyOf = (k: string) => (k.split(".").pop() ?? k).toLowerCase().replace(/[^a-z]/g, "");
// Compound names (review m3): a key ending in one of these, or starting "nameof", holds the same data
// (client_full_name, applicantName, family_names, visit_contact_name, recipientEmail, holderPassport, applicantUci).
const PERSONAL_SUFFIXES = ["name", "names", "email", "emails", "emailaddress", "phone", "phonenumber", "mobile", "birth", "dateofbirth", "birthdate", "passport", "passportnumber", "uci", "address", "surname", "documentnumber"];
/** Names that end like a personal field but hold a code's own word: a rule, a template, a queue, a form, an event, an
 *  error class, a route, a model, a field or section of the configuration, a host or a program. */
const NOT_PERSONAL = new Set(["rule", "rulename", "template", "templatename", "queue", "queuename", "form", "formname", "event", "eventname", "error", "errorname", "route", "routename", "model", "modelname", "context", "kind", "type", "typename", "field", "fieldname", "sectionname", "documenttypename", "hostname", "servicename", "metricname", "dimensionname", "appname", "programname", "combinationname", "stepname", "jobname"]);
export const isPersonalField = (k: string) => {
  const key = keyOf(k);
  if (PERSONAL_FIELDS.has(key)) return true;
  if (NOT_PERSONAL.has(key)) return false;
  return key.startsWith("nameof") || PERSONAL_SUFFIXES.some((sfx) => key.endsWith(sfx));
};

const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;
const CREDENTIAL = /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{4,}/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
// A cookie header holds several pairs (review m4): everything after "cookie:" to the end of the line or quote.
const COOKIE = /\b(set-cookie|cookie)(["']?\s*[:=]\s*)[^\n"]+/gi;
const ASSIGNED_SECRET = /\b(password|passwd|secret|token|api[_-]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;&]+/gi;
const QUERY_VALUE = /([?&][A-Za-z0-9_.[\]-]{1,60}=)[^&\s"'#]+/g;
// A run of 9 to 15 digits, with spaces, dots, dashes or brackets between them (a phone number, a document number), not
// part of a longer token (a uuid's last group, a hex id) and not an ISO date or time.
const NUMBER_RUN = /(?<![\w.:/-])\+?\(?\d[\d ().-]{6,}\d(?![\w:/-])/g;
const DOCUMENT_ID = /\b[A-Z]{1,2}\d{6,9}\b/g;
// An 8-digit UCI written 1234-5678 (review m5; 10-digit ones are number runs), never a year range such as 2026-2027.
const UCI8 = /(?<![\w.:/-])\d{4}-\d{4}(?![\w:/-])/g;
const isEpochMs = (m: string) => /^1\d{12}$/.test(m); // 13 plain digits from 1 (2001-2286): a time in ms, kept (review m6)

/** Free text with every personal pattern replaced by a marker. */
export function redactText(s: string): string {
  return s
    .replace(JWT, "[token]")
    .replace(CREDENTIAL, (_m, kind: string) => `${kind} [token]`)
    .replace(COOKIE, (_m, k: string, sep: string) => `${k}${sep}[redacted]`)
    .replace(ASSIGNED_SECRET, (_m, k: string, sep: string) => `${k}${sep}[redacted]`)
    .replace(EMAIL, (m, domain: string) => (/^[\d.]+$/.test(domain) ? m : "[email]")) // a package@1.2.3 in a frame is not an address
    .replace(QUERY_VALUE, (_m, k: string) => `${k}[redacted]`)
    .replace(NUMBER_RUN, (m) => { const digits = m.replace(/\D/g, "").length; return digits >= 9 && digits <= 15 && !/^\d{4}-\d{2}-\d{2}/.test(m) && !isEpochMs(m) ? "[number]" : m; })
    .replace(UCI8, (m) => (/^(19|20)\d{2}-(19|20)\d{2}$/.test(m) ? m : "[number]"))
    .replace(DOCUMENT_ID, "[number]");
}

/** Stack frames only ("at …" lines): the first line of a stack repeats the message, so it is left out. */
export function framesOf(stack: unknown, max = 8): string[] {
  if (typeof stack !== "string") return [];
  return stack.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("at ")).slice(0, max).map(redactText);
}

/** An error as a log carries it: class, code, HTTP status and frames; never the message. */
export function safeError(e: unknown): Record<string, unknown> {
  try { return errorShape(e); } catch { return { errorName: "Error", message: "[not logged: unreadable error]" }; }
}
function errorShape(e: unknown): Record<string, unknown> {
  if (!(e instanceof Error)) return { errorName: typeof e, message: "[not logged: not an Error]" };
  const x = e as Error & { code?: unknown; status?: unknown };
  const out: Record<string, unknown> = { errorName: /^[A-Za-z0-9_$]{1,60}$/.test(x.name) ? x.name : "Error" };
  if (typeof x.code === "string" && /^[A-Za-z0-9_.-]{1,40}$/.test(x.code)) out.code = x.code;
  if (typeof x.status === "number") out.status = x.status;
  out.frames = framesOf(x.stack);
  return out;
}

/** A value made safe to log: personal fields replaced by name, text redacted by pattern, errors reduced to their shape.
 *  Cycles, deep nesting and values JSON cannot hold (bigint, functions, symbols) become markers. */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value == null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "string") return logText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return `[${typeof value}]`;
  if (seen.has(value)) return "[cycle]";
  if (depth >= 6) return "[deep]";
  seen.add(value);
  try {
    if (value instanceof Error) return safeError(value);
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "[invalid date]" : value.toISOString();
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1, seen));
    if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return "[bytes]";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).slice(0, 100)) {
      const key = redactText(k);
      out[key] = isPersonalField(k) && v != null && v !== "" ? "[redacted]" : redact(v, depth + 1, seen);
    }
    return out;
  } catch { return "[not logged: unreadable value]"; } // a throwing getter, a revoked proxy (review m1)
  finally { seen.delete(value); } // ancestors only: a value shared by two fields is not a cycle (review m6)
}

const STACK = /^[^\n]*\n\s+at .+/;
/** Text as a log keeps it: a stack trace written as text (console.error(err.stack), Nest's error(message, stack)) is
 *  reduced to its frames, since its first line is the error's message; any other text is redacted by pattern. */
export function logText(s: string): string {
  return STACK.test(s) ? `[stack] ${framesOf(s).join(" | ")}` : redactText(s);
}
