import { readFileSync } from 'node:fs';
import { packFormDescriptorSchema, type PackFormDescriptor } from '../../../runtime/pack.js';
import { applyFixture, fixtureSchema, type FormFixture } from '../../../runtime/fixture.js';

/**
 * Test support for the form-data fixtures (W02-T07, owner decision O-2): fictitious values keyed by the SOM path of the
 * field they fill, written by an agent from each form's own validators. Never real people, never real client data.
 *
 * File names use the form's code because a fixture belongs to one form's template; the engine source names no form.
 */
const directory = new URL('./', import.meta.url);

export { applyFixture, fixtureSchema, type FormFixture };

export function loadFixture(form: string): FormFixture {
  return fixtureSchema.parse(JSON.parse(readFileSync(new URL(`${form}.synthetic.json`, directory), 'utf8')));
}

/** The Pack descriptor of a form: node names as data. */
export function loadPack(form: string): PackFormDescriptor {
  return packFormDescriptorSchema.parse(JSON.parse(readFileSync(new URL(`${form}.pack.json`, directory), 'utf8')));
}
