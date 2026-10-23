// P5 product shell (D274): one saved case, several personas. Plain JavaScript; every action goes through the case API.
const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const show = (v) => (v === true ? "Yes" : v === false ? "No" : v && typeof v === "object" ? (Array.isArray(v) ? v.map(show).join("; ") : Object.values(v).filter(Boolean).join(", ")) : v ?? "");
let S = { persona: "agent", screen: null, caseId: null, st: null, cfg: null, samples: null, busy: false, formSel: null };
const USER = { admin: "admin-1", agent: "agent-1", consultant: "consultant-1", client: "client" };

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || j.reason || `HTTP ${r.status}`);
  return j;
}
function toast(m, bad) { const t = $("#toast"); t.textContent = m; t.style.background = bad ? "var(--bad)" : ""; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3500); }
async function act(fn, ok) { if (S.busy) return; S.busy = true; $("#main").classList.add("loading"); try { const r = await fn(); if (ok) toast(typeof ok === "function" ? ok(r) : ok); await refresh(); } catch (e) { toast(e.message, true); } finally { S.busy = false; $("#main").classList.remove("loading"); } }

const SCREENS = {
  admin: [["configurator", "Pathway Configurator"]],
  agent: [["intake", "Leads and intake"], ["documents", "Documents"], ["updates", "Case update review"], ["working", "Working view"], ["checklist", "Checklist"], ["forms", "Forms"]],
  consultant: [["forms", "Forms and approval"], ["updates", "Case update review"]],
  client: [["mydocs", "My documents"], ["questionnaire", "Questionnaire"]],
};

async function refresh() {
  const cs = await api("/api/cases");
  const sel = $("#case");
  sel.innerHTML = cs.length ? cs.map((c) => `<option value="${c.case_id}">${c.case_id} · ${esc(c.people[0]?.label ?? "")}</option>`).join("") : `<option value="">No case yet</option>`;
  if (!S.caseId || !cs.some((c) => c.case_id === S.caseId)) S.caseId = cs.at(-1)?.case_id ?? null;
  sel.value = S.caseId ?? "";
  S.st = S.caseId ? await api(`/api/state?case=${S.caseId}`) : null;
  render();
}

function nav() {
  const list = SCREENS[S.persona];
  if (!list.some(([k]) => k === S.screen)) S.screen = list[0][0];
  const n = { updates: S.st?.open_items, questionnaire: S.st ? qs(S.st).filter((q) => q.status === "needs an answer").length : 0 };
  $("#nav").innerHTML = `<h5>${esc($("#persona").selectedOptions[0].text)}</h5>` + list.map(([k, l]) => `<button data-s="${k}" ${k === S.screen ? 'aria-current="page"' : ""}>${esc(l)}${n[k] ? `<span class="n">${n[k]}</span>` : ""}</button>`).join("");
}
const label = (id) => S.st?.case.people.find((p) => p.id === id)?.label ?? (id === "case" ? "The application" : id?.includes("/parent_") ? `${label(id.split("/")[0])}: parent ${id.slice(-1)}` : id);
const qs = (st) => [...st.questions.principal, ...st.questions.partner];

function render() {
  nav();
  const m = $("#main");
  if (S.persona !== "admin" && S.screen !== "intake" && !S.st) { m.innerHTML = `<div class="empty">No case yet. ${S.persona === "agent" ? "Start in <b>Leads and intake</b>." : "Ask the firm to open your case."}</div>`; return; }
  m.innerHTML = (VIEWS[S.screen] ?? (() => "<div class='empty'>Not available</div>"))();
}

