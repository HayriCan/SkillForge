/**
 * Returns the local path to a bundled Twemoji SVG for the given emoji character.
 * SVG files are stored in static/emoji/ and bundled with the app.
 */
export function emojiUrl(emoji: string): string {
  const codePoints = [...emoji]
    .map(ch => ch.codePointAt(0)!.toString(16).toLowerCase())
    .filter(cp => cp !== 'fe0f');
  return `/emoji/${codePoints.join('-')}.svg`;
}
