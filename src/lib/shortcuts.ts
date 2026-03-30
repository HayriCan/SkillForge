export type ShortcutHandler = () => void;
export type ShortcutMap = Record<string, ShortcutHandler>;

const FONT_SIZE_KEY = 'sf-font-size';
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 20;
const FONT_SIZE_DEFAULT = 14;

/** Get current font size from localStorage */
export function getFontSize(): number {
  const stored = localStorage.getItem(FONT_SIZE_KEY);
  if (stored) {
    const n = parseInt(stored, 10);
    if (!isNaN(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX) return n;
  }
  return FONT_SIZE_DEFAULT;
}

/** Set font size, persist to localStorage, and apply to document via zoom */
export function setFontSize(size: number): void {
  const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, size));
  localStorage.setItem(FONT_SIZE_KEY, String(clamped));
  // Use zoom instead of font-size: components use hardcoded px Tailwind classes
  // which don't respond to rem/root font-size changes.
  document.documentElement.style.zoom = String(clamped / FONT_SIZE_DEFAULT);
}

/** Increase font size by 1px */
export function increaseFontSize(): void {
  setFontSize(getFontSize() + 1);
}

/** Decrease font size by 1px */
export function decreaseFontSize(): void {
  setFontSize(getFontSize() - 1);
}

type ParsedShortcut = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
};

export const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent);

/** Parse a shortcut string like "ctrl+shift+k" into its parts */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.toLowerCase().split("+");
  return {
    ctrl: parts.includes("ctrl"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
    key: parts.filter((p) => p !== "ctrl" && p !== "shift" && p !== "alt")[0] ?? "",
  };
}

/** Physical key code map for symbol keys — layout and shift-state independent */
const SYMBOL_CODE_MAP: Record<string, string> = {
  '=': 'Equal', '+': 'Equal',
  '-': 'Minus', '_': 'Minus',
  '[': 'BracketLeft', ']': 'BracketRight',
  ';': 'Semicolon', "'": 'Quote',
  ',': 'Comma',     '.': 'Period',
  '/': 'Slash',     '\\': 'Backslash',
  '`': 'Backquote',
};

/** Check if a keyboard event matches a parsed shortcut */
export function matchesShortcut(
  event: KeyboardEvent,
  parsed: ParsedShortcut,
): boolean {
  const ctrlMatch = isMac ? event.metaKey : event.ctrlKey;
  if (parsed.ctrl && !ctrlMatch) return false;
  if (!parsed.ctrl && ctrlMatch) return false;
  if (parsed.alt !== event.altKey) return false;

  const isSymbol = parsed.key.length === 1 && !/[a-z0-9]/.test(parsed.key);

  // For letter/number shortcuts enforce exact shift match; symbols are shift-agnostic
  // (= and + are the same physical key, - and _ are the same physical key)
  if (!isSymbol && parsed.shift !== event.shiftKey) return false;

  // Primary: exact key match
  if (event.key.toLowerCase() === parsed.key) return true;

  // Fallback for symbols: match by physical key code regardless of layout or shift
  const expectedCode = SYMBOL_CODE_MAP[parsed.key];
  if (isSymbol && expectedCode && event.code === expectedCode) return true;

  return false;
}

/** Get a display label for a shortcut (e.g. "ctrl+k" -> "⌘K" on Mac) */
export function getShortcutLabel(shortcut: string): string {
  const parsed = parseShortcut(shortcut);
  const parts: string[] = [];

  if (parsed.ctrl) parts.push(isMac ? "⌘" : "Ctrl");
  if (parsed.shift) parts.push(isMac ? "⇧" : "Shift");
  if (parsed.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(parsed.key.toUpperCase());

  return isMac ? parts.join("") : parts.join("+");
}

/**
 * Register keyboard shortcuts on the window.
 * Returns a cleanup function to remove the listener.
 */
export function registerShortcuts(handlers: ShortcutMap): () => void {
  const parsed = Object.entries(handlers).map(([shortcut, handler]) => ({
    parsed: parseShortcut(shortcut),
    handler,
    isModified: parseShortcut(shortcut).ctrl || parseShortcut(shortcut).alt,
  }));

  function onKeydown(event: KeyboardEvent) {
    const target = event.target;
    const inInput =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;

    for (const entry of parsed) {
      if (matchesShortcut(event, entry.parsed)) {
        // In input fields: allow Ctrl/Cmd combos and Escape, skip plain number keys
        if (inInput && !entry.isModified && entry.parsed.key !== "escape") {
          continue;
        }
        event.preventDefault();
        entry.handler();
        return;
      }
    }
  }

  window.addEventListener("keydown", onKeydown);
  return () => window.removeEventListener("keydown", onKeydown);
}
