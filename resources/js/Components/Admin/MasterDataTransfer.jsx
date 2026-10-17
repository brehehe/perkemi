import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Button, Modal } from '@/Components/UI';

export default function MasterDataTransfer({ type, label, eventId = null, supportsLogin = false, requiresLogin = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const fileInput = useRef(null);
    const form = useForm({ file: null, event_id: eventId || '' });
    const query = eventId ? `?event_id=${encodeURIComponent(eventId)}` : '';
    const templateUrl = `/admin/master/data-transfer/${type}/template${query}`;
    const exportUrl = `/admin/master/data-transfer/${type}/export${query}`;

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
        form.post(`/admin/master/data-transfer/${type}/import`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: close,
        });
    };

    return (
        <>
            <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#e8e1d8] bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#d4a843]/15 text-[#b88922] dark:text-[#f0c060]">
                            <i className="fa-solid fa-file-csv" aria-hidden="true" />
                        </span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Import & Export {label}</h3>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Gunakan template CSV agar nama dan urutan kolom tetap sesuai.
                                {supportsLogin ? ' Kolom password hanya ada di template dan tidak ikut diekspor.' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-3">
                    <a href={templateUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:text-sm">
                        <i className="fa-solid fa-download" aria-hidden="true" />
                        Template
                    </a>
                    <a href={exportUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:text-sm">
                        <i className="fa-solid fa-file-export" aria-hidden="true" />
                        Export
                    </a>
                    <Button onClick={() => setIsOpen(true)} iconLeft={<i className="fa-solid fa-file-import" aria-hidden="true" />}>
                        Import
                    </Button>
                </div>
            </section>

            <Modal
                isOpen={isOpen}
                onClose={close}
                title={`Import ${label}`}
                subtitle="Maksimal 1.000 baris dan ukuran file 5 MB."
                footer={(
                    <>
                        <Button variant="outline" onClick={close}>Batal</Button>
                        <Button onClick={submit} loading={form.processing} disabled={!form.data.file}>Import Data</Button>
                    </>
                )}
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                        Unduh template terlebih dahulu. Kolom <strong>id</strong> boleh dikosongkan untuk data baru; isi id dari hasil export untuk memperbarui data yang sudah ada.
                        {requiresLogin && ' Password wajib untuk akun baru, boleh kosong saat memperbarui akun tanpa mengganti password.'}
                        {supportsLogin && !requiresLogin && ' Untuk membuat akun login sekaligus, isi email dan password. Jika dikosongkan, data petugas tetap dibuat tanpa login.'}
                    </div>

                    <div>
                        <label htmlFor={`master-import-${type}`} className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            File CSV
                        </label>
                        <input
                            ref={fileInput}
                            id={`master-import-${type}`}
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
