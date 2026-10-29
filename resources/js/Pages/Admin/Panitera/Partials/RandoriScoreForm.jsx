import Badge from '@/Components/UI/Elements/Badge';
import Button from '@/Components/UI/Elements/Button';
import AlertConfirm from '@/Components/UI/Feedback/AlertConfirm';
import Input from '@/Components/UI/Forms/Input';
import SignaturePad from '@/Components/UI/Forms/SignaturePad';
import Textarea from '@/Components/UI/Forms/Textarea';
import { http } from '@inertiajs/core';
import { router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

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
const normalizeSignatureNames = (names = {}) => Object.fromEntries(signatureLabels.map(([key]) => [key, typeof names?.[key] === 'string' ? names[key] : '']));
const calculateTotal = (breakdown) => scoreKeys.reduce((total, [key, , weight]) => total + (Number(breakdown[key]) || 0) * weight, 0);
const createSyncClientId = () => globalThis.crypto?.randomUUID?.() || `panitera-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const mergeDraftChanges = (current, incoming) => {
    const merged = { ...current, ...incoming };

    ['aka', 'shiro', 'signatures', 'signature_names'].forEach((key) => {
        if (current[key] || incoming[key]) merged[key] = { ...(current[key] || {}), ...(incoming[key] || {}) };
    });

    if (Object.hasOwn(incoming, 'decision_override')) {
        merged.decision_override = incoming.decision_override;
    }

    return merged;
};

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
    const draft = match.randori_draft || {};
    const isLocked = Boolean(existingScore?.is_locked);
    const clientIdRef = useRef(createSyncClientId());
    const persistedSignatures = normalizeSignatures(draft.signatures || existingScore?.signatures);
    const hasCompletePersistedSignatures = signatureLabels.every(([key]) => Boolean(persistedSignatures[key]));
    const initialDecisionOverride = draft.decision_override || existingScore?.decision_override || match.metadata?.result?.decision_override || null;
    const form = useForm({
        event_id: activeEvent.id,
        aka: { ...emptyBreakdown(), ...(draft.aka || existingScore?.aka_breakdown || {}) },
        shiro: { ...emptyBreakdown(), ...(draft.shiro || existingScore?.shiro_breakdown || {}) },
        signatures: persistedSignatures,
        signature_names: normalizeSignatureNames(draft.signature_names || existingScore?.signature_names),
        notes: draft.notes ?? existingScore?.notes ?? '',
        decision_override: initialDecisionOverride ? {
            type: initialDecisionOverride.type || '',
            affected_corner: initialDecisionOverride.affected_corner || '',
            disqualification_scope: initialDecisionOverride.disqualification_scope || 'match',
            reason: initialDecisionOverride.reason || '',
        } : null,
        return_to_match: true,
        sync_client_id: clientIdRef.current,
    });
    const lockForm = useForm({ event_id: activeEvent.id, sync_client_id: clientIdRef.current });
    const formDataRef = useRef(form.data);
    const formSetDataRef = useRef(form.setData);
    formSetDataRef.current = form.setData;
    const draftTimerRef = useRef(null);
    const draftRequestRef = useRef(null);
    const draftQueueRef = useRef(Promise.resolve());
    const pendingChangesRef = useRef({});
    const lastVersionRef = useRef(Number(draft.version) || 0);
    const [requiresResignature, setRequiresResignature] = useState(Boolean(existingScore && !hasCompletePersistedSignatures));
    const [saveConfirmationOpen, setSaveConfirmationOpen] = useState(false);
    const [lockConfirmationOpen, setLockConfirmationOpen] = useState(false);
    const [syncStatus, setSyncStatus] = useState(typeof window !== 'undefined' && window.Echo ? 'ready' : 'offline');
    const akaTotal = calculateTotal(form.data.aka);
    const shiroTotal = calculateTotal(form.data.shiro);
    const akaWazaAri = Number(form.data.aka?.waza_ari) || 0;
    const shiroWazaAri = Number(form.data.shiro?.waza_ari) || 0;
    const akaIppon = Number(form.data.aka?.ippon) || 0;
    const shiroIppon = Number(form.data.shiro?.ippon) || 0;
    const akaMujoken = Number(form.data.aka?.mujoken) || 0;
    const shiroMujoken = Number(form.data.shiro?.mujoken) || 0;

    const akaAutoIppon = akaWazaAri >= 2;
    const shiroAutoIppon = shiroWazaAri >= 2;
    const akaAbsoluteWin = akaMujoken >= 1 || akaIppon >= 1 || akaAutoIppon;
    const shiroAbsoluteWin = shiroMujoken >= 1 || shiroIppon >= 1 || shiroAutoIppon;

    const override = form.data.decision_override;
    const hasOverride = Boolean(override && override.type && override.affected_corner);

    let autoWinnerCorner = null;
    let autoWinReason = '';
    if (hasOverride) {
        if (override.type === 'medical_stop') {
            autoWinnerCorner = override.affected_corner === 'aka' ? 'shiro' : 'aka';
            autoWinReason = `Doctor Stop / Kiken Gachi (${override.affected_corner === 'aka' ? 'AKA Cedera Medis' : 'SHIRO Cedera Medis'})`;
        } else if (override.type === 'disqualification') {
            autoWinnerCorner = override.affected_corner === 'aka' ? 'shiro' : 'aka';
            const isGlobal = override.disqualification_scope === 'global';
            autoWinReason = isGlobal
                ? `Shikkaku Turnamen / Hansoku Gachi (${override.affected_corner === 'aka' ? 'AKA Diskualifikasi Global' : 'SHIRO Diskualifikasi Global'})`
                : `Hansoku Make / Hansoku Gachi (${override.affected_corner === 'aka' ? 'AKA Diskualifikasi Partai' : 'SHIRO Diskualifikasi Partai'})`;
        }
    } else if (akaAbsoluteWin && !shiroAbsoluteWin) {
        autoWinnerCorner = 'aka';
        autoWinReason = akaMujoken >= 1
            ? 'Mujoken Kachi'
            : akaIppon >= 1
                ? 'Ippon Kachi'
                : 'Waza-ari Awasete Ippon (2x Waza-ari)';
    } else if (shiroAbsoluteWin && !akaAbsoluteWin) {
        autoWinnerCorner = 'shiro';
        autoWinReason = shiroMujoken >= 1
            ? 'Mujoken Kachi'
            : shiroIppon >= 1
                ? 'Ippon Kachi'
                : 'Waza-ari Awasete Ippon (2x Waza-ari)';
    }

    const signedCount = signatureLabels.filter(([key]) => Boolean(form.data.signatures[key])).length;
    const signaturesComplete = signedCount === signatureLabels.length;
    const winnerLabel = autoWinnerCorner === 'aka'
        ? `AKA · ${match.aka_label} (${autoWinReason})`
        : autoWinnerCorner === 'shiro'
            ? `SHIRO · ${match.shiro_label} (${autoWinReason})`
            : akaTotal > shiroTotal
                ? `AKA · ${match.aka_label}`
                : `SHIRO · ${match.shiro_label}`;
    const confirmationError = form.errors.score
        || form.errors.result
        || form.errors.signatures
        || signatureLabels.map(([key]) => form.errors[`signatures.${key}`]).find(Boolean)
        || signatureLabels.map(([key]) => form.errors[`signature_names.${key}`]).find(Boolean)
        || '';
    const syncMessage = {
        ready: 'Reverb aktif · perubahan siap disinkronkan',
        waiting: 'Menunggu perubahan selesai…',
        saving: 'Menyinkronkan draft…',
        saved: 'Draft tersimpan dan disiarkan ke perangkat lain',
        remote: 'Perubahan dari perangkat lain diterapkan',
        offline: 'Reverb belum terhubung · draft tetap disimpan ke server',
        error: 'Draft belum tersinkron · periksa koneksi lalu ubah kembali nilai',
    }[syncStatus];

    const syncDraft = useCallback((changes) => {
        if (isLocked) return;

        draftQueueRef.current = draftQueueRef.current
            .catch(() => undefined)
            .then(async () => {
                const controller = new AbortController();
                draftRequestRef.current = controller;
                setSyncStatus('saving');

                try {
                    const response = await http.getClient().request({
                        method: 'put',
                        url: `/admin/panitera/scoring/randori-result/${match.id}/draft`,
                        data: JSON.stringify({
                            event_id: activeEvent.id,
                            client_id: clientIdRef.current,
                            changes,
                        }),
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                        },
                        signal: controller.signal,
                    });
                    const payload = response.data ? JSON.parse(response.data) : {};
                    lastVersionRef.current = Math.max(lastVersionRef.current, Number(payload.version) || 0);
                    setSyncStatus('saved');
                } catch (error) {
                    if (!controller.signal.aborted) setSyncStatus('error');
                }
            });
    }, [activeEvent.id, isLocked, match.id]);

    const queueDraftSync = useCallback((changes) => {
        if (isLocked) return;

        pendingChangesRef.current = mergeDraftChanges(pendingChangesRef.current, changes);
        window.clearTimeout(draftTimerRef.current);
        setSyncStatus('waiting');
        draftTimerRef.current = window.setTimeout(() => {
            const changesToSend = pendingChangesRef.current;
            pendingChangesRef.current = {};
            syncDraft(changesToSend);
        }, 350);
    }, [isLocked, syncDraft]);

    const setDataAndSync = (nextData, changes) => {
        formDataRef.current = nextData;
        form.setData(nextData);
        queueDraftSync(changes);
    };

    useEffect(() => {
        if (!window.Echo || isLocked) return undefined;

        const channel = window.Echo.private(`tournament-match.${match.id}`);
        const stopConnectionListener = window.Echo.connector?.onConnectionChange?.((status) => {
            setSyncStatus((current) => {
                if (status !== 'connected') return 'offline';

                return current === 'offline' || current === 'error' ? 'ready' : current;
            });
        });
        const handleRemoteState = (event) => {
            if (event.event_id !== activeEvent.id || event.match_id !== match.id) return;
            if (event.client_id === clientIdRef.current || Number(event.version) <= lastVersionRef.current) return;

            lastVersionRef.current = Number(event.version) || lastVersionRef.current;
            const changes = event.changes || {};
            const nextData = {
                ...formDataRef.current,
                ...(changes.aka ? { aka: { ...formDataRef.current.aka, ...changes.aka } } : {}),
                ...(changes.shiro ? { shiro: { ...formDataRef.current.shiro, ...changes.shiro } } : {}),
                ...(changes.signatures ? { signatures: normalizeSignatures({ ...formDataRef.current.signatures, ...changes.signatures }) } : {}),
                ...(changes.signature_names ? { signature_names: normalizeSignatureNames({ ...formDataRef.current.signature_names, ...changes.signature_names }) } : {}),
                ...(Object.hasOwn(changes, 'notes') ? { notes: changes.notes || '' } : {}),
                ...(Object.hasOwn(changes, 'decision_override') ? { decision_override: changes.decision_override } : {}),
            };

            formDataRef.current = nextData;
            formSetDataRef.current(nextData);
            setSyncStatus('remote');

            if (changes.aka || changes.shiro || Object.hasOwn(changes, 'notes') || Object.hasOwn(changes, 'decision_override')) {
                setRequiresResignature(Boolean(existingScore) || signatureLabels.some(([key]) => Boolean(nextData.signatures[key])));
            }

            if (event.action === 'result_saved' || event.action === 'result_locked') {
                router.reload({
                    only: ['match'],
                    preserveScroll: true,
                    preserveState: true,
                });
            }
        };

        setSyncStatus(window.Echo.connectionStatus?.() === 'connected' ? 'ready' : 'offline');
        channel
            .subscribed(() => setSyncStatus((current) => current === 'offline' ? 'ready' : current))
            .error(() => setSyncStatus('offline'))
            .listen('.randori.score-state.updated', handleRemoteState);

        return () => {
            stopConnectionListener?.();
            channel.stopListening('.randori.score-state.updated', handleRemoteState);
        };
    }, [activeEvent.id, Boolean(existingScore), isLocked, match.id]);

    useEffect(() => () => {
        window.clearTimeout(draftTimerRef.current);
        draftRequestRef.current?.abort();
    }, []);

    const changeScore = (corner, key, value) => {
        if (isLocked) return;
        if (String(formDataRef.current[corner][key]) === String(value)) return;

        const nextData = {
            ...formDataRef.current,
            [corner]: { ...formDataRef.current[corner], [key]: value },
            signatures: emptySignatures(),
        };
        setDataAndSync(nextData, {
            [corner]: { [key]: value },
            signatures: emptySignatures(),
        });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const changeNotes = (value) => {
        if (isLocked) return;
        if (formDataRef.current.notes === value) return;

        const nextData = {
            ...formDataRef.current,
            notes: value,
            signatures: emptySignatures(),
        };
        setDataAndSync(nextData, { notes: value, signatures: emptySignatures() });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const changeSignature = (key, value) => {
        if (isLocked) return;

        const nextData = {
            ...formDataRef.current,
            signatures: { ...formDataRef.current.signatures, [key]: value },
        };
        setDataAndSync(nextData, { signatures: { [key]: value } });
    };

    const changeSignatureName = (key, value) => {
        if (isLocked) return;

        const nextData = {
            ...formDataRef.current,
            signature_names: { ...formDataRef.current.signature_names, [key]: value },
        };
        setDataAndSync(nextData, { signature_names: { [key]: value } });
    };

    const toggleOverride = (enable) => {
        if (isLocked) return;
        const nextOverride = enable ? {
            type: 'medical_stop',
            affected_corner: 'aka',
            disqualification_scope: 'match',
            reason: '',
        } : null;

        const nextData = {
            ...formDataRef.current,
            decision_override: nextOverride,
            signatures: emptySignatures(),
        };
        setDataAndSync(nextData, { decision_override: nextOverride, signatures: emptySignatures() });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const changeOverrideField = (field, value) => {
        if (isLocked) return;
        const currentOverride = formDataRef.current.decision_override || {
            type: 'medical_stop',
            affected_corner: 'aka',
            disqualification_scope: 'match',
            reason: '',
        };
        const nextOverride = {
            ...currentOverride,
            [field]: value,
        };
        const nextData = {
            ...formDataRef.current,
            decision_override: nextOverride,
            signatures: emptySignatures(),
        };
        setDataAndSync(nextData, { decision_override: nextOverride, signatures: emptySignatures() });
        setRequiresResignature(Boolean(existingScore) || signedCount > 0);
    };

    const requestSaveConfirmation = (event) => {
        event.preventDefault();

        if (isLocked || (akaTotal === shiroTotal && !autoWinnerCorner) || !signaturesComplete || form.processing) return;

        setSaveConfirmationOpen(true);
    };

    const submitScore = async () => {
        if (isLocked) return;

        window.clearTimeout(draftTimerRef.current);
        if (Object.keys(pendingChangesRef.current).length > 0) {
            const changesToSend = pendingChangesRef.current;
            pendingChangesRef.current = {};
            syncDraft(changesToSend);
        }
        await draftQueueRef.current;

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
                {!isLocked && (
                    <div aria-live="polite" className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${syncStatus === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : syncStatus === 'offline' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${syncStatus === 'saving' || syncStatus === 'waiting' ? 'animate-pulse bg-amber-500' : syncStatus === 'error' ? 'bg-rose-500' : syncStatus === 'offline' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {syncMessage}
                    </div>
                )}

                <div className="grid gap-4 xl:grid-cols-2">
                    <ScoreFields corner="aka" label={match.aka_label} values={form.data.aka} errors={form.errors} disabled={isLocked} onChange={(key, value) => changeScore('aka', key, value)} />
                    <ScoreFields corner="shiro" label={match.shiro_label} values={form.data.shiro} errors={form.errors} disabled={isLocked} onChange={(key, value) => changeScore('shiro', key, value)} />
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h3 className="flex items-center gap-2 text-sm font-black text-rose-950">
                                <i className="fa-solid fa-triangle-exclamation text-rose-600" aria-hidden="true" />
                                Keputusan Khusus Wasit & Tim Medis (Stop Medis / Diskualifikasi)
                            </h3>
                            <p className="mt-0.5 text-xs text-rose-800/80">
                                Gunakan saat terjadi cedera fisik yang diputuskan dokter pertandingan (Doctor Stop) atau pelanggaran wasit (Hansoku Make / Shikkaku).
                            </p>
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-900 shadow-xs hover:bg-rose-50">
                            <input
                                type="checkbox"
                                checked={Boolean(form.data.decision_override)}
                                disabled={isLocked}
                                onChange={(e) => toggleOverride(e.target.checked)}
                                className="h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span>Aktifkan Keputusan Khusus</span>
                        </label>
                    </div>

                    {form.data.decision_override && (
                        <div className="mt-4 space-y-4 rounded-xl border border-rose-200 bg-white p-4 shadow-xs">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-xs font-black text-slate-800">
                                        Jenis Keputusan
                                    </label>
                                    <select
                                        value={form.data.decision_override.type}
                                        disabled={isLocked}
                                        onChange={(e) => changeOverrideField('type', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                    >
                                        <option value="medical_stop">Stop Medis (Doctor Stop / Kiken Gachi)</option>
                                        <option value="disqualification">Diskualifikasi Wasit (Hansoku Make / Shikkaku)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-black text-slate-800">
                                        Sudut yang Mengalami Cedera / Melanggar
                                    </label>
                                    <select
                                        value={form.data.decision_override.affected_corner}
                                        disabled={isLocked}
                                        onChange={(e) => changeOverrideField('affected_corner', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                    >
                                        <option value="aka">AKA (Merah) · {match.aka_label}</option>
                                        <option value="shiro">SHIRO (Putih) · {match.shiro_label}</option>
                                    </select>
                                </div>
                            </div>

                            {form.data.decision_override.type === 'disqualification' && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-black text-slate-800">
                                        Cakupan Sanksi Diskualifikasi
                                    </label>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${form.data.decision_override.disqualification_scope === 'match' ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                            <input
                                                type="radio"
                                                name="disqualification_scope"
                                                value="match"
                                                checked={form.data.decision_override.disqualification_scope === 'match'}
                                                disabled={isLocked}
                                                onChange={(e) => changeOverrideField('disqualification_scope', e.target.value)}
                                                className="mt-0.5 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div>
                                                <span className="block font-black">Hansoku Make (Partai Ini Saja)</span>
                                                <span className="text-[11px] font-normal text-slate-600">Diskualifikasi hanya berlaku untuk partai randori saat ini.</span>
                                            </div>
                                        </label>
                                        <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${form.data.decision_override.disqualification_scope === 'global' ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                            <input
                                                type="radio"
                                                name="disqualification_scope"
                                                value="global"
                                                checked={form.data.decision_override.disqualification_scope === 'global'}
                                                disabled={isLocked}
                                                onChange={(e) => changeOverrideField('disqualification_scope', e.target.value)}
                                                className="mt-0.5 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div>
                                                <span className="block font-black text-rose-700">Shikkaku (Global Turnamen)</span>
                                                <span className="text-[11px] font-normal text-slate-600">Pelanggaran berat disiplin. Atlet otomatis diblokir di seluruh nomor pertandingan turnamen ini.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Input
                                    label="Alasan Medis / Catatan Pelanggaran Wasit"
                                    value={form.data.decision_override.reason || ''}
                                    disabled={isLocked}
                                    placeholder={form.data.decision_override.type === 'medical_stop' ? 'Misal: Cedera dislokasi bahu kanan / rekomendasi dokter pertandingan tidak layak tanding' : 'Misal: Serangan terlarang berulang / tindakan tidak sportif kepada wasit'}
                                    onChange={(e) => changeOverrideField('reason', e.target.value)}
                                    error={form.errors['decision_override.reason']}
                                />
                            </div>

                            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs leading-5 text-rose-900">
                                <i className="fa-solid fa-circle-info mr-1.5 text-rose-600" aria-hidden="true" />
                                {form.data.decision_override.type === 'medical_stop' ? (
                                    <>
                                        <strong>Doctor Stop / Kiken Gachi:</strong> Sudut lawan otomatis memenangkan partai. Atlet sudut {form.data.decision_override.affected_corner === 'aka' ? 'AKA' : 'SHIRO'} akan ditandai dengan status kompetisi <span className="font-mono font-bold text-rose-700">[stopped]</span> dan dicegah melaju ke babak berikutnya / lower bracket.
                                    </>
                                ) : (
                                    <>
                                        <strong>Hansoku Gachi:</strong> Sudut lawan otomatis memenangkan partai. Atlet sudut {form.data.decision_override.affected_corner === 'aka' ? 'AKA' : 'SHIRO'} didiskualifikasi {form.data.decision_override.disqualification_scope === 'global' ? 'dari seluruh nomor turnamen (Shikkaku)' : 'dari partai ini (Hansoku Make)'}.
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {autoWinnerCorner && (
                    <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-900 shadow-xs">
                        <i className="fa-solid fa-trophy text-amber-500 text-base" aria-hidden="true" />
                        <div>
                            <p className="text-[10px] uppercase tracking-wide text-emerald-700">Kemenangan Mutlak Terdeteksi</p>
                            <p className="mt-0.5 text-sm font-black text-emerald-950">
                                {autoWinReason}: Sudut {autoWinnerCorner === 'aka' ? 'AKA (Merah)' : 'SHIRO (Putih)'} otomatis dinyatakan sebagai pemenang!
                            </p>
                        </div>
                    </div>
                )}

                {akaTotal === shiroTotal && !autoWinnerCorner && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">Skor masih sama. Tambahkan Yusei Kachi atau Mujoken Kachi kepada pemenang sebelum menyimpan.</div>}
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
                                    onChange={(value) => changeSignature(key, value)}
                                    disabled={form.processing || lockForm.processing || isLocked}
                                    label={`Area tanda tangan digital ${label}`}
                                    height={140}
                                    error={form.errors[`signatures.${key}`]}
                                />
                                <Input
                                    id={`signature-name-${key}`}
                                    label="Nama penandatangan (opsional)"
                                    value={form.data.signature_names[key]}
                                    maxLength={120}
                                    disabled={form.processing || lockForm.processing || isLocked}
                                    error={form.errors[`signature_names.${key}`]}
                                    placeholder={`Nama ${label}`}
                                    containerClassName="mt-3 w-full"
                                    onChange={(event) => changeSignatureName(key, event.target.value)}
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
                            <Button type="submit" variant={existingScore ? 'outline' : 'primary'} className="w-full sm:w-auto" loading={form.processing} disabled={lockForm.processing || (akaTotal === shiroTotal && !autoWinnerCorner) || !signaturesComplete} iconLeft={<i className="fa-solid fa-floppy-disk" aria-hidden="true" />}>{existingScore ? 'Simpan Perubahan Nilai' : 'Simpan Hasil Nilai'}</Button>
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
