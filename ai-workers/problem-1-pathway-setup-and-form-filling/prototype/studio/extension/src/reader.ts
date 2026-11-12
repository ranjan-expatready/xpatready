// The extension's reader of one live portal screen (F2a; P-66 §1 way A; BR-1, BR-2): the same structure the saved-page
// reader (tools/read_portal_capture.py) gives for the same blank screen, read from the page the person has open.
// It follows the saved-page reader event by event (start tag, text, end tag in document order) with the rules both
// read from contracts/portal-reader-rules.json, so the two cannot drift; tests/check_forms_f2a.ts reads every fixture
// with both. One difference, on purpose: a capture during real work sees a screen a person may have typed into, so
// this reader never reads an answer at all: no value (property or attribute) of a text input, no checked, selected or
// selectedIndex, no text area or editable text, no password or hidden input. The saved-page reader refuses such a
// screen instead; on the same screen made blank both give the same structure. Client details in a label, a title or an
// option (an email address, a long number, a passport-like code) refuse the whole screen in both, as does a label with
// text after its colon; a custom control (role="radio" and the like) is not read in both.
import RULES from "../../contracts/portal-reader-rules.json";

export type ReadOption = { code: string; label: string };
export type ReadInput = { id: string; label: string; type: string; required: boolean; order: number; group?: string; part?: "YYYY" | "MM" | "DD"; help?: string; max_length?: number; min_length?: number; pattern?: string; options?: ReadOption[] };
export type ReadScreen = { title: string; inputs: ReadInput[] };
export type Refusal = { id: string | null; label: string; why: string };
export type ReaderResult = { ok: true; screens: [ReadScreen] } | { ok: false; refused: Refusal[]; title: string } | { ok: false; error: string };

const SKIP_TYPES = new Set(RULES.skip_types), TYPES = new Set(RULES.types), ARIA = new Set(RULES.aria_controls), SKIP = new Set(RULES.skip_containers);
const PARTS = RULES.parts as Record<string, "YYYY" | "MM" | "DD">;
const CLIENT = RULES.client_data.map((c) => [new RegExp(c.pattern), c.what] as const);
const LABEL_ANSWER = new RegExp(RULES.label_answer.pattern);
const PLACEHOLDER = new RegExp(RULES.placeholder.pattern, "i");
const REQUIRED_MARKS = new RegExp(`${RULES.required_marks.prefix}|${RULES.required_marks.suffix}`, "gi");
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** The saved-page reader's clean(): entities are already decoded in the DOM; whitespace runs become one space. */
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const clientData = (t: string | null | undefined) => { for (const [rx, what] of CLIENT) if (rx.test(t ?? "")) return what; return null; };
const placeholder = (label: string) => !label.replace(/^[ -]+|[ -]+$/g, "") || PLACEHOLDER.test(label);
export const searchForm = (a: Attrs) => a.role === "search" || `${a.class ?? ""} ${a.id ?? ""} ${a.name ?? ""}`.toLowerCase().split(/[\s_-]+/).includes("search");

type Attrs = Record<string, string>;
type El = { id: string; name: string | null; type: string; required: boolean; label: string | null; help?: string | null; order?: number; group?: string; part?: "YYYY" | "MM" | "DD"; max_length?: number; min_length?: number; pattern?: string; options?: Opt[]; _described?: string | null; _labelled?: string | null; _dom_id?: string | null; _placeholder?: string | null };
type Opt = { code: string; label: string | null; _dom_id?: string | null };
type LabelEntry = { for: string | null; text: string[]; inputs: (El | Opt)[] };

class Screen {
  title = ""; h1 = ""; inputs: El[] = []; refused: Refusal[] = []; problems: string[] = []; unnamed: string[] = [];
  labelsFor: Record<string, string> = {}; textById: Record<string, string> = {};
  skip = 0; search = 0; cap: string | null = null; buf: string[] = [];
  labelStack: LabelEntry[] = []; legends: string[] = [];
  select: El | null = null; option: { code: string | null; label: string | null } | null = null; textarea = false;
  idStack: [string, string, string[]][] = []; editable: string[] = []; domIds: Record<string, number> = {};

