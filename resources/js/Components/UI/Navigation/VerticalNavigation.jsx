import { Link } from '@inertiajs/react';

export default function VerticalNavigation({
    items = [],
    className = '',
}) {
    return (
        <nav className={`space-y-1 ${className}`}>
            {items.map((item, idx) => {
                const isActive = item.active;
                return (
                    <Link
                        key={idx}
                        href={item.href || '#'}
                        className={`group flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                            isActive
                                ? 'border-[#c0392b]/20 bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060]'
                                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {item.icon && (
                                <span
                                    className={`shrink-0 ${
                                        isActive
                                            ? 'text-[#c0392b] dark:text-[#f0c060]'
                                            : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                                    }`}
                                >
                                    {item.icon}
                                </span>
                            )}
                            <span>{item.label}</span>
                        </div>

                        {item.count !== undefined && (
                            <span
                                className={`ml-auto px-2 py-0.5 text-[10px] rounded-full font-bold ${
                                    isActive
                                        ? 'bg-[#c0392b] text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {item.count}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
