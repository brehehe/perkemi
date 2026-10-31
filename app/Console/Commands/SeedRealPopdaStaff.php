<?php

namespace App\Console\Commands;

use App\Actions\Admin\Tournament\GenerateRefereeCourtPanelsAction;
use App\Models\Event;
use App\Models\FieldCoordinator;
use App\Models\Referee;
use App\Models\RefereeAttendance;
use App\Models\Role;
use App\Models\User;
use App\Services\EventStaffDemoData;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SeedRealPopdaStaff extends Command
{
    protected $signature = 'perkemi:seed-real-referees
                            {event=01a10112-aeff-7254-8a89-2e315b7f16f9 : UUID event (default POPDA)}
                            {--generate-panels : Langsung generate penugasan panel 5 wasit untuk setiap court aktif}
                            {--force-clean : Hapus wasit/petugas dummy sebelum seeding (HANYA untuk lingkungan pengujian/dev, TIDAK DIJALANKAN di production)}';

    protected $description = 'Sinkronisasi akun & data real 21 personil Arbitrase, Koordinator, dan Wasit POPDA XV dari popda.csv (Aman & Idempoten untuk Production)';

    /**
     * Fallback roster jika file popda.csv tidak terbaca.
     *
     * @var list<array{
     *     name: string,
     *     nik: string,
     *     dan_grade: string,
     *     certificate_number: string,
     *     position: string,
     *     city: string,
     *     roles: list<string>,
     *     is_event_referee: bool,
     *     is_coordinator: bool,
     *     certification_level: string
     * }>
     */
    protected array $fallbackOfficials = [
        [
            'name' => 'M. Djamhuri Djauhari',
            'nik' => '69.1.13.03.99.001',
            'dan_grade' => 'V DAN',
            'certificate_number' => '038/WST-NAS/XI/2024',
            'position' => 'Arbitrase Pertandingan',
            'city' => 'Kabupaten Malang',
            'roles' => ['Arbitrase', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'name' => 'Bernard Laisina',
            'nik' => '76.1.13.01.04.001',
            'dan_grade' => 'V DAN Daikenshi',
            'certificate_number' => '033/WST-NAS/X/2022',
            'position' => 'Arbitrase Pertandingan',
            'city' => 'Kota Surabaya',
            'roles' => ['Arbitrase', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'name' => 'Bambang Andjar Supeno',
            'nik' => '70.1.13.03.01.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '024/REF-WST-NAS/VII/2023',
            'position' => 'Arbitrase Pertandingan',
            'city' => 'Kota Malang',
            'roles' => ['Arbitrase', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'name' => 'Wawan Setyawan',
            'nik' => '85.2.13.03.08.001',
            'dan_grade' => 'V DAN Daikenshi',
            'certificate_number' => '009/WST-NAS/IX/2025',
            'position' => 'Koordinator Pertandingan',
            'city' => 'Gresik',
            'roles' => ['Koordinator Lapangan', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'name' => 'dr. Ibnu Widagdo',
            'nik' => '77.1.13.01.04.001',
            'dan_grade' => 'V DAN',
            'certificate_number' => '039/WST-NAS/XI/2024',
            'position' => 'Wakil Koordinator Pertandingan',
            'city' => 'Kota Surabaya',
            'roles' => ['Koordinator Lapangan', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'name' => 'Daud Tatengkeng',
            'nik' => '69.1.13.03.99.002',
            'dan_grade' => 'V DAN',
            'certificate_number' => '029/WST-DRH/X/2025',
            'position' => 'Koordinator Court',
            'city' => 'Tuban',
            'roles' => ['Koordinator Lapangan', 'Court'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Sugiono',
            'nik' => '70.1.13.01.04.002',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '037/WST-DRH/X/2025',
            'position' => 'Koordinator Court',
            'city' => 'Kota Surabaya',
            'roles' => ['Koordinator Lapangan', 'Court'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'dr. Ihyan Amri',
            'nik' => '74.1.06.01.01.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '040/WST-DRH/X/2025',
            'position' => 'Wasit Utama',
            'city' => 'Kota Surabaya',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Joko Listyono',
            'nik' => '87.2.13.04.04.007',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '018/WST-DRH/X/2025',
            'position' => 'Wasit Utama',
            'city' => 'Kota Pasuruan',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Antonius Eko Purnomo',
            'nik' => '85.1.13.03.01.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '017/WST-DRH/X/2025',
            'position' => 'Wasit Utama',
            'city' => 'Kota Malang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Esau Moses Christiaan',
            'nik' => '88.3.13.03.01.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '010/WST-DRH/VII/2024',
            'position' => 'Wasit Utama',
            'city' => 'Kota Malang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Sarip Maulana Bathik',
            'nik' => '87.1.13.01.12.002',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '030/WST-DRH/X/2025',
            'position' => 'Wasit Utama',
            'city' => 'Kota Surabaya',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Arya Setyanto Wicaksono',
            'nik' => '90.3.13.01.20.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '038/WST-DRH/X/2025',
            'position' => 'Wasit Utama',
            'city' => 'Kota Surabaya',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Luluk Cahyono',
            'nik' => '90.3.13.11.01.001',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '002/WST-DRH/II/2024',
            'position' => 'Wasit Utama',
            'city' => 'Bojonegoro',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Hari Winarko',
            'nik' => '88.3.13.12.01.005',
            'dan_grade' => 'IV DAN',
            'certificate_number' => '026/WST-DRH/VII/2022',
            'position' => 'Wasit Utama',
            'city' => 'Tuban',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Anik Yussetyowati',
            'nik' => '92.2.13.01.13.004',
            'dan_grade' => 'III DAN',
            'certificate_number' => '023/WST-DRH/X/2025',
            'position' => 'Wasit',
            'city' => 'Kota Malang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Rahayu Apriliyanti',
            'nik' => '86.1.13.09.01.003',
            'dan_grade' => 'III DAN',
            'certificate_number' => '021/WST-DRH/X/2025',
            'position' => 'Wasit',
            'city' => 'Jombang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Thalib Alkatiri',
            'nik' => '87.1.13.01.09.002',
            'dan_grade' => 'III DAN',
            'certificate_number' => '001/WST-DRH/II/2024',
            'position' => 'Wasit',
            'city' => 'Kota Surabaya',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Tri Saraswati',
            'nik' => '90.3.13.03.01.013',
            'dan_grade' => 'III DAN',
            'certificate_number' => '032/WST-DRH/X/2025',
            'position' => 'Wasit',
            'city' => 'Kabupaten Malang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Iwan Wijaya',
            'nik' => '77.1.02.03.01.003',
            'dan_grade' => 'III DAN',
            'certificate_number' => '051/WST-DRH/IX/2026',
            'position' => 'Wasit',
            'city' => 'Bangkalan',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'name' => 'Ismail Wahyuono',
            'nik' => '89.3.13.09.03.001',
            'dan_grade' => 'III DAN',
            'certificate_number' => '045/WST-DRH/IX/2026',
            'position' => 'Wasit',
            'city' => 'Jombang',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
    ];

    public function handle(
        EventStaffDemoData $demoData,
        GenerateRefereeCourtPanelsAction $generatePanelsAction,
    ): int {
        $eventId = (string) $this->argument('event');
        $event = Event::query()->find($eventId);

        if (! $event) {
            $this->error("Event dengan UUID '{$eventId}' tidak ditemukan.");

            return self::FAILURE;
        }

        $officials = $this->loadOfficialsFromCsv();

        $this->info("=== Sinkronisasi Roster Resmi POPDA XV ({$event->name}) ===");
        $this->info('Total personil yang diproses: '.count($officials).' orang.');

        // Jika dan hanya jika user menambahkan flag --force-clean (khusus testing lokal)
        if ($this->option('force-clean')) {
            $this->warn('Menjalankan pembersihan data dummy (--force-clean aktif)...');
            DB::transaction(function () use ($event, $demoData): void {
                try {
                    $demoData->delete($event);
                } catch (\Throwable) {
                    // Abaikan jika tidak ada demo data
                }

                $dummyUsers = User::query()
                    ->where('email', 'like', 'wasit%@example.test')
                    ->orWhere('email', 'like', '%dummy%')
                    ->get();

                foreach ($dummyUsers as $user) {
                    $user->referee()?->forceDelete();
                    $user->forceDelete();
                }

                Referee::query()
                    ->where('license_number', 'like', '%-DMO-%')
                    ->orWhere('notes', 'like', '%DUMMY%')
                    ->orWhere('name', 'like', '%Dummy%')
                    ->forceDelete();
            });
            $this->info('Pembersihan data dummy selesai.');
        } else {
            $this->info('Mode produksi aman: Tidak ada penghapusan data (Hanya pembaruan/penambahan idempoten).');
        }

        $tableRows = [];

        DB::transaction(function () use ($event, $officials, &$tableRows): void {
            $counter = 1;

            foreach ($officials as $official) {
                $cleanSlug = Str::slug($official['name'], '.');
                $email = "{$cleanSlug}@smart-perkemi.id";
                $password = $official['nik']; // Default password adalah NIK

                // 1. Cari atau buat User dengan aman
                $user = User::withTrashed()
                    ->where('nik_perkemi', $official['nik'])
                    ->orWhereRaw('LOWER(email) = ?', [mb_strtolower($email)])
                    ->first();

                if (! $user) {
                    $user = User::query()->create([
                        'name' => $official['name'],
                        'email' => $email,
                        'nik_perkemi' => $official['nik'],
                        'password' => Hash::make($password),
                        'email_verified_at' => now(),
                    ]);
                } else {
                    if ($user->trashed()) {
                        $user->restore();
                    }
                    $user->name = $official['name'];
                    $user->nik_perkemi = $official['nik'];
                    $user->email_verified_at = $user->email_verified_at ?? now();
                    // Jika password belum pernah diset atau ingin dipastikan sinkron dengan NIK
                    if (! $user->password) {
                        $user->password = Hash::make($password);
                    }
                    $user->save();
                }

                // 2. Assign Spatie Roles
                foreach ($official['roles'] as $roleName) {
                    $role = Role::findOrCreate($roleName, 'web');
                    if (! $user->hasRole($roleName)) {
                        $user->assignRole($role);
                    }
                }

                // 3. Kaitkan ke Event User
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);

                // 4. Jika bertugas sebagai Wasit (Utama / Pembantu), kelola Master Referee
                if ($official['is_event_referee']) {
                    $referee = Referee::withTrashed()
                        ->where('license_number', $official['nik'])
                        ->orWhere('user_id', $user->id)
                        ->first();

                    $refereeData = [
                        'user_id' => $user->id,
                        'name' => $official['name'],
                        'dan_grade' => $official['dan_grade'],
                        'license_number' => $official['nik'],
                        'certification_level' => $official['certification_level'],
                        'region' => $official['city'], // Kota / Kabupaten Asal
                        'email' => $email,
                        'is_active' => true,
                    ];

                    if (! $referee) {
                        $referee = Referee::query()->create($refereeData);
                    } else {
                        if ($referee->trashed()) {
                            $referee->restore();
                        }
                        $referee->update($refereeData);
                    }

                    // Attach ke Event Referees
                    $event->referees()->syncWithoutDetaching([
                        $referee->id => ['role' => 'referee'],
                    ]);

                    // Catat kehadiran hari ini agar siap ditugaskan / digenerate
                    RefereeAttendance::query()->updateOrCreate(
                        [
                            'event_id' => $event->id,
                            'referee_id' => $referee->id,
                            'attendance_date' => now()->toDateString(),
                        ],
                        [
                            'is_present' => true,
                            'checked_in_at' => now(),
                            'method' => 'manual',
                        ]
                    );
                }

                // 5. Jika bertugas sebagai Koordinator (Pertandingan / Court / Lapangan)
                if ($official['is_coordinator']) {
                    $coordinator = FieldCoordinator::withTrashed()
                        ->where('coordinator_number', $official['nik'])
                        ->first();

                    $coordData = [
                        'coordinator_number' => $official['nik'],
                        'name' => $official['name'],
                        'region' => $official['city'],
                        'email' => $email,
                        'is_active' => true,
                    ];

                    if (! $coordinator) {
                        $coordinator = FieldCoordinator::query()->create($coordData);
                    } else {
                        if ($coordinator->trashed()) {
                            $coordinator->restore();
                        }
                        $coordinator->update($coordData);
                    }

                    $assignmentArea = str_contains(strtolower($official['position']), 'court') ? 'court' : 'general';
                    $event->fieldCoordinators()->syncWithoutDetaching([
                        $coordinator->id => ['assignment_area' => $assignmentArea],
                    ]);
                }

                $tableRows[] = [
                    $counter++,
                    $official['name'],
                    $official['nik'],
                    $official['dan_grade'],
                    $official['city'],
                    $official['position'],
                    $email,
                ];
            }
        });

        $this->newLine();
        $this->table(
            ['No', 'Nama Sesuai SK', 'NIK PERKEMI', 'Tingkatan', 'Kota Asal', 'Jabatan', 'Email'],
            $tableRows
        );

        $this->info('✓ Seluruh akun dan data personil POPDA berhasil disinkronisasi tanpa menghapus data produksi.');

        if ($this->option('generate-panels')) {
            $this->info('Mengenerate penugasan court panel wasit...');
            $count = $generatePanelsAction->execute($event, null);
            $this->info("✓ Berhasil mengenerate penugasan {$count} wasit untuk court aktif.");
        }

        return self::SUCCESS;
    }

    /**
     * Membaca file CSV popda.csv atau fallback ke array baku.
     *
     * @return list<array{
     *     name: string,
     *     nik: string,
     *     dan_grade: string,
     *     certificate_number: string,
     *     position: string,
     *     city: string,
     *     roles: list<string>,
     *     is_event_referee: bool,
     *     is_coordinator: bool,
     *     certification_level: string
     * }>
     */
    protected function loadOfficialsFromCsv(): array
    {
        $csvPath = database_path('seeders/csv/popda.csv');

        if (! file_exists($csvPath)) {
            $this->warn("File {$csvPath} tidak ditemukan, menggunakan fallback roster internal.");

            return $this->fallbackOfficials;
        }

        $file = fopen($csvPath, 'r');
        if (! $file) {
            return $this->fallbackOfficials;
        }

        $header = fgetcsv($file);
        if (! $header) {
            fclose($file);

            return $this->fallbackOfficials;
        }

        $officials = [];

        while (($row = fgetcsv($file)) !== false) {
            if (empty(array_filter($row))) {
                continue; // Abaikan baris kosong
            }

            $name = trim($row[0] ?? '');
            $nik = trim($row[1] ?? '');
            $dan = trim($row[2] ?? '');
            $certificate = trim($row[3] ?? '');
            $position = trim($row[4] ?? '');
            $city = trim($row[5] ?? '');

            if ($name === '' || $nik === '') {
                continue;
            }

            $isReferee = str_contains(strtolower($position), 'wasit');
            $isCoordinator = str_contains(strtolower($position), 'koordinator');
            $isArbitrase = str_contains(strtolower($position), 'arbitrase');

            $roles = [];
            if ($isArbitrase) {
                $roles[] = 'Arbitrase';
                $roles[] = 'Pertandingan';
            } elseif ($isCoordinator) {
                $roles[] = 'Koordinator Lapangan';
                if (str_contains(strtolower($position), 'court')) {
                    $roles[] = 'Court';
                } else {
                    $roles[] = 'Pertandingan';
                }
            } elseif ($isReferee) {
                $roles[] = 'Wasit';
            }

            $certLevel = str_contains(strtoupper($certificate), 'WST-NAS') || str_contains(strtoupper($certificate), 'REF-WST-NAS')
                ? 'Wasit Nasional'
                : 'Wasit Daerah';

            $officials[] = [
                'name' => $name,
                'nik' => $nik,
                'dan_grade' => $dan,
                'certificate_number' => $certificate,
                'position' => $position,
                'city' => $city,
                'roles' => $roles,
                'is_event_referee' => $isReferee,
                'is_coordinator' => $isCoordinator,
                'certification_level' => $certLevel,
            ];
        }

        fclose($file);

        return ! empty($officials) ? $officials : $this->fallbackOfficials;
    }
}
