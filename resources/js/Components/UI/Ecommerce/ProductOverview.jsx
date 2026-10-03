import Button from "@/Components/UI/Elements/Button";
import { useState } from 'react';

export default function ProductOverview({
    product = {
        name: 'Dogi Shorinji Kempo Standar Pertandingan',
        price: 'Rp 650.000',
        rating: 5,
        reviewCount: 48,
        description: 'Seragam (Dogi) resmi Shorinji Kempo bahan kanvas katun tebal 12oz dengan jahitan ganda berkualitas tinggi dan logo PERKEMI bordir presisi.',
        images: [],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Putih'],
    },
    onAddToCart,
    className = '',
}) {
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'L');
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}>
            {/* Gallery */}
            <div className="space-y-4">
                <div className="h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800 relative">
                    {product.images?.[activeImage] ? (
                        <img
                            src={product.images[activeImage]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-slate-400 text-center p-6">
                            <svg className="w-16 h-16 mx-auto mb-2 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span className="text-xs font-semibold">Foto Produk Resmi</span>
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {product.images?.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto">
                        {product.images.map((img, idx) => (
                            <Button variant="unstyled" size="none"
                                key={idx}
                                type="button"
                                onClick={() => setActiveImage(idx)}
                                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                    activeImage === idx ? 'border-[#c0392b]' : 'border-transparent opacity-70'
                                }`}
                            >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Details & Purchase Form */}
            <div className="flex flex-col justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {product.name}
                    </h1>

                    <div className="mt-3 flex items-center gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-[#c0392b] dark:text-[#f0c060]">
                            {product.price}
                        </span>

                        {product.rating && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold border-l border-slate-200 dark:border-slate-800 pl-3">
                                <span>★ {product.rating}</span>
                                <span className="text-slate-400 font-normal">({product.reviewCount} ulasan)</span>
                            </div>
                        )}
                    </div>

                    <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {product.description}
                    </p>

                    {/* Size Picker */}
                    {product.sizes?.length > 0 && (
                        <div className="mt-6">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                                Ukuran Dogi
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {product.sizes.map((sz) => (
                                    <Button variant="unstyled" size="none"
                                        key={sz}
                                        type="button"
                                        onClick={() => setSelectedSize(sz)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                            selectedSize === sz
                                                ? 'border-[#c0392b] bg-[#c0392b] text-white shadow-xs'
                                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                        }`}
                                    >
                                        {sz}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity */}
                    <div className="mt-6">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Jumlah
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                >
                                    -
                                </Button>
                                <span className="px-4 py-2 text-xs font-bold">{quantity}</span>
                                <Button variant="unstyled" size="none"
                                    type="button"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                >
                                    +
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={() => onAddToCart && onAddToCart({ product, selectedSize, quantity })}
                        className="flex-1 py-3.5 rounded-xl bg-[#c0392b] hover:bg-[#a93226] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Tambah ke Keranjang
                    </Button>
                </div>
            </div>
        </div>
    );
}
