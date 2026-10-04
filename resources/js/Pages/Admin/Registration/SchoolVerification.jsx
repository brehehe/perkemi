import Button from '@/Components/UI/Elements/Button';
import Checkbox from '@/Components/UI/Forms/Checkbox';
import { useForm } from '@inertiajs/react';

function SchoolReview({ athlete, registration, canVerify }) {
    const form = useForm({ confirmed: false });
    const base = `/admin/pendaftaran/registrasi/${registration.id}/athletes/${athlete.id}`;
    const documentRequired = Boolean(registration.event.participant_rules?.require_school_document);
    return <article className="space-y-3 border-t border-slate-200 py-4 dark:border-slate-700">
        <div className="flex flex-wrap justify-between gap-2"><strong>{athlete.name}</strong><span className={`text-sm ${athlete.school_verification_valid ? 'text-emerald-700' : 'text-amber-800'}`}>{athlete.school_verification_valid ? 'Sekolah terverifikasi' : 'Perlu verifikasi sekolah'}</span></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{athlete.school_name || 'Sekolah belum diisi'} · {athlete.school_level || 'Jenjang belum diisi'} · Kelas {athlete.school_grade || '—'} · Masuk {athlete.school_entry_year || '—'}</p>
        {athlete.eligibility_errors?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-rose-700">{athlete.eligibility_errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        {athlete.school_document_path ? <a href={`${base}/school-document`} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-sm font-semibold text-[#9f2e22] underline">Buka bukti sekolah / rapor</a> : <p className="text-sm text-slate-500 dark:text-slate-400">{documentRequired ? 'Bukti belum diunggah. Buka data atlet untuk melengkapinya sebelum verifikasi.' : 'Dokumen tidak diunggah (opsional). Verifikasi data sekolah tetap dapat dilakukan.'}</p>}
        {canVerify && !athlete.school_verification_valid && <form onSubmit={(e) => { e.preventDefault(); form.post(`${base}/verify-school`, { preserveScroll: true, onSuccess: () => form.reset() }); }} className="space-y-3">
            <Checkbox id={`school-confirm-${athlete.id}`} checked={form.data.confirmed} onChange={(e) => form.setData('confirmed', e.target.checked)}
                label="Saya telah memeriksa dan menyetujui identitas, status pelajar aktif, kelas, dan tahun masuk atlet sesuai persyaratan event." />
            {form.hasErrors && <p role="alert" className="text-sm text-rose-700">{Object.values(form.errors).join(' ')}</p>}
            <Button type="submit" size="sm" disabled={!form.data.confirmed || (documentRequired && !athlete.school_document_path)} loading={form.processing}>Verifikasi sekolah atlet</Button>
        </form>}
    </article>;
}

export default function SchoolVerification({ registration, athletes, canVerify }) {
    if (!registration.event.participant_rules?.enabled) return null;
    return <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-semibold">Pemeriksaan sekolah oleh panitia</h3><p className="mb-4 mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Periksa identitas, status pelajar aktif, kelas, dan tahun masuk atlet. {registration.event.participant_rules.require_school_document ? 'Dokumen sekolah wajib tersedia sebelum verifikasi.' : 'Dokumen sekolah opsional; admin atau penanggung jawab event dapat memverifikasi tanpa unggahan dokumen.'} Perubahan identitas, dokumen, atau persyaratan membatalkan verifikasi sebelumnya.</p>
        {athletes.map((athlete) => <SchoolReview key={athlete.id} athlete={athlete} registration={registration} canVerify={canVerify} />)}
    </section>;
}
