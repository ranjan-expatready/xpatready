import { afterEach } from 'vitest';
import { XfaPdfError } from '../../pdf/errors.js';
import { openXfaPdf } from '../../xfa-pdf.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { createFormRuntime } from '../runtime.js';
import type { FormRuntime, FormRuntimeOptions, HostIdentity } from '../options.js';

/** A neutral fixture identity: it names no real product, so no form branch keyed on a vendor name can fire. */
export const NEUTRAL_HOST: HostIdentity = {
  name: 'TestHost',
  appType: 'TestApp',
  version: '1.0',
  variation: 'Test',
  platform: 'TestOS',
  language: 'XX',
};

/** 2026-06-15T12:00:00Z: far from a year or day boundary in every timezone. */
export const FIXED_CLOCK = { now: (): number => Date.UTC(2026, 5, 15, 12, 0, 0) };

const open: FormRuntime[] = [];

afterEach(() => {
  for (const runtime of open.splice(0)) runtime.dispose();
});

/** XML-escapes script text so it can sit inside a template packet. */
export const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** An `event` element carrying a JavaScript body. `attrs` go on the event (e.g. ` ref="$form"`), `scriptAttrs` on the script. */
export const onEvent = (activity: string, body: string, attrs = '', scriptAttrs = ''): string =>
  `<event activity="${activity}"${attrs}><script contentType="application/x-javascript"${scriptAttrs}>${esc(body)}</script></event>`;

/** A `calculate` element with a JavaScript (default) or FormCalc body. */
export const calc = (body: string, formcalc = false, attrs = ''): string =>
  `<calculate${attrs}><script${formcalc ? '' : ' contentType="application/x-javascript"'}>${esc(body)}</script></calculate>`;

export const textField = (name: string, extra = ''): string => `<field name="${name}"><ui><textEdit/></ui>${extra}</field>`;

/** A `variables` block of script objects: `[name, source]` pairs, plus raw extra content. */
export const lib = (name: string, source: string): string =>
  `<script name="${name}" contentType="application/x-javascript">${esc(source)}</script>`;
export const variables = (...inner: string[]): string => `<variables>${inner.join('')}</variables>`;

export interface Built {
  readonly runtime: FormRuntime;
}

const baseOptions = (): FormRuntimeOptions => ({ host: NEUTRAL_HOST, clock: FIXED_CLOCK, strict: true });

/** Opens a synthetic one-subform form (`form1`) as a PDF and creates its runtime; disposed after each test. */
export async function makeRuntime(
  body: string,
  extra: { data?: string; lov?: string; options?: Partial<FormRuntimeOptions>; rootAttrs?: string; acroFormExtra?: string } = {},
): Promise<FormRuntime> {
  // `rootAttrs` go on the root subform (`layout="tb"` for a form that is paginated).
  const template = extra.rootAttrs === undefined ? tpl(body) : tpl(body).replace('<subform name="form1">', `<subform name="form1" ${extra.rootAttrs}>`);
  const bytes = buildXfaPdf({
    ...(extra.acroFormExtra === undefined ? {} : { acroFormExtra: extra.acroFormExtra }),
    packets: [packet('template', template), packet('datasets', datasetsXml(extra.data ?? '<form1/>', extra.lov ?? ''))],
  });
  const pdf = await openXfaPdf(bytes);
  const runtime = await createFormRuntime(pdf, { ...baseOptions(), ...extra.options });
  open.push(runtime);
  return runtime;
}

/** Same, then `load()`. */
export async function loaded(body: string, extra: Parameters<typeof makeRuntime>[1] = {}): Promise<FormRuntime> {
  const runtime = await makeRuntime(body, extra);
  runtime.load();
  return runtime;
}

/** Runs `fn` and returns what it threw (undefined if nothing); fails loudly on a non-Error throw. */
export function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

export const isPdfError = (e: unknown, code: string): boolean => e instanceof XfaPdfError && e.code === code;
