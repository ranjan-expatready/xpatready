# P-47 — One questionnaire renderer, production grade (PQR · SQR · agent view)

Adopted 21 Oct 2026 (founder, R-52). One component, driven only by the released configuration, used everywhere a question is asked or a fact is shown. Built once, it works for every combination; depth is proven on the reference combination **Family sponsorship › Spouse or partner › Outside Canada**.

## Three modes of one renderer
| Mode | Who | Shape |
|---|---|---|
| **PQR** (pre-qualification) | Prospect or salesperson | Short, one page, only questions flagged "pre-qualification"; ends with a plain result ("Looks eligible · next: book a consultation"); answers carry into the case |
| **SQR** (questionnaire) | Client and family, phone first | One section at a time, one question group per screen on a phone; progress, save and resume, "answering for" switch |
| **Agent view** | Case officer, desktop | All sections on one page, dense, editable; each fact shows its source and the form boxes it fills; document checklist beside it |

## Question types (each with its validation built in)
Short text · long text · number · money · **date as day / month / year** · yes/no · single choice (radio up to 5, select above) · multi choice · country (searchable) · phone (country code + number) · email · **address group** · **person name group** (family / given, "no given name" option) · **repeating group** (addresses, jobs, trips, children: add, edit, remove) · **period history** with gap check ("10 years, no gaps"; gaps shown in plain words) · **document upload** (camera on phone, drag on desktop; AI-read status) · declaration (checkbox with full text).

## Validation (three tiers, P-14)
1. **Field** — on leaving the field and on Continue: required, format, range, box length taken from the form. Message under the field, in plain words, saying how to fix it.
2. **Section** — consistency inside and across people (expiry after issue; marriage after both births; history covers 10 years). Error summary at the top of the section linking to each field (GOV.UK pattern).
3. **Independent review** — AI, run on demand by the officer; never changes data.
Validation never blocks saving; it blocks "submit" or "ready to file" only.

## Rules (shown as behaviour, authored as data)
Show/hide questions and whole sections · make required · ask per person or once per couple/family · add or remove a document with a "because" reason · repeat a group per person. A change of answer updates questions, documents and forms at once, with a message.

## Look and feel
Team tokens; one column on a phone, max 640 px reading width on desktop questionnaire; labels above fields; help text under labels; one primary button per screen; 44 px targets; error colour plus icon plus text; WCAG 2.2 AA; no placeholder-as-label; no auto-advance; sticky Save and continue on phone; "Saved" indicator; Back always available.

## Scope in the prototype
The renderer and every type above are built once; the reference combination gets complete sections, rules, validations and documents; the other demo combinations use whatever their AI draft produced, through the same renderer. Board: canvas page "Journey v2", artboard "Questionnaire kit"; source `product/design/questionnaire-kit.dc.html`.