  flush() { const t = clean(this.buf.join("")); this.buf = []; return t; }
  add(el: El, labelledBy?: El | Opt) {
    el.order = this.inputs.length + 1;
    if (this.legends.length && this.legends[this.legends.length - 1]) el.group = this.legends[this.legends.length - 1];
    if (this.labelStack.length) this.labelStack[this.labelStack.length - 1].inputs.push(labelledBy ?? el);
    this.inputs.push(el);
  }

  start(tag: string, a: Attrs) {
    if (SKIP.has(tag)) { this.skip++; return; }
    if (this.skip) return;
    if (tag === "form" && searchForm(a)) { this.search++; return; }
    const role = (a.role ?? "").toLowerCase();
    // A custom control is not read, ticked or not: its question would go missing silently, and its state is an answer
    // this reader never reads (the saved-page reader refuses a ticked one; neither gives a structure).
    if (ARIA.has(role) && !["input", "select", "textarea", "option"].includes(tag) && !this.search) this.problems.push(`it uses a custom control (role="${role}") the reader cannot read; record this screen with the spreadsheet template`);
    // An editable area's text is never read (it is an answer); its tag is tracked so help text never comes from it.
    if ("contenteditable" in a && (a.contenteditable || "true").toLowerCase() !== "false") this.editable.push(tag);
    if (a.id && tag !== "option") this.domIds[a.id] = (this.domIds[a.id] ?? 0) + 1;
    if (a.id && !["input", "select", "textarea", "option"].includes(tag)) this.idStack.push([tag, a.id, []]);
    if (tag === "title") { this.cap = "title"; this.buf = []; }
    else if (tag === "h1" && !this.h1) { this.cap = "h1"; this.buf = []; }
    else if (tag === "fieldset") this.legends.push("");
    else if (tag === "legend") { this.cap = "legend"; this.buf = []; }
    else if (tag === "label") { this.labelStack.push({ for: a.for ?? null, text: [], inputs: [] }); this.cap = "label"; this.buf = []; }
    else if (["input", "select", "textarea"].includes(tag) && !this.search) {
      const typ = tag === "input" ? (a.type || "text").toLowerCase() : tag;
      if (SKIP_TYPES.has(typ)) return;
      const ident = a.id || a.name;
      if (!ident) return; // not a question the extension could find again; an answer in it is never read
      const el: El = { id: ident, name: a.name || null, type: TYPES.has(typ) ? typ : "text", required: "required" in a || a["aria-required"] === "true", label: clean(a["aria-label"]) || null, help: null, _described: a["aria-describedby"] ?? null, _labelled: a["aria-labelledby"] ?? null, _dom_id: a.id ?? null };
      if (/^\d+$/.test(a.maxlength ?? "")) el.max_length = Number(a.maxlength);
      if (/^\d+$/.test(a.minlength ?? "")) el.min_length = Number(a.minlength);
      if (a.pattern) el.pattern = a.pattern;
      if (tag === "input") {
        if (typ === "radio") {
          // One question per radio group; its options are the group's radios. The value attribute of a radio is the
          // option's code (structure), never an answer; whether it is checked is never read.
          const grp = this.inputs.find((x) => x.type === "radio" && x.name && x.name === a.name);
          const opt: Opt = { code: a.value ?? "", label: null, _dom_id: a.id ?? null };
          if (grp) { grp.options!.push(opt); if (this.labelStack.length) this.labelStack[this.labelStack.length - 1].inputs.push(opt); return; }
          el.id = a.name || ident; el.options = [opt]; el.label = clean(a["aria-label"]) || null; el._dom_id = null;
          this.add(el, opt); return;
        }
        this.add(el);
      } else if (tag === "select") { el.options = []; el._placeholder = null; this.select = el; this.add(el); }
      else { this.textarea = true; this.cap = "textarea"; this.buf = []; this.add(el); } // its text is never read
    } else if (tag === "option" && this.select) { this.option = { code: "value" in a ? a.value : null, label: null }; this.cap = "option"; this.buf = []; }
  }

