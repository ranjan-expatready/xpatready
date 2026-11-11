import type { TemplateNode } from './node.js';

export const JAVASCRIPT_CONTENT_TYPE = 'application/x-javascript';
/** XFA's default when a script names no content type. */
export const FORMCALC_CONTENT_TYPE = 'application/x-formcalc';

export type ScriptKind = 'javascript' | 'formcalc' | 'data' | 'other';
export type RunAt = 'client' | 'server' | 'both';

export interface ScriptView {
  readonly node: TemplateNode;
  /** Trimmed and lower-cased; FormCalc when the script names none. */
  readonly contentType: string;
  readonly kind: ScriptKind;
  readonly runAt: RunAt;
  readonly name: string | undefined;
  readonly text: string;
}

export interface EventView {
  readonly node: TemplateNode;
  readonly activity: string;
  readonly ref: string | undefined;
  readonly name: string | undefined;
  readonly script: ScriptView | undefined;
}

export interface CalculateView {
  readonly node: TemplateNode;
  readonly override: string;
  readonly script: ScriptView | undefined;
}

export interface ScriptObject {
  readonly node: TemplateNode;
  readonly name: string;
  readonly contentType: string;
  /** `data` when the text is markup (an XML string kept in a script object, such as a lookup table), never code. */
  readonly kind: ScriptKind;
  readonly text: string;
}

export interface TextVariable {
  readonly node: TemplateNode;
  readonly name: string;
  readonly value: string;
}

export interface Manifest {
  readonly node: TemplateNode;
  readonly name: string;
  readonly id: string;
  /** The `ref` strings, trimmed, in document order. */
  readonly refs: readonly string[];
}

export interface TemplateVariables {
  readonly scriptObjects: readonly ScriptObject[];
  readonly textVariables: readonly TextVariable[];
  readonly manifests: readonly Manifest[];
}

export function effectiveContentType(script: TemplateNode): string {
  const written = script.attr('contentType')?.trim().toLowerCase() ?? '';
  return written === '' ? FORMCALC_CONTENT_TYPE : written;
}

/**
 * True when `text` is markup rather than code: after whitespace (and a byte-order mark) it starts with `<?xml` or with
 * `<` and a letter. A library that opens with an HTML-style comment (`<!--`) or a comparison stays code.
 */
export function looksLikeMarkup(text: string): boolean {
  const start = text.trimStart();
  if (start.startsWith('<?xml')) return true;
  const letter = start.charCodeAt(1);
  return start.startsWith('<') && ((letter >= 65 && letter <= 90) || (letter >= 97 && letter <= 122));
}

function classify(contentType: string, text: string, allowData: boolean): ScriptKind {
  if (allowData && looksLikeMarkup(text)) return 'data';
  if (contentType === JAVASCRIPT_CONTENT_TYPE) return 'javascript';
  return contentType === FORMCALC_CONTENT_TYPE ? 'formcalc' : 'other';
}

function runAtOf(script: TemplateNode): RunAt {
  const written = script.attr('runAt');
  return written === 'server' || written === 'both' ? written : 'client';
}

/** The view of a `script` element. */
export function scriptOf(script: TemplateNode): ScriptView {
  const contentType = effectiveContentType(script);
  return {
    node: script,
    contentType,
    kind: classify(contentType, script.content, false),
    runAt: runAtOf(script),
    name: script.attr('name'),
    text: script.content,
  };
}

const EVENTS = new WeakMap<TemplateNode, readonly EventView[]>();
const VARIABLES = new WeakMap<TemplateNode, TemplateVariables>();
const NO_EVENTS: readonly EventView[] = Object.freeze([]);

/** The events of a container, in document order. The list is cached, so every call returns the same objects. */
export function eventsOf(owner: TemplateNode): readonly EventView[] {
  const known = EVENTS.get(owner);
  if (known !== undefined) return known;
  const events = owner.childrenOfClass('event');
  const views =
    events.length === 0
      ? NO_EVENTS
      : Object.freeze(
          events.map((node): EventView => {
            const script = node.firstChild('script');
            return { node, activity: node.attr('activity') ?? '', ref: node.attr('ref'), name: node.attr('name'), script: script === undefined ? undefined : scriptOf(script) };
          }),
        );
  EVENTS.set(owner, views);
  return views;
}

/** The `calculate` of a container, or undefined. `override` defaults to `disabled`. */
export function calculateOf(owner: TemplateNode): CalculateView | undefined {
  const node = owner.firstChild('calculate');
  if (node === undefined) return undefined;
  const script = node.firstChild('script');
  return { node, override: node.attr('override') ?? 'disabled', script: script === undefined ? undefined : scriptOf(script) };
}

/**
 * The script objects, text variables and manifests in a container's `variables` block, in document order. Other
 * children of `variables` are not listed here (`assertSupported` refuses them). Cached per container.
 */
export function variablesOf(owner: TemplateNode): TemplateVariables {
  const known = VARIABLES.get(owner);
  if (known !== undefined) return known;
  const scriptObjects: ScriptObject[] = [];
  const textVariables: TextVariable[] = [];
  const manifests: Manifest[] = [];
  for (const block of owner.childrenOfClass('variables')) {
    for (const node of block.children) {
      if (node.className === 'script') {
        const contentType = effectiveContentType(node);
        scriptObjects.push({ node, name: node.name, contentType, kind: classify(contentType, node.content, true), text: node.content });
      } else if (node.className === 'text') {
        textVariables.push({ node, name: node.name, value: node.content });
      } else if (node.className === 'manifest') {
        manifests.push({ node, name: node.name, id: node.attr('id') ?? '', refs: Object.freeze(node.childrenOfClass('ref').map((ref) => ref.content.trim())) });
      }
    }
  }
  const variables: TemplateVariables = Object.freeze({
    scriptObjects: Object.freeze(scriptObjects),
    textVariables: Object.freeze(textVariables),
    manifests: Object.freeze(manifests),
  });
  VARIABLES.set(owner, variables);
  return variables;
}