// ---------------------------------------------------------------- Product Studio (read-only release inspection here)
const VIEWS = {};
VIEWS.configurator = () => {
  if (!S.cfg) { api("/api/configurator").then((c) => { S.cfg = c; render(); }); return "<div class='empty'>Loading the released configuration…</div>"; }
  const c = S.cfg, k = c.counts;
  return `<div class="crumb">Product Studio › Pathway Configurator</div><h1>Work permit, outside Canada (combination 1)</h1>
  <div class="banner-sim">${esc(c.label)}. Released as version ${c.release.version} <code>${c.release.configuration_sha256.slice(0, 12)}…</code> after field review and separate approval (author and submitter could not approve).</div>
  <div class="grid2">${[["Reusable fields", k.canonical_fields], ["Sections", k.sections], ["Field placements", k.placements], ["Forms", k.forms], ["Box mappings", k.map_entries], ["Document requirements", k.document_requirements], ["Rules", k.rules], ["Calculations", k.derived_fields], ["Checks", k.checks]].map(([a, b]) => `<div class="card"><div class="stat"><b>${b}</b><span>${a}</span></div></div>`).join("")}</div>
  <div class="card"><h2>Forms and when each applies</h2><div class="tw"><table class="t"><tr><th>Form</th><th>For whom</th><th>Applies</th></tr>${c.forms.map((f) => `<tr><td><b>${esc(f.form)}</b> ${esc(f.title)}</td><td>${esc(f.who)}</td><td>${f.status === "dismissed" ? "<span class='pill'>dismissed in review</span>" : esc(f.when ?? "always")}</td></tr>`).join("")}</table></div></div>
  <div class="card"><h2>Document requirements (base and conditional)</h2><div class="tw"><table class="t"><tr><th>Document</th><th>For whom</th><th>When</th><th>Official words</th></tr>${c.documents.filter((d) => d.status !== "dismissed").map((d) => `<tr><td>${esc(d.type)}</td><td>${esc(d.who)}</td><td>${d.base_or_conditional === "base" ? "always" : esc(d.when ?? "")}</td><td class="meta">${esc(d.quote)}</td></tr>`).join("")}</table></div></div>
  <div class="card"><h2>Sections</h2><div class="tw"><table class="t">${c.sections.map((s) => `<tr><td><b>${esc(s.title)}</b></td><td>${esc(s.meaning)}</td><td>${s.facts} facts</td></tr>`).join("")}</table></div></div>
  <div class="card"><h2>Sample box mappings (IMM 1295)</h2><div class="tw"><table class="t"><tr><th>Box</th><th>Person</th><th>Fact</th><th>Transformation</th></tr>${c.sample_maps.map((e) => `<tr><td class="meta">${esc(e.box.replace("form1[0].", ""))}</td><td>${esc(e.person)}</td><td>${esc(e.fact)}</td><td>${esc(e.transform)}</td></tr>`).join("")}</table></div></div>`;
};

// ---------------------------------------------------------------- Agent: leads and intake (6.1-6.3, 7.1)
VIEWS.intake = () => `<div class="crumb">Leads › New lead</div><h1>New lead and case</h1>
  <div class="card"><h2>Lead form</h2><p class="hint">A few starter questions identify the person and the service. Documents can be uploaded straight after the case opens; the rest of the questionnaire adapts to what they show.</p>
  ${[["family", "Family name"], ["given", "Given name(s)"], ["dob", "Date of birth (YYYY-MM-DD)"], ["email", "E-mail"]].map(([k, l]) => `<div class="field"><label for="lead-${k}">${l}</label><input id="lead-${k}" autocomplete="off" value="${esc(S.lead?.[k] ?? "")}"></div>`).join("")}
  <div class="field"><label for="lead-service">Service</label><select id="lead-service"><option>Work permit, outside Canada (combination 1)</option></select></div>
  <div class="field"><label>Family on the application</label><div><label><input type="checkbox" id="lead-partner" checked> Spouse or partner, also applying</label> &nbsp; <label><input type="checkbox" id="lead-child" checked> One accompanying child</label></div></div>
  ${[["pfamily", "Partner's family name"], ["pgiven", "Partner's given name(s)"], ["cfamily", "Child's family name"], ["cgiven", "Child's given name(s)"]].map(([k, l]) => `<div class="field"><label for="lead-${k}">${l}</label><input id="lead-${k}" autocomplete="off" value="${esc(S.lead?.[k] ?? "")}"></div>`).join("")}
  <div class="actions"><button class="btn" data-a="sample-lead">Load sample inputs</button><button class="btn primary" data-a="check-lead">Check for existing records</button></div><div id="dup">${S.dup ? dupCard(S.dup) : ""}</div></div>
  ${S.st ? `<div class="card"><h3>Open case</h3><p>${esc(S.st.case.case_id)} on release c1-v3 · ${S.st.case.people.map((p) => esc(p.label)).join(" · ")}</p></div>` : ""}`;

