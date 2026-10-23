// P3 review workbench screen. Plain JavaScript; every action goes to the local server, which validates it.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let S = null, group = null, filter = "attention";
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

const SHOW = {
  mapping: ["outcome", "person", "fact", "transform", "row", "condition", "confidence", "unresolved_reason", "evidence"],
  "canonical field": ["id", "meaning", "value_type", "proposed_by", "decide"],
  form: ["form_number", "title", "who", "status", "condition_plain", "condition", "confidence", "reason"],
  document: ["document_type", "provided_by", "who", "base_or_conditional", "status", "condition_plain", "condition", "confidence", "reason"],
  rule: ["kind", "when_plain", "when", "then", "for_whom", "why_shown", "readings"], task: ["kind", "when_plain", "then", "for_whom", "why_shown"], uncertain: ["kind", "when_plain", "then", "readings"],
  calculation: ["id", "calculation", "inputs", "reference", "plain", "executable"],
  section: ["id", "title", "meaning", "new"],
  placement: ["fact", "section_id", "collected_from", "tier", "client_visible", "repeats", "alternatives", "confidence"],
  check: ["group", "applies_to", "inputs", "condition_plain", "condition", "severity", "runs_when", "user_action", "expressible", "gap_reason"],
};
const fmt = (v) => (v === null || v === undefined ? "" : typeof v === "object" ? `<pre>${esc(JSON.stringify(v, null, 1))}</pre>` : esc(v));
const proposal = (it) => `<dl class="kv">${(SHOW[it.kind] ?? Object.keys(it.proposal)).filter((k) => it.proposal[k] !== undefined && it.proposal[k] !== null && it.proposal[k] !== "").map((k) => `<dt>${esc(k.replace(/_/g, " "))}</dt><dd>${fmt(it.proposal[k])}</dd>`).join("")}</dl>`;
const source = (it) => `<div class="meta">${esc(it.source.file)}${it.source.sha256 ? ` · SHA-256 ${esc(it.source.sha256.slice(0, 12))}…` : ""}</div><pre>${esc(it.source.snippet).replace(/\[\[([\s\S]*?)\]\]/g, "<mark>$1</mark>")}</pre>${it.source.found ? "" : `<p class="flag">${esc(it.source.note ?? "quote not found in the cited file")}</p>`}`;
const needsAttention = (it) => it.flags.length > 0 || (it.needs_sme && !it.sme);
const visible = (it) => it.group === group && (filter === "all" || (filter === "undecided" ? !it.decision : needsAttention(it) && (!it.decision || (it.needs_sme && !it.sme))));
const who = () => $("#actor").value;
const me = () => S.simulated_users.find((u) => u.user_id === who());

function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); }
async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  return r.json();
}
async function load() { S = await api("/api/state"); render(); }

