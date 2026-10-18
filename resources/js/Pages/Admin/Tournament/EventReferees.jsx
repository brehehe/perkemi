import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import Button from '@/Components/UI/Elements/Button';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Modal from '@/Components/UI/Overlays/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

function QrPreview({ value, label }) {
    const [failed, setFailed] = useState(false);
    const qrSource = `https://quickchart.io/qr?size=280&margin=2&ecLevel=M&text=${encodeURIComponent(value)}`;

    return (
        <div className="rounded-2xl border border-[#e5ded4] bg-white p-4 text-center">
            {!failed ? <img src={qrSource} alt={`QR ${label}`} className="mx-auto aspect-square w-full max-w-56 rounded-xl bg-white object-contain" onError={() => setFailed(true)} /> : <div className="mx-auto flex aspect-square w-full max-w-56 flex-col items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-5 text-amber-800"><i className="fa-solid fa-wifi mb-3 text-2xl" aria-hidden="true" /><p className="text-xs font-bold">Gambar QR tidak dapat dimuat.</p><p className="mt-1 text-[11px]">Gunakan tombol salin tautan.</p></div>}
            <p className="mt-3 text-sm font-bold text-[#17120f]">{label}</p>
            <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className="mt-3 min-h-11 w-full rounded-lg bg-[#17120f] px-3 text-xs font-semibold text-white hover:bg-[#2b2520]"><i className="fa-solid fa-copy mr-2" aria-hidden="true" />Salin Tautan QR</button>
        </div>
    );
}

