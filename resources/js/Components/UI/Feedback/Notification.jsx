import { useEffect } from 'react';

export default function Notification({
    show = true,
    variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
    title,
    message,
    onClose,
    duration = 5000,
    className = '',
}) {
    useEffect(() => {
        if (show && duration && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    if (!show) return null;

    const variants = {
        info: {
            border: 'border-blue-500/30',
            iconBg: 'bg-blue-500/10 text-blue-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            ),
        },
        success: {
            border: 'border-emerald-500/30',
            iconBg: 'bg-emerald-500/10 text-emerald-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            ),
        },
        warning: {
            border: 'border-amber-500/30',
            iconBg: 'bg-amber-500/10 text-amber-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            ),
        },
        danger: {
            border: 'border-rose-500/30',
            iconBg: 'bg-rose-500/10 text-rose-500',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ),
        },
    };

    const cfg = variants[variant] || variants.info;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`max-w-sm w-full bg-white dark:bg-slate-900 border ${cfg.border} shadow-2xl rounded-2xl p-4 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-top-2 fade-in duration-200 ${className}`}
        >
            <div className={`p-2 rounded-xl shrink-0 ${cfg.iconBg}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {cfg.icon}
                </svg>
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
                {title && (
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h4>
                )}
                {message && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {message}
                    </p>
                )}
            </div>

            {onClose && (
                <button
                    type="button"
                    aria-label="Tutup notifikasi"
                    onClick={onClose}
                    className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -m-1 rounded-md"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
