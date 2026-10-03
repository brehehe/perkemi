import Button from "@/Components/UI/Elements/Button";
export default function OrderHistory({
    orders = [
        {
            id: 'ORD-2026-0801',
            date: '02 September 2026',
            total: 'Rp 1.300.000',
            status: 'Selesai',
            statusVariant: 'success',
            items: [
                { name: 'Dogi Shorinji Kempo 12oz (Ukuran L)', quantity: 2 },
            ],
        },
        {
            id: 'ORD-2026-0789',
            date: '28 Agustus 2026',
            total: 'Rp 850.000',
            status: 'Dikirim',
            statusVariant: 'info',
            items: [
                { name: 'Pelindung Tubuh (Dō) Dewasa', quantity: 1 },
            ],
        },
    ],
    onViewDetail,
    className = '',
}) {
    const statusColors = {
        success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        info: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {orders.map((order) => (
                <div
                    key={order.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {order.id}
                            </span>
                            <span className="text-slate-400 text-xs ml-2">• {order.date}</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    statusColors[order.statusVariant] || statusColors.info
                                }`}
                            >
                                {order.status}
                            </span>
                            <span className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060]">
                                {order.total}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex justify-between">
                                <span>{item.name}</span>
                                <span className="text-slate-400 font-semibold">x{item.quantity}</span>
                            </div>
                        ))}
                    </div>

                    {onViewDetail && (
                        <div className="pt-2 flex justify-end">
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => onViewDetail(order)}
                                className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060] hover:underline"
                            >
                                Lihat Rincian & Invoice →
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
