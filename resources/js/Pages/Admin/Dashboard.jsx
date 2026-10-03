import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import MedalBarChart from '@/Components/Charts/MedalBarChart';
import StatusDoughnutChart from '@/Components/Charts/StatusDoughnutChart';

// Import newly created UI components from @/Components/UI
import {
    Stats,
    Card,
    CardHeading,
    Badge,
    Avatar,
    Button,
    Input,
    ProgressBar,
    Pagination,
    Feed,
    Modal,
    DescriptionList,
    Alert,
} from '@/Components/UI';

export default function Dashboard({
    stats = {},
    monthlyAthletes = {},
    statusBreakdown = {},
    latestContingents = [],
    latestRegistrations = { data: [], links: [], from: 1, to: 1, total: 0, current_page: 1, last_page: 1 },
    medalStats = { gold: 0, silver: 0, bronze: 0 },
    medalDistribution = { labels: [], gold: [], silver: [], bronze: [], contingents: [] },
    todaySchedules = [],
    latestActivities = [],
    filters = {},
    auth = {},
}) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRegistration, setSelectedRegistration] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            '/admin/dashboard',
            { search: searchTerm },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchReset = () => {
        setSearchTerm('');
        router.get('/admin/dashboard', {}, { preserveState: true, replace: true });
    };

    const handlePageChange = (page) => {
        router.get(
            '/admin/dashboard',
            { search: searchTerm, page },
            { preserveState: true, replace: true }
        );
    };

    const totalMedals = (medalStats.gold || 0) + (medalStats.silver || 0) + (medalStats.bronze || 0);

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val || 0);
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'verified':
                return 'green';
            case 'pending':
                return 'yellow';
            case 'rejected':
                return 'red';
            default:
                return 'gray';
        }
    };

    // Format feed items for UI Feed component
    const feedItems = (latestActivities || []).map((act, idx) => ({
        id: idx,
        title: act.title,
        description: act.desc,
        timestamp: act.time || 'Baru saja',
        iconBg: act.bg ? `bg-[${act.bg}] text-white` : undefined,
    }));

    return (
        <AdminLayout auth={auth} title="Dashboard Admin">
            <Head title="Admin Dashboard — Smart Perkemi" />

            {/* ════ STAT CARDS ════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {/* 1. Total Atlet */}
                <Stats
                    title="Total Atlet Terdaftar"
                    value={new Intl.NumberFormat('id-ID').format(stats.total_athletes || 0)}
                    change="+12%"
                    changeType="increase"
                    changePeriod="dari bulan lalu"
                    variant="crimson"
                    icon={<i className="fa-solid fa-users text-[#c0392b]"></i>}
                />

                {/* 2. Total Kontingen */}
                <Stats
                    title="Total Kontingen"
                    value={new Intl.NumberFormat('id-ID').format(stats.total_contingents || 0)}
                    change="Aktif"
                    changeType="neutral"
                    changePeriod="terdaftar di sistem"
                    variant="gold"
                    icon={<i className="fa-solid fa-flag text-[#b8860b]"></i>}
                />

                {/* 3. Pending Verifikasi */}
                <Stats
                    title="Pending Verifikasi"
                    value={new Intl.NumberFormat('id-ID').format(stats.pending_count || 0)}
                    change="Perlu Review"
                    changeType={stats.pending_count > 0 ? 'decrease' : 'neutral'}
                    changePeriod="berkas masuk"
                    icon={<i className="fa-solid fa-clock text-[#2980b9]"></i>}
                />

                {/* 4. Medali Diberikan */}
                <Stats
                    title="Medali Diberikan"
                    value={new Intl.NumberFormat('id-ID').format(totalMedals)}
                    change="Real-time"
                    changeType="increase"
                    changePeriod="update pertandingan"
                    icon={<i className="fa-solid fa-medal text-[#27ae60]"></i>}
                />
            </div>

            {/* ════ CHARTS ROW (MEDAL DISTRIBUTION + REGISTRATION BREAKDOWN) ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                {/* Bar Chart: Medal Distribution (2 cols) */}
                <Card className="lg:col-span-2 flex flex-col justify-between">
                    <CardHeading
                        title="Distribusi Medali per Kontingen"
                        subtitle="Statistik perolehan medali emas, perak, dan perunggu kontingen teratas"
                        icon={<i className="fa-solid fa-chart-column"></i>}
                    />

                    <div className="w-full min-h-[290px] flex-1">
                        <MedalBarChart
                            labels={medalDistribution.labels}
                            gold={medalDistribution.gold}
                            silver={medalDistribution.silver}
                            bronze={medalDistribution.bronze}
                        />
                    </div>
                </Card>

                {/* Donut Chart: Registration Status (1 col) */}
                <Card className="flex flex-col justify-between">
                    <CardHeading
                        title="Status Registrasi"
                        subtitle="Berdasarkan verifikasi berkas kontingen"
                        icon={<i className="fa-solid fa-chart-pie"></i>}
                    />

                    <div className="h-44 flex items-center justify-center my-2">
                        <StatusDoughnutChart
                            verified={statusBreakdown.verified || 0}
                            pending={statusBreakdown.pending || 0}
                            rejected={statusBreakdown.rejected || 0}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#27ae60] shrink-0"></span>
                            <span className="text-slate-600 dark:text-slate-400">
                                Verified ({stats.verification_rate || 0}%)
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] shrink-0"></span>
                            <span className="text-slate-600 dark:text-slate-400">
                                Pending ({statusBreakdown.pending || 0})
                            </span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#e74c3c] shrink-0"></span>
                            <span className="text-slate-600 dark:text-slate-400">
                                Ditolak / Revisi ({statusBreakdown.rejected || 0})
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* ════ REGISTRASI TERBARU (TABLE SECTION) ════ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden mb-6">
                {/* Table Header / Toolbar */}
                <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-cinzel text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-wide">
                                Registrasi Terbaru
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                                {latestRegistrations.total || 0} Total
                            </span>
                        </div>
                        <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                            Daftar pendaftaran kontingen terbaru yang masuk ke sistem verifikasi
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Search Input Bar */}
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="w-56 sm:w-72">
                                <Input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Cari kontingen, nomor..."
                                    iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                                    clearable
                                    onClear={handleSearchReset}
                                    size="sm"
                                />
                            </div>

                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => router.get('/admin/dashboard', {}, { preserveState: true })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                                title="Perbarui Data"
                            >
                                <i className="fa-solid fa-rotate-right text-[10px]"></i>
                                <span>Refresh</span>
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Table Content */}
                <TableContainer ariaLabel="Tabel data">
                    <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                                <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                                <th scope="col" className="py-3 px-4 min-w-[240px]">Kontingen</th>
                                <th scope="col" className="py-3 px-4 min-w-[140px]">Wilayah / Kota</th>
                                <th scope="col" className="py-3 px-4 min-w-[120px]">Tanggal</th>
                                <th scope="col" className="py-3 px-4 min-w-[130px]">Total Tagihan</th>
                                <th scope="col" className="py-3 px-4 text-center w-32">Status</th>
                                <th scope="col" className="py-3 px-4 text-center w-20">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                            {latestRegistrations.data?.length > 0 ? (
                                latestRegistrations.data.map((reg, idx) => (
                                    <tr
                                        key={reg.id}
                                        className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                    >
                                        {/* Row Index */}
                                        <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                            {(latestRegistrations.from || 1) + idx}
                                        </td>

                                        {/* Kontingen */}
                                        <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                    }}
                                                >
                                                    {(reg.contingent?.name || 'K').substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p
                                                        onClick={() => setSelectedRegistration(reg)}
                                                        className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                    >
                                                        {reg.contingent?.name || 'Kontingen'}
                                                    </p>
                                                    <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <i className="fa-solid fa-hashtag text-[8px] opacity-70"></i>
                                                        <span>{reg.registration_number}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Wilayah / Kota */}
                                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-location-dot text-[11px] text-[#c0392b]/70 shrink-0"></i>
                                                <span className="truncate">{reg.contingent?.city || '-'}</span>
                                            </div>
                                        </td>

                                        {/* Tanggal */}
                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            <span>{reg.created_at}</span>
                                        </td>

                                        {/* Total Tagihan */}
                                        <td className="py-3.5 px-4 font-mono font-semibold text-[#0f0d0b] dark:text-white whitespace-nowrap">
                                            {reg.is_paid === false ? 'Gratis' : formatRupiah(reg.final_amount)}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {reg.status === 'verified' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Verified
                                                </span>
                                            ) : reg.status === 'pending' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    Pending
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                    {reg.status || 'Ditolak'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Action Button */}
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <Button variant="unstyled" size="none"
                                                type="button"
                                                onClick={() => setSelectedRegistration(reg)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Lihat Rincian Registrasi"
                                            >
                                                <i className="fa-solid fa-eye text-xs"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                        <i className="fa-solid fa-inbox text-2xl mb-2 block opacity-40"></i>
                                        Tidak ada data registrasi yang sesuai.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table></TableContainer>

                {/* Pagination Controls */}
                {latestRegistrations.total > 0 && (
                    <Pagination
                        pagination={latestRegistrations}
                        label="registrasi"
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {/* ════ LEADERBOARD & JADWAL HARI INI ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Top Kontingen (Leaderboard) */}
                <Card>
                    <CardHeading
                        title="Top Kontingen"
                        subtitle="Peringkat klasemen berdasarkan perolehan medali"
                        icon={<i className="fa-solid fa-trophy"></i>}
                    />

                    {/* Medal summary 3 cards */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-[#d4a843]/10 border border-[#d4a843]/20 rounded-xl p-2.5 text-center">
                            <span className="text-xl">🥇</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">Emas</p>
                            <p className="font-cinzel font-bold text-lg text-[#b8860b] dark:text-[#f0c060]">
                                {medalStats.gold || 0}
                            </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center">
                            <span className="text-xl">🥈</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">Perak</p>
                            <p className="font-cinzel font-bold text-lg text-slate-600 dark:text-slate-300">
                                {medalStats.silver || 0}
                            </p>
                        </div>
                        <div className="bg-amber-100/40 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center">
                            <span className="text-xl">🥉</span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">Perunggu</p>
                            <p className="font-cinzel font-bold text-lg text-amber-800 dark:text-amber-400">
                                {medalStats.bronze || 0}
                            </p>
                        </div>
                    </div>

                    {/* Leaderboard list */}
                    <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                        {medalDistribution.contingents?.length > 0 ? (
                            medalDistribution.contingents.map((con, idx) => (
                                <div key={con.id || idx} className="pt-2.5 pb-1 flex items-center gap-3">
                                    <div className="font-cinzel text-sm font-bold w-6 text-center text-[#d4a843]">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                    </div>
                                    <Avatar
                                        name={con.name}
                                        size="sm"
                                        shape="rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                            {con.name}
                                        </h4>
                                        <p className="text-[10.5px] text-slate-400">
                                            {con.gold_count} Emas · {con.silver_count} Perak · {con.bronze_count} Perunggu
                                        </p>
                                    </div>
                                    <div className="font-cinzel font-bold text-sm text-slate-900 dark:text-white">
                                        {con.total_score} Poin
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                                Belum ada data medali.
                            </p>
                        )}
                    </div>
                </Card>

                {/* Jadwal Hari Ini */}
                <Card className="flex flex-col justify-between">
                    <div>
                        <CardHeading
                            title="Jadwal Hari Ini"
                            subtitle="Rundown agenda dan pertandingan hari ini"
                            icon={<i className="fa-solid fa-calendar-day"></i>}
                            action={
                                <Badge variant="gray">
                                    {new Date().toLocaleDateString('id-ID', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </Badge>
                            }
                        />

                        <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                            {todaySchedules?.length > 0 ? (
                                todaySchedules.map((item, idx) => (
                                    <div key={item.id || idx} className="pt-3 first:pt-0 flex items-start gap-3">
                                        <div className="font-cinzel text-xs font-bold text-slate-400 min-w-12 pt-0.5">
                                            {item.time}
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#c0392b] mt-1.5 shrink-0"></div>
                                        <div>
                                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {item.name}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                <span className="font-medium text-[#c0392b]">{item.type}</span> — {item.description}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                    Belum ada jadwal untuk hari ini.
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ════ PROGRESS KONTINGEN & AKTIVITAS TERBARU ════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Progress Kontingen with UI ProgressBar */}
                <Card>
                    <CardHeading
                        title="Progress Kontingen"
                        subtitle="Jumlah atlet terdaftar pada setiap kontingen (target kuota 20 atlet)"
                        icon={<i className="fa-solid fa-bars-progress"></i>}
                    />

                    <div className="space-y-4">
                        {latestContingents?.length > 0 ? (
                            latestContingents.map((con) => (
                                <div key={con.id} className="space-y-1">
                                    <ProgressBar
                                        value={con.athletes_count || 0}
                                        max={20}
                                        showLabel
                                        label={con.name}
                                        variant="primary"
                                        size="md"
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-400 italic text-center py-4">
                                Belum ada kontingen terdaftar.
                            </p>
                        )}
                    </div>
                </Card>

                {/* Aktivitas Terbaru with UI Feed */}
                <Card>
                    <CardHeading
                        title="Aktivitas Terbaru"
                        subtitle="Log peristiwa registrasi dan pertandingan terkini"
                        icon={<i className="fa-solid fa-clock-rotate-left"></i>}
                    />

                    {feedItems.length > 0 ? (
                        <Feed items={feedItems} />
                    ) : (
                        <p className="text-xs text-slate-400 italic text-center py-4">
                            Belum ada aktivitas terbaru.
                        </p>
                    )}
                </Card>
            </div>

            {/* ════ MODAL DETAIL REGISTRASI KONTINGEN ════ */}
            <Modal
                isOpen={!!selectedRegistration}
                onClose={() => setSelectedRegistration(null)}
                title="Rincian Registrasi Kontingen"
                subtitle={`Nomor: ${selectedRegistration?.registration_number || '-'}`}
                size="lg"
                footer={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedRegistration(null)}
                        >
                            Tutup
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                alert(`Membuka berkas ${selectedRegistration?.registration_number}`);
                            }}
                        >
                            <i className="fa-solid fa-print mr-1.5"></i>
                            Cetak Bukti Registrasi
                        </Button>
                    </div>
                }
            >
                {selectedRegistration && (
                    <div className="space-y-4">
                        <DescriptionList
                            columns={2}
                            striped
                            items={[
                                { label: 'Nomor Registrasi', value: selectedRegistration.registration_number },
                                {
                                    label: 'Status Registrasi',
                                    value: (
                                        <Badge variant={getStatusBadgeVariant(selectedRegistration.status)} dot>
                                            {selectedRegistration.status?.toUpperCase()}
                                        </Badge>
                                    ),
                                },
                                { label: 'Nama Kontingen', value: selectedRegistration.contingent?.name || '-' },
                                { label: 'Kota / Kabupaten', value: selectedRegistration.contingent?.city || '-' },
                                { label: 'Manajer Kontingen', value: selectedRegistration.contingent?.manager_name || '-' },
                                { label: 'Nomor WhatsApp', value: selectedRegistration.contingent?.phone || '-' },
                                { label: 'Tanggal Pendaftaran', value: selectedRegistration.created_at || '-' },
                                { label: 'Total Pembayaran', value: selectedRegistration.is_paid === false ? 'Gratis' : formatRupiah(selectedRegistration.final_amount) },
                            ]}
                        />

                        {selectedRegistration.contingent?.address && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-bold block text-slate-800 dark:text-white mb-1">
                                    Alamat Dojo / Kontingen:
                                </span>
                                {selectedRegistration.contingent.address}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
