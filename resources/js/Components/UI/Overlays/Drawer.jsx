import { useEffect } from 'react';

export default function Drawer({
    isOpen = false,
    onClose,
    title = null,
    subtitle = null,
    children,
    footer = null,
    position = 'right', // 'right' | 'left'
    size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    className = '',
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-xs',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-2xl',
        full: 'max-w-full',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden overscroll-contain">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
                onClick={onClose}
            />

            <div className={`fixed inset-y-0 flex ${position === 'left' ? 'left-0' : 'right-0'} max-w-full`}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title || 'Panel'}
                    className={`z-10 flex w-screen flex-col border-slate-200 bg-white shadow-2xl dark:border-slate-800 ${
                        position === 'left' ? 'border-r' : 'border-l'
                    } ${sizes[size] || sizes.md} motion-safe:animate-in ${
                        position === 'left' ? 'slide-in-from-left' : 'slide-in-from-right'
                    } motion-safe:duration-300 ${className}`}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:items-center sm:px-6">
                        <div className="min-w-0">
                            {title && (
                                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Tutup panel"
                            className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

                    {/* Footer */}
                    {footer && (
                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
