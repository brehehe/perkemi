import Button from '@/Components/UI/Elements/Button';
import Badge from '@/Components/UI/Elements/Badge';
import { http } from '@inertiajs/core';
import { useEffect, useRef, useState } from 'react';

const CAMERA_ANGLES = [
    { id: 'cam_table', label: 'Meja Panitera', icon: 'fa-table-cells' },
    { id: 'cam_corner_aka', label: 'Sudut AKA (Merah)', icon: 'fa-video' },
    { id: 'cam_corner_shiro', label: 'Sudut SHIRO (Putih)', icon: 'fa-video' },
    { id: 'cam_overhead', label: 'Tatami Atas', icon: 'fa-compass' },
];

export default function VarReviewModal({
    isOpen,
    onClose,
    match,
    activeEvent,
    onReviewUpdated,
}) {
    const activeReview = match?.var_review?.active_review;
    const cards = match?.var_review?.cards_remaining || { aka: 1, shiro: 1 };
    const recentReviews = match?.var_review?.recent_reviews || [];

    // State for initiating a new challenge
    const [requestCorner, setRequestCorner] = useState('aka');
    const [requestRole, setRequestRole] = useState('aka_coach');
    const [requestReason, setRequestReason] = useState('Tantangan Poin / Pelanggaran');
    const [selectedAngle, setSelectedAngle] = useState('cam_table');
    const [videoUrlInput, setVideoUrlInput] = useState('');

    // State for resolving review
    const [verdictStatus, setVerdictStatus] = useState('overturned');
    const [verdictNotes, setVerdictNotes] = useState('');
    const [reviewerName, setReviewerName] = useState('Dewan Wasit VAR');

    // Video playback simulator state
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const playbackIntervalRef = useRef(null);
    const maxPlaybackSeconds = 15;

    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Sync state when active review opens
    useEffect(() => {
        if (activeReview) {
            setSelectedAngle(activeReview.camera_angle || 'cam_table');
        }
    }, [activeReview]);

    // Handle video replay animation
    useEffect(() => {
        if (isPlaying) {
            playbackIntervalRef.current = window.setInterval(() => {
                setPlaybackTime((prev) => {
                    if (prev >= maxPlaybackSeconds) {
                        setIsPlaying(false);
                        return maxPlaybackSeconds;
                    }
                    return Math.min(maxPlaybackSeconds, Number((prev + 0.1 * playbackSpeed).toFixed(2)));
                });
            }, 100);
        } else {
            if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
            }
        }
        return () => {
            if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current);
            }
        };
    }, [isPlaying, playbackSpeed]);

    if (!isOpen) return null;

    const handleStartReview = async () => {
        setSubmitting(true);
        setErrorMessage('');
        try {
            const response = await http.getClient().request({
                method: 'post',
                url: `/admin/panitera/scoring/matches/${match.id}/var-review`,
                data: JSON.stringify({
                    event_id: activeEvent.id,
                    corner: requestCorner,
                    requested_by: requestRole,
                    reason: requestReason,
                    camera_angle: selectedAngle,
                    video_url: videoUrlInput || null,
                    match_second: match?.timer?.elapsed_seconds || 0,
                }),
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            });
            onReviewUpdated?.(response.data);
            setPlaybackTime(0);
            setIsPlaying(true);
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Gagal memulai VAR review.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResolveReview = async () => {
        if (!activeReview) return;
        setSubmitting(true);
        setErrorMessage('');
        try {
            const response = await http.getClient().request({
                method: 'post',
                url: `/admin/panitera/scoring/var-review/${activeReview.id}/resolve`,
                data: JSON.stringify({
                    event_id: activeEvent.id,
                    status: verdictStatus,
                    verdict_notes: verdictNotes,
                    reviewed_by: reviewerName,
                }),
                headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            });
            onReviewUpdated?.(response.data);
            onClose();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Gagal menyelesaikan VAR review.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
            <div className="relative w-full max-w-5xl rounded-3xl border border-[#3d3630] bg-[#1a1715] p-5 text-white shadow-2xl sm:p-7">
                {/* Header */}
                <div className="flex flex-col gap-3 border-b border-[#332c26] pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-sm font-black text-amber-400">
                                <i className="fa-solid fa-video" aria-hidden="true" />
                            </span>
                            <h2 className="text-xl font-black text-white sm:text-2xl">Video Assistant Review (VAR)</h2>
                            {activeReview && (
                                <Badge variant="yellow" className="animate-pulse">
                                    <i className="fa-solid fa-circle text-[8px] mr-1.5" />
                                    Sedang Ditinjau
                                </Badge>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-[#a3988e]">
                            Partai #{match?.sequence} · {match?.category_name} · {match?.round_label}
                        </p>
                    </div>

                    {/* Challenge Card Indicators */}
                    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Kartu AKA</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black ${cards.aka > 0 ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-700 text-slate-400'}`}>
                                <i className="fa-solid fa-id-card text-[10px]" /> {cards.aka}/1
                            </span>
                        </div>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Kartu SHIRO</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black ${cards.shiro > 0 ? 'bg-slate-200/30 text-slate-200' : 'bg-slate-700 text-slate-400'}`}>
                                <i className="fa-solid fa-id-card text-[10px]" /> {cards.shiro}/1
                            </span>
                        </div>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/60 p-3 text-xs font-semibold text-rose-200">
                        <i className="fa-solid fa-triangle-exclamation mr-2" />{errorMessage}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                    {/* Left: Multi-Angle Video Screen & Controls */}
                    <div className="flex flex-col gap-4">
                        {/* Angle Select Tabs */}
                        <div className="flex flex-wrap gap-2">
                            {CAMERA_ANGLES.map((angle) => (
                                <button
                                    key={angle.id}
                                    type="button"
                                    onClick={() => setSelectedAngle(angle.id)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                        selectedAngle === angle.id
                                            ? 'bg-amber-500 text-black shadow-md'
                                            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <i className={`fa-solid ${angle.icon}`} />
                                    {angle.label}
                                </button>
                            ))}
                        </div>

                        {/* Video Frame Simulation */}
                        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-black">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-2xl text-amber-400">
                                    <i className="fa-solid fa-video" />
                                </div>
                                <p className="mt-3 text-sm font-bold text-white">
                                    Sudut Kamera: {CAMERA_ANGLES.find((c) => c.id === selectedAngle)?.label}
                                </p>
                                <p className="mt-1 font-mono text-xs text-white/50">
                                    Replay Time: {playbackTime.toFixed(1)}s / {maxPlaybackSeconds}s · Kecepatan: {playbackSpeed}x
                                </p>
                            </div>

                            {/* Camera HUD Overlays */}
                            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-black uppercase text-amber-400">
                                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                                VAR FEED · {selectedAngle.toUpperCase()}
                            </div>
                            <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/60 px-2 py-1 font-mono text-[10px] font-bold text-white/70">
                                DETIK TANDING: {match?.timer?.elapsed_seconds || 0}s
                            </div>

                            {/* Corner Indicator in Video */}
                            {activeReview && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-black">
                                    <span className={`h-2.5 w-2.5 rounded-full ${activeReview.corner === 'aka' ? 'bg-rose-500' : activeReview.corner === 'shiro' ? 'bg-slate-200' : 'bg-amber-400'}`} />
                                    <span>{activeReview.corner_label}</span>
                                    <span className="text-white/60">· {activeReview.reason}</span>
                                </div>
                            )}
                        </div>

                        {/* Video Controls: Play/Pause, Scrubber, Slow Motion, Frame Stepping */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            {/* Scrubber */}
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-white/60">{playbackTime.toFixed(1)}s</span>
                                <input
                                    type="range"
                                    min="0"
                                    max={maxPlaybackSeconds}
                                    step="0.1"
                                    value={playbackTime}
                                    onChange={(e) => setPlaybackTime(parseFloat(e.target.value))}
                                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-white/20 accent-amber-500"
                                />
                                <span className="font-mono text-xs text-white/60">{maxPlaybackSeconds}s</span>
                            </div>

                            {/* Buttons Bar */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsPlaying(!isPlaying)}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black font-black transition hover:bg-amber-400"
                                        title={isPlaying ? 'Jeda' : 'Putar'}
                                    >
                                        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlaybackTime((t) => Math.max(0, Number((t - 0.1).toFixed(2))))}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xs text-white transition hover:bg-white/20"
                                        title="Mundur 1 Frame (-0.1s)"
                                    >
                                        <i className="fa-solid fa-backward-step" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPlaybackTime((t) => Math.min(maxPlaybackSeconds, Number((t + 0.1).toFixed(2))))}
                                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-xs text-white transition hover:bg-white/20"
                                        title="Maju 1 Frame (+0.1s)"
                                    >
                                        <i className="fa-solid fa-forward-step" />
                                    </button>
                                </div>

                                {/* Speed Selection */}
                                <div className="flex items-center gap-1" role="group" aria-label="Kecepatan Slow Motion">
                                    {[0.25, 0.5, 1].map((spd) => (
                                        <button
                                            key={spd}
                                            type="button"
                                            onClick={() => setPlaybackSpeed(spd)}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                                playbackSpeed === spd
                                                    ? 'bg-amber-500 text-black font-black'
                                                    : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            {spd}x
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Challenge Submission or Decision Form */}
                    <div className="flex flex-col gap-4">
                        {!activeReview ? (
                            /* Form to start new VAR review */
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                                <h3 className="text-base font-bold text-white">Ajukan Tantangan VAR Baru</h3>
                                <p className="mt-1 text-xs text-[#a3988e]">
                                    Timer pertandingan akan otomatis di-pause selama proses pemeriksaan video berlangsung.
                                </p>

                                <div className="mt-4 space-y-3.5">
                                    <div>
                                        <label className="text-xs font-bold text-white/80">Pihak Pengaju</label>
                                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                disabled={cards.aka <= 0}
                                                onClick={() => {
                                                    setRequestCorner('aka');
                                                    setRequestRole('aka_coach');
                                                }}
                                                className={`rounded-xl border p-2.5 text-center text-xs font-bold transition disabled:opacity-40 ${
                                                    requestCorner === 'aka'
                                                        ? 'border-rose-500 bg-rose-600/30 text-rose-200'
                                                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <i className="fa-solid fa-id-card mr-1 text-rose-400" /> Sudut AKA
                                            </button>
                                            <button
                                                type="button"
                                                disabled={cards.shiro <= 0}
                                                onClick={() => {
                                                    setRequestCorner('shiro');
                                                    setRequestRole('shiro_coach');
                                                }}
                                                className={`rounded-xl border p-2.5 text-center text-xs font-bold transition disabled:opacity-40 ${
                                                    requestCorner === 'shiro'
                                                        ? 'border-slate-300 bg-white/20 text-white'
                                                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <i className="fa-solid fa-id-card mr-1 text-slate-300" /> Sudut SHIRO
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRequestCorner('neutral');
                                                    setRequestRole('referee');
                                                }}
                                                className={`rounded-xl border p-2.5 text-center text-xs font-bold transition ${
                                                    requestCorner === 'neutral'
                                                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                                                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                                                }`}
                                            >
                                                <i className="fa-solid fa-whistle mr-1 text-amber-400" /> Inisiatif Wasit
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="var-reason" className="text-xs font-bold text-white/80">Alasan Tantangan / Review</label>
                                        <select
                                            id="var-reason"
                                            value={requestReason}
                                            onChange={(e) => setRequestReason(e.target.value)}
                                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#25201d] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
                                        >
                                            <option value="Tantangan Poin (Waza-ari / Ippon)">Tantangan Poin (Waza-ari / Ippon)</option>
                                            <option value="Pelanggaran (Chui / Hansoku-chui / Hansoku)">Pelanggaran (Chui / Hansoku-chui / Hansoku)</option>
                                            <option value="Jogai (Keluar Garis Tatami)">Jogai (Keluar Garis Tatami)</option>
                                            <option value="Waktu Habis / Bel bersamaan dengan Serangan">Waktu Habis / Bel bersamaan dengan Serangan</option>
                                            <option value="Pemeriksaan Insiden Tatami Lainnya">Pemeriksaan Insiden Tatami Lainnya</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="var-video-url" className="text-xs font-bold text-white/80">URL Video Eksternal (Opsional)</label>
                                        <input
                                            id="var-video-url"
                                            type="url"
                                            placeholder="https://stream.smartperkemi.id/..."
                                            value={videoUrlInput}
                                            onChange={(e) => setVideoUrlInput(e.target.value)}
                                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#25201d] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
                                        />
                                    </div>

                                    <Button
                                        variant="gold"
                                        className="w-full"
                                        loading={submitting}
                                        onClick={handleStartReview}
                                        iconLeft={<i className="fa-solid fa-play" />}
                                    >
                                        Mulai Pemeriksaan VAR (Pause Timer)
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* Form to resolve active VAR review */
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-bold text-amber-300">Putusan Dewan Wasit VAR</h3>
                                    <Badge variant="yellow">Aktif</Badge>
                                </div>
                                <p className="mt-1 text-xs text-white/70">
                                    Diajukan oleh: <strong className="text-white">{activeReview.requested_by_label}</strong> ({activeReview.corner_label})
                                </p>
                                <p className="mt-0.5 text-xs text-white/70">
                                    Alasan: <strong className="text-white">{activeReview.reason}</strong>
                                </p>

                                <div className="mt-4 space-y-3.5">
                                    <div>
                                        <label className="text-xs font-bold text-white/80">Hasil Putusan</label>
                                        <div className="mt-1.5 grid gap-2">
                                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                                                verdictStatus === 'overturned'
                                                    ? 'border-emerald-500 bg-emerald-950/40'
                                                    : 'border-white/10 bg-white/5'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    value="overturned"
                                                    checked={verdictStatus === 'overturned'}
                                                    onChange={(e) => setVerdictStatus(e.target.value)}
                                                    className="mt-0.5 accent-emerald-500"
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-emerald-300">Tantangan Diterima (Overturned)</p>
                                                    <p className="text-[11px] text-white/60">Putusan wasit dibatalkan/dikoreksi. Kuota kartu challenge tetap utuh.</p>
                                                </div>
                                            </label>

                                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                                                verdictStatus === 'upheld'
                                                    ? 'border-rose-500 bg-rose-950/40'
                                                    : 'border-white/10 bg-white/5'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    value="upheld"
                                                    checked={verdictStatus === 'upheld'}
                                                    onChange={(e) => setVerdictStatus(e.target.value)}
                                                    className="mt-0.5 accent-rose-500"
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-rose-300">Tantangan Ditolak (Upheld)</p>
                                                    <p className="text-[11px] text-white/60">Putusan wasit awal tetap berlaku. Kuota kartu challenge sudut terkait hangus (-1).</p>
                                                </div>
                                            </label>

                                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                                                verdictStatus === 'inconclusive'
                                                    ? 'border-slate-400 bg-slate-900/60'
                                                    : 'border-white/10 bg-white/5'
                                            }`}>
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    value="inconclusive"
                                                    checked={verdictStatus === 'inconclusive'}
                                                    onChange={(e) => setVerdictStatus(e.target.value)}
                                                    className="mt-0.5 accent-slate-400"
                                                />
                                                <div>
                                                    <p className="text-xs font-black text-slate-300">Bukti Tidak Cukup (Inconclusive)</p>
                                                    <p className="text-[11px] text-white/60">Video tidak memperlihatkan insiden secara konklusif. Kuota kartu challenge tetap utuh.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="var-verdict-notes" className="text-xs font-bold text-white/80">Catatan Putusan VAR</label>
                                        <textarea
                                            id="var-verdict-notes"
                                            rows="2"
                                            value={verdictNotes}
                                            onChange={(e) => setVerdictNotes(e.target.value)}
                                            placeholder="Penjelasan putusan (misal: Serangan Waza-ari sah mendarat di dada sebelum bel)..."
                                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#25201d] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="var-reviewer-name" className="text-xs font-bold text-white/80">Dewan Wasit VAR / Operator</label>
                                        <input
                                            id="var-reviewer-name"
                                            type="text"
                                            value={reviewerName}
                                            onChange={(e) => setReviewerName(e.target.value)}
                                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#25201d] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-amber-500"
                                        />
                                    </div>

                                    <Button
                                        variant="emerald"
                                        className="w-full"
                                        loading={submitting}
                                        onClick={handleResolveReview}
                                        iconLeft={<i className="fa-solid fa-check" />}
                                    >
                                        Simpan & Siarkan Putusan VAR
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Recent Reviews History for this match */}
                        {recentReviews.length > 0 && (
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-white/70">
                                    Riwayat Review Partai Ini ({recentReviews.length})
                                </h4>
                                <div className="mt-2.5 max-h-40 space-y-2 overflow-y-auto pr-1">
                                    {recentReviews.map((rev) => (
                                        <div key={rev.id} className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-white">{rev.corner_label}</span>
                                                <Badge variant={rev.status_tone}>{rev.status_label}</Badge>
                                            </div>
                                            <p className="mt-1 text-[11px] text-white/60">{rev.reason}</p>
                                            {rev.verdict_notes && (
                                                <p className="mt-1 text-[10px] italic text-amber-200/80">"{rev.verdict_notes}"</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="mt-6 flex justify-end border-t border-[#332c26] pt-4">
                    <Button variant="secondary" onClick={onClose}>
                        Tutup Panel VAR
                    </Button>
                </div>
            </div>
        </div>
    );
}
