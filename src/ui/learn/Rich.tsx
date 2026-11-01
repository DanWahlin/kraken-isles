import { createContext, useContext, type ReactNode } from 'react';
import { forkName, type ForkRef } from '../../learn/fork';
import { inlinePart, inlineSplitter } from '../../learn/inline-markup';
import { detectOs, EMPTY_SETUP, fillSetup, type OsId, type SetupData } from '../../learn/setup';

const LINK = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/;
/** Links first, then the course's inline spans (src/learn/inline-markup.ts). */
const SPLIT = inlineSplitter('\\[[^\\]]+\\]\\(https:\\/\\/[^\\s)]+\\)');

/** The player's fork, for `{fork}` in content strings (the placeholder fork until they give it). */
export const ForkContext = createContext<ForkRef | null>(null);

/** The player's setup, for `{key:mod+R}`, `{issue}`, `{branch}`, `{model}` and `{os}` in content strings. */
export const SetupContext = createContext<{ setup: SetupData; detected: OsId }>({
  setup: EMPTY_SETUP,
  detected: detectOs(),
});

/** Fills the player's setup into a plain string (task list lines, quest details). */
export function useSetupText(): (text: string) => string {
  const { setup, detected } = useContext(SetupContext);
  return (text) => fillSetup(text, setup, detected);
}

/**
 * Renders content strings: `**bold**` for UI labels, `*italic*`, `code` spans, and `[text](https://…)` links
 * (https only, opened in a new tab). `{fork}` becomes the player's `owner/repo`, and the setup tokens
 * their own values (src/learn/setup.ts `fillSetup`). No HTML is ever injected.
 */
export function Rich({ text }: { text: string }): ReactNode {
  const fork = useContext(ForkContext);
  const { setup, detected } = useContext(SetupContext);
  const filled = fillSetup(text, setup, detected);
  const shown = filled.includes('{fork}') ? filled.replaceAll('{fork}', forkName(fork)) : filled;
  const parts = shown.split(SPLIT);
  return parts.map((p, i) => {
    const link = LINK.exec(p);
    if (!link) {
      const part = inlinePart(p);
      if (part.kind === 'bold') return <strong key={i}>{part.text}</strong>;
      if (part.kind === 'italic') return <em key={i}>{part.text}</em>;
      if (part.kind === 'code') return <code key={i}>{part.text}</code>;
      return p;
    }
    if (link)
      return (
        <a key={i} className="ci-rich-link" href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    return p;
  });
}
