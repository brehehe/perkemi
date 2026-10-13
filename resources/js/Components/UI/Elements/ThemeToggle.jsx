import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'kempo-theme';
const THEME_EVENT = 'kempo-theme-change';

function preferredTheme() {
    if (typeof window === 'undefined') return 'light';

    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, persist = true) {
    const isDark = theme === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0f1115' : '#f7f4ef');

    if (persist) window.localStorage.setItem(STORAGE_KEY, theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export function useTheme() {
    const [theme, setThemeState] = useState(preferredTheme);

    useEffect(() => {
        applyTheme(theme, false);

        const handleThemeChange = (event) => setThemeState(event.detail || preferredTheme());
        const handleStorage = (event) => {
            if (event.key === STORAGE_KEY) setThemeState(preferredTheme());
        };

        window.addEventListener(THEME_EVENT, handleThemeChange);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener(THEME_EVENT, handleThemeChange);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const setTheme = useCallback((nextTheme) => {
        applyTheme(nextTheme);
        setThemeState(nextTheme);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [setTheme, theme]);

    return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}

export default function ThemeToggle({ className = '', showLabel = false }) {
    const { isDark, toggleTheme } = useTheme();
    const nextThemeLabel = isDark ? 'mode terang' : 'mode gelap';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`theme-toggle inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${className}`}
            aria-label={`Beralih ke ${nextThemeLabel}`}
            title={`Beralih ke ${nextThemeLabel}`}
            aria-pressed={isDark}
        >
            <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
            {showLabel && <span>{isDark ? 'Terang' : 'Gelap'}</span>}
        </button>
    );
}
