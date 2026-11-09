// C6.16 Adult privacy and "Send to …" (screens lane, B138; concept BR-1..BR-10, P-412): the pure rules of
// engine/runtime/privacy.ts and the confirmation of an own-link answer (engine/runtime/case.ts), each with a passing
// and a failing case. No database, no server, no model call (US$0).
//   tsx studio/tests/check_c616_privacy.ts
import { adultCheck, codeCheck, deadWords, linkState, maskAddress, normalAddress, normalCode, officerWords, overLimit, principalLinkWords, privateFrom, progressOf, progressWords, sendRefusal, serverTries, wrongWords } from "../engine/runtime/privacy.ts";
import { confirmation, OWN_LINK, type Answer } from "../engine/runtime/case.ts";
import { byPrincipalFor, CONFIRM_WORDS } from "../contracts/runtime.ts";
import { LINK_RULES, LINK_WORDS, LinkCode, LinkToken, SendLink, TakeBack, KeepPrivate } from "../contracts/person-link.ts";
import type { Snapshot } from "../engine/snapshot.ts";
import { recorder } from "./runtime/api.ts";

const { ok, summary } = recorder();
const today = new Date("2026-11-09T12:00:00Z");
const P = { subjectId: "s-P", role: "principal", keepPrivate: false, isClient: true }, partner = { subjectId: "s-S", role: "spouse_or_partner", keepPrivate: true, isClient: false }, open = { ...partner, keepPrivate: false }, app = { subjectId: "s-case", role: "case", keepPrivate: false, isClient: false };

// BR-2, BR-7: the stored setting decides, for the principal only; staff always see; a link sees itself and the application.
ok("C6.16 BR-7 pass: staff read a private adult's values; the principal reads a person whose setting is off", !privateFrom({ kind: "staff" }, partner) && !privateFrom({ kind: "client" }, open) && !privateFrom({ kind: "client" }, P));
ok("C6.16 BR-7 fail: the principal does not read a person whose stored setting is on", privateFrom({ kind: "client" }, partner));
ok("C6.16 BR-5 pass: a link session reads its own person and the application", !privateFrom({ kind: "link", subjectId: "s-S" }, partner) && !privateFrom({ kind: "link", subjectId: "s-S" }, app));
ok("C6.16 BR-5 fail: a link session does not read the principal or anyone else", privateFrom({ kind: "link", subjectId: "s-S" }, P) && privateFrom({ kind: "link", subjectId: "s-S" }, { ...open, subjectId: "s-C" }));
ok("C6.16 BR-2 fail: privacy never comes from an age (a person with no setting and any age is not private)", !privateFrom({ kind: "client" }, { subjectId: "s-C", role: "child", keepPrivate: false, isClient: false }));

// BR-1: adults only.
const a = adultCheck({ role: "spouse_or_partner", label: "Partner", isClient: false }, "1987-02-11", today);
ok("C6.16 BR-1 pass: a spouse of 39 and a child of 19 are adults", a.ok && adultCheck({ role: "child", label: "Child", isClient: false }, "2007-03-14", today).ok, a);
const minor = adultCheck({ role: "child", label: "Child", isClient: false }, "2016-05-01", today), none = adultCheck({ role: "child", label: "Child", isClient: false }, undefined, today), prin = adultCheck({ role: "principal", label: "Client A", isClient: true }, "1980-01-01", today);
ok("C6.16 BR-1 fail: a child of 10, a person with no date of birth and the principal get no link, each with why", !minor.ok && minor.code === "minor" && /under 18/.test(minor.why) && /Sample; Unconfirmed: no counsel/.test(minor.why) && !none.ok && none.code === "no_birth_date" && /not answered yet/.test(none.why) && !prin.ok && prin.code === "principal", [minor, none, prin]);
ok("C6.16 BR-1 fail: a birthday tomorrow is still 17 today", !adultCheck({ role: "child", label: "Child", isClient: false }, "2008-11-10", today).ok && adultCheck({ role: "child", label: "Child", isClient: false }, "2008-11-09", today).ok);

