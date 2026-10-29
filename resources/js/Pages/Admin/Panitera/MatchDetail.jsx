import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import AdminLayout from '@/Layouts/AdminLayout';
import FlashMessage from './Partials/FlashMessage';
import PaniteraHeader from './Partials/PaniteraHeader';
import { CourtMonitorButtons } from './Partials/CourtMonitorLinks';
import RandoriScoreForm from './Partials/RandoriScoreForm';
import useSynchronizedTimer from './Partials/useSynchronizedTimer';
import useLiveTimer from './Partials/useLiveTimer';
import useTimerBell from './Partials/useTimerBell';
import TimerBellControls from './Partials/TimerBellControls';
import useAnnouncer from './Partials/useAnnouncer';
import VarReviewModal from './Partials/VarReviewModal';
import { displayedTimerSeconds } from './Partials/timerSynchronization';
import { http } from '@inertiajs/core';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const stageItems = [
    ['waiting', 'Pilih Partai', 'Partai dibuka dari tabel'],
    ['officials_called', 'Panggil Ofisial', 'Perangkat masuk ke court'],
    ['participants_called', 'Panggil Peserta', 'Atlet atau tim dipanggil'],
    ['in_progress', 'Mulai Tanding', 'Waktu pertandingan berjalan'],
    ['completed', 'Simpan Hasil', 'Nilai telah diverifikasi'],
];

const statusVariants = {
    pending: 'gray',
    ready: 'yellow',
    in_progress: 'purple',
    completed: 'green',
};

const formatTimer = (totalSeconds) => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

function currentStage(match) {
    if (match.status === 'completed') return 4;
    if (match.status === 'in_progress') return 3;
    if (match.call_status === 'participants_called') return 2;
    if (match.call_status === 'officials_called') return 1;
    return 0;
}

