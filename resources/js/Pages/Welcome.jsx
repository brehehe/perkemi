import Button from "@/Components/UI/Elements/Button";
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Welcome({ stats = {}, techniquesByLevel = [] }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    // Mobile menu state
    const [mobileMenu, setMobileMenu] = useState(false);

    // Hero slider state
    const [slide, setSlide] = useState(0);
    const [progress, setProgress] = useState(0);
    const totalSlides = 3;
    const timerRef = useRef(null);

    // Default stats fallback
    const liveStats = {
        peserta: stats?.peserta ?? '500+',
        nomor: stats?.nomor ?? '30+',
        kontingen: stats?.kontingen ?? '20+',
        edisi: '2026',
    };

    // Default techniques fallback
    const levels = techniquesByLevel.length > 0 ? techniquesByLevel : [
        {
            name: 'Kyu 6 & 5',
            techniques: [
                { name: 'Tsuki / Uchi (Pukulan & Tebasan)' },
                { name: 'Keri (Tendangan Dasar)' },
                { name: 'Uke (Tangkisan Dasar)' },
                { name: 'Ryote Yori Ude Morote Dori' },
                { name: 'Kote Nuki' },
                { name: 'Ude Juji Gatame' },
            ],
        },
        {
            name: 'Kyu 4 & 3',
            techniques: [
                { name: 'Gyaku Geri' },
                { name: 'Uchi Uke Tsuki' },
                { name: 'Ryote Yori Kote Nuki' },
                { name: 'Gyaku Gote' },
                { name: 'Maki Gote' },
                { name: 'Kiri Gaeshi' },
            ],
        },
        {
            name: 'Kyu 2 & 1',
            techniques: [
                { name: 'Chudan Tsuki & Uchi Geri' },
                { name: 'Jodan Uke Dageki' },
                { name: 'Okuri Gote' },
                { name: 'Kiri Gote' },
                { name: 'Gassho Gote' },
                { name: 'Ude Maki' },
            ],
        },
        {
            name: 'Dan 1 (Shodan)',
            techniques: [
                { name: 'Tsubame Gaeshi' },
                { name: 'Chidori Gaeshi' },
                { name: 'Kumo Garami' },
                { name: 'Oshi Kiri Gote' },
                { name: 'Gyaku Gote Sode Maki' },
                { name: 'Ryote Maki Gote' },
            ],
        },
        {
            name: 'Dan 2 (Nidan)',
            techniques: [
                { name: 'Furi Dori Gyaku Gote' },
                { name: 'Hiki Gote' },
                { name: 'Kubi Jime Nuki' },
                { name: 'Tora Otoshi' },
                { name: 'Kusari Gote' },
                { name: 'Me Nuki Dori' },
            ],
        },
    ];

    const [activeLevel, setActiveLevel] = useState(0);

    // Slider timer effect
    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(0);
        let tick = 0;
        timerRef.current = setInterval(() => {
            tick++;
            setProgress((tick / 55) * 100);
            if (tick >= 55) {
                setSlide((prev) => (prev + 1) % totalSlides);
                tick = 0;
                setProgress(0);
            }
        }, 100);
    };

    useEffect(() => {
        startTimer();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [totalSlides]);

    const goTo = (i) => {
        setSlide(i);
        startTimer();
    };

    const prev = () => {
        setSlide((prevSlide) => (prevSlide - 1 + totalSlides) % totalSlides);
        startTimer();
    };

    const next = () => {
        setSlide((prevSlide) => (prevSlide + 1) % totalSlides);
        startTimer();
    };

    // Marquee items
    const marqueeItems = [
        '🥋 PIALA WALIKOTA SURABAYA 2026',
        '⚡ PENDAFTARAN ONLINE DIBUKA',
        `🏆 ${liveStats.nomor} NOMOR PERTANDINGAN`,
        '📍 GOR SURABAYA · JAWA TIMUR',
        '🎯 EMBU & RANDORI KYU DAN DAN',
        `💥 ${liveStats.peserta} PESERTA TERDAFTAR`,
        '🌟 SHORINJI KEMPO INDONESIA',
        '📣 TECHNICAL MEETING WAJIB HADIR',
    ];

    // Rundown items
    const rundownData = [
        {
            day: 'D-1',
            date: 'Sabtu, 14 Juni 2026',
            title: 'Technical Meeting',
            desc: 'Pemaparan teknik, nomor pertandingan, dan pengesahan nama atlet. Wajib dihadiri pelatih/manajer. Dilanjutkan timbang badan dan undian drawing nomor pertandingan.',
            icon: 'fa-users',
            color: 'orange',
            agenda: [
                '07.00 Registrasi & Distribusi Atribut',
                '08.30 Technical Meeting Embu & Randori',
                '13.00 Timbang Badan Randori',
                '15.00 Undian Drawing Nomor',
            ],
            venue: 'Aula Stadion GBT – Lt. 2',
        },
        {
            day: 'H-1',
            date: 'Minggu, 15 Juni 2026',
            title: 'Registrasi Ulang & Persiapan',
            desc: 'Verifikasi kelengkapan dokumen atlet, timbang badan sesi kedua, gladi resik upacara pembukaan, serta briefing teknis wasit dan juri.',
            icon: 'fa-clipboard-check',
            color: 'blue',
            agenda: [
                '06.00 Registrasi Ulang & Timbang Badan',
                '09.00 Gladi Resik Upacara Pembukaan',
                '11.00 Briefing Wasit & Juri',
                '16.00 Free Training Atlet',
            ],
            venue: 'Hall Utama Stadion GBT',
        },
        {
            day: 'Hari 1',
            date: 'Senin, 16 Juni 2026',
            title: 'Penyisihan Embu & Randori',
            desc: 'Upacara pembukaan resmi dilanjutkan babak penyisihan Embu Tunggal/Berpasangan Kyu & Dan, serta Randori untuk semua kelas putri dan putra.',
            icon: 'fa-fist-raised',
            color: 'purple',
            agenda: [
                '07.00 Upacara Pembukaan Resmi',
                '08.00 Penyisihan Embu Tunggal & Berpasangan',
                '08.00 Penyisihan Randori Putri/Putra Kelas A–C',
                '17.00 Rekap Hasil & Pengumuman Finalis',
            ],
            venue: 'Gelanggang Indoor GBT – 4 Lapangan',
        },
        {
            day: 'Hari 2',
            date: 'Selasa, 17 Juni 2026',
            title: 'Final & Upacara Penutupan',
            desc: 'Babak semifinal dan final seluruh kategori Embu dan Randori. Upacara penyerahan medali, piala, dan penutupan resmi kejuaraan.',
            icon: 'fa-trophy',
            color: 'orange',
            agenda: [
                '08.00 Semifinal Randori & Final Embu Tunggal',
                '09.30 FINAL Randori & Embu Berpasangan/Beregu',
                '13.00 Penyerahan Medali & Piala',
                '15.30 Upacara Penutupan Resmi',
            ],
            venue: 'Gelanggang Indoor GBT – Lapangan Utama',
        },
    ];

    const colorMap = {
        orange: {
            ring: 'bg-orange-500',
            badge: 'bg-orange-500/20 text-orange-400',
            border: 'hover:border-orange-500/30',
        },
        blue: {
            ring: 'bg-blue-500',
            badge: 'bg-blue-500/20 text-blue-400',
            border: 'hover:border-blue-500/30',
        },
        purple: {
            ring: 'bg-purple-500',
            badge: 'bg-purple-500/20 text-purple-400',
            border: 'hover:border-purple-500/30',
        },
    };

    return (
        <>
            <Head>
                <title>Piala Walikota Surabaya 2026 · SMART-PERKEMI</title>
                <meta
                    name="description"
                    content="Sistem Pendaftaran Resmi Kejuaraan Shorinji Kempo Piala Walikota Surabaya 2026"
                />
            </Head>

            <div className="font-['Inter'] antialiased overflow-x-hidden bg-pattern min-h-screen text-white selection:bg-orange-500 selection:text-white">
                {/* ===== NAVBAR ===== */}
                <nav className="fixed top-0 left-0 right-0 z-50 navbar-glass">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                        {/* Logo + Brand */}
                        <a href="/" className="flex items-center gap-2 sm:gap-3 group">
                            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden ring-2 ring-red-600/30 shadow-lg shadow-red-950/50 group-hover:ring-red-500/50 transition-all duration-300">
                                <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-black text-[11px] sm:text-[13px] uppercase tracking-[0.2em] leading-none mb-0.5">
                                    Shorinji Kempo
                                </span>
                                <span className="text-red-500 text-[13px] sm:text-[16px] font-bold uppercase tracking-[0.3em] leading-none">
                                    Indonesia
                                </span>
                            </div>
                        </a>

                        {/* Desktop Nav Links */}
                        <div className="hidden lg:flex items-center gap-10">
                            <a
                                href="#"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Home
                            </a>
                            <a
                                href="#about"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Tentang Kami
                            </a>
                            <a
                                href="#rundown"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Rundown
                            </a>
                            <a
                                href="#teknik"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Teknik
                            </a>
                            <a
                                href="/register"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Daftar
                            </a>
                            <a
                                href="#info"
                                className="nav-link text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors duration-300"
                            >
                                Kontak
                            </a>
                        </div>

                        {/* Auth + Mobile Toggle */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden sm:flex items-center gap-3">
                                {user ? (
                                    <div className="flex items-center gap-2.5">
                                        <Link
                                            href="/admin/dashboard"
                                            className="flex items-center gap-2 bg-[#c0392b] hover:bg-[#a82718] text-white text-[11px] font-bold px-5 py-2.5 rounded-full uppercase tracking-wider transition-all duration-300 shadow-md shadow-red-950/40 border border-white/20"
                                        >
                                            <i className="fa-solid fa-gauge-high text-xs text-[#f5d77f]"></i>
                                            <span>Dashboard</span>
                                        </Link>
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="text-white/60 hover:text-white hover:bg-white/10 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full transition-colors"
                                            title="Keluar"
                                        >
                                            <i className="fa-solid fa-right-from-bracket mr-1"></i>
                                            <span>Keluar</span>
                                        </Link>
                                    </div>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            className="text-white/70 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors duration-300"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            href="/register"
                                            className="bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black px-6 py-2.5 rounded-full uppercase tracking-widest transition-all duration-300 shadow-lg shadow-orange-950/50"
                                        >
                                            Daftar Sekarang
                                        </Link>
                                    </>
                                )}
                            </div>

                            {/* Mobile Menu Button */}
                            <Button variant="unstyled" size="none"
                                onClick={() => setMobileMenu(!mobileMenu)}
                                aria-label="Toggle Menu"
                                className="lg:hidden w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                            >
                                <i className={`fas ${mobileMenu ? 'fa-times' : 'fa-bars-staggered'}`}></i>
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Overlay */}
                    {mobileMenu && (
                        <div
                            className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 py-8 px-6 flex flex-col gap-6 items-center text-center animate-in fade-in slide-in-from-top-4 duration-300"
                        >
                            <a
                                href="#"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Home
                            </a>
                            <a
                                href="#about"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Tentang Kami
                            </a>
                            <a
                                href="#rundown"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Rundown
                            </a>
                            <a
                                href="#teknik"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Teknik
                            </a>
                            <a
                                href="/register"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Daftar
                            </a>
                            <a
                                href="#info"
                                onClick={() => setMobileMenu(false)}
                                className="text-white/60 hover:text-orange-500 text-sm font-bold uppercase tracking-widest transition-colors"
                            >
                                Kontak
                            </a>
                            <div className="w-full h-px bg-white/5 my-2"></div>
                            {user ? (
                                <div className="w-full flex flex-col gap-2.5">
                                    <div className="text-center pb-1">
                                        <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Masuk sebagai</p>
                                        <p className="text-sm text-white font-bold truncate">{user.name}</p>
                                    </div>
                                    <Link
                                        href="/admin/dashboard"
                                        onClick={() => setMobileMenu(false)}
                                        className="w-full bg-[#c0392b] hover:bg-[#a82718] text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <i className="fa-solid fa-gauge-high text-xs text-[#f5d77f]"></i>
                                        <span>Buka Dashboard</span>
                                    </Link>
                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        onClick={() => setMobileMenu(false)}
                                        className="w-full text-white/50 hover:text-red-400 text-xs font-bold uppercase tracking-widest py-2 text-center"
                                    >
                                        Keluar
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileMenu(false)}
                                        className="text-white/60 font-bold uppercase tracking-widest"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setMobileMenu(false)}
                                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest"
                                    >
                                        Daftar Sekarang
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </nav>

                {/* ===== HERO SLIDER ===== */}
                <section className="relative min-h-screen flex flex-col overflow-hidden" id="heroSlider">
                    {/* == STATIC BACKGROUNDS == */}
                    {/* Base gradient: red left → blue right */}
                    <div
                        className="absolute inset-0 z-0"
                        style={{
                            background:
                                'linear-gradient(to right, #5a0010 0%, #3d000f 25%, #1e0020 50%, #00083d 75%, #000d5a 100%)',
                        }}
                    ></div>

                    {/* LEFT RED orb */}
                    <div
                        className="orb-crimson absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse at 10% 50%, rgba(255,20,20,0.90) 0%, rgba(220,0,0,0.60) 20%, rgba(150,0,10,0.25) 40%, transparent 60%)',
                        }}
                    ></div>

                    {/* RIGHT BLUE orb */}
                    <div
                        className="orb-crimson absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse at 90% 50%, rgba(30,80,255,0.90) 0%, rgba(10,40,230,0.60) 20%, rgba(0,15,160,0.25) 40%, transparent 60%)',
                            animationDelay: '2.5s',
                        }}
                    ></div>

                    {/* Top arena ceiling glow */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[280px] pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse at 50% 0%, rgba(255,80,80,0.22) 0%, rgba(80,80,255,0.18) 55%, transparent 80%)',
                            filter: 'blur(18px)',
                        }}
                    ></div>

                    {/* Floor glow left red + right blue */}
                    <div
                        className="absolute bottom-0 left-0 w-1/2 h-52 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, rgba(255,20,20,0.55), transparent)',
                            filter: 'blur(18px)',
                        }}
                    ></div>
                    <div
                        className="absolute bottom-0 right-0 w-1/2 h-52 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, rgba(20,50,255,0.55), transparent)',
                            filter: 'blur(18px)',
                        }}
                    ></div>

                    {/* Navbar area top fade */}
                    <div
                        className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none"
                        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)' }}
                    ></div>

                    {/* ===== SLIDE 0 ===== */}
                    <div
                        className={`absolute inset-0 z-20 transition-all duration-700 ${
                            slide === 0
                                ? 'opacity-100 scale-100 pointer-events-auto'
                                : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                    >
                        <div className="relative h-full w-full flex items-center justify-center">
                            {/* Background Image Layer */}
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <img
                                    src="/hero-fighters.png"
                                    alt="Fighters"
                                    className="w-full h-full object-cover opacity-10 scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a0008] via-transparent to-transparent"></div>
                            </div>

                            {/* Content Container */}
                            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center hero-content pt-24 pb-32">
                                <div className="hero-tag mb-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                    </span>
                                    <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">
                                        Kejuaraan Resmi · SMART-PERKEMI
                                    </span>
                                </div>

                                <h1
                                    className="hero-title bebas leading-[0.85] text-white tracking-tight"
                                    style={{ fontSize: 'clamp(3.5rem, 15vw, 8rem)' }}
                                >
                                    SEMANGAT
                                    <br />
                                    <span className="text-orange-600">KEMPO.</span>
                                </h1>

                                <p className="hero-desc text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mt-8 max-w-2xl mx-auto font-medium">
                                    Tingkatkan Potensi Anda Melalui Shorinji Kempo Indonesia. Kejuaraan bergengsi tingkat
                                    nasional di Kota Surabaya 2026.
                                </p>

                                <div className="hero-cta mt-6 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    {user ? (
                                        <Link
                                            href="/dashboard"
                                            className="group relative inline-flex items-center justify-center gap-3 font-black text-xs sm:text-sm uppercase tracking-widest text-white px-8 py-3 rounded-full transition-all duration-500 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 group-hover:scale-105 transition-transform duration-500"></div>
                                            <span className="relative flex items-center gap-2">
                                                <i className="fas fa-tachometer-alt"></i> Dashboard
                                            </span>
                                        </Link>
                                    ) : (
                                        <>
                                            <Link
                                                href="/register"
                                                className="group relative inline-flex items-center justify-center gap-3 font-black text-xs sm:text-sm uppercase tracking-widest text-white px-8 py-3 rounded-full transition-all duration-500 overflow-hidden shadow-2xl shadow-orange-950/50"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 group-hover:scale-105 transition-transform duration-500"></div>
                                                <span className="relative">Daftar Kontingen</span>
                                            </Link>
                                            <Link
                                                href="/login"
                                                className="group inline-flex items-center justify-center gap-3 font-bold text-xs sm:text-sm text-white/70 hover:text-white uppercase tracking-widest px-8 py-3 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                                            >
                                                <i className="fas fa-sign-in-alt"></i> Login
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== SLIDE 1 ===== */}
                    <div
                        className={`absolute inset-0 z-20 transition-all duration-700 ${
                            slide === 1
                                ? 'opacity-100 scale-100 pointer-events-auto'
                                : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                    >
                        <div className="relative h-full w-full flex items-center justify-center">
                            {/* Background Image Layer */}
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <img
                                    src="/hero-fighters.png"
                                    alt="Fighters"
                                    className="w-full h-full object-cover opacity-10 scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#00083d] via-transparent to-transparent"></div>
                            </div>

                            {/* Content Container */}
                            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center hero-content pt-24 pb-32">
                                <div className="hero-tag mb-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                    <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">
                                        Teknik & Kategori · Kyu & Dan
                                    </span>
                                </div>

                                <h1
                                    className="hero-title bebas leading-[0.85] text-white tracking-tight"
                                    style={{ fontSize: 'clamp(3.5rem, 15vw, 6rem)' }}
                                >
                                    EMBU &
                                    <br />
                                    <span className="text-blue-500">RANDORI.</span>
                                </h1>

                                <p className="hero-desc text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mt-8 max-w-2xl mx-auto font-medium">
                                    Tersedia nomor pertandingan Embu Berpasangan dan Randori untuk semua kelompok usia
                                    dan tingkatan sabuk.
                                </p>

                                <div className="hero-cta mt-6 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    {user ? (
                                        <Link
                                            href="/dashboard"
                                            className="group relative inline-flex items-center justify-center gap-3 font-black text-xs sm:text-sm uppercase tracking-widest text-white px-8 py-3 rounded-full transition-all duration-500 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 group-hover:scale-105 transition-transform duration-500"></div>
                                            <span className="relative flex items-center gap-2">
                                                <i className="fas fa-tachometer-alt"></i> Dashboard
                                            </span>
                                        </Link>
                                    ) : (
                                        <Link
                                            href="/register"
                                            className="group relative inline-flex items-center justify-center gap-3 font-black text-xs sm:text-sm uppercase tracking-widest text-white px-8 py-3 rounded-full transition-all duration-500 overflow-hidden shadow-2xl shadow-blue-950/50"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 group-hover:scale-105 transition-transform duration-500"></div>
                                            <span className="relative">Pendaftaran Online</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== SLIDE 2 ===== */}
                    <div
                        className={`absolute inset-0 z-20 transition-all duration-700 ${
                            slide === 2
                                ? 'opacity-100 scale-100 pointer-events-auto'
                                : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                    >
                        <div className="relative h-full w-full flex items-center justify-center">
                            {/* Content Container */}
                            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col items-center text-center hero-content pt-24 pb-32">
                                <div className="hero-tag mb-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2">
                                    <span className="text-orange-400 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">
                                        Pendaftaran Dibuka Sekarang
                                    </span>
                                </div>

                                <h1
                                    className="hero-title bebas leading-[0.85] text-white tracking-tight"
                                    style={{ fontSize: 'clamp(4rem, 18vw, 6rem)' }}
                                >
                                    DAFTAR
                                    <br />
                                    <span
                                        style={{
                                            background: 'linear-gradient(90deg, #ff4d00, #0070ff)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                        }}
                                    >
                                        SEKARANG!
                                    </span>
                                </h1>

                                <p className="hero-desc text-white/60 text-sm sm:text-base md:text-lg leading-relaxed mt-8 max-w-xl mx-auto font-medium">
                                    Segera daftarkan kontingenmu dan jadilah saksi sejarah kejuaraan Shorinji Kempo
                                    terbesar tahun ini.
                                </p>

                                <div className="hero-cta mt-6 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <Link
                                        href="/register"
                                        className="group relative inline-flex items-center justify-center gap-3 font-black text-xs sm:text-sm uppercase tracking-widest text-white px-12 py-6 rounded-full transition-all duration-500 overflow-hidden shadow-[0_0_50px_-12px_rgba(234,88,12,0.5)]"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-blue-600 group-hover:scale-105 transition-transform duration-500"></div>
                                        <span className="relative">MULAI PENDAFTARAN</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== BOTTOM UI BAR ===== */}
                    <div className="absolute bottom-0 left-0 right-0 z-30">
                        {/* Ticker / Marquee */}
                        <div className="overflow-hidden py-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
                            <div className="marquee-inner flex whitespace-nowrap items-center">
                                {[...marqueeItems, ...marqueeItems].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 px-6">
                                        <span className="text-white/60 text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em]">
                                            {item}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600/50"></span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats + Controls */}
                        <div className="bg-black/60 backdrop-blur-2xl border-t border-white/5">
                            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-8">
                                {/* Stats (live from DB) */}
                                <div className="hidden lg:flex items-center gap-12">
                                    {[
                                        [liveStats.peserta, 'Peserta'],
                                        [liveStats.nomor, 'Nomor'],
                                        [liveStats.kontingen, 'Kontingen'],
                                        [liveStats.edisi, 'Edisi'],
                                    ].map((s, idx) => (
                                        <div key={idx} className="flex flex-col">
                                            <span className="text-white font-black text-xl leading-none mb-1">
                                                {s[0]}
                                            </span>
                                            <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                                                {s[1]}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Slide Navigation */}
                                <div className="flex items-center gap-6 mx-auto lg:mx-0">
                                    {/* Arrows */}
                                    <div className="flex items-center gap-2">
                                        <Button variant="unstyled" size="none"
                                            onClick={prev}
                                            aria-label="Previous Slide"
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                                        >
                                            <i className="fas fa-chevron-left text-xs group-active:scale-90 transition-transform"></i>
                                        </Button>
                                        <Button variant="unstyled" size="none"
                                            onClick={next}
                                            aria-label="Next Slide"
                                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 group"
                                        >
                                            <i className="fas fa-chevron-right text-xs group-active:scale-90 transition-transform"></i>
                                        </Button>
                                    </div>

                                    {/* Dots + Progress */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-2.5">
                                            {Array.from({ length: totalSlides }).map((_, i) => (
                                                <Button variant="unstyled" size="none"
                                                    key={i}
                                                    onClick={() => goTo(i)}
                                                    aria-label={`Go to slide ${i + 1}`}
                                                    className={`h-1.5 rounded-full transition-all duration-500 relative overflow-hidden ${
                                                        slide === i ? 'w-10 bg-white/20' : 'w-2 bg-white/10'
                                                    }`}
                                                >
                                                    {slide === i && (
                                                        <div
                                                            className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-500 transition-all duration-100"
                                                            style={{ width: `${progress}%` }}
                                                        ></div>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                        <div className="text-white/20 text-[11px] font-mono tracking-tighter">
                                            <span className="text-white/60">{`0${slide + 1}`}</span> /{' '}
                                            <span>{`0${totalSlides}`}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== ABOUT SECTION ===== */}
                <section
                    id="about"
                    className="py-24"
                    style={{
                        background: 'linear-gradient(160deg, #3d0010 0%, #1a0020 50%, #000838 100%)',
                    }}
                >
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6">
                                    <i className="fas fa-trophy text-orange-400 text-xs"></i>
                                    <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">
                                        Tentang Kejuaraan
                                    </span>
                                </div>
                                <h2 className="bebas text-5xl md:text-6xl text-white mb-6 tracking-wide leading-tight">
                                    SHORINJI KEMPO
                                    <br />
                                    <span className="text-orange-400">PIALA WALIKOTA</span>
                                </h2>
                                <p className="text-white/50 leading-relaxed mb-6">
                                    Kejuaraan Shorinji Kempo Piala Walikota Surabaya merupakan turnamen bergengsi yang
                                    mempertemukan kenshi terbaik dari seluruh Jawa Timur untuk bersaing dan menunjukkan
                                    teknik terbaik mereka.
                                </p>
                                <p className="text-white/50 leading-relaxed">
                                    Diselenggarakan dengan standar PERKEMI Nasional, kejuaraan ini menjadi ajang
                                    pengkaderan atlet berprestasi sekaligus wadah silaturahmi antar dojo Kota / Kabupaten
                                    Jawa Timur.
                                </p>

                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    {[
                                        ['fa-map-marker-alt', 'Lokasi', 'Stadion Indoor Gelora Bung Tomo'],
                                        ['fa-calendar', 'Jadwal', '14 Juni - 17 Juni 2026'],
                                        ['fa-users', 'Peserta', 'Terbuka Umum (Kyu & Dan)'],
                                        ['fa-award', 'Hadiah', 'Piala + Medali + Sertifikat'],
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mb-3">
                                                <i className={`fas ${item[0]} text-orange-400 text-xs`}></i>
                                            </div>
                                            <div className="text-white/40 text-[15px] uppercase tracking-widest font-bold">
                                                {item[1]}
                                            </div>
                                            <div className="text-white text-sm font-bold mt-1">{item[2]}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent rounded-[40px] blur-2xl transform scale-110"></div>
                                <div className="relative bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-[40px] p-10 text-center">
                                    <div className="w-28 h-28 bg-orange-500 rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/30 rotate-3 overflow-hidden">
                                        <img
                                            src="/logo.jpeg"
                                            alt="Logo"
                                            className="w-full h-full object-cover rounded-[30px]"
                                        />
                                    </div>
                                    <div className="bebas text-6xl text-white mb-2 tracking-wider">SMART</div>
                                    <div className="bebas text-3xl text-orange-400 tracking-widest mb-6">PERKEMI</div>
                                    <div className="text-white/30 text-xs uppercase tracking-[0.3em] font-semibold">
                                        少林寺拳法 · Shorinji Kempo Indonesia
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
                                        {['Resmi PERKEMI', 'Sistem Terpadu', 'Online'].map((badge, idx) => (
                                            <div
                                                key={idx}
                                                className="text-white/40 text-[15px] font-bold uppercase tracking-wider"
                                            >
                                                ✓ {badge}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== RUNDOWN SECTION ===== */}
                <section
                    id="rundown"
                    className="py-24"
                    style={{
                        background: 'linear-gradient(160deg, #000838 0%, #1a0020 50%, #3d0010 100%)',
                    }}
                >
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 mb-6">
                                <i className="fas fa-calendar-alt text-orange-400 text-xs"></i>
                                <span className="text-orange-400 text-xs font-bold uppercase tracking-widest">
                                    Jadwal Kegiatan · 14–17 Juni 2026
                                </span>
                            </div>
                            <h2 className="bebas text-5xl md:text-6xl text-white tracking-wide">
                                RUNDOWN
                                <br />
                                <span className="text-orange-400">KEJUARAAN</span>
                            </h2>
                            <p className="text-white/40 mt-4 text-sm max-w-lg mx-auto leading-relaxed">
                                Piala Walikota Surabaya 2026 · Stadion Indoor Gelora Bung Tomo
                            </p>
                        </div>

                        <div className="relative">
                            {/* Center line */}
                            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-orange-500/50 via-orange-500/20 to-transparent"></div>

                            <div className="space-y-8">
                                {rundownData.map((item, idx) => {
                                    const c = colorMap[item.color] || colorMap.orange;
                                    const isEven = idx % 2 === 0;

                                    return (
                                        <div
                                            key={idx}
                                            className={`flex flex-col md:flex-row items-center gap-6 ${
                                                isEven ? '' : 'md:flex-row-reverse'
                                            }`}
                                        >
                                            <div
                                                className={`md:w-1/2 ${
                                                    isEven ? 'md:text-right md:pr-16' : 'md:text-left md:pl-16'
                                                }`}
                                            >
                                                <div
                                                    className={`bg-white/5 border border-white/10 rounded-3xl p-6 ${c.border} transition-all duration-300`}
                                                >
                                                    {/* Day badge + date */}
                                                    <div
                                                        className={`flex items-center gap-3 mb-4 ${
                                                            isEven ? 'md:justify-end' : ''
                                                        }`}
                                                    >
                                                        <span
                                                            className={`${c.badge} text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full`}
                                                        >
                                                            {item.day}
                                                        </span>
                                                        <span className="text-white/30 text-xs font-medium">
                                                            {item.date}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-white font-black text-xl mb-2">{item.title}</h3>
                                                    <p className="text-white/40 text-sm leading-relaxed mb-5">
                                                        {item.desc}
                                                    </p>

                                                    {/* Agenda list */}
                                                    <div className={`space-y-2 ${isEven ? 'md:text-right' : ''}`}>
                                                        {item.agenda.map((agendaItem, aIdx) => (
                                                            <div
                                                                key={aIdx}
                                                                className={`flex items-center gap-2 text-xs text-white/50 ${
                                                                    isEven ? 'md:flex-row-reverse' : ''
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`w-1.5 h-1.5 rounded-full ${c.ring} shrink-0`}
                                                                ></span>
                                                                <span className="font-medium">{agendaItem}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Venue */}
                                                    <div
                                                        className={`mt-4 pt-4 border-t border-white/5 flex items-center gap-2 ${
                                                            isEven ? 'md:justify-end' : ''
                                                        }`}
                                                    >
                                                        <i className="fas fa-map-marker-alt text-orange-400 text-[10px]"></i>
                                                        <span className="text-white/30 text-[11px] font-semibold">
                                                            {item.venue}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Center icon */}
                                            <div className="md:w-0 flex-shrink-0 relative">
                                                <div
                                                    className={`w-12 h-12 rounded-full ${c.ring} flex items-center justify-center shadow-xl relative z-10`}
                                                >
                                                    <i className={`fas ${item.icon} text-white text-sm`}></i>
                                                </div>
                                            </div>

                                            <div className="md:w-1/2"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== TEKNIK KYU & DAN SECTION ===== */}
                <section
                    id="teknik"
                    className="py-24"
                    style={{
                        background: 'linear-gradient(160deg, #000838 0%, #0d0020 50%, #1a0008 100%)',
                    }}
                >
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-6">
                                <i className="fas fa-book-open text-blue-400 text-xs"></i>
                                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                                    Materi Teknik Resmi
                                </span>
                            </div>
                            <h2 className="bebas text-5xl md:text-6xl text-white tracking-wide">
                                TEKNIK <span className="text-orange-400">KYU & DAN</span>
                            </h2>
                            <p className="text-white/40 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
                                Daftar teknik resmi berdasarkan tingkatan sabuk PERKEMI yang digunakan dalam kompetisi
                                ini.
                            </p>
                        </div>

                        {/* Level tabs */}
                        <div>
                            {/* Tab buttons */}
                            <div className="flex flex-wrap justify-center gap-2 mb-10">
                                {levels.map((lvl, idx) => (
                                    <Button variant="unstyled" size="none"
                                        key={idx}
                                        onClick={() => setActiveLevel(idx)}
                                        className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 border border-white/5 ${
                                            activeLevel === idx
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/40 scale-105'
                                                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {lvl.name}
                                    </Button>
                                ))}
                            </div>

                            {/* Active Panel */}
                            {levels[activeLevel] && (
                                <div className="bg-white/3 border border-white/8 rounded-3xl overflow-hidden backdrop-blur-sm animate-in fade-in duration-300">
                                    {/* Level header */}
                                    <div className="bg-gradient-to-r from-orange-600/20 to-blue-600/20 border-b border-white/5 px-8 py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm"
                                                style={{
                                                    background: levels[activeLevel].name.startsWith('Dan')
                                                        ? 'linear-gradient(135deg,#1e3a8a,#3b82f6)'
                                                        : 'linear-gradient(135deg,#7c2d12,#ea580c)',
                                                }}
                                            >
                                                <span className="text-white bebas text-lg">
                                                    {levels[activeLevel].name}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-white font-black text-lg">
                                                    {levels[activeLevel].name}
                                                </h3>
                                                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">
                                                    {levels[activeLevel].techniques?.length || 0} Teknik Wajib
                                                </p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
                                            <i
                                                className={`fas ${
                                                    levels[activeLevel].name.startsWith('Dan')
                                                        ? 'fa-star'
                                                        : 'fa-circle'
                                                } text-orange-400 text-[10px]`}
                                            ></i>
                                            <span className="text-white/50 text-[11px] font-bold uppercase tracking-widest">
                                                {levels[activeLevel].name.startsWith('Dan')
                                                    ? 'Tingkatan Hitam'
                                                    : 'Tingkatan Kyu'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Techniques list grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y divide-white/5 sm:divide-y-0">
                                        {levels[activeLevel].techniques?.map((tech, no) => {
                                            const isDan = levels[activeLevel].name.startsWith('Dan');

                                            return (
                                                <div
                                                    key={no}
                                                    className="group flex items-start gap-4 px-6 py-4 hover:bg-white/5 transition-colors border-b border-white/5"
                                                >
                                                    <span
                                                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black"
                                                        style={{
                                                            background: isDan
                                                                ? 'rgba(59,130,246,0.15)'
                                                                : 'rgba(234,88,12,0.15)',
                                                            color: isDan ? '#60a5fa' : '#fb923c',
                                                        }}
                                                    >
                                                        {no + 1}
                                                    </span>
                                                    <span className="text-white/80 group-hover:text-white text-sm font-medium leading-snug transition-colors">
                                                        {tech.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ===== INFO / CTA ===== */}
                <section
                    id="info"
                    className="py-24"
                    style={{
                        background: 'linear-gradient(160deg, #3d0010 0%, #200030 40%, #000838 100%)',
                    }}
                >
                    <div className="max-w-4xl mx-auto px-6 text-center">
                        <h2 className="bebas text-6xl md:text-8xl text-white mb-6 tracking-wide">
                            DAFTAR
                            <br />
                            <span className="text-orange-400">SEKARANG</span>
                        </h2>
                        <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                            Segera daftarkan kontingen Anda sebelum kuota habis. Pendaftaran online resmi telah dibuka.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            {user ? (
                                <Link
                                    href="/dashboard"
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-3 rounded-2xl uppercase tracking-wide text-sm transition hover:-translate-y-1 flex items-center gap-3 shadow-2xl shadow-orange-500/30"
                                >
                                    <i className="fas fa-tachometer-alt"></i> Masuk Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/register"
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-3 rounded-2xl uppercase tracking-wide text-sm transition hover:-translate-y-1 flex items-center gap-3 shadow-2xl shadow-orange-500/30"
                                    >
                                        <i className="fas fa-file-signature"></i> Daftar Akun Kontingen
                                    </Link>
                                    <Link
                                        href="/login"
                                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-8 py-3 rounded-2xl uppercase tracking-wide text-sm transition hover:-translate-y-1 flex items-center gap-3"
                                    >
                                        <i className="fas fa-sign-in-alt"></i> Login
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* ===== FOOTER ===== */}
                <footer
                    className="border-t py-10 px-6 text-center"
                    style={{ background: '#1a0008', borderColor: 'rgba(220,20,20,0.25)' }}
                >
                    <div className="bebas text-2xl text-white/30 tracking-widest mb-2">SMART-PERKEMI</div>
                    <p className="text-white/20 text-xs">
                        © 2026 SMART-PERKEMI · Shorinji Kempo Indonesia · Piala Walikota Surabaya
                    </p>
                </footer>
            </div>
        </>
    );
}
