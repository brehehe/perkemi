import Button from "@/Components/UI/Elements/Button";
import { useState } from 'react';

export default function ProductQuickview({
    isOpen = false,
    onClose,
    product,
    onAddToCart,
}) {
    if (!isOpen || !product) return null;

    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 p-6 sm:p-8">
                <Button variant="unstyled" size="none"
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
                        {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs text-slate-400">Pratinjau Produk</span>
                        )}
                    </div>

                    <div>
                        <span className="text-[11px] font-bold text-[#c0392b] uppercase tracking-wider">
                            {product.category || 'Peralatan Resmi'}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                            {product.name}
                        </h3>
                        <p className="text-xl font-black text-[#c0392b] dark:text-[#f0c060] mt-2">
                            {product.price}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">
                            {product.description || 'Peralatan standar resmi Pengurus Besar Shorinji Kempo Indonesia.'}
                        </p>

                        {product.sizes && (
                            <div className="mt-4">
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                    Pilih Ukuran
                                </label>
                                <div className="flex gap-2">
                                    {product.sizes.map((s) => (
                                        <Button variant="unstyled" size="none"
                                            key={s}
                                            type="button"
                                            onClick={() => setSelectedSize(s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                                                selectedSize === s
                                                    ? 'border-[#c0392b] bg-[#c0392b] text-white'
                                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {s}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => {
                                    if (onAddToCart) onAddToCart({ ...product, size: selectedSize });
                                    onClose();
                                }}
                                className="w-full py-3 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-bold transition-all shadow-md"
                            >
                                Tambahkan ke Keranjang
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