  end(tag: string) {
    if (SKIP.has(tag)) { this.skip = Math.max(0, this.skip - 1); return; }
    if (this.skip) return;
    if (tag === "form" && this.search) { this.search--; return; }
    if (this.editable.length && this.editable[this.editable.length - 1] === tag) this.editable.pop();
    if (this.idStack.length && this.idStack[this.idStack.length - 1][0] === tag) { const [, ident, text] = this.idStack.pop()!; this.textById[ident] = clean(text.join(" ")); }
    if (tag === "title" && this.cap === "title") { this.title = this.flush(); this.cap = null; }
    else if (tag === "h1" && this.cap === "h1") { this.h1 = this.flush(); this.cap = null; }
    else if (tag === "legend" && this.cap === "legend") { const t = this.flush(); this.cap = null; if (this.legends.length) this.legends[this.legends.length - 1] = t; }
    else if (tag === "fieldset" && this.legends.length) this.legends.pop();
    else if (tag === "label" && this.labelStack.length) {
      const lab = this.labelStack.pop()!; const t = clean(`${lab.text.join(" ")} ${this.flush()}`); this.cap = this.labelStack.length ? "label" : null;
      if (lab.for) this.labelsFor[lab.for] = t;
      for (const el of lab.inputs) if (el.label == null) el.label = t;
    } else if (tag === "option" && this.option) {
      const o = this.option; o.label = this.flush(); this.cap = null;
      if (o.code == null) o.code = o.label;
      const sel = this.select!;
      if (!sel.options!.length && sel._placeholder == null && placeholder(o.label)) sel._placeholder = o.label;
      else sel.options!.push({ code: o.code, label: o.label });
      this.option = null;
    } else if (tag === "select") this.select = null;
    else if (tag === "textarea" && this.textarea) { this.buf = []; this.textarea = false; this.cap = null; }
  }

  data(text: string) {
    if (this.skip) return;
    // Text inside an editable area or a text area is an answer: it is never read, not even as help text.
    if (this.editable.length || this.textarea) return;
    for (const e of this.idStack) e[2].push(text);
    if (this.cap) { if (this.cap === "label" && this.labelStack.length) this.labelStack[this.labelStack.length - 1].text.push(text); else this.buf.push(text); }
  }

