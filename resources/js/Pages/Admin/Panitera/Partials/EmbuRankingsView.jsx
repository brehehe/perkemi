import Badge from '@/Components/UI/Elements/Badge';
import TableContainer from '@/Components/UI/DataDisplay/TableContainer';

const formatScore = (value) => (value === null || value === undefined ? '—' : Number(value).toFixed(2));

function JudgeScores({ score }) {
    if (!score) return <span className="text-[#9b9188] italic">Belum dinilai</span>;
    const usesTrimmedScore = score.judge_scores && score.judge_scores.length === 5;
    const minIndex = usesTrimmedScore ? score.judge_scores.indexOf(Math.min(...score.judge_scores)) : -1;
    const maxIndex = usesTrimmedScore ? score.judge_scores.lastIndexOf(Math.max(...score.judge_scores)) : -1;

    return (
        <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4].map((index) => {
                const value = score.judge_scores?.[index];
                const judgeNumber = score.judge_numbers?.[index] || index + 1;
                const hasScore = value !== undefined && value !== null && value !== '';
                const isTrimmed = usesTrimmedScore && (index === minIndex || index === maxIndex);

                return (
                    <span
                        key={index}
                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] ${
                            !hasScore
                                ? 'border-dashed border-slate-200 bg-slate-50 text-slate-400'
                                : isTrimmed
                                ? 'border-rose-200 bg-rose-50 text-rose-500 line-through'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold'
                        }`}
                        title={hasScore ? `Juri ${judgeNumber}: ${formatScore(value)}` : `Juri ${judgeNumber}: Belum diisi`}
                    >
                        W{judgeNumber}: {hasScore ? formatScore(value) : '—'}
                    </span>
                );
            })}
        </div>
    );
}

function EmbuRankingTable({ rows = [], quota = null, isFinal = false }) {
    return (
        <TableContainer ariaLabel={isFinal ? 'Klasemen final Embu' : 'Klasemen penyisihan Embu'}>
            <table className="responsive-data-table responsive-data-table--cards min-w-full text-left text-xs">
                <thead className="bg-[#f8f5f0] text-[10px] uppercase tracking-wide text-[#7a746e] border-b border-[#eee8e0]">
                    <tr>
                        <th className="px-4 py-2.5">Peringkat</th>
                        <th className="px-4 py-2.5">Peserta / Tim & Kontingen</th>
                        <th className="px-4 py-2.5">Court & Jadwal</th>
                        <th className="px-4 py-2.5">Nilai 5 Wasit</th>
                        <th className="px-4 py-2.5">Denda</th>
                        <th className="px-4 py-2.5">{isFinal ? 'Akumulasi Nilai' : 'Nilai Akhir'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e1]">
                    {rows.map((row, index) => {
                        const qualified = quota && quota !== 999 && index < quota;
                        const rankNum = index + 1;
                        const isMedalist = isFinal && rankNum <= 4;

                        return (
                            <tr
                                key={row.match_id}
                                className={`transition-colors ${
                                    isMedalist
                                        ? rankNum === 1
                                            ? 'bg-amber-50/50'
                                            : rankNum === 2
                                            ? 'bg-slate-50/60'
                                            : 'bg-orange-50/40'
                                        : qualified
                                        ? 'bg-emerald-50/40'
                                        : 'hover:bg-[#fcfaf7]'
                                }`}
                            >
                                <td data-label="Peringkat" className="whitespace-nowrap px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-black ${
                                                isFinal && rankNum === 1
                                                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                                                    : isFinal && rankNum === 2
                                                    ? 'bg-slate-300 text-slate-800'
                                                    : isFinal && rankNum <= 4
                                                    ? 'bg-amber-700 text-white'
                                                    : 'bg-slate-100 text-slate-700'
                                            }`}
                                        >
                                            #{rankNum}
                                        </span>
                                        {isFinal && rankNum === 1 && (
                                            <span className="text-[10px] font-bold text-amber-800">🥇 Emas</span>
                                        )}
                                        {isFinal && rankNum === 2 && (
                                            <span className="text-[10px] font-bold text-slate-700">🥈 Perak</span>
                                        )}
                                        {isFinal && (rankNum === 3 || rankNum === 4) && (
                                            <span className="text-[10px] font-bold text-orange-800">🥉 Perunggu</span>
                                        )}
                                        {qualified && !isFinal && (
                                            <Badge variant="green" size="xs">
                                                Tiket Final
                                            </Badge>
                                        )}
                                        {row.manual_tiebreak_winner && (
                                            <Badge variant="gold" size="xs">
                                                Unggul Skenario E
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td data-label="Peserta / Tim & Kontingen" className="min-w-60 px-4 py-3">
                                    <p className="font-bold text-[#17120f] text-xs sm:text-[13px]">{row.participant_label}</p>
                                    <p className="mt-0.5 text-[11px] text-[#7a746e]">
                                        {row.metadata?.members?.join(', ') || row.metadata?.contingent_name || 'Data peserta'}
                                    </p>
                                    {row.metadata?.city && row.metadata?.city !== row.metadata?.contingent_name && (
                                        <p className="text-[10px] text-slate-500">{row.metadata.city}</p>
                                    )}
                                </td>
                                <td data-label="Court & Jadwal" className="min-w-36 px-4 py-3">
                                    <p className="font-semibold text-[#17120f]">{row.court || 'Court —'}</p>
                                    <p className="mt-0.5 text-[10.5px] text-[#7a746e]">{row.scheduled_at || 'Belum dijadwalkan'}</p>
                                </td>
                                <td data-label="Nilai 5 Wasit" className="min-w-64 px-4 py-3">
                                    <JudgeScores score={row.score} />
                                </td>
                                <td data-label="Denda" className="whitespace-nowrap px-4 py-3 font-semibold text-rose-700">
                                    {row.score && (row.score.total_penalty > 0 || row.score.time_penalty > 0)
                                        ? `-${formatScore(row.score.total_penalty ?? row.score.time_penalty)}`
                                        : row.score
                                        ? '0.00'
                                        : '—'}
                                </td>
                                <td data-label={isFinal ? 'Akumulasi Nilai' : 'Nilai Akhir'} className="whitespace-nowrap px-4 py-3">
                                    {isFinal ? (
                                        <div>
                                            <p className="text-[10.5px] text-[#7a746e]">
                                                P {formatScore(row.preliminary_score)} + F {formatScore(row.final_round_score)}
                                            </p>
                                            <p className="mt-0.5 text-base sm:text-lg font-black text-[#9a6b20]">
                                                {formatScore(row.total_score)}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="text-base sm:text-lg font-black text-[#9a6b20]">
                                            {formatScore(row.score?.final_score)}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-[#7a746e] italic">
                                Belum ada peserta pada babak ini.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </TableContainer>
    );
}

export default function EmbuRankingsView({ embuData, categoryName = '' }) {
    if (!embuData) {
        return (
            <div className="rounded-xl border border-dashed border-[#dcd4ca] bg-[#faf8f5] p-8 text-center text-xs text-[#746c64]">
                <i className="fa-solid fa-ranking-star mb-2 text-2xl text-[#b5afa6]" />
                <p className="font-semibold">Data Penilaian Embu Belum Tersedia</p>
                <p className="mt-1 text-slate-500">Nilai akan tampil setelah dewan wasit juri mengesahkan form penilaian.</p>
            </div>
        );
    }

    const {
        preliminary_rankings: preliminaryRankings = {},
        final_rankings: finalRankings = [],
        quota_per_pool: quotaPerPool = null,
        boundary_ties: boundaryTies = [],
        has_top_four_tie: hasTopFourTie = false,
    } = embuData;

    const poolEntries = Object.entries(preliminaryRankings);

    return (
        <div className="space-y-6">
            {/* KLASMEN BABAK FINAL */}
            <section className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#ede9e1] bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 p-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black shadow-2xs">
                            <i className="fa-solid fa-trophy text-sm" />
                        </span>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                <span>Klasemen Babak Final {categoryName ? `· ${categoryName}` : ''}</span>
                                <Badge variant="gold" size="xs">Penentu Juara</Badge>
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-600">
                                Nilai total akumulasi = Penyisihan + Final. Tie-break PB Perkemi Skenario A–E.
                            </p>
                        </div>
                    </div>
                    {hasTopFourTie && (
                        <Badge variant="red" size="sm">
                            <i className="fa-solid fa-triangle-exclamation mr-1" />
                            Ada Nilai Seri di 4 Besar
                        </Badge>
                    )}
                </div>

                <EmbuRankingTable rows={finalRankings} isFinal={true} />
            </section>

            {/* KLASMEN BABAK PENYISIHAN (JIKA ADA POOL) */}
            {poolEntries.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <i className="fa-solid fa-layer-group text-blue-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Klasemen Babak Penyisihan ({poolEntries.length} Pool)
                        </h4>
                    </div>

                    {poolEntries.map(([pool, rows]) => (
                        <section key={pool} className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#ede9e1] bg-[#f8f5f0] p-3.5">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-lg bg-blue-600 px-2 py-0.5 font-mono text-xs font-black text-white">
                                        Pool {pool}
                                    </span>
                                    <h4 className="text-sm font-bold text-[#17120f]">
                                        Penyisihan Pool {pool}
                                    </h4>
                                </div>
                                {quotaPerPool && (
                                    <span className="text-[11px] font-semibold text-emerald-700">
                                        Top {quotaPerPool} terbaik melaju ke Babak Final
                                    </span>
                                )}
                            </div>
                            <EmbuRankingTable rows={rows} quota={quotaPerPool} isFinal={false} />
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