// ---------------------------------------------------------------- Documents (agent binder) and client documents
function dupCard(r) {
  return `<div class="card"><h3>${r.matches.length ? `${r.matches.length} possible match(es)` : "No existing record matches"}</h3>${r.matches.map((m) => `<p>${esc(m.label)} on ${esc(m.case_id)} · born ${esc(m.dob ?? "?")} ${m.same_dob ? "<span class='pill warn'>same date of birth</span>" : ""}${m.same_email ? " <span class='pill warn'>same e-mail</span>" : ""}</p>`).join("")}<p class="meta">${esc(r.rule)}</p><div class="actions"><button class="btn primary" data-a="open-case" data-dup="${r.matches.length ? "staff decided: a different person" : "no possible duplicates found"}">${r.matches.length ? "Different person: open a new client and case" : "Open a new client and case"}</button></div></div>`;
}
function docRows(docs, staff) {
  if (!docs.length) return `<div class="empty">No documents yet.</div>`;
  return `<div class="tw"><table class="t"><tr><th>File</th><th>Batch</th><th>Read as</th><th>About</th><th>Reading</th><th>Status</th>${staff ? "<th></th>" : ""}</tr>${docs.map((d) => `<tr>
    <td><a href="/api/original?case=${S.caseId}&doc=${d.doc_id}" target="_blank">${esc(d.original_name)}</a><div class="meta">${d.doc_id} · uploaded by ${d.uploaded_by} as ${esc(d.claimed_type)}${d.for_person ? ` for ${esc(label(d.for_person))}` : ""}</div></td>
    <td>${d.batch}</td><td>${esc(d.kind_seen ?? "—")}</td>
    <td>${d.about ? esc(label(d.about)) : "—"}<div class="meta">${esc(d.association ?? "")}${d.association_reason ? `: ${esc(d.association_reason)}` : ""}</div></td>
    <td>${esc(d.processing)}${d.duplicate_of ? ` of ${d.duplicate_of}` : ""}<div class="meta">${esc(d.reader ?? "")}</div>${(d.issues ?? []).map((i) => `<div class="meta">• ${esc(i)}</div>`).join("")}${staff && d.extraction_file ? `<a class="meta" href="/api/extraction?case=${S.caseId}&doc=${d.doc_id}" target="_blank">reader output</a>` : ""}</td>
    <td><span class="pill ${d.status === "Accepted" ? "ok" : d.status === "Needs replacing" ? "bad" : "info"}">${esc(d.status)}</span>${d.status_reason ? `<div class="meta">${esc(d.status_reason)}</div>` : ""}</td>
    ${staff ? `<td>${["ambiguous", "wrong_person"].includes(d.association) ? `<select data-assign="${d.doc_id}"><option value="">Assign to…</option>${S.st.case.people.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("")}</select>` : ""}
      ${d.processing !== "duplicate" && d.status === "Received" ? `<button class="btn" data-accept="${d.doc_id}">Accept</button> <button class="btn ghost" data-replace="${d.doc_id}">Needs replacing</button>` : ""}</td>` : ""}</tr>`).join("")}</table></div>`;
}
function uploader(role) {
  const people = S.st.case.people;
  return `<div class="card"><h2>Upload documents</h2><p class="hint">Upload what you have now; you can keep answering questions while documents are read. One reader handles client and agent uploads. Reading never accepts a document or a value: ${role === "client" ? "the firm checks everything" : "staff confirm every proposal"}.</p>
  <div class="field"><label for="up-files">Files</label><input type="file" id="up-files" multiple accept="image/png,image/jpeg,application/pdf"></div>
  <div class="field"><label for="up-type">What is it?</label><select id="up-type"><option value="unknown">Not sure (let the reader decide)</option><option value="passport">Passport information page</option><option value="job_offer">Job offer letter</option><option value="birth_certificate">Birth certificate</option></select></div>
  <div class="field"><label for="up-for">For whom?</label><select id="up-for"><option value="">Not sure</option>${people.map((p) => `<option value="${p.id}">${esc(p.label)}</option>`).join("")}</select></div>
  <div class="actions"><button class="btn" data-a="sample-files">Load sample inputs</button><label><input type="checkbox" id="up-new" ${S.st.case.batches ? "" : "checked"}> Start a new batch</label><button class="btn primary" data-a="upload" data-role="${role}">Upload</button>${role === "agent" ? `<button class="btn primary" data-a="process">Read this batch</button><span class="status">Reader: ${esc(S.st.reader_mode)}</span>` : ""}</div><div id="samples"></div></div>`;
}
VIEWS.documents = () => `<div class="crumb">Case ${esc(S.caseId)} › Documents</div><h1>Documents</h1>${uploader("agent")}
  <div class="card"><h2>Files on this case</h2>${docRows(S.st.case.documents, true)}</div>`;
VIEWS.mydocs = () => `<div class="crumb">Client portal › My documents</div><h1>My documents</h1>${checklistCard(true)}${uploader("client")}
  <div class="card"><h2>What we received</h2>${docRows(S.st.case.documents.filter((d) => d.uploaded_by === "client"), false)}</div>`;

