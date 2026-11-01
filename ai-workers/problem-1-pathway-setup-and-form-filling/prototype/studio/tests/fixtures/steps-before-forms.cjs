// QA-119: the combination header's Next step is the setup checklist's next item, so a check that starts AI drafting from
// the header (Map n forms) first finishes steps 1 and 2 the way a person would: confirm the one matching official page
// (configuration author tier, when exactly one matches) and save the people list as it stands. `api(path, init)` is the
// check's own helper; `json` is the request body for helpers that take `json`, `data` for those that take `data`.
async function stepsBeforeForms(api, id, body = "data") {
  const send = (method, pth, b) => api(pth, { method, [body]: b });
  const pages = (await api(`/combinations/${id}/official-pages`)).body;
  const match = pages?.pages?.state === "proposed" ? (pages.candidates ?? []).filter((c) => c.match) : [];
  if (match.length === 1) await send("POST", `/combinations/${id}/official-pages/confirm`, { attachmentId: match[0].id });
  const pe = (await api(`/combinations/${id}/workspace?tab=questionnaires`)).body.people;
  const lines = pe.lines.map((x) => ({ role: x.role, min: x.min, max: x.max, applies: x.applies, ...(x.quote ? { quote: x.quote } : {}), ...(x.origin ? { origin: x.origin } : {}) }));
  const saved = await send("PATCH", `/combinations/${id}/people`, { participants: lines, version: pe.version });
  if (saved.status !== 200) throw new Error(`stepsBeforeForms: saving the people list answered ${saved.status}`);
}
module.exports = { stepsBeforeForms };
