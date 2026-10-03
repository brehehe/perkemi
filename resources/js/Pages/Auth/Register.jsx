import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button, Input, Textarea } from '@/Components/UI';

export default function Register({ year = new Date().getFullYear(), event = null }) {
    const [isDark, setIsDark] = useState(true);

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        contingent_name: '',
        city: '',
        manager_name: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        const saved = localStorage.getItem('kempo-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const activeDark = saved === 'dark' || (!saved && prefersDark);
        setIsDark(activeDark);
        if (activeDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('kempo-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('kempo-theme', 'light');
        }
    };

    const submit = (e) => {
        e.preventDefault();
        if (event?.slug) {
            post(`/event/${event.slug}/register`);
        } else {
            post('/register');
        }
    };

    return (
        <>
            <Head title="Pendaftaran Kontingen — SMART-PERKEMI" />

            <div className="auth-page font-dm min-h-screen flex flex-col items-center justify-center p-4 py-8 md:py-12 relative overflow-x-hidden overflow-y-auto">
                {/* Theme Toggle Button */}
                <Button variant="unstyled" size="none"
                    id="modeToggle"
                    onClick={toggleTheme}
                    type="button"
                    title={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
                    aria-label="Toggle Theme"
                >
                    <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`} id="modeIcon"></i>
                </Button>

                <div className="flex items-center justify-center w-full max-w-6xl mx-auto my-auto relative z-10 gap-6">
                    {/* ── Left Panel (Decorative) ── */}
                    <div className="hidden xl:flex flex-col justify-between w-[380px] min-h-[640px] relative z-10 pr-6 animate-fade-up">
                        {/* Brand Mark */}
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center font-cinzel text-[#d4a843] font-bold text-xl flex-shrink-0 shadow-emblem"
                                style={{
                                    background: 'linear-gradient(135deg, #c0392b, #96281b)',
                                }}
                            >
                                SK
                            </div>
                            <div>
                                <p className="font-cinzel panel-title dark:text-white text-xs font-bold tracking-widest uppercase leading-tight">
                                    Shorinji Kempo
                                </p>
                                <p className="panel-desc dark:text-[#b5afa6] text-[9px] tracking-[.16em] uppercase mt-0.5">
                                    Indonesia · Portal Kontingen
                                </p>
                            </div>
                        </div>

                        {/* Hero Text */}
                        <div className="space-y-6 animate-fade-up-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 text-[11px] font-semibold text-[var(--auth-accent-text)]">
                                <i className="fa-solid fa-sparkles text-[10px]"></i>
                                Pendaftaran Praktis & Otomatis
                            </div>

                            <h2 className="font-cinzel panel-title dark:text-white text-3xl font-bold leading-tight tracking-wide">
                                Registrasi
                                <br />
                                <span style={{ color: '#d4a843' }}>Kontingen</span>
                                <br />
                                Shorinji Kempo
                            </h2>

                            <p className="panel-desc dark:text-[#b5afa6] text-sm leading-relaxed max-w-xs">
                                Daftarkan kontingen dan perwakilan dojo Anda. Akun serta kata sandi resmi akan di-generate oleh sistem dan dikirimkan langsung melalui email.
                            </p>

                            {/* Features list */}
                            <div className="space-y-3">
                                <div className="stat-chip flex items-center gap-3 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-key text-[#d4a843] text-sm"></i>
                                    <div>
                                        <p className="panel-title dark:text-white text-xs font-semibold">Password Auto-Generate</p>
                                        <p className="text-[10px] dark:text-[#b5afa6]">Tanpa repot buat password manual</p>
                                    </div>
                                </div>
                                <div className="stat-chip flex items-center gap-3 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-envelope-circle-check text-[#c0392b] text-sm"></i>
                                    <div>
                                        <p className="panel-title dark:text-white text-xs font-semibold">Terkirim Langsung ke Email</p>
                                        <p className="text-[10px] dark:text-[#b5afa6]">Kredensial dikirim via email resmi</p>
                                    </div>
                                </div>
                                <div className="stat-chip flex items-center gap-3 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-shield-check text-[#d4a843] text-sm"></i>
                                    <div>
                                        <p className="panel-title dark:text-white text-xs font-semibold">Aman & Terverifikasi</p>
                                        <p className="text-[10px] dark:text-[#b5afa6]">Verifikasi terpusat SMART-PERKEMI</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <p className="panel-footer text-[10px] tracking-wider uppercase animate-fade-up-3">
                            © {year} Pengurus Besar Shorinji Kempo Indonesia
                        </p>

                        <div className="deco-stripe"></div>
                    </div>

                    {/* ── Vertical Gold Divider ── */}
                    <div className="hidden xl:block w-px self-stretch mx-2 my-4 relative z-10 animate-fade-up gold-sep"></div>

                    {/* ── Registration Card ── */}
                    <div className="relative z-10 w-full max-w-2xl animate-fade-up-2 my-4 lg:my-0">
                        <div className="login-card rounded-2xl border overflow-hidden shadow-2xl">
                            {/* Card Header */}
                            <div className="px-6 md:px-8 pt-8 pb-6 card-divider border-b">
                                {/* Mobile Brand (shown only on mobile) */}
                                <div className="flex items-center gap-3 mb-5 xl:hidden">
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center font-cinzel text-[#d4a843] font-bold text-sm"
                                        style={{
                                            background: 'linear-gradient(135deg, #c0392b, #96281b)',
                                            boxShadow: '0 4px 14px rgba(192,57,43,.45)',
                                        }}
                                    >
                                        SK
                                    </div>
                                    <div>
                                        <p className="font-cinzel section-title dark:text-white text-[11px] font-bold tracking-widest uppercase">
                                            Shorinji Kempo Indonesia
                                        </p>
                                        <p className="label-text dark:text-[#b5afa6] text-[9px] tracking-[.14em] uppercase mt-0.5">
                                            Pendaftaran Kontingen Resmi
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h1 className="font-cinzel card-h1 dark:text-white text-xl md:text-2xl font-bold tracking-wide">
                                            Formulir Registrasi Kontingen
                                        </h1>
                                        <p className="card-p dark:text-[#b5afa6] text-xs md:text-sm mt-1">
                                            Isi data kontingen di bawah ini. Password akun akan dikirimkan otomatis ke email Anda.
                                        </p>
                                    </div>

                                    {/* Email Preview Link for easy inspection */}
                                    {/* <a
                                        href="/preview-email"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d4a843]/40 bg-[#d4a843]/10 text-[#f5d77f] text-[11px] font-medium hover:bg-[#d4a843]/20 transition-colors self-start sm:self-auto"
                                        title="Buka pratinjau tampilan email pendaftaran"
                                    >
                                        <i className="fa-solid fa-eye text-[10px]"></i>
                                        <span>Preview Email</span>
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                                    </a> */}
                                </div>
                            </div>

                            {/* Event Banner if registered for specific event */}
                            {event && (
                                <div className="mx-6 md:mx-8 mt-6 p-4 rounded-xl border border-[#c0392b]/40 bg-[#c0392b]/10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#c0392b]/20 flex items-center justify-center flex-shrink-0 text-[#c0392b]">
                                            <i className="fa-solid fa-trophy text-sm"></i>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-[#c0392b] block tracking-wide">
                                                Mendaftar untuk Event Kejuaraan
                                            </span>
                                            <span className="text-sm font-bold dark:text-white text-[#141210]">
                                                {event.name}
                                            </span>
                                            <span className="text-[11px] text-[#78716c] dark:text-[#a8a29e] block mt-0.5">
                                                {event.venue}, {event.city} &middot; {event.dates_formatted}
                                            </span>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/event/${event.slug}`}
                                        className="text-xs font-semibold text-[var(--auth-accent-text)] hover:underline shrink-0"
                                    >
                                        Info Event &rarr;
                                    </Link>
                                </div>
                            )}

                            {/* System Info Banner */}
                            <div className="mx-6 md:mx-8 mt-4 p-4 rounded-xl border border-[#d4a843]/40 bg-[#d4a843]/10 flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-[#d4a843]/20 flex items-center justify-center flex-shrink-0 text-[#d4a843]">
                                    <i className="fa-solid fa-shield-keyhole text-xs"></i>
                                </div>
                                <div className="text-xs">
                                    <p className="font-semibold text-[var(--text)] mb-0.5">
                                        Tanpa Perlu Memasukkan Password Manual
                                    </p>
                                    <p className="text-[var(--text-sub)] leading-relaxed text-[11px]">
                                        Sistem kami akan men-generate password acak yang aman secara otomatis. Detail akun dan password akan langsung dikirimkan ke <strong>Email</strong> yang Anda cantumkan.
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={submit} className="px-6 md:px-8 py-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 1. Nama */}
                                    <Input
                                        label="Nama Lengkap Penanggung Jawab"
                                        required
                                        value={data.name}
                                        onChange={(event) => setData('name', event.target.value)}
                                        placeholder="Contoh: Sensei Budi Santoso"
                                        iconLeft={<i className="fa-solid fa-user" aria-hidden="true" />}
                                        error={errors.name}
                                        containerClassName="w-full animate-fade-up-2"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />

                                    {/* 2. Email */}
                                    <Input
                                        type="email"
                                        label="Alamat Email (Untuk Terima Password)"
                                        required
                                        value={data.email}
                                        onChange={(event) => setData('email', event.target.value)}
                                        placeholder="kontingen@gmail.com"
                                        iconLeft={<i className="fa-solid fa-envelope" aria-hidden="true" />}
                                        error={errors.email}
                                        containerClassName="w-full animate-fade-up-2"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 3. Nama Kontingen */}
                                    <Input
                                        label="Nama Kontingen"
                                        required
                                        value={data.contingent_name}
                                        onChange={(event) => setData('contingent_name', event.target.value)}
                                        placeholder="Contoh: Dojo Garuda Sakti"
                                        iconLeft={<i className="fa-solid fa-shield-halved" aria-hidden="true" />}
                                        error={errors.contingent_name}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />

                                    {/* 4. Kabupaten / Kota */}
                                    <Input
                                        label="Kabupaten / Kota"
                                        required
                                        value={data.city}
                                        onChange={(event) => setData('city', event.target.value)}
                                        placeholder="Contoh: Kota Surabaya"
                                        iconLeft={<i className="fa-solid fa-map-location-dot" aria-hidden="true" />}
                                        error={errors.city}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 5. Manager */}
                                    <Input
                                        label="Nama Manager Kontingen"
                                        required
                                        value={data.manager_name}
                                        onChange={(event) => setData('manager_name', event.target.value)}
                                        placeholder="Nama Lengkap Manager"
                                        iconLeft={<i className="fa-solid fa-user-tie" aria-hidden="true" />}
                                        error={errors.manager_name}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />

                                    {/* 6. Nomor Hp / Whatsapp */}
                                    <Input
                                        type="tel"
                                        label="Nomor HP / WhatsApp"
                                        required
                                        value={data.phone}
                                        onChange={(event) => setData('phone', event.target.value)}
                                        placeholder="Contoh: 081234567890"
                                        iconLeft={<i className="fa-brands fa-whatsapp text-emerald-400" aria-hidden="true" />}
                                        error={errors.phone}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />
                                </div>

                                {/* 7. Alamat */}
                                <Textarea
                                    label="Alamat Lengkap Domisili / Dojo"
                                    required
                                    rows={3}
                                    value={data.address}
                                    onChange={(event) => setData('address', event.target.value)}
                                    placeholder="Masukkan alamat sekretariat, dojo, atau domisili kontingen..."
                                    error={errors.address}
                                    containerClassName="w-full animate-fade-up-3"
                                    labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                    className="kempo-input font-dm resize-none"
                                />

                                {/* Gold Divider */}
                                <div className="gold-line animate-fade-up-4 pt-2"></div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    size="lg"
                                    className="submit-btn relative w-full tracking-wide overflow-hidden animate-fade-up-4 shadow-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, #c0392b, #96281b)',
                                        boxShadow: '0 4px 20px rgba(192,57,43,.4)',
                                    }}
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2.5">
                                            <i className="fa-solid fa-circle-notch animate-spin text-[#d4a843]"></i>
                                            Mendaftarkan Kontingen & Mengirim Password...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2.5">
                                            <i className="fa-solid fa-paper-plane text-[#d4a843]"></i>
                                            Daftarkan Kontingen & Dapatkan Password
                                        </span>
                                    )}
                                </Button>
                            </form>

                            {/* Card Footer */}
                            <div className="px-8 py-4 card-divider border-t flex items-center justify-between flex-wrap gap-2 text-center">
                                <p className="panel-footer text-xs">
                                    Sudah memiliki akun?{' '}
                                    <Link href="/login" className="font-bold text-[var(--auth-accent-text)] hover:underline">
                                        Masuk ke Portal
                                    </Link>
                                </p>
                                {/* c */}
                            </div>
                        </div>

                        {/* Back to Home Link */}
                        <Link
                            href="/"
                            className="text-center block panel-footer text-[11px] tracking-wider mt-5 uppercase animate-fade-up-4 hover:text-[var(--text)] transition-colors"
                        >
                            <i className="fa-solid fa-arrow-left text-[9px] mr-1.5"></i>
                            Kembali ke Halaman Utama
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
