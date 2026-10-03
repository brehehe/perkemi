import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import Button from '@/Components/UI/Elements/Button';
import Checkbox from '@/Components/UI/Forms/Checkbox';
import Combobox from '@/Components/UI/Forms/Combobox';
import Input from '@/Components/UI/Forms/Input';
import Modal from '@/Components/UI/Overlays/Modal';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function TournamentMerge({ activeEvent, events = [], categories, canManageMerge }) {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [mergeTarget, setMergeTarget] = useState('');
    const [selectedSources, setSelectedSources] = useState([]);
    const [combinedName, setCombinedName] = useState('');
    const [combineErrors, setCombineErrors] = useState({});
    const [combining, setCombining] = useState(false);
    const [combinedToDelete, setCombinedToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const selectedSourceCategories = categories.filter((category) => selectedSources.includes(category.id));
    const selectedType = selectedSourceCategories[0]?.type_key;
    const combinedParticipants = selectedSourceCategories.reduce((total, category) => total + category.participants_count, 0);

    const handleExecuteMerge = (catId, target) => {
        if (!target) {
            return;
        }

        router.post(`/admin/pertandingan/merge/${catId}`, {
            target_category_id: target,
            event_id: activeEvent?.id,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedCategory(null);
                setMergeTarget('');
            },
        });
    };

    const toggleSource = (category) => {
        setCombineErrors({});
        setSelectedSources((current) => current.includes(category.id)
            ? current.filter((id) => id !== category.id)
            : [...current, category.id]);
    };

    const handleCombinedMerge = (event) => {
        event.preventDefault();
        if (selectedSources.length < 2 || !combinedName.trim() || combining) return;

        router.post('/admin/pertandingan/merge/combine', {
            combined_name: combinedName,
            source_category_ids: selectedSources,
            event_id: activeEvent?.id,
        }, {
            preserveScroll: true,
            onStart: () => setCombining(true),
            onFinish: () => setCombining(false),
            onError: setCombineErrors,
            onSuccess: () => {
                setSelectedSources([]);
                setCombinedName('');
                setCombineErrors({});
            },
        });
    };

    const handleDeleteCombined = () => {
        if (!combinedToDelete || deleting) return;

        router.delete(`/admin/pertandingan/merge/combine/${combinedToDelete.id}?event_id=${activeEvent?.id || ''}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => setDeleting(false),
            onError: (errors) => setDeleteError(errors.combined_category || 'Merge belum dapat dihapus.'),
            onSuccess: () => {
                setCombinedToDelete(null);
                setDeleteError('');
            },
        });
    };

    return (
        <AdminLayout title="Merge Nomor Pertandingan">
            <Head title="Merge Nomor Pertandingan | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-object-group"></i>
                                <span>Manajemen Kuota Turnamen</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                        Penggabungan (Merge) Nomor Pertandingan
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Gabungkan nomor yang kekurangan peserta. Randori dihitung per atlet, sedangkan Embu dihitung per tim.
                            </p>
                        </div>
                        <div className="w-full space-y-2 md:w-96">
                            <Combobox label="Event aktif" labelClassName="text-white/50" value={activeEvent?.id || ''}
                                onChange={(value) => router.get('/admin/pertandingan/merge', { event_id: value })}
                                clearable={false} options={events.map((item) => ({ value: item.id, label: item.name }))} />
                            <div className="flex justify-end gap-2">
                                {activeEvent && <Link href={`/admin/master/event/${activeEvent.id}/detail`} className="rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10">Pengaturan Event</Link>}
                                {activeEvent && <Link href={`/admin/pertandingan/drawing?event_id=${activeEvent.id}`} className="rounded-lg bg-[#d4a843] px-3 py-1.5 text-[11px] font-bold text-[#17120f] hover:bg-[#e3ba52]">Lanjut Drawing <i className="fa-solid fa-arrow-right ml-1" /></Link>}
                            </div>
                        </div>
                    </div>
                </div>

                {canManageMerge && <form onSubmit={handleCombinedMerge} className="rounded-2xl border border-[#e4d7be] bg-white p-5 shadow-sm md:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a47420]">Merge beberapa nomor</p>
                            <h2 className="mt-1 font-cinzel text-lg font-bold text-[#17120f]">Buat Nomor Pertandingan Gabungan</h2>
                            <p className="mt-1 text-sm leading-relaxed text-[#706860]">Centang minimal dua nomor kurang kuota dengan jenis yang sama. Peserta dan susunan tim asal tetap tersimpan, lalu dibaca sebagai satu nomor pada Drawing.</p>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
                            <Input id="combined-name" label="Nama nomor gabungan" value={combinedName}
                                onChange={(event) => { setCombinedName(event.target.value); setCombineErrors({}); }}
                                placeholder="Contoh: Embu Pasangan / Putra / Putri Kyu 7–2" error={combineErrors.combined_name} />
                            <Button type="submit" loading={combining} disabled={selectedSources.length < 2 || !combinedName.trim() || combining} className="self-end">
                                {`Gabungkan ${selectedSources.length} Nomor`}
                            </Button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#faf7f2] px-4 py-3 text-xs text-[#5c5147]">
                        <strong>{selectedSources.length} nomor dipilih</strong>
                        <span aria-hidden="true">·</span>
                        <span>Total setelah digabung: <strong>{combinedParticipants} {selectedType === 'embu' ? 'tim' : 'atlet'}</strong></span>
                        {selectedType && <><span aria-hidden="true">·</span><span>Jenis: <strong>{selectedType === 'embu' ? 'Embu' : 'Randori'}</strong></span></>}
                    </div>
                    {combineErrors.source_category_ids && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{combineErrors.source_category_ids}</p>}
                </form>}

                {/* Warning Alert Note */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600 text-sm mt-0.5"></i>
                    <div>
                        <p className="font-semibold">Aturan Regulasi PB Perkemi:</p>
                        <p className="text-[#7a746e] mt-0.5">
                            Precheck memakai registrasi dan pembayaran terverifikasi pada event <strong>{activeEvent?.name}</strong>. Nomor di bawah minimal peserta/tim atau minimal kontingen dapat digabung, lalu Drawing membaca hasilnya sebagai satu nomor.
                        </p>
                    </div>
                </div>

                {/* Table Categories and Merger Status */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden">
                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider">
                                    {canManageMerge && <th className="w-12 py-3 px-4 text-center">Pilih</th>}
                                    <th className="py-3 px-4 whitespace-nowrap">Nomor Pertandingan</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Jenis</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Kandidat Peserta</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Kuota Minimum</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Status Kelayakan</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Tindakan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b]">
                                {categories.map((cat) => {
                                    const isMerged = cat.status === 'merged';
                                    const isUnderQuota = cat.status === 'under_quota';
                                    const isCombined = cat.is_combined && cat.merged_sources?.length > 0;
                                    const canSelect = isUnderQuota && (!selectedType || selectedType === cat.type_key || selectedSources.includes(cat.id));

                                    return (
                                        <tr key={cat.id} className="hover:bg-[#f7f4ef]/50 transition-colors">
                                            {canManageMerge && <td className="px-4 py-3.5 text-center">
                                                <Checkbox id={`merge-source-${cat.id}`} checked={selectedSources.includes(cat.id)} onChange={() => toggleSource(cat)} disabled={!canSelect}
                                                    aria-label={`Pilih ${cat.name} untuk merge gabungan`} className="justify-center" />
                                            </td>}
                                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b]">
                                                <div>
                                                    <p>{cat.name}</p>
                                                    {isMerged && (
                                                        <p className="text-[11px] text-blue-700 font-normal mt-0.5">
                                                            <i className="fa-solid fa-arrow-right-arrow-left mr-1"></i>
                                                            Digabung ke: <span className="font-semibold">{cat.merged_into?.name}</span>
                                                        </p>
                                                    )}
                                                    {cat.merged_sources?.length > 0 && <div className="mt-1.5 space-y-0.5 text-[11px] font-normal text-[#706860]">
                                                        {cat.merged_sources.map((source) => <p key={source.id}>↳ {source.name} ({source.participants_count} {cat.participant_label.toLowerCase()})</p>)}
                                                    </div>}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                    cat.type === 'Randori' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {cat.type}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                                                <span className={isUnderQuota ? 'text-amber-600 font-bold' : 'text-emerald-700'}>
                                                    {cat.participants_count} {cat.participant_label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-[#7a746e]">
                                                <span className="block">Min. {cat.min_quota} {cat.participant_label}</span>
                                                <span className="mt-0.5 block text-[10px]">dari {cat.min_contingents} kontingen</span>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                {isMerged ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                                                        <i className="fa-solid fa-check text-[9px]"></i> Sudah Digabung
                                                    </span>
                                                ) : isUnderQuota ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                                        <i className="fa-solid fa-triangle-exclamation text-[9px]"></i> Perlu Merge ({cat.participants_count} {cat.participant_label.toLowerCase()} · {cat.contingents_count} kontingen)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                                        <i className="fa-solid fa-circle-check text-[9px]"></i> Memenuhi Kuota
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                {isCombined && canManageMerge ? (
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => {
                                                            setCombinedToDelete(cat);
                                                            setDeleteError('');
                                                        }}
                                                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                                                    >
                                                        <i className="fa-solid fa-rotate-left mr-1.5"></i>
                                                        Batalkan Merge
                                                    </Button>
                                                ) : isUnderQuota && !isMerged && canManageMerge ? (
                                                    <Button variant="unstyled" size="none"
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setMergeTarget(cat.merge_targets[0]?.id || '');
                                                        }}
                                                        disabled={cat.merge_targets.length === 0}
                                                        title={cat.merge_targets.length === 0 ? 'Belum ada kategori aktif yang kompatibel sebagai target.' : undefined}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-[#0f0d0b] hover:bg-[#25201b] disabled:bg-[#a8a29a] disabled:cursor-not-allowed text-[#f7f4ef] rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <i className="fa-solid fa-object-group mr-1.5 text-[#d4a843]"></i>
                                                        {cat.merge_targets.length === 0 ? 'Target Belum Ada' : 'Gabungkan Kelas'}
                                                    </Button>
                                                ) : (
                                                    <span className="text-[11px] text-[#b5afa6]">
                                                        {isUnderQuota && !canManageMerge ? 'Menunggu admin event' : 'Tidak Perlu Tindakan'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table></TableContainer>
                </div>

                <Modal
                    isOpen={selectedCategory !== null}
                    onClose={() => setSelectedCategory(null)}
                    title="Konfirmasi Penggabungan Kelas"
                    subtitle="Penggabungan akan menonaktifkan kategori asal dari Drawing."
                    footer={(
                        <>
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setSelectedCategory(null)}
                                className="px-4 py-2 text-xs font-medium bg-[#ede9e1] text-[#0f0d0b] rounded-lg cursor-pointer"
                            >
                                Batal
                            </Button>
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => selectedCategory && handleExecuteMerge(selectedCategory.id, mergeTarget)}
                                disabled={!mergeTarget}
                                className="px-4 py-2 text-xs font-medium bg-[#0f0d0b] disabled:bg-[#a8a29a] text-white hover:bg-[#25201b] rounded-lg cursor-pointer disabled:cursor-not-allowed"
                            >
                                Konfirmasi Gabung
                            </Button>
                        </>
                    )}
                >
                    {selectedCategory && (
                        <div className="space-y-4 text-sm">
                            <div className="rounded-xl border border-[#ede9e1] bg-[#f7f4ef] p-4">
                                <span className="block text-xs font-medium text-[#7a746e]">Kelas asal (kurang kuota)</span>
                                <p className="mt-1 font-semibold text-[#0f0d0b]">
                                    {selectedCategory.name} ({selectedCategory.participants_count} {selectedCategory.participant_label.toLowerCase()})
                                </p>
                            </div>
                            <Combobox id="merge-target" label="Pilih kelas target yang kompatibel" value={mergeTarget}
                                onChange={setMergeTarget} placeholder="Pilih nomor pertandingan"
                                options={selectedCategory.merge_targets.map((target) => ({ value: target.id, label: target.name }))} />
                        </div>
                    )}
                </Modal>

                <Modal
                    isOpen={combinedToDelete !== null}
                    onClose={() => {
                        if (!deleting) setCombinedToDelete(null);
                    }}
                    title="Batalkan Merge Nomor Pertandingan"
                    subtitle="Nomor gabungan akan dihapus dan nomor asal diaktifkan kembali."
                    footer={(
                        <>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setCombinedToDelete(null)} disabled={deleting}>Kembali</Button>
                            <Button type="button" variant="danger" size="sm" onClick={handleDeleteCombined} loading={deleting}>Ya, Batalkan Merge</Button>
                        </>
                    )}
                >
                    {combinedToDelete && <div className="space-y-3 text-sm text-[#5c5147]">
                        <p>Batalkan merge <strong className="text-[#17120f]">{combinedToDelete.name}</strong>?</p>
                        <div className="rounded-xl border border-[#eadfce] bg-[#faf7f2] p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a746e]">Nomor yang akan dipulihkan</p>
                            <ul className="space-y-1">
                                {combinedToDelete.merged_sources.map((source) => <li key={source.id}>• {source.name}</li>)}
                            </ul>
                        </div>
                        {deleteError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{deleteError}</p>}
                    </div>}
                </Modal>
            </div>
        </AdminLayout>
    );
}
