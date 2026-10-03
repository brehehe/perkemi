export default function Testimonial({
    badge = 'Testimoni',
    title = 'Apresiasi dari Pengurus & Pelatih',
    testimonials = [],
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
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((t, idx) => (
                        <div
                            key={idx}
                            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                        >
                            {/* Stars */}
                            <div>
                                <div className="flex items-center gap-1 text-[#d4a843] mb-4">
                                    {Array.from({ length: t.rating || 5 }).map((_, rIdx) => (
                                        <svg key={rIdx} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>

                                <blockquote className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                    "{t.quote}"
                                </blockquote>
                            </div>

                            {/* Author */}
                            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                {t.avatar ? (
                                    <img
                                        src={t.avatar}
                                        alt={t.name}
                                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                                        {t.name ? t.name.charAt(0) : 'K'}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                                        {t.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {t.role || t.dojo}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
