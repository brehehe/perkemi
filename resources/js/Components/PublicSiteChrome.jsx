import Button from '@/Components/UI/Elements/Button';
import ThemeToggle from '@/Components/UI/Elements/ThemeToggle';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

function Icon({ name, className = '' }) {
    return <i className={`fa-solid ${name} ${className}`} aria-hidden="true" />;
}

const navigation = [
    { href: '/#events', label: 'Event kejuaraan', key: 'events' },
    { href: '/athelete', label: 'Peserta', key: 'athletes' },
    { href: '/#guide', label: 'Panduan pendaftaran', key: 'guide' },
    { href: '/#about', label: 'Tentang portal', key: 'about' },
];

export function PublicSiteHeader({ user = null, active = '' }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header id="home-top" className="event-header">
            <div className="event-container flex min-h-22 items-center justify-between gap-4 py-4">
                <Link href="/" className="home-brand flex items-center gap-3" aria-label="PB PERKEMI, beranda">
                    <img src="/android-chrome-192x192.png" width="48" height="48" alt="" className="h-12 w-12 shrink-0 object-contain" />
                    <span>
                        <strong className="home-brand-name block">PB PERKEMI</strong>
                        <span className="home-brand-caption block">Persaudaraan Shorinji Kempo Indonesia</span>
                    </span>
                </Link>
                <nav aria-label="Navigasi utama" className="hidden items-center gap-8 lg:flex">
                    {navigation.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`event-text-link ${active === item.key ? 'public-nav-link-active' : ''}`}
                            aria-current={active === item.key ? 'page' : undefined}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <ThemeToggle />
                    <Link href={user ? (user.dashboard_url || '/admin/dashboard') : '/login'} className="event-button event-button-primary">
                        {user ? 'Dashboard' : 'Masuk'}
                        <Icon name={user ? 'fa-gauge-high' : 'fa-arrow-right-to-bracket'} className="hidden sm:inline" />
                    </Link>
                    <Button
                        variant="unstyled"
                        size="none"
                        className="home-menu-button lg:hidden"
                        aria-expanded={mobileMenuOpen}
                        aria-controls="public-mobile-nav"
                        aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Icon name={mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} />
                    </Button>
                </div>
            </div>
            {mobileMenuOpen && (
                <nav
                    id="public-mobile-nav"
                    aria-label="Navigasi seluler"
                    className="home-mobile-nav event-container flex flex-col lg:hidden"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setMobileMenuOpen(false);
                    }}
                >
                    {navigation.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-current={active === item.key ? 'page' : undefined}
                            className={active === item.key ? 'public-nav-link-active' : ''}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            )}
        </header>
    );
}

export function PublicSiteFooter() {
    return (
        <footer className="home-footer">
            <div className="event-container flex flex-col justify-between gap-7 py-10 md:flex-row md:items-center">
                <div>
                    <p className="home-brand-name">PB PERKEMI</p>
                    <p className="mt-2 text-xs leading-6">Persaudaraan Shorinji Kempo Indonesia<br />&copy; {new Date().getFullYear()} SMART PERKEMI</p>
                </div>
                <nav aria-label="Navigasi footer" className="flex flex-wrap items-center gap-7 text-sm">
                    <Link href="/#events">Event kejuaraan</Link>
                    <Link href="/athelete">Peserta</Link>
                    <Link href="/#guide">Panduan</Link>
                    <a href="#home-top">Kembali ke atas <Icon name="fa-arrow-up" className="ml-2 text-xs" /></a>
                </nav>
            </div>
        </footer>
    );
}
