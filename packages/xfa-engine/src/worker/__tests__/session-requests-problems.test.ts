import { describe, expect, it } from 'vitest';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { parseRequest, PROTOCOL_VERSION } from '../protocol.js';
import { connect, expectKind, on, openBody, T0, T1, textField } from './support.js';

/**
 * E8 to E10 over the protocol, on a small fictitious form: buttons that ask the host for something (print, a URL, a text
 * prompt), required fields and a required exclusion group, the Validate-pack nodes, and a clear button.
 */
const button = (name: string, y: number, script: string): string => `<field name="${name}" w="100pt" h="20pt" y="${y}pt"><ui><button/></ui>${on('click', script)}</field>`;
const required = (name: string, y: number, attrs = ''): string => `<field name="${name}" w="100pt" h="20pt" y="${y}pt" ${attrs}><ui><textEdit/></ui><validate nullTest="error"><message><text name="nullTest">Fill ${name}</text></message></validate></field>`;
const radio = (name: string): string => `<field name="${name}" w="20pt" h="20pt"><ui><checkButton/></ui><items><text>${name}</text></items></field>`;

function formPdf(): Uint8Array {
  const body = [
    button('printBtn', 0, 'xfa.host.print(false, 1, 3);'),
    button('mixed', 30, 'app.launchURL("https://example.invalid/help", true); app.response("Name?", "Ask", "Pat"); xfa.host.messageBox("Done", "Info", 3, 0);'),
    button('erase', 60, 'name.rawValue = null;'),
    required('name', 90),
    required('city', 120),
    `<exclGroup name="pick" y="150pt" w="40pt" h="20pt"><validate nullTest="error"/>${radio('yes')}${radio('no')}</exclGroup>`,
    required('hiddenOne', 180, 'presence="hidden"'),
    textField('btn', 210),
    textField('flag', 240),
    textField('fm', 270),
    '<subform name="bcs" layout="tb"><field name="bc1" w="100pt" h="20pt"><ui><textEdit/></ui></field></subform>',
  ].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

const PACK = { validateButton: 'btn', validatedFlag: 'flag', validatedValue: 'Yes', firstMissingField: 'fm', barcodes: 'bcs' };
const SOM = (name: string): string => `xfa[0].form[0].form1[0].${name}[0]`;
const click = (som: string, at = T0): Record<string, unknown> => ({ kind: 'op', op: { kind: 'event', som, activity: 'click', at } });
const pdf = formPdf();

describe('E8: requests with no effect on the form reach the client in `applied.requests`', () => {
  it('a print click answers the print request, with the node and event, and nothing else: no tree, no box, no focus', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const applied = expectKind(await client.send(click('printBtn')), 'applied');
    expect(applied.requests).toEqual([
      { kind: 'print', ui: false, start: 1, end: 3, noCancelDialog: true, shrinkToFit: true, asImage: true, reverse: false, annotations: true, event: 'click', nodeSom: SOM('printBtn') },
    ]);
    expect(applied.renderTree).toBeUndefined();
    expect(applied.messages).toEqual([]);
    expect(applied.focus).toEqual([]);
    expect(applied.opCount).toBe(1);
  });

  it('requests, messages and focus of one op arrive together and in order; an op that asks nothing has no `requests` key at all (older clients see the same reply as before)', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const mixed = expectKind(await client.send(click('mixed')), 'applied');
    expect(mixed.requests?.map((r) => r.kind)).toEqual(['launchURL', 'response']);
    expect(mixed.messages).toMatchObject([{ text: 'Done', title: 'Info', icon: 3, buttons: 0 }]);
    const quiet = expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'name', value: 'Pat', at: T1 } }), 'applied');
    expect(Object.keys(quiet)).not.toContain('requests');
    // Each op reports only its own: the print click after the mixed one does not repeat the earlier requests.
    const again = expectKind(await client.send(click('printBtn', T1)), 'applied');
    expect(again.requests).toHaveLength(1);
  });

  it('a request is not state: a log that holds the click replays to the same form the live run had, and the replay reports no requests', async () => {
    const live = connect();
    await live.send(openBody(pdf));
    const ops = [
      { kind: 'setValue', som: 'name', value: 'Pat', at: T0 },
      { kind: 'event', som: 'printBtn', activity: 'click', at: T0 },
      { kind: 'event', som: 'mixed', activity: 'click', at: T1 },
    ];
    for (const op of ops) expectKind(await live.send({ kind: 'op', op }), 'applied');
    const liveTree = expectKind(await live.send({ kind: 'layout' }), 'laidOut').renderTree;
    const replay = connect();
    const opened = expectKind(await replay.send(openBody(pdf, { ops })), 'opened');
    expect(opened.renderTree).toEqual(liveTree);
    expect(opened.opCount).toBe(3);
    expect(Object.keys(opened)).not.toContain('requests');
  });
});

