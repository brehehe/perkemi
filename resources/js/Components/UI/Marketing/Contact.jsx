import Button from '../Elements/Button';
import Input from '../Forms/Input';
import Textarea from '../Forms/Textarea';

export default function Contact({
    badge = 'Hubungi Panitia',
    title = 'Sekretariat & Layanan Bantuan',
    description = 'Memerlukan klarifikasi nomor tanding atau konfirmasi pendaftaran kontingen? Tim sekretariat kami siap membantu.',
    contacts = [
        { label: 'Alamat Sekretariat', value: 'GOR Shorinji Kempo, Jakarta', icon: 'location' },
        { label: 'Email Resmi', value: 'kejuaraan@smart-perkemi.id', icon: 'email' },
        { label: 'Telepon / WhatsApp', value: '+62 812-3456-7890', icon: 'phone' },
    ],
    onSubmit,
    className = '',
}) {
    return (
        <section className={`py-16 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Info */}
                    <div>
                        {badge && (
                            <p className="text-xs font-bold text-[#c0392b] dark:text-[#f0c060] uppercase tracking-wider mb-2">
                                {badge}
                            </p>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {description}
                            </p>
                        )}

                        <div className="mt-8 space-y-4">
                            {contacts.map((c, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#c0392b] flex items-center justify-center shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            {c.label}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                                            {c.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inquiry Form */}
                    <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                            Kirim Pertanyaan
                        </h3>

                        <form onSubmit={onSubmit} className="space-y-4">
                            <Input
                                label="Nama Lengkap"
                                required
                                placeholder="Sensei / Manajer Kontingen..."
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input type="email" label="Email" required placeholder="email@kontingen.id" />
                                <Input type="tel" label="No. WhatsApp" required placeholder="0812xxxx" />
                            </div>

                            <Textarea
                                label="Pesan / Pertanyaan"
                                rows={4}
                                required
                                placeholder="Tuliskan pertanyaan atau kebutuhan bantuan Anda..."
                            />

                            <Button type="submit" className="w-full shadow-md">
                                Kirim Pesan
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
