import SignaturePad from '@/Components/UI/Forms/SignaturePad';
import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../../../css/referee-scoring.css';

const groups = [
    {
        id: 'technique', title: 'Penguasaan Teknik', maximum: 60,
        items: [
            ['goho_attack', 'GOHO', 'Serangan (Kougeki)'],
            ['goho_defense', 'GOHO', 'Bertahan (Bougyo)'],
            ['goho_counter', 'GOHO', 'Serangan balasan & 5 unsur serangan'],
            ['juho_escape', 'JUHO', 'Shuha & Nukiwaza'],
            ['juho_lock_throw', 'JUHO', 'Gyakuwaza & Nagewaza'],
            ['juho_ground', 'JUHO', 'Katamewaza'],
        ],
    },
    {
        id: 'expression', title: 'Ekspresi', maximum: 40,
        items: [
            ['expression_sequence', '', 'Rangkaian, irama, dan harmoni'],
            ['expression_stance', '', 'Tai Gamae, kuda-kuda, dan keindahan'],
            ['expression_spirit', '', 'Semangat dan disiplin'],
            ['expression_breath_zanshin', '', 'Nafas, pandangan mata, dan Zanshin'],
        ],
    },
];
const criteria = groups.flatMap((group) => group.items);
const choices = [7, 8, 9, 10];

function scoreStatus(score) {
    if (score.status === 'submitted') {
        return { className: '', label: 'Selesai' };
    }

    const completedItems = Number(score.completed_items ?? 0);

    return completedItems === criteria.length
        ? { className: 'is-ready', label: 'Siap dikirim' }
        : { className: 'is-draft', label: `Sedang dinilai ${completedItems}/${criteria.length}` };
}

function ScoringDialog({ title, onClose, children }) {
    const dialog = useRef(null);

    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);

    return (
        <dialog ref={dialog} className="referee-dialog" aria-labelledby="scoring-dialog-title" onCancel={onClose} onClose={onClose}>
            <header>
                <h2 id="scoring-dialog-title">{title}</h2>
                <button type="button" onClick={onClose} aria-label="Tutup panel">×</button>
            </header>
            {children}
        </dialog>
    );
}