function render() {
  $("#label").textContent = S.label;
  const pv = S.configuration.previous;
  $("#cfg").textContent = `${S.configuration.name} · ${S.items.length} items${pv ? ` · ${pv.reused_items} unchanged since ${pv.release}, reused without review` : " to review"}`;
  if (!$("#actor").options.length) {
    $("#actor").innerHTML = S.simulated_users.map((u) => `<option value="${u.user_id}">${esc(u.name)}</option>`).join("");
    $("#actor").value = store.get("p3.actor", S.author);
  }
  const r = S.readiness;
  $("#s-decided").textContent = `${r.counts.decided} / ${r.counts.items}`;
  $("#s-sme").textContent = `${r.counts.sme_signed} / ${r.counts.sme_needed}`;
  $("#s-returned").textContent = r.counts.returned;
  $("#ready").innerHTML = r.ready ? `<span class="ok">Ready to submit: every item decided and signed off.</span>` : `<b>Not ready to publish</b><ul>${r.blockers.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const groups = [...new Set(S.items.map((i) => i.group))];
  if (!group || !groups.includes(group)) group = store.get("p3.group", groups[0]); if (!groups.includes(group)) group = groups[0];
  $("#groups").innerHTML = groups.map((g) => {
    const its = S.items.filter((i) => i.group === g), open = its.filter((i) => !i.decision).length, att = its.filter((i) => needsAttention(i) && (!i.decision || (i.needs_sme && !i.sme))).length;
    return `<li><button data-g="${esc(g)}" aria-current="${g === group}"><span>${esc(g)}</span><span class="n">${open ? `${open} open` : "done"}${att ? ` · ${att} ⚑` : ""}</span></button></li>`;
  }).join("");
  document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-selected", String(c.dataset.filter === filter)));
  const list = S.items.filter(visible);
  const inGroup = S.items.filter((i) => i.group === group);
  $("#grouphint").textContent = `${group}: ${inGroup.length} items, ${inGroup.filter((i) => i.decision).length} decided. Showing ${list.length}${filter === "attention" ? " that need attention (flagged, or awaiting SME sign-off)" : filter === "undecided" ? " undecided" : ""}.`;
  $("#items").innerHTML = list.slice(0, 120).map(card).join("") + (list.length > 120 ? `<p class="hint">Showing the first 120 of ${list.length}; decide these to see more.</p>` : "") + (list.length ? "" : `<p class="hint">Nothing here for this filter.</p>`);
  $("#releases").innerHTML = S.releases.map((x) => `<li>Version ${x.revision}: SHA-256 <code>${esc(x.configuration_sha256)}</code>, approved by ${esc(x.approver.user_id)} (${esc(x.approver.role)}), submitted by ${esc(x.submitter.user_id)}, ${esc(x.released_at)}</li>`).join("");
  $("#substatus").innerHTML = S.submission ? `Current submission: version ${esc(S.submission.version)} by ${esc(S.submission.by)} at ${esc(S.submission.at)} · SHA-256 <code>${esc(S.submission.hash.slice(0, 16))}…</code>` : "Not yet submitted.";
}

function card(it) {
  const d = it.decision, sme = it.sme, u = me();
  const chose = d && d.decision === "corrected" && it.alternatives[d.chosen] ? ` → chose: ${it.alternatives[d.chosen].label}` : "";
  const status = d ? `${d.decision.replace("_", " ")} by ${d.by}${chose}${d.reason ? `: ${d.reason}` : ""}${d.instruction ? ` (instruction: ${d.instruction})` : ""}` : "no decision yet";
  const unresolvedBox = it.kind === "mapping" && it.proposal.outcome === "unresolved";
  return `<article class="item ${d ? (d.decision === "returned" ? "returned" : "done") : ""}" data-id="${esc(it.id)}">
    <h3>${esc(it.title)}</h3><div class="meta">${esc(it.kind)} · ${esc(it.id)}</div>
    ${it.flags.length || (it.needs_sme) ? `<div class="flags">${it.flags.map((f) => `<span class="flag">⚑ ${esc(f)}</span>`).join("")}${it.needs_sme ? `<span class="flag">${sme ? `SME signed by ${esc(sme.by)}` : "needs SME sign-off"}</span>` : ""}</div>` : ""}
    <div class="cols"><div class="box"><h4>AI proposal</h4>${proposal(it)}</div><div class="box"><h4>Official source</h4>${source(it)}</div></div>
    ${it.alternatives.length ? `<div class="alts"><b>Other trials proposed</b><ul>${it.alternatives.map((a, i) => `<li>${esc(a.label)} <span class="meta">(${esc(a.from_run)})</span> <button class="btn" data-act="corrected" data-chosen="${i}">Choose this</button></li>`).join("")}</ul></div>` : ""}
    <div class="actions">
      <input type="text" placeholder="Reason or instruction (required for flagged items, corrections and returns)" aria-label="Reason">
      ${unresolvedBox ? "" : `<button class="btn primary" data-act="accepted">Approve</button>`}
      ${it.kind === "mapping" ? `<button class="btn" data-act="left_unresolved">Keep unresolved (hand route)</button>` : ""}
      <button class="btn" data-act="returned">Return for re-draft</button>
      ${it.needs_sme && u.duties.includes("sme") ? `<button class="btn" data-act="sme_signed">Sign off (SME)</button>` : ""}
      <span class="status">${esc(status)}</span>
    </div></article>`;
}

$("#items").addEventListener("click", async (e) => {
  const b = e.target.closest("button[data-act]"); if (!b) return;
  const art = b.closest(".item"), text = art.querySelector("input").value.trim(), act = b.dataset.act;
  const res = await api("/api/decide", { by: who(), item_id: art.dataset.id, decision: act, ...(act === "returned" ? { instruction: text } : text ? { reason: text } : {}), ...(b.dataset.chosen !== undefined ? { chosen: Number(b.dataset.chosen) } : {}) });
  const r = res.results?.[0];
  toast(r?.ok ? "Recorded" : `Refused: ${r?.reason ?? res.error}`);
  await load();
});
$("#groups").addEventListener("click", (e) => { const b = e.target.closest("button[data-g]"); if (!b) return; group = b.dataset.g; store.set("p3.group", group); render(); });
document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => { filter = c.dataset.filter; render(); }));
$("#actor").addEventListener("change", () => { store.set("p3.actor", who()); render(); });
$("#bulk").addEventListener("click", async () => {
  const ids = S.items.filter((i) => i.group === group && !i.decision && !i.flags.length && !(i.kind === "mapping" && i.proposal.outcome === "unresolved")).map((i) => i.id);
  if (!ids.length) return toast("No unflagged undecided items in this group");
  const res = await api("/api/decide", { by: who(), item_ids: ids, decision: "accepted" });
  toast(`Approved ${res.recorded} of ${ids.length}, one decision per item`);
  await load();
});
$("#submit").addEventListener("click", async () => {
  const r = await api("/api/submit", { by: who() });
  $("#relmsg").className = `msg ${r.ok ? "good" : "bad"}`;
  $("#relmsg").textContent = r.ok ? `Submitted version ${r.submission.version} by ${r.submission.by}: SHA-256 ${r.submission.hash}` : `Refused: ${r.reason}`;
  if (r.ok) await load();
  $("#toast").classList.remove("show");
});
$("#approve").addEventListener("click", async () => {
  const r = await api("/api/approve", { by: who() });
  $("#relmsg").className = `msg ${r.ok ? "good" : "bad"}`;
  $("#relmsg").textContent = r.ok ? `Published version ${r.version}: SHA-256 ${r.hash}` : `Refused: ${r.reason}`;
  if (r.ok) await load();
  $("#toast").classList.remove("show");
});
load();
