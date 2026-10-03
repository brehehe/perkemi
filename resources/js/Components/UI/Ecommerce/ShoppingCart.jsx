import Button from "@/Components/UI/Elements/Button";
export default function ShoppingCart({
    isOpen = false,
    onClose,
    items = [],
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    subtotal = 'Rp 0',
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Keranjang Belanja
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b]">
                                {items.length}
                            </span>
                        </div>

                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100 dark:divide-slate-800">
                        {items.length > 0 ? (
                            items.map((item, idx) => (
                                <div key={item.id || idx} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                                Item
                                            </div>
                                        )}
                                    </div>

                                    {/* Item info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {item.name}
                                            </h4>
                                            <Button variant="unstyled" size="none"
                                                type="button"
                                                onClick={() => onRemoveItem && onRemoveItem(item.id)}
                                                className="text-slate-400 hover:text-rose-500 ml-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </Button>
                                        </div>

                                        {item.size && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                                Ukuran: {item.size}
                                            </p>
                                        )}

                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060]">
                                                {item.price}
                                            </span>

                                            {/* Qty */}
                                            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, (item.quantity || 1) - 1)}
                                                    className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    -
                                                </Button>
                                                <span className="px-2 py-0.5 text-xs font-semibold">
                                                    {item.quantity || 1}
                                                </span>
                                                <Button variant="unstyled" size="none"
                                                    type="button"
                                                    onClick={() => onUpdateQuantity && onUpdateQuantity(item.id, (item.quantity || 1) + 1)}
                                                    className="px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                                Keranjang Anda masih kosong.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                            <span>Subtotal</span>
                            <span className="text-base text-[#c0392b] dark:text-[#f0c060]">{subtotal}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Biaya pengiriman dan pajak dihitung pada saat checkout.
                        </p>

                        <Button variant="unstyled" size="none"
                            type="button"
                            disabled={items.length === 0}
                            onClick={onCheckout}
                            className="w-full py-3.5 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Lanjut ke Pembayaran
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
