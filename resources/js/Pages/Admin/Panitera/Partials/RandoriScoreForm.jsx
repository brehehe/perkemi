import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Input from '@/Components/UI/Forms/Input';
import SignaturePad from '@/Components/UI/Forms/SignaturePad';
import Textarea from '@/Components/UI/Forms/Textarea';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

const scoreKeys = [
    ['mujoken', 'Mujoken Kachi', 15],
    ['ippon', 'Ippon', 10],
    ['waza_ari', 'Waza-ari', 5],
    ['yusei', 'Yusei Kachi', 5],
    ['batsu_5', 'Batsu -5', -5],
    ['batsu_10', 'Batsu -10', -10],
];

const signatureLabels = [
    ['arbitrase', 'Arbitrase'],
    ['field_coordinator', 'Koordinator Lapangan'],
    ['referee', 'Wasit Lapangan'],
    ['clerk', 'Panitera'],
    ['red_manager', 'Manajer Kontingen Merah'],
    ['white_manager', 'Manajer Kontingen Putih'],
];

const emptyBreakdown = () => Object.fromEntries(scoreKeys.map(([key]) => [key, 0]));
const emptySignatures = () => Object.fromEntries(signatureLabels.map(([key]) => [key, '']));
const normalizeSignatures = (signatures = {}) => Object.fromEntries(signatureLabels.map(([key]) => [key, typeof signatures?.[key] === 'string' ? signatures[key] : '']));
const calculateTotal = (breakdown) => scoreKeys.reduce((total, [key, , weight]) => total + (Number(breakdown[key]) || 0) * weight, 0);

function ScoreFields({ corner, label, values, errors, onChange, disabled = false }) {
    return (
        <fieldset className={`min-w-0 rounded-xl border p-3 sm:p-4 ${corner === 'aka' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50'}`}>
            <legend className={`px-2 text-sm font-black uppercase tracking-wide ${corner === 'aka' ? 'text-rose-700' : 'text-slate-700'}`}>{corner === 'aka' ? 'AKA · Merah' : 'SHIRO · Putih'}</legend>
            <p className="mb-3 text-sm font-bold text-[#17120f]">{label}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {scoreKeys.map(([key, name, weight]) => (
                    <Input key={key} label={`${name} (${weight > 0 ? '+' : ''}${weight})`} type="number" min="0" max="20" required value={values[key]} error={errors[`${corner}.${key}`]} disabled={disabled} onChange={(event) => onChange(key, event.target.value)} />
                ))}
            </div>
            <p className="mt-4 border-t border-black/5 pt-3 text-right text-xl font-black">Total: {calculateTotal(values)}</p>
        </fieldset>
    );
}

