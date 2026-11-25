import { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Input, Button, Modal, Checkbox, Combobox, Pagination } from '@/Components/UI';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';

export default function MatchesTab({
    event,
    matchCategories = [],
    ageCategories = [],
    kyus = [],
    weightClasses = [],
}) {
    const itemsPerPage = 5;

    // Filter and Pagination states
    const [matchSearch, setMatchSearch] = useState('');
    const [matchTypeFilter, setMatchTypeFilter] = useState('all');
    const [matchGenderFilter, setMatchGenderFilter] = useState('all');
    const [matchAgeFilter, setMatchAgeFilter] = useState('all');
    const [matchExhibitionFilter, setMatchExhibitionFilter] = useState('all');
    const [matchPage, setMatchPage] = useState(1);

    // Modal states
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [editingMatchCategory, setEditingMatchCategory] = useState(null);
    const [deletingMatchCategory, setDeletingMatchCategory] = useState(null);

    // Options
    const ageCategoryOptions = useMemo(() => ageCategories.map((ac) => ({
        value: ac.id,
        label: ac.name,
        sublabel: `${ac.age_range} · ${ac.fee_formatted}`,
    })), [ageCategories]);

    const matchTypeOptions = [
        { value: 'embu', label: 'Embu (Kerapian Teknik)' },
        { value: 'randori', label: 'Randori (Tarung Bebas)' },
    ];

    const matchGenderOptions = [
        { value: 'male', label: 'Putra' },
        { value: 'female', label: 'Putri' },
        { value: 'mixed', label: 'Campuran' },
    ];

    const teamSizeOptions = [
        { value: 1, label: '1 Atlet per Tim' },
        { value: 2, label: '2 Atlet per Tim' },
        { value: 4, label: '4 Atlet per Tim' },
    ];

    const kyuOptions = useMemo(() => kyus.map((kyu) => ({
        value: kyu.name,
        label: kyu.name,
        sublabel: kyu.belt_color ? `Sabuk ${kyu.belt_color}` : null,
    })), [kyus]);

    const weightClassOptions = useMemo(() => weightClasses.map((wc) => ({
        value: wc.id,
        label: wc.name,
        sublabel: `${wc.gender === 'male' ? 'Putra' : wc.gender === 'female' ? 'Putri' : 'Campuran'} · ${wc.min_weight ?? '—'}–${wc.max_weight ?? '∞'} kg`,
    })), [weightClasses]);

    // Form hook
    const matchForm = useForm({
        name: '',
        age_category_id: '',
        weight_class_id: '',
        type: 'embu',
        gender: 'male',
        capacity: 16,
        max_athletes_per_team: 1,
        min_weight: '',
        max_weight: '',
        min_kyu: '',
        max_kyu: '',
        order: 0,
        is_active: true,
        is_exhibition: false,
    });

    const applyWeightClass = (weightClassId) => {
        const weightClass = weightClasses.find((item) => String(item.id) === String(weightClassId));
        matchForm.setData({
            ...matchForm.data,
            weight_class_id: weightClassId,
            min_weight: weightClass?.min_weight ?? '',
            max_weight: weightClass?.max_weight ?? '',
        });
    };

    // Filtering & Pagination
    const filteredMatches = useMemo(() => {
        return matchCategories.filter((mc) => {
            const matchesQuery =
                !matchSearch ||
                mc.name?.toLowerCase().includes(matchSearch.toLowerCase()) ||
                mc.age_category_name?.toLowerCase().includes(matchSearch.toLowerCase());

            const matchesType = matchTypeFilter === 'all' || mc.type === matchTypeFilter;
            const matchesGender = matchGenderFilter === 'all' || mc.gender === matchGenderFilter;
            const matchesAge = matchAgeFilter === 'all' || String(mc.age_category_id) === String(matchAgeFilter);
            const matchesExhibition =
                matchExhibitionFilter === 'all' ||
                (matchExhibitionFilter === 'exhibition' ? !!mc.is_exhibition : !mc.is_exhibition);

            return matchesQuery && matchesType && matchesGender && matchesAge && matchesExhibition;
        });
    }, [matchCategories, matchSearch, matchTypeFilter, matchGenderFilter, matchAgeFilter, matchExhibitionFilter]);

    const paginatedMatches = useMemo(() => {
        return filteredMatches.slice(
            (matchPage - 1) * itemsPerPage,
            matchPage * itemsPerPage
        );
    }, [filteredMatches, matchPage]);

    // Handlers
    const openCreateMatchModal = () => {
        setEditingMatchCategory(null);
        matchForm.reset();
        matchForm.clearErrors();
        matchForm.setData({
            name: '',
            age_category_id: ageCategories.length > 0 ? ageCategories[0].id : '',
            weight_class_id: '',
            type: 'embu',
            gender: 'male',
            capacity: 16,
            max_athletes_per_team: 1,
            min_weight: '',
            max_weight: '',
            min_kyu: '',
            max_kyu: '',
            order: (matchCategories.length || 0) + 1,
            is_active: true,
            is_exhibition: false,
        });
        setIsMatchModalOpen(true);
    };

    const openEditMatchModal = (mc) => {
        setEditingMatchCategory(mc);
        matchForm.clearErrors();
        matchForm.setData({
            name: mc.name || '',
            age_category_id: mc.age_category_id || '',
            weight_class_id: mc.weight_class_id || '',
            type: mc.type || 'embu',
            gender: mc.gender || 'male',
            capacity: mc.capacity || 16,
            max_athletes_per_team: mc.max_athletes_per_team || 1,
            min_weight: mc.min_weight ?? '',
            max_weight: mc.max_weight ?? '',
            min_kyu: mc.min_kyu || '',
            max_kyu: mc.max_kyu || '',
            order: mc.order ?? 0,
            is_active: mc.is_active ?? true,
            is_exhibition: mc.is_exhibition ?? false,
        });
        setIsMatchModalOpen(true);
    };

    const toggleMatchExhibition = (mc) => {
        router.patch(`/admin/master/event/${event.id}/match-category/${mc.id}/toggle-exhibition`, {}, {
            preserveScroll: true,
        });
    };

    const submitMatchCategory = (e) => {
        e.preventDefault();
        if (editingMatchCategory) {
            matchForm.put(`/admin/master/event/${event.id}/match-category/${editingMatchCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsMatchModalOpen(false);
                    setEditingMatchCategory(null);
                },
            });
        } else {
            matchForm.post(`/admin/master/event/${event.id}/match-category`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsMatchModalOpen(false);
                    matchForm.reset();
                },
            });
        }
    };

    const confirmDeleteMatchCategory = () => {
        if (!deletingMatchCategory) return;
        router.delete(`/admin/master/event/${event.id}/match-category/${deletingMatchCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => setDeletingMatchCategory(null),
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Table Header / Toolbar */}
            <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                            Nomer Pertandingan
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c0392b]/10 text-[#c0392b] dark:bg-[#c0392b]/20 dark:text-[#f0c060] border border-[#c0392b]/20">
                            {matchCategories.length} Total
                        </span>
                    </div>
                    <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                        Konfigurasi nomor tanding dengan relasi kelompok umur, kuota peserta, gender, dan tipe pertandingan
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={openCreateMatchModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#c0392b] to-[#96281b] hover:from-[#a93226] hover:to-[#7b1f14] shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
                        title="Tambah Nomer Pertandingan"
                    >
                        <i className="fa-solid fa-plus text-xs" />
                        <span>Tambah Nomer Pertandingan</span>
                    </Button>
                </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="p-4 px-5 md:px-6 bg-[#fcfbf9] border-y border-[#ede9e1] dark:bg-slate-800/40 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <Input
                    type="search"
                    size="sm"
                    value={matchSearch}
                    onChange={(event) => {
                        setMatchSearch(event.target.value);
                        setMatchPage(1);
                    }}
                    placeholder="Cari nomor pertandingan..."
                    iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                    clearable
                    onClear={() => { setMatchSearch(''); setMatchPage(1); }}
                />
                <div>
                    <Combobox
                        size="sm"
                        value={matchAgeFilter}
                        onChange={(val) => {
                            setMatchAgeFilter(val || 'all');
                            setMatchPage(1);
                        }}
                        options={[
                            { value: 'all', label: 'Semua Kelompok Umur' },
                            ...ageCategoryOptions,
                        ]}
                        clearable={false}
                        searchPlaceholder="Filter kelompok umur..."
                    />
                </div>
                <div>
                    <Combobox
                        size="sm"
                        value={matchTypeFilter}
                        onChange={(val) => {
                            setMatchTypeFilter(val || 'all');
                            setMatchPage(1);
                        }}
                        options={[
                            { value: 'all', label: 'Semua Tipe (Embu & Randori)' },
                            { value: 'embu', label: 'Hanya Embu' },
                            { value: 'randori', label: 'Hanya Randori' },
                        ]}
                        clearable={false}
                        searchPlaceholder="Filter tipe..."
                    />
                </div>
                <div>
                    <Combobox
                        size="sm"
                        value={matchGenderFilter}
                        onChange={(val) => {
                            setMatchGenderFilter(val || 'all');
                            setMatchPage(1);
                        }}
                        options={[
                            { value: 'all', label: 'Semua Gender' },
                            { value: 'male', label: 'Putra' },
                            { value: 'female', label: 'Putri' },
                            { value: 'mixed', label: 'Campuran' },
                        ]}
                        clearable={false}
                        searchPlaceholder="Filter gender..."
                    />
                </div>
                <div>
                    <Combobox
                        size="sm"
                        value={matchExhibitionFilter}
                        onChange={(val) => {
                            setMatchExhibitionFilter(val || 'all');
                            setMatchPage(1);
                        }}
                        options={[
                            { value: 'all', label: 'Semua Klasifikasi' },
                            { value: 'official', label: 'Dipertandingkan (Resmi)' },
                            { value: 'exhibition', label: 'Ekshibisi' },
                        ]}
                        clearable={false}
                        searchPlaceholder="Filter status klasifikasi..."
                    />
                </div>
            </div>

            {/* Table Content */}
            <TableContainer ariaLabel="Tabel nomor pertandingan">
                <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-[#f7f4ef] dark:bg-slate-800/70 border-b border-[#ede9e1] dark:border-slate-800 text-[10px] uppercase font-semibold text-[#8c827a] dark:text-slate-400 tracking-wider whitespace-nowrap">
                            <th scope="col" className="py-3 px-4 text-center w-14">#</th>
                            <th scope="col" className="py-3 px-4 min-w-[240px]">Nomer Pertandingan</th>
                            <th scope="col" className="py-3 px-4 min-w-[140px]">Kelompok Umur</th>
                            <th scope="col" className="py-3 px-4 min-w-[110px]">Tipe</th>
                            <th scope="col" className="py-3 px-4 min-w-[110px]">Gender</th>
                            <th scope="col" className="py-3 px-4 text-center w-28">Kuota Bagan</th>
                            <th scope="col" className="py-3 px-4 text-center min-w-[120px]">Maks. Atlet / Tim</th>
                            <th scope="col" className="py-3 px-4 min-w-[180px]">Ket. Khusus / Berat</th>
                            <th scope="col" className="py-3 px-4 text-center min-w-[150px]">Klasifikasi / Ekshibisi</th>
                            <th scope="col" className="py-3 px-4 text-center w-28">Status</th>
                            <th scope="col" className="py-3 px-4 text-center w-24">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ede9e1]/80 dark:divide-slate-800/80 text-xs">
                        {paginatedMatches.length > 0 ? (
                            paginatedMatches.map((mc, idx) => (
                                <tr
                                    key={mc.id}
                                    className="hover:bg-[#fcfbf9] dark:hover:bg-slate-800/40 transition-colors group"
                                >
                                    {/* Index */}
                                    <td className="py-3.5 px-4 text-center text-[#888] dark:text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                        {(matchPage - 1) * itemsPerPage + idx + 1}
                                    </td>

                                    {/* Match Name with Avatar */}
                                    <td className="py-3.5 px-4 font-medium text-[#0f0d0b] dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-xl text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                                                style={{
                                                    background: mc.type === 'embu'
                                                        ? 'linear-gradient(135deg, #4f46e5, #d4a843)'
                                                        : 'linear-gradient(135deg, #c0392b, #b91c1c)',
                                                }}
                                            >
                                                {mc.type === 'embu' ? 'EM' : 'RD'}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    onClick={() => openEditMatchModal(mc)}
                                                    className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-[#c0392b] dark:group-hover:text-[#f0c060] transition-colors cursor-pointer truncate"
                                                >
                                                    {mc.name}
                                                </p>
                                                <p className="text-[10px] text-[#8c827a] dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                    <i className="fa-solid fa-hashtag text-[8px] opacity-70" />
                                                    <span>Urutan #{mc.order}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Kelompok Umur */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f7f4ef] text-[#0f0d0b] text-xs font-semibold border border-[#ede9e1]">
                                            {mc.age_category_name}
                                        </span>
                                    </td>

                                    {/* Tipe */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        {mc.type === 'embu' ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                                <i className="fa-solid fa-yin-yang text-[9px]" />
                                                Embu
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                                                <i className="fa-solid fa-hand-fist text-[9px]" />
                                                Randori
                                            </span>
                                        )}
                                    </td>

                                    {/* Gender */}
                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                        {mc.gender === 'male' && (
                                            <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                                <i className="fa-solid fa-mars" /> Putra
                                            </span>
                                        )}
                                        {mc.gender === 'female' && (
                                            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                                                <i className="fa-solid fa-venus" /> Putri
                                            </span>
                                        )}
                                        {mc.gender === 'mixed' && (
                                            <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                                                <i className="fa-solid fa-venus-mars" /> Campuran
                                            </span>
                                        )}
                                    </td>

                                    {/* Kuota Bagan */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-[#0f0d0b]">
                                        <span className="px-2 py-0.5 rounded-lg bg-[#f7f4ef] border border-[#ede9e1] text-xs">
                                            {mc.capacity} Peserta
                                        </span>
                                    </td>

                                    {/* Maksimum Atlet per Tim */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-[#0f0d0b]">
                                        <span className="px-2 py-0.5 rounded-lg bg-[#f7f4ef] border border-[#ede9e1] text-xs">
                                            {mc.max_athletes_per_team} Atlet
                                        </span>
                                    </td>

                                    {/* Keterangan Khusus / Berat / Kyu */}
                                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {mc.type === 'randori' ? (
                                            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                                Berat: {mc.weight_range}
                                            </span>
                                        ) : (
                                            <span>
                                                {mc.min_kyu || mc.max_kyu ? `${mc.min_kyu || ''} - ${mc.max_kyu || ''}` : '-'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Klasifikasi / Ekshibisi */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => toggleMatchExhibition(mc)}
                                            title={mc.is_exhibition ? 'Nomor Ekshibisi (Klik untuk ubah jadi Dipertandingkan Resmi)' : 'Nomor Dipertandingkan Resmi (Klik untuk ubah jadi Ekshibisi)'}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer hover:scale-105 shadow-xs ${
                                                mc.is_exhibition
                                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                                                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700'
                                            }`}
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full ${
                                                    mc.is_exhibition ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                            />
                                            <span>{mc.is_exhibition ? 'Ekshibisi' : 'Dipertandingkan'}</span>
                                            <i className="fa-solid fa-repeat text-[9px] opacity-70 ml-0.5" aria-hidden="true" />
                                        </button>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        {mc.is_active ? (
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

                                    {/* Actions */}
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => openEditMatchModal(mc)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#c0392b] hover:text-white hover:border-[#c0392b] dark:hover:bg-[#c0392b] transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Edit Nomer Pertandingan"
                                            >
                                                <i className="fa-solid fa-pen-to-square text-xs" />
                                            </Button>
                                            <Button
                                                variant="unstyled"
                                                size="none"
                                                type="button"
                                                onClick={() => setDeletingMatchCategory(mc)}
                                                className="w-8 h-8 rounded-xl border border-[#ede9e1] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-all inline-flex items-center justify-center cursor-pointer shadow-xs hover:scale-105"
                                                title="Hapus Nomer Pertandingan"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={11} className="py-12 text-center text-[#b5afa6] italic text-xs">
                                    <i className="fa-solid fa-award text-3xl mb-2 block opacity-40" />
                                    Tidak ada nomer pertandingan yang sesuai dengan filter pencarian.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </TableContainer>

            {/* Table Footer with Pagination */}
            {filteredMatches.length > 0 && (
                <Pagination
                    currentPage={matchPage}
                    totalPages={Math.ceil(filteredMatches.length / itemsPerPage) || 1}
                    total={filteredMatches.length}
                    from={(matchPage - 1) * itemsPerPage + 1}
                    to={Math.min(matchPage * itemsPerPage, filteredMatches.length)}
                    onPageChange={(p) => setMatchPage(p)}
                    label="nomer pertandingan"
                    variant="footer"
                />
            )}

            {/* MODAL: CREATE / EDIT MATCH CATEGORY */}
            <Modal
                isOpen={isMatchModalOpen}
                onClose={() => setIsMatchModalOpen(false)}
                size="xl"
                title={editingMatchCategory ? 'Edit Nomer Pertandingan' : 'Tambah Nomer Pertandingan Baru'}
                description="Tautkan nomor tanding dengan kelompok umur, jenis (Embu/Randori), gender, dan kuota."
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMatchModalOpen(false)}
                            disabled={matchForm.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={submitMatchCategory}
                            loading={matchForm.processing}
                            className="bg-[#141210] hover:bg-black text-amber-400 font-semibold"
                        >
                            {editingMatchCategory ? 'Simpan Perubahan' : 'Tambahkan Nomer Tanding'}
                        </Button>
                    </div>
                }
            >
                <form onSubmit={submitMatchCategory} className="space-y-4">
                    <Input
                        label="Nama Nomer Pertandingan"
                        required
                        value={matchForm.data.name}
                        onChange={(e) => matchForm.setData('name', e.target.value)}
                        error={matchForm.errors.name}
                        placeholder="e.g. Embu Berpasangan Kyu 7-5 Putra, Randori Kelas 50kg"
                    />

                    <Combobox
                        label="Kelompok Umur (Relasi)"
                        value={matchForm.data.age_category_id}
                        onChange={(val) => matchForm.setData('age_category_id', val)}
                        options={ageCategoryOptions}
                        searchPlaceholder="Pilih kelompok umur..."
                        error={matchForm.errors.age_category_id}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <Combobox
                            label="Tipe Pertandingan"
                            required
                            value={matchForm.data.type}
                            onChange={(val) => matchForm.setData('type', val)}
                            options={matchTypeOptions}
                            clearable={false}
                            error={matchForm.errors.type}
                        />

                        <Combobox
                            label="Kategori Gender"
                            required
                            value={matchForm.data.gender}
                            onChange={(val) => matchForm.setData('gender', val)}
                            options={matchGenderOptions}
                            clearable={false}
                            error={matchForm.errors.gender}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            label="Kapasitas / Kuota Peserta (Bagan)"
                            type="number"
                            min="2"
                            max="256"
                            required
                            value={matchForm.data.capacity}
                            onChange={(e) => matchForm.setData('capacity', e.target.value)}
                            error={matchForm.errors.capacity}
                            placeholder="16 atau 32"
                        />
                        <Combobox
                            label="Maks. Atlet per Tim"
                            required
                            value={matchForm.data.max_athletes_per_team}
                            onChange={(val) => matchForm.setData('max_athletes_per_team', val)}
                            options={teamSizeOptions}
                            clearable={false}
                            error={matchForm.errors.max_athletes_per_team}
                            hint="Pilih 1 untuk individu, 2 atau 4 untuk nomor beregu."
                        />
                        <Input
                            label="Urutan"
                            type="number"
                            min="0"
                            value={matchForm.data.order}
                            onChange={(e) => matchForm.setData('order', e.target.value)}
                            error={matchForm.errors.order}
                        />
                    </div>

                    {/* Conditional Fields depending on Type (Embu vs Randori) */}
                    {matchForm.data.type === 'randori' ? (
                        <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-3">
                            <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-weight-scale text-red-600" />
                                Batas Berat Badan Randori (kg)
                            </p>
                            <Combobox
                                label="Ambil dari Master Berat Badan"
                                value={matchForm.data.weight_class_id}
                                onChange={applyWeightClass}
                                options={weightClassOptions}
                                placeholder="Pilih kelas berat (opsional)"
                                searchPlaceholder="Cari kelas berat..."
                                hint="Memilih kelas akan mengisi batas berat otomatis; masih dapat disesuaikan untuk event ini."
                                error={matchForm.errors.weight_class_id}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Berat Minimal (kg)"
                                    type="number"
                                    step="0.1"
                                    value={matchForm.data.min_weight}
                                    onChange={(e) => matchForm.setData('min_weight', e.target.value)}
                                    error={matchForm.errors.min_weight}
                                    placeholder="e.g. 45"
                                />
                                <Input
                                    label="Berat Maksimal (kg)"
                                    type="number"
                                    step="0.1"
                                    value={matchForm.data.max_weight}
                                    onChange={(e) => matchForm.setData('max_weight', e.target.value)}
                                    error={matchForm.errors.max_weight}
                                    placeholder="e.g. 50"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
                            <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-medal text-indigo-600" />
                                Tingkatan Sabuk / Kyu Kenshi
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <Combobox
                                    label="Kyu / Dan Minimal"
                                    options={kyuOptions}
                                    value={matchForm.data.min_kyu}
                                    onChange={(value) => matchForm.setData('min_kyu', value)}
                                    error={matchForm.errors.min_kyu}
                                    placeholder="Pilih Kyu minimum"
                                    searchPlaceholder="Cari tingkatan..."
                                />
                                <Combobox
                                    label="Kyu / Dan Maksimal"
                                    options={kyuOptions}
                                    value={matchForm.data.max_kyu}
                                    onChange={(value) => matchForm.setData('max_kyu', value)}
                                    error={matchForm.errors.max_kyu}
                                    placeholder="Pilih Kyu maksimum"
                                    searchPlaceholder="Cari tingkatan..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Status Klasifikasi Nomor (Dipertandingkan Resmi vs Ekshibisi) */}
                    <div className="p-4 rounded-xl border border-[#ede9e1] bg-[#fbfaf8] space-y-3 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[#0f0d0b] dark:text-white flex items-center gap-1.5">
                                <i className="fa-solid fa-trophy text-amber-500" />
                                Status Klasifikasi Pertandingan
                            </label>
                            <span className="text-[10px] font-semibold text-[#8c827a]">
                                {matchForm.data.is_exhibition ? '🟡 Terpisah dari Juara Umum' : '🟢 Dihitung ke Juara Umum'}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => matchForm.setData('is_exhibition', false)}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                    !matchForm.data.is_exhibition
                                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                                        : 'border-[#ede9e1] bg-white dark:bg-slate-900 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    !matchForm.data.is_exhibition ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                                }`}>
                                    {!matchForm.data.is_exhibition && <i className="fa-solid fa-check text-[9px]" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">Dipertandingkan (Resmi)</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-4">
                                        Nomor resmi. Perolehan medali dihitung ke klasemen kontingen & Juara Umum.
                                    </p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => matchForm.setData('is_exhibition', true)}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                                    matchForm.data.is_exhibition
                                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                                        : 'border-[#ede9e1] bg-white dark:bg-slate-900 text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    matchForm.data.is_exhibition ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                                }`}>
                                    {matchForm.data.is_exhibition && <i className="fa-solid fa-check text-[9px]" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">Ekshibisi</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-4">
                                        Nomor ekshibisi. Medali hanya untuk kenshi, dipisahkan dari klasemen Juara Umum.
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center pt-2">
                        <Checkbox
                            id="match-category-is-active"
                            label="Nomor Pertandingan Dibuka untuk Pendaftaran (Aktif)"
                            checked={matchForm.data.is_active}
                            onChange={(event) => matchForm.setData('is_active', event.target.checked)}
                        />
                    </div>
                </form>
            </Modal>

            {/* MODAL: DELETE MATCH CATEGORY CONFIRMATION */}
            <Modal
                isOpen={!!deletingMatchCategory}
                onClose={() => setDeletingMatchCategory(null)}
                title="Konfirmasi Hapus Nomer Pertandingan"
                description={`Apakah Anda yakin ingin menghapus '${deletingMatchCategory?.name}'?`}
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setDeletingMatchCategory(null)}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteMatchCategory}>
                            Hapus Nomor
                        </Button>
                    </div>
                }
            />
        </div>
    );
}
