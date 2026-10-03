import { useState, useEffect, useMemo } from 'react';

export default function CommandPalette({
    isOpen = false,
    onClose,
    items = [], // Array of { id, title, subtitle, category, icon, onSelect }
    placeholder = 'Ketik perintah atau cari data...',
    emptyMessage = 'Tidak ada perintah yang cocok.',
}) {
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Global Cmd+K / Ctrl+K listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (isOpen && onClose) {
                    onClose();
                }
            } else if (e.key === 'Escape' && isOpen && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Filter items
    const filtered = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(
            (item) =>
                item.title.toLowerCase().includes(q) ||
                (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
                (item.category && item.category.toLowerCase().includes(q))
        );
    }, [items, search]);

    // Keyboard navigation (ArrowUp, ArrowDown, Enter)
    useEffect(() => {
        if (!isOpen) return;

        const handleNav = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
            } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                e.preventDefault();
                if (filtered[selectedIndex].onSelect) {
                    filtered[selectedIndex].onSelect();
                }
                if (onClose) onClose();
            }
        };

        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filtered, selectedIndex, onClose]);

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
            >
                {/* Search Bar */}
                <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
                    <svg
                        className="w-5 h-5 text-slate-400 dark:text-slate-500 mr-3 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={placeholder}
                        className="w-full py-4 text-sm bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    />
                    <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50 dark:divide-slate-800/40">
                    {filtered.length > 0 ? (
                        filtered.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <button
                                    key={item.id || idx}
                                    type="button"
                                    onClick={() => {
                                        if (item.onSelect) item.onSelect();
                                        if (onClose) onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                                        isSelected
                                            ? 'bg-[#c0392b] text-white'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {item.icon && (
                                            <span className={`shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {item.icon}
                                            </span>
                                        )}
                                        <div className="truncate">
                                            <p className="text-xs sm:text-sm font-semibold truncate">
                                                {item.title}
                                            </p>
                                            {item.subtitle && (
                                                <p
                                                    className={`text-[11px] truncate ${
                                                        isSelected
                                                            ? 'text-red-100'
                                                            : 'text-slate-400 dark:text-slate-500'
                                                    }`}
                                                >
                                                    {item.subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {item.category && (
                                        <span
                                            className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ${
                                                isSelected
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {item.category}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                            {emptyMessage}
                        </div>
                    )}
                </div>

                {/* Keyboard Shortcuts Hint Footer */}
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                    <div className="flex items-center gap-2">
                        <span>Navigasi</span>
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded">↑</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded">↓</kbd>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Pilih</span>
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded">↵</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}
