import { Link } from '@inertiajs/react';

export default function CTA({
    title = 'Siap Mendaftarkan Kontingen Dojo Anda?',
    description = 'Bergabunglah dalam perhelatan akbar Shorinji Kempo Indonesia. Daftarkan atlet terbaik kontingen Anda sebelum batas waktu penutupan pendaftaran berakhir.',
    buttonText = 'Daftar Sekarang',
    buttonHref = '/register',
    secondaryButtonText = null,
    secondaryButtonHref = null,
    className = '',
}) {
    return (
        <section className={`py-12 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#96281b] via-[#c0392b] to-[#0f0d0b] p-8 sm:p-14 text-white shadow-2xl border border-red-500/20">
                    {/* Ambient decor shapes */}
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-black/40 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative z-10 max-w-2xl">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[#f0c060] text-xs font-bold uppercase tracking-wider mb-4">
                            Pendaftaran Terbuka
                        </span>

                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                            {title}
                        </h2>

                        <p className="mt-4 text-sm sm:text-base text-red-100/90 leading-relaxed">
                            {description}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Link
                                href={buttonHref}
                                className="px-6 py-3.5 rounded-xl bg-white text-[#c0392b] font-bold text-sm shadow-lg hover:bg-red-50 transition-all transform hover:-translate-y-0.5"
                            >
                                {buttonText}
                            </Link>

                            {secondaryButtonText && secondaryButtonHref && (
                                <Link
                                    href={secondaryButtonHref}
                                    className="px-6 py-3.5 rounded-xl bg-black/30 border border-white/20 text-white font-semibold text-sm hover:bg-black/40 transition-all"
                                >
                                    {secondaryButtonText}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
