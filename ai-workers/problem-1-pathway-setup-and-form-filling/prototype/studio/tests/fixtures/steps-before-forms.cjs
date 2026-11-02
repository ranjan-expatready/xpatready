// QA-119: the combination header's Next step is the setup checklist's next item, so a check that starts AI drafting from
// the header (Map n forms) first finishes steps 1 and 2 the way a person would: confirm the one matching official page
// (configuration author tier, when exactly one matches) and save the people list as it stands, each applicant line
// with its filing mode (C11.12: a line saved without one is "Filing not set", the next step before Map forms). `api(path, init)` is the
// check's own helper; `json` is the request body for helpers that take `json`, `data` for those that take `data`.
// C11.12 (BR-7): a person finishing step 2 also chooses each applicant role's filing; a line that has one keeps it, one
// without (a combination made by hand) gets its own application when it applies, else Declared only (Sample choice).
const APPLICANT_ROLES = ["spouse_or_partner", "child"];
const filing = (x) => (x.filingMode ? { filingMode: x.filingMode } : APPLICANT_ROLES.includes(x.role) ? { filingMode: x.applies ? "files_own" : "declared_only" } : {});
async function stepsBeforeForms(api, id, body = "data") {
  const send = (method, pth, b) => api(pth, { method, [body]: b });
  const pages = (await api(`/combinations/${id}/official-pages`)).body;
  const match = pages?.pages?.state === "proposed" ? (pages.candidates ?? []).filter((c) => c.match) : [];
  if (match.length === 1) await send("POST", `/combinations/${id}/official-pages/confirm`, { attachmentId: match[0].id });
  const pe = (await api(`/combinations/${id}/workspace?tab=questionnaires`)).body.people;
  const lines = pe.lines.map((x) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, ...(x.quote ? { quote: x.quote } : {}), ...(x.origin ? { origin: x.origin } : {}), ...filing(x) }));
  const saved = await send("PATCH", `/combinations/${id}/people`, { participants: lines, version: pe.version });
  if (saved.status !== 200) throw new Error(`stepsBeforeForms: saving the people list answered ${saved.status}`);
}
/** C11.12 (BR-7): give every applicant line of a combination its filing (as `filing` above) and save the people list,
 *  as a person does before submitting a combination made by hand; a line with a mode keeps it. */
async function setFilingModes(api, id, body = "data") {
  const pe = (await api(`/combinations/${id}/workspace?tab=questionnaires`)).body.people;
  const lines = pe.lines.map((x) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, ...(x.quote ? { quote: x.quote } : {}), ...(x.origin ? { origin: x.origin } : {}), ...filing(x) }));
  const saved = await api(`/combinations/${id}/people`, { method: "PATCH", [body]: { participants: lines, version: pe.version } });
  if (saved.status !== 200) throw new Error(`setFilingModes: saving the people list answered ${saved.status}`);
}
module.exports = { stepsBeforeForms, setFilingModes };
