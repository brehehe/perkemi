import { useEffect } from 'react';

export default function Modal({
    isOpen = false,
    onClose,
    title = null,
    subtitle = null,
    children,
    footer = null,
    size = 'xl', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
    closeOnEscape = true,
    closeOnBackdrop = true,
    className = '',
}) {
    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEscape, onClose]);

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
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-full m-4 h-[calc(100vh-2rem)]',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
                onClick={() => closeOnBackdrop && onClose && onClose()}
            />

            {/* Modal Dialog Card */}
            <div
                role="dialog"
                aria-modal="true"
                className={`relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-h-[90vh] ${sizes[size] || sizes.lg} motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200 ${className}`}
            >
                {/* Header */}
                {(title || onClose) && (
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

                        {onClose && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Tutup modal"
                                className="p-1.5 -mr-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

Modal.Header = function ModalHeader({ children, className = '' }) {
    return <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-800 ${className}`}>{children}</div>;
};

Modal.Body = function ModalBody({ children, className = '' }) {
    return <div className={`p-6 overflow-y-auto ${className}`}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className = '' }) {
    return (
        <div className={`flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 [&>button]:w-full sm:[&>button]:w-auto ${className}`}>
            {children}
        </div>
    );
};
