import TableContainer from '@/Components/UI/DataDisplay/TableContainer';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Input } from '@/Components/UI';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function ArbitrationReferee({ referees, stats, filters, activeEvent, canManageEventReferees }) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/admin/arbitrase/wasit', { search }, { preserveState: true });
    };

    return (
        <AdminLayout title="Data Wasit & Juri">
            <Head title="Data Wasit & Juri | Smart Perkemi" />

            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0f0d0b] via-[#1a1714] to-[#0f0d0b] text-[#f7f4ef] rounded-2xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-[radial-gradient(circle,rgba(212,168,67,0.25)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#d4a843] font-medium tracking-wide uppercase mb-1">
                                <i className="fa-solid fa-gavel"></i>
                                <span>Korps Wasit & Juri Shorinji Kempo</span>
                            </div>
                            <h1 className="font-cinzel text-xl md:text-2xl font-bold tracking-tight text-white">
                                Data Wasit & Juri Pertandingan
                            </h1>
                            <p className="text-xs text-[#b5afa6] mt-1 max-w-2xl">
                                Wasit dan juri yang ditugaskan untuk {activeEvent?.name || 'event aktif'}.
                            </p>
                        </div>

                        {canManageEventReferees && (
                            <Button variant="unstyled" size="none"
                                type="button"
                                onClick={() => router.visit('/admin/master/event/detail')}
                                className="px-4 py-2 text-xs font-semibold bg-[#d4a843] hover:bg-[#b88f34] text-[#0f0d0b] rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md self-start md:self-auto"
                            >
                                <i className="fa-solid fa-pen-to-square"></i>
                                <span>Kelola Wasit Event</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Total Wasit Terdaftar</span>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-users"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-[#0f0d0b] mt-2 font-cinzel">{stats.total_referees ?? 0}</p>
                        <span className="text-[10px] text-[#7a746e]">Perangkat pertandingan</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Lisensi Nasional A</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-certificate"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-emerald-700 mt-2 font-cinzel">{stats.national_a ?? 0}</p>
                        <span className="text-[10px] text-emerald-600">Wasit Utama (Chief)</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Lisensi Nasional B</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-award"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-blue-700 mt-2 font-cinzel">{stats.national_b ?? 0}</p>
                        <span className="text-[10px] text-blue-600">Juri Sudut & Garis</span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-[#7a746e]">Lisensi Daerah</span>
                            <div className="w-8 h-8 rounded-lg bg-[#d4a843]/15 text-[#d4a843] flex items-center justify-center text-xs">
                                <i className="fa-solid fa-user-shield"></i>
                            </div>
                        </div>
                        <p className="text-xl font-bold text-[#0f0d0b] mt-2 font-cinzel">{stats.regional ?? 0}</p>
                        <span className="text-[10px] text-[#7a746e]">Pengprov / Pengkab</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-xl p-4 border border-[#ede9e1] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#7a746e]">
                        Menampilkan <span className="font-semibold text-[#0f0d0b]">{referees.length}</span> wasit bertugas pada event aktif
                    </p>

                    <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-80">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama wasit / tingkatan..."
                            iconLeft={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
                            size="sm"
                            containerClassName="flex-1"
                        />
                        <Button type="submit" variant="dark" size="sm">
                            Cari
                        </Button>
                    </form>
                </div>

                {/* Table Data Wasit */}
                <div className="bg-white rounded-xl border border-[#ede9e1] shadow-xs overflow-hidden">
                    <TableContainer className="custom-scrollbar" ariaLabel="Tabel data">
                        <table className="responsive-data-table whitespace-nowrap w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#ede9e1] bg-[#fbfaf8] text-[11px] font-semibold text-[#7a746e] uppercase tracking-wider">
                                    <th className="py-3 px-4 whitespace-nowrap">Nama Sensei / Wasit</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Tingkatan Dan</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Sertifikasi & Lisensi</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Asal Pengprov / Dojo</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Kontak</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Peran di Event</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede9e1] text-xs text-[#0f0d0b]">
                                {referees.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-10 px-4 text-center text-[#7a746e]">
                                            Belum ada wasit yang ditugaskan pada event ini.
                                        </td>
                                    </tr>
                                ) : referees.map((ref) => (
                                    <tr key={ref.id} className="hover:bg-[#f7f4ef]/50 transition-colors">
                                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#0f0d0b]">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-[#0f0d0b] text-[#d4a843] flex items-center justify-center font-cinzel font-bold text-xs">
                                                    審
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[#0f0d0b]">{ref.name}</p>
                                                    <p className="text-[10px] text-[#7a746e] font-mono">ID: {ref.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#f7f4ef] border border-[#ede9e1] text-[#0f0d0b]">
                                                {ref.dan_grade}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <i className="fa-solid fa-certificate text-[9px]"></i>
                                                {ref.license}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap text-[#7a746e]">
                                            {ref.region}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[#7a746e]">
                                            {ref.phone}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-center">
                                            {ref.role || '-'}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${ref.is_active ? 'text-emerald-700 bg-emerald-50' : 'text-[#7a746e] bg-[#f7f4ef]'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${ref.is_active ? 'bg-emerald-500' : 'bg-[#b5afa6]'}`}></span> {ref.is_active ? 'Siap Tugas' : 'Tidak Aktif'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></TableContainer>
                </div>

            </div>
        </AdminLayout>
    );
}