// Review M1 / break M3 (C6.13 Make principal): "the principal" is the case's client person, whatever their role now.
const swappedClient = adultCheck({ role: "spouse_or_partner", label: "Client A", isClient: true }, "1980-01-01", today), newPrincipal = adultCheck({ role: "principal", label: "Partner", isClient: false }, "1987-02-11", today);
ok("C6.16 BR-1 fail (review M1): after Make principal the client (now spouse by role) gets no link, said in words", !swappedClient.ok && swappedClient.code === "principal" && /Client A answers on their own family link/.test(swappedClient.why), swappedClient);
ok("C6.16 BR-1 pass (review M1): the new principal by role, an adult the client answers for, may get their own link", newPrincipal.ok, newPrincipal);
ok("C6.16 BR-7 fail (review M1): the client's own answers are never hidden from the client, even with the setting on", !privateFrom({ kind: "client" }, { subjectId: "s-P", role: "spouse_or_partner", keepPrivate: true, isClient: true }));

// BR-3: who sends where (challenge B1).
ok("C6.16 BR-3 pass: the principal sends before acceptance to any address, and resends to the kept address after", sendRefusal({ sender: "client", label: "Partner", address: "x@example.com", kept: null, others: [] }) === null && sendRefusal({ sender: "client", label: "Partner", address: "p@example.com", kept: "p@example.com", others: [] }) === null);
const b1 = sendRefusal({ sender: "client", label: "Partner", address: "me@example.com", kept: "p@example.com", others: [] });
ok("C6.16 BR-3 fail (B1): the principal may not send an accepted adult's link to a new address (403 in words)", b1?.status === 403 && b1.why === "Partner already uses p•••@example.com. Ask the firm to send to a new address.", b1);
ok("C6.16 BR-3 pass: staff send an accepted adult's link to a new address", sendRefusal({ sender: "staff", label: "Partner", address: "new@example.com", kept: "p@example.com", others: [] }) === null);
const dup = sendRefusal({ sender: "staff", label: "Partner", address: "c@example.com", kept: null, others: ["c@example.com"] });
ok("C6.16 BR-3 fail: an address another person on the case uses is refused (409), staff too", dup?.status === 409 && /someone else on this case/.test(dup.why), dup);

