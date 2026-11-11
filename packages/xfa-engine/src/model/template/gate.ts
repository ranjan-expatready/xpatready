import { XfaPdfError } from '../../pdf/errors.js';
import { safeText } from '../../pdf/safe-text.js';
import { isBareSomReference } from './bare-som.js';
import type { TemplateModel } from './build.js';
import type { TemplateNode } from './node.js';
import { diagnosticPath } from './path.js';
import { FORMCALC_CONTENT_TYPE, JAVASCRIPT_CONTENT_TYPE, effectiveContentType, looksLikeMarkup } from './scripts.js';

const TEMPLATE_NAMESPACE_PREFIX = 'http://www.xfa.org/schema/xfa-template/';

/** What the engine models of a `variables` block; any other typed variable would need its own value handling. */
const SUPPORTED_VARIABLES: ReadonlySet<string> = new Set(['script', 'text', 'manifest']);

function unsupported(feature: string, node?: TemplateNode): XfaPdfError {
  const where = node === undefined ? '' : ` at ${diagnosticPath(node)}`;
  return new XfaPdfError('UNSUPPORTED_FEATURE', `Unsupported XFA feature: ${feature}${where}`);
}

/** True for `2.<digits>/` or `3.<digits>/`: the part of a template namespace after the shared prefix. */
function isSupportedVersion(rest: string): boolean {
  if (rest.length < 4 || (rest[0] !== '2' && rest[0] !== '3') || rest[1] !== '.' || rest[rest.length - 1] !== '/') return false;
  for (let i = 2; i < rest.length - 1; i += 1) {
    const c = rest.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function nonEmpty(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

/**
 * An `occur` is accepted only when its effective min, max and initial are all 1 (XFA 3.3 p.786: min and initial
 * default to 1, max defaults to min). Anything else can repeat, or leave out, a subform or page area, which the merge
 * does not implement. Applies under every parent, page areas included.
 */
function occurRefusal(node: TemplateNode): string | undefined {
  const written = (name: string): string | undefined => node.attr(name)?.trim();
  const min = written('min') ?? '1';
  const effective = { min, max: written('max') ?? min, initial: written('initial') ?? '1' };
  for (const [name, value] of Object.entries(effective)) {
    const isNumber = value !== '' && [...value].every((c) => c >= '0' && c <= '9');
    if (!isNumber || Number(value) !== 1) return `repeating or optional occur (${name}="${safeText(value)}")`;
  }
  return undefined;
}

function bindRefusal(node: TemplateNode): string | undefined {
  if (nonEmpty(node.attr('ref'))) return 'explicit bind ref';
  const match = node.attr('match');
  return match === 'global' || match === 'dataRef' ? `bind match="${match}"` : undefined;
}

function scriptRefusal(node: TemplateNode): string | undefined {
  // A server script never runs here, so its language does not matter.
  if (node.attr('runAt') === 'server') return undefined;
  // A script object whose text is markup is data (a lookup table kept as a string), never evaluated.
  if (node.parent?.className === 'variables' && looksLikeMarkup(node.content)) return undefined;
  const contentType = effectiveContentType(node);
  if (contentType === JAVASCRIPT_CONTENT_TYPE) return undefined;
  if (contentType !== FORMCALC_CONTENT_TYPE) return `script contentType "${safeText(contentType)}"`;
  const text = node.content.trim();
  return text === '' || isBareSomReference(text) ? undefined : 'FormCalc script that is not a bare SOM reference';
}

function variablesRefusal(node: TemplateNode): string | undefined {
  const other = node.children.find((child) => !SUPPORTED_VARIABLES.has(child.className));
  return other === undefined ? undefined : `variables child <${safeText(other.className)}>`;
}

/** The feature that makes `node` unsupported, and the node to point at, or undefined. */
function refusalFor(node: TemplateNode): readonly [feature: string, at: TemplateNode] | undefined {
  if (nonEmpty(node.attr('use'))) return ['use reference to a prototype', node];
  if (nonEmpty(node.attr('usehref'))) return ['usehref reference', node];
  let feature: string | undefined;
  switch (node.className) {
    case 'subformSet':
      feature = 'subformSet';
      break;
    case 'proto':
      feature = node.children.length > 0 ? 'proto with content' : undefined;
      break;
    case 'occur':
      feature = occurRefusal(node);
      break;
    case 'bind':
      feature = bindRefusal(node);
      break;
    case 'script':
      feature = scriptRefusal(node);
      break;
    case 'variables':
      feature = variablesRefusal(node);
      break;
    default:
      feature = undefined;
  }
  return feature === undefined ? undefined : [feature, node];
}

/**
 * Refuses a template that uses what this engine does not implement, so a new form version is caught when it is
 * uploaded rather than rendered wrongly (fail closed). Throws `UNSUPPORTED_FEATURE` naming the first offender in
 * document order and its path: a template namespace outside 2.x/3.x, `subformSet`, a subform or other container with
 * `occur` max other than 1, `proto` content, `use`/`usehref`, an explicit `bind` ref or global/dataRef match, a script
 * of an unknown language, a FormCalc script that is not a single bare SOM reference (plan decision D5), and a
 * `variables` child other than script, text and manifest. Server-side scripts are skipped: they never run here.
 */
export function assertSupported(model: TemplateModel): void {
  const { namespace } = model;
  const version = namespace.startsWith(TEMPLATE_NAMESPACE_PREFIX) ? namespace.slice(TEMPLATE_NAMESPACE_PREFIX.length) : undefined;
  if (version === undefined || !isSupportedVersion(version)) {
    throw unsupported(`template namespace "${safeText(namespace)}" (only XFA template 2.x and 3.x are supported)`);
  }
  for (const node of model.nodes) {
    const refusal = refusalFor(node);
    if (refusal !== undefined) throw unsupported(refusal[0], refusal[1]);
  }
}
