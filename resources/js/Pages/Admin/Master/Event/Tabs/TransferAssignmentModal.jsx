import React from 'react';
import { Button, Input, Combobox, Modal } from '@/Components/UI';

export default function TransferAssignmentModal({
    isOpen,
    onClose,
    transferTarget,
    transferForm,
    submitTransfer,
    arbitratorRoleOptions = [],
    refereeRoleOptions = [],
    fieldCoordinatorAreaOptions = [],
}) {
    if (!transferTarget) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Alihkan Penugasan Personil Event"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button onClick={submitTransfer} loading={transferForm.processing} className="bg-amber-600 hover:bg-amber-700 text-white">
                        <i className="fa-solid fa-right-left mr-2" />
                        Lanjutkan Pengalihan
                    </Button>
                </>
            }
        >
            <form onSubmit={submitTransfer} className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                    <div className="flex items-center gap-2 font-semibold">
                        <i className="fa-solid fa-circle-info text-blue-600 dark:text-blue-400" />
                        <span>Personil yang dialihkan:</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                        <p className="font-bold text-sm text-[#0f0d0b] dark:text-white">
                            {transferTarget.source.name}
                        </p>
                        {transferTarget.source.gender && (
                            <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                    transferTarget.source.gender === 'female'
                                        ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                }`}
                            >
                                {transferTarget.source.gender === 'female' ? '♀ Perempuan' : '♂ Laki-laki'}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">
                        Saat ini bertugas di:{' '}
                        <strong className="text-zinc-800 dark:text-zinc-200">
                            {transferTarget.sourceCategory === 'arbitrator'
                                ? `Arbitrase (${arbitratorRoleOptions.find((o) => o.value === transferTarget.source.role)?.label || transferTarget.source.role || 'Arbitrase'})`
                                : transferTarget.sourceCategory === 'referee'
                                ? `Wasit & Juri (${refereeRoleOptions.find((o) => o.value === transferTarget.source.role)?.label || transferTarget.source.role || 'Wasit'})`
                                : `Koordinator Lapangan (${fieldCoordinatorAreaOptions.find((o) => o.value === transferTarget.source.assignment_area)?.label || transferTarget.source.assignment_area || 'Koordinator'})`}
                        </strong>
                    </p>
                </div>

                <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Pilih Kategori Penugasan Baru:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'arbitrator', label: 'Arbitrase', icon: 'fa-gavel' },
                            { id: 'referee', label: 'Wasit & Juri', icon: 'fa-scale-balanced' },
                            { id: 'coordinator', label: 'Koordinator', icon: 'fa-people-group' },
                        ].map((cat) => {
                            const isCurrent = transferTarget.sourceCategory === cat.id;
                            const isSelected = transferForm.data.target_category === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    disabled={isCurrent}
                                    onClick={() => {
                                        let newRole = 'Arbitrase Pertandingan';
                                        if (cat.id === 'referee') newRole = 'referee';
                                        if (cat.id === 'coordinator') newRole = 'koordinator_pertandingan';
                                        transferForm.setData({
                                            ...transferForm.data,
                                            target_category: cat.id,
                                            target_role: newRole,
                                        });
                                    }}
                                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                                        isCurrent
                                            ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-600'
                                            : isSelected
                                            ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-500'
                                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                                    }`}
                                >
                                    <i className={`fa-solid ${cat.icon} text-sm ${isSelected ? 'text-amber-600 dark:text-amber-400' : ''}`} />
                                    <span>{cat.label}</span>
                                    {isCurrent && <span className="text-[9px] font-normal text-zinc-400">(Saat Ini)</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {transferForm.data.target_category === 'arbitrator' && (
                    <Combobox
                        label="Peran Arbitrase Baru"
                        value={transferForm.data.target_role}
                        onChange={(val) => transferForm.setData('target_role', val)}
                        options={arbitratorRoleOptions}
                        clearable={false}
                        error={transferForm.errors.target_role}
                    />
                )}
                {transferForm.data.target_category === 'referee' && (
                    <Combobox
                        label="Peran Wasit Baru"
                        value={transferForm.data.target_role}
                        onChange={(val) => transferForm.setData('target_role', val)}
                        options={refereeRoleOptions}
                        clearable={false}
                        error={transferForm.errors.target_role}
                    />
                )}
                {transferForm.data.target_category === 'coordinator' && (
                    <Combobox
                        label="Area Penugasan Koordinator"
                        value={transferForm.data.target_role}
                        onChange={(val) => transferForm.setData('target_role', val)}
                        options={fieldCoordinatorAreaOptions}
                        clearable={false}
                        error={transferForm.errors.target_role}
                    />
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    <Combobox
                        label="Jenis Kelamin"
                        value={transferForm.data.gender}
                        onChange={(val) => transferForm.setData('gender', val)}
                        options={[
                            { value: 'male', label: 'Laki-laki' },
                            { value: 'female', label: 'Perempuan' },
                        ]}
                        clearable={false}
                        error={transferForm.errors.gender}
                    />
                    <Input
                        label="Tingkatan Dan"
                        value={transferForm.data.dan_grade}
                        onChange={(e) => transferForm.setData('dan_grade', e.target.value)}
                        error={transferForm.errors.dan_grade}
                        placeholder="Contoh: V DAN"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                        label="Tingkat Sertifikasi"
                        value={transferForm.data.certification_level}
                        onChange={(e) => transferForm.setData('certification_level', e.target.value)}
                        error={transferForm.errors.certification_level}
                        placeholder="Contoh: Wasit Nasional"
                    />
                    <Input
                        label="Nomor Lisensi / ID / NIK"
                        value={transferForm.data.license_number}
                        onChange={(e) => transferForm.setData('license_number', e.target.value)}
                        error={transferForm.errors.license_number}
                        placeholder="Contoh: 69.1.13.03.99.001"
                    />
                </div>

                <div className="rounded-xl border border-[#ede9e1] bg-[#fbfaf8] p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={transferForm.data.detach_source}
                            onChange={(e) => transferForm.setData('detach_source', e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs">
                            <span className="font-semibold text-[#0f0d0b] dark:text-white">
                                Lepaskan dari penugasan sebelumnya di event ini
                            </span>
                            <p className="mt-0.5 text-[#706860] dark:text-slate-400">
                                Jika dicentang, personil akan dipindahkan secara penuh (dihapus dari penugasan sebelumnya dan penugasan court sebelumnya akan dibersihkan). Role akun login juga otomatis disesuaikan.
                            </p>
                        </div>
                    </label>
                </div>
            </form>
        </Modal>
    );
}
