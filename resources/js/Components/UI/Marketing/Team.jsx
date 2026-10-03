export default function Team({
    badge = 'Dewan & Panitia',
    title = 'Panitia Pelaksana & Dewan Wasit',
    description = 'Dipimpin oleh para Sensei berdedikasi tinggi demi kelancaran dan integritas kejuaraan.',
    members = [],
    columns = 4,
    className = '',
}) {
    const colClasses = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

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

                {/* Grid */}
                <div className={`grid ${colClasses[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-6`}>
                    {members.map((m, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs hover:shadow-md transition-all group"
                        >
                            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 border-2 border-slate-100 dark:border-slate-800 group-hover:border-[#c0392b] transition-colors">
                                {m.avatar ? (
                                    <img
                                        src={m.avatar}
                                        alt={m.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-slate-400">
                                        {m.name ? m.name.charAt(0) : 'S'}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#c0392b] transition-colors">
                                {m.name}
                            </h3>

                            <p className="text-xs font-semibold text-[#c0392b] dark:text-[#f0c060] mt-0.5">
                                {m.role}
                            </p>

                            {m.dan && (
                                <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                                    {m.dan}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
