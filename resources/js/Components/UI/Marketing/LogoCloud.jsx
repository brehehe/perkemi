export default function LogoCloud({
    title = 'Didukung & Diawasi Oleh Federasi Resmi',
    logos = [
        { name: 'WSKO (World Shorinji Kempo Organization)' },
        { name: 'PB PERKEMI' },
        { name: 'KONI Pusat' },
        { name: 'KEMENPORA RI' },
        { name: 'KOI (Komite Olimpiade Indonesia)' },
    ],
    className = '',
}) {
    return (
        <section className={`py-12 border-y border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {title && (
                    <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-8">
                        {title}
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                    {logos.map((logo, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-serif font-bold text-sm tracking-wider"
                        >
                            {logo.image ? (
                                <img src={logo.image} alt={logo.name} className="h-8 object-contain" />
                            ) : (
                                <div className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-sans font-black">
                                    {logo.name}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
