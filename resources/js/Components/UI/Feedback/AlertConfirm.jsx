import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function AlertConfirm({
    isOpen = false,
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini? Tindakan ini tidak dapat dibatalkan.',
    confirmText = 'Konfirmasi',
    cancelText = 'Batal',
    variant = 'danger', // 'danger' | 'warning' | 'primary'
    onConfirm,
    onCancel,
    isLoading = false,
    error = '',
}) {
    const dialogRef = useRef(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        if (!isOpen) return;
        const dialog = dialogRef.current;
        const previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            if (previousOverflow !== 'hidden') document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const variants = {
        danger: {
            iconBg: 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400',
            confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ),
        },
        warning: {
            iconBg: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
        primary: {
            iconBg: 'bg-red-50 dark:bg-red-950/40 text-[#c0392b]',
            confirmBtn: 'bg-[#c0392b] hover:bg-[#a93226] text-white focus:ring-[#c0392b]',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
    };

    const cfg = variants[variant] || variants.danger;

    return createPortal(
        <dialog ref={dialogRef} role="alertdialog" tabIndex={-1} aria-labelledby={titleId} aria-describedby={messageId} aria-busy={isLoading}
            onCancel={(event) => { event.preventDefault(); if (!isLoading) onCancel?.(); }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') event.stopPropagation();
                if (event.key !== 'Tab') return;
                const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (!first) event.preventDefault();
                else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}
            className="m-auto max-h-[90dvh] w-full max-w-[480px] overflow-y-auto bg-transparent p-4 text-inherit backdrop:bg-black/60 backdrop:backdrop-blur-xs">
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden animate-in zoom-in-95 duration-200"
            >
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl shrink-0 ${cfg.iconBg}`}>
                        <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {cfg.icon}
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 id={titleId} className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h3>
                        <p id={messageId} className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>

                {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-relaxed text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</p>}

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        autoFocus
                        disabled={isLoading}
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all focus:ring-2 focus:ring-offset-1 flex items-center gap-2 disabled:opacity-50 ${cfg.confirmBtn}`}
                    >
                        {isLoading && (
                            <svg className="animate-spin -ml-0.5 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </dialog>, document.body
    );
}
