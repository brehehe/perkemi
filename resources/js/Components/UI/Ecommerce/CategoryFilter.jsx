import Button from "@/Components/UI/Elements/Button";
export default function CategoryFilter({
    categories = [],
    selectedCategory = null,
    onSelectCategory,
    priceRange = { min: 0, max: 2000000 },
    onPriceChange,
    onClearFilters,
    className = '',
}) {
    return (
        <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 ${className}`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Filter Produk
                </h4>
                {onClearFilters && (
                    <Button variant="unstyled" size="none"
                        type="button"
                        onClick={onClearFilters}
                        className="text-[11px] text-[#c0392b] font-semibold hover:underline"
                    >
                        Reset
                    </Button>
                )}
            </div>

            {/* Categories */}
            <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Kategori
                </h5>
                <div className="space-y-1">
                    {categories.map((cat, idx) => {
                        const isSelected = selectedCategory === cat.value || selectedCategory === cat.name;
                        return (
                            <Button variant="unstyled" size="none"
                                key={idx}
                                type="button"
                                onClick={() => onSelectCategory && onSelectCategory(cat.value || cat.name)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                                    isSelected
                                        ? 'bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060]'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>{cat.name || cat.label}</span>
                                {cat.count && <span className="text-[10px] text-slate-400">({cat.count})</span>}
                            </Button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
