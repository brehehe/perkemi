import { useState, useRef } from 'react';
import FormLabel from './FormLabel';

export default function Editor({
    label = null,
    error = null,
    hint = null,
    required = false,
    value = '',
    onChange,
    placeholder = 'Tulis konten di sini...',
    minHeight = '200px',
    className = '',
}) {
    const [isPreview, setIsPreview] = useState(false);
    const textareaRef = useRef(null);

    const insertFormat = (before, after = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        const replacement = before + selected + after;
        const newText = text.substring(0, start) + replacement + text.substring(end);

        if (onChange) {
            onChange(newText);
        }

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + before.length,
                end + before.length
            );
        }, 0);
    };

    return (
        <div className={`w-full space-y-1.5 ${className}`}>
            <div className="flex items-center justify-between">
                {label && (
                    <FormLabel required={required}>{label}</FormLabel>
                )}

                {/* Preview Toggle */}
                <div className="flex items-center text-xs bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setIsPreview(false)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            !isPreview
                                ? 'bg-white dark:bg-slate-900 text-[#c0392b] shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Tulis
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPreview(true)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            isPreview
                                ? 'bg-white dark:bg-slate-900 text-[#c0392b] shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Pratinjau
                    </button>
                </div>
            </div>

            <div
                className={`rounded-xl border overflow-hidden transition-all duration-150 shadow-xs ${
                    error
                        ? 'border-rose-300 dark:border-rose-700'
                        : 'border-slate-200 dark:border-slate-800 focus-within:border-[#c0392b] focus-within:ring-2 focus-within:ring-[#c0392b]/20'
                }`}
            >
                {/* Toolbar */}
                {!isPreview && (
                    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                        <button
                            type="button"
                            onClick={() => insertFormat('**', '**')}
                            title="Tebal (Bold)"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded font-bold"
                        >
                            B
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('*', '*')}
                            title="Miring (Italic)"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded italic"
                        >
                            I
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('~~', '~~')}
                            title="Coret (Strikethrough)"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded line-through"
                        >
                            S
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                        <button
                            type="button"
                            onClick={() => insertFormat('# ')}
                            title="Heading 1"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded font-bold"
                        >
                            H1
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('## ')}
                            title="Heading 2"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded font-semibold"
                        >
                            H2
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                        <button
                            type="button"
                            onClick={() => insertFormat('- ')}
                            title="Daftar Bullet"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('1. ')}
                            title="Daftar Nomor"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('> ')}
                            title="Kutipan"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded"
                        >
                            “
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('`', '`')}
                            title="Kode"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded font-mono"
                        >
                            &lt;/&gt;
                        </button>
                        <button
                            type="button"
                            onClick={() => insertFormat('[Teks Tautan](', ')')}
                            title="Link"
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content Area */}
                {isPreview ? (
                    <div
                        style={{ minHeight }}
                        className="p-4 bg-white dark:bg-slate-900 prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200"
                    >
                        {value ? (
                            <div className="whitespace-pre-wrap">{value}</div>
                        ) : (
                            <p className="text-slate-400 italic">Belum ada konten untuk dipratinjau.</p>
                        )}
                    </div>
                ) : (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange && onChange(e.target.value)}
                        placeholder={placeholder}
                        style={{ minHeight }}
                        className="w-full p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none resize-y placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                )}
            </div>

            {error ? (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}
