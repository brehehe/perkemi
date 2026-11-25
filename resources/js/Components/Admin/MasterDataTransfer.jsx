import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Button, Modal } from '@/Components/UI';
import ActionMenuDropdown from '@/Components/UI/Elements/ActionMenuDropdown';

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function MasterDataTransfer({
    type,
    label,
    eventId = null,
    supportsLogin = false,
    requiresLogin = false,
    variant = 'dropdown',
    className = '',
}) {
    const { props } = usePage();
    const resolvedEventId = eventId || props.tenant?.id || props.activeEvent?.id || null;
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInput = useRef(null);
    const form = useForm({ file: null, event_id: resolvedEventId || '' });

    const query = resolvedEventId ? `?event_id=${encodeURIComponent(resolvedEventId)}` : '';
    const templateUrl = `/admin/master/data-transfer/${type}/template${query}`;
    const exportUrl = `/admin/master/data-transfer/${type}/export${query}`;

    const close = () => {
        setIsOpen(false);
        setIsDragging(false);
        form.reset('file');
        form.clearErrors();

        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const handleFileSelected = (file) => {
        if (!file) return;
        form.setData('file', file);
        form.clearErrors('file');
    };

    const removeFile = () => {
        form.setData('file', null);
        if (fileInput.current) {
            fileInput.current.value = '';
        }
    };

    const submit = (event) => {
        event.preventDefault();
        if (!form.data.file) return;

        form.post(`/admin/master/data-transfer/${type}/import`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: close,
        });
    };

    const dropdownItems = [
        {
            label: 'Unduh Template CSV',
            icon: <i className="fa-solid fa-download text-xs" />,
            href: templateUrl,
            download: true,
            tone: 'emerald',
            badge: '.csv',
            description: `Format kolom standar untuk input data ${label.toLowerCase()} baru.`,
        },
        {
            label: `Export Data ${label}`,
            icon: <i className="fa-solid fa-file-export text-xs" />,
            href: exportUrl,
            download: true,
            tone: 'blue',
            badge: 'Unduh',
            description: `Unduh seluruh data ${label.toLowerCase()} yang tersimpan saat ini.`,
        },
        { type: 'divider' },
        {
            label: 'Import File CSV',
            icon: <i className="fa-solid fa-file-import text-xs" />,
            onClick: () => setIsOpen(true),
            tone: 'gold',
            badge: 'Upload',
            description: `Unggah file CSV untuk menambah atau memperbarui data ${label.toLowerCase()}.`,
        },
    ];

    return (
        <>
            {variant === 'buttons' ? (
                <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
                    <a
                        href={templateUrl}
                        download
                        title={`Unduh Template CSV ${label}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
                    >
                        <i className="fa-solid fa-download text-[11px] text-emerald-600 dark:text-emerald-400" />
                        <span>Template</span>
                    </a>
                    <a
                        href={exportUrl}
                        download
                        title={`Export Data ${label} ke CSV`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
                    >
                        <i className="fa-solid fa-file-export text-[11px] text-blue-600 dark:text-blue-400" />
                        <span>Export</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => setIsOpen(true)}
                        title={`Import Data ${label} dari CSV`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#d4a843]/40 bg-[#d4a843]/10 hover:bg-[#d4a843]/20 text-[#966d14] dark:text-[#f0c060] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer select-none"
                    >
                        <i className="fa-solid fa-file-import text-[11px] text-[#d4a843]" />
                        <span>Import</span>
                    </button>
                </div>
            ) : (
                <ActionMenuDropdown
                    className={className}
                    label="Ekspor & Impor"
                    icon={<i className="fa-solid fa-file-csv text-xs text-[#d4a843]" />}
                    theme="light"
                    size="md"
                    menuHeader={`Data CSV · ${label}`}
                    items={dropdownItems}
                />
            )}

            {/* Modal Import CSV yang Rapi & Terstruktur */}
            <Modal
                isOpen={isOpen}
                onClose={close}
                title={`Import Data ${label}`}
                subtitle={`Tambah atau perbarui data master ${label.toLowerCase()} secara massal dari file CSV.`}
                size="md"
                footer={(
                    <div className="flex items-center justify-between w-full">
                        <Button variant="outline" size="sm" onClick={close} disabled={form.processing}>
                            Batal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={submit}
                            loading={form.processing}
                            disabled={!form.data.file || form.processing}
                            iconLeft={<i className="fa-solid fa-file-import text-xs" />}
                        >
                            {form.processing ? 'Mengimpor...' : 'Mulai Import Data'}
                        </Button>
                    </div>
                )}
            >
                <form onSubmit={submit} className="space-y-4">
                    {/* Notice & Petunjuk Format */}
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                            <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 mt-0.5 shrink-0 text-sm" />
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <p className="font-semibold text-amber-950 dark:text-amber-100">
                                    Petunjuk Format File CSV:
                                </p>
                                <ul className="list-disc pl-4 space-y-0.5 text-[11.5px] text-amber-900/90 dark:text-amber-200/90">
                                    <li>Pastikan nama dan urutan kolom sesuai template resmi.</li>
                                    <li>Kolom <strong>id</strong> kosongkan untuk data baru; isi id dari hasil export untuk memperbarui data yang sudah ada.</li>
                                    {requiresLogin && <li>Password wajib untuk akun baru, boleh dikosongkan jika tidak ingin mengganti password akun lama.</li>}
                                    {supportsLogin && !requiresLogin && <li>Untuk membuat akun login sekaligus, isi email dan password. Jika dikosongkan, data tetap dibuat tanpa login.</li>}
                                    <li>Maksimal 1.000 baris dan ukuran file 5 MB.</li>
                                </ul>
                                <div className="pt-1">
                                    <a
                                        href={templateUrl}
                                        download
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 text-amber-950 dark:text-amber-100 font-semibold text-[11px] transition-colors"
                                    >
                                        <i className="fa-solid fa-download text-[10px]" />
                                        <span>Unduh Template CSV ({label})</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dropzone File Upload */}
                    <div>
                        <label htmlFor={`master-import-${type}`} className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            Pilih File CSV <span className="text-rose-500">*</span>
                        </label>

                        {!form.data.file ? (
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFileSelected(file);
                                }}
                                onClick={() => fileInput.current?.click()}
                                className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                                    isDragging
                                        ? 'border-[#c0392b] bg-[#c0392b]/5 dark:border-[#c0392b]'
                                        : 'border-slate-300 hover:border-[#c0392b]/60 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-[#d4a843]/15 text-[#b88922] dark:text-[#f0c060] flex items-center justify-center text-xl mb-2.5 shadow-2xs">
                                    <i className="fa-solid fa-file-csv" />
                                </div>
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Klik untuk memilih file <span className="font-normal text-slate-500">atau tarik file ke sini</span>
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                    Format .csv (UTF-8) hingga 5 MB
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 border border-emerald-200 dark:border-emerald-800/40">
                                        <i className="fa-solid fa-file-circle-check" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={form.data.file.name}>
                                            {form.data.file.name}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {formatFileSize(form.data.file.size)} · <span className="text-emerald-600 dark:text-emerald-400 font-medium">Siap diimpor</span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Hapus / ganti file"
                                >
                                    <i className="fa-solid fa-xmark mr-1" />
                                    Ganti
                                </button>
                            </div>
                        )}

                        <input
                            ref={fileInput}
                            id={`master-import-${type}`}
                            type="file"
                            accept=".csv,text/csv,text/plain"
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) handleFileSelected(file);
                            }}
                        />

                        {form.errors.file && (
                            <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <i className="fa-solid fa-circle-exclamation text-[11px]" />
                                <span>{form.errors.file}</span>
                            </p>
                        )}
                    </div>
                </form>
            </Modal>
        </>
    );
}