function ScoreBoard({ activeEvent, session, onBusyChange, onScoreChange }) {
    const match = session.active_match;
    const participant = match.participant ?? {};
    const [scores, setScores] = useState(() => Object.fromEntries(criteria.map(([key]) => [key, session.score?.aspect_scores?.[key] ?? null])));
    const [signature, setSignature] = useState(session.score?.signature ?? '');
    const [notes, setNotes] = useState(session.score?.notes ?? '');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedStatus, setSavedStatus] = useState(session.score?.status ?? 'draft');
    const [error, setError] = useState('');
    const [panel, setPanel] = useState(null);
    const [visibleGroup, setVisibleGroup] = useState('technique');
    const revision = useRef(0);
    const requestInFlight = useRef(false);
    const completed = criteria.filter(([key]) => scores[key] != null).length;
    const subtotal = (group) => group.items.reduce((sum, [key]) => sum + Number(scores[key] ?? 0), 0);
    const total = groups.reduce((sum, group) => sum + subtotal(group), 0);
    const athleteNames = participant.athletes?.map((athlete) => athlete.name).join(' · ') || match.participant_label || 'Peserta belum tercatat';
    const techniqueNames = participant.techniques?.map((technique) => technique.name).join(' · ') || 'Teknik belum didaftarkan';
    const categoryKind = participant.kind === 'Tim Embu'
        ? (/beregu/i.test(match.category_name) ? 'Beregu' : /pasang/i.test(match.category_name) ? 'Pasangan' : /perorangan/i.test(match.category_name) ? 'Perorangan' : '')
        : participant.kind;

    const changed = () => {
        revision.current += 1;
        setDirty(true);
        setError('');
    };

    const save = (status = 'draft') => {
        if (requestInFlight.current) return;
        if (status === 'submitted' && completed !== criteria.length) {
            setError('Lengkapi seluruh 10 aspek penilaian terlebih dahulu.');
            setVisibleGroup(groups.find((group) => group.items.some(([key]) => scores[key] == null)).id);
            return;
        }
        if (status === 'submitted' && !signature) {
            setError('Tambahkan tanda tangan sebelum mengirim nilai.');
            setPanel('notes');
            return;
        }

        const savedRevision = revision.current;
        let succeeded = false;
        requestInFlight.current = true;
        setSaving(true);
        setError('');
        router.put(match.score_update_url, {
            event_id: activeEvent.id,
            aspect_scores: scores,
            signature: signature || null,
            notes: notes || null,
            status,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['refereeSession', 'completedCategoryScores', 'flash', 'errors'],
            onSuccess: () => {
                succeeded = true;
                setSavedStatus(status);
                if (revision.current === savedRevision) setDirty(false);
            },
            onError: (errors) => setError(Object.values(errors)[0] || 'Nilai belum tersimpan. Silakan coba lagi.'),
            onNetworkError: () => {
                setError('Koneksi terputus. Nilai belum tersimpan; coba lagi setelah tersambung.');
                return false;
            },
            onHttpException: (response) => {
                setError(response.status === 409
                    ? 'Partai tidak lagi aktif. Periksa pertandingan melalui portal wasit.'
                    : 'Penyimpanan ditolak. Periksa sesi login dan kehadiran melalui portal wasit.');
                return false;
            },
            onFinish: () => {
                requestInFlight.current = false;
                setSaving(false);
                if (!succeeded) setError((message) => message || 'Penyimpanan gagal. Periksa koneksi, lalu coba lagi.');
            },
        });
    };

    useEffect(() => {
        onBusyChange(dirty || saving || panel !== null);
        return () => onBusyChange(false);
    }, [dirty, saving, panel, onBusyChange]);

    useEffect(() => {
        if (!dirty || saving || error) return undefined;
        const timeout = window.setTimeout(() => save(), 600);
        return () => window.clearTimeout(timeout);
    }, [scores, signature, notes, dirty, saving, error]);

    useEffect(() => {
        if (!dirty && !saving) return undefined;
        const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warnBeforeLeaving);
        return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
    }, [dirty, saving]);

    useEffect(() => {
        if (completed === 0) return;

        onScoreChange({
            id: session.score?.id ?? `draft-${match.id}`,
            event_id: activeEvent.id,
            match_id: match.id,
            sequence: match.sequence,
            category_name: match.category_name,
            round_label: match.round_label ?? '',
            court_name: session.court_name,
            athlete_names: athleteNames,
            contingent_name: participant.contingent_name || '—',
            technique_subtotal: subtotal(groups[0]),
            expression_subtotal: subtotal(groups[1]),
            total_score: total,
            completed_items: completed,
            status: dirty ? 'draft' : savedStatus,
        });
    }, [scores, dirty, savedStatus, onScoreChange]);

    const saveMessage = error || (saving ? 'Menyimpan…' : dirty ? 'Perubahan belum tersimpan' : savedStatus === 'submitted' ? 'Nilai terkirim ke Panitera' : session.score || revision.current ? 'Draf tersimpan otomatis' : 'Pilih nilai untuk setiap aspek');

    return (
        <form className="referee-board" onSubmit={(event) => { event.preventDefault(); save('submitted'); }}>
            <section className="referee-match" aria-label="Pertandingan aktif">
                <div><span className="referee-eyebrow">Kategori / nomor pertandingan</span><h1 title={match.category_name}>{match.category_name}</h1><p>{match.round_label || 'Pertandingan Embu'}</p></div>
                <div className="referee-match-sequence"><span className="referee-eyebrow">Partai</span><strong>{String(match.sequence ?? '—').padStart(3, '0')}</strong></div>
            </section>

            <section className="referee-participant" aria-label="Informasi peserta">
                <div className="referee-participant-icon"><i className="fa-solid fa-user" aria-hidden="true" /></div>
                <div className="referee-participant-copy">
                    <span className="referee-eyebrow">Kontingen · {participant.contingent_name || 'Belum tercatat'}</span>
                    <h2 title={athleteNames}>{athleteNames}</h2>
                    <p title={techniqueNames}><strong>Teknik:</strong> {techniqueNames}</p>
                </div>
                <button type="button" className="referee-detail-button" onClick={() => setPanel('participant')} aria-label="Lihat semua atlet dan teknik">Detail <i className="fa-solid fa-angle-right" aria-hidden="true" /></button>
            </section>

            <div className="referee-section-switch" aria-label="Bagian penilaian">
                {groups.map((group) => (
                    <button key={group.id} type="button" aria-pressed={visibleGroup === group.id} onClick={() => setVisibleGroup(group.id)}>
                        {group.title} <span>{group.items.filter(([key]) => scores[key] != null).length}/{group.items.length}</span>
                    </button>
                ))}
            </div>

            <div className="referee-score-tables" data-visible-group={visibleGroup}>
                {groups.map((group, index) => (
                    <section key={group.id} className={`referee-score-section referee-${group.id}`} aria-labelledby={`${group.id}-heading`}>
                        <div className="referee-section-heading"><h2 id={`${group.id}-heading`}>{index + 1}. {group.title} <span>(maks. {group.maximum})</span></h2><span className="referee-scale">Skala 7–10</span></div>
                        <div className="referee-score-rows" style={{ '--row-count': group.items.length }}>
                            {group.items.map(([key, code, label], itemIndex) => (
                                <div key={key} className="referee-score-row" role="group" aria-label={`${code} ${label}`}>
                                    <span className="referee-row-number">{index === 0 ? itemIndex + 1 : itemIndex + 7}</span>
                                    <span className="referee-criterion">{code && <strong>{code}</strong>}<span>{label}</span></span>
                                    <div className="referee-score-choices">
                                        {choices.map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                aria-pressed={scores[key] === value}
                                                aria-label={`${label}: ${value}`}
                                                onClick={(e) => {
                                                    setScores((previous) => ({ ...previous, [key]: value }));
                                                    changed();
                                                    e.currentTarget.blur();
                                                }}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="referee-subtotal"><span>Subtotal {group.title}</span><strong>{subtotal(group)} <span>/ {group.maximum}</span></strong></div>
                    </section>
                ))}
            </div>

            <div className="referee-final"><div><span>Nilai akhir</span><small>Nilai juri · {completed}/10 aspek</small></div><strong>{total}<small>/100</small></strong></div>
            <div className={`referee-save-status ${error ? 'has-error' : ''}`} role={error ? 'alert' : 'status'}>
                <span>{saveMessage}</span>
                {error && <button type="button" disabled={saving} onClick={() => save()}>Coba simpan draf</button>}
            </div>
            <footer className="referee-actions">
                <button type="button" className="referee-notes-button" onClick={() => setPanel('notes')}><i className={`fa-solid ${signature ? 'fa-circle-check' : 'fa-pen-nib'}`} aria-hidden="true" /><span>Catatan & TTD<small>{signature ? 'Sudah ditandatangani' : 'Tanda tangan diperlukan'}</small></span></button>
                <button type="submit" className="referee-submit" disabled={saving}><i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`} aria-hidden="true" />{saving ? 'Menyimpan…' : savedStatus === 'submitted' && !dirty ? 'Kirim ulang nilai' : 'Simpan nilai'}</button>
            </footer>

            {panel === 'notes' && (
                <ScoringDialog title="Catatan & tanda tangan wasit" onClose={() => setPanel(null)}>
                    <p className="referee-dialog-description">{session.referee_name} · Juri {session.judge_number} · Partai {match.sequence}</p>
                    <div className="referee-signature-fields">
                        <label>Catatan wasit <small>(opsional)</small><textarea value={notes} maxLength={1000} rows={4} placeholder="Catatan teknik atau kejadian penting…" onChange={(event) => { setNotes(event.target.value); changed(); }} /><small>{notes.length}/1000 karakter</small></label>
                        <div><h3>Tanda tangan <small>(wajib sebelum kirim)</small></h3><SignaturePad value={signature} height={130} onChange={(value) => { setSignature(value); changed(); }} /></div>
                    </div>
                    <button type="button" className="referee-dialog-done" onClick={() => setPanel(null)}>Selesai</button>
                </ScoringDialog>
            )}
            {panel === 'participant' && (
                <ScoringDialog title="Informasi peserta" onClose={() => setPanel(null)}>
                    <p className="referee-dialog-description">{participant.contingent_name || 'Kontingen belum tercatat'} · {categoryKind || 'Embu'}</p>
                    <div className="referee-participant-details"><section><h3>Atlet</h3>{participant.athletes?.length ? <ol>{participant.athletes.map((athlete, index) => <li key={athlete.id ?? index}>{athlete.name}</li>)}</ol> : <p>{athleteNames}</p>}</section><section><h3>Teknik terdaftar</h3>{participant.techniques?.length ? <ol>{participant.techniques.map((technique, index) => <li key={`${technique.id}-${index}`}>{technique.name}</li>)}</ol> : <p>Teknik belum didaftarkan.</p>}</section></div>
                    <button type="button" className="referee-dialog-done" onClick={() => setPanel(null)}>Kembali ke penilaian</button>
                </ScoringDialog>
            )}
        </form>
    );
}

function JudgedAthletesTable({ scores = [] }) {
    const [viewMode, setViewMode] = useState('auto'); // 'auto', 'card', 'table'

    return (
        <section className="judged-athletes-card" aria-label="Daftar atlet yang telah dinilai">
            <header className="judged-athletes-header">
                <h2>DAFTAR ATLET YANG TELAH DINILAI</h2>
                <div className="judged-athletes-header-right">
                    <span className="judged-athletes-total">Total: {scores.length} Atlet</span>
                    {scores.length > 0 && (
                        <button
                            type="button"
                            className="judged-view-toggle sm:hidden"
                            onClick={() => setViewMode((prev) => (prev === 'table' ? 'card' : 'table'))}
                            title="Ubah tampilan kartu / tabel"
                        >
                            <i className={`fa-solid ${viewMode === 'table' ? 'fa-id-card' : 'fa-table'}`} aria-hidden="true" />
                            <span>{viewMode === 'table' ? 'Kartu' : 'Tabel'}</span>
                        </button>
                    )}
                </div>
            </header>

            {scores.length === 0 ? (
                <div className="judged-empty-state">
                    <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                    <p>Belum ada atlet yang mulai dinilai pada event ini.</p>
                </div>
            ) : (
                <>
                    {/* Tampilan Tabel (Default pada Layar Desktop & Tablet) */}
                    <div className={`judged-athletes-table-wrap ${viewMode === 'card' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden sm:block'}`}>
                        <table className="judged-athletes-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '45px', textAlign: 'center' }}>No.</th>
                                    <th>Nama Atlet</th>
                                    <th>Kontingen</th>
                                    <th>Kategori / Partai</th>
                                    <th style={{ textAlign: 'center' }}>Nilai Teknik<br /><span style={{ fontSize: '11px', fontWeight: 'normal' }}>(60)</span></th>
                                    <th style={{ textAlign: 'center' }}>Nilai Ekspresi<br /><span style={{ fontSize: '11px', fontWeight: 'normal' }}>(40)</span></th>
                                    <th style={{ textAlign: 'center' }}>Nilai Akhir<br /><span style={{ fontSize: '11px', fontWeight: 'normal' }}>(100)</span></th>
                                    <th style={{ textAlign: 'center', width: '95px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scores.map((item, index) => (
                                    <tr key={item.id || item.match_id || index}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                                        <td style={{ fontWeight: 'bold', color: '#0c203b' }}>{item.athlete_names}</td>
                                        <td style={{ color: '#334155' }}>{item.contingent_name}</td>
                                        <td style={{ color: '#475569', fontSize: '12px' }}>
                                            <span style={{ fontWeight: '600', color: '#0f172a' }}>{item.category_name}</span>
                                            {item.sequence && <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Partai #{item.sequence} · {item.court_name}</span>}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>{item.technique_subtotal}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>{item.expression_subtotal}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px', color: '#0c203b' }}>{item.total_score}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`judged-status-badge ${scoreStatus(item).className}`}>{scoreStatus(item).label}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="judged-scroll-hint sm:hidden">
                            <i className="fa-solid fa-arrows-left-right" aria-hidden="true" />
                            Geser ke kanan untuk melihat status & nilai lengkap
                        </div>
                    </div>

                    {/* Tampilan Kartu Responsif (Default pada Layar Mobile Ponsel) */}
                    <div className={`judged-athletes-mobile-list ${viewMode === 'table' ? 'hidden' : viewMode === 'card' ? 'flex' : 'flex sm:hidden'}`}>
                        {scores.map((item, index) => (
                            <article key={item.id || item.match_id || index} className="judged-athlete-card-item">
                                <div className="judged-card-header">
                                    <div className="judged-card-athlete">
                                        <span className="judged-card-number">#{index + 1}</span>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="judged-card-name">{item.athlete_names}</h3>
                                            <p className="judged-card-contingent">
                                                <i className="fa-solid fa-flag mr-1 text-[#b92f24]" aria-hidden="true" />
                                                <span>{item.contingent_name}</span>
                                            </p>
                                            {item.category_name && (
                                                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#475569', fontWeight: '600' }}>
                                                    <i className="fa-solid fa-trophy mr-1 text-[#d97706]" aria-hidden="true" />
                                                    {item.category_name} {item.sequence ? `(Partai #${item.sequence})` : ''} · {item.court_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`judged-status-badge ${scoreStatus(item).className}`}>{scoreStatus(item).label}</span>
                                </div>

                                <div className="judged-card-scores">
                                    <div className="judged-score-box">
                                        <span className="judged-score-label">Teknik (60)</span>
                                        <strong className="judged-score-val">{item.technique_subtotal}</strong>
                                    </div>
                                    <div className="judged-score-box">
                                        <span className="judged-score-label">Ekspresi (40)</span>
                                        <strong className="judged-score-val">{item.expression_subtotal}</strong>
                                    </div>
                                    <div className="judged-score-box judged-score-box-total">
                                        <span className="judged-score-label">Nilai Akhir</span>
                                        <strong className="judged-score-val-total">{item.total_score}</strong>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

export default function ScoringNew({ activeEvent, refereeSession = null, completedCategoryScores = [], refereePortalUrl }) {
    const [busy, setBusy] = useState(false);
    const [liveScore, setLiveScore] = useState(null);
    const activeMatch = refereeSession?.active_match;
    const canScore = refereeSession?.is_checked_in && activeMatch?.category_type === 'embu';
    const storedScores = refereeSession?.completed_category_scores ?? completedCategoryScores ?? [];
    const updateLiveScore = useCallback((score) => setLiveScore(score), []);
    const judgedScores = useMemo(() => {
        if (!liveScore || liveScore.event_id !== activeEvent?.id) return storedScores;

        return [
            liveScore,
            ...storedScores.filter((score) => score.match_id !== liveScore.match_id),
        ];
    }, [activeEvent?.id, liveScore, storedScores]);

    useEffect(() => {
        if (busy) return undefined;
        const refresh = () => {
            if (document.visibilityState === 'visible') router.reload({ only: ['refereeSession', 'completedCategoryScores'], preserveScroll: true, preserveState: true });
        };
        const interval = window.setInterval(refresh, activeMatch ? 5000 : 2500);
        const channelName = activeMatch?.id ? `tournament-match.${activeMatch.id}` : refereeSession?.court_id ? `event-court.${refereeSession.court_id}` : null;
        const channel = channelName && window.Echo ? window.Echo.private(channelName) : null;
        const refreshMatch = (event) => {
            if (event.event_id === activeEvent?.id && ['save_result', 'reopen_result'].includes(event.action)) refresh();
        };
        channel?.listen('.panitera.match-state.updated', refreshMatch);
        return () => {
            window.clearInterval(interval);
            channel?.stopListening('.panitera.match-state.updated', refreshMatch);
        };
    }, [busy, activeEvent?.id, activeMatch?.id, refereeSession?.court_id]);

    return (
        <main className="referee-scoring-new">
            <Head title="Penilaian Wasit Embu | Smart Perkemi" />
            <div className="referee-screen">
                {/* Header ringkas & modern: Menggantikan header branding besar, tetap mempertahankan tombol Kembali */}
                <header className="referee-topbar">
                    <Link href={refereePortalUrl} className="referee-back-btn" title="Kembali ke portal wasit">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        <span>Kembali</span>
                    </Link>
                    <div className="referee-topbar-info">
                        <span className="referee-badge-court">{refereeSession?.court_name || 'Court'}</span>
                        <span className="referee-badge-judge">Juri {refereeSession?.judge_number ?? '—'}</span>
                    </div>
                </header>

                {canScore ? (
                    <>
                        <ScoreBoard key={`${activeMatch.id}-${refereeSession.judge_number}`} activeEvent={activeEvent} session={refereeSession} onBusyChange={setBusy} onScoreChange={updateLiveScore} />
                        <JudgedAthletesTable scores={judgedScores} />
                    </>
                ) : (
                    <>
                        <section className="referee-empty">
                            <i className={`fa-solid ${!refereeSession?.is_checked_in ? 'fa-qrcode' : 'fa-hourglass-half'}`} aria-hidden="true" />
                            <h1>{!refereeSession?.is_checked_in ? 'Scan QR event dan court dahulu' : activeMatch ? 'Pertandingan Randori sedang aktif' : 'Menunggu panggilan Panitera'}</h1>
                            <p>{!refereeSession?.is_checked_in ? 'Pastikan kehadiran hari ini sudah tercatat agar lembar penilaian dapat dibuka.' : activeMatch ? 'Lembar ini digunakan untuk penilaian Embu. Nilai Randori dicatat melalui alur Panitera.' : 'Lembar penilaian akan terbuka otomatis setelah peserta Embu dipanggil di court Anda.'}</p>
                            <Link href={refereePortalUrl}>Buka portal wasit</Link>
                        </section>
                        {judgedScores.length > 0 && <JudgedAthletesTable scores={judgedScores} />}
                    </>
                )}
            </div>
        </main>
    );
}
