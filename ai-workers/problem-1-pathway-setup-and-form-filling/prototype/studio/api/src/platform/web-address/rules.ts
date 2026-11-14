// PF-25 (rows rev 15, rev 16; SA-2-27, SA2-D8, AG-4-16, AG-4-17, AG01-1): what a firm's web address may be. Pure: no
// database, no clock, so the sign-up field (PF-5s), the staff change and the host resolver all read one rule.
// A web address is one DNS label: lower-case letters, digits and hyphens, 3-63 characters, no hyphen at either end, not
// an internationalised (`xn--`) label, and not one of the names ExpatReady keeps for its own hosts. The reserved list is
// Sample (the row's list) until the founder sets it; the 90 days are SA2-D8's.

export const ADDRESS_MIN = 3;
export const ADDRESS_MAX = 63;
/** The names ExpatReady keeps for its own hosts (rows rev 15, PF-25; Sample). A request to one of them is ExpatReady's own
 *  site, never a firm's. */
export const RESERVED_ADDRESSES: readonly string[] = ["www", "api", "app", "admin", "mail", "status", "help", "book", "portal"];
/** How long an old address keeps redirecting to the firm's new one and stays held from every other firm (SA2-D8). */
export const REDIRECT_DAYS = 90;
/** The host names firm addresses live under: `<address>.expatready.com`, and `<address>.localhost` on a person's own
 *  machine (browsers send *.localhost to this machine). No custom domain in Release 1 (AG-4-16 r13, AG-15-27; X-28). */
export const ADDRESS_HOST_SUFFIXES: readonly string[] = ["expatready.com", "localhost"];

export type AddressRefusal = "empty" | "uppercase" | "characters" | "short" | "long" | "hyphen-edge" | "xn" | "reserved";
export type AddressShape = { ok: true; address: string } | { ok: false; reason: AddressRefusal; message: string };

const MESSAGES: Record<AddressRefusal, string> = {
  empty: "Enter a web address.",
  uppercase: "Use lower-case letters only (maple, not Maple).",
  characters: "Use only lower-case letters, digits and hyphens.",
  short: `Use at least ${ADDRESS_MIN} characters.`,
  long: `Use at most ${ADDRESS_MAX} characters.`,
  "hyphen-edge": "A web address cannot start or end with a hyphen.",
  xn: "A web address cannot start with xn--.",
  reserved: "This address is kept for ExpatReady's own pages. Choose another.",
};

const refuse = (reason: AddressRefusal): AddressShape => ({ ok: false, reason, message: MESSAGES[reason] });

/** Checks one typed address exactly as typed (no trimming, no lower-casing: `Maple` is refused with the reason, so the
 *  person sees why; the suggestion offers `maple`). The first rule broken is the one reported. */
export function checkAddressShape(input: unknown): AddressShape {
  if (typeof input !== "string" || input.length === 0) return refuse("empty");
  if (/[A-Z]/.test(input) && /^[A-Za-z0-9-]+$/.test(input)) return refuse("uppercase");
  if (!/^[a-z0-9-]+$/.test(input)) return refuse("characters");
  if (input.length < ADDRESS_MIN) return refuse("short");
  if (input.length > ADDRESS_MAX) return refuse("long");
  if (input.startsWith("-") || input.endsWith("-")) return refuse("hyphen-edge");
  if (input.startsWith("xn--")) return refuse("xn");
  if (RESERVED_ADDRESSES.includes(input)) return refuse("reserved");
  return { ok: true, address: input };
}

export const isAddress = (s: unknown): s is string => checkAddressShape(s).ok;

/** Words a firm's name often ends with that say nothing about the firm (Sample list). */
const LEGAL_WORDS = new Set(["inc", "incorporated", "ltd", "limited", "llc", "llp", "lp", "corp", "corporation", "co", "company", "pc", "professional", "ltee", "ltée"]);

/** The base of a suggestion from a firm's operating name: accents dropped, lower case, legal words at the end dropped, every
 *  run of other characters one hyphen, cut to fit. A name that gives fewer than 3 characters or a reserved name gets
 *  `-firm` added (Sample). Always a valid address. */
export function addressBaseFromName(name: string): string {
  const words = String(name ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  while (words.length > 1 && LEGAL_WORDS.has(words[words.length - 1])) words.pop();
  let base = fit(words.join("-"));
  if (base.startsWith("xn--")) base = fit(base.slice(4));
  if (base.length < ADDRESS_MIN || RESERVED_ADDRESSES.includes(base)) base = fit(`${base || "my"}-firm`);
  return base;
}

/** The n-th candidate for a base: the base itself, then `<base>-2`, `<base>-3`, … each cut to fit 63 characters. */
export function candidate(base: string, n: number): string {
  if (n <= 1) return base;
  const tail = `-${n}`;
  return `${fit(base.slice(0, ADDRESS_MAX - tail.length))}${tail}`;
}

/** Cut to 63 characters with no hyphen at either end. */
function fit(s: string): string {
  return s.slice(0, ADDRESS_MAX).replace(/^-+|-+$/g, "");
}

/** The firm label of a request's host, or what the host is instead. `Host` is case-insensitive and may carry a port or a
 *  trailing dot. `main`: ExpatReady's own site (a bare suffix, a reserved name, any other host such as 127.0.0.1);
 *  `label`: one label under a suffix, lower-cased, to look up (it may still be no firm); `none`: a host under a suffix that
 *  can never be a firm (two labels deep, or a label that breaks the rules). */
export type HostKind = { kind: "main" } | { kind: "label"; address: string; suffix: string; port: string } | { kind: "none" };

export function readHost(hostHeader: unknown): HostKind {
  if (typeof hostHeader !== "string" || !hostHeader) return { kind: "main" };
  const m = /^([^:]+?)\.?(?::(\d{1,5}))?$/.exec(hostHeader.trim().toLowerCase());
  if (!m) return { kind: "main" };
  const [, host, port = ""] = m;
  for (const suffix of ADDRESS_HOST_SUFFIXES) {
    if (host === suffix) return { kind: "main" };
    if (!host.endsWith(`.${suffix}`)) continue;
    const label = host.slice(0, -(suffix.length + 1));
    if (RESERVED_ADDRESSES.includes(label)) return { kind: "main" };
    return isAddress(label) ? { kind: "label", address: label, suffix, port } : { kind: "none" };
  }
  return { kind: "main" };
}