// BR-4: address, code, link state and words.
ok("C6.16 BR-4 pass: an address is kept lower case and shown masked", normalAddress("  Partner@Example.COM ") === "partner@example.com" && maskAddress("partner@example.com") === "p•••@example.com");
ok("C6.16 BR-4 fail: not an address is refused", [ "partner", "a@b", "a b@example.com", "@example.com", `${"x".repeat(250)}@example.com` ].every((x) => normalAddress(x) === null));
ok("C6.16 BR-4 pass: a code is typed with spaces, hyphens or dashes", normalCode("123 456") === "123456" && normalCode("123-456") === "123456" && normalCode(" 12–34 56 ") === "123456");
ok("C6.16 BR-4 fail: a code that is not 6 digits is refused", [ "12345", "1234567", "12a456", "" ].every((x) => normalCode(x) === null));
const code = { codeHash: "h1", codeExpiresAt: new Date(today.getTime() + 60_000) };
ok("C6.16 BR-4 pass: the right code within 15 minutes", codeCheck(code, "h1", today) === "right");
ok("C6.16 BR-4 fail: a wrong code, an expired code and no code are told apart", codeCheck(code, "h2", today) === "wrong" && codeCheck({ ...code, codeExpiresAt: new Date(today.getTime() - 1) }, "h1", today) === "expired" && codeCheck({ codeHash: null, codeExpiresAt: null }, "h1", today) === "none");
ok("C6.16 BR-4 pass: tries left are counted down; the fifth wrong code locks", wrongWords(1) === "That code is not right. You have 4 tries left." && wrongWords(4) === "That code is not right. You have 1 try left." && wrongWords(LINK_RULES.wrongTries) === LINK_WORDS.locked);
const sent = { sentAt: new Date("2026-11-09T09:00:00Z"), expiresAt: new Date("2026-11-23T09:00:00Z"), acceptedAt: null, voidedAt: null, voidWhy: null };
ok("C6.16 BR-4 pass: a link is sent, then accepted, and says nothing while it works", linkState(sent, today) === "sent" && linkState({ ...sent, acceptedAt: today }, today) === "accepted" && deadWords(sent, today) === null);
const dead = [
  deadWords({ ...sent, voidedAt: new Date("2026-11-10T09:00:00Z"), voidWhy: "taken_back" }, today),
  deadWords({ ...sent, voidedAt: today, voidWhy: "superseded", newerSentAt: new Date("2026-11-09T10:00:00Z") }, today),
  deadWords({ ...sent, voidedAt: today, voidWhy: "locked" }, today),
  deadWords(sent, new Date("2026-11-24T00:00:00Z")),
];
const notAdult = deadWords({ ...sent, voidedAt: today, voidWhy: "not_adult" }, today);
ok("C6.16 BR-1 fail (break M2): a link that ended because the person is no longer an adult says so, naming no one and no age", linkState({ ...sent, voidedAt: today, voidWhy: "not_adult" }, today) === "not_adult" && notAdult === LINK_WORDS.notAdult && !/Client|Partner|1\d|age/.test(notAdult ?? ""), notAdult);
ok("C6.16 BR-8 pass (review m2): the principal reads what happened to the link they sent, never \"ask whoever sent it\"", principalLinkWords("taken_back", new Date("2026-11-10T09:00:00Z"), "Partner") === "The link was taken back on 10 Nov." && principalLinkWords("sent", null, "Partner") === null && !/whoever/.test(["taken_back", "locked", "expired", "superseded", "not_adult"].map((x) => principalLinkWords(x as "locked", today, "Partner")).join(" ")));
ok("C6.16 BR-10 fail: a dead link says why, naming no person", dead[0] === "This link was taken back on 10 Nov. Ask whoever sent it for a new one." && dead[1] === "This link was replaced by a newer one sent on 9 Nov. Use the newest email." && dead[2] === LINK_WORDS.locked && dead[3] === "This link expired on 23 Nov. Ask whoever sent it for a new one." && dead.every((w) => !/Client|Partner|principal/.test(w ?? "")), dead);
ok("C6.16 BR-4 pass: within the limits nothing is refused", overLimit({ kind: "code_sent", sentToAddress: LINK_RULES.codesPerAddress }) === null && overLimit({ kind: "code_try", fromNetwork: LINK_RULES.triesPerNetwork, onServer: LINK_RULES.triesPerServer }) === null);
ok("C6.16 BR-4 fail (break m2): one source far over its own limit counts only its limit towards the server's, so it never locks other adults out", serverTries([{ address: "127.0.0.2", tries: 125 }, { address: "127.0.0.3", tries: 1 }]) === LINK_RULES.triesPerNetwork + 1 && overLimit({ kind: "code_try", fromNetwork: 1, onServer: serverTries([{ address: "127.0.0.2", tries: 125 }, { address: "127.0.0.3", tries: 1 }]) }) === null);
ok("C6.16 BR-4 fail: over a limit is refused in words", /Too many codes were sent/.test(overLimit({ kind: "code_sent", sentToAddress: LINK_RULES.codesPerAddress + 1 }) ?? "") && /your network/.test(overLimit({ kind: "code_try", fromNetwork: LINK_RULES.triesPerNetwork + 1, onServer: 1 }) ?? "") && /right now/.test(overLimit({ kind: "code_try", fromNetwork: 1, onServer: LINK_RULES.triesPerServer + 1 }) ?? ""));

// BR-4 contract: the token is 43 base64url characters in a body; the code field takes what was typed.
const tok = "A".repeat(43);
ok("C6.16 BR-4 pass: a token and a code are accepted as typed", LinkToken.safeParse({ token: tok }).success && LinkCode.safeParse({ token: tok, code: "123 456" }).success && SendLink.safeParse({ address: "p@example.com" }).success);
ok("C6.16 BR-3 fail (review m3): an address with a control character (NUL) is refused on the field", !SendLink.safeParse({ address: "p\u0000@example.com" }).success && SendLink.safeParse({ address: "p\u0000@example.com" }).error?.issues[0]?.path[0] === "address");
ok("C6.16 BR-4 fail: a token that is not 32 random bytes is refused", !LinkToken.safeParse({ token: "short" }).success && !LinkToken.safeParse({ token: `${tok}/` }).success);
ok("C6.16 BR-8 pass: staff give a reason to take back or tick; the principal may leave it out", TakeBack.safeParse({}).success && TakeBack.safeParse({ reason: "Asked by the firm" }).success && KeepPrivate.safeParse({ reason: "Asked by Partner" }).success);
ok("C6.16 BR-8 fail: a reason of fewer than 5 characters or only marks is refused", !TakeBack.safeParse({ reason: "no" }).success && !KeepPrivate.safeParse({ reason: "....." }).success && !KeepPrivate.safeParse({}).success);

