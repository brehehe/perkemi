import Button from '@/Components/UI/Elements/Button';
import SignaturePad from '@/Components/UI/Forms/SignaturePad';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const scoreChoices = [7, 8, 9, 10];

const criteriaGroups = [
    {
        id: 'technique',
        title: 'I. Penguasaan Teknik',
        subtitle: 'GOHO & JUHO · Maksimal 60 poin',
        items: [
            ['goho_attack', 'GOHO 1', 'Serangan (Kougeki)'],
            ['goho_defense', 'GOHO 2', 'Bertahan (Bougyo)'],
            ['goho_counter', 'GOHO 3', 'Serangan balasan & 5 unsur serangan'],
            ['juho_escape', 'JUHO 1', 'Shuha & Nukiwaza'],
            ['juho_lock_throw', 'JUHO 2', 'Gyakuwaza & Nagewaza'],
            ['juho_ground', 'JUHO 3', 'Katamewaza'],
        ],
    },
    {
        id: 'expression',
        title: 'II. Penghayatan / Ekspresi',
        subtitle: 'EKSPRESI · Maksimal 40 poin',
        items: [
            ['expression_sequence', 'EKSPRESI 1', 'Rangkaian, irama, dan harmoni'],
            ['expression_stance', 'EKSPRESI 2', 'Tai Gamae, kuda-kuda, dan keindahan gerak'],
            ['expression_spirit', 'EKSPRESI 3', 'Semangat dan disiplin'],
            ['expression_breath_zanshin', 'EKSPRESI 4', 'Nafas, pandangan mata, dan Zanshin'],
        ],
    },
];

const allCriteria = criteriaGroups.flatMap((group) => group.items);

function initialAspectScores(savedScores = {}) {
    return Object.fromEntries(allCriteria.map(([key]) => [key, savedScores?.[key] ?? null]));
}

function initialViolationPenalties(options = [], savedPenalties = {}) {
    return Object.fromEntries(options.map((option) => [option.key, Number(savedPenalties?.[option.key] || 0)]));
}

