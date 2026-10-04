import Input from './Input';
import Combobox from './Combobox';

export const schoolDefaults = { school_name: '', school_level: '', school_entry_year: '', school_grade: '' };
export const schoolData = (athlete) => Object.fromEntries(Object.keys(schoolDefaults).map((key) => [key, athlete[key] ?? '']));
const grades = [[7,'VII'],[8,'VIII'],[9,'IX'],[10,'X'],[11,'XI'],[12,'XII'],[13,'XIII']];

export default function SchoolFields({ form, rules = null }) {
    const required = Boolean(rules?.enabled);
    const startGrade = ['SMP','MTs'].includes(form.data.school_level) ? 7 : 10;
    const expected = rules?.academic_year_start && form.data.school_level && form.data.school_entry_year ? startGrade + Number(rules.academic_year_start) - Number(form.data.school_entry_year) : null;
    return <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <legend className="px-2 font-semibold text-slate-900 dark:text-white">Data sekolah {required ? '(wajib untuk event ini)' : '(untuk event pelajar)'}</legend>
        <div className="grid gap-4 md:grid-cols-2">
            <Input id="school_name" label="Nama sekolah aktif" required={required} value={form.data.school_name || ''} onChange={(e) => form.setData('school_name', e.target.value)} error={form.errors.school_name} />
            <Combobox label="Jenjang sekolah" required={required} value={form.data.school_level || ''} onChange={(v) => form.setData('school_level', v)} options={['SMP','MTs','SMA','SMK','MA']} error={form.errors.school_level} />
            <Input id="school_entry_year" label={`Tahun pertama masuk kelas ${startGrade === 7 ? 'VII SMP/MTs' : 'X SMA/SMK/MA'}`} type="number" min="1990" max="2100" required={required} value={form.data.school_entry_year || ''} onChange={(e) => form.setData('school_entry_year', e.target.value)} error={form.errors.school_entry_year} />
            <Combobox label={rules?.academic_year_start ? `Kelas pada tahun ajaran ${rules.academic_year_start}/${Number(rules.academic_year_start)+1}` : 'Kelas saat event'} required={required} value={String(form.data.school_grade || '')} onChange={(v) => form.setData('school_grade', v)} options={grades.map(([value,label]) => ({ value:String(value), label:`Kelas ${label}` }))} error={form.errors.school_grade} />
        </div>
        <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">Isi tahun pertama masuk jenjang ini, bukan tahun pindah sekolah. Jika mengulang kelas atau akselerasi, hubungi panitia untuk peninjauan persyaratan sebelum mendaftar.</p>
        {expected !== null && <p role="status" className={`text-sm ${form.data.school_grade && expected !== Number(form.data.school_grade) ? 'text-rose-700' : 'text-slate-600 dark:text-slate-300'}`}>Kelas berdasarkan tahun masuk: <strong>{grades.find(([value]) => value === expected)?.[1] || expected}</strong>{form.data.school_grade && expected !== Number(form.data.school_grade) ? ' — tidak sesuai dengan kelas yang dipilih.' : '.'}</p>}
    </fieldset>;
}
