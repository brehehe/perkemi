import { Link } from '@inertiajs/react';

export default function Pricing({
    badge = 'Biaya Partisipasi',
    title = 'Paket Registrasi Kejuaraan',
    description = 'Pilih paket keikutsertaan yang sesuai dengan jumlah atlet dan nomor pertandingan kontingen Anda.',
    plans = [],
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

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                    {plans.map((plan, idx) => {
                        const isFeatured = plan.featured;
                        return (
                            <div
                                key={idx}
                                className={`relative p-8 rounded-3xl flex flex-col justify-between transition-all duration-200 ${
                                    isFeatured
                                        ? 'bg-[#0f0d0b] text-white border-2 border-[#d4a843] shadow-2xl scale-105 z-10'
                                        : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg'
                                }`}
                            >
                                {isFeatured && (
                                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#d4a843] text-black text-[11px] font-black uppercase tracking-wider shadow-sm">
                                        Paling Populer
                                    </span>
                                )}

                                <div>
                                    <h3 className="text-lg font-bold">{plan.name}</h3>
                                    <p
                                        className={`mt-1 text-xs ${
                                            isFeatured ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                    >
                                        {plan.description}
                                    </p>

                                    <div className="mt-6 flex items-baseline gap-1">
                                        <span className="text-3xl sm:text-4xl font-black">{plan.price}</span>
                                        {plan.period && (
                                            <span
                                                className={`text-xs ${
                                                    isFeatured ? 'text-slate-400' : 'text-slate-500'
                                                }`}
                                            >
                                                /{plan.period}
                                            </span>
                                        )}
                                    </div>

                                    {/* Features List */}
                                    <ul className="mt-6 space-y-3">
                                        {plan.features.map((f, fIdx) => (
                                            <li key={fIdx} className="flex items-center gap-2.5 text-xs">
                                                <svg
                                                    className={`w-4 h-4 shrink-0 ${
                                                        isFeatured ? 'text-[#d4a843]' : 'text-emerald-500'
                                                    }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2.5"
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-8">
                                    <Link
                                        href={plan.buttonHref || '/register'}
                                        className={`w-full block py-3 text-center rounded-xl text-xs font-bold transition-all shadow-xs ${
                                            isFeatured
                                                ? 'bg-[#c0392b] hover:bg-[#a93226] text-white shadow-red-900/30'
                                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
                                        }`}
                                    >
                                        {plan.buttonText || 'Pilih Paket'}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