function checklistCard(client) {
  const rows = S.st.checklist.filter((r) => client ? r.status !== "Not needed" : true);
  const by = [...new Set(rows.map((r) => r.person))];
  return `<div class="card"><h2>${client ? "Documents we need" : "Checklist"}</h2>${by.map((p) => `<h3>${esc(label(p))}</h3><div class="tw"><table class="t"><tr><th>Document</th><th>Status</th><th>Why</th></tr>${rows.filter((r) => r.person === p).map((r) => `<tr><td>${esc(r.requirement)}<div class="meta">${r.base_or_conditional}</div></td><td><span class="pill ${r.status === "Accepted" ? "ok" : r.status === "Not needed" ? "" : r.status === "Needs replacing" ? "bad" : r.status === "Cannot tell yet" ? "warn" : "info"}">${esc(r.status)}</span></td><td>${esc(r.why)}${r.applies === "cannot_tell" ? `<div class="meta">Decided once we know: ${esc(r.missing.join(", "))}</div>` : ""}</td></tr>`).join("")}</table></div>`).join("")}</div>`;
}
VIEWS.checklist = () => `<div class="crumb">Case ${esc(S.caseId)} › Checklist</div><h1>Checklist and forms</h1>${checklistCard(false)}
  <div class="card"><h2>Forms</h2><div class="tw"><table class="t"><tr><th>Form</th><th>For</th><th>Applies</th><th>Rule</th></tr>${S.st.forms.map((f) => `<tr><td>${esc(f.form)}</td><td>${esc(label(f.person))}</td><td>${f.applies === true ? "<span class='pill ok'>yes</span>" : f.applies === false ? "<span class='pill'>no</span>" : `<span class="pill warn">cannot tell yet</span><div class="meta">needs ${esc(f.missing.join(", "))}</div>`}</td><td class="meta">${esc(f.why)}</td></tr>`).join("")}</table></div></div>`;

// ---------------------------------------------------------------- Case update review (D272): one review-ready update
VIEWS.updates = () => {
  const items = S.st.items, open = items.filter((i) => !i.decision);
  const groups = {};
  for (const i of items) (groups[`${i.person_label} › ${i.section}`] ??= []).push(i);
  const KIND = { new: "New", corroborates: "Agrees", conflict: "Conflict", changed: "Changed (newer version)", unresolved: "Missing / unreadable", internal_conflict: "Document disagrees with itself", relationship_check: "Relationship evidence" };
  const counts = Object.entries(KIND).map(([k, l]) => `${l}: ${open.filter((i) => i.kind === k).length}`).join(" · ");
  return `<div class="crumb">Case ${esc(S.caseId)} › Working view › Case update review</div><h1>Case update review</h1>
  <div class="card"><p><b>${open.length}</b> open of ${items.length} proposals. ${esc(counts)}</p><p class="hint">Clean proposals (new, agreeing) can be confirmed a section at a time. Conflicts, changes and documents that disagree with themselves need an explicit choice; a newer upload never wins on its own.</p></div>
  ${Object.entries(groups).map(([g, list]) => {
    const [about, section] = [list[0].about, list[0].section];
    const clean = list.filter((i) => !i.decision && ["new", "corroborates"].includes(i.kind)).length;
    return `<div class="card"><h2>${esc(g)}</h2>${clean ? `<div class="actions"><button class="btn primary" data-confirm-section="${esc(about)}" data-section="${esc(section)}">Confirm ${clean} clean proposal(s) in this section</button></div>` : ""}
    ${list.map((i) => `<div class="item kind-${i.kind} ${i.decision ? "done" : ""}"><h3>${esc(i.fact_label)} <span class="pill">${esc(KIND[i.kind])}</span>${i.decision ? ` <span class="pill ok">${esc(i.decision.action)} by ${esc(i.decision.by)}</span>` : ""}</h3>
      <div class="cols"><div class="box"><h4>Proposed from ${esc(i.doc_id || "the client")}</h4><b>${esc(show(i.value))}</b>${i.as_printed && i.as_printed !== i.value ? `<div class="meta">as printed: ${esc(i.as_printed)}</div>` : ""}<div class="meta">${esc(i.where ?? "")}${i.confidence ? ` · confidence ${esc(i.confidence)}` : ""}</div>${i.doc_id ? `<a class="meta" target="_blank" href="/api/original?case=${S.caseId}&doc=${i.doc_id}">open the original</a>` : ""}</div>
      <div class="box"><h4>Current value</h4>${i.current ? `<b>${esc(show(i.current.value))}</b><div class="meta">${esc(i.current.status)} · from ${esc(i.current.source.kind)}${i.current.source.doc_id ? ` ${esc(i.current.source.doc_id)}` : ""}</div>` : "<span class='meta'>none yet</span>"}</div></div>
      ${i.reason ? `<p class="meta">${esc(i.reason)}</p>` : ""}
      ${i.decision || S.persona !== "agent" ? "" : `<div class="actions">${["new", "corroborates", "changed", "relationship_check"].includes(i.kind) ? `<button class="btn primary" data-decide="${i.id}" data-action="confirm">Confirm</button>` : ""}
        ${["conflict", "changed"].includes(i.kind) ? `<button class="btn" data-decide="${i.id}" data-action="use_value" data-value="${esc(JSON.stringify(i.value))}">Use the document's value</button><button class="btn" data-decide="${i.id}" data-action="keep_current">Keep the current value</button>` : ""}
        ${["internal_conflict", "unresolved"].includes(i.kind) ? `<input placeholder="Value checked by staff" data-input="${i.id}"><button class="btn" data-decide="${i.id}" data-action="use_value" data-from-input="1">Use this value</button>` : ""}
        <button class="btn ghost" data-decide="${i.id}" data-action="reject">Reject</button></div>`}</div>`).join("")}</div>`;
  }).join("") || "<div class='empty'>No proposals yet. Upload documents and read the batch.</div>"}`;
};

