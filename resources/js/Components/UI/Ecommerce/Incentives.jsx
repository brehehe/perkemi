export default function Incentives({
    incentives = [
        {
            name: 'Peralatan Resmi PB PERKEMI',
            description: 'Terstandarisasi dan diakui untuk seluruh kejuaraan resmi Shorinji Kempo di Indonesia.',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            ),
        },
        {
            name: 'Pengiriman Seluruh Nusantara',
            description: 'Bekerja sama dengan ekspedisi tepercaya menjangkau seluruh pengprov dan dojo se-Indonesia.',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            ),
        },
        {
            name: 'Garansi Penukaran Ukuran',
            description: 'Salah pilih ukuran dogi? Tukar dengan mudah dalam 7 hari kerja setelah barang diterima.',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            ),
        },
        {
            name: 'Layanan Sekretariat 24/7',
            description: 'Konsultasi ketersediaan barang dan pemesanan massal kontingen via WhatsApp admin.',
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            ),
        },
    ],
    className = '',
}) {
    return (
        <div className={`p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 ${className}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {incentives.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {item.icon}
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                {item.name}
                            </h4>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