  finish(): ReadScreen {
    for (const el of this.inputs) {
      // aria-labelledby names the question first (as a browser does), from the text of the elements it points to.
      if (el._labelled) { const named = el._labelled.split(/\s+/).filter(Boolean).map((i) => this.textById[i] ?? "").join(" ").trim(); if (named) el.label = named; }
      if (el.label == null && el._dom_id && el._dom_id in this.labelsFor) el.label = this.labelsFor[el._dom_id];
      for (const o of el.options ?? []) {
        if (o.label == null && o._dom_id && o._dom_id in this.labelsFor) o.label = this.labelsFor[o._dom_id];
        if (!o.label) o.label = o.code;
        delete o._dom_id;
      }
      if (el._described) { const h = el._described.split(/\s+/).filter(Boolean).map((i) => this.textById[i] ?? "").join(" ").trim(); el.help = h || null; }
      // No label, legend, aria-label or aria-labelledby: known only by the page's code (the live reader stops on it).
      if (!el.label) { if (!el.group) this.unnamed.push(el.id); el.label = el.group || el.id; }
      if (el.label.startsWith("*") || el.label.toLowerCase().includes("(required)")) el.required = true;
      el.label = el.label.replace(REQUIRED_MARKS, "").trim();
      const part = PARTS[el.label.toLowerCase().replace(/^[ :]+|[ :]+$/g, "")];
      if (part && el.group) el.part = part;
      delete el._described; delete el._labelled; delete el._dom_id; delete el._placeholder; delete (el as { name?: unknown }).name;
      if (el.help == null) delete el.help;
    }
    const names = Object.fromEntries(this.inputs.map((el) => [el.id, el.label]));
    for (const r of this.refused) r.label = (r.id && names[r.id]) || r.label;
    const title = this.h1 || this.title;
    const texts: [string, string | null | undefined, El | null][] = [["the screen title", title, null], ...this.inputs.flatMap((el) => [el.label, el.group, el.help, ...(el.options ?? []).map((o) => o.label)].map((t) => [`"${el.label}"`, t, el] as [string, string | null | undefined, El]))];
    for (const [where, text, el] of texts) { const what = clientData(text); if (what) this.refused.push({ id: el ? el.id : null, label: el ? el.label! : "screen title", why: `${where} shows ${what}` }); }
    for (const el of this.inputs) if (!["radio", "checkbox", "select"].includes(el.type) && LABEL_ANSWER.test(el.label ?? "")) this.refused.push({ id: el.id, label: el.label!, why: RULES.label_answer.what });
    const ids = new Set(this.inputs.map((el) => el.id));
    const dup = [...new Set([...this.inputs.filter((el) => this.inputs.filter((x) => x.id === el.id).length > 1).map((el) => el.id), ...Object.entries(this.domIds).filter(([i, n]) => n > 1 && ids.has(i)).map(([i]) => i)])].sort();
    if (dup.length) this.problems.push(`the page uses the element id ${dup.slice(0, 3).join(", ")} more than once, so its questions cannot be told apart`);
    if (this.inputs.length > RULES.max_inputs) this.problems.push(`it has ${this.inputs.length} questions; a portal screen has at most ${RULES.max_inputs}`);
    return { title, inputs: this.inputs as unknown as ReadInput[] };
  }
}

/** Attributes as the page's author wrote them (never a property: a typed value lives in the property). */
function attrs(e: Element): Attrs { const a: Attrs = {}; for (const x of Array.from(e.attributes)) a[x.name.toLowerCase()] = x.value; return a; }

/** Start tags, text and end tags in document order, as the saved-page reader's parser sees a saved page. */
function walk(n: Node, s: Screen) {
  for (const c of Array.from(n.childNodes)) {
    if (c.nodeType === 3) { s.data((c as Text).data); continue; }
    if (c.nodeType !== 1) continue;
    const e = c as Element, tag = e.tagName.toLowerCase();
    s.start(tag, attrs(e));
    walk(e, s);
    if (!VOID.has(tag)) s.end(tag);
  }
}