function EmptyState({ session, activeEvent }) {
    if (!session) {
        return (
            <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Akun Wasit Diperlukan</p>
                <h2 className="mt-2 text-xl font-black">Papan ini khusus penilaian Wasit Embu</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">Masuk menggunakan akun Wasit yang sudah ditugaskan ke Court. Admin dan Panitera memantau nilai dari halaman detail pertandingan.</p>
            </section>
        );
    }

    if (session.is_taken_over) {
        return (
            <section role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-rose-950 shadow-sm sm:p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                        <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Peringatan Perebutan Sesi</p>
                        <h2 className="mt-1 text-2xl font-black text-rose-950">Posisi telah diambil alih</h2>
                        <p className="mt-2 text-sm leading-6 text-rose-900">
                            Sistem mendeteksi bahwa posisi Wasit <strong>{session.role}</strong> di <strong>{session.court_name}</strong> saat ini aktif di perangkat lain. Akses penilaian pada perangkat ini dinonaktifkan demi integritas penjurian.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <a
                                href={session.takeover_url}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 text-sm font-bold text-white transition hover:bg-rose-800"
                            >
                                <i className="fa-solid fa-right-left" aria-hidden="true" />
                                Ambil Alih Posisi Ini
                            </a>
                            <Link
                                href={`/wasit?event_id=${encodeURIComponent(activeEvent.id)}`}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-900 hover:bg-rose-100"
                            >
                                Kembali ke Portal Wasit
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!session.is_checked_in) {
        return (
            <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Papan Penilaian Belum Aktif</p>
                <h2 className="mt-2 text-xl font-black">Scan QR {session.court_name} terlebih dahulu</h2>
                <p className="mt-2 text-sm leading-6 text-amber-800">Penugasan sebagai {session.role} sudah tercatat, tetapi absensi event dan Court hari ini belum lengkap.</p>
                <Link href={`/wasit?event_id=${encodeURIComponent(activeEvent.id)}`} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 sm:w-auto">
                    <i className="fa-solid fa-qrcode" aria-hidden="true" />
                    Buka Absensi Wasit
                </Link>
            </section>
        );
    }

    if (!session.active_match) {
        return (
            <section role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Siaga di {session.court_name}</p>
                        <h2 className="mt-2 text-xl font-black">Menunggu panggilan peserta dari Panitera</h2>
                        <p className="mt-2 text-sm leading-6 text-blue-800">Form akan terbuka otomatis saat pertandingan di Court ini berstatus “Peserta Dipanggil”.</p>
                    </div>
                    <div className="flex min-h-16 min-w-16 items-center justify-center self-start rounded-2xl bg-white text-2xl text-blue-600 shadow-sm" aria-hidden="true">
                        <i className="fa-solid fa-satellite-dish animate-pulse" />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section role="status" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Pertandingan Randori Aktif</p>
            <h2 className="mt-2 text-xl font-black">Tidak ada form nilai pada perangkat Wasit</h2>
            <p className="mt-2 text-sm leading-6 text-rose-800">Panel ini khusus Embu. Hasil Randori dicatat oleh meja Panitera sesuai alur pertandingan.</p>
        </section>
    );
}

function CriterionCard({ code, label, value, onSelect, disabled }) {
    return (
        <fieldset className="rounded-2xl border border-[#e8e1d8] bg-[#fbfaf8] p-4">
            <legend className="sr-only">{label}</legend>
            <div className="min-h-14">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#a56f1c]">{code}</p>
                <p className="mt-1 text-sm font-bold leading-5 text-[#17120f]">{label}</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2" aria-label={`Pilih nilai untuk ${label}`}>
                {scoreChoices.map((score) => {
                    const selected = value === score;

                    return (
                        <button
                            key={score}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${label}, nilai ${score}`}
                            disabled={disabled}
                            onClick={() => onSelect(score)}
                            className={`min-h-12 rounded-xl border text-base font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] disabled:cursor-not-allowed disabled:opacity-50 ${selected
                                ? 'border-[#c0392b] bg-[#c0392b] text-white shadow-sm'
                                : 'border-[#d9d1c7] bg-white text-[#4a423b] hover:border-[#d4a843] hover:bg-amber-50'
                            }`}
                        >
                            {score}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}

function PenaltyPanel({ match, penalties, penaltyTotal, canManage, disabled, onChange }) {
    const options = match.penalty_options || [];
    const automaticRules = match.automatic_penalty_rules || [];

    return (
        <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="penalty-title">
            <div className="flex flex-col gap-3 border-b border-[#eee8e0] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a56f1c]">Sanksi pertandingan</p>
                    <h3 id="penalty-title" className="mt-1 text-base font-black text-[#17120f] sm:text-lg">Denda & Pelanggaran Embu</h3>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-[#7a746e]">Denda waktu dihitung dari timer Panitera. Pelanggaran teknis dicatat satu kali oleh Wasit Utama agar tidak terpotong berulang dari lima lembar juri.</p>
                </div>
                <div className="shrink-0 rounded-xl bg-rose-50 px-4 py-3 text-left sm:text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-rose-600">Denda teknis</p>
                    <p className="mt-1 font-mono text-xl font-black text-rose-700">-{penaltyTotal}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
                {automaticRules.map((rule) => (
                    <article key={rule.number} className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{rule.number}</span>
                            <div>
                                <p className="text-sm font-black text-blue-950">{rule.label}</p>
                                <p className="mt-1 text-xs font-bold text-blue-700">{rule.sanction}</p>
                                <p className="mt-2 text-xs leading-5 text-blue-800">{rule.explanation}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {canManage ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {options.map((option) => {
                        const quantity = Number(penalties[option.key] || 0);

                        return (
                            <fieldset key={option.key} className={`rounded-2xl border p-4 ${quantity > 0 ? 'border-rose-300 bg-rose-50/70' : 'border-[#e8e1d8] bg-[#fbfaf8]'}`}>
                                <legend className="sr-only">{option.label}</legend>
                                <div className="flex items-start gap-3">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${quantity > 0 ? 'bg-rose-600 text-white' : 'bg-[#ece5dc] text-[#6f6258]'}`}>{option.number}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-black text-[#17120f]">{option.label}</p>
                                        <p className="mt-1 text-xs font-bold text-rose-700">-{option.points} poin{option.per_item ? ' / teknik' : ''}</p>
                                        <p className="mt-1 text-xs leading-5 text-[#6f665f]">{option.explanation}</p>
                                    </div>
                                </div>

                                {option.per_item ? (
                                    <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label={`Jumlah pelanggaran ${option.label}`}>
                                        {Array.from({ length: option.maximum_quantity + 1 }, (_, index) => index).map((value) => (
                                            <button key={value} type="button" disabled={disabled} aria-pressed={quantity === value} onClick={() => onChange(option.key, value)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === value ? 'border-rose-600 bg-rose-600 text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b] hover:border-rose-300'}`}>
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button type="button" disabled={disabled} aria-pressed={quantity === 0} onClick={() => onChange(option.key, 0)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === 0 ? 'border-[#756a61] bg-[#756a61] text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b]'}`}>Tidak</button>
                                        <button type="button" disabled={disabled} aria-pressed={quantity === 1} onClick={() => onChange(option.key, 1)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === 1 ? 'border-rose-600 bg-rose-600 text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b]'}`}>Ya · -{option.points}</button>
                                    </div>
                                )}
                            </fieldset>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                    <i className="fa-solid fa-circle-info mr-2" aria-hidden="true" />
                    Pelanggaran teknis dicatat oleh Juri 1 · Wasit Utama. Anda tetap mengisi 10 aspek dan tanda tangan seperti biasa.
                </div>
            )}
        </section>
    );
}

function ParticipantDetails({ participant }) {
    const athletes = participant?.athletes || [];
    const techniques = participant?.techniques || [];

    return (
        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4" aria-labelledby="athlete-list-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f2cd73]">{participant?.kind || 'Tim Embu'}</p>
                        <h3 id="athlete-list-title" className="mt-1 text-sm font-black text-white">Nama Atlet</h3>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">{athletes.length} atlet</span>
                </div>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {athletes.map((athlete, index) => (
                        <li key={athlete.id || `${athlete.name}-${index}`} className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d4a843]/20 text-[10px] font-black text-[#f2cd73]">{index + 1}</span>
                            <span className="break-words text-sm font-bold text-white">{athlete.name}</span>
                        </li>
                    ))}
                    {athletes.length === 0 && <li className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-xs text-white/55 sm:col-span-2">Nama atlet belum tersedia pada registrasi tim ini.</li>}
                </ol>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4" aria-labelledby="technique-list-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">Registrasi Embu</p>
                        <h3 id="technique-list-title" className="mt-1 text-sm font-black text-white">Teknik yang Dibawakan</h3>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/70">{techniques.length} teknik</span>
                </div>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                    {techniques.map((technique, index) => (
                        <li key={technique.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-blue-300/10 bg-blue-300/5 px-3 py-2">
                            <span className="font-mono text-[10px] font-black text-blue-200">{String(technique.order || index + 1).padStart(2, '0')}</span>
                            <span className="break-words text-sm font-semibold text-white/90">{technique.name}</span>
                        </li>
                    ))}
                    {techniques.length === 0 && <li className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-xs text-white/55 sm:col-span-2">Teknik belum dimasukkan pada registrasi tim ini.</li>}
                </ol>
            </section>
        </div>
    );
}

function EmbuScoreForm({ activeEvent, session, onBusyChange }) {
    const match = session.active_match;
    const saveTimer = useRef(null);
    const [scores, setScores] = useState(() => initialAspectScores(session.score?.aspect_scores));
    const [penalties, setPenalties] = useState(() => initialViolationPenalties(
        match.penalty_options,
        session.score?.violation_penalties || session.penalty_state?.values,
    ));
    const [signature, setSignature] = useState(session.score?.signature || '');
    const [notes, setNotes] = useState(session.score?.notes || '');
    const [saveState, setSaveState] = useState(session.score?.status === 'submitted' ? 'submitted' : 'idle');
    const [saveMessage, setSaveMessage] = useState('Perubahan nilai tersimpan otomatis.');
    const [validationMessage, setValidationMessage] = useState('');
    const canManagePenalties = Boolean(session.can_manage_penalties);

    const penaltyTotal = useMemo(() => (match.penalty_options || []).reduce(
        (total, option) => total + (Number(penalties[option.key] || 0) * Number(option.points || 0)),
        0,
    ), [match.penalty_options, penalties]);

    const totals = useMemo(() => {
        const sumKeys = (items) => items.reduce((total, [key]) => total + (Number(scores[key]) || 0), 0);
        const technique = sumKeys(criteriaGroups[0].items);
        const expression = sumKeys(criteriaGroups[1].items);
        const completed = allCriteria.filter(([key]) => scores[key] !== null).length;

        return { technique, expression, total: technique + expression, completed };
    }, [scores]);

    useEffect(() => () => window.clearTimeout(saveTimer.current), []);

    const persist = (nextScores, status, nextSignature = signature, nextNotes = notes, nextPenalties = penalties) => {
        onBusyChange(true);
        setSaveState('saving');
        setSaveMessage(status === 'submitted' ? 'Mengirim nilai ke Panitera…' : 'Menyimpan perubahan…');

        router.put(match.score_update_url, {
            event_id: activeEvent.id,
            aspect_scores: nextScores,
            violation_penalties: canManagePenalties ? nextPenalties : {},
            signature: nextSignature || null,
            notes: nextNotes || null,
            status,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['refereeSession', 'flash', 'errors'],
            onSuccess: () => {
                setSaveState(status === 'submitted' ? 'submitted' : 'saved');
                setSaveMessage(status === 'submitted' ? 'Nilai sudah dikirim dan tampil di meja Panitera.' : 'Draft terbaru sudah tersimpan.');
                setValidationMessage('');
            },
            onError: (errors) => {
                setSaveState('error');
                setSaveMessage('Nilai belum tersimpan. Periksa koneksi atau coba lagi.');
                const penaltyError = Object.entries(errors).find(([key]) => key.startsWith('violation_penalties'))?.[1];
                setValidationMessage(errors.signature || errors.aspect_scores || penaltyError || 'Terjadi kesalahan saat menyimpan nilai.');
            },
            onFinish: () => onBusyChange(false),
        });
    };

    const selectScore = (key, value) => {
        const nextScores = { ...scores, [key]: value };
        setScores(nextScores);
        setSaveState('pending');
        setSaveMessage('Menunggu penyimpanan otomatis…');
        setValidationMessage('');
        onBusyChange(true);

        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => persist(nextScores, 'draft'), 450);
    };

    const updateSignature = (nextSignature) => {
        setSignature(nextSignature);
        setSaveState('pending');
        setSaveMessage('Menunggu penyimpanan tanda tangan…');
        setValidationMessage('');
        onBusyChange(true);

        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => persist(scores, 'draft', nextSignature, notes), 450);
    };

    const updateNotes = (nextNotes) => {
        setNotes(nextNotes);
        setSaveState('pending');
        setSaveMessage('Menunggu penyimpanan catatan…');
        onBusyChange(true);

        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => persist(scores, 'draft', signature, nextNotes), 600);
    };

    const updatePenalty = (key, quantity) => {
        const nextPenalties = { ...penalties, [key]: quantity };
        setPenalties(nextPenalties);
        setSaveState('pending');
        setSaveMessage('Menunggu penyimpanan pelanggaran…');
        setValidationMessage('');
        onBusyChange(true);

        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => persist(scores, 'draft', signature, notes, nextPenalties), 450);
    };

    const submitScore = (event) => {
        event.preventDefault();
        window.clearTimeout(saveTimer.current);

        if (totals.completed !== allCriteria.length) {
            setValidationMessage(`Lengkapi ${allCriteria.length - totals.completed} aspek yang masih kosong.`);
            setSaveState('error');
            onBusyChange(false);
            return;
        }

        if (!signature) {
            setValidationMessage('Bubuhkan tanda tangan digital sebelum mengirim nilai.');
            setSaveState('error');
            onBusyChange(false);
            return;
        }

        persist(scores, 'submitted', signature, notes, penalties);
    };

    const isSaving = saveState === 'saving';
    const statusTone = saveState === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : saveState === 'submitted'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-blue-100 bg-blue-50 text-blue-800';

    return (
        <form onSubmit={submitScore} className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                <div className="bg-[#17120f] p-4 text-white sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-200">Embu</span>
                                <span className="rounded-full bg-[#d4a843]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#f2cd73]">Juri {session.judge_number} · {session.role}</span>
                            </div>
                            <h2 className="mt-3 break-words text-xl font-black sm:text-2xl">{match.category_name}</h2>
                            <p className="mt-2 text-sm font-semibold text-[#f2cd73]">{match.participant_label || 'Peserta belum dicatat'}</p>
                            <p className="mt-1 text-xs text-white/65">Partai #{match.sequence} · {match.round_label} · {session.court_name}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 md:min-w-72">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                                <p className="text-[9px] font-bold uppercase text-white/55">Teknik</p>
                                <p className="mt-1 font-mono text-xl font-black text-white">{totals.technique}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                                <p className="text-[9px] font-bold uppercase text-white/55">Ekspresi</p>
                                <p className="mt-1 font-mono text-xl font-black text-white">{totals.expression}</p>
                            </div>
                            <div className="rounded-xl border border-[#d4a843]/40 bg-[#d4a843]/10 p-3 text-center">
                                <p className="text-[9px] font-bold uppercase text-[#f2cd73]">Total</p>
                                <p className="mt-1 font-mono text-xl font-black text-[#f2cd73]">{totals.total}</p>
                            </div>
                        </div>
                    </div>
                    <ParticipantDetails participant={match.participant} />
                </div>
                <div className={`flex flex-col gap-2 border-t p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5 ${statusTone}`} role="status" aria-live="polite">
                    <span><i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : saveState === 'error' ? 'fa-triangle-exclamation' : 'fa-cloud-arrow-up'} mr-2`} aria-hidden="true" />{saveMessage}</span>
                    <span className="font-bold">{totals.completed}/{allCriteria.length} aspek terisi</span>
                </div>
            </section>

            {criteriaGroups.map((group) => (
                <section key={group.id} className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby={`${group.id}-title`}>
                    <div className="border-b border-[#eee8e0] pb-4">
                        <h3 id={`${group.id}-title`} className="text-base font-black text-[#17120f] sm:text-lg">{group.title}</h3>
                        <p className="mt-1 text-xs text-[#7a746e]">{group.subtitle}</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {group.items.map(([key, code, label]) => (
                            <CriterionCard
                                key={key}
                                code={code}
                                label={label}
                                value={scores[key]}
                                disabled={isSaving}
                                onSelect={(value) => selectScore(key, value)}
                            />
                        ))}
                    </div>
                </section>
            ))}

            {canManagePenalties && (
                <PenaltyPanel
                    match={match}
                    penalties={penalties}
                    penaltyTotal={penaltyTotal}
                    canManage
                    disabled={isSaving}
                    onChange={updatePenalty}
                />
            )}

            <section className="grid gap-5 rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]" aria-labelledby="signature-title">
                <div>
                    <h3 id="signature-title" className="text-base font-black text-[#17120f] sm:text-lg">Tanda Tangan Digital Wasit</h3>
                    <p className="mt-1 text-xs leading-5 text-[#7a746e]">Tanda tangan mengunci identitas {session.referee_name} sebagai Juri {session.judge_number} pada partai ini.</p>
                    <div className="mt-4"><SignaturePad value={signature} onChange={updateSignature} disabled={isSaving} /></div>
                </div>
                <label className="block">
                    <span className="text-sm font-black text-[#17120f]">Catatan Wasit <span className="font-normal text-[#8b8178]">(opsional)</span></span>
                    <textarea value={notes} disabled={isSaving} maxLength={1000} onChange={(event) => updateNotes(event.target.value)} rows={7} placeholder="Catatan teknik atau kejadian penting…" className="mt-3 min-h-36 w-full resize-y rounded-xl border border-[#d9d1c7] bg-[#fbfaf8] px-3 py-3 text-sm text-[#17120f] outline-none focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/15 disabled:cursor-not-allowed disabled:opacity-60" />
                    <span className="mt-2 block text-right text-[10px] font-semibold text-[#8b8178]">{notes.length}/1000</span>
                </label>
            </section>

            <section className="sticky bottom-3 z-20 rounded-2xl border border-[#d8c9ae] bg-white/95 p-4 shadow-xl backdrop-blur sm:bottom-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black text-[#17120f]">Total nilai Anda: <span className="font-mono text-xl text-[#c0392b]">{totals.total}/100</span></p>
                        {canManagePenalties && <p className="mt-1 text-xs font-bold text-rose-700">Denda teknis pertandingan: -{penaltyTotal} poin (diterapkan sekali pada hasil akhir).</p>}
                        <p className="mt-1 text-xs text-[#7a746e]">Jika lima Wasit mengirim nilai, nilai tertinggi dan terendah dibuang. Jika kurang, Panitera dapat mengunci nilai lengkap yang sudah terkirim.</p>
                        {validationMessage && <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{validationMessage}</p>}
                    </div>
                    <Button type="submit" loading={isSaving} disabled={totals.completed !== allCriteria.length || !signature || isSaving} className="min-h-12 w-full bg-[#17120f] px-6 text-white hover:bg-[#2a241f] lg:w-auto">
                        <i className="fa-solid fa-paper-plane mr-2 text-[#d4a843]" aria-hidden="true" />
                        {saveState === 'submitted' ? 'Kirim Ulang Nilai' : 'Kirim Penilaian'}
                    </Button>
                </div>
            </section>
        </form>
    );
}

export default function ArbitrationScoring({ activeEvent, refereeSession = null }) {
    const [scoreBusy, setScoreBusy] = useState(false);
    const activeMatch = refereeSession?.active_match;
    const isEmbu = activeMatch?.category_type?.toLowerCase() === 'embu';

    useEffect(() => {
        if (!window.Echo || !refereeSession?.court_id) return undefined;

        const channelName = activeMatch?.id
            ? `tournament-match.${activeMatch.id}`
            : `event-court.${refereeSession.court_id}`;
        const channel = window.Echo.private(channelName);
        const refreshMatchState = (event) => {
            if (event.event_id !== activeEvent.id) return;
            if (activeMatch?.id && event.match_id !== activeMatch.id) return;
            if (!activeMatch?.id && event.court_id !== refereeSession.court_id) return;
            if (!['save_result', 'reopen_result'].includes(event.action)) return;

            router.reload({
                only: ['refereeSession', 'flash'],
                preserveScroll: true,
                preserveState: false,
            });
        };
        const refreshPenalties = (event) => {
            if (event.event_id !== activeEvent.id || event.match_id !== activeMatch.id) return;

            router.reload({
                only: ['refereeSession'],
                preserveScroll: true,
                preserveState: false,
            });
        };

        channel.listen('.panitera.match-state.updated', refreshMatchState);
        if (activeMatch?.id) {
            channel.listen('.embu.penalties.updated', refreshPenalties);
        }

        return () => window.Echo.leave(channelName);
    }, [activeEvent.id, activeMatch?.id, refereeSession?.court_id]);

    useEffect(() => {
        if (scoreBusy) return undefined;

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['refereeSession'], preserveScroll: true, preserveState: true });
            }
        }, activeMatch ? 5000 : 2500);

        return () => window.clearInterval(interval);
    }, [activeMatch, scoreBusy]);

    return (
        <AdminLayout title="Penilaian Embu">
            <Head title="Penilaian Wasit Embu | Smart Perkemi" />

            <div className="space-y-5">
                {refereeSession?.is_checked_in && !refereeSession?.is_taken_over && activeMatch && isEmbu ? (
                    <EmbuScoreForm
                        key={`${activeMatch.id}-${refereeSession.judge_number}`}
                        activeEvent={activeEvent}
                        session={refereeSession}
                        onBusyChange={setScoreBusy}
                    />
                ) : (
                    <EmptyState session={refereeSession} activeEvent={activeEvent} />
                )}
            </div>
        </AdminLayout>
    );
}
