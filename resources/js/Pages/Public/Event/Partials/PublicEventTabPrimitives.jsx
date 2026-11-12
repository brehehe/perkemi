export function TabPanelMotion({ children }) {
    return <div className="space-y-5">{children}</div>;
}

export function TabSectionHeader({ title, subtitle, count, rightSlot = null }) {
    return (
        <div className="flex flex-col gap-3 border-b border-[var(--event-border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--event-ink)] sm:text-2xl">
                        {title}
                    </h2>
                    {typeof count === 'number' && (
                        <span className="inline-flex items-center rounded-full border border-[var(--event-border)] bg-[var(--event-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--event-muted)]">
                            {count}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="mt-1 text-sm text-[var(--event-muted)]">
                        {subtitle}
                    </p>
                )}
            </div>
            {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
    );
}

export function FilterPillGroup({ label, options, value, onChange }) {
    if (!options || options.length <= 1) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
            {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                    <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                                ? 'border-[var(--event-accent)] bg-[var(--event-accent)] text-white shadow-xs'
                                : 'border-[var(--event-border)] bg-[var(--event-surface)] text-[var(--event-muted)] hover:border-[var(--event-accent)] hover:text-[var(--event-ink)]'
                        }`}
                    >
                        <span>{opt.label}</span>
                        {typeof opt.count === 'number' && (
                            <span
                                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-[var(--event-bg)] text-[var(--event-muted)]'
                                }`}
                            >
                                {opt.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export function TabSearchInput({ value, onChange, placeholder = 'Cari...', ariaLabel }) {
    return (
        <div className="relative w-full sm:w-72">
            <svg
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--event-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6.04 6.04a7.5 7.5 0 0 0 10.61 10.61Z"
                />
            </svg>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel || placeholder}
                className="w-full rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] py-2 pr-8 pl-9 text-sm text-[var(--event-ink)] placeholder-[var(--event-muted)] focus:border-[var(--event-accent)] focus:ring-2 focus:ring-[var(--event-accent)]/20 focus:outline-none"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-[var(--event-muted)] hover:text-[var(--event-ink)]"
                >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export function TabEmptyState({ title, description, actionLabel, onAction }) {
    return (
        <div className="rounded-xl border border-dashed border-[var(--event-border)] bg-[var(--event-surface)]/60 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[var(--event-ink)]">{title}</p>
            {description && (
                <p className="mt-1 text-xs text-[var(--event-muted)]">{description}</p>
            )}
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-3 inline-flex items-center rounded-lg border border-[var(--event-border)] bg-[var(--event-bg)] px-3 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] hover:text-[var(--event-accent)]"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export function TabPagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
    if (totalPages <= 1) {
        return null;
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(totalItems, currentPage * pageSize);

    return (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--event-border)] pt-4 sm:flex-row">
            <p className="text-xs text-[var(--event-muted)]">
                Menampilkan <span className="font-semibold text-[var(--event-ink)]">{start}-{end}</span> dari{' '}
                <span className="font-semibold text-[var(--event-ink)]">{totalItems}</span> data
            </p>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-3 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Sebelumnya
                </button>
                <span className="px-2 text-xs font-medium text-[var(--event-muted)]">
                    Hal. {currentPage} / {totalPages}
                </span>
                <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="rounded-lg border border-[var(--event-border)] bg-[var(--event-surface)] px-3 py-1.5 text-xs font-medium text-[var(--event-ink)] transition hover:border-[var(--event-accent)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Berikutnya
                </button>
            </div>
        </div>
    );
}

