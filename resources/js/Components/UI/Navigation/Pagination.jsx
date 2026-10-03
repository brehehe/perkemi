export default function Pagination({
    // Direct pagination object from Laravel LengthAwarePaginator (e.g. pagination={users})
    pagination = null,

    // Or discrete props
    currentPage: propCurrentPage,
    totalPages: propTotalPages,
    total: propTotal,
    totalItems: propTotalItems,
    from: propFrom,
    to: propTo,

    onPageChange,
    label = 'data',
    variant = 'footer', // 'footer' (attached inside table card) | 'card' (standalone card)
    className = '',
}) {
    const currentPage = pagination?.current_page ?? propCurrentPage ?? 1;
    const totalPages = pagination?.last_page ?? propTotalPages ?? 1;
    const total = pagination?.total ?? propTotal ?? propTotalItems ?? 0;
    const from = pagination?.from ?? propFrom ?? (total > 0 ? 1 : 0);
    const to = pagination?.to ?? propTo ?? (total > 0 ? total : 0);

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages || 1 }, (_, i) => i + 1);
        }

        const pages = [];
        const left = Math.max(2, currentPage - 1);
        const right = Math.min(totalPages - 1, currentPage + 1);

        pages.push(1);

        if (left > 2) {
            pages.push('...');
        }

        for (let i = left; i <= right; i++) {
            pages.push(i);
        }

        if (right < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);

        return pages;
    };

    if (total <= 0 && totalPages <= 1) return null;

    const containerClasses =
        variant === 'card'
            ? `px-6 py-3.5 bg-[#fcfbf9] dark:bg-slate-800/40 border border-[#ede9e1] dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${className}`
            : `px-6 py-3.5 bg-[#fcfbf9] dark:bg-slate-800/40 border-t border-[#ede9e1] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${className}`;

    return (
        <div className={containerClasses}>
            {/* Results count text */}
            <div className="text-[#888] dark:text-slate-400">
                Menampilkan{' '}
                <span className="font-bold text-[#0f0d0b] dark:text-white">
                    {from}
                </span>{' '}
                sampai{' '}
                <span className="font-bold text-[#0f0d0b] dark:text-white">
                    {to}
                </span>{' '}
                dari{' '}
                <span className="font-bold text-[#0f0d0b] dark:text-white">
                    {total}
                </span>{' '}
                {label}
            </div>

            {/* Pagination Controls */}
            <div className="flex max-w-full items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 sm:pb-0">
                {/* Prev Button */}
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange && onPageChange(currentPage - 1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-[#ede9e1] dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Halaman Sebelumnya"
                    aria-label="Halaman Sebelumnya"
                >
                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                </button>

                {/* Page Numbers */}
                {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                        return (
                            <span
                                key={`ellipsis-${idx}`}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold select-none text-xs"
                            >
                                …
                            </span>
                        );
                    }
                    const isCurrent = page === currentPage;
                    return (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange && onPageChange(page)}
                            className={`min-w-8 h-8 px-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                isCurrent
                                    ? 'bg-[#c0392b] text-white shadow-xs shadow-[#c0392b]/30'
                                    : 'bg-white dark:bg-slate-800 border border-[#ede9e1] dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                            aria-current={isCurrent ? 'page' : undefined}
                        >
                            {page}
                        </button>
                    );
                })}

                {/* Next Button */}
                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange && onPageChange(currentPage + 1)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-[#ede9e1] dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Halaman Berikutnya"
                    aria-label="Halaman Berikutnya"
                >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </div>
    );
}
