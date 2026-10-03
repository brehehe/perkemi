export default function BentoGrid({
    badge = 'Ekosistem Digital',
    title = 'Dirancang Khusus untuk Standar Kejuaraan Kempo',
    description = 'Kecepatan pembaruan data, presisi penilaian wasit juri, dan transparansi bagan kompetisi.',
    items = [],
    className = '',
}) {
    return (
        <section className={`py-16 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    {badge && (
                        <p className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060] uppercase tracking-wider mb-2">
                            {badge}
                        </p>
                    )}
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                            {description}
                        </p>
                    )}
                </div>

                {/* Bento Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {items.map((item, idx) => {
                        const isColSpan2 = item.colSpan === 2 || idx === 0 || idx === 3;
                        return (
                            <div
                                key={idx}
                                className={`relative p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between ${
                                    isColSpan2 ? 'md:col-span-2' : 'md:col-span-1'
                                }`}
                            >
                                {/* Top tag / icon */}
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#c0392b] group-hover:scale-110 transition-transform">
                                            {item.icon || (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            )}
                                        </div>
                                        {item.badge && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-[#c0392b] transition-colors">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>

                                {/* Custom slot / graphic content */}
                                {item.content && (
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                        {item.content}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
