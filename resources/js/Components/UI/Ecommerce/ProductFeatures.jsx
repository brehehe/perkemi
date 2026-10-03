export default function ProductFeatures({
    title = 'Spesifikasi & Keunggulan Produk',
    description = 'Setiap perlengkapan diproduksi mengikuti regulasi WSKO dan standar keselamatan resmi PERKEMI.',
    features = [
        { name: 'Material Kanvas 12oz', description: 'Serat katun murni berkualitas tinggi, kuat, sejuk, dan tahan tarikan bantingan teknik Juho.' },
        { name: 'Jahitan Ganda Bertulang', description: 'Dirancang khusus untuk menahan tekanan latihan randori intensif dan pertandingan resmi.' },
        { name: 'Sertifikasi PB PERKEMI', description: 'Memiliki label resmi pengesahan peralatan pertandingan nasional.' },
        { name: 'Potongan Ergonomis', description: 'Memudahkan pergerakan leluasa saat eksekusi tendangan chudan geri maupun tangkisan jodan uke.' },
    ],
    className = '',
}) {
    return (
        <div className={`p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 ${className}`}>
            <div className="max-w-2xl">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {title}
                </h3>
                {description && (
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {features.map((feat, idx) => (
                    <div key={idx} className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                {feat.name}
                            </h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 pl-3.5 leading-relaxed">
                            {feat.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
