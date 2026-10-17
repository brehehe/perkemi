import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Button, Modal } from '@/Components/UI';

export default function EventRefereeImport({ eventId }) {
    const [isOpen, setIsOpen] = useState(false);
    const fileInput = useRef(null);
    const form = useForm({ file: null });

    const close = () => {
        setIsOpen(false);
        form.reset('file');
        form.clearErrors();

        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const submit = (event) => {
        event.preventDefault();
        form.post(`/admin/master/event/${eventId}/referee-import`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: close,
        });
    };

    return (
        <>
            <div className="flex flex-col gap-2 sm:flex-row">
                <a
                    href={`/admin/master/event/${eventId}/referee-import/template`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:text-sm"
                >
                    <i className="fa-solid fa-download" aria-hidden="true" />
                    Template Wasit
                </a>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(true)}
                    iconLeft={<i className="fa-solid fa-file-import" aria-hidden="true" />}
                >
                    Import Wasit
                </Button>
            </div>

            <Modal
                isOpen={isOpen}
                onClose={close}
                title="Import Wasit ke Event"
                subtitle="Maksimal 1.000 baris CSV dan ukuran file 5 MB."
                footer={(
                    <>
                        <Button variant="outline" onClick={close}>Batal</Button>
                        <Button onClick={submit} loading={form.processing} disabled={!form.data.file}>Import & Tugaskan</Button>
                    </>
                )}
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        Sistem memakai <strong>ID, nomor lisensi, email, nomor HP, lalu nama</strong> untuk menemukan data lama sehingga wasit tidak dibuat ganda. Isi email dan password bila wasit perlu akun login; nomor HP tersebut juga dapat dipakai saat login.
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                        Nilai kolom <strong>gender</strong>: male/female. Nilai kolom <strong>role</strong>: chief/referee/judge/reserve.
                    </div>

                    <div>
                        <label htmlFor="event-referee-import-file" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            File CSV
                        </label>
                        <input
                            ref={fileInput}
                            id="event-referee-import-file"
                            type="file"
                            accept=".csv,text/csv,text/plain"
                            required
                            onChange={(event) => form.setData('file', event.target.files?.[0] || null)}
                            className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-[#c0392b]/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#c0392b] hover:file:bg-[#c0392b]/15 focus:border-[#c0392b] focus:outline-none focus:ring-2 focus:ring-[#c0392b]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        />
                        {form.errors.file && <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{form.errors.file}</p>}
                    </div>
                </form>
            </Modal>
        </>
    );
}
