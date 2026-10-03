import { Link } from '@inertiajs/react';

export default function SidebarNavigation({
    sections = [],
    className = '',
}) {
    return (
        <nav className={`space-y-6 ${className}`}>
            {sections.map((section, sIdx) => (
                <div key={sIdx} className="space-y-1">
                    {section.title && (
                        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                            {section.title}
                        </p>
                    )}

                    <div className="space-y-0.5">
                        {section.items.map((item, iIdx) => {
                            const isActive = item.active;
                            return (
                                <Link
                                    key={iIdx}
                                    href={item.href || '#'}
                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                                        isActive
                                            ? 'bg-[#c0392b] text-white shadow-sm shadow-[#c0392b]/20 font-bold'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {item.icon && (
                                            <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                {item.icon}
                                            </span>
                                        )}
                                        <span className="truncate">{item.label}</span>
                                    </div>

                                    {item.badge !== undefined && (
                                        <span
                                            className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                                                isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
