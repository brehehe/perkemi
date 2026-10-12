<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\EventStaffDemoData;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use RuntimeException;

class SeedEventStaffDemo extends Command
{
    protected $signature = 'event:seed-official-demo
                            {event : UUID event yang akan diisi petugas dummy}
                            {--delete : Hapus hanya petugas dummy yang dibuat command ini}
                            {--simple-wasit-login : Gunakan wasit1@example.test dan password wasit1, berurutan sesuai jumlah Wasit}
                            {--password= : Password bersama untuk akun login dummy; bila kosong dibuat otomatis}';

    protected $description = 'Buat atau hapus master, akun login, dan penugasan petugas dummy untuk satu event';

    public function handle(EventStaffDemoData $demoData): int
    {
        $event = Event::query()->find((string) $this->argument('event'));

        if (! $event) {
            $this->error('Event tidak ditemukan. Periksa kembali UUID event.');

            return self::FAILURE;
        }

        try {
            if ($this->option('delete')) {
                $result = $demoData->delete($event);

                $this->info("Petugas dummy untuk '{$event->name}' berhasil dihapus.");
                $this->line("Akun: {$result['users']}, wasit: {$result['referees']}, panitera: {$result['clerks']}, koordinator: {$result['field_coordinators']}, penugasan court: {$result['court_assignments']}.");

                return self::SUCCESS;
            }

            $passwordOption = $this->option('password');
            $password = is_string($passwordOption) && $passwordOption !== ''
                ? $passwordOption
                : Str::password(16);

            if (Str::length($password) < 8) {
                throw new RuntimeException('Password akun dummy minimal 8 karakter.');
            }

            $useSimpleRefereeAccounts = (bool) $this->option('simple-wasit-login');
            $result = $demoData->create($event, $password, $useSimpleRefereeAccounts);
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }

        $this->info("Petugas dummy untuk '{$event->name}' berhasil dibuat.");
        $this->line("Wasit: {$result['referees']}, panitera: {$result['clerks']}, koordinator: {$result['field_coordinators']}, akun login: {$result['users']}, penugasan court: {$result['court_assignments']}.");
        $this->newLine();
        $this->table(
            ['Peran login', 'Nama', 'Email', 'Bagian'],
            array_map(
                fn (array $account): array => [
                    $account['role'],
                    $account['name'],
                    $account['email'],
                    $account['court'],
                ],
                $result['accounts'],
            ),
        );
        if ($useSimpleRefereeAccounts) {
            $this->warn("Login Wasit: wasit1@example.test sampai wasit{$result['referees']}@example.test.");
            $this->warn('Password setiap Wasit sama dengan nama sebelum @, contoh: wasit1.');
            $this->line("Password akun dummy selain Wasit: {$password}");
        } else {
            $this->warn("Password bersama akun dummy: {$password}");
        }

        return self::SUCCESS;
    }
}