export default function RandoriScoreForm({ activeEvent, match }) {
    const existingScore = match.result || match.score;
    const isLocked = Boolean(existingScore?.is_locked);
    const persistedSignatures = normalizeSignatures(existingScore?.signatures);
    const hasCompletePersistedSignatures = signatureLabels.every(([key]) => Boolean(persistedSignatures[key]));
    const form = useForm({
        event_id: activeEvent.id,
        aka: { ...emptyBreakdown(), ...(existingScore?.aka_breakdown || {}) },
        shiro: { ...emptyBreakdown(), ...(existingScore?.shiro_breakdown || {}) },
        signatures: persistedSignatures,
        notes: existingScore?.notes || '',
        return_to_match: true,
    });
    const lockForm = useForm({ event_id: activeEvent.id });
    const [requiresResignature, setRequiresResignature] = useState(Boolean(existingScore && !hasCompletePersistedSignatures));
    const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
    const [lockConfirmationOpen, setLockConfirmationOpen] = useState(false);
    const akaTotal = calculateTotal(form.data.aka);
    const shiroTotal = calculateTotal(form.data.shiro);
    const signedCount = signatureLabels.filter(([key]) => Boolean(form.data.signatures[key])).length;
    const signaturesComplete = signedCount === signatureLabels.length;
    const winnerLabel = akaTotal > shiroTotal
        ? `AKA · ${match.aka_label}`
        : `SHIRO · ${match.shiro_label}`;
    const confirmationError = form.errors.score
        || form.errors.result
        || form.errors.signatures
        || signatureLabels.map(([key]) => form.errors[`signatures.${key}`]).find(Boolean)
        || '';

    const changeScore = (corner, key, value) => {
        if (isLocked) return;
        if (String(form.data[corner][key]) === String(value)) return;

        form.setData({
            ...form.data,
            [corner]: { ...form.data[corner], [key]: value },
            signatures: emptySignatures(),
        });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const changeNotes = (value) => {
        if (isLocked) return;
        if (form.data.notes === value) return;

        form.setData({
            ...form.data,
            notes: value,
            signatures: emptySignatures(),
        });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const requestSaveConfirmation = (event) => {
        event.preventDefault();

        if (isLocked || akaTotal === shiroTotal || !signaturesComplete || form.processing) return;

        setSaveConfirmationOpen(true);
    };

    const submitScore = () => {
        if (isLocked) return;

        form.post(`/admin/panitera/scoring/randori-result/${match.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                form.setDefaults();
                setSaveConfirmationOpen(false);
                setRequiresResignature(false);
            },
        });
    };

    const lockScore = () => {
        lockForm.post(`/admin/panitera/scoring/randori-result/${match.id}/lock`, {
            preserveScroll: true,
            onSuccess: () => setLockConfirmationOpen(false),
        });
    };

    return (
        <section className="scroll-mt-4 overflow-hidden rounded-2xl border border-[#d8c9ae] bg-white shadow-lg" aria-labelledby="randori-score-title">
            <div className="border-b border-[#e8dfd2] bg-[linear-gradient(135deg,#17120f,#33261f)] p-4 text-white sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e4b94f]">Input langsung oleh Panitera · Tanpa panel Wasit</p>
                        <h2 id="randori-score-title" className="mt-2 text-xl font-black sm:text-2xl">Input Hasil Randori · Partai #{match.sequence}</h2>
                        <p className="mt-1 text-xs leading-5 text-white/65">{match.round_label} · {match.court || 'Court belum dipilih'} · {match.scheduled_at || 'Belum dijadwalkan'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="red">Randori</Badge>
                        {isLocked ? <Badge variant="gray">Nilai terkunci</Badge> : existingScore && <Badge variant="green">Perbarui hasil</Badge>}
                    </div>
                </div>
            </div>

            <form id="randori-score-form" onSubmit={requestSaveConfirmation} className="space-y-5 p-4 sm:p-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                    <i className={`fa-solid ${isLocked ? 'fa-lock' : 'fa-circle-info'} mr-2 text-blue-600`} aria-hidden="true" />
                    {isLocked
                        ? `Nilai dikunci ${existingScore.locked_at || ''} dan hanya dapat dilihat. Perubahan juga ditolak oleh server.`
                        : 'Simpan nilai terlebih dahulu agar masih dapat diperiksa. Setelah dipastikan benar, gunakan tombol Kunci Nilai untuk menutup perubahan permanen.'}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <ScoreFields corner="aka" label={match.aka_label} values={form.data.aka} errors={form.errors} disabled={isLocked} onChange={(key, value) => changeScore('aka', key, value)} />
                    <ScoreFields corner="shiro" label={match.shiro_label} values={form.data.shiro} errors={form.errors} disabled={isLocked} onChange={(key, value) => changeScore('shiro', key, value)} />
                </div>

                {akaTotal === shiroTotal && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Skor masih sama. Tambahkan Yusei Kachi atau Mujoken Kachi kepada pemenang sebelum menyimpan.</div>}
                {form.errors.score && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{form.errors.score}</div>}

                <fieldset className="rounded-2xl border border-[#e5ded4] bg-[#fbfaf8] p-4 sm:p-5">
                    <legend className="px-2 text-sm font-black text-[#17120f]">Pengesahan 6 Pihak</legend>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-2xl text-xs leading-5 text-[#746b63]">Masing-masing pihak membubuhkan tanda tangan digital sendiri sebelum hasil disahkan.</p>
                        <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase ${signaturesComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{signedCount}/6 ditandatangani</span>
                    </div>
                    {existingScore && !requiresResignature && signaturesComplete && <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">Enam tanda tangan pengesahan sudah tersimpan. Tanda tangan hanya akan dikosongkan jika skor atau catatan diubah.</p>}
                    {requiresResignature && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Skor atau catatan berubah. Enam pihak perlu menandatangani ulang sebelum hasil dapat disimpan.</p>}
                    {form.errors.signatures && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{form.errors.signatures}</p>}
                    <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {signatureLabels.map(([key, label], index) => (
                            <div key={key} className="rounded-xl border border-[#e5ded4] bg-white p-3 shadow-xs">
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff4cf] text-xs font-black text-[#936817]">{index + 1}</span>
                                    <div>
                                        <p className="text-sm font-black text-[#17120f]">{label}</p>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8b8178]">Tanda tangan pihak {index + 1}</p>
                                    </div>
                                </div>
                                <SignaturePad
                                    value={form.data.signatures[key]}
                                    onChange={(value) => form.setData('signatures', { ...form.data.signatures, [key]: value })}
                                    disabled={form.processing || lockForm.processing || isLocked}
                                    label={`Area tanda tangan digital ${label}`}
                                    height={140}
                                    error={form.errors[`signatures.${key}`]}
                                />
                            </div>
                        ))}
                    </div>
                </fieldset>

                <Textarea label="Catatan Panitera" value={form.data.notes} error={form.errors.notes} maxLength={1000} rows={4} placeholder="Catatan keputusan atau kejadian penting (opsional)…" disabled={isLocked} onChange={(event) => changeNotes(event.target.value)} />

                <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border border-[#d8c9ae] bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:text-left">
                        <div className="rounded-xl bg-rose-50 px-4 py-2"><p className="text-[10px] font-bold uppercase text-rose-700">AKA</p><p className="font-mono text-xl font-black text-rose-800">{akaTotal}</p></div>
                        <div className="rounded-xl bg-slate-100 px-4 py-2"><p className="text-[10px] font-bold uppercase text-slate-600">SHIRO</p><p className="font-mono text-xl font-black text-slate-800">{shiroTotal}</p></div>
                    </div>
                    {isLocked ? (
                        <div className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white sm:w-auto">
                            <i className="fa-solid fa-lock" aria-hidden="true" /> Nilai Sudah Dikunci
                        </div>
                    ) : (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <Button type="submit" variant={existingScore ? 'outline' : 'primary'} className="w-full sm:w-auto" loading={form.processing} disabled={lockForm.processing || akaTotal === shiroTotal || !signaturesComplete} iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}>{existingScore ? 'Simpan Perubahan Nilai' : 'Simpan Hasil Nilai'}</Button>
                            {existingScore && (
                                <Button type="button" className="w-full sm:w-auto" disabled={form.isDirty || form.processing || !signaturesComplete} loading={lockForm.processing} iconLeft={<i className="fa-solid fa-lock" aria-hidden="true" />} onClick={() => setLockConfirmationOpen(true)}>Kunci Nilai Permanen</Button>
                            )}
                        </div>
                    )}
                </div>
                {existingScore && !isLocked && form.isDirty && <p className="text-right text-xs font-semibold text-amber-700">Simpan perubahan nilai terlebih dahulu sebelum mengunci hasil.</p>}
            </form>

            <AlertConfirm
                isOpen={saveConfirmationOpen}
                title={existingScore ? 'Simpan perubahan hasil Randori?' : 'Simpan hasil nilai Randori?'}
                message={`${winnerLabel} unggul dengan skor ${Math.max(akaTotal, shiroTotal)}–${Math.min(akaTotal, shiroTotal)}. Nilai dan enam tanda tangan akan disimpan, pertandingan ditandai selesai, serta pemenang diteruskan ke bagan. Hasil masih dapat diperbaiki sampai tombol Kunci Nilai ditekan.`}
                confirmText={existingScore ? 'Simpan Perubahan' : 'Simpan Hasil Nilai'}
                cancelText="Periksa Lagi"
                variant="primary"
                isLoading={form.processing}
                error={confirmationError}
                onCancel={() => setSaveConfirmationOpen(false)}
                onConfirm={submitScore}
            />
            <AlertConfirm
                isOpen={lockConfirmationOpen}
                title="Kunci hasil nilai Randori?"
                message={`${winnerLabel} dengan skor ${Math.max(akaTotal, shiroTotal)}–${Math.min(akaTotal, shiroTotal)} akan dikunci permanen. Setelah dikunci, skor, tanda tangan, dan catatan tidak dapat diubah lagi.`}
                confirmText="Ya, Kunci Nilai"
                cancelText="Periksa Lagi"
                variant="warning"
                isLoading={lockForm.processing}
                error={lockForm.errors.result || lockForm.errors.event_id || ''}
                onCancel={() => setLockConfirmationOpen(false)}
                onConfirm={lockScore}
            />
        </section>
    );
}
