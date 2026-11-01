import { Fragment } from 'react';
import { fill } from '../../course/fill';
import { inlineParts } from '../../learn/inline-markup';

/** A line of a course's copy: `**bold**`, `*italic*` and `code` spans as such, with `{name}` values filled in. */
export function Rich({ text, values }: { text: string; values?: Readonly<Record<string, string | number>> }) {
  return (
    <>
      {inlineParts(values ? fill(text, values) : text).map((part, i) =>
        part.kind === 'bold' ? (
          <strong key={i}>{part.text}</strong>
        ) : part.kind === 'italic' ? (
          <em key={i}>{part.text}</em>
        ) : part.kind === 'code' ? (
          <code key={i}>{part.text}</code>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
