// F2a (forms lane, F2 plan §5 E-1…E-4, §7; challenge B1; Lead decision Q2): a portal screen's identity comes from the
// page, never the capture order; a mapping is reused only for the same input on the same screen; one screen's
// fingerprint and difference; a capture made in the browser extension adds to the current version; the extension's
// screen endpoint checks every screen again and refuses the whole screen on any answer or client detail. Every rule
// with a passing and a failing case. Isolated copy (own database and files), no browser, NO model call (US$0). The
// screens are the F1 Sample portal fixtures, read here by the saved-page reader (the extension's reader gives the same
// structure: tests/check_forms_f2a.ts).
//   zsh studio/tools/isolated.sh forms_f2a 4455 start && tsx studio/tests/check_forms_f2a_api.ts 4455 xr_studio_forms_f2a
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { CaptureInput, CaptureRecord } from "../engine/capture.ts";
import { fingerprint, inputKey, mergeCapture, rawId, screenDifference, screenFingerprint, screenIdentity, screenProblems } from "../engine/extension/screens.ts";
import { screenQualifier } from "../engine/twin.ts";
import { draftScreenMap } from "../engine/twin.ts";

const PORT = Number(process.argv[2] ?? 4455), DB = process.argv[3] ?? "xr_studio_forms_f2a";
const STUDIO = join(import.meta.dirname, "..");
const FIX = join(STUDIO, "tests", "fixtures", "portal");
const PY = join(STUDIO, "..", "..", "..", "..", ".tools", "solution-1-prototype", ".venv", "bin", "python");
const log: { name: string; ok: boolean; detail?: unknown }[] = []; let pass = 0, fail = 0;
const ok = (name: string, c: unknown, detail?: unknown) => { c ? pass++ : fail++; log.push({ name, ok: !!c, detail }); console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses are read loosely, as in the other API checks
const ORIGIN = "chrome-extension://ipomjnfjkniidipddghocobgcfecebaf";
/** actor: a simulated Studio person (x-actor), or { token } for the browser extension (its token and origin only). */
const call = async (method: string, path: string, body?: unknown, actor: string | { token: string } = "user-A"): Promise<Res> => {
  const who: Record<string, string> = typeof actor === "string" ? { "x-actor": actor } : { authorization: `Bearer ${actor.token}`, origin: ORIGIN };
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { ...who, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: unknown = t; try { j = JSON.parse(t); } catch { /* not JSON */ }
  return { status: r.status, body: j };
};
const upload = async (path: string, names: string[], actor = "user-A"): Promise<Res> => {
  const { readFileSync } = await import("node:fs");
  const fd = new FormData(); for (const n of names) fd.append("files", new Blob([new Uint8Array(readFileSync(join(FIX, n)))]), n);
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method: "POST", headers: { "x-actor": actor }, body: fd });
  return { status: r.status, body: await r.json() };
};
type Screen = { title: string; inputs: CaptureInput[] };
/** A fixture's one screen as a reader gives it. */
const read = (file: string): Screen => (JSON.parse(execFileSync(PY, ["-I", join(STUDIO, "tools", "read_portal_capture.py"), "page", join(FIX, file)], { encoding: "utf8" }).trim().split("\n").pop()!).screens[0]);
const S1 = "imm5257-online-s1-personal.html", S2 = "imm5257-online-s2-marital.html", S3 = "imm5257-online-s3-language.html", S4 = "imm5257-online-s4-spouse.html", RW = "imm5257-online-s1-personal-reworded.html";
const src = { way: "extension", file: "extension-test", sha256: "0".repeat(64) };
const meta = { portal: "ircc_portal", form: "IMM 5257", title: "Visitor visa", way: "extension" };