function ResultSummary({ match }) {
    if (!match.result) {
        return <p className="rounded-xl border border-dashed border-[#d9d3c9] bg-[#fbfaf8] p-6 text-center text-sm text-[#7a746e]">Hasil pertandingan belum diinput.</p>;
    }

    if (match.category_type === 'embu') {
        return (
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={match.result.status === 'verified' ? 'green' : 'yellow'}>
                        {match.result.status === 'verified' ? 'Terverifikasi' : match.result.status === 'ready_for_verification' ? 'Siap diverifikasi' : 'Draft Wasit'}
                    </Badge>
                    {match.result.is_disqualified && <Badge variant="red">Diskualifikasi</Badge>}
                    <span className="text-xs text-[#7a746e]">Skor tengah: {Number(match.result.middle_score).toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {match.result.judge_scores.map((score, index) => <Badge key={index} variant="blue">Juri {match.result.judge_numbers?.[index] || index + 1}: {Number(score).toFixed(2)}</Badge>)}
                </div>
                {match.result.is_disqualified && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
                        <i className="fa-solid fa-ban mr-2" aria-hidden="true" />{match.result.disqualification_reason}
                    </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-[#fbfaf8] p-3"><p className="text-[10px] font-bold uppercase text-[#7a746e]">Durasi</p><p className="mt-1 text-lg font-black">{match.result.duration_seconds ?? 0} detik</p></div>
                    <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Denda waktu</p><p className="mt-1 text-lg font-black text-amber-800">-{Number(match.result.time_penalty).toFixed(2)}</p></div>
                    <div className="rounded-xl bg-rose-50 p-3"><p className="text-[10px] font-bold uppercase text-rose-600">Denda pelanggaran</p><p className="mt-1 text-lg font-black text-rose-700">-{Number(match.result.violation_penalty || 0).toFixed(2)}</p></div>
                    <div className="rounded-xl bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Nilai Akhir</p><p className="mt-1 text-lg font-black text-emerald-800">{Number(match.result.final_score).toFixed(2)}</p></div>
                </div>
                {match.result.penalty_summaries?.length > 0 && (
                    <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">Pelanggaran dicatat oleh {match.result.penalty_recorded_by || 'Wasit Utama'}</p>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                            {match.result.penalty_summaries.map((penalty) => (
                                <li key={penalty.key} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
                                    <span className="font-semibold text-[#4a423b]">No. {penalty.number} · {penalty.label}{penalty.quantity > 1 ? ` × ${penalty.quantity}` : ''}</span>
                                    <span className="shrink-0 font-black text-rose-700">-{penalty.points}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={match.result.is_locked ? 'gray' : 'green'}>{match.result.is_locked ? 'Nilai terkunci' : 'Tersimpan · Belum dikunci'}</Badge>
                {match.result.is_locked && match.result.locked_at && <span className="text-xs text-[#7a746e]">Dikunci {match.result.locked_at}</span>}
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-xl border border-[#e5ded4]">
                <div className={`min-w-0 p-3 sm:p-4 ${match.result.winner_corner === 'aka' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <p className="text-[10px] font-bold uppercase text-rose-700">AKA · Merah</p>
                    <p className="mt-2 text-3xl font-black">{match.result.aka_total}</p>
                </div>
                <div className="flex items-center border-x border-[#e5ded4] px-2 text-[10px] font-black text-[#9b9188] sm:px-4 sm:text-xs">VS</div>
                <div className={`min-w-0 p-3 text-right sm:p-4 ${match.result.winner_corner === 'shiro' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <p className="text-[10px] font-bold uppercase text-slate-600">SHIRO · Putih</p>
                    <p className="mt-2 text-3xl font-black">{match.result.shiro_total}</p>
                </div>
            </div>
        </div>
    );
}

function JudgeProgressPanel({ judges = [] }) {
    return (
        <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="judge-progress-title">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 id="judge-progress-title" className="font-bold text-[#17120f]">Progres Penilaian 5 Wasit</h2>
                    <p className="mt-0.5 text-xs text-[#7a746e]">Nilai berubah otomatis saat Wasit menekan pilihan 7, 8, 9, atau 10.</p>
                </div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <span className="relative flex h-2.5 w-2.5" aria-hidden="true"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
                    Sinkronisasi live
                </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {judges.map((judge) => {
                    const isSubmitted = judge.status === 'submitted';
                    const isComplete = judge.completed_items === 10;

                    return (
                        <article key={judge.judge_number} className={`rounded-2xl border p-4 ${isSubmitted ? 'border-emerald-200 bg-emerald-50/60' : isComplete ? 'border-amber-200 bg-amber-50/60' : 'border-[#e8e1d8] bg-[#fbfaf8]'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-[#a56f1c]">Juri {judge.judge_number}</p>
                                    <p className="mt-1 text-xs font-bold text-[#17120f]">{judge.role}</p>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${judge.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{judge.is_active ? 'Aktif' : 'Belum scan'}</span>
                            </div>
                            <p className="mt-3 min-h-10 text-xs font-semibold leading-5 text-[#504840]">{judge.referee_name}</p>
                            <p className={`mt-1 text-[10px] font-bold ${judge.is_signed ? 'text-emerald-700' : 'text-amber-700'}`}>
                                <i className={`fa-solid ${judge.is_signed ? 'fa-signature' : 'fa-pen-nib'} mr-1.5`} aria-hidden="true" />
                                {judge.is_signed ? 'Tanda tangan tercatat' : 'Belum tanda tangan'}
                            </p>
                            <div className="mt-3 flex items-end justify-between border-t border-black/5 pt-3">
                                <div>
                                    <p className="text-[9px] font-bold uppercase text-[#8b8178]">Aspek</p>
                                    <p className="mt-0.5 text-sm font-black text-[#17120f]">{judge.completed_items}/10</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold uppercase text-[#8b8178]">Nilai mentah</p>
                                    <p className="mt-0.5 font-mono text-xl font-black text-[#c0392b]">{Number(judge.total_score).toFixed(0)}</p>
                                </div>
                            </div>
                            <p className="mt-2 text-[10px] font-semibold text-[#7a746e]">{isSubmitted ? 'Sudah dikirim' : isComplete ? 'Draft lengkap' : 'Sedang menilai'}{judge.updated_at ? ` · ${judge.updated_at}` : ''}</p>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function initialPenaltyValues(penaltyState) {
    return Object.fromEntries(
        (penaltyState?.options || []).map((option) => [option.key, Number(penaltyState?.values?.[option.key] || 0)]),
    );
}

function EmbuPenaltyEditor({ activeEventId, canManage, penaltyState }) {
    const [values, setValues] = useState(() => initialPenaltyValues(penaltyState));
    const [processing, setProcessing] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [saveError, setSaveError] = useState('');
    const options = penaltyState?.options || [];
    const penaltyTotal = useMemo(() => options.reduce(
        (total, option) => total + (Number(values[option.key] || 0) * Number(option.points || 0)),
        0,
    ), [options, values]);
    const disabled = !canManage || !penaltyState?.can_edit || processing;

    useEffect(() => {
        setValues(initialPenaltyValues(penaltyState));
    }, [penaltyState]);

    if (!penaltyState) return null;

    const updateValue = (key, value) => {
        if (disabled) return;

        setValues((current) => ({ ...current, [key]: value }));
        setSaveError('');
    };

    const save = () => {
        router.put(penaltyState.update_url, {
            event_id: activeEventId,
            violation_penalties: values,
        }, {
            preserveScroll: true,
            onStart: () => {
                setProcessing(true);
                setSaveError('');
            },
            onSuccess: () => setConfirmationOpen(false),
            onError: (responseErrors) => {
                const penaltyError = Object.entries(responseErrors)
                    .find(([key]) => key.startsWith('violation_penalties'))?.[1];
                setSaveError(penaltyError || 'Denda teknis belum dapat disimpan. Silakan coba lagi.');
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="panitera-penalty-title">
            <div className="flex flex-col gap-3 border-b border-[#eee8e0] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a56f1c]">Sanksi pertandingan</p>
                    <h2 id="panitera-penalty-title" className="mt-1 text-base font-black text-[#17120f] sm:text-lg">Input Denda Teknis Embu</h2>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-[#7a746e]">Nomor 1 dihitung otomatis dari timer dan nomor 2 otomatis diskualifikasi bila durasi melebihi 3 menit. Pilih pelanggaran nomor 3–7 di bawah ini.</p>
                    <p className="mt-2 text-[11px] font-semibold text-[#7a746e]">Data ini digunakan bersama Wasit Utama. Perubahan terakhir dari Wasit Utama atau Panitera menjadi data resmi.</p>
                </div>
                <div className="shrink-0 rounded-xl bg-rose-50 px-4 py-3 text-left sm:text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-rose-600">Denda dipilih</p>
                    <p className="mt-1 font-mono text-xl font-black text-rose-700">-{penaltyTotal}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {options.map((option) => {
                    const quantity = Number(values[option.key] || 0);

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
                                        <button key={value} type="button" disabled={disabled} aria-pressed={quantity === value} onClick={() => updateValue(option.key, value)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === value ? 'border-rose-600 bg-rose-600 text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b] hover:border-rose-300'}`}>
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    <button type="button" disabled={disabled} aria-pressed={quantity === 0} onClick={() => updateValue(option.key, 0)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === 0 ? 'border-[#756a61] bg-[#756a61] text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b]'}`}>Tidak</button>
                                    <button type="button" disabled={disabled} aria-pressed={quantity === 1} onClick={() => updateValue(option.key, 1)} className={`min-h-11 rounded-xl border text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${quantity === 1 ? 'border-rose-600 bg-rose-600 text-white' : 'border-[#d9d1c7] bg-white text-[#4a423b]'}`}>Ya · -{option.points}</button>
                                </div>
                            )}
                        </fieldset>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e7dfd4] bg-[#fbfaf8] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-bold text-[#17120f]">Terakhir dicatat: {penaltyState.source_label}</p>
                    <p className="mt-1 text-[11px] text-[#7a746e]">Denda hanya dipotong satu kali dari nilai akhir, bukan dari setiap lembar juri.</p>
                </div>
                <Button
                    variant="danger"
                    iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}
                    disabled={disabled}
                    loading={processing}
                    onClick={() => setConfirmationOpen(true)}
                >
                    Simpan Denda Teknis
                </Button>
            </div>

            {!penaltyState.can_edit && (
                <p role="status" className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">Denda sudah dikunci karena hasil pertandingan telah disimpan.</p>
            )}
            {saveError && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{saveError}</p>}

            <AlertConfirm
                isOpen={confirmationOpen}
                title="Simpan denda teknis Embu?"
                message={`Denda teknis ${penaltyTotal} poin akan dipakai bersama Wasit Utama dan langsung menghitung ulang nilai akhir pertandingan.`}
                confirmText="Simpan Denda"
                cancelText="Periksa Lagi"
                variant="warning"
                isLoading={processing}
                error={saveError}
                onCancel={() => setConfirmationOpen(false)}
                onConfirm={save}
            />
        </section>
    );
}

export default function MatchDetail({ activeEvent, events = [], match: initialMatch, judgeProgress = [], nextMatch, canManage = false, serverNowMs, timerStateUrl }) {
    const { flash = {}, errors = {} } = usePage().props;
    const [workflowErrors, setWorkflowErrors] = useState({});
    const refreshLiveData = useCallback(() => {
        router.reload({
            only: ['match', 'judgeProgress', 'serverNow', 'serverNowMs'],
            preserveScroll: true,
            preserveState: true,
        });
    }, []);
    const initialTimerState = useMemo(() => ({
        event_id: activeEvent.id, match_id: initialMatch.id, timer: initialMatch.timer,
        match_status: initialMatch.status, call_status: initialMatch.call_status, server_now_ms: serverNowMs,
    }), [activeEvent.id, initialMatch, serverNowMs]);
    const liveTimer = useLiveTimer({
        initialState: initialTimerState, stateUrl: timerStateUrl,
        channelName: `tournament-match.${initialMatch.id}`, eventId: activeEvent.id,
        onChange: (next) => {
            if (!['start', 'pause', 'reset_timer', 'configure_timer'].includes(next.action)) refreshLiveData();
        },
    });
    const match = useMemo(() => {
        if (liveTimer.state?.match_id !== initialMatch.id) return initialMatch;
        const status = liveTimer.state.match_status;
        const callStatus = liveTimer.state.call_status;
        return {
            ...initialMatch, status, call_status: callStatus,
            status_label: { pending: 'Menunggu', ready: 'Siap Dipanggil', in_progress: 'Berlangsung', completed: 'Selesai' }[status] || initialMatch.status_label,
            call_status_label: { waiting: 'Belum Dipanggil', officials_called: 'Ofisial Dipanggil', participants_called: 'Peserta Dipanggil', completed: 'Selesai' }[callStatus] || initialMatch.call_status_label,
            timer: { ...initialMatch.timer, ...liveTimer.state.timer },
        };
    }, [initialMatch, liveTimer.state]);
    const [processingAction, setProcessingAction] = useState(null);
    const [varModalOpen, setVarModalOpen] = useState(false);
    const [finishConfirmationOpen, setFinishConfirmationOpen] = useState(false);
    const [saveResultConfirmationOpen, setSaveResultConfirmationOpen] = useState(false);
    const [reopenResultConfirmationOpen, setReopenResultConfirmationOpen] = useState(false);
    const timerDirection = match.timer.direction || (match.category_type === 'randori' ? 'down' : 'up');
    const [timerDurationSeconds, setTimerDurationSeconds] = useState(match.timer.duration_seconds || 120);
    const processingActionRef = useRef(processingAction);
    const elapsedMilliseconds = useSynchronizedTimer(match.timer, liveTimer.serverClock, match.id);
    const bell = useTimerBell({ timer: match.timer, elapsedMilliseconds, matchId: match.id, synchronized: liveTimer.synchronized });
    const announcer = useAnnouncer({ match });
    const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
    const displayedSeconds = displayedTimerSeconds(match.timer, elapsedMilliseconds);
    const timerExpired = match.timer.direction === 'down' && elapsedSeconds >= Number(match.timer.duration_seconds);
    const stage = currentStage(match);
    const workflowDisabled = !canManage || !match.court || match.is_placeholder || match.status === 'completed' || match.timer.is_finished;
    const callDisabled = !canManage || !match.court || match.is_placeholder;
    const timerWorkflowDisabled = workflowDisabled;
    const canOpenScore = canManage && !match.is_placeholder && (match.call_status === 'participants_called' || match.status === 'in_progress' || match.status === 'completed');
    const resultIndexUrl = `/admin/panitera/scoring/embu-result?event_id=${encodeURIComponent(activeEvent.id)}&category=${encodeURIComponent(match.category_id)}`;

    const [voiceEnabled, setVoiceEnabled] = useState(activeEvent.tts_announcer_enabled ?? true);

    const handleCallOfficials = () => {
        if (voiceEnabled) {
            announcer.callOfficials(match);
        }
        updateWorkflow('call_officials');
    };

    const handleCallParticipants = () => {
        if (voiceEnabled) {
            announcer.callParticipants(match);
        }
        updateWorkflow('call_participants');
    };

    useEffect(() => {
        processingActionRef.current = processingAction;
    }, [processingAction]);

    useEffect(() => {
        setTimerDurationSeconds(match.timer.duration_seconds || 120);
    }, [match.id, match.timer.direction, match.timer.duration_seconds]);

    useEffect(() => {
        if (!window.Echo) return undefined;

        const channelName = `tournament-match.${match.id}`;
        const channel = window.Echo.private(channelName);
        if (match.category_type === 'embu') {
            channel.listen('.embu.judge-score.updated', refreshLiveData);
            channel.listen('.embu.penalties.updated', refreshLiveData);
        }
        channel.listen('.var.updated', refreshLiveData);
        return () => {
            if (match.category_type === 'embu') {
                channel.stopListening('.embu.judge-score.updated', refreshLiveData);
                channel.stopListening('.embu.penalties.updated', refreshLiveData);
            }
            channel.stopListening('.var.updated', refreshLiveData);
        };
    }, [activeEvent.id, match.category_type, match.id, refreshLiveData]);

    useEffect(() => {
        if (match.category_type !== 'embu' || processingAction) return undefined;

        const fallback = window.setInterval(() => {
            if (document.visibilityState === 'visible') refreshLiveData();
        }, 15000);

        return () => window.clearInterval(fallback);
    }, [match.category_type, processingAction, refreshLiveData]);

    const updateWorkflow = async (action, payload = {}, callbacks = {}) => {
        if (processingActionRef.current) return;
        if (action === 'start') bell.prepareForStart();
        if (action === 'finish') bell.playClosingBell?.();
        processingActionRef.current = action;
        setProcessingAction(action);
        setWorkflowErrors({});
        try {
            const response = await http.getClient().request({
                method: 'put', url: `/admin/panitera/scoring/matches/${match.id}/workflow`,
                data: JSON.stringify({ event_id: activeEvent.id, action, timer_version: match.timer.version, ...payload }),
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            });
            liveTimer.acceptState({ ...JSON.parse(response.data), action });
            if (action === 'finish') setFinishConfirmationOpen(false);
            callbacks.onSuccess?.();
        } catch (error) {
            let responseErrors = { timer: 'Perintah belum dapat dikonfirmasi. Memuat status resmi terbaru…' };
            try { responseErrors = JSON.parse(error.response?.data)?.errors || responseErrors; } catch { /* Keep connection error. */ }
            setWorkflowErrors(responseErrors);
            callbacks.onError?.(responseErrors);
            await liveTimer.refresh();
        } finally {
            processingActionRef.current = null;
            setProcessingAction(null);
            callbacks.onFinish?.();
        }
    };

    const saveEmbuResult = () => {
        router.post(`/admin/panitera/scoring/matches/${match.id}/embu-result`, {
            event_id: activeEvent.id,
        }, {
            preserveScroll: true,
            onStart: () => setProcessingAction('save_result'),
            onSuccess: () => setSaveResultConfirmationOpen(false),
            onFinish: () => setProcessingAction(null),
        });
    };

    const reopenEmbuResult = () => {
        router.delete(match.embu_verification.reopen_url, {
            data: { event_id: activeEvent.id },
            preserveScroll: true,
            onStart: () => setProcessingAction('reopen_result'),
            onSuccess: () => setReopenResultConfirmationOpen(false),
            onFinish: () => setProcessingAction(null),
        });
    };

    return (
        <AdminLayout title="Detail Partai Panitera">
            <Head title={`Partai #${match.sequence} · ${match.category_name} | Smart Perkemi`} />

            <div className="space-y-5">
                <PaniteraHeader
                    title="Detail Partai Panitera"
                    description={match.category_type === 'embu'
                        ? 'Panggil ofisial dan peserta, jalankan waktu pertandingan, pantau lima Wasit, lalu verifikasi hasil.'
                        : 'Panggil ofisial dan peserta, jalankan waktu pertandingan, lalu catat dan sahkan hasil Randori langsung dari meja Panitera.'}
                    activeEvent={activeEvent}
                    events={events}
                    path="/admin/panitera/scoring"
                    icon="fa-clipboard-list"
                />
                <FlashMessage flash={flash} errors={{ ...errors, ...workflowErrors }} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/admin/panitera/scoring?event_id=${encodeURIComponent(activeEvent.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c0392b] sm:min-h-10">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Kembali ke Daftar
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant={match.category_type === 'embu' ? 'blue' : 'red'}>{match.category_type.toUpperCase()}</Badge>
                        <Badge variant={statusVariants[match.status] || 'gray'}>{match.status_label}</Badge>
                        <Badge variant={match.call_status === 'waiting' ? 'gray' : 'gold'}>{match.call_status_label}</Badge>
                    </div>
                </div>

                <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-sm">
                    <div className="border-b border-[#ede9e1] bg-[#fbfaf8] p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#9a6b20]">Partai #{match.sequence} · {match.round_label}</p>
                        <h1 className="mt-2 text-xl font-black text-[#17120f] md:text-2xl">{match.category_name}</h1>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6c635b]">
                            <span><i className="fa-solid fa-location-dot mr-2 text-[#c0392b]" aria-hidden="true" />{match.court || 'Court belum ditentukan'}</span>
                            <span><i className="fa-regular fa-clock mr-2 text-[#c0392b]" aria-hidden="true" />{match.scheduled_at || 'Belum dijadwalkan'}{match.scheduled_end_at ? `–${match.scheduled_end_at}` : ''}</span>
                            {match.pool && <span><i className="fa-solid fa-layer-group mr-2 text-[#c0392b]" aria-hidden="true" />Pool {match.pool}</span>}
                        </div>
                    </div>
                    <div className="p-4 sm:p-5">
                        {match.category_type === 'embu' ? (
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Peserta / Tim Embu</p>
                                <p className="mt-2 text-lg font-black text-[#17120f]">{match.participant_label || 'Peserta belum ditentukan'}</p>
                            </div>
                        ) : (
                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-2xl border border-[#e5ded4]">
                                <div className="min-w-0 bg-rose-50 p-3 sm:p-4 md:p-5"><p className="text-[10px] font-bold uppercase text-rose-700">AKA · Merah</p><p className="mt-2 break-words text-sm font-black text-[#17120f] md:text-lg">{match.aka_label || 'Menunggu pemenang'}</p></div>
                                <div className="flex items-center border-x border-[#e5ded4] bg-white px-2 text-[10px] font-black text-[#9b9188] sm:px-3 sm:text-xs md:px-5">VS</div>
                                <div className="min-w-0 bg-slate-50 p-3 text-right sm:p-4 md:p-5"><p className="text-[10px] font-bold uppercase text-slate-600">SHIRO · Putih</p><p className="mt-2 break-words text-sm font-black text-[#17120f] md:text-lg">{match.shiro_label || 'Menunggu pemenang'}</p></div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="workflow-title">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div><h2 id="workflow-title" className="font-bold text-[#17120f]">Status Alur Partai</h2><p className="mt-0.5 text-xs text-[#7a746e]">Ikuti urutan dari kiri ke kanan sebelum input hasil.</p></div>
                        <p className="text-xs font-semibold text-[#9a6b20]">{match.called_at ? `Panggilan terakhir ${match.called_at}` : 'Belum ada panggilan'}</p>
                    </div>
                    <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {stageItems.map(([key, label, description], index) => {
                            const done = index <= stage;
                            return (
                                <li key={key} className={`rounded-xl border p-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-[#e5ded4] bg-[#fbfaf8]'}`}>
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{done ? <i className="fa-solid fa-check" aria-hidden="true" /> : index + 1}</div>
                                    <p className="mt-2 text-xs font-bold text-[#17120f]">{label}</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-[#7a746e]">{description}</p>
                                </li>
                            );
                        })}
                    </ol>
                    <div className="mt-5 flex flex-col gap-3 border-t border-[#eee8e0] pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-bold text-[#17120f]">Kontrol Panggilan</p>
                                <Button
                                    variant={voiceEnabled ? 'gold' : 'secondary'}
                                    size="xs"
                                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                                    iconLeft={<i className={`fa-solid ${voiceEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}`} aria-hidden="true" />}
                                    title="Klik untuk mengaktifkan atau menonaktifkan suara Google TTS"
                                >
                                    {voiceEnabled ? 'Suara Aktif' : 'Suara Mati'}
                                </Button>
                            </div>
                            <p className="mt-1 text-[11px] leading-5 text-[#7a746e]">{match.category_type === 'embu'
                                ? 'Panggil ofisial dan peserta dengan suara pengumuman otomatis (TTS). Suara dapat diaktifkan atau dimatikan kapan saja.'
                                : 'Panggil ofisial dan peserta sebelum Panitera mencatat hasil Randori. Suara dapat diaktifkan atau dimatikan kapan saja.'}</p>
                        </div>
                        {match.court ? (
                            <div className="flex flex-col items-stretch gap-2 sm:items-end">
                                <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
                                    <Button
                                        variant="outline"
                                        iconLeft={<i className="fa-solid fa-bullhorn" aria-hidden="true" />}
                                        disabled={callDisabled}
                                        loading={processingAction === 'call_officials'}
                                        onClick={handleCallOfficials}
                                        title="Panggil ofisial dengan pengumuman suara (dapat diulang)"
                                    >
                                        {announcer.officialCallCount > 0 ? 'Panggil Ulang Ofisial' : 'Panggil Ofisial'}
                                    </Button>
                                    <Button
                                        variant="gold"
                                        iconLeft={<i className="fa-solid fa-users" aria-hidden="true" />}
                                        disabled={callDisabled}
                                        loading={processingAction === 'call_participants'}
                                        onClick={handleCallParticipants}
                                        title="Panggil peserta dengan pengumuman suara (dapat diulang)"
                                    >
                                        {announcer.participantCallCount > 0 ? 'Panggil Ulang Peserta' : 'Panggil Peserta'}
                                    </Button>
                                </div>
                                {announcer.isPlaying && (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                                            <i className="fa-solid fa-volume-high text-amber-700" aria-hidden="true" />
                                            <span className="font-semibold">Pengumuman suara sedang berjalan…</span>
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="xs"
                                            iconLeft={<i className="fa-solid fa-stop" aria-hidden="true" />}
                                            onClick={announcer.stop}
                                        >
                                            Hentikan
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Atur court pertandingan terlebih dahulu dari menu Jadwal Pertandingan.</p>
                        )}
                    </div>
                    {match.court_id && (
                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e7dfd4] bg-[#fbfaf8] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                            <div>
                                <p className="text-xs font-bold text-[#17120f]">Monitor TV · {match.court}</p>
                                <p className="mt-1 text-[11px] leading-5 text-[#7a746e]">Klik mode yang dibutuhkan. Monitor terbuka pada tab baru dan mengikuti partai aktif di court ini.</p>
                            </div>
                            <div className="w-full sm:w-auto sm:min-w-[360px]">
                                <CourtMonitorButtons courtId={match.court_id} eventId={activeEvent.id} />
                            </div>
                        </div>
                    )}
                </section>

                {/* Video Assistant Review (VAR) Section - Di-hide sementara sesuai permintaan */}
                {false && (
                    <section className={`rounded-2xl border p-4 shadow-sm sm:p-5 transition-all ${
                        match.var_review?.active_review
                            ? 'border-amber-400 bg-amber-50/80'
                            : 'border-[#e5ded4] bg-white'
                    }`} aria-labelledby="var-module-title">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-3">
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base ${
                                    match.var_review?.active_review
                                        ? 'bg-amber-500 text-black animate-pulse'
                                        : 'bg-[#f4efe8] text-[#8c5b17]'
                                }`}>
                                    <i className="fa-solid fa-video" aria-hidden="true" />
                                </span>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 id="var-module-title" className="text-sm font-bold text-[#17120f] sm:text-base">
                                            Modul Video Assistant Review (VAR)
                                        </h2>
                                        {match.var_review?.active_review ? (
                                            <Badge variant="yellow" className="animate-pulse">
                                                <i className="fa-solid fa-circle text-[8px] mr-1" />
                                                Sedang Diperiksa
                                            </Badge>
                                        ) : (
                                            <Badge variant="gray">Siap Digunakan</Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-[#7a746e]">
                                        {match.var_review?.active_review
                                            ? `Tantangan oleh ${match.var_review.active_review.requested_by_label}: "${match.var_review.active_review.reason}". Waktu pertandingan dijeda otomatis.`
                                            : 'Tantangan video multi-kamera oleh ofisial sudut atau inisiatif Wasit. Memulai review otomatis menjeda waktu.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Card Badges */}
                                <div className="flex items-center gap-2 rounded-xl border border-[#e5ded4] bg-[#fbfaf8] px-3 py-1.5 text-xs">
                                    <span className="font-bold text-rose-700">Kartu AKA:</span>
                                    <span className={`font-black ${match.var_review?.cards_remaining?.aka > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                        {match.var_review?.cards_remaining?.aka ?? 1}/1
                                    </span>
                                    <span className="mx-1 text-slate-300">|</span>
                                    <span className="font-bold text-slate-700">SHIRO:</span>
                                    <span className={`font-black ${match.var_review?.cards_remaining?.shiro > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {match.var_review?.cards_remaining?.shiro ?? 1}/1
                                    </span>
                                </div>

                                <Button
                                    variant={match.var_review?.active_review ? 'gold' : 'secondary'}
                                    iconLeft={<i className="fa-solid fa-video" aria-hidden="true" />}
                                    onClick={() => setVarModalOpen(true)}
                                >
                                    {match.var_review?.active_review ? 'Buka Putusan VAR' : 'Buka Panel VAR'}
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="match-timer-title">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)] lg:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 id="match-timer-title" className="font-bold text-[#17120f]">Waktu Pertandingan</h2>
                                <span className="rounded-full bg-[#fff4cf] px-2.5 py-1 text-[10px] font-bold uppercase text-[#9a6b20]">{timerDirection === 'down' ? 'Mode Mundur' : 'Mode Maju'}</span>
                            </div>
                            <p className={`mt-3 font-mono text-5xl font-black tracking-tight sm:text-6xl ${timerExpired ? 'text-rose-600' : 'text-[#17120f]'}`} aria-live="off">{match.timer.status === 'running' && !liveTimer.synchronized ? '--:--' : formatTimer(displayedSeconds)}</p>
                            <p className="mt-2 text-xs font-semibold text-[#7a746e]">{!liveTimer.synchronized && match.timer.status === 'running' ? 'Menyinkronkan jam server…' : match.timer.is_finished ? 'Pertandingan selesai · durasi resmi terkunci' : timerExpired ? 'Waktu habis' : match.timer.status === 'running' ? 'Sedang berjalan' : match.timer.status === 'paused' ? 'Dijeda' : 'Belum dimulai'}{liveTimer.synchronized && (liveTimer.connected ? ' · Reverb terhubung' : liveTimer.httpConnected ? ' · Sinkronisasi cadangan' : ' · Koneksi terputus, menunggu status resmi')}</p>
                        </div>

                        <div className={`grid gap-2 ${match.category_type === 'embu' ? 'sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3' : 'sm:grid-cols-2'}`}>
                            {match.timer.status === 'running' && !timerExpired ? (
                                <Button iconLeft={<i className="fa-solid fa-pause" aria-hidden="true" />} disabled={timerWorkflowDisabled} loading={processingAction === 'pause'} onClick={() => updateWorkflow('pause')}>Jeda Waktu</Button>
                            ) : (
                                <Button iconLeft={<i className="fa-solid fa-play" aria-hidden="true" />} disabled={timerWorkflowDisabled || match.call_status !== 'participants_called'} loading={processingAction === 'start'} onClick={() => updateWorkflow('start')}>{timerExpired ? `Mulai Lagi · ${formatTimer(match.timer.duration_seconds)}` : match.timer.status === 'paused' ? 'Lanjutkan Waktu' : 'Mulai Pertandingan'}</Button>
                            )}
                            <Button variant="outline" iconLeft={<i className="fa-solid fa-rotate-left" aria-hidden="true" />} disabled={timerWorkflowDisabled || elapsedSeconds === 0} loading={processingAction === 'reset_timer'} onClick={() => updateWorkflow('reset_timer')}>Reset Waktu</Button>
                            {match.category_type === 'embu' && (
                                <Button
                                    variant="gold"
                                    iconLeft={<i className="fa-solid fa-flag-checkered" aria-hidden="true" />}
                                    disabled={timerWorkflowDisabled || elapsedSeconds < 1 || !['running', 'paused'].includes(match.timer.status)}
                                    loading={processingAction === 'finish'}
                                    onClick={() => {
                                        bell.playClosingBell?.();
                                        updateWorkflow('finish');
                                    }}
                                >
                                    Selesai Pertandingan
                                </Button>
                            )}
                        </div>
                    </div>

                    {match.timer.is_finished && (
                        <div role="status" className="mt-5 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Status</p>
                                <p className="mt-1 text-sm font-black text-emerald-950">Pertandingan selesai</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Durasi resmi</p>
                                <p className="mt-1 font-mono text-xl font-black text-emerald-950">{formatTimer(match.timer.elapsed_seconds)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Denda {match.timer.penalty_category}</p>
                                <p className="mt-1 text-xl font-black text-emerald-950">{Number(match.timer.time_penalty || 0).toFixed(0)} poin</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-5 grid gap-4 border-t border-[#eee8e0] pt-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
                        <div>
                            <p className="text-xs font-bold text-[#17120f]">{match.category_type === 'embu' ? 'Embu · Otomatis Maju' : 'Randori · Otomatis Mundur'}</p>
                            <p className="mt-2 text-xs leading-5 text-[#7a746e]">
                                {match.category_type === 'embu'
                                    ? (match.timer.is_tandoku
                                        ? 'Bel saat mulai, 01:00, dan 01:30. Waktu terus berjalan hingga Selesai Pertandingan.'
                                        : 'Bel saat mulai dan 01:30. Waktu terus berjalan hingga Selesai Pertandingan.')
                                    : 'Bel saat mulai dan 00:00. Setelah waktu habis, tekan Mulai Lagi untuk mengulang durasi.'}
                            </p>
                        </div>
                        <label htmlFor="timer-duration" className="block">
                            <span className="text-xs font-bold text-[#17120f]">Durasi acuan (detik)</span>
                            <input id="timer-duration" type="number" min="10" max="3600" value={timerDurationSeconds} disabled={timerWorkflowDisabled || match.timer.status === 'running'} onChange={(event) => setTimerDurationSeconds(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold outline-none focus:border-[#c0392b] focus:ring-2 focus:ring-[#c0392b]/15 disabled:cursor-not-allowed disabled:opacity-50" />
                        </label>
                        <Button variant="outline" disabled={timerWorkflowDisabled || match.timer.status === 'running' || Number(timerDurationSeconds) < 10 || Number(timerDurationSeconds) > 3600} loading={processingAction === 'configure_timer'} onClick={() => updateWorkflow('configure_timer', { timer_direction: timerDirection, timer_duration_seconds: Number(timerDurationSeconds) })} iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}>Simpan Durasi</Button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee8e0] pt-4">
                        <p className="text-xs text-[#7a746e]">Aktifkan bel pada perangkat yang digunakan sebagai pengeras suara.</p>
                        <TimerBellControls bell={bell} />
                    </div>
                </section>

                {match.category_type === 'embu' && <JudgeProgressPanel judges={judgeProgress} />}

                {match.category_type === 'embu' && canManage && (
                    <EmbuPenaltyEditor
                        activeEventId={activeEvent.id}
                        canManage={canManage}
                        penaltyState={match.embu_penalties}
                    />
                )}

                <section className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><h2 className="font-bold text-[#17120f]">Hasil {match.category_type === 'embu' ? 'Embu' : 'Randori'}</h2><p className="mt-0.5 text-xs text-[#7a746e]">{match.result?.verified_at ? `Diverifikasi ${match.result.verified_at}` : 'Masukkan hasil setelah peserta dipanggil.'}</p></div>
                        {match.category_type === 'embu' && match.timer.is_finished && !match.embu_verification?.is_saved ? (
                            <Button
                                variant="gold"
                                iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}
                                disabled={!match.embu_verification?.can_save}
                                loading={processingAction === 'save_result'}
                                onClick={() => setSaveResultConfirmationOpen(true)}
                            >
                                Simpan Nilai Embu
                            </Button>
                        ) : match.category_type === 'embu' && match.embu_verification?.is_saved ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    variant="danger"
                                    iconLeft={<i className="fa-solid fa-lock-open" aria-hidden="true" />}
                                    disabled={!canManage}
                                    loading={processingAction === 'reopen_result'}
                                    onClick={() => setReopenResultConfirmationOpen(true)}
                                >
                                    Buka Ulang Form Wasit
                                </Button>
                                <Link href={resultIndexUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                                    <i className="fa-solid fa-ranking-star" aria-hidden="true" />
                                    Lihat di Hasil Embu
                                </Link>
                            </div>
                        ) : match.category_type === 'randori' && canOpenScore ? (
                            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-semibold text-emerald-800">
                                <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                                Form input tersedia di bawah
                            </span>
                        ) : (
                            <span className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-500">Panggil peserta terlebih dahulu</span>
                        )}
                    </div>
                    {match.category_type === 'embu' && match.timer.is_finished && !match.embu_verification?.is_saved && (
                        <div role="status" className={`mt-4 rounded-xl border p-3 text-xs leading-5 ${match.embu_verification?.can_save ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                            <p className="font-bold">Nilai Wasit lengkap: {match.embu_verification?.completed_judges || 0}/{match.embu_verification?.required_judges || 5}</p>
                            <p className="mt-0.5">Tanda tangan tercatat: {match.embu_verification?.signed_judges || 0}/{match.embu_verification?.completed_judges || 0}</p>
                            <p className="mt-0.5">
                                {match.embu_verification?.completed_judges === 5
                                    ? 'Lima nilai lengkap akan diakumulasi. Nilai tertinggi dan terendah dibuang otomatis saat hasil disimpan, meskipun masih ada tanda tangan yang belum diisi.'
                                    : match.embu_verification?.can_save
                                        ? `${match.embu_verification.completed_judges} nilai lengkap siap diakumulasi tanpa menunggu tanda tangan atau lima Wasit.`
                                        : 'Minimal satu Wasit harus mengisi seluruh 10 aspek. Tanda tangan tidak menghalangi akumulasi nilai.'}
                            </p>
                        </div>
                    )}
                    <div className="mt-4"><ResultSummary match={match} /></div>
                </section>

                {match.category_type === 'randori' && canOpenScore && (
                    <RandoriScoreForm key={`${match.id}-${match.result?.verified_at || 'baru'}`} activeEvent={activeEvent} match={match} />
                )}

                {nextMatch && (
                    <section className="rounded-2xl border border-[#d4a843]/40 bg-[#fffaf0] p-4 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#9a6b20]">Antrean berikutnya di court ini</p><h2 className="mt-1 font-bold text-[#17120f]">{nextMatch.category_name}</h2><p className="mt-1 text-xs text-[#7a746e]">Partai #{nextMatch.sequence} · {nextMatch.round_label} · {nextMatch.scheduled_at || 'Belum dijadwalkan'}</p></div>
                            <Link href={`/admin/panitera/scoring/matches/${nextMatch.id}?event_id=${encodeURIComponent(activeEvent.id)}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d4a843] bg-white px-4 text-xs font-bold text-[#9a6b20] hover:bg-[#fff4cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a843] sm:w-auto sm:min-h-10">Buka Partai Berikutnya <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
                        </div>
                    </section>
                )}

                {/* finishConfirmationOpen AlertConfirm removed as per user request (no popup when timer finishes) */}
                <AlertConfirm
                    isOpen={saveResultConfirmationOpen}
                    title="Simpan nilai Embu?"
                    message={`${match.embu_verification?.completed_judges || 0} nilai Wasit yang sudah mengisi 10 aspek akan diakumulasi, termasuk yang belum bertanda tangan. Durasi resmi ${formatTimer(match.timer.elapsed_seconds)}, denda waktu ${Number(match.timer.time_penalty || 0).toFixed(0)} poin, dan denda pelanggaran ${Number(match.result?.violation_penalty || judgeProgress.find((judge) => judge.judge_number === 1)?.violation_penalty || 0).toFixed(0)} poin akan dikunci.${match.timer.elapsed_seconds > 180 ? ' Durasi melebihi 3 menit sehingga hasil ditetapkan diskualifikasi.' : ''} Papan penilaian Wasit otomatis kembali ke layar siaga setelah hasil disimpan.`}
                    confirmText="Simpan Nilai Embu"
                    cancelText="Periksa Lagi"
                    variant="warning"
                    isLoading={processingAction === 'save_result'}
                    error={errors.result || ''}
                    onCancel={() => setSaveResultConfirmationOpen(false)}
                    onConfirm={saveEmbuResult}
                />
                <AlertConfirm
                    isOpen={reopenResultConfirmationOpen}
                    title="Buka ulang form penilaian Wasit?"
                    message="Hasil resmi akan dikembalikan menjadi draft dan papan penilaian Wasit pada court ini langsung aktif kembali. Nilai lama tetap tersedia untuk dikoreksi, kemudian Panitera wajib menyimpan ulang hasilnya."
                    confirmText="Buka Ulang Form"
                    cancelText="Batal"
                    variant="danger"
                    isLoading={processingAction === 'reopen_result'}
                    error={errors.result || ''}
                    onCancel={() => setReopenResultConfirmationOpen(false)}
                    onConfirm={reopenEmbuResult}
                />

                <VarReviewModal
                    isOpen={varModalOpen}
                    onClose={() => setVarModalOpen(false)}
                    match={match}
                    activeEvent={activeEvent}
                    onReviewUpdated={refreshLiveData}
                />
            </div>
        </AdminLayout>
    );
}
