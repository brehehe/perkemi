<?php

namespace App\Services\Admin\Master;

use App\Actions\Admin\Master\SyncLoginAccountAction;
use App\Models\Event;
use App\Models\Referee;
use App\Support\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class EventRefereeImportService
{
    /** @var list<string> */
    private const HEADERS = [
        'id',
        'name',
        'gender',
        'dan_grade',
        'license_number',
        'certification_level',
        'region',
        'phone',
        'email',
        'password',
        'role',
    ];

    /** @var list<string> */
    private const REQUIRED_HEADERS = ['name', 'gender', 'role'];

    public function __construct(private readonly SyncLoginAccountAction $syncLoginAccount) {}

    public function template(): string
    {
        $stream = fopen('php://temp', 'w+b');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, self::HEADERS, ',', '"', '');
        rewind($stream);
        $contents = stream_get_contents($stream);
        fclose($stream);

        return $contents ?: '';
    }

    public function import(Event $event, UploadedFile $file): int
    {
        [$headers, $rows] = $this->readCsv($file);
        $missingHeaders = array_diff(self::REQUIRED_HEADERS, $headers);

        if ($missingHeaders !== []) {
            throw ValidationException::withMessages([
                'file' => 'Kolom wajib tidak ditemukan: '.implode(', ', $missingHeaders).'. Gunakan template terbaru.',
            ]);
        }

        if (count($rows) > 1000) {
            throw ValidationException::withMessages(['file' => 'Maksimal 1.000 baris untuk satu kali import.']);
        }

        DB::transaction(function () use ($event, $rows): void {
            $referees = Referee::query()->with('user')->get();

            foreach ($rows as $index => $row) {
                try {
                    $this->importRow($event, $referees, $row);
                } catch (ValidationException $exception) {
                    $message = collect($exception->errors())->flatten()->first() ?? 'Data tidak valid.';

                    throw ValidationException::withMessages([
                        'file' => 'Baris '.($index + 2).": {$message}",
                    ]);
                }
            }
        });

        return count($rows);
    }

    /**
     * @param  Collection<int, Referee>  $referees
     * @param  array<string, mixed>  $row
     */
    private function importRow(Event $event, Collection $referees, array $row): void
    {
        $referee = $this->resolveReferee($referees, $row);
        $data = Validator::make($row, [
            'id' => ['nullable', 'uuid'],
            'name' => ['required', 'string', 'max:150'],
            'gender' => ['required', Rule::in(['male', 'female'])],
            'dan_grade' => ['nullable', 'string', 'max:50'],
            'license_number' => ['nullable', 'string', 'max:100', Rule::unique('referees', 'license_number')->ignore($referee?->id)],
            'certification_level' => ['nullable', 'string', 'max:100'],
            'region' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'required_with:password', 'email', 'max:150'],
            'password' => ['nullable', Password::defaults()],
            'role' => ['required', Rule::in(['chief', 'referee', 'judge', 'reserve'])],
        ])->validate();
        $linkedUser = $referee?->user;
        $referee ??= new Referee;
        $attributes = [
            'name' => $data['name'],
            'gender' => $data['gender'],
            'is_active' => true,
        ];

        foreach (['dan_grade', 'license_number', 'certification_level', 'region', 'phone', 'email'] as $field) {
            if (filled($data[$field] ?? null)) {
                $attributes[$field] = $field === 'email' ? Str::lower($data[$field]) : $data[$field];
            }
        }

        $referee->fill($attributes);
        $user = $this->syncLoginAccount->execute(
            $referee->name,
            $referee->email,
            $data['password'] ?? null,
            'Wasit',
            $linkedUser,
            $referee->phone,
        );

        if ($user && Referee::query()
            ->where('user_id', $user->id)
            ->when($referee->exists, fn ($query) => $query->whereKeyNot($referee->id))
            ->exists()) {
            throw ValidationException::withMessages([
                'email' => 'Akun login sudah terhubung ke data wasit lain.',
            ]);
        }

        $referee->user_id = $user?->id;
        $referee->save();

        if (! $referees->contains(fn (Referee $item): bool => $item->is($referee))) {
            $referees->push($referee);
        }

        $event->referees()->syncWithoutDetaching([
            $referee->id => ['role' => $data['role']],
        ]);

        if ($user) {
            $event->users()->syncWithoutDetaching([
                $user->id => ['access_role' => Event::AccessRoleStaff],
            ]);
        }
    }

    /**
     * @param  Collection<int, Referee>  $referees
     * @param  array<string, mixed>  $row
     */
    private function resolveReferee(Collection $referees, array $row): ?Referee
    {
        if (filled($row['id'] ?? null)) {
            $referee = $referees->firstWhere('id', $row['id']);

            if (! $referee) {
                throw ValidationException::withMessages(['id' => 'ID wasit tidak ditemukan.']);
            }

            return $referee;
        }

        $licenseNumber = $this->normalizedText($row['license_number'] ?? null);
        $email = $this->normalizedText($row['email'] ?? null);
        $phone = PhoneNumber::normalize($row['phone'] ?? null);
        $strongMatches = $referees->filter(function (Referee $referee) use ($email, $licenseNumber, $phone): bool {
            return ($licenseNumber && $this->normalizedText($referee->license_number) === $licenseNumber)
                || ($email && $this->normalizedText($referee->email) === $email)
                || ($phone && PhoneNumber::normalize($referee->phone) === $phone);
        })->unique('id')->values();

        if ($strongMatches->count() > 1) {
            throw ValidationException::withMessages([
                'row' => 'Lisensi, email, atau nomor HP mengarah ke data wasit yang berbeda.',
            ]);
        }

        if ($strongMatches->isNotEmpty()) {
            return $strongMatches->first();
        }

        $name = $this->normalizedText($row['name'] ?? null);
        $nameMatches = $referees
            ->filter(fn (Referee $referee): bool => $this->normalizedText($referee->name) === $name)
            ->values();

        if ($nameMatches->count() > 1) {
            throw ValidationException::withMessages([
                'name' => 'Nama wasit ditemukan lebih dari satu. Isi ID, nomor lisensi, email, atau nomor HP.',
            ]);
        }

        return $nameMatches->first();
    }

    private function normalizedText(mixed $value): ?string
    {
        $normalized = Str::lower(trim((string) $value));

        return $normalized === '' ? null : $normalized;
    }

    /** @return array{0: list<string>, 1: list<array<string, mixed>>} */
    private function readCsv(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $contents = file_get_contents($path);

        if ($contents === false || trim($contents) === '') {
            throw ValidationException::withMessages(['file' => 'File CSV kosong.']);
        }

        $firstLine = Str::before($contents, "\n");
        $delimiter = substr_count($firstLine, ';') > substr_count($firstLine, ',') ? ';' : ',';
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'File CSV tidak dapat dibaca.']);
        }

        $rawHeaders = fgetcsv($handle, 0, $delimiter, '"', '');

        if (! is_array($rawHeaders)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'Header CSV tidak valid.']);
        }

        $headers = array_map(function (mixed $header, int $index): string {
            $value = trim((string) $header);

            if ($index === 0) {
                $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;
            }

            return Str::snake($value);
        }, $rawHeaders, array_keys($rawHeaders));

        if (count($headers) !== count(array_unique($headers)) || in_array('', $headers, true)) {
            fclose($handle);
            throw ValidationException::withMessages(['file' => 'Header CSV kosong atau berulang.']);
        }

        $rows = [];

        while (($values = fgetcsv($handle, 0, $delimiter, '"', '')) !== false) {
            $values = array_slice(array_pad($values, count($headers), null), 0, count($headers));

            if (collect($values)->every(fn ($value) => blank($value))) {
                continue;
            }

            $row = array_combine($headers, $values);
            $rows[] = array_map(
                fn ($value) => is_string($value) && trim($value) === '' ? null : (is_string($value) ? trim($value) : $value),
                $row,
            );
        }

        fclose($handle);

        if ($rows === []) {
            throw ValidationException::withMessages(['file' => 'CSV belum memiliki baris data untuk diimpor.']);
        }

        return [$headers, $rows];
    }
}
