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
                            {--generate-panels : Langsung generate penugasan panel 5 wasit untuk setiap court aktif}';

    protected $description = 'Hapus wasit/petugas dummy dan buat akun serta roster wasit/petugas real sesuai SK POPDA Perkemi';

    /**
     * @var list<array{
     *     no: int,
     *     name: string,
     *     dan_grade: string,
     *     nik: string,
     *     position: string,
     *     roles: list<string>,
     *     is_event_referee: bool,
     *     is_coordinator: bool,
     *     certification_level: string
     * }>
     */
    protected array $officials = [
        [
            'no' => 1,
            'name' => 'M. Djamhuri Djauhari',
            'dan_grade' => 'V DAN',
            'nik' => '69.1.13.03.99.001',
            'position' => 'Arbitrase / Koordinator Pertandingan',
            'roles' => ['Arbitrase', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 2,
            'name' => 'Bernard Laisina',
            'dan_grade' => 'V DAN Daikenshi',
            'nik' => '76.1.13.01.04.001',
            'position' => 'Arbitrase / Koordinator Pertandingan',
            'roles' => ['Arbitrase', 'Pertandingan'],
            'is_event_referee' => false,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 3,
            'name' => 'Daud Tatengkeng',
            'dan_grade' => 'V DAN',
            'nik' => '69.1.13.03.99.002',
            'position' => 'Koordinator Court',
            'roles' => ['Koordinator Lapangan', 'Court'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 4,
            'name' => 'Sugiono',
            'dan_grade' => 'IV DAN',
            'nik' => '70.1.13.01.04.002',
            'position' => 'Koordinator Court',
            'roles' => ['Koordinator Lapangan', 'Court'],
            'is_event_referee' => false,
            'is_coordinator' => true,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 5,
            'name' => 'dr Ihyan Amri',
            'dan_grade' => 'IV DAN',
            'nik' => '74.1.06.01.01.001',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 6,
            'name' => 'Joko Listyono',
            'dan_grade' => 'IV DAN',
            'nik' => '87.2.13.04.04.007',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 7,
            'name' => 'Antonius Eko Purnomo',
            'dan_grade' => 'IV DAN',
            'nik' => '85.1.13.03.01.001',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 8,
            'name' => 'Esau Moses Christiaan',
            'dan_grade' => 'IV DAN',
            'nik' => '88.3.13.03.01.001',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 9,
            'name' => 'Sarip Maulana Bathik',
            'dan_grade' => 'IV DAN',
            'nik' => '87.1.13.01.12.002',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 10,
            'name' => 'Arya Setyanto Wicaksono',
            'dan_grade' => 'IV DAN',
            'nik' => '90.3.13.01.20.001',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 11,
            'name' => 'Luluk Cahyono',
            'dan_grade' => 'IV DAN',
            'nik' => '90.3.13.11.01.001',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 12,
            'name' => 'Hari Winarko',
            'dan_grade' => 'IV DAN',
            'nik' => '88.3.13.12.01.005',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Nasional',
        ],
        [
            'no' => 13,
            'name' => 'Anik Yussetyowati',
            'dan_grade' => 'III DAN',
            'nik' => '92.2.13.01.13.004',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 14,
            'name' => 'Rahayu Apriliyanti',
            'dan_grade' => 'III DAN',
            'nik' => '86.1.13.09.01.003',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 15,
            'name' => 'Thalib Alkatiri',
            'dan_grade' => 'III DAN',
            'nik' => '87.1.13.01.09.002',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 16,
            'name' => 'Tri Saraswati',
            'dan_grade' => 'III DAN',
            'nik' => '90.3.13.03.01.013',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 18,
            'name' => 'Rizqi Febrian Pramudita',
            'dan_grade' => 'III DAN',
            'nik' => '07.1.13.10.04.010',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 19,
            'name' => 'Iwan Wijaya',
            'dan_grade' => 'III DAN',
            'nik' => '77.1.02.03.01.003',
            'position' => 'Wasit',
            'roles' => ['Wasit'],
            'is_event_referee' => true,
            'is_coordinator' => false,
            'certification_level' => 'Wasit Daerah',
        ],
        [
            'no' => 21,
            'name' => 'Ismail Wahyuono',
            'dan_grade' => 'III DAN',
            'nik' => '89.3.13.09.03.001',
            'position' => 'Wasit',
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

        $this->info("Menghapus wasit & petugas dummy untuk event: {$event->name}...");

        DB::transaction(function () use ($event, $demoData): void {
            // 1. Hapus demo data jika ada
            try {
                $demoData->delete($event);
            } catch (\Throwable) {
                // Abaikan jika tidak ada demo data
            }

            // 2. Bersihkan user wasit dummy sisa (wasit%@example.test)
            $dummyUsers = User::query()
                ->where('email', 'like', 'wasit%@example.test')
                ->orWhere('email', 'like', '%dummy%')
                ->get();

            foreach ($dummyUsers as $user) {
                $user->referee()?->forceDelete();
                $user->forceDelete();
            }

            // 3. Bersihkan referee bertanda dummy
            Referee::query()
                ->where('license_number', 'like', '%-DMO-%')
                ->orWhere('notes', 'like', '%DUMMY%')
                ->orWhere('name', 'like', '%Dummy%')
                ->forceDelete();
        });

        $this->info('Data dummy berhasil dibersihkan.');
        $this->info("Membuat akun dan data wasit & petugas real untuk: {$event->name}...");

        $tableRows = [];

        DB::transaction(function () use ($event, &$tableRows): void {
            foreach ($this->officials as $official) {
                $cleanSlug = Str::slug($official['name'], '.');
                $email = "{$cleanSlug}@smart-perkemi.id";
                $password = $official['nik'];

                // 1. Buat / update User
                $user = User::withTrashed()->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();

                if (! $user) {
                    $user = User::query()->create([
                        'name' => $official['name'],
                        'email' => $email,
                        'password' => Hash::make($password),
                        'email_verified_at' => now(),
                    ]);
                } else {
                    if ($user->trashed()) {
                        $user->restore();
                    }
                    $user->name = $official['name'];
                    $user->password = Hash::make($password);
                    $user->email_verified_at = now();
                    $user->save();
                }

                // 2. Assign Spatie Roles
                foreach ($official['roles'] as $roleName) {
                    $user->assignRole(Role::findOrCreate($roleName, 'web'));
                }

                // 3. Kaitkan ke Event User
                $event->users()->syncWithoutDetaching([
                    $user->id => ['access_role' => Event::AccessRoleStaff],
                ]);

                // 4. Buat / update Master Referee
                $referee = Referee::withTrashed()
                    ->where('license_number', $official['nik'])
                    ->orWhere('user_id', $user->id)
                    ->first();

                if (! $referee) {
                    $referee = Referee::query()->create([
                        'user_id' => $user->id,
                        'name' => $official['name'],
                        'dan_grade' => $official['dan_grade'],
                        'license_number' => $official['nik'],
                        'certification_level' => $official['certification_level'],
                        'region' => 'Jawa Timur',
                        'email' => $email,
                        'is_active' => true,
                    ]);
                } else {
                    if ($referee->trashed()) {
                        $referee->restore();
                    }
                    $referee->update([
                        'user_id' => $user->id,
                        'name' => $official['name'],
                        'dan_grade' => $official['dan_grade'],
                        'license_number' => $official['nik'],
                        'certification_level' => $official['certification_level'],
                        'region' => 'Jawa Timur',
                        'email' => $email,
                        'is_active' => true,
                    ]);
                }

                // 5. Jika bertugas sebagai Wasit Event, attach ke event & catat kehadiran hari ini
                if ($official['is_event_referee']) {
                    $event->referees()->syncWithoutDetaching([
                        $referee->id => ['role' => 'referee'],
                    ]);

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

                // 6. Jika bertugas sebagai Koordinator Court
                if ($official['is_coordinator']) {
                    $coordinator = FieldCoordinator::withTrashed()
                        ->where('coordinator_number', $official['nik'])
                        ->first();

                    if (! $coordinator) {
                        $coordinator = FieldCoordinator::query()->create([
                            'coordinator_number' => $official['nik'],
                            'name' => $official['name'],
                            'region' => 'Jawa Timur',
                            'email' => $email,
                            'is_active' => true,
                        ]);
                    } else {
                        if ($coordinator->trashed()) {
                            $coordinator->restore();
                        }
                        $coordinator->update([
                            'name' => $official['name'],
                            'region' => 'Jawa Timur',
                            'email' => $email,
                            'is_active' => true,
                        ]);
                    }

                    $event->fieldCoordinators()->syncWithoutDetaching([
                        $coordinator->id => ['assignment_area' => 'court'],
                    ]);
                }

                $tableRows[] = [
                    $official['no'],
                    $official['name'],
                    $official['dan_grade'],
                    $official['certification_level'],
                    $email,
                    $password,
                    $official['position'],
                ];
            }
        });

        $this->newLine();
        $this->table(
            ['No', 'Nama', 'Tingkatan', 'Sertifikasi', 'Email', 'Password (NIK)', 'Jabatan'],
            $tableRows
        );

        $this->info('Semua akun dan data real berhasil dibuat!');

        if ($this->option('generate-panels')) {
            $this->info('Mengenerate penugasan court panel 5 wasit...');
            $count = $generatePanelsAction->execute($event, null);
            $this->info("Berhasil mengenerate penugasan {$count} wasit untuk court aktif.");
        }

        return self::SUCCESS;
    }
}
