import { Link } from '@inertiajs/react';

export default function Blog({
    badge = 'Berita & Pengumuman',
    title = 'Warta Terbaru Kejuaraan',
    description = 'Informasi teknis pertandingan, jadwal upacara pembukaan, dan liputan pertandingan Shorinji Kempo.',
    articles = [],
    columns = 3,
    className = '',
}) {
    const colClasses = {
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
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
                <div className={`grid ${colClasses[columns] || 'grid-cols-1 md:grid-cols-3'} gap-8`}>
                    {articles.map((art, idx) => (
                        <article
                            key={idx}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group"
                        >
                            {/* Image cover */}
                            <div className="h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                                {art.image ? (
                                    <img
                                        src={art.image}
                                        alt={art.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <svg className="w-12 h-12 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}

                                {art.category && (
                                    <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[#f0c060] text-[10px] font-bold uppercase tracking-wider">
                                        {art.category}
                                    </span>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-2">
                                        {art.date && <span>{art.date}</span>}
                                        {art.author && (
                                            <>
                                                <span>•</span>
                                                <span>{art.author}</span>
                                            </>
                                        )}
                                    </div>

                                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#c0392b] transition-colors leading-snug">
                                        {art.title}
                                    </h3>

                                    {art.excerpt && (
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                            {art.excerpt}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Link
                                        href={art.href || '#'}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c0392b] dark:text-[#f0c060] group-hover:underline"
                                    >
                                        <span>Baca Selengkapnya</span>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
