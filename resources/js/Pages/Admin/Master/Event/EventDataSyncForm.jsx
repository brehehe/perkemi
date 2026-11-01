import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';

export default function EventDataSyncForm({ event, counts = {}, tournamentSummary = {} }) {
    const fileInputRef = useRef(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState('');

    const form = useForm({
        package_file: null,
    });

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('package_file', file);
            setSelectedFileName(file.name);
        } else {
            form.setData('package_file', null);
            setSelectedFileName('');
        }
    };

    const handleTriggerImport = (e) => {
        e.preventDefault();
        if (!form.data.package_file) {
            alert('Silakan pilih file paket JSON data event terlebih dahulu.');
            return;
        }
        setConfirmModalOpen(true);
    };

    const executeImport = () => {
        setConfirmModalOpen(false);
        form.post('/admin/master/event/import-package', {
            preserveScroll: true,
            onSuccess: () => {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setSelectedFileName('');
                form.reset('package_file');
            },
        });
    };

    const exportUrl = `/admin/master/event/${event.id}/export-package`;

    return (
        <div className="space-y-6">
            {/* Banner Informasi Sinkronisasi */}
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 shadow-sm dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-xl text-black shadow-md">
                        <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                            Sinkronisasi & Pemindahan Data Event (Offline ⇄ Online)
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            Fitur ini dirancang khusus untuk turnamen yang dijalankan secara <strong>offline</strong> (di venue tanpa koneksi internet yang stabil).
                            Setelah pertandingan selesai atau setiap sesi usai di laptop lokal, Anda dapat mengekspor seluruh basis data ke file paket <code>.json</code> dan mengimpornya ke server online ini.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 shadow-sm dark:bg-black/30">
                                <i className="fa-solid fa-check text-emerald-600" /> Semua Jadwal & Partai
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 shadow-sm dark:bg-black/30">
                                <i className="fa-solid fa-check text-emerald-600" /> Nilai Para Wasit (5 Juri)
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 shadow-sm dark:bg-black/30">
                                <i className="fa-solid fa-check text-emerald-600" /> Poin Randori & Pelanggaran
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2.5 py-1 shadow-sm dark:bg-black/30">
                                <i className="fa-solid fa-check text-emerald-600" /> Rekap Juara & Medali
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid 2 Kartu: Ekspor & Impor */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* KARTU 1: EKSPOR DATA EVENT LENGKAP */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                <i className="fa-solid fa-file-export text-lg" aria-hidden="true" />
                            </span>
                            <div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                    1. Ekspor Data Event (.json)
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Unduh seluruh data terhubung pada event ini
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Cakupan Data Paket:
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Lapangan (Court):</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{counts.courts ?? 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Nomor Pertandingan:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{counts.match_categories ?? 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Total Partai:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{tournamentSummary.total_matches ?? 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Wasit & Juri:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{counts.referees ?? 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Panitera:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{counts.clerks ?? 0}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200/50 pb-1.5 dark:border-slate-800">
                                    <span className="text-slate-600 dark:text-slate-400">Koordinator:</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{counts.field_coordinators ?? 0}</span>
                                </div>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            File yang diunduh mencakup seluruh atlet, kontingen, bagan pertandingan, log timer, nilai wasit, dan hasil juara. Simpan file ini di flashdisk atau drive cadangan.
                        </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <a
                            href={exportUrl}
                            download
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-500 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            <i className="fa-solid fa-download" aria-hidden="true" />
                            Unduh Paket Data Event Lengkap (.json)
                        </a>
                    </div>
                </div>

                {/* KARTU 2: IMPOR DATA EVENT DARI FILE */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                <i className="fa-solid fa-file-import text-lg" aria-hidden="true" />
                            </span>
                            <div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                    2. Impor Data Event (.json)
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Unggah file paket untuk menyinkronkan hasil offline ke server ini
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleTriggerImport} className="mt-5 space-y-4">
                            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center transition-colors hover:border-emerald-500 dark:border-slate-700">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    id="package-file-input"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="package-file-input"
                                    className="cursor-pointer flex flex-col items-center justify-center"
                                >
                                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-emerald-500" aria-hidden="true" />
                                    <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {selectedFileName ? selectedFileName : 'Pilih file paket JSON data event'}
                                    </span>
                                    <span className="mt-1 text-xs text-slate-400">
                                        Format .json (Smart Perkemi Event Package)
                                    </span>
                                </label>
                            </div>

                            {form.errors.package_file && (
                                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                    {form.errors.package_file}
                                </p>
                            )}

                            {form.progress && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Mengunggah file...</span>
                                        <span>{form.progress.percentage}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-300"
                                            style={{ width: `${form.progress.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200/50 dark:border-amber-900/50">
                                <p className="font-bold flex items-center gap-1.5">
                                    <i className="fa-solid fa-triangle-exclamation" /> Perhatian:
                                </p>
                                <p className="mt-1">
                                    Data pertandingan, skor wasit, dan medali pada event ini akan diperbarui sesuai isi file paket yang diimpor.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                loading={form.processing}
                                disabled={!form.data.package_file || form.processing}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md"
                            >
                                <i className="fa-solid fa-upload mr-2" aria-hidden="true" />
                                Mulai Impor & Sinkronkan Data Event
                            </Button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Informasi Perintah CLI Server */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-terminal text-slate-400" />
                        Opsi Command Line (CLI) untuk Server Production
                    </h4>
                    <span className="text-xs font-mono text-slate-400">Terminal / SSH</span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Selain melalui tombol di atas, Anda juga dapat menjalankan ekspor dan impor langsung via terminal server:
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 font-mono text-xs">
                    <div className="rounded-xl bg-slate-900 p-3.5 text-emerald-400 overflow-x-auto">
                        <p className="text-[10px] uppercase font-bold text-slate-400 font-sans mb-1">Perintah Ekspor:</p>
                        <code>php artisan perkemi:export-event {event.id}</code>
                    </div>
                    <div className="rounded-xl bg-slate-900 p-3.5 text-amber-300 overflow-x-auto">
                        <p className="text-[10px] uppercase font-bold text-slate-400 font-sans mb-1">Perintah Impor:</p>
                        <code>php artisan perkemi:import-event /path/to/file.json</code>
                    </div>
                </div>
            </div>

            {/* Modal Konfirmasi Impor */}
            <AlertConfirm
                open={confirmModalOpen}
                onOpenChange={setConfirmModalOpen}
                title="Konfirmasi Impor Data Event"
                description={`Apakah Anda yakin ingin mengimpor paket data '${selectedFileName}' ke dalam event '${event.name}'? Seluruh data partai pertandingan, penilaian wasit, dan rekap juara akan disinkronkan.`}
                confirmLabel="Ya, Impor Data Sekarang"
                cancelLabel="Batal"
                variant="warning"
                onConfirm={executeImport}
            />
        </div>
    );
}

