import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as api from '../index.js';
import type {
  BarcodePayloads,
  EventFields,
  EventResult,
  FormRuntime,
  FormRuntimeOptions,
  HostIdentity,
  LoadReport,
  MessageBoxCall,
  MessageRecord,
  NoteRecord,
  PackFormDescriptor,
  PdfDict,
  PdfIndirect,
  PdfName,
  PdfRef,
  PdfStream,
  PdfString,
  PdfValue,
  RenderItem,
  RenderPage,
  RenderTree,
  RuntimeLimits,
  RuntimeState,
  SetValueResult,
  UnsupportedRecord,
  ValidateResult,
  XfaErrorCode,
  XfaPacket,
  XfaPdf,
} from '../index.js';
import { datasetsXml } from '../model/form/__tests__/helpers.js';
import { tpl } from '../model/template/__tests__/helpers.js';
import { buildXfaPdf, packet } from './fixtures/build-xfa-pdf.js';

/** The whole public surface of the package, values and types. A name added or removed here is a deliberate API change. */
const PUBLIC_VALUES = ['MAX_PDF_BYTES', 'RENDER_TREE_VERSION', 'XfaPdfError', 'createFormRuntime', 'dashArrayOf', 'openXfaPdf', 'packFormDescriptorSchema', 'renderTreeSchema'];
const PUBLIC_TYPES = [
  'BarcodePayloads', 'ClearButtonReport', 'EventFields', 'EventResult', 'FormProblem', 'FormRuntime', 'FormRuntimeOptions', 'HostIdentity', 'HostRequestRecord', 'LoadReport', 'MessageBoxCall',
  'MessageRecord', 'NoteRecord', 'PackFormDescriptor', 'ProblemList', 'PacketReplacement', 'PdfDict', 'PdfIndirect', 'PdfName', 'PdfRef', 'PdfStream', 'PdfString', 'PdfValue',
  'RenderItem', 'RenderPage', 'RenderTree', 'RuntimeLimits', 'RuntimeState', 'SavedFormState', 'SetValueResult', 'UnsupportedRecord', 'UserAction', 'UserActionCheck', 'ValidateResult', 'XfaErrorCode', 'XfaPacket', 'XfaPdf',
];

/** Names exported by `src/index.ts`, read from the source text so type-only exports are covered too. */
function exportedNames(): string[] {
  const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
  const names: string[] = [];
  for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from/g)) {
    for (const part of (match[1] ?? '').split(',')) {
      const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
      if (name !== undefined && name !== '') names.push(name);
    }
  }
  return names.sort();
}

describe('the public API surface (A2)', () => {
  it('exports exactly the agreed runtime values: nothing from model/ or script/ internals leaks', () => {
    expect(Object.keys(api).sort()).toEqual(PUBLIC_VALUES);
  });

  it('exports exactly the agreed names, values and types, in src/index.ts', () => {
    expect(exportedNames()).toEqual([...PUBLIC_VALUES, ...PUBLIC_TYPES].sort());
  });

  it('the render tree surface is the schema, the version, the dash rule and three types; nothing else from src/layout leaks (W02-T12)', () => {
    const source = readFileSync(new URL('../index.ts', import.meta.url), 'utf8');
    const layoutModules = [...source.matchAll(/from\s+'(\.\/layout\/[^']+)'/g)].map((match) => match[1]);
    expect([...new Set(layoutModules)].sort()).toEqual(['./layout/graphics/stroke.js', './layout/render-tree.js']);
    for (const internal of ['buildRenderTree', 'layoutAccessOf', 'createImageContext', 'graphicsOfBox', 'layoutBoxGraphics', 'layoutPages', 'toTextItem', 'LayoutSession', 'strokeParts']) {
      expect(Object.keys(api)).not.toContain(internal);
    }
    expect(api.RENDER_TREE_VERSION).toBe(2);
    expect(api.dashArrayOf('dashed', 2)).toEqual([6, 4]);
    expectTypeOf<FormRuntime['layout']>().returns.toEqualTypeOf<RenderTree>();
    expectTypeOf<RenderTree['pages'][number]>().toEqualTypeOf<RenderPage>();
    expectTypeOf<RenderPage['items'][number]>().toEqualTypeOf<RenderItem>();
    expectTypeOf<ReturnType<typeof api.renderTreeSchema.parse>>().toEqualTypeOf<RenderTree>();
  });

  it('the exported types describe the runtime that createFormRuntime returns', () => {
    expectTypeOf(api.createFormRuntime).parameters.toEqualTypeOf<[XfaPdf, FormRuntimeOptions]>();
    expectTypeOf(api.createFormRuntime).returns.resolves.toEqualTypeOf<FormRuntime>();
    expectTypeOf<FormRuntime['validate']>().returns.toEqualTypeOf<ValidateResult>();
    expectTypeOf<FormRuntime['validate']>().parameters.toEqualTypeOf<[PackFormDescriptor]>();
    expectTypeOf<FormRuntime['save']>().returns.resolves.toEqualTypeOf<Uint8Array>();
    expectTypeOf<FormRuntimeOptions['host']>().toEqualTypeOf<HostIdentity>();
    expectTypeOf<FormRuntimeOptions['limits']>().toEqualTypeOf<RuntimeLimits | undefined>();
    expectTypeOf<FormRuntime['notes']>().toEqualTypeOf<readonly NoteRecord[]>();
    expectTypeOf<FormRuntime['unsupported']>().toEqualTypeOf<readonly UnsupportedRecord[]>();
    expectTypeOf<XfaPdf['packets']>().toEqualTypeOf<readonly XfaPacket[]>();
    expectTypeOf<XfaPdf['source']>().toEqualTypeOf<Uint8Array>();
    expectTypeOf<XfaPdfError>().toHaveProperty('code').toEqualTypeOf<XfaErrorCode>();
    // Referenced so the unused-import rule keeps every public type under test.
    expectTypeOf<[BarcodePayloads, EventFields, EventResult, LoadReport, MessageBoxCall, MessageRecord, RuntimeState, SetValueResult]>().not.toBeAny();
    expectTypeOf<[PdfDict, PdfIndirect, PdfName, PdfRef, PdfStream, PdfString, PdfValue]>().not.toBeAny();
  });

  it('the one error class is a real class and a caller needs a single instanceof for every failure', () => {
    expect(new api.XfaPdfError('MALFORMED', 'x')).toBeInstanceOf(Error);
  });
});

