import React from 'react';
import { useForm } from '@inertiajs/react';
import { Button, Input, RadioGroup, Checkbox } from '@/Components/UI';

export default function FeesTab({
    event,
    paymentMethods = [],
}) {
    const feesForm = useForm({
        is_paid: event.is_paid ?? true,
        fee_per_contingent: event.fee_per_contingent || 0,
        fee_per_athlete: event.fee_per_athlete || 0,
        payment_method_ids: event.payment_method_ids || [],
    });

    const formatIDR = (val) => {
        const num = Number(val) || 0;
        return 'Rp ' + num.toLocaleString('id-ID');
    };

    const submitFees = (e) => {
        e.preventDefault();
        feesForm.put(`/admin/master/event/${event.id}/fees`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#ede9e1] dark:border-slate-800 shadow-xs overflow-hidden">
            <form onSubmit={submitFees}>
                <div className="p-5 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ede9e1] dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-sans text-base md:text-lg font-bold text-[#0f0d0b] dark:text-white tracking-tight">
                                Pengaturan Biaya Registrasi
                            </h3>
                        </div>
                        <p className="text-xs text-[#b5afa6] dark:text-slate-400 mt-1">
                            Tentukan apakah event gratis atau menggunakan biaya registrasi
                        </p>
                    </div>
                    <Button
                        size="sm"
                        type="submit"
                        loading={feesForm.processing}
                        className="shrink-0"
                        iconLeft={<i className="fa-solid fa-check" />}
                    >
                        Simpan Pengaturan
                    </Button>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <RadioGroup
                        label="Skema Biaya Event"
                        name="detail-event-pricing-mode"
                        variant="cards"
                        value={feesForm.data.is_paid ? 'paid' : 'free'}
                        onChange={(value) => feesForm.setData('is_paid', value === 'paid')}
                        error={feesForm.errors.is_paid}
                        options={[
                            { value: 'paid', label: 'Event Berbayar', description: 'Aktifkan biaya registrasi, kode unik, dan metode pembayaran.', icon: <i className="fa-solid fa-wallet" /> },
                            { value: 'free', label: 'Event Gratis', description: 'Peserta mendaftar tanpa tagihan dan tanpa tahap pembayaran.', icon: <i className="fa-solid fa-gift" /> },
                        ]}
                    />

                    {feesForm.data.is_paid ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Input
                                        label="Biaya Pendaftaran Kontingen (Per Dojo/Kontingen)"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        required
                                        value={feesForm.data.fee_per_contingent}
                                        onChange={(e) => feesForm.setData('fee_per_contingent', e.target.value)}
                                        error={feesForm.errors.fee_per_contingent}
                                        iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                                    />
                                    <p className="text-xs text-slate-800 dark:text-slate-300 font-bold font-mono">
                                        Pratinjau: {formatIDR(feesForm.data.fee_per_contingent)} / Kontingen
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Input
                                        label="Biaya Dasar Pendaftaran Per Atlet (Default)"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        required
                                        value={feesForm.data.fee_per_athlete}
                                        onChange={(e) => feesForm.setData('fee_per_athlete', e.target.value)}
                                        error={feesForm.errors.fee_per_athlete}
                                        iconLeft={<span className="text-xs font-bold text-gray-400">Rp</span>}
                                    />
                                    <p className="text-xs text-slate-800 dark:text-slate-300 font-bold font-mono">
                                        Pratinjau: {formatIDR(feesForm.data.fee_per_athlete)} / Atlet
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[#fbf9f5] dark:bg-slate-950/40 p-4 rounded-xl border border-[#ede9e1] dark:border-slate-800">
                                <h4 className="text-xs font-bold text-[#141210] dark:text-white flex items-center gap-1.5">
                                    <i className="fa-solid fa-circle-info text-[#c0392b]"></i>
                                    Catatan Penentuan Biaya:
                                </h4>
                                <p className="text-xs text-[#706860] dark:text-slate-400 mt-1">
                                    Jika Anda telah menetapkan harga khusus pada tab <strong>Kelompok Umur</strong>, sistem akan secara otomatis membebankan tarif sesuai kelompok umur yang didaftarkan atlet. Nilai biaya dasar di atas berfungsi sebagai tarif default apabila tidak ada kelompok umur khusus yang ditetapkan.
                                </p>
                            </div>

                            <div className="rounded-xl border border-[#ede9e1] bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                        <i className="fa-solid fa-money-check-dollar" />
                                    </span>
                                    <div>
                                        <h4 className="text-sm font-bold text-[#0f0d0b] dark:text-white">Metode Pembayaran yang Diterima</h4>
                                        <p className="mt-0.5 text-xs text-[#706860] dark:text-slate-400">Pilih kanal pembayaran yang dapat digunakan kontingen untuk biaya pendaftaran event ini.</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {paymentMethods.length ? (
                                        paymentMethods.map((paymentMethod) => {
                                            const isSelected = feesForm.data.payment_method_ids.includes(paymentMethod.id);
                                            return (
                                                <Checkbox
                                                    key={paymentMethod.id}
                                                    id={`event-payment-method-${paymentMethod.id}`}
                                                    checked={isSelected}
                                                    onChange={(event) =>
                                                        feesForm.setData(
                                                            'payment_method_ids',
                                                            event.target.checked
                                                                ? [...feesForm.data.payment_method_ids, paymentMethod.id]
                                                                : feesForm.data.payment_method_ids.filter((id) => id !== paymentMethod.id)
                                                        )
                                                    }
                                                    className={`rounded-xl border p-3 transition-colors ${
                                                        isSelected
                                                            ? 'border-[#c0392b]/40 bg-[#c0392b]/5 dark:border-rose-500/40 dark:bg-rose-950/20'
                                                            : 'border-[#ede9e1] hover:border-[#d8d0c7] dark:border-slate-800'
                                                    }`}
                                                    label={
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-semibold text-[#141210] dark:text-white">
                                                                {paymentMethod.name}
                                                            </span>
                                                            <span className="mt-0.5 block text-xs font-normal text-[#706860] dark:text-slate-400">
                                                                {paymentMethod.provider || paymentMethod.type}
                                                                {paymentMethod.account_number ? ` · ${paymentMethod.account_number}` : ''}
                                                            </span>
                                                            {!paymentMethod.is_active && (
                                                                <span className="mt-1 inline-block text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                                                    Master nonaktif — tetap dipilih di event ini
                                                                </span>
                                                            )}
                                                        </span>
                                                    }
                                                />
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-[#706860] dark:text-slate-400">
                                            Belum ada metode pembayaran aktif. Tambahkan melalui menu Master Metode Pembayaran.
                                        </p>
                                    )}
                                </div>
                                {feesForm.errors.payment_method_ids && (
                                    <p className="mt-2 text-xs font-medium text-rose-500">{feesForm.errors.payment_method_ids}</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                    <i className="fa-solid fa-circle-check" />
                                </span>
                                <div>
                                    <h4 className="text-sm font-bold">Registrasi gratis tanpa pembayaran</h4>
                                    <p className="mt-1 text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                                        Biaya kontingen dan atlet akan disimpan Rp0. Registrasi yang sudah ada ikut disesuaikan dan peserta langsung dapat melanjutkan ke tahap review.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}
