import { z } from 'zod';
import { isPrintOnly } from '../layout/box/presence.js';
import { effectiveAccess, type FormDom, type FormNode } from '../model/form/index.js';
import { widgetOf } from '../model/form/value.js';
import type { Picture } from '../model/picture/index.js';
import { validateOf } from '../model/template/index.js';
import { XfaPdfError } from '../pdf/errors.js';
import { MAX_PROBLEMS } from '../wire-limits.js';
import { describeNode } from './context.js';
import type { FormProblem, ProblemList } from './options.js';
import { clip } from './services.js';

/** The two settings of a test that report a problem; `disabled` reports none. */
const severitySchema = z.enum(['error', 'warning']);

/** Containers a field can sit in: the walk goes down through these only (a field's own children hold no fields). */
const CONTAINERS: ReadonlySet<string> = new Set(['form', 'subform', 'subformSet', 'area']);

/** Fields that hold no value the user enters: a button, and a barcode that a script fills. */
const NOT_ENTERED: ReadonlySet<string> = new Set(['button', 'barcode']);

/**
 * Whether `text` fits the `validate` picture: the canonical value can be shown through it, or it parses as it stands. XFA 3.3
 * defines the validation pattern on the `validate` element; the exact text it is applied to (canonical, edit or display) is not
 * settled by anything this engine can check against, so the test is permissive on purpose: only a value that fits neither way is
 * reported. No corpus form has a validate picture, so this is checked by the synthetic tests only.
 */
const fits = (picture: Picture, text: string): boolean => picture.format(text).ok || picture.parse(text).ok;

/** The compiled `validate` picture of `node`, or undefined when it has none or the engine cannot compile it (then the test cannot be made). */
function validationPicture(node: FormNode, dom: FormDom): Picture | undefined {
  const source = validateOf(node.template)?.picture;
  if (source === undefined) return undefined;
  try {
    return dom.pictureFor(source);
  } catch (error) {
    if (error instanceof XfaPdfError) return undefined;
    throw error;
  }
}

/** The problem `node` has, or undefined. At most one: a format test needs a value, a null test needs there to be none. */
function problemOf(node: FormNode, dom: FormDom): Omit<FormProblem, 'som' | 'access'> | undefined {
  if (node.className === 'field' && NOT_ENTERED.has(widgetOf(node) ?? 'defaultUi')) return undefined;
  const nullSeverity = severitySchema.safeParse(node.mandatory);
  if (node.isNull) {
    return nullSeverity.success ? { kind: 'nullTest', severity: nullSeverity.data, message: messageOrNull(node.mandatoryMessage) } : undefined;
  }
  const formatSeverity = severitySchema.safeParse(node.property('validate')?.attr('formatTest') ?? 'warning');
  if (!formatSeverity.success || node.className !== 'field') return undefined;
  const picture = validationPicture(node, dom);
  const raw = node.rawValue;
  if (picture === undefined || raw === null || fits(picture, String(raw))) return undefined;
  return { kind: 'formatTest', severity: formatSeverity.data, message: messageOrNull(node.formatMessage) };
}

const messageOrNull = (text: string): string | null => (text === '' ? null : clip(text));

/**
 * `FormRuntime.problems`: the fields and exclusion groups that fail their own declarative validation, in document order.
 *
 * Presence (XFA 3.3 `presence`, screen view): only a container that is `visible`, under ancestors that are all `visible`, is
 * tested. `hidden`, `invisible` and `inactive` are not drawn (or are excluded from processing altogether), so the user could not
 * find the field to fix it; a `relevant` of `print` makes the container print-only, which the layout also treats as hidden
 * (`layout/box/presence.ts`, after pdf.js `isPrintOnly`). The walk reads the live form: `presence`, `validate.nullTest` and the
 * message texts are what scripts left them, not what the template said. It runs no script and writes nothing. A field whose
 * effective `access` (its own and its ancestors', the most restrictive) is not `open` stays in the list with that access, since the form may still need it and the user cannot fix it by typing.
 */
export function listProblems(dom: FormDom): ProblemList {
  const problems: FormProblem[] = [];
  const stack: { readonly node: FormNode; readonly hidden: boolean }[] = [{ node: dom.form, hidden: false }];
  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const { node } = next;
    const hidden = next.hidden || (node.className !== 'form' && (node.presence !== 'visible' || isPrintOnly(node.attr('relevant'))));
    if (hidden) continue;
    if (node.className === 'field' || node.className === 'exclGroup') {
      const found = problemOf(node, dom);
      if (found !== undefined) {
        if (problems.length >= MAX_PROBLEMS) return { problems, truncated: true };
        problems.push({ som: clip(describeNode(node)), ...found, access: effectiveAccess(node) });
      }
      continue;
    }
    if (!CONTAINERS.has(node.className)) continue;
    for (let i = node.children.length - 1; i >= 0; i -= 1) {
      const child = node.children[i];
      if (child !== undefined) stack.push({ node: child, hidden });
    }
  }
  return { problems, truncated: false };
}