// ---------------------------------------------------------------- Working view: facts by person and section
VIEWS.working = () => {
  const facts = S.st.facts;
  const people = [...new Set(facts.map((f) => f.about))];
  const ci = S.st.condition_inputs;
  return `<div class="crumb">Case ${esc(S.caseId)} › Working view</div><h1>Working view</h1>
  <div class="card"><h2>Staff-held facts</h2><p class="hint">Facts the firm records itself (permit type, employer details it holds, the representative's profile). Entered by staff, so they are verified on entry.</p><div class="actions"><button class="btn" data-a="sample-staff">Load sample inputs</button></div></div>
  ${ci.length ? `<div class="card"><h2>Answers that decide documents and forms</h2><p class="hint">These facts decide whether a form or document applies. Staff answer the ones the firm holds; the client is asked the rest.</p><div class="tw"><table class="t"><tr><th>Fact</th><th>About</th><th>Decides</th><th>Who answers</th><th></th></tr>${ci.map((x) => `<tr><td>${esc(x.label)}<div class="meta">${esc(x.fact)}</div></td><td>${esc(label(x.about))}</td><td class="meta">${esc(x.for.join("; "))}</td><td>${esc(x.collected_from)}</td><td>${/staff/.test(x.collected_from) ? `<select data-staff-fact="${esc(x.fact)}" data-about="${esc(x.about)}"><option value="">Answer…</option><option value="true">Yes</option><option value="false">No</option></select>` : ""}</td></tr>`).join("")}</table></div></div>` : ""}
  ${people.map((p) => { const fs = facts.filter((f) => f.about === p); const secs = [...new Set(fs.map((f) => f.section))];
    return `<div class="card"><h2>${esc(label(p))}</h2>${secs.map((s) => { const list = fs.filter((f) => f.section === s); const prop = list.filter((f) => f.status === "proposed").length;
      return `<h3>${esc(s)} ${prop ? `<button class="btn" data-confirm-section="${esc(p)}" data-section="${esc(s)}">Confirm ${prop} reviewed value(s)</button>` : "<span class='pill ok'>confirmed</span>"}</h3><div class="tw"><table class="t">${list.map((f) => `<tr><td>${esc(f.label)}${f.row !== undefined ? ` (row ${f.row + 1})` : ""}</td><td><b>${esc(show(f.value))}</b></td><td><span class="pill ${f.status === "verified" ? "ok" : "warn"}">${f.status === "verified" ? "verified" : "proposed"}</span></td><td class="meta">${esc(f.source.kind)}${f.source.doc_id ? ` ${esc(f.source.doc_id)}` : ""}${f.verified_by ? ` · confirmed by ${esc(f.verified_by)}` : ""}${f.note ? ` · ${esc(f.note)}` : ""}</td></tr>`).join("")}</table></div>`; }).join("")}</div>`; }).join("") || "<div class='empty'>No facts yet.</div>"}`;
};

