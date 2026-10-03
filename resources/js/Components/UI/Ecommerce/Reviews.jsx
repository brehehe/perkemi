export default function Reviews({
    average = 4.9,
    totalReviews = 36,
    reviews = [
        {
            id: 1,
            author: 'Sensei Bambang H.',
            role: 'Pelatih Dojo Jakarta Selatan',
            rating: 5,
            date: '3 hari yang lalu',
            content: 'Bahan dogi sangat tebal dan nyaman dipakai untuk latihan bantingan Juho. Jahitannya rapi dan logo bordir PERKEMI sangat presisi.',
        },
        {
            id: 2,
            author: 'Kenshi Arya Pratama',
            role: 'Atlet Embu Pasangan Putra',
            rating: 5,
            date: '1 minggu yang lalu',
            content: 'Pelindung dō pas di badan dan peredaman pukulannya mantap saat randori. Pengiriman cepat dan aman sampai ke penginapan kontingen.',
        },
    ],
    className = '',
}) {
    return (
        <div className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-8 ${className}`}>
            {/* Header / Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Ulasan Pembeli & Kenshi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Berdasarkan {totalReviews} ulasan terverifikasi
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-[#c0392b] dark:text-[#f0c060]">
                        {average}
                    </div>
                    <div>
                        <div className="flex text-amber-400 text-sm">
                            {'★'.repeat(Math.round(average))}
                        </div>
                        <span className="text-[11px] text-slate-400">Rekomendasi Resmi</span>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                {reviews.map((r) => (
                    <div key={r.id} className="pt-6 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                    {r.author}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                    Terverifikasi
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-400">{r.date}</span>
                        </div>

                        {r.role && (
                            <p className="text-[11px] text-[#c0392b] dark:text-[#f0c060] font-semibold">
                                {r.role}
                            </p>
                        )}

                        <div className="flex text-amber-400 text-xs">
                            {'★'.repeat(r.rating || 5)}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {r.content}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
