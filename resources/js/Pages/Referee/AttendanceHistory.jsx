import Combobox from '@/Components/UI/Forms/Combobox';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

function StatCard({ icon, label, value, helper, tone = 'amber' }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
        <article className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${tones[tone].split(' ')[2]}`}>
            <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                </span>
            </div>
            <p className="mt-4 text-xs font-semibold text-[#766e66]">{label}</p>
            <p className="mt-1 text-2xl font-black text-[#17120f]">{value}</p>
            <p className="mt-1 text-xs text-[#958c83]">{helper}</p>
        </article>
    );
}

export default function AttendanceHistory({
    activeEvent,
    events = [],
    referee,
    summary,
    eventAttendances = [],
    courtAttendances = [],
    assignments = [],
}) {
    return (
        <AdminLayout title="History Absensi Wasit">
            <Head title="History Absensi | Portal Wasit" />
            <div className="space-y-5 pb-8 sm:space-y-6 sm:pb-10">
                {/* Header Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0f0d0b] via-[#211b16] to-[#0f0d0b] p-5 text-white shadow-xl md:p-6">
                    <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#d4a843]/15 blur-3xl" />
                    <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#e1b94e]">
                                <i className="fa-solid fa-calendar-check" aria-hidden="true" /> Rekam Jejak Kehadiran
                            </p>
                            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                                History Absensi Wasit
                            </h1>
                            <p className="mt-2.5 text-sm leading-relaxed text-white/70">
                                Catatan riwayat check-in event harian dan check-in court untuk akun {referee.name}.
                            </p>
                            <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#d4a843]/30 bg-[#d4a843]/10 px-3 py-1 text-xs font-semibold text-[#f0c060]">
                                <i className="fa-solid fa-trophy shrink-0" aria-hidden="true" />
                                <span className="truncate">{activeEvent.name} · {activeEvent.city}</span>
                            </p>
                        </div>
                        {events.length > 1 && (
                            <Combobox
                                label="Pilih event"
                                labelClassName="text-white/60"
                                containerClassName="w-full xl:w-96"
                                value={activeEvent.id}
                                clearable={false}
                                onChange={(value) => router.get('/absensi-wasit', { event_id: value })}
                                options={events.map((event) => ({
                                    value: event.id,
                                    label: event.name,
                                    sublabel: [event.status_label, event.date_label, event.city].filter(Boolean).join(' · '),
                                }))}
                            />
                        )}
                    </div>
                </section>

                {/* Summary Cards */}
                <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4" aria-label="Ringkasan kehadiran">
                    <StatCard
                        icon="fa-calendar-day"
                        label="Hari Hadir Event"
                        value={`${summary.total_event_present} Hari`}
                        helper="kehadiran harian tercatat"
                        tone="emerald"
                    />
                    <StatCard
                        icon="fa-location-dot"
                        label="Check-in Court"
                        value={`${summary.total_court_checkins} Kali`}
                        helper="posisi court diverifikasi"
                        tone="blue"
                    />
                    <StatCard
                        icon="fa-clock"
                        label="Absensi Hari Ini"
                        value={summary.today_present ? 'Hadir' : 'Belum Scan'}
                        helper={summary.today_present ? `Pukul ${summary.today_checked_in_at} WIB` : 'Perlu scan QR event'}
                        tone={summary.today_present ? 'emerald' : 'amber'}
                    />
                    <StatCard
                        icon="fa-gavel"
                        label="Penugasan Court"
                        value={`${summary.assigned_courts_count} Posisi`}
                        helper="ditetapkan oleh Panitera"
                        tone="slate"
                    />
                </section>

                {/* Riwayat Absensi Event Harian */}
                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="event-attendance-title">
                    <div className="border-b border-[#e9e2d8] p-4 sm:p-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 id="event-attendance-title" className="text-lg font-bold text-[#17120f]">
                                    Riwayat Absensi Harian Event
                                </h2>
                                <p className="mt-1 text-sm text-[#7a746e]">
                                    Daftar kehadiran harian melalui pemindaian QR Code event dari Panitera.
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Total: {eventAttendances.length} Catatan
                            </span>
                        </div>
                    </div>
                    {eventAttendances.length > 0 ? (
                        <TableContainer ariaLabel="Tabel absensi harian event">
                            <table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#e9e2d8] bg-[#0d2f50] text-[10px] font-bold uppercase tracking-wider text-white">
                                        <th className="px-5 py-3 text-center" style={{ width: '50px' }}>No.</th>
                                        <th className="px-5 py-3">Hari & Tanggal</th>
                                        <th className="px-5 py-3 text-center">Waktu Check-in</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0]">
                                    {eventAttendances.map((att, index) => (
                                        <tr key={att.id || index} className="hover:bg-[#fcfaf7]">
                                            <td data-label="No." className="px-5 py-4 text-center font-bold text-[#17120f]">{index + 1}</td>
                                            <td data-label="Hari & Tanggal" className="px-5 py-4 font-bold text-[#0c203b]">{att.date}</td>
                                            <td data-label="Waktu Check-in" className="px-5 py-4 text-center font-mono font-semibold text-[#17120f]">{att.checked_in_at}</td>
                                            <td data-label="Status" className="px-5 py-4 text-center">
                                                <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${att.is_present ? 'bg-[#008b51] text-white' : 'bg-red-500 text-white'}`}>
                                                    {att.status_label}
                                                </span>
                                            </td>
                                            <td data-label="Keterangan" className="px-5 py-4 text-xs text-[#625b54]">{att.notes || 'Hadir dan terverifikasi di arena'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableContainer>
                    ) : (
                        <div className="p-8 text-center text-sm text-[#7a746e]">
                            <i className="fa-solid fa-calendar-xmark mb-2 block text-2xl text-slate-400" aria-hidden="true" />
                            Belum ada catatan absensi event yang tersimpan.
                        </div>
                    )}
                </section>

                {/* Riwayat Check-in Court / Tatami */}
                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm" aria-labelledby="court-attendance-title">
                    <div className="border-b border-[#e9e2d8] p-4 sm:p-5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 id="court-attendance-title" className="text-lg font-bold text-[#17120f]">
                                    Riwayat Check-in Court / Lapangan
                                </h2>
                                <p className="mt-1 text-sm text-[#7a746e]">
                                    Riwayat verifikasi kehadiran di meja court sebelum memimpin penilaian partai.
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                Total: {courtAttendances.length} Check-in
                            </span>
                        </div>
                    </div>
                    {courtAttendances.length > 0 ? (
                        <TableContainer ariaLabel="Tabel check-in court">
                            <table className="responsive-data-table responsive-data-table--cards w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#e9e2d8] bg-[#0d2f50] text-[10px] font-bold uppercase tracking-wider text-white">
                                        <th className="px-5 py-3 text-center" style={{ width: '50px' }}>No.</th>
                                        <th className="px-5 py-3">Court / Lapangan</th>
                                        <th className="px-5 py-3">Lokasi</th>
                                        <th className="px-5 py-3">Tanggal</th>
                                        <th className="px-5 py-3 text-center">Waktu Scan</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee8e0]">
                                    {courtAttendances.map((cAtt, index) => (
                                        <tr key={cAtt.id || index} className="hover:bg-[#fcfaf7]">
                                            <td data-label="No." className="px-5 py-4 text-center font-bold text-[#17120f]">{index + 1}</td>
                                            <td data-label="Court" className="px-5 py-4 font-bold text-[#0c203b]">
                                                <i className="fa-solid fa-map-pin mr-1.5 text-[#b92f24]" aria-hidden="true" />
                                                {cAtt.court_name}
                                            </td>
                                            <td data-label="Lokasi" className="px-5 py-4 text-[#514a43]">{cAtt.court_location}</td>
                                            <td data-label="Tanggal" className="px-5 py-4 font-semibold text-[#17120f]">{cAtt.date}</td>
                                            <td data-label="Waktu Scan" className="px-5 py-4 text-center font-mono font-semibold text-[#17120f]">{cAtt.checked_in_at}</td>
                                            <td data-label="Status" className="px-5 py-4 text-center">
                                                <span className="inline-block rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                                                    Terverifikasi
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TableContainer>
                    ) : (
                        <div className="p-8 text-center text-sm text-[#7a746e]">
                            <i className="fa-solid fa-qrcode mb-2 block text-2xl text-slate-400" aria-hidden="true" />
                            Belum ada riwayat check-in court tercatat. Scan QR court pada portal wasit saat bertugas.
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
