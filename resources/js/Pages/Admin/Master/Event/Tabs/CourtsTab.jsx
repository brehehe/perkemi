import { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Input, Button, Modal, Checkbox, Textarea, Pagination } from '@/Components/UI';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';

export default function CourtsTab({ event, courts = [] }) {
    const itemsPerPage = 5;
    const [courtSearch, setCourtSearch] = useState('');
    const [courtPage, setCourtPage] = useState(1);
    const [copiedCourtTokenId, setCopiedCourtTokenId] = useState(null);

    // Modal states
    const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState(null);
    const [deletingCourt, setDeletingCourt] = useState(null);

    // Form hook
    const courtForm = useForm({
        name: '',
        location: '',
        description: '',
        order: 0,
        is_active: true,
        regenerate_token: false,
    });

    // Filtering & Pagination
    const filteredCourts = useMemo(() => {
        return courts.filter((court) => {
            if (!courtSearch) return true;
            const q = courtSearch.toLowerCase();
            return (
                court.name?.toLowerCase().includes(q) ||
                court.location?.toLowerCase().includes(q) ||
                court.description?.toLowerCase().includes(q)
            );
        });
    }, [courts, courtSearch]);

    const paginatedCourts = useMemo(() => {
        return filteredCourts.slice(
            (courtPage - 1) * itemsPerPage,
            courtPage * itemsPerPage
        );
    }, [filteredCourts, courtPage]);

    // Token copy & regenerate
    const handleCopyCourtToken = (court) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard && court.access_code) {
            navigator.clipboard.writeText(court.access_code);
            setCopiedCourtTokenId(court.id);
            setTimeout(() => setCopiedCourtTokenId(null), 2000);
        }
    };

    const handleRegenerateCourtToken = (court) => {
        if (!confirm(`Buat token baru untuk ${court.name}? Token lama (jika ada) tidak akan dapat digunakan lagi.`)) {
            return;
        }
        router.post(`/admin/master/event/${event.id}/court/${court.id}/regenerate-token`, {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedCourt = page.props.courts?.find((c) => c.id === court.id);
                if (updatedCourt && editingCourt?.id === court.id) {
                    setEditingCourt(updatedCourt);
                }
            },
        });
    };

    // Modal handlers
    const openCreateCourtModal = () => {
        setEditingCourt(null);
        courtForm.reset();
        courtForm.clearErrors();
        courtForm.setData({
            name: `Court ${(courts.length || 0) + 1}`,
            location: '',
            description: '',
            order: (courts.length || 0) + 1,
            is_active: true,
            regenerate_token: false,
        });
        setIsCourtModalOpen(true);
    };

    const openEditCourtModal = (court) => {
        setEditingCourt(court);
        courtForm.clearErrors();
        courtForm.setData({
            name: court.name || '',
            location: court.location || '',
            description: court.description || '',
            order: court.order ?? 0,
            is_active: court.is_active ?? true,
            regenerate_token: false,
        });
        setIsCourtModalOpen(true);
    };

    const submitCourt = (e) => {
        e.preventDefault();
        if (editingCourt) {
            courtForm.put(`/admin/master/event/${event.id}/court/${editingCourt.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCourtModalOpen(false);
                    setEditingCourt(null);
                },
            });
        } else {
            courtForm.post(`/admin/master/event/${event.id}/court`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsCourtModalOpen(false);
                    courtForm.reset();
                },
            });
        }
    };

    const confirmDeleteCourt = () => {
        if (!deletingCourt) return;
        router.delete(`/admin/master/event/${event.id}/court/${deletingCourt.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingCourt(null),
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                            Lapangan & Tatami
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                            {courts.length} Total
                        </span>
                    </div>
                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                        Daftar gelanggang pertandingan yang digunakan untuk jadwal partai dan penugasan wasit
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Search Input Bar */}
                    <Input
                        type="search"
                        size="sm"
                        value={courtSearch}
                        onChange={(event) => {
                            setCourtSearch(event.target.value);
                            setCourtPage(1);
                        }}
                        placeholder="Cari lapangan, tatami..."
                        iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                        clearable
                        onClear={() => { setCourtSearch(''); setCourtPage(1); }}
                        containerClassName="w-56 sm:w-64"
                    />

                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={openCreateCourtModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                        title="Tambah Lapangan Baru"
                    >
                        <i className="fa-solid fa-plus text-xs" />
                        <span>Tambah Lapangan (Court)</span>
                    </Button>
                </div>
            </div>

            {/* Table Content */}
            <TableContainer ariaLabel="Tabel lapangan">
                <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-y border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                            <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                            <th scope="col" className="py-3 px-4 min-w-[220px]">Nama Lapangan</th>
                            <th scope="col" className="py-3 px-4 min-w-[200px]">Lokasi / Gelanggang</th>
                            <th scope="col" className="py-3 px-4 min-w-[220px]">Keterangan</th>
                            <th scope="col" className="py-3 px-4 text-center min-w-[150px]">Token Panitera</th>
                            <th scope="col" className="py-3 px-4 text-center w-24">Urutan</th>
                            <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                            <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                        {paginatedCourts.length > 0 ? (
                            paginatedCourts.map((court, idx) => (
                                <tr
                                    key={court.id}
                                    className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                >
                                    {/* Index */}
                                    <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                        {(courtPage - 1) * itemsPerPage + idx + 1}
                                    </td>

                                    {/* Court Name with Avatar Badge */}
                                    <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                style={{
                                                    background: 'linear-gradient(135deg, #c0392b, #d4a843)',
                                                }}
                                            >
                                                {court.name.replace(/[^0-9A-Za-z]/g, '').substring(0, 2).toUpperCase() || 'CT'}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    onClick={() => openEditCourtModal(court)}
                                                    className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                >
                                                    {court.name}
                                                </p>
                                                <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                    <i className="fa-solid fa-hashtag text-[8px] opacity-70" />
                                                    <span>Urutan #{court.order}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Location with Pin */}
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <i className="fa-solid fa-location-dot text-[11px] text-[#c0392b]/70 shrink-0" />
                                            <span className="truncate">{court.location || '-'}</span>
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                                        <span className="truncate block max-w-xs">{court.description || '-'}</span>
                                    </td>

                                    {/* Token Panitera */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        {court.access_code ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 font-mono text-xs">
                                                <span className="font-bold tracking-wider text-amber-900 dark:text-amber-200">{court.access_code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCourtToken(court)}
                                                    className="text-amber-700 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-100 p-0.5 rounded cursor-pointer transition-colors"
                                                    title="Salin Token Panitera (6 Digit)"
                                                >
                                                    <i className={`fa-solid ${copiedCourtTokenId === court.id ? 'fa-check text-emerald-600' : 'fa-copy'} text-[11px]`} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRegenerateCourtToken(court)}
                                                    className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 p-0.5 rounded cursor-pointer transition-colors"
                                                    title="Buat Ulang Token Baru"
                                                >
                                                    <i className="fa-solid fa-arrows-rotate text-[10px]" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() => handleRegenerateCourtToken(court)}
                                                className="text-[11px] border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200"
                                            >
                                                <i className="fa-solid fa-key mr-1 text-[10px]" />
                                                Buat Token
                                            </Button>
                                        )}
                                    </td>

                                    {/* Order */}
                                    <td className="py-3.5 px-4 text-center font-mono text-[#8c827a] text-xs whitespace-nowrap">
                                        #{court.order}
                                    </td>

                                    {/* Status */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        {court.is_active ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Nonaktif
                                            </span>
                                        )}
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => openEditCourtModal(court)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Edit Lapangan"
                                            >
                                                <i className="fa-solid fa-pen-to-square text-xs" />
                                            </Button>
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => setDeletingCourt(court)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Hapus Lapangan"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                    <i className="fa-solid fa-vector-square text-3xl mb-2 block opacity-40" />
                                    Belum ada data lapangan / tatami yang sesuai.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableContainer>

            {/* Table Footer with Pagination Controls */}
            {filteredCourts.length > 0 && (
                <Pagination
                    currentPage={courtPage}
                    totalPages={Math.ceil(filteredCourts.length / itemsPerPage) || 1}
                    total={filteredCourts.length}
                    from={(courtPage - 1) * itemsPerPage + 1}
                    to={Math.min(courtPage * itemsPerPage, filteredCourts.length)}
                    onPageChange={(p) => setCourtPage(p)}
                    label="lapangan"
                    variant="footer"
                />
            )}

            {/* MODAL: CREATE / EDIT COURT */}
            <Modal
                isOpen={isCourtModalOpen}
                onClose={() => setIsCourtModalOpen(false)}
                title={editingCourt ? 'Edit Lapangan (Court)' : 'Tambah Lapangan Pertandingan Baru'}
                description="Tentukan nama lapangan (misal Court 1, Court 2), lokasi gelanggang, dan statusnya."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCourtModalOpen(false)}
                            disabled={courtForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitCourt}
                            loading={courtForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingCourt ? 'Simpan Perubahan' : 'Tambahkan Lapangan'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitCourt} className="space-y-4">
                    <Input
                        label="Nama Lapangan (Court / Tatami)"
                        required
                        value={courtForm.data.name}
                        onChange={(e) => courtForm.setData('name', e.target.value)}
                        error={courtForm.errors.name}
                        placeholder="e.g. Court 1, Tatami Utama"
                    />

                    <Input
                        label="Lokasi Gelanggang / Area"
                        value={courtForm.data.location}
                        onChange={(e) => courtForm.setData('location', e.target.value)}
                        error={courtForm.errors.location}
                        placeholder="e.g. Hall Utama Sisi Barat, Center Arena"
                    />

                    <Textarea
                        label="Keterangan Tambahan"
                        rows={3}
                        value={courtForm.data.description}
                        onChange={(e) => courtForm.setData('description', e.target.value)}
                        error={courtForm.errors.description}
                        placeholder="e.g. Khusus partai semifinal & final"
                    />

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Input
                            label="Urutan Lapangan"
                            type="number"
                            min="0"
                            value={courtForm.data.order}
                            onChange={(e) => courtForm.setData('order', e.target.value)}
                            error={courtForm.errors.order}
                        />
                        <div className="flex items-center pt-6">
                            <Checkbox
                                id="court-is-active"
                                label="Lapangan Siap Pakai (Aktif)"
                                checked={courtForm.data.is_active}
                                onChange={(event) => courtForm.setData('is_active', event.target.checked)}
                            />
                        </div>
                    </div>

                    {editingCourt ? (
                        editingCourt.access_code ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/50 p-3.5 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                                            <i className="fa-solid fa-key text-amber-600 dark:text-amber-400" />
                                            Token Login Panitera (6 Digit)
                                        </p>
                                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                                            Gunakan token ini untuk login cepat meja skoring melalui tab 'Token Panitera' di halaman Login.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono text-base font-extrabold tracking-widest text-amber-950 dark:text-amber-100 bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-700 shadow-2xs">
                                            {editingCourt.access_code}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyCourtToken(editingCourt)}
                                            className="bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border-amber-300"
                                        >
                                            <i className={`fa-solid ${copiedCourtTokenId === editingCourt.id ? 'fa-check text-emerald-600' : 'fa-copy'} mr-1.5`} />
                                            {copiedCourtTokenId === editingCourt.id ? 'Tersalin' : 'Salin'}
                                        </Button>
                                    </div>
                                </div>
                                <div className="border-t border-amber-200/60 dark:border-amber-900/40 pt-2 flex items-center justify-between">
                                    <Checkbox
                                        id="court-regenerate-token"
                                        label="Acak ulang token 6-digit baru saat disimpan"
                                        checked={courtForm.data.regenerate_token}
                                        onChange={(event) => courtForm.setData('regenerate_token', event.target.checked)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRegenerateCourtToken(editingCourt)}
                                        className="text-xs font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100 underline decoration-dotted cursor-pointer"
                                    >
                                        Buat Sekarang
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
                                <div>
                                    <p className="font-bold flex items-center gap-1.5">
                                        <i className="fa-solid fa-circle-exclamation text-amber-600" />
                                        Token Belum Dibuat
                                    </p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                                        Token 6 digit akan otomatis digenerate saat Anda menekan tombol Simpan di bawah, atau buat sekarang langsung.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleRegenerateCourtToken(editingCourt)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                                >
                                    <i className="fa-solid fa-key mr-1.5" />
                                    Generate Sekarang
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#faf8f5] dark:bg-slate-900/50 p-3 text-xs text-[#7a746e]">
                            <i className="fa-solid fa-circle-info mr-1.5 text-amber-600" />
                            Token 6 digit untuk login cepat Meja Panitera akan otomatis digenerate saat lapangan disimpan.
                        </div>
                    )}
                </form>
            </Modal>

            {/* MODAL: DELETE COURT CONFIRMATION */}
            <Modal
                isOpen={!!deletingCourt}
                onClose={() => setDeletingCourt(null)}
                title="Konfirmasi Hapus Lapangan"
                description={`Apakah Anda yakin ingin menghapus '${deletingCourt?.name}'?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingCourt(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteCourt}>
                            Hapus Lapangan
                        </Button>
                    </div>
                }
            />
        </div>
    );
}
