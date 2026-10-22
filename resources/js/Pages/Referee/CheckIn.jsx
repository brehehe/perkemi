import Button from '@/Components/UI/Elements/Button';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';

export default function RefereeCheckIn({ activeEvent, referee, target, submitUrl }) {
    const confirm = () => router.post(submitUrl, {}, { preserveScroll: true });

    return (
        <AdminLayout title="Konfirmasi Kehadiran Wasit">
            <Head title={`${target.title} | Smart Perkemi`} />
            <div className="mx-auto max-w-2xl py-2 sm:py-6 md:py-12">
                <section className="overflow-hidden rounded-3xl border border-[#e2dbd1] bg-white shadow-xl shadow-black/5">
                    <div className="bg-gradient-to-br from-[#17120f] via-[#282019] to-[#17120f] p-5 text-center text-white sm:p-6 md:p-9">
                        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4a843]/30 bg-[#d4a843]/15 text-2xl text-[#f0c060]"><i className="fa-solid fa-qrcode" aria-hidden="true" /></span>
                        <p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#d4a843]">Absensi QR Terverifikasi</p>
                        <h1 className="mt-2 text-2xl font-black md:text-3xl">{target.title}</h1>
                        <p className="mt-2 text-sm text-white/65">{activeEvent.name} · {activeEvent.city}</p>
                    </div>
                    <div className="space-y-5 p-5 md:p-8">
                        {target.court && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Court Tujuan</p><p className="mt-1 font-bold text-blue-950">{target.court.name}</p><p className="mt-0.5 text-xs text-blue-700">{target.court.location || 'Lokasi belum dicatat'}</p></div>}
                        {target.role_label && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Posisi Penugasan Meja Juri</p><p className="mt-1 font-bold text-amber-950">{target.role_label}</p><p className="mt-0.5 text-xs text-amber-700">Pastikan Anda menempati meja juri sesuai posisi ini.</p></div>}
                        <p className="text-sm leading-6 text-[#655d56]">{target.description}</p>
                        {target.is_checked_in ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><p className="font-bold"><i className="fa-solid fa-circle-check mr-2" aria-hidden="true" />Kehadiran sudah tercatat</p><p className="mt-1 text-xs">Tercatat pada {target.checked_in_at}. Scan ulang tidak membuat data ganda.</p></div> : !target.can_confirm && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-bold"><i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />Absensi event diperlukan</p><p className="mt-1 text-xs">Minta Panitera menampilkan QR event, lalu scan QR court kembali.</p></div>}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Button variant="outline" className="min-h-12" onClick={() => router.visit(`/wasit?event_id=${encodeURIComponent(activeEvent.id)}`)}>Kembali ke Portal</Button>
                            <Button className="min-h-12 bg-[#b73328] text-white hover:bg-[#96291f]" disabled={!target.can_confirm || target.is_checked_in} onClick={confirm}>
                                <i className="fa-solid fa-fingerprint mr-2" aria-hidden="true" />{target.is_checked_in ? 'Sudah Tercatat' : 'Konfirmasi Kehadiran'}
                            </Button>
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
