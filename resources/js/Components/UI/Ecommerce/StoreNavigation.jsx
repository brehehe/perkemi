import { Link } from '@inertiajs/react';
import Button from '../Elements/Button';
import Input from '../Forms/Input';

export default function StoreNavigation({
    brand = 'Kempo Official Store',
    categories = [
        { label: 'Semua Produk', href: '#' },
        { label: 'Dogi & Obi', href: '#' },
        { label: 'Body Protector', href: '#' },
        { label: 'Merchandise', href: '#' },
    ],
    cartCount = 0,
    onOpenCart,
    searchQuery = '',
    onSearchChange,
    className = '',
}) {
    return (
        <div className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6 ${className}`}>
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Brand & Categories */}
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <span className="font-serif font-black text-sm tracking-wider text-slate-900 dark:text-white shrink-0">
                        {brand}
                    </span>

                    <nav className="flex items-center gap-1">
                        {categories.map((cat, idx) => (
                            <Link
                                key={idx}
                                href={cat.href}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap transition-colors"
                            >
                                {cat.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Search & Cart Button */}
                <div className="flex items-center gap-3">
                    {onSearchChange && (
                        <div className="flex-1 md:w-64">
                            <Input
                                value={searchQuery}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Cari perlengkapan kempo..."
                                iconLeft={(
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                )}
                                size="sm"
                            />
                        </div>
                    )}

                    <Button
                        type="button"
                        onClick={onOpenCart}
                        variant="secondary"
                        size="sm"
                        className="relative px-2"
                        aria-label="Buka keranjang"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>

                        {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#c0392b] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                                {cartCount}
                            </span>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
