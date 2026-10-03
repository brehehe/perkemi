export default function Sidebar({
    isOpen = true,
    onClose,
    brand = 'SMART PERKEMI',
    logo = null,
    children,
    footer = null,
    className = '',
}) {
    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden transition-opacity duration-300 ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />

            {/* Sidebar Aside Element */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } ${className}`}
            >
                {/* Brand Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                    <div className="flex items-center gap-2.5">
                        {logo || (
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#c0392b] to-[#e74c3c] flex items-center justify-center text-white font-serif font-bold text-sm shadow-xs">
                                SP
                            </div>
                        )}
                        <span className="font-serif font-bold text-slate-900 dark:text-white text-sm tracking-wider">
                            {brand}
                        </span>
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Nav items container */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    {children}
                </div>

                {/* Sidebar Footer */}
                {footer && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
                        {footer}
                    </div>
                )}
            </aside>
        </>
    );
}
