import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button, Checkbox, Input, ThemeToggle } from '@/Components/UI';

export default function Login({ totalAthletes = 520, totalProvinces = 38, year = new Date().getFullYear(), status }) {
    const [showPassword, setShowPassword] = useState(false);
    const [loginMode, setLoginMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('tab') === 'panitera') {
                return 'panitera';
            }
        }
        return 'account';
    });

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const tokenForm = useForm({
        token: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    const submitToken = (e) => {
        e.preventDefault();
        tokenForm.post('/login/panitera-token', {
            onFinish: () => tokenForm.reset('token'),
        });
    };

    return (
        <>
            <Head title="Login — Admin Kejuaraan Shorinji Kempo Indonesia" />

            <div className="auth-page font-dm min-h-screen flex flex-col items-center justify-center p-4 py-8 md:py-12 relative overflow-x-hidden overflow-y-auto">
                {/* Theme Toggle Button */}
                <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />

                <div className="flex items-center justify-center w-full max-w-5xl mx-auto my-auto relative z-10">
                    {/* ── Left Panel (Decorative) ── */}
                    <div className="hidden lg:flex flex-col justify-between w-[420px] min-h-[620px] relative z-10 pr-12 animate-fade-up">
                        {/* Brand Mark */}
                        <div className="flex items-center gap-4">
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center font-cinzel text-[#d4a843] font-bold text-xl flex-shrink-0 shadow-emblem"
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
                                    Indonesia · Admin Portal
                                </p>
                            </div>
                        </div>

                        {/* Hero Text */}
                        <div className="space-y-6 animate-fade-up-2">
                            <h2 className="font-cinzel panel-title dark:text-white text-4xl font-bold leading-tight tracking-wide">
                                Selamat
                                <br />
                                <span style={{ color: '#d4a843' }}>Datang</span>
                                <br />
                                Kembali
                            </h2>

                            <p className="panel-desc dark:text-[#b5afa6] text-sm leading-relaxed max-w-xs">
                                Portal administrasi resmi Kejuaraan Nasional Shorinji Kempo Indonesia. Kelola peserta,
                                jadwal, dan data kejuaraan secara efisien.
                            </p>

                            {/* Stats Chips */}
                            <div className="flex gap-3 flex-wrap">
                                <div className="stat-chip flex items-center gap-2 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-users text-[#c0392b] text-xs"></i>
                                    <span className="panel-title dark:text-white text-xs font-medium">
                                        {Number(totalAthletes).toLocaleString()} Peserta
                                    </span>
                                </div>
                                <div className="stat-chip flex items-center gap-2 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-trophy text-[#d4a843] text-xs"></i>
                                    <span className="panel-title dark:text-white text-xs font-medium">
                                        {totalProvinces} Wilayah
                                    </span>
                                </div>
                                <div className="stat-chip flex items-center gap-2 border rounded-xl px-4 py-2.5">
                                    <i className="fa-solid fa-calendar-check text-[#c0392b] text-xs"></i>
                                    <span className="panel-title dark:text-white text-xs font-medium">
                                        Aktif {year}
                                    </span>
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
                    <div className="hidden lg:block w-px self-stretch mx-4 my-8 relative z-10 animate-fade-up gold-sep"></div>

                    {/* ── Login Card ── */}
                    <div className="relative z-10 w-full max-w-md animate-fade-up-2">
                        <div className="login-card rounded-2xl border overflow-hidden">
                            {/* Card Header */}
                            <div className="border-b px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8 card-divider">
                                {/* Mobile Brand (shown only on mobile) */}
                                <div className="flex items-center gap-3 mb-6 lg:hidden">
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center font-cinzel text-[#d4a843] font-bold text-sm"
                                        style={{
                                            background: 'linear-gradient(135deg, #c0392b, #96281b)',
                                            boxShadow: '0 4px 14px rgba(192,57,43,.45)',
                                        }}
                                    >
                                        SK
                                    </div>
                                    <div>
                                        <p className="font-cinzel section-title dark:text-white text-[10px] font-bold tracking-widest uppercase">
                                            Shorinji Kempo Indonesia
                                        </p>
                                        <p className="label-text dark:text-[#b5afa6] text-[9px] tracking-[.14em] uppercase mt-0.5">
                                            Admin Portal
                                        </p>
                                    </div>
                                </div>

                                <div className="flex border-b border-[#e5ded4] dark:border-[#3a3530] mb-5">
                                    <button
                                        type="button"
                                        onClick={() => setLoginMode('account')}
                                        className={`flex-1 pb-3 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
                                            loginMode === 'account'
                                                ? 'border-[#c0392b] text-[#c0392b] dark:text-[#f87171] dark:border-[#f87171]'
                                                : 'border-transparent text-[#7a746e] hover:text-[#17120f] dark:text-[#a8a29e] dark:hover:text-white'
                                        }`}
                                    >
                                        <i className="fa-solid fa-user-shield mr-2" aria-hidden="true" />
                                        Akun Pengguna
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginMode('panitera')}
                                        className={`flex-1 pb-3 text-xs font-bold tracking-wider uppercase transition-colors border-b-2 ${
                                            loginMode === 'panitera'
                                                ? 'border-[#d4a843] text-[#a96f12] dark:text-[#d4a843] dark:border-[#d4a843]'
                                                : 'border-transparent text-[#7a746e] hover:text-[#17120f] dark:text-[#a8a29e] dark:hover:text-white'
                                        }`}
                                    >
                                        <i className="fa-solid fa-key mr-2" aria-hidden="true" />
                                        Token Panitera (6 Digit)
                                    </button>
                                </div>

                                <h1 className="font-cinzel card-h1 dark:text-white text-2xl font-bold tracking-wide">
                                    {loginMode === 'account' ? 'Masuk ke Akun' : 'Masuk Meja Panitera'}
                                </h1>
                                <p className="card-p dark:text-[#b5afa6] text-sm mt-1.5">
                                    {loginMode === 'account'
                                        ? 'Gunakan email atau nomor HP akun Anda untuk melanjutkan.'
                                        : 'Gunakan 6 digit token tatami untuk mengontrol antrean dan timer meja.'}
                                </p>
                            </div>

                            {loginMode === 'panitera' ? (
                                /* Panitera Token Form */
                                <form onSubmit={submitToken} className="space-y-5 px-5 py-6 sm:px-8 sm:py-7">
                                    <div className="rounded-xl border border-[#d4a843]/40 bg-[#fffbf2] dark:bg-[#d4a843]/10 p-3.5 text-xs text-[#5f4210] dark:text-[#fff4ce]">
                                        <p className="font-semibold flex items-center gap-2">
                                            <i className="fa-solid fa-circle-info text-[#d4a843]" />
                                            Akses Cepat Meja Tatami
                                        </p>
                                        <p className="mt-1 text-[11px] leading-relaxed text-[#7a5b1f] dark:text-[#e5d8b8]">
                                            Masukkan 6 digit kode token meja pertandingan yang aktif untuk masuk langsung tanpa password.
                                        </p>
                                    </div>

                                    <Input
                                        label="Token Meja / Tatami (6 Digit)"
                                        required
                                        maxLength={6}
                                        value={tokenForm.data.token}
                                        onChange={(event) => tokenForm.setData('token', event.target.value.replace(/\D/g, ''))}
                                        placeholder="Contoh: 849201"
                                        autoComplete="one-time-code"
                                        iconLeft={<i className="fa-solid fa-hashtag" aria-hidden="true" />}
                                        error={tokenForm.errors.token}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-mono text-center tracking-[0.3em] text-xl font-bold"
                                    />

                                    <div className="gold-line animate-fade-up-4"></div>

                                    <Button
                                        type="submit"
                                        disabled={tokenForm.processing || tokenForm.data.token.length !== 6}
                                        size="lg"
                                        className="submit-btn relative w-full tracking-wide overflow-hidden animate-fade-up-4"
                                        style={{
                                            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
                                            boxShadow: '0 4px 20px rgba(212,168,67,.4)',
                                        }}
                                    >
                                        {tokenForm.processing ? (
                                            <span className="flex items-center justify-center gap-2.5">
                                                <i className="fa-solid fa-circle-notch animate-spin text-white"></i>
                                                Memverifikasi Token...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2.5">
                                                <i className="fa-solid fa-desktop text-white"></i>
                                                Masuk ke Meja Pertandingan
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                /* Normal Account Form */
                                <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-8 sm:py-7">
                                    {status && (
                                        <div
                                            role="status"
                                            className="flex items-start gap-3 rounded-xl border border-[#d4a843]/55 bg-[#fff8e8] p-3.5 text-xs leading-relaxed dark:border-[#d4a843]/50 dark:bg-[#d4a843]/10 animate-fade-up"
                                        >
                                            <i className="fa-solid fa-envelope-circle-check mt-0.5 shrink-0 text-base text-[#a96f12] dark:text-[#d4a843]" aria-hidden="true"></i>
                                            <div>
                                                <p className="mb-0.5 font-semibold text-[#5f4210] dark:text-[#fff4ce]">Pemberitahuan</p>
                                                <p className="text-[11px] leading-normal text-[#665b4c] dark:text-[#e8dfcf]">{status}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Email atau nomor HP */}
                                    <Input
                                        label="Email atau Nomor HP"
                                        required
                                        value={data.email}
                                        onChange={(event) => setData('email', event.target.value)}
                                        placeholder="admin@perkemi.or.id atau 0812..."
                                        autoComplete="username"
                                        iconLeft={<i className="fa-solid fa-user" aria-hidden="true" />}
                                        error={errors.email}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />

                                    {/* Password */}
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        label="Kata Sandi"
                                        required
                                        value={data.password}
                                        onChange={(event) => setData('password', event.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        iconLeft={<i className="fa-solid fa-lock" aria-hidden="true" />}
                                        iconRight={(
                                            <Button variant="unstyled" size="none"
                                                type="button"
                                                onClick={() => setShowPassword((current) => !current)}
                                                className="eye-btn flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 sm:h-8 sm:w-8"
                                                aria-label="Tampilkan atau sembunyikan kata sandi"
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
                                            </Button>
                                        )}
                                        error={errors.password}
                                        containerClassName="w-full animate-fade-up-3"
                                        labelClassName="label-text dark:text-[#b5afa6] tracking-widest"
                                        className="kempo-input font-dm"
                                    />

                                    {/* Remember + Forgot */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 animate-fade-up-3">
                                        <Checkbox
                                            id="remember-login"
                                            label="Ingat saya"
                                            checked={data.remember}
                                            onChange={(event) => setData('remember', event.target.checked)}
                                            className="label-text dark:text-[#b5afa6]"
                                        />
                                        <Link
                                            href="#"
                                            className="text-xs font-medium transition-colors hover:underline hover:opacity-90"
                                            style={{ color: '#d4a843' }}
                                        >
                                            Lupa kata sandi?
                                        </Link>
                                    </div>

                                    {/* Gold Divider */}
                                    <div className="gold-line animate-fade-up-4"></div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        size="lg"
                                        className="submit-btn relative w-full tracking-wide overflow-hidden animate-fade-up-4"
                                        style={{
                                            background: 'linear-gradient(135deg, #c0392b, #96281b)',
                                            boxShadow: '0 4px 20px rgba(192,57,43,.4)',
                                        }}
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center gap-2.5">
                                                <i className="fa-solid fa-circle-notch animate-spin text-[#d4a843]"></i>
                                                Memverifikasi...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2.5">
                                                <i className="fa-solid fa-right-to-bracket text-[#d4a843]"></i>
                                                Masuk ke Dashboard
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            )}

                            {/* Card Footer */}
                            <div className="px-8 py-5 card-divider border-t flex items-center justify-between">
                                <p className="panel-footer text-[10px] tracking-wide">
                                    Belum punya akun?{' '}
                                    <Link href="/register" className="font-bold hover:underline" style={{ color: '#d4a843' }}>
                                        Daftar di sini
                                    </Link>
                                </p>
                                <div className="flex items-center gap-1.5 animate-shimmer">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        Sistem Aktif
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Security Notice */}
                        <p className="text-center panel-footer text-[10px] tracking-wider mt-5 uppercase animate-fade-up-4">
                            <i className="fa-solid fa-lock text-[8px] mr-1"></i>
                            Koneksi aman · TLS 1.3 · Akses terbatas
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