function CourtPanelCard({ court, activeEvent }) {
    const [qrOpen, setQrOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const resetForm = useForm({ event_id: activeEvent.id });

    const resetPanel = () => {
        resetForm.delete(`/admin/pertandingan/wasit/courts/${court.id}/panel`, {
            preserveScroll: true,
            onSuccess: () => setResetOpen(false),
        });
    };

    return (
        <article className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#e9e2d8] bg-[#faf8f5] p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-[#17120f]">{court.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${court.panel_ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{court.panel_ready ? 'Court aktif' : court.panel_complete ? 'Menunggu scan QR' : 'Belum lengkap'}</span></div>
                    <p className="mt-1 text-xs text-[#7a746e]">{court.location || 'Lokasi court belum dicatat'}</p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
                    <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d8d1c8] bg-white px-3 text-xs font-bold text-[#625b54] hover:bg-[#f5f1eb]"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />Riwayat</button>
                    <button type="button" disabled={!court.has_panel} onClick={() => setResetOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#ddd7cf] disabled:bg-[#eeeae4] disabled:text-[#a79f96]"><i className="fa-solid fa-rotate-left" aria-hidden="true" />Reset Wasit</button>
                    <button type="button" disabled={!court.panel_complete} onClick={() => setQrOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#d8c9ae] bg-white px-3 text-xs font-bold text-[#8a631c] hover:bg-amber-50 disabled:cursor-not-allowed disabled:bg-[#eeeae4] disabled:text-[#a79f96]"><i className="fa-solid fa-qrcode" aria-hidden="true" />Tampilkan QR Court</button>
                </div>
            </div>
            <div className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {court.panel.map((panelMember, index) => (
                        <div key={panelMember.role} className={`rounded-xl border p-3 ${panelMember.referee_name ? 'border-[#e8e1d8] bg-[#fbfaf8]' : 'border-dashed border-[#d9d3c9] bg-white'}`}>
                            <div className="flex min-h-5 items-center justify-between gap-2 text-xs font-bold text-[#3d3732]"><span>{index + 1}. {panelMember.role_label}</span>{panelMember.court_present && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-700">Hadir Court</span>}</div>
                            {panelMember.referee_name ? (
                                <div className="mt-3 flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17120f] text-xs font-black text-[#f0c060]">{panelMember.referee_name.slice(0, 1).toUpperCase()}</span>
                                    <div className="min-w-0"><p className="truncate text-sm font-bold text-[#17120f]">{panelMember.referee_name}</p><p className="mt-0.5 text-[11px] text-[#7a746e]">{panelMember.court_checked_in_at ? `Check-in ${panelMember.court_checked_in_at}` : 'Menunggu scan QR court'}</p></div>
                                </div>
                            ) : (
                                <p className="mt-3 text-xs text-[#918981]">Belum digenerate</p>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex items-start gap-2 border-t border-[#eee8e0] pt-4 text-xs leading-5 text-[#776f67]">
                    <i className="fa-solid fa-circle-info mt-0.5 text-[#b8872d]" aria-hidden="true" />
                    <p>Panel diisi otomatis dari Wasit aktif yang sudah hadir hari ini. Setelah digenerate, kelimanya wajib scan QR court.</p>
                </div>
            </div>
            <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title={`QR Check-in ${court.name}`} footer={<Button onClick={() => setQrOpen(false)}>Tutup</Button>}><div className="mx-auto max-w-sm"><QrPreview value={court.check_in_url} label={`Check-in ${court.name}`} /><p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs leading-5 text-amber-800">QR ini dipindai dari ponsel akun Wasit yang sudah ditugaskan. Admin/Panitera hanya menampilkan QR dan tidak perlu membuka tautannya.</p></div></Modal>
            <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title={`Reset panel ${court.name}`} footer={<><Button variant="outline" onClick={() => setResetOpen(false)}>Batal</Button><Button onClick={resetPanel} loading={resetForm.processing} className="bg-red-700 text-white hover:bg-red-800">Reset 5 Wasit</Button></>}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"><p className="font-bold">Semua posisi Wasit pada {court.name} akan dikosongkan.</p><p className="mt-1">Check-in Court hari ini ikut dihapus, Portal Wasit akan kembali tanpa penugasan, dan panel dapat digenerate kembali. Riwayat reset tetap disimpan.</p></div>
            </Modal>
            <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title={`Riwayat penugasan ${court.name}`} subtitle="Audit perubahan panel Wasit per event dan court." size="lg" footer={<Button onClick={() => setHistoryOpen(false)}>Tutup</Button>}>
                {court.assignment_history?.length ? <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">{court.assignment_history.map((history) => {
                    const tone = history.action === 'assigned' ? 'bg-emerald-100 text-emerald-700' : history.action === 'reset' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                    return <article key={history.id} className="rounded-xl border border-[#e8e1d8] bg-[#fbfaf8] p-3 sm:p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${tone}`}>{history.action_label}</span><span className="text-xs font-bold text-[#7b5a1d]">{history.role_label}</span></div><p className="mt-2 font-bold text-[#17120f]">{history.referee_name}</p><p className="mt-1 text-xs text-[#7a746e]">Oleh {history.changed_by || 'Sistem'}</p></div><time className="text-xs font-semibold text-[#776f67]">{history.occurred_at}</time></div></article>;
                })}</div> : <div className="rounded-xl border border-dashed border-[#d9d3c9] p-8 text-center text-sm text-[#7a746e]"><i className="fa-solid fa-clock-rotate-left mb-3 block text-2xl text-[#d4a843]" aria-hidden="true" />Belum ada riwayat penugasan pada court ini.</div>}
            </Modal>
        </article>
    );
}

export default function EventReferees({ activeEvent, events = [], referees = [], courts = [], roles = [], eventCheckInUrl, qrExpiresAt, refereeLoginUrl, today, stats = {} }) {
    const { flash = {} } = usePage().props;
    const [accountReferee, setAccountReferee] = useState(null);
    const [attendanceReferee, setAttendanceReferee] = useState(null);
    const [qrOpen, setQrOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [search, setSearch] = useState('');
    const accountForm = useForm({ event_id: activeEvent.id, email: '', phone: '', password: '', password_confirmation: '' });
    const attendanceForm = useForm({ event_id: activeEvent.id, attendance_date: today, is_present: true, notes: '' });
    const generateForm = useForm({ event_id: activeEvent.id });
    const assignableRefereeCount = stats.assignable ?? referees.filter((referee) => referee.is_active && referee.is_present).length;
    const requiredRefereeCount = courts.length * roles.length;
    const canGeneratePanels = requiredRefereeCount > 0 && assignableRefereeCount >= requiredRefereeCount;
    const hasExistingPanels = courts.some((court) => court.has_panel);
    const filteredReferees = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        return keyword ? referees.filter((referee) => [referee.name, referee.email, referee.license_number, referee.region].filter(Boolean).some((value) => value.toLowerCase().includes(keyword))) : referees;
    }, [referees, search]);

    useEffect(() => {
        if (accountReferee || attendanceReferee || qrOpen || generateOpen) return undefined;
        const interval = window.setInterval(() => router.reload({ only: ['referees', 'courts', 'stats', 'today'], preserveScroll: true, preserveState: true }), 10000);
        return () => window.clearInterval(interval);
    }, [accountReferee, attendanceReferee, generateOpen, qrOpen]);

    const openAccount = (referee) => {
        setAccountReferee(referee);
        accountForm.setData({ event_id: activeEvent.id, email: referee.account?.email || referee.email || '', phone: referee.account?.phone || referee.phone || '', password: '', password_confirmation: '' });
        accountForm.clearErrors();
    };
    const saveAccount = (event) => {
        event.preventDefault();
        accountForm.post(`/admin/pertandingan/wasit/${accountReferee.id}/account`, { preserveScroll: true, onSuccess: () => setAccountReferee(null) });
    };
    const openAttendance = (referee) => {
        const todayRecord = referee.attendance_history.find((attendance) => attendance.date === today);
        setAttendanceReferee(referee);
        attendanceForm.setData({
            event_id: activeEvent.id,
            attendance_date: today,
            is_present: todayRecord ? todayRecord.is_present : true,
            notes: todayRecord?.notes || '',
        });
        attendanceForm.clearErrors();
    };
    const saveAttendance = (event) => {
        event.preventDefault();
        attendanceForm.put(`/admin/pertandingan/wasit/${attendanceReferee.id}/attendance`, {
            preserveScroll: true,
            onSuccess: () => setAttendanceReferee(null),
        });
    };
    const openGenerate = () => {
        generateForm.clearErrors();
        setGenerateOpen(true);
    };
    const generatePanels = (event) => {
        event.preventDefault();
        generateForm.post('/admin/pertandingan/wasit/courts/generate', {
            preserveScroll: true,
            onSuccess: () => setGenerateOpen(false),
        });
    };

    return (
        <AdminLayout title="Wasit Event & Absensi QR">
            <Head title="Wasit Event & Absensi QR | Smart Perkemi" />
            <div className="space-y-6 pb-12">
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" /><div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="max-w-3xl"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]"><i className="fa-solid fa-user-shield" aria-hidden="true" /> Pertandingan · Perwasitan</p><h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">Wasit Event & Absensi QR</h1><p className="mt-2.5 text-sm leading-relaxed text-white/70">Alur operasional: akun login → scan QR event → generate lima wasit per court → scan QR court → posisi penilaian aktif.</p><p className="mt-3 flex w-full items-start gap-2 rounded-xl border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-2 text-xs font-semibold leading-relaxed text-[#f0c060] sm:inline-flex sm:w-auto sm:items-center sm:rounded-full sm:py-1"><i className="fa-solid fa-trophy mt-0.5 shrink-0 sm:mt-0" aria-hidden="true" /><span className="min-w-0 break-words">{activeEvent.name} · {activeEvent.city}</span></p></div><Combobox label="Event dipilih" labelClassName="text-white/60" containerClassName="w-full xl:w-96" value={activeEvent.id} clearable={false} onChange={(value) => router.get('/admin/pertandingan/wasit', { event_id: value })} options={events.map((event) => ({ value: event.id, label: event.name, sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · ') }))} /></div></section>

                {(flash.success || flash.error) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${flash.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{flash.error || flash.success}</div>}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan kesiapan wasit">{[
                    ['Roster Wasit', stats.total || 0, 'fa-users', 'bg-blue-50 text-blue-700'],
                    ['Hadir Hari Ini', stats.present || 0, 'fa-user-check', 'bg-emerald-50 text-emerald-700'],
                    ['Punya Akun Login', stats.with_account || 0, 'fa-key', 'bg-violet-50 text-violet-700'],
                    ['Court Siap', `${stats.courts_ready || 0}/${courts.length}`, 'fa-map-location-dot', 'bg-amber-50 text-amber-700'],
                ].map(([label, value, icon, tone]) => <article key={label} className="rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><i className={`fa-solid ${icon}`} aria-hidden="true" /></div><p className="mt-4 text-2xl font-black text-[#17120f]">{value}</p><p className="mt-0.5 text-xs text-[#7a746e]">{label}</p></article>)}</section>

                <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" aria-labelledby="event-attendance-title"><div className="min-w-0 rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9b7125]">Tahap 1</p><h2 id="event-attendance-title" className="mt-1 text-lg font-bold text-[#17120f]">Absensi QR Event Harian</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#746c64]">Tampilkan QR ini setiap hari di meja registrasi Wasit. Wasit login melalui <a href={refereeLoginUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#9b2f25] underline">halaman login Wasit</a>, scan QR, lalu mengonfirmasi kehadiran. Scan pada hari berikutnya membuat catatan baru dan tidak menghapus histori sebelumnya.</p><div className="mt-4 grid gap-3 sm:flex sm:flex-wrap"><Button onClick={() => setQrOpen(true)} className="min-h-11 w-full bg-[#b73328] text-white hover:bg-[#96291f] sm:w-auto"><i className="fa-solid fa-qrcode mr-2" aria-hidden="true" />Tampilkan QR Event</Button><button type="button" onClick={() => navigator.clipboard?.writeText(eventCheckInUrl)} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dcd4ca] px-4 text-sm font-semibold text-[#625b54] hover:bg-[#f7f4ef]"><i className="fa-solid fa-copy mr-2" aria-hidden="true" />Salin tautan QR</button><Link href={`/admin/master/event/${activeEvent.id}/detail`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dcd4ca] px-4 text-sm font-semibold text-[#625b54] hover:bg-[#f7f4ef]">Kelola roster event</Link></div><p className="mt-3 break-words text-xs text-[#8a8179]">QR berlaku sampai {qrExpiresAt}. Status hari ini menjadi dasar penugasan Court. Admin/Panitera hanya menampilkan QR; konfirmasi dilakukan dari akun Wasit.</p></div><QrPreview value={eventCheckInUrl} label="QR Absensi Event Hari Ini" /></section>

                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="referee-roster-title"><div className="flex flex-col gap-4 border-b border-[#e9e2d8] p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9b7125]">Tahap 2 · Kesiapan Roster</p><h2 id="referee-roster-title" className="mt-1 text-lg font-bold text-[#17120f]">Kehadiran dan Akun Login Wasit</h2><p className="mt-1 text-sm text-[#7a746e]">Status yang tampil adalah kehadiran hari ini. Riwayat seluruh hari dapat dibuka melalui tombol Update Kehadiran.</p></div><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, lisensi, wilayah..." iconLeft={<i className="fa-solid fa-magnifying-glass" />} containerClassName="w-full lg:w-80" /></div>{filteredReferees.length ? <TableContainer ariaLabel="Roster, akun, dan kehadiran wasit event"><table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm"><thead><tr className="border-b border-[#e9e2d8] bg-[#f8f5f0] text-[10px] font-bold uppercase tracking-wider text-[#817970]"><th className="px-5 py-3">Wasit</th><th className="px-5 py-3">Sertifikasi</th><th className="px-5 py-3">Akun Login</th><th className="px-5 py-3">Absensi Hari Ini</th><th className="px-5 py-3">Penugasan</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-[#eee8e0]">{filteredReferees.map((referee) => <tr key={referee.id} className="hover:bg-[#fcfaf7]"><td data-label="Wasit" className="px-5 py-4"><p className="font-bold text-[#17120f]">{referee.name}</p><p className="mt-0.5 text-xs text-[#7a746e]">{referee.license_number || 'Lisensi belum dicatat'} · {referee.region || 'Wilayah belum dicatat'}</p></td><td data-label="Sertifikasi" className="px-5 py-4 text-[#625b54]">{referee.certification_level || referee.dan_grade || '—'}</td><td data-label="Akun Login" className="px-5 py-4">{referee.account ? <><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700">Aktif</span><p className="mt-1.5 break-all text-xs text-[#716960]">{referee.account.email}</p></> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Belum dibuat</span>}</td><td data-label="Absensi Hari Ini" className="px-5 py-4">{referee.is_present ? <><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />Hadir</span><p className="mt-1.5 text-xs text-[#716960]">{referee.checked_in_at}</p></> : referee.attendance_recorded ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700">Tidak Hadir</span> : <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">Belum Absen</span>}</td><td data-label="Penugasan" className="px-5 py-4">{referee.assignments.length ? referee.assignments.map((assignment) => <p key={`${assignment.court}-${assignment.role}`} className="text-xs text-[#625b54]"><strong>{assignment.court}</strong> · {assignment.role}</p>) : <span className="text-xs text-[#918981]">Belum ditugaskan</span>}</td><td data-label="Aksi" className="px-5 py-4"><div className="flex flex-col justify-end gap-2 sm:flex-row"><Button variant="outline" size="sm" onClick={() => openAttendance(referee)}><i className="fa-solid fa-calendar-check mr-1.5" aria-hidden="true" />Update Kehadiran</Button><Button variant="outline" size="sm" onClick={() => openAccount(referee)}><i className="fa-solid fa-key mr-1.5" aria-hidden="true" />{referee.account ? 'Reset Login' : 'Buat Login'}</Button></div></td></tr>)}</tbody></table></TableContainer> : <p className="p-8 text-center text-sm text-[#7a746e]">Tidak ada Wasit yang cocok dengan pencarian.</p>}</section>

                <section className="space-y-4" aria-labelledby="court-panel-title"><div className="flex flex-col gap-4 rounded-2xl border border-[#e5ded4] bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#9b7125]">Tahap 3 dan 4</p><h2 id="court-panel-title" className="mt-1 text-xl font-bold text-[#17120f]">Penugasan 5 Wasit dan QR Court</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#7a746e]">Sistem membagi otomatis satu Wasit Utama, dua Wasit Daerah, dan dua Wasit Pembantu ke setiap court. Setiap Wasit hanya ditempatkan pada satu court.</p></div><div className="w-full shrink-0 lg:w-auto"><p className={`mb-2 text-xs font-semibold ${canGeneratePanels ? 'text-emerald-700' : 'text-amber-700'}`}>{assignableRefereeCount} Wasit hadir tersedia · perlu {requiredRefereeCount}</p><Button onClick={openGenerate} disabled={!canGeneratePanels} className="min-h-11 w-full bg-[#17120f] text-white hover:bg-[#2a241f] lg:w-auto"><i className="fa-solid fa-wand-magic-sparkles mr-2" aria-hidden="true" />{hasExistingPanels ? 'Generate Ulang Semua Court' : 'Generate Penugasan'}</Button></div></div>{courts.length > 0 && !canGeneratePanels && <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"><i className="fa-solid fa-triangle-exclamation mt-1" aria-hidden="true" /><p>Penugasan belum dapat digenerate. Tambahkan absensi <strong>{Math.max(requiredRefereeCount - assignableRefereeCount, 0)} Wasit aktif</strong> lagi sampai tersedia {requiredRefereeCount} Wasit untuk {courts.length} court.</p></div>}{courts.map((court) => <CourtPanelCard key={court.id} court={court} activeEvent={activeEvent} />)}{courts.length === 0 && <div className="rounded-2xl border border-dashed border-[#d9d3c9] bg-white p-10 text-center text-sm text-[#7a746e]">Belum ada court aktif pada event ini.</div>}</section>
            </div>

            <Modal isOpen={Boolean(accountReferee)} onClose={() => setAccountReferee(null)} title={accountReferee?.account ? 'Reset Login Wasit' : 'Buat Login Wasit'} footer={<><Button variant="outline" onClick={() => setAccountReferee(null)}>Batal</Button><Button onClick={saveAccount} loading={accountForm.processing}>Simpan Akun</Button></>}>
                <form onSubmit={saveAccount} className="space-y-4">
                    <div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3">
                        <p className="font-bold text-[#17120f]">{accountReferee?.name}</p>
                        <p className="mt-1 text-xs text-[#746c64]">Akun akan mendapat role Wasit dan akses hanya ke event ini. Login dapat memakai email atau nomor HP.</p>
                    </div>
                    <Input label="Email Login" type="email" required value={accountForm.data.email} onChange={(event) => accountForm.setData('email', event.target.value)} error={accountForm.errors.email} autoComplete="username" />
                    <Input label="Nomor HP Login (Opsional)" value={accountForm.data.phone} onChange={(event) => accountForm.setData('phone', event.target.value)} error={accountForm.errors.phone} autoComplete="tel" />
                    <Input label="Password" type="password" required value={accountForm.data.password} onChange={(event) => accountForm.setData('password', event.target.value)} error={accountForm.errors.password} autoComplete="new-password" />
                    <Input label="Konfirmasi Password" type="password" required value={accountForm.data.password_confirmation} onChange={(event) => accountForm.setData('password_confirmation', event.target.value)} autoComplete="new-password" />
                </form>
            </Modal>
            <Modal isOpen={Boolean(attendanceReferee)} onClose={() => setAttendanceReferee(null)} title="Update Kehadiran Wasit" footer={<><Button variant="outline" onClick={() => setAttendanceReferee(null)}>Batal</Button><Button onClick={saveAttendance} loading={attendanceForm.processing}>Simpan Kehadiran</Button></>}><form onSubmit={saveAttendance} className="space-y-5"><div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-3"><p className="font-bold text-[#17120f]">{attendanceReferee?.name}</p><p className="mt-1 text-xs leading-5 text-[#746c64]">{activeEvent.name} · {activeEvent.start_date} sampai {activeEvent.end_date}</p></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Tanggal Absensi" type="date" required value={attendanceForm.data.attendance_date} onChange={(event) => { const record = attendanceReferee?.attendance_history.find((attendance) => attendance.date === event.target.value); attendanceForm.setData({ ...attendanceForm.data, attendance_date: event.target.value, is_present: record ? record.is_present : true, notes: record?.notes || '' }); }} error={attendanceForm.errors.attendance_date} /><label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#3d3732]">Status Kehadiran</span><select value={attendanceForm.data.is_present ? '1' : '0'} onChange={(event) => attendanceForm.setData('is_present', event.target.value === '1')} className="min-h-11 w-full rounded-lg border border-[#dcd4ca] bg-white px-3 text-sm text-[#17120f] focus:border-[#b8872d] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/25"><option value="1">Hadir</option><option value="0">Tidak Hadir</option></select>{attendanceForm.errors.is_present && <span className="mt-1 block text-xs text-red-600">{attendanceForm.errors.is_present}</span>}</label></div><label className="block"><span className="mb-1.5 block text-sm font-semibold text-[#3d3732]">Catatan (opsional)</span><textarea rows={3} maxLength={500} value={attendanceForm.data.notes} onChange={(event) => attendanceForm.setData('notes', event.target.value)} placeholder="Contoh: izin sakit, hadir dikonfirmasi Panitera..." className="w-full rounded-lg border border-[#dcd4ca] bg-white px-3 py-2 text-sm text-[#17120f] focus:border-[#b8872d] focus:outline-none focus:ring-2 focus:ring-[#d4a843]/25" />{attendanceForm.errors.notes && <span className="mt-1 block text-xs text-red-600">{attendanceForm.errors.notes}</span>}</label><div><h3 className="text-sm font-bold text-[#17120f]">Riwayat Absensi Event</h3>{attendanceReferee?.attendance_history.length ? <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">{attendanceReferee.attendance_history.map((history) => <div key={history.id} className="rounded-xl border border-[#e8e1d8] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-[#17120f]">{history.date_label}</p><p className="mt-0.5 text-xs text-[#746c64]">{history.method_label}{history.checked_in_at ? ` · ${history.checked_in_at}` : ''}{history.updated_by ? ` · ${history.updated_by}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${history.is_present ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{history.is_present ? 'Hadir' : 'Tidak Hadir'}</span></div>{history.notes && <p className="mt-2 text-xs leading-5 text-[#625b54]">{history.notes}</p>}</div>)}</div> : <p className="mt-2 rounded-xl border border-dashed border-[#ddd5ca] p-4 text-center text-xs text-[#817970]">Belum ada riwayat absensi.</p>}</div><div><h3 className="text-sm font-bold text-[#17120f]">Riwayat Check-in Court</h3>{attendanceReferee?.court_attendance_history.length ? <div className="mt-2 flex flex-wrap gap-2">{attendanceReferee.court_attendance_history.map((history) => <span key={history.id} className="rounded-full border border-[#e2d8c8] bg-[#faf7f1] px-3 py-1.5 text-xs text-[#625b54]">{history.date_label} · <strong>{history.court_name}</strong> · {history.checked_in_at}</span>)}</div> : <p className="mt-2 text-xs text-[#817970]">Belum ada check-in Court.</p>}</div></form></Modal>
            <Modal isOpen={generateOpen} onClose={() => !generateForm.processing && setGenerateOpen(false)} title={hasExistingPanels ? 'Generate ulang seluruh penugasan?' : 'Generate penugasan Wasit?'} subtitle={`${courts.length} court · ${requiredRefereeCount} posisi`} closeOnBackdrop={!generateForm.processing} closeOnEscape={!generateForm.processing} footer={<><Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generateForm.processing}>Batal</Button><Button type="submit" form="generate-referee-panels-form" loading={generateForm.processing} disabled={!canGeneratePanels} className="bg-[#17120f] text-white hover:bg-[#2a241f]">Generate Sekarang</Button></>}>
                <form id="generate-referee-panels-form" onSubmit={generatePanels} className="space-y-4">
                    {generateForm.errors.generate && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{generateForm.errors.generate}</div>}
                    <div className="rounded-xl border border-[#e8e1d8] bg-[#faf8f5] p-4 text-sm leading-6 text-[#625b54]"><p className="font-bold text-[#17120f]">{requiredRefereeCount} Wasit akan dibagi otomatis dan acak.</p><p className="mt-1">Setiap court mendapat lima peran lengkap tanpa Wasit yang sama di dua court.</p></div>
                    {hasExistingPanels && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><i className="fa-solid fa-triangle-exclamation mt-1" aria-hidden="true" /><p>Susunan semua court saat ini akan diganti. Check-in court hari ini akan dihapus sehingga Wasit hasil generate perlu scan QR court kembali. Riwayat perubahan tetap disimpan.</p></div>}
                </form>
            </Modal>
            <Modal isOpen={qrOpen} onClose={() => setQrOpen(false)} title="QR Absensi Wasit Event" footer={<Button onClick={() => setQrOpen(false)}>Tutup</Button>}><div className="mx-auto max-w-sm"><QrPreview value={eventCheckInUrl} label={activeEvent.name} /><p className="mt-3 text-center text-xs leading-5 text-[#7a746e]">Wasit scan menggunakan kamera ponsel, login, lalu tekan Konfirmasi Kehadiran.</p></div></Modal>
        </AdminLayout>
    );
}