const CONTROLS = "input:not([type=hidden]),select,textarea,[contenteditable],[role=textbox],[role=combobox],[role=listbox],[role=radio],[role=checkbox],[role=switch]";
type ChromeDom = { dom?: { openOrClosedShadowRoot?: (e: Element) => ShadowRoot | null } };
/** A component's own inside, open or closed: in the extension's content script Chrome gives closed ones too. */
const rootOf = (e: Element): ShadowRoot | null => { const dom = (globalThis as unknown as { chrome?: ChromeDom }).chrome?.dom; try { return dom?.openOrClosedShadowRoot ? dom.openOrClosedShadowRoot(e) : e.shadowRoot; } catch { return e.shadowRoot; } };
/** Every element of a page and of the components inside it, however deep. */
function* deep(root: Document | ShadowRoot): Generator<Element> { for (const e of Array.from(root.querySelectorAll("*"))) { yield e; const r = rootOf(e); if (r) yield* deep(r); } }
const visible = (e: Element) => (typeof e.checkVisibility === "function" ? e.checkVisibility() : true) && e.getClientRects().length > 0 && e.getBoundingClientRect().width * e.getBoundingClientRect().height > 0;
/** Where the screen's questions are: inside its form or main area, or large enough to be part of the screen. */
const inScreen = (e: Element, doc: Document) => !!e.closest("form, main, [role=main], fieldset") || e.getBoundingClientRect().width * e.getBoundingClientRect().height >= 0.25 * (doc.defaultView?.innerWidth ?? 1024) * (doc.defaultView?.innerHeight ?? 768);
/** Frames, objects and embeds of a page whose inside this reader cannot read, and same-site frames holding questions. */
function framed(doc: Document, depth = 0): string[] {
  const out: string[] = [];
  for (const f of Array.from(deep(doc)).filter((e) => ["iframe", "frame", "object", "embed"].includes(e.tagName.toLowerCase()))) {
    let inner: Document | null = null;
    try { inner = (f as HTMLIFrameElement).contentDocument ?? null; } catch { inner = null; }
    if (inner && depth < 3) { if (Array.from(deep(inner)).some((e) => e.matches(CONTROLS))) out.push("some of its questions sit inside a frame, and the reader reads the page itself only"); else out.push(...framed(inner, depth + 1)); }
    else if (visible(f) && inScreen(f, doc)) out.push(`part of the screen is ${f.tagName.toLowerCase() === "iframe" || f.tagName.toLowerCase() === "frame" ? "a frame from another site" : "an embedded object"} the reader cannot look into`);
  }
  return out;
}
/** Live page only, a second difference on purpose (P-98: the founder captures real APR screens whose markup nobody has
 *  seen): a saved page has no components, frames or layout, so the saved-page reader never meets these. Markup this
 *  reader cannot see into stops the capture ("not read"), never a screen sent with questions missing or named only by
 *  the page's code. Break 26 Oct: closed and nested components, frames from another site, frames inside frames, objects
 *  and embeds too; an input off the page or hidden from assistive technology (a trap for robots) never stops a screen. */
function liveProblems(doc: Document, unnamed: string[]): string[] {
  const out: string[] = [];
  const hint = "; record this screen with the spreadsheet template";
  if (Array.from(deep(doc)).some((e) => { const r = rootOf(e); return !!r && Array.from(deep(r)).some((x) => x.matches(CONTROLS)); })) out.push(`its questions sit inside page components the reader cannot see into${hint}`);
  const frames = framed(doc);
  if (frames.length) out.push(`${frames[0]}${hint}`);
  const width = Math.max(doc.documentElement.scrollWidth, doc.defaultView?.innerWidth ?? 0);
  const shown = (id: string) => {
    const e = doc.getElementById(id) ?? doc.getElementsByName(id)[0];
    if (!e || !visible(e) || e.closest("[aria-hidden=true]")) return false;
    const r = e.getBoundingClientRect(), x = r.left + (doc.defaultView?.scrollX ?? 0), y = r.top + (doc.defaultView?.scrollY ?? 0);
    return x + r.width > 0 && y + r.height > 0 && x < width; // off the page: a trap for robots, not a question
  };
  const named = unnamed.filter(shown);
  if (named.length) out.push(`${named.length === 1 ? "a question has" : `${named.length} questions have`} no label the reader can find (${named.slice(0, 2).join(", ")})`);
  return out;
}

/** Reads the open screen. Never reads an answer; never changes the page. */
export function readScreen(doc: Document): ReaderResult {
  const s = new Screen();
  walk(doc, s);
  const screen = s.finish();
  if (s.refused.length) return { ok: false, refused: s.refused, title: screen.title };
  const problems = [...s.problems, ...liveProblems(doc, s.unnamed)];
  if (problems.length) return { ok: false, error: [...new Set(problems)].slice(0, 3).join("; ") };
  if (!screen.inputs.length) return { ok: false, error: doc.querySelector("iframe, frame") ? "no questions found on the page itself; they may be inside a frame, which the reader does not read" : "no questions found on this page (a portal screen has inputs; a guide page belongs on the combination's sources)" };
  return { ok: true, screens: [screen] };
}
