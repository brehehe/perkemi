export default function Tabs({
    tabs = [],
    activeTab,
    onChange,
    variant = 'underline', // 'underline' | 'pills' | 'boxed'
    className = '',
}) {
    if (variant === 'pills') {
        return (
            <div className={`flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl ${className}`}>
                {tabs.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onChange && onChange(tab.key)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                                isActive
                                    ? 'bg-white dark:bg-slate-900 text-[#c0392b] shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {tab.icon && <span>{tab.icon}</span>}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                        isActive
                                            ? 'bg-[#c0392b]/10 text-[#c0392b]'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }

    if (variant === 'boxed') {
        return (
            <div className={`max-w-full overflow-x-auto overscroll-x-contain ${className}`}>
                <div className="flex min-w-max overflow-hidden rounded-xl border border-slate-200 divide-x divide-slate-200 dark:border-slate-800 dark:divide-slate-800">
                {tabs.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onChange && onChange(tab.key)}
                            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-colors ${
                                isActive
                                    ? 'bg-[#c0392b] text-white'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            {tab.icon && <span>{tab.icon}</span>}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
                </div>
            </div>
        );
    }

    // Default 'underline' variant
    return (
        <div className={`border-b border-slate-200 dark:border-slate-800 ${className}`}>
            <nav className="-mb-px flex max-w-full space-x-6 overflow-x-auto overscroll-x-contain no-scrollbar">
                {tabs.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onChange && onChange(tab.key)}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                                isActive
                                    ? 'border-[#c0392b] text-[#c0392b] dark:text-[#f0c060]'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300'
                            }`}
                        >
                            {tab.icon && <span>{tab.icon}</span>}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                                        isActive
                                            ? 'bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060]'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
