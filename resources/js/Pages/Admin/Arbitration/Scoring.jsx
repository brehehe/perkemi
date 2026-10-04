import Button from "@/Components/UI/Elements/Button";
import AdminLayout from '@/Layouts/AdminLayout';
import { Input } from '@/Components/UI';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Notification from '@/Components/UI/Feedback/Notification';

export default function ArbitrationScoring({ activeEvent }) {
    const [mode, setMode] = useState('randori'); // 'randori' or 'embu'
    const [notification, setNotification] = useState(null);

    // Randori Scoring State
    const [akaScore, setAkaScore] = useState(0);
    const [shiroScore, setShiroScore] = useState(0);
    const [akaFouls, setAkaFouls] = useState(0);
    const [shiroFouls, setShiroFouls] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(120);
    const [timerRunning, setTimerRunning] = useState(false);

    // Embu Scoring State (5 Judges)
    const [judgeScores, setJudgeScores] = useState([85, 88, 86, 84, 89]);

    useEffect(() => {
        let interval = null;
        if (timerRunning && secondsLeft > 0) {
            interval = setInterval(() => {
                setSecondsLeft((s) => s - 1);
            }, 1000);
        } else if (secondsLeft === 0 && timerRunning) {
            setTimerRunning(false);
            setNotification({ title: 'Waktu pertandingan habis', message: 'Yame / Sore-made. Timer telah dihentikan.', variant: 'warning' });
        }
        return () => clearInterval(interval);
    }, [timerRunning, secondsLeft]);

    const formatTimer = (s) => {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const resetRandori = () => {
        setAkaScore(0);
        setShiroScore(0);
        setAkaFouls(0);
        setShiroFouls(0);
        setSecondsLeft(120);
        setTimerRunning(false);
    };

    // Calculate Embu Score: Remove highest & lowest, sum the remaining 3
    const sortedScores = [...judgeScores].sort((a, b) => a - b);
    const minScore = sortedScores[0];
    const maxScore = sortedScores[sortedScores.length - 1];
    const middleScores = sortedScores.slice(1, -1);
    const finalEmbuScore = middleScores.reduce((acc, curr) => acc + curr, 0);

    return (
        <AdminLayout title="Penilaian Scoring Digital">
            <Head title="Scoring Digital | Smart Perkemi" />
            {notification && <div className="fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)]"><Notification {...notification} duration={0} onClose={() => setNotification(null)} /></div>}

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-star"></i>
                                <span>Digital Scoring Board</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Sistem Penilaian (Scoring Digital)
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Papan skor digital interaktif untuk wasit juri, perhitungan otomatis poin Randori, serta eliminasi nilai ekstrem Embu (PB Perkemi Standard).
                            </p>
                        </div>

                        {/* Mode Selector */}
                        <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl border border-white/10">
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setMode('randori')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                    mode === 'randori' ? 'bg-[#c0392b] text-white shadow-md' : 'text-[#b5afa6] hover:text-white'
                                }`}
                            >
                                <i className="fa-solid fa-hand-fist mr-1.5"></i> Randori (Tanding)
                            </Button>
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setMode('embu')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                    mode === 'embu' ? 'bg-[#d4a843] text-[#0f0d0b] shadow-md' : 'text-[#b5afa6] hover:text-white'
                                }`}
                            >
                                <i className="fa-solid fa-medal mr-1.5"></i> Embu (Kerapian Teknik)
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ════ RANDORI SCORING PANEL ════ */}
                {mode === 'randori' && (
                    <div className="space-y-6">
                        {/* Timer and Tatami Control */}
                        <div className="bg-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <span className="text-xs text-[#d4a843] uppercase tracking-wider font-bold block">Partai #12 · Tatami 1</span>
                                <p className="text-sm font-semibold text-white">Randori Perorangan Putra - Kelas 60 kg (Babak Semifinal)</p>
                            </div>

                            {/* Digital Timer */}
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-[#b5afa6] uppercase tracking-widest mb-1">Sisa Waktu Ronde</span>
                                <div className="font-mono text-4xl md:text-5xl font-bold tracking-wider text-[#d4a843] bg-black/40 px-6 py-2 rounded-xl border border-white/10">
                                    {formatTimer(secondsLeft)}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setTimerRunning(!timerRunning)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                            timerRunning ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        }`}
                                    >
                                        <i className={`fa-solid ${timerRunning ? 'fa-pause' : 'fa-play'} mr-1.5`}></i>
                                        {timerRunning ? 'Pause (Hantei)' : 'Mulai (Hajime)'}
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={resetRandori}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                    >
                                        <i className="fa-solid fa-rotate-left mr-1"></i> Reset
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Dual Score Board (Aka vs Shiro) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* AKA (MERAH) */}
                            <div className="bg-red-950/20 border-2 border-red-600/40 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                                <span className="px-4 py-1 rounded-full bg-red-600 text-white font-cinzel text-xs font-bold uppercase tracking-wider mb-2">
                                    Sudut Merah (AKA)
                                </span>
                                <h3 className="font-cinzel text-base font-bold text-[#0f0d0b]">Kenshi Ahmad Fauzan</h3>
                                <p className="text-xs text-[#7a746e] mb-4">Dojo Garuda Sakti Surabaya</p>

                                <div className="font-mono text-7xl font-extrabold text-red-600 my-2">
                                    {akaScore}
                                </div>

                                <div className="text-xs text-[#7a746e] mb-6">
                                    Pelanggaran (Chui): <span className="font-bold text-red-600">{akaFouls}</span>
                                </div>

                                {/* Score Add Buttons */}
                                <div className="flex items-center gap-2 w-full">
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setAkaScore(akaScore + 1)}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        +1 Waza-ari
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setAkaScore(akaScore + 2)}
                                        className="flex-1 py-2.5 rounded-xl bg-[#0f0d0b] hover:bg-[#25201b] text-[#f7f4ef] text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        +2 Ippon
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setAkaFouls(akaFouls + 1)}
                                        className="px-3 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold cursor-pointer"
                                        title="Tambah Pelanggaran (Hansoku-chui)"
                                    >
                                        Chui +1
                                    </Button>
                                </div>
                            </div>

                            {/* SHIRO (PUTIH) */}
                            <div className="bg-slate-50 border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                                <span className="px-4 py-1 rounded-full bg-white border border-slate-300 text-slate-800 font-cinzel text-xs font-bold uppercase tracking-wider mb-2">
                                    Sudut Putih (SHIRO)
                                </span>
                                <h3 className="font-cinzel text-base font-bold text-[#0f0d0b]">Kenshi Satria Dewa</h3>
                                <p className="text-xs text-[#7a746e] mb-4">Dojo Elang Sakti Sidoarjo</p>

                                <div className="font-mono text-7xl font-extrabold text-slate-800 my-2">
                                    {shiroScore}
                                </div>

                                <div className="text-xs text-[#7a746e] mb-6">
                                    Pelanggaran (Chui): <span className="font-bold text-slate-800">{shiroFouls}</span>
                                </div>

                                {/* Score Add Buttons */}
                                <div className="flex items-center gap-2 w-full">
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setShiroScore(shiroScore + 1)}
                                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        +1 Waza-ari
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setShiroScore(shiroScore + 2)}
                                        className="flex-1 py-2.5 rounded-xl bg-[#0f0d0b] hover:bg-[#25201b] text-[#f7f4ef] text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        +2 Ippon
                                    </Button>
                                    <Button variant="unstyled" size="none"
                                        type="button"
                                        onClick={() => setShiroFouls(shiroFouls + 1)}
                                        className="px-3 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
                                        title="Tambah Pelanggaran (Hansoku-chui)"
                                    >
                                        Chui +1
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════ EMBU SCORING PANEL ════ */}
                {mode === 'embu' && (
                    <div className="bg-white rounded-2xl p-6 border border-[#ede9e1] shadow-xs space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#ede9e1] pb-4 gap-2">
                            <div>
                                <h3 className="font-cinzel text-base font-bold text-[#0f0d0b]">
                                    Papan Penilaian 5 Dewan Juri Embu
                                </h3>
                                <p className="text-xs text-[#7a746e]">
                                    Pasangan: <span className="font-semibold text-[#0f0d0b]">Budi & Wahyu (Dojo Surabaya)</span> · Embu Pasangan Kyu 1 Putra
                                </p>
                            </div>

                            <div className="text-right">
                                <span className="text-xs text-[#7a746e]">Total Nilai Akhir (3 Nilai Tengah):</span>
                                <p className="font-mono text-3xl font-extrabold text-[#d4a843]">{finalEmbuScore}</p>
                            </div>
                        </div>

                        {/* 5 Judge Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                            {judgeScores.map((score, idx) => {
                                const isMin = score === minScore;
                                const isMax = score === maxScore;

                                return (
                                    <div key={idx} className={`p-4 rounded-xl border text-center ${
                                        isMin || isMax ? 'bg-red-50/50 border-red-200' : 'bg-[#fbfaf8] border-[#ede9e1]'
                                    }`}>
                                        <span className="text-[10px] uppercase font-bold text-[#7a746e] block mb-1">
                                            Juri #{idx + 1}
                                        </span>
                                        <Input
                                            type="number"
                                            value={score}
                                            onChange={(event) => {
                                                const updated = [...judgeScores];
                                                updated[idx] = Number(event.target.value);
                                                setJudgeScores(updated);
                                            }}
                                            aria-label={`Nilai juri ${idx + 1}`}
                                            className="font-mono text-2xl font-bold text-center"
                                            size="sm"
                                        />
                                        <div className="mt-2 text-[10px]">
                                            {isMin && <span className="text-red-600 font-bold">Terendah (Dibuang)</span>}
                                            {isMax && <span className="text-red-600 font-bold">Tertinggi (Dibuang)</span>}
                                            {!isMin && !isMax && <span className="text-emerald-700 font-medium">Dihitung (Sah)</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-[#f7f4ef] rounded-xl p-4 border border-[#ede9e1] text-xs text-[#7a746e] flex items-center justify-between">
                            <span>Sistem kalkulasi: Nilai tertinggi ({maxScore}) dan terendah ({minScore}) otomatis dibuang untuk objektivitas penilaian.</span>
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => setNotification({ title: 'Ringkasan nilai Embu', message: `Nilai akhir: ${finalEmbuScore}. Nilai tertinggi (${maxScore}) dan terendah (${minScore}) dikeluarkan. Ringkasan ini belum disimpan ke hasil pertandingan.`, variant: 'info' })}
                                className="px-4 py-2 text-xs font-semibold bg-[#0f0d0b] hover:bg-[#25201b] text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <i className="fa-solid fa-calculator mr-1.5 text-[#d4a843]" aria-hidden="true"></i> Ringkasan Nilai
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
