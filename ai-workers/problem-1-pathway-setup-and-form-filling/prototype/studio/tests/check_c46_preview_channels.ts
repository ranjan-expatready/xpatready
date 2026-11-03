// F6 / C4.6 (runtime lane; P-62 §7, P-102, P-143): Preview by person shows, for each person, which outputs they get per
// channel: filled on the portal (Online, later wave: the product makes no PDF for it), filled PDFs to upload, PDFs to
// print, sign and mail, and which PDFs that person signs (by hand and scanned, or in pen). The lines' channel and signature
// are set through the Forms tab's own route (PATCH …/channel), so the preview reads what an author saved; a line released
// before W1-10 ("Signed PDF upload") reads as a PDF to sign. A pass and a fail per rule; rules only, no AI (US$0).
//   zsh studio/tools/isolated.sh runtime_c46 4435 start && tsx studio/tests/check_c46_preview_channels.ts 4435 xr_studio_runtime_c46
import { execFileSync } from "node:child_process";
import { previewFamily, outputOf, signWords, GUARDIAN_WORDS, LATER_WAVE_ONLINE } from "../engine/runtime/preview.ts";
import { MINOR } from "../contracts/runtime.ts";

const PORT = Number(process.argv[2] ?? 4435), DB = process.argv[3] ?? "xr_studio_runtime_c46";
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail?: unknown) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 240)}` : ""}`); };
const KEYS = /\b[a-z]+_[a-z_]+\b/;
const call = async (method: string, path: string, body?: unknown, actor = "user-A") => {
  const r = await fetch(`http://localhost:${PORT}/api${path}`, { method, headers: { "x-actor": actor, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, body: j };
};
const sql = (q: string) => execFileSync("/opt/homebrew/opt/postgresql@18/bin/psql", [`postgresql://xr_studio@127.0.0.1:54329/${DB}`, "-Atc", q], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const words = (r: { body: any }) => String(r.body?.detail ?? r.body?.message ?? "");

(async () => {
  const served = (await call("GET", "/session")).body?.workspace?.id;
  const inDb = (() => { try { return sql(`select id from workspace where id='${served}'`); } catch { return ""; } })();
  if (!served || !inDb) { console.error(`STOP  the database ${DB} is not the one the server on port ${PORT} uses. Pass the copy's database: tsx <check> ${PORT} xr_studio_<name>.`); process.exit(2); }
  await call("POST", "/demo/reset", { confirm: "RESET" });
  const l = await call("POST", "/demo/load", {});
  if (l.status >= 300) { console.error("STOP  the sample did not load", l.body); process.exit(2); }
  const wp = sql(`select id from combination where combination_key='wp.family'`);
  const pv = async (q = "") => (await call("GET", `/combinations/${wp}/workspace?tab=preview${q}`)).body.preview;
  const form = (v: any, code: string) => (v.forms as any[]).find((f) => f.form === code);

  // ---------------------------------------------------------------- before: every line a PDF upload, no signature
  const v0 = await pv("&person=principal");
  ok("setup: the principal gets filled PDFs to upload and nothing to sign", v0.forms.length >= 3 && v0.forms.every((f: any) => f.toSign === false && f.laterWave === null && f.signatureWords === "No signature"), v0.forms.map((f: any) => `${f.form}:${f.channel}:${f.signature}`));

  // ---------------------------------------------------------------- the author sets three lines on the Forms tab's route
  const set = async (code: string, b: unknown) => call("PATCH", `/combinations/${wp}/forms/${encodeURIComponent(code)}/channel`, b);
  const r1 = await set("IMM 1295", { channel: "ONLINE" });
  const r2 = await set("IMM 5707", { channel: "PAPER" });
  const r3 = await set("IMM 5257 SCH1", { channel: "PDF_UPLOAD", signature: "HAND_SCANNED" });
  ok("setup: Online, Paper and a hand-signed PDF upload are saved on the draft", [r1, r2, r3].every((r) => r.status < 300), [r1, r2, r3].map((r) => `${r.status} ${words(r)}`));
  const v1 = await pv("&person=principal");
  const online = form(v1, "IMM 1295"), paper = form(v1, "IMM 5707"), signed = form(v1, "IMM 5257 SCH1");

  // R1 Online: "Filled on the portal", with the later-wave words (P-102); no PDF.
  ok("C4.6 R1 pass: an Online line is under \"Filled on the portal\" and says the portal screens come in a later wave", online?.group === "ONLINE" && online.laterWave === LATER_WAVE_ONLINE && /later wave/.test(online.laterWave) && /no PDF/.test(online.laterWave), online);
  ok("C4.6 R1 fail: a PDF line never carries the later-wave words", v1.forms.filter((f: any) => f.channel !== "ONLINE").every((f: any) => f.laterWave === null));
  // R2 Paper: printed, signed in pen and mailed: a PDF to sign.
  ok("C4.6 R2 pass: a Paper line is under \"PDF to print, sign and mail\" and is a PDF to sign, in pen", paper?.group === "PAPER" && paper.toSign === true && paper.signatureWords === "Signed in pen", paper);
  // R3 signature on a PDF upload: signed by hand and scanned is a PDF to sign; typed name or none is not.
  ok("C4.6 R3 pass: a PDF upload signed by hand and scanned is a PDF to sign", signed?.group === "PDF_UPLOAD" && signed.toSign === true && signed.signatureWords === "Signed by hand and scanned", signed);
  const t = await set("IMM 5257 SCH1", { channel: "PDF_UPLOAD", signature: "TYPED_NAME" });
  const typed = form(await pv("&person=principal"), "IMM 5257 SCH1");
  ok("C4.6 R3 fail: a typed name is shown but is not a PDF to sign", t.status < 300 && typed?.toSign === false && typed.signatureWords === "Typed name", typed);
  ok("C4.6 R3 fail: a PDF upload with no signature is not a PDF to sign", v1.forms.filter((f: any) => f.channel === "PDF_UPLOAD" && f.signature === "NONE").every((f: any) => f.toSign === false));
  // A signature that does not fit its channel is refused where it is set, so the preview never shows one.
  const bad = await set("IMM 5707", { channel: "PAPER", signature: "TYPED_NAME" });
  ok("C4.6 R3 fail: a signature that does not fit the channel is refused on save (in words)", bad.status >= 400 && /does not fit/.test(words(bad)) && form(await pv("&person=principal"), "IMM 5707")?.signature === "PEN", `${bad.status} ${words(bad)}`);

  // R4 per person: each person's own lines; another person's preview unchanged by the principal's lines.
  const spouse = await pv("&person=spouse");
  ok("C4.6 R4 pass: the spouse's preview has its own lines, each with its signature in words", spouse.forms.length >= 1 && spouse.forms.every((f: any) => typeof f.signatureWords === "string" && typeof f.toSign === "boolean"), spouse.forms.map((f: any) => `${f.form}:${f.signatureWords}`));
  // A line's channel belongs to the form on this combination, so the spouse's own IMM 1295 is filed Online too.
  ok("C4.6 R4 pass: the spouse's own copy of an Online form is Online too, with the later-wave words", form(spouse, "IMM 1295")?.group === "ONLINE" && !!form(spouse, "IMM 1295")?.laterWave, form(spouse, "IMM 1295")?.group);
  ok("C4.6 R4 fail: a form filed once for the application (IMM 5475) is not listed under the spouse", !spouse.forms.some((f: any) => f.form === "IMM 5475") && !!form(v1, "IMM 5475"), spouse.forms.map((f: any) => f.form));
  ok("C4.6 fail-guard: no system name in the words", !KEYS.test(JSON.stringify(v1.forms.map((f: any) => [f.signatureWords, f.laterWave]))));

  // R7 (review Major 1) a document checklist is read, never filed: not a PDF the person gets, never to sign.
  const lists = v1.forms.filter((f: any) => f.checklist);
  // C11.11 (QA-101): the sample's document checklists (IMM 5488, IMM 5905) are its sources, never form lines, so the
  // preview lists neither; a checklist line kept from before is still marked as one (outputOf below).
  ok("C4.6 R7 pass (C11.11): the sample's document checklists (IMM 5488, IMM 5905) are not in the preview's filed lines", !v1.forms.some((f: any) => ["IMM 5488", "IMM 5905"].includes(f.form)) && lists.length === 0, v1.forms.map((f: any) => f.form));
  ok("C4.6 R7 fail: a checklist is never a PDF to sign and never carries the later-wave words", lists.every((f: any) => !f.toSign && !f.laterWave) && outputOf("PDF_UPLOAD", "HAND_SCANNED", true).toSign === false && outputOf("ONLINE", "NONE", true).laterWave === null);
  ok("C4.6 R7 fail: a filed form is never marked as a checklist", v1.forms.filter((f: any) => !["IMM 5488", "IMM 5905"].includes(f.form)).every((f: any) => f.checklist === false));
  // R8 (review Major 2) an Online line filed once for the couple carries the later-wave words too.
  const rc = await set("IMM 5409", { channel: "ONLINE" });
  const couple = form(await pv("&person=spouse"), "IMM 5409");
  ok("C4.6 R8 pass: an Online line filed for the couple keeps its group and carries the later-wave words", rc.status < 300 && couple?.group === "COUPLE" && couple.laterWave === LATER_WAVE_ONLINE, couple);
  ok("C4.6 fail-guard: no decision number in the words a person reads", !/P-\d+/.test(LATER_WAVE_ONLINE));

  // R5 released vs draft: the released preview reads the release's lines, not the draft's.
  const rel = (await call("GET", `/combinations/${wp}/workspace?tab=preview&release=1&person=principal`)).body.preview;
  ok("C4.6 R5 fail: the released preview still shows the released channels (the draft's change is not live)", form(rel, "IMM 1295")?.channel === "PDF_UPLOAD" && form(rel, "IMM 5707")?.toSign === false, [form(rel, "IMM 1295")?.channel, form(rel, "IMM 5707")?.signature]);

  // R6 an older release's "Signed PDF upload" line (before W1-10) reads as a PDF upload to sign by hand.
  const snap = (await call("GET", `/combinations/${wp}/config?mode=draft`)).body.snapshot;
  const old = snap.forms.find((f: any) => f.form_number === "IMM 5476") ?? snap.forms[0];
  old.channel = "SIGNED_PDF_UPLOAD"; delete old.signature;
  const vOld = previewFamily(snap, "", "principal", {});
  const o = (vOld.forms as any[]).find((f) => f.form === old.form_number);
  ok("C4.6 R6 pass: a line released as \"Signed PDF upload\" is a PDF upload to sign by hand", !!o && o.channel === "PDF_UPLOAD" && o.toSign === true && o.signatureWords === "Signed by hand and scanned", o);
  ok("C4.6 R6 fail: outputOf keeps Not needed and Online lines off the to-sign list", outputOf("NOT_NEEDED", "NONE").toSign === false && outputOf("ONLINE", "TYPED_NAME").toSign === false && outputOf("ONLINE", "NONE").laterWave === LATER_WAVE_ONLINE);

  // R7 who signs, in words (IRCC-P2-06: under 18, a parent or legal guardian signs; IRCC-P2-09: IMM 5476 by the person
  // and the representative). signWords reads R7's signers (engine/runtime/signing.ts signersOf).
  ok("C4.6 R7 pass: an adult signs their own form, named as themselves", signWords("PDF_UPLOAD", "HAND_SCANNED", false, ["person"], "principal", false)?.by === "The principal applicant themselves" && signWords("PDF_UPLOAD", "HAND_SCANNED", false, ["person"], "spouse_or_partner", false, "Spouse or partner")?.by === "Spouse or partner themselves");
  ok("C4.6 R7 pass: a form signed by hand and scanned says so", /by hand/i.test(signWords("PDF_UPLOAD", "HAND_SCANNED", false, ["person"], "principal", false)?.how ?? "") && /pen/i.test(signWords("PAPER", "PEN", false, ["person"], "principal", false)?.how ?? ""));
  ok("C4.6 R7 pass: a child under 18 never signs their own form: a parent or legal guardian does", signWords("PDF_UPLOAD", "HAND_SCANNED", false, ["person"], "child", true, "Child 1")?.by === GUARDIAN_WORDS);
  ok("C4.6 R7 fail: a child of 18 or older signs their own form (not a guardian)", signWords("PDF_UPLOAD", "HAND_SCANNED", false, ["person"], "child", false, "Child 1")?.by === "Child 1 themselves");
  ok("C4.6 R7 pass: the Sample rule \"a parent, for a minor\" names the principal as the parent; the representative is added", /principal applicant, as their parent/i.test(signWords("PDF_UPLOAD", "NONE", false, ["parent", "representative"], "child", true)?.by ?? "") && /and the representative$/.test(signWords("PDF_UPLOAD", "NONE", false, ["person", "representative"], "principal", false)?.by ?? ""));
  ok("C4.6 R7 fail: nobody signs a checklist, a Not needed line, an Online line with no method, or a line set to No signature", [signWords("PDF_UPLOAD", "HAND_SCANNED", true, ["person"], "principal", false), signWords("NOT_NEEDED", "NONE", false, ["person"], "principal", false), signWords("ONLINE", "NONE", false, ["person"], "principal", false), signWords("PDF_UPLOAD", "NONE", false, [], "principal", false)].every((x) => x === null) && signWords("ONLINE", "TYPED_NAME", false, ["person"], "principal", false) !== null);

  // R8 the Sample family's ages decide its forms even before the combination asks a date of birth; R9 the representative
  // sees each applicant's form they sign, and no form of their own.
  const s8 = structuredClone(snap);
  s8.canonical_fields = s8.canonical_fields.filter((f: any) => f.id !== MINOR.birthDateField);
  s8.combination.participants = [{ role: "principal", min: 1, max: 1, applies: true }, { role: "spouse_or_partner", min: 0, max: 1, applies: true }, { role: "child", min: 0, max: 2, applies: true }, { role: "representative", min: 0, max: 1, applies: false }];
  s8.forms = [...s8.forms.filter((f: any) => !["IMM TEST AGE", "IMM TEST REP"].includes(f.form_number)),
    { form_number: "IMM TEST AGE", title: "Adults only", form_kind: "data_form", who: "each_applicant", status: "always", min_age: 18, channel: "PDF_UPLOAD", signature: "HAND_SCANNED" },
    { form_number: "IMM TEST REP", title: "Use of representative", form_kind: "data_form", who: "each_applicant", status: "always", min_age: 18, channel: "PDF_UPLOAD", signature: "HAND_SCANNED", signed_by: "person_and_representative" }];
  const at = (who: string, f: string) => (previewFamily(s8, "", who, {}).forms as any[]).find((x) => x.form === f);
  ok("C4.6 R8 pass: with no date of birth question, the Sample adult (38) still gets a form from age 18", at("principal", "IMM TEST AGE")?.applies === true, at("principal", "IMM TEST AGE"));
  ok("C4.6 R8 fail: with no date of birth question, the Sample child (8) gets no form from age 18", !at("child-1", "IMM TEST AGE"), at("child-1", "IMM TEST AGE"));
  const repForms = previewFamily(s8, "", "representative", {}).forms as any[];
  ok("C4.6 R9 pass: the representative's preview lists the form they sign with each adult applicant, naming whose", repForms.length === 1 && repForms[0].form === "IMM TEST REP" && /^The representative, with /.test(repForms[0].sign?.by ?? "") && /Principal applicant/.test(repForms[0].sign.by) && !/Child/.test(repForms[0].sign.by), repForms);
  ok("C4.6 R9 fail: the representative gets no form of their own (not an applicant) and no form signed only by the person", !repForms.some((f) => f.form === "IMM TEST AGE"));

  console.log(`\n${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
