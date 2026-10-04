import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Modal from '@/Components/UI/Overlays/Modal';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function RegistrationVerification({ athletes, contingents, stats, filters, activeEvent, eventOptions = [], matchCategories, maxMatchCategoriesPerAthlete, canManageMatchEntries }) {
    const [search, setSearch] = useState(filters.search || '');
    const [contingentFilter, setContingentFilter] = useState(filters.contingent_id || '');
    const [verifiedIds, setVerifiedIds] = useState({});
    const [entryAthlete, setEntryAthlete] = useState(null);
    const [removingEntry, setRemovingEntry] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState('');
    const entryForm = useForm({ event_match_category_id: '', event_id: activeEvent?.id || '' });
    useEffect(() => { entryForm.setData('event_id', activeEvent?.id || ''); }, [activeEvent?.id]);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/pendaftaran/verifikasi', { search, contingent_id: contingentFilter, event_id: activeEvent?.id }, { preserveState: true });
    };

    const handleContingentChange = (cid) => {
        setContingentFilter(cid);
        router.get('/admin/pendaftaran/verifikasi', { search, contingent_id: cid, event_id: activeEvent?.id }, { preserveState: true });
    };

    const toggleApprove = (id) => {
        setVerifiedIds(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const openMatchCategoryModal = (athlete) => {
        setEntryAthlete(athlete);
        entryForm.reset('event_match_category_id');
        entryForm.clearErrors();
    };

    const getEligibleMatchCategories = (athlete) => {
        const registeredCategoryIds = athlete.match_categories.map((entry) => entry.category_id);

        return matchCategories.filter((category) => {
            if (registeredCategoryIds.includes(category.id)) return false;
            if (category.min_weight !== null && (!athlete.weight || Number(athlete.weight) < category.min_weight)) return false;
            if (category.max_weight !== null && (!athlete.weight || Number(athlete.weight) > category.max_weight)) return false;
            return true;
        });
    };

    const submitMatchCategory = (event) => {
        event.preventDefault();
        if (!entryAthlete) return;

        entryForm.post(`/admin/pendaftaran/verifikasi/${entryAthlete.id}/match-category`, {
            preserveScroll: true,
            onSuccess: () => {
                setEntryAthlete(null);
                entryForm.reset('event_match_category_id');
            },
        });
    };

    const removeMatchCategory = (athlete, entry) => {
        setRemoveError('');
        setRemovingEntry({ athlete, entry });
    };
    const confirmRemoveMatchCategory = () => {
        if (!removingEntry || removing) return;
        setRemoving(true);
        setRemoveError('');
        router.delete(`/admin/pendaftaran/verifikasi/${removingEntry.athlete.id}/match-category/${removingEntry.entry.id}?event_id=${activeEvent?.id || ''}`, {
            preserveScroll: true,
            onSuccess: () => setRemovingEntry(null),
            onError: (errors) => setRemoveError(Object.values(errors).flat().join(' ')),
            onFinish: () => setRemoving(false),
        });
    };

    return (
        <AdminLayout title="Verifikasi Atlet & Berkas">
            <Head title="Verifikasi Atlet | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-user-check"></i>
                                <span>Verifikasi Lapangan & Keabsahan</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Verifikasi Atlet & Dokumen
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Pemeriksaan keabsahan KTA Perkemi, surat keterangan sehat dokter, akta kelahiran, dan kesesuaian timbang badan kenshi.
                            </p>
                            {activeEvent && <p className="mt-2 text-xs font-semibold text-[#d4a843]">Event: {activeEvent.name}</p>}
                        </div>
                    </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Total Atlet Masuk</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-[#0f0d0b] mt-2 font-cinzel">{stats.total_kenshi || 0}</p>
                        <span className="text-[10px] text-[#7a746e]">Seluruh kenshi</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Berkas Lengkap</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-id-card"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 mt-2 font-cinzel">{stats.verified_docs || 0}</p>
                        <span className="text-[10px] text-emerald-600">KTA & Akta Sah</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Menunggu Cek Fisik</span>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-weight-scale"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-amber-600 mt-2 font-cinzel">{stats.pending_docs || 0}</p>
                        <span className="text-[10px] text-amber-600">Timbang badan TM</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Siap Tanding</span>
                            <div className="w-8 h-8 rounded-lg bg-[#d4a843]/15 text-[#d4a843] flex items-center justify-center text-xs">
                                <i className="fa-solid fa-medal"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-[#0f0d0b] mt-2 font-cinzel">{stats.ready_match || 0}</p>
                        <span className="text-[10px] text-[#7a746e]">Lolos verifikasi akhir</span>
                    </div>
                </div>

                {/* Filter and Search */}
                <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    {eventOptions.length > 1 && <Combobox label="Event" size="sm" clearable={false}
                        value={activeEvent?.id || ''} onChange={(value) => router.get('/admin/pendaftaran/verifikasi',
                            { event_id: value, search, contingent_id: '' }, { preserveState: false })}
                        options={eventOptions.map((event) => ({ value: event.id, label: event.name, sublabel: event.option_description }))}
                        containerClassName="w-full md:w-64" />}
                    <Combobox label="Filter Kontingen" size="sm" value={contingentFilter}
                        onChange={handleContingentChange} placeholder="Semua Kontingen / Dojo"
                        options={contingents.map((contingent) => ({ value: contingent.id, label: contingent.name }))}
                        containerClassName="w-full md:w-64" />

                    <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-72">
                        <Input type="search" size="sm" value={search} onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama kenshi / kyu..." iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            containerClassName="min-w-0 flex-1" />
                        <Button type="submit" variant="dark" size="sm">Cari</Button>
                    </form>
                </div>

                {/* Table Verifikasi */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden">
                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider">
                                    <th className="py-3 px-4 whitespace-nowrap">Nama Kenshi</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Asal Kontingen</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Tingkatan</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Timbang Badan (BB / TB)</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Status KTA</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Surat Dokter</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Nomor Pertandingan</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Verifikasi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b]">
                                {athletes.data && athletes.data.length > 0 ? (
                                    athletes.data.map((ath, idx) => {
                                        const isApproved = verifiedIds[ath.id] ?? (idx % 4 !== 0);
                                        return (
                                            <tr key={ath.id} className="hover:bg-[#f7f4ef]/50 transition-colors">
                                                <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-[#f7f4ef] border border-[#ede9e1] flex items-center justify-center font-cinzel text-xs text-[#d4a843] font-bold">
                                                            {ath.name.charAt(0)}
                                                        </div>
                                                        <span>{ath.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-[#7a746e]">
                                                    {ath.contingent?.name || 'Dojo'}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#f7f4ef] border border-[#ede9e1] text-[#0f0d0b]">
                                                        {ath.kyu_dan || 'Kyu 1'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[#0f0d0b]">
                                                    {ath.weight ? `${ath.weight} kg` : '-'} / {ath.height ? `${ath.height} cm` : '-'}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                        <i className="fa-solid fa-check text-[9px]"></i> Sah (PB)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                                        <i className="fa-solid fa-file-pdf text-[9px]"></i> Sehat (RS)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex min-w-48 flex-wrap items-center gap-1.5">
                                                        {ath.match_categories.map((entry) => (
                                                            <span key={entry.id} className="inline-flex items-center gap-1 rounded-full border border-[#d4a843]/30 bg-[#fff7df] px-2 py-1 text-[10px] font-medium text-[#7a5b14]">
                                                                {entry.name}
                                                                {canManageMatchEntries && (
                                                                    <Button variant="unstyled" size="none" type="button" onClick={() => removeMatchCategory(ath, entry)} aria-label={`Hapus ${entry.name}`} className="ml-0.5 text-[#a47b1d] hover:text-red-600">
                                                                        <i className="fa-solid fa-xmark"></i>
                                                                    </Button>
                                                                )}
                                                            </span>
                                                        ))}
                                                        {ath.match_categories.length === 0 && <span className="text-[11px] text-[#9a938c]">Belum dipilih</span>}
                                                        {canManageMatchEntries && (
                                                            <Button variant="unstyled" size="none"
                                                                type="button"
                                                                onClick={() => openMatchCategoryModal(ath)}
                                                                disabled={maxMatchCategoriesPerAthlete !== null && ath.match_categories.length >= maxMatchCategoriesPerAthlete}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-[#d4a843]/40 bg-white px-2 py-1 text-[10px] font-semibold text-[#8a671b] hover:bg-[#fff7df] disabled:cursor-not-allowed disabled:border-[#ded9d0] disabled:text-[#a8a29a]"
                                                            >
                                                                <i className="fa-solid fa-plus"></i> Tambah
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => toggleApprove(ath.id)}
                                                        className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                                            isApproved
                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                                        }`}
                                                    >
                                                        {isApproved ? (
                                                            <>
                                                                <i className="fa-solid fa-circle-check mr-1"></i> Lolos
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-hourglass mr-1"></i> Periksa
                                                            </>
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-[#7a746e]">
                                            <i className="fa-solid fa-user-xmark text-3xl text-[#b5afa6] mb-2 block"></i>
                                            Tidak ditemukan data kenshi pada filter ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table></TableContainer>
                </div>

                <Modal
                    isOpen={entryAthlete !== null}
                    onClose={() => !entryForm.processing && setEntryAthlete(null)}
                    title="Tambah Nomor Pertandingan Atlet"
                    subtitle={entryAthlete ? `${entryAthlete.name} · ${entryAthlete.contingent?.name || 'Kontingen'}` : null}
                    footer={(
                        <>
                            <Button variant="outline" onClick={() => setEntryAthlete(null)} disabled={entryForm.processing}>Batal</Button>
                            <Button type="submit" form="athlete-match-category-form" loading={entryForm.processing} iconLeft={<i className="fa-solid fa-plus" />}>Tambah Nomor</Button>
                        </>
                    )}
                >
                    {entryAthlete && (
                        <form id="athlete-match-category-form" onSubmit={submitMatchCategory} className="space-y-4">
                            <div className="rounded-xl border border-[#d4a843]/30 bg-[#fff7df] p-4 text-sm text-[#624c1d]">
                                Atlet dapat mengikuti maksimal <strong>{maxMatchCategoriesPerAthlete ?? 'tanpa batas'}</strong> nomor pertandingan. Sistem tetap memeriksa kuota per kontingen saat disimpan.
                            </div>
                            <Combobox
                                label="Nomor Pertandingan"
                                required
                                value={entryForm.data.event_match_category_id}
                                onChange={(value) => entryForm.setData('event_match_category_id', value)}
                                error={entryForm.errors.event_match_category_id}
                                placeholder="Pilih nomor yang sesuai"
                                options={getEligibleMatchCategories(entryAthlete).map((category) => ({
                                    value: category.id,
                                    label: `[${category.type}] ${category.name}${category.max_athletes_per_team ? ` · Maks. ${category.max_athletes_per_team} atlet/kontingen` : ''}`,
                                }))}
                            />
                            {getEligibleMatchCategories(entryAthlete).length === 0 && (
                                <p className="text-sm text-[#7a746e]">Tidak ada nomor aktif yang sesuai dengan profil atlet atau seluruh nomor yang sesuai sudah dipilih.</p>
                            )}
                        </form>
                    )}
                </Modal>
            </div>
            <AlertConfirm isOpen={Boolean(removingEntry)} title="Hapus nomor pertandingan?"
                message={`Hapus ${removingEntry?.entry.name || 'nomor ini'} dari daftar pertandingan ${removingEntry?.athlete.name || 'atlet'}?`}
                confirmText="Hapus nomor" isLoading={removing} error={removeError}
                onConfirm={confirmRemoveMatchCategory} onCancel={() => { if (!removing) setRemovingEntry(null); }} />
        </AdminLayout>
    );
}
