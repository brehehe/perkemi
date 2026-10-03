import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Input from '@/Components/UI/Forms/Input';
import Combobox from '@/Components/UI/Forms/Combobox';
import Textarea from '@/Components/UI/Forms/Textarea';
import Modal from '@/Components/UI/Overlays/Modal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function RegistrationIndex({ registrations, stats, activeEvent, eventOptions = [], filters, canCreate = false }) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [paymentRegistration, setPaymentRegistration] = useState(null);
    const paymentForm = useForm({
        payment_method_id: '',
        payment_amount: '',
        payment_reference: '',
        payment_proof: null,
        payment_note: '',
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/pendaftaran/registrasi', { search, status: statusFilter, event_id: activeEvent?.id }, { preserveState: true });
    };

    const handleStatusTab = (status) => {
        setStatusFilter(status);
        router.get('/admin/pendaftaran/registrasi', { search, status, event_id: activeEvent?.id }, { preserveState: true });
    };

    const handleVerify = (id) => {
        if (confirm('Setujui berkas registrasi kontingen ini? Pembayaran diverifikasi terpisah.')) {
            setIsVerifying(true);
            router.post(`/admin/pendaftaran/registrasi/${id}/verify`, {}, {
                onFinish: () => {
                    setIsVerifying(false);
                    setSelectedRegistration(null);
                },
            });
        }
    };

    const handleReject = (id) => {
        if (confirm('Tolak atau kembalikan berkas registrasi ini?')) {
            router.post(`/admin/pendaftaran/registrasi/${id}/reject`, {}, {
                onFinish: () => setSelectedRegistration(null),
            });
        }
    };

    const openPaymentForm = (registration) => {
        if (registration.event?.is_paid === false) return;

        setPaymentRegistration(registration);
        setSelectedRegistration(null);
        paymentForm.clearErrors();
        paymentForm.setData({
            payment_method_id: registration.payment_method_id || '',
            payment_amount: registration.payment_amount || registration.final_amount || registration.total_amount || '',
            payment_reference: registration.payment_reference || '',
            payment_proof: null,
            payment_note: registration.payment_note || '',
        });
    };

    const submitPayment = (event) => {
        event.preventDefault();
        if (!paymentRegistration) return;

        paymentForm.post(`/admin/pendaftaran/registrasi/${paymentRegistration.id}/payment`, {
            forceFormData: true,
            onSuccess: () => {
                setPaymentRegistration(null);
                setSelectedRegistration(null);
                paymentForm.reset();
            },
        });
    };

    const verifyPayment = (registration) => {
        if (confirm('Verifikasi pembayaran kontingen ini?')) {
            router.post(`/admin/pendaftaran/registrasi/${registration.id}/payment/verify`, {}, {
                onSuccess: () => setSelectedRegistration(null),
            });
        }
    };

    const rejectPayment = (registration) => {
        if (confirm('Tolak pembayaran ini untuk diperbaiki oleh kontingen?')) {
            router.post(`/admin/pendaftaran/registrasi/${registration.id}/payment/reject`, {}, {
                onSuccess: () => setSelectedRegistration(null),
            });
        }
    };

    const getStatusBadge = (status) => {
        const val = typeof status === 'object' ? status.value : status;
        switch (val) {
            case 'verified':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Terverifikasi
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Ditolak
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Menunggu Verifikasi
                    </span>
                );
        }
    };

    const getPaymentStatusBadge = (status, isPaid = true) => {
        if (!isPaid) {
            return <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-emerald-700">Gratis · Tanpa Pembayaran</span>;
        }

        const value = typeof status === 'object' ? status.value : status;
        const styles = {
            verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            submitted: 'bg-blue-50 text-blue-700 border-blue-200',
            rejected: 'bg-rose-50 text-rose-700 border-rose-200',
            pending: 'bg-amber-50 text-amber-700 border-amber-200',
        };
        const labels = {
            verified: 'Pembayaran Terverifikasi',
            submitted: 'Menunggu Verifikasi Bayar',
            rejected: 'Pembayaran Ditolak',
            pending: 'Belum Ada Pembayaran',
        };

        return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${styles[value] || styles.pending}`}>{labels[value] || labels.pending}</span>;
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    return (
        <AdminLayout title="Registrasi Kontingen">
            <Head title="Registrasi Kontingen | Smart Perkemi" />

            <div className="w-full max-w-full space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-file-signature"></i>
                                <span>Manajemen Pendaftaran</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Registrasi Berkas Kontingen
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Pantau berkas kontingen, status registrasi, dan pembayaran untuk event berbayar maupun gratis.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                        {canCreate && <Link href={`/admin/pendaftaran/registrasi/create${activeEvent?.id ? `?event_id=${activeEvent.id}` : ''}`} className="inline-flex items-center gap-2 rounded-lg bg-[#d4a843] px-3.5 py-2 text-xs font-bold text-[#17120f] hover:bg-[#edc66c]">
                            <i className="fa-solid fa-plus" aria-hidden="true"></i>
                            Buat Registrasi
                        </Link>}
                        {activeEvent && (
                            <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center gap-3 whitespace-nowrap">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <div>
                                    <p className="text-[10px] uppercase text-[#b5afa6] tracking-wider">Event Aktif</p>
                                    <p className="font-medium text-white text-xs">{activeEvent.name}</p>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Total Berkas</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-folder-open"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-[#0f0d0b] mt-2 font-cinzel">{stats.total_registrations || 0}</p>
                        <span className="text-[10px] text-[#7a746e]">Berkas masuk</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Terverifikasi</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-circle-check"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 mt-2 font-cinzel">{stats.verified_count || 0}</p>
                        <span className="text-[10px] text-emerald-600">Berkas disetujui</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Menunggu Approval</span>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-clock"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-amber-600 mt-2 font-cinzel">{stats.pending_count || 0}</p>
                        <span className="text-[10px] text-amber-600">Perlu tindakan</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">{activeEvent?.is_paid === false ? 'Skema Biaya' : 'Total Penerimaan'}</span>
                            <div className="w-8 h-8 rounded-lg bg-[#d4a843]/15 text-[#d4a843] flex items-center justify-center text-xs">
                                <i className="fa-solid fa-coins"></i>
                            </div>
                        </div>
                        <p className="text-lg font-bold text-[#0f0d0b] mt-2 font-cinzel">{activeEvent?.is_paid === false ? 'Gratis' : formatCurrency(stats.total_amount)}</p>
                        <span className="text-[10px] text-[#7a746e]">{activeEvent?.is_paid === false ? 'Tanpa proses pembayaran' : 'Biaya pendaftaran resmi'}</span>
                    </div>
                </div>

                {/* Filters and Search Bar */}
                <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    {eventOptions.length > 1 && <Combobox label="Event" size="sm" clearable={false}
                        value={activeEvent?.id || ''} onChange={(value) => router.get('/admin/pendaftaran/registrasi',
                            { event_id: value, search, status: statusFilter }, { preserveState: false })}
                        options={eventOptions.map((event) => ({ value: event.id, label: event.name, sublabel: event.is_paid ? 'Berbayar' : 'Gratis' }))}
                        containerClassName="w-full md:w-64" />}
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-[#f7f4ef] rounded-lg border border-[#ede9e1] w-full md:w-auto">
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => handleStatusTab('all')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                statusFilter === 'all'
                                    ? 'bg-white text-[#0f0d0b] shadow-xs'
                                    : 'text-[#7a746e] hover:text-[#0f0d0b]'
                            }`}
                        >
                            Semua
                        </Button>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => handleStatusTab('verified')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                statusFilter === 'verified'
                                    ? 'bg-white text-emerald-700 shadow-xs'
                                    : 'text-[#7a746e] hover:text-emerald-700'
                            }`}
                        >
                            Terverifikasi
                        </Button>
                        <Button variant="unstyled" size="none"
                            type="button"
                            onClick={() => handleStatusTab('pending')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                statusFilter === 'pending'
                                    ? 'bg-white text-amber-700 shadow-xs'
                                    : 'text-[#7a746e] hover:text-amber-700'
                            }`}
                        >
                            Menunggu
                        </Button>
                    </div>

                    {/* Search Input */}
                    <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-80">
                        <Input type="search" size="sm" value={search} onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari no. registrasi / kontingen..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            containerClassName="min-w-0 flex-1" />
                        <Button type="submit" variant="dark" size="sm">Cari</Button>
                    </form>
                </div>

                {/* Table Registrasi */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden">
                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider">
                                    <th className="py-3 px-4 whitespace-nowrap">No. Registrasi</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Event</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Nama Kontingen / Dojo</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Kota / Wilayah</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Manajer / Kontak</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Biaya Total</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Status Pembayaran</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Status Berkas</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b]">
                                {registrations.data && registrations.data.length > 0 ? (
                                    registrations.data.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-[#f7f4ef]/50 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-blue-700">
                                                {reg.registration_number}
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-[#4f4438]">{reg.event?.name || 'Event belum ditetapkan'}</td>
                                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b]">
                                                {reg.contingent?.name || 'Kontingen'}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-[#7a746e]">
                                                {reg.contingent?.city || '-'}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div>
                                                    <p className="font-medium">{reg.contingent?.manager_name || '-'}</p>
                                                    <p className="text-[11px] text-[#7a746e]">{reg.contingent?.phone || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b]">
                                                {reg.event?.is_paid === false ? <span className="font-semibold text-emerald-700">Gratis</span> : formatCurrency(reg.final_amount || reg.total_amount)}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {getPaymentStatusBadge(reg.payment_status, reg.event?.is_paid !== false)}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {getStatusBadge(reg.status)}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Link
                                                        href={`/admin/pendaftaran/registrasi/${reg.id}/detail`}
                                                        className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#f6ecd7] hover:bg-[#ead6a6] text-[#654512] transition-colors"
                                                    >
                                                        Atlet & Nomor
                                                    </Link>
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => setSelectedRegistration(reg)}
                                                        className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[#ede9e1] hover:bg-[#e2ddd3] text-[#0f0d0b] transition-colors cursor-pointer"
                                                    >
                                                        <i className="fa-solid fa-eye mr-1"></i> Rincian
                                                    </Button>
                                                    {reg.status !== 'verified' && (
                                                        <Button variant="unstyled" size="none"
                                                            type="button"
                                                            onClick={() => handleVerify(reg.id)}
                                                            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                                                        >
                                                            <i className="fa-solid fa-check mr-1"></i> Setujui Berkas
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="py-12 text-center text-[#7a746e]">
                                            <i className="fa-solid fa-folder-open text-3xl text-[#b5afa6] mb-2 block"></i>
                                            Belum ada data registrasi yang sesuai filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table></TableContainer>
                </div>

                <Modal
                    isOpen={Boolean(selectedRegistration)}
                    onClose={() => setSelectedRegistration(null)}
                    title="Rincian Berkas Registrasi"
                    subtitle={selectedRegistration ? `No. ${selectedRegistration.registration_number}` : null}
                    footer={selectedRegistration ? (
                        <>
                            <Button variant="danger" onClick={() => handleReject(selectedRegistration.id)}>Tolak / Revisi</Button>
                            <Button onClick={() => handleVerify(selectedRegistration.id)} loading={isVerifying}>Setujui Berkas</Button>
                        </>
                    ) : null}
                >
                    {selectedRegistration && (
                        <div className="space-y-4 text-sm">
                            <div className="space-y-3 rounded-xl border border-[#ede9e1] bg-[#f7f4ef] p-4 text-xs">
                                <div className="flex justify-between gap-4 border-b border-[#ede9e1] pb-2">
                                    <span className="text-[#7a746e]">Kontingen</span>
                                    <span className="font-semibold text-[#0f0d0b]">{selectedRegistration.contingent?.name}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-[#ede9e1] pb-2">
                                    <span className="text-[#7a746e]">Kota / Daerah</span>
                                    <span>{selectedRegistration.contingent?.city}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-[#ede9e1] pb-2">
                                    <span className="text-[#7a746e]">Manajer Kontingen</span>
                                    <span>{selectedRegistration.contingent?.manager_name}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-[#ede9e1] pb-2">
                                    <span className="text-[#7a746e]">Nomor Telepon</span>
                                    <span>{selectedRegistration.contingent?.phone}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-[#ede9e1] pb-2">
                                    <span className="text-[#7a746e]">Total Biaya</span>
                                    <span className="font-bold text-emerald-700">{selectedRegistration.event?.is_paid === false ? 'Gratis' : formatCurrency(selectedRegistration.final_amount)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-[#7a746e]">Status</span>
                                    <span>{getStatusBadge(selectedRegistration.status)}</span>
                                </div>
                            </div>

                            {selectedRegistration.event?.is_paid === false ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700"><i className="fa-solid fa-gift" /></span><div><p className="font-semibold">Event Gratis</p><p className="mt-1 text-emerald-700">Registrasi ini tidak memerlukan metode pembayaran, kode unik, atau bukti transfer.</p></div></div>
                            </div> : <div className="rounded-xl border border-[#d8d0c7] bg-white p-4 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-[#0f0d0b]">Pembayaran Registrasi</p>
                                        <p className="mt-0.5 text-[#7a746e]">{selectedRegistration.payment_method?.name || 'Metode belum dipilih'}</p>
                                    </div>
                                    {getPaymentStatusBadge(selectedRegistration.payment_status, true)}
                                </div>
                                <div className="mt-3 grid gap-2 border-t border-[#ede9e1] pt-3 sm:grid-cols-2">
                                    <p><span className="text-[#7a746e]">Nominal: </span><span className="font-semibold">{formatCurrency(selectedRegistration.payment_amount)}</span></p>
                                    <p><span className="text-[#7a746e]">Referensi: </span><span className="font-mono">{selectedRegistration.payment_reference || '—'}</span></p>
                                </div>
                                {selectedRegistration.payment_note && <p className="mt-2 rounded-lg bg-[#f7f4ef] p-2 text-[#706860]">Catatan: {selectedRegistration.payment_note}</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openPaymentForm(selectedRegistration)} iconLeft={<i className="fa-solid fa-money-bill-transfer" />}>
                                        {selectedRegistration.payment_status === 'pending' ? 'Catat Pembayaran' : 'Ubah Pembayaran'}
                                    </Button>
                                    {selectedRegistration.payment_proof_path && (
                                        <a href={`/admin/pendaftaran/registrasi/${selectedRegistration.id}/payment-proof`} className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                                            <i className="fa-solid fa-file-arrow-down mr-1.5" />Bukti Bayar
                                        </a>
                                    )}
                                    {selectedRegistration.payment_status === 'submitted' && <>
                                        <Button size="sm" variant="primary" onClick={() => verifyPayment(selectedRegistration)} iconLeft={<i className="fa-solid fa-circle-check" />}>Verifikasi Bayar</Button>
                                        <Button size="sm" variant="danger" onClick={() => rejectPayment(selectedRegistration)} iconLeft={<i className="fa-solid fa-rotate-left" />}>Tolak Bayar</Button>
                                    </>}
                                </div>
                            </div>}
                        </div>
                    )}
                </Modal>

                <Modal
                    isOpen={Boolean(paymentRegistration)}
                    onClose={() => !paymentForm.processing && setPaymentRegistration(null)}
                    title="Catat Pembayaran Registrasi"
                    subtitle={paymentRegistration ? `No. ${paymentRegistration.registration_number}` : null}
                    footer={<>
                        <Button variant="outline" onClick={() => setPaymentRegistration(null)} disabled={paymentForm.processing}>Batal</Button>
                        <Button type="submit" form="registration-payment-form" loading={paymentForm.processing} iconLeft={<i className="fa-solid fa-floppy-disk" />}>Simpan Pembayaran</Button>
                    </>}
                >
                    <form id="registration-payment-form" onSubmit={submitPayment} className="space-y-4">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            Nominal tagihan: <strong>{formatCurrency(paymentRegistration?.final_amount || paymentRegistration?.total_amount)}</strong>
                        </div>
                        <Combobox
                            label="Metode Pembayaran"
                            required
                            value={paymentForm.data.payment_method_id}
                            onChange={(value) => paymentForm.setData('payment_method_id', value)}
                            error={paymentForm.errors.payment_method_id}
                            options={(paymentRegistration?.event?.payment_methods || []).filter((method) => method.is_active || method.id === paymentRegistration?.payment_method_id).map((method) => ({ value: method.id, label: `${method.name}${method.account_number ? ` · ${method.account_number}` : ''}` }))}
                            placeholder="Pilih metode yang tersedia di event"
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input label="Nominal Dibayar" type="number" min="0" step="0.01" required value={paymentForm.data.payment_amount} onChange={(event) => paymentForm.setData('payment_amount', event.target.value)} error={paymentForm.errors.payment_amount} />
                            <Input label="Referensi Pembayaran" value={paymentForm.data.payment_reference} onChange={(event) => paymentForm.setData('payment_reference', event.target.value)} error={paymentForm.errors.payment_reference} placeholder="Contoh: TRX-123456" />
                        </div>
                        <Input
                            label="Bukti Pembayaran"
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(event) => paymentForm.setData('payment_proof', event.target.files?.[0] || null)}
                            error={paymentForm.errors.payment_proof}
                            hint="Opsional untuk pembayaran tunai. JPG, PNG, atau PDF maksimal 5 MB."
                        />
                        <Textarea label="Catatan Panitia / Pembayar" rows={3} value={paymentForm.data.payment_note} onChange={(event) => paymentForm.setData('payment_note', event.target.value)} error={paymentForm.errors.payment_note} placeholder="Keterangan tambahan pembayaran" />
                    </form>
                </Modal>
            </div>
        </AdminLayout>
    );
}
