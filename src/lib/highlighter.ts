import { createHighlighter, type Highlighter } from 'shiki';

let _highlighter: Highlighter | null = null;

/**
 * Get or create a singleton Shiki highlighter instance.
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (_highlighter) return _highlighter;
  _highlighter = await createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: ['markdown', 'yaml', 'json', 'typescript', 'bash', 'python'],
  });
  return _highlighter;
}

/**
 * Highlight code string and return HTML.
 */
export async function highlight(
  code: string,
  lang: string,
  theme: 'github-dark' | 'github-light' = 'github-dark'
): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, { lang, theme });
}