(async () => {
  // ──────────────────────────────────────────── engine (no server)
  const [s1, s2, s3, s4, rw] = [S1, S2, S3, S4, RW].map(read);
  ok("C2.9: E-1 a screen's identity is its heading, the same whatever the order or the case of its words", screenIdentity("Personal details") === "personal-details" && screenIdentity("  PERSONAL   details ") === "personal-details" && screenIdentity(s4.title) !== screenIdentity(s1.title), [screenIdentity(s1.title), screenIdentity(s4.title)]);
  // CHECK (break B1, m6): brackets, long headings and headings in another script keep two screens apart.
  const spouseTitled = "Personal details (Spouse or common-law partner)";
  ok("C2.9: break B1 a heading with words in brackets is another screen than the same heading without them", screenIdentity(spouseTitled) !== screenIdentity("Personal details") && screenIdentity("Personal details (2)") !== screenIdentity("Personal details (3)"), [screenIdentity(spouseTitled)]);
  ok("C2.9: break B1 two long headings that differ after 40 characters are two screens; their id qualifiers differ too", screenIdentity("Information about your employment history in the last ten years: employer one") !== screenIdentity("Information about your employment history in the last ten years: employer two") && screenQualifier("Information about your employment history in the last ten years: employer one") !== screenQualifier("Information about your employment history in the last ten years: employer two") && screenQualifier("Information about your employment history in the last ten years: employer one").length <= 40);
  ok("C2.9: break m6 headings in another script are told apart (never all \"screen\")", screenIdentity("Données personnelles") !== screenIdentity("Coordonnées") && screenIdentity("个人资料") !== screenIdentity("婚姻状况") && screenIdentity("— — —") !== screenIdentity("* * *") && !["screen"].includes(screenIdentity("个人资料")));
  ok("C2.9: E-1 an input is known by its screen and its element id, never its qualifier", inputKey(s4.title, "familyName@x") === inputKey(s4.title, "familyName") && inputKey(s4.title, "familyName") !== inputKey(s1.title, "familyName") && rawId("a@b") === "a");
  const approved = mergeCapture(null, [s1, s2, s3, s4].map((s) => ({ ...s, source: src })), meta).record;
  const collide = mergeCapture(approved, [{ ...s1, title: spouseTitled, source: src }], meta);
  ok("C2.9: break B1 fail: a branch capture titled \"Personal details (Spouse …)\" is a new screen, never the approved applicant screen replaced", collide.added.length === 1 && collide.record.screens.find((x) => x.title === "Personal details")!.inputs.every((i, n) => i.id === approved.screens[0].inputs[n].id) && collide.record.screens.length === 5, { added: collide.added, compared: collide.compared });
  ok("C2.9: E-2 one screen's fingerprint ignores the qualifier and the place of the screen; a reworded label changes it", screenFingerprint(approved.screens[3]) === screenFingerprint(s4) && screenFingerprint(s1) !== screenFingerprint(rw));
  const d = screenDifference(s1, rw);
  ok("C2.9: E-3 the difference of one screen names the reworded input and the added option, nothing else", d.some((x) => x.input === "familyName" && x.change === "reworded") && d.some((x) => x.change === "options") && d.every((x) => x.change !== "removed"), d.map((x) => `${x.input}:${x.change}`));
  ok("C2.9: E-3 fail: the same screen has no difference", screenDifference(s1, s1).length === 0);
  ok("C2.9: B1 the spouse screen's element ids that the applicant's screen uses are qualified by the spouse screen, whatever order they came in",
    approved.screens[3].inputs.filter((i) => i.id.includes("@")).every((i) => i.id.endsWith(`@${screenIdentity(s4.title)}`)) && approved.screens[3].inputs.some((i) => i.id.includes("@")),
    approved.screens[3].inputs.map((i) => i.id));
  const spouseFirst = mergeCapture(approved, [s4, s1].map((s) => ({ ...s, source: src })), meta);
  ok("C2.9: Q2 a branch capture (spouse screen first, then personal details) keeps the approved ids of each screen and the same fingerprint", fingerprint(spouseFirst.record) === fingerprint(approved) && spouseFirst.not_seen.length === 2 && spouseFirst.compared.length === 0 && spouseFirst.unchanged.length === 2, { not_seen: spouseFirst.not_seen });
  const firstSpouse = mergeCapture(null, [s4, s1].map((s) => ({ ...s, source: src })), meta).record;
  ok("C2.9: B1 with no version yet, the screen captured second is the one qualified (its own heading), so the two never share an id", new Set(firstSpouse.screens.flatMap((s) => s.inputs.map((i) => i.id))).size === firstSpouse.screens.reduce((a, s) => a + s.inputs.length, 0));
  const changed = mergeCapture(approved, [{ ...rw, source: src }, { ...s3, source: src }], meta);
  ok("C2.9: Q2 a capture that saw s1 reworded and s3 compares only those: s2 and the spouse screen are \"not seen this time\", never removed", changed.compared.length === 1 && changed.unchanged.length === 1 && changed.not_seen.length === 2 && changed.record.screens.length === 4, changed);
  const extra = { title: "Travel history", inputs: [{ id: "visitedUsa", label: "Have you visited the USA?", type: "radio", required: true, order: 1, options: [{ code: "Y", label: "Yes" }, { code: "N", label: "No" }] }] as CaptureInput[] };
  const plus = mergeCapture(approved, [{ ...s2, source: src }, { ...extra, source: src }, { ...s3, source: src }], meta);
  ok("C2.9: Q2 a new screen is added after the screen captured before it, in portal order", plus.added[0] === "Travel history" && plus.record.screens.map((s) => s.title).indexOf("Travel history") === plus.record.screens.map((s) => s.title).indexOf(s2.title) + 1 && plus.record.screens.length === 5, plus.record.screens.map((s) => s.title));
  ok("C2.9: BR-1 server check: a label holding a client's details, an option with a passport-like code, a label with text after its colon, an id twice: refused", screenProblems({ title: "Details of 12345678", inputs: [] }).length === 1
    && screenProblems({ title: "x", inputs: [{ ...s1.inputs[0], label: "Family name: SAMPLE" }] }).length === 1 && screenProblems({ title: "x", inputs: [{ ...s1.inputs[4], options: [{ code: "1", label: "AB1234567" }] }] }).length === 1
    && screenProblems({ title: "x", inputs: [s1.inputs[0], s1.inputs[0]] }).length === 1);
  ok("C2.9: BR-1 server check fail: the blank screens pass", [s1, s2, s3, s4, rw].every((s) => screenProblems(s).length === 0));
  // B1 at reuse: a map row of the applicant's familyName is never reused for the spouse's familyName.
  const prev = new Map([[inputKey(s1.title, "familyName"), { fact: "person.family_name", transform: "as_is", person: "form_subject", edition: "IMM 5257 (online v1)" }]]);
  const twin = (s: Screen): CaptureRecord => ({ ...approved, screens: [{ key: "s01", order: 1, title: s.title, source: src, inputs: s.inputs }] });
  const onSpouse = draftScreenMap(twin({ title: s4.title, inputs: s4.inputs.map((i) => ({ ...i, id: rawId(i.id) })) }), { pdf: [], pdfEdition: null, previous: prev, library: [] }).proposals.find((p) => p.input === "familyName");
  const onApplicant = draftScreenMap(twin(s1), { pdf: [], pdfEdition: null, previous: prev, library: [] }).proposals.find((p) => p.input === "familyName");
  ok("C2.9: B1 the same element id on the spouse screen does not take the applicant's mapping; on its own screen it does", onSpouse?.method !== "same_path" && onApplicant?.method === "same_path", { spouse: onSpouse?.method ?? onSpouse?.outcome, applicant: onApplicant?.method });

  // ──────────────────────────────────────────── API: an approved online version from saved pages, then extension captures
  await call("POST", "/demo/load");
  const v1 = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)", applicationType: "Visitor visa" })).body;
  await upload(`/captures/${v1.id}/screens`, [S1, S2, S3, S4]);
  await call("POST", `/captures/${v1.id}/finish`); const ap = await call("POST", `/captures/${v1.id}/approve`, undefined, "user-C");
  ok("setup: IMM 5257's online version v1 approved from four saved screens", ap.status < 300, ap.body?.status ?? ap.body);

  // The capturer connects the extension (F2b): a code from the Studio, exchanged once for the extension's token.
  const code = (await call("POST", "/extension/pairings", {})).body.code;
  const ext = { token: (await call("POST", "/extension/sessions", { code, extensionId: ORIGIN.slice(19) }, { token: "" })).body.token as string };
  const start = () => call("POST", "/extension/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)", applicationType: "Visitor visa" }, ext);
  let c = (await start()).body;
  ok("C2.9: BR-4 a capture with the browser extension starts open, way extension, saying only the screens seen are compared", c.way === "extension" && c.status === "OPEN" && /only the screens seen are compared/.test(c.status_detail), c.status_detail);
  const add = async (screen: unknown, rev = c.revision, actor: string | { token: string } = ext, id = c.id) => call("POST", `/extension/captures/${id}/screens`, { screen, revision: rev }, actor);
  let r = await add(s1);
  ok("C2.9: BR-4 \"Capture this screen\": s1 added (screen 1 captured · go to the next screen)", r.status === 201 && r.body.result.outcome === "added" && /Screen 1 captured/.test(r.body.result.message), r.body.result);
  const rev1 = r.body.capture.revision;
  r = await add(s1, rev1);
  ok("C2.9: BR-4 fail: the same screen again is \"already captured\", nothing added", r.body.result?.outcome === "duplicate" && r.body.capture.screens.length === 1, r.body.result);
  // Break B1: a screen whose heading only adds words in brackets is not "already captured".
  let rb = await add({ ...s1, title: "Personal details (Spouse or common-law partner)" }, rev1);
  ok("C2.9: break B1 a second screen whose heading differs in brackets is added, not refused as already captured", rb.body.result?.outcome === "added", rb.body.result);
  rb = await call("DELETE", `/captures/${c.id}/screens/2`);
  const rev1b = (await call("GET", `/captures/${c.id}`)).body.revision;
  r = await add(s3, c.revision);
  ok("C2.9: BR-4 fail: a screen sent from an older revision is refused (409), nothing added", r.status === 409, r.body.message);
  r = await add({ ...s3, inputs: s3.inputs.map((i, n) => (n ? i : { ...i, value: "SAMPLE" })) }, rev1b);
  ok("C2.9: BR-1 fail: a screen carrying a value is refused as a whole (400), nothing kept", r.status === 400 && /carried an answer/.test(r.body.message), r.body.message);
  r = await add({ ...s3, inputs: s3.inputs.map((i, n) => (n ? i : { ...i, label: "Details of AB1234567" })) }, rev1b);
  ok("C2.9: BR-1 fail: a label holding a passport-like code is refused (422) in words, nothing kept", r.status === 422 && /passport-like code/.test(r.body.message), r.body.message);
  r = await add({ ...s3, extra: 1 }, rev1b);
  ok("C2.9: BR-1 fail: a key the contract does not name is refused, never ignored", r.status === 400, r.status);
  r = await call("POST", "/extension/pairings", {}, "user-B");
  ok("C2.9: BR-15 roles fail: a person without the capture duty (author) gets no code for the extension (403)", r.status === 403, r.body.message);
  r = await add(s3, rev1, "user-A");
  ok("C2.9: M7 fail: the extension's screen route takes no Studio sign-in (x-actor alone is 401)", r.status === 401 && /never the Studio's/.test(r.body.message), r.body.message);
  const saved = (await call("POST", "/captures", { portal: "ircc_portal", form: "IMM 5257", title: "Application for a visitor visa (online)" })).body;
  r = await add(s3, saved.revision, ext, saved.id);
  ok("C2.9: fail: a capture from saved pages takes no extension screen (404: not an extension capture of yours); an extension capture takes no saved page (409)", r.status === 404 && (await upload(`/captures/${c.id}/screens`, [S2])).status === 409, r.body.message);
  r = await add(s3, rev1b);
  const fin = await call("POST", `/extension/captures/${c.id}/finish`, undefined, ext);
  ok("C2.9: Q2 a capture that saw s1 and s3 unchanged is already in the library: 2 compared, 2 not seen this time, nothing removed", fin.body.status === "IN_LIBRARY" && /2 not seen this time/.test(fin.body.status_detail), fin.body.status_detail);

  c = (await start()).body;
  r = await add(rw); r = await add(s3, r.body.capture.revision);
  const held = await call("POST", `/extension/captures/${c.id}/finish`, undefined, ext);
  const diff = held.body.difference as { input: string; change: string }[];
  ok("C2.9: Q2 a capture that saw s1 reworded is held with only s1's differences; the screens not seen are never \"removed\"", held.body.status === "HELD" && diff.length > 0 && diff.every((x) => x.change !== "removed") && diff.some((x) => x.input === "familyName" && x.change === "reworded") && /1 changed\); 2 not seen this time; 0 added/.test(held.body.status_detail), { status: held.body.status_detail, diff });
  const { readFileSync } = await import("node:fs");
  const twinFile = execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", `select twin_file from portal_capture where id='${c.id}'`], { encoding: "utf8" }).trim();
  const seenOn = JSON.parse(readFileSync(join(STUDIO, "..", "..", twinFile), "utf8")).last_seen as Record<string, string>;
  ok("C2.9: Q2 the twin keeps a last-seen day for every screen, the two not seen this time included", Object.keys(seenOn).length === 4 && Object.values(seenOn).every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)), seenOn);
  r = await call("POST", `/captures/${c.id}/approve`, undefined, "user-A");
  ok("C2.9: fail: the person who captured it cannot approve it (403)", r.status === 403, r.status);
  r = await call("POST", `/captures/${c.id}/approve`, undefined, "user-C");
  ok("C2.9: a second person approves it: the new version keeps every screen, with s1 reworded", r.status < 300 && (await call("GET", `/captures/${c.id}`)).body.screens.length === 4, r.body?.status);

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log(`FAIL  the check stopped: ${String((e as Error)?.message ?? e).slice(0, 200)}`); console.error(e); process.exit(1); });