describe('E8: requests made while the form loads (`opened.requests`) and by the save handling (`downloaded.requests`)', () => {
  const asking = (): Uint8Array => {
    const body = [
      textField('onLoad', 0, on('initialize', 'xfa.host.print();')),
      textField('btn', 30),
      textField('flag', 60),
      textField('fm', 90),
      '<subform name="bcs" layout="tb"><field name="bc1" w="100pt" h="20pt"><ui><textEdit/></ui></field></subform>',
      textField('hook', 120, on('preSave', 'app.launchURL("https://example.invalid/saved");')),
      button('later', 150, 'app.response("Q");'),
    ].join('');
    const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
    return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
  };

  it('a request raised while the form loads is on `opened`; a replayed op\'s request is not repeated there; a form that asks nothing has no key', async () => {
    const bytes = asking();
    const opened = expectKind(await connect().send(openBody(bytes)), 'opened');
    expect(opened.requests).toMatchObject([{ kind: 'print', event: 'initialize', nodeSom: SOM('onLoad') }]);
    const replayed = expectKind(await connect().send(openBody(bytes, { ops: [{ kind: 'event', som: 'later', activity: 'click', at: T0 }] })), 'opened');
    expect(replayed.requests?.map((r) => r.kind)).toEqual(['print']);
    expect(Object.keys(expectKind(await connect().send(openBody(pdf)), 'opened'))).not.toContain('requests');
  });

  it('the save handling\'s requests come back on `downloaded`, once, and the next download has none of the earlier ones', async () => {
    const client = connect();
    await client.send(openBody(asking(), { pack: PACK }));
    const first = expectKind(await client.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(first.requests).toMatchObject([{ kind: 'launchURL', url: 'https://example.invalid/saved', event: 'preSave', nodeSom: SOM('hook') }]);
    expect(first.op).toEqual({ kind: 'preSave', at: T1 });
    const second = expectKind(await client.send({ kind: 'download', at: T1 }), 'downloaded');
    expect(second.requests).toHaveLength(1);
    const plain = connect();
    await plain.send(openBody(asking()));
    expect(Object.keys(expectKind(await plain.send({ kind: 'download', at: T1 }), 'downloaded'))).not.toContain('requests');
  });
});

describe('E10: the `problems` request lists every field failing its declarative validation', () => {
  it('answers the list in document order with the form\'s own message; a hidden field is not in it; an exclusion group is one entry', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const listed = expectKind(await client.send({ kind: 'problems' }), 'problemList');
    expect(listed).toMatchObject({ truncated: false });
    expect(listed.problems).toEqual([
      { som: SOM('name'), kind: 'nullTest', severity: 'error', message: 'Fill name', access: 'open' },
      { som: SOM('city'), kind: 'nullTest', severity: 'error', message: 'Fill city', access: 'open' },
      { som: SOM('pick'), kind: 'nullTest', severity: 'error', message: null, access: 'open' },
    ]);
  });

  it('follows the ops, and is not an op: no clock, no log entry, no change to opCount, the tree and the run are untouched', async () => {
    const client = connect();
    await client.send(openBody(pdf));
    const first = expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'name', value: 'Pat', at: T0 } }), 'applied');
    const tree = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    for (let i = 0; i < 3; i += 1) expectKind(await client.send({ kind: 'problems' }), 'problemList');
    const after = expectKind(await client.send({ kind: 'problems' }), 'problemList');
    expect(after.problems.map((p) => p.som)).toEqual([SOM('city'), SOM('pick')]);
    expect(expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree).toEqual(tree);
    const next = expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'city', value: 'Springfield', at: T1 } }), 'applied');
    expect(next.opCount).toBe(first.opCount + 1);
    const done = expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'pick', value: 'yes', at: T1 } }), 'applied');
    expect(done.opCount).toBe(first.opCount + 2);
    expect(expectKind(await client.send({ kind: 'problems' }), 'problemList').problems).toEqual([]);
  });

  it('works without a pack (it needs nothing from the descriptor), and refuses before open and after dispose', async () => {
    const client = connect();
    expect(expectKind(await client.send({ kind: 'problems' }), 'failed').code).toBe('NOT_OPEN');
    await client.send(openBody(pdf));
    expectKind(await client.send({ kind: 'problems' }), 'problemList');
    expectKind(await client.send({ kind: 'dispose' }), 'disposed');
    expect(expectKind(await client.send({ kind: 'problems' }), 'failed').code).toBe('NOT_OPEN');
  });

  it('is a strict message: it carries no op, no clock and no extra key', () => {
    expect(parseRequest({ v: PROTOCOL_VERSION, id: 1, kind: 'problems' })).toMatchObject({ ok: true });
    for (const extra of [{ at: 1 }, { op: {} }, { som: 'x' }]) {
      expect(parseRequest({ v: PROTOCOL_VERSION, id: 1, kind: 'problems', ...extra })).toMatchObject({ ok: false, code: 'INVALID_MESSAGE' });
    }
  });
});