// ---------------------------------------------------------------- Client questionnaire
VIEWS.questionnaire = () => {
  const all = qs(S.st).filter((q) => q.status !== "not needed");
  const todo = all.filter((q) => q.status === "needs an answer"), prop = all.filter((q) => q.status === "proposed from a document");
  const field = (q) => { const id = `q|${q.fact}|${q.person}`; const opts = q.value_type === "yes_no" ? ["", "Yes", "No"] : null;
    return `<div class="field"><label for="${esc(id)}">${esc(q.label)}<div class="meta">${esc(q.why)}</div></label>${opts ? `<select id="${esc(id)}" data-q="${esc(q.fact)}" data-p="${esc(q.person)}" data-t="yes_no">${opts.map((o) => `<option ${show(q.value) === o ? "selected" : ""}>${o}</option>`).join("")}</select>` : `<input id="${esc(id)}" data-q="${esc(q.fact)}" data-p="${esc(q.person)}" data-t="${esc(q.value_type)}" value="${esc(typeof q.value === "object" ? "" : q.value ?? "")}">`}${q.status === "proposed from a document" ? `<div class="src">Read from your document, not yet checked by the firm. Correct it if it is wrong.</div>` : ""}</div>`; };
  const shown = S.qAll ? all : [...todo, ...prop];
  const groups = {}; for (const q of shown) (groups[`${q.about} › ${q.section}`] ??= []).push(q);
  return `<div class="crumb">Client portal › Questionnaire</div><h1>Questionnaire</h1>
  <div class="card"><p><b>${todo.length}</b> questions still need an answer; ${prop.length} were read from your documents for you to check; ${all.length - todo.length - prop.length} are answered. Questions that no applicable form needs are not asked.</p><div class="chips"><button class="chip" data-a="q-todo" aria-selected="${!S.qAll}">Still to answer or check</button><button class="chip" data-a="q-all" aria-selected="${!!S.qAll}">All my answers</button></div><div class="actions"><button class="btn" data-a="sample-answers">Load sample inputs</button><button class="btn primary" data-a="save-answers">Save answers</button></div></div>
  ${Object.entries(groups).map(([g, list]) => `<div class="card"><h2>${esc(g)}</h2>${list.map(field).join("")}</div>`).join("") || "<div class='empty'>Nothing left to answer.</div>"}`;
};

// ---------------------------------------------------------------- Forms: inline review, fill, read back, download, approve
VIEWS.forms = () => {
  const forms = S.st.forms.filter((f) => f.applies === true && ["IMM 1295", "IMM 5707", "IMM 5409", "IMM 5476"].includes(f.form));
  const sel = S.formSel ?? (forms[0] ? `${forms[0].form}|${forms[0].person}` : null);
  if (sel && !S.formData) { const [form, person] = sel.split("|"); api(`/api/form?case=${S.caseId}&form=${encodeURIComponent(form)}&person=${person}`).then((d) => { S.formData = d; S.formSel = sel; render(); }); }
  const d = S.formData;
  return `<div class="crumb">Case ${esc(S.caseId)} › Forms › Form review</div><h1>Forms</h1>
  <div class="card"><div class="actions"><label for="form-sel">Form</label><select id="form-sel">${forms.map((f) => `<option value="${f.form}|${f.person}" ${`${f.form}|${f.person}` === sel ? "selected" : ""}>${esc(f.form)} · ${esc(label(f.person))}</option>`).join("")}</select>
  ${S.persona === "agent" ? `<button class="btn primary" data-a="fill">Fill the PDF and check it</button>` : ""}${S.persona === "consultant" && d ? `<button class="btn primary" data-a="approve">Approve these values</button>` : ""}</div>
  ${d ? `<p>${d.boxes.filter((b) => b.status === "filled").length} boxes filled from confirmed facts · ${d.boxes.filter((b) => b.status === "hand").length} to complete by hand · ${d.boxes.filter((b) => b.status === "blank").length} left empty · values <code>${d.values_sha256.slice(0, 10)}</code></p>
  ${(d.approvals ?? []).map((a) => `<div class="meta">${a.status === "approved" ? "Approved" : "Approval withdrawn"} by ${esc(a.by)} at ${esc(a.at)}${a.withdrawn_reason ? `: ${esc(a.withdrawn_reason)}` : ""}</div>`).join("")}
  ${d.checks.length ? `<div class="flags">${d.checks.slice(0, 30).map((c) => `<span class="flag">${esc(c.severity)}: ${esc(c.message)}</span>`).join("")}</div>` : ""}` : ""}<div id="fill-report"></div></div>
  ${d ? `<div class="card"><h2>In the form's order</h2><div class="tw"><table class="t"><tr><th>Box</th><th>Value</th><th>Person · fact</th><th>Source / status</th></tr>${d.boxes.filter((b) => b.status !== "blank").map((b) => `<tr><td>${esc(b.caption || b.box.split(".").slice(-2).join("."))}<div class="meta">${esc(b.box.replace(/form1\[0\]\.|IMM_5707\[0\]\./, ""))}</div></td><td>${b.status === "filled" ? `<b>${esc(b.value)}</b>` : `<span class="pill warn">by hand</span>`}</td><td>${esc(label(b.about))}<div class="meta">${esc(b.fact)}${b.row !== undefined ? ` · row ${b.row + 1}` : ""}</div></td><td class="meta">${b.status === "filled" ? `${esc(b.source)}${b.verified_by ? ` · confirmed by ${esc(b.verified_by)}` : ""}` : esc(b.reason)}</td></tr>`).join("")}</table></div></div>` : "<div class='empty'>Choose a form.</div>"}`;
};

