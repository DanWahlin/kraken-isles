/**
 * The course's inline markup, one rule for every card that shows course copy (the quiz panel, the
 * choice cards, the battle's question card): `**bold**` for UI labels, `*italic*` for names and
 * asides, and `` `code` ``. An italic's stars hug its words (`a * b * c` stays as it is).
 */
export type InlinePart = { kind: 'text'; text: string } | { kind: 'bold' | 'italic' | 'code'; text: string };

/** Splits text on its spans (a capture group, so `split` keeps them); `extra` adds more spans first. */
export function inlineSplitter(extra?: string): RegExp {
  const spans = ['\\*\\*[^*]+\\*\\*', '`[^`]+`', '\\*[^*\\s](?:[^*]*[^*\\s])?\\*'];
  return new RegExp(`(${extra ? `${extra}|` : ''}${spans.join('|')})`, 'g');
}

const SPLIT = inlineSplitter();

/** What a piece of a split is: a span (its text without its marks) or plain text. */
export function inlinePart(p: string): InlinePart {
  if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return { kind: 'bold', text: p.slice(2, -2) };
  if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return { kind: 'code', text: p.slice(1, -1) };
  if (p.length > 2 && p.startsWith('*') && p.endsWith('*') && !p.startsWith('**') && !/\s/.test(p[1]!))
    return { kind: 'italic', text: p.slice(1, -1) };
  return { kind: 'text', text: p };
}

/** The text's parts, in order. */
export function inlineParts(text: string): InlinePart[] {
  return text
    .split(SPLIT)
    .filter((p) => p !== '')
    .map(inlinePart);
}

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The text as safe HTML (every character escaped; only `<b>`, `<i>` and `<code>` made). */
export function inlineHtml(text: string): string {
  let out = '';
  for (const p of inlineParts(text)) {
    const t = escape(p.text);
    out +=
      p.kind === 'bold'
        ? `<b>${t}</b>`
        : p.kind === 'italic'
          ? `<i>${t}</i>`
          : p.kind === 'code'
            ? `<code>${t}</code>`
            : t;
  }
  return out;
}

/** The text without its marks (a screen reader's copy). */
export function inlinePlain(text: string): string {
  return inlineParts(text)
    .map((p) => p.text)
    .join('');
}
