import { describe, expect, it } from 'vitest';
import { buildXfaPdf, packet } from '../../__tests__/fixtures/build-xfa-pdf.js';
import { datasetsXml } from '../../model/form/__tests__/helpers.js';
import { tpl } from '../../model/template/__tests__/helpers.js';
import type { Op } from '../protocol.js';
import { connect, expectKind, on, openBody, T0, T1, textField } from './support.js';

/*
 * W03-T15 owner item 1, at the session boundary. Each script below used to run for hours inside a native string builtin the
 * QuickJS interrupt cannot reach (found by probing, listed in the T15 card). With the prelude's string and RegExp guard each is
 * a typed script limit: the session answers `aborted` with `SCRIPT_LIMIT` and the limit's name, and stays usable. The assertions
 * are about the reply, never about time. No worker watchdog is involved: this is the sandbox itself, which is what a dev script or
 * a future server-side use of the engine has.
 */

const HAY = 'var h = "a".repeat(8 * 1024 * 1024); ';
const NEEDLE = 'var n = "a".repeat(4 * 1024 * 1024) + "b"; ';

const SCRIPTS: readonly (readonly [string, string, string])[] = [
  ['indexOf of a 4 Mi needle that matches then differs, in 8 Mi', `${HAY}${NEEDLE}h.indexOf(n);`, 'string-work'],
  ['lastIndexOf', `${HAY}${NEEDLE}h.lastIndexOf(n);`, 'string-work'],
  ['includes', `${HAY}${NEEDLE}h.includes(n);`, 'string-work'],
  ['split on a string', `${HAY}${NEEDLE}h.split(n);`, 'string-work'],
  ['replace with a string pattern', `${HAY}${NEEDLE}h.replace(n, "x");`, 'string-work'],
  ['a RegExp built from a 4 Mi source', `${HAY}${NEEDLE}new RegExp(n).test(h);`, 'regexp-source'],
  ['String.match with a 4 Mi string, which the engine compiles', `${HAY}${NEEDLE}h.match(n);`, 'regexp-source'],
  ['a RegExp of 30,000 characters run over 8 Mi', `${HAY}new RegExp("a".repeat(30000) + "b").test(h);`, 'string-work'],
  ['normalize of a long run of combining marks', 'var s = "a" + "\\u0301".repeat(65536) + "\\u0316".repeat(65536); s.normalize("NFD");', 'string-length'],
];

function stringForm(): Uint8Array {
  const body = [textField('name', 0), ...SCRIPTS.map(([, script], i) => textField(`hang${i}`, 30 * (i + 1), on('click', script)))].join('');
  const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
  return buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
}

describe('W03-T15 owner item 1: a script that used to hang in a native string builtin ends as a script limit', () => {
  it.each(SCRIPTS.map(([label, , limit], i) => [label, limit, i] as const))('%s is `aborted` with SCRIPT_LIMIT %s and the session can be reopened', async (_label, limit, i) => {
    const client = connect();
    expectKind(await client.send(openBody(stringForm())), 'opened');
    const hang: Op = { kind: 'event', som: `hang${i}`, activity: 'click', at: T1 };
    const aborted = expectKind(await client.send({ kind: 'op', op: hang }), 'aborted');
    expect(aborted.reason).toMatchObject({ code: 'SCRIPT_LIMIT', limit });
    expect(aborted.som).toContain(`hang${i}`);
    // The run is gone (protocol rule for `aborted`): the next request says to open again, and a new open serves.
    expect(expectKind(await client.send({ kind: 'layout' }), 'failed').code).toBe('NEEDS_REBUILD');
    expectKind(await client.send(openBody(stringForm())), 'opened');
  });

  it('the same guarded run still serves ordinary string work: a form that trims and splits behaves as before', async () => {
    const body = [
      textField('name', 0),
      textField('go', 30, on('click', 'name.rawValue = "  Ann Lee ".replace(/^\\s+|\\s+$/g, "").split(" ").join("|") + String("a-b".indexOf("-"));')),
    ].join('');
    const template = tpl(body).replace('<subform name="form1">', '<subform name="form1" layout="tb">');
    const pdf = buildXfaPdf({ packets: [packet('template', template), packet('datasets', datasetsXml('<form1/>'))] });
    const client = connect();
    expectKind(await client.send(openBody(pdf, { at: T0 })), 'opened');
    expectKind(await client.send({ kind: 'op', op: { kind: 'event', som: 'go', activity: 'click', at: T1 } }), 'applied');
    const tree = expectKind(await client.send({ kind: 'layout' }), 'laidOut').renderTree;
    expect(JSON.stringify(tree)).toContain('Ann|Lee1');
  });
});
