import { useState } from 'react';
import { Link } from '@inertiajs/react';

export default function Navbar({
    brand = 'SMART PERKEMI',
    logo = null,
    links = [],
    actions = null,
    user = null,
    className = '',
}) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className={`sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand / Logo */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            {logo || (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#c0392b] to-[#e74c3c] flex items-center justify-center text-white shadow-md shadow-red-500/20 font-serif font-black text-lg group-hover:scale-105 transition-transform">
                                    SP
                                </div>
                            )}
                            <span className="font-serif font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-wider">
                                {brand}
                            </span>
                        </Link>

                        {/* Desktop Navigation Links */}
                        <nav className="hidden md:flex items-center gap-1 ml-8">
                            {links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.href}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                                        link.active
                                            ? 'text-[#c0392b] bg-[#c0392b]/10 dark:bg-[#c0392b]/20 font-bold'
                                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* Right Actions / User */}
                    <div className="hidden md:flex items-center gap-3">
                        {actions}
                    </div>

                    {/* Mobile Hamburger Button */}
                    <div className="flex md:hidden items-center gap-2">
                        {actions}
                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 animate-in slide-in-from-top-2 duration-150">
                    {links.map((link, idx) => (
                        <Link
                            key={idx}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${
                                link.active
                                    ? 'text-[#c0392b] bg-[#c0392b]/10 dark:bg-[#c0392b]/20 font-bold'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}
