import { z } from 'zod';
import type { FormRuntime } from './options.js';

/**
 * A form-data fixture (W02-T07, owner decision O-2): fictitious values keyed by the SOM path of the field they fill,
 * from the root subform. Never real people, never real client data. Used by tests and by the `sample:fill` tool; the
 * engine's public API does not include it.
 */
export const fixtureSchema = z.record(z.string().min(1).max(512), z.union([z.string().max(1024), z.number().finite()]));
export type FormFixture = z.infer<typeof fixtureSchema>;

/** The class of a field's widget (`textEdit`, `checkButton`, ...), or undefined when the template writes none. */
function widgetClass(runtime: FormRuntime, som: string): string | undefined {
  const ui = runtime.children(som, 'ui')[0];
  const widget = ui === undefined ? undefined : runtime.children(ui)[0];
  return widget === undefined ? undefined : String(runtime.getProperty(widget, 'className'));
}

const isOn = (value: string | number): boolean => String(value) !== '' && String(value) !== '0';

/**
 * Fills a loaded form the way a user does, one field at a time, in the order of the fixture: write the value
 * (`setValue`, which settles the calculates), click a check box that is switched on (only a field whose widget is a
 * check button is ever clicked), and leave the field (`exit`). For an exclusion group the radio button the value
 * selects is the field that is left; radio buttons are not clicked, because the answers alone satisfy the forms' validators.
 * The leave matters: the forms fill dependent lists and derived fields from it (a province's city list, the age from the
 * year of birth), and the Validate button checks what those handlers set up. Values are applied in file order, so a field
 * that a click or exit handler resets comes after the one that causes it.
 */
export function applyFixture(runtime: FormRuntime, fixture: FormFixture): void {
  for (const [som, value] of Object.entries(fixture)) {
    runtime.setValue(som, value);
    const radios = String(runtime.getProperty(som, 'className')) === 'exclGroup' ? runtime.children(som, 'field') : [];
    const target = radios.find((radio) => String(runtime.getValue(radio)) === String(value)) ?? som;
    if (target === som && isOn(value) && widgetClass(runtime, som) === 'checkButton') runtime.event(som, 'click');
    runtime.event(target, 'exit');
  }
}
