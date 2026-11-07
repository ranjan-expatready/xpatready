// B104 (P-351): offline checks of the configured checkpoint's J7 Stage 1 data (samples/checkpoint-stage-one.json) and its
// guard and step (api/src/checkpoint-stage-one-data.ts stageOneProblems, applyStageOne, with fake services). No server, no database, no model call (US$0).
// The live step (who signs, the IRCC account, the gates on Visitor visa's release 1) is proved on a fresh checkpoint by
// the packs C8.2 and C6.9 and by the walk product/screens/B104-checkpoint-stage-one/walk-stage1-1440.cjs (PR #1084).
//   tsx studio/tests/check_b104_stage_one.ts
import { applyStageOne, releaseTwoOf, stageOneOf, stageOneProblems, type StageOne, type StageOnePort } from "../api/src/checkpoint-stage-one-data.ts";
import { VV_FORM_RULES, FAMILY_FORM_BY_CHANNEL, FORM_SETUP } from "../api/src/form-setup.ts";

let failed = 0;
const ok = (label: string, cond: boolean, detail: unknown = "") => { if (!cond) failed++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : ` — ${JSON.stringify(detail).slice(0, 300)}`}`); };

const vv = stageOneOf("vv.single");
ok("B104-1 pass: the Visitor visa has Stage 1 data, and the sample file passes its guard", !!vv && stageOneProblems(vv).length === 0, vv ? stageOneProblems(vv) : "no vv.single entry");
ok("B104-2 pass: a combination with no entry gets nothing (no combination is assumed, P-319)", stageOneOf("wp.lmia_inside") === null && stageOneOf(undefined) === null);
// Every form the file names is a line the checkpoint puts on the Visitor visa (FORM_SETUP), so none is silently skipped.
const lines = new Set([FORM_SETUP["vv.single"].application, ...VV_FORM_RULES.map((r) => r.form), FAMILY_FORM_BY_CHANNEL.paper.form]);
const named = (vv?.signers ?? []).map((s) => s.form);
ok("B104-3 pass: each form whose signer is set is a line of the configured Visitor visa", named.length === 3 && named.every((f) => lines.has(f)), { named, lines: [...lines] });
ok("B104-4 pass: the account is APR Portal and the gates are the two Sample gates and four officer's-judgement lines (S7)",
  vv?.account?.value === "APR_PORTAL" && vv?.eligibility?.gates.length === 2 && vv?.eligibility?.judgement.length === 4, vv?.eligibility);

const base: StageOne = { account: { value: "APR_PORTAL", cite: "a source quoted with its page and date" }, signers: [{ form: "IMM 5707", signedBy: "person", cite: "a source quoted with its page and date" }] };
const says = (s: StageOne, re: RegExp) => stageOneProblems(s).some((p) => re.test(p));
ok("B104-5 fail: a signer the product does not know is refused, naming the known ones", says({ ...base, signers: [{ form: "IMM 5707", signedBy: "nobody", cite: base.signers![0].cite }] }, /"nobody" is not a signer the product knows \(person, /));
ok("B104-6 fail: an IRCC account the product does not know is refused", says({ ...base, account: { value: "APR", cite: base.account!.cite } }, /IRCC account "APR" is not one the product knows/));
ok("B104-7 fail: a value with no source quoted is refused (P-170)", says({ ...base, signers: [{ form: "IMM 5707", signedBy: "person", cite: "" }] }, /IMM 5707: who signs it has no source quoted/) && says({ ...base, account: { value: "APR_PORTAL", cite: " " } }, /no source quoted/));
ok("B104-8 fail: a form named twice is refused", says({ ...base, signers: [...base.signers!, ...base.signers!] }, /IMM 5707 is named twice/));
ok("B104-9 fail: gates with no source quoted are refused", says({ ...base, eligibility: { gates: [], judgement: [], cite: "" } }, /eligibility gates have no source quoted/));

// The step itself (review M1 on #1084), on fake services that record every write. The live step is
// tests/check_b104_checkpoint.ts.
type Fake = { writes: string[]; port: StageOnePort };
const fake = (o: { account?: string | null; lines?: { form: string; retired?: boolean; signedBy?: string | null; channel?: string; signature?: string }[]; gates?: number; gatesProblems?: string[]; refuse?: Record<string, string> } = {}): Fake => {
  const writes: string[] = [];
  const no = (what: string) => { if (o.refuse?.[what]) throw new Error(o.refuse[what]); };
  return { writes, port: {
    account: async () => o.account ?? null,
    setAccount: async (from, to) => { no("account"); writes.push(`account ${from}->${to}`); },
    lines: async () => (o.lines ?? [{ form: "IMM 5257" }, { form: "IMM 5707" }, { form: "IMM 5476" }]).map((l) => ({ form: l.form, retired: !!l.retired, signedBy: l.signedBy ?? null, revision: `rev-${l.form}`, channel: l.channel ?? "PDF_UPLOAD", signature: l.signature ?? "NONE" })),
    saveSigner: async (form, signedBy, revision) => { no(form); writes.push(`signer ${form}=${signedBy}@${revision}`); },
    saveSignature: async (form, channel, from, to) => { no(`${form} signature`); writes.push(`signature ${form} ${channel} ${from}->${to}`); },
    gates: async () => ({ count: o.gates ?? 0, version: o.gates ? 3 : 0 }),
    gatesProblems: async () => o.gatesProblems ?? [],
    putGates: async (e, version) => { no("gates"); writes.push(`gates ${e.gates.length}/${e.judgement.length}@v${version}`); return { gates: e.gates.length, judgement: e.judgement.length }; },
  } };
};
const said = (e: unknown) => (e as Error).message;
await (async () => {
  let f = fake();
  let r = await applyStageOne(f.port, vv, said);
  ok("B104-10 pass: on a fresh draft the account, the three signers (each over the revision read) and the gates are written, and said in plain words",
    f.writes.join(" · ") === "account null->APR_PORTAL · signer IMM 5257=parent_for_minor@rev-IMM 5257 · signer IMM 5707=person@rev-IMM 5707 · signer IMM 5476=person_and_representative@rev-IMM 5476 · gates 2/4@v0"
    && !r.refused.length && /through the APR Portal/.test(r.done[0]) && r.done.includes("IMM 5257 signed by a parent, for a minor") && !r.done.join(" ").match(/_/), { writes: f.writes, r });
  f = fake({ gatesProblems: ["eligibility gates: person.criminal_record is not a field in the library"] });
  r = await applyStageOne(f.port, vv, said);
  ok("B104-11 fail (review m2): gates the gates check refuses stop the whole step before any write, and are said", !f.writes.length && !r.done.length && /criminal_record.*nothing was set/.test(r.refused.join(" ")), r);
  f = fake({ lines: [{ form: "IMM 5257" }, { form: "IMM 5707", retired: true }] });
  r = await applyStageOne(f.port, vv, said);
  ok("B104-12 fail: a form that is not a line (IMM 5476) or was removed (IMM 5707) is said and never saved; the rest still is",
    !f.writes.some((w) => /IMM 5707|IMM 5476/.test(w)) && f.writes.some((w) => /IMM 5257=parent_for_minor/.test(w)) && ["IMM 5707", "IMM 5476"].every((x) => r.refused.some((y) => y.startsWith(`${x}: not a line`))), { writes: f.writes, r });
  f = fake({ refuse: { "IMM 5707": "Changed by Configuration author at 07:01:02 UTC while you were editing." } });
  r = await applyStageOne(f.port, vv, said);
  ok("B104-13 fail: a save the service refuses is said in its own words, not counted as done; the next form is still saved",
    r.refused.includes("IMM 5707: Changed by Configuration author at 07:01:02 UTC while you were editing.") && !r.done.some((d) => d.startsWith("IMM 5707")) && f.writes.some((w) => /IMM 5476=/.test(w)), { writes: f.writes, r });
  f = fake({ account: "APR_PORTAL", lines: [{ form: "IMM 5257", signedBy: "parent_for_minor" }, { form: "IMM 5707", signedBy: "person" }, { form: "IMM 5476", signedBy: "person_and_representative" }], gates: 2 });
  r = await applyStageOne(f.port, vv, said);
  ok("B104-14 pass: what is already set is not saved again, and gates already saved are left as they are", !f.writes.length && !r.done.length && !r.refused.length, { writes: f.writes, r });
  f = fake({ refuse: { gates: "Some details need fixing" } });
  r = await applyStageOne(f.port, vv, said);
  ok("B104-15 fail: a gates save the service refuses is said, and not reported as done", r.refused.includes("eligibility gates: Some details need fixing") && !r.done.some((d) => /eligibility/.test(d)), r);
  f = fake();
  r = await applyStageOne(f.port, { ...vv!, signers: [{ form: "IMM 5707", signedBy: "nobody", cite: "a source quoted with its page and date" }] }, said);
  ok("B104-16 fail: a bad data file writes nothing at all", !f.writes.length && /"nobody".*nothing was set/.test(r.refused.join(" ")), r);

  // Row A3 (M3 sprint plan): release 2's own lines, set inside release 2's draft (features/checkpoint/130-release-two.ts).
  const r2 = releaseTwoOf("vv.single");
  ok("A3-1 pass: release 2's data passes the guard: IMM 5645 signed by the person; IMM 5645 and Schedule 1 a typed name (Sample); no account, gates or accept record",
    !!r2 && !stageOneProblems(r2).length && JSON.stringify(r2.signers?.map((s) => [s.form, s.signedBy])) === '[["IMM 5645","person"]]'
    && JSON.stringify(r2.signatures?.map((s) => [s.form, s.signature])) === '[["IMM 5645","TYPED_NAME"],["IMM 5257 SCH1","TYPED_NAME"]]' && !r2.account && !r2.eligibility && !("accepts" in r2)
    && r2.signers![0].cite.includes("2024-06-21") && r2.signatures!.every((s) => /^Sample, Unconfirmed: expert/.test(s.cite)), r2);
  ok("A3-2 pass: IMM 5645 is the family form a release filing IMM 5257 Online files, and Stage 1 (release 1) leaves it alone",
    FAMILY_FORM_BY_CHANNEL.online.form === "IMM 5645" && !(vv?.signers ?? []).some((s) => s.form === "IMM 5645") && !vv?.signatures, FAMILY_FORM_BY_CHANNEL);
  const sig = { form: "IMM 5645", signature: "TYPED_NAME", cite: "a source quoted with its page and date" };
  ok("A3-3 fail: a signature the product does not know is refused, naming the known ones", stageOneProblems({ signatures: [{ ...sig, signature: "INK" }] }).some((p) => /IMM 5645: signature "INK" is not one the product knows \(TYPED_NAME, HAND_SCANNED, PEN, NONE\)/.test(p)));
  ok("A3-4 fail: how a line is signed with no source quoted, or named twice, is refused",
    stageOneProblems({ signatures: [{ ...sig, cite: "Sample" }] }).includes("IMM 5645: how it is signed has no source quoted") && stageOneProblems({ signatures: [sig, sig] }).includes("IMM 5645: how it is signed is named twice"));
  const draft2 = [{ form: "IMM 5257", channel: "ONLINE" }, { form: "IMM 5645" }, { form: "IMM 5257 SCH1" }, { form: "IMM 5707", retired: true }];
  f = fake({ lines: draft2 });
  r = await applyStageOne(f.port, r2, said);
  ok("A3-5 pass: on release 2's draft, IMM 5645's signer, then each signature on the line's own channel over the signature seen, said in plain words",
    f.writes.join(" · ") === "signer IMM 5645=person@rev-IMM 5645 · signature IMM 5645 PDF_UPLOAD NONE->TYPED_NAME · signature IMM 5257 SCH1 PDF_UPLOAD NONE->TYPED_NAME"
    && !r.refused.length && r.done.join("; ") === "IMM 5645 signed by the person the form is about; IMM 5645: typed name; IMM 5257 SCH1: typed name", { writes: f.writes, r });
  f = fake({ lines: [{ form: "IMM 5645", signedBy: "person", signature: "TYPED_NAME" }, { form: "IMM 5257 SCH1", retired: true }] });
  r = await applyStageOne(f.port, r2, said);
  ok("A3-6 fail: a removed line (Schedule 1) is said and never saved; what is already set is not saved again", !f.writes.length && r.refused.join() === "IMM 5257 SCH1: not a filed line of this combination, so how it is signed is not set", { writes: f.writes, r });
  f = fake({ lines: draft2, refuse: { "IMM 5645 signature": "IMM 5645: \"Typed name\" does not fit a line filed as Paper." } });
  r = await applyStageOne(f.port, r2, said);
  ok("A3-7 fail: a signature the service refuses is said in its own words, not counted as done; the next line is still saved",
    r.refused.includes("IMM 5645 signature: IMM 5645: \"Typed name\" does not fit a line filed as Paper.") && !r.done.includes("IMM 5645: typed name") && f.writes.some((w) => /signature IMM 5257 SCH1/.test(w)), { writes: f.writes, r });
})();

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
