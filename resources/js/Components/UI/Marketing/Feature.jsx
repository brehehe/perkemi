export default function Feature({
    badge = 'Fitur Utama',
    title = 'Solusi Lengkap Manajemen Kejuaraan',
    description = 'Dirancang khusus untuk memenuhi standar regulasi PERKEMI dan Pengurus Besar Shorinji Kempo.',
    features = [],
    columns = 3,
    className = '',
}) {
    const colClasses = {
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <section className={`py-16 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
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
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>

                {/* Grid */}
                <div className={`grid ${colClasses[columns] || 'grid-cols-1 md:grid-cols-3'} gap-6`}>
                    {features.map((feat, idx) => (
                        <div
                            key={idx}
                            className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs hover:border-[#c0392b]/40 hover:shadow-md transition-all duration-200 group"
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#c0392b] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                {feat.icon || (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                )}
                            </div>

                            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#c0392b] transition-colors">
                                {feat.title}
                            </h3>

                            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                {feat.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