// BR-6 (P-78): an own-link answer is the person's own; the principal's answer for an adult waits.
const s = { placements: [{ fact: "person.date_of_birth", section_id: "personal", repeats: "once", collected_from: "client_questionnaire" }, { fact: "person.uci", section_id: "personal", repeats: "once", collected_from: "officer" }], canonical_fields: [] } as unknown as Snapshot;
const ans = (o: Partial<Answer>): Answer => ({ id: "a1", subjectId: "s-S", field: "person.date_of_birth", rowKey: null, value: "1987-02-11", status: "DECLARED", channel: "questionnaire", actor: "user-P", at: today.toISOString(), ...o });
const who = { subjectId: "s-S", role: "spouse_or_partner" as const, label: "Partner", applies: true };
const own = confirmation(s, ans({ channel: OWN_LINK, actor: "person:s-S" }), who, "1987-02-11", today);
ok("C6.16 BR-6 pass: an answer saved on the person's own link counts as their own (confirmed)", own.confirmed && own.why === CONFIRM_WORDS.person_own && own.mark === "declared", own);
const byP = confirmation(s, ans({}), who, "1987-02-11", today);
// Main's P-411 words: the principal's answer is declared and fills the forms, marked "by the principal", not confirmed.
ok("C6.16 BR-6 fail: the principal's answer for an adult is not confirmed until that adult confirms", !byP.confirmed && byP.mark === "by_principal" && byP.why === byPrincipalFor("Partner"), byP);
ok("C6.16 BR-6 fail: an own-link channel never confirms a fact the officer confirms from a document", !confirmation(s, ans({ field: "person.uci", channel: OWN_LINK }), who, "1987-02-11", today).confirmed);

// BR-7 (challenge m3): progress counted on the server.
const sec = (o: { missing?: string[]; invalid?: number; required?: boolean; at?: string | null; groupRequired?: boolean }) => ({ answered: o.at ? 1 : 0, missing: o.missing ?? [], invalid: o.invalid ?? 0, group: o.groupRequired === undefined ? null : { required: o.groupRequired }, questions: [{ required: o.required ?? true, hidden: false, answer: o.at ? { at: o.at } : null, rows: [] }] });
const pr = progressOf([sec({ at: "2026-11-09T14:10:00Z" }), sec({ missing: ["Date of birth"] }), sec({ invalid: 1, at: "2026-11-08T10:00:00Z" }), sec({ required: false })]);
ok("C6.16 BR-7 pass: a part is done with nothing required missing and nothing to fix; optional parts are counted; last saved is the newest answer", pr.done === 2 && pr.asked === 4 && pr.optional === 1 && pr.saved_at === "2026-11-09T14:10:00Z" && progressWords(pr) === "2 of 4 parts done (1 optional) · last saved 9 Nov", pr);
const pr0 = progressOf([sec({ missing: ["A"] }), sec({ invalid: 2, at: "2026-11-01T00:00:00Z" })]);
ok("C6.16 BR-7 fail: a part with a missing answer or an answer to fix is not done", pr0.done === 0 && pr0.asked === 2 && pr0.optional === 0, pr0);
ok("C6.16 BR-7 fail: progress words carry no value, no percentage and no follow-up", !/%|1987|\?/.test(progressWords(pr)));

// Layout §4: the officer's line in words.
const link = { ...sent, masked: "p•••@example.com", givenBy: "Client A" };
const words = [
  officerWords({ label: "Partner", principal: "Client A", adult: true, keepPrivate: false, privateAt: null, link: null, acceptedOn: null, now: today }),
  officerWords({ label: "Partner", principal: "Client A", adult: true, keepPrivate: true, privateAt: today, link: { ...link, acceptedAt: today }, acceptedOn: { masked: "p•••@example.com", givenBy: "Client A" }, now: today }),
  officerWords({ label: "Partner", principal: "Client A", adult: true, keepPrivate: true, privateAt: today, link: { ...link, voidedAt: new Date("2026-11-10T09:00:00Z"), voidWhy: "taken_back" }, acceptedOn: null, now: new Date("2026-11-11T00:00:00Z") }),
];
ok("C6.16 BR-3 pass: the officer reads who answers, what the code proves and who gave the address", words[0] === "Answers by Client A" && words[1] === "With Partner since 9 Nov · private from Client A · answered on the link sent to p•••@example.com (address given by Client A)" && words[2] === "Taken back 10 Nov · still private from Client A", words);
ok("C6.16 BR-8 fail: take back never reads as no longer private while the setting is on", !/still private/.test(officerWords({ label: "Partner", principal: "Client A", adult: true, keepPrivate: false, privateAt: null, link: { ...link, voidedAt: today, voidWhy: "taken_back" }, acceptedOn: null, now: today })));

process.exitCode = summary() ? 1 : 0;
