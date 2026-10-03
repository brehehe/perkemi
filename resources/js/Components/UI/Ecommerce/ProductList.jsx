import Button from "@/Components/UI/Elements/Button";
export default function ProductList({
    products = [],
    onSelectProduct,
    onAddToCart,
    columns = 4,
    className = '',
}) {
    const colClasses = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={`grid ${colClasses[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-6 ${className}`}>
            {products.map((prod, idx) => (
                <div
                    key={prod.id || idx}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                    <div>
                        {/* Image */}
                        <div
                            onClick={() => onSelectProduct && onSelectProduct(prod)}
                            className="aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative cursor-pointer"
                        >
                            {prod.image ? (
                                <img
                                    src={prod.image}
                                    alt={prod.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <svg className="w-10 h-10 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                            )}

                            {prod.badge && (
                                <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-[#c0392b] text-white text-[10px] font-bold uppercase tracking-wider">
                                    {prod.badge}
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            {prod.category && (
                                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    {prod.category}
                                </p>
                            )}

                            <h3
                                onClick={() => onSelectProduct && onSelectProduct(prod)}
                                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1 cursor-pointer group-hover:text-[#c0392b] transition-colors line-clamp-2"
                            >
                                {prod.name}
                            </h3>

                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-sm sm:text-base font-black text-[#c0392b] dark:text-[#f0c060]">
                                    {prod.price}
                                </span>
                                {prod.rating && (
                                    <span className="text-xs text-amber-500 font-bold">★ {prod.rating}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Button */}
                    <div className="p-4 pt-0">
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => onAddToCart && onAddToCart(prod)}
                            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-[#c0392b] hover:text-white dark:bg-slate-800 dark:hover:bg-[#c0392b] text-slate-800 dark:text-slate-200 text-xs font-bold transition-all duration-150 flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Keranjang
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