type XfaPdfError = InstanceType<typeof api.XfaPdfError>;

describe('Zod rejection of bad options at the public boundary', () => {
  const host: HostIdentity = { name: 'N', appType: 'A', version: '1', variation: 'V', platform: 'P', language: 'XX' };
  const clock = { now: (): number => 0 };
  const openForm = () => api.openXfaPdf(buildXfaPdf({ packets: [packet('template', tpl('')), packet('datasets', datasetsXml('<form1/>'))] }));

  const bad: readonly (readonly [string, unknown])[] = [
    ['options that are not an object', null],
    ['no host', { clock }],
    ['an unknown option key', { host, clock, extra: true }],
    ['a host identity with an unknown field', { host: { ...host, vendor: 'x' }, clock }],
    ['a host identity field that is not a string', { host: { ...host, version: 1 }, clock }],
    ['a clock without now()', { host, clock: {} }],
    ['strict that is not a boolean', { host, clock, strict: 'yes' }],
    ['a timezone that does not exist', { host, clock, timezone: 'Nowhere/Land' }],
    ['a limit above its ceiling', { host, clock, limits: { maxCalcPasses: 1_000_000 } }],
    ['an unknown limit', { host, clock, limits: { bogus: 1 } }],
    ['the retired layout option (page numbers come from the real layout)', { host, clock, layout: { page: 1 } }],
    ['a message-box answer that is not a function', { host, clock, messageBoxResult: 1 }],
  ];

  it.each(bad)('%s is INVALID_OPTIONS (an XfaPdfError), before anything runs', async (_label, options) => {
    const error = await api.createFormRuntime(await openForm(), options as never).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(api.XfaPdfError);
    expect(error).toMatchObject({ code: 'INVALID_OPTIONS' });
  });

  it('a first argument that is not an opened XfaPdf is INVALID_ARGUMENT', async () => {
    for (const notPdf of [null, undefined, {}, 'x', { packet: 1 }]) {
      const error = await api.createFormRuntime(notPdf as never, { host, clock }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(api.XfaPdfError);
      expect(error).toMatchObject({ code: 'INVALID_ARGUMENT' });
    }
  });

  it('good options create a runtime', async () => {
    const runtime = await api.createFormRuntime(await openForm(), { host, clock });
    expect(runtime.state).toBe('created');
    runtime.dispose();
  });

  it('the exported pack descriptor schema accepts a descriptor and rejects an unknown key, a missing key and an empty text', () => {
    const descriptor: PackFormDescriptor = { validateButton: 'a.b', validatedFlag: 'a.c', validatedValue: 'Yes', firstMissingField: 'g', barcodes: 'B' };
    expect(api.packFormDescriptorSchema.parse(descriptor)).toEqual(descriptor);
    expect(api.packFormDescriptorSchema.safeParse({ ...descriptor, extra: 1 }).success).toBe(false);
    expect(api.packFormDescriptorSchema.safeParse({ ...descriptor, barcodes: undefined }).success).toBe(false);
    expect(api.packFormDescriptorSchema.safeParse({ ...descriptor, validatedValue: '' }).success).toBe(false);
  });
});
