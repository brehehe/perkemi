export default function CategoryPreview({
    categories = [
        { name: 'Dogi & Seragam', count: '12 Produk', image: null },
        { name: 'Pelindung Tubuh (Dō)', count: '8 Produk', image: null },
        { name: 'Sabuk & Obi', count: '15 Produk', image: null },
        { name: 'Merchandise Kejuaraan', count: '24 Produk', image: null },
    ],
    onSelectCategory,
    className = '',
}) {
    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {categories.map((cat, idx) => (
                <div
                    key={idx}
                    onClick={() => onSelectCategory && onSelectCategory(cat)}
                    className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-xs hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800"
                >
                    {/* Background image or gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                    {cat.image ? (
                        <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                            <span className="font-serif font-black text-6xl opacity-10">KEMPO</span>
                        </div>
                    )}

                    {/* Overlay Content */}
                    <div className="absolute inset-x-0 bottom-0 p-6 z-20">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4a843]">
                            {cat.count}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1 group-hover:text-[#f0c060] transition-colors">
                            {cat.name}
                        </h3>
                    </div>
                </div>
            ))}
        </div>
    );
}
