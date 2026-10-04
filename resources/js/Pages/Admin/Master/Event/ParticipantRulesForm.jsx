import Button from '@/Components/UI/Elements/Button';
import Checkbox from '@/Components/UI/Forms/Checkbox';
import Input from '@/Components/UI/Forms/Input';
import Combobox from '@/Components/UI/Forms/Combobox';
import { useForm } from '@inertiajs/react';
import { useRef } from 'react';

export default function ParticipantRulesForm({ event }) {
    const form = useForm({ enabled: false, age_reference_date: event.start_date || '', academic_year_start: Number(event.start_date?.slice(0, 4)) || new Date().getFullYear(),
        max_age_years: 17, birth_date_from: '', max_school_grade: 11, embu_min_age_months: 156, embu_min_school_grade: '',
        randori_min_age_months: 174, require_school_verification: true, require_school_document: false, ...event.participant_rules });
    const errorRef = useRef(null);
    const numberField = (name, label, min, max, hint) => <Input id={`rules-${name}`} key={name} type="number" label={label} required min={min} max={max}
        value={form.data[name]} onChange={(e) => form.setData(name, e.target.value)} error={form.errors[name]} helperText={hint} />;
    return <form onSubmit={(e) => { e.preventDefault(); form.put(`/admin/master/event/${event.id}/participant-rules`, { preserveScroll: true, onError: () => requestAnimationFrame(() => errorRef.current?.focus()) }); }}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 md:p-7 dark:border-slate-700 dark:bg-slate-900">
        <div><h3 className="text-lg font-semibold text-slate-900 dark:text-white">Persyaratan peserta</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Atur batas usia dan sekolah khusus event ini. Pemeriksaan berlaku saat data atlet disimpan, nomor pertandingan dipilih, dan registrasi disetujui.</p></div>
        {form.hasErrors && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{Object.values(form.errors).join(' ')}</div>}
        <Checkbox id="rules-enabled" label="Aktifkan persyaratan usia dan sekolah" checked={form.data.enabled} onChange={(e) => form.setData('enabled', e.target.checked)} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Input id="rules-reference" label="Tanggal acuan usia" type="date" required value={form.data.age_reference_date} onChange={(e) => form.setData('age_reference_date', e.target.value)} error={form.errors.age_reference_date} />
            {numberField('academic_year_start', 'Awal tahun ajaran (contoh 2026 = 2026/2027)', 2000, 2100)}
            {numberField('max_age_years', 'Usia maksimal (tahun penuh)', 1, 99)}
            <Input id="rules-birth" label="Tanggal lahir paling awal (opsional)" type="date" value={form.data.birth_date_from || ''} onChange={(e) => form.setData('birth_date_from', e.target.value)} error={form.errors.birth_date_from} />
            <Combobox label="Kelas maksimal" value={String(form.data.max_school_grade)} onChange={(v) => form.setData('max_school_grade', v)} options={[[7,'VII'],[8,'VIII'],[9,'IX'],[10,'X'],[11,'XI'],[12,'XII'],[13,'XIII']].map(([value,label]) => ({value:String(value), label:`Kelas ${label}`}))} error={form.errors.max_school_grade} />
        </div>
        <div className="border-t border-slate-200 pt-5 dark:border-slate-700"><h4 className="font-semibold text-slate-900 dark:text-white">Usia minimum per jenis pertandingan</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">156 bulan = 13 tahun. 174 bulan = 14 tahun 6 bulan. Alternatif kelas hanya berlaku untuk Embu; batas usia maksimum dan kelas maksimum tetap wajib dipenuhi.</p>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
                {numberField('embu_min_age_months', 'Usia minimum Embu (bulan)', 0, 1188)}
                <Combobox label="Alternatif minimum kelas Embu" value={String(form.data.embu_min_school_grade || '')} onChange={(v) => form.setData('embu_min_school_grade', v)} options={[{ value: '', label: 'Tidak ada; wajib memenuhi usia' }, ...[[7,'VII'],[8,'VIII'],[9,'IX'],[10,'X'],[11,'XI']].map(([value,label]) => ({value:String(value),label:`Usia minimum ATAU minimal kelas ${label}`}))]} error={form.errors.embu_min_school_grade} />
                {numberField('randori_min_age_months', 'Usia minimum Randori (bulan)', 0, 1188)}
            </div>
        </div>
        <Checkbox id="rules-school-verification" label="Wajib verifikasi data sekolah oleh admin atau penanggung jawab event sebelum registrasi disetujui" checked={form.data.require_school_verification} onChange={(e) => form.setData('require_school_verification', e.target.checked)} />
        <Checkbox id="rules-school-document" label="Wajib unggah surat sekolah / rapor sebelum verifikasi (tidak dicentang = opsional)" checked={form.data.require_school_document} onChange={(e) => form.setData('require_school_document', e.target.checked)} />
        <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Tahun masuk digunakan untuk mencocokkan kelas. Dokumen dan verifikasi diatur terpisah; dokumen opsional tidak menghalangi admin atau penanggung jawab event memverifikasi data sekolah. Jika aturan berubah, verifikasi lama perlu ditinjau ulang; data atlet tetap tersimpan.</p>
        <div className="flex items-center gap-4"><Button type="submit" loading={form.processing}>Simpan persyaratan</Button>{form.recentlySuccessful && <p role="status" className="text-sm text-emerald-700">Persyaratan tersimpan.</p>}</div>
    </form>;
}
