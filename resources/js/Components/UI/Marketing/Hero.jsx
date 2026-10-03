import { Link } from '@inertiajs/react';

export default function Hero({
    badge = 'Platform Resmi Kejuaraan Shorinji Kempo',
    title = 'Kejuaraan Nasional Shorinji Kempo',
    titleHighlight = 'Indonesia',
    description = 'Sistem manajemen pertandingan terpadu, registrasi kontingen resmi, bagan tanding otomatis, dan pemantauan perolehan medali secara langsung.',
    primaryAction = { label: 'Daftar Kontingen', href: '/register' },
    secondaryAction = { label: 'Lihat Hasil Pertandingan', href: '/results' },
    stats = [],
    className = '',
}) {
    return (
        <div className={`relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 ${className}`}>
            {/* Background ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 dark:bg-red-600/15 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
                {badge && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c0392b]/10 dark:bg-[#c0392b]/20 border border-[#c0392b]/20 text-[#c0392b] dark:text-[#f0c060] text-xs font-bold tracking-wide uppercase mb-6 animate-in fade-in duration-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />
                        {badge}
                    </div>
                )}

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight sm:leading-none">
                    {title}{' '}
                    <span className="bg-gradient-to-r from-[#c0392b] via-[#e74c3c] to-[#d4a843] bg-clip-text text-transparent">
                        {titleHighlight}
                    </span>
                </h1>

                {description && (
                    <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                        {description}
                    </p>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    {primaryAction && (
                        <Link
                            href={primaryAction.href}
                            className="px-6 py-3.5 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white font-bold text-sm shadow-lg shadow-red-600/25 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                        >
                            {primaryAction.label}
                        </Link>
                    )}
                    {secondaryAction && (
                        <Link
                            href={secondaryAction.href}
                            className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition-all"
                        >
                            {secondaryAction.label}
                        </Link>
                    )}
                </div>

                {/* Quick Stats in Hero */}
                {stats.length > 0 && (
                    <div className="mt-16 pt-10 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {stats.map((s, idx) => (
                            <div key={idx}>
                                <p className="text-2xl sm:text-3xl font-black text-[#c0392b] dark:text-[#f0c060]">
                                    {s.value}
                                </p>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
