/**
 * Theme store — Svelte 5 runes with localStorage persistence
 * and system preference detection.
 */

export type Theme = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'sf-theme';

let _theme = $state<Theme>('auto');

/** Returns the current theme preference. */
export function getTheme(): Theme {
	return _theme;
}

/** Returns the resolved theme ('light' | 'dark'), resolving 'auto' via system preference. */
export function getResolvedTheme(): 'light' | 'dark' {
	if (_theme !== 'auto') return _theme;
	if (typeof window === 'undefined') return 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Sets the theme preference and persists to localStorage. */
export function setTheme(t: Theme): void {
	_theme = t;
	if (typeof window !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, t);
	}
	applyTheme();
}

/** Reads theme from localStorage and applies it. Call once on app startup. */
export function initTheme(): void {
	if (typeof window === 'undefined') return;
	const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
	if (stored && ['auto', 'light', 'dark'].includes(stored)) {
		_theme = stored;
	}
	applyTheme();

	// Listen for system preference changes when in auto mode
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (_theme === 'auto') applyTheme();
	});
}

/** Applies the resolved theme to the <html> element. */
export function applyTheme(): void {
	if (typeof document === 'undefined') return;
	const resolved = getResolvedTheme();
	document.documentElement.setAttribute('data-theme', resolved);
}
