import { Link } from '@inertiajs/react';

export default function Breadcrumb({
    items = [],
    homeHref = '/',
    separator = 'chevron', // 'chevron' | 'slash'
    className = '',
}) {
    return (
        <nav aria-label="Breadcrumb" className={`flex max-w-full items-center overflow-x-auto overscroll-x-contain text-xs ${className}`}>
            <ol className="flex min-w-max items-center gap-2">
                {/* Home link */}
                <li>
                    <Link
                        href={homeHref}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="sr-only">Beranda</span>
                    </Link>
                </li>

                {items.map((item, idx) => {
                    const isLast = idx === items.length - 1;

                    return (
                        <li key={idx} className="flex items-center gap-2">
                            {separator === 'chevron' ? (
                                <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            ) : (
                                <span className="text-slate-300 dark:text-slate-600 shrink-0">/</span>
                            )}

                            {isLast || !item.href ? (
                                <span
                                    className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs"
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors truncate max-w-xs"
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
