import { describe, expect, it } from 'vitest';
import { MAX_SOM_CHARS } from '../../model/som/limits.js';
import { MAX_EXPRESSION_CHARS, requestSchemas } from '../bridge-schema.js';

describe('the bridge and the SOM resolver agree on the longest expression (F9)', () => {
  it('the bridge ceiling equals the SOM ceiling, so nothing the resolver accepts is cut off by the bridge and nothing longer reaches it', () => {
    expect(MAX_EXPRESSION_CHARS).toBe(MAX_SOM_CHARS);
  });

  it('a resolve request of exactly the SOM ceiling passes the bridge schema and one character more does not', () => {
    expect(requestSchemas.resolve.safeParse([1, 'a'.repeat(MAX_SOM_CHARS), false]).success).toBe(true);
    expect(requestSchemas.resolve.safeParse([1, 'a'.repeat(MAX_SOM_CHARS + 1), false]).success).toBe(false);
  });
});
