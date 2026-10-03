import { Link } from '@inertiajs/react';

export default function Footer({
    brand = 'SMART PERKEMI',
    description = 'Sistem Manajemen dan Administrasi Real-Time Shorinji Kempo Indonesia. Menghubungkan Pengurus Besar, Pengprov, Pengkot/Kab, dan Dojo di seluruh nusantara.',
    sections = [
        {
            title: 'Kejuaraan',
            links: [
                { label: 'Jadwal Pertandingan', href: '/schedule' },
                { label: 'Bagan Pertandingan', href: '/bracket' },
                { label: 'Perolehan Medali', href: '/medals' },
                { label: 'Daftar Atlet', href: '/athletes' },
            ],
        },
        {
            title: 'Regulasi',
            links: [
                { label: 'Aturan Pertandingan Shorinji Kempo', href: '#' },
                { label: 'Pedoman Penimbangan Badan', href: '#' },
                { label: 'Kode Etik Wasit & Juri', href: '#' },
                { label: 'Buku Panduan Teknis', href: '#' },
            ],
        },
        {
            title: 'Layanan',
            links: [
                { label: 'Pendaftaran Kontingen', href: '/register' },
                { label: 'Portal Admin', href: '/admin/dashboard' },
                { label: 'Bantuan & FAQ', href: '#faq' },
                { label: 'Kontak Sekretariat', href: '#contact' },
            ],
        },
    ],
    className = '',
}) {
    return (
        <footer className={`bg-[#0f0d0b] text-white border-t border-[#d4a843]/20 pt-16 pb-12 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#c0392b] to-[#e74c3c] flex items-center justify-center text-white font-serif font-black text-base shadow-md">
                                SP
                            </div>
                            <span className="font-serif font-bold text-lg tracking-wider text-white">
                                {brand}
                            </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                            {description}
                        </p>

                        <div className="pt-2 flex items-center gap-3 text-slate-400">
                            <span className="text-xs text-[#d4a843] font-medium">
                                Persaudaraan Bela Diri Kempo Indonesia
                            </span>
                        </div>
                    </div>

                    {/* Link Columns */}
                    {sections.map((sec, idx) => (
                        <div key={idx} className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#d4a843]">
                                {sec.title}
                            </h4>
                            <ul className="space-y-2 text-xs">
                                {sec.links.map((l, lIdx) => (
                                    <li key={lIdx}>
                                        <Link
                                            href={l.href}
                                            className="text-slate-400 hover:text-white transition-colors"
                                        >
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} {brand}. Hak Cipta Dilindungi Undang-Undang.</p>
                    <div className="flex items-center gap-4">
                        <a href="#" className="hover:text-slate-300 transition-colors">
                            Kebijakan Privasi
                        </a>
                        <a href="#" className="hover:text-slate-300 transition-colors">
                            Syarat & Ketentuan
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