describe('E9: `opened.clearButton` reports the pack\'s optional clear button', () => {
  it('no pack: the key is absent; a pack without the field: absent; a pack that names a button field: found with the canonical SOM', async () => {
    const none = expectKind(await connect().send(openBody(pdf)), 'opened');
    expect(Object.keys(none)).not.toContain('clearButton');
    expect(expectKind(await connect().send(openBody(pdf, { pack: PACK })), 'opened').clearButton).toEqual({ status: 'absent' });
    const found = expectKind(await connect().send(openBody(pdf, { pack: { ...PACK, clearButton: 'erase' } })), 'opened');
    expect(found.clearButton).toEqual({ status: 'found', som: SOM('erase') });
  });

  it('an unknown SOM and a non-button SOM are typed issues; the form still opens and runs (no crash, no failed open)', async () => {
    const client = connect();
    const unknown = expectKind(await client.send(openBody(pdf, { pack: { ...PACK, clearButton: 'nowhere' } })), 'opened');
    expect(unknown.clearButton).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_UNRESOLVED' });
    expectKind(await client.send({ kind: 'op', op: { kind: 'setValue', som: 'name', value: 'x', at: T0 } }), 'applied');
    expectKind(await client.send({ kind: 'dispose' }), 'disposed');
    const notButton = expectKind(await client.send(openBody(pdf, { pack: { ...PACK, clearButton: 'name' } })), 'opened');
    expect(notButton.clearButton).toMatchObject({ status: 'issue', code: 'CLEAR_BUTTON_NOT_A_BUTTON' });
  });

  it('is judged on the form after the replay, and a descriptor with an empty or unknown key is refused as before', async () => {
    const replayed = expectKind(
      await connect().send(openBody(pdf, { pack: { ...PACK, clearButton: 'erase' }, ops: [{ kind: 'setValue', som: 'name', value: 'x', at: T0 }] })),
      'opened',
    );
    expect(replayed.clearButton).toMatchObject({ status: 'found' });
    for (const bad of [{ clearButton: '' }, { clearBtn: 'erase' }]) {
      expect(parseRequest({ v: PROTOCOL_VERSION, id: 1, ...openBody(pdf, { pack: { ...PACK, ...bad } }) })).toMatchObject({ ok: false, code: 'INVALID_MESSAGE' });
    }
  });
});
