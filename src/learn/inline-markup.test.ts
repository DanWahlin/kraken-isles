import { describe, expect, it } from 'vitest';
import { inlineHtml, inlineParts, inlinePlain } from './inline-markup';

describe('inline markup', () => {
  it('reads bold, italic and code', () => {
    expect(inlineParts('A raider calls itself *Confident Guess*. Open **Skills** with `/skills`.')).toEqual([
      { kind: 'text', text: 'A raider calls itself ' },
      { kind: 'italic', text: 'Confident Guess' },
      { kind: 'text', text: '. Open ' },
      { kind: 'bold', text: 'Skills' },
      { kind: 'text', text: ' with ' },
      { kind: 'code', text: '/skills' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('leaves loose stars alone', () => {
    expect(inlineHtml('2 * 3 * 4')).toBe('2 * 3 * 4');
    expect(inlineHtml('a *b')).toBe('a *b');
  });

  it('escapes everything it does not make', () => {
    expect(inlineHtml('<img src=x onerror=alert(1)> *<b>* & "q"')).toBe(
      '&lt;img src=x onerror=alert(1)&gt; <i>&lt;b&gt;</i> &amp; &quot;q&quot;',
    );
    expect(inlineHtml('**a<b**')).toBe('<b>a&lt;b</b>');
  });

  it('gives a plain copy for screen readers', () => {
    expect(inlinePlain('Pick **Agent** for *Rory*, then `read`.')).toBe('Pick Agent for Rory, then read.');
  });
});