// ---------------------------------------------------------------- events
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.s) { S.screen = b.dataset.s; S.formData = null; render(); $("#main").focus(); return; }
  const a = b.dataset.a, by = USER[S.persona];
  if (a === "sample-lead") { const s = await samples(); const v = Object.fromEntries(s.lead.map((x) => [x.fact, x.value])); const pq = (f, who) => s.answers.find((x) => x.fact === f && x.about === who)?.value ?? "";
    S.lead = { family: v["person.family_name"], given: v["person.given_names"], dob: v["person.date_of_birth"], email: v["person.email_address"], pfamily: pq("person.family_name", "partner"), pgiven: pq("person.given_names", "partner"), cfamily: pq("person.family_name", "child"), cgiven: pq("person.given_names", "child") }; S.dup = null; render(); return; }
  if (a === "check-lead") return act(async () => {
    const lead = Object.fromEntries(["family", "given", "dob", "email", "pfamily", "pgiven", "cfamily", "cgiven"].map((k) => [k, $(`#lead-${k}`)?.value.trim() ?? ""]));
    if (!lead.family || !lead.given) throw new Error("Family and given names are needed");
    S.lead = lead; S.dup = await api("/api/lead/check", lead);
  });
  if (a === "open-case") return act(async () => {
    const L = S.lead, people = [{ id: "client-a", role: "principal", label: `${L.given} ${L.family} (principal applicant)` }];
    if ($("#lead-partner")?.checked !== false) people.push({ id: "partner", role: "partner", label: `${L.pgiven || "Partner"} ${L.pfamily} (partner, also applying)`.replace("  ", " ") });
    if ($("#lead-child")?.checked !== false) people.push({ id: "child", role: "child", label: `${L.cgiven || "Child"} ${L.cfamily} (child, accompanying)`.replace("  ", " ") });
    const lead = [["client-a", "person.family_name", L.family], ["client-a", "person.given_names", L.given], ["client-a", "person.date_of_birth", L.dob], ["client-a", "person.email_address", L.email], ["partner", "person.family_name", L.pfamily], ["partner", "person.given_names", L.pgiven], ["child", "person.family_name", L.cfamily], ["child", "person.given_names", L.cgiven]].filter(([who, , v]) => v && people.some((p) => p.id === who)).map(([about, fact, value]) => ({ fact, about, value }));
    const r = await api("/api/case/open", { people, lead, by, duplicate_decision: b.dataset.dup }); S.caseId = r.case_id; S.screen = "documents"; S.dup = null; S.lead = null; return r;
  }, (r) => `Opened ${r.case_id}`);
  if (a === "sample-files") { const s = await samples(); $("#samples").innerHTML = `<p class="hint">Sample files (made-up synthetic documents). Each goes through the same upload as a file you choose:</p>${s.files.map((f) => `<label style="display:block"><input type="checkbox" data-sample="${esc(f.file)}" ${f.batch === 1 ? "checked" : ""}> ${esc(f.file)} <span class="meta">${esc(f.note)}</span></label>`).join("")}`; return; }
  if (a === "upload") return act(async () => {
    const chosen = [...$("#up-files").files];
    for (const cb of document.querySelectorAll("[data-sample]:checked")) { const blob = await (await fetch(`/api/sample-file?file=${encodeURIComponent(cb.dataset.sample)}`)).blob(); chosen.push(new File([blob], cb.dataset.sample, { type: blob.type })); }
    if (!chosen.length) throw new Error("Choose files first");
    let first = $("#up-new").checked, n = 0;
    for (const f of chosen) { const data = btoa(new Uint8Array(await f.arrayBuffer()).reduce((s, x) => s + String.fromCharCode(x), "")); await api("/api/upload", { case: S.caseId, by, name: f.name, media_type: f.type, data_base64: data, claimed_type: $("#up-type").value, for_person: $("#up-for").value || undefined, new_batch: first }); first = false; n++; }
    return n;
  }, (n) => `${n} file(s) uploaded`);
  if (a === "process") return act(() => api("/api/batch/process", { case: S.caseId, by }), (r) => `Batch ${r.batch}: ${r.files.length} file(s) in ${(r.ms / 1000).toFixed(1)} s`);
  if (b.dataset.decide) { const inp = b.dataset.fromInput ? document.querySelector(`[data-input="${b.dataset.decide}"]`).value.trim() : undefined; const value = b.dataset.value ? JSON.parse(b.dataset.value) : inp || undefined; return act(() => api("/api/decide", { case: S.caseId, ids: [b.dataset.decide], action: b.dataset.action, by, value }), (r) => r.ok ? "Recorded" : r.refused.map((x) => x.reason).join("; ")); }
  if (b.dataset.confirmSection) return act(() => api("/api/confirm-section", { case: S.caseId, about: b.dataset.confirmSection, section: b.dataset.section, by }), (r) => `Confirmed ${r.confirmed} value(s)`);
  if (b.dataset.accept) return act(() => api("/api/document/status", { case: S.caseId, doc_id: b.dataset.accept, status: "Accepted", by }), "Document accepted");
  if (b.dataset.replace) return act(() => api("/api/document/status", { case: S.caseId, doc_id: b.dataset.replace, status: "Needs replacing", reason: "staff asked for a replacement", by }), "Replacement requested");
  if (a === "q-all" || a === "q-todo") { S.qAll = a === "q-all"; render(); return; }
  if (a === "sample-staff") return act(async () => { const s = await samples(); let n = 0; for (const x of [...s.staff_facts, ...s.profile_facts]) { await api("/api/answer", { case: S.caseId, fact: x.fact, about: x.about, value: x.value, by, kind: x.about === "representative" || x.fact.startsWith("representative.") ? "profile" : "staff" }); n++; } return n; }, (n) => `${n} staff and firm-profile value(s) recorded`);
  if (a === "sample-answers") { const s = await samples(); for (const el of document.querySelectorAll("[data-q]")) { const x = s.answers.find((y) => y.fact === el.dataset.q && y.about === el.dataset.p && y.row === undefined); if (x && x.value !== undefined && typeof x.value !== "object") el.value = typeof x.value === "boolean" ? (x.value ? "Yes" : "No") : x.value; } S.useSampleStructured = true; toast("Sample answers filled in (with addresses, phones and history rows); check and save"); return; }
  if (a === "save-answers") return act(async () => {
    let n = 0;
    for (const el of document.querySelectorAll("[data-q]")) { const raw = el.value.trim(); if (!raw) continue; const value = el.dataset.t === "yes_no" ? raw === "Yes" : raw; await api("/api/answer", { case: S.caseId, fact: el.dataset.q, about: el.dataset.p, value, by: "client" }); n++; }
    const s = await samples(); for (const x of s.answers.filter((y) => y.row !== undefined || typeof y.value === "object")) if (S.useSampleStructured) await api("/api/answer", { case: S.caseId, fact: x.fact, about: x.about, row: x.row, value: x.value, by: "client" });
    return n;
  }, (n) => `Saved ${n} answer(s)`);
  if (a === "fill") return act(async () => { const [form, person] = $("#form-sel").value.split("|"); const r = await api("/api/form/fill", { case: S.caseId, form, person, by }); S.lastFill = r.report; S.formData = null; return r; }, (r) => `${r.report.read_back_equal}/${r.report.written} values read back · intact: ${r.report.intact ? "yes" : "NO"}`);
  if (a === "approve") return act(async () => { const [form, person] = $("#form-sel").value.split("|"); S.formData = null; return api("/api/form/approve", { case: S.caseId, form, person, by }); }, "Approved");
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "persona") { S.persona = t.value; S.screen = null; S.formData = null; render(); }
  if (t.id === "case") { S.caseId = t.value; S.formData = null; refresh(); }
  if (t.id === "form-sel") { S.formSel = t.value; S.formData = null; render(); }
  if (t.dataset.assign && t.value) act(() => api("/api/document/assign", { case: S.caseId, doc_id: t.dataset.assign, person: t.value, by: USER[S.persona] }), (r) => `Assigned; ${r.items} proposal(s) added`);
  if (t.dataset.staffFact && t.value) act(() => api("/api/answer", { case: S.caseId, fact: t.dataset.staffFact, about: t.dataset.about, value: t.value === "true", by: USER[S.persona] }), "Recorded");
});
async function samples() { return (S.samples ??= await api("/api/samples")); }
const _render = render;
render = function () { _render(); if (S.screen === "forms" && S.lastFill) { const r = S.lastFill; const el = $("#fill-report"); if (el) el.innerHTML = `<div class="card"><h3>${r.intact ? "Checked PDF ready" : "PDF check failed"}</h3><p>${r.read_back_equal}/${r.written} written values read back equal · original bytes kept: ${r.original_bytes_kept ? "yes" : "no"} · other form data unchanged: ${r.other_data_leaves_changed === 0 ? "yes" : "no"} · IRCC signatures: ${Object.values(r.signatures ?? {}).join(", ")} · ${r.hand} box(es) to complete by hand</p><a class="btn primary" href="/api/download?case=${S.caseId}&file=${encodeURIComponent(r.download)}">Download ${esc(r.download)}</a><p class="meta">Adobe's own Validate and government acceptance are not shown by this check (E10 covers Adobe on one Mac).</p></div>`; } };
$("#persona").value = S.persona;
refresh().catch((e) => { $("#main").innerHTML = `<div class="empty">Could not load: ${esc(e.message)}</div>`; });
